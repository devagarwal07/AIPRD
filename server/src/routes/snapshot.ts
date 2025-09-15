import { Router, Request, Response } from 'express';
import { gzipSync, gunzipSync } from 'zlib';
import { Snapshot } from '../models/Snapshot.js';
import { PRD } from '../models/PRD.js';
import { z } from 'zod';
// Telemetry: lightweight server-side metric emission (fallback no-op if not configured)
let emitMetric: ((name: string, data?: Record<string, any>) => void) | null = null;
// Attempt dynamic import so bundlers/tree-shakers can skip when not installed
// Lazy optional import (module may not be installed in minimal frontend-only setup)
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  try {
    // @ts-expect-error Optional dependency; types may be absent
    const sentry = await import('@sentry/node');
    emitMetric = (name: string, data?: Record<string, any>) => {
      (sentry as any).addBreadcrumb?.({ category: 'metric', level: 'info', message: name, data });
    };
  } catch { /* ignore server metric init failure */ }
})();

const router = Router();

// ---- Snapshot Versioning Infrastructure ------------------------------------
// Increment SNAPSHOT_SCHEMA_VERSION when snapshot storage structure changes.
// Add a migration function converting older shapes to the current structure.
// Migrations should be pure and idempotent (safe to run multiple times).
export const SNAPSHOT_SCHEMA_VERSION = 1;

type SnapshotPayload = { formData: any; sections: any; schemaVersion?: number } & Record<string, any>;
type Migration = (snap: SnapshotPayload) => SnapshotPayload;

// Registry keyed by fromVersion -> migration to next version.
// Example template (kept empty now):
// migrations.set(0, (snap) => ({ ...snap, formData: { ...snap.formData, migrated:true }, schemaVersion: 1 }));
const migrations: Map<number, Migration> = new Map();

function applyMigrations(raw: SnapshotPayload): SnapshotPayload {
  let current = raw.schemaVersion ?? 0; // treat undefined as 0 (pre-versioned)
  let snap = { ...raw };
  while (current < SNAPSHOT_SCHEMA_VERSION) {
    const mig = migrations.get(current);
    if (!mig) {
      // No migration available for this gap; break to avoid infinite loop
      break;
    }
    snap = mig({ ...snap, schemaVersion: current });
    current = (snap.schemaVersion ?? current) + 1;
  }
  // Ensure final version tag
  if (snap.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) snap.schemaVersion = SNAPSHOT_SCHEMA_VERSION;
  return snap;
}

const schema = z.object({
  prdId: z.string(),
  note: z.string().optional(),
  formData: z.any(),
  sections: z.any(),
  templateId: z.string().optional()
});

router.get('/:prdId', async (req: Request, res: Response) => {
  const snaps = await Snapshot.find({ prdId: req.params.prdId }).sort({ createdAt: -1 }).limit(100).lean();
  const decompressed = snaps.map(s => {
    if ((s as any).compressed) {
      try {
        const hydrated = {
          ...s,
          formData: JSON.parse(gunzipSync(Buffer.from((s.formData as any).data, 'base64')).toString('utf-8')),
          sections: JSON.parse(gunzipSync(Buffer.from((s.sections as any).data, 'base64')).toString('utf-8'))
        };
        return applyMigrations(hydrated as any);
      } catch { return s; }
    }
    return applyMigrations(s as any);
  });
  res.json(decompressed);
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exists = await PRD.findById(parsed.data.prdId);
  if (!exists) return res.status(400).json({ error: 'PRD does not exist' });
  // Compress large JSON blobs
  const formJson = JSON.stringify(parsed.data.formData || {});
  const sectionsJson = JSON.stringify(parsed.data.sections || {});
  const compressedForm = gzipSync(Buffer.from(formJson));
  const compressedSections = gzipSync(Buffer.from(sectionsJson));
  const snap = await Snapshot.create({
    prdId: parsed.data.prdId,
    note: parsed.data.note,
    templateId: parsed.data.templateId,
    compressed: true,
    formData: { data: compressedForm.toString('base64') },
    sections: { data: compressedSections.toString('base64') },
    schemaVersion: SNAPSHOT_SCHEMA_VERSION
  });
  try {
    emitMetric?.('prd_snapshot', {
      compressed: true,
      formBytes: compressedForm.byteLength,
      sectionsBytes: compressedSections.byteLength,
      totalBytes: compressedForm.byteLength + compressedSections.byteLength,
    });
  } catch { /* ignore metric errors */ }
  res.status(201).json({ id: snap.id, createdAt: (snap as any).createdAt });
});

export default router;
