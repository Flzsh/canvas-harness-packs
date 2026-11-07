# Where each part shows

Picture the dashboard: a toolbar across the top; under it a heading with a greeting and the banner; the course list
on the left (or a strip across the top, or a dock along the bottom); and Home's modules (Up next, Today, Planner,
Notes...) as panels in the middle. The student reads inside those panels for long stretches.

## Background
Behind the whole dashboard, under everything. Canvas Harness draws it at 22% strength and fades it out over the top
64-96 px, so it never shows behind the menu bar or the heading (the greeting and the banner sit on plain `bg`). Home's
modules have no fill of their own: on Home the background is seen faintly behind their text, and fully only in the gaps
and below short modules.
- Size: about 1920 x 1080 (`viewBox="0 0 1920 1080"`), `fit: cover`, `position: top`.
- The top 160-240 units (of 1080) are never seen on Home: they sit under the heading. The next 66-132 units (146-300 with
  the Help band on) show under the Bookmarks / views row; everything lower shows behind the modules (the bottom ~90 px
  also behind the course dock, when the dock is chosen).
- On very wide windows (2552 x 1300) `cover` crops about 140 units off the bottom with `position: top`: art that grows
  from the bottom edge should use `position: bottom` instead.
- So never make one big shape at the top the point of the picture: it is hidden, or shows only its lower edge cut flat
  by the heading. Choose a background that still reads when only part of it shows: an even texture or pattern, a soft
  field of colour, light shapes scattered over the middle and lower parts, art that grows from the corners.
- It sits under text: keep it calm and light, with no strong contrast or small busy detail in the middle of the window.
- A page background the student uploaded themselves (Make it yours -> Courses) is shown instead of the theme's.

## Banner
The banner is the picture of the band at the top of Home: it stands at the right end of the heading, beside the
greeting, and is the only art there. Canvas Harness draws it whole inside a slot as wide as the heading and 96-180 px
tall (10% of the work area's width or 12% of the window's height, whichever is smaller): about 96 px on a 1366 x 768
laptop, 130 px at 1920 x 1080, 156 px at 2552 x 1300. The student's Banner size choice makes it smaller or larger. It
is left out on narrow windows, and it also heads course pages that have no banner of their own.
- About 1680 x 240 (`viewBox="0 0 1680 240"`). `fit: contain` with `position: right` keeps the whole drawing in view at
  every width; `cover` crops it.
- Put the subject in the right part (x from about 1150 to 1680): the greeting, date and chips keep clear of the heading's
  right end, but a long course name can reach further, so keep the left part empty or very quiet.
- Keep everything inside the viewBox: a frame or shape that runs past x = 1680 or y = 240 is cut off at the edge.
- Draw it to read at about 100 px tall: few, bold shapes; text in it at least 20 units tall, if any.
- The same banner sits on the dark heading in dark mode: near-black shapes disappear there. Give dark parts a light edge,
  or keep them off the darkest colours.
- `height` (`small`, `medium`, `tall`: 90, 140, 220 px) makes the heading taller and pushes Home's modules down; leave it
  out unless the art truly needs it.

## Frames (9-slice)
`frames.panel` is drawn around every Home module and panel; `frames.card` around each course in the course list. Each
is an SVG cut into nine pieces by `slice`: the four corners keep their size, the four edges stretch along their length,
and the middle stretches both ways and is **not drawn** (the panel's surface is there). The built-in scenes draw their
frames nine-slice too.
- Draw the frame on a square or near-square `viewBox` (e.g. `0 0 120 120` for panels, `0 0 80 80` for cards).
- Give each frame SVG a `width` and `height` equal to its viewBox (`<svg ... width="120" height="120"
  viewBox="0 0 120 120">`). Canvas Harness 3.9 and the 4.0 previews draw a frame without its own size at each
  panel's size, so a 24-unit corner becomes a block several times larger; with the size given, every version slices it
  as drawn.
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
On Home every assignment row and small heading takes the next icon in turn, whatever its course: make the icons
motifs of the theme, not subject symbols (a sigma for maths would end up beside an English assignment).

## Calm where people read
Every theme, however wild: text sits on the theme's own colours, never directly on a busy picture (the background
shows faintly behind Home's modules, so keep it calm); motion stays out of the middle of the window; nothing flashes.

## Versions
Canvas Harness 3.9.3 and the 4.0 previews up to Preview 6 draw the background at full strength over the whole
dashboard, behind the heading and behind the modules' text too, and draw frames without their own size at each panel's
size. The next releases dim the background, keep it out of the heading and size frames by their own width and height.
A theme that follows the advice above (a calm, light background with its art not gathered at the top, frames with
width and height, the banner's subject at its right) looks right in both.
