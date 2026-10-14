import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'light', title: 'Light', kind: 'part',
  help: 'A soft glow around this thing. Brightness 0 = off, 1 = full.',
  inputs: {
    brightness: { type: 'number', value: 1, help: '0 = off, 1 = full glow.' },
    colour: { type: 'colour', value: '#ffe2a8', help: 'The colour of the glow.' },
    radius: { type: 'number', value: 120, help: 'How far the glow spreads, in scene units.' },
  },
  draw(n, out) {
    const b = n.in('brightness');
    if (b > 0.001) out.push({ kind: 'glow', at: n.me.pos, radius: n.in('radius'), colour: n.in('colour'), strength: Math.min(b, 2) });
  },
});
