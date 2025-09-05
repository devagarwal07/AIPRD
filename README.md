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
