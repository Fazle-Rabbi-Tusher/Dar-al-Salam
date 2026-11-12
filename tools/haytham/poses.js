/*
 * Ibn al-Haytham's optics workflow (owner's brief), on the 120-tick loop
 * (12 ticks a second):
 *   0–18   the aperture: leans to the shutter, slides the brass plate over
 *          the pinhole with a fingertip, pulls back to look;
 *   18–36  the bowl: both hands round the glass bowl, turns it for bubbles,
 *          slides it along the notched track onto the marker;
 *   36–54  the dial: palm flat on the bench, a pinch at the scale's dial;
 *   54–84  the compass: presses the point into the parchment, scribes the
 *          arc with a twist of the wrist, then lifts his head, hand to chin,
 *          and follows the inverted image across the wall screen;
 *   84–120 he watches, then gathers himself to begin again.
 *
 * Station coordinates (model units; he is 5.04 tall, standing at the
 * origin facing +Z, the bench in front of him). A hand is either a target
 * point (the shoulder turns the arm to reach it) or `null` (at rest, hands
 * together at his chest). `look` is a point his head turns to.
 */
export const SC = 0.42; // the instruments' scale on the bench
export const BENCH = { y: 2.4, z0: 1.05, z1: 2.3, x0: -2.8, x1: 3.0 };
export const AP = { x: 1.85, z: 1.75 };
export const PINHOLE = [AP.x - 0.55 * SC, BENCH.y + 1.45 * SC, AP.z + 0.02];
export const BOWL = { x: 0.2, z: 1.68, slide: 0.55 };
export const BOWL_Y = BENCH.y + 1.92 * SC;
export const TOOLS = { x: -1.9, z: 1.85 };
/** Where the scale's slider pointer stands for a dial setting p. */
export const pointer = (p) => [
  TOOLS.x - (-1.6 + p * 3.2) * SC,
  BENCH.y + 1.82 * SC,
  TOOLS.z - 0.64 * SC,
];
export const PARCH = { x: -0.55, z: 1.35, r: 0.3 };
export const SCREEN = { x: 3.65, z: 0.9, y: 3.4 };

const at = (x, y, z) => [x, y, z];
export const POSE = {
  rest: {
    lean: 0,
    glide: 0,
    L: null,
    R: null,
    look: at(0, 3.9, 3),
    aperture: 0.75,
    bowlX: -BOWL.slide,
    bowlTurn: 0,
    dial: 0.25,
    compassTurn: 0,
    compass: 0,
    image: -0.3,
  },
  // Leaning close to the shutter: a fingertip at the plate over the pinhole.
  reach: {
    lean: 0.12,
    glide: 1.1,
    R: at(PINHOLE[0] - 0.05, PINHOLE[1], PINHOLE[2] - 0.1),
    look: PINHOLE,
    aperture: 0.75,
  },
  slide: {
    lean: 0.13,
    glide: 1.1,
    R: at(PINHOLE[0] - 0.05, PINHOLE[1] - 0.12, PINHOLE[2] - 0.1),
    look: PINHOLE,
    aperture: 0.1,
  },
  inspect: {
    lean: 0.02,
    glide: 0.8,
    R: null,
    look: at(AP.x + 0.6, BENCH.y + 0.5, AP.z),
    aperture: 0.1,
  },
  // Both hands round the bowl, turning it, then sliding it to the marker.
  grip: {
    lean: 0.1,
    glide: 0.05,
    L: at(BOWL.x - BOWL.slide - 0.5, BOWL_Y, BOWL.z - 0.1),
    R: at(BOWL.x - BOWL.slide + 0.5, BOWL_Y, BOWL.z - 0.1),
    look: at(BOWL.x - BOWL.slide, BOWL_Y, BOWL.z),
    aperture: 0.1,
    bowlX: -BOWL.slide,
  },
  turn: {
    lean: 0.1,
    glide: 0.05,
    L: at(BOWL.x - BOWL.slide - 0.45, BOWL_Y + 0.05, BOWL.z - 0.25),
    R: at(BOWL.x - BOWL.slide + 0.45, BOWL_Y - 0.05, BOWL.z + 0.05),
    look: at(BOWL.x - BOWL.slide, BOWL_Y, BOWL.z),
    aperture: 0.1,
    bowlX: -BOWL.slide,
    bowlTurn: 0.7,
  },
  slid: {
    lean: 0.1,
    glide: 0.35,
    L: at(BOWL.x - 0.5, BOWL_Y, BOWL.z - 0.1),
    R: at(BOWL.x + 0.5, BOWL_Y, BOWL.z - 0.1),
    look: at(BOWL.x, BENCH.y + 0.3, BOWL.z + 0.6),
    aperture: 0.1,
    bowlX: 0,
    bowlTurn: 0.7,
  },
  // Palm flat on the bench to steady the hand; a pinch at the dial.
  palm: {
    lean: 0.1,
    glide: -1.0,
    L: at(TOOLS.x + 0.15, BENCH.y + 0.12, BENCH.z0 + 0.2),
    R: at(...pointer(0.25)),
    look: pointer(0.25),
    aperture: 0.1,
    bowlX: 0,
    bowlTurn: 0.7,
    dial: 0.25,
  },
  pinch: {
    lean: 0.1,
    glide: -1.0,
    L: at(TOOLS.x + 0.15, BENCH.y + 0.12, BENCH.z0 + 0.2),
    R: at(...pointer(0.55)),
    look: pointer(0.55),
    aperture: 0.1,
    bowlX: 0,
    bowlTurn: 0.7,
    dial: 0.55,
  },
  // The compass point pressed into the parchment, then the twist.
  press: {
    lean: 0.12,
    glide: -0.5,
    R: at(PARCH.x, BENCH.y + 0.75, PARCH.z),
    look: at(PARCH.x, BENCH.y, PARCH.z),
    aperture: 0.1,
    bowlX: 0,
    bowlTurn: 0.7,
    dial: 0.55,
    compass: 1,
    compassTurn: 0,
  },
  scribed: {
    lean: 0.12,
    glide: -0.5,
    R: at(PARCH.x + 0.08, BENCH.y + 0.75, PARCH.z + 0.05),
    look: at(PARCH.x, BENCH.y, PARCH.z),
    aperture: 0.1,
    bowlX: 0,
    bowlTurn: 0.7,
    dial: 0.55,
    compass: 1,
    compassTurn: 1,
  },
  // Head up, hand to chin, eyes on the inverted image on the wall screen.
  chin: {
    lean: -0.02,
    glide: 0.4,
    L: 'chin',
    look: at(SCREEN.x, SCREEN.y, SCREEN.z),
    aperture: 0.1,
    bowlX: 0,
    bowlTurn: 0.7,
    dial: 0.55,
    compassTurn: 1,
    image: 0.2,
  },
  watch: {
    lean: -0.03,
    glide: 0.4,
    L: 'chin',
    look: at(SCREEN.x, SCREEN.y - 0.1, SCREEN.z + 0.4),
    aperture: 0.1,
    bowlX: 0,
    bowlTurn: 0.7,
    dial: 0.55,
    compassTurn: 1,
    image: 0.55,
  },
};
export const KEYS = [
  { t: 0, p: 'rest' },
  { t: 6, p: 'reach' },
  { t: 12, p: 'slide' },
  { t: 18, p: 'inspect' },
  { t: 22, p: 'grip' },
  { t: 27, p: 'turn' },
  { t: 36, p: 'slid' },
  { t: 42, p: 'palm' },
  { t: 54, p: 'pinch' },
  { t: 60, p: 'press' },
  { t: 68, p: 'scribed' },
  { t: 76, p: 'chin' },
  { t: 106, p: 'watch' },
  { t: 120, p: 'rest' },
];
