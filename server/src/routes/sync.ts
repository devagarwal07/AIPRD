import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';

const router = Router();

const linearSchema = z.object({
  items: z.array(z.object({ title: z.string(), description: z.string().optional() })),
  teamId: z.string().optional()
});

router.post('/linear', async (req: Request, res: Response) => {
  const parsed = linearSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return res.status(501).json({ error: 'Linear API not configured' });
  const created: any[] = [];
  for (const item of parsed.data.items) {
    const body = {
      query: `mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url title } } }`,
      variables: { input: { title: item.title, description: item.description, teamId: parsed.data.teamId } }
    };
    const r = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Linear API error', detail: text });
    }
    const json: any = await r.json();
    if (!json.data?.issueCreate?.success) {
      return res.status(502).json({ error: 'Linear creation failed', detail: json });
    }
    created.push(json.data.issueCreate.issue);
  }
  res.json({ created });
});

const jiraSchema = z.object({
  items: z.array(z.object({ summary: z.string(), description: z.string().optional(), issueType: z.string().optional(), projectKey: z.string() }))
});

router.post('/jira', async (req: Request, res: Response) => {
  const parsed = jiraSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { JIRA_API_TOKEN, JIRA_EMAIL, JIRA_BASE_URL } = process.env;
  if (!JIRA_API_TOKEN || !JIRA_EMAIL || !JIRA_BASE_URL) return res.status(501).json({ error: 'Jira API not configured' });
  const created: any[] = [];
  for (const item of parsed.data.items) {
    const r = await fetch(`${JIRA_BASE_URL.replace(/\/$/, '')}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')
      },
      body: JSON.stringify({
        fields: {
          project: { key: item.projectKey },
            summary: item.summary,
            description: item.description,
            issuetype: { name: item.issueType || 'Task' }
        }
      })
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Jira API error', detail: text });
    }
    const json: any = await r.json();
    created.push({ id: json.id, key: json.key, self: json.self });
  }
  res.json({ created });
});

export default router;
