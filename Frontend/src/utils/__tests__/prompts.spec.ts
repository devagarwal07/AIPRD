import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildUserStoriesPrompt, buildAssessPrompt, setPromptVariant } from '../prompts';

function setUrl(url: string) {
  // Use relative paths so jsdom doesn't reject cross-origin updates
  const u = url.startsWith('http') ? new URL(url).pathname + new URL(url).search : url;
  window.history.pushState({}, '', u || '/');
}

function setOverrides(obj: any) {
  localStorage.setItem('pmcopilot_prompt_overrides', JSON.stringify(obj));
}

describe('prompt variants and overrides', () => {
  beforeEach(() => {
    localStorage.clear();
  setUrl('/');
  });
  afterEach(() => {
    localStorage.clear();
  setUrl('/');
  });

  it('uses v1 by default', () => {
    const prompt = buildUserStoriesPrompt({ problem: 'p', solution: 's' });
    expect(prompt).toMatch(/You are an expert product manager/i);
  });

  it('respects ?pv=v2 URL param over localStorage', () => {
  setPromptVariant('v1');
  setUrl('/?pv=v2');
    const prompt = buildUserStoriesPrompt({ problem: 'p', solution: 's' });
    expect(prompt).toMatch(/Act as a senior PM/i);
  });

  it('applies generic overrides before registry', () => {
    setOverrides({ assess: 'OVERRIDE-ASSESS\n{{formJson}}' });
    const prompt = buildAssessPrompt({ formJson: '{"foo":1}' });
    expect(prompt.startsWith('OVERRIDE-ASSESS')).toBe(true);
  });

  it('applies variant-specific overrides with highest precedence', () => {
    setUrl('http://localhost/?pv=v2');
    setOverrides({ v2: { stories: 'OVR-V2-STORIES for {{problem}}/{{solution}}' } });
    const prompt = buildUserStoriesPrompt({ problem: 'pb', solution: 'sl' });
    expect(prompt.startsWith('OVR-V2-STORIES')).toBe(true);
    expect(prompt).toContain('pb');
    expect(prompt).toContain('sl');
  });
});
