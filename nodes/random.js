import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'random', title: 'Random', kind: 'do',
  help: 'Rolls a new random number each time the white wire arrives, and keeps it until the next roll.',
  inputs: {
    go: { flow: true, label: 'roll', help: 'Roll a new number now.' },
    min: { type: 'number', value: 0, label: 'from', help: 'The smallest it can be.' },
    max: { type: 'number', value: 1, label: 'to', help: 'The biggest it can be.' },
    whole: { type: 'yesno', value: false, setting: true, label: 'whole numbers', help: 'Yes = only whole numbers (from 1 to 6 like a dice).' },
  },
  outputs: {
    then: { flow: true, help: 'Fires straight after rolling.' },
    value: { type: 'number', help: 'The last number rolled.' },
  },
  create(n) { roll(n); },
  on: { go(n) { roll(n); n.fire('then'); } },
  read: { value: (n) => n.state.value },
});

function roll(n) {
  const a = n.in('min'), b = n.in('max');
  n.state.value = n.in('whole') ? Math.floor(Math.min(a, b) + Math.random() * (Math.abs(b - a) + 1)) : a + Math.random() * (b - a);
}
