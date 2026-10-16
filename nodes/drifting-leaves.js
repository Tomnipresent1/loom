import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';
import { LEAF_COLOURS } from './leaf-pile.js';

// Leaves drifting down through the air (Autumn), all around wherever the camera follows: near the lens (big, darker,
// softened by the light), level with her, and far back (small, in the air's colour). They flutter and spin as they fall,
// drift with the wind, and start again high up when they reach the ground (they don't pile up: that's the Leaf piles'
// job). Wire a Breeze into "wind" and they move with it.
const FALL = 70;           // how fast they drift down, about (units a second)

defineNode({
  type: 'drifting-leaves', title: 'Drifting leaves', kind: 'part',
  help: 'Leaves drifting down through the air all around where the camera looks, near and far, fluttering and spinning, blown by the wind (wire a Breeze in).',
  inputs: {
    count: { type: 'whole', value: 70, label: 'how many', help: 'How many leaves are in the air at once.' },
    wind: { type: 'number', value: 0.4, help: 'How hard the air blows them sideways: + to the right, − to the left (a Breeze\'s strength fits).' },
    front: { type: 'number', value: 650, label: 'in front', help: 'How far in front of her (towards the camera) they fall: near the lens they are big and dark.' },
    behind: { type: 'number', value: 2500, help: 'How far behind her they fall.' },
    high: { type: 'number', value: 900, help: 'How high up they start falling from.' },
    size: { type: 'number', value: 16, help: 'How long one leaf is.' },
    colour: { type: 'colour', value: '#c8632b', help: 'From this colour...' },
    colour2: { type: 'colour', value: '#e8a33a', label: 'colour 2', help: '...to this one.' },
  },
  create(n) { n.state.rnd = seeded(`drift ${n.me.id}`); n.state.leaves = []; n.state.count = -1; },
  tick(n, dt) {
    const s = n.state, rnd = s.rnd, [fx, fy] = n.world.listener(), count = Math.max(0, Math.min(600, Math.round(n.in('count'))));
    const front = Math.max(0, n.in('front')), behind = Math.max(0, n.in('behind')), high = Math.max(50, n.in('high')), wind = n.in('wind');
    const span = 2200 + behind * 0.6;                                // (further back the camera sees wider: more room across)
    const spawn = (l, anywhere) => {
      l.y = fy - behind + rnd() * (behind + front);
      l.x = fx + (rnd() - 0.5) * span * (0.5 + (fy - l.y + front) / (behind + front + 1)) - Math.sign(wind) * (anywhere ? 0 : 200);
      l.z = anywhere ? rnd() * high : high + rnd() * 200;
      l.vx = 0; l.vz = -FALL * (0.6 + rnd() * 0.8);
      l.rot = rnd() * Math.PI * 2; l.spin = (rnd() * 2 - 1) * 3; l.tum = rnd() * Math.PI * 2; l.tv = 3 + rnd() * 5;
      l.c = Math.floor(rnd() * LEAF_COLOURS); l.k = 0.75 + rnd() * 0.5; l.fly = true; l.sway = 30 + rnd() * 30;
    };
    while (s.leaves.length < count) { const l = {}; spawn(l, true); s.leaves.push(l); }
    if (s.leaves.length > count) s.leaves.length = count;
    for (const l of s.leaves) {
      l.tum += l.tv * dt; l.rot += l.spin * dt;
      l.x += (wind * 140 + Math.sin(l.tum * 0.5) * l.sway) * dt;
      l.z += l.vz * dt;
      const far = Math.abs(l.x - fx) > span * 0.8;
      if (l.z <= 0 || far) spawn(l, false);
    }
  },
  draw(n, out) {
    const s = n.state;
    if (!s.leaves.length) return;
    out.push({ kind: 'leaves', drift: true, at: n.me.pos, leaves: s.leaves, size: Math.max(1, n.in('size')), colours: [n.in('colour'), n.in('colour2')], width: 0, depth: 0, height: 0 });
  },
});
