# Public 3.4.0 architecture

All pointers below are repository-relative `file:line` anchors in public 3.4.0. They name source declarations, not private directories or a promise about later releases. GitHub `main` is 3.2.1 at this handoff while 3.4 awaits store approval. Re-find the declaration if lines move; do not apply a 3.4 patch blindly to an older checkout.

## Entry points and schools

- `extension/manifest.json:27` selects `background.js`, the Manifest V3 service worker. Permissions and explicit resource exposure live in this manifest; do not widen them for convenience.
- `extension/background.js:2` imports worker modules; `:28` loads selected features; `:144` begins custom-school registration; `:173` loads `market-worker.js`; `:175` starts the shared account-write server. Validate sender, document and account before routing a request.
- `extension/site.js:5` normalizes secure origins, `:19` validates custom addresses, `:25` records trusted sites, `:29` recognizes Canvas pages and `:36` preserves native assignment/submission pages. Route site and timezone decisions through `ReserveSite`, never a hard-coded school URL.
- `extension/school-address.js:11` reads allowed addresses and `:30` prepares one before navigation. `extension/background.js:164` derives custom-site registrations from the manifest and inserts `custom-site.js` after `site.js`. Keep the two routes equivalent; wildcard optional permission does not authorize running on every website.
- `extension/api.js:18` creates the Canvas client; `:42` checks paths and `:78` constructs GET requests with same-origin credentials. Preserve its endpoint allowlist, cancellation and retry limits. No Canvas submission, message send or grade mutation belongs in a contribution.

## Features, startup and resource lists

`extension/features.js:5` defines each feature's JS, CSS and `needs`; `:33` fixes execution order, `:34` lists dashboard CSS, `:39` defines core files and `:42` identifies scripts already loaded statically. `:44` lists lazy feature assets, `:50` defines presets and `:59` resolves dependencies.

| Area | Catalogue entry | Main dependency / placement |
|---|---|---|
| Dashboard / assignments | `features.js:7` | `views.js`, `app.js`, dashboard models and views |
| Planner, grades, materials, course hub | `features.js:8` | Dashboard; hub also needs materials |
| Math, GPA, tools | `features.js:12` | GPA needs tools; standalone tools stay optional |
| Appearance and scene themes | `features.js:15` | Dashboard; pack codecs and editor load with appearance |
| Course art and Quick Upload | `features.js:18` | Quick Upload needs appearance and course art |
| Biscuit (`pony`) | `features.js:20` | Planner, hence dashboard; parsing, reasoning, controller and art |
| Motion and Canvas navigation | `features.js:21` | Early scripts self-check preferences; later modules follow selection |
| PDF reader | `features.js:25` | Host loads with feature; reader assets open on demand |
| Focus room, Review deck, Grade impact | `features.js:26` | Opt-in Custom features; absent from Full and Lite defaults |
| Play and AI handoff | `features.js:29` | AI needs tools; play assets are lazy |

Full enables the catalogue except the three opt-ins. Lite selects dashboard, planner, grades, math, arrange, tools, GPA and native appearance. Custom resolves only selected entries plus their dependencies. Adding a default feature changes Lite's cost: do not slip heavier modules into core.

`extension/manifest.json:46` has two `document_start`, top-frame content-script entries: early feature/site/startup scripts and a small static controller chain ending in `feature-loader.js`. `extension/startup.js:5` gates the dashboard and `:34` starts cleanup/release behavior. `extension/feature-loader.js:14` waits for early preference reconciliation, then asks the worker to load. `extension/background.js:46` applies that document's selection before injecting files; `:48` filters out `ReserveFeatures.staticJS`. Do not inject a static module twice or replace a document's selected snapshot with a later hint.

When adding or removing dashboard CSS, reconcile all of these:

- `extension/features.js:34` (`dashboardCSS`, plus core and feature CSS where appropriate).
- `extension/startup.js:19` (`allSheets` preload list).
- `extension/content.js:105` (workspace fallback list; chosen styles normally come from startup).
- `extension/manifest.json:89` and `:172` (explicit web-accessible lists).

The manifest's fixed Instructure entry includes `pdf-reader.html` and `pdf-host.css`; its wildcard custom-site entry uses dynamic URLs (`manifest.json:250`) and excludes those reader resources. Do not expose reader internals, JS, vendor modules or wildcard assets to arbitrary sites. Check `tests/resource-exposure.test.cjs:1`, `tests/scene-manifest.test.cjs:1`, `tests/startup.test.cjs:1`, `tests/features.test.cjs:1` and `scripts/check.cjs:12`.

## Accounts, writes and backups

- `extension/session.js:7` coordinates identity, cached snapshots and refresh. `:100` suspends; `:104` verifies before resuming. `extension/content.js:152` constructs the session and `:205` handles visibility. Do not show cached personal data for an unverified account.
- `extension/storage.js:308` creates a store only for a verified account. `:310` binds `reserve:v1:${origin}:${accountId}`; keep origin and account together. Appearance/feature preferences have their own deliberately shared boundaries: do not move personal notes, reminders or coursework into them.
- `extension/storage.js:44` serializes operations; `:257` validates worker writes and compares the prior value; `:288` implements the adapter. `:440` exposes `runAccountWrite`; `extension/account-writes.js:7` delegates Market/media mutations to that same serializer. Avoid direct read-modify-write calls that can overwrite another tab's newer state.
- `extension/storage.js:242` validates backup envelopes, `:312` constructs an account-bound export, `:329` captures media and Market data, `:335` exports with packs, `:336` imports and `:421` reads recovery. `extension/backup-media.js:34` validates media owner scopes. Preserve pack bytes, media references, rollback and later user edits, not just the small settings object.
- Read `tests/account-writes.test.cjs:1`, `tests/storage-portable-backup.test.cjs:1`, `tests/market-account-writes.test.cjs:1` and `tests/backup-media.test.cjs:1` for concurrency and restoration cases.

## Dashboard and views

`extension/content.js:84` mounts the dashboard. `extension/dashboard.js:153` owns its controller; `:35` and `:47` patch live headings and keyed UI. `extension/dashboard-model.js:163` filters assignments; `extension/dashboard-view.js:38` renders markup synchronously. Keep Canvas normalization and filtering in models and event/state work in controllers. Escape source text before HTML insertion.

`extension/app.js:11` mounts the secondary workspace and `:35` renders it synchronously. `extension/views.js:36` renders assignments, `:37` the week and `:42` task details. Planner, grades, course hub and materials have their own `*-model.js`, `*-ui.js` or `*-view.js` modules referenced by the catalogue. Preserve keyboard focus, selection, scroll position, teardown and Undo when changing a view.

## Biscuit and the AI boundary

- `extension/biscuit-parse.js:116`: local typed-line parser; exported `parse` returns candidates with `intent`, `fields` and `preview` (`tests/biscuit-parse.test.cjs:5`). Resolve against the student's world, not a universal list of school subjects.
- `extension/pony-ask.js:18`: matches items; `:21` builds local plans; `:34` handles local intents, reminders and routines.
- `extension/pony-brain.js:25`: reads the current world; `:55` evaluates suggestions; `:59` produces speech. Respect skills, quiet time and learning/backoff state.
- `extension/pets.js:8`: connects parser, Ask and Brain; `:95` mounts; `:140` starts a visible-only brain timer; `:144` stops hidden work. `extension/widgets.js` connects actions to the account store and workspace.
- `extension/ai-context.js:36` selects assignment instructions/rubric, `:59` bundles bounded labeled sources and `:72` composes the prompt. `extension/ai-source.js:27` checks scope and `:137` collects reviewed sources. `extension/ai-panel.js:335` prepares a preview without sending. Provider permissions/routing live in `ai-providers.js`, `ai-web.js` and the worker; keep the Copy fallback.

The unified world index, “Help with this” inference and expanded strict answer shapes are roadmap work. Do not describe them as implemented in 3.4 or add a help-type menu because one exists in older UI. Use [evals.md](evals.md) to specify intended behavior before implementing an issue.

## PDF reader

`extension/pdf-host.js:28` recognizes supported PDF clicks; `:100` fetches verified bytes and `:137` creates the Canvas host integration. `extension/pdf-reader.html:1` is the extension iframe entry; `extension/pdf-reader.js:52` creates the reader and `:65` scopes parent messages with origin/token. PDF.js ships under `extension/vendor/pdfjs/`; keep vendor notices and hashes intact.

`extension/pdf-model.js:30` binds annotations to origin, account and file ID. `extension/pdf-context.js:37` begins the text-extraction module; `extension/pdf-export.js:94` serializes annotations. Preserve account verification, safe URL routes, source bytes, save/close acknowledgments and fallback to Canvas. Use `tests/pdf-host.test.cjs:1`, `tests/pdf-route.test.cjs:1`, `tests/pdf-model-integrity.test.cjs:1` and `tests/pdf-export.test.cjs:1`.

## Market and pack formats

`extension/market.js:19` opens the optional Market; `extension/market-site.js:12` binds owners and `:16` checks allowed Canvas origins. `extension/market-bridge.js:22` validates catalogue entries before download/install. `extension/market-worker.js:16` routes permitted operations and verifies the current account. `extension/packs.js:16` checks catalogue fields, `:33` checks SHA-256, `:135` installs and `:164` removes while preserving later edits. Market downloads are data; executable code must ship inside the extension.

| File | Codec / reference |
|---|---|
| `.chpack` course artwork, SVG with pack metadata | `extension/quick-pack.js:1`, `docs/portable-packs.md:27` |
| `.chkit` artwork/settings kit | `extension/custom-kits.js:1`, `docs/portable-packs.md:31` |
| `.chtheme` palette and local assets | `extension/theme-pack.js:34` |
| `.chpet` poses and local assets | `extension/pet-pack.js:6` |
| `.chpreset` checked settings/planner/routine data | `extension/preset-pack.js:45` |

`extension/pack-common.js:5` sets shared bounds and `:53` checks strict headers. Reuse codecs, SVG isolation, byte/size limits and asset hashes. `scripts/check-pack.cjs:1` is the offline CLI; `scripts/skill-check.cjs:4` bundles those validators into one file for pack-making agents. `docs/portable-packs.md:1` documents formats and installation. Do not confuse that pack checker with this skill's pre-PR checker. The separate Market site sources are not part of the extension tree mapped here.

## Tests and packaging

`package.json:12` defines scripts. `scripts/test.cjs:1` runs top-level `tests/*.test.cjs` with Node's test runner in one process; use Node 22.8 or newer. Models are required directly; DOM/worker tests use `node:vm`, fake transports and clocks. `tests/pony-fixture.cjs:4` supplies deterministic companion DOM/clock state; `tests/biscuit-flow.test.cjs:4` wires parser, actions and a store. Shared fixtures also include `market-fixture.cjs`, `pets-fixture.cjs`, `gesture-fixture.cjs`, and `tests/fixtures/make-your-own/`. Keep all worlds artificial and make each regression reach the changed behavior.

`scripts/check.cjs:1` verifies JS, manifest resources, permission boundaries and matching release versions. `scripts/build.cjs:1` packages the extension; it is not a runtime compilation step. Run tests, check and (when packaging changes) build sequentially. Offline fixtures do not establish live Canvas, provider insertion, installed rendering or battery use; report those limits instead of claiming a live pass.
