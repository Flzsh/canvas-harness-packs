---
name: canvas-harness-theme
description: Make a whole Canvas Harness theme in any style - page background, banner, frames for panels and course cards, heading font, light and dark colours, small icons - from SVGs, images or a looping video, packed as one .chtheme file the student adds to Canvas Harness. Use when someone wants their own Canvas Harness theme or "a theme like Starfield / Under the Sea / Starry Night but mine", a dashboard reskin, or a full look for the extension.
---

# A Canvas Harness theme of your own

Canvas Harness replaces the Canvas LMS dashboard. Its built-in themes (Starfield's photographic night sky with a
spiral galaxy, Under the Sea's sunlit reef over deep water, Starry Night's painted swirling sky) change the whole page,
not one course. This skill makes a theme like that in the student's own style: anything from a soft pastel paper look
to a neon city, a pixel dungeon or a hand-painted garden. Their creativity decides the look; this skill makes sure it
loads, stays readable and runs smoothly.

## What a theme is made of

| Part | What it is | File types |
|---|---|---|
| `colors` (required) | the page's colours for light and/or dark: background, panel surface, text, muted text, lines, accent | hex |
| `background` | the picture behind the whole dashboard | SVG, PNG, WebP, JPEG, GIF, MP4, WebM |
| `banner` | the art across the top of the dashboard | same |
| `frames.panel`, `frames.card` | the edges drawn around Home modules and tab panels, and around course cards | SVG |
| `title` | a font for headings, with an open licence | WOFF2 |
| `icons` | up to 6 small motifs CH shows where it needs a little picture | SVG, PNG, WebP |

All of it travels as **one `.chtheme` file** (`references/format.md`). The student adds it in Canvas Harness:
**Make it yours -> Add from a file**. Removing it brings back their previous look exactly.

## Read before making

| Reference | When |
|---|---|
| `references/format.md` | Always. The exact file, every field, the limits and what is refused. |
| `references/parts.md` | Always. Where each part shows, its sizes, what must stay calm, how frames stretch. |
| `references/colors.md` | Before choosing colours. Contrast rules the checker enforces, and how to pass them in any style. |
| `references/motion.md` | Before animating anything or using a video. |
| `references/your-style.md` | For turning taste into a style sheet (it applies to themes too). |

## Workflow

1. **Ask (one message):** the look they want (words, a game, film, place, artist, a picture), light, dark or both, how
   lively (still, gentle, lively), anything they do not want. Default: both modes, gentle motion.
2. **Style sheet** (five lines: palette, line, shapes, texture, motion) and a one-line idea: "a moonlit greenhouse:
   glass panes as frames, moths drifting over a deep green night."
3. **Colours first** (`colors.md`). Run the checker on a theme with only `name` and `colors` to see the contrast pass
   before drawing anything.
4. **Make the parts** in a working folder: background, banner, frames, icons as files; pick an openly licensed font if
   the style needs one (`format.md` lists the licences).
5. **Write `theme.json`** in the folder (assets as file names) and pack it:
   `node scripts/make-pack.cjs <folder>` -> `<folder>.chtheme`.
6. **Check until clean:** `node scripts/check.cjs <folder>.chtheme --preview preview.html` runs Canvas Harness's own
   validator and shows the theme on a sample dashboard in light and dark. Fix every problem it lists; then look at the
   preview the way a student reads it for an hour.
7. **Hand over** the `.chtheme` file and two lines: "Canvas Harness -> Make it yours -> Add from a file. Remove it in
   the same list."

## Rules that do not bend
- Text must stay readable everywhere: the contrast rules in `colors.md` are checked and enforced.
- Reading areas stay calm. Busy pictures go around and behind panels, never under text at full strength.
- SVGs follow Canvas Harness's artwork rules (`format.md`): no scripts, no embedded images, nothing from outside.
- **Original work only.** Inspired by anything, copied from nothing: no traced art, characters, logos, brand marks or
  copyrighted pictures and fonts. Photos and videos must be the student's own or openly licensed.
- No personal information (names, school logos) if the theme might be shared.
