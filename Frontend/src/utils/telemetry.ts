import * as Sentry from '@sentry/react';

type TelemetryConfig = {
  dsn?: string;
  environment?: string;
};

const OPT_KEY = 'pmcopilot_telemetry_optin';

export function isTelemetryEnabled() {
  try {
    const v = localStorage.getItem(OPT_KEY);
    return v === 'true';
  } catch { return false; }
}

export function setTelemetryEnabled(enabled: boolean) {
  try { localStorage.setItem(OPT_KEY, String(enabled)); } catch { }
}

export function initSentry(cfg?: TelemetryConfig) {
  if (!isTelemetryEnabled()) return;
  const dsn = cfg?.dsn || import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  // Guard against double init (Sentry throws if re-init w/ same Dsn in some modes)
  if ((Sentry as any).getCurrentHub?.().getClient()) return;
  Sentry.init({
    dsn,
    environment: cfg?.environment || import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function captureError(err: any, context?: Record<string, any>) {
  if (!isTelemetryEnabled()) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

// Simple metrics capture via Sentry breadcrumbs
export function metric(name: string, data?: Record<string, any>) {
  if (!isTelemetryEnabled()) return;
  Sentry.addBreadcrumb({ category: 'metric', level: 'info', message: name, data });
  if (name === 'react_profile' && data) {
    try { aggregateReactProfile(data); } catch { }
  }
}

// Time-to-PRD helper
let prdStartTs: number | null = null;
export function markPrdStart() { prdStartTs = Date.now(); }
export function markPrdExported() {
  if (prdStartTs) {
    metric('time_to_prd_ms', { ms: Date.now() - prdStartTs });
    prdStartTs = null;
  }
}

// Suggestions applied counter
let suggestionsApplied = 0;
export function incSuggestionsApplied() {
  suggestionsApplied += 1;
  metric('suggestion_applied', { total: suggestionsApplied });
}

// React profiler aggregation
type ProfSample = { id: string; phase: string; actual: number; base: number; ts: number };
type ProfAgg = { id: string; count: number; total: number; max: number; min: number; avg: number; last: number };
const profBuffer: ProfSample[] = [];
const profIndex: Record<string, ProfAgg> = {};

function aggregateReactProfile(d: Record<string, any>) {
  const id = String(d.id || 'unknown');
  const actual = Number(d.actual || d.actualDuration || 0);
  const base = Number(d.base || d.baseDuration || 0);
  const phase = String(d.phase || 'mount');
  const sample: ProfSample = { id, phase, actual, base, ts: Date.now() };
  profBuffer.push(sample);
  const agg = profIndex[id] || { id, count: 0, total: 0, max: 0, min: Number.POSITIVE_INFINITY, avg: 0, last: 0 };
  agg.count += 1;
  agg.total += actual;
  agg.max = Math.max(agg.max, actual);
  agg.min = Math.min(agg.min, actual);
  agg.avg = agg.total / agg.count;
  agg.last = actual;
  profIndex[id] = agg;
  // Trim buffer to last 300 samples
  if (profBuffer.length > 300) profBuffer.splice(0, profBuffer.length - 300);
}

export function getProfilerSummary() {
  return {
    samples: [...profBuffer],
    aggregates: Object.values(profIndex).sort((a, b) => b.avg - a.avg)
  };
}

// Web Vitals capture
type WebVital = { name: string; value: number; id: string; rating?: string; delta?: number; entries?: any[]; ts: number };
const webVitals: WebVital[] = [];
const VITALS_SS_KEY = 'pmc_web_vitals_buf';
let vitalsStarted = false; // ensure we only wire listeners once per (re)enable cycle

function loadVitalsFromSession() {
  try {
    const raw = sessionStorage.getItem(VITALS_SS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        webVitals.splice(0, webVitals.length, ...arr.slice(-100));
      }
    }
  } catch { }
}
function persistVitalsToSession() {
  try { sessionStorage.setItem(VITALS_SS_KEY, JSON.stringify(webVitals.slice(-100))); } catch { }
}
loadVitalsFromSession();

export function getWebVitals() { return [...webVitals]; }
export function clearProfilingData() {
  profBuffer.splice(0, profBuffer.length);
  for (const k of Object.keys(profIndex)) delete profIndex[k];
  webVitals.splice(0, webVitals.length);
  persistVitalsToSession();
}

export function getWebVitalsAggregates() {
  const groups: Record<string, { name: string; count: number; last: number; max: number; min: number; total: number; avg: number }> = {};
  for (const v of webVitals) {
    const g = groups[v.name] || { name: v.name, count: 0, last: 0, max: 0, min: Number.POSITIVE_INFINITY, total: 0, avg: 0 };
    g.count += 1; g.last = v.value; g.max = Math.max(g.max, v.value); g.min = Math.min(g.min, v.value); g.total += v.value; g.avg = g.total / g.count; groups[v.name] = g;
  }
  return Object.values(groups).map(g => ({ ...g, min: g.min === Number.POSITIVE_INFINITY ? 0 : g.min })).sort((a, b) => b.avg - a.avg);
}

export async function startWebVitalsCapture() {
  // Deprecated: prefer ensureWebVitalsCapture() which checks consent first
  if (!isTelemetryEnabled()) return; // do not collect before consent
  if (vitalsStarted) return;
  vitalsStarted = true;
  // Guard against non-browser test environments lacking self/window
  if (typeof window === 'undefined') return;
  // Further guard for Vitest / test runners where globalThis.self is missing causing web-vitals to throw
  // Detect via import.meta.vitest (Vite) or VITEST env flag
  try {
  // @ts-expect-error intentionally ignoring missing type on dynamic import for test env
    if ((import.meta as any).vitest || process.env.VITEST) {
      return; // skip wiring entirely in test to avoid late timeouts referencing self
    }
  } catch { /* ignore */ }
  try {
    const { onCLS, onFID, onLCP, onINP, onTTFB } = await import('web-vitals');
    const handler = (entry: any) => {
      if (!isTelemetryEnabled()) return; // runtime guard post opt-out
      const rec: WebVital = { name: entry.name, value: entry.value, id: entry.id, rating: entry.rating, delta: entry.delta, entries: entry.entries, ts: Date.now() };
      webVitals.push(rec);
      if (webVitals.length > 100) webVitals.splice(0, webVitals.length - 100);
      metric('web_vital', { name: rec.name, value: Number(rec.value.toFixed ? rec.value.toFixed(2) : rec.value), rating: rec.rating });
      persistVitalsToSession();
    };
    onCLS(handler);
    onFID(handler);
    onLCP(handler);
    if ((onINP as any)) onINP(handler);
    onTTFB(handler);
  } catch (e) {
    // Silently ignore if web-vitals not available
  }
}

export function ensureWebVitalsCapture() {
  if (!vitalsStarted && isTelemetryEnabled()) {
    startWebVitalsCapture();
  }
}

export function disableTelemetryRuntime() {
  // Mark vitals as not started so future re-enable can re-hook
  vitalsStarted = false;
  clearProfilingData();
  // Close Sentry transport (best-effort); swallow if not initialized
  try { (Sentry as any).getCurrentHub?.().getClient()?.close?.(); } catch { }
}
