// Keeping it smooth on any phone (from NAMI's quality.js: v3.22, when Plum Blossom jittered on a budget phone; in
// LOOM's player since 2026-10-17, so every piece gets it). Two parts:
//   how sharp it is drawn: SHARP = the screen's full sharpness (up to 2 canvas pixels per screen point), SMOOTH = plain
//     1x (a quarter of the pixels), AUTO (the default) starts sharp and quietly steps down (2 → 1.5 → 1) if the frames
//     come too slowly while a scene plays, then remembers what this phone needed
//   the clock's safety catch: the game runs in fixed 1/60 s steps; a phone that falls behind catches up with a few
//     extra steps a frame, but never more than MAX_STEPS (more would make each frame slower still: a snowball of
//     stutter): beyond that the game runs a little slower instead
// No page access here (the selftest runs it): the player keeps the setting and feeds the watcher.
export const QUALITY = ['auto', 'smooth', 'sharp'];
export const RES_STEPS = [2, 1.5, 1];                // the most canvas pixels per screen point; AUTO walks down these
export const view = { res: 2 };                      // read by the renderers when they size the canvas

/** Canvas pixels per screen point right now (the screen's own, up to view.res). */
export function pixelRatio(screen = 1) { return Math.min(screen || 1, view.res); }

/** The sharpness a setting asks for ('auto' = the watcher's step). */
export function resFor(setting, autoRes) { return setting === 'smooth' ? 1 : setting === 'sharp' ? 2 : RES_STEPS[autoRes.step]; }

// AUTO's watcher: frame gaps are collected only while a scene is playing. After a settling second it looks at 2-second
// windows; two slow windows in a row (the typical gap longer than SLOW_MS, i.e. under about 45 frames a second) = one
// step down.
export const SLOW_MS = 22;
export function createAutoRes(start = 0) {
  const a = { step: Math.max(0, Math.min(RES_STEPS.length - 1, start | 0)), warm: 0, gaps: [], span: 0, slow: 0 };
  a.reset = () => { a.warm = 0; a.gaps.length = 0; a.span = 0; a.slow = 0; };
  /** One frame: the gap in ms since the last one, and whether a scene is playing. Returns true when it stepped down. */
  a.feed = (gap, active) => {
    if (!active || gap > 250) { a.warm = 0; a.gaps.length = 0; a.span = 0; return false; }   // hidden, or a hiccup
    if ((a.warm += gap) < 1000) return false;
    a.gaps.push(gap); a.span += gap;
    if (a.span < 2000) return false;
    const sorted = a.gaps.slice().sort((x, y) => x - y), typical = sorted[sorted.length >> 1];
    a.gaps.length = 0; a.span = 0;
    a.slow = typical > SLOW_MS ? a.slow + 1 : 0;
    if (a.slow < 2 || a.step >= RES_STEPS.length - 1) return false;
    a.step++; a.reset();
    return true;
  };
  return a;
}

// The clock: `spare` = time owed to the game (s). Returns how many fixed steps to run now and what is still owed.
export const MAX_STEPS = 3;                          // (3 steps of 1/60 s keep up down to 20 frames a second)
export function clockSteps(spare, step, most = MAX_STEPS) {
  const run = Math.min(most, Math.floor(spare / step));
  return { run, spare: Math.min(step, spare - run * step) };    // (still behind after that: the rest of the time goes)
}

// Frames a second, roughly, for the status note: a smoothed average of the gaps.
export function createFps() {
  let avg = 1000 / 60;
  return { feed(gap) { if (gap > 0 && gap < 250) avg += (gap - avg) * 0.05; }, get fps() { return 1000 / avg; } };
}
