import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { IntegrationConfig } from '../models/IntegrationConfig.js';

// Naive single-user placeholder until auth implemented
const USER_ID = 'local-user';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(80),
  markdown: z.string().min(1).max(20000)
});
const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  markdown: z.string().min(1).max(20000).optional()
});

async function ensureConfig() {
  let cfg = await IntegrationConfig.findOne({ userId: USER_ID });
  if (!cfg) {
    cfg = new IntegrationConfig({ userId: USER_ID, customTemplates: [] });
    await cfg.save();
  }
  return cfg;
}

router.get('/', async (_req: Request, res: Response) => {
  const cfg = await ensureConfig();
  res.json((cfg.customTemplates || []).map((t: any) => ({ id: t.id, name: t.name, markdown: t.markdown, createdAt: t.createdAt, updatedAt: t.updatedAt })));
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const cfg = await ensureConfig();
  const now = Date.now();
  const tmpl = { id: Math.random().toString(36).slice(2), name: parsed.data.name.trim(), markdown: parsed.data.markdown, createdAt: now, updatedAt: now };
  // Simple duplicate name guard
  if ((cfg.customTemplates || []).some((t: any) => t.name.toLowerCase() === tmpl.name.toLowerCase())) {
    return res.status(409).json({ error: 'duplicate_name' });
  }
  cfg.customTemplates = [...(cfg.customTemplates || []), tmpl];
  await cfg.save();
  res.status(201).json(tmpl);
});

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const cfg = await ensureConfig();
  const idx = (cfg.customTemplates || []).findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  const existing: any = (cfg.customTemplates as any)[idx];
  if (parsed.data.name) {
    const newName = parsed.data.name.trim();
    if ((cfg.customTemplates || []).some((t: any) => t.id !== existing.id && t.name.toLowerCase() === newName.toLowerCase())) {
      return res.status(409).json({ error: 'duplicate_name' });
    }
    existing.name = newName;
  }
  if (parsed.data.markdown) existing.markdown = parsed.data.markdown;
  existing.updatedAt = Date.now();
  await cfg.save();
  res.json({ id: existing.id, name: existing.name, markdown: existing.markdown, createdAt: existing.createdAt, updatedAt: existing.updatedAt });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const cfg = await ensureConfig();
  const before = (cfg.customTemplates || []).length;
  cfg.customTemplates = (cfg.customTemplates || []).filter((t: any) => t.id !== req.params.id);
  if (cfg.customTemplates.length === before) return res.status(404).json({ error: 'not_found' });
  await cfg.save();
  res.json({ ok: true });
});

export default router;
