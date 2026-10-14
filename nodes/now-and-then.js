import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';

// Fires now and then: after a random while between "least" and "most" seconds, again and again (NAMI's chimes and bird
// calls). "pace" speeds it up live: 2 = twice as often (e.g. chimes in a gust: wire in the breeze).
defineNode({
  type: 'now-and-then', title: 'Now and then', kind: 'when',
  help: 'Fires again and again, each time after a random while between "least" and "most" seconds. Pace speeds it up (2 = twice as often).',
  inputs: {
    least: { type: 'number', value: 7, help: 'The shortest wait, in seconds.' },
    most: { type: 'number', value: 17, help: 'The longest wait, in seconds.' },
    first: { type: 'number', value: 0, label: 'first after', help: 'Seconds before the very first time (0 = a random while, like the rest).' },
    pace: { type: 'number', value: 1, help: 'How fast time runs for it: 1 = normal, 2 = twice as often, 0.5 = half. Live: wire something in.' },
  },
  outputs: { now: { flow: true, help: 'Fires each time.' } },
  create(n) {
    const r = seeded(`${n.me.id}/${n.id}`);
    n.state.r = r;
    n.state.left = null;
  },
  tick(n, dt) {
    const s = n.state, again = () => n.in('least') + s.r() * Math.max(0, n.in('most') - n.in('least'));
    if (s.left === null) s.left = n.in('first') > 0 ? n.in('first') : again();
    s.left -= dt * Math.max(0, n.in('pace'));
    if (s.left <= 0) { s.left = again(); n.fire('now'); }
  },
});
