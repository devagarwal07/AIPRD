# Event Taxonomy

This document defines all telemetry events emitted (or planned) by PM Copilot along with their purpose and properties. The goal is to keep metrics privacy‑respectful (no raw user content) while enabling product performance & adoption insights.

> NOTE: Collection only occurs when the user has explicitly enabled telemetry. All events should gracefully no‑op if disabled.

## Conventions

- `domain.event_name` format (lowercase, snake case for event) where helpful in grouping, or `event_name` alone if domain is implicit.
- All timing values in milliseconds unless stated otherwise.
- Never include raw PRD text, user stories, stakeholder verbatim feedback, prompts, or secrets.
- Prefer small bounded numeric/string enums.

## Core Domains

| Domain | Purpose |
|--------|---------|
| prd | Authoring & lifecycle of product requirement documents |
| snapshot | Versioning / history of PRDs |
| ai | AI assistance performance & adoption |
| export | Artifact sharing & generation |
| sync | External issue tracker synchronization |
| notion | Notion integration usage |
| redaction | Sanity & safety metrics for anonymization |
| perf | Generic performance markers (web vitals, react profiling) |

## Event Reference

### PRD
- `prd_created`
  - Props: `sections` (number), `has_stories` (boolean)
  - Intent: Track creation velocity & structure adoption.
- `prd_updated`
  - Props: `sections` (number), `elapsed_ms` (since last update), `autosave` (boolean)
  - Intent: Update cadence & autosave behavior.

### Snapshot
- `prd_snapshot`
  - Props: `compressed` (boolean), `sections` (number)
  - Intent: Snapshot frequency & compression coverage.
 - `snapshot.undo`
   - Props: `restored` (boolean)
   - Intent: Usage of single-level undo safety feature.

### AI
- `ai_suggestion_latency`
  - Props: `ms`, `model`, `type` (e.g. `stories|requirements|insights`), `tokens_in?`, `tokens_out?`
  - Intent: Performance envelope for AI suggestions.
- `ai_suggestion_applied`
  - Props: `type`, `length` (characters of applied suggestion)
  - Intent: Suggestion adoption granularity; `length` approximates content size without storing text.
- `ai_gap_detection_ms`
  - Props: `ms`, `sections` (number)
  - Intent: Cost of heuristic completeness pass.
 - `ai_call`
   - Props: `kind` (`suggestions|assess|fallback`), `variant`, `mode`, `redact` (boolean), `step?` (number)
   - Intent: Track invocation mix & model fallback frequency.
 - `ai_retry`
   - Props: `attempt` (number), `category` (`rate-limit|network|timeout|auth|safety|unknown`)
   - Intent: Top-level retry frequency distribution.
 - `ai_retry_detail`
   - Props: `attempt`, `category`, `type`
   - Intent: Diagnostic granularity for problematic phases.

### Export
- `export_markdown`
  - Props: `length` (chars), `sections`, `hasScore` (boolean), `hasGaps` (boolean), `ms?` (may be omitted for synchronous lightweight builds)
  - Intent: Export usage & document shape. (Latency captured only if non-trivial; optional.)
- `export_csv`
  - Props: `ms`, `rows`, `type` (`stories|requirements`)
  - Intent: CSV export usage & perf.
 - `export_copy`
   - Props: *(none currently)*
   - Intent: One-click markdown copy adoption.
 - `export_pdf`
   - Props: `real` (boolean) — indicates real engine vs placeholder fallback.
   - Intent: PDF reliability & fallback rate.
 - `share_prd_copy`
   - Props: *(none currently; future: `sections`, `length`)*
   - Intent: Share link feature adoption.

### Sync
- `sync_job_enqueued`
  - Props: `provider` (`linear|jira`), `items`, `dry_run` (boolean)
  - Intent: Queue pressure & preview adoption.
- `sync_job_done`
  - Props: `provider`, `items`, `ms`, `status` (`success|error`)
  - Intent: Success rate & latency.

### Notion
- `notion_page_created`
  - Props: `blocks`, `ms`
  - Intent: Notion export usage & perf.

### Redaction
- `redaction_applied`
  - Props: `patterns` (number), `chars_redacted`
  - Intent: Effectiveness / volume of redaction (no raw content).

### Performance / Profiling
- `web_vital` (already captured as breadcrumb; consider promoting)
  - Props: `name` (LCP/FID/CLS/INP/TTFB), `value`, `rating`
- `react_profile`
  - Props: `id`, `phase`, `actual_ms`
  - Intent: Component rendering hotspots.

### Telemetry Lifecycle
- `telemetry_enabled`
  - Props: `previous` (boolean)
- `telemetry_disabled`
  - Props: `previous` (boolean)
 
### Autosave
- `autosave_success`
  - Props: `msSinceChange` (number)
  - Intent: Perceived save latency & debounce suitability.

## Property Data Types

| Property | Type | Notes |
|----------|------|-------|
| ms | number | Duration in milliseconds. |
| sections | number | Count of PRD sections. |
| has_stories | boolean | Whether user stories are present. |
| items | number | Number of issues enqueued/exported. |
| provider | enum | `linear` or `jira`. |
| model | string | AI model identifier. |
| type | enum | Contextual event subtype. |
| blocks | number | Notion block count. |
| patterns | number | Distinct redaction rule matches. |
| chars_redacted | number | Aggregate replaced characters. |
| length | number | Character length of exported markdown. |
| rows | number | CSV rows exported. |
| status | enum | `success` | `error`. |
| tokens_in | number? | Optional (avoid if PII risk). |
| tokens_out | number? | Optional (avoid if PII risk). |
| autosave | boolean | Whether change triggered by autosave. |
| dry_run | boolean | Preview vs real sync. |
| previous | boolean | Prior state on toggle events. |

## Emission Guidelines

1. Guard every emission with telemetry enabled check.
2. Keep prop sets stable; additive changes require version bump note here.
3. No raw text fields (ever). If needed, derive categorical tags client-side.
4. For latency: include the timing boundary exactly around I/O or computation.
5. Batch high-frequency events only if they exceed ~50/minute.

## Future Candidates

- `ai_prompt_tokens` (aggregate bucket counts per session; privacy review required)
- `feature_prioritized` (when a feature weighting changes meaningfully)
- `stakeholder_feedback_ingested` (count & sentiment bucket)
 - `diff.view` (user opened inline diff panel / review)
 - `prd.switch` (user switched active PRD workspace)
 - `clipboard.fallback` (textarea fallback executed)

## Versioning

This is v1. Subsequent structural changes should append a `## Changelog` section.

---
Maintained with the product evolution; propose additions via PR referencing this file.
