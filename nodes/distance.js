import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'distance', title: 'Distance', kind: 'data',
  help: 'How far apart two places are. Always up to date.',
  inputs: {
    a: { type: 'position', value: [0, 0, 0], label: 'from', help: 'One place (wire in a position).' },
    b: { type: 'position', value: [0, 0, 0], label: 'to', help: 'The other place.' },
  },
  outputs: { result: { type: 'number', label: 'distance', help: 'How far apart they are, in scene units.' } },
  read: {
    result(n) { const a = n.in('a'), b = n.in('b'); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); },
  },
});
