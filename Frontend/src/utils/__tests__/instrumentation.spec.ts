import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as telemetry from '../telemetry';
import { generateUserStories, generateRequirements, assessPRD } from '../ai';
import { prdToMarkdown, exportStoriesCSV, exportRequirementsCSV } from '../integrations';
import { generateUserStoriesGemini } from '../gemini';

// NOTE: We only shallowly test that metric() is invoked with expected event names/props.
// Gemini call is mocked to avoid real network.

vi.mock('../telemetry', async () => {
  const actual = await vi.importActual<any>('../telemetry');
  return {
    ...actual,
    metric: vi.fn(),
    isTelemetryEnabled: vi.fn(() => true),
  };
});

vi.mock('../gemini', () => ({
  generateUserStoriesGemini: vi.fn(async () => ['Story A', 'Story B']),
}));

describe('instrumentation metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits ai_suggestion_latency for local user stories', () => {
  generateUserStories('Problem', 'Solution');
  const metricMock = telemetry.metric as unknown as ReturnType<typeof vi.fn>;
  const calls = metricMock.mock.calls.flat();
  expect(calls.some((c: any) => c === 'ai_suggestion_latency')).toBe(true);
  });

  it('emits ai_suggestion_latency for local requirements', () => {
  generateRequirements(['As a user I want']);
  const metricMock = telemetry.metric as unknown as ReturnType<typeof vi.fn>;
  const calls = metricMock.mock.calls.flat();
  expect(calls.filter((c: any) => c === 'ai_suggestion_latency').length).toBeGreaterThan(0);
  });

  it('emits ai_gap_detection_ms for assessPRD', () => {
  assessPRD({ title: 'T', problem: 'P', solution: 'S', objectives: ['O'], userStories: ['U'], requirements: ['R'] });
  const metricMock = telemetry.metric as unknown as ReturnType<typeof vi.fn>;
  const calls = metricMock.mock.calls.flat();
  expect(calls.includes('ai_gap_detection_ms')).toBe(true);
  });

  it('emits export_markdown when converting PRD', () => {
  prdToMarkdown({ title: 'X', problem: 'P', solution: 'S', objectives: ['O'], userStories: ['U'], requirements: ['R'] }, { problem: true, solution: true, objectives: true, userStories: true, requirements: true });
  const metricMock = telemetry.metric as unknown as ReturnType<typeof vi.fn>;
  const calls = metricMock.mock.calls.flat();
  expect(calls.includes('export_markdown')).toBe(true);
  });

  it('emits export_csv for stories & requirements', () => {
  exportStoriesCSV(['S1']);
  exportRequirementsCSV(['R1']);
  const metricMock = telemetry.metric as unknown as ReturnType<typeof vi.fn>;
  const calls = metricMock.mock.calls.flat();
  const csvEvents = calls.filter((c: any) => c === 'export_csv');
  expect(csvEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('emits ai_suggestion_latency for gemini wrapper', async () => {
  await generateUserStoriesGemini('P', 'S');
  const metricMock = telemetry.metric as unknown as ReturnType<typeof vi.fn>;
  const calls = metricMock.mock.calls.flat();
  expect(calls.includes('ai_suggestion_latency')).toBe(true);
  });

  it('does not emit when telemetry disabled', () => {
  (telemetry.isTelemetryEnabled as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
  (telemetry.metric as unknown as ReturnType<typeof vi.fn>).mockClear();
  generateUserStories('Problem', 'Solution');
  const metricMock = telemetry.metric as unknown as ReturnType<typeof vi.fn>;
  const calls = metricMock.mock.calls.flat();
  expect(calls.length).toBe(0);
  });
});
