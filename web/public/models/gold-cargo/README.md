# The realistic gold caravan

Seventeen cargo/animal models, ten refined figure/rig files, shared material
textures, an assembled giving scene, rendered directions, actual animation
previews, source artwork/scripts and a reusable Three.js component.

Start a server in this folder:

```sh
python3 -m http.server 8150
```

Open **http://localhost:8150/index.html**. Drag to orbit, scroll to zoom,
select people/props/animals, change camera angle, play/pause or scrub time.
Choose Walk or Rest for either animal. Reduced-motion startup is paused.
All dependencies are local. Keep `textures/` and `people/` with the models;
the individual GLBs use the shared PNG files. Standard glTF geometry
quantization is supported by the included loader without another decoder.

The elephant follows the owner's marked reference: smaller relaxed ears,
dark hide, medium curved tusks, hanging trunk, gold forehead cloth, enclosed
arched palanquin, domed roof and a gold standard. People, horse, camel and
materials have more natural anatomy, cloth volume and fine pixel detail.
The current Mansa Musa likeness, costume and draft status are preserved.

`gold-cargo-animation.mp4` records the actual models. `sprites/` contains
transparent rendered directions; `gold-cargo-scene.png` shows the complete
scene and `elephant-reference-match.png` shows the revised elephant. Both
animals have full twenty-second Walk/Rest clips. The complete scene depicts a
giving stop; individual people retain their own carrying and giving motions.

`GoldCargoComponent.js` exports `createGoldCargo({ variant, mode })` with
`object3D`, `setFrame`, `setMode` and `dispose`. `manifest.json` records model
and material integrity. The source scripts target a repository checkout;
the exported viewer works directly from this folder. See
`source/docs/gold-cargo-3d.md` for details and `SHA256SUMS` after extraction.
The reference study is design artwork, distinct from actual mesh previews.
No generated sacred writing or attributed speech is included.
