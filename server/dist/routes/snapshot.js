import { Router } from 'express';
import { Snapshot } from '../models/Snapshot.js';
import { PRD } from '../models/PRD.js';
import { z } from 'zod';
const router = Router();
const schema = z.object({
    prdId: z.string(),
    note: z.string().optional(),
    formData: z.any(),
    sections: z.any(),
    templateId: z.string().optional()
});
router.get('/:prdId', async (req, res) => {
    const snaps = await Snapshot.find({ prdId: req.params.prdId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(snaps);
});
router.post('/', async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const exists = await PRD.findById(parsed.data.prdId);
    if (!exists)
        return res.status(400).json({ error: 'PRD does not exist' });
    const snap = await Snapshot.create(parsed.data);
    res.status(201).json(snap);
});
export default router;
