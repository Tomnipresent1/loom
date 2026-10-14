import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, heard, sends } from '../engine/sends.js';

// NAMI's garden one-shots (Plum Blossom), made in code: wooden chimes, bird calls, a rustle. Volume 1 = NAMI's loudness.
const shot = (type, title, help, extra, make) => defineNode({
  type, title, kind: 'do', help,
  inputs: {
    go: { flow: true, label: 'play', help: 'Play it now.' },
    ...extra,
    volume: { type: 'number', value: 1, help: '1 = as loud as in NAMI\'s Plum Blossom.' },
    ...SEND_INPUTS,
  },
  outputs: { then: { flow: true, help: 'Fires straight after it starts.' } },
  on: {
    go(n) {
      n.world.playSound({ ...make(n), volume: heard(n, n.in('volume') / 2) * 2, ...sends(n) });
      n.fire('then');
    },
  },
});

shot('wood-chimes', 'Wood chimes', 'A little run of hollow wooden chimes, as hung under the eaves (NAMI\'s garden).',
  { count: { type: 'whole', value: 0, label: 'how many', help: 'How many notes in the run (0 = 2 to 4, at random).' } },
  (n) => ({ kind: 'woodchimes', count: n.in('count') }));

shot('bird-call', 'Bird call', 'A bird calls: the uguisu (bush warbler, the bird of the plum blossom: a long rising "hoooo", then "ho-ke-kyo"), or small birds\' high "chii" calls.',
  { bird: { type: 'choice', value: 'uguisu', options: ['uguisu', 'small birds'], setting: true, help: 'Which bird.' } },
  (n) => ({ kind: 'bird', bird: n.in('bird') }));

shot('rustle', 'Rustle', 'A soft rustle: grass, leaves, cloth (NAMI\'s, when she gathers a sprig).',
  { seconds: { type: 'number', value: 0.35, help: 'How long it lasts.' } },
  (n) => ({ kind: 'rustle', seconds: Math.max(0.05, n.in('seconds')) }));
