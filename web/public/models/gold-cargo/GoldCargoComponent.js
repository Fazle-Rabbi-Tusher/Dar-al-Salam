import * as T from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

/** Reusable cargo, animals and assembled procession. Units are meters. */
export async function createGoldCargo({
  variant = 'procession-scene',
  mode = 'Rest',
  assetBase = new URL('./', import.meta.url),
  onProgress = () => {},
} = {}) {
  const manifest = await fetch(new URL('manifest.json', assetBase)).then(
    (r) => {
      if (!r.ok) throw Error('Cargo manifest missing');
      return r.json();
    },
  );
  const allowed = [
    ...manifest.models.map((m) => m.id),
    ...manifest.people.map((id) => 'people/' + id),
    'procession-scene',
  ];
  if (!allowed.includes(variant)) throw Error('Unknown cargo model');
  const root = new T.Group();
  root.name = variant;
  const loader = new GLTFLoader(),
    cache = new Map(),
    actors = [];
  let ready = 0,
    seconds = 0;
  async function source(file) {
    if (!cache.has(file))
      cache.set(
        file,
        loader
          .loadAsync(new URL(file + '.glb', assetBase).href)
          .then((data) => {
            onProgress(++ready);
            return data;
          }),
      );
    return cache.get(file);
  }
  async function instance(
    file,
    at = [0, 0, 0],
    angle = 0,
    scale = 1,
    clock = 'cycle',
    clip = mode,
  ) {
    const data = await source(file),
      object = data.scene.clone(true),
      holder = new T.Group();
    holder.name = file + '-placement';
    holder.position.fromArray(at);
    holder.rotation.y = angle;
    holder.scale.setScalar(scale);
    holder.add(object);
    root.add(holder);
    object.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const mixer = new T.AnimationMixer(object),
      entry = {
        object,
        holder,
        mixer,
        clips: data.animations,
        clock,
        action: null,
      };
    actors.push(entry);
    function choose(name) {
      mixer.stopAllAction();
      const chosen =
        data.animations.find((c) => c.name === name) || data.animations[0];
      entry.action = chosen ? mixer.clipAction(chosen).play() : null;
    }
    entry.choose = choose;
    choose(clip);
    return entry;
  }
  async function replaceLoads(entry) {
    for (const [targetName, id] of [
      ['overhead-gold-bowl', 'gold-bowl'],
      ['supported-chest-gold-bowl', 'gold-bowl'],
      ['shared-treasure-chest', 'treasure-chest'],
    ]) {
      const target = entry.object.getObjectByName(targetName);
      if (!target) continue;
      const replacement = (await source(id)).scene.clone(true),
        placement = new T.Group();
      placement.name = 'detailed-' + targetName;
      placement.position.copy(target.position);
      placement.quaternion.copy(target.quaternion);
      placement.scale.copy(target.scale);
      replacement.scale.multiplyScalar(42);
      placement.add(replacement);
      target.parent.add(placement);
      target.visible = false;
      replacement.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      if (id === 'treasure-chest') {
        const lid = entry.object.getObjectByName('chest-open-lid');
        if (lid) lid.visible = false;
      }
    }
  }
  let anchor = null;
  if (variant === 'procession-scene') {
    const jobs = [
      ['elephant-loaded', [-4.8, 0, -5], 0, 1, 'cycle', 'Rest'],
      ['camel-loaded', [-3.6, 0, -0.7], 0.05, 0.9, 'cycle', 'Rest'],
      ['camel-loaded', [3.4, 0, -2.8], -0.12, 0.9, 'cycle', 'Rest'],
      ['treasury-collection', [-2.9, 0, 2.7], 0, 1, 'still', ''],
      ['rolled-carpets', [4.2, 0, 0.1], 0.2, 0.85, 'still', ''],
      ['water-skins', [3.4, 0, -0.1], 0, 1, 'still', ''],
      ['gold-bowl', [2, 0, 3.7], 0, 1, 'still', ''],
      ['gold-basket', [-3, 0, 0.9], 0, 0.9, 'still', ''],
      ['people/mansa-musa-mounted', [0, 0, 0.8], 0, 1.2, 'still', ''],
      ['people/overhead-gold-bearer', [-0.8, 0, 3.5], 0, 1, 'still', ''],
      ['people/paired-chest-carriers', [1.8, 0, -1.2], 0, 1, 'still', ''],
      ['people/gold-handover-pair', [3.4, 0, 2.5], 0, 1, 'cycle', ''],
      ['people/banner-attendant', [-2.1, 0, -2.8], 0, 1, 'still', ''],
      ...[-0.9, 0.1, 1.1].flatMap((x) => [
        ['people/mali-guard', [x, 0, -4.5], 0, 1, 'still', ''],
        ['people/mali-guard', [x - 0.25, 0, -5.8], 0, 1, 'still', ''],
      ]),
    ];
    const items = await Promise.all(jobs.map((args) => instance(...args)));
    await Promise.all(
      items
        .filter((e) => e.holder.name.startsWith('people/'))
        .map(replaceLoads),
    );
  } else {
    const entry = await instance(variant);
    if (variant.startsWith('people/')) await replaceLoads(entry);
    if (variant === 'elephant-loaded' || variant === 'camel-loaded')
      anchor = entry.object.getObjectByName(
        variant === 'elephant-loaded' ? 'loaded-elephant' : 'loaded-camel',
      );
  }
  const api = {
    object3D: root,
    anchor,
    manifest,
    duration: 20,
    modes:
      variant === 'elephant-loaded' || variant === 'camel-loaded'
        ? ['Walk', 'Rest']
        : [],
    get time() {
      return seconds;
    },
    setFrame(frame) {
      seconds = (((frame % 240) + 240) % 240) / 12;
      for (const entry of actors)
        entry.mixer.setTime(entry.clock === 'still' ? 0 : seconds);
      if (variant === 'procession-scene') {
        const flag = root.getObjectByName('banner-fabric');
        if (flag)
          flag.rotation.y = Math.sin((seconds / 20) * Math.PI * 4) * 0.06;
      }
      root.updateMatrixWorld(true);
    },
    setMode(next) {
      if (!api.modes.includes(next)) throw Error('Unknown animal action');
      mode = next;
      actors.forEach((e) => e.choose(next));
      api.setFrame(seconds * 12);
    },
    dispose() {
      actors.forEach((e) => {
        e.mixer.stopAllAction();
        e.mixer.uncacheRoot(e.object);
      });
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      root.traverse((o) => {
        if (o.isMesh) {
          geometries.add(o.geometry);
          for (const material of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            materials.add(material);
            for (const value of Object.values(material))
              if (value?.isTexture) textures.add(value);
          }
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      cache.clear();
      root.removeFromParent();
    },
  };
  api.setFrame(0);
  return api;
}
