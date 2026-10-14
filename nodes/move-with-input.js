import { defineNode } from '../engine/registry.js';

// Keys / arrows push this thing around; a held finger (or mouse) draws it towards the finger, easing in as it arrives.
// Glide: after letting go it keeps sliding and slows to a stop; glide is roughly the seconds that takes (0 = stops dead).
defineNode({
  type: 'move-with-input', title: 'Move with input', kind: 'part',
  help: 'The player walks this thing: keys push it, a held finger draws it along; glide = slide on after letting go.',
  inputs: {
    speed: { type: 'number', value: 220, help: 'Top walking speed, in scene units per second.' },
    glide: { type: 'number', value: 0, help: 'After letting go, roughly how many seconds it slides on. 0 = stops dead.' },
  },
  outputs: { moving: { type: 'yesno', label: 'moving?', help: 'Yes while this thing is moving.' } },
  create(n) { n.state.vel = [0, 0]; },
  tick(n, dt) {
    const { move, target } = n.world.input, p = n.me.pos, speed = n.in('speed'), vel = n.state.vel;
    let dx = move ? move[0] : 0, dy = move ? move[1] : 0;
    if (target) {
      const tx = target[0] - p[0], ty = target[1] - p[1], d = Math.hypot(tx, ty);
      const pull = d < 4 ? 0 : Math.min(1, d / 80);
      dx = d ? (tx / d) * pull : 0; dy = d ? (ty / d) * pull : 0;
    }
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    if (target || len > 0.01) { vel[0] = dx * speed; vel[1] = dy * speed; }     // steered: go where told
    else {                                                                    // let go: slide on, slowing down
      const glide = n.in('glide'), keep = glide > 0 ? Math.exp(-dt / glide) : 0;
      vel[0] *= keep; vel[1] *= keep;
      if (Math.hypot(vel[0], vel[1]) < 2) vel[0] = vel[1] = 0;
    }
    const [w, h] = n.world.bounds;
    const nx = Math.min(w, Math.max(0, p[0] + vel[0] * dt)), ny = Math.min(h, Math.max(0, p[1] + vel[1] * dt));
    if (nx !== p[0] + vel[0] * dt) vel[0] = 0;                                // stop sliding into the edge
    if (ny !== p[1] + vel[1] * dt) vel[1] = 0;
    p[0] = nx; p[1] = ny;
    n.state.moving = vel[0] !== 0 || vel[1] !== 0;
  },
  read: { moving: (n) => !!n.state.moving },
});
