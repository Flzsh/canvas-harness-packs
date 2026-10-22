# Drawing the poses

## One model, every pose
Fix the pet before drawing poses: the box (`size`), the ground line (`ground`), the height of the body, where the eyes
are. Draw every pose on that same box and scale, feet (or base) on the ground line. Overlay `stand` on each new pose
while drawing: the body should not grow, shrink or float.

Leave a little room in the box for movement (a tail swish, ears up when cheering): about 10% each side.

## Each pose
- **stand**: the pet's character at rest; the picture students see most. A small idle loop is welcome (a blink every
  few seconds, a slow tail), nothing busy.
- **walk**: a loop of one or two steps in place (CH moves the picture across the page). Make the loop seamless and
  about 0.5-0.8 s per step; feet that touch the ground should land on the ground line. Things without legs can hop,
  roll, waddle or float, as long as the motion says "going somewhere".
- **trot**: a quicker version of walk for long trips (shorter cycle, bigger motion). Without it CH uses walk.
- **sleep**: eyes closed, curled or slumped, very still; at most slow breathing (a 3-4 s rise and fall of a few units).
- **lie**: resting but awake; between stand and sleep.
- **read**: busy with something quiet while the student focuses: a book, a screen, knitting, a tiny telescope.
- **eat**: a short snack loop.
- **cheer**: the pet is happy for the student: a jump, raised arms or ears, sparkles close to the body.
- **flag**: wants attention, politely: waves something, raises a little sign or a light.
- **fall**: being dropped: limbs up, surprised; CH moves it down, you just draw the pose.
- **held**: being dragged by the pointer: dangling from the top of the box (CH holds it there).

## Motion inside a pose
- Animate with CSS `@keyframes` (transform, opacity) or SMIL, one cycle per pose, seamless.
- Rotate limbs around their joints (`transform-origin` at the joint) rather than redrawing them.
- The rest state (animation removed) must be the complete pose: that is what reduced motion shows.
- Keep it small: a pet is about 40-120 px on screen. Details under 2 px vanish.

## Mirroring
CH mirrors the picture when walking against `faces`. Anything asymmetric that should not flip (a word, a number on a
shirt) will read backwards: leave it out.
