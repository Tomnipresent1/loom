import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'group-middle', title: 'Group middle', kind: 'data',
  help: 'The middle of every thing of one kind (e.g. all the motes), and how spread out they are round it.',
  inputs: { kind: { type: 'kind', value: '', setting: true, help: 'Which kind of thing makes the group.' } },
  outputs: {
    middle: { type: 'position', help: 'The middle of the group: the average of where they all are.' },
    spread: { type: 'number', help: 'How far they are from the middle, on average (for a ring: its size).' },
    count: { type: 'number', help: 'How many there are.' },
  },
  read: {
    middle: (n) => group(n).middle,
    spread: (n) => group(n).spread,
    count: (n) => group(n).count,
  },
});

function group(n) {
  const all = n.world.instances.filter((i) => i.kind === n.in('kind') && !i.removed);
  if (!all.length) return { middle: [...n.me.pos], spread: 0, count: 0 };
  const middle = [0, 1, 2].map((k) => all.reduce((s, i) => s + i.pos[k], 0) / all.length);
  const spread = all.reduce((s, i) => s + Math.hypot(i.pos[0] - middle[0], i.pos[1] - middle[1], i.pos[2] - middle[2]), 0) / all.length;
  return { middle, spread, count: all.length };
}
