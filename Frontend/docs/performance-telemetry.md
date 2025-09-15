# Performance & Telemetry Guide

This document defines the event taxonomy, naming conventions, sampling strategy, privacy rules, and extension guidelines for PM Copilot telemetry. Telemetry is **opt‑in**; no events are emitted until the user grants consent.

## Goals

1. Product Insight: Understand feature adoption (exports, snapshots, AI usage).
2. Quality & Reliability: Detect regressions (latency, error spikes, migration anomalies).
3. Performance Budgeting: Track core flows vs. targets (AI suggestion latency, export generation time).
4. Privacy Preservation: Collect only metadata; never persist raw user content.

## Non‑Goals

- Session replay of full user input (not required for KPIs).
- Long‑term storage of personally identifiable information (PII).
- High cardinality logging for every minor state change.

---
## Event Naming Conventions

Format: `domain_action[_qualifier]`

| Rule | Example | Rationale |
|------|---------|-----------|
| Lowercase snake_case | `ai_suggestion_latency` | Consistency & simple parsing |
| Domain prefix required | `prd_snapshot`, `export_markdown` | Easy grouping |
| Past tense for discrete actions | `prd_snapshot_created` (future) | Clarify lifecycle stage |
| Suffix `_ms` or `_latency` for durations | `ai_suggestion_latency` | Explicit unit |
| Avoid redundant domain words | `export_markdown` not `export_markdown_generated` | Brevity |

Reserved domains: `ai`, `prd`, `export`, `sync`, `notion`, `telemetry`, `profiling`.

---
## Current Event Catalog

| Event | Domain | When Fired | Key Props | Notes |
|-------|--------|-----------|-----------|-------|
| `ai_suggestion_latency` | ai | After suggestions (local or Gemini) | `ms`, `model`, `type` | Local model uses `model: local` |
| `ai_assess_ms` | ai | After assessment success | `ms`, `cached`, `promptVariant` | Duration gate |
| `ai_assess_retry` | ai | Retry path success | `promptVariant` | No duration to avoid double count |
| `ai_suggest_ms` | ai | After suggestions success | `ms`, `step`, `cached`, `promptVariant` | Step = problem/solution/etc |
| `ai_suggest_retry` | ai | Retry path success | `step`, `promptVariant` | |
| `ai_call` | ai | Gemini call start (various kinds) | `kind`, `variant`, `mode`, `redact`, `step?` | Kind = user_stories / assess / suggestions |
| `ai_gap_detection_ms` | ai | Local gap assessment | `ms`, `sections` | Local only |
| `export_markdown` | export | Markdown generation | `length`, `sections`, `hasScore`, `hasGaps` | No raw text |
| `export_csv` | export | CSV export triggered | `type`, `rows` | Type = stories / requirements |
| `prd_snapshot` | prd | Snapshot saved | `compressed`, `schemaVersion`, `sectionsCount` | Add `migratedFrom` on upgrade (TBD) |
| `sync_linear` | sync | Linear API call success | `items`, `api` (bool) | Distinguish browser vs backend |
| `sync_jira` | sync | Jira API call success | `items`, `api` (bool) | |
| `notion_page_created` | notion | Notion export success | `blocks`, `hasScore` | Future: error events |
| `react_profile` | profiling | React vitals sample | `id`, `actual`, `base`, `phase` | Aggregated client-side |
| `web_vital` | profiling | Core web vital measured | `name`, `value`, `rating` | LCP/FID/CLS etc |
| `scenario_preset_applied` | prd | Scenario preset merged | `preset`, `overwrittenFields` | Empty array means no overrides |
| `time_to_prd_ms` | prd | First export after start | `ms` | Derived difference of timestamps |
| `suggestion_applied` | ai | User applied suggestion | `step` | Aggregated count also stored |

Planned additions:
- `migration_applied_ms` (prd): per snapshot migration cost.
- `sync_job_error` (sync): batched provider failure classification.

---
## Property Hygiene Rules

| Rule | Enforcement |
|------|-------------|
| No raw PRD text or user feedback in props | Redaction pre-step + lint review |
| Numbers for quantitative metrics (ms, counts) | TypeScript types & schema guard |
| Bounded string enums (`model`, `kind`, `step`) | Union literal types |
| No arrays > 25 elements | Truncate before emit |
| No arbitrary object nesting > depth 2 | `redactDeep` flattens or prunes |

If a property violates rules, drop or hash (non-reversible) rather than redact token-by-token.

---
## Sampling Strategy

| Category | Default | Rationale |
|----------|---------|-----------|
| Critical performance (latency) | 100% while prototype | Low volume, need baselines |
| High-frequency UI interactions | 0% (not collected) | Noise vs. insight trade-off |
| Snapshot migrations | 100% (rare) | Detect migration regressions |
| React profiling samples | 100% local aggregation; only aggregates emitted | Minimize event spam |
| Web vitals | 100% (per session) | Industry standard core metrics |

As volume grows, introduce probabilistic sampling (e.g., keep 20% of `ai_suggestion_latency` after stable p95 achieved) while retaining tail sampling for slow outliers.

---
## Extension Guidelines

1. Choose domain: if none fits, propose new domain in PR.
2. Define event row in this doc before merging code.
3. Emit event via central telemetry module (never `console.log`).
4. Include at least one quantitative property (`ms`, `items`, `rows`).
5. Validate opt-in state—no emission without consent.
6. Add unit test if logic shaping properties (e.g., migration gap calculation).

### Adding a New Event (Template)
```ts
metric('domain_action', {
  ms: durationMs,
  model: currentModel,
  // additional bounded props
});
```

### Guarding Against PII
- Run text props through `redactDeep` prior to emission.
- Avoid including titles / descriptions; instead log lengths or counts.
- If adding a new textual enum, ensure enumeration list lives in source control (no dynamic user values).

---
## Performance Budgets (Initial Targets)

| Flow | Metric | Budget | Action if Exceeded |
|------|--------|--------|--------------------|
| AI Suggest (local) | `ai_suggestion_latency` p95 | < 120ms | Profile heuristic loops; reduce array allocations |
| AI Suggest (Gemini) | `ai_suggestion_latency` p95 | < 3500ms | Increase timeout backoff, model downgrade earlier |
| Assessment (local) | `ai_gap_detection_ms` p95 | < 90ms | Precompute regex matches |
| Markdown Export | `export_markdown` length processing | < 40ms | Stream sections; micro-opt string joins |
| Snapshot Migration | `migration_applied_ms` p95 | < 25ms | Optimize transform or version bump strategy |

Budgets are provisional; revisit after 2 weeks of telemetry.

---
## Client vs. Server Telemetry Split (Future)

| Aspect | Client | Server |
|--------|--------|--------|
| AI Latency | Local timing + model | Adds queue wait, network RTT |
| Migrations | Not currently | Will log per snapshot read/upgrade |
| Sync Jobs | Browser-intent fallback only | API calls + retries |
| Notion Export | Markdown assembly timing | API latency + block transformation |

Server events will enrich client context with unique IDs for correlation.

---
## Data Retention & Privacy

Prototype phase: events stored only in memory (Sentry breadcrumbs imitation) until user session ends or telemetry disabled. Production plan:
- Ship events to backend batching endpoint.
- Aggregate & discard raw after 7 days (configurable).
- Retain only aggregate percentiles & counts for long-term trends.

No raw prompt text or user stories are retained—only derived metrics and structural counts.

---
## Open Questions / TODO

- Formal schema validation layer (Zod) for event props before emission.
- Hashing strategy for stable anonymized user/session correlation without cookies.
- Adaptive sampling based on recent p95 stability.
- Document correlation IDs once server side implemented.

---
## Changelog

| Date | Change |
|------|--------|
| 2025-09-15 | Initial draft created (prototype taxonomy) |
