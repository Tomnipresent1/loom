import { defineNode } from '../engine/registry.js';
import { curveKeys, evalCurve } from '../engine/curve.js';

// A number in, the same number bent along a curve out (Tom's idea, 2026-10-13). Live, like any data box.
defineNode({
  type: 'curve-map', title: 'Curve', kind: 'data',
  help: 'Bends a number along a curve: "in from"…"in to" comes out as "out from"…"out to", shaped by the curve. Double-click the little curve to edit it.',
  inputs: {
    value: { type: 'number', value: 0, help: 'The number to bend.' },
    inFrom: { type: 'number', value: 0, label: 'in from', help: 'The input that counts as the start of the curve (anything below sticks at the start).' },
    inTo: { type: 'number', value: 1, label: 'in to', help: 'The input that counts as the end of the curve (anything above sticks at the end).' },
    outFrom: { type: 'number', value: 0, label: 'out from', help: 'What comes out at the start of the curve.' },
    outTo: { type: 'number', value: 1, label: 'out to', help: 'What comes out at the end of the curve.' },
    curve: { type: 'curve', value: 'ease-in-out', setting: true, help: 'The shape. Double-click the little curve to edit it.' },
  },
  outputs: { result: { type: 'number', label: 'bent', help: 'The number after the curve: always up to date.' } },
  read: {
    result(n) {
      const a = n.in('inFrom'), b = n.in('inTo');
      const t = b === a ? 0 : Math.max(0, Math.min(1, (n.in('value') - a) / (b - a)));
      const lo = n.in('outFrom'), hi = n.in('outTo');
      return lo + (hi - lo) * evalCurve(curveKeys(n.in('curve')), t);
    },
  },
});
