import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';
import { takeNut } from './leaf-pile.js';

// Red squirrels at a tree (Autumn; Tom's design, 2026-10-19). Busy: each fetches the nuts lying about near their tree
// (a Leaf pile of nuts) one at a time, runs up the trunk, tucks it into their hole and comes back for the next, until
// they're all gone (then they sit up in the branches nibbling). Anyone coming close (the girl, the cat, the puppy;
// rushing at them, from further off) sends them up the trunk, or away along the ground if someone is in the way: they
// are never caught. Up there they watch, flick their tails and chatter; braver than the birds, they dash down for a nut
// as soon as nobody is near it ("dare") for a moment ("safe after"). Someone climbing their tree: they leap across to
// their other tree (branch to branch; down and along the ground when the branches don't reach) and come back when it's
// safe. They get busy once someone comes within "busy from", so the walk finds them at it. The puppy barks at them and
// the cat watches them (flock). The thing goes with them (their sounds come from where they are). Drawn by
// runtime/squirrel2d.js; their hole is drawn on the trunk.
const LEVEL = 110;        // someone this close in height counts as level with a squirrel (a puppy below one up the trunk doesn't)
const LEAP = 650;         // the furthest they leap from branch to branch (further: down and along the ground)
const TUCK = 0.45;        // seconds to tuck a nut into the hole
const PICK = 0.22;        // seconds to pick a nut up
const SOUND_GAP = 0.1;    // paw and claw sounds are told at most this often (seconds)
const HIGH = 140;         // up the tree at least this high is out of reach from the ground

defineNode({
  type: 'squirrels', title: 'Squirrels', kind: 'part',
  help: 'A couple of red squirrels busy at a tree: they fetch the nuts lying about (a Leaf pile of nuts) one at a time and tuck them into a hole up the trunk. Anyone coming close sends them up the tree (they are never caught); they chatter, and dash down for the next nut as soon as the coast is clear, braver than the birds. Someone climbing their tree: they leap across to their other tree.',
  inputs: {
    count: { type: 'whole', value: 2, label: 'how many', help: 'How many squirrels (up to 4).' },
    reach: { type: 'number', value: 450, label: 'their tree', help: 'Their tree is the branches (Ledges) held within half this far of this thing (put it at the trunk); the trunk is where they are held.' },
    other: { type: 'choice', value: 'none', options: ['none', 'the tree to the left', 'the tree to the right'], setting: true, label: 'other tree', help: 'Their other tree, the next one that way (found by its branches). Someone climbing their tree: they leap across to it (down and along the ground if the branches don\'t reach), and back when it\'s safe. none: they go as high as they can.' },
    near: { type: 'number', value: 170, label: 'startle distance', help: 'Someone (the girl, the cat, the puppy) this close, at their height, sends them off up the tree; rushing at them, from half as far again (about 100 = a metre). Smaller than the birds\': they\'re braver.' },
    dare: { type: 'number', value: 300, help: 'They dash down for a nut when nobody is this close to it (or to the foot of their tree).' },
    safe: { type: 'number', value: 2.5, label: 'safe after', help: 'Seconds of the coast being clear before they come down for the next nut (the birds wait 6).' },
    range: { type: 'number', value: 900, label: 'nuts within', help: 'They go for nuts lying up to this far from their trunk (kicked further, they\'re left).' },
    hole: { type: 'number', value: 240, label: 'hole height', help: 'How high up the trunk their hole is, where the nuts go.' },
    busy: { type: 'number', value: 1800, label: 'busy from', help: 'They start work once someone comes this close to their tree (so you find them at it). 0 = always busy.' },
    speed: { type: 'number', value: 460, help: 'How fast they run (bounding).' },
    climb: { type: 'number', value: 300, label: 'climb speed', help: 'How fast they run up and down the trunk.' },
    size: { type: 'number', value: 2.2, help: '1 = a real red squirrel (about 40 long with its tail); a bit over 2 reads on a phone.' },
    colour: { type: 'colour', value: '#b5532a', label: 'fur', help: 'Their red-brown fur (the tail a little brighter).' },
    belly: { type: 'colour', value: '#f2e4cb', help: 'Their pale bellies.' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  outputs: {
    startled: { flow: true, help: 'Fires as they run from someone (at most about once a second).' },
    chatter: { flow: true, help: 'Fires when one chatters at someone from up the tree (wire an Animal call: squirrel chatter).' },
    step: { flow: true, help: 'Fires as their paws come down, running on the ground or along a branch.' },
    scrabble: { flow: true, help: 'Fires as their claws scrabble up or down the trunk.' },
    took: { flow: true, help: 'Fires as one picks up a nut.' },
    stashed: { flow: true, label: 'tucked away', help: 'Fires as one tucks a nut into their hole.' },
    leapt: { flow: true, help: 'Fires as one leaps from tree to tree.' },
    left: { type: 'number', label: 'nuts left', help: 'How many nuts are still to collect (lying near their tree, or being carried).' },
    stored: { type: 'number', label: 'nuts stored', help: 'How many nuts they have tucked away so far.' },
  },
  create(n) { Object.assign(n.state, { rnd: seeded(`squirrels ${n.me.id}`), sq: null, busy: false, stored: 0, left: 0, startT: -9, chatT: -9, stepT: -9, scrT: -9 }); },
  tick(n, dt) {
    const s = n.state, home = treeAt(n, n.me.home[0]);
    if (!home) return;                                                // (no branches near: no tree to live in)
    const trees = { home, other: n.in('other') !== 'none' ? otherTree(n, home) : null };
    if (!s.sq) setUp(n, home);
    const feet = n.world.feet(), nuts = lyingNuts(n, home);
    s.left = nuts.length + s.sq.filter((q) => q.nut).length;
    if (!s.busy) {
      const B = n.in('busy');
      s.busy = B <= 0 || feet.some((f) => Math.abs(f.x - home.x) < B);
      if (s.busy) for (const q of s.sq) if (q.mode === 'idle') q.nut ? stash(n, q, home) : Object.assign(q, { mode: 'watch', clearT: 99 });
    }
    for (const q of s.sq) {
      const tree = trees[q.tree] || home;
      q.vx = 0; q.vz = 0;
      if (s.busy) { think(n, q, tree, trees, feet, nuts, dt); if (n.me.removed) return; }
      move(n, q, trees[q.tree] || home, trees, dt);
      if (n.me.removed) return;
      animate(n, q, trees[q.tree] || home, dt);
    }
    n.me.pos[0] = s.sq.reduce((a, q) => a + q.x, 0) / s.sq.length;
  },
  // where they are, for animals that watch them (the cat) or bark at them (the puppy)
  flock(n) {
    const s = n.state;
    if (!s.sq) return null;
    return { mood: 'squirrels', birds: s.sq.map((q) => ({ x: q.x, z: q.z, flying: !!q.leap || (q.on === 'ground' && q.legs.length > 0) })) };
  },
  draw(n, out) {
    const s = n.state, home = treeAt(n, n.me.home[0]);
    if (!home) return;
    if (!s.sq) setUp(n, home);                                         // (the editor draws before anything runs)
    const size = Math.max(0.1, n.in('size')), alpha = n.in('opacity');
    out.push({ kind: 'knothole', at: [home.x, home.y + 7, Math.max(0, n.in('hole'))], scale: size, alpha });
    for (const q of s.sq) {
      const moving = Math.abs(q.vx) > 1 || Math.abs(q.vz) > 1;
      const pose = q.leap ? 'leap' : q.on === 'trunk' ? (moving || q.mode === 'tuck' ? 'climb' : 'cling') : moving || q.mode === 'pick' ? 'run' : 'sit';
      out.push({ kind: 'squirrel', at: [q.x, q.y, q.z], facing: q.facing, scale: size, fur: n.in('colour'), belly: n.in('belly'), alpha,
        pose, phase: q.phase % 1, up: q.up, tilt: q.tilt, nut: q.nut, flick: q.flick, nibble: q.mode === 'rest' && !moving ? q.nib : 0,
        bend: q.mode === 'pick' ? 1 : 0, lean: q.leap ? Math.atan2(q.vz, Math.abs(q.vx) + 1) : 0 });
    }
  },
  read: {
    left: (n) => n.state.left || 0,
    stored: (n) => n.state.stored || 0,
  },
});

// ---- their trees ----
const heldU = (l) => Math.max(0, Math.min(1, l.node.in('held')));
const heldX = (l) => l.x1 + (l.x2 - l.x1) * heldU(l);
// a tree: the branches held within half "their tree" of x (so a neighbour's branch reaching over isn't counted), its
// trunk where they're held, its depth (just in front of the trunk)
function treeAt(n, x) {
  const R = Math.max(0, n.in('reach')), ledges = n.world.ledges().filter((l) => Math.abs(heldX(l) - x) < R / 2);
  if (!ledges.length) return null;
  const tx = ledges.reduce((a, l) => a + heldX(l), 0) / ledges.length;
  return { x: tx, y: ledges[0].who.pos[1] - 20, top: Math.max(...ledges.map((l) => Math.max(l.z1, l.z2))), ledges, nodes: new Set(ledges.map((l) => l.node)) };
}
// the next tree that way from their own: the nearest branch held beyond their tree's reach on that side
function otherTree(n, home) {
  const dir = n.in('other') === 'the tree to the left' ? -1 : 1, R = Math.max(0, n.in('reach'));
  let best = null;
  for (const l of n.world.ledges()) {
    const x = heldX(l), d = (x - home.x) * dir;
    if (d > R && (best === null || d < (best - home.x) * dir)) best = x;
  }
  return best === null ? null : treeAt(n, best);
}
const ledgeIn = (tree, node) => tree.ledges.find((l) => l.node === node) || null;

// the nuts lying near their tree (from every Leaf pile of nuts): [{ pile, l }]
function lyingNuts(n, home) {
  const R = Math.max(0, n.in('range')), out = [];
  for (const { pile, lying } of n.world.collect('nuts')) for (const l of lying) if (Math.abs(l.x - home.x) < R) out.push({ pile, l });
  return out;
}

function setUp(n, home) {
  const s = n.state, rnd = s.rnd, count = Math.max(1, Math.min(4, Math.round(n.in('count'))));
  const nuts = lyingNuts(n, home), pileX = nuts.length ? nuts.reduce((a, t) => a + t.l.x, 0) / nuts.length : home.x + 200;
  const groundY = n.me.home[1];
  s.sq = [];
  for (let i = 0; i < count; i++) {
    const q = { x: pileX + (i ? 40 : -25) * (pileX > home.x ? 1 : -1), z: 0, y: groundY, on: 'ground', tree: 'home', legs: [], mode: 'idle', nut: false, claim: null,
      wait: 0, clearT: 0, facing: Math.sign(home.x - pileX) || -1, up: 1, phase: rnd(), flick: 0, flickT: 1 + rnd() * 2, nib: 0, nibT: rnd(), tilt: 0,
      chatT: 1 + rnd() * 2, vx: 0, vz: 0, leap: null, ground: groundY };
    if (i === 1) Object.assign(q, { x: home.x, z: Math.min(120, Math.max(0, n.in('hole') - 60)), on: 'trunk', nut: true, up: 1 });   // (one already on its way up with a nut)
    s.sq.push(q);
  }
}

// ---- what each one decides ----
function think(n, q, tree, trees, feet, nuts, dt) {
  const s = n.state, rnd = s.rnd;
  if (q.leap) return;                                                // (mid-air: nothing to decide)
  const f = danger(n, q, feet);
  if (f && (q.mode !== 'flee' || !q.legs.length) && q.mode !== 'cross') { flee(n, q, tree, f); startled(n); return; }
  const climber = feet.find((g) => g.standing && g.on && tree.nodes.has(g.on));
  if (climber && q.mode !== 'cross' && cross(n, q, tree, trees)) { startled(n); return; }
  if (q.mode === 'flee' || q.mode === 'cross') {
    if (!q.legs.length) Object.assign(q, { mode: 'watch', clearT: 0, chatT: 0.3 + rnd() * 0.5, up: q.on === 'trunk' ? -1 : q.up });   // (on the trunk: head down, watching)
    return;
  }
  if (q.mode === 'pick') {
    if ((q.wait -= dt) > 0) return;
    const t = q.claim;
    q.claim = null;
    if (t && Math.abs(t.l.x - q.x) < 30 && takeNut(t.pile, t.l)) { q.nut = true; n.fire('took'); if (n.me.removed) return; stash(n, q, tree); }
    else Object.assign(q, { mode: 'watch', clearT: 99 });
    return;
  }
  if (q.mode === 'stash') { if (!q.legs.length) Object.assign(q, { mode: 'tuck', wait: TUCK, up: 1 }); return; }
  if (q.mode === 'tuck') {
    if ((q.wait -= dt) > 0) return;
    q.nut = false; s.stored++;
    n.fire('stashed');
    if (n.me.removed) return;
    Object.assign(q, { mode: 'watch', clearT: 99 });                  // (brave: straight back down for the next, if it's clear)
    return;
  }
  if (q.mode === 'fetch') {
    const t = q.claim;
    if (!t || t.l.fly || t.l.hold || !t.pile.state.leaves.includes(t.l)) { q.claim = null; Object.assign(q, { mode: 'watch', clearT: 99 }); return; }
    if (q.on === 'ground' && q.legs.length === 1) q.legs[0].x = t.l.x - q.facing * 6;      // (a nut rolling: follow it)
    if (!q.legs.length) Object.assign(q, { mode: 'pick', wait: PICK });
    return;
  }
  // watching (or resting): chatter at whoever is about; when the coast is clear, back to work
  const home = trees.home;
  if (q.mode === 'watch' && q.on !== 'ground' && feet.some((g) => Math.abs(g.x - q.x) < 650)) {
    if ((q.chatT -= dt) <= 0) {
      q.chatT = 2.5 + rnd() * 4; q.flick = 1;
      if (n.world.time - s.chatT > 1.4) { s.chatT = n.world.time; n.fire('chatter'); if (n.me.removed) return; }
    }
  }
  if (q.tree !== 'home') {                                           // over in the other tree: home when nobody's up it
    const up = feet.some((g) => g.standing && g.on && home.nodes.has(g.on));
    q.clearT = up ? 0 : q.clearT + dt;
    if (q.clearT >= Math.max(0, n.in('safe'))) { q.mode = 'watch'; cross(n, q, tree, trees); }
    return;
  }
  const dare = Math.max(0, n.in('dare')), low = feet.filter((g) => g.z < LEVEL);
  if (q.nut) {                                                       // a nut still to tuck away (on the ground: once the trunk's clear)
    if (q.on !== 'ground' || !low.some((g) => Math.abs(g.x - home.x) < dare * 0.6)) stash(n, q, tree);
    return;
  }
  const target = pickNut(n, q, nuts, home);
  if (!target) {                                                     // all gone: up into the branches to sit and nibble
    if (q.mode !== 'rest') { q.mode = 'rest'; const spot = spotAway(n, q, home, 0); if (spot) q.legs = plan(q, home, spot); }
    return;
  }
  if (q.mode === 'rest') q.mode = 'watch';
  const clear = !low.some((g) => Math.abs(g.x - target.l.x) < dare || Math.abs(g.x - home.x) < dare * 0.6) && !feet.some((g) => g.standing && g.on && home.nodes.has(g.on));
  q.clearT = clear ? q.clearT + dt : 0;
  if (q.clearT < Math.max(0, n.in('safe'))) return;
  q.claim = target; q.mode = 'fetch';
  q.legs = plan(q, home, { on: 'ground', x: target.l.x });
}

// the nearest-threatening someone at its height: within the startle distance (rushing: half as far again), or null
function danger(n, q, feet) {
  const near = Math.max(0, n.in('near'));
  let best = null, bd = Infinity;
  for (const f of feet) {
    if (Math.abs((f.z || 0) - q.z) > LEVEL) continue;
    const d = Math.abs(f.x - q.x), rush = Math.abs(f.vx) > 200 ? 1.5 : 1;
    if (d < near * rush && d < bd) { best = f; bd = d; }
  }
  return best;
}
function startled(n) {
  const s = n.state;
  if (n.world.time - s.startT < 1) return;
  s.startT = n.world.time;
  n.fire('startled');
}
// the next nut to fetch: the one nearest their trunk that the other squirrels aren't after
function pickNut(n, q, nuts, home) {
  const taken = new Set(n.state.sq.filter((o) => o !== q && o.claim).map((o) => o.claim.l));
  let best = null;
  for (const t of nuts) if (!taken.has(t.l) && (!best || Math.abs(t.l.x - home.x) < Math.abs(best.l.x - home.x))) best = t;
  return best;
}
function stash(n, q, tree) {
  q.mode = 'stash'; q.claim = null;
  q.legs = plan(q, tree, { on: 'trunk', z: Math.max(0, n.in('hole')) });
}
// Off up the tree to a spot away from whoever it is (out of their reach); on the ground with them in the way of the
// trunk, off along the ground away from them instead.
function flee(n, q, tree, f) {
  Object.assign(q, { mode: 'flee', claim: null, clearT: 0, wait: 0 });
  const near = Math.max(0, n.in('near')), [w] = n.world.bounds, away = () => [{ on: 'ground', x: Math.max(30, Math.min(w - 30, q.x + (Math.sign(q.x - f.x) || 1) * near * 2.5)) }];
  if (q.on === 'ground') {
    const toTrunk = tree.x - q.x, blocked = Math.abs(f.x - tree.x) < near && (Math.sign(f.x - q.x) === Math.sign(toTrunk) || Math.abs(f.x - tree.x) < Math.abs(toTrunk));
    const spot = blocked ? null : spotAway(n, q, tree, 0);
    q.legs = spot ? plan(q, tree, spot) : away();
    return;
  }
  const spot = spotAway(n, q, tree, f.z || 0);
  q.legs = spot ? plan(q, tree, spot) : plan(q, tree, { on: 'ground', x: q.x }).concat(away());
}
// a spot up the tree well above (or below) height z, out of reach from the ground, not where another squirrel is: up
// the trunk, or out along a branch
function spotAway(n, q, tree, z) {
  const rnd = n.state.rnd, spots = [], hole = n.in('hole');
  for (let h = HIGH + 20; h < tree.top - 20; h += 55) if (Math.abs(h - hole) > 30) spots.push({ on: 'trunk', z: h, x: tree.x });
  for (const l of tree.ledges) {
    const hu = heldU(l);
    for (const frac of [0.35, 0.65]) {
      const u = hu <= 0.5 ? hu + frac * (1 - hu) : hu - frac * hu, x = l.x1 + (l.x2 - l.x1) * u, h = l.height(x);
      if (h !== null && h >= HIGH) spots.push({ on: l.node, u, x, z: h });
    }
  }
  const free = (p) => !n.state.sq.some((o) => o !== q && Math.abs(o.x - p.x) + Math.abs(o.z - (p.z ?? 0)) < 50);
  const ok = spots.filter((p) => Math.abs(p.z - z) > 140 && free(p));
  if (!ok.length) return null;
  return ok[Math.floor(rnd() * ok.length)];
}
// Across to the other tree (or back home): out along the branch reaching furthest that way, and a leap to the other
// tree's branch reaching back; too far to leap, down and along the ground and up the other trunk. False if there's no
// other tree (then it just goes as high as it can).
function cross(n, q, tree, trees) {
  const to = q.tree === 'home' ? trees.other : trees.home, name = q.tree === 'home' ? 'other' : 'home';
  if (!to) {
    const spot = spotAway(n, q, tree, -1e6);
    if (!spot) return false;
    Object.assign(q, { mode: 'flee', claim: null, clearT: 0 }); q.legs = plan(q, tree, spot);
    return true;
  }
  const dir = Math.sign(to.x - tree.x) || 1;
  const tip = (t, d) => {
    let best = null;
    for (const l of t.ledges) {
      const hu = heldU(l);
      if (d > 0 ? hu > 0.9 : hu < 0.1) continue;                     // (doesn't reach that way)
      const u = d > 0 ? 0.95 : 0.05, x = l.x1 + (l.x2 - l.x1) * u;
      if (!best || (x - best.x) * d > 0) best = { node: l.node, u, x, hu };
    }
    return best;
  };
  const a = tip(tree, dir), b = tip(to, -dir);
  Object.assign(q, { mode: 'cross', claim: null, clearT: 0 });
  const k = Math.min(0.6, n.state.sq.indexOf(q) * 0.22), land = b && b.u + (b.hu - b.u) * k;   // (each lands a little further in: not on top of each other)
  q.legs = a && b && Math.abs(b.x - a.x) < LEAP
    ? [...plan(q, tree, { on: a.node, u: a.u }), { leap: { tree: name, on: b.node, u: land } }]
    : [...plan(q, tree, { on: 'ground', x: to.x }), { swap: name }];
  return true;
}
// The way to a spot: if it's on another part of the tree, first to the trunk (along the ground to its foot, or back
// along the branch to where it's held), up or down the trunk to where the spot leaves it, then out to it.
function plan(q, tree, to) {
  const legs = [], at = (node) => { const l = ledgeIn(tree, node); if (!l) return null; const u = heldU(l), x = l.x1 + (l.x2 - l.x1) * u; return { u, z: l.height(x) ?? 0 }; };
  const same = to.on === q.on && q.on !== 'trunk';
  if (!same) {
    if (q.on === 'ground') legs.push({ on: 'ground', x: tree.x });
    else if (q.on !== 'trunk') { const h = at(q.on); if (h) legs.push({ on: q.on, u: h.u }); }
    const z = to.on === 'ground' ? 0 : to.on === 'trunk' ? to.z : (at(to.on) || { z: 0 }).z;
    legs.push({ on: 'trunk', z });
    if (to.on === 'trunk') return legs;
  }
  legs.push(to.on === 'ground' ? { on: 'ground', x: to.x } : { on: to.on, u: to.u });
  return legs;
}

// ---- how they move ----
const toward = (a, b, step) => (Math.abs(b - a) <= step ? b : a + Math.sign(b - a) * step);
function move(n, q, tree, trees, dt) {
  const leg = q.legs[0];
  if (!leg) { rideIdle(q, tree); return; }
  if (leg.swap) {                                                    // arrived under the other tree by the ground: up into it
    q.tree = leg.swap; q.legs.shift();
    const t = trees[leg.swap];
    const spot = t && spotAway(n, q, t, 0);
    if (spot) q.legs = plan(q, t, spot);
    return;
  }
  if (leg.leap) { leapMove(n, q, trees, leg, dt); return; }
  const speed = Math.max(10, n.in('speed')), climb = Math.max(10, n.in('climb'));
  if (leg.on === 'ground') {
    q.on = 'ground'; q.z = 0; q.y = q.ground; q.tilt = 0;
    const x = toward(q.x, leg.x, speed * dt);
    q.vx = (x - q.x) / dt; q.x = x;
    if (Math.abs(q.vx) > 1) q.facing = Math.sign(q.vx);
    if (q.x === leg.x) q.legs.shift();
  } else if (leg.on === 'trunk') {
    q.on = 'trunk'; q.x = tree.x; q.y = tree.y + 12; q.tilt = 0;
    const z = toward(q.z, leg.z, climb * dt);
    q.vz = (z - q.z) / dt; if (z !== q.z) q.up = Math.sign(z - q.z); q.z = z;
    if (q.z === leg.z) q.legs.shift();
  } else {
    const l = ledgeIn(tree, leg.on);
    if (!l) { q.legs = []; return; }                                  // (its branch has gone)
    q.on = leg.on; q.y = l.who.pos[1] + 3;
    const tx = l.x1 + (l.x2 - l.x1) * leg.u, x = toward(q.x, tx, speed * 0.75 * dt);
    q.vx = (x - q.x) / dt; q.x = x;
    if (Math.abs(q.vx) > 1) q.facing = Math.sign(q.vx);
    q.z = l.height(q.x) ?? q.z; q.tilt = slope(l, q.x);
    if (q.x === tx) q.legs.shift();
  }
}
// sitting still: on a branch it rides the branch; on the trunk it stays on it
function rideIdle(q, tree) {
  if (q.on === 'trunk') { q.x = tree.x; return; }
  if (q.on === 'ground') { q.z = 0; return; }
  const l = ledgeIn(tree, q.on);
  if (l) { const h = l.height(q.x); if (h !== null) { q.z = h; q.tilt = slope(l, q.x); } }
}
const slope = (l, x) => { const a = l.height(x - 6), b = l.height(x + 6); return a === null || b === null ? 0 : Math.atan2(b - a, 12); };
// a leap: a quick arc from the branch tip to the other tree's branch, landing on it
function leapMove(n, q, trees, leg, dt) {
  if (!q.leap) {
    const t = trees[leg.leap.tree], l = t && ledgeIn(t, leg.leap.on);
    if (!l) { q.legs.shift(); return; }
    const x1 = l.x1 + (l.x2 - l.x1) * leg.leap.u, z1 = l.height(x1) ?? q.z, d = Math.hypot(x1 - q.x, z1 - q.z);
    q.leap = { x0: q.x, z0: q.z, y0: q.y, x1, z1, y1: l.who.pos[1] + 3, t: 0, T: Math.max(0.35, Math.min(0.9, d / 520)), h: 35 + d * 0.16 };
    q.facing = Math.sign(x1 - q.x) || q.facing;
    n.fire('leapt');
    if (n.me.removed) return;
  }
  const L = q.leap, z0 = q.z, x0 = q.x;
  L.t += dt;
  const u = Math.min(1, L.t / L.T);
  q.x = L.x0 + (L.x1 - L.x0) * u; q.z = L.z0 + (L.z1 - L.z0) * u + 4 * L.h * u * (1 - u); q.y = L.y0 + (L.y1 - L.y0) * u;
  q.vx = (q.x - x0) / dt; q.vz = (q.z - z0) / dt;
  if (u < 1) return;
  q.tree = leg.leap.tree; q.on = leg.leap.on; q.leap = null; q.legs.shift();
}
// the pose clock (bounding, climbing), paw and claw sounds, tail flicks, nibbling
function animate(n, q, tree, dt) {
  const s = n.state, rnd = s.rnd, size = Math.max(0.1, n.in('size')), v = Math.abs(q.vx) + Math.abs(q.vz);
  const before = Math.floor(q.phase);
  q.phase += (v * dt) / (45 * size);                                  // (one bound per 45 units at size 1)
  if (Math.floor(q.phase) !== before && !q.leap) {
    const pin = q.on === 'trunk' ? 'scrabble' : 'step', at = pin === 'step' ? 'stepT' : 'scrT';
    if (n.world.time - s[at] >= SOUND_GAP) { s[at] = n.world.time; n.fire(pin); if (n.me.removed) return; }
  }
  q.flickT -= dt;
  if (q.flickT <= 0) { q.flick = 1; q.flickT = (q.mode === 'watch' ? 0.8 : 2) + rnd() * 2.5; }
  q.flick = Math.max(0, q.flick - dt * 4);
  q.nibT += dt * 7; q.nib = Math.max(0, Math.sin(q.nibT));
}
