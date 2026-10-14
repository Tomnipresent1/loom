import { defineNode } from '../engine/registry.js';

// NAMI's breeze (Plum Blossom): it rises and falls slowly, with the odd gust. Every Breeze box in a scene blows the same
// (it comes from the scene's clock), so the wind's sound, the chimes and every tree's sway move together.
defineNode({
  type: 'breeze', title: 'Breeze', kind: 'data',
  help: 'How hard the breeze blows right now (0.15 to 1): rising and falling, with the odd gust (NAMI\'s). Every Breeze in the scene blows the same.',
  inputs: {
    middle: { type: 'number', value: 0.4, help: 'Its usual strength.' },
    swing: { type: 'number', value: 0.22, help: 'How much it slowly rises and falls.' },
    gusts: { type: 'number', value: 0.5, help: 'How strong the gusts are (0 = none).' },
  },
  outputs: { strength: { type: 'number', help: 'The breeze now: 0.15 (still) to 1 (a gust).' } },
  read: {
    strength(n) {
      const t = n.world.time;
      const v = n.in('middle') + n.in('swing') * Math.sin(t * 0.13) + n.in('gusts') * Math.max(0, Math.sin(t * 0.31 + 2)) ** 4;
      return Math.max(0.15, Math.min(1, v));
    },
  },
});
