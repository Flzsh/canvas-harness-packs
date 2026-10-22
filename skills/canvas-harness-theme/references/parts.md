# Where each part shows

Picture the dashboard: a toolbar across the top; under it a heading with a greeting and the banner; the course list
on the left (or a strip across the top, or a dock along the bottom); and Home's modules (Up next, Today, Planner,
Notes...) as panels in the middle. The student reads inside those panels for long stretches.

## Background
Behind everything, filling the window and staying still while the page scrolls. Panels, cards and the toolbar sit
on top of it in the `surface` colour, so the background shows **around** them and between them, not under the text.
- Size: about 1920 x 1080 (an SVG `viewBox="0 0 1920 1080"`). `fit: cover` crops to fill the window; `position` says
  which part is kept (`top` keeps the top: put the best part of the picture there).
- Make the middle and lower parts calmer and closer to `bg`: that is where panels cover it and where the eye works.
- A video or animated SVG plays only while the page is visible and shows `still` otherwise and with reduced motion.

## Banner
Across the top of the dashboard, beside the greeting. Shown like a course banner: about 1680 x 240 (`viewBox="0 0 1680
240"`), `fit: contain` aligned `right` by default, so its right part is always seen and its left part may sit behind
the greeting text. Keep the left third quiet.

## Frames (9-slice)
`frames.panel` is drawn around every Home module and tab panel; `frames.card` around each course card. Each is an SVG
cut into nine pieces by `slice`: the four corners keep their size, the four edges stretch along their length, and the
middle stretches both ways and is **not drawn** (the panel's surface is there).
- Draw the frame on a square or near-square `viewBox` (e.g. `0 0 120 120` for panels, `0 0 80 80` for cards).
- Put corner art inside the corner squares (the first `slice` units from each side) and keep each edge the same all
  along its length, because edges stretch.
- `slice` is in the SVG's units: `[28, 28, 28, 28]` on a 120 x 120 frame means corners of 28 x 28.
- The frame is drawn at about the same size as its units (a 28-unit corner is about 28 px), so keep corners 12-40.
- Thin lines: `vector-effect="non-scaling-stroke"` keeps them even.
- Leave the middle transparent. A frame is an edge, not a box fill.

## Title font
Used for headings (the greeting, module titles, course names in the list). Body text and controls keep the readable
system font. Pick a font that reads at 16 px and has an open licence.

## Icons
Up to six small pictures CH uses where it needs a motif: empty states ("nothing due"), courses without their own art,
small decorations. Square (`viewBox="0 0 100 100"`), one clear silhouette, readable at 24 px on `surface` in both modes.

## Calm where people read
Every theme, however wild: text sits on `surface`, never directly on a busy picture; motion stays out of the middle of
the window; nothing flashes.
