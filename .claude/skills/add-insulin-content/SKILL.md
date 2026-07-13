---
name: add-insulin-content
description: Use when the user pastes new patient-education content (Q&As, a new topic/module, or a brand/device comparison table for insulins or insulin pens) to add to the PanInsulin app, or asks to add/update a module in this repo. Covers the full pipeline from markdown source through to a pushed, verified build.
---

# Add insulin education content

This repo's content lives in `insulin_education_module.md` and is compiled into the app by `generate_app_data.py`. See `CLAUDE.md` at the repo root first for the file format and architecture — this skill is the step-by-step procedure for adding content to it. Read `CLAUDE.md` before using this skill if it's not already in context.

## Decide where the content goes

- **Brand names / molecule names for insulins** (India, US, or any other market) → Module 13 ("Types & brands").
- **Injection device / pen mechanics** (spring-loaded vs manual, disposable vs reusable, dose increments, max dose, how to tell pens apart) → Module 2 ("Insulin injection").
- **A genuinely new topic** not covered by any existing module → new module, appended at the end (next sequential ID).
- **Non-insulin content** (e.g. GLP-1/GIP agonists like Mounjaro/Zepbound, even if sold in a similar pen platform) → do NOT add as full content. At most, add one safety-caveat Q&A noting the device platform is shared but the drug class differs and is out of scope. Tell the user you're excluding it and why.

## Verify before writing (do this first, not last)

The project standard is **focused, authentic, official-source content — not a transcription of whatever was pasted.** Patient-pasted comparison tables (marketing pages, retail listings) have already introduced at least one real error into this repo (a pen's max dose was wrong and contradicted a correct figure elsewhere in the same module). Before turning pasted content into Q&As:

1. For every checkable numeric/factual claim (max dose, dosing increments, concentration, contraindications, mechanism), run a WebSearch against an authoritative source: FDA label/DailyMed, manufacturer prescribing information or instructions-for-use, ADA. Prefer `.gov`, the manufacturer's own site, or DailyMed/FDA over retail/blog/marketing pages.
2. If a claim can't be traced to a primary source (common for regional/niche brands, which often exist only on pharmacy listing pages), don't present it as flat fact in the Q&A — hedge it ("commonly listed as...") and prompt the reader to confirm against the current pack insert, rather than silently omitting it or silently asserting it.
3. **Grep the markdown for the old value** of any number you're about to add or change (e.g. `grep -n "80 units\|60 units"`) to catch contradictions with content already written elsewhere in the module before you commit — this is how the AllStar error was found.
4. Never add non-insulin content as full Q&As (see scope rule above) even if it was part of the same pasted table.

## Procedure

1. **Read the target module's current end** in `insulin_education_module.md` (its last `### N.` / `**Answer:**` pair and its `**Evidence anchors:**` line).
2. **Insert new `### N. Question` / `**Answer:** ...` pairs** immediately before that module's `**Evidence anchors:**` line, continuing the numbering from the module's current max. Keep answers patient-friendly (plain language, one short paragraph), verified per the section above, and don't invent clinical claims. Add non-insulin/scope caveats inline when relevant (see above).
   - If this is a **new module**: append a full new `# <N>. <Title>` section (learning focus line, Q&As starting at 1, evidence anchors, `---` separator) before `## References and further reading` instead.
3. **Update `**Evidence anchors:**`** for the module if new manufacturer/source names were introduced.
4. **If a new module**: add its `meta` entry to the `meta` list in `generate_app_data.py` (same `id`, plus `kind`, `short`, `tagline`, `accent`, `icon`, `core`, `learning`, `notes`, `practice`, `redFlags`). Decide `core` per the scope note in `CLAUDE.md`.
   - If the module meta already exists and the new content changes its meaning (e.g. now spans two countries, or gained a new safety theme), refresh `notes`/`practice`/`redFlags` too — don't just leave them describing only the old subset of content.
5. **Regenerate data**: `python3 generate_app_data.py` from repo root. Confirm the reported module/qa counts match your expectation.
6. **Add MCQs** in `insulin-education-app/src/quiz.js` (`mcqs` array, `moduleId` matching), roughly 1 per 7–10 new Q&As, testing the most safety-relevant fact from the new content. Add a `visualScenarios` entry only for brand-new modules (existing modules don't need one per content addition).
7. **New illustration kind**: if a new module needs a distinct visual and no real photo was supplied, add a `kind` branch to `TopicIllustration` in `insulin-education-app/src/main.jsx` (generic inline SVG, consistent with the existing style). If the user supplies a real device/product photo for the content, embed that image as given instead — real photos are allowed (policy changed 2026-07-13, see `CLAUDE.md`'s Design system section).
8. **Verify counts are wired dynamically, not hardcoded.** Per-module Q&A/dot/progress counts in `main.jsx` already read `module.qas.length` — don't reintroduce a hardcoded number. Update the total-count prose in both `README.md` (root) and `insulin-education-app/README.md` (module count, total Q&A count, MCQ count) — these are hand-written strings, not generated.
9. **Build**: `cd insulin-education-app && npm run build`. Must succeed with no errors.
10. **Optionally verify data integrity** with a quick Node check, e.g.:
    ```bash
    node --input-type=module -e "
    import { modules } from './src/data.js';
    import { mcqs, visualScenarios } from './src/quiz.js';
    console.log('modules:', modules.length, 'total qas:', modules.reduce((s,m)=>s+m.qas.length,0));
    console.log('mcqs:', mcqs.length, 'visualScenarios:', visualScenarios.length);
    "
    ```
11. **Commit and push** from the repo root: stage the markdown, `generate_app_data.py`, `data.js`, `quiz.js`, `main.jsx` (if touched), and both READMEs. Write a commit message describing what content was added and why (e.g. what device/brand/safety point it teaches), not just "update content". Push to `origin main` — this repo already has a working push setup (HTTPS + osxkeychain credential helper); GitHub Actions auto-deploys to GitHub Pages on push.
12. **Update `CLAUDE.md` and this skill file** if the addition introduced a new *pattern* (new scope category, new module grouping, new pipeline step) rather than just more content in an existing pattern.
