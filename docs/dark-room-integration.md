# Al-Bayt al-Muzlim in the main world

The approved optical chamber and its interior instruments render
as native three-dimensional geometry on Dar al-Salam’s existing world canvas.
The dark-room tab, Ibn al-Haytham’s card and scene selection all focus that world
component. A compact, non-modal control panel adjusts the exhibit; the world
remains interactive. There is no iframe, exhibit dialog, second WebGL context,
world suspension or separate application launch.

Old `/?exhibit=dark-room` links focus the component and remove the legacy query
parameter. Ordinary camera/person links continue to work, including close-up
zoom values up to 12. The original standalone source remains archived in the
verified exhibit directory and download ZIP.
Legacy exhibit directory/index URLs redirect into this component in development,
preview and production; the verified source files themselves stay unchanged.

## Approved design and source integrity

The unchanged approved source is in
`web/public/exhibits/al-bayt-al-muzlim/`, from source commit
`c784d7c27a8120d85242175641b029ddfbd12285`.
`approved-source.json` records its original byte lengths and SHA-256 hashes.
`pnpm verify:dark-room` verifies that inventory and restores the exact complete
and cutaway GLBs from the original ZIP. The ZIP and all original models,
previews, scripts and textures remain available for download.

`web/src/engine/DarkRoom.ts` imports the original ES modules from the same
origin. It calls `buildSanctuary`, `buildWaterClock`, `buildInstrumentExperiment`
and the original material/projection texture constructors directly. The default
cutaway contains **36,316 original quad parts**. The world component always calls
`buildSanctuary` with `courtyard: false`, including when controls rebuild its
geometry, so neighboring buildings and outdoor paving are excluded. The pinhole
projection retains its reference image as a texture, without exterior world
geometry. Coordinates, colors, UVs and
apparatus proportions are retained; the implementation does not replace them
with generic furniture or flat images.

The approved fragment shader is read from the verified source and adapted to
GLSL 3 syntax and Pixi’s premultiplied output. Its original material constants,
lighting, ambient occlusion, reflections and glass highlights are retained.
Material constants are specialized at compilation so stone does not perform
unneeded mirror/glass calculations. Exterior exposure and the absence of aerial
haze match the source’s isometric views. The camera position is expressed in
local model coordinates for view-dependent reflections.

The world camera and curved planet projection intentionally differ from the
standalone renderer. Geometry/material fidelity is checked directly; screenshots
from different cameras or render backends are not claimed to be pixel-identical.

## World transform, depth and visibility

`packages/shared/dark-room.ts` defines the one uniform model-to-world transform:
source +Z follows tile +x, source +X follows tile −y, and source Y is radial
height. The plot origin is `[47, 33]` and its uniform scale is 0.85. The chamber
replaces the removed kitchen beside Community. The benches, instruments,
architecture and scholar grow by the same factor; the original writing strip
uses density 4.6 instead of 17. Camera zoom compensates for the larger model.
Camera targets use the same transform. No height-only scaling is applied.

The asset builder keeps the legacy PNGs as source references, but neither packs
the old `sup-dr-*` strips nor bakes their floor into the world ground. This
prevents flat copies from covering the native model and its characters.
Ibn al-Haytham’s original 40-frame writing animation remains. Its ground anchor
is registered to his shoes, and his script places him behind the optical bench,
on the chamber floor and clear of the pinhole-to-screen cone. Approval and
biography fields are unchanged.

`DepthSprite.ts` keeps the supplied character art and alpha picking masks while
rendering their pixels into the same depth buffer as native infrastructure.
Transparent atlas margins discard without writing depth. Head/torso depth rises
with the standing figure rather than using a whole building’s nearest corner.
Nearby walls that actually cover a person receive a low cutaway; their plinths
and non-obstructing walls remain solid. Picking checks the same projected
triangles, so hidden body regions cannot be clicked through a wall. Authored
sprite props, landscapes, card selection, scene highlights and landmarks retain
their existing paths.

## Controls, animation and lifecycle

The inline controls offer the chamber view and station
close-ups, aperture and screen-distance adjustments, lighting/cutaway/ray
toggles, all seven mirror forms, tube/astronomy demonstrations and the water
clock. Experiments use the source’s actual faceted apparatus, ray intersections,
reflection normals and shadow calculations. They are interpretive teaching
reconstructions, not claims about personal ownership or calibrated equipment.

The water clock follows the same deterministic 12 Hz, 240-frame master loop as
people and laboratories. Starting it explicitly resumes world animation; the
main Pause freezes everything. New moving meshes are attached in the same
update, including paused updates. Closing the panel does not remove the world
component, and reopening preserves its optical settings.

Immutable meshes with matching materials are batched together without removing
vertices. Movable assemblies and walls retain independent batches. Off-screen
batches are culled; transparent quads are ordered after opaque geometry. Owned
geometry, shaders and textures are released on teardown, including interrupted
loads. The main renderer is also released if navigation interrupts asset loading.

## Verification

- The source inventory verifier checks the unchanged approved source/downloads.
- Unit regressions exercise oblique-wall depth, cutaway plinths, camera rotation,
  world transforms, scholar placement and all retained animation frames.
- Browser checks compare native model coordinates/colors/UVs against the source,
  verify the single canvas and inline/mobile navigation, run optical reflection
  and water-clock controls, and verify main Pause and setting persistence.
- A browser regression renders an avatar and a long oblique wall into the real
  WebGL depth buffer and measures visible avatar pixels. This checks actual
  occlusion, rather than merely inspecting a `visible` flag.
