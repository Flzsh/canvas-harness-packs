---
name: canvas-harness-theme
description: Make a whole Canvas Harness theme in any style - page background, banner, frames for panels and course cards, heading font, light and dark colours, small icons - from SVGs, images or a looping video, packed as one .chtheme file the student adds to Canvas Harness. Use when someone wants their own Canvas Harness theme or "a theme like Starfield / Under the Sea / Starry Night / Blueprint but mine", a dashboard reskin, or a full look for the extension.
---

# A Canvas Harness theme of your own

**Works with:** Canvas Harness 3.4.0 and later (3.4.0 added .chtheme files). Checked against 3.9.3, the current release (the Chrome Web Store has 3.9), and 4.0 Preview 6, which read a theme the same way; `scripts/check.cjs` is 3.9.3's own validator. Fields marked (3.9) in `format.md` may be refused by older versions. Themes need the Appearance editor: on in Full (the default), a switch in Custom, left out of Lite.

Canvas Harness replaces the Canvas LMS dashboard. Its built-in scenes (Starfield's photographic night sky with a
spiral galaxy, Under the Sea's sunlit reef over deep water, Starry Night's painted swirling sky, Blueprint's drafting
sheet with machines being drawn) change the whole page, not one course. This skill makes a theme like that in the
student's own style: anything from a soft pastel paper look to a neon city, a pixel dungeon or a hand-painted garden.
Their creativity decides the look; this skill makes sure it loads, stays readable and runs smoothly.

## What a theme is made of

| Part | What it is | File types |
|---|---|---|
| `colors` (required) | the page's colours for light and/or dark: background, panel surface, text, muted text, lines, accent | hex |
| `background` | the picture behind the whole dashboard | SVG, PNG, WebP, JPEG, AVIF, GIF, MP4, WebM |
| `banner` | the art across the top of the dashboard, behind the greeting | same |
| `frames.panel`, `frames.card` | the edges drawn around Home modules and panels, and around each course in the course list | SVG |
| `title` | a font for headings, with an open licence | WOFF2 |
| `icons` | up to 6 small motifs CH shows where it needs a little picture | SVG, PNG, WebP, JPEG, AVIF |

All of it travels as **one `.chtheme` file** (`references/format.md`). The student adds it in Canvas Harness:
**Make it yours -> More -> Add from a file**, looks at the preview and presses **Apply**. The theme is then listed by
name in **Make it yours -> Look** with Preview, Use and Remove. Picking a built-in scene switches away from it (Use
brings it back); Remove takes it out and brings back the look they had before.

## Read before making

| Reference | When |
|---|---|
| `references/format.md` | Always. The exact file, every field, the limits and what is refused. |
| `references/parts.md` | Always. Where each part shows, its sizes, what must stay calm, how frames stretch. |
| `references/colors.md` | Before choosing colours. Contrast rules the checker enforces, and how to pass them in any style. |
| `references/motion.md` | Before animating anything or using a video. |
| `references/your-style.md` | For turning taste into a style sheet (its last part is about course art; for a theme's parts, `parts.md` decides). |

## Workflow

1. **Ask (one message):** the look they want (words, a game, film, place, artist, a picture), light, dark or both, how
   lively (still, gentle, lively), anything they do not want. Default: both modes, gentle motion.
2. **Style sheet** (five lines: palette, line, shapes, texture, motion) and a one-line idea: "a moonlit greenhouse:
   glass panes as frames, moths drifting over a deep green night."
3. **Colours first** (`colors.md`). Run the checker on a theme with only `name` and `colors` to see the contrast pass
   before drawing anything.
4. **Make the parts** in a working folder: background, banner, frames, icons as files, and a still picture for anything
   that moves; pick an openly licensed font if the style needs one (`format.md` lists the licences).
5. **Write `theme.json`** in the folder (assets as file names) and pack it:
   `node scripts/make-pack.cjs <folder>` -> `<folder>.chtheme`.
6. **Check until clean:** `node scripts/check.cjs <folder>.chtheme --preview preview.html` runs Canvas Harness's own
   validator and shows the theme's parts on a light and a dark sample, with the stills. Fix every problem it lists;
   then look at the preview the way a student reads it for an hour.
7. **Hand over** the `.chtheme` file and two lines: "Canvas Harness -> Make it yours -> More -> Add from a file, then
   Apply. Remove it under Make it yours -> Look."

## Rules that do not bend
- Text must stay readable everywhere: the contrast rules in `colors.md` are checked and enforced.
- Reading areas stay calm. The background shows faintly behind Home's text and never behind the heading: the banner
  is the picture of the band at the top, so keep the background calm (where each part shows: `parts.md`).
- SVGs follow Canvas Harness's artwork rules (`format.md`): no scripts, no embedded images, nothing from outside.
- **Original work only.** Inspired by anything, copied from nothing: no traced art, characters, logos, brand marks or
  copyrighted pictures and fonts. Photos and videos must be the student's own or openly licensed.
- No personal information (names, school logos) if the theme might be shared.
