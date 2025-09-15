# Architecture Overview

This document provides a high‑level view of the system: major layers, runtime data flow, and extensibility points.

## 1. High-Level Diagram
```
+------------------------------ Browser (Client) ------------------------------+
| React + TS + Vite                                                 PWA Shell |
|                                                                              |
|  UI Components (Tailwind)                                                    |
|   - PRDBuilder / StepEditor / SnapshotHistory / CommandPalette / ModeToggle  |
|                                                                              |
|  Zustand Store                                                               |
|   - PRD state (meta, objectives, stories, requirements, snapshots, mode)     |
|   - Actions (addRequirement, addSnapshot, restoreSnapshot, undoRestore, ...) |
|                                                                              |
|  Utils / Services                                                            |
|   - ai.ts / gemini.ts  (AI orchestration & cancellation)                     |
|   - prompts.ts (prompt templates)                                            |
|   - share.ts (encode/decode PRD -> URL)                                      |
|   - integrations.ts (3rd-party config helpers)                               |
|   - telemetry.ts (Sentry + custom metrics)                                   |
|   - suggestions.ts / feedback.ts (UX logic)                                  |
|                                                                              |
|  Persistence                                                                 |
|   - localStorage (zustand persist)                                           |
|   - Share links (encoded JSON -> base64)                                     |
|                                                                              |
|  Service Worker (cache shell, offline gating)                                |
+------------------------------------------------------------------------------+
                | optional REST (sync, integrations, persistence)             
                v                                                              
+--------------------------- Backend (Express + TS) ---------------------------+
| Routes: /integration /prd /snapshot /sync (future)                           |
| Mongoose Models (IntegrationConfig, PRD, Snapshot)                           |
| Notion / External API Clients                                                |
| Env & Secrets (.env)                                                         |
+------------------------------------------------------------------------------+
```

## 2. Core Concepts
### PRD Store
Single source of truth for all in-progress product document data. Snapshots capture immutable versions for history & diffing. Mode flag (`draft` | `final`) influences export watermarking and visual badge.

### Snapshots & Diff
Snapshots are shallow copies of the structured PRD object stored with timestamp + optional label. Diffing currently textual/section-level; roadmap includes inline token diff highlight.

### AI Orchestration
`gemini.ts` provides a small wrapper over the Google Generative AI SDK: building prompts from templates, sending requests, handling abort signals, and normalizing responses. All prompt wording centralized in `prompts.ts` for consistency and easy revision.

### Sharing
`share.ts` encodes a minimal PRD representation + mode into a compressed, URL-safe base64 string placed in the fragment or query segment; decoding performs schema validation with Zod before hydrating a temporary view model.

### Offline & PWA
Service worker pre-caches the application shell. An online/offline listener surfaces a banner and gates actions that depend on network (AI calls, potential future sync). Core editing remains functional offline via localStorage.

## 3. Data Flows
1. User edits a section -> store updates -> UI renders new state. Autosave tick triggers persisted serialization to localStorage.
2. User requests AI suggestion -> orchestrator builds prompt from current section context -> sends to Gemini -> response streamed (future enhancement) or returned -> suggestions list updated.
3. Snapshot save (manual or via shortcut) -> store captures deep copy -> telemetry event logged -> history list virtualized for performance.
4. Share link generation -> minimal structure extracted -> encoded -> user copies URL (pending clipboard fallback).
5. Restore snapshot -> current state moved to `lastRestored` for undo -> target snapshot becomes active -> undo toast can revert once.

## 4. Extensibility Points
| Area | Extension Pattern |
|------|-------------------|
| AI Providers | Add adapter implementing a simple `generate(prompt, signal)` contract; register strategy selector. |
| Persistence | Introduce remote sync queue; reconcile with local conflict strategy (last-write-wins initially). |
| Multi-PRD | Convert single PRD store slice to dictionary keyed by generated ID; add selector UI. |
| Collaboration | WebSocket layer broadcasting granular patch ops derived from store actions. |
| Diff Highlight | Tokenize text fields -> compute LCS / Myers diff -> annotate spans with ins/del classes. |
| Auth | Layer Clerk (already dependency) fully: gating routes, mapping user ID to PRD sets. |

## 5. Error & Telemetry Model
- Recoverable UI errors surfaced via toast and logged (if user consented) with event category.
- AI failures categorized (network, rate-limit, safety filter) – backlog: richer classification & backoff.
- Performance metrics (TTI, snapshot save latency) can be sent via `telemetry.ts` (light abstraction over Sentry custom events).

## 6. Performance Strategies
- Snapshot list virtualization (`react-window`).
- Requirements pagination to limit large array re-renders.
- Idle-time preloading of non-critical panels (future: dynamic import boundaries for AI modules).
- Avoid unnecessary derived computations inside render; memoize as needed.

## 7. Security & Privacy (Preview)
- No secrets stored in repo; environment variables injected at build/runtime.
- PRD data remains local unless user explicitly shares encoded link (client-side only representation).
- Telemetry optional (explicit consent toggle planned / minimal PII).

Full details will live in `security-privacy.md`.

## 8. Roadmap Snapshot
- Multi-PRD workspace abstraction
- Real-time collaboration scaffolding
- Enhanced diff (inline + semantic)
- Quota & clipboard resilience
- AI provider pluggability & backoff classification
- Changelog & semantic version pipeline

## 9. File Map (Selective)
| Path | Purpose |
|------|---------|
| `src/store/prdStore.ts` | Central PRD state & actions |
| `src/components/PRDBuilder.tsx` | Primary editor container |
| `src/components/prd/SnapshotHistory.tsx` | Snapshot timeline & restore UI |
| `src/components/CommandPalette.tsx` (if present) | Keyboard command launcher |
| `src/utils/gemini.ts` | Gemini SDK wrapper |
| `src/utils/prompts.ts` | Prompt template catalog |
| `src/utils/share.ts` | Encode/decode + URL helpers |
| `server/src/index.ts` | Express entrypoint (optional backend) |

## 10. Future Questions
- Should snapshots be delta-compressed? (Probably unnecessary initially given local scope.)
- Do we need multi-level undo beyond snapshot restore? (Potentially: integrate immer patches.)
- Will AI streaming materially improve UX? (Likely for long suggestions; can integrate incremental token events.)

---
_Last updated: 2025-09-15_
