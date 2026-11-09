# Landscape art

Original generated scenery props based directly on the owner's supplied forest,
waterfall and village pixel-art references. These are scenery only; original
character art, biographies, scripts and advisory approvals are unchanged.

`index.json` records world-pixel dimensions and the foot anchor for each PNG.
The assets use their own full-colour palette, as supplied illustrations do;
character and procedural-object palette validation remains unchanged. They are
packed into nearest-filtered pixel atlases, not smoothed character atlases.

The source sheet was generated with transparent isolated props and retained at
`/workspace/generated_images/exec-e4b9d087-a8bc-4970-829c-60d37ff3bf75.png` in the
onboarding workspace. Re-import another sheet with the same layout using:

```sh
node --import tsx tools/landscape/import.ts <1536x1024-sheet.png> --forest
```

The importer crops the six cells, removes residual alpha matte, uses nearest
resampling, and builds four water-highlight frames. Normal builds use the
committed PNGs and do not need an image-generation tool or the original sheet.

`tools/landscape/scene.ts` maps existing decorative object IDs onto these assets
without changing collision footprints. It adds a five-cottage woodland village
outside the character map, validates meadow/forest placement, and reserves a
clearing from automatic wild planting. Trees, falls, flowers and cottages follow
the planet's existing curved projection and depth sorting. The waterfall loops
on the deterministic world clock. The Explore landscapes menu navigates to
actual biome placements and the village clearing.

The forest sheet uses broad pixel clusters, angular tall trunks, dark teal
conifers, deadwood, a blue cliff waterfall and fern/log undergrowth. The earlier
village sheet retains the cottage and park blossom props. Smaller park trees
preserve character visibility, while mature trees and paired stands appear in
the wilderness.

`tools/landscape/forest.ts` composes groves with canopy spacing, clearings,
deadwood and undergrowth. It retains coastal landmarks and the original biome
sampler. At build time, `atmosphere.ts` paints middle and far mist variants using
the exact same alpha mask and anchor. The engine selects these atlas frames by
depth, preserving batching rather than applying a separate filter to each tree.

## City, tram street, blossom lane and harbor

The additional district sheet is retained at
`/workspace/generated_images/exec-e5b24072-c287-4396-88af-108c1b864612.png` in the
current workspace. Re-import with:

```sh
node --import tsx tools/landscape/import-districts.ts <1536x1024-sheet.png>
```

This adds the night skyline, yellow tram, blossom shop block, sailing ship,
coastal cliff and revised slate-roof cottage. Only scenery files change.

`packages/shared/districts.ts` is the shared source of district boundaries,
camera destinations and lighting IDs. `tools/landscape/district-scene.ts` places
the new streets outside the authored character map, checks dry ground and
reserves clearings from automatic forest planting. The existing offshore ship
uses the new ship sprite; another copy is not placed beside it.

Night lighting, wet paving, rain, blossom petals and sky palettes are rendered
in the game, using the same 240-frame world loop. Original character source
colors, paths, stories and advisory status are retained. City towers and shops
can be regenerated selectively with `generateModernObjects(ids)` rather than
refreshing unrelated art or character content.

## Living-world animation

`packages/shared/world-life.ts` evaluates the tram timetable, safe ship courses,
taxi route, traffic/pedestrian signals and wind from the shared world frame.
The simulation remains deterministic at 12 ticks per second and repeats over
240 ticks. Vehicle routes accelerate/brake smoothly; tram doors only open at
the stopped platform; taxi right of way matches the city crossing, including
the preserved scooter route. Ship courses are checked continuously offshore.

Vehicle bodies are independent of their fixed surroundings. `Sortable.life`
carries directional/door frame IDs into the normal atlas pipeline. Pose anchors
keep wheels and hulls planted when a view changes. The renderer projects moving
positions every world tick, with ship heave, roll and wakes; wind also moves
foliage. `WorldEffects.ts` adds fixed catenary supports, signal heads, hearth
smoke, birds and water trails without an independent timer. Headlight reflections
follow vehicle positions. The Living world panel reads the same frame and
provides one Preview/Pause control shared with the existing animation button.

Re-import the isolated poses using:

```sh
node --import tsx tools/landscape/import-life.ts <tram-sheet> <station-taxi-sheet> <ship-sheet>
```

Source sheets retained in this workspace:

- Tram doors/front/rear: `/workspace/generated_images/exec-9cef7596-e216-4cbc-adfa-70db088f755e.png`
- Empty station/taxi: `/workspace/generated_images/exec-1c7bc36c-9a45-47fa-a94a-6363c773654c.png`
- Ship directions: `/workspace/generated_images/exec-620b2ab4-3e94-4911-9f0c-7a60c85ce313.png`

The older district importer preserves vehicle entries owned by this importer.
Normal builds use the committed poses, and never require image generation.
Original character assets, content and scripts remain unchanged.
