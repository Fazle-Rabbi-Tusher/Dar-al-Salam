# Dar al-Salam content and engineering rules

- Never depict any prophet, including Muhammad ﷺ, by figure, silhouette, light, hand, shadow, or voice.
- Never depict Ahl al-Bayt, the Prophet's wives, Maryam, or the Sahaba.
- Validate named and ambient IDs, names and aliases against `content/rules/never-depict.json`. Normalise Unicode, accents and punctuation; avoid substring matches. A denylisted given name requires an exact full-name allowlist entry. Patronymics alone do not identify a prohibited person. Umar ibn Abd al-Aziz must remain allowed. Only the advisory panel may extend approvals.
- Production assets reject named cards without `panelApproved: true`; development displays DRAFT. Never approve sample cards to make a build pass.
- Depiction is full or back. Back characters may face NE or NW only, including moving segments.
- Modest dress. Faces are realistic pixel-art faces in the Floor796 style (eyes, brows, nose and mouth shading, expressions) at small sprite scale. (The project owner chose realistic faces in 2026-11, replacing the earlier featureless and then chibi rules.) Never depict prohibited people in any style.
- For future character artwork, use the owner's uploaded Isometric Character Sprites Parts 1 and 2 as the visual style reference; see `docs/character-art-style.md` and its unmodified PNG examples. Match their isometric view, head/body proportions, detailed faces, visible pixel clusters and three-dimensional shading.
- No generated Arabic text, calligraphy, Qur'an pages, or religious symbols in placeholder art. Real sacred text must be artist supplied and human proofread.
- Historical biographies and stories stay `PLACEHOLDER — to be researched` until researched and reviewed. No invented sources. A card may carry a short `summary` of well-established facts (no fast-changing claims such as a current club) with a `links` entry to a real reference such as Wikipedia; it is shown as unreviewed.
- Engine modules never import React. Runtime world simulation is deterministic at 12 fps, with a 240-frame master loop; no random or wall-clock calls.
- Use the existing isolated checkout; do not create a worktree unless explicitly requested.

## Project art skill and memory

- Apply `$dar-al-salam-art-style` for future art and animation work in this project. Read `.agents/skills/dar-al-salam-art-style/SKILL.md`; its bundled original PNGs are the visual authority.
- Saved owner preferences and export requirements are in `.agents/skills/dar-al-salam-art-style/references/project-memory.md`. Keep each requested ZIP below 30,000,000 bytes. New explicit user instructions take precedence.
