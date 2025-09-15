import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PRDFormData } from "./ai";
import { buildUserStoriesPrompt, buildRequirementsPrompt, buildAcceptanceCriteriaPrompt, buildAssessPrompt, buildSuggestionsPrompt } from './prompts';
import { getPromptVariant } from './prompts';
import { metric, isTelemetryEnabled } from './telemetry';
import { retryWithBackoff, classifyError } from './aiBackoff';
import { toast } from './toast';

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
export function redact(text: string): string {
  // Expanded redaction:
  //  - Emails
  //  - URLs
  //  - UUIDs
  //  - Long digit sequences (16+)
  //  - Phone numbers (+country or local with separators)
  //  - Common API key/token formats (bearer-like 32-48+ mixed chars)
  //  - Git repo paths (user/repo or org/repo)
  //  - Absolute *nix / Windows file paths
  return text
    .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi, '[REDACTED_EMAIL]')
    .replace(/https?:\/\/[\w.-]+(?:\/[\w\-./?%&=]*)?/gi, '[REDACTED_URL]')
    .replace(/[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}/gi, '[REDACTED_ID]')
    .replace(/\b\d{16,}\b/g, '[REDACTED_NUMBER]')
    // explicit github-style personal access tokens (ghp_, gh_, pat_)
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr|pat)_[A-Za-z0-9]{20,}\b/g, '[REDACTED_TOKEN]')
    // JIRA / ticket IDs (e.g., ABC-123, ABCD-98765)
    .replace(/\b[A-Z][A-Z0-9]{1,9}-\d{1,6}\b/g, '[REDACTED_TICKET]')
    // phone numbers (international / local). Matches sequences of 7+ digits with separators
    .replace(/(?:(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?|\d{2,4}[\s-])?)\d{3,4}[\s-]?\d{3,4}(?:[\s-]?\d{3,4})?/g, '[REDACTED_PHONE]')
    // generic API keys / tokens (32+ hex/base64-ish continuous)
    .replace(/\b[a-zA-Z0-9_-]{32,}\b/g, '[REDACTED_TOKEN]')
    // Unix absolute paths (do before repo path so /Users/alice/... handled first)
    .replace(/\/(?:[A-Za-z0-9._-]+\/+)+[A-Za-z0-9._-]+/g, '[REDACTED_PATH]')
    // Windows paths C:\\folder\\... or UNC share paths
    .replace(/(?:[A-Za-z]:\\|\\\\)[^\s"'`]+/g, '[REDACTED_PATH]')
    // repo paths like user/repo AFTER path redaction; heuristic filters common non-repo owners
    .replace(/\b([A-Za-z0-9_.-]{2,40})\/([A-Za-z0-9_.-]{2,80})\b/g, (m, owner: string, repo: string) => {
      const stop = ['the','app','test','prod','dev','users','home','windows','programfiles'];
      if (stop.includes(owner.toLowerCase())) return m;
      if ((owner.length + repo.length) < 6) return m;
      return '[REDACTED_REPO]';
  });
}
function maybeRedactPrompt(prompt: string): string {
  try { return getRedactionEnabled() ? redact(prompt) : prompt; } catch { return prompt; }
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
  } catch {/* ignore localStorage errors */}
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


async function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('Gemini request timed out')), ms)),
  ]);
}

async function getModelText(prompt: string, tries = 2, meta?: { type?: string }): Promise<string> {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const attempt = async () => {
    const model = getModel();
    const res = await withTimeout(model.generateContent([{ text: prompt }]));
    return res.response.text();
  };
  try {
    const out = await retryWithBackoff(attempt, { tries, onRetry: ({ attempt, category }) => {
      metric('ai_retry_detail', { attempt, category, type: meta?.type });
    }});
    if (isTelemetryEnabled()) metric('ai_suggestion_latency', { ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start), model: resolveModelName(), type: meta?.type || 'raw' });
    return out;
  } catch (err) {
    // Attempt automatic fallback from pro -> flash on final failure
    try {
      const cat = classifyError(err);
      if (cat === 'auth') throw err; // don't fallback on auth issues
      const mode = getGeminiMode();
      if (mode === 'pro') {
        setGeminiMode('flash');
        const fb = getModel();
        const r = await withTimeout(fb.generateContent([{ text: prompt }]), 12000);
        metric('ai_call', { kind: 'fallback', from: 'pro', to: 'flash', category: cat });
        const out = r.response.text();
        if (isTelemetryEnabled()) metric('ai_suggestion_latency', { ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start), model: resolveModelName(), type: meta?.type || 'raw_fallback' });
        toast.info('AI fallback to flash model');
        return out;
      }
    } catch {/* swallow fallback errors */}
    toast.error('AI request failed');
    throw err instanceof Error ? err : new Error('Gemini request failed');
  }
}

// Simple character-based budget to avoid excessively long prompts
function trimPrompt(p: string, max = 8000) {
  return p.length > max ? p.slice(0, max) + '\n...[TRUNCATED]...' : p;
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
  try { const pv = getPromptVariant(); metric('ai_call', { kind: 'user_stories', variant: pv, promptVariant: pv, mode: getGeminiMode(), redact: getRedactionEnabled() }); } catch {}
  const prompt = buildUserStoriesPrompt({ problem, solution });
  const text = await getModelText(trimPrompt(maybeRedactPrompt(prompt)), 3, { type: 'stories' });
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
  try { const pv = getPromptVariant(); metric('ai_call', { kind: 'requirements', variant: pv, promptVariant: pv, mode: getGeminiMode(), redact: getRedactionEnabled() }); } catch {}
  const prompt = buildRequirementsPrompt({ userStories });
  const text = await getModelText(trimPrompt(maybeRedactPrompt(prompt)), 3, { type: 'requirements' });
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
  try { const pv = getPromptVariant(); metric('ai_call', { kind: 'acceptance', variant: pv, promptVariant: pv, mode: getGeminiMode(), redact: getRedactionEnabled() }); } catch {}
  const prompt = buildAcceptanceCriteriaPrompt({ userStories });
  const text = await getModelText(trimPrompt(maybeRedactPrompt(prompt)), 3);
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

export async function assessPRDGemini(form: PRDFormData, signal?: AbortSignal): Promise<AssessResult> {
  try { const pv = getPromptVariant(); metric('ai_call', { kind: 'assess', variant: pv, promptVariant: pv, mode: getGeminiMode(), redact: getRedactionEnabled() }); } catch {}
  const prompt = buildAssessPrompt({ formJson: JSON.stringify(form, null, 2) });
  if (signal?.aborted) throw new DOMException('Aborted','AbortError');
  const textPromise = getModelText(trimPrompt(maybeRedactPrompt(prompt)), 2, { type: 'assess' });
  const text = signal ? await Promise.race([
    textPromise,
    new Promise<string>((_, rej)=> signal.addEventListener('abort', ()=>rej(new DOMException('Aborted','AbortError')), { once: true }))
  ]) : await textPromise;
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

export async function suggestImprovementsGemini(step: number, form: PRDFormData, signal?: AbortSignal): Promise<{ suggestions: string[]; objectives?: string[] }> {
  const focus = step === 0 ? 'problem' : step === 1 ? 'solution' : step === 2 ? 'user stories' : 'requirements';
  try { const pv = getPromptVariant(); metric('ai_call', { kind: 'suggestions', variant: pv, promptVariant: pv, mode: getGeminiMode(), redact: getRedactionEnabled(), step }); } catch {}
  const prompt = buildSuggestionsPrompt({ step, focus, formJson: JSON.stringify(form, null, 2) });
  if (signal?.aborted) throw new DOMException('Aborted','AbortError');
  const textPromise = getModelText(trimPrompt(maybeRedactPrompt(prompt)), 3, { type: 'suggestions_step_' + step });
  const text = signal ? await Promise.race([
    textPromise,
    new Promise<string>((_, rej)=> signal.addEventListener('abort', ()=>rej(new DOMException('Aborted','AbortError')), { once: true }))
  ]) : await textPromise;
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
