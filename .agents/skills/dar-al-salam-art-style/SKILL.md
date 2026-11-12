---
name: dar-al-salam-art-style
description: Create and animate characters, audiences, props, and scenes in the owner's approved Dar al-Salam isometric pixel-art style. Use the bundled original sprite references, preserve recognizable faces and consistent 3D-looking volume, follow the existing animation pipeline, and keep requested ZIP downloads below 30 MB.
---

# Dar al-Salam art style

Use this skill when the owner asks for artwork, sprites, turnarounds, animation,
or scenes in "our style", "the existing style", or the uploaded character style.
This is the project's default art workflow. A newer user instruction takes
precedence over these defaults.

## Start with the actual references

1. Read the repository's `AGENTS.md` and the relevant character card and scripts.
2. Inspect a bundled PNG in `assets/` before generating art. If available, also
   inspect the actual reference for the requested person. The uploaded reference
   packs are the visual authority, rather than a generic pixel-art description.
3. Read [style-spec.md](references/style-spec.md) for visual requirements and
   [project-memory.md](references/project-memory.md) for saved owner preferences.
4. For animation or integration, read
   [animation-workflow.md](references/animation-workflow.md). Use
   [prompt-templates.md](references/prompt-templates.md) as a starting point,
   adapting the action and subject to the user's request.

Resolve bundled paths relative to this skill directory. In this repository the
skill lives at `.agents/skills/dar-al-salam-art-style/`.

## Visual contract

- Elevated three-quarter isometric view; tangible, three-dimensional volume
  expressed through pixel art. Apply the owner's latest proportion refinement:
  natural tall adults at roughly 7.5–8 anatomical heads in height, smaller heads,
  long legs and torsos, natural shoulders and slender robe silhouettes. Avoid
  squat/chibi adult bodies. Preserve age-appropriate child proportions. Subject
  references still govern facial identity, outfit and pixel material treatment.
- Recognizable, expressive faces with eyes, brows, nose, mouth, and appropriate
  facial hair. Preserve the subject's reference skin tone and distinguishing features.
- Visible square pixel clusters and stepped contours, with layered highlights,
  cooler shadows, fabric folds, and grounded shoes.
- One coherent identity, costume, palette, scale, lighting direction, and camera
  elevation across actions and rotations.
- Complete bodies and props inside their frames. Register feet to a shared
  anchor; moving hands and books must not shift the whole body.
- Preserve the reference outfit unless the owner requests a costume change.
  Use the latest subject-specific instructions to settle conflicting references.

Generate and edit artwork with the available image-generation tool. Inspect
local reference images before editing them and follow the tool's image-reference
and transparency instructions. Crop, register, pack, and validate generated
assets as technical import work; do not procedurally redraw the subject's face.

## Animation contract

- Inspect the current engine and original character animation before replacing
  anything. Preserve originals in a clearly named reference/backup folder.
- Keep simulation deterministic on the repository's 12 Hz, 240-tick master loop.
  Random-looking audience variety is authored once and fixed during playback.
- Match the action: page turns, wrist strokes, blinks, gestures, and weight
  transfer should be drawn motions, not a stretched still image.
- Ease walking starts and stops, check the actual route against collisions,
  and join the loop continuously. Keep fixed supports, tripods, and chairs fixed.
- Retain every supplied animation frame. Check the built manifest and actual
  renderer rather than assuming an eight-frame strip survives a four-pose fallback.
- Verify smooth movement and pause in the native renderer before claiming them.
  Describe standalone previews accurately when native integration is not tested.

## Content and approval

Keep the repository's depiction rules and exact-name validation. Do not extend
allowlists or mark draft cards approved. Preserve identity, aliases, biography
placeholders, sources, links, and approval fields unless the user specifically
authorizes an applicable change. No generated Arabic lettering, sacred text,
calligraphy, or religious symbols; artist-supplied material needs human review.
Do not invent historical claims, sources, attributed quotations, or voices.

## Deliver the requested result

For asset packs include prepared PNGs, source references, animation scripts,
integration instructions, and actual animation previews as appropriate.
Every ZIP must be **strictly smaller than 30,000,000 bytes**. If necessary,
make independently opening ZIPs with clear contents and matching shared metadata.
Check archive integrity and checksums.

The owner's workspace-path downloads previously failed. For requested GitHub
delivery within the authorized repository, use the established download branch
and test the real download, including byte size and checksum. Preserve existing
downloads and the app branch. This skill does not independently authorize
publishing, pushing, deployment, or sending messages.

Keep the final response short: preview/download link, actual file size, relevant
actions, and material verification or limitations. Do not claim rigged 3D meshes
when the deliverable is 3D-looking 2D pixel art.
