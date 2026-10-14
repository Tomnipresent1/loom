import { defineNode } from '../engine/registry.js';
import { keepInside, nearestOnPath } from '../engine/path.js';

// NAMI's Plum Blossom walk: hold a finger anywhere to stroll ahead (up the map = into the theatre view's picture), slide
// it left or right to step aside (a trackpad: she moves with the finger's movement, at once), let go and she eases to a
// stop. Keys: up to stroll, left / right to step. Ported from NAMI's garden.js (GTUNE walkSpeed, ease, aimLead).
const LEAD = 25;                 // how far ahead of her the finger can get, sideways (small = reversing answers at once)

defineNode({
  type: 'stroll', title: 'Stroll', kind: 'part',
  help: 'The player strolls this thing ahead (up the map): hold a finger to walk, slide it sideways to step aside, let go to stand. Keys: up, left, right.',
  inputs: {
    speed: { type: 'number', value: 150, help: 'Strolling speed, in scene units per second (150 = NAMI\'s 1.5 metres a second).' },
    ease: { type: 'number', value: 1.6, help: 'How briskly she starts and stops: small = gentle, big = at once.' },
    step: { type: 'number', value: 200, help: 'Top sideways speed when stepping aside, in scene units per second.' },
    slide: { type: 'number', value: 1360, help: 'How far she steps aside for a finger slide the height of the screen (bigger = a faster finger).' },
    body: { type: 'number', value: 45, help: 'Her own size for bumping into Solid things (a circle this wide round her).' },
    nudge: { type: 'number', value: 90, help: 'Walking straight into something, she drifts round it sideways at this speed (toward the side with more room), so she never gets stuck.' },
    stop: { type: 'yesno', value: false, label: 'stand still?', help: 'While yes, she stops (quickly) and stands, whatever the finger does: e.g. while she picks something up.' },
    path: { type: 'path', value: '', setting: true, label: 'keep to', help: 'A path in the scene she can\'t wander off (its width is the edges). Empty = anywhere in the scene.' },
  },
  outputs: {
    moving: { type: 'yesno', label: 'moving?', help: 'Yes while she is walking or stepping.' },
    pace: { type: 'number', label: 'pace now', help: 'How fast she is walking ahead right now (0 when standing).' },
  },
  create(n) { n.state.v = 0; n.state.vx = 0; n.state.drag = null; },
  tick(n, dt) {
    const { move, finger } = n.world.input, s = n.state, p = n.me.pos, still = !!n.in('stop');
    const walking = !still && (!!finger || (move && move[1] < -0.1));
    s.v += ((walking ? n.in('speed') : 0) - s.v) * Math.min(1, dt * (still ? 6 : n.in('ease')));       // (standing still: she stops quickly)
    if (!walking && s.v < 1) s.v = 0;
    let want;
    if (still) { s.drag = null; want = 0; }
    else if (finger) {
      if (!s.drag || s.drag.id !== finger.id) s.drag = { x: finger.x, aim: p[0], id: finger.id };     // a new touch: start from here
      s.drag.aim += ((finger.x - s.drag.x) / 600) * n.in('slide');
      s.drag.x = finger.x;
      s.drag.aim = Math.min(p[0] + LEAD, Math.max(p[0] - LEAD, s.drag.aim));
      want = Math.max(-1, Math.min(1, (s.drag.aim - p[0]) * 0.08)) * n.in('step');
    } else {
      s.drag = null;
      want = Math.max(-1, Math.min(1, move ? move[0] : 0)) * n.in('step');
    }
    s.vx += (want - s.vx) * Math.min(1, dt * 20);
    if (!want && Math.abs(s.vx) < 1) s.vx = 0;
    // standing still: she stops where she is, and leaves her alone (something else may be moving her, e.g. Move to)
    if (still) { s.v = 0; s.vx = 0; return; }
    const [w, h] = n.world.bounds;
    p[0] = Math.min(w, Math.max(0, p[0] + s.vx * dt));
    p[1] = Math.min(h, Math.max(0, p[1] - s.v * dt));
    const path = n.in('path') && (n.world.files.scene.paths || {})[n.in('path')];
    bump(n, p, dt, walking, path);
    if (path) keepInside(path, p);
    if (s.drag) s.drag.aim = Math.min(p[0] + LEAD, Math.max(p[0] - LEAD, s.drag.aim));
  },
  read: { moving: (n) => n.state.v > 0 || n.state.vx !== 0, pace: (n) => n.state.v },
});

// Keep her out of Solid things: she is pushed back to their edge and slides round, never through. Walking straight into
// one, she drifts sideways toward the side with more room (the path's middle; the other way at the path's edge).
// (NAMI's garden.js collide.)
function bump(n, p, dt, walking, path) {
  const R = n.in('body');
  let hit = null;
  for (const o of n.world.solids(n.me)) {
    const cx = Math.min(o.x + o.hw, Math.max(o.x - o.hw, p[0]));            // (the nearest point of a long solid)
    const dx = p[0] - cx, dy = p[1] - o.y, reach = o.r + R;
    if (Math.abs(dx) >= reach || Math.abs(dy) >= reach) continue;
    const d = Math.hypot(dx, dy);
    if (d >= reach) continue;
    if (d < 1e-6) p[0] += reach;
    else { const k = (reach - d) / d; p[0] += dx * k; p[1] += dy * k; }
    hit = cx;
  }
  if (hit === null || !walking) return;
  const near = path ? nearestOnPath(path, p[0], p[1]) : null, mid = near ? near.x : hit;
  let side = Math.sign(p[0] - hit);
  if (Math.abs(p[0] - hit) < 5) side = Math.sign(mid - hit) || 1;
  if (path && Math.abs(p[0] + side * 60 - mid) > path.width / 2) side = -side;      // no room that way: the other way
  p[0] += side * n.in('nudge') * dt;
}
