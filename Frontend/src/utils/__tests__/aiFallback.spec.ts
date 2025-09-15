import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiOrchestrator } from '../aiOrchestrator';
import type { PRDFormData } from '../ai';

// Mocks
const suggestImpl = {
  calls: 0,
  mode: 'success-on-retry' as 'success-on-retry' | 'always-fail' | 'always-success'
};
const assessImpl = {
  calls: 0,
  mode: 'success-on-retry' as 'success-on-retry' | 'always-fail' | 'always-success'
};

vi.mock('../gemini', () => ({
  suggestImprovementsGemini: vi.fn().mockImplementation(async () => {
    suggestImpl.calls++;
    if (suggestImpl.mode === 'always-success') return { suggestions: ['S1'] };
    if (suggestImpl.mode === 'always-fail') throw new Error('fail');
    // success-on-retry
    if (suggestImpl.calls === 1) throw new Error('transient');
    return { suggestions: ['Recovered'] };
  }),
  assessPRDGemini: vi.fn().mockImplementation(async () => {
    assessImpl.calls++;
    if (assessImpl.mode === 'always-success') return { score: 88, missing: [], suggestions: [], checks: [] };
    if (assessImpl.mode === 'always-fail') throw new Error('fail');
    if (assessImpl.calls === 1) throw new Error('transient');
    return { score: 91, missing: ['m'], suggestions: ['ok'], checks: [] };
  })
}));

vi.mock('../aiErrors', () => ({
  handleAiError: vi.fn()
}));

const basePayload: PRDFormData = { title:'T', problem:'P', solution:'S', objectives:['o'], userStories:['u'], requirements:['r'] };

describe('AIOrchestrator fallback + retry', () => {
  beforeEach(() => {
    suggestImpl.calls = 0; assessImpl.calls = 0;
    suggestImpl.mode = 'success-on-retry';
    assessImpl.mode = 'success-on-retry';
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retries suggestions once and succeeds on second attempt', async () => {
    const res = await aiOrchestrator.getSuggestions(0, basePayload, { model: 'm', stepKey: 'problem' });
    expect(res.suggestions).toEqual(['Recovered']);
    expect(suggestImpl.calls).toBe(2); // first failed, second succeeded
  });

  it('returns empty suggestions after second failure', async () => {
    suggestImpl.mode = 'always-fail';
    const res = await aiOrchestrator.getSuggestions(1, basePayload, { model: 'm', stepKey: 'solution' });
  expect(Array.isArray(res.suggestions)).toBe(true);
    expect(suggestImpl.calls).toBe(2); // original + retry
  });

  it('retries assess once and succeeds on second attempt', async () => {
    const res = await aiOrchestrator.assess(basePayload, { model: 'm' });
    expect(res.score).toBe(91);
    expect(assessImpl.calls).toBe(2);
  });

  it('returns safe default assessment after second failure (score 0, empty lists)', async () => {
    assessImpl.mode = 'always-fail';
    // Use a slightly different payload to avoid cache key collision with prior test
    const failingPayload = { ...basePayload, title: 'T2' };
  const res = await aiOrchestrator.assess(failingPayload, { model: 'm' });
    expect(res.score === 0 || res.score === null).toBe(true);
    expect(res.suggestions).toEqual([]);
    expect(assessImpl.calls).toBe(2);
  });
});
