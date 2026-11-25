import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

export const variants = [
  'overhead-gold-bearer',
  'bowl-gold-bearer',
  'chest-porter-rust',
  'chest-porter-indigo',
  'banner-attendant',
  'elder-recipient',
  'paired-chest-carriers',
  'gold-handover-pair',
  'gold-carriers-ensemble',
];

/** Actual articulated 3D meshes; use setFrame(frame) with the world's 12 Hz clock. */
export async function createGoldCarriers({
  variant = 'gold-carriers-ensemble',
  assetBase = new URL('./', import.meta.url),
  playing = true,
} = {}) {
  if (!variants.includes(variant)) throw Error('Unknown supporting character');
  const gltf = await new GLTFLoader().loadAsync(
    new URL(variant + '.glb', assetBase).href,
  );
  const object3D = gltf.scene,
    mixer = new THREE.AnimationMixer(object3D);
  let seconds = 0;
  for (const clip of gltf.animations) mixer.clipAction(clip).play();
  object3D.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const api = {
    object3D,
    mixer,
    clips: gltf.animations,
    duration: 20,
    setPlaying(on) {
      playing = !!on;
    },
    setTime(next) {
      seconds = ((next % 20) + 20) % 20;
      mixer.setTime(seconds);
      object3D.updateMatrixWorld(true);
    },
    setFrame(frame) {
      api.setTime(frame / 12);
    },
    update(delta) {
      if (playing) api.setTime(seconds + delta);
    },
    get time() {
      return seconds;
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
      geometry.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      object3D.removeFromParent();
    },
  };
  api.setFrame(0);
  return api;
}
