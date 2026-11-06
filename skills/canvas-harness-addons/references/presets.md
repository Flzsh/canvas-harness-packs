# The .chpreset file

One UTF-8 JSON file, at most 40 MB. Unknown fields are errors. Every preset shows what it will change before it is
applied (Add from a file lists the changes above Apply), and Remove takes its changes back. A preset never touches
Canvas.

```json
{ "format": "chpreset", "version": 1, "name": "Exam week", "by": "Ada", "kind": "planner", "data": { } }
```
- `name` 1-40 characters, `by` optional (at most 60), `kind` one of `layout`, `planner`, `routines`, `settings`.
  `make-pack.cjs` adds `format` and `version` when `preset.json` leaves them out.

## kind: layout
How Home is arranged, in Canvas Harness's own layout tree: a box is a list of 2 or more modules (or boxes) along an
axis (`x` side by side, `y` stacked), at most 5 boxes deep.
```json
"data": {
  "workspaceLayout": { "axis": "y", "children": ["week", { "axis": "x", "children": ["context", "work", "reader"] }, "timer"] },
  "moduleSize": { "work": "l", "timer": "s" }
}
```
Module keys: `context` (Course information), `work` (Up next), `reader` (Assignment details), `week` (This week),
`handin` (To hand in), `timer` (Focus timer), `clock`, `notes`, `bookmarks`, `grades`, `impact` (Grade impact),
`review` (Review), `messages`, `pet` (Paddock). The three core panels `context`, `work` and `reader` must each
appear exactly once; every other module is optional and appears at most once (the checker reports a missing or
repeated one as "Invalid workspaceLayout setting"). The old `today` module is retired and refused. A module whose
feature is off (Planner for the modules you can add, Course hub for `messages`, Grades for `grades`, the pony for `pet`) is
left out when the preset is applied, not an error. `moduleSize` (optional): `s`, `m` or `l` per module.

## kind: planner
A week template. Blocks become Planner cards on the week the student picks.
```json
"data": { "days": {
  "mon": [{ "title": "Review notes", "minutes": 30, "at": "19:00" }],
  "wed": [{ "title": "Practice problems", "minutes": 45 }],
  "fri": [{ "title": "Plan next week", "minutes": 15, "at": "16:00" }]
} }
```
Days `mon`..`sun`; at most 8 blocks a day; `title` 1-200 characters; `minutes` a whole number from 10 to 240; `at`
optional `HH:MM` (24 h).

## kind: routines
Biscuit routines, in the words Biscuit already understands (the checker runs Biscuit's own parser on each line and
says which it does not understand). A routine plans (tonight, tomorrow or the week), starts a focus session or a
break, or reminds.
```json
"data": { "lines": ["every sunday at 7pm plan my week", "every weekday at 4pm remind me to check what's due"] }
```
At most 20 lines, each at most 240 characters. An account keeps at most 20 routines in all, so Apply stops when the
preset would go over.

## kind: settings
A look in one go, using Canvas Harness's own setting names and values.
```json
"data": { "courseNavigation": "dock", "dockSize": "large", "bannerSize": "compact", "pageTint": "sage", "courseCardStyle": "rounded", "panelFrame": "stitch", "pet": { "coat": "sage", "harness": "gold" } }
```
Allowed keys and values (3.9.3): `theme` light|dark|system, `accent` clay|forest|indigo|rose|ocean|amber or a
`#rrggbb` colour, `pageTint` paper|accent|sky|sage|lilac|blush|sand|snow, `surfaceStyle` paper|clean|contrast,
`panelFrame` pen|stitch|card|line|none, `density` comfortable|compact, `font` system|humanist|serif, `textSize`
standard|large, `readingFont` book|interface|easy, `motion` gentle|still|off, `livingArt` on|off, `greeting` on|off,
`quickOpen` on|off, `sceneTheme` ""|starry|sea|stars|blueprint, `nightArt` a number 0-100, `courseNavigation`
sidebar|topbar|dock, `dockSize` small|medium|large, `dockShelf` kraft|paper|none, `dockStyle` tiles|cards,
`bannerSize` compact|standard|large, `courseCardStyle` sketch|rounded|minimal, `deskOrder`
context-first|work-first|stacked; true|false for `showCourseStrip`, `showCourseIcons`, `showDeadlinePreview`,
`showBookmarks`, `showCourseInformation`, `showHelp`, `showGrades`, `showRecentGrades`, `dockNamesAlways`,
`dockCounts`, `dockLively`, `dockHide`, `biscuitOffers`; and the pony's `pet`: `coat`
oat|chestnut|dapple|ink|sage|rose and/or `harness` red|clay|gold|forest|ocean|iris.
For a wrong value the checker prints the values its Canvas Harness version accepts; a key it does not know is an
"unknown field".
