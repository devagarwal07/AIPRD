# PM Copilot — Prototype

A lightweight, AI-assisted toolkit that helps Product Managers think, write, and decide better. It focuses on three pain points: PRD authoring, feature prioritization, and stakeholder synthesis.

> **Recent Highlights (2025)**
> - Snapshot schema versioning (future migration path) + undo restore
> - Persistent AI suggestions & assessment caching (1‑minute TTL, survives reload)
> - Accessible right panel keyboard navigation (Arrow / Home / End)
> - Expanded redaction (emails, phones, URLs, tokens, repo & file paths, UUIDs, ticket IDs)
> - Live region announcements for snapshot restore & undo
> - AI retry backoff classification + fallback model path
> - Deployment hardening, performance tracing & event taxonomy docs
> - Multi‑PRD groundwork (switch / create) and diff improvements

## What’s included

- Dashboard overview with AI prompts
- PRD Builder with:
  - Auto-generated user stories & requirements (deterministic + optional Gemini)
  - Completeness / gaps assessment (AI) and score
  - Snapshots (version history + diffs + undo restore)
  - Markdown export (copy/download) & debounced autosave announcements
  - Scenario presets (MVP, Full Spec, Experiment, Growth, Hardening)
- Prioritization Matrix with:
  - Adjustable Impact/Confidence/Effort weights and quadrant view
  - AI-style recommendations and CSV export
  - Autosave of features and weight settings
- Stakeholder Input hub with:
  - Sentiment-style summary and recommended actions
  - Export summary (Markdown) and raw feedback (CSV)
  - Draft request autosave
  
### Accessibility & Internationalization

- Internationalization (English + Spanish stub) with runtime locale switcher.
- User-adjustable font scaling (Small / Medium / Large) stored in localStorage (applies via CSS variable `--font-scale`).
- Reduced motion support: all non-essential transitions & animations disabled when user prefers reduced motion.
- Semantic headings, ARIA live regions for navigation and autosave status.


## How AI improves the workflow

- Guidance over automation: suggestions, gap detection, and explainable scoring keep PM judgment in the loop.
- Faster from blank page: one-click generation of draft stories/requirements accelerates authoring.
- Trade-off visibility: tunable weights plus a matrix expose priorities and enable crisp communication.
- Shareable artifacts: one-click exports create ready-to-use docs and data for stakeholders.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by the dev server. Build with:

```bash
npm run build
npm run preview
```

## Submission pointers

- PRD: See `public/prd-document.md` for the detailed PRD aligned with the challenge.
- Prototype link: Run locally or deploy the `dist` folder to any static host (Vercel/Netlify/GitHub Pages).

## Next steps

- Real LLM integration for richer suggestions and synthesis
- Import/export to GDocs/Notion and Slack notifications
- Multi-user accounts and collaboration with roles
- Analytics tying prioritization to post-launch impact
- (Completed) Scenario presets UI (MVP, Full Spec, Experiment, Growth, Hardening) with non-destructive seeding

## Optional: Enable Gemini AI

You can plug in Google Gemini to generate smarter user stories/requirements and a model-based completeness score.

1) Create a `.env` file at the project root with:

```
VITE_GEMINI_API_KEY=your_api_key
VITE_GEMINI_MODEL=gemini-1.5-flash
```

2) Install the SDK and run:

```
npm install @google/generative-ai
npm run dev
```

When the key is present, PRD Builder uses Gemini (mode toggle: flash/pro). Otherwise it falls back to local deterministic helpers.

### AI Reliability & Privacy

| Feature | Purpose |
|---------|---------|
| Redaction toggle | Strip sensitive patterns (emails, tokens, IDs, paths, phone, ticket IDs) before prompt send. |
| Backoff classification | Categorizes transient vs quota vs network for retries & user messaging. |
| Model fallback | Attempts flash after pro failure on final attempt. |
| Prompt trimming variants | Keeps requests within token & latency budget. |
| Suggestions & assessment cache | Eliminates duplicate calls within TTL (persists via safeStorage). |
| Abort & cancellation | User can cancel long-running requests (signals propagated). |

Related docs: `docs/event-taxonomy.md`, `docs/performance-tracing.md`, `docs/deployment-hardening.md`.

## Optional: Backend (MongoDB + Express)

The project now includes an experimental backend (`server/`) to persist PRDs, snapshots, integration settings and perform real Linear/Jira issue creation when API keys are configured.

### 1. Install & Run Backend

```bash
cd server
npm install
cp .env.example .env  # edit values
npm run dev
```

Environment variables:

```
MONGODB_URI=mongodb://localhost:27017/pmcopilot
PORT=4000
LINEAR_API_KEY= # (optional) personal API key
JIRA_BASE_URL=   # e.g. https://yourcompany.atlassian.net
JIRA_EMAIL=      # for basic auth
JIRA_API_TOKEN=  # Atlassian API token
```

### 2. Point Frontend at Backend

Create / update root `.env` (Vite) with:

```
VITE_API_BASE=http://localhost:4000
```

Restart `npm run dev`. Frontend will attempt API sync before falling back to legacy browser-intent mode.

### 3. API Summary

| Method | Path | Purpose |
|--------|------|---------|
| GET | /health | Liveness |
| GET | /api/prds | List PRDs |
| POST | /api/prds | Create PRD |
| GET | /api/prds/:id | Get PRD |
| PUT | /api/prds/:id | Update PRD |
| DELETE | /api/prds/:id | Delete PRD |
| GET | /api/integrations | Get integration config (single user placeholder) |
| PUT | /api/integrations | Update integration config |
| GET | /api/snapshots/:prdId | List snapshots for PRD |
| POST | /api/snapshots | Create snapshot |
| POST | /api/sync/linear | Create issues in Linear (needs LINEAR_API_KEY) |
| POST | /api/sync/jira | Create issues in Jira (needs JIRA_* vars) |

### 4. Linear Sync Payload Example

```json
POST /api/sync/linear
{ "items": [ { "title": "[TEAM] Story 1" }, { "title": "[TEAM] Story 2" } ] }
```

### 5. Jira Sync Payload Example

```json
POST /api/sync/jira
{ "items": [ { "summary": "[PROJ] Requirement 1", "projectKey": "PROJ" } ] }
```

Set an explicit project key in the UI (Configure tab) via "Jira Project Key (API)" to override the heuristic fallback (hint or PROJ). Must be 2–10 uppercase alphanumeric characters.

### 6. Notes & Limitations

- Auth: single local user placeholder (`userId` hard-coded). Add real auth before multi-user deployment.
- Validation: basic via `zod`. Extend schemas for richer metadata (labels, assignees).
- Error handling: returns early on first provider failure; batch strategy can be improved. Frontend auto-save now throttles error toasts (one every 10s) to avoid noise.
- Security: do not expose your API keys publicly; deploy backend behind HTTPS and add auth.

### 7. Migration Path

1. Add auth (JWT or session) and associate `userId` with all documents.
2. Add pagination & soft deletes for PRDs.
3. Implement role-based sharing (read-only vs editor).
4. Add webhooks (e.g., Linear issue updates) to enrich stored artifacts.

## Optional: Clerk Authentication (React + Vite)

Add hosted auth via Clerk. Quick steps (see official quickstart: https://clerk.com/docs/quickstarts/react):

1. Install SDK:
```bash
npm install @clerk/clerk-react@latest
```
2. Create `.env.local` (do NOT commit) and add:
```
VITE_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```
3. Wrap root in `ClerkProvider` (already wired in `src/main.tsx`):
```tsx
import { ClerkProvider } from '@clerk/clerk-react';
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/"> <App /> </ClerkProvider>
```
4. Use prebuilt components in `App.tsx`:
```tsx
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
<SignedOut><SignInButton /><SignUpButton /></SignedOut>
<SignedIn><UserButton /></SignedIn>
```
Ensure `VITE_CLERK_PUBLISHABLE_KEY` is set; no legacy variable names are supported.

## Security & Privacy Hardening

This prototype includes baseline safeguards; production deployment should layer additional controls. Below is a recommended hardening checklist and rationale for features already present.

### 1. Data Minimization & Redaction

Client-side redaction strips common sensitive patterns before sending AI requests (emails, URLs, UUIDs, long numeric IDs, phone numbers, access tokens, repo & filesystem paths). A paste guard warns if likely secrets (API keys, private keys, AWS/GitHub tokens) are inserted. For stronger guarantees:

- Perform **server-side validation/redaction** as a second line of defense.
- Log only aggregated metrics (no raw prompt or user content).
- Treat anything user-authored as potentially sensitive; avoid storing unneeded history.

### 2. Telemetry Consent

Telemetry (Sentry + perf metrics) is opt-in. Until the user explicitly enables it, no profiling or web vitals listeners attach. Opt-out clears in-memory buffers and stops new collection. For production, persist an audit of consent decisions server-side if required by policy.

### 3. Recommended HTTP Security Headers

Add these at your CDN / reverse proxy layer (values are conservative starting points):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Adjust `connect-src` to the exact AI / backend domains you use. If you host fonts or analytics, enumerate them explicitly instead of using wildcards.

### 4. Dependency & Supply Chain Hygiene

- Pin versions via lockfile (already in place) and enable automated weekly audit (e.g., GitHub Dependabot).
- For AI SDKs, review changelogs for telemetry defaults or schema changes.
- Disallow arbitrary plugin execution or dynamic `eval` (not used in this project).

### 5. Secret Management

Never commit API keys. Use environment-injected variables (Vite `VITE_*`) only for **public** values. True secrets (e.g., provider private keys) must stay server-side. For Gemini / OpenAI usage in production, proxy requests through your backend to apply rate limiting and abuse detection.

### 6. Authentication & Authorization

Current state: optional Clerk integration or a single local user fallback. Before multi-user launch:

- Enforce authenticated routes server-side (do not trust client role claims alone).
- Add row-level ownership (userId / orgId) to all persisted resources.
- Implement soft delete with audit timestamps.

### 7. Rate Limiting & Abuse Controls

Apply per-IP + per-account limits on AI generation, snapshot creation, and integration sync endpoints. Suggest using a token bucket (Redis) + circuit breakers for upstream AI failures.

### 8. Observability & Privacy Balance

Metrics intentionally avoid raw content. Keep this separation—no logging of full prompts / responses unless you have user consent and a retention policy. Consider differential privacy for aggregate analytics at scale.

### 9. Frontend Integrity

- Use Subresource Integrity (SRI) for any external script (currently none required).
- Consider build-time content hashing and immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`) for `/dist` assets.

### 10. Threat Model Snapshot

Primary risks & mitigations:

| Threat | Mitigation |
|--------|------------|
| Credential paste / accidental leak | Paste guard + redaction + server-side validation |
| Prompt injection via untrusted feedback | Escape & sanitize user-generated text before embedding into prompts (future server filter) |
| Token exfiltration via XSS | Strict CSP (no inline scripts except hashed) + no dynamic eval |
| Session hijack | Rely on Clerk secure cookies / JWT + short-lived tokens |
| DoS on AI endpoints | Rate limiting + request cancellation support |
| Performance regression causing data loss | Snapshotting + profiling metrics (opt-in) |

### 11. Deployment Checklist

- [ ] Enforce HTTPS & HSTS
- [ ] Apply CSP & security headers above
- [ ] Turn off source maps (or upload privately to Sentry) for production
- [ ] Configure backend auth & per-user data scoping
- [ ] Add rate limits & request size limits
  - Included: simple in-memory per-IP limiter for `/api/sync` (20 req / 60s). Replace with Redis cluster for production scale and to avoid single-node reset risk.
- [ ] Automate dependency vulnerability scanning
- [ ] Enable infrastructure logging (WAF / CDN) without storing PII
- [ ] Document data retention & deletion policy

### 12. Future Hardening Ideas

- Structured allowlist prompt assembly (DOMPurify or custom sanitization for any HTML fragments)
- Encryption at rest for server-stored PRDs & snapshots (field-level if sensitive)
- Multi-region key management & automatic key rotation scheduling

---

Security is a moving target—treat this section as a living document and update as architecture evolves.

---

## Environment Variables Overview

| Scope | Name | Required | Description |
|-------|------|----------|-------------|
| Frontend | `VITE_API_BASE` | No | Base URL of backend API; enables persistence & sync when set. |
| Frontend | `VITE_GEMINI_API_KEY` | No | Gemini API key (browser usage prototype – prefer server proxy in prod). |
| Frontend | `VITE_GEMINI_MODEL` | No | Gemini model name (default: `gemini-1.5-flash`). |
| Frontend | `VITE_CLERK_PUBLISHABLE_KEY` | No | Enables Clerk auth UI. |
| Backend | `MONGODB_URI` | Yes (backend) | Mongo connection string. |
| Backend | `PORT` | No | Server port (default 4000). |
| Backend | `LINEAR_API_KEY` | No | Enables Linear issue creation. |
| Backend | `JIRA_BASE_URL` | No | Jira site base URL (e.g. https://org.atlassian.net). |
| Backend | `JIRA_EMAIL` | No | Jira user email for API auth. |
| Backend | `JIRA_API_TOKEN` | No | Jira API token. |
| Backend | `NOTION_API_KEY` | No | Notion API integration secret. |
| Backend | `NOTION_PARENT_DB` | No | Database ID to create pages under. |
| Backend | `NOTION_PARENT_PAGE` | No | Page ID used if no DB provided. |

## High-Level Architecture

```
┌─────────────────────┐        ┌─────────────────────────┐
│  React + Vite SPA   │  HTTP  │  Express API + MongoDB  │
│  Zustand state       │ <----> │  PRDs / Snapshots / Int │
│  AI Orchestrator     │        │  Linear/Jira/Notion     │
└─────────┬───────────┘        └─────────┬──────────────┘
       │                                 │
       │ (Optional)                      │
       ▼                                 ▼
  Gemini SDK (browser)            External APIs (Linear/Jira/Notion)
```

Core package (`packages/core`) centralizes redaction, markdown export, CSV helpers & telemetry event builder for future multi-service reuse.

### Data Flows
- Local editing → Zustand (autosave) → optional snapshot compression → backend persistence.
- AI suggestions: redact input → Gemini (if key) → merge suggestions → compute completeness.
- Issue sync: queue (in-memory) → provider APIs; preview endpoints allow dry-run inspection.
- Notion export: markdown → minimal block transform → page or DB entry creation.

### Redaction Layers
1. Client pre-AI (prompt sanitation)
2. Server middleware (recursive string traversal)
3. Core utils (`@aiprd/core`) for shared transformations.

## Performance & Tracing (Planned / Partial)

Current metrics: autosave timing, snapshot usage, basic Sentry breadcrumbs. Upcoming improvements:

| Area | Metric | Plan |
|------|--------|------|
| AI Suggestion | latency_ms | Wrap Gemini calls with performance.now() spans, attach model + token counts (no content). |
| Export | generate_md_ms | Measure markdown & CSV assembly; surface slow (>150ms) events. |
| Queue | job_duration_ms | Track per Linear/Jira job; add 95th percentile aggregation. |
| Redaction | chars_redacted | Count replacements for diagnostics (not stored long-term). |
| Notion | create_page_ms | Time markdown→block transform & API call separately. |

Tracing Implementation Sketch:
```ts
// pseudo
const t0 = performance.now();
const result = await getSuggestions();
telemetry.emit('ai_suggestion_latency', { ms: performance.now() - t0, model });
```

## Internationalization (i18n) Roadmap

Lightweight initial approach (phase 1):
- Key/value JSON dictionaries per locale: `src/i18n/en.json`, `src/i18n/es.json`.
- Hook `useT()` reading current locale from context & simple fallback chain.
- Extraction: wrap user-facing strings with `t('key', 'Default Text')` gradually.

Planned phases:
| Phase | Goal | Details |
|-------|------|---------|
| 1 | Scaffold | Context + provider + sample keys for nav/buttons. |
| 2 | Coverage | Extract PRD Builder / Matrix strings; integrate pluralization util. |
| 3 | Dynamic AI | Request localized AI suggestions (model prompt locale tag). |
| 4 | Locale Persistence | Store choice in localStorage + optional backend user profile when auth added. |

## Accessibility & UX Enhancements Roadmap

| Area | Action | Status |
|------|--------|--------|
| Font Scaling | Root font-size driven by `--font-scale` (user adjustable) | Done |
| Reduced Motion | CSS media query removes transitions & animations | Done |
| High Contrast | Provide optional contrast theme token overrides | Planned |
| Keyboard Navigation | Expand focus outlines + skip links for large PRD pages | Planned |

## Event Taxonomy (Excerpt)

Full detail lives in `docs/event-taxonomy.md` (includes payload schemas & glossary). Key events:

| Domain | Event | Purpose | Selected Props |
|--------|-------|---------|----------------|
| prd | prd_snapshot | Snapshot frequency & compression adoption | compressed, sectionsCount |
| ai | ai_suggest_ms | Suggestion latency & cache hit ratio | ms, step, cached, promptVariant |
| ai | ai_assess_ms | Assessment latency & cache hit ratio | ms, cached, promptVariant |
| ai | ai_retry_detail | Retry classification insight | attempt, category, type |
| autosave | autosave_success | Debounced save timing | msSinceChange |
| export | export_markdown | Export usage | length |
| sync | sync_job_enqueued | Integration sync adoption | type, items |
| sync | sync_job_done | Integration success & perf | type, items, ms |
| virtualization | virtualization_evaluation | List virtualization decision | snapshots, ms, enable |

Telemetry is opt‑in; no raw content is sent (counts & hashes only when needed).

## Testing

Run interactive tests:
```bash
npm test
```
Run once with coverage:
```bash
npm run test:run -- --coverage
```
Focus areas: prompt assembly, markdown export, snapshot store, AI orchestrator (cache / retry), redaction edge cases.

## Monorepo Notes

As the project grows:
- Promote more shared logic (score calculations, prompt assembly) into `@aiprd/core`.
- Consider separate packages: `@aiprd/web`, `@aiprd/server`, `@aiprd/ai` for cleaner dependency graphs.
- Add build orchestration (e.g., `turbo` or `pnpm -r`) if packages multiply.

## Contribution Guide (Lightweight)

1. Branch from `main`.
2. Ensure `npm test` (64 tests) & `npm run lint` (0 errors) pass.
3. Keep redaction logic changes mirrored in core & server.
4. Add/update README sections if adding new external integration or env var.
5. Avoid storing raw sensitive user content; rely on redaction utilities.

## Feature Completion Matrix

| Area | Feature | Status |
|------|---------|--------|
| PRD Builder | Autosave (local + snapshot compression) | ✅ |
| PRD Builder | AI (local heuristic) suggestions | ✅ |
| PRD Builder | Gemini integration (optional) | ✅ (Env gated) |
| PRD Builder | Scenario presets seeding | ✅ |
| PRD Builder | Completeness assessment (local + Gemini) | ✅ |
| Exports | Markdown / HTML | ✅ |
| Exports | CSV (stories, requirements) | ✅ |
| Exports | PDF placeholder / real (jspdf fallback) | ✅ (Basic) |
| Integrations | Linear browser intent + API backend | ✅ |
| Integrations | Jira browser intent + API backend | ✅ |
| Integrations | Notion page creation | ✅ (Basic) |
| Telemetry | Opt-in metrics + profiling | ✅ |
| Telemetry | Event taxonomy doc | 🚧 (draft) |
| Prioritization | RICE-like matrix & scoring | ✅ |
| Stakeholder Input | Sentiment summary + export | ✅ |
| Acceptance | Criteria tracking & burndown | ✅ |
| Privacy | Multi-layer redaction | ✅ |
| Core Package | Shared types, markdown, redaction | ✅ (initial) |
| i18n | Scaffold | 🗓 Planned |
| Accessibility | Font scaling, reduced motion | ✅ |
| Formatting | Prettier config | 🗓 Pending |

Legend: ✅ Done | 🚧 In progress | 🗓 Planned

## Snapshot Versioning & Migrations

Snapshots store compressed PRD JSON plus a `schemaVersion` number. On retrieval the backend:
1. Decompresses (gzip + base64) the stored blob.
2. Reads `schemaVersion` (defaults to 1 if missing).
3. Applies ordered migration functions (if any) until reaching `CURRENT_VERSION`.

When changing the snapshot data shape:
1. Increment `SNAPSHOT_SCHEMA_VERSION` in `server/src/routes/snapshot.ts`.
2. Add a pure migration function `(doc) => doc` to the migration registry keyed by the previous version.
3. Update README (this section) describing the change.
4. Deploy; older snapshots automatically upgrade on next read.

Migration Design Principles:
- Pure & idempotent (safe to re-run).
- Avoid removing raw fields immediately—deprecate for 1 version where feasible.
- Log (telemetry) when a migration > 10ms for visibility.

## Lint, Testing & Quality Standards

| Category | Rule / Target | Rationale |
|----------|---------------|-----------|
| Lint | Complexity ≤14 per function | Maintain readability, encourage helpers |
| Lint | Max lines per file 450 (frontend) | Bound sprawl; prompts component decomposition |
| Lint | Max lines per function 120 | Reduce god-functions |
| Types | `strict` TypeScript, no implicit `any` in tests | Prevent hidden runtime defects |
| Testing | All critical pure utils covered (AI orchestration, redaction, integrations, exports) | Confidence in refactors |
| Testing | Fast unit suite (<2s cold) | Keeps feedback loop tight |
| Telemetry | No raw user strings in events | Privacy & compliance |
| Redaction | Mirror core & server patterns | Consistency & defense in depth |

Before merging:
1. `npm run lint` must show 0 errors (warnings allowed but should trend down).
2. `npm test` must pass without flakiness (retry locally if timing-related).
3. Large new components >300 LOC should include a rationale or be split.
4. Any new env var: update Env table + `.env.example` (frontend or server).

## Versioning Policy (Prototype Stage)

Semantic versioning begins once initial public release is cut. Until then:
- Breaking changes MAY land without major bump but must update this README.
- Core shared types form a growing contract; avoid removing fields without deprecation.
- Snapshot schema changes always require a version bump + migration entry.

Planned milestones:
| Milestone | Criteria |
|-----------|----------|
| 0.1.x | Rapid iteration, internal usage only |
| 0.2.x | Stable snapshot schema + finalized telemetry taxonomy |
| 0.3.x | i18n scaffolding & formatting (Prettier) integrated |
| 0.4.x | Authentication + multi-user separation |
| 1.0.0 | Public release: schema + event contracts frozen |

## Architecture Diagram Placeholder

Diagram to be added (mermaid / draw.io). For now, see ASCII diagram in High-Level Architecture section above.


---

This README now reflects extended architecture, environment configuration, and forward-looking instrumentation/i18n plans.

