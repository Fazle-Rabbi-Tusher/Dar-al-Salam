# The realistic gold caravan

The current scene follows the owner's marked elephant reference: compact
relaxed ears, a heavy dark-gray body, medium curved ivory tusks, a hanging
trunk, an embroidered gold forehead caparison, an enclosed arched golden
palanquin, a shallow domed roof and a gold standard. The elephant carries
balanced gold baskets on a crimson drape. Its broad feet, tapered legs,
curved ears, trunk, tail and loads are actual articulated 3D geometry.

The camel has a fuller barrel and shoulder, a curved neck, shaped muzzle,
upper lip, nostrils, heavy eyelids, tapered legs and two-toed feet. The horse
has muscular quarters, withers, a deep barrel, flowing mane and tail, detailed
bridle and saddlecloth. The saddle and mounted rider's seated joints rise
together. The six carriers and guards use curved anatomy, original generated
facial artwork at finer sampling, natural garment folds and woven materials.
Mansa Musa keeps his face, white turban, ivory robe, red mantle, necklaces and
disk staff. His standing avatar, named card and review fields are unchanged.

## Asset inventory

The bundle has seventeen cargo/animal models and ten figure/rig models:

- `elephant-loaded`, `camel-loaded`, `howdah` and `treasury-collection`.
- `gold-bowl`, `gold-basket`, `lidded-basket`, `treasure-chest`, `coin-hoard`,
  `gold-ingots`, `gold-urn`, `gold-ewer`, `gold-pouches`, `rolled-carpets`,
  `water-skins`, `rope-coils` and `jewelry-tray`.
- Six individual supporting people, the paired chest carriers, the gold-sharing
  pair, mounted Mansa Musa and a guard, under `people/`.

The treasury includes handles, wicker ribs, gold rims, engraved bands, locks,
bolts, separate chest lids, round coins, ingots, necklaces, beads, tied bags,
water skins, bound rugs and rope coils. The palanquin has actual arched
openings, grilles, curtains, corner columns, relief panels, cornices, fringe,
a domed roof and finials. No generated text or sacred symbols are present.
The scene is an artistic reconstruction, not a newly researched historical
claim about the elephant.

## Materials and the portable bundle

Fine albedo PNGs and derived tangent-space normal maps provide skin creases,
fur, woven cloth, wicker, leather and gold engraving. Materials have separate
roughness and metalness. Explicit UVs keep fine details continuous across
curved surfaces. The native world samples the same PNGs through a shared UV
atlas and uses continuous vertex normals. Warm sunlight, cool fill, softened cast
shadows and a restrained sand surface ground the portable scene.

Every GLB uses meters and standard `KHR_mesh_quantization`: 16-bit positions,
14-bit UVs and 12-bit normals. Named attachment nodes, all authored animation
keys and resting-pose channels are retained. There is no mesh simplification
or animation resampling. The standard extension needs no extra decoder in the
included Three.js loader. `tools/optimize-gold-cargo.mjs` pins gltfpack 1.3.0.

The GLBs share unchanged PNG material files under `textures/`, reducing the
complete ZIP size without lowering their texture resolution. Keep the model
folders and textures together when importing or copying them. The archive
includes all dependencies; the viewer uses no CDN. `manifest.json` records
model and texture sizes and SHA-256 checksums. Older self-contained exports
remain in their original model folders and published download packs.
For a downstream tool that requires embedded textures, use the refined export
script's output before running the bundle optimization step.

## Animation and native integration

Both animals contain `Walk` and `Rest` over the deterministic 12 Hz, 240-tick
master loop. glTF interpolates the transforms between samples. Walking uses
actual root translation; support feet are solved in world space, including
turns. Swing feet lift and settle. Paired loads, straps, cabin and drape follow
the spine coherently. Rest plants all feet while breathing, ears, trunk, tail
and the gold standard continue subtle motion.

The native elephant waits clear of the original guard route. Four loaded
camels follow their established procession paths. Detailed treasury props
sit clear of the six carriers' foreground delivery lanes. The culling height
covers the standard. The original plot, donation stops and hand-contact/coin
ownership sequence remain intact.

The portable assembled scene depicts a giving stop: the animals rest, the
giver and recipient exchange a coin, and the standard and banner move gently.
Other carriers and guards hold their positions there; their individual GLBs
retain their animation. The native world keeps the moving caravan routine.

## View and reuse

From the extracted ZIP root, or `web/public/models/gold-cargo`, run:

```sh
python3 -m http.server 8150
```

Open `http://localhost:8150/index.html`. Select the assembled scene, an animal,
an individual person or a prop. Drag to orbit, scroll to zoom, choose front,
rear, side, elevated, bird's-eye or detail views, play/pause, scrub the timeline
or switch the animals between Walk and Rest. Reduced motion starts paused.

```js
import { createGoldCargo } from './GoldCargoComponent.js';
const cargo = await createGoldCargo({
  variant: 'elephant-loaded',
  mode: 'Walk',
});
scene.add(cargo.object3D);
cargo.setFrame(36.5);
cargo.setMode('Rest');
// cargo.dispose() when removing it
```

The MP4 is a twenty-second actual-model tour. The separately published HD
version retains the full recorded resolution. Transparent PNG directions and
`elephant-reference-match.png` also render the actual meshes. The generated
`elephant-reference-study.png` is design-reference artwork, clearly separate
from those mesh previews. Original generated material and facial PNGs are
preserved in the repository; prepared material maps and relevant source
artwork/scripts are included in the bundle. Source scripts target a repository
checkout; viewing the extracted bundle needs no build step.

Rebuild using `tools/prepare-gold-cargo-refinement.mjs`,
`tools/prepare-gold-carrier-art.mjs`, then:

```sh
node --import tsx tools/export-refined-gold-cargo.mjs
node tools/optimize-gold-cargo.mjs
node tools/capture-gold-cargo.mjs
node tools/package-gold-cargo.mjs /tmp/gold-caravan-realistic-3d.zip
```

Validation covers loop closure, reference-specific proportions, planted feet,
finite geometry and transforms, attached loads, native plot/culling bounds,
unchanged material pixels, model/texture checksums and actual browser/native
playback. Archive checks read every entry and enforce less than 30,000,000
bytes. Delivery is verified with a real downloaded ZIP and its checksums.
