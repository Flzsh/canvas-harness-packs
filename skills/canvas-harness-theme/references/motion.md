# Motion in a theme

A theme is on screen for hours. Motion should feel like weather, not like an ad.

- **Where:** background and banner only. Frames and icons may have one small detail that moves now and then.
- **How fast:** slow. Drifting clouds 30-90 s across, water and stars twinkling softly, a lamp flickering twice a
  minute. Nothing faster than a slow blink; nothing that flashes (no full-picture changes more than 3 times a second).
- **Seamless loops:** a video's last frame must flow into its first; an SVG's animations must return to their start
  and divide one cycle evenly (`svg-animation.md`, "One clock").
- **Still copies:** every moving part needs a `still`: a frame of the video (or a separate painting) as an image, or
  for an animated SVG simply the picture with animation removed (CH makes that copy itself, so the SVG's rest state
  must be complete). Reduced motion, background tabs and paused animation show the still.

## Video
- 1280-1920 px wide, 24-30 fps, H.264 MP4 or VP9 WebM, no sound track, ideally under 8 MB.
- Make the loop: crossfade the last second into the first, or render a mathematically periodic animation.
- Example with ffmpeg: `ffmpeg -i in.mp4 -an -vf "scale=1600:-2,fps=30" -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart night.mp4`
  and a still: `ffmpeg -i night.mp4 -frames:v 1 -q:v 3 night.jpg`.

## Animated SVG
- Animate `transform` and `opacity`; keep animated elements under about 40 in a background.
- Move a few small things over a still large picture. Never animate a filter or a big gradient.
