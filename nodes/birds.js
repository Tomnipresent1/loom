import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';

// A few small birds about a tree (Autumn's robins; Tom's design, 2026-10-17). All calm: one pecks about on the ground
// under the tree, the rest perch on its lowest branch. Whoever comes close (anything with feet: the girl, the cat, the
// puppy; rushing at them, from further off) startles them: they scatter, flutter about a little and land higher up in
// the tree, still in view. Once it has been safe a while (nobody near their places), they come back down. Someone
// climbing into the tree (standing on its branches) sends them off: with an "other tree" (Tom, 2026-10-17: "back and
// forth, not all over the place") they fly across to it and settle there, high first, then down when it's safe, the
// same rules there (climbing it sends them back); with none, out of sight, and once nobody has been up the tree for a
// while they come back, to the higher branches first, then down when it's safe.
// Their tree: the Ledges within "their tree" of this thing (its branches); the thing moves with them to the other tree
// (so their sounds come from where they are). Drawn by runtime/bird2d.js. The puppy and the cat can see them (flock).
const TAU = Math.PI * 2;
const ARRIVE = 5;          // this close to where it's flying to = there

defineNode({
  type: 'birds', title: 'Birds', kind: 'part',
  help: 'A few small birds about a tree: one pecks on the ground, the rest perch on its lowest branch. Whoever comes close startles them: they scatter, flutter about and land higher up; when it is safe they come back down. Someone climbing the tree sends them across to their other tree (or off out of sight).',
  inputs: {
    count: { type: 'whole', value: 3, label: 'how many', help: 'How many birds (up to 8).' },
    ground: { type: 'whole', value: 1, label: 'on the ground', help: 'How many peck about on the ground under the tree when all is calm (the rest perch on its lowest branch).' },
    reach: { type: 'number', value: 450, label: 'their tree', help: 'Their tree is the branches (Ledges) within this far to the left or right of this thing.' },
    other: { type: 'choice', value: 'none', options: ['none', 'the tree to the left', 'the tree to the right'], setting: true, label: 'other tree', help: 'Their other tree: the next tree that way (found by its branches, wherever it stands). Someone climbing their tree, they fly across to it and settle there (climbing that one sends them back). none: they fly off out of sight and come back later.' },
    near: { type: 'number', value: 220, label: 'startle distance', help: 'Someone (the girl, the cat, the puppy) this close startles them; rushing at them, from half as far again (about 100 = a metre).' },
    safe: { type: 'number', value: 6, label: 'safe after', help: 'Seconds with nobody near their places before they come back down; or, after flying off, with nobody up their tree before they come back.' },
    high: { type: 'number', value: 400, label: 'perch up to', help: 'How high up the tree they settle when startled (higher branches are out of view from the ground).' },
    speed: { type: 'number', value: 420, help: 'How fast they fly.' },
    size: { type: 'number', value: 2.8, help: '1 = a real robin (about 14 long); nearer 3 reads on a phone.' },
    colour: { type: 'colour', value: '#7d5b3f', label: 'back', help: 'Their backs, wings and tails.' },
    breast: { type: 'colour', value: '#de6a2c', help: 'Their breasts and faces.' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  outputs: {
    startled: { flow: true, help: 'Fires as they scatter (someone came close).' },
    flewOff: { flow: true, label: 'flew off', help: 'Fires as they fly off (someone climbed their tree): across to their other tree, or out of sight.' },
    cameBack: { flow: true, label: 'came back', help: 'Fires as they come back after flying off.' },
    landed: { flow: true, help: 'Fires as one of them lands.' },
    calm: { type: 'yesno', label: 'calm?', help: 'Yes while they are all settled in their places with nobody near (a time for a song).' },
    flying: { type: 'number', label: 'in the air', help: 'How many of them are flying right now.' },
  },
  create(n) { Object.assign(n.state, { rnd: seeded(`birds ${n.me.id}`), birds: null, mood: 'rest', safeT: 0, downT: 0 }); },
  tick(n, dt) {
    const s = n.state, p = n.me.pos, tree = branchesOf(n);
    if (!tree.length) return;                                         // (no branches near: nowhere to be)
    if (!s.birds) setUp(n, tree);
    const near = Math.max(0, n.in('near')), mine = new Set(tree.map((l) => l.node)), home = s.birds.map((b) => spotAt(b.home, tree));
    // who is about: someone up their tree; someone close to a settled bird (rushing: from further; up high, only someone
    // up at their height counts: a puppy barking below doesn't move them); someone near their places
    let climber = null, scare = false, nearHome = false;
    for (const f of n.world.feet()) {
      if (f.standing && f.on && mine.has(f.on)) climber = f;
      const rush = Math.abs(f.vx) > 200 ? 1.5 : 1;
      for (const b of s.birds) {
        if (b.gone || b.flying || b.path.length || (s.mood !== 'rest' && Math.abs(f.z - b.z) > 100)) continue;
        if (Math.hypot(f.x - b.x, f.z - b.z) < near * rush) scare = true;
      }
      for (const h of home) if (h && Math.hypot(f.x - h.x, f.z - h.z) < near * 1.5) nearHome = true;
    }
    const settled = s.birds.every((b) => b.gone || (!b.flying && !b.path.length));     // (safe time counts once they've all landed)
    s.safeT = climber || nearHome || scare || !settled ? 0 : s.safeT + dt;
    s.downT = climber ? 0 : s.downT + dt;
    const safe = Math.max(0, n.in('safe'));
    if (climber && s.mood !== 'away') {
      n.fire('flewOff');                                              // (first: its sounds come from the tree they leave)
      if (n.me.removed) return;
      if (n.in('other') !== 'none' && crossOver(n)) return;           // (across to the other tree: its branches from the next step)
      flyOff(n, climber);
    }
    else if (scare && s.mood !== 'away') { scatter(n, tree); n.fire('startled'); if (n.me.removed) return; }
    else if (s.mood === 'up' && s.safeT >= safe) comeDown(n);
    else if (s.mood === 'away' && s.downT >= safe) { comeBack(n, tree); n.fire('cameBack'); if (n.me.removed) return; }
    // each bird: sitting (pecking, hopping, flicking its tail, looking about), or flying where it's going next
    for (const b of s.birds) {
      if (b.gone) continue;
      if (b.flying) { if (fly(n, b, tree, dt) && !n.me.removed) n.fire('landed'); if (n.me.removed) return; continue; }
      sit(n, b, tree, dt);
    }
  },
  // where they are, for animals that watch them (the cat) or bark at them (the puppy)
  flock(n) {
    const s = n.state;
    if (!s.birds) return null;
    return { mood: s.mood, birds: s.birds.filter((b) => !b.gone).map((b) => ({ x: b.x, z: b.z, flying: b.flying })) };
  },
  draw(n, out) {
    const s = n.state;
    if (!s.birds) { const tree = branchesOf(n); if (tree.length) setUp(n, tree); }      // (the editor draws before anything runs)
    if (!s.birds) return;
    const size = Math.max(0.1, n.in('size')), back = n.in('colour'), breast = n.in('breast'), alpha = n.in('opacity');
    for (const b of s.birds) {
      if (b.gone) continue;
      out.push({ kind: 'bird', at: [b.x, b.y, b.z], facing: b.facing, scale: size, back, breast, alpha,
        flap: b.flying ? Math.sin(b.flap * TAU) : null, climb: b.flying ? Math.atan2(b.vz, Math.abs(b.vx) + 1) * 0.5 : 0,
        peck: b.peck, flick: b.flick });
    }
  },
  read: {
    calm: (n) => !!n.state.birds && n.state.mood === 'rest' && n.state.safeT > 1 && n.state.birds.every((b) => !b.flying && !b.path.length),
    flying: (n) => (n.state.birds || []).filter((b) => b.flying).length,
  },
});

// For animals that notice birds (the puppy, the cat): the nearest bird of any Birds box within this far of x, or null.
export function nearestBird(n, x, within) {
  let best = null;
  for (const f of n.world.collect('flock')) for (const b of f.birds) if (Math.abs(b.x - x) < within && (!best || Math.abs(b.x - x) < Math.abs(best.x - x))) best = b;
  return best;
}

// their tree's branches (Ledges near this thing), lowest first
function branchesOf(n) {
  const x = n.me.pos[0], R = Math.max(0, n.in('reach'));
  const mid = (l) => (l.z1 + l.z2) / 2;
  return n.world.ledges().filter((l) => l.x2 > x - R && l.x1 < x + R).sort((a, b) => mid(a) - mid(b));
}
// a place to be: { node, u } along a branch (u: 0 = its left end .. 1 = its right), or { x } on the ground
function spotAt(spot, tree) {
  if (!spot) return null;
  if (!spot.node) return { x: spot.x, z: 0 };
  const l = tree.find((t) => t.node === spot.node);
  if (!l) return null;
  const x = l.x1 + (l.x2 - l.x1) * spot.u, z = l.height(x);
  return z === null ? null : { x, z };
}
// somewhere along a branch's free side (away from where it's held: out where a bird would sit), frac 0 .. 1 of the way out
function outAlong(l, frac) {
  const held = Math.max(0, Math.min(1, l.node.in('held')));
  return { node: l.node, u: held <= 0.5 ? held + frac * (1 - held) : held - frac * held };
}

function setUp(n, tree) {
  const s = n.state, rnd = s.rnd, p = n.me.pos, count = Math.max(0, Math.min(8, Math.round(n.in('count'))));
  s.birds = [];
  for (let i = 0; i < count; i++) {
    s.birds.push({ x: 0, z: 0, y: p[1] + (rnd() * 2 - 1) * 4, vx: 0, vz: 0, flying: false, gone: false, path: [], wait: 0,
      facing: rnd() < 0.5 ? -1 : 1, flap: rnd(), peck: 0, pecking: 0, peckT: rnd() * 2, hop: 0, hopT: 1 + rnd() * 3, flick: 0, flickT: 1 + rnd() * 3, seed: rnd() * 10 });
  }
  setHomes(n, tree);
  for (const b of s.birds) { const at = spotAt(b.home, tree); b.spot = b.home; b.x = at.x; b.z = at.z; }
}
// their places when all is calm, at this tree: some on the ground under its lowest branch, the rest out along it
function setHomes(n, tree) {
  const s = n.state, low = tree[0], count = s.birds.length, onGround = Math.min(count, Math.max(0, Math.round(n.in('ground'))));
  const under = spotAt(outAlong(low, 0.55), tree), onBranch = count - onGround;
  s.birds.forEach((b, i) => {
    b.home = i < onGround ? { x: under.x + (i - (onGround - 1) / 2) * 45 } : outAlong(low, 0.3 + (0.55 * (i - onGround + 0.5)) / Math.max(1, onBranch));
  });
}
// Someone up their tree, and they have another: across to it they go (up, high over the middle, down into it), to
// settle high in it, and down to their places there when it's safe. The thing goes with them (their sounds come from
// there). Returns false if there are no branches there (then they fly off out of sight instead).
function crossOver(n) {
  const s = n.state, rnd = s.rnd, p = n.me.pos, home = n.me.home ? n.me.home[0] : p[0], was = p[0];
  const there = s.atOther ? home : otherTree(n, home);
  if (there === null) return false;
  s.atOther = !s.atOther;
  p[0] = there;
  const tree = branchesOf(n);
  if (!tree.length) { s.atOther = !s.atOther; p[0] = was; return false; }
  setHomes(n, tree);
  const spots = highSpots(n, tree);
  s.mood = 'up'; s.safeT = 0;
  s.birds.forEach((b, i) => {
    if (b.gone) Object.assign(b, { gone: false, x: was + (rnd() * 2 - 1) * 200, z: 700 });
    b.path = [{ x: b.x + Math.sign(p[0] - b.x) * 90, z: b.z + 150 }, { x: (b.x + p[0]) / 2, z: 520 + rnd() * 160 }, airPoint(n), { spot: spots[i] }];
    b.wait = rnd() * 0.25;
  });
  return true;
}

// the next tree that way from their own (at `home`): the nearest branch held beyond their own tree's reach on that
// side; its trunk (where the branch is held) is the tree's middle. null if there's none.
function otherTree(n, home) {
  const dir = n.in('other') === 'the tree to the left' ? -1 : 1, R = Math.max(0, n.in('reach'));
  let best = null;
  for (const l of n.world.ledges()) {
    const held = Math.max(0, Math.min(1, l.node.in('held'))), x = l.x1 + (l.x2 - l.x1) * held, d = (x - home) * dir;
    if (d > R && (best === null || d < (best - home) * dir)) best = x;
  }
  return best;
}
// up into the air near the tree (in view from the ground)
const airPoint = (n) => ({ x: n.me.pos[0] + (n.state.rnd() * 2 - 1) * 300, z: 200 + n.state.rnd() * 180 });
// higher branches to settle on, each bird its own
function highSpots(n, tree) {
  const rnd = n.state.rnd, low = (tree[0].z1 + tree[0].z2) / 2, top = n.in('high');
  let highs = tree.filter((l) => (l.z1 + l.z2) / 2 > low + 50 && Math.max(l.z1, l.z2) <= top);
  if (!highs.length) highs = tree.slice(-1);
  highs = highs.slice().sort(() => rnd() - 0.5);
  return n.state.birds.map((b, i) => outAlong(highs[i % highs.length], 0.3 + rnd() * 0.55));
}
function scatter(n, tree) {
  const s = n.state, rnd = s.rnd, spots = highSpots(n, tree);
  s.mood = 'up'; s.safeT = 0;
  s.birds.forEach((b, i) => { if (b.gone) return; b.path = [airPoint(n), ...(rnd() < 0.5 ? [airPoint(n)] : []), { spot: spots[i] }]; b.wait = rnd() * 0.2; });
}
function flyOff(n, from) {
  const s = n.state, rnd = s.rnd, p = n.me.pos;
  s.mood = 'away'; s.downT = 0;
  for (const b of s.birds) {
    if (b.gone) continue;
    const dir = Math.sign(b.x - from.x) || 1;
    b.path = [{ x: b.x + dir * 120, z: b.z + 140 }, { x: p[0] + dir * (1800 + rnd() * 300), z: 900 + rnd() * 250, off: true }];
    b.wait = rnd() * 0.15;
  }
}
function comeBack(n, tree) {
  const s = n.state, rnd = s.rnd, p = n.me.pos, spots = highSpots(n, tree), side = rnd() < 0.5 ? -1 : 1;
  s.mood = 'up'; s.safeT = 0;
  s.birds.forEach((b, i) => {
    Object.assign(b, { gone: false, flying: true, x: p[0] + side * (1800 + rnd() * 200), z: 850 + rnd() * 200, vx: -side * 200, vz: 0 });
    b.path = [airPoint(n), { spot: spots[i] }]; b.wait = i * 0.5;
  });
}
function comeDown(n) {
  const s = n.state, rnd = s.rnd;
  s.mood = 'rest';
  s.birds.forEach((b, i) => { if (!b.gone) { b.path = [{ spot: b.home }]; b.wait = i * (0.8 + rnd() * 1.4); } });
}

// sitting: on a branch it rides the branch; on the ground it pecks and hops about; a flick of the tail, a look round.
// With somewhere to go, it waits its moment and takes off.
function sit(n, b, tree, dt) {
  const s = n.state, rnd = s.rnd, at = spotAt(b.spot, tree);
  if (at) { b.x = at.x + (b.spot.node ? 0 : b.hopX || 0); b.z = at.z; }
  b.flickT -= dt; if (b.flickT <= 0) { b.flick = 1; b.flickT = 1.5 + rnd() * 3; if (rnd() < 0.4) b.facing = -b.facing; }
  b.flick = Math.max(0, b.flick - dt * 5);
  if (!b.spot.node) {                                                  // on the ground: pecking, a little hop now and then
    b.peckT -= dt;
    if (b.peckT <= 0) { b.pecking = 0.3; b.peckT = 0.7 + rnd() * 2; }
    b.pecking = Math.max(0, b.pecking - dt);
    b.peck = b.pecking > 0 ? Math.sin((1 - b.pecking / 0.3) * Math.PI) : 0;
    b.hopT -= dt;
    if (b.hopT <= 0) { b.hopX = Math.max(-40, Math.min(40, (b.hopX || 0) + b.facing * (5 + rnd() * 8))); b.hopT = 1.2 + rnd() * 3; b.hop = 1; }
    b.hop = Math.max(0, b.hop - dt * 6);
    b.z += Math.sin(b.hop * Math.PI) * 3;
  } else b.peck = 0;
  if (b.path.length && (b.wait -= dt) <= 0) { b.flying = true; b.vz = 160; b.vx = 0; b.peck = 0; b.hopX = 0; }
}

// flying: towards where it's going next, quick wingbeats, slowing to land. Returns true as it lands on a perch.
function fly(n, b, tree, dt) {
  const next = b.path[0];
  if (!next) { b.flying = false; return false; }
  const at = next.spot ? spotAt(next.spot, tree) : next;
  if (!at) { b.path.shift(); return false; }
  const dx = at.x - b.x, dz = at.z - b.z, d = Math.hypot(dx, dz) || 1, speed = Math.max(10, n.in('speed'));
  const sp = speed * Math.min(1, 0.25 + d / 180), wob = Math.sin(n.world.time * 9 + b.seed) * 70 * Math.min(1, d / 120);
  b.vx += ((dx / d) * sp - b.vx) * Math.min(1, dt * 6);
  b.vz += ((dz / d) * sp + wob - b.vz) * Math.min(1, dt * 6);
  b.x += b.vx * dt; b.z = Math.max(0, b.z + b.vz * dt);
  if (Math.abs(b.vx) > 25) b.facing = Math.sign(b.vx);
  b.flap += dt * (b.vz > 40 ? 15 : 11);
  if (d > ARRIVE + sp * dt) return false;
  b.path.shift();
  if (next.off) { b.gone = true; b.flying = false; b.path = []; return false; }
  if (!next.spot) return false;
  Object.assign(b, { spot: next.spot, flying: false, vx: 0, vz: 0, x: at.x, z: at.z });
  return true;
}
