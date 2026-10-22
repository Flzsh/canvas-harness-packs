# Colours

Six colours per mode carry the whole page:

| Key | Used for |
|---|---|
| `bg` | the page itself, where the background picture is thin or absent |
| `surface` | panels, cards, menus: where people read |
| `ink` | text and the main lines |
| `muted` | secondary text: dates, counts, hints |
| `line` | dividers and quiet outlines |
| `accent` | links, the selected tab, highlights, buttons |

## Rules the checker enforces (WCAG contrast)
- `ink` on `bg`: at least 4.5:1. `ink` on `surface`: at least 4.5:1.
- `muted` on `surface`: at least 3:1.
- `accent` on `surface`: at least 3:1 (it marks links and selected things).
- Light mode: `surface` is the lightest or near it; dark mode: the darkest or near it. (Not enforced, but a theme that
  flips this looks broken beside Canvas's own pages.)

Contrast is `(L1 + 0.05) / (L2 + 0.05)` of relative luminances; the checker prints each pair with its ratio and says
which fails.

## Passing the rules in any style
- Pastel or soft looks: keep the pastels for `bg`, `line`, frames and art; make `ink` a deep version of your main hue
  (not grey) and `muted` a mid version.
- Neon on dark: neon for `accent` and art; `ink` near white tinted with the theme hue; `surface` a deep, desaturated
  version of the background.
- Monochrome: vary lightness only; check `muted` carefully, it fails most often.
- Two modes from one idea: keep the hues, swap lightness, and lower saturation in dark mode (saturated colours glow
  on dark surfaces).
