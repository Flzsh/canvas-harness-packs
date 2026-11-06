# Where each part shows

Picture the dashboard: a toolbar across the top; under it a heading with a greeting and the banner; the course list
on the left (or a strip across the top, or a dock along the bottom); and Home's modules (Up next, Today, Planner,
Notes...) as panels in the middle. The student reads inside those panels for long stretches.

## Background
Behind everything, covering the whole dashboard (at least the window; on a long page it scrolls with the page). Panels,
cards and the toolbar sit on top of it in the `surface` colour, so the background shows **around** them and between
them, not under the text.
- Size: about 1920 x 1080 (an SVG `viewBox="0 0 1920 1080"`). `fit: cover` crops to fill the dashboard; `position` says
  which part is kept (`top` keeps the top: put the best part of the picture there).
- Make the middle and lower parts calmer and closer to `bg`: that is where panels cover it and where the eye works.
- A video or moving picture shows its `still` much of the time (`motion.md` says when).
- A page background the student uploaded themselves (Make it yours -> Courses) is shown instead of the theme's.

## Banner
Across the top of the dashboard, behind the greeting and the date, and on course pages that have no banner of their
own. The band is about 200-240 px tall at the default banner size (the student's Banner choice in Courses changes it;
`height` asks for 90, 140 or 220 px) and is left out when the page is narrow. About 1680 x 240 (`viewBox="0 0 1680
240"`) fits it. Unless you set them, `fit` is `cover` and `position` `center`, so its edges may be cropped. The greeting
sits over its left part: keep the left third quiet.

## Frames (9-slice)
`frames.panel` is drawn around every Home module and panel; `frames.card` around each course in the course list. Each
is an SVG cut into nine pieces by `slice`: the four corners keep their size, the four edges stretch along their length,
and the middle stretches both ways and is **not drawn** (the panel's surface is there). The built-in scenes draw their
frames nine-slice too.
- Draw the frame on a square or near-square `viewBox` (e.g. `0 0 120 120` for panels, `0 0 80 80` for cards).
- Put corner art inside the corner squares (the first `slice` units from each side) and keep each edge the same all
  along its length, because edges stretch.
- `slice` is in the SVG's units: `[28, 28, 28, 28]` on a 120 x 120 frame means corners of 28 x 28.
- The frame is drawn at the same size as its units (a 28-unit corner is 28 px), inside the panel's edge and over its
  padding, so keep corners 12-40.
- Thin lines: `vector-effect="non-scaling-stroke"` keeps them even.
- Leave the middle transparent. A frame is an edge, not a box fill.
- A frame never moves: CH draws it from its still copy.
- The checker's preview draws every frame with a 24 px edge; in Canvas Harness each edge is as wide as its slice.

## Title font
Used for every heading: the greeting (or the open course's name), module and panel titles. Course names in the list,
body text and controls keep Canvas Harness's own fonts. Pick a font that reads at 16 px and has an open licence.

## Icons
Up to six small pictures CH uses where it needs a motif: courses in the side list without art of their own (in order,
repeating), empty states such as "nothing due" (the third icon, or the first if there are fewer), small decorations.
Square (`viewBox="0 0 100 100"`), one clear silhouette, readable at 24 px on `surface` in both modes.

## Calm where people read
Every theme, however wild: text sits on `surface`, never directly on a busy picture; motion stays out of the middle of
the window; nothing flashes.
