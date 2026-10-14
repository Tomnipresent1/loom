import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'get-var', title: 'Get', kind: 'data',
  help: 'The current value of a variable (this thing\'s, the scene\'s or the piece\'s).',
  inputs: { var: { type: 'var', value: '', setting: true, label: 'variable', help: 'Which variable to read.' } },
  outputs: {
    // the wire's colour is the variable's type
    value: { type: (spec, ctx) => { const v = ctx.findVar(spec.set.var); return v ? v.type : 'any'; }, help: 'Its current value (always up to date).' },
  },
  read: { value: (n) => n.world.getVar(n.me, n.in('var')) },
});
