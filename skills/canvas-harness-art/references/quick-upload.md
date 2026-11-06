# Handing the art over: the quick upload pack

Canvas Harness users do not edit the extension's files, and uploading one SVG at a time into the right course and the
right slot is slow and easy to get wrong. So the art is handed over as **one pack**: plain text that carries every
SVG together with a line saying where it goes. The user gives it to **Quick Upload** in Canvas Harness once.

This workflow is in Canvas Harness 3.9 and the 4.0 previews, under **Make it yours -> Courses -> Quick Upload**
(part of Full, the default set of features; Lite leaves course artwork out). Pack format version 1 supports
`banner`, `icon` and `frame` (or `border`); it has no separate `title` slot. Draw the lettered title inside the
banner SVG.

There are two ways to deliver the same pack. They do exactly the same thing.

| Way | When | What the user does |
|---|---|---|
| **Paste** (the default) | Always, unless the user asks for a file. | Copies the pack from your answer, pastes it into Quick Upload. |
| **File** | The user asks for a file, or you can write files and the pack is long. | Adds `something.chpack` with **Add from a file** (Make it yours -> More), then reviews it in Quick Upload. |

A pack changes only what it names. One banner, or the banner, icon and frame of seven courses: both are one pack.

## Reviewing and applying

1. Open **Make it yours -> Courses -> Quick Upload**, expand **Or paste a pack**, paste the complete pack and choose
   **Review pack**. A `.chpack` file goes in through **Make it yours -> More -> Add from a file** instead (choose it,
   or drop it on that section); its review then waits under Courses -> Quick Upload.
2. Review the previews, warnings, slots, course matches and existing artwork each piece will replace ("Replaces
   current artwork"). Each course target has an **Apply to** list: when it is unmatched or ambiguous, choose its
   course. Untick unwanted pieces or whole targets.
3. Choose **Apply** (it counts the pieces: **Apply 3 pieces**). Invalid, excluded and unresolved pieces are left out;
   accepted pieces are saved together ("Artwork applied"), with a list of what was not applied. A storage or
   artwork-budget failure leaves the artwork unchanged.
4. **Undo last pack** restores the most recent successful pack until the page is reloaded. Undo refuses to overwrite
   affected artwork or banner options that have changed since that pack; unrelated settings survive.
5. Then, under **Course artwork** below Quick Upload, choose the course and set **Course title** to **In banner**: the
   name is already lettered into the banner. Later, **Use default** on a slot removes one piece and **Reset this
   course's artwork** removes them all.

## Writing a pack

```
<?ch-pack version="1" name="Marine Biology"?>

<?ch-art course="Marine Biology" slot="banner"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1680 240">...the whole banner...</svg>

<?ch-art course="Marine Biology" slot="icon"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">...the whole icon...</svg>

<?ch-art course="Marine Biology" slot="frame"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 110">...the whole border...</svg>

<?ch-end parts="3"?>
```

1. **First line:** `<?ch-pack version="1" name="..."?>`. The name is what the user sees in the review; keep it short.
2. **One `<?ch-art ...?>` line before each SVG,** then the SVG itself, complete and unchanged, starting at `<svg`
   and ending at `</svg>`. No XML declaration, nothing escaped, nothing shortened with "...".
3. **Last line:** `<?ch-end parts="N"?>` with the number of pieces. It is how Quick upload knows nothing was cut off.

### The `ch-art` line

| Write | Meaning |
|---|---|
| `slot="banner"` | The banner (with the lettered course name inside it). |
| `slot="icon"` | The course icon. |
| `slot="frame"` | The sidebar border, the slot Canvas Harness calls Frame. (This is the file the rest of this skill calls the border.) |
| `course="Marine Biology"` | Which course. Use the name **as the user sees it in Canvas**; ask if you are not sure. |
| `course="AP Biology\|AP Bio"` | Several names the course might go by, separated by `\|`. |
| `course-id="48213"` | Only if the user gave you the number from the course's address (`/courses/48213`). It can sit beside `course`. |
| `place="overview"` | The All courses page, instead of a course. |
| `place="every-course"` | Every course the user has (one frame for all of them, for example), instead of a course. |
| `fit="cover"` `position="center"` | Banner only, optional: `fit` is `contain` or `cover`, `position` is `left`, `center` or `right`. Banners in this skill are composed for contain and right, which is what Canvas Harness uses when nothing is said, so leave both out unless you composed the banner for something else. |

Every piece needs a `slot` and exactly one of `course` (or `course-id`) and `place`.

Quick upload finds the course by its name, ignoring capitals and punctuation, and shows the user what it matched
before anything changes. If the name fits no course or more than one, it asks them to choose. So a sensible name is
enough; you do not need the course's number.

If a name contains `"`, `&`, `<` or `>`, write `&quot;`, `&amp;`, `&lt;`, `&gt;`.

### More than one course

Put the pieces one after another, each with its own `course`. A pack may set something for `every-course` and
something different for one course: the named course wins.

```
<?ch-pack version="1" name="Autumn term"?>
<?ch-art place="every-course" slot="frame"?>
<svg ...>...</svg>
<?ch-art course="AP Biology|AP Bio" slot="banner"?>
<svg ...>...</svg>
<?ch-art course="Music Theory" slot="banner"?>
<svg ...>...</svg>
<?ch-end parts="3"?>
```

## Delivering by paste (the default)

- Put the whole pack in **one code block**, with nothing else inside the block. Outside a code block a chat
  application eats the angle brackets and the pack is lost.
- Above the block, one line: *"Copy this whole block. In Canvas Harness open Make it yours -> Courses -> Quick Upload
  -> Or paste a pack, paste it and choose Review pack. It shows you what it is about to change before it changes
  anything."*
- **A pack must be complete in one message.** If the art is too long for one answer, send several packs, each
  whole (its own first line, its own end line), for example one for the banner and one for the icon and frame, or
  one per course. The user pastes each; they add up. Never split one SVG across messages, and never send a pack
  without its end line.
- Keep the SVG lean so it fits: one decimal place, no comments, no indentation (see `format.md`).

## Delivering as a file

Write the same text to `<name>.chpack` (UTF-8). If you can run code, let the script build and check it:

```sh
node scripts/pack.cjs --course "Marine Biology" marine/                     # one course, the three files in a folder
node scripts/pack.cjs --course "AP Biology|AP Bio" bio/ --course "Music Theory" music/ --overview home/
node scripts/pack.cjs --every-course frame.svg --name "Blue frames"
node scripts/pack.cjs --check marine/marine-biology.chpack                  # read it back the way the extension will
```

The script takes the slot from each file's name (`...-banner.svg`, `...-icon.svg`, `...-border.svg` or
`...-frame.svg`), validates every SVG first, and refuses to pack one the uploader would refuse. `--print` also
writes the pack text to the terminal so you can paste it into your answer.

## If Quick Upload is not there

Quick Upload is part of Full, the default set of features; Lite leaves course artwork out. Ask the user to choose
Full under Features in the Canvas Harness popup (in Custom: switch on Course artwork and the artwork packs). If they
keep the packs off, the same pack still works by hand: each `<svg>...</svg>` in it is one piece. In **Make it yours ->
Courses -> Course artwork**, choose the course, open **Paste SVG** under the slot named on the line above that SVG,
paste just that SVG, and press **Apply SVG**. An icon or border added this way is the same as from a pack; a banner
is framed to fill the heading and shown without its animation. (With the script: `node scripts/pack.cjs --unpack
file.chpack` writes the pieces back out as separate `.svg` files to upload.)

## Before you send a pack

- The first line is `<?ch-pack version="1" ...?>` and the last is `<?ch-end parts="N"?>` with the right N.
- Every SVG has its own `<?ch-art ...?>` line directly before it, with a `slot` and one target.
- Each directive stays within 2,048 characters between its kind and `?>`, after escaping attribute values.
- Every SVG is whole and would pass section A of the checklist on its own.
- The course names are the ones the user gave you, spelled the way Canvas shows them.
- No teacher's name, school name or other private detail has slipped into a name or into the art.
