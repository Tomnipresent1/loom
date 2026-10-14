import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'position-of', title: 'Position of', kind: 'data',
  help: 'Where a thing is right now (this thing, unless another is wired in).',
  inputs: { thing: { type: 'thing', value: null, help: 'Which thing (leave unwired for this one).' } },
  outputs: {
    position: { type: 'position', help: 'Where it is: [x, y, z].' },
    x: { type: 'number', help: 'Its left-right place.' },
    y: { type: 'number', help: 'Its up-down place (bigger = further down the screen).' },
  },
  read: {
    position: (n) => [...(n.in('thing') || n.me).pos],
    x: (n) => (n.in('thing') || n.me).pos[0],
    y: (n) => (n.in('thing') || n.me).pos[1],
  },
});
