import { defineNode } from '../engine/registry.js';

// "I'm number 3 of 25": lets copies arrange themselves (e.g. evenly round a ring) however many there are.
defineNode({
  type: 'group-place', title: 'Place in group', kind: 'data',
  help: 'Which number this thing is among all things of its kind, and how many there are: spreads copies out evenly, however many you place.',
  outputs: {
    fraction: { type: 'number', label: 'share', help: 'How far along the group it is, from 0 up to (not quite) 1: number ÷ how many. Round a ring, that is evenly spaced.' },
    index: { type: 'whole', label: 'number', help: 'Its number in the group, counting from 0 (in the order they are placed in the scene).' },
    count: { type: 'whole', label: 'how many', help: 'How many things of its kind there are.' },
  },
  read: {
    fraction: (n) => { const g = place(n); return g.count ? g.index / g.count : 0; },
    index: (n) => place(n).index,
    count: (n) => place(n).count,
  },
});

function place(n) {
  const all = n.world.instances.filter((i) => i.kind === n.me.kind && !i.removed);
  return { index: Math.max(0, all.indexOf(n.me)), count: all.length };
}
