import { defineNode } from '../engine/registry.js';

// Yes/no logic: both, either, or the opposite. (E.g. she stands still if she is busy OR the ending has begun.)
const OPS = { and: (a, b) => a && b, or: (a, b) => a || b, 'not a': (a) => !a };
defineNode({
  type: 'logic', title: 'Logic', kind: 'data',
  help: 'Joins two yes/no values: "and" = yes only if both are yes, "or" = yes if either is, "not a" = the opposite of a.',
  inputs: {
    a: { type: 'yesno', value: false, help: 'The first yes/no.' },
    b: { type: 'yesno', value: false, help: 'The second yes/no (not used by "not a").' },
    op: { type: 'choice', value: 'or', options: Object.keys(OPS), setting: true, label: 'how', help: 'and, or, or not a.' },
  },
  outputs: { result: { type: 'yesno', label: 'yes?', help: 'The answer.' } },
  read: { result: (n) => OPS[n.in('op')](!!n.in('a'), !!n.in('b')) },
});
