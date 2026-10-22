# The .chpreset file

One UTF-8 JSON file. Unknown fields are errors. Every preset shows what it will change before it is applied, and every
change can be undone. A preset never touches Canvas.

```json
{ "format": "chpreset", "version": 1, "name": "Exam week", "by": "Ada", "kind": "planner", "data": { } }
```
- `name` 1-40 characters, `by` optional (at most 60), `kind` one of `layout`, `planner`, `routines`, `settings`.

## kind: layout
How Home is arranged, in Canvas Harness's own layout tree: a box is a list of modules (or boxes) along an axis.
```json
"data": {
  "workspaceLayout": { "axis": "y", "children": ["today", { "axis": "x", "children": ["context", "work", "reader"] }, "timer"] },
  "moduleSize": { "work": "l", "timer": "s" }
}
```
Module keys: `today` (your AI's Today card), `work` (Up next), `reader` (the selected assignment), `context` (course
information), `week` (Planner), `timer` (focus timer), `clock`, `notes`, `bookmarks`, `grades`, `messages`, `handin`
(To hand in), `pet`. The three core panels `context`, `work` and `reader` must each appear exactly once; every other
module is optional and appears at most once. A module the student does not have (its feature is off) is skipped, not
an error. `moduleSize`
(optional): `s`, `m` or `l` per module.

## kind: planner
A week template. Blocks become Planner cards on the week the student picks.
```json
"data": { "days": {
  "mon": [{ "title": "Review notes", "minutes": 30, "at": "19:00" }],
  "wed": [{ "title": "Practice problems", "minutes": 45 }],
  "fri": [{ "title": "Plan next week", "minutes": 15, "at": "16:00" }]
} }
```
Days `mon`..`sun`; at most 8 blocks a day; `title` 1-60 characters; `minutes` 10-240; `at` optional `HH:MM` (24 h).

## kind: routines
Biscuit routines, in the words Biscuit already understands (the checker runs Biscuit's own parser on each line and
says which it does not understand).
```json
"data": { "lines": ["every sunday at 7pm plan my week", "every weekday at 4pm remind me to check what's due"] }
```
At most 20 lines, each at most 120 characters.

## kind: settings
A look in one go, using Canvas Harness's own setting names and values.
```json
"data": { "courseNavigation": "dock", "dockSize": "large", "bannerSize": "compact", "pageTint": "sage", "courseCardStyle": "rounded", "panelFrame": "stitch", "pet": { "coat": "sage", "harness": "gold" } }
```
Allowed keys and values: `courseNavigation` sidebar|topbar|dock, `dockSize` small|medium|large, `bannerSize`
compact|standard|large, `pageTint` paper|accent|sky|sage|lilac|blush|sand|snow, `surfaceStyle` paper|clean|contrast,
`courseCardStyle` sketch|rounded|minimal, `panelFrame` pen|stitch|card|line|none, `deskOrder`
context-first|work-first|stacked, `showCourseIcons`, `showDeadlinePreview`, `showBookmarks`, `showCourseInformation`
true|false, `showGrades` true|false, and the pony's `pet`: `coat` oat|chestnut|dapple|ink|sage|rose and/or `harness`
red|clay|gold|forest|ocean|iris.
The checker lists the exact set its Canvas Harness version accepts.
