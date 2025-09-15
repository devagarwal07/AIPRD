# Performance Tracing

This document explains existing performance measurements and how to add new ones while keeping overhead minimal.

## Current Measurements
| Area | Mechanism | Event / Output | Notes |
|------|-----------|----------------|-------|
| AI suggestion latency | Timestamp diff around model call | `ai_suggestion_latency` | Includes model & type labels. |
| AI gap detection | Timestamp diff in local assessment | `ai_gap_detection_ms` | Local heuristic cost only. |
| React component render profiling | `<Profiler>` wrapper | `react_profile` | Emitted for RightPanel with phase + actual time. |
| Autosave debounce | Simulated debounce + mark saved | `autosave_success` | Tracks perceived persistence latency. |
| Retry backoff | Backoff loop instrumentation | `ai_retry`, `ai_retry_detail` | Captures attempt & category. |

## Adding a New Trace
1. Identify a clear boundary (start just before expensive async or compute; end immediately after result ready).
2. Use `performance.now()` if available, else `Date.now()`.
3. Emit event only if telemetry enabled (reuse `isTelemetryEnabled()`).
4. Payload guidelines:
   - Always include `ms` rounded (`Math.round`).
   - Include minimal dimension tags (e.g., `type`, `model`, `category`).
   - Avoid raw user input or generated text.

### Example Wrapper
```ts
function timeBlock<T>(event: string, meta: Record<string, any>, fn: () => T): T {
  const start = performance?.now?.() ?? Date.now();
  try { return fn(); } finally {
    const ms = Math.round((performance?.now?.() ?? Date.now()) - start);
    if (isTelemetryEnabled()) metric(event, { ms, ...meta });
  }
}
```
Used already in `ai.ts` for deterministic local generation timing.

## When NOT to Trace
- Extremely hot paths (<2ms, called dozens of times per second).
- Pure view-layer calculations unless investigating a regression (prefer dev-only gating).
- Code already covered by existing higher-level timing (avoid duplicate nested events unless necessary).

## Web Vitals
Web vitals can be added (LCP, INP, CLS) by importing `web-vitals` and emitting `web_vital`. Consider sampling (e.g., 10%).

## React Profiler Usage
Wrap only coarse regions (e.g., right panel) to control event volume. Each render triggers an event; monitor volume before expanding scope.

```tsx
<Profiler id="RightPanel" onRender={(id, phase, actual) => {
  if (isTelemetryEnabled()) metric('react_profile', { id, phase, actual_ms: Math.round(actual) });
}}>
  <RightPanel />
</Profiler>
```

## Backoff Insights
`ai_retry_detail` helps distinguish between transient network vs rate-limit vs safety rejections. Combine with fallback model events to evaluate provider health.

## Performance Budget Targets (Initial)
| Type | Target |
|------|--------|
| First interactive UI (cold) | < 2.5s on mid-tier laptop |
| AI suggestion round trip | < 3s p95 |
| Snapshot save (local) | < 120ms p95 |
| Autosave perceived latency | < 1s |

## Future Enhancements
- Add `diff.render_ms` for large inline diff sets (if complexity increases).
- Introduce batching of `react_profile` in dev builds only.
- Optional session-level aggregate (average AI latency) emitted on unload.

_Last updated: 2025-09-15_
