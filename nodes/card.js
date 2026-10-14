import { defineNode } from '../engine/registry.js';

// A full-screen card of words over the picture, like NAMI's title and "THE TEA HOUSE" screens: a big title, a line, a
// small line (anything in brackets is set in italics, e.g. "恵み (blessings)"), and up to two buttons that appear after a
// moment. Show it with a white wire; it fires which button was chosen, and goes. The World only lists the cards
// (cards()); the runtime draws them and hands back the choices as input.pressed ("<key>#1" / "<key>#2").
defineNode({
  type: 'card', title: 'Card', kind: 'do',
  help: 'A full-screen card of words (a title, an ending) with up to two buttons. Show it; it fires the button chosen, then goes.',
  inputs: {
    show: { flow: true, help: 'Show the card now.' },
    hide: { flow: true, help: 'Take it away (without a choice).' },
    title: { type: 'text', value: 'THE TEA HOUSE', help: 'The big words.' },
    line: { type: 'text', value: '', help: 'A line under the title.' },
    small: { type: 'text', value: '', help: 'A smaller line under that. (Words in brackets come out in italics.)' },
    first: { type: 'text', value: 'WALK AGAIN', label: 'button 1', help: 'The first button\'s word (empty = no button).' },
    second: { type: 'text', value: '', label: 'button 2', help: 'The second button\'s word (empty = no button).' },
    wait: { type: 'number', value: 1.5, help: 'Seconds before the buttons appear (so a tap meant for the game doesn\'t choose).' },
    veil: { type: 'number', value: 0.5, help: 'How much the paper veils the picture behind (0 = not at all, 1 = hidden).' },
  },
  outputs: {
    chose1: { flow: true, label: 'button 1', help: 'Fires when the first button is chosen.' },
    chose2: { flow: true, label: 'button 2', help: 'Fires when the second button is chosen.' },
    showing: { type: 'yesno', label: 'showing?', help: 'Yes while the card is up.' },
  },
  create(n) { n.state.on = false; n.state.age = 0; },
  on: { show(n) { n.state.on = true; n.state.age = 0; }, hide(n) { n.state.on = false; } },
  tick(n, dt) {
    if (!n.state.on) return;
    n.state.age += dt;
    const pressed = n.world.input.pressed || [], key = `${n.me.id}/${n.id}`;
    if (n.state.age < n.in('wait')) return;
    if (pressed.includes(key + '#1')) { n.state.on = false; n.fire('chose1'); }
    else if (pressed.includes(key + '#2')) { n.state.on = false; n.fire('chose2'); }
  },
  card(n) {
    if (!n.state.on) return null;
    return { key: `${n.me.id}/${n.id}`, title: n.in('title'), line: n.in('line'), small: n.in('small'),
      choices: [n.in('first'), n.in('second')].map(String), ready: n.state.age >= n.in('wait'), veil: n.in('veil') };
  },
  read: { showing: (n) => !!n.state.on },
});
