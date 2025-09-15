import { render, fireEvent, act } from '@testing-library/react';
import { ProfilerDashboard } from '../prd/ProfilerDashboard';
import * as telemetry from '../../utils/telemetry';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper to seed profiler + vitals buffers via module internals (public getters only used for assertions)
function seedTelemetry() {
  // We can't push directly; instead we monkey-patch getProfilerSummary to return synthetic data for the polling interval.
  vi.spyOn(telemetry, 'getProfilerSummary').mockImplementation(()=> ({
    aggregates: [
      { id: 'CompA', count: 3, total: 12, max: 6, min: 2, avg: 4, last: 5 },
      { id: 'CompB', count: 1, total: 8, max: 8, min: 8, avg: 8, last: 8 }
    ],
    bufferSize: 2
  }) as any);
  vi.spyOn(telemetry, 'getWebVitalsAggregates').mockImplementation(()=> ([
    { name: 'CLS', count: 2, total: 0.14, max: 0.09, min: 0.05, avg: 0.07, last: 0.09 },
    { name: 'LCP', count: 1, total: 1800, max: 1800, min: 1800, avg: 1800, last: 1800 }
  ]) as any);
  vi.spyOn(telemetry, 'getWebVitals').mockImplementation(()=> ([
    { name: 'CLS', value: 0.05, delta: 0.05 },
    { name: 'CLS', value: 0.09, delta: 0.04 },
    { name: 'LCP', value: 1800, delta: 1800 }
  ]) as any);
}

describe('ProfilerDashboard', () => {
  beforeEach(()=> {
    vi.useFakeTimers();
    seedTelemetry();
  });
  afterEach(()=> {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders aggregates and vitals, downloads JSON, and clears data', async () => {
    // Spy on URL and anchor interactions
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(()=>{});
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(()=>{});
    const clearSpy = vi.spyOn(telemetry, 'clearProfilingData');

    let intervalCb: any;
  const intervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((cb: any)=> { intervalCb = cb; return 1 as any; });
    const { getByText } = render(<ProfilerDashboard />);
    await act(async ()=> { intervalCb && intervalCb(); });

    expect(await Promise.resolve(getByText('CompA'))).toBeTruthy();
    expect(getByText('CompB')).toBeTruthy();
    expect(getByText('Web Vitals')).toBeTruthy();
    expect(getByText('CLS')).toBeTruthy();
    expect(getByText('LCP')).toBeTruthy();

  // Capture timeout callback registrations
  const timeouts: Function[] = [];
  const stSpy = vi.spyOn(window, 'setTimeout').mockImplementation(((cb: any)=> { timeouts.push(cb); return 1 as any; }) as any);

  // Trigger download (schedules revoke) after which a setTimeout should have been registered
  fireEvent.click(getByText('Download JSON'));
  expect(createSpy).toHaveBeenCalledTimes(1);
  expect(clickSpy).toHaveBeenCalledTimes(1);

  // Clear and ensure aggregates list message appears
    fireEvent.click(getByText('Clear'));
    expect(clearSpy).toHaveBeenCalled();

  // After clear we set local state arrays empty, so component should show 'No samples yet…'
  expect(getByText(/No samples yet/i)).toBeTruthy();
  // Vitals list should also be empty ("No vitals captured yet." text present)
  expect(getByText(/No vitals captured yet/i)).toBeTruthy();

    // Simulate revoke timeout manually (the code uses setTimeout(...,2000))
    // Manually invoke any captured timeout callbacks (simulate 2s passing)
    timeouts.forEach(cb => cb());
    expect(revokeSpy).toHaveBeenCalled();
    intervalSpy.mockRestore();
    stSpy.mockRestore();
  });
});
