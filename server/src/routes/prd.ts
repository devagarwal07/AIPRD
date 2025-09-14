import { Router, Request, Response } from 'express';
import { PRD } from '../models/PRD.js';
import { z } from 'zod';

const router = Router();

const prdSchema = z.object({
  title: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  userStories: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
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

router.post('/', async (req: Request, res: Response) => {
  const parsed = prdSchema.safeParse(req.body);
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
  const parsed = prdSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const prd = await PRD.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  if (!prd) return res.status(404).json({ error: 'Not found' });
  res.json(prd);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const prd = await PRD.findByIdAndDelete(req.params.id);
  if (!prd) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
