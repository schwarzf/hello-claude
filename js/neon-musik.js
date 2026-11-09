/**
 * NeonMusik – Soundtrack der Demo „HYPERFLUX“ (eigene Komposition, e-Moll,
 * 145 BPM), live per Web Audio erzeugt: harter Kick, rollender Bass,
 * verzerrte Acid-Linie, Supersaw-Lead und -Stabs, Riser und Einschläge.
 * Am Ausgang sitzt ein weicher Begrenzer (tanh), damit es laut, aber nie
 * hart übersteuert klingt.
 *
 * Der Song ist als Daten beschrieben (at(schritt)); Musik und Grafik lesen
 * beide daraus.
 */
(function (global) {
  "use strict";

  var BPM = 145, STEP = 60 / BPM / 4, BAR = 16;
  var SECTIONS = [
    { name: "boot", bars: 8 }, { name: "terrain", bars: 8 }, { name: "ocean", bars: 8 },
    { name: "acid", bars: 8 }, { name: "morph", bars: 8 }, { name: "final", bars: 8 }
  ];
  var LOOP_FROM = 1;
  var SONG_STEPS = SECTIONS.reduce(function (n, s) { return n + s.bars * BAR; }, 0);

  // Akkordfolge über 8 Takte: Em Em Em Em G G Am Am
  var ROOTS = [28, 28, 28, 28, 31, 31, 33, 33];
  var CHORDS = [[64, 67, 71], [64, 67, 71], [64, 67, 71], [64, 67, 71], [62, 67, 71], [62, 67, 71], [64, 69, 72], [64, 69, 72]];
  var ACID = [0, 0, 12, 0, 3, 0, 10, 12, 0, 7, 0, 12, 15, 12, 10, 7];
  var ACID_ACCENT = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0];
  var LEAD = [
    [0, 76, 3], [3, 79, 3], [6, 83, 2], [8, 81, 4], [12, 79, 4],
    [16, 78, 3], [19, 79, 3], [22, 76, 2], [24, 71, 8],
    [32, 76, 3], [35, 79, 3], [38, 83, 2], [40, 86, 4], [44, 83, 4],
    [48, 81, 6], [54, 79, 2], [56, 78, 8],
    [64, 79, 3], [67, 83, 3], [70, 86, 2], [72, 88, 4], [76, 86, 4],
    [80, 83, 6], [86, 81, 2], [88, 79, 8],
    [96, 81, 3], [99, 84, 3], [102, 88, 2], [104, 91, 4], [108, 88, 4],
    [112, 86, 4], [116, 83, 4], [120, 88, 8]
  ];

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function hashStep(n) { var h = Math.sin(n * 91.7 + 13.1) * 43758.5453; return h - Math.floor(h); }

  /** Was in Schritt `step` passiert. Live wiederholt sich der Song ab LOOP_FROM. */
  function at(step, noLoop) {
    var loopStart = 0;
    for (var i = 0; i < LOOP_FROM; i++) loopStart += SECTIONS[i].bars * BAR;
    if (step >= SONG_STEPS) {
      if (noLoop) {
        var rest = step - SONG_STEPS;
        return { section: "ende", index: 5, step: rest, bar: Math.floor(rest / BAR), inBar: rest % BAR, events: rest === 0 ? { impact: true, pad: CHORDS[0], sub: ROOTS[0] } : {}, acidCut: 0, progress: Math.min(1, rest / 32) };
      }
      step = loopStart + (step - SONG_STEPS) % (SONG_STEPS - loopStart);
    }
    var s = step, idx = 0;
    while (s >= SECTIONS[idx].bars * BAR) { s -= SECTIONS[idx].bars * BAR; idx++; }
    var sec = SECTIONS[idx], n = sec.name, bar = Math.floor(s / BAR), inBar = s % BAR, four = inBar % 4 === 0;
    var e = {}, acidCut = 0;
    function drums() {
      if (four) e.kick = true;
      if (inBar === 4 || inBar === 12) e.clap = true;
      e.hat = inBar % 4 === 2 ? 2 : 1;
    }
    function rolling() { if (!four) e.bass = ROOTS[bar]; }
    function lead() { LEAD.forEach(function (m) { if (m[0] === s) e.lead = { midi: m[1], len: m[2] }; }); }
    function acid() {
      acidCut = 0.5 - 0.5 * Math.cos(s / 128 * Math.PI * 3);
      e.acid = { midi: 40 + ACID[inBar] + (ROOTS[bar] - 28), accent: ACID_ACCENT[inBar] };
    }

    if (n === "boot") {
      e.arp = { midi: CHORDS[bar][inBar % 3] + (inBar % 4 === 3 ? 12 : 0), cut: s / 128 };
      if (bar < 6 && hashStep(s) > 0.8) e.beep = 84 + Math.floor(hashStep(s + 9) * 12);
      if (bar >= 4 && four) e.kick = true;
      if (bar >= 4 && inBar % 4 === 2) e.hat = 2;
      if (bar >= 6) e.riser = (s - 96) / 32;
      if (bar === 7 && inBar >= 8) e.roll = (inBar - 8) / 8;
      if (s === 0) e.impact = true;
    } else if (n === "terrain") {
      drums(); rolling(); lead();
      if (s === 0) e.crash = true;
    } else if (n === "ocean") {
      if (inBar === 0) { e.pad = CHORDS[bar]; e.sub = ROOTS[bar]; }
      if (inBar % 2 === 0) e.pluck = CHORDS[bar][(inBar / 2) % 3] + 12 + (inBar % 8 === 6 ? 12 : 0);
      if (inBar === 0 && bar % 2 === 0) e.wash = true;
      if (s === 0) e.impact = true;
      if (bar >= 6) {
        if (four) e.kick = true;
        e.riser = (s - 96) / 32;
        if (bar === 6 ? inBar % 2 === 0 : true) e.roll = (s - 96) / 32;
      }
    } else if (n === "acid") {
      drums(); rolling(); acid();
      if (s === 0) e.crash = true;
    } else if (n === "morph") {
      drums(); rolling(); lead();
      if ([0, 3, 6, 10, 12].indexOf(inBar) !== -1) e.stab = CHORDS[bar];
      if (s === 0) e.crash = true;
    } else {
      drums(); rolling(); acid(); lead();
      if (inBar === 0 || inBar === 6 || inBar === 12) e.stab = CHORDS[bar];
      if (inBar === 0 && bar % 4 === 0) e.crash = true;
      if (bar === 7 && inBar >= 8) e.roll = (inBar - 8) / 8;
    }
    return { section: n, index: idx, step: s, bar: bar, inBar: inBar, events: e, acidCut: acidCut, progress: s / (sec.bars * BAR) };
  }

  function makeNoise(ctx) {
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 17;
    for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    return b;
  }
  function tanhCurve(drive, ceiling) {
    var n = 2048, c = new Float32Array(n), norm = Math.tanh(drive);
    for (var i = 0; i < n; i++) c[i] = Math.tanh((i / (n - 1) * 2 - 1) * drive) / norm * ceiling;
    return c;
  }

  function createEngine(ctx, destination, startTime, noLoop) {
    var master = ctx.createGain(), limiter = ctx.createWaveShaper();
    master.gain.value = 0.7;
    limiter.curve = tanhCurve(1.6, 0.9);
    master.connect(limiter).connect(destination);
    function bus(v, dest) { var g = ctx.createGain(); g.gain.value = v; g.connect(dest || master); return g; }
    var drumBus = bus(0.7), bassBus = bus(0.2), leadBus = bus(0.13), stabBus = bus(0.08), arpBus = bus(0.14), padBus = bus(0.04), pluckBus = bus(0.2), fxBus = bus(0.3);
    var acidDrive = ctx.createWaveShaper();
    acidDrive.curve = tanhCurve(5, 1);
    acidDrive.connect(bus(0.22));
    var duck = ctx.createGain();
    duck.connect(bassBus);
    var delay = ctx.createDelay(1), feedback = ctx.createGain();
    delay.delayTime.value = STEP * 3;
    feedback.gain.value = 0.4;
    delay.connect(feedback).connect(delay);
    delay.connect(master);
    function send(v) { var g = ctx.createGain(); g.gain.value = v; g.connect(delay); return g; }
    var leadSend = send(0.05), arpSend = send(0.06), pluckSend = send(0.12);
    var noise = makeNoise(ctx);

    function env(g, t, peak, attack, hold, release) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.setTargetAtTime(0.0001, t + attack + hold, release);
    }
    function osc(type, freq, t, len, dest, detune) {
      var o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      if (detune) o.detune.value = detune;
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
      src.start(t, (t * 1.7) % 0.7);
      src.stop(t + len + 0.02);
      return f;
    }
    function kick(t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
      g.gain.setValueAtTime(1, t);
      g.gain.setValueAtTime(1, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.32);
      noiseHit(t, 0.25, "highpass", 3000, 0.012);
      duck.gain.cancelScheduledValues(t);
      duck.gain.setValueAtTime(0.15, t);
      duck.gain.linearRampToValueAtTime(1, t + STEP * 1.2);
    }
    function clap(t) {
      [0, 0.011, 0.022].forEach(function (d) { noiseHit(t + d, 0.3, "bandpass", 1500, 0.07, null, 1.2); });
      noiseHit(t + 0.03, 0.22, "bandpass", 1800, 0.18, null, 0.8);
    }
    function bass(t, midi) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain(), len = STEP * 0.85;
      f.type = "lowpass"; f.Q.value = 4;
      f.frequency.setValueAtTime(1100, t);
      f.frequency.exponentialRampToValueAtTime(180, t + len);
      env(g, t, 1, 0.004, len * 0.6, 0.015);
      osc("sawtooth", midiToFreq(midi), t, len + 0.1, f);
      osc("sine", midiToFreq(midi), t, len + 0.1, g);
      f.connect(g).connect(duck);
    }
    function sub(t, midi, len) {
      var g = ctx.createGain();
      env(g, t, 0.45, 0.05, len * 0.8, 0.3);
      osc("sine", midiToFreq(midi), t, len + 1.5, g);
      osc("sine", midiToFreq(midi + 12), t, len + 1.5, g).detune.value = 4;
      g.connect(bassBus);
    }
    function acid(t, a, cut) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain(), len = STEP * (a.accent ? 1.1 : 0.8);
      var base = 250 + cut * cut * 2600;
      f.type = "lowpass"; f.Q.value = 15;
      f.frequency.setValueAtTime(base * (a.accent ? 4 : 2), t);
      f.frequency.exponentialRampToValueAtTime(base, t + len * 0.8);
      env(g, t, a.accent ? 1 : 0.6, 0.003, len * 0.6, 0.02);
      osc("sawtooth", midiToFreq(a.midi), t, len + 0.1, f);
      f.connect(g).connect(acidDrive);
    }
    function supersaw(t, midi, len, dest, sendTo, cutoff, voices) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass";
      f.frequency.setValueAtTime(cutoff, t);
      f.frequency.exponentialRampToValueAtTime(cutoff * 0.4, t + len);
      env(g, t, 1, 0.006, len * 0.75, 0.04);
      (voices || [-14, 0, 14]).forEach(function (c) { osc("sawtooth", midiToFreq(midi), t, len + 0.3, f, c); });
      f.connect(g);
      g.connect(dest);
      if (sendTo) g.connect(sendTo);
    }
    function arp(t, a) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.Q.value = 6;
      f.frequency.value = 350 + a.cut * a.cut * 6000;
      env(g, t, 1, 0.003, 0.03, 0.04);
      osc("square", midiToFreq(a.midi), t, 0.3, f);
      f.connect(g);
      g.connect(arpBus);
      g.connect(arpSend);
    }
    function beep(t, midi) {
      var g = ctx.createGain();
      env(g, t, 0.5, 0.002, 0.03, 0.01);
      osc("sine", midiToFreq(midi), t, 0.1, g);
      g.connect(arpBus);
      g.connect(arpSend);
    }
    function pad(t, notes, len) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.frequency.value = 1100;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + len * 0.35);
      g.gain.setTargetAtTime(0.0001, t + len * 0.95, 0.2);
      notes.forEach(function (m) { [-9, 9].forEach(function (c) { osc("sawtooth", midiToFreq(m), t, len + 1.2, f, c); }); });
      f.connect(g).connect(padBus);
    }
    function pluck(t, midi) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass";
      f.frequency.setValueAtTime(5000, t);
      f.frequency.exponentialRampToValueAtTime(700, t + 0.25);
      env(g, t, 0.8, 0.003, 0.03, 0.12);
      osc("triangle", midiToFreq(midi), t, 0.8, f);
      osc("square", midiToFreq(midi), t, 0.8, f, 7);
      f.connect(g);
      g.connect(pluckBus);
      g.connect(pluckSend);
    }
    /** Wasserrauschen: gefiltertes Rauschen, das an- und abschwillt. */
    function wash(t) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), len = STEP * 30;
      src.buffer = noise; src.loop = true;
      f.type = "bandpass"; f.Q.value = 0.7;
      f.frequency.setValueAtTime(350, t);
      f.frequency.linearRampToValueAtTime(1800, t + len * 0.45);
      f.frequency.linearRampToValueAtTime(400, t + len);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + len * 0.45);
      g.gain.linearRampToValueAtTime(0.0001, t + len);
      src.connect(f).connect(g).connect(fxBus);
      src.start(t); src.stop(t + len + 0.1);
    }
    function riser(t, amount) {
      var f = noiseHit(t, 0.06 + amount * 0.22, "bandpass", 500, STEP + 0.03, fxBus, 3);
      f.frequency.setValueAtTime(400 + amount * 5000, t);
      f.frequency.linearRampToValueAtTime(400 + (amount + 0.03) * 5000, t + STEP);
    }
    function impact(t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 1.7);
      noiseHit(t, 0.5, "lowpass", 900, 0.8, fxBus);
      noiseHit(t, 0.3, "highpass", 5000, 1.5, fxBus);
    }

    var step = 0, nextTime = startTime;
    return {
      master: master,
      scheduleUntil: function (until) {
        while (nextTime < until) {
          var a = at(step, noLoop), e = a.events, t = nextTime;
          if (e.kick) kick(t);
          if (e.clap) clap(t);
          if (e.hat) noiseHit(t, e.hat === 2 ? 0.2 : 0.07, "highpass", 9000, e.hat === 2 ? 0.09 : 0.025);
          if (e.crash) noiseHit(t, 0.28, "highpass", 5000, 1.4, fxBus);
          if (e.roll !== undefined) noiseHit(t, 0.12 + e.roll * 0.3, "bandpass", 1900, 0.09);
          if (e.riser !== undefined) riser(t, e.riser);
          if (e.impact) impact(t);
          if (e.bass !== undefined) bass(t, e.bass);
          if (e.sub !== undefined) sub(t, e.sub, STEP * 14);
          if (e.acid) acid(t, e.acid, a.acidCut);
          if (e.lead) supersaw(t, e.lead.midi, e.lead.len * STEP, leadBus, leadSend, 5200);
          if (e.stab) e.stab.forEach(function (m) { supersaw(t, m, STEP * 1.6, stabBus, null, 4200, [-10, 10]); });
          if (e.arp) arp(t, e.arp);
          if (e.beep) beep(t, e.beep);
          if (e.pad) pad(t, e.pad, STEP * 16);
          if (e.pluck !== undefined) pluck(t, e.pluck);
          if (e.wash) wash(t);
          nextTime += STEP;
          step++;
        }
      }
    };
  }

  var ctx = null, engine = null, timer = null, playing = false, startTime = 0;
  function start() {
    // gemeinsamer, in Safari freigeschalteter Audio-Kontext aus musik.js
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

  global.NeonMusik = {
    BPM: BPM, STEP: STEP, BAR: BAR, SECTIONS: SECTIONS, LEAD: LEAD, ACID: ACID, SONG_STEPS: SONG_STEPS,
    at: at, start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
