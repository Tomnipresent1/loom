import { defineNode } from '../engine/registry.js';

// Something to stand on, for side-on walkers (Walk and jump): a straight line across this thing, left to right, centred
// on it (its middle at the thing's height). A branch, a step, a roof. Walkers jump up through it from below and land on
// top (like a branch, not a ceiling). Drawn as a plain plank for blocking out a scene; turn "show?" off once a picture
// draws the branch.
// Springy (give above 0, Autumn's branches): it is held fast at one spot ("held at": 0 = its left end, 1 = its right
// end, 0.5 = the middle) and bends most furthest from there, like a branch from its trunk. Her weight sinks it a little;
// landing on it jolts it down, and it springs back and wobbles (a spring: "swings a second", dying away over "wobble"
// seconds), so jumping in time pumps it. Jumping as it swings up adds some of its speed to the jump (bounce).
const MOST = 6;            // it never dips more than this many times its give (nor rises more than half that)

defineNode({
  type: 'ledge', title: 'Ledge', kind: 'part',
  help: 'Something to stand on for Walk and jump: a line across this thing (a branch, a step). Walkers jump up through it from below and land on top. With give, it is a springy branch: it dips, springs back and wobbles. Shown as a plank until "show?" is off.',
  inputs: {
    width: { type: 'number', value: 400, help: 'How long it is, left to right, centred on this thing (about 100 = a metre).' },
    rise: { type: 'number', value: 0, help: 'How much higher its right end is than its left: + slopes up to the right, − down. 0 = level.' },
    give: { type: 'number', value: 0, help: 'How springy: how far its free end dips with her standing there (0 = stiff, it never moves). Landing on it dips it more, and it springs back.' },
    held: { type: 'number', value: 0.5, label: 'held at', help: 'Where along it it is held fast (where the trunk is): 0 = its left end, 1 = its right end, 0.5 = the middle. It bends most furthest from there.' },
    rate: { type: 'number', value: 2.2, label: 'swings a second', help: 'How fast it swings up and down once jolted (a thin branch quicker, a big bough slower).' },
    wobble: { type: 'number', value: 2, help: 'Roughly how many seconds its swinging takes to die away (after that much, almost nothing is left).' },
    bounce: { type: 'number', value: 0.5, help: 'Springboard: jumping as it swings up adds this much of its speed to the jump (0 = none, 1 = all of it).' },
    show: { type: 'yesno', value: true, label: 'show?', help: 'Draw it (as a plank or a branch). Turn it off once a picture draws it.' },
    look: { type: 'choice', value: 'plank', options: ['plank', 'branch'], setting: true, help: 'How it is drawn: a plain plank, or a branch (thick where it is held, tapering to its tip, with a few twigs).' },
    colour: { type: 'colour', value: '#7a5536', help: 'The plank\'s colour.' },
    thickness: { type: 'number', value: 18, help: 'How thick the plank is drawn (its top edge is where walkers stand).' },
  },
  outputs: {
    landed: { flow: true, label: 'landed on', help: 'Fires when someone lands on it.' },
    jolt: { type: 'number', label: 'landing speed', help: 'How hard the last landing on it was (a landing speed: about 600 = a hop, 1000+ = a drop from higher up).' },
    swing: { type: 'number', help: 'How fast its free end is moving up or down right now (0 when still; a few hundred when jolted).' },
    dip: { type: 'number', help: 'How far its free end is down right now (negative = swung up above where it rests).' },
  },
  create(n) { Object.assign(n.state, { q: 0, qv: 0, jolt: 0, seen: new Map() }); },
  tick(n, dt) {
    const s = n.state, give = Math.max(0, n.in('give')), ends = line(n);
    let rest = 0;
    for (const f of n.world.feet()) {
      const u = (f.x - ends.x1) / (ends.x2 - ends.x1);
      if (f.standing && f.on === n) rest += give * bend(n, u);                       // her weight sinks it a little
      if (f.landing && f.landing.on === n && s.seen.get(f.who) !== f.landing.id) {
        s.seen.set(f.who, f.landing.id);
        if (n.world.time - f.landing.time < 0.1) {
          s.jolt = f.landing.impact;
          s.qv += omega(n) * give * (f.landing.impact / 240) * bend(n, u);            // a landing jolts it down
          n.fire('landed');
          if (n.me.removed) return;
        }
      }
    }
    if (give <= 0) { s.q = s.qv = 0; return; }
    const w = omega(n), damp = 6 / Math.max(0.05, n.in('wobble'));     // (the swing shrinks to 5% over wobble seconds)
    s.qv += (-w * w * (s.q - rest) - damp * s.qv) * dt;
    s.q += s.qv * dt;
    if (s.q > give * MOST) { s.q = give * MOST; s.qv = Math.min(0, s.qv); }
    if (s.q < -give * MOST * 0.5) { s.q = -give * MOST * 0.5; s.qv = Math.max(0, s.qv); }
  },
  // the ends relative to the thing, and how far down it is bent at u (0 = left end .. 1 = right end)
  ledge(n) {
    const { x1, z1, x2, z2 } = line(n), q = n.state.q || 0;
    return { x1, z1, x2, z2, sag: q ? (u) => q * bend(n, u) : null };
  },
  // how fast its top is moving up at u (0..1 along it; negative = down), for leaves on it to be shaken loose
  upSpeed(n, u) { return -(n.state.qv || 0) * bend(n, u); },
  // how fast its top is moving up at x (scene x), for a springboard jump: only upward, times its bounce
  rise(n, x) {
    const { x1, x2 } = line(n), u = (x - n.me.pos[0] - x1) / (x2 - x1);
    return Math.max(0, -(n.state.qv || 0) * bend(n, u)) * Math.max(0, n.in('bounce'));
  },
  draw(n, out) {
    if (!n.in('show')) return;
    const { x1, z1, x2, z2 } = line(n), q = n.state.q || 0, points = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      points.push([x1 + (x2 - x1) * u, Math.max(-(n.me.pos[2] || 0), z1 + (z2 - z1) * u - q * bend(n, u))]);
    }
    out.push({ kind: 'plank', at: n.me.pos, from: [x1, z1], to: [x2, z2], points, thickness: Math.max(1, n.in('thickness')), colour: n.in('colour'), alpha: 1,
      look: n.in('look'), held: Math.max(0, Math.min(1, n.in('held'))) });
  },
  read: {
    jolt: (n) => n.state.jolt,
    swing: (n) => Math.abs(n.state.qv),
    dip: (n) => n.state.q,
  },
});

// Its straight line, relative to its thing.
function line(n) {
  const w = Math.max(1, n.in('width')) / 2, r = n.in('rise') / 2;
  return { x1: -w, z1: -r, x2: w, z2: r };
}
const omega = (n) => 2 * Math.PI * Math.max(0.1, n.in('rate'));
// How much it bends at u (0..1 along it): nothing where it is held, 1 at the free end furthest from there (the shape
// of a branch bent by a weight at its tip).
export function bend(n, u) {
  const held = Math.max(0, Math.min(1, n.in('held'))), d = Math.min(1, Math.abs(Math.max(0, Math.min(1, u)) - held) / Math.max(held, 1 - held, 1e-6));
  return (d * d * (3 - d)) / 2;
}
