# Supplied scenery (Massawa)

**Current set (decision 51):** the owner's multi-angle desert set, cut by
`tools/prepare-desert-set.ts`: `sup-dunes-*`, `sup-mesa-*` and `sup-oasis-*`
(terrain tiles without their block sides), `sup-fort-*`, `sup-tent2-*`,
`sup-well2-*`, `sup-stall2-*` (four views each), `sup-datepalm`,
`sup-datepalms` (swaying), `sup-deadtree2` and `sup-rocks2`. The camel's eight
turnaround views are in `art/sprites/dir8/camel.png`. The earlier pieces
below remain for small shrubs, tufts, crates and jars.

## Earlier pieces

Pieces cut from the owner's desert-landscape and camel sheets (2026-11) by
`tools/prepare-supplied.ts`: golden dunes, sandstone rocks, date palms,
shrubs, a dead tree, a Bedouin tent, a stone well, a market canopy, jars,
crates and standing camels (with darker and paler coat variants). Each entry
in `index.json` gives its anchor (the ground point) and its density (sprite
pixels per world pixel), so the detailed art is drawn smoothly at a sensible
size, like the landmarks. They are placed by `MASSAWA_OBJECTS` in
`packages/shared/massawa.ts`.

The walking caravan camels are animation strips in `art/sprites/anim/`
(`amb-msw-camel-*`), made by `tools/prepare-camel-strips.ts` from the same
camel sheet; each strip has a sidecar JSON with its frame size, foot point and
density, since camels do not fit the people's 224×336 frames.

The people on the sheets (a Bedouin man and camel riders) are not used:
Massawa's story is the first Hijra, so no people are shown there.
