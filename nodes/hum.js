import { defineNode } from '../engine/registry.js';
import { NOTES, noteFreq } from '../engine/notes.js';
import { SEND_INPUTS, heard, sends } from '../engine/sends.js';

// A held tone that lasts as long as its thing. Volume and bend are live, so wires can swell it, fade it, slide it.
defineNode({
  type: 'hum', title: 'Hum', kind: 'part',
  help: 'A soft held tone from this thing. Wire a live number into volume (e.g. a Ramp) and it swells and fades with it.',
  inputs: {
    volume: { type: 'number', value: 0.5, help: '0 = silent, 1 = full. Live: wire in something that changes.' },
    note: { type: 'choice', value: 'A3', options: NOTES, setting: true, help: 'Which note it hums.' },
    bend: { type: 'number', value: 0, help: 'Moves the note by semitones (12 = an octave). Live: wire in a Wave and it wobbles.' },
    tone: { type: 'choice', value: 'soft', options: ['soft', 'warm', 'airy'], setting: true, help: 'soft: pure and round. warm: richer, like a reed. airy: breathy, like wind over a bottle.' },
    ...SEND_INPUTS,
    near: { ...SEND_INPUTS.near, value: 400 },              // a hum is usually something you walk up to
  },
  sound(n, out) {
    const v = heard(n, n.in('volume'));
    if (v > 0.001) out.push({ key: `${n.me.id}.${n.id}`, freq: noteFreq(n.in('note'), n.in('bend')), volume: v, tone: n.in('tone'), ...sends(n) });
  },
});
