# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

PanInsulin: patient-education content and a React/Vite app about insulin therapy and diabetes self-management. The **content pipeline** (markdown → Python script → generated JS) is the core architecture to understand — the app itself is a fairly thin rendering layer over generated data.

## Commands

```bash
# Regenerate app data after editing the module markdown (run from repo root)
python3 generate_app_data.py

# App dev/build (run from insulin-education-app/)
cd insulin-education-app
npm install
npm run dev        # local dev server
npm run build       # production build to dist/ — always run this after content changes to catch errors
npm run preview     # serve the production build locally
```

There is no test suite and no linter configured. `npm run build` is the correctness check — it will fail on JS syntax errors and is the only automated signal that content/code changes didn't break the app.

## Content pipeline (read this before editing content)

`insulin_education_module.md` is the **single source of truth** for all patient-facing Q&A content. Never hand-edit `insulin-education-app/src/data.js` — it is generated and will be overwritten.

Flow: `insulin_education_module.md` → `generate_app_data.py` → `insulin-education-app/src/data.js`

- The markdown uses a strict, regex-parsed format per module:
  ```
  # <N>. <Module Title>

  **Learning focus:** <one line>

  ### 1. <Question>
  **Answer:** <answer text>

  ### 2. <Question>
  **Answer:** <answer text>
  ...

  **Evidence anchors:** <citation list>

  ---
  ```
  `generate_app_data.py` splits on `^# (?=\d+\. )` and `^### (\d+)\.\s+` — module numbers and Q&A numbers must be sequential within each module, and every question needs a `**Answer:**` line immediately using that exact bold marker text.

- Each module also has a **metadata entry** (`meta` list in `generate_app_data.py`, matched to markdown modules by `id`): `kind` (used to pick an inline SVG illustration in `main.jsx`'s `TopicIllustration`), `short`, `tagline`, `accent` (hex color), `icon` (emoji), `core` (bool — see below), `learning`, `notes`, `practice`, `redFlags`.

- After editing the markdown or the `meta` list, always run `python3 generate_app_data.py` to regenerate `data.js`, then `npm run build` in `insulin-education-app/` to verify.

### Adding a new module

1. Append a new `# <N>. <Title>` section at the end of `insulin_education_module.md` (before `## References and further reading`), with `N` = next sequential integer. Module IDs are contiguous from 1 and the app relies on array order matching ID order (e.g. `NotesView`'s "next module" logic does `allModules[module.id % allModules.length]`) — don't renumber existing modules or leave gaps.
2. Add a matching `meta` entry (same `id`) to `generate_app_data.py`.
3. Regenerate `data.js`, then add MCQs (`mcqs` array in `insulin-education-app/src/quiz.js`, `moduleId` referencing the new module) and ideally one visual-quiz scenario (`visualScenarios` array).
4. If the module needs a distinct illustration, add a new `kind` branch in `TopicIllustration` in `main.jsx`.

### Adding Q&As to an existing module

Insert new `### N. ...` / `**Answer:**` pairs before that module's `**Evidence anchors:**` line, continuing the existing numbering. Regenerate `data.js`. Add 1–3 proportional MCQs if the new content covers meaningfully new ground (roughly 1 MCQ per 7–10 Q&As is the existing ratio).

### Core vs. related modules

Modules are tagged `core: true/false` in the `meta` list. Core = directly about insulin therapy (currently: basics, injection technique, monitoring, hypoglycemia, sick-day rules, DKA, types-of-insulin/brands). Related = broader diabetes self-management shown as secondary context (nutrition, exercise, complications, emotional health, travel, pregnancy). The home page and sidebar in `main.jsx` render these as two separate grouped sections (`modules.filter(m => m.core)` / `!m.core`), preserving array order — a module's position within its group is just its position in the generated array, so a new core module appended at the end will show up last within the "core" group.

### Content scope boundary

This app is insulin-specific. When brand/device content is added (patients frequently paste manufacturer comparison tables), only include **insulin** products. Non-insulin medicines that share a device platform (e.g., GLP-1/GIP receptor agonists sold in a similar pen, like Mounjaro/Zepbound) should be explicitly noted as out-of-scope with a one-line safety caveat ("not all pens are insulin — confirm before use"), not given their own Q&A content. Device-spec content (max dose, dosing increments, pen lifespan) sourced from manufacturer marketing/comparison material changes as product lines are updated/discontinued — treat exact numbers as illustrative, not guaranteed current.

## App structure (`insulin-education-app/`)

- `src/data.js` — **generated**, see above. Exports `modules` (array of the objects described above) and `appSources`.
- `src/quiz.js` — **hand-maintained**. Exports `mcqs` and `visualScenarios`, both flat arrays keyed by `moduleId` (not array index — safe to reorder modules).
- `src/main.jsx` — single-file app shell: `App` holds view/progress state (persisted to `localStorage` under `paninsulin-progress-v1`) and renders one of `Home`, `ModuleView`, `NotesView`, `QuizView`, `VisualQuiz` based on `view` state. `TopicIllustration` is a big switch statement mapping `module.kind` → inline SVG (no external image assets/photos are used anywhere in the app — keep it that way; don't embed real manufacturer product photos, which are trademarked).
- Per-module Q&A/MCQ/dot counts in the UI are derived from `module.qas.length` etc. dynamically, not hardcoded — if you see a hardcoded module count creep back in, it's a bug (this was fixed once already when module 13 grew past 20 Q&As).
- `vite.config.js` sets `base: '/paninsulin/'` — required because the app is deployed to a GitHub Pages *project* site (`https://drajays.github.io/paninsulin/`), not a user/org root site. Don't remove this.

## Deployment

`.github/workflows/deploy.yml` builds `insulin-education-app/` and deploys `dist/` to GitHub Pages via `actions/deploy-pages` on every push to `main` (or manual `workflow_dispatch`). Requires the repo's Settings → Pages → Source to be set to "GitHub Actions" (one-time manual setting, not something a workflow file can enable itself).

## Files intentionally not committed (see `.gitignore`)

- `insulin_education_module.docx` and `part1.md`–`part4.md` are generated/redundant artifacts (`build_module.py` renders the `.docx`; the `part*.md` files are superseded by the consolidated `insulin_education_module.md`). Regenerate the `.docx` locally with `python3 build_module.py` if needed (requires `python-docx`).
- `insulin-education-app/glucoguide_preview.html` is a stale prebuilt bundle from before the app was renamed from GlucoGuide to PanInsulin.

## Keeping this file and the project skill current

When you add a new content pattern (new module, new brand/device category, new scope decision) or change the pipeline/build process, update this file and `.claude/skills/add-insulin-content/SKILL.md` in the same commit — don't let them drift from what the code actually does.
