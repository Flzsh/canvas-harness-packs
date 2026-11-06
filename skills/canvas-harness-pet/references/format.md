# The .chpet file

One UTF-8 JSON file, at most 40 MB (a pet is usually a few hundred KB at most). Unknown fields are errors. Write
`pet.json` with file names in `assets`; `scripts/make-pack.cjs` fills in the data and hashes.

```json
{
  "format": "chpet",
  "version": 1,
  "name": "Moth",
  "by": "Ada",
  "size": [72, 64],
  "ground": 60,
  "faces": "right",
  "poses": { "stand": "stand", "walk": "walk", "sleep": "sleep", "read": "read", "cheer": "cheer" },
  "assets": { "stand": "stand.svg", "walk": "walk.svg", "sleep": "sleep.svg", "read": "read.svg", "cheer": "cheer.svg" }
}
```

## Fields
- `format` `"chpet"`, `version` `1`, `name` 1-40 characters (shown in Make it yours, and the companion goes by it while
  the pet is in use: "Ask Moth"), `by` optional, at most 60.
- `size` `[width, height]`, whole numbers 32-128: the box every pose is drawn in, in CSS pixels on screen at the Medium
  size. The student's Size choice (Make it yours -> Companion) draws it about 0.8x (Small) or 1.3x (Large), and a small
  window about 0.7x.
- `ground` a whole number from 0 to the height: where the feet touch, measured from the top of the box.
- `faces` `right` | `left`: the direction your drawings look. When Biscuit faces the other way CH mirrors the picture
  horizontally (so draw nothing that must not be mirrored, such as words).
- `poses`: pose name -> asset id. Required `stand`, `walk`, `sleep`; optional `trot`, `lie`, `read`, `eat`, `cheer`,
  `flag`, `fall`, `held`. Several poses may use the same asset.
- `assets`: id -> `{ "type", "data" (base64), "sha256" }` once packed; every asset must be used.

## Picture types
| Type | Notes |
|---|---|
| `image/svg+xml` | the best choice: sharp at any size, its own CSS or SMIL animation (a walk cycle, breathing, a wagging tail). Must pass Canvas Harness's artwork rules; at most 256 KiB each. The SVG's `viewBox` should have the same aspect ratio as `size`. |
| `image/png`, `image/webp` | for painted or pixel pets. Draw at 2x `size` (or an exact multiple for pixel art) so it stays crisp; at most 4x `size` each way and 2 MiB each. |
| `image/gif`, animated WebP or PNG | a frame-by-frame animation. When the pet is shown still (below) CH shows the `stand` pose instead (its first frame if `stand` moves too). |

JPEG and AVIF pictures are refused for pets.

## How CH shows it
- As an isolated `<img>` of the pose's picture, at `size` (times the Size choice), with its `ground` line on the
  surface Biscuit stands on.
- CH moves the whole picture (walking across the page, jumping, falling) and switches poses; your art moves only inside
  itself. While it is dragged, CH holds the box by its middle, under the pointer.
- Shown still with reduced motion, with Motion set to Fades only or Off (Make it yours -> Look), while Biscuit's menu is
  open and in a hidden tab: SVG animations are removed (so each pose's rest state must be complete) and animated
  rasters show `stand`.
- Light and dark pages: the pet is drawn over both; give it an outline or colours that read on `#FAF9F5` and `#262624`.
