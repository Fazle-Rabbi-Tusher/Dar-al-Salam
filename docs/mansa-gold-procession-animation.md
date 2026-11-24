# Mansa Musa — animated gold procession

The owner's latest mounted procession reference is rendered as a **20-second
looping pixel-art illustration**. This scene uses its crowned, gold-robed
costume; the main world's existing white-turbaned character and articulated GLB
library are unchanged.

## Included motion and artwork

- Twelve individually drawn horse-and-rider walking poses, registered by the
  head anchor and planted hoof baseline. All twelve are retained in playback.
- A generated background plate preserving the elephant and howdah, camels,
  attendants, gold chests and bowls around the central rider. Those background
  figures are painted scenery, rather than independently rigged actors.
- A restrained tracking move, ground shadow, drifting dust and gold glints.
  Foreground crop masks keep the chests and near gold bearer in front of the
  moving horse. Pixel clusters are rasterized once and moved at whole pixels.
- A pure 12 Hz, 240-tick animation state. The one-second walking cycle repeats
  twenty times within the 20-second master loop; dust and camera motion also
  join at the loop boundary. There is no attributed voice or soundtrack.

This is layered raster animation with three-dimensional shading. It does not
supply a new mesh, a rotatable camera or main-world integration. The earlier
rotatable 3D component remains in `web/public/models/mali-caravan/`.

## Watch and reuse

`mansa-gold-procession-animation.mp4` is 1080 × 1080, H.264, 24 fps, 480 frames.
The looping GIF is a small 256 × 256, 12 fps preview, retaining all twelve poses.
Open the MP4 directly, or serve the extracted ZIP with
`python3 -m http.server 8130` and open `http://localhost:8130/index.html`.
The self-contained HTML player supports play, pause and timeline scrubbing;
reduced-motion preferences start playback paused. It has no CDN dependencies.

`scene.js` exports `stateAt(frame)` and `createProcession(canvas, assets)`.
Load `manifest.json`, its two local images and pass
`{ background, rider, manifest }` to the renderer. Use `setFrame(frame)` to
control it. The manifest records every source rectangle and anchor.

The original PNGs and their SHA-256 inventory are retained under
`art/sprites/source/gold-procession-animation/`. Technical import removes the
generated pale alpha matte and neutral lower-leg gap pixels while preserving
subject RGB samples. No face or costume is procedurally repainted.

The included preparation and capture scripts use the repository's paths and
Node dependencies (`sharp` and `@playwright/test`); run them from a repository
checkout. `tools/prepare-gold-procession.mjs` rebuilds the runtime WebPs and
manifest. Serve the scene folder on port 8130, then run
`node tools/capture-gold-procession.mjs` to capture and encode the loop with
Chromium and FFmpeg. `tools/package-gold-procession.mjs` creates the ZIP and
checks every archived file against its staged SHA-256 checksum, enforcing
the strict 30,000,000-byte limit. `SHA256SUMS` also accompanies the ZIP contents.

## Verification and review

Unit tests check finite deterministic state, exact 240-tick wrapping, all twelve
distinct source cels, transparent corners and ground registration. Browser
checks exercise the actual rendered loop, all twelve distinct poses, play,
pause, scrubbing, reduced-motion startup and the mobile layout. The capture
script records 480 frames and rejects browser errors or missing poses. FFmpeg
can decode the entire video and GIF; archive validation reads every entry.

This is an illustrative reconstruction from the supplied art reference.
Existing approval fields and historical biography review remain drafts. No
generated Arabic or sacred text, new biographical claims or speech are added.
