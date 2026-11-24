import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

/** Reusable articulated Three.js component. Call setFrame(worldFrame) to share
 * Dar al-Salam's deterministic 12 Hz / 240-tick clock, or update(dt) in a
 * standalone viewer. Model transforms use meters. */
export async function createMansaCaravan({
  variant = 'mali-gold-caravan',
  assetBase = new URL('./', import.meta.url),
  playing = true,
} = {}) {
  const allowed = [
    'mali-gold-caravan',
    'mansa-musa-standing',
    'mansa-musa-mounted',
    'mali-guard',
  ];
  if (!allowed.includes(variant)) throw new Error('Unknown caravan model');
  const gltf = await new GLTFLoader().loadAsync(
    new URL(variant + '.glb', assetBase).href,
  );
  const object3D = gltf.scene,
    mixer = new THREE.AnimationMixer(object3D);
  for (const clip of gltf.animations) mixer.clipAction(clip).play();
  object3D.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return {
    object3D,
    mixer,
    duration: 20,
    setPlaying(on) {
      playing = !!on;
    },
    setTime(seconds) {
      mixer.setTime(((seconds % 20) + 20) % 20);
    },
    setFrame(frame) {
      this.setTime((((frame % 240) + 240) % 240) / 12);
    },
    update(deltaSeconds) {
      if (playing) mixer.update(deltaSeconds);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(object3D);
      const geometry = new Set(),
        materials = new Set();
      object3D.traverse((o) => {
        if (o.isMesh) {
          geometry.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
      for (const g of geometry) g.dispose();
      for (const m of materials) m.dispose();
      object3D.removeFromParent();
    },
  };
}
