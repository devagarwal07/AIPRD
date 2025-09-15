export type StepKey = 'problem' | 'solution' | 'userStories' | 'requirements';

type FeedbackRow = {
  key: string; // suggestion text
  step: StepKey;
  up: number;
  down: number;
  last: number;
};

const KEY = 'pmcopilot_suggestion_feedback';

function readAll(): FeedbackRow[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: FeedbackRow[]) {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
}

function normalize(text: string) { return (text || '').trim(); }

export function recordSuggestionFeedback(step: StepKey, text: string, helpful: boolean) {
  const t = normalize(text);
  if (!t) return;
  const rows = readAll();
  const idx = rows.findIndex(r => r.step === step && r.key === t);
  if (idx >= 0) {
    const r = rows[idx];
    rows[idx] = { ...r, up: r.up + (helpful ? 1 : 0), down: r.down + (!helpful ? 1 : 0), last: Date.now() };
  } else {
    rows.unshift({ key: t, step, up: helpful ? 1 : 0, down: helpful ? 0 : 1, last: Date.now() });
  }
  // Cap storage
  writeAll(rows.slice(0, 500));
}

export function getSuggestionStats(step: StepKey, text: string): { up: number; down: number; score: number } {
  const t = normalize(text);
  const rows = readAll();
  const r = rows.find(x => x.step === step && x.key === t);
  const up = r?.up ?? 0;
  const down = r?.down ?? 0;
  return { up, down, score: up - down };
}

export function getPreferredSuggestionExamples(step: StepKey, max = 3): string[] {
  const rows = readAll().filter(r => r.step === step);
  // Score by net score, then recentness
  const good = rows
    .map(r => ({ ...r, score: r.up - r.down }))
    .filter(r => r.score >= 2 && r.up >= 2)
    .sort((a, b) => (b.score - a.score) || (b.last - a.last))
    .slice(0, max)
    .map(r => r.key);
  return good;
}
