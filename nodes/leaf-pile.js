import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';

// A pile of real leaves (Autumn): each leaf is its own little thing that rests, flies when kicked, flutters down and
// stays where it lands, so it can be kicked again. Walkers (anything with feet: Walk and jump) kick the leaves they walk
// through (slow = a shuffle, brisk = flying), kick the ones in front of their foot (a kick: Walk and jump), and burst
// them when they land in them (harder for a bigger drop). A toss (Walk and jump: a swipe up): she bends down, the
// leaves lying just in front of her feet go into her hands (up to two handfuls), ride up in them and fly when she
// throws them up over her head, to flutter down all around her.
// "kicked", "landed in", "scooped up" and "thrown" fire with how many leaves flew, how hard and where: wire them to a
// Crunch.
// A low wide pile is a carpet of leaves along the ground. The layout (how many, width, depth, height) is redone when
// those numbers change; colours and size change at once.
// Lying leaves are stacked in little columns (cells, a few leaves wide): a leaf rests on the ones under it, so when
// lower leaves are kicked away the ones above sink down onto what is left, and flying leaves land on top of whatever
// lies where they come down (kicked leaves build little heaps of their own).
// On a branch ("on a branch?", with a Ledge in the same thing): the leaves cling along the branch instead, riding its
// bend; they shake loose when it swings (a landing, jumping on it), are knocked off when walked through, and drift down
// now and then on their own. Once fallen they are leaves like any other (kickable). A branch can be shaken bare.
// Nuts ("what": nuts; Tom, 2026-10-19: the squirrels' acorns): the same pile, but each piece is a little acorn, a bit
// heavier than a leaf: kicked or thrown they don't fly as far, they drop instead of fluttering, bounce once or twice
// and roll to a stop ("dropped" fires as they land: wire a Nut clatter). Walking through nudges them along. Squirrels
// pick them up (the "nuts" hook and takeNut, below).
const GRAVITY = 980;
const RISE_DRAG = 0.8;     // rising leaves slow down quickly...
const FALL_DRAG = 11;      // ...and drift down at about GRAVITY / FALL_DRAG = 90 units a second
const SIDE_DRAG = 1.8;     // and slow down sideways
const REACH = 70;          // leaves this far in front of / behind her feet are still kicked
const TELL_GAP = 0.09;     // kicks are told (fire "kicked") at most this often, in seconds
const CELL_W = 24, CELL_D = 40;  // a column of stacked leaves: this wide (left to right) and deep (front to back)
const THIN = 1.5;          // how much one leaf adds to a stack where none was heaped (lying flat on the ground)
const SINK = 90;           // how fast leaves sink when the ones under them go (units a second)
const SHAKE = 30;          // a branch swinging slower than this (units a second, where the leaf is) holds on to its leaves
const FELL_GAP = 0.25;     // leaves shaken down are told (fire "shaken down") at most this often, in seconds
const GRAB = 36;           // the most leaves one scoop picks up (both hands full)
const GRAB_REACH = 65;     // ...lying up to this far in front of her feet (and a little behind)
// nuts: heavier than leaves
const NUT_PUSH = 0.6;      // they leave a kick (or a throw) this much slower than a leaf would...
const NUT_DRAG = 0.6;      // ...and hardly slow in the air (they drop, no fluttering)
const NUT_BOUNCE = 0.32;   // landing hard they bounce back up this much (twice at most)...
const NUT_ROLL = 5.5;      // ...then roll, slowing by this much a second, till they stop (not far: Tom)
const DROP_GAP = 0.12;     // nuts landing are told (fire "dropped") at most this often, in seconds
export const LEAF_COLOURS = 8;   // how many shades each pile's leaves come in (the renderers make them from colour, colour 2)

defineNode({
  type: 'leaf-pile', title: 'Leaf pile', kind: 'part',
  help: 'A pile of leaves, each one real: walk through them to kick them, land in them to burst them; they flutter down and stay where they land. A low wide pile is a carpet of leaves.',
  inputs: {
    scatter: { flow: true, label: 'scatter it', help: 'Burst the pile from inside, as if something jumped out of it.' },
    count: { type: 'whole', value: 300, label: 'how many', help: 'How many leaves.' },
    width: { type: 'number', value: 500, help: 'How wide the pile spreads, left to right (about 100 = a metre).' },
    depth: { type: 'number', value: 160, help: 'How deep it spreads, front to back.' },
    height: { type: 'number', value: 60, help: 'How high it heaps up in the middle (0 = leaves lying flat: a carpet).' },
    size: { type: 'number', value: 18, help: 'How long one leaf is (real ones are about 8; bigger reads better on a phone).' },
    colour: { type: 'colour', value: '#c8632b', help: 'The leaves go from this colour...' },
    colour2: { type: 'colour', value: '#e8a33a', label: 'colour 2', help: '...to this one, and everything between (a few darker).' },
    kick: { type: 'number', value: 1, label: 'kick strength', help: 'How far leaves fly when kicked or burst: 1 = normal, 2 = twice as far.' },
    flutter: { type: 'number', value: 1, help: 'How much falling leaves sway and spin: 0 = they drop straight, 1 = normal.' },
    branch: { type: 'yesno', value: false, label: 'on a branch?', help: 'Hang the leaves along this thing\'s Ledge (a branch) instead of heaping them on the ground: they ride its bend, shake loose when it swings, get knocked off when walked through, and drift down now and then.' },
    drift: { type: 'number', value: 1.5, label: 'drift down', help: 'On a branch: about how many leaves drift down on their own each minute.' },
    what: { type: 'choice', value: 'leaves', options: ['leaves', 'nuts'], setting: true, label: 'what', help: 'leaves, or nuts: little acorns, heavier than leaves (they drop, bounce and roll instead of fluttering, and don\'t fly as far). Squirrels collect nuts. "size" is then how long one acorn is (about 12).' },
  },
  outputs: {
    kicked: { flow: true, help: 'Fires while someone walks through and kicks leaves (at most about 11 times a second).' },
    burst: { flow: true, label: 'landed in', help: 'Fires when someone lands in the leaves (or "scatter it" bursts them).' },
    leaves: { type: 'number', label: 'how many flew', help: 'How many leaves the last kick or burst sent flying.' },
    strength: { type: 'number', help: 'How hard the last kick or burst was: about 0.2 = a slow shuffle, 1 = brisk walking or a hop, 1.5 = a big drop.' },
    still: { type: 'number', label: 'never moved', help: 'How many leaves have never been moved yet (what is left of the pile, or on the branch).' },
    where: { type: 'position', help: 'Where it happened (at the feet).' },
    fell: { flow: true, label: 'shaken down', help: 'On a branch: fires as leaves shake loose or drift down (at most 4 times a second); "how many flew" says how many.' },
    scooped: { flow: true, label: 'scooped up', help: 'Fires when someone bends down and scoops up leaves from it (a swipe up: Walk and jump\'s toss); "how many flew" says how many.' },
    thrown: { flow: true, help: 'Fires as the scooped leaves are thrown up into the air.' },
    dropped: { flow: true, help: 'Nuts: fires as nuts land back on the ground and bounce (at most about 8 times a second); "how many flew" says how many.' },
    left: { type: 'number', help: 'How many are still here (nuts: those the squirrels haven\'t taken).' },
  },
  create(n) { n.state.told = { leaves: 0, strength: 0, where: [...n.me.pos] }; build(n); },
  tick(n, dt) {
    const s = n.state;
    if (layoutKey(n) !== s.key) build(n);
    const kick = Math.max(0, n.in('kick')), rnd = s.rnd;
    // on a branch: the clinging leaves ride its bend; its swinging shakes them loose; now and then one drifts down
    if (s.branch) {
      s.fellAcc += hang(n, s.branch, dt);
      if (s.fellAcc > 0 && n.world.time - s.fellAt >= FELL_GAP) {
        const p = n.me.pos, flew = s.fellAcc;
        s.fellAcc = 0; s.fellAt = n.world.time;
        tell(n, 'fell', flew, Math.min(1.5, flew / 10), [p[0], p[1], p[2] || 0]);
        if (n.me.removed) return;
      }
    }
    // the feet: landings burst, walking kicks; hands scoop and throw
    const feet = n.world.feet();
    for (const f of feet) {
      // a toss: her hands scoop up the leaves at her feet; then she throws them
      if (f.gather && s.seenGather.get(f.who) !== f.gather.id) {
        s.seenGather.set(f.who, f.gather.id);
        if (n.world.time - f.gather.time < 0.1) {
          const got = gatherAt(n, f);
          if (got) tell(n, 'scooped', got, 0.5, [f.x + (f.facing || 1) * 25, f.y, f.z]);
          if (n.me.removed) return;
        }
      }
      if (f.fling && s.seenFling.get(f.who) !== f.fling.id) {
        s.seenFling.set(f.who, f.fling.id);
        const h = s.holding.length && n.world.time - f.fling.time < 0.1 ? handsOf(f.who, f) : null, flew = h ? throwHeld(n, f.who, f.fling.dir) : 0;
        if (flew) tell(n, 'thrown', flew, 0.8, [h.x, f.y, h.z]);
        if (n.me.removed) return;
      }
      if (f.landing && s.seen.get(f.who) !== f.landing.id) {
        s.seen.set(f.who, f.landing.id);
        if (n.world.time - f.landing.time < 0.1) {
          const str = Math.max(0.5, Math.min(1.6, f.landing.impact / 800));
          const flew = burstAt(n, f.x, f.y, f.z, str, 50 + f.landing.impact * 0.06, REACH * 1.3);
          if (flew) tell(n, 'burst', flew, str, [f.x, f.y, f.z]);
        }
      }
      // a kick: the leaves just in front of her foot fly the way she kicks, up and out
      if (f.strike && s.seenKick.get(f.who) !== f.strike.id) {
        s.seenKick.set(f.who, f.strike.id);
        if (n.world.time - f.strike.time < 0.1) {
          const flew = kickAt(n, f, f.strike.dir);
          if (flew) tell(n, 'kicked', flew, 1.25, [f.x + f.strike.dir * 30, f.y, f.z]);
          if (n.me.removed) return;
        }
      }
      const speed = Math.abs(f.vx);
      if (!f.standing || speed < 8) continue;
      const R = 18 + 0.6 * n.in('size'), p = Math.min(1.3, speed / 180) * (s.nuts ? 0.07 : 0.12) * dt * 60, str = Math.min(1.3, speed / 180);
      let flew = 0;
      for (const l of s.leaves) {
        if (l.fly || Math.abs(l.x - f.x) > R || Math.abs(l.y - f.y) > REACH || l.z > f.z + 70 || l.z < f.z - 30 || rnd() > p) continue;
        launch(n, l, f.vx * (0.5 + rnd() * 0.9) * kick + Math.sign(f.vx) * rnd() * 40, (rnd() * 2 - 1) * 60 * kick, (60 + 1.6 * speed * (0.5 + rnd() * 0.8)) * kick);
        flew++;
      }
      if (flew) { s.acc += flew; s.accStr = Math.max(s.accStr, str); s.accWhere = [f.x, f.y, f.z]; }
    }
    // leaves in someone's hands ride along with them till they're thrown (dropped if the toss breaks off)
    const hands = new Map();
    for (let i = s.holding.length - 1; i >= 0; i--) {
      const l = s.holding[i], f = feet.find((g) => g.who === l.hold.who);
      if (!f || !f.toss) { s.holding.splice(i, 1); l.hold = null; launch(n, l, (s.rnd() * 2 - 1) * 40, (s.rnd() * 2 - 1) * 30, 40); continue; }
      if (!hands.has(f.who)) hands.set(f.who, handsOf(f.who, f));
      const h = hands.get(f.who);
      l.x = h.x + l.hold.ox; l.y = f.y + l.hold.oy; l.z = Math.max(0, h.z + l.hold.oz); l.tum += dt * 3;
    }
    if (s.acc > 0 && n.world.time - s.toldAt >= TELL_GAP) {
      const flew = s.acc;
      s.acc = 0;
      tell(n, 'kicked', flew, s.accStr, s.accWhere);
      s.accStr = 0;
      if (n.me.removed) return;
    }
    // nuts in the air drop (a little drag), bounce, then roll to a stop
    if (s.nuts) {
      nutsMove(n, dt);
      if (s.dropAcc > 0 && n.world.time - s.dropAt >= DROP_GAP) {
        const many = s.dropAcc;
        s.dropAcc = 0; s.dropAt = n.world.time;
        tell(n, 'dropped', many, Math.min(1.5, s.dropStr), s.dropWhere);
        s.dropStr = 0;
        if (n.me.removed) return;
      }
    }
    // the leaves in the air: rising slows fast, falling drifts down, swaying and spinning; landing, they lie flat
    const flutter = Math.max(0, n.in('flutter')), side = Math.exp(-SIDE_DRAG * dt), [w] = n.world.bounds;
    for (let i = s.nuts ? -1 : s.flying.length - 1; i >= 0; i--) {
      const l = s.flying[i];
      l.vz += (-GRAVITY - (l.vz < 0 ? FALL_DRAG : RISE_DRAG) * l.vz) * dt;
      l.vx *= side; l.vy *= side;
      l.tum += l.tv * dt; l.rot += l.spin * flutter * dt;
      const sway = l.vz < 0 ? Math.sin(l.tum * 0.5) * 45 * flutter : 0;
      l.x = Math.min(w, Math.max(0, l.x + (l.vx + sway) * dt)); l.y += l.vy * dt; l.z += l.vz * dt;
      if (l.vz < 0 && (l.z <= 0 || l.z <= stackTop(s, l.x, l.y))) {
        l.z = Math.max(0, l.z) + (l.z <= 0 ? rnd() * 1.5 : 0); l.vx = l.vy = l.vz = 0; l.fly = false; l.sq = 0.35 + rnd() * 0.3; l.tilt = (rnd() * 2 - 1) * 0.35;
        s.flying[i] = s.flying[s.flying.length - 1]; s.flying.pop();
        rest(s, l);
      }
    }
    // columns that lost leaves (or gained one) settle: anything higher than the leaves under it can hold sinks down
    for (const cell of s.dirty) {
      cell.leaves.sort((a, b) => a.z - b.z);
      cell.leaves.forEach((l, k) => { const most = k * cell.loft + s.thin; if (l.z > most + 0.5) { l.sink = most; s.sinking.add(l); } });
    }
    s.dirty.clear();
    for (const l of s.sinking) {
      if (l.fly || l.sink === undefined) { s.sinking.delete(l); continue; }
      l.z = Math.max(l.sink, l.z - SINK * dt);
      if (l.z <= l.sink) { l.sink = undefined; s.sinking.delete(l); }
    }
  },
  on: {
    scatter(n) {
      if (layoutKey(n) !== n.state.key) build(n);
      const p = n.me.pos, all = !!n.state.branch, wide = all ? 1e6 : Math.max(0, n.in('width')) / 2 + 20;
      const flew = burstAt(n, p[0], p[1], p[2] || 0, 1.3, wide, Math.max(0, n.in('depth')) / 2 + 20, all ? 1e6 : 200);
      tell(n, 'burst', flew, 1.3, [p[0], p[1], p[2] || 0]);
    },
  },
  draw(n, out) {
    if (!n.state.leaves) return;
    const ln = n.state.branch, along = ln ? ln.type.ledge(ln) : null;
    out.push({ kind: 'leaves', at: n.me.pos, leaves: n.state.leaves, size: Math.max(1, n.in('size')), colours: [n.in('colour'), n.in('colour2')],
      width: Math.max(0, n.in('width')), depth: Math.max(0, n.in('depth')), height: Math.max(0, n.in('height')),
      along: along ? [along.x1, along.z1, along.x2, along.z2] : null, nuts: !!n.state.nuts });
  },
  // nuts lying still on the ground (for Squirrels to fetch): { pile: this box, lying: [nut, ...] }; takeNut picks one up
  nuts(n) {
    const s = n.state;
    if (!s.nuts || !s.leaves) return null;
    return { pile: n, lying: s.leaves.filter((l) => !l.fly && !l.hold) };
  },
  // how many leaves lie on the ground right under a foot at (x, y) (for Footsteps: walking on leaves sounds like it)
  underfoot(n, x, y) {
    const s = n.state;
    if (!s.cells || s.branch || s.nuts) return 0;
    let count = 0;
    for (const dx of [-CELL_W, 0, CELL_W]) { const cell = s.cells.get(cellKey(x + dx, y)); if (cell) count += cell.leaves.length; }
    return count;
  },
  read: {
    leaves: (n) => n.state.told.leaves,
    strength: (n) => n.state.told.strength,
    where: (n) => n.state.told.where,
    still: (n) => n.state.still || 0,
    left: (n) => (n.state.leaves ? n.state.leaves.length : 0),
  },
});

// A squirrel picks up a nut lying in a pile (from its "nuts" hook): it leaves the pile (the squirrel carries it).
// Returns false if it has gone (kicked, scooped up, or another squirrel got there first).
export function takeNut(pile, nut) {
  const s = pile.state, i = s.leaves ? s.leaves.indexOf(nut) : -1;
  if (i < 0 || nut.fly || nut.hold) return false;
  s.leaves.splice(i, 1);
  if (nut.cell) { const k = nut.cell.leaves.indexOf(nut); if (k >= 0) nut.cell.leaves.splice(k, 1); s.dirty.add(nut.cell); nut.cell = null; }
  if (!nut.moved) { nut.moved = true; s.still--; }
  return true;
}

const layoutKey = (n) => [n.in('count'), n.in('width'), n.in('depth'), n.in('height'), n.in('branch'), n.in('what')].join('|');
// the Ledge box in the same thing, for leaves on a branch
const ledgeOf = (n) => { let found = null; n.me.each((m) => { if (!found && m !== n && m.type.ledge) found = m; }); return found; };

// Lay the leaves out as a heap: thickest in the middle, thinning to the edges, each leaf its own tilt, shade and size.
// Each column is stacked from the ground up, evenly, so its top follows the heap's shape (each leaf resting on the ones
// under it: take some away and the rest sink).
function build(n) {
  const s = n.state, [cx, cy, cz = 0] = n.me.home, rnd = seeded(`leaves ${cx} ${cy} ${cz}`);
  const count = Math.max(0, Math.min(5000, Math.round(n.in('count')))), w = Math.max(0, n.in('width')), d = Math.max(0, n.in('depth')), h = Math.max(0, n.in('height'));
  Object.assign(s, { key: layoutKey(n), rnd, leaves: [], flying: [], cells: new Map(), dirty: new Set(), sinking: new Set(), still: count, seen: s.seen || new Map(), seenKick: s.seenKick || new Map(), acc: 0, accStr: 0, accWhere: [cx, cy, cz], toldAt: -1,
    seenGather: s.seenGather || new Map(), seenFling: s.seenFling || new Map(), holding: [],
    branch: n.in('branch') ? ledgeOf(n) : null, fellAcc: 0, fellAt: -1,
    nuts: n.in('what') === 'nuts', dropAcc: 0, dropAt: -1, dropStr: 0, dropWhere: [cx, cy, cz] });
  s.thin = s.nuts ? Math.max(2, n.in('size') * 0.45) : THIN;          // (an acorn is thicker than a leaf lying flat)
  if (s.nuts) s.branch = null;                                        // (nuts lie on the ground)
  if (s.branch) {                                                    // along the branch, clinging on and around it
    for (let i = 0; i < count; i++) {
      s.leaves.push({
        x: cx, y: cy + ((rnd() * 2 - 1) * d) / 2, z: cz, hang: { u: 0.03 + rnd() * 0.94, off: -6 + rnd() * 28 },
        vx: 0, vy: 0, vz: 0, rot: rnd() * Math.PI * 2, spin: 0, tum: rnd() * Math.PI * 2, tv: 0,
        tilt: (rnd() * 2 - 1) * 1.4, sq: 0.55 + rnd() * 0.45, c: Math.floor(rnd() * LEAF_COLOURS), k: 0.75 + rnd() * 0.5, fly: false, moved: false,
      });
    }
    hang(n, s.branch, 0);
    return;
  }
  for (let i = 0; i < count; i++) {
    const u = (rnd() + rnd() + rnd() - 1.5) / 1.5;                 // -1..1, most near the middle
    s.leaves.push({
      x: cx + (u * w) / 2, y: cy + ((rnd() * 2 - 1) * d) / 2, z: h * Math.max(0, 1 - u * u),   // (for now: the heap's height here)
      vx: 0, vy: 0, vz: 0, rot: rnd() * Math.PI * 2, spin: 0, tum: rnd() * Math.PI * 2, tv: 0,
      tilt: s.nuts ? rnd() * Math.PI * 2 : (rnd() * 2 - 1) * (h > 5 ? 1.2 : 0.35), sq: s.nuts ? 1 : h > 5 ? 0.5 + rnd() * 0.5 : 0.35 + rnd() * 0.3,
      c: Math.floor(rnd() * LEAF_COLOURS), k: s.nuts ? 0.85 + rnd() * 0.3 : 0.75 + rnd() * 0.5, fly: false, moved: false,
    });
  }
  // the columns: each reaches the heap's height there (the tallest spot in it), its leaves evenly stacked up to it
  for (const l of s.leaves) rest(s, l, false);
  for (const cell of s.cells.values()) {
    const top = Math.max(...cell.leaves.map((l) => l.z)), count = cell.leaves.length;
    cell.loft = Math.max(s.thin, top / count);
    cell.leaves.forEach((l, k) => { l.z = k * cell.loft + rnd() * (s.nuts ? 1 : THIN); });
  }
}

const cellKey = (x, y) => (Math.floor(x / CELL_W) + 32768) * 65536 + (Math.floor(y / CELL_D) + 32768);
// a leaf comes to rest in the column under it (dirty: the column settles next step)
function rest(s, l, dirty = true) {
  const key = cellKey(l.x, l.y);
  let cell = s.cells.get(key);
  if (!cell) s.cells.set(key, (cell = { leaves: [], loft: THIN }));
  cell.leaves.push(l);
  l.cell = cell;
  if (dirty) s.dirty.add(cell);
}
// how high the leaves lying at (x, y) reach (the top leaf, and a leaf's thickness)
function stackTop(s, x, y) {
  const cell = s.cells.get(cellKey(x, y));
  if (!cell || !cell.leaves.length) return 0;
  let top = 0;
  for (const l of cell.leaves) top = Math.max(top, l.z);
  return top + (s.nuts ? s.thin : 1);
}

// Leaves on a branch: put each where it clings (riding the branch's bend), and shake loose the ones where it swings
// fast enough; now and then one drifts down by itself. Returns how many came loose.
function hang(n, ln, dt) {
  const s = n.state, rnd = s.rnd, { x1, z1, x2, z2, sag } = ln.type.ledge(ln), [bx, , bz = 0] = ln.me.pos;
  let loose = 0;
  for (const l of s.leaves) {
    if (!l.hang) continue;
    const u = l.hang.u;
    l.x = bx + x1 + (x2 - x1) * u;
    l.z = Math.max(0, bz + z1 + (z2 - z1) * u - (sag ? sag(u) : 0) + l.hang.off);
    if (dt <= 0) continue;
    const up = ln.type.upSpeed ? ln.type.upSpeed(ln, u) : 0, chance = Math.min(2, Math.max(0, (Math.abs(up) - SHAKE) / 300)) * 1.5 * dt;
    if (rnd() < chance) { launch(n, l, (rnd() * 2 - 1) * 30, (rnd() * 2 - 1) * 20, up * 0.8); loose++; }
  }
  if (dt > 0 && rnd() < (Math.max(0, n.in('drift')) / 60) * dt) {      // one drifts down on its own
    const left = s.leaves.filter((l) => l.hang);
    if (left.length) { launch(n, left[Math.floor(rnd() * left.length)], (rnd() * 2 - 1) * 20, 0, 0); loose++; }
  }
  return loose;
}

function launch(n, l, vx, vy, vz) {
  const s = n.state, rnd = s.rnd, k = s.nuts ? NUT_PUSH : 1;          // (nuts are heavier: they leave slower)
  Object.assign(l, { vx: vx * k, vy: vy * k, vz: vz * k, fly: true, hang: null, from: l.z, sink: undefined, spin: (rnd() * 2 - 1) * 8, tv: 4 + rnd() * 8, bounces: 0, rolling: false });
  if (l.cell) { const at = l.cell.leaves.indexOf(l); if (at >= 0) l.cell.leaves.splice(at, 1); s.dirty.add(l.cell); l.cell = null; }
  if (!l.moved) { l.moved = true; s.still--; }
  s.flying.push(l);
}

// Nuts on the move: in the air they drop (a little drag), turning over; landing hard they bounce (twice at most), then
// roll along the ground, slowing, till they stop and lie where they are (on whatever lies there). Every touchdown
// counts towards "dropped" (a clatter).
function nutsMove(n, dt) {
  const s = n.state, air = Math.exp(-NUT_DRAG * dt), slow = Math.exp(-NUT_ROLL * dt), [w] = n.world.bounds, r = Math.max(2, n.in('size') * 0.3);
  const settle = (l, i) => {
    Object.assign(l, { fly: false, rolling: false, vx: 0, vy: 0, vz: 0, tilt: l.rot, sq: 1 });
    s.flying[i] = s.flying[s.flying.length - 1]; s.flying.pop();
    rest(s, l);
  };
  for (let i = s.flying.length - 1; i >= 0; i--) {
    const l = s.flying[i];
    if (l.rolling) {                                                     // rolling along the ground
      l.vx *= slow; l.vy *= slow;
      l.x = Math.min(w, Math.max(0, l.x + l.vx * dt)); l.y += l.vy * dt;
      l.rot += (l.vx * dt) / r;
      l.z = stackTop(s, l.x, l.y);
      if (Math.hypot(l.vx, l.vy) < 12) settle(l, i);
      continue;
    }
    l.vz -= GRAVITY * dt; l.vx *= air; l.vy *= air; l.vz *= air;
    l.rot += l.spin * dt;
    l.x = Math.min(w, Math.max(0, l.x + l.vx * dt)); l.y += l.vy * dt; l.z += l.vz * dt;
    const floor = stackTop(s, l.x, l.y);
    if (l.vz >= 0 || l.z > floor) continue;
    const hit = -l.vz;                                                   // touchdown: a tock
    l.z = floor;
    s.dropAcc++; s.dropStr = Math.max(s.dropStr, Math.min(1.5, hit / 400)); s.dropWhere = [l.x, l.y, l.z];
    if (hit > 140 && l.bounces < 2) { l.vz = hit * NUT_BOUNCE; l.vx *= 0.55; l.vy *= 0.55; l.spin *= 0.6; l.bounces++; }
    else if (Math.hypot(l.vx, l.vy) > 25) { l.rolling = true; l.vz = 0; }
    else settle(l, i);
  }
}

// A kick: what lies just in front of the foot (and a little either side of it) flies the way she kicks, the nearer the
// further; returns how many flew.
function kickAt(n, f, dir) {
  const s = n.state, rnd = s.rnd, kick = Math.max(0, n.in('kick'));
  let flew = 0;
  for (const l of s.leaves) {
    const ahead = (l.x - f.x) * dir;
    if (l.fly || ahead < -12 || ahead > 80 || Math.abs(l.y - f.y) > REACH || l.z < f.z - 15 || l.z > f.z + 60) continue;
    const near = 1 - Math.max(0, ahead) / 110;
    launch(n, l, dir * (140 + rnd() * 260) * near * kick + (rnd() * 2 - 1) * 30, (rnd() * 2 - 1) * 90 * kick, (200 + rnd() * 330) * kick);
    flew++;
  }
  return flew;
}

// A scoop: the leaves lying just in front of her feet (the top of the heap first, then the nearest), up to two
// handfuls, go into her hands (on a branch, the ones clinging there); returns how many.
function gatherAt(n, f) {
  const s = n.state, rnd = s.rnd, dir = f.facing || 1, at = f.x + dir * 25, near = [];
  for (const l of s.leaves) {
    const ahead = (l.x - f.x) * dir;
    if (l.fly || l.hold || ahead < -15 || ahead > GRAB_REACH || Math.abs(l.y - f.y) > REACH || l.z < f.z - 30 || l.z > f.z + 90) continue;
    near.push([Math.abs(l.x - at) + Math.abs(l.y - f.y) * 0.5 - l.z * 0.5, l]);
  }
  near.sort((a, b) => a[0] - b[0]);
  for (const [, l] of near.slice(0, GRAB)) {
    if (l.cell) { const i = l.cell.leaves.indexOf(l); if (i >= 0) l.cell.leaves.splice(i, 1); s.dirty.add(l.cell); l.cell = null; }
    if (!l.moved) { l.moved = true; s.still--; }
    Object.assign(l, { fly: true, hang: null, sink: undefined, vx: 0, vy: 0, vz: 0, spin: (rnd() * 2 - 1) * 3, tv: 2 + rnd() * 3,
      hold: { who: f.who, ox: (rnd() * 2 - 1) * 13, oy: (rnd() * 2 - 1) * 22, oz: rnd() * 16 - 6 } });
    s.holding.push(l);
  }
  return Math.min(near.length, GRAB);
}

// The throw: what she holds flies up over her head, spreading as it goes (a little the way she faces), to flutter
// down all around her; returns how many.
function throwHeld(n, who, dir) {
  const s = n.state, rnd = s.rnd, kick = Math.max(0, n.in('kick'));
  let flew = 0;
  for (let i = s.holding.length - 1; i >= 0; i--) {
    const l = s.holding[i];
    if (l.hold.who !== who) continue;
    s.holding.splice(i, 1); l.hold = null;
    launch(n, l, (dir * (30 + rnd() * 90) + (rnd() * 2 - 1) * 110) * kick, (rnd() * 2 - 1) * 80 * kick, (420 + rnd() * 280) * kick);
    flew++;
  }
  return flew;
}

// Where someone's hands are: their body says (a Character's hands); with no body, about where a person's would be
// (low while scooping, high as she throws).
function handsOf(who, f) {
  let h = null;
  who.each((m) => { if (!h && m.type.hands) h = m.type.hands(m); });
  if (h) return h;
  const up = Math.max(0, Math.min(1, ((f.toss ? f.toss.t : 0) - 0.5) / 0.24));
  return { x: f.x + (f.facing || 1) * (45 - 40 * up), z: f.z + 14 + 160 * up };
}

// Everything resting within reach of (x, y, z) flies up and outwards; returns how many flew.
function burstAt(n, x, y, z, str, R, deep, tall = 80) {
  const s = n.state, rnd = s.rnd, kick = Math.max(0, n.in('kick'));
  let flew = 0;
  for (const l of s.leaves) {
    if (l.fly || Math.abs(l.x - x) > R || Math.abs(l.y - y) > deep || Math.abs(l.z - z) > tall) continue;
    const d = (l.x - x) / Math.max(1, R);
    launch(n, l, (d * (150 + rnd() * 170) * str + (rnd() * 2 - 1) * 40) * kick, (rnd() * 2 - 1) * 150 * str * kick, (250 + rnd() * 400) * str * (1 - 0.5 * Math.abs(d)) * kick);
    flew++;
  }
  return flew;
}

function tell(n, pin, leaves, strength, where) {
  const s = n.state;
  s.told = { leaves, strength, where };
  s.toldAt = n.world.time;
  n.fire(pin);
}
