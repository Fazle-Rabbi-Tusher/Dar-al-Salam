# The gold caravan: animals and treasury

Seventeen new 3D assets, ten existing people/rig files, an assembled giving
scene, rendered directions, actual animation previews, original material
artwork, source scripts and a portable Three.js component.

Start a local server in this folder:

```sh
python3 -m http.server 8150
```

Open **http://localhost:8150/index.html**. All dependencies are local. Select
the elephant, camel, individual props, people or complete scene. Drag to orbit,
scroll to zoom, use the angle buttons, play/pause or scrub the timeline.
Choose Walk or Rest for either animal. Reduced-motion startup is paused.

Both animal GLBs contain real joint animation over 20 seconds. Props are static
meshes. The complete scene shows a giving stop with resting animals and a coin
exchange; the individual people retain their original animation. The current
Mansa Musa design and draft status are preserved. `manifest.json` records the
asset inventory, sizes, checksums and animation modes.

`gold-cargo-animation.mp4` and the smaller GIF are twenty-second recordings
of the actual 3D models. `sprites/` holds transparent rendered views;
`gold-cargo-scene.png` shows the assembled scene. `GoldCargoComponent.js`
exports `createGoldCargo({ variant, mode })`; use its `object3D`, `setFrame`,
`setMode` and `dispose` methods in an existing Three.js app.

The archive's `source/` directory contains the unchanged generated material
PNG, its checksum, the original people art and the new
modeling, sampling, export and capture code. These source scripts target the
repository checkout; viewing the exported assets needs no build step.
See `source/docs/gold-cargo-3d.md` for implementation and integration details.
Check `SHA256SUMS` after extraction. No generated sacred text or attributed
speech is included, and the reference scene is not a researched historical
claim about the elephant.
