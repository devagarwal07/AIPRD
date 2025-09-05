import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PRDFormData } from "./ai";

const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
export const geminiEnabled = typeof API_KEY === 'string' && API_KEY.length > 0;

const MODEL_NAME = ((import.meta as any).env?.VITE_GEMINI_MODEL as string) || 'gemini-1.5-flash';

function getModel() {
  if (!geminiEnabled) throw new Error('Gemini API key not configured');
  const genAI = new GoogleGenerativeAI(API_KEY!);
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
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
  const prompt = `You are an expert product manager. Given a problem and solution summary, output exactly 5 concise user stories as a JSON array of strings. Do not add numbering or any extra fields. Each story MUST follow the format: "As a <persona>, I want to <goal> so that <benefit>."

Problem:\n${problem}\n\nSolution:\n${solution}`;
  const text = await getModelText(prompt, 3);
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
  const prompt = `You are an expert product manager. Based on these user stories, produce 8-12 concise requirements as a JSON array of strings. Include a healthy mix of functional and non-functional requirements. Avoid duplicates and keep each under 120 characters.

User stories:\n${userStories.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  const text = await getModelText(prompt, 3);
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

export type AssessResult = {
  score: number;
  missing: string[];
  suggestions: string[];
  checks: { label: string; passed: boolean }[];
};

export async function assessPRDGemini(form: PRDFormData): Promise<AssessResult> {
  const schema = {
    score: 'number (0-100)',
    missing: 'string[]',
    suggestions: 'string[]',
    checks: 'Array<{ label: string; passed: boolean }>',
  };
  const prompt = `Assess this PRD for completeness using PM best practices. Return a strict JSON object only with keys ${Object.keys(schema).join(', ')}.
- score: overall completeness 0-100
- missing: gaps to address
- suggestions: tactical improvements
- checks: list of boolean checks (label + passed)

PRD JSON:\n${JSON.stringify(form, null, 2)}`;
  const text = await getModelText(prompt, 2);
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
  const prompt = `You are an expert PM copilot. For the PRD below, produce focused, actionable suggestions for improving the ${focus} of the PRD.

Return STRICT JSON with shape: { "suggestions": string[], "objectives"?: string[] }
- suggestions: 3-6 concise bullets (max 120 chars each)
- if step is 1 (solution), also propose 3-5 measurable objectives in "objectives" (short phrases)

Step: ${step}
PRD JSON:\n${JSON.stringify(form, null, 2)}`;
  const text = await getModelText(prompt, 3);
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
