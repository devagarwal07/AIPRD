import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';

const router = Router();

// --- Simple in-memory job queue (process restarts lose jobs) ---
type JobStatus = 'pending' | 'running' | 'done' | 'error';
interface Job {
  id: string;
  type: 'linear' | 'jira';
  createdAt: number;
  updatedAt: number;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: any;
}
const jobs: Job[] = [];
let working = false;

async function processNext() {
  if (working) return;
  const job = jobs.find(j => j.status === 'pending');
  if (!job) return;
  working = true;
  job.status = 'running'; job.updatedAt = Date.now();
  try {
    if (job.type === 'linear') {
      job.result = await runLinearSync(job.payload);
    } else if (job.type === 'jira') {
      job.result = await runJiraSync(job.payload);
    }
    job.status = 'done';
  } catch (e: any) {
    job.status = 'error';
    job.error = e?.message || String(e);
  } finally {
    job.updatedAt = Date.now();
    working = false;
    setTimeout(processNext, 25); // schedule next
  }
}

function enqueue(type: Job['type'], payload: any): Job {
  const job: Job = { id: Math.random().toString(36).slice(2), type, createdAt: Date.now(), updatedAt: Date.now(), status: 'pending', payload };
  jobs.push(job);
  // Trim history (keep last 100)
  if (jobs.length > 120) jobs.splice(0, jobs.length - 120);
  processNext();
  return job;
}

router.get('/jobs', (_req, res) => {
  res.json(jobs.slice(-100).map(j => ({ id: j.id, type: j.type, status: j.status, updatedAt: j.updatedAt })));
});
router.get('/jobs/:id', (req, res) => {
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({ id: job.id, type: job.type, status: job.status, result: job.result, error: job.error, updatedAt: job.updatedAt });
});

const linearSchema = z.object({
  items: z.array(z.object({ title: z.string(), description: z.string().optional() })),
  teamId: z.string().optional()
});

async function runLinearSync(payload: any) {
  const parsed = linearSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid Linear payload');
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) throw new Error('Linear API not configured');
  const created: any[] = [];
  for (const item of parsed.data.items) {
    const body = { query: `mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url title } } }`, variables: { input: { title: item.title, description: item.description, teamId: parsed.data.teamId } } };
    const r = await fetch('https://api.linear.app/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: apiKey }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('Linear API error: ' + (await r.text()));
    const json: any = await r.json();
    if (!json.data?.issueCreate?.success) throw new Error('Linear creation failed');
    created.push(json.data.issueCreate.issue);
  }
  return { created };
}

router.post('/linear', async (req: Request, res: Response) => {
  if (String(req.query.queue||'') === '1') {
    const parsed = linearSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const job = enqueue('linear', req.body);
    return res.status(202).json({ jobId: job.id, status: job.status });
  }
  try {
    const result = await runLinearSync(req.body);
    res.json(result);
  } catch (e: any) {
    res.status(502).json({ error: e?.message || 'Linear sync failed' });
  }
});

// Preview Linear issues (no creation) - returns the transformed GraphQL mutation payloads
router.post('/linear/preview', (req: Request, res: Response) => {
  const parsed = linearSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // Build the would-be mutation bodies so caller can inspect
  const previews = parsed.data.items.map(item => ({
    mutation: 'issueCreate',
    variables: { input: { title: item.title, description: item.description, teamId: parsed.data.teamId || undefined } }
  }));
  res.json({ items: previews, count: previews.length, teamId: parsed.data.teamId || null });
});

const jiraSchema = z.object({
  items: z.array(z.object({ summary: z.string(), description: z.string().optional(), issueType: z.string().optional(), projectKey: z.string() }))
});

async function runJiraSync(payload: any) {
  const parsed = jiraSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid Jira payload');
  const { JIRA_API_TOKEN, JIRA_EMAIL, JIRA_BASE_URL } = process.env;
  if (!JIRA_API_TOKEN || !JIRA_EMAIL || !JIRA_BASE_URL) throw new Error('Jira API not configured');
  const created: any[] = [];
  for (const item of parsed.data.items) {
    const r = await fetch(`${JIRA_BASE_URL.replace(/\/$/, '')}/rest/api/3/issue`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64') }, body: JSON.stringify({ fields: { project: { key: item.projectKey }, summary: item.summary, description: item.description, issuetype: { name: item.issueType || 'Task' } } }) });
    if (!r.ok) throw new Error('Jira API error: ' + (await r.text()));
    const json: any = await r.json();
    created.push({ id: json.id, key: json.key, self: json.self });
  }
  return { created };
}

router.post('/jira', async (req: Request, res: Response) => {
  if (String(req.query.queue||'') === '1') {
    const parsed = jiraSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const job = enqueue('jira', req.body);
    return res.status(202).json({ jobId: job.id, status: job.status });
  }
  try {
    const result = await runJiraSync(req.body);
    res.json(result);
  } catch (e: any) {
    res.status(502).json({ error: e?.message || 'Jira sync failed' });
  }
});

// Preview Jira issues (no creation) - returns the payload bodies that would be sent
router.post('/jira/preview', (req: Request, res: Response) => {
  const parsed = jiraSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const previews = parsed.data.items.map(item => ({
    fields: {
      project: { key: item.projectKey },
      summary: item.summary,
      description: item.description,
      issuetype: { name: item.issueType || 'Task' }
    }
  }));
  res.json({ items: previews, count: previews.length });
});

export default router;
