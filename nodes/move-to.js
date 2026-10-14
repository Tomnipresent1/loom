import { defineNode } from '../engine/registry.js';
import { curveKeys, evalCurve } from '../engine/curve.js';

defineNode({
  type: 'move-to', title: 'Move to', kind: 'do',
  help: 'Glides this thing to a place over some seconds, along a curve, then says it has arrived.',
  inputs: {
    go: { flow: true, help: 'Set off now (from wherever it is).' },
    to: { type: 'position', value: [0, 0, 0], label: 'place', help: 'Where to go (wire in a position, e.g. from Make position or Position of).' },
    seconds: { type: 'number', value: 1, help: 'How long the journey takes.' },
    curve: { type: 'curve', value: 'ease-in-out', setting: true, help: 'How it speeds up and slows down on the way.' },
  },
  outputs: {
    arrived: { flow: true, help: 'Fires when it gets there.' },
    moving: { type: 'yesno', label: 'moving?', help: 'Yes while it is on its way.' },
  },
  create(n) { n.state.trip = null; },
  on: { go(n) { n.state.trip = { from: [...n.me.pos], to: [...n.in('to')], t: 0 }; } },
  tick(n, dt) {
    const trip = n.state.trip;
    if (!trip) return;
    trip.t = Math.min(1, trip.t + dt / Math.max(0.001, n.in('seconds')));
    const k = evalCurve(curveKeys(n.in('curve')), trip.t);
    for (let i = 0; i < 3; i++) n.me.pos[i] = trip.from[i] + (trip.to[i] - trip.from[i]) * k;
    if (trip.t >= 1) { n.state.trip = null; n.fire('arrived'); }
  },
  read: { moving: (n) => !!n.state.trip },
});
