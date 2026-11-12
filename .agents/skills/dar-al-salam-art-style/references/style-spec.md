# Visual style specification

The owner selected the original **Isometric Character Sprites Parts 1 and 2**
on 10 November 2026. The packs contain 37 character PNGs. The original uploaded
art, rather than later generated approximations, defines the style.

## Bundled visual references

- `../assets/mufti-ismail-menk.png`: white head covering, beard, cream/gold robe;
  useful for fabric volume, facial detail, and the elevated viewpoint.
- `../assets/malala-yousafzai.png`: female face, headscarf, layered clothing, hands,
  book, and grounded shoes.
- `../assets/mohamed-salah.png`: hair, beard, contemporary sports clothing,
  facial likeness, and natural adult proportions.
- `../assets/al-khwarizmi.png`: scholarly character, turban, gray beard,
  purple/gold robe, and book. For his later requested action pack the owner chose
  a brown robe and cream turban from newer action references; that costume change
  is specific to that request.

These four PNGs are unmodified copies from the owner's packs. Their inventory
records the original checksums. They are style/identity references, not approved
production cards or an instruction to overwrite runtime assets automatically.

## View, form, and pixels

Use an elevated orthographic/isometric three-quarter camera with shoe tops and
body depth visible unless the owner requests front-facing or overhead shots.
The owner's later correction rejects squat or oversized-head adults: use natural
tall adult anatomy, roughly 7.5–8 anatomical heads in height, longer legs and
torsos, natural shoulder width and slender robe silhouettes. Children alone
keep shorter, age-appropriate proportions. Use the uploaded art for faces,
costume, pixel clusters and dimensional material shading. Avoid switching to unrelated cartoon, chibi,
photorealistic, smooth vector, or plastic-rendered styles.

Build volume from coherent pixel clusters: warm lit planes, cooler recesses,
layered cloth folds, headwear thickness, and readable material boundaries.
Keep lighting consistent, normally upper-left. Preserve visible square pixels
and stepped edges when resizing. Use nearest-neighbor resampling for technical
sprite preparation.

Faces should retain individual eyes, brows, nose, mouth, beard, and expression.
Do not substitute a generic face across named people. Modest clothing, skin
tones, accessories, and silhouette follow the supplied subject reference.

For props and buildings, carry the same material shading and pixel texture
into the requested projection. Rotate the same architecture or object, including
its asymmetric features; do not generate unrelated designs for each angle.

## Backgrounds and framing

Final runtime sprites normally use transparent padding. Follow the image tool's
transparency requirements. Dark equipment must have opaque interiors; inspect
for unintended holes and matte fringes.

If a deliberately chosen flat-color source is used for the import pipeline,
remove only that background color. Do not erase dark clothing, camera bodies,
or wood as if they were background. Keep the original source sheet.

Ensure all poses fit with padding above the head, below shoes, and around hands,
books, and equipment. Pose registration uses shoes/ground contact, not the
changing full silhouette's bounding-box center. Keep one scale for a sequence
and consistent body size between actions.
