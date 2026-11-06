# Public 3.9.3 architecture

All pointers below are repository-relative `file:line` anchors in public 3.9.3, GitHub `main`, the 3.x line that goes to the Chrome Web Store. `preview/4.0` (3.99.6, "4.0 Preview 6") shares most of these files and adds Your AI; where it differs, the text says so. They name source declarations, not private directories or a promise about later releases. Re-find the declaration if lines move; the source was respaced to short lines in 3.8, so anchors from 3.7 or earlier do not match.

The repository holds `extension/` (the package), `tests/`, `scripts/`, `docs/`, `preview/` (made-up courses for `npm run preview`), `skills/` (the public course-art skill) and `companion/`, an experimental native-messaging AI companion that the extension does not use. `companion/` keeps the MIT licence named in its `package.json`; everything else is GPL-3.0-only.

## Entry points and schools

- `extension/manifest.json:27` selects the Manifest V3 service worker. Permissions (`manifest.json:8`), optional AI-provider and school hosts (`manifest.json:14`) and explicit resource exposure live in this manifest; `scripts/check.cjs:7` pins them. Do not widen them for convenience.
- `extension/background.js:3` imports worker modules; `:29` loads a document's selected features; `:202` registers granted school sites; `:219` starts the shared account-write server after `:217` loads the Market worker. Validate sender, document and account before routing a request.
- `extension/site.js:5` normalizes secure origins, `:19` validates custom addresses, `:25` records trusted sites, `:29` recognizes Canvas pages and `:36` preserves native assignment/submission pages. Route site and timezone decisions through `ReserveSite`, never a hard-coded school URL.
- `extension/school-address.js:11` reads allowed addresses and `:30` prepares one before navigation. `extension/background.js:208` derives custom-site registrations from the manifest and inserts `custom-site.js` after `site.js`. Keep the two routes equivalent; wildcard optional permission does not authorize running on every website.
- `extension/api.js:18` creates the Canvas client; `:34` lists the allowed API paths, `:62` builds URLs and `:137` constructs GET requests with same-origin credentials. Preserve its endpoint allowlist, cancellation and retry limits. No Canvas submission, message send or grade mutation belongs in a contribution.

## Features, startup and resource lists

`extension/features.js:6` defines each feature's JS, CSS and `needs`; `:37` fixes execution order (a file missing from `order` never loads), `:155` lists dashboard CSS, `:160` defines core files and `:163` identifies scripts already loaded statically. `:165`-`:222` attach lazy feature assets, `:224` is the opt-in set, `:225` defines presets and `:234` resolves dependencies.

| Area | Catalogue entry | Main dependency / placement |
|---|---|---|
| Dashboard / assignments | `features.js:8` | `views.js`, `app.js`, dashboard models and views |
| Deadline changes, planner, grades, materials, course hub, My links & files | `features.js:9` | Dashboard; hub also needs materials; My links & files needs the hub and the PDF reader |
| Math, GPA, tools | `features.js:15` | GPA needs tools; standalone tools stay optional |
| Appearance editor, scene themes, arrange | `features.js:18` | Dashboard; pack codecs and editor load with the appearance editor |
| Course art and Quick Upload | `features.js:21` | Quick Upload needs the appearance editor and course art |
| Biscuit (`pony`) | `features.js:23` | Planner, hence dashboard; the `biscuit-*.js` modules, rule packs, controller and art |
| Motion and Canvas navigation | `features.js:24` | Early scripts self-check preferences; later modules follow selection |
| PDF reader | `features.js:28` | Host loads with feature; reader assets open on demand |
| Focus room, Review deck, Grade impact | `features.js:29` | On in Full since 3.9.3; Focus room needs planner, Grade impact needs grades |
| Play, AI handoff, Developer tools | `features.js:32` | AI and Developer tools need tools; play assets are lazy |

Full enables the catalogue except the opt-in set, which holds only Developer tools. Lite selects dashboard, planner, grades, math, arrange, tools, GPA and native appearance. Custom resolves only selected entries plus their dependencies. Adding a default feature changes Full's cost and adding one to Lite changes Lite's: do not slip heavier modules into core.

`extension/manifest.json:46` has two `document_start`, top-frame content-script entries: early feature/site/startup scripts and a small static controller chain ending in `feature-loader.js`. `extension/startup.js:83` decides whether the dashboard may show and `:75` releases the page back to Canvas (cleanup at `:65`). `extension/feature-loader.js:19` waits for early preference reconciliation, then asks the worker to load. `extension/background.js:48` applies that document's selection before injecting files; `:52` filters out `ReserveFeatures.staticJS`. Do not inject a static module twice or replace a document's selected snapshot with a later hint.

When adding or removing dashboard CSS, reconcile all of these:

- `extension/features.js:155` (`dashboardCSS`, plus `startupCSS` at `:156`, core and feature CSS where appropriate).
- `extension/startup.js:39` (`allSheets` preload list).
- `extension/content.js:219` (workspace fallback list; chosen styles normally come from startup).
- `extension/manifest.json:88` and `:180` (explicit web-accessible lists).

The manifest's fixed Instructure entry and its wildcard custom-site entry list the same resources, `pdf-reader.html` and `pdf-host.css` included; the wildcard entry uses dynamic URLs (`extension/manifest.json:270`). `scripts/check.cjs:12` requires the two lists to match and rejects JS, vendor modules and wildcards in them. Do not expose reader internals or other extension files to arbitrary sites. Check `tests/resource-exposure.test.cjs:1`, `tests/scene-manifest.test.cjs:1`, `tests/startup.test.cjs:1`, `tests/features.test.cjs:1` and `scripts/check.cjs:12`.

## Accounts, writes and backups

- `extension/session.js:7` coordinates identity, cached snapshots and refresh. `:117` suspends; `:121` verifies before resuming. `extension/content.js:264` constructs the session and `:356` handles visibility. Do not show cached personal data for an unverified account.
- `extension/storage.js:678` creates a store only for a verified account. `:687` binds `reserve:v1:${origin}:${accountId}`; keep origin and account together. Appearance/feature preferences have their own deliberately shared boundaries: do not move personal notes, reminders or coursework into them.
- `extension/storage.js:166` serializes operations per key; `:598` validates worker writes and compares the prior value; `:629` implements the browser adapter. `:986` exposes `runAccountWrite`; `extension/account-writes.js:7` delegates Market/media mutations to that same serializer. Avoid direct read-modify-write calls that can overwrite another tab's newer state.
- `extension/storage.js:539` validates backup envelopes, `:718` constructs an account-bound export, `:741` captures media and Market data, `:747` exports with packs, `:748` imports and `:907` reads recovery. `extension/backup-media.js:48` validates media owner scopes. Preserve pack bytes, media references, rollback and later user edits, not just the small settings object.
- Read `tests/account-writes.test.cjs:1`, `tests/storage-portable-backup.test.cjs:1`, `tests/market-account-writes.test.cjs:1` and `tests/backup-media.test.cjs:1` for concurrency and restoration cases.

## Dashboard and views

`extension/content.js:124` mounts the dashboard. `extension/dashboard.js:373` owns its controller; `:49` and `:95` patch live headings and keyed UI. `extension/dashboard-model.js:209` filters assignments; `extension/dashboard-view.js:60` renders markup synchronously. Keep Canvas normalization and filtering in models and event/state work in controllers. Escape source text before HTML insertion.

`extension/app.js:18` mounts the secondary workspace and `:145` renders it synchronously. `extension/views.js:89` renders assignments, `:101` the week and `:124` task details. Home modules are listed in `extension/workspace-arrange.js:6` and rendered by `extension/widgets.js:107`. Planner, grades, course hub and materials have their own `*-model.js`, `*-ui.js` or `*-view.js` modules referenced by the catalogue. Preserve keyboard focus, selection, scroll position, teardown and Undo when changing a view.

## Biscuit and the AI boundary

- `extension/biscuit-engine.js:126`: reads a typed line with the written rule lists (`extension/biscuit-rules.js:160`, packs in `extension/biscuit-rules/`), items from the source registry (`extension/biscuit-registry.js:27`) and controls from the generated inventory (`extension/biscuit-controls.js:858`). `docs/BISCUIT.md` maps the modules; after a UI change run `node scripts/biscuit-control-inventory.cjs --write`, then `--check`.
- `extension/biscuit-parse.js:1055`: local typed-line parser; exported `parse` returns candidates with `intent`, `fields` and `preview` (`tests/biscuit-parse.test.cjs:5`). Resolve against the student's world, not a universal list of school subjects.
- `extension/pony-ask.js:49`: matches items; `:63` builds local plans; `:126` handles local intents, reminders and routines (`:138`).
- `extension/pony-brain.js:76`: reads the current world; `:294` evaluates suggestions; `:306` decides whether a nudge may show; `:325` produces speech. Respect skills, quiet time and learning/backoff state.
- `extension/pets.js:143`: connects engine, parser, Ask and Brain; `:305` mounts; `:372` starts a visible-only brain timer; `:393` stops hidden work. `extension/widgets.js` connects actions to the account store and workspace.
- 3.x's AI is the context and handoff in Tools: `extension/ai-context.js:67` selects assignment instructions/rubric, `:142` bundles bounded labeled sources, `:158` composes the prompt and `:162` takes earned scores out unless grades are shared. `extension/ai-source.js:29` checks scope and `:178` collects reviewed sources. `extension/ai-panel.js:372` prepares a preview without sending. Provider permissions/routing live in `ai-providers.js`, `ai-web.js` and the worker; keep the Copy fallback.

On `preview/4.0`, Your AI adds Help cards, Today, Prepare and an optional overnight run: `extension/study-prompts.js` builds each card's instruction (`build`, line 509 in Preview 6) and checks the reply (`parse`, line 715), with `agent-*.js`, `study-band.js` and `overnight.js` around it. None of these are in 3.9.3; work on them targets `preview/4.0`. Do not add a help-type menu. Use [evals.md](evals.md) to specify intended behavior before implementing an issue.

## PDF reader

`extension/pdf-host.js:75` recognizes supported PDF clicks; `:147` fetches verified bytes and `:184` creates the Canvas host integration. `extension/pdf-reader.html:1` is the extension iframe entry; `extension/pdf-reader.js:179` creates the reader and `:1745` scopes parent messages with origin/token. PDF.js's modern build ships under `extension/vendor/pdfjs/` and loads through `pdf-library.mjs` and `pdf-worker.mjs` after `pdf-polyfills.js`; keep vendor notices and hashes intact.

`extension/pdf-model.js:32` binds annotations to origin, account and file ID. `extension/pdf-context.js:230` creates the text extractor; `extension/pdf-export.js:144` serializes annotations. Preserve account verification, safe URL routes, source bytes, save/close acknowledgments and fallback to Canvas. Use `tests/pdf-host.test.cjs:1`, `tests/pdf-route.test.cjs:1`, `tests/pdf-model-integrity.test.cjs:1` and `tests/pdf-export.test.cjs:1`.

## Market and pack formats

`extension/market.js:19` opens the optional Market; `extension/market-site.js:12` binds owners and `:17` checks allowed Canvas origins. `extension/market-bridge.js:49` validates catalogue entries before download/install. `extension/market-worker.js:11` accepts only the Market's own pages and `:25` verifies the current account. `extension/packs.js:15` checks catalogue fields, `:46` checks SHA-256, `:216` installs, `:305` removes and `:556` undoes a preset's changes while preserving later edits. Market downloads are data; executable code must ship inside the extension.

| File | Codec / reference |
|---|---|
| `.chpack` course artwork, SVG with pack metadata | `extension/quick-pack.js:109`, `docs/portable-packs.md:27` |
| `.chkit` artwork/settings kit | `extension/custom-kits.js:254`, `docs/portable-packs.md:31` |
| `.chtheme` palette and local assets | `extension/theme-pack.js:11`, `docs/portable-packs.md:41` |
| `.chpet` poses and local assets | `extension/pet-pack.js:8`, `docs/portable-packs.md:61` |
| `.chpreset` checked layout/planner/routine/settings data | `extension/preset-pack.js:99`, `docs/portable-packs.md:69` |

`extension/pack-common.js:5` sets shared bounds and `:79` checks strict headers. Reuse codecs, SVG isolation, byte/size limits and asset hashes. `scripts/check-pack.cjs:1` is the offline CLI; `scripts/skill-check.cjs:4` bundles those validators into one file for pack-making agents. `docs/portable-packs.md:1` documents formats and installation (Make it yours -> More -> Add from a file). Do not confuse that pack checker with this skill's pre-PR checker. The separate Market site sources are not part of the extension tree mapped here.

## Tests and packaging

`package.json:12` defines `test`, `check`, `build` and `preview`. `scripts/test.cjs:1` runs top-level `tests/*.test.cjs` with Node's test runner in one process, in one pinned time zone; use Node 22.8 or newer. Models are required directly; DOM/worker tests use `node:vm`, fake transports and clocks. `tests/pony-fixture.cjs:4` supplies deterministic companion DOM/clock state; `tests/biscuit-flow.test.cjs:4` wires parser, actions and a store. Shared fixtures also include `market-fixture.cjs`, `pets-fixture.cjs`, `gesture-fixture.cjs`, `contributor-fixture.cjs` and `tests/fixtures/make-your-own/`. Keep all worlds artificial and make each regression reach the changed behavior.

`scripts/check.cjs:1` verifies JS syntax, manifest resources, permission boundaries and matching release versions (`:46`). `tests/store-readability.test.cjs:1` keeps the packaged source readable for store review: no `eval`, `new Function` or string timers, and at most 160 bytes of code per line in our own JavaScript (`node scripts/readable-lines.cjs` respaces, whitespace only). `scripts/build.cjs:1` packages the extension; it is not a runtime compilation step. `npm run preview` (`scripts/serve.cjs`) serves made-up courses at http://localhost:4178/. CI (`.github/workflows/ci.yml`) runs test, check and build on Node 22 and 24 for every pull request; locally, run them one at a time. Offline fixtures do not establish live Canvas, provider insertion, installed rendering or battery use; report those limits instead of claiming a live pass.
