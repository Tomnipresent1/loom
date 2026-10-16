// LOOM's sound (WebAudio). The World says what should sound; this plays it, like a small mixing desk:
//   every sound → dry to the output, plus a "room" send (reverb) and an "echo" send (delay), each sound its own amounts
//   room return: a reverb made in code (size, brightness, level), tail darkening over time like a real room
//   echo return: a delay with feedback and a darkening filter in the loop (tape-echo-ish); a little of it feeds the room
// Tones are made live (borrowed from NAMI's audio.js); sound files are fetched once and reused.
//   unlock()           on the first touch or key (phones only allow sound after a touch)
//   configure(scene)   the scene's room + echo settings (scene.sound)
//   preload(files)     fetch sound files ahead of time
//   play(cmds)         one-shots: { kind: 'chime', tone, freq, ... } | { kind: 'file', file, rate, ... }, each with volume, space, echo
//                      | NAMI's garden one-shots: { kind: 'woodchimes', count } | { kind: 'bird', bird } | { kind: 'rustle', seconds }
//                      | Autumn's leaves: { kind: 'crunch', leaves, strength, thump, pan } | branches: { kind: 'creak', hard, pan }
//   hums(list)         every frame: held sounds with keys: tones { freq, tone } or loops { kind: 'file', file, rate }
//                      | NAMI's beds: { kind: 'wind', level } | { kind: 'air' }
//   sleep(bool), muted, missing (sound files that couldn't be found)
import { SOUND_DEFAULTS } from '../engine/sends.js';

export function createAudio({ soundUrl = (f) => f } = {}) {
  let ac = null, master = null, roomIn = null, echoIn = null, room = null, roomLevel = null, delay = null, feedback = null, echoTone = null, echoLevel = null;
  let muted = false, settings = structuredClone(SOUND_DEFAULTS), builtRoom = '';
  const voices = new Map(), buffers = new Map(), missing = new Set();

  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.7;
    const squash = ac.createDynamicsCompressor();             // many sounds at once never clip
    master.connect(squash); squash.connect(ac.destination);
    // room return
    roomIn = ac.createGain();
    room = ac.createConvolver();
    roomLevel = ac.createGain();
    roomIn.connect(room); room.connect(roomLevel); roomLevel.connect(master);
    // echo return: in → delay ⟲ (feedback through a darkening filter) → level → out, and a little into the room
    echoIn = ac.createGain();
    delay = ac.createDelay(4);
    feedback = ac.createGain();
    echoTone = ac.createBiquadFilter(); echoTone.type = 'lowpass';
    echoLevel = ac.createGain();
    echoIn.connect(delay); delay.connect(echoTone); echoTone.connect(feedback); feedback.connect(delay);
    echoTone.connect(echoLevel); echoLevel.connect(master);
    const bleed = ac.createGain(); bleed.gain.value = 0.3; echoLevel.connect(bleed); bleed.connect(roomIn);
    apply();
    for (const f of buffers.keys()) load(f);
  }

  // ---- the scene's room and echo ----
  function configure(sound = {}) {
    settings = { room: { ...SOUND_DEFAULTS.room, ...(sound.room || {}) }, echo: { ...SOUND_DEFAULTS.echo, ...(sound.echo || {}) } };
    apply();
  }
  function apply() {
    if (!ac) return;
    const r = settings.room, e = settings.echo, t = ac.currentTime;
    const key = `${r.size}|${r.tone}`;
    if (key !== builtRoom) { room.buffer = impulse(Math.max(0.2, Math.min(10, r.size)), r.tone); builtRoom = key; }
    roomLevel.gain.setTargetAtTime(Math.max(0, r.level), t, 0.05);
    delay.delayTime.setTargetAtTime(Math.max(0.02, Math.min(4, e.time)), t, 0.05);
    feedback.gain.setTargetAtTime(Math.max(0, Math.min(0.92, e.feedback)), t, 0.05);
    echoTone.frequency.setTargetAtTime(600 + 9000 * Math.max(0, Math.min(1, e.tone)), t, 0.05);
    echoLevel.gain.setTargetAtTime(Math.max(0, e.level), t, 0.05);
  }
  // a made-up room: decaying noise, each side different (stereo width), getting darker as it dies away
  function impulse(seconds, tone) {
    const rate = ac.sampleRate, len = Math.floor(rate * seconds), pre = Math.floor(rate * 0.012), ir = ac.createBuffer(2, len + pre, rate);
    const bright = 0.15 + 0.8 * Math.max(0, Math.min(1, tone));
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let low = 0;
      for (let i = 0; i < len; i++) {
        const f = i / len, k = bright * (1 - 0.85 * f);            // the filter closes as the tail fades
        low += (Math.random() * 2 - 1 - low) * k;
        d[pre + i] = low * (1 - f) ** 2.2;
      }
    }
    return ir;
  }

  // ---- routing one sound: dry + its two sends ----
  function route(node, space, echo) {
    const s = ac.createGain(), e = ac.createGain();
    s.gain.value = space; e.gain.value = echo;
    node.connect(master); node.connect(s); node.connect(e); s.connect(roomIn); e.connect(echoIn);
    return { s, e };
  }

  // ---- sound files ----
  function load(file) {
    if (!ac) { if (!buffers.has(file)) buffers.set(file, null); return null; }
    let p = buffers.get(file);
    if (!p) {
      p = fetch(soundUrl(file)).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((b) => ac.decodeAudioData(b))
        .catch(() => { missing.add(file); return null; });
      buffers.set(file, p);
    }
    return p;
  }
  function playFile(c) {
    load(c.file).then((buf) => {
      if (!buf) return;
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = buf; src.playbackRate.value = c.rate || 1;
      g.gain.value = 0.9 * c.volume;
      src.connect(g); route(g, c.space ?? 0.3, c.echo ?? 0);
      src.start();
    });
  }

  // ---- made tones (from NAMI: bell, pluck, wooden chime) ----
  function partials(c, list) {
    const t = ac.currentTime, out = ac.createGain();
    route(out, c.space ?? 0.3, c.echo ?? 0);
    for (const [ratio, v, len] of list) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = c.freq * ratio;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.32 * c.volume * v), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0002, t + len);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05);
    }
  }
  function pluck(c, len = 1.6) {
    const t = ac.currentTime, freq = c.freq, vol = 0.32 * c.volume;
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.012, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
    o2.frequency.value = freq * 2.003; g2.gain.value = 0.35;
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 7, t); f.frequency.exponentialRampToValueAtTime(freq * 1.6, t + len * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); route(g, c.space ?? 0.3, c.echo ?? 0);
    o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05);
  }
  // ---- NAMI's garden sounds (Plum Blossom), at NAMI's loudness when volume = 1 ----
  const NAMI = 0.6 / 0.7;                                     // (NAMI's master was 0.6, ours is 0.7)
  let noiseBuf = null;
  function softNoise() {                                     // NAMI's breathing noise: random, smoothed a little (2 s, looped)
    if (noiseBuf) return noiseBuf;
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { last = last * 0.96 + (Math.random() * 2 - 1) * 0.2; d[i] = last; }
    return noiseBuf;
  }
  function burst(out, dur, vol, f0, f1, delay = 0) {          // a short burst of filtered noise (a click, a rustle)
    const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + dur * 0.15); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t);
  }
  function woodChime(out, freq, vol, delay) {                 // a hollow wooden chime: a woody tone, a quick overtone, a soft click
    const t = ac.currentTime + delay;
    for (const [ratio, v, len] of [[1, 1, 0.9], [2.9, 0.3, 0.25]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * v), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0003, t + len);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05);
    }
    burst(out, 0.03, vol * 0.3, 2500, 1200, delay);
  }
  function whistle(out, f0, f1, start, len, vol) {            // a bird's whistle: a sine gliding, with a fast flutter
    const t = ac.currentTime + start, o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
    lfo.frequency.value = 22; lg.gain.value = f0 * 0.008; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.15, len * 0.3)); g.gain.setValueAtTime(Math.max(0.0002, vol), t + len * 0.8); g.gain.exponentialRampToValueAtTime(0.0003, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05); lfo.start(t); lfo.stop(t + len + 0.05);
  }
  const CHIMES = [392, 440, 523.25, 587.33, 659.25, 784];
  function garden(c) {
    const out = ac.createGain(), v = c.volume * NAMI;
    route(out, c.space ?? 0.3, c.echo ?? 0);
    if (c.kind === 'woodchimes') {
      let d = 0;
      const n = c.count > 0 ? c.count : 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) { woodChime(out, CHIMES[Math.floor(Math.random() * CHIMES.length)], 0.045 * v, d); d += 0.18 + Math.random() * 0.35; }
    } else if (c.kind === 'bird' && c.bird === 'small birds') {
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) whistle(out, 4200 + Math.random() * 600, 3600 + Math.random() * 400, 0.3 + i * 0.13, 0.07, 0.012 * v);
    } else if (c.kind === 'bird') {                            // the uguisu: a long rising "hoooo", then a quick "ho-ke-kyo"
      const far = (0.5 + Math.random() * 0.5) * v;
      whistle(out, 1150, 1300, 0, 0.9, 0.035 * far);
      whistle(out, 2350, 2050, 1.05, 0.12, 0.03 * far); whistle(out, 1850, 1800, 1.22, 0.1, 0.03 * far); whistle(out, 2750, 2550, 1.36, 0.22, 0.032 * far);
    } else if (c.kind === 'rustle') burst(out, c.seconds || 0.35, 0.05 * v, 2600, 900);
  }
  // ---- Autumn's leaves: the crunch of dry leaves ----
  // A shower of tiny crackles written straight into a buffer: each grain a few milliseconds of crisp noise dying away,
  // more of them near the start; more leaves = more grains and a longer shower; harder = crisper (the top opens up).
  // Under it, a soft rustle; for a landing, a low whump. Panned left / right by where it happened.
  function crunch(c) {
    const t = ac.currentTime, sr = ac.sampleRate, str = Math.min(1.5, c.strength), amount = Math.min(1, c.leaves / 20);
    const dur = 0.05 + 0.22 * amount + 0.12 * Math.min(1, str);
    const grains = Math.min(140, Math.round(3 + c.leaves * 3 * (0.6 + 0.4 * str)));
    const len = Math.ceil(sr * (dur + 0.02)), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < grains; i++) {
      const at = Math.floor(Math.random() ** 1.6 * dur * sr), glen = Math.floor(sr * (0.0015 + Math.random() * 0.007));
      const amp = (0.25 + 0.75 * Math.random() ** 2) * (Math.random() < 0.12 ? 1.8 : 1);      // (the odd louder snap)
      let prev = 0;
      for (let j = 0; j < glen && at + j < len; j++) {
        const w = Math.random() * 2 - 1;
        d[at + j] += (w - prev * 0.85) * amp * Math.exp(-j / (glen * 0.25));                    // (a touch of highpass: crisper)
        prev = w;
      }
    }
    const out = ac.createGain();
    let last = out;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = c.pan || 0; out.connect(p); last = p; }
    route(last, c.space ?? 0.3, c.echo ?? 0);
    const src = ac.createBufferSource(); src.buffer = buf;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700 + Math.random() * 900;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800 + 6000 * Math.min(1, str);
    const g = ac.createGain(); g.gain.value = 0.11 * c.volume * (0.4 + 0.6 * amount) * (0.5 + 0.5 * str);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); src.start(t);
    burst(out, dur * 1.3, 0.025 * c.volume * (0.3 + amount), 3800, 1600);                       // the rustle under it
    if (c.thump > 0) burst(out, 0.22, 0.12 * c.thump * c.volume, 520, 110);                      // the whump
  }
  // ---- Autumn's branches: a hollow woody knock, and for a harder landing a short creak ----
  // The knock: a low sine dropping in pitch, dying fast, with a click on top. The creak: a buzzy tone through a narrow
  // band, sagging in pitch, chopped by a fast flutter (wood fibres catching and slipping).
  function creak(c) {
    const t = ac.currentTime, k = Math.min(1.6, c.hard / 700), v = c.volume;
    const out = ac.createGain();
    let last = out;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = c.pan || 0; out.connect(p); last = p; }
    route(last, c.space ?? 0.3, c.echo ?? 0);
    const f = 140 + Math.random() * 70, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.09);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.2 * k * v), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0003, t + 0.2);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25);
    burst(out, 0.025, 0.05 * k * v, 2400, 900);
    if (k < 0.6) return;
    const len = 0.3 + 0.25 * Math.min(1, k), start = t + 0.03, base = 95 + Math.random() * 70;
    const saw = ac.createOscillator(), bp = ac.createBiquadFilter(), chop = ac.createGain(), env = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
    saw.type = 'sawtooth'; saw.frequency.setValueAtTime(base, start); saw.frequency.exponentialRampToValueAtTime(base * 0.82, start + len);
    bp.type = 'bandpass'; bp.frequency.value = 700 + Math.random() * 500; bp.Q.value = 5;
    lfo.type = 'square'; lfo.frequency.value = 28 + Math.random() * 18; depth.gain.value = 0.5; chop.gain.value = 0.5;
    lfo.connect(depth); depth.connect(chop.gain);
    env.gain.setValueAtTime(0.0001, start); env.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.06 * (k - 0.4) * v), start + 0.08); env.gain.exponentialRampToValueAtTime(0.0003, start + len);
    saw.connect(bp); bp.connect(chop); chop.connect(env); env.connect(out);
    saw.start(start); lfo.start(start); saw.stop(start + len + 0.05); lfo.stop(start + len + 0.05);
  }
  function play(cmds) {
    if (!ac || ac.state !== 'running') return;
    for (const c of cmds) {
      if (c.kind === 'woodchimes' || c.kind === 'bird' || c.kind === 'rustle') garden(c);
      else if (c.kind === 'crunch') crunch(c);
      else if (c.kind === 'creak') creak(c);
      else if (c.kind === 'file') playFile(c);
      else if (c.kind === 'chime') {
        if (c.tone === 'pluck') pluck(c);
        else if (c.tone === 'wood') partials(c, [[1, 1, 0.9], [2.9, 0.3, 0.25]]);
        else partials(c, [[1, 1, 2.6], [2.76, 0.35, 1.4], [5.4, 0.12, 0.7]]);   // bell: out-of-tune partials = metal
      }
    }
  }

  // ---- held sounds: hums (made tones) and loops (files) ----
  function makeTone(tone) {
    const g = ac.createGain(); g.gain.value = 0;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    const oscs = [];
    const osc = (type, ratio, level) => { const o = ac.createOscillator(), og = ac.createGain(); o.type = type; og.gain.value = level; o.connect(og); og.connect(f); o.start(); oscs.push([o, ratio]); };
    if (tone === 'warm') { osc('triangle', 1, 0.8); osc('sawtooth', 1.003, 0.12); f.frequency.value = 900; }
    else if (tone === 'airy') {                                 // breath: noise through a narrow band at the note, plus a faint sine
      const n = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(); s.buffer = n; s.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 18;
      const sg = ac.createGain(); sg.gain.value = 2.2;
      s.connect(bp); bp.connect(sg); sg.connect(f); s.start();
      oscs.push([s, 0, bp]);
      osc('sine', 1, 0.25);
    } else { osc('sine', 1, 0.8); osc('sine', 2.001, 0.12); }   // soft
    f.connect(g);
    return { g, oscs, level: 0.14, ...route(g, 0, 0) };
  }
  function makeLoop(file) {
    const g = ac.createGain(); g.gain.value = 0;
    const v = { g, oscs: [], level: 0.9, file, ...route(g, 0, 0) };
    load(file).then((buf) => {
      if (!buf || v.stopped) return;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      src.connect(g); src.start();
      v.oscs.push([src, 'rate']);
    });
    return v;
  }
  // NAMI's wind: soft, low, breathy noise through a band that opens as the breeze rises
  function makeWind() {
    const s = ac.createBufferSource(); s.buffer = softNoise(); s.loop = true; s.playbackRate.value = 0.7;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.6;
    const g = ac.createGain(); g.gain.value = 0;
    s.connect(bp); bp.connect(g); s.start();
    return { g, oscs: [[s, 'keep']], ...route(g, 0, 0),
      update(h, t) { g.gain.setTargetAtTime(h.level * 0.16 * h.volume * NAMI, t, 0.8); bp.frequency.setTargetAtTime(300 + h.level * 500, t, 0.8); } };
  }
  // NAMI's air (the garden's ambience): a low breathing bed, slowly in and out, and a very quiet drone under it
  function makeAir() {
    const g = ac.createGain(); g.gain.value = 0;
    const s = ac.createBufferSource(); s.buffer = softNoise(); s.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 416;
    const bed = ac.createGain(); bed.gain.value = 0.0225;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.11; lfoG.gain.value = 0.05; lfo.connect(lfoG); lfoG.connect(bed.gain);
    s.connect(lp); lp.connect(bed); bed.connect(g);
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), dg = ac.createGain();
    o1.frequency.value = 73.42; o2.frequency.value = 110; dg.gain.value = 0.0156;
    o1.connect(dg); o2.connect(dg); dg.connect(g);
    s.start(); lfo.start(); o1.start(); o2.start();
    return { g, oscs: [[s, 'keep'], [lfo, 'keep'], [o1, 'keep'], [o2, 'keep']], ...route(g, 0, 0),
      update(h, t) { g.gain.setTargetAtTime(h.volume * NAMI, t, 0.3); } };
  }
  function hums(list) {
    if (!ac) return;
    const t = ac.currentTime, seen = new Set();
    for (const h of list) {
      seen.add(h.key);
      const what = h.kind === 'file' ? 'file:' + h.file : h.kind === 'wind' || h.kind === 'air' ? h.kind : 'tone:' + h.tone;
      let v = voices.get(h.key);
      if (!v || v.what !== what) {
        if (v) stopVoice(v, t);
        v = { ...(h.kind === 'file' ? makeLoop(h.file) : h.kind === 'wind' ? makeWind() : h.kind === 'air' ? makeAir() : makeTone(h.tone)), what };
        voices.set(h.key, v);
      }
      if (v.update) { v.update(h, t); v.s.gain.setTargetAtTime(h.space ?? 0.3, t, 0.08); v.e.gain.setTargetAtTime(h.echo ?? 0, t, 0.08); continue; }
      for (const [o, ratio, bp] of v.oscs) {
        if (ratio === 'rate') o.playbackRate.setTargetAtTime(h.rate || 1, t, 0.05);
        else if (bp) bp.frequency.setTargetAtTime(h.freq, t, 0.05);
        else o.frequency.setTargetAtTime(h.freq * ratio, t, 0.05);
      }
      v.g.gain.setTargetAtTime(v.level * h.volume, t, 0.08);
      v.s.gain.setTargetAtTime(h.space ?? 0.3, t, 0.08);
      v.e.gain.setTargetAtTime(h.echo ?? 0, t, 0.08);
    }
    for (const [key, v] of voices) if (!seen.has(key)) { stopVoice(v, t); voices.delete(key); }
  }
  function stopVoice(v, t) {
    v.stopped = true;
    v.g.gain.setTargetAtTime(0, t, 0.15);
    for (const [o] of v.oscs) o.stop(t + 1);
  }

  return {
    unlock, configure, play, hums,
    preload(files) { for (const f of files) load(f); },
    sleep(asleep) { if (!ac) return; if (asleep) { if (ac.state === 'running') ac.suspend(); } else if (ac.state === 'suspended') ac.resume(); },
    get muted() { return muted; },
    set muted(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ac.currentTime, 0.05); },
    get started() { return !!ac && ac.state === 'running'; },
    get missing() { return [...missing]; },
  };
}
