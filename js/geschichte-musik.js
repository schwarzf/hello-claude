/**
 * GeschichteMusik – Musik zur Demo „Zwei Katzen“ (eigene Komposition).
 * Szene 1 leicht und alltäglich (mit Knurren), Szene 2 spannend und
 * aufregend, Szene 3 ruhig und hoffnungsvoll, Szene 4 erst zögerlich,
 * dann romantisch. Jede Szene hat ihr eigenes Tempo; jeder Schritt hat eine
 * feste Startzeit (stepTime), die Musik und Grafik gemeinsam nutzen.
 */
(function (global) {
  "use strict";

  var BAR = 16;
  var SECTIONS = [
    { name: "szene1", bars: 8, bpm: 96, chords: ["C", "Am", "F", "G"] },
    { name: "szene2", bars: 8, bpm: 120, chords: ["Am", "Am", "F", "E"] },
    { name: "szene3", bars: 6, bpm: 84, chords: ["Fmaj7", "Am7", "Dm7", "Bbmaj7", "Fmaj7", "C"] },
    { name: "zoegern", bars: 4, bpm: 84, chords: ["F", "G", "Em", "Am"] },
    { name: "romantik", bars: 10, bpm: 72, chords: ["C", "Am", "F", "G", "C", "Em", "F", "G", "C", "C"] },
    { name: "ende", bars: 2, bpm: 72, chords: ["C", "C"] }
  ];

  var CHORDS = {
    C: [60, 64, 67], Am: [57, 60, 64], F: [57, 60, 65], G: [55, 59, 62], E: [56, 59, 64], Em: [55, 59, 64],
    Fmaj7: [57, 60, 64, 65], Am7: [55, 57, 60, 64], Dm7: [57, 60, 62, 65], Bbmaj7: [57, 58, 62, 65]
  };
  var ROOTS = { C: 36, Am: 33, F: 29, G: 31, E: 28, Em: 28, Fmaj7: 29, Am7: 33, Dm7: 38, Bbmaj7: 34 };

  // Wer knurrt wann (Schritt im Abschnitt → Katze 0 = Glückskatze, 1 = Regenbogenkatze)
  var GROWLS = {
    szene1: { 72: 1, 80: 0, 92: 1, 100: 0 },
    szene2: { 40: 1, 56: 0, 66: 1, 72: 0, 80: 1, 88: 0, 96: 1 }
  };
  var DUEL = [64, 104]; // Szene 2: Großaufnahme im Splitscreen

  // Romantische Melodie (C-Dur)
  var LIEBE = [
    [0, 76, 4], [4, 79, 4], [8, 77, 2], [10, 76, 2], [12, 74, 4],
    [16, 72, 6], [22, 76, 2], [24, 74, 8],
    [32, 72, 4], [36, 69, 4], [40, 72, 4], [44, 77, 4],
    [48, 79, 8], [56, 77, 4], [60, 74, 4],
    [64, 76, 4], [68, 79, 4], [72, 84, 4], [76, 83, 2], [78, 81, 2],
    [80, 79, 8], [88, 76, 8],
    [96, 77, 4], [100, 81, 4], [104, 79, 4], [108, 77, 4],
    [112, 76, 6], [118, 74, 2], [120, 74, 8],
    [128, 72, 28]
  ];
  // Spieluhr in Szene 3 und Zögern-Motiv in Szene 4
  var SPIELUHR = [[0, 81, 4], [4, 77, 4], [8, 76, 4], [12, 72, 4], [16, 81, 4], [20, 79, 4], [24, 76, 8],
    [32, 74, 4], [36, 77, 4], [40, 81, 4], [44, 84, 4], [48, 82, 8], [56, 81, 8], [64, 77, 4], [68, 76, 4], [72, 72, 8], [80, 72, 16]];
  var ZOEGERN = [[0, 72, 1], [2, 74, 1], [4, 76, 1], [12, 76, 1], [14, 74, 1], [16, 74, 1], [18, 76, 1], [20, 79, 1], [28, 77, 1],
    [32, 76, 1], [34, 74, 1], [36, 72, 1], [44, 71, 1], [48, 69, 1], [50, 72, 1], [52, 76, 1], [56, 81, 2]];

  // ---------- Zeittabelle ----------

  var starts = [], sectionOf = [], t = 0;
  SECTIONS.forEach(function (sec, si) {
    var n = sec.bars * BAR;
    for (var k = 0; k < n; k++) {
      starts.push(t);
      sectionOf.push([si, k]);
      t += 60 / sec.bpm / 4;
    }
  });
  var STEPS = starts.length, DURATION = t;

  function stepTime(step) {
    var loops = Math.floor(step / STEPS);
    return loops * DURATION + starts[step - loops * STEPS];
  }
  function stepLength(step) { return stepTime(step + 1) - stepTime(step); }
  function stepAt(time) {
    var loops = Math.floor(time / DURATION), tt = time - loops * DURATION, lo = 0, hi = STEPS - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= tt) lo = mid; else hi = mid - 1; }
    var len = (lo + 1 < STEPS ? starts[lo + 1] : DURATION) - starts[lo];
    return { step: loops * STEPS + lo, frac: Math.min(1, (tt - starts[lo]) / len) };
  }
  function sectionStart(name) {
    for (var s = 0; s < STEPS; s++) if (SECTIONS[sectionOf[s][0]].name === name) return starts[s];
    return 0;
  }

  /** Was in Schritt `step` passiert. */
  function at(step) {
    var s = ((step % STEPS) + STEPS) % STEPS, si = sectionOf[s][0], k = sectionOf[s][1];
    var sec = SECTIONS[si], bar = Math.floor(k / BAR), inBar = k % BAR, chord = sec.chords[bar % sec.chords.length];
    var e = {}, n = sec.name;
    if (GROWLS[n] && GROWLS[n][k] !== undefined) e.growl = GROWLS[n][k];
    if (n === "szene1") {
      if (inBar % 4 === 0) e.pizz = ROOTS[chord] + 12 + (inBar === 8 ? 7 : 0);
      if (inBar % 2 === 0) e.pluck = CHORDS[chord][(inBar / 2) % 3] + 12;
      if (inBar % 4 === 2) e.hat = 1;
      if (bar >= 4 && bar < 7 && inBar === 0) e.tremolo = ROOTS[chord] + 24;
    } else if (n === "szene2") {
      if (inBar % 2 === 0) e.bass = ROOTS[chord] + 12 + (inBar % 8 === 6 ? 12 : 0);
      if (inBar === 0 || inBar === 10) e.tom = 1;
      if (inBar === 4 || inBar === 12) e.snare = true;
      if (inBar % 2 === 1) e.hat = 1;
      if (inBar === 0 || inBar === 3 || inBar === 6) e.stab = CHORDS[chord];
      if (bar >= 4 && bar < 7) e.riser = (k - 64) / 48;
      if (k >= DUEL[0] && k < DUEL[1] && inBar % 4 === 0) e.hit = true;
      if (k === 0) e.crash = true;
    } else if (n === "szene3") {
      if (inBar === 0) { e.pad = CHORDS[chord]; e.purr = ROOTS[chord] + 24; }
      SPIELUHR.forEach(function (m) { if (m[0] === k) e.bell = { midi: m[1], len: m[2] }; });
    } else if (n === "zoegern") {
      if (k === 0) e.creak = true;
      if (inBar === 0) e.pad = CHORDS[chord];
      if (inBar % 8 === 0) e.pizz = ROOTS[chord] + 12;
      ZOEGERN.forEach(function (m) { if (m[0] === k) e.tiptoe = m[1]; });
    } else if (n === "romantik") {
      if (inBar === 0) { e.pad = CHORDS[chord]; e.bass = ROOTS[chord] + 12; e.kick = true; }
      if (inBar === 8) e.bass = ROOTS[chord] + 19;
      if (inBar % 2 === 0) e.harp = CHORDS[chord][(inBar / 2) % 3] + (inBar >= 8 ? 24 : 12);
      if (inBar === 8) e.snare = 0.4;
      LIEBE.forEach(function (m) { if (m[0] === k) e.lead = { midi: m[1], len: m[2] }; });
    } else {
      if (k === 0) { e.pad = [48, 55, 60, 64, 67]; e.bass = 36; e.gliss = true; }
    }
    return { section: n, bar: bar, inBar: inBar, step: k, chord: chord, events: e, progress: k / (sec.bars * BAR) };
  }

  // ---------- Klangerzeugung ----------

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function makeNoise(ctx) {
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 13;
    for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    return b;
  }

  function createEngine(ctx, destination, startTime, noLoop) {
    var master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(destination);
    function bus(v) { var g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; }
    var bassBus = bus(0.2), drumBus = bus(0.38), padBus = bus(0.012), pluckBus = bus(0.12), leadBus = bus(0.1), fxBus = bus(0.35), stabBus = bus(0.05);
    var delay = ctx.createDelay(1), feedback = ctx.createGain();
    delay.delayTime.value = 0.32;
    feedback.gain.value = 0.38;
    delay.connect(feedback).connect(delay);
    delay.connect(master);
    function send(v) { var g = ctx.createGain(); g.gain.value = v; g.connect(delay); return g; }
    var padSend = send(0.012), leadSend = send(0.07), pluckSend = send(0.06);
    var noise = makeNoise(ctx);

    function env(g, t, peak, attack, hold, release) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.setTargetAtTime(0.0001, t + attack + hold, release);
    }
    function osc(type, freq, t, len, dest) {
      var o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.connect(dest);
      o.start(t);
      o.stop(t + len);
      return o;
    }
    function noiseHit(t, vol, type, freq, len, dest, q) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise;
      f.type = type;
      f.frequency.value = freq;
      if (q) f.Q.value = q;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f).connect(g).connect(dest || drumBus);
      src.start(t, (t * 2.3) % 0.8);
      src.stop(t + len + 0.02);
      return f;
    }
    function kick(t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      env(g, t, 0.8, 0.003, 0.05, 0.1);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.5);
    }
    function tom(t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
      env(g, t, 0.9, 0.003, 0.08, 0.1);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.5);
    }
    function snare(t, vol) { noiseHit(t, 0.45 * (vol || 1), "bandpass", 1800, 0.15); }
    /** Knurren: tiefes Brummen mit schnellem Flattern, darüber ein leises Zischen. */
    function growl(t) {
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(75, t);
      o.frequency.linearRampToValueAtTime(95, t + 0.5);
      o.frequency.linearRampToValueAtTime(70, t + 1.1);
      f.type = "lowpass"; f.frequency.value = 700;
      lfo.frequency.value = 28; lg.gain.value = 0.45;
      lfo.connect(lg).connect(g.gain);
      env(g, t, 0.55, 0.12, 0.8, 0.15);
      o.connect(f).connect(g).connect(fxBus);
      [o, lfo].forEach(function (x) { x.start(t); x.stop(t + 1.6); });
      noiseHit(t + 0.4, 0.15, "bandpass", 3000, 0.6, fxBus, 1);
    }
    function bass(t, midi, len) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.Q.value = 5;
      f.frequency.setValueAtTime(1800, t);
      f.frequency.exponentialRampToValueAtTime(220, t + len);
      env(g, t, 0.9, 0.005, len * 0.6, 0.04);
      ["sawtooth", "square"].forEach(function (type, i) { osc(type, midiToFreq(midi), t, len + 0.3, f).detune.value = i * 7; });
      f.connect(g).connect(bassBus);
    }
    function sub(t, midi, len) {
      var g = ctx.createGain();
      env(g, t, 0.7, 0.03, len * 0.8, 0.2);
      osc("sine", midiToFreq(midi - 12), t, len + 1, g);
      g.connect(bassBus);
    }
    function pizz(t, midi) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 1200;
      env(g, t, 1, 0.003, 0.02, 0.09);
      osc("triangle", midiToFreq(midi), t, 0.4, f);
      osc("sawtooth", midiToFreq(midi), t, 0.4, f);
      f.connect(g).connect(bassBus);
    }
    function pluck(t, midi, vol, dest, sendTo) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.setValueAtTime(4500, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.3);
      env(g, t, vol || 0.8, 0.003, 0.03, 0.18);
      osc("triangle", midiToFreq(midi), t, 0.9, f);
      osc("square", midiToFreq(midi), t, 0.9, f).detune.value = 5;
      f.connect(g);
      g.connect(dest || pluckBus);
      g.connect(sendTo || pluckSend);
    }
    function bell(t, midi, len) {
      [1, 2.76, 5.4].forEach(function (ratio, i) {
        var g = ctx.createGain();
        env(g, t, [1.6, 0.5, 0.2][i], 0.002, 0.05, Math.min(1.2, len * 0.4));
        osc("sine", midiToFreq(midi) * ratio, t, len + 1.5, g);
        g.connect(pluckBus);
        g.connect(pluckSend);
      });
    }
    function stab(t, notes) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.frequency.value = 2400;
      env(g, t, 1, 0.004, 0.06, 0.05);
      notes.forEach(function (m) { osc("sawtooth", midiToFreq(m), t, 0.5, f); });
      f.connect(g).connect(stabBus);
    }
    function tremolo(t, midi, len) {
      var g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 900;
      lfo.frequency.value = 12; lg.gain.value = 0.4;
      lfo.connect(lg).connect(g.gain);
      env(g, t, 0.5, 0.3, len * 0.7, 0.3);
      [0, 7].forEach(function (d) { osc("sawtooth", midiToFreq(midi) * (1 + d / 1000), t, len + 1, f); });
      f.connect(g).connect(stabBus);
      lfo.start(t); lfo.stop(t + len + 1);
    }
    function pad(t, notes, len) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + Math.min(1.2, len * 0.3));
      g.gain.setTargetAtTime(0.0001, t + len * 0.92, 0.25);
      notes.forEach(function (m) { [-7, 7].forEach(function (c) { osc("sawtooth", midiToFreq(m), t, len + 1.5, f).detune.value = c; }); });
      f.connect(g);
      g.connect(padBus);
      g.connect(padSend);
    }
    /** Streicherartige Melodie: langsamer Einsatz, Vibrato. */
    function strings(t, midi, len) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(), vib = ctx.createOscillator(), vg = ctx.createGain();
      f.type = "lowpass"; f.frequency.value = 2600;
      vib.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(7, t + 0.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.12);
      g.gain.setTargetAtTime(0.0001, t + len * 0.9, 0.18);
      [-6, 6].forEach(function (c) {
        var o = osc("sawtooth", midiToFreq(midi), t, len + 1, f);
        o.detune.value = c;
        vib.connect(vg).connect(o.frequency);
      });
      f.connect(g);
      g.connect(leadBus);
      g.connect(leadSend);
      vib.start(t); vib.stop(t + len + 1);
    }
    function riser(t, len, amount) {
      var f = noiseHit(t, 0.08 + amount * 0.2, "bandpass", 500, len + 0.05, fxBus, 3);
      f.frequency.setValueAtTime(400 + amount * 3500, t);
      f.frequency.linearRampToValueAtTime(400 + (amount + 0.03) * 3500, t + len);
    }
    function creak(t) {
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(180, t);
      o.frequency.linearRampToValueAtTime(320, t + 0.6);
      o.frequency.linearRampToValueAtTime(240, t + 1.2);
      f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 6;
      env(g, t, 0.35, 0.05, 1, 0.1);
      o.connect(f).connect(g).connect(fxBus);
      o.start(t); o.stop(t + 1.5);
    }

    var step = 0;
    return {
      master: master,
      scheduleUntil: function (until) {
        while (true) {
          var tt = startTime + stepTime(step);
          if (tt >= until || (noLoop && step >= STEPS)) break;
          var a = at(step), e = a.events, sl = stepLength(step);
          if (e.growl !== undefined) growl(tt);
          if (e.kick) kick(tt);
          if (e.tom) tom(tt);
          if (e.snare) snare(tt, e.snare === true ? 1 : e.snare);
          if (e.hat) noiseHit(tt, 0.12, "highpass", 8000, 0.035);
          if (e.crash) noiseHit(tt, 0.3, "highpass", 5000, 1.3);
          if (e.hit) { noiseHit(tt, 0.35, "lowpass", 400, 0.3); stab(tt, [45, 52, 57]); }
          if (e.pizz !== undefined) pizz(tt, e.pizz);
          if (e.pluck !== undefined) pluck(tt, e.pluck, 0.5);
          if (e.tiptoe !== undefined) pluck(tt, e.tiptoe, 0.7);
          if (e.harp !== undefined) pluck(tt, e.harp, 0.45);
          if (e.bell) bell(tt, e.bell.midi, e.bell.len * sl);
          if (e.bass !== undefined) {
            if (a.section === "szene2") bass(tt, e.bass, sl * 1.6);
            else sub(tt, e.bass, sl * (a.section === "ende" ? 24 : 8));
          }
          if (e.purr !== undefined) sub(tt, e.purr, sl * 15);
          if (e.stab) stab(tt, e.stab);
          if (e.tremolo !== undefined) tremolo(tt, e.tremolo, sl * 16);
          if (e.pad) pad(tt, e.pad, sl * (a.section === "ende" ? 30 : 16));
          if (e.riser !== undefined) riser(tt, sl, e.riser);
          if (e.creak) creak(tt);
          if (e.lead) strings(tt, e.lead.midi, e.lead.len * sl);
          if (e.gliss) [60, 64, 67, 72, 76, 79, 84].forEach(function (m, i) { pluck(tt + i * 0.07, m, 0.5); });
          step++;
        }
      }
    };
  }

  // ---------- Wiedergabe ----------

  var ctx = null, engine = null, timer = null, playing = false, startTime = 0;
  function start() {
    ctx = global.Musik ? global.Musik.getContext() : new (global.AudioContext || global.webkitAudioContext)();
    if (!ctx || playing) return;
    if (ctx.state !== "running") ctx.resume();
    startTime = ctx.currentTime + 0.1;
    engine = createEngine(ctx, ctx.destination, startTime);
    timer = setInterval(function () { if (ctx.state === "running") engine.scheduleUntil(ctx.currentTime + 0.2); }, 40);
    engine.scheduleUntil(ctx.currentTime + 0.2);
    playing = true;
  }
  function stop() {
    if (!playing) return;
    clearInterval(timer);
    var g = engine.master.gain, now = ctx.currentTime, old = engine;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 0.3);
    setTimeout(function () { old.master.disconnect(); }, 500);
    engine = null;
    playing = false;
  }
  function time() { return playing ? Math.max(0, ctx.currentTime - startTime) : null; }
  function render(seconds, sampleRate, noLoop) {
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100);
    createEngine(off, off.destination, 0, noLoop).scheduleUntil(seconds);
    return off.startRendering();
  }

  global.GeschichteMusik = {
    SECTIONS: SECTIONS, LIEBE: LIEBE, GROWLS: GROWLS, DUEL: DUEL, DURATION: DURATION, STEPS: STEPS,
    at: at, stepTime: stepTime, stepAt: stepAt, stepLength: stepLength, sectionStart: sectionStart,
    start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
