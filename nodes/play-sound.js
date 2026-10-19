import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, heard, sends, panFrom, previewSends } from '../engine/sends.js';

defineNode({
  type: 'play-sound', title: 'Play sound', kind: 'do',
  help: 'Plays a sound file once when the white wire arrives (from the piece\'s sounds folder).',
  inputs: {
    go: { flow: true, label: 'play', help: 'Play it now.' },
    sound: { type: 'sound', value: '', setting: true, label: 'file', help: 'Which sound file (add files with the sounds panel in the scene tab, or drop them on the editor).' },
    volume: { type: 'number', value: 0.8, help: '0 = silent, 1 = as recorded, 2 = twice as loud (for a quiet recording).' },
    pitch: { type: 'number', value: 0, help: 'Shifts it up or down in semitones (it plays faster / slower too, like a record): 12 = an octave up.' },
    vary: { type: 'number', value: 0, help: 'Random pitch each time, up to this many semitones either way, so repeats don\'t sound identical (try 1).' },
    from: { type: 'number', value: 0, label: 'start at (s)', help: 'Skips this many seconds at the start of the recording: for one with a moment of silence before the sound, so it plays right on cue (e.g. a yip in time with her mouth).' },
    placed: { type: 'yesno', value: false, label: 'from its place?', help: 'Heard from where its thing is: to the left or right of the listener it pans that way (the further off, the less). No = from everywhere at once.' },
    ...SEND_INPUTS,
  },
  outputs: { then: { flow: true, help: 'Fires straight after it starts playing.' } },
  on: {
    go(n) {
      const file = n.in('sound'), volume = heard(n, n.in('volume') / 2) * 2;
      if (file && volume > 0) {
        const st = n.in('pitch') + (Math.random() * 2 - 1) * n.in('vary');
        n.world.playSound({ kind: 'file', file, volume, rate: 2 ** (st / 12), from: Math.max(0, n.in('from')), pan: n.in('placed') ? panFrom(n, n.me.pos) : 0, ...sends(n) });
      }
      n.fire('then');
    },
  },
  preview: (get) => get('sound') ? { play: [{ kind: 'file', file: get('sound'), volume: Math.max(0, Math.min(2, get('volume'))), rate: 2 ** ((get('pitch') + (Math.random() * 2 - 1) * get('vary')) / 12), from: Math.max(0, get('from')), ...previewSends(get) }] } : null,
});
