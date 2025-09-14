# PM Copilot — Prototype

A lightweight, AI-assisted toolkit that helps Product Managers think, write, and decide better. It focuses on three pain points: PRD authoring, feature prioritization, and stakeholder synthesis.

## What’s included

- Dashboard overview with AI prompts
- PRD Builder with:
  - Auto-generated user stories and requirements (deterministic heuristics, no external API)
  - Completeness score that flags gaps (metrics, risks, context)
  - Markdown export and autosave to localStorage
- Prioritization Matrix with:
  - Adjustable Impact/Confidence/Effort weights and quadrant view
  - AI-style recommendations and CSV export
  - Autosave of features and weight settings
- Stakeholder Input hub with:
  - Sentiment-style summary and recommended actions
  - Export summary (Markdown) and raw feedback (CSV)
  - Draft request autosave

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

When the key is present, PRD Builder will use Gemini; otherwise it falls back to local deterministic helpers.

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

