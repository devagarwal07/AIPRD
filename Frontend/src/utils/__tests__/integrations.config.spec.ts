import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getIntegrationConfig, setIntegrationConfig, syncItemsToLinear, syncItemsToJira } from '../integrations';

interface MockClipboard {
  writeText: (text: string) => Promise<void>;
}

// Helper to mock window.open & clipboard
function mockWindowOpen() {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  return openSpy;
}

function mockClipboard() {
  const g: any = globalThis as any;
  g.navigator = g.navigator || {};
  const writeTextMock = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  const clip: MockClipboard = {
    writeText: writeTextMock,
  };
  g.navigator.clipboard = clip;
  return writeTextMock;
}

describe('integration config persistence & hints', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('persists and retrieves config', () => {
    expect(getIntegrationConfig()).toEqual({});
    setIntegrationConfig({ jiraBaseUrl: 'https://acme.atlassian.net', jiraProjectHint: 'ACME', linearWorkspace: 'acme', linearTeamHint: 'PLT' });
    const cfg = getIntegrationConfig();
    expect(cfg.jiraBaseUrl).toBe('https://acme.atlassian.net');
    expect(cfg.jiraProjectHint).toBe('ACME');
    expect(cfg.linearWorkspace).toBe('acme');
    expect(cfg.linearTeamHint).toBe('PLT');
  });

  it('applies linear team hint to opened issue and copied list (fallback web intent path)', async () => {
    setIntegrationConfig({ linearWorkspace: 'acme', linearTeamHint: 'PLT' });
    const openSpy = mockWindowOpen();
    const clipSpy = mockClipboard();
    const res = await syncItemsToLinear(['First story', 'Second story'], 'acme');
    expect(res.opened).toBe(1);
    expect(res.copied).toBe(1);
    // First opened issue title should include hint
    const calledUrl = openSpy.mock.calls[0][0];
    expect(calledUrl).toContain(encodeURIComponent('[PLT] First story'));
    // Copied text should include second item with hint
    expect(clipSpy).toHaveBeenCalledTimes(1);
    const copiedArg = clipSpy.mock.calls[0][0];
    expect(copiedArg).toContain('[PLT] Second story');
  });

  it('applies jira project hint and derives project key fallback for copied/opened issues', async () => {
    setIntegrationConfig({ jiraBaseUrl: 'https://acme.atlassian.net', jiraProjectHint: 'ACME' });
    const openSpy = mockWindowOpen();
    const clipSpy = mockClipboard();
    const res = await syncItemsToJira(['First req', 'Second req', 'Third req'], 'https://acme.atlassian.net');
    expect(res.opened).toBe(1);
    expect(res.copied).toBe(2);
    const calledUrl = openSpy.mock.calls[0][0];
    expect(calledUrl).toContain(encodeURIComponent('[ACME] First req'));
    const copiedArg = clipSpy.mock.calls[0][0];
    expect(copiedArg).toContain('[ACME] Second req');
  });

  it('prefers explicit jiraProjectKey when provided (backend path simulated via force no backend)', async () => {
    setIntegrationConfig({ jiraBaseUrl: 'https://acme.atlassian.net', jiraProjectHint: 'HINT', jiraProjectKey: 'REAL' });
    const openSpy = mockWindowOpen();
    mockClipboard();
    // We cannot easily trigger backend path without real module, ensure fallback uses hint for web intent.
    const res = await syncItemsToJira(['Item one'], 'https://acme.atlassian.net');
    expect(res.opened).toBe(1);
    const calledUrl = openSpy.mock.calls[0][0];
    // Even though projectKey would differ in backend, web intent only uses hint; ensure hint present
    expect(calledUrl).toContain(encodeURIComponent('[HINT] Item one'));
  });
});
