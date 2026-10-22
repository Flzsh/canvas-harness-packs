---
name: canvas-harness-addons
description: Make add-ons and utilities for Canvas Harness - ready-made Home layouts, Planner week templates, Biscuit routines and setting sets packed as one .chpreset file, or a new feature or tool built into Canvas Harness itself through a pull request. Use when someone wants to extend Canvas Harness, share a setup, add a tool, widget or utility, automate something in their dashboard, or contribute a feature.
---

# Add-ons and utilities for Canvas Harness

**Works with:** Canvas Harness 3.4 and later for .chpreset files (the next store update; the checker works now). Features made by pull request ship in the release after they are merged.

Canvas Harness replaces the Canvas LMS dashboard. Students can extend it in two ways, and this skill does both:

| You want | Make | How it reaches students |
|---|---|---|
| A setup others can use: a Home layout, a Planner week, Biscuit routines, a set of settings | a **data add-on**, one `.chpreset` file | Make it yours -> Add from a file, or the Market |
| Something new it can do: a tool, a widget, a calculator, a new view | a **feature**, built into Canvas Harness by a pull request | in the next release; the Market can then offer a switch that turns it on |

Why two ways: browser extensions in the Chrome Web Store may not run code downloaded after install. So everything that
is code ships inside Canvas Harness, reviewed and tested, and everything downloadable is data. Be honest with the
student about this before you start: a feature takes a pull request and a release, a data add-on works today.

## Data add-ons (.chpreset)

One JSON file of one `kind` (`references/presets.md` has every field):
- `layout`: how Home is arranged (which modules, in what order, how wide).
- `planner`: a week template ("Exam week": a review block each evening), added as Planner cards for the week the
  student picks.
- `routines`: Biscuit routines in plain words ("every sunday at 7pm plan my week").
- `settings`: a look in one go: course list placement, banner size, page tint, card style, pet coat.

Workflow: ask what the student wants it for; write `preset.json` in a folder; `node scripts/make-pack.cjs <folder>`;
`node scripts/check.cjs <folder>.chpreset --preview preview.html` (Canvas Harness's own validator, and a page showing
what it will change); fix until clean; hand over with "Make it yours -> Add from a file; every change can be undone".

## Features (pull request)

Read `references/features.md` first. In short:
1. Talk the idea through: who it helps, what it shows or does, what it must never do. Check it does not already exist
   (the feature list in `extension/features.js`, the README).
2. Fork `github.com/Flzsh/canvas-harness`, install Node 22+, run `npm test` and `npm run check` once to see a clean
   start.
3. Build it as a feature: its own files in `extension/`, registered in `extension/features.js` as an optional feature
   (off until the student switches it on), using Canvas Harness's existing helpers for Canvas data, storage and UI.
4. Tests with `node:test` in `tests/` for everything it decides; `npm test` and `npm run check` pass.
5. Open a pull request: what it does, a screenshot, what data it reads, what it stores, that it adds no permission.

## Rules that do not bend
- Canvas is only read, never written: no submitting, posting, editing or marking anything on Canvas.
- Nothing on quiz or exam pages.
- No downloaded or remote code, no new permissions without a strong reason the reviewer accepts, no tracking, no
  sending student data anywhere.
- A student's data stays in their browser and in their account's storage.
- Data add-ons are data only: no scripts, no URLs that load things, nothing outside the format.
- Original work; no personal information in anything meant to be shared.
