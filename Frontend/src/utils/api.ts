export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// PRDs
export const Api = {
  listPrds: () => http<any[]>('/api/prds'),
  createPrd: (data: any) => http('/api/prds', { method: 'POST', body: JSON.stringify(data) }),
  updatePrd: (id: string, data: any) => http(`/api/prds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePrdRice: (id: string, riceScores: any[]) => http(`/api/prds/${id}/rice`, { method: 'PATCH', body: JSON.stringify({ riceScores }) }),
  getPrd: (id: string) => http(`/api/prds/${id}`),
  deletePrd: (id: string) => http(`/api/prds/${id}`, { method: 'DELETE' }),

  listSnapshots: (prdId: string) => http<any[]>(`/api/snapshots/${prdId}`),
  createSnapshot: (data: any) => http('/api/snapshots', { method: 'POST', body: JSON.stringify(data) }),

  getIntegration: () => http('/api/integrations'),
  saveIntegration: (data: any) => http('/api/integrations', { method: 'PUT', body: JSON.stringify(data) }),

  syncLinear: (items: { title: string; description?: string }[], teamId?: string) => http('/api/sync/linear', { method: 'POST', body: JSON.stringify({ items, teamId }) }),
  syncLinearQueued: (items: { title: string; description?: string }[], teamId?: string) => http('/api/sync/linear?queue=1', { method: 'POST', body: JSON.stringify({ items, teamId }) }),
  previewLinear: (items: { title: string; description?: string }[], teamId?: string) => http('/api/sync/linear/preview', { method: 'POST', body: JSON.stringify({ items, teamId }) }),
  syncJira: (items: { summary: string; description?: string; issueType?: string; projectKey: string }[]) => http('/api/sync/jira', { method: 'POST', body: JSON.stringify({ items }) }),
  syncJiraQueued: (items: { summary: string; description?: string; issueType?: string; projectKey: string }[]) => http('/api/sync/jira?queue=1', { method: 'POST', body: JSON.stringify({ items }) }),
  previewJira: (items: { summary: string; description?: string; issueType?: string; projectKey: string }[]) => http('/api/sync/jira/preview', { method: 'POST', body: JSON.stringify({ items }) }),
  listJobs: () => http('/api/sync/jobs'),
  getJob: (id: string) => http(`/api/sync/jobs/${id}`),
  // Export template CRUD
  listTemplates: () => http('/api/templates'),
  createTemplate: (name: string, markdown: string) => http('/api/templates', { method: 'POST', body: JSON.stringify({ name, markdown }) }),
  updateTemplate: (id: string, data: { name?: string; markdown?: string }) => http(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: string) => http(`/api/templates/${id}`, { method: 'DELETE' }),
  // Notion
  createNotionPage: (title: string, markdown: string, opts?: { parentId?: string; preview?: boolean }) => http('/api/notion/page', { method: 'POST', body: JSON.stringify({ title, markdown, parentId: opts?.parentId, preview: opts?.preview }) }),
};

export function backendEnabled() {
  return !!import.meta.env.VITE_API_BASE;
}
