import { defineNode } from '../engine/registry.js';

// An on-screen button (like NAMI's round GATHER button, bottom right): it shows while "show" is yes and fires "pressed"
// when tapped, or when its key is pressed on the PC. Buttons with the same label share one place on the screen, so ten
// fallen sprigs each with a GATHER button make one GATHER button (it fires for whichever are showing).
// The World only lists the buttons and hears which labels were pressed (input.pressed); the runtime draws them.
defineNode({
  type: 'button', title: 'Button', kind: 'when',
  help: 'A round button on the screen (bottom right) that shows while "show" is yes. Tapping it (or its key) fires "pressed". Buttons with the same label share one.',
  inputs: {
    show: { type: 'yesno', value: true, help: 'Show the button? (Wire in e.g. a Trigger zone\'s "anyone inside?".)' },
    label: { type: 'text', value: 'GATHER', help: 'The word on the button. Buttons with the same word share one button.' },
    picture: { type: 'picture', value: '', help: 'A small picture on the button (optional), from the piece\'s pictures folder.' },
    key: { type: 'choice', value: 'Enter', options: ['Enter', 'Space', 'none'], setting: true, help: 'The key that presses it on the PC.' },
  },
  outputs: { pressed: { flow: true, help: 'Fires when the button is tapped (only while it shows).' } },
  tick(n) {
    const pressed = n.world.input.pressed;
    if (pressed && pressed.length && n.in('show') && pressed.includes(n.in('label'))) n.fire('pressed');
  },
  button(n) { return n.in('show') ? { label: n.in('label'), picture: n.in('picture'), key: n.in('key') } : null; },
});
