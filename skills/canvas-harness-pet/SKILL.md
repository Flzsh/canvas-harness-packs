---
name: canvas-harness-pet
description: Make a companion of your own for Canvas Harness - any creature, object or character in any art style - drawn as a set of poses (stand, walk, sleep and more) and packed as one .chpet file that replaces the pony while keeping Biscuit's brain, menu, timer and reminders. Use when someone wants their own Canvas Harness pet, a custom companion, "a cat instead of the pony", a pixel pet, or any mascot that walks around the dashboard.
---

# A Canvas Harness pet of your own

**Works with:** Canvas Harness 3.4.0 and later (3.4.0 added .chpet files). Checked against 3.9.3, the current release (the Chrome Web Store has 3.9), and 4.0 Preview 6, which read a pet the same way; `scripts/check.cjs` is 3.9.3's own validator. Pets need the Appearance editor and the Pony companion: both on in Full (the default), switches in Custom, left out of Lite. Sample: `examples/maple/` (Maple, a pixel red panda).

Canvas Harness has a companion, Biscuit, who walks along the dashboard, rests on things, sleeps when you are away,
reads while your focus timer runs and cheers when you finish work. By default Biscuit is a small pony. This skill makes
a different body for Biscuit: a cat, a moth, a robot, a cactus, a pixel dragon, a teacup with legs, anything the student
can imagine, in their own style. Biscuit's brain stays the same (the Ask line, reminders, the focus timer, what it says);
only the drawing and the name change: while the pet is in use, the companion goes by the pet's `name` ("Ask Moth").

## What a pet is made of

A set of **poses**, each one picture (with its own little animation inside if you like), plus a few numbers:

| Field | Meaning |
|---|---|
| `size` | the drawing's box in pixels at the Medium size, `[width, height]`, each 32-128 |
| `ground` | the y (inside the box) where the feet touch the ground |
| `faces` | which way the art looks: `right` or `left`; CH mirrors it when it faces the other way |
| `poses` | which picture to show for each pose |

| Pose | Required | When Biscuit shows it |
|---|---|---|
| `stand` | yes | idle, waiting, listening while the menu is open |
| `walk` | yes | moving to a new spot |
| `sleep` | yes | when nobody has used the page for about 25 seconds, or late at night |
| `trot` | no (uses walk) | moving a long way quickly |
| `lie` | no (uses sleep) | resting between walks, and just after waking |
| `read` | no (uses stand) | while the focus timer runs |
| `eat` | no (uses stand) | eating a treat the student gives it |
| `cheer` | no (uses stand) | after a piece of work is ticked off, after a treat, sometimes when nothing is left to do |
| `flag` | no (uses stand) | something is due soon and Biscuit wants your attention (unless Reminders is None) |
| `fall` | no (uses stand) | in the air: jumping to another place, or dropped after being dragged |
| `held` | no (uses stand) | while the student drags Biscuit with the pointer |

Everything travels as **one `.chpet` file** (`references/format.md`). The student adds it in Canvas Harness: **Make it
yours -> More -> Add from a file**, looks at the poses and presses **Apply**. The pet is then listed by name in **Make it
yours -> Companion** with Preview, Use and Remove; Remove brings the pony back.

## Read before drawing

| Reference | When |
|---|---|
| `references/format.md` | Always. The file, the fields, the limits. |
| `references/poses.md` | Always. How to draw each pose so it reads, lines up and moves well. |
| `references/your-style.md` | For turning the student's taste into a style sheet (skip its last part: it is about course art). |
| `references/svg-rules.md` | The SVG rules (the same for pets). |

## Workflow

1. **Ask (one message):** what the pet is, its personality (sleepy, bouncy, proud), the style (words, a game or artist
   they like, a sketch), its colours, its name. Default: a small friendly creature that suits the student's dashboard.
2. **Style sheet + model sheet:** palette, line, shapes, texture, motion; then the pet's proportions, the size of its
   box and where its feet are. Every pose uses the same box, the same scale and the same ground line.
3. **Draw `stand` first**, then `walk` and `sleep`, then any optional poses that add character (`cheer` and `read`
   are the ones students notice most; `lie` too, or the pet looks asleep whenever it rests).
4. **Write `pet.json`** in the folder (assets as file names) and pack: `node scripts/make-pack.cjs <folder>`.
5. **Check until clean:** `node scripts/check.cjs <folder>.chpet --preview preview.html` runs Canvas Harness's own
   validator and shows all eleven poses at real size, moving and still, marking the ones that fall back to another.
   Fix every problem. The preview draws no ground line and no mirrored copy, so check those yourself: the feet sit on
   `ground` in every pose, and nothing reads wrong when flipped.
6. **Hand over** the `.chpet` file: "Canvas Harness -> Make it yours -> More -> Add from a file, then Apply. Remove it
   under Make it yours -> Companion to get the pony back."

## Rules that do not bend
- Same box, same scale, same ground line in every pose: otherwise the pet jumps when it changes pose.
- Poses are pictures only: SVG (with its own animation) or PNG/WebP/GIF. No scripts, nothing from outside, and the SVG
  rules of Canvas Harness artwork apply.
- Small and calm: it lives beside the student's work all day. No flashing; gentle loops; sleep is still.
- **Original work only**: no copyrighted characters, mascots or logos, even redrawn. Inspired-by is fine.
