import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'set-var', title: 'Set', kind: 'do',
  help: 'Puts a new value into a variable (this thing\'s, the scene\'s or the piece\'s).',
  inputs: {
    go: { flow: true, help: 'Set it now.' },
    var: { type: 'var', value: '', setting: true, label: 'variable', help: 'Which variable to set.' },
    value: { type: 'any', value: 0, help: 'The new value (wire it in, or type a number).' },
  },
  outputs: { then: { flow: true, help: 'Fires straight after setting it.' } },
  on: { go(n) { n.world.setVar(n.me, n.in('var'), n.in('value')); n.fire('then'); } },
});
