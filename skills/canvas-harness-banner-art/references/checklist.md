# Before handing over

## Works in Canvas Harness
- [ ] `node scripts/check.cjs <folder> --out preview.html` shows no REFUSED piece.
- [ ] Every note from the checker is either fixed or understood (and you can say why it is fine).
- [ ] Banner `0 0 1680 240`, frame `0 0 360 110`, icon `0 0 100 100` (or a deliberate reason for another banner width).
- [ ] The still copy (animation removed) is a complete picture: nothing hidden, nothing half-drawn.
- [ ] Every loop is seamless: values return to their start; durations divide the cycle.
- [ ] Sizes well under the limits; banner about 120 KB or less.

## Looks right
- [ ] Banner, frame and icon follow the same style sheet: palette, line, shapes, texture, motion.
- [ ] Reads on the light page and the dark page (look at both in the preview).
- [ ] The course title area and the row's text and icon areas stay calm (see `slots.md`).
- [ ] The icon reads at 22 px as one clear shape.
- [ ] Motion is where the style sheet says, and nowhere else.

## Fair to share
- [ ] Original: no traced or copied artwork, characters, logos or brand marks.
- [ ] No full names, school logos or ids in the art.

## Hand over
- [ ] One pack (`scripts/pack.cjs`), course name exactly as Canvas shows it.
- [ ] Two lines for the student: where to paste it (Make it yours -> Quick upload) and where to remove it.
