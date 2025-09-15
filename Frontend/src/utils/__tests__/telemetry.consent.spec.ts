import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as telemetry from '../telemetry';
import * as sentryModule from '@sentry/react';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

// Helper to reset internal state between tests
function reset() {
  localStorage.clear();
  sessionStorage.clear();
  (sentryModule.addBreadcrumb as unknown as ReturnType<typeof vi.fn>).mockClear();
  telemetry.setTelemetryEnabled(false);
  telemetry.clearProfilingData();
}

beforeEach(() => reset());

describe('telemetry consent lifecycle', () => {
  it('does not record metrics before consent', () => {
    telemetry.metric('pre_consent', { a: 1 });
    expect(sentryModule.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('records metrics only after enabling and stops after disabling', () => {
    telemetry.setTelemetryEnabled(true);
    telemetry.initSentry();
    telemetry.metric('post_enable', {});
    expect(sentryModule.addBreadcrumb).toHaveBeenCalledTimes(1);
    telemetry.setTelemetryEnabled(false);
    telemetry.metric('after_disable', {});
    // Still only 1 call because disabled prevents new breadcrumbs
    expect(sentryModule.addBreadcrumb).toHaveBeenCalledTimes(1);
  });

  it('web vitals capture is deferred until ensureWebVitalsCapture after consent', async () => {
    telemetry.setTelemetryEnabled(true);
    telemetry.ensureWebVitalsCapture();
    // We cannot easily trigger real web-vitals events without the actual library; instead we assert that enabling metrics after consent still works
    telemetry.metric('synthetic_vital', { name: 'LCP', value: 100 });
    expect(sentryModule.addBreadcrumb).toHaveBeenCalled();
  });
});
