# The .chtheme file

One UTF-8 JSON file, at most 40 MB. Every field below is checked; an unknown field is an error, so spell them exactly.
Write `theme.json` with file names in `assets` and let `scripts/make-pack.cjs` fill in the data and hashes.

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
- `background` (optional): `asset`; `still` (required when `asset` is a video, an animated SVG or a GIF);
  `fit` `cover` | `contain` | `tile`; `position` `top` | `center` | `bottom`.
- `banner` (optional): `asset`, optional `still` (same rule), `fit` `contain` | `cover`, `position` `left` | `center` |
  `right`.
- `frames` (optional): `panel` and/or `card`, each `asset` (an SVG) and `slice` `[top, right, bottom, left]` in the
  SVG's own units (how the frame stretches: `parts.md`).
- `title` (optional): `asset` (WOFF2), `family` (the name CSS will use, 1-40 characters), `weight` 100-900, and
  `license`: `OFL-1.1`, `Apache-2.0` or `CC0-1.0`. Fonts under any other licence are refused.
- `icons` (optional): up to 6 asset ids.
- `assets`: id -> `{ "type", "data" (base64), "sha256" }` once packed. Ids are letters, digits, `-` and `_`. Every id
  used above must exist, and every asset must be used.

## File types and limits
| Type | Used for | Advice |
|---|---|---|
| `image/svg+xml` | anything | must pass Canvas Harness's artwork rules (below); at most 256 KiB each |
| `image/png`, `image/webp`, `image/jpeg` | background, banner, icons | background about 1920 x 1080; WebP or JPEG for photos |
| `image/gif` | background, banner | needs a `still`; prefer video, GIFs are heavy |
| `video/mp4`, `video/webm` | background, banner | needs a `still`; 1280-1920 wide, 24-30 fps, a seamless loop, ideally under 8 MB |
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
validator refuses, a video/GIF/animated SVG without `still`, a font without an accepted licence, colours that fail the
contrast rules, unused or missing assets, a file over 40 MB.
