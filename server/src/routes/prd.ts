import { Router, Request, Response } from 'express';
import { PRD } from '../models/PRD.js';
import { z } from 'zod';

const router = Router();

const riceEntry = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  reach: z.number().nonnegative().default(0),
  impact: z.number().nonnegative().default(0),
  confidence: z.number().nonnegative().default(0),
  effort: z.number().positive().default(1),
  category: z.string().optional(),
  rice: z.number().optional() // will be recalculated
});

const acceptanceEntry = z.object({
  id: z.string().min(1),
  storyIndex: z.number().int().nonnegative(),
  text: z.string().min(1),
  done: z.boolean().default(false)
});

const prdSchema = z.object({
  title: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  userStories: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  riceScores: z.array(riceEntry).optional(),
  acceptanceCriteria: z.array(acceptanceEntry).optional(),
  sections: z.object({
    problem: z.boolean(),
    solution: z.boolean(),
    objectives: z.boolean().optional(),
    userStories: z.boolean(),
    requirements: z.boolean()
  }).optional(),
  templateId: z.string().optional()
});

router.get('/', async (_req: Request, res: Response) => {
  const list = await PRD.find().sort({ updatedAt: -1 }).limit(50).lean();
  res.json(list);
});

function recalcRice(entries: any[]|undefined) {
  if (!Array.isArray(entries)) return entries;
  return entries.map(e => ({
    ...e,
    rice: Number((((e.reach||0) * (e.impact||0) * (e.confidence||0)) / Math.max(0.1, (e.effort||1))).toFixed(2))
  }));
}

router.post('/', async (req: Request, res: Response) => {
  const body = { ...req.body, riceScores: recalcRice(req.body?.riceScores) };
  const parsed = prdSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const prd = await PRD.create(parsed.data);
  res.status(201).json(prd);
});

router.get('/:id', async (req: Request, res: Response) => {
  const prd = await PRD.findById(req.params.id);
  if (!prd) return res.status(404).json({ error: 'Not found' });
  res.json(prd);
});

router.put('/:id', async (req: Request, res: Response) => {
  const body = { ...req.body, riceScores: recalcRice(req.body?.riceScores) };
  const parsed = prdSchema.partial().safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const prd = await PRD.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  if (!prd) return res.status(404).json({ error: 'Not found' });
  res.json(prd);
});

// Optional dedicated riceScores endpoint for partial updates
router.patch('/:id/rice', async (req: Request, res: Response) => {
  const riceArray = Array.isArray(req.body?.riceScores) ? recalcRice(req.body.riceScores) : [];
  const parsed = z.object({ riceScores: z.array(riceEntry) }).safeParse({ riceScores: riceArray });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const prd = await PRD.findByIdAndUpdate(req.params.id, { riceScores: parsed.data.riceScores }, { new: true });
  if (!prd) return res.status(404).json({ error: 'Not found' });
  res.json(prd.riceScores || []);
});

router.patch('/:id/acceptance', async (req: Request, res: Response) => {
  const mode = String(req.query.mode || 'replace'); // replace | toggle
  if (mode === 'toggle') {
    const id = String(req.body?.id || '');
    if (!id) return res.status(400).json({ error: 'id required for toggle' });
    const prd = await PRD.findById(req.params.id);
    if (!prd) return res.status(404).json({ error: 'Not found' });
    const list = Array.isArray(prd.acceptanceCriteria) ? prd.acceptanceCriteria : [];
    const idx = list.findIndex((c: any) => c.id === id);
    if (idx !== -1) {
      list[idx].done = !list[idx].done;
      await prd.save();
    }
    return res.json({ acceptanceCriteria: list, progress: calcAcceptanceProgress(list) });
  } else {
    const arr = Array.isArray(req.body?.acceptanceCriteria) ? req.body.acceptanceCriteria : [];
    const parsed = z.array(acceptanceEntry).safeParse(arr);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const prd = await PRD.findByIdAndUpdate(req.params.id, { acceptanceCriteria: parsed.data }, { new: true });
    if (!prd) return res.status(404).json({ error: 'Not found' });
    return res.json({ acceptanceCriteria: prd.acceptanceCriteria || [], progress: calcAcceptanceProgress(prd.acceptanceCriteria||[]) });
  }
});

function calcAcceptanceProgress(list: any[]|undefined) {
  if (!Array.isArray(list) || list.length === 0) return 0;
  const done = list.filter(l => l.done).length;
  return Number(((done / list.length) * 100).toFixed(2));
}

router.delete('/:id', async (req: Request, res: Response) => {
  const prd = await PRD.findByIdAndDelete(req.params.id);
  if (!prd) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
