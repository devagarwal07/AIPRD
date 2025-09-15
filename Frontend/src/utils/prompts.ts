// Centralized prompt registry with simple A/B variants and local overrides.
// Variant selection:
// - Query param ?pv=<variant>
// - localStorage key 'pmcopilot_prompt_variant'
// Overrides (no code change):
// - localStorage key 'pmcopilot_prompt_overrides' as JSON mapping
//   e.g. { "v2": { "stories": "..." }, "assess": "..." }

export type PromptId = 'stories' | 'requirements' | 'acceptance' | 'assess' | 'suggestions';
export type PromptVariant = 'v1' | 'v2' | string;

const VARIANT_KEY = 'pmcopilot_prompt_variant';
const OVERRIDES_KEY = 'pmcopilot_prompt_overrides';

export function getPromptVariant(): PromptVariant {
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get('pv');
    if (qp) return qp;
  } catch {}
  try { return localStorage.getItem(VARIANT_KEY) || 'v1'; } catch { return 'v1'; }
}

export function setPromptVariant(v: PromptVariant) {
  try { localStorage.setItem(VARIANT_KEY, v); } catch {}
}

type Registry = Record<PromptVariant, Partial<Record<PromptId, string>>>;

// Default templates (v1) mirror the previous inline prompts
const registry: Registry = {
  v1: {
    stories: `You are an expert product manager. Given a problem and solution summary, output exactly 5 concise user stories as a JSON array of strings. Do not add numbering or any extra fields. Each story MUST follow the format: "As a <persona>, I want to <goal> so that <benefit>."

Problem:\n{{problem}}\n\nSolution:\n{{solution}}`,

    requirements: `You are an expert product manager. Based on these user stories, produce 8-12 concise requirements as a JSON array of strings. Include a healthy mix of functional and non-functional requirements. Avoid duplicates and keep each under 120 characters.

User stories:\n{{userStoriesText}}`,

    acceptance: `You are an expert product manager.
For each user story below, produce 2-5 clear Acceptance Criteria. Prefer concise Given/When/Then style.
Return STRICT JSON as an array of objects: { "story": string, "criteria": string[] }.
Constraints:
- Each criterion must be <= 120 characters
- No numbering or extra fields

User stories:\n{{userStoriesText}}`,

    assess: `Assess this PRD for completeness using PM best practices. Return a strict JSON object only with keys score, missing, suggestions, checks.
- score: overall completeness 0-100
- missing: gaps to address
- suggestions: tactical improvements
- checks: list of boolean checks (label + passed)

PRD JSON:\n{{formJson}}`,

    suggestions: `You are an expert PM copilot. For the PRD below, produce focused, actionable suggestions for improving the {{focus}} of the PRD.

Return STRICT JSON with shape: { "suggestions": string[], "objectives"?: string[] }
- suggestions: 3-6 concise bullets (max 120 chars each)
- if step is 1 (solution), also propose 3-5 measurable objectives in "objectives" (short phrases)

Step: {{step}}
PRD JSON:\n{{formJson}}`,
  },
  // Example v2 variant (slightly more concise wording). Can be tuned via localStorage overrides.
  v2: {
    stories: `Act as a senior PM. From the problem and solution, return exactly 5 user stories as a JSON array of strings. Keep them concise and in the form: "As a <persona>, I want <goal> so that <benefit>."

Problem:\n{{problem}}\n\nSolution:\n{{solution}}`,
  },
};

function getOverrides(): Registry | null {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj as Registry : null;
  } catch { return null; }
}

function interpolate(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/{{\s*(\w+)\s*}}/g, (_, k) => (k in ctx ? ctx[k] : ''));
}

function getTemplate(id: PromptId): string {
  const variant = getPromptVariant();
  const overrides = getOverrides();
  // precedence: overrides[variant][id] -> overrides[id] -> registry[variant][id] -> registry.v1[id]
  const byVar = overrides?.[variant]?.[id];
  if (byVar) return byVar;
  const generic = (overrides as any)?.[id] as string | undefined;
  if (generic) return generic;
  const regVar = registry[variant]?.[id];
  if (regVar) return regVar;
  return registry.v1[id] || '';
}

export function buildUserStoriesPrompt(input: { problem: string; solution: string }): string {
  const tpl = getTemplate('stories');
  return interpolate(tpl, {
    problem: input.problem || '',
    solution: input.solution || '',
  });
}

export function buildRequirementsPrompt(input: { userStories: string[] }): string {
  const tpl = getTemplate('requirements');
  const userStoriesText = (input.userStories || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  return interpolate(tpl, { userStoriesText });
}

export function buildAcceptanceCriteriaPrompt(input: { userStories: string[] }): string {
  const tpl = getTemplate('acceptance');
  const userStoriesText = (input.userStories || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  return interpolate(tpl, { userStoriesText });
}

export function buildAssessPrompt(input: { formJson: string }): string {
  const tpl = getTemplate('assess');
  return interpolate(tpl, { formJson: input.formJson });
}

export function buildSuggestionsPrompt(input: { step: number; focus: string; formJson: string }): string {
  const tpl = getTemplate('suggestions');
  return interpolate(tpl, {
    step: String(input.step),
    focus: input.focus,
    formJson: input.formJson,
  });
}
