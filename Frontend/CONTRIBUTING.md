# Contributing Guide

Thanks for your interest in contributing! This document explains how to set up the project, coding standards, workflow expectations, and tips for productive collaboration.

---
## 1. Project Overview
This repo contains:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind (`/src`)
- **State**: Zustand store with persistence
- **AI Utilities**: Gemini-based generation/evaluation helpers in `src/utils/ai.ts` & `gemini.ts`
- **Backend (optional)**: Lightweight Express + Mongo (Mongoose) service under `/server` for integrations/sync endpoints
- **Testing**: Vitest + React Testing Library
- **PWA**: Service worker + manifest

---
## 2. Quick Start
```bash
# Clone
git clone <your-fork-url>
cd AIPRD

# Install root deps
npm install

# Install server deps (if you need backend features)
pushd server && npm install && popd

# Run frontend only
npm run dev

# Run frontend + backend concurrently
npm run dev:all
```
Open http://localhost:5173 (default Vite port). Backend (if running) will be at the port configured in `server/src/index.ts` (commonly 3001).

---
## 3. Environment Variables
Create a `.env` (frontend) and `server/.env` as needed.

Frontend examples:
```
VITE_GEMINI_API_KEY=your_api_key
VITE_SENTRY_DSN=optional_sentry_dsn
```
Server examples:
```
MONGODB_URI=mongodb://localhost:27017/pmcopilot
NOTION_API_KEY=optional_notion_key
PORT=3001
```
Never commit real secrets. Add new keys to documentation if introduced.

---
## 4. Scripts Reference (root)
| Script | Purpose |
| ------ | ------- |
| dev | Start Vite dev server |
| dev:all | Run frontend + backend concurrently |
| server | Run backend only (proxy via `npm --prefix server run dev`) |
| build | Production build (frontend) |
| preview | Preview production build locally |
| lint | Run ESLint over project |
| test | Watch tests with Vitest |
| test:run | Run tests once (CI mode) |
| format | Apply Prettier formatting |
| format:check | Check formatting only |
| analyze | Build and open bundle visualizer |

Server scripts (`/server`):
| Script | Purpose |
| ------ | ------- |
| dev | Run backend with tsx + watch |
| build | Type-check & emit JS to `dist/` |
| start | Run compiled server |

---
## 5. Branching & Workflow
1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/<short-description>
   ```
2. Keep scope focused; small PRs are faster to review.
3. Rebase (not merge) `main` before opening PR to keep history clean.
4. Open a PR with:
   - Summary
   - Linked issue / backlog item
   - Screenshots or GIFs if UI changes
   - Testing notes (manual + automated)

### Commit Messages
Format (inspired by Conventional Commits):
```
<type>(optional-scope): concise explanation
```
Types: feat, fix, chore, docs, test, refactor, perf, build, ci, style.
Examples:
```
feat(snapshot): add undo restore action
fix(share): include mode flag in encoded payload
```

---
## 6. Code Style & Conventions
- **TypeScript**: Prefer explicit return types on exported functions.
- **State**: Central PRD logic lives in `src/store/prdStore.ts`; avoid duplicating business logic in components.
- **Components**: Keep presentational vs orchestration concerns separated when feasible.
- **Styling**: Tailwind utility-first; use semantic grouping order (layout -> spacing -> typography -> decoration -> state) when easy to read.
- **Accessibility**: Provide aria labels/roles; maintain keyboard access & focus order; announce dynamic changes via live regions.
- **Internationalization**: Use the existing translation hooks (if adding new user-facing strings, structure them for future locale extraction).
- **Snapshots & Diff**: Snapshot mutations should go only through store helpers so undo & telemetry remain accurate.
- **AI Calls**: Centralize prompt templates in `src/utils/prompts.ts`; avoid embedding raw prompt strings deep in components.

---
## 7. Testing Guidance
Run tests:
```bash
npm test          # watch
npm run test:run  # single pass
```
Add tests for:
- Store logic (snapshot, undo, pagination)
- Pure utility functions (prompts, formatting, diffing)
- Critical UI flows (mode toggle, share encoding) with React Testing Library

Generate coverage (example):
```bash
vitest run --coverage
```
Keep tests deterministic; mock network/AI boundaries.

---
## 8. Performance Notes
- Virtualized snapshot list via `react-window`.
- Requirements pagination reduces render cost for large PRDs.
- Defer heavy AI computation or network calls until user intent (avoid on-mount generation).
- Use React Profiler sparingly and do not commit its output.

---
## 9. Accessibility Checklist (Quick)
- Keyboard: All interactive elements reachable via Tab.
- Visible focus ring preserved (do not remove default outline without replacement).
- Color contrast ≥ WCAG AA.
- Announce significant status changes (saves, errors, mode changes).

---
## 10. Adding Documentation
Place new docs under `/docs`. Link major additions in `README.md` summary section.

---
## 11. Versioning & Releases (Planned)
Semantic versioning will follow once public distribution begins. For now keep `version` at `0.x` and update CHANGELOG entries (see forthcoming template) with every user-facing change.

---
## 12. Common Pitfalls
| Issue | Resolution |
| ----- | ---------- |
| Clipboard API fails (e.g., insecure context) | Use planned textarea fallback (see backlog) |
| LocalStorage quota exceeded | Implement cleanup suggestion & fallback soon (see backlog) |
| AI request latency | Ensure cancellation tokens used; avoid parallel identical calls |
| Snapshot undo missing | Only one-level undo currently; design multi-level separately |

---
## 13. Backlog Reference
Outstanding roadmap items are tracked inline in `TODO` comments and project backlog (see issue list / internal tracker). Key upcoming: multi-PRD, collaboration stub, diff highlighting improvements, quota handling.

---
## 14. Getting Help
Open a GitHub Discussion / Issue with reproduction details, environment info (OS, browser, Node version), and logs (redact sensitive keys).

Happy building! 🚀
