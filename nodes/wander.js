import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';
import { nearestOnPath } from '../engine/path.js';

// NAMI's lingering admirers: wait a while, then wander a few steps to a new spot near where they were placed and admire
// the blossom from there. They keep off the middle of a path, keep clear of a kind of thing (e.g. fallen sprigs), and
// step out of the way when someone (wire in e.g. Find player) comes too close: they never just freeze in your way.
defineNode({
  type: 'wander', title: 'Wander', kind: 'part',
  help: 'Lingers near where it was placed: now and then it strolls a few steps to a new spot. Steps aside for someone coming close.',
  inputs: {
    reach: { type: 'number', value: 250, help: 'How far from where it was placed it may wander.' },
    pause: { type: 'number', value: 8, help: 'Roughly how many seconds it lingers before wandering on.' },
    speed: { type: 'number', value: 55, help: 'Its walking speed (scene units a second; 55 = an unhurried shuffle).' },
    path: { type: 'path', value: '', setting: true, label: 'keep off the middle of', help: 'A path whose middle it keeps off (it stands to the sides).' },
    keep: { type: 'number', value: 220, label: 'this far', help: 'How far from the path\'s middle it keeps.' },
    shun: { type: 'kind', value: '', setting: true, label: 'never onto', help: 'A kind of thing it never wanders onto (e.g. sprig).' },
    gap: { type: 'number', value: 180, help: 'How far it keeps from that kind of thing.' },
    from: { type: 'thing', value: null, label: 'step aside for', help: 'Someone it steps out of the way for (wire in Find player).' },
    room: { type: 'number', value: 160, help: 'How close they may come before it steps aside.' },
  },
  outputs: { moving: { type: 'yesno', label: 'moving?', help: 'Yes while it walks to a new spot or steps aside.' } },
  create(n) { const r = seeded(n.me.id + ':wander'); Object.assign(n.state, { r, target: null, wait: 1 + r() * 6, moving: false }); },
  tick(n, dt) {
    const s = n.state, p = n.me.pos, home = n.me.home;
    s.moving = false;
    // someone close: step sideways, away from them (and its spot moves with it)
    const who = n.in('from');
    if (who && !who.removed) {
      const ax = p[0] - who.pos[0], ay = p[1] - who.pos[1];
      if (Math.hypot(ax, ay) < n.in('room')) {
        const side = Math.abs(ax) > 5 ? Math.sign(ax) : (s.r() < 0.5 ? -1 : 1);
        p[0] += side * 90 * dt; home[0] += side * 90 * dt; s.target = null; s.moving = true;
        return;
      }
    }
    // inside a space people keep clear of (Keep clear): wander straight out of it
    const zones = n.world.clearZones();
    for (const z of zones) {
      const ox = p[0] - z.x, oy = p[1] - z.y, d = Math.hypot(ox, oy);
      if (d < z.r) {
        const k = (90 * dt) / (d || 1);
        p[0] += d ? ox * k : 90 * dt; p[1] += oy * k; home[0] = p[0]; home[1] = p[1]; s.target = null; s.moving = true;
        return;
      }
    }
    if (s.target) {
      const dx = s.target[0] - p[0], dy = s.target[1] - p[1], d = Math.hypot(dx, dy);
      if (d > 5) {
        const sp = Math.min(n.in('speed'), d * 2);
        p[0] += (dx / d) * sp * dt; p[1] += (dy / d) * sp * dt; s.moving = true;
        return;
      }
      s.target = null;
    }
    if ((s.wait -= dt) > 0) return;
    s.wait = n.in('pause') * (0.5 + s.r());
    const reach = n.in('reach');
    let t = [home[0] + (s.r() - 0.5) * 2 * reach, home[1] + (s.r() - 0.5) * 1.6 * reach];
    // keep to the sides of the path
    const path = n.in('path') && (n.world.files.scene.paths || {})[n.in('path')];
    if (path) {
      const near = nearestOnPath(path, t[0], t[1]), keep = n.in('keep');
      if (near.dist < keep) {                                   // too near the middle: out to the side it was on
        const ox = t[0] - near.x, oy = t[1] - near.y, d = Math.hypot(ox, oy);
        t = d > 1 ? [near.x + (ox / d) * keep, near.y + (oy / d) * keep] : [near.x + (p[0] < near.x ? -keep : keep), near.y];
      }
    }
    // never onto the shunned kind (it just stays and looks about instead)
    const shun = n.in('shun'), gap = n.in('gap');
    if (shun && n.world.instances.some((o) => o.kind === shun && !o.removed && Math.hypot(o.pos[0] - t[0], o.pos[1] - t[1]) < gap)) return;
    if (zones.some((z) => Math.hypot(z.x - t[0], z.y - t[1]) < z.r + 50)) return;               // (nor into a clear space)
    s.target = t;
  },
  read: { moving: (n) => !!n.state.moving },
});
