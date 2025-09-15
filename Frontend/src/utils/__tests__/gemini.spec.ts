import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as gemini from '../gemini';

// Mock GoogleGenerativeAI client
let currentText = '';
let genScript: null | (() => Promise<any>) = null;
vi.mock('@google/generative-ai', () => {
  class FakeModel {
    async generateContent(_input: unknown) {
      if (genScript) return genScript();
      return { response: { text: () => currentText } } as { response: { text: () => string } };
    }
  }
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => new FakeModel()),
    })),
    __setGenerate: (fn: null | (() => Promise<any>)) => { genScript = fn; },
  };
});

// util to set model response for mocks
function setModelText(text: string) { currentText = text; }

describe('gemini utils', () => {
  let envSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    envSpy = vi.spyOn(import.meta, 'env', 'get').mockReturnValue({
      VITE_GEMINI_API_KEY: 'fake',
      BASE_URL: '/',
      MODE: 'test',
      DEV: true,
      PROD: false,
      SSR: false,
    } as unknown as ImportMetaEnv);
  });
  afterEach(() => {
    envSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('toJSON fallback parses fenced JSON', async () => {
    // exercise via generateUserStoriesGemini which uses toJSON internally
    setModelText('```json\n["A","B"]\n```');
    const res = await gemini.generateUserStoriesGemini('p', 's');
    expect(res).toEqual(['A', 'B']);
  });

  it('generateUserStoriesGemini falls back to line parsing on invalid JSON', async () => {
    setModelText('- story1\n- story2\n- story3');
    const res = await gemini.generateUserStoriesGemini('p', 's');
    expect(res).toEqual(['story1', 'story2', 'story3']);
  });

  it('getModelText retries on failure and then succeeds', async () => {
    // simulate first call timeout, second call success
    const mod: any = await import('@google/generative-ai');
    let call = 0;
    mod.__setGenerate(async () => {
      call++;
      if (call === 1) throw new Error('Gemini request timed out');
      return { response: { text: () => '[]' } };
    });
    const res = await gemini.generateRequirementsGemini(['s1']);
    expect(res).toEqual([]);
    expect(call).toBeGreaterThanOrEqual(2);
    mod.__setGenerate(null);
  });
});
