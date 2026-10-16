import { defineNode } from '../engine/registry.js';

// A line of rolling hills painted by code (Autumn): a ridge across its width, centred on its thing, sinking to the
// ground at both ends, filled down to the ground. Far back, the air turns it towards the sky's colour. Every copy is its
// own line of hills (its seed comes from where it stands, unless you give one). A picture replaces it.
defineNode({
  type: 'hills', title: 'Hills', kind: 'part',
  help: 'A line of rolling hills painted by code, across its width; far off, the air turns it towards the sky. A picture replaces it with your own painting.',
  inputs: {
    width: { type: 'number', value: 5000, help: 'How wide the line of hills is, left to right (scene units).' },
    height: { type: 'number', value: 1800, help: 'How high its highest tops reach.' },
    roughness: { type: 'number', value: 0.3, help: '0 = smooth swells, 1 = bumpy.' },
    colour: { type: 'colour', value: '#8a7f95', help: 'Its colour (the air far off adds the sky\'s).' },
    seed: { type: 'whole', value: 0, help: 'Which hills of all the possible ones: 0 = its own (from where it stands); any other number picks one.' },
    picture: { type: 'picture', value: '', help: 'Your own painting of them instead (stretched across the width, as tall as "height"). Empty = painted by code.' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  draw(n, out) {
    const h = n.me.home, seed = n.in('seed') || Math.round(h[0] * 7 + h[1] * 13 + h[2]);
    out.push({ kind: 'ridge', at: n.me.pos, width: Math.max(1, n.in('width')), height: Math.max(0, n.in('height')), roughness: Math.max(0, n.in('roughness')),
      seed, colour: n.in('colour'), picture: n.in('picture'), alpha: n.in('opacity') });
  },
});
