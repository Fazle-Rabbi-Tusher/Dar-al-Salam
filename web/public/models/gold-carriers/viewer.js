import * as T from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createGoldCarriers } from './GoldCarriersComponent.js';

const host = document.getElementById('view');
const renderer = new T.WebGLRenderer({
  antialias: false,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
host.append(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color('#24271f');
scene.add(new T.HemisphereLight('#fff0ce', '#5b606a', 1.65));
const key = new T.DirectionalLight('#ffe7bf', 2.8);
key.position.set(-5, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0003;
Object.assign(key.shadow.camera, {
  left: -10,
  right: 10,
  top: 10,
  bottom: -10,
  near: 0.1,
  far: 40,
});
scene.add(key);
const fill = new T.DirectionalLight('#c9d9e5', 1);
fill.position.set(5, 4, -3);
scene.add(fill);
const rim = new T.DirectionalLight('#edcf8c', 1.5);
rim.position.set(-2, 6, -6);
scene.add(rim);
const studio = new T.Scene();
studio.background = new T.Color('#77766d');
for (const [x, y, z, w, h] of [
  [-4, 5, 4, 4, 7],
  [5, 3, -3, 3, 6],
  [0, 8, 0, 6, 2],
]) {
  const card = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ color: '#fff2d8', side: T.DoubleSide }),
  );
  card.position.set(x, y, z);
  card.lookAt(0, 1, 0);
  studio.add(card);
}
const pmrem = new T.PMREMGenerator(renderer),
  environment = pmrem.fromScene(studio, 0.05);
scene.environment = environment.texture;
scene.environmentIntensity = 0.65;
pmrem.dispose();
studio.traverse((o) => {
  if (o.isMesh) {
    o.geometry.dispose();
    o.material.dispose();
  }
});
const floor = new T.Mesh(
  new T.PlaneGeometry(70, 70),
  new T.MeshStandardMaterial({ color: '#716148', roughness: 1 }),
);
floor.name = 'studio-floor';
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.004;
floor.receiveShadow = true;
scene.add(floor);
const camera = new T.PerspectiveCamera(34, 1, 0.02, 200),
  controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 0.35;
controls.maxDistance = 40;
let dirty = true;
controls.addEventListener('change', () => {
  dirty = true;
});
const select = document.getElementById('model'),
  play = document.getElementById('play'),
  slider = document.getElementById('time'),
  clock = document.getElementById('clock'),
  status = document.getElementById('status');
let component,
  center = new T.Vector3(0, 1, 0),
  radius = 3.7,
  playing = !matchMedia('(prefers-reduced-motion: reduce)').matches,
  last,
  request = 0;
const descriptions = {
  'overhead-gold-bearer':
    'Both raised hands support a gold bowl balanced on a padded head cushion.',
  'bowl-gold-bearer':
    'A wrapped ivory robe, supported gold bowl and a right-handed coin-giving gesture.',
  'gold-handover-pair':
    'The bearer and elder meet right hands, transfer one gold coin and draw back calmly.',
  'paired-chest-carriers':
    'Two synchronized porters support one shared treasure chest on two wooden poles.',
  'chest-porter-rust':
    'The rust-clothed porter, exported individually for use with the shared chest rig.',
  'chest-porter-indigo':
    'The indigo-clothed porter, exported individually for use with the shared chest rig.',
  'banner-attendant':
    'A geometric cloth banner with gentle fabric movement and a steady pole.',
  'elder-recipient':
    'A distinct elder reaches with his right hand, accepts a coin and draws it to his satchel.',
  'gold-carriers-ensemble':
    'All six people share the same deterministic procession route, loads and gold handover.',
};
function render() {
  controls.update();
  renderer.render(scene, camera);
  dirty = false;
}
function resize() {
  const w = host.clientWidth,
    h = host.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  render();
}
function updateControls() {
  play.textContent = playing ? 'Pause' : 'Play';
  play.setAttribute(
    'aria-label',
    playing ? 'Pause animation' : 'Play animation',
  );
  slider.value = component?.time || 0;
  clock.value = (component?.time || 0).toFixed(1) + ' / 20s';
}
function setTime(t) {
  component?.setTime(t);
  updateControls();
  render();
}
function angle(name) {
  const dirs = {
    front: [0, 0.16, 1],
    rear: [0, 0.16, -1],
    left: [-1, 0.18, 0],
    right: [1, 0.18, 0],
    isometric: [0.8, 0.5, 1],
    bird: [0.18, 1, 0.18],
  };
  if (name === 'portrait' && select.value !== 'gold-carriers-ensemble') {
    component.object3D.updateMatrixWorld(true);
    const head = component.object3D.getObjectByName('head'),
      target = new T.Vector3();
    head.getWorldPosition(target);
    controls.target.copy(target);
    camera.position.copy(target).add(new T.Vector3(0.12, 0.05, 0.65));
  } else {
    controls.target.copy(center);
    const v = new T.Vector3(...(dirs[name] || dirs.isometric))
      .normalize()
      .multiplyScalar(radius);
    camera.position.copy(center).add(v);
  }
  render();
}
async function loadModel(name) {
  const id = ++request;
  status.hidden = false;
  status.textContent = 'Loading 3D character…';
  const next = await createGoldCarriers({ variant: name, playing: false });
  if (id !== request) {
    next.dispose();
    return;
  }
  component?.dispose();
  component = next;
  scene.add(component.object3D);
  select.value = name;
  component.setFrame(name === 'gold-carriers-ensemble' ? 8 : 0);
  const box = new T.Box3().setFromObject(component.object3D),
    size = box.getSize(new T.Vector3());
  center = box.getCenter(new T.Vector3());
  radius = Math.max(size.x, size.y, size.z) * 1.95;
  document.getElementById('description').textContent = descriptions[name];
  document.getElementById('download').href = name + '.glb';
  angle('isometric');
  updateControls();
  status.hidden = true;
}
play.onclick = () => {
  playing = !playing;
  updateControls();
};
slider.oninput = () => setTime(+slider.value);
select.onchange = () => loadModel(select.value).catch(fail);
document
  .querySelectorAll('[data-angle]')
  .forEach((b) => (b.onclick = () => angle(b.dataset.angle)));
document.getElementById('handover').onclick = async () => {
  playing = false;
  await loadModel('gold-handover-pair');
  setTime(1);
  angle('isometric');
};
function fail(e) {
  status.hidden = false;
  status.textContent = 'Could not load the character: ' + e.message;
  console.error(e);
}
window.addEventListener('resize', resize);
renderer.setAnimationLoop((now) => {
  const dt = last === undefined ? 0 : Math.min(0.1, (now - last) / 1000);
  last = now;
  if (component && playing) {
    component.setTime(component.time + dt);
    updateControls();
    dirty = true;
  }
  const changed = controls.update();
  if (dirty || changed) {
    renderer.render(scene, camera);
    dirty = false;
  }
});
window.__goldCarriers = {
  renderer,
  scene,
  camera,
  controls,
  loadModel,
  setTime,
  angle,
  pause() {
    playing = false;
    updateControls();
  },
  play() {
    playing = true;
    updateControls();
  },
  get model() {
    return component?.object3D;
  },
  get component() {
    return component;
  },
  get size() {
    return new T.Box3()
      .setFromObject(component.object3D)
      .getSize(new T.Vector3())
      .toArray();
  },
  get time() {
    return component?.time;
  },
};
resize();
loadModel(select.value).catch(fail);
