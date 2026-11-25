# People and carriers for the gold procession

The owner requested the people and carriers following the mounted Mansa Musa
scene. The new cast has six distinct anonymous adults and nine actual animated
3D exports. They use the saved realistic pixel-art faces, natural adult
proportions, sampled woven materials, curved anatomy, folded garments and
physical gold. Heads, hands, garments and loads have visible side and rear volume.

| Model                        | Role                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `overhead-gold-bearer.glb`   | Two raised hands steady a bowl over a padded head cushion.  |
| `bowl-gold-bearer.glb`       | An ivory-robed bearer carries a gold bowl and gives a coin. |
| `chest-porter-rust.glb`      | Individual rust-clothed member of the paired carrying rig.  |
| `chest-porter-indigo.glb`    | Individual indigo-clothed member of the paired rig.         |
| `banner-attendant.glb`       | A steady pole with periodic geometric cloth movement.       |
| `elder-recipient.glb`        | A gray-bearded elder reaches, receives and stores the coin. |
| `paired-chest-carriers.glb`  | Both porters, two support poles and one shared open chest.  |
| `gold-handover-pair.glb`     | Both people and a single coin, staged for close inspection. |
| `gold-carriers-ensemble.glb` | The six people on the native procession route.              |

All models are self-contained glTF 2.0 binaries in meters. Every file retains
the full 20-second, 240-tick animation. Body, limb, hand and load transforms
interpolate between the 12 Hz samples. The individual walking assets remove
global route translation for reuse. The paired chest is normalized as one rig;
both porters keep their hands at its four support points. The handover pair is
staged with planted feet, while the native bearer follows the procession between
stops and turns toward the recipient during their exchange.

The cast is appended to `caravanActors` and shares the existing native GPU
renderer. Its geometry is cached, while animation updates transforms. It stays
inside the caravan plot, using separated delivery loops across the clear
foreground of the market. These loops avoid the older guard route, stalls and
each other; a shared loop had brought a carrier too close to a guard on return.
The original ruler, guards, four camels, three distribution stops, named card,
approval fields and previous published exports are preserved. The native cast
now contains 28 humans. The previous layered illustration retains its painted
background; this work supplies separate reusable characters and native meshes.

`packages/shared/carrier-human.ts` builds anatomy, clothing and detailed heads.
`gold-carriers.ts` owns the shared loads and transfer logic. The original
six-panel PNG and its unaltered checksum are in `art/sprites/source/gold-carriers/`.
`tools/prepare-gold-carrier-art.mjs` samples documented face and fabric crops;
facial pixels are not painted in code. Cloth materials use restrained tonal
samples; the source artwork remains unchanged. No generated sacred writing,
historical assertions or attributed speech are added.

The portable viewer and `GoldCarriersComponent.js` are in
`web/public/models/gold-carriers/`. Run a local HTTP server on port 8140 in that
folder, then open its `index.html`. Play, pause, timeline scrubbing, continuous
orbit, front/back/side/three-quarter, bird's-eye and face close-up are supported.
Reduced-motion startup pauses playback. All library dependencies are local.

The preview MP4 is a 20-second, 24 fps tour recorded from these actual models.
Four transparent PNG directions for each person and the load pair accompany
the models, along with a lineup at a consistent physical scale. The GIF is a
smaller preview. These are actual rendered views, not independently generated
turnaround drawings.

Validation covers loop closure, finite transforms, stable geometry, all four
porter grips, right-hand contact and coin ownership, supporting feet, plot
bounds and model checksums. Browser tests load all nine GLBs, rotate them and
exercise play, pause and scrubbing. Native regression checks exercise the
existing ruler card and GPU animation. Archive checks read and hash every entry,
and enforce the strict 30,000,000-byte limit.
