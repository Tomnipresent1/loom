// How a scene is looked at (scene.camera.style). Pure maths, no DOM: the renderers draw with it, the editor shows its
// numbers, the tests check it.
//   map:     straight down from above (x right, y down the screen); z is ignored.
//   theatre: the paper-theatre view from NAMI's Plum Blossom. The ground is x / y (as on the map: the editor's scene tab
//            stays the top view), z is height. The camera floats behind and above the thing it follows, looking up the
//            map (towards smaller y), so "up" on the map is "ahead, into the picture". It never tilts: the horizon is
//            shifted instead (like a Maya film offset), so upright things stay upright, as in the prints.
//            Scale: about 100 scene units to a metre.

export const CAMERA_STYLES = ['map', 'theatre'];
export const CAMERA_DEFAULTS = {
  map: { view: 700 },
  theatre: {
    lens: 65,          // mm, measured on a full-frame camera across the screen's shorter side (65 = NAMI's F 1625)
    height: 235,       // how high the camera floats above the ground
    back: 1950,        // how far behind the followed thing it floats (with lens, this sets how big things look)
    horizon: 0.48,     // where the horizon sits: 0 = top of the screen, 1 = bottom
    haze: 6000,        // things this far off start to fade into the distance
    ease: 2,           // how quickly the camera drifts after the followed thing (bigger = tighter)
    peopleFade: 80,    // people (Figures) who pass behind the followed thing start fading this far behind it...
    peopleGone: 350,   // ...and are gone by this far behind it (NAMI v3.12: nobody looms up huge in front of the lens)
  },
};
// the theatre's sky when a scene doesn't say (a night sky, to suit the blank starter); the ground's far colour = sky low
export const SKY_DEFAULTS = { top: '#04060c', low: '#1c2748' };
const FILM = 24;      // a full-frame sensor's shorter side, in mm
const NEAR = 5;        // nothing closer to the lens than this is drawn

/** The scene's camera settings, every gap filled with its default. */
export function cameraSettings(scene) {
  const c = (scene && scene.camera) || {};
  const style = CAMERA_STYLES.includes(c.style) ? c.style : 'map';
  const out = { style, follow: c.follow };
  for (const [k, v] of Object.entries(CAMERA_DEFAULTS[style])) out[k] = Number.isFinite(c[k]) ? c[k] : v;
  return out;
}

/** Problems with scene.camera, in words (for load.js). */
export function checkCamera(camera, where) {
  const out = [];
  if (!camera) return out;
  if (camera.style !== undefined && !CAMERA_STYLES.includes(camera.style)) out.push(`${where}: camera "style" should be one of ${CAMERA_STYLES.join(', ')}`);
  for (const style of CAMERA_STYLES) for (const k of Object.keys(CAMERA_DEFAULTS[style])) {
    if (camera[k] !== undefined && !Number.isFinite(camera[k])) out.push(`${where}: camera "${k}" should be a number`);
  }
  return out;
}

// ---- the theatre view ----
// A camera here is { x, y } (where it stands on the ground) plus the settings. Screen is W x H pixels.
export const focalPx = (set, W, H) => (set.lens / FILM) * Math.min(W, H);

/** Scene point [x, y, z] -> [screen x, screen y, pixels per unit at that depth, depth], or null if behind the lens. */
export function theatreProject(cam, set, W, H, x, y, z = 0) {
  const depth = cam.y - y;
  if (depth < NEAR) return null;
  const s = focalPx(set, W, H) / depth;
  return [W / 2 + (x - cam.x) * s, set.horizon * H + (set.height - z) * s, s, depth];
}

/** Screen point -> the place on the ground under it. Above the horizon (the sky), a far point straight that way. */
export function theatreGround(cam, set, W, H, sx, sy, far = 4000) {
  const F = focalPx(set, W, H), below = sy - set.horizon * H;
  const depth = below > 0 ? Math.min(far, (set.height * F) / below) : far;
  return [cam.x + ((sx - W / 2) * depth) / F, cam.y - depth];
}

/** Move the camera after the thing it follows (want = its [x, y]). First call (cam null): starts right there. */
export function theatreAim(cam, set, want, dt) {
  const wx = want[0], wy = want[1] + set.back;
  if (!cam || Math.abs(wy - cam.y) > set.back * 1.5) return { x: wx, y: wy };      // a big jump (a restart): no long glide
  const k = Math.min(1, dt * set.ease);
  return { x: cam.x + (wx - cam.x) * k, y: cam.y + (wy - cam.y) * Math.min(1, k * 2) };
}

/** How solid a person (a Figure) at this depth from the camera should be drawn (0..1): fully there until they are
 *  peopleFade behind the followed thing, gone by peopleGone behind it; far off, half lost in the haze. */
export function theatrePersonFade(set, depth) {
  const behind = set.back - depth, span = Math.max(1, set.peopleGone - set.peopleFade);
  const near = Math.min(1, Math.max(0, (set.peopleGone - behind) / span));
  return near * (1 - 0.5 * Math.min(1, Math.max(0, (depth - set.haze) / (set.haze * 2))));
}

/** How solid a thing standing at ground x, depth from the camera, should be drawn (0..1). Far off: fades into the haze.
 *  Between the camera and the followed thing (at ground x youX): if it would stand in the way, it fades out gently as it
 *  nears the lens; well to the side it stays solid and sweeps past, cropped by the frame (NAMI's rule, v3.14). */
export function theatreFade(cam, set, youX, x, depth) {
  const haze = 1 - 0.5 * Math.min(1, Math.max(0, (depth - set.haze) / (set.haze * 2)));
  if (depth >= set.back - 100) return haze;
  const lineX = cam.x + (youX - cam.x) * (depth / set.back);         // the camera's line of sight to you, at this depth
  const aside = Math.abs(x - lineX);
  const blocking = 1 - Math.min(1, Math.max(0, (aside - 260) / 160));
  const solo = Math.min(1, Math.max(0, (depth - set.back * 0.55) / (set.back * 0.2)));
  const edge = Math.min(1, Math.max(0, (depth - 150) / 150));
  return (blocking * solo + (1 - blocking) * edge) * haze;
}
