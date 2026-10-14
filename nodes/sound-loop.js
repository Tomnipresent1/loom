import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, heard, sends } from '../engine/sends.js';

// A sound file going round and round for as long as its thing exists; volume and pitch are live, like Hum's.
defineNode({
  type: 'sound-loop', title: 'Sound loop', kind: 'part',
  help: 'Loops a sound file for as long as this thing exists. Volume and pitch are live: wire in something that changes.',
  inputs: {
    sound: { type: 'sound', value: '', setting: true, label: 'file', help: 'Which sound file (add files with the sounds panel in the scene tab, or drop them on the editor).' },
    volume: { type: 'number', value: 0.6, help: '0 = silent, 1 = full. Live.' },
    pitch: { type: 'number', value: 0, help: 'Shifts it up or down in semitones (faster / slower too). Live.' },
    ...SEND_INPUTS,
  },
  sound(n, out) {
    const file = n.in('sound'), v = heard(n, n.in('volume'));
    if (file && v > 0.001) out.push({ key: `${n.me.id}.${n.id}`, kind: 'file', file, volume: v, rate: 2 ** (n.in('pitch') / 12), ...sends(n) });
  },
});
