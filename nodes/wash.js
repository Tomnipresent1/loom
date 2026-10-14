import { defineNode } from '../engine/registry.js';

// How much colour the picture has, like a woodblock print being inked (NAMI's ink): 1 = the full print, 0 = pale paper.
// The colour drifts to the amount gently, so a jump (e.g. from the title to the game) washes in or out. The renderer
// washes the whole picture (the words and buttons stay crisp).
defineNode({
  type: 'wash', title: 'Wash', kind: 'part',
  help: 'How much colour the whole picture has: 1 = the full print, 0 = pale paper (NAMI\'s ink). Wire in the ink.',
  inputs: {
    amount: { type: 'number', value: 1, help: '0 = pale paper, 1 = full colour.' },
    paper: { type: 'colour', value: '#f2e8d5', help: 'The paper colour it fades towards.' },
    ease: { type: 'number', value: 1.4, help: 'Roughly how many seconds the colour takes to follow a change.' },
  },
  create(n) { n.state.shown = null; },
  tick(n, dt) {
    const want = Math.max(0, Math.min(1, n.in('amount')));
    n.state.shown = n.state.shown === null ? want : n.state.shown + (want - n.state.shown) * Math.min(1, dt / Math.max(0.01, n.in('ease')));
  },
  wash: (n) => ({ amount: n.state.shown === null ? 1 : n.state.shown, paper: n.in('paper') }),
});
