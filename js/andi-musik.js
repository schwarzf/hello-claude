/**
 * AndiMusik – der Song der Katzen-Demo, neu arrangiert für Andis Geburtstags-Demo (eigene
 * Komposition, F-Dur, 130 BPM), live per Web Audio erzeugt.
 * Besonderheiten: ein „Miau“-Synth als Lead (gleitender Ton mit Formant-
 * Filter) und ein „Schnurr“-Bass (tiefer Bass mit schnellem Flattern).
 *
 * Der Song ist als Daten beschrieben (Song.at(schritt)); Musik und Grafik
 * lesen beide daraus, damit Bild und Ton auch im Video exakt passen.
 */
(function (global) {
  "use strict";

  var BPM = 130;
  var STEP = 60 / BPM / 4;
  var BAR = 16;

  var PROGRESSION = ["F", "C", "Dm", "Bb"];
  var ROOTS = { F: 41, C: 36, Dm: 38, Bb: 34 };
  var CHORDS = { F: [65, 69, 72], C: [64, 67, 72], Dm: [62, 65, 69], Bb: [62, 65, 70] };
  var BASSLINE = [0, null, 12, null, 0, 0, 12, null, 0, null, 12, 0, 7, null, 12, null];

  // „Miau“-Melodie über 8 Takte: [Schritt, MIDI-Ton, Länge]
  var LEAD = [
    [0, 72, 2], [2, 77, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 69, 4],
    [16, 67, 2], [18, 72, 2], [20, 76, 4], [24, 74, 4], [28, 72, 4],
    [32, 74, 2], [34, 77, 2], [36, 81, 4], [40, 79, 2], [42, 77, 2], [44, 74, 4],
    [48, 70, 2], [50, 74, 2], [52, 77, 4], [56, 76, 4], [60, 74, 2], [62, 72, 2],
    [64, 72, 2], [66, 77, 2], [68, 81, 4], [72, 79, 2], [74, 77, 2], [76, 76, 4],
    [80, 74, 2], [82, 76, 2], [84, 79, 4], [88, 76, 4], [92, 72, 4],
    [96, 74, 2], [98, 77, 2], [100, 81, 4], [104, 84, 4], [108, 81, 4],
    [112, 82, 2], [114, 81, 2], [116, 79, 4], [120, 77, 8]
  ];

  var SECTIONS = [
    { name: "flug1", bars: 8, arp: true, purr: true, hats: true, kickFrom: 6 },
    { name: "flug2", bars: 8, kick: true, snare: true, hats: true, bass: true, purr: true, arp: true, crash: true },
    { name: "wolle1", bars: 4, kick: true, snare: true, hats: true, bass: true, purr: true, lead: true },
    { name: "wolle2", bars: 4, kick: true, snare: true, hats: true, bass: true, purr: true, arp: true, lead: true, leadOffset: 64 },
    { name: "band", bars: 8, kick: true, snare: true, hats: true, bass: true, purr: true, arp: true, lead: true, crash: true },
    { name: "longcat", bars: 8, kick: true, snare: true, hats: true, bass: true, purr: true, arp: true, lead: true, crash: true },
    { name: "finale", bars: 4, kick: true, snare: true, hats: true, bass: true, purr: true, arp: true, lead: true, crash: true, end: true }
  ];
  var LOOP_FROM = 4;
  var SONG_BARS = SECTIONS.reduce(function (n, s) { return n + s.bars; }, 0);

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /**
   * Was in Schritt `step` (Sechzehntel seit Songbeginn) passiert. Nach dem
   * Finale wiederholt sich der Song ab LOOP_FROM; mit noLoop endet er.
   */
  function at(step, noLoop) {
    var loopStart = 0;
    for (var i = 0; i < LOOP_FROM; i++) loopStart += SECTIONS[i].bars * BAR;
    var total = SONG_BARS * BAR;
    if (step >= total) {
      if (noLoop) {
        // Schluss fürs Video: ein letzter F-Dur-Akkord mit Crash, dann Stille
        var rest = step - total, last = rest === 0 ? { kick: true, crash: true, purr: ROOTS.F, bass: ROOTS.F, arp: CHORDS.F } : {};
        return { section: "ende", step: rest, bar: Math.floor(rest / BAR), inBar: rest % BAR, chord: "F", events: last };
      }
      step = loopStart + (step - total) % (total - loopStart);
    }
    var s = step, idx = 0;
    while (s >= SECTIONS[idx].bars * BAR) { s -= SECTIONS[idx].bars * BAR; idx++; }
    var sec = SECTIONS[idx], bar = Math.floor(s / BAR), inBar = s % BAR;
    var songBar = Math.floor(step / BAR), chord = PROGRESSION[songBar % 4];
    var e = {};
    var kickOn = sec.kick || (sec.kickFrom !== undefined && bar >= sec.kickFrom);
    if (kickOn && inBar % 4 === 0) e.kick = true;
    if (sec.snare && (inBar === 4 || inBar === 12)) e.snare = true;
    if (sec.hats && inBar % 2 === 0) e.hat = inBar % 4 === 2 ? 2 : 1;
    if (sec.crash && inBar === 0 && bar % 4 === 0) e.crash = true;
    if (sec.bass) {
      var b = BASSLINE[inBar];
      if (b !== null) e.bass = ROOTS[chord] + b;
    }
    if (sec.purr && inBar % 8 === 0) e.purr = ROOTS[chord];
    if (sec.arp && inBar % 2 === 0) e.arp = CHORDS[chord];
    if (sec.lead) {
      var leadStep = (s + (sec.leadOffset || 0)) % 128;
      if (sec.end && bar === sec.bars - 1) leadStep = 120 + inBar; // Schlusston
      LEAD.forEach(function (m) { if (m[0] === leadStep) e.lead = { midi: m[1], len: m[2] }; });
      if (sec.end && bar === sec.bars - 1 && inBar === 0) e.lead = { midi: 77, len: 16 };
    }
    return { section: sec.name, step: s, bar: bar, inBar: inBar, chord: chord, events: e };
  }

  function makeNoise(ctx) {
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 5;
    for (var i = 0; i < n; i++) {
      s = (s * 16807) % 2147483647;
      d[i] = (s / 2147483647) * 2 - 1;
    }
    return b;
  }

  function createEngine(ctx, destination, startTime, noLoop) {
    var master = ctx.createGain();
    master.gain.value = 0.62;
    master.connect(destination);
    function bus(v) { var g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; }
    var bassBus = bus(0.17), purrBus = bus(0.32), drumBus = bus(0.42), arpBus = bus(0.03), leadBus = bus(0.1);
    var duck = ctx.createGain();
    duck.connect(bassBus);
    var purrDuck = ctx.createGain();
    purrDuck.connect(purrBus);

    var delay = ctx.createDelay(1), feedback = ctx.createGain(), wet = ctx.createGain();
    delay.delayTime.value = STEP * 3;
    feedback.gain.value = 0.3;
    wet.gain.value = 0.2;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);

    var noise = makeNoise(ctx);

    function kick(t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.37);
      [duck.gain, purrDuck.gain].forEach(function (p) {
        p.cancelScheduledValues(t);
        p.setValueAtTime(0.3, t);
        p.linearRampToValueAtTime(1, t + STEP * 3);
      });
    }
    function noiseHit(t, vol, type, freq, len) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise;
      f.type = type;
      f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f).connect(g).connect(drumBus);
      src.start(t, (t * 5.7) % 0.8);
      src.stop(t + len + 0.02);
    }
    function snare(t) {
      noiseHit(t, 0.5, "bandpass", 2000, 0.16);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(240, t);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.07);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.12);
    }
    function bass(t, midi) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain(), len = STEP * 0.9;
      f.type = "lowpass";
      f.Q.value = 6;
      f.frequency.setValueAtTime(2400, t);
      f.frequency.exponentialRampToValueAtTime(300, t + len);
      g.gain.setValueAtTime(0.9, t);
      g.gain.setTargetAtTime(0, t + len * 0.8, 0.02);
      ["sawtooth", "square"].forEach(function (type, i) {
        var o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = midiToFreq(midi);
        o.detune.value = i * 8;
        o.connect(f);
        o.start(t); o.stop(t + len + 0.1);
      });
      f.connect(g).connect(duck);
    }
    /** Schnurr-Bass: tiefer Sinus, dessen Lautstärke schnell flattert. */
    function purr(t, midi) {
      var o = ctx.createOscillator(), g = ctx.createGain(), trem = ctx.createOscillator(), tremGain = ctx.createGain(), len = STEP * 7.5;
      o.frequency.value = midiToFreq(midi - 12);
      trem.frequency.value = 24;
      tremGain.gain.value = 0.35;
      trem.connect(tremGain).connect(g.gain);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.65, t + 0.02);
      g.gain.setTargetAtTime(0, t + len * 0.9, 0.04);
      o.connect(g).connect(purrDuck);
      [o, trem].forEach(function (x) { x.start(t); x.stop(t + len + 0.2); });
    }
    function arp(t, notes) {
      var o = ctx.createOscillator(), g = ctx.createGain(), len = STEP * 2;
      o.type = "square";
      for (var k = 0, tt = t; tt < t + len; k++, tt += 1 / 30) o.frequency.setValueAtTime(midiToFreq(notes[k % 3] + 12), tt);
      g.gain.setValueAtTime(0.8, t);
      g.gain.setTargetAtTime(0, t + len - 0.03, 0.02);
      o.connect(g);
      g.connect(arpBus);
      g.connect(delay);
      o.start(t); o.stop(t + len + 0.1);
    }
    /** „Miau“: Ton gleitet hoch und wieder runter, ein Formant-Filter formt „mi-au“. */
    function meow(t, midi, steps) {
      var len = Math.max(STEP * 2, steps * STEP), f0 = midiToFreq(midi);
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      var f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter();
      o.type = "sawtooth";
      o2.type = "square";
      [o.frequency, o2.frequency].forEach(function (fr) {
        fr.setValueAtTime(f0 * 0.84, t);
        fr.exponentialRampToValueAtTime(f0, t + 0.07);
        fr.setValueAtTime(f0, t + len * 0.6);
        fr.exponentialRampToValueAtTime(f0 * 0.89, t + len);
      });
      o2.detune.value = 7;
      f1.type = "bandpass"; f1.Q.value = 3;
      f1.frequency.setValueAtTime(500, t);
      f1.frequency.exponentialRampToValueAtTime(1900, t + 0.08);
      f1.frequency.exponentialRampToValueAtTime(800, t + len);
      f2.type = "lowpass"; f2.frequency.value = 4000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1.6, t + 0.03);
      g.gain.setTargetAtTime(0.0001, t + len * 0.85, 0.05);
      o.connect(f1); o2.connect(f1);
      f1.connect(f2).connect(g);
      g.connect(leadBus);
      g.connect(delay);
      [o, o2].forEach(function (x) { x.start(t); x.stop(t + len + 0.4); });
    }

    var step = 0, nextTime = startTime;
    return {
      master: master,
      scheduleUntil: function (until) {
        while (nextTime < until) {
          var e = at(step, noLoop).events, t = nextTime;
          if (e.kick) kick(t);
          if (e.snare) snare(t);
          if (e.hat) noiseHit(t, e.hat === 2 ? 0.26 : 0.11, "highpass", 8000, 0.04);
          if (e.crash) noiseHit(t, 0.35, "highpass", 5000, 1.2);
          if (e.bass !== undefined) bass(t, e.bass);
          if (e.purr !== undefined) purr(t, e.purr);
          if (e.arp) arp(t, e.arp);
          if (e.lead) meow(t, e.lead.midi, e.lead.len);
          nextTime += STEP;
          step++;
        }
      }
    };
  }

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

  /** Songzeit in Sekunden (für die Grafik), oder null ohne Ton. */
  function time() { return playing ? Math.max(0, ctx.currentTime - startTime) : null; }

  function render(seconds, sampleRate, noLoop) {
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100);
    createEngine(off, off.destination, 0, noLoop).scheduleUntil(seconds);
    return off.startRendering();
  }

  global.AndiMusik = {
    BPM: BPM, STEP: STEP, BAR: BAR, SECTIONS: SECTIONS, LEAD: LEAD, BASSLINE: BASSLINE, CHORDS: CHORDS,
    SONG_BARS: SONG_BARS,
    at: at, start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
