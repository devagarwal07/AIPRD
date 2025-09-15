// Lightweight, deterministic "AI" helpers to improve PM workflows without external APIs

export type PRDFormData = {
  title: string;
  problem: string;
  solution: string;
  objectives: string[];
  userStories: string[];
  requirements: string[];
};

import { metric, isTelemetryEnabled } from './telemetry';

function timeBlock<T>(name: string, data: Record<string, any>, fn: () => T): T {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try { return fn(); } finally {
    if (isTelemetryEnabled()) metric(name, { ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start), ...data });
  }
}

export function generateUserStories(problem: string, solution: string): string[] {
  const domainHint = inferDomain(problem + " " + solution);
  const personas = [
    "end user",
    "power user",
    "administrator",
    "support agent",
    "analyst",
  ];
  const goals = [
    `achieve the core value of ${domainHint}`,
    "complete my primary task faster",
    "recover from errors gracefully",
    "understand what to do next",
    "trust that my data is safe",
  ];
  const benefits = [
    "save time",
    "reduce confusion",
    "avoid mistakes",
    "feel in control",
    "reach my goal reliably",
  ];

  // Seeded by content length for deterministic variety
  const seed = (problem.length + solution.length) % 5;
  return timeBlock('ai_suggestion_latency', { type: 'stories', model: 'local' }, () => new Array(5).fill(0).map((_, i) => {
    const p = personas[(i + seed) % personas.length];
    const g = goals[(i + seed) % goals.length];
    const b = benefits[(i + seed) % benefits.length];
    return `As a ${p}, I want to ${g} so that I ${b}.`;
  }));
}

export function generateRequirements(userStories: string[]): string[] {
  const functional = [
    "System shall provide clear primary action within 1 click",
    "System shall support undo for destructive actions",
    "System shall log key user events for analytics",
    "System shall expose status and error states with guidance",
    "System shall allow role-based access to sensitive features",
  ];
  const nonFunctional = [
    "Performance: P95 action completes in < 1.5s",
    "Reliability: 99.9% availability during business hours",
    "Security: All data encrypted in transit and at rest",
    "Accessibility: WCAG 2.1 AA compliance",
    "Compatibility: Works on latest 2 versions of major browsers",
  ];
  const derived = userStories.slice(0, 3).map((s) => `Acceptance: ${deriveAcceptanceFromStory(s)}`);
  return timeBlock('ai_suggestion_latency', { type: 'requirements', model: 'local' }, () => [...functional, ...nonFunctional, ...derived]);
}

export function assessPRD(form: PRDFormData): {
  score: number; // 0-100
  missing: string[];
  suggestions: string[];
  checks: { label: string; passed: boolean }[];
} {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const checks = [
    { label: "Title present", passed: !!form.title.trim() },
    { label: "Problem describes user, impact, and context", passed: hasUserImpactContext(form.problem) },
    { label: "Solution explains value and approach", passed: /value|benefit|journey|workflow|approach/i.test(form.solution) },
    { label: "At least 3 user stories", passed: form.userStories.filter(Boolean).length >= 3 },
    { label: "At least 5 requirements", passed: form.requirements.filter(Boolean).length >= 5 },
    { label: "Quantitative metrics present", passed: /(\d+%|\d+\s?(ms|s|min|hrs|d|users))/i.test(form.problem + " " + form.solution) },
    { label: "Edge cases or risks mentioned", passed: /(edge case|error|risk|fallback|constraint)/i.test(form.problem + " " + form.solution) },
  ];

  const base = checks.reduce((acc, c) => acc + (c.passed ? 1 : 0), 0);
  const score = Math.round((base / checks.length) * 100);

  const missing: string[] = [];
  if (!checks[1].passed) missing.push("Clarify who is affected, how often, and current workaround.");
  if (!checks[2].passed) missing.push("Describe value proposition and high-level architecture or workflow.");
  if (!checks[5].passed) missing.push("Add measurable targets (e.g., +15% activation, P95 < 1.5s).");
  if (!checks[6].passed) missing.push("List 2-3 likely risks and mitigations.");

  const suggestions = [
    "Add success metrics with baseline and target (e.g., from 20% to 35% D7 retention).",
    "Attach acceptance criteria per user story.",
    "Separate functional vs non-functional requirements.",
    "Note dependencies and open questions for stakeholders.",
  ];

  const result = { score, missing, suggestions, checks };
  if (isTelemetryEnabled()) metric('ai_gap_detection_ms', { ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start), sections: form.userStories.length + form.requirements.length + form.objectives.length });
  return result;
}

function inferDomain(text: string): string {
  if (/notification|engagement/i.test(text)) return "user engagement";
  if (/analytics|report|metric/i.test(text)) return "insights and reporting";
  if (/auth|login|sign\s?in/i.test(text)) return "secure access";
  if (/performance|offline|latency/i.test(text)) return "reliable performance";
  return "the product";
}

function deriveAcceptanceFromStory(story: string): string {
  // Extract a simple goal fragment from the user story to craft acceptance criteria
  const match = story.match(/I want to (.*?) so that/i);
  const goal = match?.[1] || "complete the task";
  return `${capitalize(goal)}: Given valid input, when the user attempts this, then it succeeds and is tracked.`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hasUserImpactContext(problem: string): boolean {
  return /user|customer|persona/i.test(problem) && /(impact|pain|cost|time|friction)/i.test(problem);
}
