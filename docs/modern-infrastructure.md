# Modern Muslim-world infrastructure

The world now renders 400 infrastructure objects as volumetric meshes across
29 families, directly on the existing rotatable planet. Buildings, civic spaces,
markets, transit shelters, utilities, furniture and equipment share a coherent
limestone, teal glass, bronze and timber palette with fine pixel grain.

The architectural direction combines contemporary Muslim civic life and
regional references: shaded porticoes, pointed entrances, geometric screens,
courtyard-scale public spaces, roof terraces, solar canopies, glass curtain
walls, balcony housing, a clock-tower skyline, a modern cubic mosque, wudu
facilities and electric rickshaws. Clinics, labs, schools, kitchens, libraries,
sports facilities and transport keep their own functional equipment. National
flags and supplied character-study artwork retain their distinct identities.
No generated calligraphy or sacred lettering is introduced.

## Implementation

- `packages/shared/infrastructure.ts`: deterministic semantic model library.
  Model X/Z follow the original collision footprint and Y is height in world px.
  Facets, recesses, frames, balconies, solar cells and furniture details are
  actual geometry. Large structures include transparent ground-shadow faces.
- `web/src/engine/Infrastructure.ts`: converts the local vertices to planet
  coordinates once, then reprojects them on the GPU as the camera rotates.
  Face normals receive stepped lighting and stable pixel grain. Depth testing
  resolves mesh surfaces. Character interleaving retains the existing ground
  sorting, so it remains an approximation for sprite people near complex edges.
- `sortableSchema.objectType`: optional source semantics in the manifest.
  `tools/build/index.ts` preserves the type for every object strip. The engine
  creates one mesh per modeled object ID and suppresses its old sprite strips.
  Older manifests without semantic types continue to use their original art.
- The mesh buffers are disposed when the engine is destroyed. Camera controls,
  character scripts, picking, collisions, map layout and content approvals use
  the existing systems. Engine modules do not import React.

Natural landscaping, painted sports floors, pet bowls/feeders and supplied
character-specific artwork are preserved. This is a 3D infrastructure upgrade;
characters and vegetation retain their existing pixel-art sprite treatment.
The current mathematics gallery, supplied scene props and Massawa artwork also
retain their authored appearance and native interactions when merged into main.

## Reference city expansion

The latest city reference is implemented in the actual street grid: 26 extra
buildings/shopfronts, 37 extra cars (45 city cars in total), 12 traffic signals,
43 dashed lane markings and six additional crosswalks. Red masonry, blue glass,
varied heights and the taller four-faced clock tower create a denser skyline.
Balconies, striped awnings, lit product displays, window reflections, roof
services and rear elevations remain dimensional when the planet rotates.
Cars have sloped glass cabins, mirrors, door handles, headlights, rear lights,
bumpers, wheel hubs and occasional taxi roof lights. They are parked/static;
the existing character and scooter animations continue to run.

Instance palettes/heights derive deterministically from object IDs, without
runtime randomness. Additions are authored in `tools/placeholder/scenes/city.ts`
and preserved in the current room without regenerating character scenes.
Buildings occupy block interiors; cars occupy asphalt lanes and leave the
scooter loop clear. Painted details remain walkable. Asset metadata retains
legacy art fallbacks. The localized **City** shortcut frames the skyline.

## Validation

Asset build after integration with main: 90 characters, 2,988 frames, ten atlases,
zero warnings. 123 unit tests pass, including determinism, finite geometry, model-family
coverage and side-wall rotation without shared-vertex corruption. The eight
existing browser tests cover cards, masks, camera/overview, languages, mobile,
Character Lab, pinch and reload. A dedicated infrastructure browser test checks
unique object instances, real vertex buffers, depth testing and reprojection
while the planet turns. City checks cover persisted placements, solid-object
overlaps, road separation, walkable paint, scooter clearance, stable palettes,
four clock faces and vehicle rotation. A second infrastructure browser test
checks the City shortcut and visible vehicles/signals/markings. A lab test checks
working apparatus, staff poses and pause. The thirteen browser
checks include the current Massawa and lecture interactions. Type checking,
scoped ESLint and the Vite build pass. See
`docs/working-laboratories.md` for the active science and architecture benches.

Actual world screenshots and model-family counts are saved under
`.playwright/infrastructure/` and `.playwright/city-reference/`. This change is implemented in the local checkout;
it does not publish a deployment or alter named-character approval records.
