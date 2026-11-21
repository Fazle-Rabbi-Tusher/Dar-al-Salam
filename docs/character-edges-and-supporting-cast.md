# Clean character edges and a sparse supporting cast

> **Removed (owner's request, 2026-11-21: "remove all npc").** Every anonymous person described here is gone from the world; only named characters remain. This page is kept as a record.

The character sources have been preserved. The pale silhouette fringe came
from soft alpha pixels writing depth before a later native 3D surface. Grass or
furniture then failed the depth test behind those pixels, leaving the lighter
baked floor visible through their edges. Mufti Menk's already-baked surroundings
made the issue less apparent around him.

`DepthSprite` now uses the same geometry/texture for an opaque depth-writing
pass and a later soft-edge pass. The edge pass tests depth but does not write it;
it blends over completed opaque architecture and before transparent glass. The
shaders use high-precision atlas coordinates. This keeps white clothes, facial
details, source artwork, gold selection highlighting and wall cutaways intact.
Shadows keep their original single non-depth-writing pass.

The same native renderer and source art, before/after the alpha correction:
[before](previews/character-edge-before.png) ·
[after](previews/character-edge-after.png).

Seventeen anonymous supporting people were added, using twelve new illustrated
identities with 144 complete front/rear drawings. They use the existing four
runtime facings, including mirrored left views, rather than rigged 3D bodies.
The seven existing laboratory staff and eight listeners at Menk's talk remain.

| Section                    | Supporting activity                                                  |
| -------------------------- | -------------------------------------------------------------------- |
| Knowledge / maths workshop | A student studying a book                                            |
| Hospital                   | A nurse checking a tablet; a visitor reading beside the waiting area |
| Hospitality garden         | A caretaker watering flowers, then resting the can                   |
| Community                  | A café host beside the coffee cart                                   |
| City                       | A bookseller and a neighbour walking/pausing along the pavement      |
| Dark chamber               | An assistant consulting notes beside the optical bench               |
| Podcast                    | A technician monitoring the recording                                |
| Football                   | An assistant referee watching the touchline                          |
| Cricket                    | An umpire observing from behind the bowling end                      |
| Basketball                 | A coach watching from outside the court                              |
| Boxing                     | A cornerman with towel and water outside the ring                    |
| MMA                        | A coach outside the cage                                             |
| Massawa market             | An anonymous host offering refreshments beside a stall               |
| School                     | Two pupils reading with their teachers nearby                        |

The two school pupils use age-appropriate child scale. Adults keep the natural tall
proportions of the saved reference style. No new named identities, biographies,
advisory approvals, sacred writing or quoted dialogue were introduced.

Roles, positions, routines and quiet gesture phases are authored in
`packages/shared/supporting-cast.ts`. The new cast has one or two people per
section and does not reinstate the removed kitchen or ambulance strip.
Stationary soles and the pedestrian route are checked against the real collision
grid and object footprints. The optics assistant stays clear of the bench,
adjustable screen and optical axis. Actions share the 12 Hz / 240-tick clock;
pause freezes them, and staggered poses prevent a synchronized crowd.

The generated originals and their checksums are retained in
`art/sprites/source/supporting-cast/`. The importer finds the actual transparent
row gaps, preserves all six poses in each view, registers shoes to (112, 320)
and packs 224 × 336 cells at density 4. The original named art was not repainted.

```sh
node --import tsx tools/update-supporting-cast.ts
node --import tsx tools/prepare-supporting-cast.mjs
pnpm build:preview
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
# With the development server running:
node tools/capture-supporting-cast-preview.mjs
```

Verified with 146 unit tests and 24 Chromium browser tests, plus typecheck,
lint, the complete asset/production build and byte-identical verification of
the approved dark-chamber source. The browser regression measures the actual
WebGL color buffer: pale edge pixels disappear while the opaque face/clothes
stay unchanged. Every new role is checked in its section, including full
authored frames, clear routes, visible native rendering and pause behavior.

The [native animation preview](previews/clean-characters-and-supporting-cast.mp4)
visits the stadiums, garden, labs, podcast, school, optical workshop, city,
boxing/MMA and market. It uses the live world code, not a source-sheet slideshow.
The video is 32 seconds at 24 fps and 3,507,865 bytes. Its full decode was
verified. The production build was also checked on desktop and mobile with no
local asset failures or runtime errors.
