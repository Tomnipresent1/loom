import { defineNode } from '../engine/registry.js';
import { TOSS } from '../engine/character.js';

// Side-on walking, for the side camera (Autumn): hold a finger to the left or right of her and she walks that way (the
// further from her, the faster, up to her top speed); a quick tap makes her jump. Gravity brings her down onto the
// ground (height 0) or onto a Ledge; she jumps up through ledges from below and lands on top, follows their slope, and
// falls when she walks off an end. On a springy ledge (a branch) she rides its bend, and a jump as it swings up gets
// a lift from it (its bounce). A quick sideways flick (or K) is a kick that way: she stops, turns, swings her leg, and
// as her foot comes through "kicked" fires (and leaves there fly: Leaf pile). A quick swipe up (or T) is a toss: she
// stops, bends down, scoops up the leaves at her feet (a Leaf pile hands them to her), straightens and throws them
// up over her head ("tossed"). Keys: left / right, space or up to jump, K or down to kick, T to toss.
// A jump is set by how high (jump) and how long it takes to reach the top (float): gravity follows from the two.
const DEAD = 12;        // a finger this close to her (sideways, in scene units) means stand
const FULL = 200;       // ...and this far or further, full speed
const COYOTE = 0.1;     // seconds after walking off an edge when a jump still counts (it feels fair)
const EARLY = 0.15;     // seconds a tap is remembered before landing (a tap just too early still jumps)
export const KICK = 0.45, STRIKE = 0.2;   // a kick takes this long; her foot comes through this far into it (seconds)

defineNode({
  type: 'walk-and-jump', title: 'Walk and jump', kind: 'part',
  help: 'Side-on walking for the side camera: hold a finger left or right of her to walk that way, tap to jump. Gravity brings her down onto the ground or a Ledge. Keys: left / right, space or up.',
  inputs: {
    speed: { type: 'number', value: 180, help: 'Top walking speed, in scene units a second (about 100 = a metre).' },
    ease: { type: 'number', value: 8, help: 'How briskly she starts and stops: small = slow to get going and slides to a stop, big = at once.' },
    jump: { type: 'number', value: 110, help: 'How high a jump lifts her feet, in scene units.' },
    float: { type: 'number', value: 0.36, help: 'Seconds from leaving the ground to the top of a jump: bigger = floatier, and a gentler fall.' },
    air: { type: 'number', value: 0.6, label: 'air steering', help: 'How much she can steer in the air: 0 = not at all, 1 = as well as on the ground. Let go and she carries on as she was.' },
    stop: { type: 'yesno', value: false, label: 'stand still?', help: 'While yes, she stops walking and doesn\'t jump (gravity still works): e.g. while a card is up.' },
  },
  outputs: {
    jumped: { flow: true, help: 'Fires as she leaves the ground in a jump.' },
    kicked: { flow: true, help: 'Fires as her foot swings through in a kick (a quick sideways flick, or K).' },
    tossed: { flow: true, help: 'Fires as she throws up the leaves she scooped (a quick swipe up, or T: she bends down for them first).' },
    landed: { flow: true, help: 'Fires as she lands, on the ground or on a ledge.' },
    impact: { type: 'number', label: 'landing speed', help: 'How fast she was falling when she last landed, in scene units a second (a little hop about 600, a drop from a high branch 1000+).' },
    moving: { type: 'yesno', label: 'walking?', help: 'Yes while she walks along the ground or a ledge.' },
    standing: { type: 'yesno', label: 'on her feet?', help: 'Yes while she is on the ground or a ledge; no while she is in the air.' },
    pace: { type: 'number', help: 'How fast she is moving sideways right now (always 0 or more).' },
    facing: { type: 'number', help: 'Which way she faces: 1 = right, −1 = left.' },
  },
  create(n) { Object.assign(n.state, { vx: 0, vz: 0, grounded: false, on: null, coyote: 0, early: 0, facing: 1, impact: 0, landing: null, landings: 0, kick: null, kicks: 0, strike: null,
    toss: null, tosses: 0, gather: null, fling: null }); },
  // her feet, for things she walks through (leaves) or stands on (ledges): where, how fast, what she stands on (the
  // Ledge box, or null for the ground), her last landing, a kick going on ({ t, dir }) and her last kick's strike; a
  // toss going on ({ t, dir }), the moment her hands last scooped (gather) and last threw (fling)
  feet(n) {
    const s = n.state, p = n.me.pos;
    return { x: p[0], y: p[1], z: p[2] || 0, vx: s.vx, vz: s.vz, standing: s.grounded, on: s.grounded ? s.on : null, landing: s.landing, facing: s.facing,
      kick: s.kick ? { t: s.kick.t, dir: s.kick.dir } : null, strike: s.strike,
      toss: s.toss ? { t: s.toss.t, dir: s.toss.dir } : null, gather: s.gather, fling: s.fling };
  },
  begin(n) {
    const p = n.me.pos, top = support(n, p[0], p[2] || 0, 0, null);
    if (top) { p[2] = top.z; n.state.grounded = true; n.state.on = top.on; }
  },
  tick(n, dt) {
    const s = n.state, p = n.me.pos, input = n.world.input, still = !!n.in('stop');
    // which way she is asked to go: -1 .. 1
    let want = 0;
    if (!still) {
      if (input.target) { const dx = input.target[0] - p[0]; want = Math.abs(dx) < DEAD ? 0 : Math.max(-1, Math.min(1, dx / FULL)); }
      else if (input.move) want = Math.max(-1, Math.min(1, input.move[0]));
    }
    // a kick: she stops and turns the way it goes; part way through, her foot comes through ("kicked")
    if (input.kick && s.grounded && !still && !s.kick && !s.toss) {
      const dir = input.kick === 2 ? s.facing : Math.sign(input.kick);
      s.facing = dir; s.kick = { t: 0, dir, id: ++s.kicks };
    }
    if (s.kick) {
      want = 0;
      const before = s.kick.t;
      s.kick.t += dt;
      if (before < STRIKE && s.kick.t >= STRIKE) {
        s.strike = { id: s.kick.id, dir: s.kick.dir, time: n.world.time };
        n.fire('kicked');
        if (n.me.removed) return;
      }
      if (s.kick.t >= KICK || !s.grounded) s.kick = null;
    }
    // a toss: she stops, bends down and scoops (gather: the leaves at her feet go into her hands), straightens and
    // throws them up over her head (fling: "tossed"), and watches them come down
    if (input.toss && s.grounded && !still && !s.kick && !s.toss) s.toss = { t: 0, dir: s.facing, id: ++s.tosses };
    if (s.toss) {
      want = 0;
      const before = s.toss.t;
      s.toss.t += dt;
      if (before < TOSS.gather && s.toss.t >= TOSS.gather) s.gather = { id: s.toss.id, time: n.world.time };
      if (before < TOSS.fling && s.toss.t >= TOSS.fling) {
        s.fling = { id: s.toss.id, dir: s.toss.dir, time: n.world.time };
        n.fire('tossed');
        if (n.me.removed) return;
      }
      if (s.toss.t >= TOSS.len || !s.grounded) s.toss = null;
    }
    if (want) s.facing = Math.sign(want);
    const speed = n.in('speed'), ease = n.in('ease');
    if (s.grounded) s.vx += (want * speed - s.vx) * Math.min(1, dt * ease);
    else if (want) s.vx += (want * speed - s.vx) * Math.min(1, dt * ease * Math.max(0, n.in('air')));
    if (s.grounded && !want && Math.abs(s.vx) < 2) s.vx = 0;

    // jumping: a tap now, or just before she landed; or just after she walked off an edge
    const h = Math.max(1, n.in('jump')), t = Math.max(0.05, n.in('float')), g = (2 * h) / (t * t);
    s.early = input.tap && !still ? EARLY : Math.max(0, s.early - dt);
    if (s.kick || s.toss) s.early = 0;                              // (no jumping mid-kick or mid-toss)
    s.coyote = s.grounded ? COYOTE : Math.max(0, s.coyote - dt);
    if (still) s.early = 0;
    if (s.early > 0 && s.coyote > 0) {
      const lift = s.grounded && s.on && s.on.type.rise ? s.on.type.rise(s.on, p[0]) : 0;    // (a springy branch swinging up)
      s.vz = (2 * h) / t + lift; s.grounded = false; s.coyote = 0; s.early = 0;
      n.fire('jumped');
      if (n.me.removed) return;
    }

    // moving
    const [w] = n.world.bounds, z = p[2] || 0, nx = Math.min(w, Math.max(0, p[0] + s.vx * dt));
    if (nx !== p[0] + s.vx * dt) s.vx = 0;                          // the scene's end: stop
    const dx = Math.abs(nx - p[0]);
    p[0] = nx;
    if (s.grounded) {                                                // keep to what she stands on (its slope); off its end: fall
      const top = support(n, nx, z, dx, s.on);
      if (top) { p[2] = top.z; s.on = top.on; } else { s.grounded = false; s.vz = 0; }
      return;
    }
    s.vz -= g * dt;
    const nz = z + s.vz * dt;
    if (s.vz <= 0) {
      const land = landing(n, nx, z, nz);
      if (land) {
        s.impact = -s.vz; s.vz = 0; s.grounded = true; p[2] = land.z; s.on = land.on;
        s.landing = { id: ++s.landings, impact: s.impact, time: n.world.time, on: land.on };
        n.fire('landed');
        return;
      }
    }
    p[2] = nz;
  },
  read: {
    impact: (n) => n.state.impact,
    moving: (n) => n.state.grounded && Math.abs(n.state.vx) > 5,
    standing: (n) => n.state.grounded,
    pace: (n) => Math.abs(n.state.vx),
    facing: (n) => n.state.facing,
  },
});

// Standing at height z on `on` (a Ledge box, or null = the ground), having moved dx sideways: what she stands on now,
// { z, on }, or null (she falls). She keeps to the ledge she is on however it moves (a springy branch) until she walks
// off its end; otherwise the highest surface close enough to step onto.
function support(n, x, z, dx, on) {
  const ledges = n.world.ledges(n.me), mine = on && ledges.find((l) => l.node === on), hz = mine ? mine.height(x) : null;
  if (hz !== null) return { z: hz, on };
  const reach = 10 + dx * 1.5;                                       // (slopes up to about 55 degrees are followed)
  let best = Math.abs(z) <= reach ? { z: 0, on: null } : null;
  for (const l of ledges) {
    const h = l.height(x);
    if (h !== null && Math.abs(h - z) <= reach && (!best || h > best.z)) best = { z: h, on: l.node };
  }
  return best;
}

// Falling from z0 to z1: the highest surface passed through on the way down (landing on top of it), { z, on }, or null.
function landing(n, x, z0, z1) {
  let best = z1 <= 0 ? { z: 0, on: null } : null;                   // the ground is always there
  for (const l of n.world.ledges(n.me)) {
    const h = l.height(x);
    if (h !== null && h <= z0 + 0.5 && h >= z1 && (!best || h > best.z)) best = { z: h, on: l.node };
  }
  return best;
}
