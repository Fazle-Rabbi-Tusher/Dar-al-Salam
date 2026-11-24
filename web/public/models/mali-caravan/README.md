# Mansa Musa — 3D gold caravan

Four animated, three-dimensional GLB models in the owner's pixel-art
style. Each has a 20-second articulated animation; model transforms use meters.

- `mansa-musa-standing.glb`: the ruler, crown, white turban, crimson mantle,
  gold brocade, necklaces and scepter, with walking and giving gestures.
- `mansa-musa-mounted.glb`: Mansa Musa on a black horse, with an animated gait
  and gold handover poses.
- `mali-guard.glb`: a marching Malian guard with an upright lance and buckler.
- `mali-gold-caravan.glb`: the complete ruler, horse, 12 guards, four pack
  camels, gold chests, three stewards and six recipients, with three gold
  distribution stops and a continuous return route.

Faces and royal fabric colors come from image-generated artwork based on the
owner's supplied Mansa Musa illustrations and saved Dar al-Salam references.
They are mapped onto curved 3D geometry. Characters are not billboard sprites.
The clothing, headwear, animals and equipment have volume visible from behind,
from the side, overhead and in perspective.

Open the GLBs in Blender or a glTF-compatible 3D application. To use the included
viewer, serve this directory over HTTP, for example:

```sh
python3 -m http.server 8123
```

Then open `http://localhost:8123/index.html`. Choose a model, drag to orbit,
scroll/pinch to zoom, use the view buttons, pause or scrub the timeline. The
complete caravan opens with a close-up that follows Mansa Musa; Overview frames
the procession. The viewer uses local, MIT-licensed Three.js modules and does
not depend on a CDN.

For a Three.js application:

```js
import { createMansaCaravan } from './MansaCaravanComponent.js';
const caravan = await createMansaCaravan();
scene.add(caravan.object3D);
// Drive from your shared simulation clock:
caravan.setFrame(worldFrame); // 12 ticks per second, wraps at 240
// Or, for independent playback, call caravan.update(deltaSeconds).
```

The native Dar al-Salam integration uploads joint matrices to the GPU; it does
not rebuild the character meshes on every frame. The generated topology,
animation scripts and source artwork are retained in the repository.
The ZIP's `source/` folder provides repository integration references; run its
build scripts from the full Dar al-Salam checkout. The GLBs, local viewer and
Three.js component work independently of that checkout.

This is an illustrative historical reconstruction. The exact faces, uniforms,
escort size, crown and three stops are artistic choices. The character's
biography and advisory approval remain drafts; no religious text, attributed
speech or claim of a verified historical likeness is included.

`manifest.json` records the byte sizes and SHA-256 checksums of every GLB.
