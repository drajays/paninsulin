# PanInsulin — Insulin Therapy Education App

A modern, responsive React/Vite patient-education app focused on **insulin therapy**, built from a 13-topic diabetes education module. Seven core modules (insulin basics, injection technique, monitoring, hypoglycemia, sick-day rules, DKA and types of insulin/brand names) are the primary learning path; six related diabetes self-management topics (nutrition, exercise, complications, emotional health, travel, pregnancy) are included for broader context.

- 13 learning modules and all **260 patient Q&As** from `insulin_education_module.md`
- Detailed training notes for every module
- Image-based visual questions with accessible inline SVG illustrations
- 39 MCQs with instant feedback and explanations
- Progress tracking saved in `localStorage`
- Search across the question-and-answer library
- Responsive desktop, tablet and mobile layouts
- Light/dark theme toggle
- Patient safety reminders and emergency red-flag panels

## Run locally

```bash
cd insulin-education-app
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build for production

```bash
npm run build
npm run preview
```

## Important clinical note

This is an education prototype, not a clinical decision-support system. It does not calculate insulin doses or replace a clinician, diabetes educator, dietitian, obstetric team or emergency service. Verify local protocols and the latest product/guideline information before clinical implementation.

## Main files

- `src/main.jsx` — application shell and interactive views
- `src/data.js` — 13 modules (tagged `core`/related), 260 Q&As, training notes and source links
- `src/quiz.js` — MCQs and image-based visual scenarios
- `src/styles.css` — responsive visual system
