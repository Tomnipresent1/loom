import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';
import { quadrupedPose, PUPPY } from '../engine/quadruped.js';
import { nearestBird } from './birds.js';

// A playful puppy (Autumn; Tom's pick A: she stays and plays). She hides (unseen) until "come out" (e.g. the big pile
// tells her when the girl lands in it), then leaps out towards the girl and plays: bounding to spots around her,
// play-bowing with her tail going when the girl stands still, pouncing on piles of leaves (her landings burst them:
// she has feet), and now and then a mad dash off and back (zoomies). The opposite of the shy cat: she's never far.
// Birds about (a Birds box): she runs under the nearest, looks up and yaps at it a while (a little hop now and then),
// then back to playing. Drawn by runtime/dog2d.js.
const GRAVITY = 1700;

defineNode({
  type: 'puppy', title: 'Puppy', kind: 'part',
  help: 'A playful puppy: hidden until "come out", then she leaps out and plays round someone: bounding about, play-bows, pouncing on leaf piles, the odd mad dash. Wags all the while.',
  inputs: {
    out: { flow: true, label: 'come out', help: 'She leaps out of hiding (once; again does nothing).' },
    follows: { type: 'kind', value: 'player', setting: true, help: 'Who she plays round.' },
    hiding: { type: 'yesno', value: true, setting: true, label: 'hiding at first?', help: 'Yes: unseen until "come out". No: out from the start.' },
    near: { type: 'number', value: 150, label: 'plays within', help: 'How far from the girl she bounds about (about 100 = a metre).' },
    walk: { type: 'number', value: 150, help: 'Her trotting speed.' },
    run: { type: 'number', value: 360, help: 'Her running speed (dashes, zoomies).' },
    pounce: { type: 'number', value: 1, help: 'How keen she is on pouncing on leaf piles: 0 = never, 1 = often, 2 = always at it.' },
    zoomies: { type: 'number', value: 1, help: 'How often she has a mad dash off and back: 0 = never, 1 = now and then.' },
    barks: { type: 'number', value: 1, label: 'barks at birds', help: 'How keen she is to bark at birds and squirrels (a Birds or Squirrels box nearby): 0 = never, 1 = a puppy, 2 = she keeps at it.' },
    colour: { type: 'colour', value: '#c98a4b', help: 'Her coat.' },
    chest: { type: 'colour', value: '#f2dfc4', help: 'Her chest and muzzle.' },
    ears: { type: 'colour', value: '#8a5a30', help: 'Her ears.' },
    size: { type: 'number', value: 1, help: '1 = a young puppy (about 50 long).' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  outputs: {
    came: { flow: true, label: 'came out', help: 'Fires as she leaps out of hiding.' },
    pounced: { flow: true, help: 'Fires as she lands from a pounce.' },
    step: { flow: true, help: 'Fires as her paws come down while she runs about.' },
    barked: { flow: true, help: 'Fires each time she yaps at a bird (wire an Animal call: puppy bark, or a recorded yip with Play sound).' },
    hidden: { type: 'yesno', label: 'hiding?', help: 'Yes while she is still hidden.' },
  },
  create(n) {
    Object.assign(n.state, { rnd: seeded(`puppy ${n.me.id}`), hidden: null, vx: 0, vz: 0, facing: -1, mode: 'play', modeT: 0, target: null, retarget: 0,
      bow: 0, bowT: 0, zoomT: 15, cycle: 0, landing: null, landings: 0, pouncing: false, blink: 2, barkCool: 0, yapT: 0, yapping: 0, look: 0, birdX: null });
  },
  on: {
    out(n) {
      const s = n.state;
      if (s.hidden === null) s.hidden = !!n.in('hiding');
      if (!s.hidden) return;
      s.hidden = false;
      const girl = find(n), p = n.me.pos, dir = girl ? Math.sign(girl.pos[0] - p[0]) || 1 : 1;
      s.vz = 560; s.vx = dir * 230; s.facing = dir; s.mode = 'play'; s.retarget = 1.2;
      p[2] = Math.max(p[2] || 0, 5);
      n.fire('came');
    },
  },
  tick(n, dt) {
    const s = n.state, p = n.me.pos, rnd = s.rnd, size = Math.max(0.1, n.in('size'));
    if (s.hidden === null) s.hidden = !!n.in('hiding');
    if (s.hidden) return;
    const girl = find(n), z = p[2] || 0, air = z > 0 || s.vz > 0;
    let want = 0;
    if (girl && !air) {
      const g = girl.pos, near = n.in('near') * size;
      s.retarget -= dt; s.zoomT -= dt * Math.max(0, n.in('zoomies'));
      let girlVx = 0;
      girl.each((m) => { if (m.type.feet) { const f = m.type.feet(m); if (f) girlVx = f.vx; } });
      // birds about: off to bark at them (when they fly, or she spots one perched low near her)
      s.barkCool -= dt;
      // (only birds near the girl: she stays with her; the girl walking off, she gives up and follows)
      const keen = Math.max(0, n.in('barks')), byGirl = Math.abs(p[0] - g[0]) < 450;
      const spotted = keen > 0 && byGirl && s.barkCool <= 0 && s.mode === 'play' ? nearestBird(n, p[0], 500) : null;
      if (spotted && Math.abs(spotted.x - g[0]) < 600 && (spotted.flying || (spotted.z < 450 && Math.abs(spotted.x - p[0]) < 300))) { s.mode = 'bark'; s.modeT = 2.5 + rnd() * 2.5 * keen; s.yapT = 0.25; }
      if (s.mode === 'bark') {                                        // under the bird, looking up, yapping; a hop at it now and then
        const b = nearestBird(n, p[0], 700);
        s.birdX = b ? b.x : null; s.birdZ = b ? b.z : 0;
        if (!b || (s.modeT -= dt) <= 0 || Math.abs(p[0] - g[0]) > 600) { s.mode = 'play'; s.retarget = 0; s.barkCool = (8 + rnd() * 6) / Math.max(0.5, keen); s.birdX = null; }
        else {
          const dx = b.x - p[0];
          if (Math.abs(dx) > 45) want = Math.sign(dx) * Math.min(n.in('run'), n.in('walk') + Math.abs(dx) * 0.8);
          if ((s.yapT -= dt) <= 0 && Math.abs(dx) < 220) {
            s.yapT = 0.55 + rnd() * 0.7; s.yapping = 0.16;
            if (Math.abs(dx) <= 45 && rnd() < 0.3) s.vz = 230;
            n.fire('barked');
            if (n.me.removed) return;
          }
        }
      } else if (s.mode === 'bow') {                                  // a play-bow, tail going, then off she goes
        if ((s.modeT -= dt) <= 0) { s.mode = 'play'; s.retarget = 0; }
      } else if (s.mode === 'zoom') {                                 // a mad dash off and back
        if (Math.abs(s.target - p[0]) < 30) { s.mode = 'play'; s.retarget = 0; }
        else want = Math.sign(s.target - p[0]) * n.in('run');
      } else {
        if (s.zoomT <= 0) { s.mode = 'zoom'; s.target = clampX(n, g[0] + (rnd() < 0.5 ? -1 : 1) * (450 + rnd() * 250) * size); s.zoomT = 25 + rnd() * 25; }
        else if (s.retarget <= 0 || s.target === null || Math.abs(s.target - g[0]) > near * 2.5) {
          // somewhere new to be: round the girl; or (keen) a pile of leaves near her to pounce on
          const pile = n.in('pounce') > 0 && rnd() < 0.35 * n.in('pounce') ? pileNear(n, g[0], 450) : null;
          s.target = clampX(n, pile !== null ? pile : g[0] + (rnd() < 0.5 ? -1 : 1) * near * (0.4 + rnd() * 0.8));
          s.pouncing = pile !== null;
          s.retarget = 1.5 + rnd() * 2;
          if (Math.abs(girlVx) < 5 && rnd() < 0.3) { s.mode = 'bow'; s.modeT = 1.1; s.target = p[0]; }
        }
        const dx = s.target - p[0];
        if (s.pouncing && Math.abs(dx) < 90 && Math.abs(dx) > 30) {  // close: pounce onto it
          s.vz = 380; s.vx = Math.sign(dx) * 260; s.pouncing = 'air';
        } else if (Math.abs(dx) > 12) want = Math.sign(dx) * Math.min(n.in('run'), n.in('walk') + Math.abs(dx) * 0.8);
      }
    }
    if (air) {                                                        // in the air: a leap or a pounce
      s.vz -= GRAVITY * dt;
      p[0] = clampX(n, p[0] + s.vx * dt);
      p[2] = z + s.vz * dt;
      if (p[2] <= 0) {
        p[2] = 0; s.landing = { id: ++s.landings, impact: -s.vz, time: n.world.time }; s.vz = 0;
        if (s.pouncing === 'air') { s.pouncing = false; s.retarget = 0.4; n.fire('pounced'); }
      }
    } else {
      s.vx += (want * size - s.vx) * Math.min(1, dt * 6);
      if (!want && Math.abs(s.vx) < 3) s.vx = 0;
      p[0] = clampX(n, p[0] + s.vx * dt);
    }
    if (Math.abs(s.vx) > 10) s.facing = Math.sign(s.vx);
    else if (s.mode === 'bark' && s.birdX !== null) s.facing = Math.sign(s.birdX - p[0]) || s.facing;
    else if (girl && s.mode !== 'bow') s.facing = Math.sign(girl.pos[0] - p[0]) || s.facing;
    s.bow += ((s.mode === 'bow' ? 1 : 0) - s.bow) * Math.min(1, dt * 7);
    s.look += ((s.mode === 'bark' ? Math.min(1, Math.max(0.3, s.birdZ / 200)) : 0) - s.look) * Math.min(1, dt * 5);
    s.yapping = Math.max(0, s.yapping - dt);
    const before = s.cycle;
    s.cycle += (Math.abs(s.vx) * dt) / (55 * size);
    if (!air && Math.floor(before * 2) !== Math.floor(s.cycle * 2) && !n.me.removed) n.fire('step');
    s.blink -= dt; if (s.blink < -0.12) s.blink = 2 + rnd() * 3;
  },
  // her paws (none while hiding), for the leaves she runs through and pounces on
  feet(n) {
    const s = n.state, p = n.me.pos;
    if (s.hidden !== false) return null;
    return { x: p[0], y: p[1], z: p[2] || 0, vx: s.vx, vz: s.vz, standing: (p[2] || 0) <= 0 && s.vz <= 0, on: null, landing: s.landing, facing: s.facing, kick: null, strike: null };
  },
  draw(n, out) {
    const s = n.state;
    if (s.hidden !== false) return;
    const size = Math.max(0.1, n.in('size')), air = (n.me.pos[2] || 0) > 0;
    out.push({ kind: 'dog', at: n.me.pos, facing: s.facing, scale: size, colour: n.in('colour'), chest: n.in('chest'), ears: n.in('ears'), alpha: n.in('opacity'),
      tongue: Math.abs(s.vx) > 200 || s.mode === 'bow' || s.yapping > 0,
      pose: quadrupedPose({ phase: s.cycle % 1, speed: Math.abs(s.vx) / (150 * size), bow: s.bow, leap: air ? 1 : 0, lookUp: s.look, wag: 1, t: n.world.time, blink: s.blink < 0 }, PUPPY) });
  },
  read: { hidden: (n) => n.state.hidden !== false },
});

const find = (n) => n.world.instances.find((i) => i.kind === n.in('follows') && !i.removed && i !== n.me);
const clampX = (n, x) => Math.min(n.world.bounds[0], Math.max(0, x));
// the middle of a ground pile of leaves near x (not a carpet, not leaves on a branch), with leaves still lying in it
function pileNear(n, x, within) {
  let best = null;
  for (const i of n.world.instances) i.each((m) => {
    if (m.type.type !== 'leaf-pile' || m.state.branch || m.in('width') > 2000 || (m.state.still || 0) < 10) return;
    const d = Math.abs(i.pos[0] - x);
    if (d < within && (best === null || d < Math.abs(best - x))) best = i.pos[0];
  });
  return best;
}
