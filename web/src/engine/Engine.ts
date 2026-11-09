import {
  Application,
  Assets,
  Container,
  GlProgram,
  Graphics,
  Mesh,
  MeshGeometry,
  Rectangle,
  Shader,
  Sprite,
  Text,
  Texture,
  TextureStyle,
  UniformGroup,
  type WebGLRenderer,
} from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { globalFrame, frameMap } from '../../../packages/shared/clock';
import { characterState, frameKey } from '../../../packages/shared/script';
import { motionFor } from '../../../packages/shared/motion';
import {
  DISTRICTS,
  districtAt,
  type DistrictMood,
} from '../../../packages/shared/districts';
import { maskHit } from '../../../packages/shared/compositor';
import {
  FACING_DIRECTION,
  PLANET,
  RADIUS_PX,
  WILD,
  WILD_GLSL,
  fitZoom,
  focusFromWorld,
  fromLatLon,
  frame as planetFrame,
  landscapePitch,
  planetToTile,
  project,
  screenFacing,
  tileToPlanet,
  unproject,
  worldFromFocus,
  type Frame,
  type Vec3,
} from '../../../packages/shared/planet';
import {
  manifestSchema,
  type BakedCharacter,
  type FrameMeta,
  type Manifest,
  type Sortable,
} from '../../../packages/shared/schema';
import { MIN_URL_ZOOM, type Camera } from '../../../packages/shared/url';
import { worldFromTile, type Point } from '../../../packages/shared/iso';
import {
  createShipRoute,
  shipState,
  tramState,
  taxiState,
  type ShipRoute,
} from '../../../packages/shared/world-life';
import { WorldEffects, windSample, type WakeSource } from './WorldEffects';
TextureStyle.defaultOptions.scaleMode = 'nearest';

type EventMap = {
  characterClick: string;
  characterHover: string | null;
  cameraChange: Camera;
  progress: number;
  worldFrame: number;
  stats: { fps: number; draws: number; frame: number; visible: number };
  inspect: Record<string, string | number> | null;
  error: string;
};
type Live = {
  sprite: Sprite;
  shadow?: Sprite;
  character: BakedCharacter;
  frame: string;
  depth: number;
};
type Static = {
  sprite: Sprite;
  sortable: Sortable;
  point: Vec3;
  size: number;
  route?: ShipRoute;
};
type ViewState = { lat: number; lon: number; zoom: number };
const MAX_ZOOM = 4,
  MAX_LAT = 1.32;

const vertex = /* glsl */ `
in vec2 aPosition;
out vec2 vPos;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPos = aPosition;
}`;
const f = (n: number) => n.toFixed(6);
const districtMask = (id: Exclude<DistrictMood, 'day'>) => {
  const d = DISTRICTS.find((district) => district.id === id)!;
  return `districtMask(tile, vec2(${d.centre.map(f).join(',')}), vec2(${d.radius.map(f).join(',')}), ${d.shape === 'rectangle' ? 'true' : 'false'})`;
};
// The planet: wraps the quarter's top-down floor onto a sphere, fills the rest
// with grass, lakes and a ring road, then adds soft lighting and a halo.
const fragment = /* glsl */ `
in vec2 vPos;
out vec4 finalColor;
uniform sampler2D uGround;
uniform vec2 uCentre;
uniform float uRadius;
uniform mat3 uRot;
const vec2 MAP_CENTRE = vec2(${f(PLANET.centre[0])}, ${f(PLANET.centre[1])});
const float RADIUS_TILES = ${f(PLANET.radiusTiles)};
uniform vec2 uMapSize;
uniform float uMode;
uniform float uTime;
uniform float uMood;
uniform float uMoodStrength;
uniform vec2 uTram;
uniform vec2 uTaxi;
// Limited, deliberately stepped colours: lime sunlight over deep teal
// woodland, warm sandstone and the reference's clear blue coastal water.
const vec3 DEEP = vec3(0.025, 0.216, 0.337);
const vec3 SEA = vec3(0.027, 0.365, 0.525);
const vec3 SEA_LIGHT = vec3(0.090, 0.627, 0.780);
const vec3 SHALLOW = vec3(0.090, 0.667, 0.706);
const vec3 SHALLOW_LIGHT = vec3(0.420, 0.851, 0.820);
const vec3 FOAM = vec3(0.898, 0.984, 0.953);
const vec3 WET_SAND = vec3(0.663, 0.565, 0.376);
const vec3 SAND = vec3(0.863, 0.757, 0.529);
const vec3 SAND_LIGHT = vec3(0.973, 0.886, 0.675);
const vec3 MEADOW = vec3(0.384, 0.651, 0.267);
const vec3 MEADOW_LIGHT = vec3(0.647, 0.796, 0.325);
const vec3 MEADOW_DARK = vec3(0.224, 0.486, 0.255);
const vec3 FOREST = vec3(0.086, 0.345, 0.263);
const vec3 FOREST_LIGHT = vec3(0.227, 0.478, 0.282);
const vec3 FOREST_DARK = vec3(0.035, 0.188, 0.192);
const vec3 ROCK = vec3(0.247, 0.345, 0.416);
const vec3 ROCK_LIGHT = vec3(0.482, 0.569, 0.592);
const vec3 ROCK_DARK = vec3(0.110, 0.196, 0.275);
const vec3 MOSS = vec3(0.427, 0.624, 0.247);
const vec3 STONE = vec3(0.745, 0.686, 0.525);
const vec3 STONE_DARK = vec3(0.416, 0.447, 0.357);
float hash(vec3 q) {
  // Arithmetic visual noise keeps the same clustered detail without a
  // transcendental call for every sample (important on software WebGL).
  vec3 k = fract(q * vec3(0.1031, 0.1030, 0.0973));
  k += dot(k, k.yxz + 33.33);
  return fract((k.x + k.y) * k.z);
}
${WILD_GLSL}
float patch(vec2 uv, float seed) {
  vec2 cell = floor(uv), k = fract(uv);
  k = k * k * (3.0 - 2.0 * k);
  return mix(mix(hash(vec3(cell, seed)), hash(vec3(cell + vec2(1.0, 0.0), seed)), k.x),
    mix(hash(vec3(cell + vec2(0.0, 1.0), seed)), hash(vec3(cell + 1.0, seed)), k.x), k.y);
}
vec3 flower(float h) {
  return h < 0.28 ? vec3(0.976, 0.682, 0.600)
    : h < 0.57 ? vec3(0.961, 0.965, 0.776)
    : h < 0.8 ? vec3(0.980, 0.792, 0.294)
    : vec3(0.498, 0.788, 0.816);
}
// Ground detail uses small coherent silhouettes: a tuft has blades and a
// shadow, a flower has petals and a centre. It is never white-noise confetti.
vec3 undergrowth(vec3 col, vec2 tile, float cluster, bool wooded) {
  vec2 uv = floor(tile * 16.0) / 16.0 * 1.7;
  vec2 cell = floor(uv), q = fract(uv);
  float seed = hash(vec3(cell, 39.0));
  vec2 centre = vec2(0.24, 0.3) + vec2(seed, fract(seed * 31.0)) * 0.5;
  vec2 leaf = q - centre;
  if (seed > 0.52 && cluster > 0.35) {
    float stalk = abs(leaf.x + leaf.y * 0.28);
    float side = abs(abs(leaf.x) - (0.06 + leaf.y * 0.6));
    if (leaf.y > -0.22 && leaf.y < 0.16 && (stalk < 0.045 || side < 0.04))
      return leaf.y < -0.08 ? (wooded ? MOSS : MEADOW_LIGHT) : (wooded ? FOREST_DARK : MEADOW_DARK);
  }
  if (!wooded && seed < 0.17 && cluster > 0.61) {
    vec2 petals = abs(leaf);
    if (max(petals.x, petals.y) < 0.065) return vec3(0.890, 0.635, 0.224);
    if ((petals.x < 0.068 && petals.y < 0.16) || (petals.x < 0.16 && petals.y < 0.068))
      return flower(fract(seed * 29.0));
    if (leaf.y > 0.0 && leaf.y < 0.28 && abs(leaf.x - 0.05) < 0.04) return MEADOW_DARK;
  }
  return col;
}
float trailDistanceSquared(vec2 p, vec2 a, vec2 b) {
  vec2 edge = b - a;
  float t = clamp(dot(p - a, edge) / dot(edge, edge), 0.0, 1.0);
  vec2 offset = p - a - edge * t;
  return dot(offset, offset);
}
// A little settlement at the edge of the quarter. Worn footpaths join the
// cottage doors to a hand-laid plaza; meadow grows back through its edges.
vec3 villageGround(vec2 pixel, float clumps, float clearing) {
  vec2 p = pixel - vec2(28.0, -6.0);
  vec2 bend = abs(fract(p.yx * vec2(0.085, 0.1)) * 2.0 - 1.0);
  vec2 bent = p + (bend * bend * (3.0 - 2.0 * bend) - 0.5) * 0.48;
  float path = min(trailDistanceSquared(bent, vec2(-6.0, -1.0), vec2(0.0)),
    trailDistanceSquared(bent, vec2(1.0, -3.0), vec2(0.0)));
  path = min(path, trailDistanceSquared(bent, vec2(6.0, 2.0), vec2(0.0)));
  path = min(path, trailDistanceSquared(bent, vec2(-6.0, 5.0), vec2(0.0)));
  path = min(path, trailDistanceSquared(bent, vec2(5.0, 6.0), vec2(0.0)));
  path = min(path, trailDistanceSquared(bent, vec2(0.0, 7.0), vec2(0.0)));
  vec2 plazaPoint = p / vec2(3.4, 2.9);
  float plaza = dot(plazaPoint, plazaPoint);
  float plazaEdge = 0.95 + clumps * 0.13;
  if (plaza < plazaEdge * plazaEdge) {
    vec2 uv = pixel * vec2(1.5, 1.9);
    uv.x += mod(floor(uv.y), 2.0) * 0.5;
    vec2 stone = fract(uv);
    float wear = hash(vec3(floor(uv), 62.0));
    if (stone.x > 0.87 || stone.y > 0.83) return wear > 0.71 ? MOSS : STONE_DARK;
    if (plaza > 0.6241 && wear > 0.67) return MEADOW;
    if (stone.x < 0.07 || stone.y < 0.1) return SAND_LIGHT;
    return wear < 0.3 ? WET_SAND : wear > 0.74 ? SAND : STONE;
  }
  float pathEdge = 0.47 + clumps * 0.25;
  if (path < pathEdge * pathEdge) {
    float grit = hash(vec3(floor(pixel * 16.0), 59.0));
    if (path > 0.1764 && grit > 0.78) return MEADOW;
    if (grit > 0.98) return STONE;
    return clumps > 0.64 ? SAND_LIGHT : clumps < 0.25 ? WET_SAND : SAND;
  }
  vec3 grass = clumps > 0.7 ? MEADOW_LIGHT : clumps < 0.21 ? MEADOW_DARK : MEADOW;
  if (clearing > 0.83 && clumps < 0.55) grass = FOREST_LIGHT;
  return undergrowth(grass, pixel, clumps, false);
}
// Every surface is quantised in world space, so details stay fixed while
// spinning or zooming. Only the sea follows the deterministic world clock.
vec3 wild(vec3 p, vec2 tile) {
  // Texels at the quarter's own floor density (16 per tile).
  vec3 cell = floor(p * ${f(PLANET.radiusTiles * 16)});
  float h = hash(cell), h2 = hash(cell + 17.0);
  vec2 pixel = floor(tile * 16.0) / 16.0;
  float islands = patch(pixel * 0.24, 12.0);
  float clumps = patch(pixel * 0.85, 19.0);
  // The world clock (12 fps frames, 0–239): every motion loops every 240.
  float t = uTime * 6.2831853 / 240.0;
  float land = landField(p, tile);
  if (land < 0.0) {
    float depth = -land + (h - 0.5) * 1.2;
    vec3 col = depth > 9.0 ? DEEP : depth > ${f(WILD.shallows)} ? SEA
      : depth > 2.2 ? SHALLOW : SHALLOW_LIGHT;
    // Broken horizontal ribbons, broad turquoise shelves and dark pools.
    float stripe = sin(p.y * 620.0 + coveField(p) * 6.0 + t * 3.0);
    float dash = sin(p.x * 260.0 - p.z * 210.0 + floor(h * 4.0));
    if (depth > 2.0 && stripe > 0.90 && dash > 0.2)
      col = depth > ${f(WILD.shallows)} ? SEA_LIGHT : SHALLOW_LIGHT;
    if (depth > 9.0 && islands > 0.6) col = mix(DEEP, SEA, 0.45);
    if (depth < 2.0 && clumps > 0.62) col = SHALLOW;
    // Surf: the foam line laps in and out, and a wave rolls in every 5 s.
    float swash = 0.35 + 0.55 * (0.5 + 0.5 * sin(t * 4.0 + coveField(p) * 9.0));
    if (-land < swash && clumps > 0.23) col = FOAM;
    float roll = fract(uTime / 60.0), line = 3.8 * (1.0 - roll);
    if (abs(-land - line) < 0.2 && h > 0.25 + 0.5 * roll) col = mix(col, FOAM, 0.8);
    // Sparkles on the open water.
    if (depth > 3.0 && h2 > 0.996 && sin(t * 8.0 + h * 40.0) > 0.6) col = FOAM;
    return col;
  }
  // The village occupies a tiny part of the sphere. Reject its bounds
  // before evaluating its clearing and six cottage paths.
  if (land > 3.4 && pixel.x > 14.0 && pixel.x < 42.0 && pixel.y > -16.0 && pixel.y < 4.0) {
    vec2 clearingPoint = (pixel - vec2(28.0, -6.0)) / vec2(13.0, 9.0);
    float clearing = dot(clearingPoint, clearingPoint);
    float clearingEdge = 0.91 + clumps * 0.14;
    if (clearing < clearingEdge * clearingEdge)
      return villageGround(pixel, clumps, sqrt(clearing));
  }
  if (abs(p.z) < ${f(WILD.roadHalfWidth)} && land > 0.5) {
    float along = atan(p.y, p.x) * 290.0;
    float across = p.z / ${f(WILD.roadHalfWidth)};
    // In the old woods the rigid ring paving gives way to a narrow brook:
    // irregular moss banks and cyan reflections echo the forest references.
    if (land > 8.0 && mapDistance(tile) > 12.0 && forestField(p) > ${f(WILD.forestAbove - 0.15)}) {
      float bank = abs(across + (clumps - 0.5) * 0.32);
      if (bank > 0.91) return undergrowth(FOREST, pixel, clumps, true);
      if (bank > 0.77) return clumps > 0.5 ? MOSS : ROCK_DARK;
      float ripple = fract(pixel.x * 0.65 + pixel.y * 1.8 + uTime / 80.0);
      if (ripple > 0.88 && h > 0.36) return FOAM;
      if (bank > 0.59 || clumps > 0.65) return SHALLOW_LIGHT;
      return ripple > 0.65 ? SHALLOW : SEA;
    }
    // Staggered, individually shaded cobbles with chipped lit top edges,
    // mossy joints and an irregular grass verge instead of a white ribbon.
    vec2 course = vec2(along + mod(floor(across * 3.0), 2.0) * 0.5, across * 3.0);
    vec2 stone = fract(course);
    float tone = hash(vec3(floor(course), 22.0));
    if (abs(across) > 0.9 - clumps * 0.09) return MOSS;
    if (stone.x > 0.88 || stone.y > 0.83) return tone > 0.6 ? MOSS : STONE_DARK;
    if (stone.x < 0.08 || stone.y < 0.12) return SAND_LIGHT;
    return mix(STONE, WET_SAND, floor(tone * 3.0) * 0.12);
  }
  float edge = land + (h - 0.5) * 0.8;
  if (edge < ${f(WILD.beach)}) {
    if (land < 0.55) return clumps > 0.78 ? SAND : WET_SAND;
    float dune = sin(land * 4.0 + clumps * 2.0);
    if (dune > 0.86 && islands > 0.45) return SAND_LIGHT;
    if (h2 > 0.989) return ROCK;
    return clumps > 0.73 ? SAND_LIGHT : clumps < 0.18 ? WET_SAND : SAND;
  }
  float d = mapDistance(tile), dither = (h - 0.5) * 0.06;
  float rock = rockField(p);
  if (land > 10.0 && d > 6.0 && rock + dither > ${f(WILD.rockAbove)}) {
    // Stepped strata and large angular facets, moss growing along shelves.
    float strata = fract((pixel.x + pixel.y * 0.62) * 0.7 + floor(islands * 5.0) * 0.16);
    if (rock < ${f(WILD.rockAbove + 0.03)} || (strata < 0.18 && clumps > 0.38)) return MOSS;
    if (strata > 0.88 || clumps < 0.17) return ROCK_DARK;
    if (strata < 0.24 && islands > 0.35) return ROCK_LIGHT;
    return islands > 0.66 ? mix(ROCK, ROCK_LIGHT, 0.36) : ROCK;
  }
  if (d > 4.0 && forestField(p) + dither > ${f(WILD.forestAbove)}) {
    vec3 floorColour = islands > 0.62 ? FOREST_DARK : islands < 0.35 ? FOREST_LIGHT : FOREST;
    if (clumps > 0.72 && islands < 0.55) floorColour = MOSS;
    // Warm leaf litter gathers in the deep clearings.
    if (islands > 0.67 && h2 > 0.94) floorColour = vec3(0.333, 0.286, 0.153);
    return undergrowth(floorColour, pixel, clumps, true);
  }
  vec3 lawn = islands > 0.72 ? MEADOW_DARK : islands < 0.24 ? MEADOW_LIGHT : MEADOW;
  if (clumps > 0.68 && islands < 0.5) lawn = mix(MEADOW, MEADOW_LIGHT, 0.5);
  return undergrowth(lawn, pixel, clumps, false);
}
float districtMask(vec2 tile, vec2 centre, vec2 radius, bool rectangular) {
  vec2 q = abs(tile - centre) / radius;
  float edge = rectangular ? max(q.x, q.y) : length(q);
  return 1.0 - smoothstep(0.9, 1.04, edge);
}
// Reflected lights stretch toward the viewer in tile space. Broad broken
// bands stay inside a light's puddle, leaving the surrounding asphalt quiet.
float reflectedLight(vec2 tile, vec2 source, float width, float reach) {
  vec2 delta = tile - source;
  float along = (delta.x + delta.y) * 0.70710678;
  float across = (delta.x - delta.y) * 0.70710678;
  float spread = width * (0.72 + clamp(along / reach, 0.0, 1.0) * 0.42);
  float footprint = smoothstep(-0.2, 0.6, along) * (1.0 - smoothstep(reach * 0.64, reach, along));
  footprint *= 1.0 - smoothstep(spread * 0.48, spread, abs(across));
  if (footprint <= 0.0) return 0.0;
  float course = floor(along * 0.9);
  float broken = hash(vec3(floor(across * 1.7), course, 83.0));
  float ribbon = fract(along * 0.9 + uTime / 120.0);
  float band = ribbon > 0.37 && ribbon < 0.76 ? 0.85 : 0.17;
  float wet = patch(vec2(across * 0.8, along * 0.32), 76.0);
  return footprint * band * (broken > 0.18 ? 1.0 : 0.22) * (0.58 + wet * 0.42);
}
vec3 districtGround(vec3 base, vec2 tile) {
  vec2 pixel = floor(tile * 16.0) / 16.0;
  float city = ${districtMask('night-city')};
  float rain = ${districtMask('rain-street')};
  float blossom = ${districtMask('blossom')};
  float seed = hash(vec3(floor(pixel * vec2(2.0, 0.8)), 78.0));
  float grain = hash(vec3(floor(pixel * 16.0), 98.0));
  float luminance = dot(base, vec3(0.23, 0.62, 0.15));
  if (city > 0.0) {
    vec3 night = mix(vec3(0.012, 0.028, 0.068), vec3(0.036, 0.078, 0.132), floor(luminance * 4.0) / 4.0);
    // A handful of actual light pools, not an all-over colored texture.
    float blue = reflectedLight(pixel, vec2(13.0, 72.0), 1.3, 6.5);
    float pink = reflectedLight(pixel, vec2(29.0, 76.0), 1.1, 7.0);
    float gold = reflectedLight(pixel, vec2(45.0, 72.0), 1.4, 6.0);
    float cyan = reflectedLight(pixel, vec2(43.0, 83.0), 0.9, 4.5);
    night = mix(night, vec3(0.06, 0.51, 0.78), blue * 0.72);
    night = mix(night, vec3(0.68, 0.20, 0.47), pink * 0.62);
    night = mix(night, vec3(0.83, 0.47, 0.13), gold * 0.61);
    night = mix(night, vec3(0.08, 0.57, 0.61), cyan * 0.61);
    night = mix(night, vec3(0.93, 0.82, 0.48), reflectedLight(pixel, uTaxi, 0.55, 3.0) * 0.35);
    if (grain > 0.985) night += vec3(0.004, 0.008, 0.012);
    base = mix(base, night, city);
  }
  if (rain > 0.0) {
    vec3 wet = mix(vec3(0.012, 0.040, 0.044), vec3(0.035, 0.088, 0.084), floor(luminance * 4.0) / 4.0);
    float puddle = patch(pixel * vec2(0.18, 0.24), 66.0);
    if (puddle > 0.65) wet += vec3(0.009, 0.024, 0.023);
    // The two amber headlamps share a widening reflection below the tram.
    float lamp = max(reflectedLight(pixel, uTram + vec2(0.55, -0.55), 1.45, 5.5),
                     reflectedLight(pixel, uTram + vec2(-0.55, 0.55), 1.45, 5.5));
    wet = mix(wet, vec3(0.96, 0.60, 0.09), lamp * 0.86);
    // Occasional cool reflections from the shop fronts stay faint and local.
    float shop = max(reflectedLight(pixel, vec2(-17.0, 70.0), 1.0, 4.0),
                     reflectedLight(pixel, vec2(-6.0, 81.0), 0.9, 4.0));
    wet = mix(wet, vec3(0.26, 0.48, 0.43), shop * 0.32);
    vec2 drop = fract(pixel * 0.35) - vec2(0.5);
    float ring = abs(length(drop) - fract(uTime / 40.0 + seed) * 0.44);
    if (puddle > 0.7 && seed > 0.55 && ring < 0.012) wet += vec3(0.04, 0.08, 0.067);
    // Fixed rails and sleepers belong to the street; the vehicle moves over them.
    if (tile.y > 67.5 && tile.y < 80.5) {
      float track = abs(tile.x + 11.0);
      if (track < 0.8 && fract((tile.y - 68.0) * 1.4) < 0.13) wet = vec3(0.18, 0.16, 0.13);
      if (abs(track - 0.55) < 0.045) wet = vec3(0.43, 0.52, 0.51);
    }
    base = mix(base, wet, rain);
  }
  if (blossom > 0.0) {
    vec3 dusk = base * vec3(0.66, 0.53, 0.64);
    float lane = abs(tile.x - 65.0);
    if (lane < 3.4) dusk = vec3(0.12, 0.105, 0.15);
    if (lane > 3.4 && lane < 5.0) {
      vec2 paving = fract(pixel * vec2(2.0, 1.5));
      dusk = paving.x > 0.87 || paving.y > 0.84 ? vec3(0.24, 0.20, 0.27) : vec3(0.39, 0.32, 0.38);
    }
    if (grain > 0.985 && lane < 6.0) dusk = vec3(0.91, 0.62, 0.70);
    base = mix(base, dusk, blossom);
  }
  return base;
}
void main() {
  vec2 d = (vPos - uCentre) / uRadius;
  d.y = -d.y;
  float r2 = dot(d, d);
  if (r2 > 1.0 || uMode < 0.5) {
    // Halo pass (drawn behind everything) or outside the disc.
    float glow = uMode < 0.5 ? smoothstep(1.06, 1.0, sqrt(r2)) * 0.62 : 0.0;
    finalColor = vec4(vec3(0.69, 0.88, 0.87) * glow, glow);
    return;
  }
  vec3 n = vec3(d, sqrt(1.0 - r2));
  vec3 p = uRot * n;
  float theta = acos(clamp(p.z, -1.0, 1.0));
  float s = length(p.xy);
  vec2 tile = MAP_CENTRE;
  if (s > 1e-6) {
    vec2 en = p.xy * (theta * RADIUS_TILES / s);
    tile += vec2(en.x - en.y, -en.x - en.y) * 0.70710678;
  }
  vec3 col;
  if (tile.x >= 0.0 && tile.y >= 0.0 && tile.x < uMapSize.x && tile.y < uMapSize.y)
    col = texture(uGround, tile / uMapSize).rgb;
  else col = wild(p, tile);
  col = districtGround(col, tile);
  float light = clamp(dot(n, normalize(vec3(-0.35, 0.6, 0.72))), 0.0, 1.0);
  float shade = 0.78 + 0.22 * floor(light * 6.0) / 6.0;
  float rim = smoothstep(0.32, 0.0, n.z);
  // Cool distant mist separates the far forest silhouettes, as in the
  // references, while foreground grass and stone keep their warm light.
  vec3 air = uMood > 0.5 && uMood < 1.5 ? vec3(0.035, 0.110, 0.22)
    : uMood > 1.5 && uMood < 2.5 ? vec3(0.27, 0.45, 0.42)
    : uMood > 2.5 && uMood < 3.5 ? vec3(0.62, 0.40, 0.51)
    : vec3(0.49, 0.73, 0.75);
  col = mix(col * shade, air, rim * 0.42);
  if (uMood > 0.5 && uMood < 1.5) col *= mix(vec3(1.0), vec3(0.57, 0.70, 0.94), uMoodStrength);
  finalColor = vec4(col, 1.0);
}`;

export class Engine {
  private app = new Application();
  private behind = new Container();
  private front = new Container();
  private highlight = new Container();
  private debug = new Container();
  private weather = new Graphics();
  private effects = new WorldEffects();
  private lifeSnapshots: {
    kind: string;
    tile: Point;
    visible: boolean;
    x: number;
    y: number;
    pose: string;
  }[] = [];
  private planet!: Mesh<MeshGeometry, Shader>;
  private halo!: Mesh<MeshGeometry, Shader>;
  private uniforms!: UniformGroup;
  private textures = new Map<string, Texture>();
  private metadata = new Map<string, FrameMeta>();
  private masks = new Map<string, Uint8Array>();
  private live = new Map<string, Live>();
  private statics: Static[] = [];
  private listeners = new Map<string, Set<(data: never) => void>>();
  private resizeObserver: ResizeObserver;
  private abort = new AbortController();
  private destroyed = false;
  private ready = false;
  private elapsed = 0;
  private lastFrame = -1;
  private frame = 0;
  private motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  private view: ViewState = { ...focusFromWorld(2048, 1930), zoom: 2 };
  private proj!: Frame;
  private velocity = { lat: 0, lon: 0 };
  private pointers = new Map<number, { x: number; y: number }>();
  private dragStart = { x: 0, y: 0 };
  private moved = 0;
  private zoomIdle = 0;
  private hover: string | null = null;
  private selected: string | null = null;
  private inspector = false;
  private flight: {
    from: ViewState;
    to: ViewState;
    elapsed: number;
    duration: number;
  } | null = null;
  private base = '/world/';
  private emitElapsed = 0;
  private drawCalls = 0;
  private lastDrawCalls = 0;
  private dirty = true;
  manifest: Manifest | null = null;
  constructor(private host: HTMLElement) {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.ready) {
        this.app.renderer.resize(host.clientWidth, host.clientHeight);
        this.resizePlanet();
        this.applyCamera();
      }
    });
    this.resizeObserver.observe(host);
  }
  on<K extends keyof EventMap>(name: K, cb: (data: EventMap[K]) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(cb as (data: never) => void);
    return () => {
      this.listeners.get(name)?.delete(cb as (data: never) => void);
    };
  }
  private emit<K extends keyof EventMap>(name: K, data: EventMap[K]) {
    for (const cb of this.listeners.get(name) ?? []) cb(data as never);
  }
  async load(url: string) {
    this.base = url.slice(0, url.lastIndexOf('/') + 1);
    this.emit('progress', 0.05);
    const response = await fetch(url, { signal: this.abort.signal });
    if (!response.ok) throw Error(`Manifest: HTTP ${response.status}`);
    const manifest = manifestSchema.parse(await response.json());
    this.manifest = manifest;
    await this.app.init({
      width: this.host.clientWidth,
      height: this.host.clientHeight,
      // Render at the screen's real pixel density (like Floor796) so phones
      // and high-DPI displays show crisp art instead of stretched pixels.
      resolution: Math.min(window.devicePixelRatio || 1, 3),
      autoDensity: true,
      backgroundAlpha: 0,
      antialias: false,
      preference: 'webgl',
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    // Camera gestures still tick at the display rate. Redraw only when the
    // world frame or camera actually changes, rather than submitting the
    // entire forest to the GPU sixty times a second while it is paused.
    this.app.ticker.remove(this.app.render, this.app);
    if (import.meta.env.DEV) this.countDrawCalls();
    this.host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute(
      'aria-label',
      'Interactive planet. Drag to spin the globe, scroll to zoom, or use arrow keys.',
    );
    this.app.canvas.tabIndex = 0;
    let completed = 0;
    for (const atlas of manifest.atlases) {
      const json = (await fetch(this.base + atlas, {
        signal: this.abort.signal,
      }).then((r) => r.json())) as {
        frames: Record<string, FrameMeta>;
        meta: { image: string; smooth?: boolean };
      };
      const sheet = await Assets.load<Texture>(this.base + json.meta.image);
      if (json.meta.smooth) {
        // Detailed high-density art: smooth filtering with mipmaps.
        sheet.source.scaleMode = 'linear';
        sheet.source.autoGenerateMipmaps = true;
        sheet.source.updateMipmaps();
      }
      for (const [name, m] of Object.entries(json.frames)) {
        this.textures.set(
          name,
          new Texture({
            source: sheet.source,
            frame: new Rectangle(m.frame.x, m.frame.y, m.frame.w, m.frame.h),
          }),
        );
        this.metadata.set(name, m);
        this.masks.set(
          name,
          Uint8Array.from(atob(m.hitMask), (c) => c.charCodeAt(0)),
        );
      }
      this.emit(
        'progress',
        0.1 + 0.5 * (++completed / manifest.atlases.length),
      );
    }
    const ground = await Assets.load<Texture>(this.base + manifest.ground.url);
    this.emit('progress', 0.75);
    this.createPlanet(ground, manifest);
    this.app.stage.addChild(
      this.halo,
      this.behind,
      this.planet,
      this.front,
      this.effects.container,
      this.weather,
      this.highlight,
      this.debug,
    );
    this.behind.sortableChildren = true;
    this.front.sortableChildren = true;
    for (const s of manifest.sortables) {
      const sprite = new Sprite(this.textures.get(s.frame));
      sprite.pivot.set(...s.pivot);
      const m = this.metadata.get(s.frame)!;
      this.statics.push({
        sprite,
        sortable: s,
        point: tileToPlanet(...s.ground),
        size: Math.max(m.frame.w, m.frame.h),
        ...(s.life?.kind === 'ship' ? { route: createShipRoute(s.tile) } : {}),
      });
    }
    this.ready = true;
    this.applyCamera();
    this.update();
    this.app.render();
    this.bindInput();
    this.app.ticker.add((t) => this.tick(t.deltaMS, t.elapsedMS));
    if (import.meta.env.DEV)
      (window as unknown as { __darEngine?: Engine }).__darEngine = this;
    this.emit('progress', 1);
  }
  private countDrawCalls() {
    const gl = (this.app.renderer as WebGLRenderer).gl;
    const elements = gl.drawElements.bind(gl),
      arrays = gl.drawArrays.bind(gl);
    gl.drawElements = (mode, count, type, offset) => {
      this.drawCalls++;
      elements(mode, count, type, offset);
    };
    gl.drawArrays = (mode, first, count) => {
      this.drawCalls++;
      arrays(mode, first, count);
    };
  }
  private createPlanet(ground: Texture, manifest: Manifest) {
    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: 'dar-planet',
      preferredFragmentPrecision: 'highp',
    });
    this.uniforms = new UniformGroup({
      uCentre: { value: new Float32Array(2), type: 'vec2<f32>' },
      uRadius: { value: 1, type: 'f32' },
      uRot: { value: new Float32Array(9), type: 'mat3x3<f32>' },
      uMapSize: {
        value: new Float32Array([manifest.room.width, manifest.room.height]),
        type: 'vec2<f32>',
      },
      // The world frame (0–239) for the sea's waves; never wall-clock time.
      uTime: { value: 0, type: 'f32' },
      uMood: { value: 0, type: 'f32' },
      uMoodStrength: { value: 0, type: 'f32' },
      uTram: { value: new Float32Array(tramState(0).tile), type: 'vec2<f32>' },
      uTaxi: { value: new Float32Array(taxiState(0).tile), type: 'vec2<f32>' },
    });
    const mesh = (mode: number) =>
      new Mesh({
        geometry: new MeshGeometry({
          positions: new Float32Array(8),
          uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        }),
        shader: new Shader({
          glProgram,
          resources: {
            uGround: ground.source,
            planet: this.uniforms,
            pass: { uMode: { value: mode, type: 'f32' } },
          },
        }),
      });
    this.halo = mesh(0);
    this.planet = mesh(1);
    this.resizePlanet();
  }
  private resizePlanet() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    for (const m of [this.planet, this.halo])
      m.geometry.positions = new Float32Array([0, 0, w, 0, w, h, 0, h]);
  }
  /**
   * Zoom out until the whole planet is a small ball: about a third of the
   * size that fits the screen (5% on phones, in either orientation).
   */
  minZoom() {
    const fit = fitZoom(this.host.clientWidth, this.host.clientHeight);
    return Math.min(0.3, Math.max(MIN_URL_ZOOM, fit * 0.3));
  }
  getCamera(): Camera {
    const [x, y] = worldFromFocus(this.view.lat, this.view.lon);
    return { x, y, zoom: this.view.zoom };
  }
  setMotion(on: boolean) {
    this.motion = on;
  }
  setZoom(zoom: number) {
    // Buttons and keys zoom around the focus; zoomAt re-sets its own point.
    this.zoomPoint = null;
    this.flight = null;
    this.view.zoom = Math.max(this.minZoom(), Math.min(MAX_ZOOM, zoom));
    this.zoomIdle = 240;
    this.applyCamera();
  }
  /** Zoom while keeping the ground under a screen point (cursor, pinch centre) still. */
  zoomAt(zoom: number, x: number, y: number) {
    const anchor = unproject(this.proj, x, y);
    this.setZoom(zoom);
    this.zoomPoint = { x, y };
    if (!anchor) return;
    // Newton steps on (lat, lon) so the anchor lands back under (x, y).
    const at = (lat: number, lon: number) =>
      project(this.projection(lat, lon, this.view.zoom), anchor);
    for (let i = 0; i < 6; i++) {
      const { lat, lon } = this.view,
        q = at(lat, lon),
        fx = q.x - x,
        fy = q.y - y;
      if (Math.hypot(fx, fy) < 0.25) break;
      const e = 1e-4,
        a = at(lat + e, lon),
        b = at(lat, lon + e);
      const j11 = (a.x - q.x) / e,
        j21 = (a.y - q.y) / e,
        j12 = (b.x - q.x) / e,
        j22 = (b.y - q.y) / e,
        det = j11 * j22 - j12 * j21;
      if (Math.abs(det) < 1e-9) break;
      this.view.lat -= (j22 * fx - j12 * fy) / det;
      this.view.lon -= (-j21 * fx + j11 * fy) / det;
      this.applyCamera();
    }
  }
  private zoomPoint: { x: number; y: number } | null = null;
  private target(to: Camera) {
    const f = focusFromWorld(to.x, to.y);
    return {
      lat: Math.max(-MAX_LAT, Math.min(MAX_LAT, f.lat)),
      lon: f.lon,
      zoom: Math.max(this.minZoom(), Math.min(MAX_ZOOM, to.zoom)),
    };
  }
  flyTo(to: Camera, ms = 600) {
    this.velocity = { lat: 0, lon: 0 };
    this.zoomIdle = ms + 240;
    const goal = this.target(to);
    // Honour reduced-motion for camera travel as well as world animation.
    // A destination remains reachable without a long animated sweep.
    if (
      ms <= 0 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.flight = null;
      this.zoomIdle = 0;
      this.view = goal;
      this.applyCamera();
      return;
    }
    // Spin the short way round.
    const turn = goal.lon - this.view.lon;
    goal.lon = this.view.lon + Math.atan2(Math.sin(turn), Math.cos(turn));
    this.flight = {
      from: { ...this.view },
      to: goal,
      elapsed: 0,
      duration: Math.max(1, ms),
    };
  }
  focusCharacter(id: string) {
    const c = this.manifest?.characters.find(
      (c) => c.id === id && c.interactive,
    );
    if (!c) return;
    const s = characterState(c, this.frame);
    this.selected = id;
    const [x, y] = worldFromTile(...s.tile);
    this.flyTo({ x, y, zoom: Math.max(2, this.view.zoom) }, 700);
  }
  clearSelection() {
    this.selected = null;
    this.dirty = true;
  }
  /** Use one projection for display and the zoom-anchor solver, including
   * the gradual lower woodland camera angle. */
  private projection(lat: number, lon: number, zoom: number): Frame {
    return planetFrame({
      lat,
      lon,
      zoom,
      pitch: landscapePitch(planetToTile(fromLatLon(lat, lon)), zoom),
      width: this.host.clientWidth,
      height: this.host.clientHeight,
    });
  }
  private currentMood(): DistrictMood {
    return districtAt(planetToTile(fromLatLon(this.view.lat, this.view.lon)));
  }
  /** Screen weather is decorative and shares the 240-frame simulation loop.
   * One batched Graphics layer avoids per-drop sprites or frame callbacks. */
  private drawWeather(mood: DistrictMood) {
    const g = this.weather;
    g.clear();
    g.visible =
      this.view.zoom > 0.6 && (mood === 'rain-street' || mood === 'blossom');
    if (!g.visible) return;
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    const phase = this.frame / 240;
    if (mood === 'rain-street') {
      for (let i = 0; i < 132; i++) {
        const depth = i % 3;
        const x =
          ((i * 137.312 + 23) % w) + Math.sin(phase * Math.PI * 2 + i) * 2;
        const y = (i * 97.731 + phase * h * (3 + depth)) % h;
        const length = 9 + depth * 7 + (i % 4) * 2;
        g.moveTo(Math.floor(x), Math.floor(y)).lineTo(
          Math.floor(x) - 1,
          Math.floor(y + length),
        );
        g.stroke({
          color: depth === 0 ? 0xb0d8bd : 0x6c9d9e,
          width: depth === 2 ? 1.4 : 1,
          alpha: 0.13 + depth * 0.07,
        });
      }
    } else {
      for (let i = 0; i < 26; i++) {
        const y = (i * 79.31 + phase * h) % h;
        const x =
          (i * 131.67 + Math.sin(phase * Math.PI * 2 + i * 0.71) * 19 + w) % w;
        const drift = Math.sin(phase * Math.PI * 4 + i) * 2;
        g.poly([x - 2, y, x + drift, y - 2, x + 3, y + 1, x + 1, y + 3]).fill({
          color: i % 3 ? 0xefb4c4 : 0xffd3da,
          alpha: 0.56,
        });
      }
    }
  }
  private applyCamera() {
    if (!this.ready) return;
    this.view.lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, this.view.lat));
    this.view.lon = Math.atan2(
      Math.sin(this.view.lon),
      Math.cos(this.view.lon),
    );
    this.proj = this.projection(this.view.lat, this.view.lon, this.view.zoom);
    const u = this.uniforms.uniforms as {
      uCentre: Float32Array;
      uRadius: number;
      uRot: Float32Array;
      uMood: number;
      uMoodStrength: number;
    };
    u.uCentre[0] = this.proj.cx;
    u.uCentre[1] = this.proj.cy;
    u.uRadius = this.proj.radius;
    // Row-major camera matrix read as column-major = its inverse (transpose).
    u.uRot.set(this.proj.matrix);
    const mood = this.currentMood();
    u.uMood =
      mood === 'night-city'
        ? 1
        : mood === 'rain-street'
          ? 2
          : mood === 'blossom'
            ? 3
            : mood === 'coast'
              ? 4
              : 0;
    u.uMoodStrength = Math.max(0, Math.min(1, (this.view.zoom - 0.35) / 0.65));
    this.dirty = true;
    this.emit('cameraChange', this.getCamera());
  }
  private texture(sprite: Sprite, name: string, pivot?: Point) {
    const t = this.textures.get(name);
    if (!t || sprite.texture === t) return;
    sprite.texture = t;
    sprite.pivot.set(...(pivot ?? this.metadata.get(name)!.anchor));
  }
  /** Stand a sprite on the planet. Returns false when it is hidden. */
  private place(
    sprite: Sprite,
    point: Vec3,
    size: number,
    lift = 0,
    depthBias = 0,
    density = 1,
  ) {
    const p = project(this.proj, point, lift),
      zoom = this.view.zoom,
      reach = size * zoom + 8,
      w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (
      p.depth < -0.32 ||
      p.x < -reach ||
      p.y < -reach ||
      p.x > w + reach ||
      p.y > h + reach * 0.3
    ) {
      sprite.visible = false;
      return null;
    }
    const layer = p.depth < 0 ? this.behind : this.front;
    if (sprite.parent !== layer) layer.addChild(sprite);
    sprite.visible = true;
    sprite.position.set(Math.round(p.x), Math.round(p.y));
    sprite.rotation = p.rotation;
    sprite.scale.set(zoom / density);
    sprite.zIndex = p.depth + depthBias;
    return p;
  }
  private update() {
    if (!this.manifest) return;
    (this.uniforms.uniforms as { uTime: number }).uTime = this.frame;
    const movingLights = this.uniforms.uniforms as {
      uTram: Float32Array;
      uTaxi: Float32Array;
    };
    movingLights.uTram.set(tramState(this.frame).tile);
    movingLights.uTaxi.set(taxiState(this.frame).tile);
    const focusDepth = Math.cos(this.proj.pitch);
    const mood = this.currentMood();
    const ships: WakeSource[] = [];
    this.lifeSnapshots = [];
    for (const s of this.statics) {
      const life = s.sortable.life;
      const tram = life?.kind === 'tram' ? tramState(this.frame) : null;
      const ship =
        life?.kind === 'ship' ? shipState(this.frame, s.route) : null;
      const taxi = life?.kind === 'taxi' ? taxiState(this.frame) : null;
      const actor = tram ?? ship ?? taxi;
      const tile = actor?.tile ?? s.sortable.ground;
      const point = actor ? tileToPlanet(...tile) : s.point;
      const projected = this.place(
        s.sprite,
        point,
        s.size,
        s.sortable.lift + (ship?.bob ?? 0),
      );
      if (ship) ships.push(ship);
      let pose = s.sortable.frame;
      if (actor && projected && life?.views) {
        const facing = screenFacing(
          this.proj,
          tile,
          Math.hypot(...actor.velocity) > 0.000001
            ? actor.velocity
            : FACING_DIRECTION[actor.facing],
          projected.rotation,
        );
        const reverse = facing === 'NE' || facing === 'NW';
        if (tram)
          pose =
            life.views[
              `${reverse ? 'NE' : 'SW'}-${tram.doorsOpen ? 'open' : 'closed'}`
            ] ?? pose;
        else if (taxi) pose = life.views[reverse ? 'NE' : 'SW'] ?? pose;
        else if (ship) pose = life.views[facing] ?? pose;
        this.texture(s.sprite, pose, this.metadata.get(pose)!.anchor);
        if ((tram || taxi) && (facing === 'SE' || facing === 'NW'))
          s.sprite.scale.x *= -1;
        if (ship) {
          s.sprite.rotation += ship.roll;
          s.sprite.scale.x *= 1 + (ship.sail - 1) * 0.25;
        }
      }
      if (life && life.kind !== 'foliage')
        this.lifeSnapshots.push({
          kind: life.kind,
          tile,
          visible: s.sprite.visible,
          x: s.sprite.x,
          y: s.sprite.y,
          pose,
        });
      if (!projected) continue;
      if (life?.kind === 'foliage') {
        const breeze = windSample(this.frame, tile);
        s.sprite.skew.x = breeze * 0.007;
        s.sprite.rotation += breeze * 0.0025;
      }
      const localMood = districtAt(tile);
      s.sprite.tint =
        localMood === 'night-city'
          ? 0xa6c8ff
          : localMood === 'rain-street'
            ? 0xa2c9be
            : localMood === 'blossom'
              ? 0xffd2df
              : mood === 'night-city' && this.view.zoom > 0.65
                ? 0x789ac4
                : 0xffffff;
      const { animation, atmosphere } = s.sortable;
      if (animation || atmosphere) {
        let frame = animation
          ? animation[
              frameMap(this.frame, s.sortable.period ?? 60, animation.length)
            ]
          : s.sortable.frame;
        // Pale trunks recede toward the horizon, muted teal sits behind
        // the focus and rich dark trees frame
        // the foreground. Prepainted frames preserve leaf colours and
        // silhouette detail without a filter pass or extra sprite.
        if (atmosphere)
          frame =
            projected.depth < focusDepth - 0.18
              ? atmosphere.far
              : projected.depth < focusDepth + 0.12
                ? atmosphere.middle
                : frame;
        this.texture(s.sprite, frame, s.sortable.pivot);
      }
    }
    this.drawWeather(mood);
    this.effects.update({
      frame: this.frame,
      projection: this.proj,
      zoom: this.view.zoom,
      width: this.host.clientWidth,
      height: this.host.clientHeight,
      mood,
      ships,
    });
    if (this.lastFrame !== this.frame) this.emit('worldFrame', this.frame);
    let visible = 0;
    for (const c of this.manifest.characters) {
      const state = characterState(c, this.frame),
        step = c.script[state.stepIndex];
      let item = this.live.get(c.id);
      if (!item) {
        item = { sprite: new Sprite(), character: c, frame: '', depth: 0 };
        if (c.shadowFrame) {
          item.shadow = new Sprite();
          this.texture(item.shadow, c.shadowFrame);
        }
        this.live.set(c.id, item);
      }
      const point = tileToPlanet(...state.tile);
      const probe = project(this.proj, point, state.z);
      let direction: Point = FACING_DIRECTION[state.facing];
      if (step.path) {
        const t = (this.frame % c.loop) - step.from,
          next = characterState(c, (this.frame % c.loop) + (t < 0 ? 0 : 1));
        const d: Point = [
          next.tile[0] - state.tile[0],
          next.tile[1] - state.tile[1],
        ];
        if (Math.hypot(...d) > 1e-6) direction = d;
      }
      const facing = screenFacing(
        this.proj,
        state.tile,
        direction,
        probe.rotation,
        c.depiction === 'back',
      );
      let key = frameKey(state.action, step.prop, facing);
      if (!c.frames[key]) key = frameKey(state.action, step.prop, state.facing);
      const frames = c.frames[key],
        flip = Boolean(c.mirror?.includes(key));
      // Supplied animation strips play at their own tempo on the world clock.
      const tempo = this.metadata.get(frames[0])?.tempo,
        name = tempo
          ? frames[Math.floor((this.frame % (frames.length * tempo)) / tempo)]
          : frames[state.index % frames.length];
      this.texture(item.sprite, name);
      item.frame = name;
      const m = this.metadata.get(name)!;
      const density = m.density ?? 1,
        motion = m.still ? motionFor(state.action, this.frame) : null;
      const p = this.place(
        item.sprite,
        point,
        Math.max(m.frame.w, m.frame.h) / density,
        state.z + (motion?.lift ?? 0),
        2e-5,
        density,
      );
      // Left/right views share frames; the engine flips them about the feet.
      if (p && flip) item.sprite.scale.x *= -1;
      if (p && motion) {
        // Animate the supplied still without redrawing it.
        const toward = facing === 'SE' || facing === 'NE' ? 1 : -1;
        item.sprite.scale.x *= motion.sx;
        item.sprite.scale.y *= motion.sy;
        item.sprite.rotation += motion.lean * toward;
      }
      if (item.shadow) {
        const sp = p && this.place(item.shadow, point, 16, 0, 1e-5);
        if (!sp) item.shadow.visible = false;
      }
      if (!p) continue;
      visible++;
      item.depth = p.depth;
      const outlined = this.hover === c.id && c.interactive;
      if (outlined || this.selected === c.id) {
        let filter = item.sprite.filters?.[0] as OutlineFilter | undefined;
        if (!filter) {
          filter = new OutlineFilter({
            thickness: Math.max(1, Math.round(this.view.zoom)),
            color: 0xd8ad57,
            quality: 0.1,
          });
          item.sprite.filters = [filter];
        }
        filter.alpha =
          this.selected === c.id ? 0.65 + 0.35 * Math.sin(this.frame / 4) : 1;
      } else if (item.sprite.filters?.length) item.sprite.filters = [];
    }
    this.visibleCount = visible;
    if (this.inspector) this.drawInspector();
  }
  private visibleCount = 0;
  private tick(dt: number, elapsedDt = dt) {
    if (!this.ready || this.destroyed) return;
    this.lastDrawCalls = this.drawCalls;
    this.drawCalls = 0;
    dt = Math.min(dt, 64);
    // Fixed 12fps simulation must not slow down with a busy renderer. The
    // ticker supplies active elapsed time; models still depend only on the
    // integer world frame. Bound a suspended tab's first update to one second.
    if (this.motion) this.elapsed += Math.min(1000, elapsedDt) / 1000;
    this.frame = globalFrame(this.elapsed);
    let moved = false;
    if (this.flight) {
      const fl = this.flight;
      fl.elapsed += dt;
      const t = Math.min(1, fl.elapsed / fl.duration),
        ease = 1 - (1 - t) ** 3;
      this.view = {
        lat: fl.from.lat + (fl.to.lat - fl.from.lat) * ease,
        lon: fl.from.lon + (fl.to.lon - fl.from.lon) * ease,
        zoom: fl.from.zoom + (fl.to.zoom - fl.from.zoom) * ease,
      };
      moved = true;
      if (t === 1) this.flight = null;
    } else if (
      !this.pointers.size &&
      Math.hypot(this.velocity.lat, this.velocity.lon) > 1e-6
    ) {
      this.view.lat += this.velocity.lat * dt;
      this.view.lon += this.velocity.lon * dt;
      const decay = Math.exp(-dt / 220);
      this.velocity.lat *= decay;
      this.velocity.lon *= decay;
      moved = true;
    }
    if (this.zoomIdle > 0) {
      this.zoomIdle -= dt;
      // Settle on a crisp whole zoom only when already close to one, so a
      // pinch never jumps noticeably after the fingers lift.
      const whole = Math.round(this.view.zoom);
      if (
        this.zoomIdle <= 0 &&
        this.view.zoom >= 1 &&
        !this.pointers.size &&
        Math.abs(this.view.zoom - whole) < 0.15
      ) {
        // Settle around the last pinch/cursor point so the view does not shift.
        const z = this.zoomPoint;
        if (z) this.zoomAt(whole, z.x, z.y);
        else this.view.zoom = whole;
        this.zoomIdle = 0;
        moved = true;
      }
    }
    if (moved) this.applyCamera();
    if (this.lastFrame !== this.frame || this.dirty) {
      this.update();
      this.app.render();
      this.lastFrame = this.frame;
      this.dirty = false;
    }
    this.emitElapsed += dt;
    if (this.emitElapsed >= 120) {
      this.emitElapsed = 0;
      if (import.meta.env.DEV)
        this.emit('stats', {
          fps: Math.round(this.app.ticker.FPS),
          draws: this.lastDrawCalls,
          frame: this.frame,
          visible: this.visibleCount,
        });
    }
  }
  private point(e: PointerEvent | WheelEvent) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  /** Spin the globe so the ground follows the pointer. */
  private drag(dx: number, dy: number) {
    const r = RADIUS_PX * this.view.zoom,
      cos = Math.max(0.2, Math.cos(this.view.lat));
    const dLon = -dx / r / cos,
      dLat = (dy / r) * 1.6;
    this.view.lon += dLon;
    this.view.lat += dLat;
    return { lat: dLat, lon: dLon };
  }
  private hit(p: { x: number; y: number }, interactiveOnly = true) {
    const items = [...this.live.values()]
      .filter(
        (i) =>
          i.sprite.visible &&
          i.sprite.parent === this.front &&
          (!interactiveOnly || i.character.interactive),
      )
      .sort((a, b) => b.depth - a.depth);
    for (const item of items) {
      const m = this.metadata.get(item.frame)!;
      const local = item.sprite.toLocal(p);
      if (
        maskHit(
          this.masks.get(item.frame)!,
          m.frame.w,
          m.frame.h,
          local.x,
          local.y,
        )
      )
        return item.character.id;
    }
    return null;
  }
  /** Development/test helper: tile coordinates of the ground under a screen point. */
  groundAt(x: number, y: number): Point | null {
    const p = unproject(this.proj, x, y);
    return p ? planetToTile(p) : null;
  }
  /** Read-only development diagnostics for actual rendered scenery. */
  debugLife() {
    return {
      frame: this.frame,
      motion: this.motion,
      tram: tramState(this.frame),
      taxi: taxiState(this.frame),
      entities: this.lifeSnapshots.map((s) => ({ ...s, tile: [...s.tile] })),
    };
  }
  /** Development/test helper: screen points over and beside a character. */
  debugPoints(id: string) {
    const item = this.live.get(id);
    if (!item || !item.sprite.visible) return null;
    const m = this.metadata.get(item.frame)!,
      mask = this.masks.get(item.frame)!;
    let opaque: Point | null = null,
      empty: Point | null = null;
    for (let y = 0; y < m.frame.h; y++)
      for (let x = 0; x < m.frame.w; x++) {
        const on = maskHit(mask, m.frame.w, m.frame.h, x, y);
        if (on && !opaque && y > m.frame.h / 3) opaque = [x + 0.5, y + 0.5];
        if (!on && !empty && x === 0) empty = [x + 0.5, y + 0.5];
      }
    const g = (q: Point | null) => {
      if (!q) return null;
      const s = item.sprite.toGlobal({ x: q[0], y: q[1] });
      return { x: s.x, y: s.y };
    };
    return { opaque: g(opaque), transparent: g(empty) };
  }
  private bindInput() {
    const canvas = this.app.canvas,
      options = { signal: this.abort.signal };
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        canvas.focus();
        canvas.setPointerCapture(e.pointerId);
        const p = this.point(e);
        this.pointers.set(e.pointerId, p);
        this.dragStart = p;
        this.moved = 0;
        this.velocity = { lat: 0, lon: 0 };
        this.flight = null;
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        const p = this.point(e),
          old = this.pointers.get(e.pointerId);
        if (old) {
          if (this.pointers.size === 2) {
            const other = [...this.pointers.entries()].find(
              ([id]) => id !== e.pointerId,
            )![1];
            const a = Math.hypot(old.x - other.x, old.y - other.y),
              b = Math.hypot(p.x - other.x, p.y - other.y);
            this.velocity = { lat: 0, lon: 0 };
            this.zoomAt(
              (this.view.zoom * b) / Math.max(1, a),
              (p.x + other.x) / 2,
              (p.y + other.y) / 2,
            );
          } else {
            const v = this.drag(p.x - old.x, p.y - old.y),
              dt = Math.max(
                8,
                e.timeStamp - (this.lastMove || e.timeStamp - 16),
              );
            this.velocity = { lat: v.lat / dt, lon: v.lon / dt };
            this.lastMove = e.timeStamp;
            this.applyCamera();
          }
          this.pointers.set(e.pointerId, p);
          this.moved = Math.max(
            this.moved,
            Math.hypot(p.x - this.dragStart.x, p.y - this.dragStart.y),
          );
        } else {
          const hit = this.hit(p, false);
          if (hit !== this.hover) {
            this.hover = hit;
            this.dirty = true;
            const c = hit && this.live.get(hit)?.character;
            canvas.style.cursor = c && c.interactive ? 'pointer' : 'grab';
            this.emit('characterHover', hit);
          }
        }
      },
      options,
    );
    const up = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      // Lifting one finger of a pinch must not fling the planet.
      if (this.pointers.size === 2) this.velocity = { lat: 0, lon: 0 };
      if (this.pointers.size === 1 && this.moved < 5) {
        const hit = this.hit(this.point(e));
        if (hit) {
          this.selected = hit;
          this.emit('characterClick', hit);
          this.dirty = true;
        }
        this.velocity = { lat: 0, lon: 0 };
      }
      this.pointers.delete(e.pointerId);
    };
    canvas.addEventListener('pointerup', up, options);
    canvas.addEventListener(
      'pointercancel',
      (e) => {
        this.pointers.delete(e.pointerId);
        this.velocity = { lat: 0, lon: 0 };
      },
      options,
    );
    canvas.addEventListener(
      'pointerleave',
      () => {
        if (this.hover) {
          this.hover = null;
          this.dirty = true;
          this.emit('characterHover', null);
        }
      },
      options,
    );
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const p = this.point(e);
        this.zoomAt(this.view.zoom * Math.exp(-e.deltaY * 0.0015), p.x, p.y);
      },
      { ...options, passive: false },
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if ((e.target as HTMLElement)?.closest('input,textarea,select,button'))
          return;
        if (e.key.toLowerCase() === 'i' && import.meta.env.DEV) {
          this.inspector = !this.inspector;
          this.debug.visible = this.inspector;
          if (!this.inspector) {
            for (const c of this.debug.removeChildren()) c.destroy();
            this.emit('inspect', null);
          }
          this.dirty = true;
        }
        const step = 90;
        if (e.key === 'ArrowLeft') this.drag(step, 0);
        else if (e.key === 'ArrowRight') this.drag(-step, 0);
        else if (e.key === 'ArrowUp') this.drag(0, step / 2);
        else if (e.key === 'ArrowDown') this.drag(0, -step / 2);
        else if (['+', '='].includes(e.key)) this.setZoom(this.view.zoom + 0.5);
        else if (e.key === '-') this.setZoom(this.view.zoom - 0.5);
        else return;
        e.preventDefault();
        this.flight = null;
        this.applyCamera();
      },
      options,
    );
  }
  private lastMove = 0;
  /** Fit the whole planet in view. */
  overview() {
    const cam = this.getCamera();
    this.flyTo(
      {
        ...cam,
        zoom: fitZoom(this.host.clientWidth, this.host.clientHeight),
      },
      600,
    );
  }
  private drawInspector() {
    for (const c of this.debug.removeChildren()) c.destroy();
    const g = new Graphics();
    this.debug.addChild(g);
    const at = (t: Point) => project(this.proj, tileToPlanet(...t));
    for (const item of this.live.values()) {
      if (!item.sprite.visible) continue;
      const c = item.character;
      for (const s of c.script)
        if (s.path) {
          const ps = s.path.map((p) => at(p));
          if (ps.some((p) => p.depth < 0)) continue;
          g.moveTo(ps[0].x, ps[0].y);
          ps.slice(1).forEach((p) => g.lineTo(p.x, p.y));
          g.stroke({ color: 0x448bbb, width: 1 });
        }
      const s = characterState(c, this.frame),
        p = at(s.tile);
      g.circle(p.x, p.y, 2).fill(0xc87865);
      if (c.pairWith) {
        const pair = this.live.get(c.pairWith);
        if (pair?.sprite.visible)
          g.moveTo(p.x, p.y)
            .lineTo(pair.sprite.x, pair.sprite.y)
            .stroke({ color: 0xbd65ae, width: 1 });
      }
      if (this.view.zoom >= 2) {
        const label = new Text({
          text: c.id.replace(/^amb-/, ''),
          style: { fontSize: 9, fill: 0x493c35 },
        });
        label.position.set(p.x + 4, p.y);
        this.debug.addChild(label);
      }
    }
    if (this.hover) {
      const item = this.live.get(this.hover)!;
      const state = characterState(item.character, this.frame);
      const b = item.sprite.getBounds();
      g.rect(b.x, b.y, b.width, b.height).stroke({ color: 0xe4b34e, width: 1 });
      this.emit('inspect', {
        id: this.hover,
        step: state.stepIndex,
        frame: state.index,
        action: state.action,
        depth: item.depth.toFixed(3),
      });
    } else
      this.emit('inspect', {
        frame: this.frame,
        visible: this.visibleCount,
        lat: ((this.view.lat * 180) / Math.PI).toFixed(1),
        lon: ((this.view.lon * 180) / Math.PI).toFixed(1),
      });
  }
  destroy() {
    this.destroyed = true;
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.listeners.clear();
    if (this.ready) this.app.destroy(true, { children: true, texture: false });
  }
}
