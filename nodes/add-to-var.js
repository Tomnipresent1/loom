import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'add-to-var', title: 'Add to', kind: 'do',
  help: 'Adds an amount to a number variable (a counter: add 1).',
  inputs: {
    go: { flow: true, help: 'Add now.' },
    var: { type: 'var', value: '', setting: true, label: 'variable', help: 'Which variable to add to.' },
    amount: { type: 'number', value: 1, help: 'How much to add (use -1 to take away).' },
  },
  outputs: { then: { flow: true, help: 'Fires straight after adding.' } },
  on: {
    go(n) {
      const name = n.in('var');
      n.world.setVar(n.me, name, n.world.getVar(n.me, name) + n.in('amount'));
      n.fire('then');
    },
  },
});
