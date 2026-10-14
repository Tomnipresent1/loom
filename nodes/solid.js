import { defineNode } from '../engine/registry.js';

// Makes this thing solid: walkers (Stroll) bump against it and slide past. A circle round it, or, given a width, a long
// rounded shape across it (left to right), like the front of a hut or a wall. Invisible in the game; the editor's top
// view shows it as a solid ring (trigger zones are dotted).
defineNode({
  type: 'solid', title: 'Solid', kind: 'part',
  help: 'Walkers bump against this thing instead of going through it: a circle round it (e.g. a tree\'s trunk), or with a width, a long shape across it (a hut, a wall). Shown as a ring in the top view.',
  inputs: {
    radius: { type: 'number', value: 60, help: 'How far round this thing is solid, in scene units (60 = a plum trunk, about 0.6 m). 0 = not solid.' },
    width: { type: 'number', value: 0, help: 'Make it long: this much extra width, left to right (0 = just the circle).' },
  },
  solid: (n) => ({ r: Math.max(0, n.in('radius')), hw: Math.max(0, n.in('width')) / 2 }),
});
