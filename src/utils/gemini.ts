import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PRDFormData } from "./ai";
import { buildUserStoriesPrompt, buildRequirementsPrompt, buildAcceptanceCriteriaPrompt, buildAssessPrompt, buildSuggestionsPrompt } from './prompts';
import { getPromptVariant } from './prompts';
import { metric } from './telemetry';

const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
export const geminiEnabled = typeof API_KEY === 'string' && API_KEY.length > 0;

type GeminiMode = 'flash' | 'pro';
const ENV_MODEL = ((import.meta as any).env?.VITE_GEMINI_MODEL as string) || '';

// Privacy controls: optional redaction before API calls
const REDACT_KEY = 'pmcopilot_privacy_redact';
export function getRedactionEnabled(): boolean {
  try { return localStorage.getItem(REDACT_KEY) === 'true'; } catch { return false; }
}
export function setRedactionEnabled(v: boolean) {
  try { localStorage.setItem(REDACT_KEY, String(v)); } catch {}
}
function redact(text: string): string {
  // Basic, conservative redaction for emails, URLs, UUID-like tokens, and 16+ digit sequences
  return text
    .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi, '[REDACTED_EMAIL]')
    .replace(/https?:\/\/[\w.-]+(?:\/[\w\-./?%&=]*)?/gi, '[REDACTED_URL]')
    .replace(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/gi, '[REDACTED_ID]')
    .replace(/\b\d{16,}\b/g, '[REDACTED_NUMBER]');
}
function maybeRedactPrompt(prompt: string): string {
  return getRedactionEnabled() ? redact(prompt) : prompt;
}

export function getGeminiMode(): GeminiMode {
  try {
    const v = localStorage.getItem('pmcopilot_gemini_mode');
    return (v === 'pro' || v === 'flash') ? v : 'flash';
  } catch {
    return 'flash';
  }
}

export function setGeminiMode(mode: GeminiMode) {
  try { localStorage.setItem('pmcopilot_gemini_mode', mode); } catch {}
}

function resolveModelName(): string {
  // Prefer explicit mode toggle; else fall back to env config; else default to flash
  try {
    const mode = getGeminiMode();
    if (mode === 'pro') return 'gemini-1.5-pro';
    if (mode === 'flash') return 'gemini-1.5-flash';
  } catch {}
  return ENV_MODEL || 'gemini-1.5-flash';
}

function getModel() {
  if (!geminiEnabled) throw new Error('Gemini API key not configured');
  const genAI = new GoogleGenerativeAI(API_KEY!);
  return genAI.getGenerativeModel({
  model: resolveModelName(),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  });
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('Gemini request timed out')), ms)),
  ]);
}

async function getModelText(prompt: string, tries = 2): Promise<string> {
  const model = getModel();
  let lastErr: unknown;
  for (let i = 0; i < Math.max(1, tries); i++) {
    try {
      const res = await withTimeout(model.generateContent([{ text: prompt }]));
      return res.response.text();
    } catch (e) {
      lastErr = e;
      // backoff with jitter
      if (i < tries - 1) {
        const delay = 300 * Math.pow(2, i) + Math.floor(Math.random() * 200);
        await sleep(delay);
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Gemini request failed');
}

async function toJSON<T = any>(text: string): Promise<T> {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to recover JSON from code fences or extra text
    const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (match) {
      try { return JSON.parse(match[1]) as T; } catch {}
    }
    // Try to locate the first JSON-looking snippet
    const objIdx = text.indexOf('{');
    const arrIdx = text.indexOf('[');
    const idx = (arrIdx !== -1 && (arrIdx < objIdx || objIdx === -1)) ? arrIdx : objIdx;
    if (idx !== -1) {
      const snippet = text.slice(idx).trim();
      try { return JSON.parse(snippet) as T; } catch {}
    }
    // Give up and let caller apply a text-based fallback
    throw new Error('Failed to parse JSON from Gemini response');
  }
}

export async function generateUserStoriesGemini(problem: string, solution: string): Promise<string[]> {
  // Telemetry: capture active prompt variant and settings
  try { metric('ai_call', { kind: 'user_stories', variant: getPromptVariant(), mode: getGeminiMode(), redact: getRedactionEnabled() }); } catch {}
  const prompt = buildUserStoriesPrompt({ problem, solution });
  const text = await getModelText(maybeRedactPrompt(prompt), 3);
  try {
    const arr = await toJSON<string[]>(text);
    return Array.isArray(arr) && arr.length > 0 ? arr.slice(0, 5) : [];
  } catch {
    // Text fallback: split lines and clean bullets/numbers
    const lines = text
      .split(/\r?\n+/)
      .map(l => l.replace(/^\s*[-*•\d.\)]\s+/, '').trim())
      .filter(Boolean);
    return lines.slice(0, 5);
  }
}

export async function generateRequirementsGemini(userStories: string[]): Promise<string[]> {
  try { metric('ai_call', { kind: 'requirements', variant: getPromptVariant(), mode: getGeminiMode(), redact: getRedactionEnabled() }); } catch {}
  const prompt = buildRequirementsPrompt({ userStories });
  const text = await getModelText(maybeRedactPrompt(prompt), 3);
  try {
    const arr = await toJSON<string[]>(text);
    return Array.isArray(arr) && arr.length > 0 ? arr.slice(0, 12) : [];
  } catch {
    const lines = text
      .split(/\r?\n+/)
      .map(l => l.replace(/^\s*[-*•\d.\)]\s+/, '').trim())
      .filter(Boolean);
    return lines.slice(0, 12);
  }
}

export type AcceptanceCriteriaGroup = { story: string; criteria: string[] };

export async function generateAcceptanceCriteriaGemini(userStories: string[]): Promise<AcceptanceCriteriaGroup[]> {
  if (!Array.isArray(userStories) || userStories.length === 0) return [];
  try { metric('ai_call', { kind: 'acceptance', variant: getPromptVariant(), mode: getGeminiMode(), redact: getRedactionEnabled() }); } catch {}
  const prompt = buildAcceptanceCriteriaPrompt({ userStories });
  const text = await getModelText(maybeRedactPrompt(prompt), 3);
  try {
    const arr = await toJSON<AcceptanceCriteriaGroup[]>(text);
    const sane = (arr || []).map(g => ({
      story: String(g?.story || ''),
      criteria: Array.isArray(g?.criteria) ? g.criteria.filter(Boolean) : [],
    })).filter(g => g.story && g.criteria.length > 0);
    return sane;
  } catch {
    // Fallback: try to parse as lines, split by blank lines per story
    const blocks = text.split(/\n\s*\n+/);
    const out: AcceptanceCriteriaGroup[] = [];
    for (let i = 0; i < Math.min(userStories.length, blocks.length); i++) {
      const criteria = blocks[i]
        .split(/\r?\n+/)
        .map(l => l.replace(/^\s*[-*•\d.\)]\s+/, '').trim())
        .filter(Boolean)
        .slice(0, 5);
      if (criteria.length) out.push({ story: userStories[i], criteria });
    }
    return out;
  }
}

export type AssessResult = {
  score: number;
  missing: string[];
  suggestions: string[];
  checks: { label: string; passed: boolean }[];
};

export async function assessPRDGemini(form: PRDFormData): Promise<AssessResult> {
  try { metric('ai_call', { kind: 'assess', variant: getPromptVariant(), mode: getGeminiMode(), redact: getRedactionEnabled() }); } catch {}
  const prompt = buildAssessPrompt({ formJson: JSON.stringify(form, null, 2) });
  const text = await getModelText(maybeRedactPrompt(prompt), 2);
  try {
    const obj = await toJSON<AssessResult>(text);
    return {
      score: Math.max(0, Math.min(100, Number(obj?.score ?? 0))),
      missing: Array.isArray(obj?.missing) ? obj.missing : [],
      suggestions: Array.isArray(obj?.suggestions) ? obj.suggestions : [],
      checks: Array.isArray(obj?.checks) ? obj.checks : [],
    };
  } catch {
    // Minimal fallback using text
    const suggestions = text
      .split(/\r?\n+/)
      .map(l => l.replace(/^\s*[-*•\d.\)]\s+/, '').trim())
      .filter(Boolean)
      .slice(0, 5);
    return { score: 0, missing: [], suggestions, checks: [] };
  }
}

export async function suggestImprovementsGemini(step: number, form: PRDFormData): Promise<{ suggestions: string[]; objectives?: string[] }> {
  const focus = step === 0 ? 'problem' : step === 1 ? 'solution' : step === 2 ? 'user stories' : 'requirements';
  try { metric('ai_call', { kind: 'suggestions', variant: getPromptVariant(), mode: getGeminiMode(), redact: getRedactionEnabled(), step }); } catch {}
  const prompt = buildSuggestionsPrompt({ step, focus, formJson: JSON.stringify(form, null, 2) });
  const text = await getModelText(maybeRedactPrompt(prompt), 3);
  try {
    const obj = await toJSON<{ suggestions: string[]; objectives?: string[] }>(text);
    return {
      suggestions: Array.isArray(obj?.suggestions) ? obj.suggestions : [],
      objectives: Array.isArray(obj?.objectives) ? obj.objectives : undefined,
    };
  } catch {
    const suggestions = text
      .split(/\r?\n+/)
      .map(l => l.replace(/^\s*[-*•\d.\)]\s+/, '').trim())
      .filter(Boolean)
      .slice(0, 6);
    return { suggestions };
  }
}
