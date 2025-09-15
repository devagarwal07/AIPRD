import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';

const router = Router();

// Simple body: { title, markdown, parentId?, preview? }
const createSchema = z.object({
  title: z.string().min(1).max(200),
  markdown: z.string().min(1).max(50000),
  parentId: z.string().optional(),
  preview: z.boolean().optional()
});

// Convert markdown headings (#, ##, etc.) into Notion child blocks (very minimal)
function markdownToNotionBlocks(md: string) {
  const lines = md.split(/\r?\n/);
  const blocks: any[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line.trim());
    if (m) {
      const level = m[1].length;
      blocks.push({ object: 'block', heading_1: level === 1 ? { rich_text: [{ type: 'text', text: { content: m[2] } }] } : undefined, heading_2: level === 2 ? { rich_text: [{ type: 'text', text: { content: m[2] } }] } : undefined, heading_3: level === 3 ? { rich_text: [{ type: 'text', text: { content: m[2] } }] } : undefined });
      continue;
    }
    blocks.push({ object: 'block', paragraph: { rich_text: [{ type: 'text', text: { content: line.slice(0, 2000) } }] } });
  }
  // Clean undefined properties
  return blocks.map(b => {
    if (!b.heading_1 && !b.heading_2 && !b.heading_3) return b;
    if (b.heading_1 === undefined) delete b.heading_1;
    if (b.heading_2 === undefined) delete b.heading_2;
    if (b.heading_3 === undefined) delete b.heading_3;
    return b;
  });
}

router.post('/page', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { NOTION_API_KEY, NOTION_PARENT_PAGE, NOTION_PARENT_DB } = process.env as any;
  if (!NOTION_API_KEY) return res.status(500).json({ error: 'notion_not_configured' });
  const parentId = parsed.data.parentId || NOTION_PARENT_DB || NOTION_PARENT_PAGE;
  if (!parentId) return res.status(400).json({ error: 'missing_parent' });
  const blocks = markdownToNotionBlocks(parsed.data.markdown);
  if (parsed.data.preview) {
    return res.json({ preview: true, parentId, title: parsed.data.title, blocks: blocks.slice(0, 10), totalBlocks: blocks.length });
  }
  try {
    // If parent is a database assume DB creation; else page child
    const isDb = !!NOTION_PARENT_DB && parentId === NOTION_PARENT_DB;
    const body: any = isDb ? {
      parent: { database_id: parentId },
      properties: { Name: { title: [{ type: 'text', text: { content: parsed.data.title } }] } },
      children: blocks
    } : {
      parent: { page_id: parentId },
      properties: { title: [{ type: 'text', text: { content: parsed.data.title } }] },
      children: blocks
    };
    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: 'notion_api_error', detail: txt.slice(0, 500) });
    }
  const json: any = await r.json();
  res.json({ id: json.id, url: json.url, created: true, blocks: blocks.length });
  } catch (e: any) {
    res.status(502).json({ error: e?.message || 'notion_failed' });
  }
});

export default router;
