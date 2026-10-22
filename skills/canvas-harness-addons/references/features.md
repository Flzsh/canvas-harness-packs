# Building a feature into Canvas Harness

Canvas Harness is a Manifest V3 browser extension (GPL-3.0-only) at `github.com/Flzsh/canvas-harness`. Plain
JavaScript, no build step for the extension itself, no frameworks, Node 22+ only for tests and packaging.

## Find your way
- `extension/manifest.json`: permissions and content scripts. Do not add permissions unless the feature cannot exist
  without one; explain it in the pull request.
- `extension/features.js`: the feature catalogue. Each entry is
  `feature(id, name, group, jsFiles, cssFiles, needs)`; only the files of switched-on features are loaded. A new
  feature is optional: off in Full and Lite until the student switches it on in the popup's Features (follow how the
  existing optional entries are marked in that file).
- `extension/api.js`: every Canvas request goes through it, **GET only**, to an allowlist of API paths. Add the paths
  you read to the allowlist; never write.
- `extension/storage.js`: account-bound storage and the backup. Save through it, include your data in the backup,
  validate it on restore.
- `extension/dashboard*.js`, `widgets.js`, `workspace-arrange.js`: the dashboard, Home modules and their arrangement.
  A Home module is the easiest way to add a tool: register a module key and render into the standard module frame.
- `extension/pets.js`, `biscuit-parse.js` (Canvas Harness 3.4 and later): Biscuit. A feature can add a Biscuit command by adding
  an intent to the parser with tests.
- `tests/*.test.cjs`: `node:test` tests, run by `npm test`. `npm run check` validates syntax, manifest resources,
  permissions and icons.

## How a feature should behave
- **Reads Canvas only through `api.js`, never writes.** Nothing on quiz-taking pages (the existing quiz-page guard).
- **Fast and quiet:** renders are synchronous from data already loaded; no timers or polling while idle; work only when
  the student opens or uses the feature.
- **Private:** no network except the student's own Canvas through `api.js`; no analytics; grades only when the student
  has chosen to show grades.
- **Accessible:** real buttons and labels, keyboard use, visible focus, works in light and dark mode and with reduced
  motion.
- **Fits the look:** use the dashboard's existing classes and module frame; labels, not paragraphs of explanation.
- **Tested:** each decision the feature makes has a test; failure paths (Canvas down, empty data, storage full) too.

## The pull request
- One feature per pull request, focused files, no unrelated reformatting.
- Description: what it does and for whom, a screenshot or short GIF, what Canvas data it reads, what it stores, that
  `npm test` and `npm run check` pass, and confirmation that no permission was added.
- The maintainer may adapt it before a release. After it ships, the Market can list a feature pack (`{"feature": "<id>"}`)
  that switches it on with one click.
