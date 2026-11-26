# Mansa Musa and the gold caravan

> **In the world now (owner's request, 2026-11): pixel-art sprites in the desert.**
> The owner asked for Mansa Musa's caravan to match the world's other art and
> to stand on the desert. `tools/prepare-caravan-sprites.ts` renders the same
> articulated rig, tick by tick and one actor at a time, in the world's 2:1
> isometric view at three sprite pixels per world pixel (`tools/caravan/render.html`).
> Since 2026-11-26 it is lit realistically for the desert: a warm sun, a sky and
> sand fill, gold and cloth materials, sand dust on hems and hooves, and soft
> shadows that each figure casts on the sand. Renders are supersampled 2×, the
> full colour range is kept, and the camels and elephant are drawn at the
> world's scale (DECISIONS item 79).
> It is drawn at 0.8 of the rig's own scale so it matches the town (DECISIONS
> item 81), and it roams the desert: after the three handovers on the market
> lane the procession walks a loop beside the oasis, the four gold-bearer
> groups loop over the northern sand, the middle of Massawa and its eastern
> edge, and the elephant circles the northern dunes. Bearers,
> camels and the ruler drop small piles of gold coins as they pass, which fall,
> bounce and twinkle on the sand before they are gathered (DECISIONS item 80).
>
> - **Strips:** each design keeps a small set of its most different poses.
>   Guards of one colour share theirs, and so do the pack camels. The build outlines them like every strip.
> - **Timing:** every figure plays its strip one pose per tick (`tempo: 1`, a 240-step `sequence`).
>   It steps to its sampled place on the route each tick, so gaits, turns and gold handovers keep the rig's timing.
> - **Placement:** the caravan walks the open desert west of Massawa (`CARAVAN` in `royal-caravan.ts`).
>   Its stalls, treasury and travel equipment are planted there with the desert pieces.
>   The fortress, the dead tree and the Bedouin camp (with its three camels) made way for it.
> - **What changed in the world:** the native rig is no longer placed in the world, and there is no sand plot.
>   The GLB exports, the viewer and the components below are unchanged.

The world now contains an articulated 3D Mansa Musa leading a mounted procession
through three gold distribution stops. The **Mansa Musa** shortcut frames its
sandy market route outside the Peace Quarter. Clicking the ruler opens his
unreviewed character card.

The owner's 25 November correction replaces the pointed crown and mostly gold
outfit with the specific portrait: white wrapped turban, single gold brow
medallion, dark skin and black beard, ivory robe, crimson right-shoulder mantle,
left-arm brocade, eight necklaces, five large pendants and a disk-topped staff
held in his right hand. Smooth anatomical geometry, a detailed facial map,
curled beard strands, wrapped fabric, articulated fingers and physical materials
bring the ruler closer to the requested realism. Supporting characters retain
the existing world style. The source sheet is an art reference; preview images
and videos are recorded from the actual exported meshes.
Heads, bodies, garments, hands, equipment and animals have actual volume;
rotating the camera reveals their sides and backs. Adult proportions follow
the owner's tall, natural character refinement.

## Cast and behavior

- One mounted Mansa Musa, twelve guards, four pack camels, three stewards and
  six recipients: 22 human figures and five animals in the complete component.
- The native world now adds four bowl/chest carriers, one banner attendant
  and one receiving elder, bringing its human cast to 28. Their
  individual models, shared chest and gold-sharing animation are in
  `web/public/models/gold-carriers/`; see `docs/gold-carriers-3d.md`. Earlier
  exported caravan GLBs retain their original cast.
- The ruler and stewards share coins and gold pouches at three market stops.
  Hands meet at a shared contact point; ownership changes at contact. Recipients
  approach during the stop and retreat before the procession moves again.
  The ruler passes his staff between hands before the original giving gesture;
  both hands meet at each staff transfer, without an instantaneous staff jump.
- Guards and camels follow the route by accumulated distance, including turns,
  rather than rotating a rigid formation around the horse. Their gaits stop
  with the leader. Planted foot phases compensate for forward travel.
- The 240-tick, 12 Hz simulation repeats after 20 seconds with a continuous
  rear return route. Rendering accepts fractional ticks. The world's Pause
  freezes the same rig used by the native scene.

`packages/shared/royal-caravan.ts` owns the route and deterministic poses;
`packages/shared/mansa-reference.ts` owns the ruler's detailed geometry.
`web/src/engine/RiggedCaravan.ts` uploads articulated joint matrices in bounded
GPU batches. Mesh buffers remain fixed during animation, and all batches use
the world's depth buffer and planet projection. The walkable footprint and its
cleared procedural vegetation are separate from existing authored buildings.

## Reusable files

`web/public/models/mali-caravan/` includes four animated glTF 2.0 binary files:

| Model                     | Contents                                  |      Bytes |
| ------------------------- | ----------------------------------------- | ---------: |
| `mansa-musa-standing.glb` | Standing, walking and giving ruler        |  7,699,072 |
| `mansa-musa-mounted.glb`  | Ruler and animated black horse            |  7,495,816 |
| `mali-guard.glb`          | Marching guard with lance and shield      |    390,140 |
| `mali-gold-caravan.glb`   | Complete procession, market and handovers | 13,036,760 |

The models use meters and carry articulated node animation sampled through
the whole loop. They can be opened in Blender or another glTF application.
`MansaCaravanComponent.js` loads any variant into a Three.js application and
supports the shared frame clock, independent playback, scrubbing and disposal.
The local viewer includes face close-up, front, rear, side, overhead and isometric views,
hero-follow and overview cameras, a timeline, pause and model downloads.
Its MIT-licensed Three.js modules are included locally.

Run the viewer at `/models/mali-caravan/index.html`. For the extracted ZIP,
run `python3 -m http.server 8123` in its directory and open
`http://localhost:8123/index.html`. The ZIP also includes the generated source
artwork, source code and a video recorded from the real GLB and native renderers.
Use `node tools/package-mali-caravan.mjs` to rebuild it; the packer enforces the
owner's strict 30,000,000-byte ceiling and verifies every archived file.

## Review status and sources

The GLBs embed five pixel-art PNG textures with nearest sampling. Smooth normals and separate metal,
skin and fabric properties are preserved without requiring compression plugins.
The viewer uses local softbox reflections to light the gold. Native rendering
uses the same geometry and sampled color maps, with continuous lighting on the
ruler and the existing quantized treatment on his companions.

This is an illustrative reconstruction of the Malian ruler and the giving
associated with his 1324 pilgrimage. The faces, costume, escort size, uniforms,
buildings and three stops are artistic choices. The reference illustrations
are not evidence of an exact historical likeness. No attributed speech,
generated religious writing or invented biography has been added.

The owner's explicit request to depict **Mansa Musa** supplies the scope for
the exact full-name validation exception. The generic given name `Musa` remains
blocked, as do all existing protected identities; no other exception was added.
This does not assert advisory approval: `panelApproved` remains false and the
biography, story and reviewed sources remain placeholders. Reference links on
the card are presented as unreviewed reading links.

Original generated PNGs and checksums are in
`art/sprites/source/mali-caravan/reference-pixel-v3/`. Earlier designs remain
in `source/` and `previous-v1/`. `tools/prepare-mansa-reference.mjs`
samples them without painting a procedural replacement face;
`tools/export-mali-caravan.mjs` generates the GLBs and their checksums.

## Validation

The 157 unit checks cover route continuity, planted feet, stable rig
topology, shared hand contact, coin ownership and GLB checksums. Four targeted browser scenarios verify both the existing infrastructure and native
GPU animation, fractional frames, fixed geometry, pause, clicking the ruler's
card and loading all four animated GLBs from different angles. The character study image loads and Escape closes it while preserving the character card. TypeScript,
ESLint and the preview production build pass. The existing approved dark-room
source components remain byte-for-byte intact.

The owner’s final surface direction is realistic **pixel 3D art** with the selected face, costume and natural anatomy. Eight consistent front, side, rear and three-quarter views are supplied. The character card opens an olive/gold study dialog following the supplied presentation pattern; design artwork is identified separately from the rotatable model and real renderer captures. Eight individual lossless WebP views preserve all visible master-sheet pixels.
