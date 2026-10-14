import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';
import { nearestOnPath, pointAlong, pathLength } from '../engine/path.js';

// NAMI's passers-by: strolling along a path, coming towards you (down the map) or ambling on ahead (up it), keeping to
// their own lane. They step aside when someone is in their way, and once they are well behind that someone (wire in
// Find player) they set off again further up the path, so the path never empties. Past the path's end they come from
// beyond the far trees.
defineNode({
  type: 'walk-path', title: 'Walk the path', kind: 'part',
  help: 'Strolls along a path, towards you or on ahead, in its own lane; steps aside for you; once behind you it sets off again further up.',
  inputs: {
    path: { type: 'path', value: '', setting: true, help: 'The path to walk.' },
    toward: { type: 'yesno', value: true, label: 'towards you?', help: 'Yes = walks down the map, towards you (facing you). No = ambles on ahead, up the map.' },
    speed: { type: 'number', value: 70, help: 'Walking speed (scene units a second).' },
    around: { type: 'thing', value: null, label: 'stay around', help: 'Whose stroll it keeps to (wire in Find player): it steps aside for them and sets off again ahead of them.' },
    room: { type: 'number', value: 130, help: 'How close in front of them it may come before stepping aside.' },
    behind: { type: 'number', value: 300, help: 'How far behind them it goes before setting off again ahead.' },
    ahead: { type: 'number', value: 5500, help: 'Roughly how far ahead of them it sets off again.' },
  },
  outputs: {
    moving: { type: 'yesno', label: 'moving?', help: 'Yes while walking (always, unless the path is missing).' },
    again: { flow: true, label: 'set off again', help: 'Fires when it reappears further up the path (e.g. to let it bow again).' },
  },
  create(n) { Object.assign(n.state, { r: seeded(n.me.id + ':walk'), along: null, off: 0 }); },
  tick(n, dt) {
    const s = n.state, p = n.me.pos, path = n.in('path') && (n.world.files.scene.paths || {})[n.in('path')];
    if (!path) return;
    const L = pathLength(path);
    if (s.along === null) {                                      // where it starts: along the path, and its lane
      const near = nearestOnPath(path, p[0], p[1]), pt = pointAlong(path, near.along);
      s.along = near.along; s.off = (p[0] - pt.x) * -pt.dy + (p[1] - pt.y) * pt.dx;
    }
    const dir = n.in('toward') ? -1 : 1, who = n.in('around');
    let blocked = false;
    if (who && !who.removed) {
      const ax = p[0] - who.pos[0], ay = p[1] - who.pos[1];
      // close by: step out of their way (never just freeze, which could box them in)
      if (Math.hypot(ax, ay) < 160) { s.off += (Math.sign(s.off - offOf(path, who.pos)) || 1) * 90 * dt; blocked = true; }
      // coming at them in the same lane: drift aside in good time
      else if (Math.abs(ay) < 600 && Math.sign(ay) === dir && Math.abs(ax) < n.in('room')) s.off += (Math.sign(s.off - offOf(path, who.pos)) || 1) * 70 * dt;
      // gone behind them (or wandered too far ahead): set off again further up the path
      const theirs = nearestOnPath(path, who.pos[0], who.pos[1]).along;
      if (s.along < theirs - n.in('behind') || s.along > theirs + n.in('ahead') * 2) {
        let a = theirs + n.in('ahead') * (dir < 0 ? 0.75 + s.r() * 0.75 : 0.45 + s.r() * 0.5);
        if (a > L + 2000) a = L + 4500 + s.r() * 2500;           // no room up the path: from beyond the far trees
        s.along = a; s.off = (s.r() - 0.5) * path.width * 0.45;
        place(path, s, p);
        n.fire('again');
        return;
      }
    }
    if (!blocked) s.along += dir * n.in('speed') * dt;
    // passing a space people keep clear of (Keep clear): keep to the far side of it, all the way past (NAMI)
    for (const z of n.world.clearZones()) {
      const zn = nearestOnPath(path, z.x, z.y);
      if (Math.abs(zn.along - s.along) > z.r + 400) continue;
      const zoff = offOf(path, [z.x, z.y]), side = Math.abs(zoff) > 30 ? -Math.sign(zoff) : Math.sign(s.off - zoff) || 1;
      const want = zoff + side * (z.r + 80);
      if (Math.sign(s.off - want) === side) continue;            // already beyond it
      s.off += Math.sign(want - s.off) * Math.min(Math.abs(want - s.off), 90 * dt);
    }
    place(path, s, p);
  },
  read: { moving: (n) => n.state.along !== null },
});

// a place's sideways offset from the path's middle (+ = to the right, walking up the map)
function offOf(path, pos) {
  const near = nearestOnPath(path, pos[0], pos[1]), pt = pointAlong(path, near.along);
  return (pos[0] - pt.x) * -pt.dy + (pos[1] - pt.y) * pt.dx;
}
function place(path, s, p) {
  const pt = pointAlong(path, s.along);
  p[0] = pt.x - pt.dy * s.off; p[1] = pt.y + pt.dx * s.off;
}
