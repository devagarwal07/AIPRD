import { Router } from 'express';
import { IntegrationConfig } from '../models/IntegrationConfig.js';
import { z } from 'zod';
const router = Router();
const schema = z.object({
    jiraBaseUrl: z.string().url().optional(),
    jiraProjectHint: z.string().optional(),
    jiraProjectKey: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/).optional(),
    linearWorkspace: z.string().optional(),
    linearTeamHint: z.string().optional()
});
// naive single-user placeholder
const USER_ID = 'local-user';
router.get('/', async (_req, res) => {
    const cfg = await IntegrationConfig.findOne({ userId: USER_ID }).lean();
    res.json(cfg || {});
});
router.put('/', async (req, res) => {
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const cfg = await IntegrationConfig.findOneAndUpdate({ userId: USER_ID }, { userId: USER_ID, ...parsed.data }, { upsert: true, new: true });
    res.json(cfg);
});
export default router;
