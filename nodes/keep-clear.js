import { defineNode } from '../engine/registry.js';

// A space people keep out of (NAMI's clear space in front of the tea house): Wander never wanders into it (and wanders out
// if it finds itself inside), Walk the path walks round its far side. The player is not stopped by it. Invisible in the
// game; a faint dashed ring in the top view.
defineNode({
  type: 'keep-clear', title: 'Keep clear', kind: 'part',
  help: 'A round space round this thing that people (Wander, Walk the path) keep out of. The player can still go in.',
  inputs: { radius: { type: 'number', value: 500, help: 'How big the space is (its radius, in scene units).' } },
  keepClear: (n) => Math.max(0, n.in('radius')),
});
