// Musical notes for sound boxes. The list is a pentatonic scale (C D E G A) over three and a bit octaves: any of these
// notes sound good together, so wiring in random notes never sounds wrong. A box's "bend" moves a note by semitones.
export const NOTES = [];
for (const oct of [3, 4, 5]) for (const n of ['C', 'D', 'E', 'G', 'A']) NOTES.push(n + oct);
NOTES.push('C6');

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// "E5" bent by `bend` semitones -> frequency in Hz (A4 = 440)
export function noteFreq(note, bend = 0) {
  const m = /^([A-G])(\d)$/.exec(note || '') || ['', 'A', '4'];
  const midi = 12 * (+m[2] + 1) + SEMI[m[1]] + (Number.isFinite(bend) ? bend : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
