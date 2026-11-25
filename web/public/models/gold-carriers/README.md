# The people and gold carriers

Six individual, articulated **3D pixel-art characters** for the mounted gold
procession: an overhead bowl carrier, an ivory-robed bowl bearer, rust and indigo
chest porters, a banner attendant and an elder recipient. Their curved faces
sample six different generated portraits; cloth samples and actual folds provide
depth around the entire body. These are meshes, rather than camera-facing images.

Nine self-contained animated glTF 2.0 binary models are included: the six people,
the two porters with their shared chest, the gold-sharing pair, and the complete
six-person supporting cast. Units are meters. Each carries a 20-second animation
on the project's 12 Hz, 240-tick clock, with interpolated rigid joint motion.

The bowl carrier steadies his load over a padded head cushion. Four porter hands
stay registered to two poles beneath one shared chest. The giver turns toward
the elder, their right hands meet and one coin changes ownership at contact.
The elder brings it toward a satchel. Feet use a planted support phase, and the
procession eases into and out of its stops. The flag has a gentle periodic sway.

Open `gold-carriers-animation.mp4` for a 20-second tour of the real models, or the
small looping GIF. The individual transparent PNGs under `sprites/` are rendered
from the same meshes in four directions; the 3D viewer rotates continuously.
`character-lineup.png` shows the six people at a consistent physical scale.

For the interactive viewer, serve the extracted folder:

```sh
python3 -m http.server 8140
```

Open `http://localhost:8140/index.html`. Choose a person or group, rotate, zoom,
pause and scrub. Reduced-motion preferences start paused. The local Three.js
modules are bundled, with their MIT license; no CDN is required.

`GoldCarriersComponent.js` exports `createGoldCarriers({ variant })`. Add its
`object3D` to your scene and call `setFrame(worldFrame)` to share the native
clock, or `update(deltaSeconds)` for independent playback. `setTime`,
`setPlaying` and `dispose` are also available. Individual porter assets are
parts of the two-person load; use `paired-chest-carriers.glb` for the shared chest.

The main Dar al-Salam world also includes this six-person cast in its existing
Mansa Musa procession. The earlier MP4/GIF illustration remains its own layered
artwork; this pack supplies reusable people, not a replacement for its painted
background or a new crowned ruler. Existing named-character review remains a
draft; these supporting figures are anonymous illustrative reconstructions.

Original source PNG, generated color maps, geometry, choreography, export,
capture and packaging code are included under `source/`. Rebuild those scripts
from the repository checkout with its Node dependencies. `SHA256SUMS` lists every
pack file. The packer verifies every archive entry and rejects ZIPs of
30,000,000 bytes or more.
