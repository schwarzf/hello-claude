/**
 * SingularityMusik – Soundtrack der Demo „SINGULARITY“ (eigene Komposition).
 * Eine einzige Eskalation: Herzschlag und Glocke → präzise Arpeggios →
 * Drum-and-Bass mit Reese-Bass → Halftime am Ereignishorizont → heller,
 * treibender Morph-Teil in Dur → Tunnel mit Acid-Linie und Shepard-Ton
 * (scheint endlos zu steigen) → Stille, ein Herzschlag → Explosion.
 * Das Tempo steigt von 80 auf 224 BPM; jeder Schritt hat deshalb eine
 * feste Startzeit (stepTime), die Musik und Grafik gemeinsam nutzen.
 *
 * Ein Motiv aus vier Tönen (A–D–F–E) zieht sich durch alles; ab dem
 * Morph-Teil wird aus dem F ein Fis – aus Moll wird Dur.
 */
(function (global) {
  "use strict";

  var BAR = 16;
  var SECTIONS = [
    { name: "punkt", bars: 4, bpm: [80, 80], chaos: [0, 0] },
    { name: "gitter", bars: 8, bpm: [100, 100], chaos: [0, 0.12] },
    { name: "lorenz", bars: 8, bpm: [110, 126], chaos: [0.12, 0.3] },
    { name: "bruch", bars: 8, bpm: [140, 140], chaos: [0.35, 0.5] },
    { name: "fraktal", bars: 8, bpm: [150, 166], chaos: [0.5, 0.7] },
    { name: "pause", bars: 2, bpm: [80, 80], chaos: [0.2, 0.3] },
    { name: "horizont", bars: 3, bpm: [170, 170], chaos: [0.7, 0.75] },
    { name: "morph", bars: 8, bpm: [172, 172], chaos: [0.45, 0.65] },
    { name: "tunnel", bars: 20, bpm: [176, 224], chaos: [0.8, 1] },
    { name: "stille", bars: 2, bpm: [150, 150], chaos: [0, 0] },
    { name: "licht", bars: 4, bpm: [174, 174], chaos: [0.6, 0.6] },
    { name: "weiss", bars: 2, bpm: [96, 96], chaos: [0, 0] }
  ];
  var CH_MIN = [[62, 65, 69], [62, 65, 69], [58, 62, 65], [57, 61, 64]], RT_MIN = [38, 38, 34, 33], MO_MIN = [69, 74, 77, 76];
  // Dur ab dem Morph-Teil: D – G – h – A
  var CH_MAJ = [[62, 66, 69], [62, 67, 71], [62, 66, 71], [61, 64, 69]], RT_MAJ = [38, 31, 35, 33], MO_MAJ = [69, 74, 78, 76];
  var ACID = [0, 0, 12, 0, 4, 0, 9, 12, 0, 7, 0, 12, 16, 12, 9, 7], ACID_ACCENT = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0];

  // ---------- Zeittabelle ----------

  var starts = [], sectionOf = [], sectionStartStep = {}, t = 0;
  SECTIONS.forEach(function (sec, si) {
    var n = sec.bars * BAR;
    sectionStartStep[sec.name] = starts.length;
    for (var k = 0; k < n; k++) {
      starts.push(t);
      sectionOf.push([si, k]);
      t += 60 / (sec.bpm[0] + (sec.bpm[1] - sec.bpm[0]) * (k / n)) / 4;
    }
  });
  var STEPS = starts.length, DURATION = t;

  function stepTime(step) { return step >= STEPS ? DURATION + (step - STEPS) * 0.15 : starts[Math.max(0, step)]; }
  function stepLength(step) { return stepTime(step + 1) - stepTime(step); }
  function stepAt(time) {
    if (time >= DURATION) { var extra = (time - DURATION) / 0.15; return { step: STEPS + Math.floor(extra), frac: extra - Math.floor(extra) }; }
    var lo = 0, hi = STEPS - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= time) lo = mid; else hi = mid - 1; }
    return { step: lo, frac: Math.min(1, (time - starts[lo]) / stepLength(lo)) };
  }
  function sectionStart(name) { return starts[sectionStartStep[name]]; }
  function hashStep(n) { var h = Math.sin(n * 91.7 + 13.1) * 43758.5453; return h - Math.floor(h); }

  /** Was in Schritt `step` passiert: Abschnitt, Ereignisse, Chaos-Regler (0…1), Schnitt-Nummer. */
  function at(step) {
    if (step >= STEPS) return { section: "ende", index: SECTIONS.length, step: step - STEPS, bar: 0, inBar: 0, events: {}, chaos: 0, progress: 1, cut: 0 };
    var si = sectionOf[step][0], k = sectionOf[step][1], sec = SECTIONS[si], n = sec.name;
    var bar = k >> 4, inBar = k & 15, b4 = bar % 4, len = sec.bars * BAR, pr = k / len, four = inBar % 4 === 0;
    var chaos = sec.chaos[0] + (sec.chaos[1] - sec.chaos[0]) * pr, e = {}, cut = 0, h = hashStep(step), h2 = hashStep(step + 50);

    function dnb() {
      if (inBar === 0 || inBar === 10) e.kick = 1;
      if (inBar === 4 || inBar === 12) e.snare = 1;
      if (inBar % 2 === 0) e.hat = inBar === 14 ? 2 : 1; else if (h < 0.35) e.hat = 1;
    }

    if (n === "punkt") {
      if (k === 0) e.drone = len;
      if (inBar === 0) e.heart = 1;
      if (inBar === 3) e.heart = 0.6;
      if (inBar === 8) e.bell = { midi: MO_MIN[bar], len: 8 };
    } else if (n === "gitter") {
      cut = Math.floor(k / 64);
      if (four) e.kick = 0.7;
      if (inBar % 4 === 2) e.hat = 1;
      e.arp = { midi: CH_MIN[b4][[0, 1, 2, 1][inBar % 4]] + (inBar >= 8 ? 12 : 0), cut: 0.25 };
      if (inBar === 0) { e.sub = RT_MIN[b4]; e.bell = { midi: MO_MIN[b4], len: 12 }; }
      if (k === 0) e.impact = 0.5;
    } else if (n === "lorenz") {
      cut = Math.floor(k / 32);
      if (four) e.kick = 1;
      if (inBar === 4 || inBar === 12) e.snare = 0.7;
      if (inBar % 2 === 0) e.hat = inBar % 4 === 2 ? 2 : 1; else if (h < chaos * 1.5) e.hat = 1;
      if (inBar % 4 === 2 || (inBar % 4 === 3 && h < chaos)) e.bass = RT_MIN[b4];
      // das Arpeggio verliert mit wachsendem Chaos seine Ordnung
      var tone = CH_MIN[b4][[0, 1, 2, 1][inBar % 4]] + (inBar >= 8 ? 12 : 0);
      if (h2 < chaos * 2.2) tone = CH_MIN[b4][Math.floor(h * 3)] + 12 * Math.floor(hashStep(step + 7) * 3);
      e.arp = { midi: tone, cut: 0.3 + chaos };
      if (hashStep(step + 99) > 0.93) e.blip = 84 + Math.floor(h * 14);
      if (inBar === 0) { e.sub = RT_MIN[b4]; e.lead = { midi: MO_MIN[b4], len: 10 }; }
      if (bar >= 6) e.riser = (k - 96) / 32;
      if (k === 0) e.impact = 1;
    } else if (n === "bruch" || n === "fraktal") {
      var fr = n === "fraktal";
      cut = Math.floor(k / (fr ? 8 : 16));
      dnb();
      if (fr && (inBar === 7 || inBar === 15) && h < 0.5) e.ghost = 1;
      if (inBar === 0) e.reese = { midi: RT_MIN[b4], len: 6, wob: fr ? 3 : 1 };
      if (inBar === 6) e.reese = { midi: RT_MIN[b4], len: 4, wob: fr ? 2 : 1 };
      if (inBar === 10) e.reese = { midi: RT_MIN[b4], len: 6, wob: fr ? 4 : 2 };
      if (inBar === 0) e.lead = { midi: MO_MIN[b4] + (fr ? 12 : 0), len: 12 };
      if (inBar === 12) e.lead = { midi: CH_MIN[b4][2] + 12, len: 4 };
      if (fr) e.arp = { midi: CH_MIN[b4][inBar % 3] + 24, cut: 0.8 };
      if (fr ? (inBar === 0 || inBar === 6 || inBar === 10) : (bar % 2 === 1 && (inBar === 0 || inBar === 6))) e.stab = CH_MIN[b4];
      if (k === 0) e.impact = 1;
      if (inBar === 0 && bar % (fr ? 2 : 4) === 0) e.crash = 1;
      if (fr && bar >= 6) e.riser = (k - 96) / 32;
      if (fr && bar === 7 && inBar >= 8) e.snare = 0.4 + (inBar - 8) / 12;
    } else if (n === "pause") {
      if (k === 0) e.drop = 1;
      if (k % 8 === 0) e.bell = { midi: MO_MIN[k / 8], len: 8 };
      if (bar === 1) e.riser = (k - 16) / 16 * 0.7;
    } else if (n === "horizont") {
      if (inBar === 0) e.kick = 1.2;
      if (inBar === 8) e.snare = 1.4;
      if (inBar === 4 || inBar === 12) e.hat = 2;
      if (four) e.reese = { midi: RT_MIN[b4], len: 4, wob: 3 };
      if (inBar === 0) { e.pad = [CH_MIN[b4][0], CH_MIN[b4][0] + 1, CH_MIN[b4][2]]; e.lead = { midi: MO_MIN[b4] - 12, len: 16 }; e.choir = MO_MIN[b4]; }
      if (k === 0) e.impact = 1.3;
      if (bar === 2) { e.riser = inBar / 16; if (inBar >= 8) e.snare = 0.4 + (inBar - 8) / 10; }
    } else if (n === "morph") {
      cut = Math.floor(k / 32);
      if (four) e.kick = 1;
      if (inBar === 4 || inBar === 12) e.snare = 0.8;
      e.hat = inBar % 4 === 2 ? 2 : 1;
      if (inBar % 4 === 2 || (inBar % 4 === 3 && h < 0.4)) e.bass = RT_MAJ[b4];
      e.arp = { midi: CH_MAJ[b4][[0, 1, 2, 1][inBar % 4]] + 12 + (inBar >= 8 ? 12 : 0), cut: 0.75 };
      if (inBar === 0) { e.sub = RT_MAJ[b4]; e.lead = { midi: MO_MAJ[b4] + 12, len: 6 }; }
      if (inBar === 6) e.lead = { midi: CH_MAJ[b4][1] + 12, len: 2 };
      if (inBar === 8) e.lead = { midi: CH_MAJ[b4][2] + 12, len: 4 };
      if (inBar === 12) e.lead = { midi: MO_MAJ[b4] + 12, len: 4 };
      if (inBar === 0 || inBar === 6 || inBar === 12) e.stab = CH_MAJ[b4];
      if (k === 0) e.impact = 1;
      if (inBar === 0 && bar % 4 === 0) e.crash = 1;
      if (bar >= 6) e.riser = (k - 96) / 32;
      if (bar === 7 && inBar >= 8) e.snare = 0.4 + (inBar - 8) / 12;
    } else if (n === "tunnel") {
      cut = bar < 10 ? Math.floor(k / 16) : bar < 16 ? 10 + Math.floor((k - 160) / 8) : 22 + Math.floor((k - 256) / 4);
      if (bar < 16 ? (inBar === 0 || inBar === 10) : four) e.kick = 1;
      if (bar < 16 ? (inBar === 4 || inBar === 12) : bar === 16 ? four : bar < 19 ? inBar % 2 === 0 : true) e.snare = bar < 16 ? 1 : 0.5 + (k - 256) / 64 * 0.7;
      e.hat = 1;
      if (inBar % 2 === 0) e.reese = { midi: RT_MAJ[b4], len: 2, wob: 1 };
      e.acid = { midi: 50 + ACID[inBar] + (RT_MAJ[b4] - 38), accent: ACID_ACCENT[inBar], cut: 0.25 + 0.75 * pr };
      if (inBar === 0) e.lead = { midi: MO_MAJ[b4] + 12, len: 14 };
      if (inBar === 0 || inBar === 6 || inBar === 12) e.stab = CH_MAJ[b4];
      e.riser = pr;
      if (k === 0) { e.shepard = 1; e.impact = 1; }
      if (inBar === 0 && bar % 2 === 0) e.crash = 1;
    } else if (n === "stille") {
      // Stille – dann ein einzelner Herzschlag, bevor es knallt
      if (k === 0) e.mute = 1;
      if (k === 16) { e.unmute = 1; e.heart = 1; }
      if (k === 19) e.heart = 0.6;
    } else if (n === "licht") {
      if (k === 0) { e.impact = 1.3; e.crash = 1; }
      if (four) { e.kick = 1; e.stab = CH_MAJ[b4]; }
      if (bar < 2 ? (inBar === 4 || inBar === 12) : bar === 2 ? inBar % 2 === 0 : true) e.snare = bar < 2 ? 1 : 0.5 + (k - 32) / 32 * 0.8;
      e.hat = 1;
      if (inBar % 2 === 0) { e.reese = { midi: RT_MAJ[b4], len: 2, wob: 1 }; e.sparkle = CH_MAJ[b4][(inBar / 2) % 3] + 24 + (inBar >= 8 ? 12 : 0); }
      if (inBar === 0) { e.wall = CH_MAJ[b4]; e.lead = { midi: MO_MAJ[b4] + 12, len: 14 }; e.choir = MO_MAJ[b4]; e.timp = RT_MAJ[b4]; }
      if (bar >= 2) e.riser = (k - 32) / 32;
      if (inBar === 0 && bar % 2 === 0) e.crash = 1;
    } else if (n === "weiss") {
      if (k === 0) e.hit = 1;
    }
    return { section: n, index: si, step: k, bar: bar, inBar: inBar, events: e, chaos: chaos, progress: pr, cut: cut };
  }

  // ---------- Klangerzeugung ----------

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function makeNoise(ctx) {
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 23;
    for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    return b;
  }
  function tanhCurve(drive, ceiling) {
    var n = 2048, c = new Float32Array(n), norm = Math.tanh(drive);
    for (var i = 0; i < n; i++) c[i] = Math.tanh((i / (n - 1) * 2 - 1) * drive) / norm * ceiling;
    return c;
  }

  function createEngine(ctx, destination, startTime, fromStep) {
    var master = ctx.createGain(), gate = ctx.createGain(), limiter = ctx.createWaveShaper();
    master.gain.value = 0.7;
    limiter.curve = tanhCurve(1.6, 0.9);
    master.connect(gate).connect(limiter).connect(destination);
    function bus(v, dest) { var g = ctx.createGain(); g.gain.value = v; g.connect(dest || master); return g; }
    var drumBus = bus(0.7), bassBus = bus(0.21), leadBus = bus(0.2), stabBus = bus(0.12), arpBus = bus(0.17), padBus = bus(0.06), bellBus = bus(0.3), fxBus = bus(0.3), shepBus = bus(0.22);
    var reeseDrive = ctx.createWaveShaper();
    reeseDrive.curve = tanhCurve(4, 1);
    var duck = ctx.createGain();
    duck.connect(bassBus);
    reeseDrive.connect(bus(0.55, duck));
    var acidDrive = ctx.createWaveShaper();
    acidDrive.curve = tanhCurve(5, 1);
    acidDrive.connect(bus(0.2));
    var delay = ctx.createDelay(1.5), feedback = ctx.createGain();
    delay.delayTime.value = 0.33;
    feedback.gain.value = 0.45;
    delay.connect(feedback).connect(delay);
    delay.connect(master);
    function send(v) { var g = ctx.createGain(); g.gain.value = v; g.connect(delay); return g; }
    var leadSend = send(0.07), arpSend = send(0.06), bellSend = send(0.18);
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
      src.start(t, (t * 1.3) % 0.7);
      src.stop(t + len + 0.02);
      return f;
    }
    function kick(t, vol) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
      g.gain.setValueAtTime(vol, t);
      g.gain.setValueAtTime(vol, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.32);
      noiseHit(t, 0.2 * vol, "highpass", 3000, 0.012);
      duck.gain.cancelScheduledValues(t);
      duck.gain.setValueAtTime(0.2, t);
      duck.gain.linearRampToValueAtTime(1, t + 0.12);
    }
    function heart(t, vol) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
      env(g, t, 0.9 * vol, 0.01, 0.08, 0.07);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.6);
    }
    function snare(t, vol) {
      noiseHit(t, 0.42 * vol, "bandpass", 2100, vol > 1.2 ? 0.4 : 0.15, null, 0.8);
      noiseHit(t, 0.18 * vol, "highpass", 6000, 0.08);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(230, t);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.06);
      env(g, t, 0.4 * vol, 0.002, 0.03, 0.03);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 0.2);
    }
    function sub(t, midi, len) {
      var g = ctx.createGain();
      env(g, t, 0.6, 0.04, len * 0.8, 0.25);
      osc("sine", midiToFreq(midi), t, len + 1.5, g);
      g.connect(bassBus);
    }
    function bass(t, midi, len) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.Q.value = 4;
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(200, t + len);
      env(g, t, 0.9, 0.004, len * 0.6, 0.02);
      osc("sawtooth", midiToFreq(midi), t, len + 0.1, f);
      osc("sine", midiToFreq(midi), t, len + 0.1, g);
      f.connect(g).connect(duck);
    }
    /** Reese-Bass: zwei verstimmte Sägezähne, deren Filter „wobbelt“, danach verzerrt. */
    function reese(t, r, sl, chaos) {
      var len = r.len * sl, f = ctx.createBiquadFilter(), g = ctx.createGain(), n = r.wob || 1;
      var lo = 170 + chaos * 250, hi = 500 + chaos * 2600;
      f.type = "lowpass"; f.Q.value = 3 + chaos * 6;
      f.frequency.setValueAtTime(lo, t);
      for (var i = 0; i < n; i++) {
        f.frequency.linearRampToValueAtTime(hi, t + len * (i + 0.5) / n);
        f.frequency.linearRampToValueAtTime(lo, t + len * (i + 1) / n);
      }
      env(g, t, 1, 0.005, len * 0.8, 0.015);
      osc("sawtooth", midiToFreq(r.midi), t, len + 0.1, f, -22);
      osc("sawtooth", midiToFreq(r.midi), t, len + 0.1, f, 22);
      f.connect(g).connect(reeseDrive);
      var sg = ctx.createGain();
      env(sg, t, 0.55, 0.005, len * 0.8, 0.015);
      osc("sine", midiToFreq(r.midi), t, len + 0.1, sg);
      sg.connect(duck);
    }
    function supersaw(t, midi, len, dest, sendTo, cutoff, voices) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass";
      f.frequency.setValueAtTime(cutoff, t);
      f.frequency.exponentialRampToValueAtTime(cutoff * 0.45, t + len);
      env(g, t, 1, 0.008, len * 0.75, 0.05);
      (voices || [-14, 0, 14]).forEach(function (c) { osc("sawtooth", midiToFreq(midi), t, len + 0.4, f, c); });
      f.connect(g);
      g.connect(dest);
      if (sendTo) g.connect(sendTo);
    }
    function arp(t, a) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.Q.value = 5;
      f.frequency.value = 500 + a.cut * a.cut * 6000;
      env(g, t, 1, 0.003, 0.03, 0.035);
      osc("square", midiToFreq(a.midi), t, 0.3, f);
      f.connect(g);
      g.connect(arpBus);
      g.connect(arpSend);
    }
    function bell(t, midi, len) {
      [1, 2.76, 5.4].forEach(function (ratio, i) {
        var g = ctx.createGain();
        env(g, t, [1, 0.3, 0.12][i], 0.002, 0.05, Math.min(1.6, len * 0.35));
        osc("sine", midiToFreq(midi) * ratio, t, len + 2.5, g);
        g.connect(bellBus);
        g.connect(bellSend);
      });
    }
    function pad(t, notes, len, cutoff, vol) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass"; f.frequency.value = cutoff;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(0.8, len * 0.3));
      g.gain.setTargetAtTime(0.0001, t + len * 0.93, 0.25);
      notes.forEach(function (m) { osc("sawtooth", midiToFreq(m), t, len + 1.5, f, -9); osc("sawtooth", midiToFreq(m), t, len + 1.5, f, 9); });
      f.connect(g).connect(padBus);
    }
    /** Chor-artig: Sägezähne durch zwei Formant-Filter („ah“). */
    function choir(t, midi, len) {
      var g = ctx.createGain(), mix = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + len * 0.3);
      g.gain.setTargetAtTime(0.0001, t + len * 0.9, 0.2);
      [800, 1150, 2800].forEach(function (fq, i) {
        var f = ctx.createBiquadFilter();
        f.type = "bandpass"; f.frequency.value = fq; f.Q.value = 6;
        mix.connect(f);
        var fg = ctx.createGain(); fg.gain.value = [1, 0.6, 0.2][i];
        f.connect(fg).connect(g);
      });
      [0, 12].forEach(function (oct) { [-11, 0, 11].forEach(function (c) { osc("sawtooth", midiToFreq(midi - 12 + oct), t, len + 1, mix, c); }); });
      g.connect(leadBus);
      g.connect(leadSend);
    }
    function riser(t, amount, sl) {
      var f = noiseHit(t, 0.05 + amount * 0.2, "bandpass", 500, sl + 0.03, fxBus, 3);
      f.frequency.setValueAtTime(400 + amount * 5500, t);
      f.frequency.linearRampToValueAtTime(400 + (amount + 0.03) * 5500, t + sl);
    }
    function impact(t, vol) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      o.connect(g).connect(drumBus);
      o.start(t); o.stop(t + 1.9);
      noiseHit(t, 0.5 * vol, "lowpass", 900, 0.9, fxBus);
    }
    function fall(t, sl) {
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), len = sl * 4;
      o.type = "sawtooth";
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(40, t + len);
      f.type = "lowpass"; f.frequency.value = 1800;
      env(g, t, 0.5, 0.01, len * 0.8, 0.03);
      o.connect(f).connect(g).connect(fxBus);
      o.start(t); o.stop(t + len + 0.2);
    }
    function drone(t, len) {
      var g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.35; lg.gain.value = 0.15;
      lfo.connect(lg).connect(g.gain);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.5, t + 3);
      g.gain.setTargetAtTime(0.0001, t + len - 0.6, 0.25);
      osc("sine", midiToFreq(38), t, len + 1, g);
      osc("sine", midiToFreq(45), t, len + 1, g).detune.value = 5;
      osc("triangle", midiToFreq(26), t, len + 1, g);
      g.connect(bassBus);
      lfo.start(t); lfo.stop(t + len + 1);
    }
    /** Shepard-Ton: sechs Stimmen im Oktavabstand steigen; leise Ränder machen den Neuanfang unhörbar. */
    function shepard(t, dur) {
      var cycle = dur * 6 / 5, fmin = 27.5, N = 128;
      for (var v = 0; v < 6; v++) {
        var o = ctx.createOscillator(), g = ctx.createGain(), p0 = v / 6, curve = new Float32Array(N);
        o.type = "triangle";
        o.frequency.setValueAtTime(fmin * Math.pow(2, 6 * p0), t);
        var wrapAt = (1 - p0) * cycle;
        if (wrapAt < dur) {
          o.frequency.exponentialRampToValueAtTime(fmin * 64, t + wrapAt);
          o.frequency.setValueAtTime(fmin, t + wrapAt + 0.001);
          o.frequency.exponentialRampToValueAtTime(fmin * Math.pow(2, 6 * ((p0 + dur / cycle) % 1)), t + dur);
        } else {
          o.frequency.exponentialRampToValueAtTime(fmin * Math.pow(2, 6 * (p0 + dur / cycle)), t + dur);
        }
        for (var i = 0; i < N; i++) {
          var u = i / (N - 1), p = (p0 + u * dur / cycle) % 1, w = Math.sin(Math.PI * p);
          curve[i] = w * w * (0.25 + 0.75 * u) * (i === N - 1 ? 0 : 1);
        }
        g.gain.setValueAtTime(0, t);
        g.gain.setValueCurveAtTime(curve, t + 0.001, dur - 0.002);
        o.connect(g).connect(shepBus);
        o.start(t); o.stop(t + dur + 0.05);
      }
    }
    function acid(t, a, sl) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain(), len = sl * (a.accent ? 1.1 : 0.8), base = 250 + a.cut * a.cut * 2800;
      f.type = "lowpass"; f.Q.value = 15;
      f.frequency.setValueAtTime(base * (a.accent ? 4 : 2), t);
      f.frequency.exponentialRampToValueAtTime(base, t + len * 0.8);
      env(g, t, a.accent ? 1 : 0.6, 0.003, len * 0.6, 0.02);
      osc("sawtooth", midiToFreq(a.midi), t, len + 0.1, f);
      f.connect(g).connect(acidDrive);
    }
    /** Schlussschlag: ein einziger harter Akkord, kein Ausklingen. */
    function finalHit(t) {
      impact(t, 1.4);
      kick(t, 1.2);
      noiseHit(t, 0.4, "highpass", 4000, 1.6, fxBus);
      [38, 50, 62, 66, 69, 74, 78, 81].forEach(function (m) { supersaw(t, m, 0.7, stabBus, null, 5200, [-12, 12]); });
    }

    var step = fromStep || 0;
    return {
      master: master,
      scheduleUntil: function (until) {
        while (step < STEPS) {
          var t = startTime + stepTime(step);
          if (t >= until) break;
          var a = at(step), e = a.events, sl = stepLength(step), c = a.chaos;
          if (e.mute) { gate.gain.setValueAtTime(1, t); gate.gain.linearRampToValueAtTime(0, t + 0.03); }
          if (e.unmute) gate.gain.setValueAtTime(1, t);
          if (e.kick) kick(t, e.kick);
          if (e.heart) heart(t, e.heart);
          if (e.snare) snare(t, e.snare);
          if (e.ghost) noiseHit(t, 0.14, "bandpass", 2100, 0.07, null, 0.8);
          if (e.hat) noiseHit(t, e.hat === 2 ? 0.17 : 0.06, "highpass", 9000, e.hat === 2 ? 0.08 : 0.022);
          if (e.crash) noiseHit(t, 0.26, "highpass", 5000, 1.4, fxBus);
          if (e.riser !== undefined) riser(t, e.riser, sl);
          if (e.impact) impact(t, e.impact);
          if (e.drop) { impact(t, 1.2); fall(t, sl * 2); }
          if (e.fall) fall(t, sl);
          if (e.drone) drone(t, stepTime(step + e.drone) - stepTime(step));
          if (e.sub !== undefined) sub(t, e.sub, sl * 14);
          if (e.bass !== undefined) bass(t, e.bass, sl * 0.9);
          if (e.reese) reese(t, e.reese, sl, c);
          if (e.arp) arp(t, e.arp);
          if (e.blip) { var bg = ctx.createGain(); env(bg, t, 0.5, 0.002, 0.02, 0.01); osc("sine", midiToFreq(e.blip), t, 0.1, bg); bg.connect(arpBus); bg.connect(arpSend); }
          if (e.bell) bell(t, e.bell.midi, e.bell.len * sl);
          if (e.lead) supersaw(t, e.lead.midi, e.lead.len * sl, leadBus, leadSend, 2500 + c * 3500);
          if (e.stab) e.stab.forEach(function (m) { supersaw(t, m, sl * 1.6, stabBus, null, 4200, [-10, 10]); });
          if (e.pad) pad(t, e.pad, sl * 16, 1100, 1);
          if (e.choir) choir(t, e.choir, sl * 16);
          if (e.wall) pad(t, e.wall.concat(e.wall.map(function (m) { return m + 12; })), sl * 16, 3200, 0.55);
          if (e.timp) { heart(t, 1.0); noiseHit(t, 0.2, "lowpass", 300, 0.5, fxBus); }
          if (e.sparkle) bell(t, e.sparkle, 3 * sl);
          if (e.shepard) shepard(t, stepTime(sectionStartStep.stille) - stepTime(step));
          if (e.acid) acid(t, e.acid, sl);
          if (e.hit) finalHit(t);
          step++;
        }
      }
    };
  }

  // ---------- Wiedergabe ----------

  var ctx = null, engine = null, timer = null, playing = false, startTime = 0;
  /** Startet die Musik; offset (Sekunden) steigt mitten im Stück ein. */
  function start(offset) {
    offset = offset || 0;
    // gemeinsamer, in Safari freigeschalteter Audio-Kontext aus musik.js
    ctx = global.Musik ? global.Musik.getContext() : new (global.AudioContext || global.webkitAudioContext)();
    if (!ctx || playing) return;
    if (ctx.state !== "running") ctx.resume();
    startTime = ctx.currentTime + 0.1 - offset;
    var first = offset > 0 ? stepAt(offset).step + 1 : 0;
    engine = createEngine(ctx, ctx.destination, startTime, first);
    timer = setInterval(function () { if (ctx.state === "running") engine.scheduleUntil(ctx.currentTime + 0.25); }, 40);
    engine.scheduleUntil(ctx.currentTime + 0.25);
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
  /** Rendert `seconds` Sekunden offline, beginnend bei Songzeit `from` (für Tests). */
  function render(seconds, sampleRate, from) {
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100);
    from = from || 0;
    createEngine(off, off.destination, -from, from > 0 ? stepAt(from).step + 1 : 0).scheduleUntil(seconds);
    return off.startRendering();
  }

  global.SingularityMusik = {
    SECTIONS: SECTIONS, MO_MIN: MO_MIN, MO_MAJ: MO_MAJ, CH_MAJ: CH_MAJ, STEPS: STEPS, DURATION: DURATION,
    at: at, stepTime: stepTime, stepAt: stepAt, stepLength: stepLength, sectionStart: sectionStart,
    start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
