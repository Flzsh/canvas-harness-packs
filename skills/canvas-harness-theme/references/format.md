# The .chtheme file

One UTF-8 JSON file, at most 40 MB. Every field below is checked; an unknown field is an error, so spell them exactly.
Write `theme.json` with file names in `assets` and let `scripts/make-pack.cjs` fill in the data and hashes. Fields
marked (3.9) are read by 3.9.3 and 4.0 Preview 6; older versions may refuse them.

```json
{
  "format": "chtheme",
  "version": 1,
  "name": "Moonlit greenhouse",
  "by": "Ada",
  "colors": {
    "light": { "bg": "#EEF3EC", "surface": "#FBFDF9", "ink": "#16221B", "muted": "#4E5F55", "line": "#C9D6CC", "accent": "#2F7D5B" },
    "dark":  { "bg": "#0E1A15", "surface": "#16251E", "ink": "#E6F2EA", "muted": "#A8BFB1", "line": "#2E4339", "accent": "#7FD6A8" }
  },
  "background": { "asset": "night", "still": "night-still", "fit": "cover", "position": "top" },
  "banner": { "asset": "glasshouse", "fit": "contain", "position": "right" },
  "frames": {
    "panel": { "asset": "pane", "slice": [28, 28, 28, 28] },
    "card": { "asset": "pane-small", "slice": [18, 18, 18, 18] }
  },
  "title": { "asset": "font", "family": "Greenhouse Serif", "weight": 700, "license": "OFL-1.1" },
  "icons": ["moth", "fern", "lamp"],
  "assets": {
    "night": "night.mp4", "night-still": "night.jpg", "glasshouse": "banner.svg",
    "pane": "pane.svg", "pane-small": "pane-small.svg", "font": "GreenhouseSerif-Bold.woff2",
    "moth": "moth.svg", "fern": "fern.svg", "lamp": "lamp.svg"
  }
}
```

## Fields
- `format` `"chtheme"`, `version` `1`, `name` (1-40 characters), `by` (optional, at most 60).
- `colors` (required): `light`, `dark`, or both. With both, the theme follows the student's light/dark choice; with one,
  that one is always used. Each has `bg`, `surface`, `ink`, `muted`, `line`, `accent`, all `#RRGGBB`. Contrast rules
  are in `colors.md`.
- `background` (optional): `asset`; `still`, the id of a picture that does not move (required when `asset` is a video,
  a GIF, an animated WebP or PNG, or an animated SVG); `fit` `cover` | `contain` | `tile`; `position` `top` | `center`
  | `bottom`. Left out, `fit` is `cover` and `position` `center`.
- `banner` (optional): `asset`, `still` (same rule), `fit` `contain` | `cover`, `position` `left` | `center` | `right`
  (left out: `cover`, `center`), and (3.9) `height` `small` | `medium` | `tall`: 90, 140 or 220 px.
- (3.9) Both may also take `focus` `{ "x", "y" }`, each 0-1 (the point of the picture kept in view when it is cropped),
  and `zoom` 1-4. For a video, `loop` `{ "start", "end" }` in seconds picks the part that plays (0.05-60 s, inside the
  video), and `still` may be a time in seconds instead (the moment of the video its still picture shows), with that
  picture given as `stillAsset`.
- `frames` (optional): `panel` and/or `card`, each `asset` (an SVG) and `slice` `[top, right, bottom, left]` in the
  SVG's own units (how the frame stretches: `parts.md`). `top + bottom` must fit in the `viewBox` height and
  `left + right` in its width.
- `title` (optional): `asset` (WOFF2), `family` (the font's name, shown when the theme is reviewed; 1-40 characters),
  `weight` 100-900, and `license`: `OFL-1.1`, `Apache-2.0` or `CC0-1.0`. Fonts under any other licence are refused.
- `icons` (optional): up to 6 asset ids: SVG (it may move) or a still PNG, WebP, JPEG or AVIF. No GIFs, nothing raster
  that moves.
- `assets`: id -> `{ "type", "data" (base64), "sha256" }` once packed. Ids are letters, digits, `-` and `_`. Every id
  used above must exist, and every asset must be used.

## File types and limits
| Type | Used for | Advice |
|---|---|---|
| `image/svg+xml` | anything | must pass Canvas Harness's artwork rules (below); at most 256 KiB each, 2 MiB for all SVGs together |
| `image/png`, `image/webp`, `image/jpeg`, `image/avif` (3.9) | background, banner, stills, icons | background about 1920 x 1080; WebP, JPEG or AVIF for photos; AVIF must be a still |
| `image/gif` | background, banner | needs a `still`; prefer video, GIFs are heavy. A moving GIF or WebP must be at most 3 MB and 2400 x 1600 |
| `video/mp4`, `video/webm` | background, banner | needs a `still`; at most 1920 px wide, 30 MB and 60 s (a longer clip needs a `loop` of at most 60 s); aim for 1280-1920 wide, 24-30 fps, a seamless loop, under 8 MB |
| `font/woff2` | title | one weight; at most 2 MB |

The whole file is at most 40 MB.

## SVG rules (the same as Canvas Harness course art)
Every SVG is shown as an isolated image: no scripts, no `<image>`, no `foreignObject`, no outside references (only
`url(#localId)`), no `data-*` or event attributes, no `var()`, CSS only inside `<style>` with the allowed properties,
animation through CSS keyframes or SMIL. The still copy (all animation removed) must be complete. The full list of
allowed elements, attributes and CSS is the same as for course art: see
`svg-rules.md`.

## What the checker refuses
Unknown or misspelt fields, missing required parts, a wrong hash or size, an unknown file type, an SVG the artwork
validator refuses, a moving background or banner without a still picture (or with a still that moves), a still time or
`loop` on anything but a video or past its end, a video too wide or too long, slices that do not fit the frame, a
moving raster icon, a font without an accepted licence, colours that fail the contrast rules, unused or missing assets,
a file over 40 MB. Canvas Harness checks again when the file is added and decodes every picture and video then, so the
size limit for moving GIFs and WebPs is only checked there.
