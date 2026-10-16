import { defineNode } from '../engine/registry.js';

// A plain upright block standing on this thing's spot: for blocking out a scene (trunks, far hills, a stand-in for a
// character) before the pictures exist. Round = how rounded its corners are (1 = fully round ends, a pill).
defineNode({
  type: 'block', title: 'Block', kind: 'part',
  help: 'Draws this thing as a plain upright block standing on its spot: for blocking out a scene (a trunk, a far hill, a stand-in for a character) before the pictures exist.',
  inputs: {
    width: { type: 'number', value: 100, help: 'How wide it is, in scene units (about 100 = a metre).' },
    height: { type: 'number', value: 200, help: 'How tall it stands, in scene units.' },
    colour: { type: 'colour', value: '#8a7a6a', help: 'Its colour.' },
    round: { type: 'number', value: 0, label: 'roundness', help: 'How rounded its corners are: 0 = square, 1 = fully round ends (a pill).' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  draw(n, out) {
    out.push({ kind: 'block', at: n.me.pos, width: Math.max(0, n.in('width')), height: Math.max(0, n.in('height')), colour: n.in('colour'), round: n.in('round'), alpha: n.in('opacity') });
  },
});
