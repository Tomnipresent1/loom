// LOOM's sound (WebAudio). The World says what should sound; this plays it, like a small mixing desk:
//   every sound → dry to the output, plus a "room" send (reverb) and an "echo" send (delay), each sound its own amounts
//   room return: a reverb made in code (size, brightness, level), tail darkening over time like a real room
//   echo return: a delay with feedback and a darkening filter in the loop (tape-echo-ish); a little of it feeds the room
// Tones are made live (borrowed from NAMI's audio.js); sound files are fetched once and reused.
//   unlock()           on the first touch or key (phones only allow sound after a touch)
//   configure(scene)   the scene's room + echo settings (scene.sound)
//   preload(files)     fetch sound files ahead of time
//   play(cmds)         one-shots: { kind: 'chime', tone, freq, ... } | { kind: 'file', file, rate, ... }, each with volume, space, echo
//   hums(list)         every frame: held sounds with keys: tones { freq, tone } or loops { kind: 'file', file, rate }
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
  function play(cmds) {
    if (!ac || ac.state !== 'running') return;
    for (const c of cmds) {
      if (c.kind === 'file') playFile(c);
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
  function hums(list) {
    if (!ac) return;
    const t = ac.currentTime, seen = new Set();
    for (const h of list) {
      seen.add(h.key);
      const what = h.kind === 'file' ? 'file:' + h.file : 'tone:' + h.tone;
      let v = voices.get(h.key);
      if (!v || v.what !== what) { if (v) stopVoice(v, t); v = { ...(h.kind === 'file' ? makeLoop(h.file) : makeTone(h.tone)), what }; voices.set(h.key, v); }
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
