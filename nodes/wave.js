import { defineNode } from '../engine/registry.js';

// Unreal's "sine of time", made friendly: a value that swings smoothly back and forth around a middle.
defineNode({
  type: 'wave', title: 'Wave', kind: 'data',
  help: 'A value that swings smoothly back and forth over time, forever. Always up to date.',
  inputs: {
    middle: { type: 'number', value: 0, help: 'The value it swings around.' },
    size: { type: 'number', value: 1, help: 'How far it swings either side of the middle.' },
    speed: { type: 'number', value: 0.5, help: 'Swings per second (0.5 = one full swing every 2 seconds).' },
    shift: { type: 'number', value: 0, help: 'Starts it part-way through a swing: 0.25 = a quarter ahead, 0.5 = opposite. Give copies different shifts to make them ripple.' },
    shape: { type: 'choice', value: 'sine', options: ['sine', 'cosine'], setting: true,
      help: 'Sine and cosine are the same wave, a quarter-swing apart. Use one for x and the other for y and the thing goes round in a circle.' },
  },
  outputs: { value: { type: 'number', help: 'Where the wave is right now.' } },
  read: {
    value(n) {
      const turn = 2 * Math.PI * (n.in('speed') * n.world.time + n.in('shift'));
      return n.in('middle') + n.in('size') * (n.in('shape') === 'cosine' ? Math.cos(turn) : Math.sin(turn));
    },
  },
});
