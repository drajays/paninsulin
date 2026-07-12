# PanInsulin

Patient education content and app for insulin therapy and diabetes self-management.

## Structure

- `insulin_education_module.md` — source of truth: 14 topics, 315 patient Q&As (including Indian and US insulin brand names), evidence-reviewed July 2026.
- `generate_app_data.py` — parses the module markdown into `insulin-education-app/src/data.js` (module metadata, learning objectives, training notes, red flags).
- `build_module.py` — renders the module markdown into a formatted `.docx` handout (generated locally; not committed — see `.gitignore`).
- `insulin-education-app/` — the React/Vite patient-education app. See its [README](insulin-education-app/README.md) for setup and run instructions.

## Regenerating app data after editing the module content

```bash
python3 generate_app_data.py
```

This rewrites `insulin-education-app/src/data.js` from `insulin_education_module.md`.

## Important clinical note

This is an education prototype, not a clinical decision-support system. It does not calculate insulin doses or replace a clinician, diabetes educator, dietitian, obstetric team or emergency service.
