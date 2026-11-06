# Building a feature into Canvas Harness

Canvas Harness is a Manifest V3 browser extension (GPL-3.0-only) at `github.com/Flzsh/canvas-harness`. Plain
JavaScript, no build step for the extension itself, no frameworks, no npm dependencies, Node 22.8+ only for tests and
packaging. `main` is the 3.x line that goes to the Chrome Web Store; `preview/4.0` holds the 4.0 previews, released on
GitHub only, which add Your AI.

## Find your way
- `extension/manifest.json`: permissions and content scripts. Do not add permissions unless the feature cannot exist
  without one; explain it in the pull request. `npm run check` fails on a permission list it does not expect.
- `extension/features.js`: the feature catalogue. Each entry is
  `feature(id, name, group, jsFiles, cssFiles, needs)`; only the files of switched-on features are loaded, in the order
  of the `order` list in the same file (add your files there). Full switches on every entry except the `optIn` set
  (only Developer tools today) and Lite is a short fixed list, so a new entry is on in Full and off in Lite. Students
  switch features in the popup's Features (Custom) or Make it yours -> More. Say in the pull request whether yours
  should wait in `optIn`.
- `extension/api.js`: every Canvas request goes through it, **GET only**, to an allowlist of API paths (`allowed` in
  `createClient`). Add the paths you read to the allowlist; never write.
- `extension/storage.js`: account-bound storage and the backup. Save through it, include your data in the backup,
  validate it on restore.
- `extension/dashboard*.js`, `widgets.js`, `workspace-arrange.js`: the dashboard, Home modules and their arrangement.
  A Home module is the easiest way to add a tool: add its key to `EXTRA` and `LABELS` (with `WEIGHT` and `MIN_WIDTH`)
  in `workspace-arrange.js` and render it from `render(key, c, h)` in `widgets.js` inside the standard module frame.
- `extension/pets.js` and the `biscuit-*.js` modules with their rule lists in `extension/biscuit-rules/`
  (`docs/BISCUIT.md`): Biscuit. A feature makes its items findable by registering a source with
  `ReserveBiscuitRegistry` (the end of `planner-model.js` shows how). After a UI change run
  `node scripts/biscuit-control-inventory.cjs --write`, then `--check`, so Biscuit can name the new control. A new kind
  of request needs tests in `tests/biscuit-*.test.cjs`.
- `tests/*.test.cjs`: `node:test` tests, run by `npm test`. `npm run check` validates syntax, manifest resources,
  permissions, icons and matching version numbers.

## How a feature should behave
- **Reads Canvas only through `api.js`, never writes.** Nothing on quiz-taking pages: reuse the check the Focus room
  and Review deck make (`/quizzes/<id>/take` or `/resume` and `/assessment_sessions/`, in `focus-room.js` and
  `review-deck.js`).
- **Fast and quiet:** renders are synchronous from data already loaded; no timers or polling while idle; work only when
  the student opens or uses the feature.
- **Private:** no network except the student's own Canvas through `api.js`; no analytics; grades only when the student
  has chosen to show grades.
- **Accessible:** real buttons and labels, keyboard use, visible focus, works in light and dark mode and with reduced
  motion.
- **Fits the look:** use the dashboard's existing classes and module frame; labels, not paragraphs of explanation.
- **Tested:** each decision the feature makes has a test; failure paths (Canvas down, empty data, storage full) too.

## The pull request
- One feature per pull request against `main`, focused files, no unrelated reformatting.
- Description: what it does and for whom, a screenshot or short GIF of the made-up courses from `npm run preview`,
  what Canvas data it reads, what it stores, that `npm test`, `npm run check` and `npm run build` pass, confirmation
  that no permission was added, and a Developer tools report (Tools -> Developer -> Copy report) from before and after.
- The maintainer may adapt it before a release. After it ships, the Market can list a feature pack (`{"feature": "<id>"}`)
  that switches it on with one click.
