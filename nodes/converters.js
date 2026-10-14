import { defineNode } from '../engine/registry.js';

// Converter boxes (Q7a): the editor drops one onto a wire by itself when two pins nearly fit, so nothing ever
// converts invisibly. `converts: [from, to]` tells the editor which gap each one bridges ('*' = from anything).

defineNode({
  type: 'to-number', title: '→ number', kind: 'data', converts: ['whole', 'number'],
  help: 'Turns a whole number into a number (3 stays 3).',
  inputs: { value: { type: 'whole', value: 0, help: 'The whole number.' } },
  outputs: { value: { type: 'number', help: 'The same, as a number.' } },
  read: { value: (n) => n.in('value') },
});

defineNode({
  type: 'to-whole', title: '→ whole', kind: 'data', converts: ['number', 'whole'],
  help: 'Turns a number into a whole number by rounding (2.6 becomes 3).',
  inputs: { value: { type: 'number', value: 0, help: 'The number.' } },
  outputs: { value: { type: 'whole', help: 'Rounded to a whole number.' } },
  read: { value: (n) => Math.round(n.in('value')) },
});

defineNode({
  type: 'yesno-to-number', title: 'yes/no → number', kind: 'data', converts: ['yesno', 'number'],
  help: 'Turns a yes/no into a number: yes = 1, no = 0 (handy for switching a glow or a sound on and off).',
  inputs: { value: { type: 'yesno', value: false, help: 'The yes/no.' } },
  outputs: { value: { type: 'number', help: '1 for yes, 0 for no.' } },
  read: { value: (n) => (n.in('value') ? 1 : 0) },
});

defineNode({
  type: 'to-text', title: '→ text', kind: 'data', converts: ['*', 'text'],
  help: 'Turns anything into text, so it can be shown with Say.',
  inputs: { value: { type: 'any', value: null, help: 'Anything.' } },
  outputs: { value: { type: 'text', help: 'It, written as text.' } },
  read: {
    value(n) {
      const v = n.in('value');
      if (v && typeof v === 'object' && 'kind' in v && 'pos' in v) return v.id;
      return typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : String(v);
    },
  },
});
