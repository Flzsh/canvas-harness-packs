# Motion in a theme

A theme is on screen for hours. Motion should feel like weather, not like an ad.

- **Where:** background and banner. An SVG icon may have one small detail that moves now and then; frames never move
  (CH draws them from their still copy).
- **How fast:** slow. Drifting clouds 30-90 s across, water and stars twinkling softly, a lamp flickering twice a
  minute. Nothing faster than a slow blink; nothing that flashes (no full-picture changes more than 3 times a second).
- **Seamless loops:** a video's last frame must flow into its first; an SVG's animations must return to their start
  and divide one cycle evenly (`svg-animation.md`, "One clock").
- **Still copies:** a moving background or banner needs its own `still`, a picture that does not move: a frame of the
  video (or a separate painting) as an image, or for an animated SVG a copy of the SVG with the animation taken out.
  A moving SVG icon needs none: CH makes its still copy itself, so its rest state must be complete.
- **When the still shows:** with reduced motion, with Motion set to Fades only or Off (Make it yours -> Look), in a
  hidden tab, when the art is scrolled out of view, and after 30 s to 2 min without input (sooner at lower Graphics
  settings or on battery). The still is seen often: make it as good as the moving version.

## Video
- 1280-1920 px wide (1920 at most), 24-30 fps, H.264 MP4 or VP9 WebM, no sound track (CH plays it muted), ideally
  under 8 MB (30 MB at most).
- At most 60 s. From a longer clip, `loop` picks the part that plays (up to 60 s).
- Make the loop: crossfade the last second into the first, or render a mathematically periodic animation.
- Example with ffmpeg: `ffmpeg -i in.mp4 -an -vf "scale=1600:-2,fps=30" -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart night.mp4`
  and a still: `ffmpeg -i night.mp4 -frames:v 1 -q:v 3 night.jpg`.

## Animated SVG
- Animate `transform` and `opacity`; keep animated elements under about 40 in a background.
- Move a few small things over a still large picture. Never animate a filter or a big gradient.
