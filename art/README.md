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

- Tags: `<action>_<facing>` in lowercase, e.g. `walk_se`, `read_ne`, `pour_sw`. People: idle 4, walk 6, talk 4, sit 2, read 4, write 4, carry 6, pour 6, sweep 6, wave 4, teach 4, pray 8. Cats: cat_idle 4, cat_walk 6, cat_sleep 4. Birds: bird_fly 6, bird_peck 4.
- Canvas: people 32×48, cat 24×20, bird 16×16. Keep full `sourceSize` in the JSON even when individual frames are trimmed.
- Slice `foot`: a 1×1 slice at (16,44) for people, (12,18) for cats, (8,15) for birds. A slice pivot is also supported; its world anchor is bounds position plus pivot.
- Draw SE and NE; SW and NW are mirrored at build time. Supply explicit SW/NW tags for asymmetric props; explicit frames take priority. Placeholder pour/write include SW to test this path.
- Optional per-frame user data: `layerBias=<integer>` adjusts draw order. Default order: base, garment, headwear, prop when facing the viewer; prop, base, garment, headwear when facing away. Shadows are beneath the body; the compositor adds a 1 px brown silhouette outline.
- Frame tags provide unique art frames. The global clock maps these to held frames over 60/120/240-frame loops; Aseprite duration metadata is preserved but does not alter the deterministic 12 fps clock.

## Key colours

Use exact RGB shades from `content/palettes/key-colours.json`. Each slot maps to a named ramp in the character look. Skin has eight ramps; fabrics include cream, indigo, saffron, madder-red, olive, linen and charcoal; brass and silver are available. All non-key colours must exist in `world-palette.json`. The post-compositing check rejects non-palette pixels and reports coordinates. Use un-antialiased pixel tools; do not introduce intermediate colours or filtered resampling.

For humans, heads are around 6×6, with no more than 2–4 shading pixels suggesting direction. There are no detailed eyes, mouths or portraits. Children are shorter; elderly figures are slightly stooped. Prayer frames follow standing → bowing → prostration → sitting and are marked for advisory review.

## World assets

- Tiles: `art/tiles/tile-<id>.png`, 32×16, transparent outside the diamond. The `floor` layer uses these numeric IDs.
- Objects: PNGs under `art/objects/`, metadata in `art/objects/index.json`: source file, dimensions, foot anchor, optional animation frame files. The room declares tile footprint and walkability. Objects spanning more than one tile are sliced into 16 px strips at build time; strip depth uses the front boundary of each footprint column.
- Do not place text on placeholder books or architecture. Any future real calligraphy is supplied by artists and proofread by humans.

Run `pnpm gen:placeholder` only to seed missing examples. It preserves existing character/content JSON and part sheets. Back up authored object/tile assets before intentionally regenerating those families. Generated atlases, chunks, LODs and contact sheets are ignored outputs: replace sources, never edit outputs.

Use `/lab` to inspect source-part combinations, and `public-build/review/characters.html` to review every used baked frame offline. Advisory approval of names, stories, translations and sacred-content treatment remains a separate human step.
