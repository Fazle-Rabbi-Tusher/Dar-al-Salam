# Mansa Musa and the gold caravan

The world now contains an articulated 3D Mansa Musa leading a mounted procession
through three gold distribution stops. The **Mansa Musa** shortcut frames its
sandy market route outside the Peace Quarter. Clicking the ruler opens his
unreviewed character card.

The supplied illustrations guide the white turban, gold crown and brocade,
crimson mantle, dark skin, jewelry, staff and black horse. Six generated face
references and sampled royal fabric colors are mapped onto curved geometry.
Heads, bodies, garments, hands, equipment and animals have actual volume;
rotating the camera reveals their sides and backs. Adult proportions follow
the owner's tall, natural character refinement.

## Cast and behavior

- One mounted Mansa Musa, twelve guards, four pack camels, three stewards and
  six recipients: 22 human figures and five animals in the complete component.
- The ruler and stewards share coins and gold pouches at three market stops.
  Hands meet at a shared contact point; ownership changes at contact. Recipients
  approach during the stop and retreat before the procession moves again.
- Guards and camels follow the route by accumulated distance, including turns,
  rather than rotating a rigid formation around the horse. Their gaits stop
  with the leader. Planted foot phases compensate for forward travel.
- The 240-tick, 12 Hz simulation repeats after 20 seconds with a continuous
  rear return route. Rendering accepts fractional ticks. The world's Pause
  freezes the same rig used by the native scene.

`packages/shared/royal-caravan.ts` owns the geometry and deterministic poses.
`web/src/engine/RiggedCaravan.ts` uploads articulated joint matrices in bounded
GPU batches. Mesh buffers remain fixed during animation, and all batches use
the world's depth buffer and planet projection. The walkable footprint and its
cleared procedural vegetation are separate from existing authored buildings.

## Reusable files

`web/public/models/mali-caravan/` includes four animated glTF 2.0 binary files:

| Model                     | Contents                                  |     Bytes |
| ------------------------- | ----------------------------------------- | --------: |
| `mansa-musa-standing.glb` | Standing, walking and giving ruler        | 1,455,908 |
| `mansa-musa-mounted.glb`  | Ruler and animated black horse            | 1,514,636 |
| `mali-guard.glb`          | Marching guard with lance and shield      |   342,480 |
| `mali-gold-caravan.glb`   | Complete procession, market and handovers | 6,529,356 |

The models use meters and carry articulated node animation sampled through
the whole loop. They can be opened in Blender or another glTF application.
`MansaCaravanComponent.js` loads any variant into a Three.js application and
supports the shared frame clock, independent playback, scrubbing and disposal.
The local viewer includes front, rear, side, overhead and isometric views,
hero-follow and overview cameras, a timeline, pause and model downloads.
Its MIT-licensed Three.js modules are included locally.

Run the viewer at `/models/mali-caravan/index.html`. For the extracted ZIP,
run `python3 -m http.server 8123` in its directory and open
`http://localhost:8123/index.html`. The ZIP also includes the generated source
artwork, source code and a video recorded from the real GLB and native renderers.
Use `node tools/package-mali-caravan.mjs` to rebuild it; the packer enforces the
owner's strict 30,000,000-byte ceiling and verifies every archived file.

## Review status and sources

This is an illustrative reconstruction of the Malian ruler and the giving
associated with his 1324 pilgrimage. The faces, crown, escort size, uniforms,
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
`art/sprites/source/mali-caravan/source/`. `tools/prepare-mali-character-art.mjs`
samples them without painting a procedural replacement face;
`tools/export-mali-caravan.mjs` generates the GLBs and their checksums.

## Validation

The 154 unit checks pass, including route continuity, planted feet, stable rig
topology, shared hand contact, coin ownership and GLB checksums. The 24 existing
browser scenarios pass, along with two new browser scenarios that verify native
GPU animation, fractional frames, fixed geometry, pause, clicking the ruler's
card and loading all four animated GLBs from different angles. TypeScript,
ESLint and the preview production build pass. The existing approved dark-room
source components remain byte-for-byte intact.
