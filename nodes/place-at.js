import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'place-at', title: 'Place at', kind: 'part',
  help: 'Keeps this thing at a place, every frame: wire in a moving position (e.g. from Waves) and it follows.',
  inputs: { position: { type: 'position', value: [0, 0, 0], label: 'place', help: 'Where to keep it (wire in a position).' } },
  tick(n) {
    if (!n.spec.dataIn.position) return;                    // unwired: leave the thing where it is
    const p = n.in('position');
    for (let i = 0; i < 3; i++) n.me.pos[i] = p[i];
  },
});
