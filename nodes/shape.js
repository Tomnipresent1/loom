import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'shape', title: 'Shape', kind: 'part',
  help: 'Draws this thing as a round body.',
  inputs: {
    colour: { type: 'colour', value: '#ffffff', help: 'The body\'s colour.' },
    radius: { type: 'number', value: 12, help: 'How big the body is (its radius, in scene units).' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  draw(n, out) { out.push({ kind: 'disc', at: n.me.pos, radius: n.in('radius'), colour: n.in('colour'), alpha: n.in('opacity') }); },
});
