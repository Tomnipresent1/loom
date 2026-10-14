import { defineNode } from '../engine/registry.js';

const SAME = 1e-9;
const OPS = {
  '=': (a, b) => Math.abs(a - b) < SAME, '≠': (a, b) => Math.abs(a - b) >= SAME,
  '<': (a, b) => a < b, '≤': (a, b) => a <= b + SAME, '>': (a, b) => a > b, '≥': (a, b) => a >= b - SAME,
};

defineNode({
  type: 'compare', title: 'Compare', kind: 'data',
  help: 'Asks a yes/no question about two numbers, e.g. "is glows = 3?".',
  inputs: {
    a: { type: 'number', value: 0, help: 'The first number.' },
    b: { type: 'number', value: 0, help: 'The number to compare it with.' },
    op: { type: 'choice', value: '=', options: Object.keys(OPS), setting: true, label: 'is a … b',
      help: '= equal, ≠ not equal, < smaller, ≤ smaller or equal, > bigger, ≥ bigger or equal.' },
  },
  outputs: { result: { type: 'yesno', label: 'yes?', help: 'Yes if the question is true, otherwise no.' } },
  read: { result: (n) => OPS[n.in('op')](n.in('a'), n.in('b')) },
});
