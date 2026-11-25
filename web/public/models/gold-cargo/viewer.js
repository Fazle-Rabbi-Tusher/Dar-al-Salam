import * as T from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createGoldCargo } from './GoldCargoComponent.js';

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
  new T.MeshStandardMaterial({ color: '#ac9167', roughness: 1 }),
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
  'procession-scene':
    'The caravan at a giving stop: loaded animals, gold carriers and the detailed treasury. The existing Mansa Musa design is preserved.',
  'elephant-loaded':
    'A golden howdah, embroidered saddlecloth, balanced gold baskets, ropes, bells, ivory tusks and a moving trunk.',
  'camel-loaded':
    'An adult dromedary with loaded wicker panniers, a patterned rug, knotted straps, a nose harness and bells.',
  'treasury-collection':
    'Open engraved chests, round coins, ingots, baskets, vessels, tied pouches, ropes and jewelry.',
};
const action = document.getElementById('action');
let followed = null;
function followAnimal() {
  if (!component?.anchor) return;
  const next = new T.Vector3();
  component.anchor.getWorldPosition(next);
  if (followed) {
    const delta = next.clone().sub(followed);
    camera.position.add(delta);
    controls.target.add(delta);
    center.add(delta);
  }
  followed = next;
}

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
function setTime(t, draw = true) {
  component?.setFrame(t * 12);
  followAnimal();
  updateControls();
  if (draw) render();
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
  const human =
    select.value.startsWith('people/') &&
    component.object3D.getObjectByName('head');
  const elephant = component.object3D.getObjectByName('elephant-head');
  const camel = component.object3D.getObjectByName('camel-spine');
  if (name === 'portrait' && (human || elephant || camel)) {
    playing = false;
    updateControls();
    component.object3D.updateMatrixWorld(true);
    const target = new T.Vector3();
    if (human) {
      human.getWorldPosition(target);
      camera.position.copy(target).add(new T.Vector3(0.12, 0.05, 0.65));
    } else if (elephant) {
      target.set(0, 0, 16).applyMatrix4(elephant.matrixWorld);
      camera.position.copy(target).add(new T.Vector3(1.7, 0.5, 2.6));
    } else {
      target.set(0, 48, 67).applyMatrix4(camel.matrixWorld);
      camera.position.copy(target).add(new T.Vector3(0.9, 0.25, 1.4));
    }
    controls.target.copy(target);
  } else {
    controls.target.copy(center);
    const v = new T.Vector3(...(dirs[name] || dirs.isometric))
      .normalize()
      .multiplyScalar(radius * (name === 'portrait' ? 0.65 : 1));
    camera.position.copy(center).add(v);
  }
  render();
}
async function loadModel(name) {
  const id = ++request;
  status.hidden = false;
  status.textContent = 'Loading the caravan…';
  const next = await createGoldCargo({
    variant: name,
    mode: action.value,
    onProgress: (n) => {
      status.textContent = 'Preparing the caravan… ' + n + ' assets ready';
    },
  });
  if (id !== request) {
    next.dispose();
    return;
  }
  component?.dispose();
  component = next;
  scene.add(component.object3D);
  select.value = name;
  component.setFrame(0);
  followed = null;
  followAnimal();
  action.disabled = !component.modes.length;
  const box = new T.Box3().setFromObject(component.object3D),
    size = box.getSize(new T.Vector3());
  center = box.getCenter(new T.Vector3());
  radius = Math.max(size.x, size.y, size.z) * 1.95;
  document.getElementById('description').textContent =
    descriptions[name] || name.split('/').at(-1).replaceAll('-', ' ');
  document.getElementById('download').href =
    name === 'procession-scene' ? 'manifest.json' : name + '.glb';
  document.getElementById('download').textContent =
    name === 'procession-scene'
      ? 'View the asset inventory'
      : 'Download selected 3D asset';
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
document.getElementById('overview').onclick = async () => {
  playing = false;
  await loadModel('procession-scene');
  setTime(1);
  angle('isometric');
};
function fail(e) {
  status.hidden = false;
  status.textContent = 'Could not load this asset: ' + e.message;
  console.error(e);
}
window.addEventListener('resize', resize);
renderer.setAnimationLoop((now) => {
  const dt = last === undefined ? 0 : Math.min(0.1, (now - last) / 1000);
  last = now;
  if (component && playing) {
    component.setFrame((component.time + dt) * 12);
    followAnimal();
    updateControls();
    dirty = true;
  }
  const changed = controls.update();
  if (dirty || changed) {
    renderer.render(scene, camera);
    dirty = false;
  }
});
window.__goldCargo = {
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
action.onchange = () => {
  component?.setMode(action.value);
  followAnimal();
  render();
};
resize();
const requested = new URLSearchParams(location.search).get('model');
if ([...select.options].some((option) => option.value === requested))
  select.value = requested;
loadModel(select.value).catch(fail);
