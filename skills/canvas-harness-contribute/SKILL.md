---
name: canvas-harness-contribute
description: Contribute code, fixes, tests or realistic evaluation cases to Canvas Harness. Use when a contributor's AI agent works on the extension, rather than making a personal theme, pet or Market pack.
---

# Contribute to Canvas Harness

Canvas Harness is a local browser extension that turns Canvas LMS into a student's workspace: assignments beside their instructions, a planner, materials, study tools, a PDF reader and Biscuit, a companion that helps from the student's own data. The 4.0 previews add Your AI. Keep it simple without losing ability, useful at any school and on any laptop.

## Keep the principles

- Infer the task from the student's data, page and words. Offer “Help with this”; add no “what kind” menus. Accept corrections in words.
- Keep retrieval, dates, arithmetic, planning and settings local in Biscuit. Use AI only where it adds understanding, creation or judgment.
- Finish each AI task in one turn: task and strict answer shape first, labeled context pack after. Budget fields, use `gaps` for missing information and validate replies. Allow one error-only shape retry without resending sources.
- Keep Canvas GET only and personal changes local. Send student content only to their chosen AI after review with removable sources. Keep grades opt-in; contribute only made-up data.
- Use the site layer for school addresses. Keep Lite light and features optional. Make added behavior do no work while idle; stop hidden or destroyed work.
- Let the owner draw the look. Reuse existing classes, give new classes plain names and describe the desired look and behavior.
- Keep answers to one card, a short sentence, at most three items and one next step. Preserve Undo, focus, quiet mode and ignored-offer backoff; see [evals.md](references/evals.md).

## Work on the right line

Use public 3.9.3 as this guide's baseline. GitHub has two lines; check the issue's target and your checkout, and resolve missing baseline code in the issue. Copy nothing from private builds.

| Line | Branch | Ships to | Scope |
|---|---|---|---|
| 3.x stable | `main` (3.9.3) | Chrome Web Store and GitHub releases | Everything except the daily AI; Tools keeps the AI context and handoff |
| 4.x previews | `preview/4.0` (3.99.6, “4.0 Preview 6”) | GitHub pre-releases only | 3.x plus Your AI: Help cards, Today, Prepare and an optional overnight run |

Work that is not about Your AI targets `main`. Work on Your AI, or a fix for something only the preview has, targets `preview/4.0`. Propose anything else in an issue. Do not build it before agreement.

## Make one useful contribution

1. Pick an [issue](https://github.com/Flzsh/canvas-harness/issues) first; agree on acceptance criteria and release scope before implementing.
2. Read [architecture.md](references/architecture.md) and [style.md](references/style.md) for the affected code. Use [evals.md](references/evals.md) for Biscuit situations and AI answer cases.
3. Make one focused pull request against the branch the issue targets. Preserve account isolation, backups, permissions and licenses. Test behavior and failure paths with artificial fixtures; `npm run preview` serves made-up courses for screenshots.
4. Run `npm test`, `npm run check` and `npm run build`, one at a time (CI runs all three). From the clone, run `node /path/to/canvas-harness-contribute/scripts/pre-pr-check.cjs`, substituting the downloaded skill's path and adding `--base preview/4.0` for the preview branch. Follow [checklist.md](references/checklist.md).
5. Commit with your GitHub no-reply email. Put no AI co-author trailers or “Generated with” footers in commits or PR text. Explain the result, issue, tests and verification limits. Credit appears in the changelog when merged; the owner may adapt a PR rather than merge it as is.

Treat the bundled checker as an offline aid, not proof of privacy or live Canvas behavior. Fix every failure, review every warning, and inspect the complete diff and PR text yourself.
