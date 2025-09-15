import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll mock ./api to simulate backend availability
vi.mock('../api', () => ({
  backendEnabled: () => true,
  Api: {
    syncLinear: vi.fn().mockResolvedValue({ created: [{ id: 'L1' }, { id: 'L2' }] }),
    syncJira: vi.fn().mockResolvedValue({ created: [{ id: 'J1' }] }),
  }
}));

import { syncItemsToLinear, syncItemsToJira, setIntegrationConfig } from '../integrations';

// Silence window.open during backend path tests
vi.spyOn(window, 'open').mockImplementation(()=> null as any);

describe('backend sync path (Linear & Jira)', () => {
  beforeEach(()=> {
    localStorage.clear();
  });

  it('uses backend sync for Linear when backendEnabled', async () => {
    setIntegrationConfig({ linearTeamHint: 'TEAM' });
    const res = await syncItemsToLinear(['A','B','C'], 'workspace');
    expect(res.opened).toBe(2); // created length
    expect(res.copied).toBe(0);
  });

  it('uses backend sync for Jira with explicit project key logic', async () => {
    setIntegrationConfig({ jiraProjectKey: 'PROJ', jiraProjectHint: 'HINT' });
    const res = await syncItemsToJira(['Issue 1','Issue 2'], 'https://acme.atlassian.net');
    expect(res.opened).toBe(1); // created length
    expect(res.copied).toBe(0);
  });
});
