// The 2-D renderer. It only turns draw commands into pixels, so another renderer (3-D one day) can take the same
// commands: { kind: 'disc', at, radius, colour, alpha }, { kind: 'glow', at, radius, colour, strength } and
// { kind: 'trail', points, colour, width, strength } and { kind: 'picture', at, file, height, lean, flip, alpha, shadow }.
// Positions are [x, y, z]; this one ignores z.
import { FADE } from '../engine/world.js';
import { drawFigure } from './figure2d.js';

export function createRenderer2D(canvas, { pictures } = {}) {
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const fit = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  fit();
  addEventListener('resize', fit);

  let speckle = null, speckleFor = '';
  const speckles = (w, h) => {
    const key = w + 'x' + h;
    if (speckleFor !== key) {
      let s = 12345;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      speckle = Array.from({ length: Math.round((w * h) / 3500) }, () => [rnd() * w, rnd() * h, 0.6 + rnd() * 1.4, 0.25 + rnd() * 0.6]);
      speckleFor = key;
    }
    return speckle;
  };

  return {
    get width() { return W; },
    get height() { return H; },
    // camera: { x, y, scale } (scene point at the screen centre; screen pixels per scene unit)
    toScene(camera, sx, sy) { return [(sx - W / 2) / camera.scale + camera.x, (sy - H / 2) / camera.scale + camera.y]; },

    frame({ camera, scene, draws, hud, note, wash, bars }) {
      const { x: cx, y: cy, scale: k } = camera;
      const sx = (x) => (x - cx) * k + W / 2, sy = (y) => (y - cy) * k + H / 2;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;

      // beyond the edge, then the ground with its speckles
      g.fillStyle = '#04060c'; g.fillRect(0, 0, W, H);
      const [sw, sh] = scene.size, ground = scene.ground || {};
      g.fillStyle = ground.colour || '#0b1020'; g.fillRect(sx(0), sy(0), sw * k, sh * k);
      g.fillStyle = ground.speckle || '#2a3557';
      for (const [x, y, r, a] of speckles(sw, sh)) {
        const px = sx(x), py = sy(y);
        if (px < -4 || py < -4 || px > W + 4 || py > H + 4) continue;
        g.globalAlpha = a; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
      }
      g.globalAlpha = 1;

      // pictures lie flat on the map, centred on their thing
      for (const d of draws) if (d.kind === 'picture') {
        const pic = pictures && pictures.get(d.file);
        if (!pic) continue;
        const h = d.height * k, w = (h * pic.w) / pic.h, px = sx(d.at[0]), py = sy(d.at[1]);
        if (px + w < 0 || px - w > W || py + h < 0 || py - h > H) continue;
        g.globalAlpha = Math.max(0, Math.min(1, d.alpha));
        g.save(); g.translate(px, py); if (d.turn) g.rotate(d.turn); if (d.flip) g.scale(-1, 1);
        g.drawImage(pic.sized(w * dpr), -w / 2, -h / 2, w, h);
        g.restore();
      }
      g.globalAlpha = 1;
      for (const d of draws) if (d.kind === 'figure') drawFigure(g, sx(d.at[0]), sy(d.at[1]), k, d, Math.max(0, Math.min(1, d.alpha)));
      g.globalAlpha = 1;
      for (const d of draws) if (d.kind === 'disc') {
        g.globalAlpha = Math.max(0, Math.min(1, d.alpha)); g.fillStyle = d.colour;
        g.beginPath(); g.arc(sx(d.at[0]), sy(d.at[1]), d.radius * k, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'lighter';
      for (const d of draws) if (d.kind === 'glow') {
        const px = sx(d.at[0]), py = sy(d.at[1]), r = d.radius * k * (0.55 + 0.45 * Math.min(1, d.strength)), s = d.strength;
        const [R, G, B] = rgb(d.colour);
        const grad = g.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(${R},${G},${B},${Math.min(1, 0.95 * s)})`);
        grad.addColorStop(0.18, `rgba(${R},${G},${B},${Math.min(1, 0.55 * s)})`);
        grad.addColorStop(0.5, `rgba(${R},${G},${B},${0.16 * s})`);
        grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
        g.fillStyle = grad; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
      }
      // trails: a line through recent positions, thinning and fading towards the oldest end
      g.lineCap = 'round';
      for (const d of draws) if (d.kind === 'trail') {
        const pts = d.points, n = pts.length, [R, G, B] = rgb(d.colour);
        for (let i = 1; i < n; i++) {
          const f = i / (n - 1);
          g.strokeStyle = `rgba(${R},${G},${B},${Math.min(1, d.strength * f)})`;
          g.lineWidth = Math.max(0.5, d.width * k * f);
          g.beginPath(); g.moveTo(sx(pts[i - 1][0]), sy(pts[i - 1][1])); g.lineTo(sx(pts[i][0]), sy(pts[i][1])); g.stroke();
        }
      }
      g.globalCompositeOperation = 'source-over';
      drawWash(g, W, H, wash);
      drawBars(g, W, bars);
      drawWords(g, W, H, hud, note, scene.words);
    },
  };
}

// The Wash box: the picture loses its colour towards pale paper (NAMI's ink, before the print is inked): first drained
// of colour, then veiled with the paper. 1 = the full picture (nothing done).
export function drawWash(g, W, H, wash) {
  if (!wash || wash.amount >= 0.999) return;
  const k = 1 - Math.max(0, wash.amount);
  g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = k * 0.9; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; g.fillStyle = wash.paper; g.globalAlpha = k * 0.6; g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
}
// Bar boxes: thin bars across the top, filling up (NAMI's ink bar).
export function drawBars(g, W, bars = []) {
  bars.forEach((b, i) => {
    const w = Math.min(420, W * 0.3), x = (W - w) / 2, y = 14 + i * 9;
    const [R, G, B] = rgb(b.colour);
    g.globalAlpha = 1; g.fillStyle = `rgba(${R},${G},${B},0.14)`; g.fillRect(x, y, w, 3);
    g.fillStyle = b.colour; g.fillRect(x, y, w * Math.max(0, Math.min(1, b.amount)), 3);
  });
}
// On-screen words (the Say node) and the little "live: ..." note; shared by every renderer.
export function drawWords(g, W, H, hud, note, ink = '#efe8d8') {
  g.textBaseline = 'middle';
  // dark words get a soft paper glow behind them, so they read over a busy picture (as the cards do)
  const [r, gg, b] = rgb(ink), dark = r * 0.3 + gg * 0.59 + b * 0.11 < 128;
  g.shadowColor = dark ? 'rgba(244,231,214,0.95)' : 'transparent'; g.shadowBlur = dark ? 10 : 0;
  const say = (h, x, y, size, align) => {
    if (!h) return;
    const fadeIn = Math.min(1, h.age / 0.25), fadeOut = h.life === Infinity ? 1 : Math.max(0, Math.min(1, (h.life + FADE - h.age) / FADE));
    g.globalAlpha = fadeIn * fadeOut; g.fillStyle = ink; g.textAlign = align;
    g.font = `${size}px Georgia, serif`; g.fillText(h.text, x, y);
  };
  say(hud.corner, 18, 28, 18, 'left');
  say(hud.middle, W / 2, H * 0.28, 28, 'center');
  g.shadowColor = 'transparent'; g.shadowBlur = 0;
  if (note && note.age < 2.5) {
    g.globalAlpha = Math.min(1, (2.5 - note.age) / 0.8) * 0.75; g.fillStyle = '#9fb3e0'; g.textAlign = 'right';
    g.font = '13px monospace'; g.fillText(note.text, W - 12, H - 16);
  }
  g.globalAlpha = 1;
}

const cache = new Map();
export function rgb(hex) {
  let c = cache.get(hex);
  if (!c) { const n = parseInt(hex.slice(1), 16); c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; cache.set(hex, c); }
  return c;
}
