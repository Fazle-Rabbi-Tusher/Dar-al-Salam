# Character artwork reference

The owner selected the uploaded **Isometric Character Sprites, Parts 1 and 2**
as the visual reference for future character artwork on 10 November 2026.
Use the actual supplied images when generating new artwork.

## Visual requirements

- Elevated three-quarter isometric view with visible body depth and shoe tops.
- Match the references' head/body proportions and recognizable facial likeness.
  Preserve detailed eyes, brows, noses, mouths, facial hair and natural expressions.
- Visible square pixel clusters, stepped contours, and layered tonal shading.
- Solid three-dimensional volume through warm highlights, cooler shadows,
  fabric folds, headwear thickness, and grounded feet.
- Preserve each person's reference clothing, silhouette, skin tone and accessories.
- Keep the viewpoint, scale, palette and lighting consistent between directions
  and animation frames. Rotations show the same person and outfit.
- Keep complete bodies and consistent foot anchors when preparing game strips.
  Transparent game sprites can be exported while retaining the illustrated look.

## Visual examples

The following are unmodified copies from the uploads:

- [Mufti Menk](references/character-style/mufti-ismail-menk.png)
- [Malala Yousafzai](references/character-style/malala-yousafzai.png)
- [Mohamed Salah](references/character-style/mohamed-salah.png)

All 37 supplied PNGs are available in the current workspace at
`/workspace/style-references/isometric-character-sprites/`.
The inventory in `references/character-style/uploaded-reference-inventory.json`
records every filename and original checksum.

This records the default style for future work. Existing runtime artwork,
animation scripts, identity rules and advisory approval statuses are unchanged.
When a character-specific supplied reference is available, use it directly.

## Reusable skill

Apply `$dar-al-salam-art-style`, stored in
[SKILL.md](../.agents/skills/dar-al-salam-art-style/SKILL.md).
It bundles original visual references, prompt templates, animation/integration
instructions, and saved project preferences. The repository's `AGENTS.md` makes
it the default workflow for future artwork here.
