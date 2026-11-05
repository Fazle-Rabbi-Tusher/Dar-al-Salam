# Artist handoff

All generated art is placeholder art. Replace source sheets in place and run `pnpm build:assets`. No engine code needs to change. Preserve the locked palette, frame counts, canvas and foot anchors. Do not introduce sacred text/calligraphy, Qur'an pages, religious symbols or detailed faces. Modest dress is required.

## Aseprite export

```sh
aseprite -b <part>.aseprite \
  --split-layers --list-tags --list-slices \
  --sheet art/parts/<category>/<part>.png \
  --data art/parts/<category>/<part>.json \
  --format json-array --sheet-type packed --trim
```

Use one visible/composed part per exported sheet (hide unrelated working layers before exporting). Categories are `bases`, `garments`, `headwear`, `props`. The JSON's `meta.image` references the PNG beside the JSON.

- Tags: `<action>_<facing>` in lowercase, e.g. `walk_se`, `read_ne`, `pour_sw`. People: idle 4, walk 6, talk 4, sit 2, read 4, write 4, carry 6, pour 6, sweep 6, wave 4, teach 4, pray 8, celebrate 4, cheer 4, cross-arms 4, kick 4, dive 4, slide 4, arms-out 4, hand-on-heart 4. Cats: cat_idle 4, cat_walk 6, cat_sleep 4. Birds: bird_fly 6, bird_peck 4. Ball: ball_roll 4, ball_still 1.
- Canvas: people 48×72, cat 32×24, bird 20×20, ball 12×12. Keep full `sourceSize` in the JSON even when individual frames are trimmed.
- Slice `foot`: a 1×1 slice at (24,68) for people, (16,22) for cats, (10,19) for birds, (6,11) for the ball. Sizes and anchors live in `packages/shared/canvas.ts`. A slice pivot is also supported; its world anchor is bounds position plus pivot.
- Draw SE and NE; SW and NW are mirrored at build time. Supply explicit SW/NW tags for asymmetric props; explicit frames take priority. Placeholder pour/write include SW to test this path.
- Optional per-frame user data: `layerBias=<integer>` adjusts draw order. Default order: base, garment, headwear, prop when facing the viewer; prop, base, garment, headwear when facing away. Shadows are beneath the body; the compositor adds a 1 px brown silhouette outline.
- Frame tags provide unique art frames. The global clock maps these to held frames over 60/120/240-frame loops; Aseprite duration metadata is preserved but does not alter the deterministic 12 fps clock.

## Key colours

Use exact RGB shades from `content/palettes/key-colours.json`. Each slot maps to a named ramp in the character look. Skin has eight ramps; hair has black, brown, grey and white; fabrics include cream, indigo, saffron, madder-red, olive, linen and charcoal plus modern denim, navy, lab-white, scrub teal/blue, hi-vis, safety orange, rose, plum, emerald, sky, graphite, khaki, mustard, coral and black; brass, silver and steel are available. All non-key colours must exist in `world-palette.json`. The post-compositing check rejects non-palette pixels and reports coordinates. Use un-antialiased pixel tools; do not introduce intermediate colours or filtered resampling.

People are chibi: about 49 px tall with a 22×20 head (around 42% of their height), small bodies and big hands. Faces are cartoon faces whose expression follows the action: smiling by default, mouth moving when talking, happy closed eyes when cheering, eyes down when reading or writing, calm closed eyes in prayer, determined when sparring. Nothing realistic or portrait-like. Children reuse adult garment sheets and are scaled by the compositor (`CHILD_SCALE`, about 40 px tall). Elders differ by hair and a fuller beard. Prop sheets omit `pray` frames: hands are free during prayer. Prayer frames follow standing → bowing → prostration → sitting and are marked for advisory review.

## World assets

- Tiles: `art/tiles/tile-<id>.png`, 32×16, transparent outside the diamond. The `floor` layer uses these numeric IDs.
- Objects: PNGs under `art/objects/`, metadata in `art/objects/index.json`: source file, dimensions, foot anchor, optional animation frame files. The room declares tile footprint and walkability. Objects spanning more than one tile are sliced into 16 px strips at build time; strip depth uses the front boundary of each footprint column.
- Do not place text on placeholder books or architecture. Any future real calligraphy is supplied by artists and proofread by humans.

Run `pnpm gen:placeholder` only to seed missing examples. It preserves existing character/content JSON and part sheets. Back up authored object/tile assets before intentionally regenerating those families. Generated atlases, the ground texture and contact sheets are ignored outputs: replace sources, never edit outputs.

Use `/lab` to inspect source-part combinations, and `public-build/review/characters.html` to review every used baked frame offline. Advisory approval of names, stories, translations and sacred-content treatment remains a separate human step.

## Dense cutaway study

`detail-*.png` objects are authored procedurally by `tools/placeholder/details.ts`, with wall faces, bookshelf spines, lattice windows, striped awnings, work surfaces, jars, planters and railings. Their footprints and anchors are registered in the same object index as other room art. The modern district's `m-*` objects come from `tools/placeholder/modern.ts`. Use `pnpm gen:placeholder --refresh` only for an intentional refresh: it overwrites generated source art. Standard first-run setup preserves existing parts and tiles. Rugs and prayer carpets (`floor: true` in the object index) are floor decorations baked into the ground texture, while furniture and wall strips remain depth-sorted.
