import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'make-position', title: 'Make position', kind: 'data',
  help: 'Builds a place in the scene from numbers.',
  inputs: {
    x: { type: 'number', value: 0, help: 'Left-right (0 = the left edge of the scene).' },
    y: { type: 'number', value: 0, help: 'Up-down (0 = the top edge of the scene).' },
    z: { type: 'number', value: 0, help: 'Depth, for a 3-D renderer one day; 0 for now.' },
  },
  outputs: { position: { type: 'position', help: 'The place: [x, y, z].' } },
  read: { position: (n) => [n.in('x'), n.in('y'), n.in('z')] },
});
