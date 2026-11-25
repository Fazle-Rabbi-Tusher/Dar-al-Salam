# Loaded animals and the gold treasury

The owner's procession reference supplies the cargo direction: an elephant with
a golden passenger canopy, heavily loaded baskets, gold vessels, open chests,
coins and travel equipment. These are actual rotatable meshes with sampled
pixel-art materials. They extend the existing people pack and native caravan;
the earlier painted procession remains a separate illustration.

## Assets

The pack has seventeen new self-contained GLBs in meters:

| Model                                                         | Details                                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elephant-loaded`                                             | Curved body, thick ears, articulated trunk, tusks, toenails, tail, head harness, hanging bells, embroidered drape, two balanced gold panniers and an ornate howdah. |
| `camel-loaded`                                                | Adult dromedary, two-toed feet, hump, nose harness, buckles, bells, rug and two woven gold baskets.                                                                 |
| `howdah`                                                      | Reusable golden platform, pointed side arches, solid relief panels, lattice, cushions, bolsters, corner columns, eight-panel roof, fringe and finial.               |
| `gold-bowl`, `gold-basket`, `lidded-basket`                   | Thick rims, actual handles, woven ribs, lids where applicable and piles of round coins.                                                                             |
| `treasure-chest`                                              | Open wooden chest, separate hinged lid, gilded bands, bolts, lock, handles and gold contents.                                                                       |
| `coin-hoard`, `gold-ingots`                                   | Individually modeled coins and stacked ingots.                                                                                                                      |
| `gold-urn`, `gold-ewer`                                       | Curved vessels with handles, spout, neck and lid details.                                                                                                           |
| `gold-pouches`, `rolled-carpets`, `water-skins`, `rope-coils` | Tied bags, bound rugs, leather travel containers and coiled rope.                                                                                                   |
| `jewelry-tray`                                                | Lined tray with necklaces, beads and rings.                                                                                                                         |
| `treasury-collection`                                         | An assembled collection of the gold props.                                                                                                                          |

Ten existing figure/rig files are included: the six people, the paired chest
carriers, the gold-sharing pair, mounted Mansa Musa and a guard. These original
GLBs remain byte-for-byte unchanged. The component substitutes the detailed
new bowls and chest at their existing load mounts. The complete scene assembles
these people with the loaded animals, guards and treasury at a giving stop.
Each human is also individually selectable in the viewer.

Mansa Musa retains his current white turban, ivory robe, red mantle, necklaces
and disk staff. Only his presentation scale in this assembled viewer is 1.2;
his source mesh, native avatar, card and approval metadata are unchanged.
The elephant is an artistic element requested from the reference, not a new
researched historical claim. No names, biographies or approvals were added.

## Animation and native integration

Both animals contain `Walk` and `Rest`, sampled on the deterministic 12 Hz,
240-tick master loop, with linearly interpolated joint transforms in glTF.
Walking uses actual root translation around a closed route. Support feet are
solved in world space, including turns; swing feet lift and settle. Canopies,
straps and paired loads share the moving spine. Rest plants all four feet while
the head, ears, trunk, tail and breathing continue. Constant resting channels
are exported when they differ from the walking bind pose.

The native elephant waits on a cleared part of the existing plot, rather than
walking across the older guard route. The four original pack camels now use the
loaded adult model on their existing routes. The treasury and travel equipment
sit clear of the six carriers' established foreground delivery lanes. Culling
height covers the whole elephant canopy. No new building footprint is needed.

The assembled portable scene is a giving stop: animals rest, the giver and
recipient exchange a coin, and the banner fabric moves subtly. Carriers and
guards hold their places there. Their original individual animated GLBs remain
available, and the native world retains the moving caravan routine.

## Viewer and reuse

From `web/public/models/gold-cargo`, or from the extracted ZIP root, run:

```sh
python3 -m http.server 8150
```

Open `http://localhost:8150/index.html`. The viewer uses local Three.js files,
supports orbit, zoom, front/rear/side, elevated and bird's-eye views, close-up,
play, pause, scrubbing and animal action selection. Reduced motion starts it
paused. It does not need a CDN. Use an HTTP server rather than `file://`.

```js
import { createGoldCargo } from './GoldCargoComponent.js';
const cargo = await createGoldCargo({
  variant: 'elephant-loaded',
  mode: 'Walk',
});
scene.add(cargo.object3D);
cargo.setFrame(36.5); // caller supplies deterministic ticks
cargo.setMode('Rest');
// cargo.dispose() when removing the component
```

The generated original six-swatch material PNG is preserved, checksummed, in
`art/sprites/source/gold-cargo`. The sampling script creates the documented
pixel maps; geometry colors sample those maps without editing the original.
The new generator and export/capture/package scripts are included as source
for use in a repository checkout. The viewer and model binaries work directly
from the extracted archive without rebuilding the repository.

The MP4/GIF record the real articulated models over a twenty-second tour.
Transparent PNGs include four views of each animal, the howdah and treasury,
plus one view of each other prop. The poster shows the assembled giving stop.
These views all render the same meshes, not separately generated turnarounds.

Validation covers loop closure, planted support feet, finite geometry and joint
transforms, fixed load attachments, native plot/culling bounds, original art
checksums, exported model integrity, real browser playback and native GPU
animation. Packaging hashes every entry and enforces a strict limit below
30,000,000 bytes. GitHub delivery is checked with an actual downloaded ZIP.
