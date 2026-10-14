import { defineNode } from '../engine/registry.js';

const OPS = {
  '+': (a, b) => a + b, '-': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => (b === 0 ? 0 : a / b),
  'min': Math.min, 'max': Math.max,
};

defineNode({
  type: 'math', title: 'Maths', kind: 'data',
  help: 'Does a sum with two numbers; the answer is always up to date.',
  inputs: {
    a: { type: 'number', value: 0, help: 'The first number.' },
    b: { type: 'number', value: 1, help: 'The second number.' },
    op: { type: 'choice', value: '×', options: Object.keys(OPS), setting: true, label: 'sum',
      help: '+ add, - take away, × times, ÷ divide by (÷ 0 gives 0), min = the smaller one, max = the bigger one.' },
  },
  outputs: { result: { type: 'number', label: 'answer', help: 'The answer.' } },
  read: { result: (n) => OPS[n.in('op')](n.in('a'), n.in('b')) },
});
