// The paper-theatre renderer (scene camera style "theatre"): the same draw commands as the map view, seen from behind
// and above the followed thing, like NAMI's Plum Blossom. Everything stands up in the garden as a flat cut-out, drawn far
// to near, growing as you walk in. The maths lives in engine/camera.js.
//   disc: stands on the ground (its bottom at the thing's height), with a soft shadow under it
//   glow: centred on the body of the thing it belongs to (same place as its disc), else at its own height
//   trail: a line through the projected points, lifted half its width off the ground
//   picture: a flat cut-out standing on its foot, leaning with its sway, a soft shadow on the ground under it; or, if
//            "flat", lying on the ground (foreshortened like the ground itself)
import { theatreProject, theatreGround, theatreFade, theatrePersonFade, SKY_DEFAULTS } from '../engine/camera.js';
import { drawWords, drawWash, drawBars, rgb } from './render2d.js';
import { drawFigure } from './figure2d.js';

export function createRendererTheatre(canvas, { pictures } = {}) {
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const fit = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  fit();
  addEventListener('resize', fit);

  // tufts on the ground (the map's speckles, standing up): they slide past as you walk, so you feel yourself move
  let tufts = null, tuftsFor = '';
  const tuftsOf = (w, h) => {
    const key = w + 'x' + h;
    if (tuftsFor !== key) {
      let s = 54321;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      tufts = Array.from({ length: Math.min(30000, Math.round((w * h) / 9000)) }, () => [rnd() * w, rnd() * h, 0.6 + rnd() * 0.8]);
      tuftsFor = key;
    }
    return tufts;
  };

  return {
    get width() { return W; },
    get height() { return H; },
    // camera: { x, y, set, youX } (where it stands on the ground, its settings, the followed thing's x)
    toScene(camera, sx, sy) { return theatreGround(camera, camera.set, W, H, sx, sy); },

    frame({ camera, scene, draws, hud, note, wash, bars }) {
      const set = camera.set, hy = set.horizon * H;
      const P = (x, y, z) => theatreProject(camera, set, W, H, x, y, z);
      const fade = (x, depth) => theatreFade(camera, set, camera.youX, x, depth);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;

      // ---- the backdrop: sky, ground, a soft mist where they meet (Hiroshige's bokashi) ----
      const sky = scene.sky || {}, ground = scene.ground || {};
      const skyTop = sky.top || SKY_DEFAULTS.top, skyLow = sky.low || SKY_DEFAULTS.low;
      const groundNear = ground.colour || '#0b1020', groundFar = ground.far || skyLow;
      let grad = g.createLinearGradient(0, 0, 0, hy);
      grad.addColorStop(0, skyTop); grad.addColorStop(1, skyLow);
      g.fillStyle = grad; g.fillRect(0, 0, W, hy + 1);
      grad = g.createLinearGradient(0, hy, 0, H);
      grad.addColorStop(0, groundFar); grad.addColorStop(1, groundNear);
      g.fillStyle = grad; g.fillRect(0, hy, W, H - hy);
      const [mr, mg, mb] = rgb(skyLow);
      grad = g.createLinearGradient(0, hy - H * 0.08, 0, hy + H * 0.05);
      grad.addColorStop(0, `rgba(${mr},${mg},${mb},0)`); grad.addColorStop(0.6, `rgba(${mr},${mg},${mb},0.7)`); grad.addColorStop(1, `rgba(${mr},${mg},${mb},0)`);
      g.fillStyle = grad; g.fillRect(0, hy - H * 0.08, W, H * 0.13);

      // ---- tufts ----
      const [sw, sh] = scene.size, far = set.haze * 0.8;
      g.strokeStyle = ground.speckle || '#2a3557'; g.lineWidth = 1; g.globalAlpha = 0.8;
      g.beginPath();
      for (const [x, y, k] of tuftsOf(sw, sh)) {
        const depth = camera.y - y;
        if (depth < 20 || depth > far) continue;
        const p = P(x, y, 0);
        if (!p || p[0] < -10 || p[0] > W + 10) continue;
        const h = Math.max(1, 14 * k * p[2]);
        g.moveTo(p[0] - h * 0.4, p[1]); g.lineTo(p[0] - h * 0.15, p[1] - h); g.moveTo(p[0], p[1]); g.lineTo(p[0] + h * 0.1, p[1] - h * 1.2);
      }
      g.stroke();
      g.globalAlpha = 1;

      // ---- everything standing in the scene, far to near ----
      const bodies = new Map();                     // a thing's position array -> its disc (a Light centres on it)
      for (const d of draws) if (d.kind === 'disc') bodies.set(d.at, d);
      const list = [];
      for (const d of draws) {
        if (d.kind === 'disc') {
          const p = P(d.at[0], d.at[1], (d.at[2] || 0) + d.radius);
          if (p) list.push([p[3], d, p]);
        } else if (d.kind === 'glow') {
          const body = bodies.get(d.at), p = P(d.at[0], d.at[1], (d.at[2] || 0) + (body ? body.radius : 0));
          if (p) list.push([p[3] - 0.01, d, p]);    // (just in front of its own body)
        } else if (d.kind === 'picture') {
          const p = P(d.at[0], d.at[1], d.at[2] || 0);
          if (p && p[3] < set.haze * 4) list.push([d.flat ? p[3] + 1e6 : p[3], d, p]);     // (lying flat: part of the ground, drawn first)
        } else if (d.kind === 'figure') {
          const p = P(d.at[0], d.at[1], d.at[2] || 0);
          if (p && p[3] < set.haze * 3) list.push([p[3], d, p]);
        } else if (d.kind === 'trail' && d.points.length > 1) {
          const last = d.points[d.points.length - 1], p = P(last[0], last[1], 0);
          if (p) list.push([p[3] + 0.01, d, p]);    // (just behind its thing)
        }
      }
      list.sort((a, b) => b[0] - a[0]);
      for (const [, d, p] of list) {
        // people fade their own way (NAMI v3.12): once they have passed behind you they fade quickly, wherever they are
        // on screen, so nobody ever looms up huge in front of the lens (camera settings: people fade from / gone by)
        const a = d.kind === 'figure' ? theatrePersonFade(set, p[3])
          : fade(d.kind === 'trail' ? d.points[d.points.length - 1][0] : d.at[0], p[3]);
        if (a < 0.02) continue;
        if (d.kind === 'figure') { drawFigure(g, p[0], p[1], p[2], d, Math.max(0, Math.min(1, d.alpha)) * a); continue; }
        if (d.kind === 'disc') {
          const r = d.radius * p[2], foot = P(d.at[0], d.at[1], 0);
          if (foot) {                               // a soft shadow on the ground under it
            g.globalAlpha = 0.25 * a; g.fillStyle = '#000';
            g.beginPath(); g.ellipse(foot[0], foot[1], r * 0.9, r * 0.22, 0, 0, 7); g.fill();
          }
          g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a; g.fillStyle = d.colour;
          g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill();
        } else if (d.kind === 'picture') {
          const pic = pictures && pictures.get(d.file);
          if (!pic) continue;
          if (d.flat) {
            // lying on the ground, the paper-theatre way (as NAMI drew its fallen sprigs): a card squashed to under half its
            // height, centred on its spot. (True foreshortening would leave a sliver too thin to spot on a phone.)
            const fh = d.height * p[2], fw = (fh * pic.w) / pic.h, sh = fh * 0.45;
            g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a;
            g.save(); g.translate(p[0], p[1]); if (d.flip) g.scale(-1, 1);
            g.drawImage(pic.sized(fw * dpr), -fw / 2, -sh / 2, fw, sh);
            g.restore();
            continue;
          }
          const h = d.height * p[2], w = (h * pic.w) / pic.h;
          if (p[0] + w < -w * 0.2 || p[0] - w > W + w * 0.2) continue;               // well off the screen
          if (d.shadow > 0) {                                                         // a long soft shadow, as in the print
            g.globalAlpha = Math.min(1, d.shadow) * 0.6 * a; g.fillStyle = '#1e3c2d';
            g.beginPath(); g.ellipse(p[0] - w * 0.12, p[1], w * 0.36, Math.max(1, w * 0.045), 0, 0, 7); g.fill();
          }
          g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a;
          if (d.turn) {                                                               // turned about its foot (and swaying a little)
            g.save(); g.translate(p[0], p[1]); g.rotate(d.turn + d.lean); if (d.flip) g.scale(-1, 1);
            g.drawImage(pic.sized(w * dpr), -w / 2, -h, w, h);
            g.restore();
          } else {
            // the foot stays put while the top leans (a shear about the foot); mirrored if flipped
            g.setTransform(dpr * (d.flip ? -1 : 1), 0, d.lean * dpr, dpr, dpr * (p[0] - d.lean * p[1]), 0);
            g.drawImage(pic.sized(w * dpr), -w / 2, p[1] - h, w, h);
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
        } else if (d.kind === 'glow') {
          const r = d.radius * p[2] * (0.55 + 0.45 * Math.min(1, d.strength)), s = d.strength * a, [R, G, B] = rgb(d.colour);
          const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
          gr.addColorStop(0, `rgba(${R},${G},${B},${Math.min(1, 0.95 * s)})`);
          gr.addColorStop(0.18, `rgba(${R},${G},${B},${Math.min(1, 0.55 * s)})`);
          gr.addColorStop(0.5, `rgba(${R},${G},${B},${0.16 * s})`);
          gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
          g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
          g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill();
          g.globalCompositeOperation = 'source-over';
        } else {
          const pts = d.points, n = pts.length, [R, G, B] = rgb(d.colour), lift = d.width / 2;
          g.lineCap = 'round'; g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
          let prev = P(pts[0][0], pts[0][1], (pts[0][2] || 0) + lift);
          for (let i = 1; i < n; i++) {
            const q = P(pts[i][0], pts[i][1], (pts[i][2] || 0) + lift), f = i / (n - 1);
            if (prev && q) {
              g.strokeStyle = `rgba(${R},${G},${B},${Math.min(1, d.strength * f * a)})`;
              g.lineWidth = Math.max(0.5, d.width * q[2] * f);
              g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(q[0], q[1]); g.stroke();
            }
            prev = q;
          }
          g.globalCompositeOperation = 'source-over';
        }
      }
      g.globalAlpha = 1;
      drawWash(g, W, H, wash);
      drawBars(g, W, bars);
      drawWords(g, W, H, hud, note, scene.words);
    },
  };
}
