# Your style: from taste to a style sheet, and how each style works in SVG

The student's taste leads. Your job is to turn "I like cozy pixel games" or a photo of their sketchbook into rules
precise enough that the banner, frame and icon look like one hand made them, and to know how that look is built
within what Canvas Harness accepts (`format.md`).

## The style sheet (write it before drawing)

| Line | Decide | Example |
|---|---|---|
| Palette | 5-8 exact hex colours, which one is the "ink", which is the main accent | `#1E2A3A ink, #F4E9D8 paper, #E07A5F accent, #81B29A, #F2CC8F` |
| Line | none / thin even / bold even / rough / pixel grid | "bold even 6 px outlines, round ends" |
| Shapes | geometric / organic / blocky / soft | "rounded blobs, no sharp corners" |
| Texture | flat / layered translucent washes / halftone dots / grain / gradients | "flat fills, one soft shadow layer" |
| Motion | what moves, how, how often | "clouds drift 40 s, a lamp flickers twice a cycle" |

Ask for a reference when words are vague ("cute" means ten things). Name what you take from it ("the thick outlines
and pastel palette"), never the work itself.

## Styles and how to build them

- **Flat vector / illustration**: solid fills, few colours, clean shapes. `path`, `circle`, `rect` freely. Depth from
  2-3 tones of each colour.
- **Line art / ink**: strokes carry the drawing; fills light or none. Use `stroke-linecap="round"`; vary
  `stroke-width` for weight. For a hand-drawn feel, add tiny irregularities to the path points yourself.
- **Watercolour / painterly**: overlapping translucent shapes (`fill-opacity` .3-.6) with soft, irregular edges; a few
  darker edge strokes. A static `feTurbulence` + `feDisplacementMap` filter on still layers gives a bleed (never
  animate it: slow).
- **Pixel art**: draw on a grid with `rect`s (or one `path` per colour), whole-number coordinates,
  `shape-rendering="crispEdges"`. Keep the grid coarse (each pixel 6-10 units in the banner) so it reads at 80 px tall.
  Animate by switching frames (`opacity` steps) rather than moving by fractions.
- **Paper cut / layered**: stacked flat layers, each with a soft drop shadow (`feDropShadow`, static) or a darker
  offset copy behind it.
- **Neon / glow**: dark background is not available everywhere (the banner is transparent over the page), so draw the
  glow tubes with a blurred copy beneath (`feGaussianBlur`, static) and make sure it reads on light pages too.
- **Geometric / Bauhaus / minimal**: circles, arcs, bars, strong primaries, lots of empty space; motion as slow
  rotations or a single moving dot.
- **Anime-style scenery / soft gradients**: `linearGradient` skies, layered silhouettes for depth, small bright
  highlights; keep gradients still and move small things (birds, clouds, light glints).
- **Retro print / risograph**: two or three ink colours, halftone dots (`pattern` of small circles), slight offset
  between colour layers.

Mixing is fine if the style sheet says how.

## Making it fit Canvas Harness (any style)

- **Light and dark pages.** The banner and frame are transparent images over the page. Check both in the preview; a
  pale drawing vanishes on light paper, a dark one on the dark theme. A thin darker outline or a soft backing shape
  fixes most cases.
- **The banner's left part sits behind the course title** in some layouts: keep it calm (see `slots.md`).
- **The frame is stretched** over the whole row: keep the middle empty, art on edges and corners, and use
  `vector-effect="non-scaling-stroke"` on its lines.
- **The icon is 22-40 px**: one clear silhouette, two or three colours, no fine detail.
- **Size**: busy styles (pixel, painterly) get heavy fast. The limits in `format.md` are hard; aim for banner <= 120 KB.
