# Supplied scenery (Massawa)

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
