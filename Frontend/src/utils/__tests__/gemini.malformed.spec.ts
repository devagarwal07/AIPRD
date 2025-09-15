import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor(_key: string) {}
      getGenerativeModel() {
        return {
          generateContent: () => Promise.resolve({ response: { text: () => 'UNSET' } })
        };
      }
    }
  };
});

// Mock env before importing gemini to ensure geminiEnabled resolves true
vi.stubGlobal('importMeta', { env: { VITE_GEMINI_API_KEY: 'test-key' } });
import * as gemini from '../gemini';

async function setNextModelText(next: string) {
  const mod: any = await import('@google/generative-ai');
  const proto = mod.GoogleGenerativeAI.prototype;
  vi.spyOn(proto, 'getGenerativeModel').mockReturnValue({
    generateContent: () => Promise.resolve({ response: { text: () => next } })
  });
}


describe('gemini malformed JSON resilience', () => {
  beforeEach(()=> {
    vi.restoreAllMocks();
  });
  afterEach(()=> {
    vi.restoreAllMocks();
  });

  it('falls back to line splitting for user stories when JSON invalid', async () => {
    await setNextModelText('1. First story\n2. Second story\n3. Third story');
    const stories = await gemini.generateUserStoriesGemini('Problem', 'Solution');
  // Fallback retains numbering if regex cleanup does not strip; ensure length and contents trimmed
  expect(stories.map(s=>s.replace(/^\d+\.\s*/,''))).toEqual(['First story','Second story','Third story']);
  });

  it('falls back to line splitting for requirements when JSON invalid', async () => {
    await setNextModelText('* Req A\n* Req B\n* Req C');
    const reqs = await gemini.generateRequirementsGemini(['Story']);
    expect(reqs).toEqual(['Req A','Req B','Req C']);
  });

  it('falls back to block parsing for acceptance criteria when JSON invalid', async () => {
    await setNextModelText('Crit one for S1\nCrit two for S1\n\nCrit one for S2\nCrit two for S2');
    const groups = await gemini.generateAcceptanceCriteriaGemini(['Story 1','Story 2']);
    expect(groups.length).toBe(2);
    expect(groups[0].criteria.length).toBeGreaterThan(0);
  });

  it('falls back to suggestion line parsing when JSON invalid', async () => {
    await setNextModelText('- Improve clarity\n- Add KPIs\n- Refine scope');
  const r = await gemini.suggestImprovementsGemini(0, { title:'', problem: 'p', solution: 's', objectives: [], userStories: [], requirements: [] });
    expect(r.suggestions).toContain('Improve clarity');
  });

  it('falls back to assess text suggestions when JSON invalid', async () => {
    await setNextModelText('Add more metrics\nClarify audience');
  const r = await gemini.assessPRDGemini({ title:'', problem: 'p', solution: 's', objectives: [], userStories: [], requirements: [] });
    expect(r.score).toBe(0);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
