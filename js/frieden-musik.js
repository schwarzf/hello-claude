/**
 * FriedenMusik – Song der Demo „Katzenfrieden“ (eigene Komposition).
 * Streit (d-Moll, angespannt, mit Fauchen) → Katzenminze (magischer Übergang)
 * → Wälzen (träumerisch) → Frieden → griechischer Tanz in d-Hidschas, der von
 * 100 auf 180 BPM immer schneller wird – mit Bouzouki-Tremolo, Oom-pah-Bass,
 * Klatschen und viel Bass wie in den anderen Demos.
 *
 * Wegen des Tempowechsels hat jeder Schritt eine feste Startzeit (stepTime);
 * Musik und Grafik rechnen beide damit.
 */
(function (global) {
  "use strict";

  var BAR = 16;
  var SECTIONS = [
    { name: "streit", bars: 8, bpm: [100, 100], chords: ["Dm", "Dm", "Eb", "Dm", "Gm", "Eb", "A", "A"] },
    { name: "minze", bars: 4, bpm: [100, 100], chords: ["D", "G", "A", "D"] },
    { name: "waelzen", bars: 8, bpm: [100, 100], chords: ["Dmaj7", "Gmaj7", "Dmaj7", "Gmaj7", "Em7", "A7", "Dmaj7", "A7"] },
    { name: "frieden", bars: 4, bpm: [100, 100], chords: ["G", "A", "D", "D"] },
    { name: "tanz", bars: 16, bpm: [100, 180], chords: ["D", "D", "Cm", "D", "D", "Gm", "Cm", "D"] },
    { name: "ende", bars: 2, bpm: [180, 180], chords: ["D", "D"] }
  ];

  var CHORDS = {
    Dm: [62, 65, 69], Eb: [63, 67, 70], Gm: [62, 67, 70], A: [61, 64, 69], D: [62, 66, 69], G: [62, 67, 71],
    Dmaj7: [62, 66, 69, 73], Gmaj7: [62, 66, 67, 71], Em7: [62, 64, 67, 71], A7: [61, 64, 67, 69], Cm: [63, 67, 72]
  };
  var ROOTS = { Dm: 38, Eb: 39, Gm: 43, A: 45, D: 38, G: 43, Dmaj7: 38, Gmaj7: 43, Em7: 40, A7: 45, Cm: 36 };

  // Wer im Streit faucht (Schritt im Abschnitt → Katze) und wann gerauft wird
  var HISSES = { 8: 0, 24: 1, 40: 2, 56: 3, 104: 1, 112: 0, 120: 3 };
  var FIGHT = [64, 96]; // Takt 4–5

  // Tanzmelodie (8 Takte, d-Hidschas: D Es Fis G A B C), Achtel = 2 Schritte
  var TANZ = (function () {
    var bars = [
      [69, 70, 69, 66, 67, 69, 67, 66],
      [63, 66, 67, 69, [69, 4], [66, 4]],
      [72, 70, 69, 67, 69, 70, 72, 74],
      [[74, 8], [72, 4], [70, 4]],
      [69, 70, 69, 66, 67, 69, 67, 66],
      [63, 66, 67, 69, 70, 69, 67, 66],
      [67, 69, 70, 72, 70, 69, 67, 63],
      [[62, 12], 66, 69]
    ], out = [];
    bars.forEach(function (bar, b) {
      var s = 0;
      bar.forEach(function (n) {
        var midi = Array.isArray(n) ? n[0] : n, len = Array.isArray(n) ? n[1] : 2;
        out.push([b * 16 + s, midi, len]);
        s += len;
      });
    });
    return out;
  })();

  // Träumerische Melodie beim Wälzen (lange Töne, D-Dur-Pentatonik)
  var TRAUM = [[0, 74, 8], [8, 78, 8], [16, 81, 12], [28, 78, 4], [32, 76, 16], [48, 74, 12], [60, 71, 4],
    [64, 74, 8], [72, 81, 8], [80, 83, 12], [92, 81, 4], [96, 78, 16], [112, 76, 8], [120, 73, 8]];

  // ---------- Zeittabelle ----------

  var starts = [], sectionOf = [], total = 0, t = 0;
  SECTIONS.forEach(function (sec, si) {
    var n = sec.bars * BAR;
    for (var k = 0; k < n; k++) {
      var bpm = sec.bpm[0] + (sec.bpm[1] - sec.bpm[0]) * (k / n);
      starts.push(t);
      sectionOf.push([si, k]);
      t += 60 / bpm / 4;
    }
  });
  total = starts.length;
  var DURATION = t;

  function stepTime(step) {
    var loops = Math.floor(step / total), s = step - loops * total;
    return loops * DURATION + starts[s];
  }
  function stepLength(step) { return stepTime(step + 1) - stepTime(step); }

  /** Schritt (und Anteil) zu einer Songzeit; nach dem Ende beginnt der Song von vorn. */
  function stepAt(time) {
    var loops = Math.floor(time / DURATION), tt = time - loops * DURATION;
    var lo = 0, hi = total - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= tt) lo = mid; else hi = mid - 1; }
    var len = (lo + 1 < total ? starts[lo + 1] : DURATION) - starts[lo];
    return { step: loops * total + lo, frac: Math.min(1, (tt - starts[lo]) / len) };
  }

  /** Was in Schritt `step` passiert (Abschnitt, Takt, Akkord, Ereignisse). */
  function at(step) {
    var s = ((step % total) + total) % total, si = sectionOf[s][0], k = sectionOf[s][1];
    var sec = SECTIONS[si], bar = Math.floor(k / BAR), inBar = k % BAR, chord = sec.chords[bar % sec.chords.length];
    var e = {};
    if (sec.name === "streit") {
      if (inBar === 0) e.kick = true;
      if (inBar === 0 || inBar === 3 || inBar === 6 || inBar === 10) e.bass = ROOTS[chord] - 12;
      if (inBar === 4 || inBar === 12) e.stab = CHORDS[chord];
      if (HISSES[k] !== undefined) e.hiss = HISSES[k];
      if (k >= FIGHT[0] && k < FIGHT[1]) { e.fight = true; if (inBar % 2 === 0) e.hat = 2; if (inBar % 4 === 2) e.snare = true; }
      if (k >= FIGHT[0] && k < FIGHT[1] && inBar % 4 === 0) e.kick = true;
    } else if (sec.name === "minze") {
      if (inBar % 2 === 0) e.sparkle = CHORDS[chord];
      if (inBar === 0) { e.pad = CHORDS[chord]; e.purr = ROOTS[chord]; }
      if (k === 0) e.drop = true;
      if (k === 16) e.burst = true;
      e.riser = k / (sec.bars * BAR);
    } else if (sec.name === "waelzen") {
      if (inBar === 0 || inBar === 8) e.pad = CHORDS[chord];
      if (inBar % 8 === 0) e.purr = ROOTS[chord];
      if (inBar === 0 || inBar === 10) e.kick = true;
      if (inBar === 8) e.snare = true;
      if (inBar % 4 === 2) e.hat = 1;
      TRAUM.forEach(function (m) { if (m[0] === k % 128) e.lead = { midi: m[1], len: m[2] }; });
    } else if (sec.name === "frieden") {
      if (inBar % 4 === 0) e.kick = true;
      if (inBar === 4 || inBar === 12) e.snare = true;
      if (inBar % 2 === 0) e.hat = inBar % 4 === 2 ? 2 : 1;
      if (inBar === 0 || inBar === 6 || inBar === 8 || inBar === 14) e.stab = CHORDS[chord];
      if (inBar % 4 === 0) e.bass = ROOTS[chord];
      if (inBar === 0) e.purr = ROOTS[chord];
    } else if (sec.name === "tanz") {
      // Oom-pah: Bass auf 1 und 3, Akkord + Klatschen dazwischen
      if (inBar === 0 || inBar === 8) { e.kick = true; e.bass = ROOTS[chord] + (inBar === 8 ? 7 : 0); }
      if (inBar === 4 || inBar === 12) { e.stab = CHORDS[chord]; e.clap = true; }
      if (inBar % 2 === 0) e.hat = inBar % 4 === 2 ? 2 : 1;
      if (inBar % 8 === 0) e.purr = ROOTS[chord];
      TANZ.forEach(function (m) {
        if (m[0] === k % 128) e.lead = { midi: m[1], len: m[2] };
      });
      if (bar % 4 === 3 && inBar === 12) e.opa = true;
      if (bar % 4 === 0 && inBar === 0) e.crash = true;
    } else {
      if (k === 0) { e.kick = true; e.crash = true; e.stab = CHORDS.D; e.bass = ROOTS.D; e.purr = ROOTS.D; e.opa = true; e.lead = { midi: 74, len: 16 }; }
    }
    return { section: sec.name, bar: bar, inBar: inBar, step: k, chord: chord, events: e, progress: k / (sec.bars * BAR) };
  }

  // ---------- Klangerzeugung ----------

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function makeNoise(ctx) {
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 9;
    for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    return b;
  }

  function createEngine(ctx, destination, startTime, noLoop) {
    var master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(destination);
    function bus(v) { var g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; }
    var bassBus = bus(0.2), purrBus = bus(0.3), drumBus = bus(0.42), stabBus = bus(0.05), leadBus = bus(0.2), padBus = bus(0.011), fxBus = bus(0.3);
    var duck = ctx.createGain();
    duck.connect(bassBus);
    var purrDuck = ctx.createGain();
    purrDuck.connect(purrBus);
    var delay = ctx.createDelay(1), feedback = ctx.createGain(), wet = ctx.createGain();
    delay.delayTime.value = 0.28;
    feedback.gain.value = 0.35;
    wet.gain.value = 1;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);
    // Echo-Anteile, passend zur Lautstärke der jeweiligen Spur
    function send(v) { var g = ctx.createGain(); g.gain.value = v; g.connect(delay); return g; }
    var padSend = send(0.011), leadSend = send(0.12);
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
    function kick(t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.1);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.37);
      [duck.gain, purrDuck.gain].forEach(function (p) {
        p.cancelScheduledValues(t);
        p.setValueAtTime(0.3, t);
        p.linearRampToValueAtTime(1, t + 0.25);
      });
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
      src.start(t, (t * 3.1) % 0.8);
      src.stop(t + len + 0.02);
      return f;
    }
    function snare(t) { noiseHit(t, 0.5, "bandpass", 1900, 0.16); osc("triangle", 200, t, 0.1, drumBus); }
    function clap(t) { [0, 0.012, 0.024].forEach(function (d) { noiseHit(t + d, 0.4, "bandpass", 1300, 0.09, null, 1.5); }); }
    /** Fauchen: gefiltertes Rauschen, das hell anschwillt und abbricht. */
    function hiss(t) {
      var f = noiseHit(t, 0.9, "bandpass", 3500, 0.7, fxBus, 0.8);
      f.frequency.setValueAtTime(2000, t);
      f.frequency.linearRampToValueAtTime(5500, t + 0.5);
      var o = ctx.createOscillator(), g = ctx.createGain(); // Knurren
      o.type = "sawtooth";
      o.frequency.value = 70;
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 18; lg.gain.value = 0.5;
      lfo.connect(lg).connect(g.gain);
      env(g, t, 0.5, 0.05, 0.4, 0.1);
      o.connect(g).connect(fxBus);
      [o, lfo].forEach(function (x) { x.start(t); x.stop(t + 0.9); });
    }
    function bass(t, midi, len) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.Q.value = 6;
      f.frequency.setValueAtTime(2200, t);
      f.frequency.exponentialRampToValueAtTime(250, t + len);
      env(g, t, 0.9, 0.005, len * 0.7, 0.03);
      ["sawtooth", "square"].forEach(function (type, i) { var o = osc(type, midiToFreq(midi), t, len + 0.15, f); o.detune.value = i * 8; });
      f.connect(g).connect(duck);
    }
    function purr(t, midi, len) {
      var g = ctx.createGain(), trem = ctx.createOscillator(), tg = ctx.createGain();
      trem.frequency.value = 24; tg.gain.value = 0.3;
      trem.connect(tg).connect(g.gain);
      env(g, t, 0.65, 0.02, len * 0.85, 0.05);
      osc("sine", midiToFreq(midi - 12), t, len + 0.3, g);
      g.connect(purrDuck);
      trem.start(t); trem.stop(t + len + 0.3);
    }
    function stab(t, notes, len) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.frequency.value = 2600;
      env(g, t, 1, 0.005, len * 0.5, 0.04);
      notes.forEach(function (m) { osc("sawtooth", midiToFreq(m), t, len + 0.2, f); });
      f.connect(g).connect(stabBus);
    }
    function pad(t, notes, len) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      f.type = "lowpass"; f.frequency.value = 1200;
      lfo.frequency.value = 0.8; lg.gain.value = 500;
      lfo.connect(lg).connect(f.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + len * 0.3);
      g.gain.setTargetAtTime(0.0001, t + len * 0.9, 0.2);
      notes.forEach(function (m) { [-8, 8].forEach(function (c) { var o = osc("sawtooth", midiToFreq(m), t, len + 1, f); o.detune.value = c; }); });
      f.connect(g);
      g.connect(padBus);
      g.connect(padSend);
      lfo.start(t); lfo.stop(t + len + 1);
    }
    function sparkle(t, notes) {
      notes.forEach(function (m, i) {
        var g = ctx.createGain();
        env(g, t + i * 0.05, 0.6, 0.003, 0.02, 0.15);
        osc("triangle", midiToFreq(m + 24), t + i * 0.05, 0.6, g);
        g.connect(leadBus);
        g.connect(leadSend);
      });
    }
    /** Bouzouki-artiges Zupfen: heller, schnell abklingender Ton; lange Töne als Tremolo. */
    function pluck(t, midi, len, stepLen) {
      var reps = len >= 4 ? Math.max(1, Math.round(len * stepLen / 0.055)) : 1, each = len >= 4 ? len * stepLen / reps : len * stepLen;
      for (var r = 0; r < reps; r++) {
        var tt = t + r * each, f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = "bandpass"; f.frequency.value = midiToFreq(midi) * 3; f.Q.value = 0.7;
        env(g, tt, r ? 0.7 : 1, 0.002, 0.01, Math.min(0.12, each));
        osc("sawtooth", midiToFreq(midi), tt, each + 0.3, f);
        osc("square", midiToFreq(midi + 12), tt, each + 0.3, f).detune.value = 6;
        f.connect(g);
        g.connect(leadBus);
        g.connect(leadSend);
      }
    }
    function dreamLead(t, midi, len) {
      var g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
      vib.frequency.value = 4.5; vg.gain.value = 9;
      env(g, t, 0.3, 0.15, len * 0.7, 0.3);
      var o = osc("sine", midiToFreq(midi), t, len + 1.2, g), o2 = osc("triangle", midiToFreq(midi), t, len + 1.2, g);
      vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
      vib.start(t); vib.stop(t + len + 1.2);
      g.connect(leadBus);
      g.connect(leadSend);
    }
    function riser(t, len, amount) {
      var f = noiseHit(t, 0.12 + amount * 0.25, "bandpass", 600, len + 0.05, fxBus, 2);
      f.frequency.setValueAtTime(400 + amount * 4000, t);
      f.frequency.linearRampToValueAtTime(400 + (amount + 0.06) * 4000, t + len);
    }

    var step = 0;
    return {
      master: master,
      scheduleUntil: function (until) {
        while (true) {
          var tt = startTime + stepTime(step);
          if (tt >= until) break;
          if (noLoop && step >= total) break;
          var a = at(step), e = a.events, sl = stepLength(step);
          if (e.kick) kick(tt);
          if (e.snare) snare(tt);
          if (e.clap) clap(tt);
          if (e.hat) noiseHit(tt, e.hat === 2 ? 0.24 : 0.1, "highpass", 8000, 0.035);
          if (e.crash) noiseHit(tt, 0.32, "highpass", 5000, 1.2);
          if (e.hiss !== undefined) hiss(tt);
          if (e.bass !== undefined) bass(tt, e.bass, sl * (a.section === "streit" ? 2 : 3.5));
          if (e.purr !== undefined) purr(tt, e.purr, sl * 7.5);
          if (e.stab) stab(tt, e.stab, sl * 1.5);
          if (e.pad) pad(tt, e.pad, sl * (a.section === "minze" ? 16 : 8));
          if (e.sparkle) sparkle(tt, e.sparkle);
          if (e.riser !== undefined) riser(tt, sl, e.riser);
          if (e.lead) {
            if (a.section === "waelzen") dreamLead(tt, e.lead.midi, e.lead.len * sl);
            else pluck(tt, e.lead.midi, e.lead.len, sl);
          }
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

  global.FriedenMusik = {
    SECTIONS: SECTIONS, TANZ: TANZ, TRAUM: TRAUM, HISSES: HISSES, FIGHT: FIGHT, DURATION: DURATION, STEPS: total,
    at: at, stepTime: stepTime, stepAt: stepAt, stepLength: stepLength,
    start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
