import { defineNode } from '../engine/registry.js';
import { NOTES, noteFreq } from '../engine/notes.js';
import { SEND_INPUTS, heard, sends } from '../engine/sends.js';

defineNode({
  type: 'chime', title: 'Chime', kind: 'do',
  help: 'Rings once when the white wire arrives: a bell, a pluck or a wooden tap, on a note.',
  inputs: {
    go: { flow: true, label: 'ring', help: 'Ring now.' },
    note: { type: 'choice', value: 'E5', options: NOTES, setting: true, help: 'Which note (all the notes on the list sound good together).' },
    tone: { type: 'choice', value: 'bell', options: ['bell', 'pluck', 'wood'], setting: true, help: 'bell: rings on, a little metallic. pluck: like a koto string. wood: a short hollow tap.' },
    bend: { type: 'number', value: 0, help: 'Moves the note up (or down, with minus) by semitones: 12 = an octave. Wire in a number to vary it.' },
    volume: { type: 'number', value: 0.5, help: '0 = silent, 1 = full.' },
    ...SEND_INPUTS,
  },
  outputs: { then: { flow: true, help: 'Fires straight after ringing.' } },
  on: {
    go(n) {
      n.world.playSound({ kind: 'chime', tone: n.in('tone'), freq: noteFreq(n.in('note'), n.in('bend')), volume: heard(n, n.in('volume')), ...sends(n) });
      n.fire('then');
    },
  },
});
