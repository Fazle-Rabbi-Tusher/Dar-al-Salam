# Animation and repository integration

Read the current implementation before relying on these recorded conventions.
Relevant repository files are `packages/shared/schema.ts`, `script.ts`,
`clock.ts`, `motion.ts`, `tools/build/index.ts`, and `web/src/engine/Engine.ts`.

## Existing asset format

- Named card: `content/characters/<id>.json`.
- Full body: `art/sprites/<id>.png`, with a rear still when needed.
- Action strip: `art/sprites/anim/<id>__<action>_<SE|NE>.png`.
- Cell size: 224 x 336 pixels; ground anchor: (112, 320); density: 4.
- SE is the front three-quarter source, nose/toes pointing screen-right.
  NE is the rear three-quarter source, facing away toward screen-up-right.
  Inspect generated art to confirm orientation before assigning filenames.
- The current renderer mirrors SE for SW and NE for NW. For requests requiring
  eight independently drawn directions, deliver and identify those views
  explicitly; four mirrored runtime facings are not eight independent drawings.
- Fallback drawn actions have fixed `ACTIONS` counts. Supplied strips can have
  longer sequences when the importer retains their actual frame count.

The Al-Khwarizmi pack at `scene-packs/al-khwarizmi-study/` demonstrates preserving
eight-frame read/write/teach strips, six-frame walks, four-frame idle, optional
`smoothMotion`, and `smoothstep` path easing. It includes a scoped runtime patch.
The Menk pack at `scene-packs/menk-speech/` demonstrates seated audience strips
and recording-camera animation. Inspect these files if present; do not assume
these packs have already been merged into another checkout.

## Plan a natural sequence

1. Establish a canonical model and match it across front/rear views.
2. Author a contiguous routine that returns to its starting position and state.
3. Use task-appropriate motion: fingers lift and settle a page; quill strokes
   come from wrist/elbow; the head nods slightly; a blink is brief; walking
   alternates support legs with restrained robe movement.
4. Keep stationary feet planted and preserve body size through gestures.
   Register against the shoes so an extending arm cannot slide the torso.
5. Use eased paths where supported. Check peak speed as well as average speed;
   smoothstep can peak at 1.5 times average path speed.
6. Compare all path samples against actual blocked tiles/object footprints.
   A formerly stationary character may begin inside a blocked workstation tile.
7. Keep fixed geometry fixed: chair legs, tripod supports, desks, and platforms.
   Cameras may pan their heads and aim at the subject; audiences remain seated
   when the user requests seated listeners.

Use only supported actions or add the required integration explicitly. New
actions may also require corresponding fallback head poses; regenerate or
extend only the requested character's fallback assets, preserving originals.

## Preserve deterministic simulation

The project uses 12 ticks per second and a 240-tick master loop. Scene evaluation
uses the supplied frame, not random numbers or wall-clock time. Author varied
crowds once and keep their identities/positions fixed at runtime.

Rendering can interpolate positions between fixed ticks without advancing
simulation logic. Pause must freeze elapsed render position too. Prefer coherent
extra drawn poses over large procedural stretching or ghosted crossfades.

## Validate the actual result

- Check named/ambient IDs, names, aliases, and retained approval fields.
- Validate native schemas, contiguous scripts, loop closure, collisions, and speed.
- Check alpha, dimensions, foot anchors, scale, and complete silhouettes.
- Inspect the built manifest for every supplied frame, including late poses.
- Ensure culling/hit envelopes cover longer sequences and extended hands.
- Verify front/rear views, movement between ticks, and pause in the native
  renderer. Keep a real integration screenshot when useful.
- Capture an actual animated preview from the scene code. Use standard video
  encoding for MP4/GIF; do not present a source-sheet slideshow as a moving scene.
- Run checks appropriate to changed code and preserve unrelated existing work.

Use a local HTTP server for portable HTML previews. Managed browsers can block
`file://` access; do not bypass that policy. Document a tested server command,
such as `python3 -m http.server 8000`, instead of claiming untested offline access.
