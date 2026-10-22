---
name: canvas-harness-banner-art
description: Make course artwork for Canvas Harness in any style the student wants - a banner across the course heading, a frame for the course's row, and an icon - as self-contained SVG that Canvas Harness accepts, handed over as one quick upload pack. Use when someone asks for Canvas Harness banner art, course header art, a course icon or frame, or "art for my class" in their own style (pixel, watercolour, anime scenery, flat, neon, paper cut, anything).
---

# Canvas Harness course art, in your own style

**Works with:** every Canvas Harness that has Quick upload (in the appearance settings), so it works today.

Canvas Harness is a browser extension that replaces the Canvas LMS dashboard. Each course can carry its own artwork:
a **banner** across the course heading, and a **frame** and an **icon** for the course's row in the sidebar. This skill
makes those pieces in whatever style the student likes. There is no house style here: the student's taste decides the
look, and this skill makes sure the result works inside Canvas Harness.

You write the SVG yourself: by hand for small pieces, or with a small generator script of your own when a picture has
hundreds of shapes. There is no image model in this workflow.

## What you deliver

| Piece | Slot in a pack | Working file | Size |
|---|---|---|---|
| Banner | `banner` | `<course>-banner.svg` | `viewBox="0 0 1680 240"` |
| Frame (around the course's sidebar row) | `frame` | `<course>-frame.svg` | `viewBox="0 0 360 110"` |
| Icon | `icon` | `<course>-icon.svg` | `viewBox="0 0 100 100"` |

You hand them over as **one quick upload pack**: one block of text holding every SVG and saying which course and slot
each is for. The student pastes it into **Quick upload** in Canvas Harness (or saves it as a `.chpack` file and drops
it there) and reviews one list. `references/quick-upload.md` has the exact form; `scripts/pack.cjs` writes it.

## Read before drawing

| Reference | When |
|---|---|
| `references/your-style.md` | Always. Turning the student's taste into a style sheet, and how each style works in SVG. |
| `references/slots.md` | Always. How each piece is shown, its sizes and the areas to keep clear. |
| `references/format.md` | Always. What Canvas Harness accepts and refuses. |
| `references/animation.md` | Before animating. Motion that loops cleanly and stays cheap. |
| `references/quick-upload.md` | Before handing over. The pack the student pastes. |
| `references/checklist.md` | Before handing over. |

## Workflow

### 1. Ask (one short message)
Ask only what you cannot decide yourself; go ahead on sensible defaults if the student does not answer.
1. The course name exactly as Canvas shows it (Quick upload finds the course by it).
2. **Their style**: a few words, an artist or a game or a film whose look they like, a picture they made, colours they
   love or hate. This leads everything. If they have no idea, offer three short directions that fit the course and let
   them pick.
3. What the course is about this term (topics, projects, tools), so the picture belongs to this class.
4. Which pieces (default: all three), moving or still (default: gently moving), light or dark Canvas Harness theme
   (default: works on both).

### 2. Write a style sheet before drawing
Five lines, from `references/your-style.md`: palette (5-8 exact colours), line (none, thin, bold, rough, pixel grid),
shapes (geometric, organic, blocky), texture (flat, layered washes, halftone, grain), motion (what moves, how fast).
Show it to the student in one message if they asked to be involved; otherwise follow it.

### 3. Draw
Plan the banner first (`references/slots.md`, "Planning a banner"), then draw it, then the frame and icon as a pair that
belongs with it. Keep the course name readable if you letter it into the banner.

### 4. Check, and fix until clean
`node scripts/check.cjs <folder> --out preview.html` runs Canvas Harness's own validator (the copy in
`scripts/vendor/custom-art.js`) and writes a preview page: every piece at its real sizes, moving and still, on the
light and the dark page. A refused file will not upload: fix every refusal. Read the notes too and look at the preview
with the student's style sheet beside it.

### 5. Pack and hand over
`node scripts/pack.cjs --course "Exact Course Name" <folder> --out <course>.chpack --print` writes the pack (`--overview`
for the All courses page, `--every-course` for a frame used on every course). Give the student the pack text or file and
two lines: "Canvas Harness -> Make it yours -> Quick upload -> paste (or drop the file) -> Add". Removing it later is in
the same place.

## Rules that do not bend
- Everything in `references/format.md`: one self-contained SVG per piece, no scripts, no `<image>`, no outside
  resources, the size limits. The picture with all animation removed must still be complete.
- **Original work only.** A style can be inspired by anything; the drawing itself is made new. Never trace or copy
  someone's artwork, characters, logos or brand marks, and never reproduce a copyrighted character.
- Readability beats decoration: text and controls sit over and beside the art (see the clear areas in `slots.md`).
- No personal information inside the art if the student might share it: no full names, school logos or student ids.
