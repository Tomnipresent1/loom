import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'text-format', title: 'Make text', kind: 'data',
  help: 'Builds text from a pattern: {value} is replaced by whatever is wired in.',
  inputs: {
    value: { type: 'any', value: null, help: 'Anything: it is written into the pattern where {value} is.' },
    pattern: { type: 'text', value: '{value}', help: 'The text, with {value} where the value should go.' },
  },
  outputs: { text: { type: 'text', help: 'The finished text.' } },
  read: {
    text(n) {
      const v = n.in('value');
      const shown = typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : String(v);
      return n.in('pattern').split('{value}').join(shown);
    },
  },
});
