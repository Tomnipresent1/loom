// Card boxes on screen: NAMI's title and ending screens, as page elements over the canvas (so a tap on a button never
// counts as a finger on the ground). The words fade in over a paper veil; the buttons appear when the card is ready.
// Each frame the player hands over the World's cards(); take() returns the choices made ("<card key>#1" / "#2").
// Enter chooses the first button.
const STYLE = `
  .loom-card { position: fixed; inset: 0; z-index: 7; display: flex; flex-direction: column; align-items: center;
    font-family: Georgia, serif; color: #16213b; text-align: center; opacity: 0; transition: opacity .7s ease .3s;
    pointer-events: none; padding: 0 6vw; }
  .loom-card.on { opacity: 1; pointer-events: auto; }
  .loom-card .t, .loom-card .l, .loom-card .s { text-shadow: 0 0 .5vh #f4e7d6, 0 0 1.4vh #f4e7d6, 0 0 2.6vh rgba(244,231,214,.9); }
  .loom-card .t { margin-top: 27vh; font-size: 6.7vh; font-weight: bold; letter-spacing: .06em; }
  .loom-card .l { margin-top: 2.2vh; font-size: 3.3vh; color: #4a5470; letter-spacing: .05em; }
  .loom-card .s { margin-top: 2.4vh; font-size: 4vh; }
  .loom-card .s i { font-size: 3vh; color: #4a5470; }
  .loom-card .c { margin-top: auto; margin-bottom: 14vh; display: flex; gap: 4vw; opacity: 0; transition: opacity .6s; }
  .loom-card .c.ready { opacity: 1; }
  .loom-card button { font: 2.8vh Georgia, serif; letter-spacing: .1em; color: #16213b; background: rgba(244,236,220,.92);
    border: 2px solid #16213b; border-radius: 99px; padding: 1.6vh 4vh; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .loom-card button:active { transform: scale(.97); }`;

export function createCards() {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const els = new Map();                    // card key -> its element
  let shown = [], pending = [];
  addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const c = shown.find((x) => x.ready && x.choices[0]);
    if (c) { pending.push(c.key + '#1'); e.preventDefault(); }
  });
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  function element(c) {
    let el = els.get(c.key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'loom-card';
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      document.body.appendChild(el);
      els.set(c.key, el);
    }
    const look = JSON.stringify([c.title, c.line, c.small, c.choices]);
    if (el.dataset.look !== look) {
      el.dataset.look = look;
      // (words in brackets on the small line come out in italics, as NAMI's "恵み (blessings)")
      const small = esc(c.small).replace(/\(([^)]*)\)/g, '<i>($1)</i>');
      el.innerHTML = `<div class="t">${esc(c.title)}</div>${c.line ? `<div class="l">${esc(c.line)}</div>` : ''}${c.small ? `<div class="s">${small}</div>` : ''}<div class="c"></div>`;
      c.choices.forEach((label, i) => {
        if (!label) return;
        const b = Object.assign(document.createElement('button'), { textContent: label });
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (el.querySelector('.c').classList.contains('ready')) pending.push(`${c.key}#${i + 1}`); });
        el.querySelector('.c').appendChild(b);
      });
    }
    el.style.background = `rgba(244,231,214,${Math.max(0, Math.min(1, c.veil)) * 0.85})`;
    el.querySelector('.c').classList.toggle('ready', !!c.ready);
    return el;
  }
  return {
    update(list) {
      shown = list;
      const on = new Set(list.map((c) => element(c)));
      for (const el of els.values()) el.classList.toggle('on', on.has(el));
    },
    take() { return pending.splice(0); },
  };
}
