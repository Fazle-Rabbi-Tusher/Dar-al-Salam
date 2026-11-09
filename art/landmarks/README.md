# Landmark buildings

A landmark is a supplied, detailed building that stands somewhere on the planet
(it may be outside the mapped quarter) and opens its own story card when
clicked. Each needs:

1. **Art**: `art/landmarks/<id>.png` on a transparent background, plus an entry
   in `index.json`:
   - `anchor`: the pixel at the front centre of the building's base.
   - `density`: sprite pixels per world pixel. 2.5 makes a 517 px wide
     drawing about 207 world px wide.
   - `source`: where the art came from and what was changed.

   To cut one view out of a sheet on a flat dark backdrop, run:

   ```
   node --import tsx tools/prepare-landmark.ts <sheet.png> art/landmarks/<id>.png <left> <top> <width> <height> [erase=x0,y0,x1,y1] [knob=x,y,r]
   ```

2. **Card**: `content/landmarks/<id>.json`. It has a name in en/ar/bn, a planet
   `tile`, an `art` key, a short unreviewed `summary`, `links`, placeholder
   `bio`/`story`/`sources`, and `panelApproved: false`. Landmark names pass
   the never-depict rules, and production builds refuse unapproved cards,
   exactly like named characters.

Rules (AGENTS.md):

- No religious symbols, calligraphy or Arabic text in the art.
- The Mosque of the Companions' dome finial in the owner's sheet was replaced
  with a plain knob.
- No people are drawn in or around landmarks connected to the Sahaba.

## Mosque of the Companions

`mosque-of-the-companions.png` is the top-left view of the owner's sheet
(2026-11), cut with:

```
node --import tsx tools/prepare-landmark.ts <sheet.png> art/landmarks/mosque-of-the-companions.png 0 10 530 362 erase=380,18,395,39 knob=387,39,2
```
