// On-screen buttons (the Button box): round, bottom right, like NAMI's GATHER button. They are real page buttons laid
// over the canvas, so a tap on one never also counts as a finger on the ground (she doesn't walk). Each frame the
// player hands over the World's buttons(); take() returns the labels pressed since (taps, or each button's key).
const STYLE = `
  .loom-btn { position: fixed; right: 6vh; bottom: 6vh; z-index: 6; width: 21vh; height: 21vh; border-radius: 50%;
    border: 2px solid #2a2420; background: rgba(239,228,198,.92); color: #2a2420; padding: 0; cursor: pointer;
    font: 2.3vh/1 Georgia, serif; letter-spacing: .12em; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: .6vh; opacity: 0; pointer-events: none; transition: opacity .25s;
    animation: loom-btn-glow 1.6s ease-in-out infinite; -webkit-tap-highlight-color: transparent; }
  .loom-btn.on { opacity: 1; pointer-events: auto; }
  .loom-btn:active { transform: scale(.96); }
  .loom-btn img { width: 62%; max-height: 50%; object-fit: contain; pointer-events: none; }
  @keyframes loom-btn-glow { 0%, 100% { box-shadow: 0 0 1.5vh .6vh rgba(255,248,230,.35); } 50% { box-shadow: 0 0 3vh 1.6vh rgba(255,248,230,.65); } }`;
const KEYS = { Enter: 'Enter', Space: ' ' };

export function createButtons(pictureUrl) {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const els = new Map();                  // label -> its page button
  let shown = [], pending = [];
  addEventListener('keydown', (e) => {
    for (const b of shown) if (b.key !== 'none' && KEYS[b.key] === e.key) { pending.push(b.label); e.preventDefault(); }
  });
  function element(b) {
    let el = els.get(b.label);
    if (!el) {
      el = document.createElement('button');
      el.className = 'loom-btn';
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (el.classList.contains('on')) pending.push(b.label); });
      document.body.appendChild(el);
      els.set(b.label, el);
    }
    const key = `${b.picture}|${b.label}`;
    if (el.dataset.key !== key) {
      el.dataset.key = key;
      el.textContent = '';
      if (b.picture) el.appendChild(Object.assign(document.createElement('img'), { src: pictureUrl(b.picture), alt: '' }));
      el.appendChild(document.createTextNode(b.label));
    }
    return el;
  }
  return {
    /** The buttons that should show right now ([{ label, picture, key }]); the rest fade away. */
    update(list) {
      shown = list;
      const on = new Set(list.map((b) => element(b)));
      for (const el of els.values()) el.classList.toggle('on', on.has(el));
    },
    /** The labels pressed since the last take(). */
    take() { return pending.splice(0); },
  };
}
