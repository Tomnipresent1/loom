// How a scene is looked at (scene.camera.style). Pure maths, no DOM: the renderers draw with it, the editor shows its
// numbers, the tests check it.
//   map:     straight down from above (x right, y down the screen); z is ignored.
//   theatre: the paper-theatre view from NAMI's Plum Blossom. The ground is x / y (as on the map: the editor's scene tab
//            stays the top view), z is height. The camera floats behind and above the thing it follows, looking up the
//            map (towards smaller y), so "up" on the map is "ahead, into the picture". It never tilts: the horizon is
//            shifted instead (like a Maya film offset), so upright things stay upright, as in the prints.
//            Scale: about 100 scene units to a metre.
//   side:    a side-scroller (Autumn): the same world as the theatre (x along, y into the picture, z height), seen
//            side-on by a level camera standing "back" in front of the followed thing, sliding along with it, looking
//            ahead the way it walks and rising gently when it climbs. Real perspective, so far layers (small y) slide by
//            slower and near ones (bigger y, between camera and her) faster: parallax for free. Walkers stand on the
//            ground (z 0) and on Ledges. The editor's scene tab shows this scene from the side (x across, z up).

export const CAMERA_STYLES = ['map', 'theatre', 'side'];
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
  side: {
    lens: 35,          // mm, as the theatre's (35 with back 1000: a person ~1.65 m tall is about a quarter of the screen)
    back: 1000,        // how far in front of the followed thing the camera stands (with lens, sets how big things look)
    lift: 110,         // how high above the followed thing's feet the camera's eye is (higher = she sits lower, more ground)
    horizon: 0.5,      // where the horizon sits: 0 = top of the screen, 1 = bottom (a film offset; the camera stays level)
    haze: 5000,        // the air: this far behind her, things have taken on about two thirds of the sky's colour
    ease: 3,           // how tightly the camera slides along after the followed thing (bigger = tighter)
    rise: 1.5,         // how tightly it follows up and down (small: a jump barely moves it; a climb brings it up)
    lead: 0.8,         // looks ahead the way it walks: this many seconds of walking (and stays ahead when it stops)
    turn: 1.5,         // how quickly the look ahead swings round when it turns and walks the other way
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
  for (const k of new Set(CAMERA_STYLES.flatMap((style) => Object.keys(CAMERA_DEFAULTS[style])))) {
    if (camera[k] !== undefined && !Number.isFinite(camera[k])) out.push(`${where}: camera "${k}" should be a number`);
  }
  return out;
}

// ---- the theatre view ----
// A camera here is { x, y } (where it stands on the ground) plus the settings. Screen is W x H pixels.
// (The side view's camera also has z, its eye's height; the theatre's eye is always at the "height" setting.)
export const focalPx = (set, W, H) => (set.lens / FILM) * Math.min(W, H);

/** Scene point [x, y, z] -> [screen x, screen y, pixels per unit at that depth, depth], or null if behind the lens. */
export function theatreProject(cam, set, W, H, x, y, z = 0) {
  const depth = cam.y - y;
  if (depth < NEAR) return null;
  const s = focalPx(set, W, H) / depth, eye = cam.z !== undefined ? cam.z : set.height;
  return [W / 2 + (x - cam.x) * s, set.horizon * H + (eye - z) * s, s, depth];
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

// ---- the side view ----
// The camera is { x, y, z } (where its eye is), speed (how fast the followed thing is moving along, smoothed over a
// few frames), v (the walking speed it looks ahead by) and last (the followed thing's x last time). Drawing uses
// theatreProject (the same lens maths, eye at cam.z).
// Looking ahead (Tom's pick, 2026-10-16): it looks ahead the way she walks, by the fastest she has walked that way, and
// stays there when she slows or stops (no swinging back to her); it only swings round when she walks the other way.

/** Move the side camera after the thing it follows (want = its [x, y, z]); W x H = the screen, length = the scene's
 *  width (the camera stops before showing past either end). First call (cam null): starts right there. */
export function sideAim(cam, set, want, dt, W, H, length) {
  const y = want[1] + set.back, z = (want[2] || 0) + set.lift;
  let out;
  if (!cam || Math.abs(want[0] - cam.last) > 1000) out = { x: want[0], y, z, speed: 0, v: 0, last: want[0] };   // a restart: no long glide
  else {
    // (a sudden jump of the followed thing, put somewhere new, isn't walking: it doesn't count; nor does anything faster
    // than a run)
    const moved = want[0] - cam.last, seen = Math.abs(moved) > 200 ? cam.speed : Math.max(-800, Math.min(800, moved / Math.max(dt, 1e-3)));
    const speed = cam.speed + (seen - cam.speed) * Math.min(1, dt * 8);
    let v = cam.v;
    if (Math.abs(speed) > 5 && (Math.sign(speed) !== Math.sign(v) || Math.abs(speed) > Math.abs(v))) v += (speed - v) * Math.min(1, dt * set.turn);
    const aim = want[0] + v * set.lead;
    out = { x: cam.x + (aim - cam.x) * Math.min(1, dt * set.ease), y, z: cam.z + (z - cam.z) * Math.min(1, dt * set.rise), speed, v, last: want[0] };
  }
  const half = ((W / 2) * set.back) / focalPx(set, W, H);         // half the screen's width, at the followed thing's depth
  out.x = length > 2 * half ? Math.min(length - half, Math.max(half, out.x)) : length / 2;
  return out;
}

/** Screen point -> the place at that spot on the followed thing's plane (depth from the camera): [x, y, z]. */
export function sidePick(cam, set, W, H, sx, sy, depth) {
  const s = focalPx(set, W, H) / depth;
  return [cam.x + (sx - W / 2) / s, cam.y - depth, cam.z - (sy - set.horizon * H) / s];
}

/** How solid a thing at this depth from the camera is drawn in the side view (0..1): right up against the lens it fades
 *  out (nothing pops huge across the screen). (Distance doesn't fade things: the air colours them, see sideHaze.) */
export function sideFade(set, depth) {
  return Math.min(1, Math.max(0, (depth - 40) / 80));
}
/** How much air lies between the camera and a thing at this depth, beyond the followed thing (0 = none .. nearly 1):
 *  painted things take on that much of the sky's colour (aerial perspective); pictures fade by part of it. */
export function sideHaze(set, depth) {
  return 1 - Math.exp(-Math.max(0, depth - set.back) / Math.max(1, set.haze));
}
