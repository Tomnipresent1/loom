import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, heard, sends, panFrom, previewSends } from '../engine/sends.js';

// NAMI's garden one-shots (Plum Blossom), made in code: wooden chimes, bird calls, a rustle. Volume 1 = NAMI's loudness.
// Autumn added its birds (robin, crow, wood pigeon) and "from its place?": heard from where the thing stands, panned.
export const shot = (type, title, help, extra, make) => defineNode({
  type, title, kind: 'do', help,
  inputs: {
    go: { flow: true, label: 'play', help: 'Play it now.' },
    ...extra,
    volume: { type: 'number', value: 1, help: '1 = as loud as in NAMI\'s Plum Blossom.' },
    placed: { type: 'yesno', value: false, label: 'from its place?', help: 'Heard from where its thing stands: to the left or right of the listener it pans that way (the further off, the less). No = from everywhere at once.' },
    ...SEND_INPUTS,
  },
  outputs: { then: { flow: true, help: 'Fires straight after it starts.' } },
  on: {
    go(n) {
      const volume = heard(n, n.in('volume') / 2) * 2;
      if (volume > 0) n.world.playSound({ ...make(n), volume, pan: n.in('placed') ? panFrom(n, n.me.pos) : 0, ...sends(n) });
      n.fire('then');
    },
  },
  preview: (get) => ({ play: [{ ...make({ in: get }), volume: Math.max(0, Math.min(2, get('volume'))), ...previewSends(get) }] }),
});

shot('wood-chimes', 'Wood chimes', 'A little run of hollow wooden chimes, as hung under the eaves (NAMI\'s garden).',
  { count: { type: 'whole', value: 0, label: 'how many', help: 'How many notes in the run (0 = 2 to 4, at random).' } },
  (n) => ({ kind: 'woodchimes', count: n.in('count') }));

shot('bird-call', 'Bird call', 'A bird calls: the uguisu (bush warbler, the bird of the plum blossom: a long rising "hoooo", then "ho-ke-kyo"), small birds\' high "chii" calls, a robin\'s thin autumn song or its alarm ("tic, tic"), a crow far off, or a wood pigeon\'s soft "coo-COOO-coo".',
  { bird: { type: 'choice', value: 'uguisu', options: ['uguisu', 'small birds', 'robin', 'robin alarm', 'crow', 'wood pigeon'], setting: true, help: 'Which bird.' } },
  (n) => ({ kind: 'bird', bird: n.in('bird') }));

shot('rustle', 'Rustle', 'A soft rustle: grass, leaves, cloth (NAMI\'s, when she gathers a sprig).',
  { seconds: { type: 'number', value: 0.35, help: 'How long it lasts.' } },
  (n) => ({ kind: 'rustle', seconds: Math.max(0.05, n.in('seconds')) }));
