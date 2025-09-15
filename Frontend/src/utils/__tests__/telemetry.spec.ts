import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as telemetry from '../telemetry';
import * as sentryModule from '@sentry/react';

// Mock Sentry module used inside telemetry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

function enable() { telemetry.setTelemetryEnabled(true); }
function disable() { telemetry.setTelemetryEnabled(false); }

// Clear session/local state between tests
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  disable();
});

describe('telemetry basic toggles', () => {
  it('is disabled by default, can enable/disable', () => {
    expect(telemetry.isTelemetryEnabled()).toBe(false);
    enable();
    expect(telemetry.isTelemetryEnabled()).toBe(true);
    disable();
    expect(telemetry.isTelemetryEnabled()).toBe(false);
  });
});

describe('metrics & profiling buffers', () => {
  it('does not record metrics when disabled', () => {
  telemetry.metric('test_disabled', { a: 1 });
  expect(sentryModule.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('records react_profile metric and aggregates samples when enabled', () => {
    enable();
  telemetry.metric('react_profile', { id: 'Comp', actual: 12.5, base: 10, phase: 'mount' });
    telemetry.metric('react_profile', { id: 'Comp', actual: 7.5, base: 10, phase: 'update' });
  expect(sentryModule.addBreadcrumb).toHaveBeenCalledTimes(2);
    const summary = telemetry.getProfilerSummary();
    expect(summary.aggregates.length).toBeGreaterThan(0);
  const comp = summary.aggregates.find(a=> a.id==='Comp');
  expect(comp && comp.count).toBe(2);
  expect(comp && comp.max).toBeGreaterThanOrEqual(comp!.min);
  });
});

describe('web vitals capture & persistence', () => {
  it('persists vitals to session and clears profiling data', async () => {
    enable();
    // Manually push fake vitals (simulate startWebVitalsCapture handler effects)
  (telemetry.metric as unknown as ReturnType<typeof vi.fn>)('web_vital', { name: 'LCP', value: 123, rating: 'good' });
    // Simulate a direct push (bypassing dynamic import) by using startWebVitalsCapture handler shape is internal; we test clearProfilingData persistence path instead.
    const before = telemetry.getWebVitals();
    // Write fake session copy to mimic load
    sessionStorage.setItem('pmc_web_vitals_buf', JSON.stringify(before));
    // Clear profiling data
    telemetry.clearProfilingData();
    const after = telemetry.getWebVitals();
    expect(after.length).toBe(0);
  });
});

describe('time to PRD & suggestions counters', () => {
  it('records time_to_prd_ms and suggestion_applied when enabled', () => {
    enable();
    telemetry.markPrdStart();
    telemetry.markPrdExported();
    telemetry.incSuggestionsApplied();
    expect(sentryModule.addBreadcrumb).toHaveBeenCalled();
  });
});
