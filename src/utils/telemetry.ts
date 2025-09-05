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
  try { localStorage.setItem(OPT_KEY, String(enabled)); } catch {}
}

export function initSentry(cfg?: TelemetryConfig) {
  if (!isTelemetryEnabled()) return;
  const dsn = cfg?.dsn || import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
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
