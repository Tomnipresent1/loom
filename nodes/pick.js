import { defineNode } from '../engine/registry.js';

// Unreal's Select: a live choice between two numbers.
defineNode({
  type: 'pick', title: 'Pick', kind: 'data',
  help: 'Gives one number or the other, depending on a yes/no. Always up to date.',
  inputs: {
    condition: { type: 'yesno', value: true, label: 'is it yes?', help: 'Which one to give.' },
    ifYes: { type: 'number', value: 1, label: 'if yes', help: 'Given when the answer is yes.' },
    ifNo: { type: 'number', value: 0, label: 'if no', help: 'Given when the answer is no.' },
  },
  outputs: { value: { type: 'number', help: 'The picked number.' } },
  read: { value: (n) => (n.in('condition') ? n.in('ifYes') : n.in('ifNo')) },
});
