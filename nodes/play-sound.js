import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, heard, sends } from '../engine/sends.js';

defineNode({
  type: 'play-sound', title: 'Play sound', kind: 'do',
  help: 'Plays a sound file once when the white wire arrives (from the piece\'s sounds folder).',
  inputs: {
    go: { flow: true, label: 'play', help: 'Play it now.' },
    sound: { type: 'sound', value: '', setting: true, label: 'file', help: 'Which sound file (add files with the sounds panel in the scene tab, or drop them on the editor).' },
    volume: { type: 'number', value: 0.8, help: '0 = silent, 1 = full.' },
    pitch: { type: 'number', value: 0, help: 'Shifts it up or down in semitones (it plays faster / slower too, like a record): 12 = an octave up.' },
    vary: { type: 'number', value: 0, help: 'Random pitch each time, up to this many semitones either way, so repeats don\'t sound identical (try 1).' },
    ...SEND_INPUTS,
  },
  outputs: { then: { flow: true, help: 'Fires straight after it starts playing.' } },
  on: {
    go(n) {
      const file = n.in('sound');
      if (file) {
        const st = n.in('pitch') + (Math.random() * 2 - 1) * n.in('vary');
        n.world.playSound({ kind: 'file', file, volume: heard(n, n.in('volume')), rate: 2 ** (st / 12), ...sends(n) });
      }
      n.fire('then');
    },
  },
});
