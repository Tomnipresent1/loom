import { defineNode } from '../engine/registry.js';
import { curveKeys, evalCurve } from '../engine/curve.js';

defineNode({
  type: 'move-to', title: 'Move to', kind: 'do',
  help: 'Glides this thing to a place over some seconds (or at a walking pace), along a curve, then says it has arrived.',
  inputs: {
    go: { flow: true, help: 'Set off now (from wherever it is).' },
    to: { type: 'position', value: [0, 0, 0], label: 'place', help: 'Where to go (wire in a position, e.g. from Make position or Position of).' },
    seconds: { type: 'number', value: 1, help: 'How long the journey takes (when pace is 0).' },
    pace: { type: 'number', value: 0, help: 'Go at this speed instead (scene units a second, e.g. 110 = an easy walk); the journey takes as long as it takes. 0 = use seconds.' },
    arc: { type: 'number', value: 0, help: 'Lift it this high in the middle of the journey (a toss, a hop). 0 = a straight line.' },
    curve: { type: 'curve', value: 'ease-in-out', setting: true, help: 'How it speeds up and slows down on the way.' },
  },
  outputs: {
    arrived: { flow: true, help: 'Fires when it gets there.' },
    moving: { type: 'yesno', label: 'moving?', help: 'Yes while it is on its way.' },
  },
  create(n) { n.state.trip = null; },
  on: {
    go(n) {
      const from = [...n.me.pos], to = [...n.in('to')], pace = n.in('pace');
      const seconds = pace > 0 ? Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / pace : n.in('seconds');
      n.state.trip = { from, to, t: 0, seconds: Math.max(0.001, seconds), arc: n.in('arc') };
    },
  },
  tick(n, dt) {
    const trip = n.state.trip;
    if (!trip) return;
    trip.t = Math.min(1, trip.t + dt / trip.seconds);
    const k = evalCurve(curveKeys(n.in('curve')), trip.t);
    for (let i = 0; i < 3; i++) n.me.pos[i] = trip.from[i] + (trip.to[i] - trip.from[i]) * k;
    n.me.pos[2] += Math.sin(trip.t * Math.PI) * trip.arc;
    if (trip.t >= 1) { n.state.trip = null; n.fire('arrived'); }
  },
  read: { moving: (n) => !!n.state.trip },
});
