import { defineNode } from '../engine/registry.js';

// A thin bar at the top of the screen that fills up (NAMI's ink bar): wire in how full it is, 0 to 1.
defineNode({
  type: 'bar', title: 'Bar', kind: 'part',
  help: 'A thin bar at the top of the screen that fills from 0 to 1 (e.g. the ink of the print).',
  inputs: {
    amount: { type: 'number', value: 0, help: 'How full: 0 = empty, 1 = full.' },
    colour: { type: 'colour', value: '#16213b', help: 'The colour it fills with.' },
    show: { type: 'yesno', value: true, help: 'Show it?' },
  },
  create(n) { n.state.shown = null; },
  tick(n, dt) { const want = Math.max(0, Math.min(1, n.in('amount'))); n.state.shown = n.state.shown === null ? want : n.state.shown + (want - n.state.shown) * Math.min(1, dt * 1.6); },
  bar: (n) => (n.in('show') ? { amount: n.state.shown ?? 0, colour: n.in('colour') } : null),
});
