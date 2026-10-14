import { defineNode } from '../engine/registry.js';

// A place on a lead: every frame it closes part of the gap to its target, so it drifts after it and eases in.
defineNode({
  type: 'follow', title: 'Follow', kind: 'data',
  help: 'A place that drifts after another place, catching up smoothly, a little behind (like on a lead). Starts at this thing\'s home.',
  inputs: {
    target: { type: 'position', value: [0, 0, 0], label: 'chase', help: 'The place to follow (wire in a position, e.g. Position of the player).' },
    lag: { type: 'number', value: 0.8, help: 'Roughly how many seconds it takes to catch up. 0 = sticks to it exactly.' },
  },
  outputs: {
    position: { type: 'position', help: 'Where the follower is now: [x, y, z].' },
    x: { type: 'number', help: 'Its left-right place.' },
    y: { type: 'number', help: 'Its up-down place.' },
  },
  create(n) { n.state.at = [...n.me.home]; },
  tick(n, dt) {
    const t = n.in('target'), lag = n.in('lag'), at = n.state.at;
    const k = lag > 0 ? 1 - Math.exp((-3 * dt) / lag) : 1;   // ~95% of the way in `lag` seconds
    for (let i = 0; i < 3; i++) at[i] += (t[i] - at[i]) * k;
  },
  read: { position: (n) => [...n.state.at], x: (n) => n.state.at[0], y: (n) => n.state.at[1] },
});
