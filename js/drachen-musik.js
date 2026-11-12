/**
 * DrachenMusik – „Drachenfeuer“: eigene Komposition, epische Fantasy-Musik
 * im Stil alter Amiga-Spielmusik, live per Web Audio erzeugt.
 * Chor (Formant-Synthese auf „Aah“), Blechbläser, Streicher, Pauken, Harfe
 * (gezupfte Saite). Ein Heldenthema in d-Moll, das im Finale in D-Dur
 * erklingt; im Kampf treiben Streicher-Ostinato und Trommeln.
 *
 * Der Song ist als Ereignisliste in Schlägen beschrieben (song); Musik und
 * Grafik lesen beide daraus.
 */
(function (global) {
  "use strict";

  var BPM = 96, BEAT = 60 / BPM, BAR = 4;
  var SECTIONS = [
    { name: "titel", bars: 6 }, { name: "zauberer", bars: 8 }, { name: "drache", bars: 10 }, { name: "helden", bars: 12 },
    { name: "kampf", bars: 14 }, { name: "wende", bars: 5 }, { name: "finale", bars: 10 }
  ];
  (function () { var b = 0; SECTIONS.forEach(function (s) { s.start = b; b += s.bars; }); })();
  var TOTAL_BARS = SECTIONS.reduce(function (n, s) { return n + s.bars; }, 0);
  var DURATION = TOTAL_BARS * BAR * BEAT + 3;
  function sec(name) { return SECTIONS.filter(function (s) { return s.name === name; })[0]; }
  function at(name, bar, beat) { return (sec(name).start + bar) * BAR + (beat || 0); }

  var CH = {
    Dm: [38, [62, 65, 69]], Bb: [34, [62, 65, 70]], F: [41, [60, 65, 69]], A: [33, [61, 64, 69]], Gm: [43, [62, 67, 70]], C: [36, [60, 64, 67]],
    D: [38, [62, 66, 69]], G: [43, [62, 67, 71]], Em: [40, [64, 67, 71]]
  };
  // Heldenthema über Dm – Bb – F – A, je Takt [Achtel, Länge, Ton]
  var THEME = [
    [[0, 2, 62], [2, 1, 69], [3, 1, 69], [4, 3, 74], [7, 1, 72]],
    [[0, 2, 70], [2, 2, 69], [4, 4, 67]],
    [[0, 2, 65], [2, 1, 67], [3, 1, 69], [4, 3, 72], [7, 1, 70]],
    [[0, 8, 69]]
  ];
  // in D-Dur für das Finale (über D – G – D – A)
  var THEME_MAJOR = [
    [[0, 2, 62], [2, 1, 69], [3, 1, 69], [4, 3, 74], [7, 1, 73]],
    [[0, 2, 71], [2, 2, 69], [4, 4, 67]],
    [[0, 2, 66], [2, 1, 67], [3, 1, 69], [4, 3, 74], [7, 1, 73]],
    [[0, 4, 76], [4, 4, 73]]
  ];
  var OSTINATO = [0, 0, 3, 0, 2, 0, -2, 0, 0, 0, 3, 0, 5, 3, 2, 0];

  function hash(n) { var h = Math.sin(n * 91.7 + 13.1) * 43758.5453; return h - Math.floor(h); }

  function build() {
    var S = { brass: [], strings: [], choir: [], harp: [], drums: [], drone: [], bass: [], sfx: [], vocals: [] };
    function theme(t, list, shift, v, major) { (major ? THEME_MAJOR : THEME).forEach(function (bar, i) { bar.forEach(function (n) { list.push({ t: t + i * 4 + n[0] / 2, d: n[1] / 2 * 0.95, midi: n[2] + (shift || 0), v: v }); }); }); }
    function chord(t, ch, d, v, list) { (list || S.strings).push({ t: t, d: d, notes: CH[ch][1], v: v }); }
    function choir(t, ch, d, v, shift) { S.choir.push({ t: t, d: d, notes: CH[ch][1].map(function (m) { return m + (shift || 0); }), v: v }); }
    function timp(t, v, roll) {
      if (roll) for (var i = 0; i < 16; i++) S.drums.push({ t: t + i * 0.25, type: "pauke", v: v * (0.3 + i / 22) });
      else S.drums.push({ t: t, type: "pauke", v: v });
    }
    function march(t, v) {
      S.drums.push({ t: t, type: "trommel", v: v }, { t: t + 1.5, type: "trommel", v: v * 0.7 }, { t: t + 2, type: "trommel", v: v }, { t: t + 3, type: "tom", v: v * 0.7 }, { t: t + 3.5, type: "tom", v: v * 0.6 });
    }
    function battle(t, v) {
      [0, 0.75, 1.5, 2, 2.75, 3.5].forEach(function (o, i) { S.drums.push({ t: t + o, type: i % 3 === 2 ? "tom" : "trommel", v: v * (i % 2 ? 0.75 : 1) }); });
      S.drums.push({ t: t + 1, type: "becken", v: v * 0.25 }, { t: t + 3, type: "becken", v: v * 0.25 });
    }
    function ost(t, ch, v) { var r = CH[ch][0] + 12; for (var i = 0; i < 16; i++) S.strings.push({ t: t + i * 0.25, d: 0.22, notes: [r + OSTINATO[i]], v: v, short: true }); }
    function harp(t, ch, v) { var ns = CH[ch][1]; [0, 1, 2, 3, 2, 1].forEach(function (k, i) { S.harp.push({ t: t + i * 0.5, d: 1.5, midi: k === 3 ? ns[0] + 12 : ns[k], v: v }); }); }
    var b, t, ch, prog = ["Dm", "Bb", "F", "A"];

    // Titel: Bordun, Paukenwirbel, Chor, dann die Fanfare
    for (b = 0; b < 6; b++) {
      t = at("titel", b);
      S.drone.push({ t: t, d: 4, midi: 26, v: 0.8 });
      choir(t, b < 4 ? "Dm" : prog[b % 4], 4, 0.4 + b * 0.08);
      if (b === 3) timp(t, 0.8, true);
    }
    S.sfx.push({ t: at("titel", 1, 0), type: "donner" }, { t: at("titel", 3, 2), type: "donner" }, { t: at("titel", 3, 0), type: "fluegel", d: 6 });
    [[0, 1, 62], [1, 0.5, 69], [1.5, 0.5, 69], [2, 2, 74]].forEach(function (n) { S.brass.push({ t: at("titel", 4) + n[0], d: n[1], midi: n[2], v: 1 }); S.brass.push({ t: at("titel", 4) + n[0], d: n[1], midi: n[2] - 12, v: 0.8 }); });
    timp(at("titel", 4), 1); timp(at("titel", 5), 0.9);
    chord(at("titel", 4), "Dm", 8, 0.6);

    // Zauberer: Harfe, geheimnisvoller Chor, die Vision in der Kristallkugel
    for (b = 0; b < 8; b++) {
      t = at("zauberer", b); ch = ["Dm", "Gm", "Bb", "A"][b % 4];
      harp(t, ch, 0.7); harp(t + 3, ch, 0.5);
      S.bass.push({ t: t, d: 3.8, midi: CH[ch][0] + 12, v: 0.4 });
      if (b >= 4) choir(t, ch, 4, 0.55);
    }
    S.sfx.push({ t: at("zauberer", 4), type: "magie" }, { t: at("zauberer", 6), type: "magie" });
    timp(at("zauberer", 7, 2), 0.7);

    // Drache: tiefe Bläser, das Auge öffnet sich, Brüllen, Flügelschläge, Feuer
    for (b = 0; b < 10; b++) {
      t = at("drache", b); ch = ["Dm", "Dm", "Bb", "A"][b % 4];
      S.drone.push({ t: t, d: 4, midi: 26, v: 0.9 });
      if (b >= 2) { S.brass.push({ t: t, d: 3.5, midi: CH[ch][0] + 12, v: 0.8 }); timp(t, 0.9); timp(t + 2.5, 0.6); }
      if (b >= 4) choir(t, ch, 4, 0.7);
      if (b >= 6) { ost(t, ch, 0.55); }
    }
    S.sfx.push({ t: at("drache", 2, 0), type: "bruellen" }, { t: at("drache", 4, 0), type: "fluegel", d: 8 }, { t: at("drache", 6, 0), type: "feuer", d: 6 }, { t: at("drache", 8, 0), type: "feuer", d: 5 }, { t: at("drache", 9, 2), type: "bruellen" });

    // Helden: das Heldenthema in den Bläsern, Marschtrommeln, Wind
    for (b = 0; b < 12; b++) {
      t = at("helden", b); ch = prog[b % 4];
      chord(t, ch, 4, b < 4 ? 0.4 : 0.55); S.bass.push({ t: t, d: 1.8, midi: CH[ch][0] + 12, v: 0.7 }, { t: t + 2, d: 1.8, midi: CH[ch][0] + 12, v: 0.6 });
      if (b >= 4) march(t, 0.85);
      if (b % 4 === 0) S.sfx.push({ t: t, type: "wind", d: 8 });
      if (b >= 8) choir(t, ch, 4, 0.5);
    }
    theme(at("helden", 0), S.brass, 0, 0.75); theme(at("helden", 4), S.brass, 0, 0.9); theme(at("helden", 8), S.brass, 12, 0.85); theme(at("helden", 8), S.brass, 0, 0.6);
    S.sfx.push({ t: at("helden", 8, 0), type: "magie" });
    S.vocals.push({ t: at("helden", 6, 0), d: 1.2, midi: 69, cat: 1, word: "Für Eldor!" });

    // Kampf: Ostinato, Schlachttrommeln, Chor-Stöße, Feuer gegen Schild, Blitz, Axt
    for (b = 0; b < 14; b++) {
      t = at("kampf", b); ch = ["Dm", "Bb", "C", "A"][b % 4];
      ost(t, ch, 0.8); battle(t, 1);
      S.bass.push({ t: t, d: 0.9, midi: CH[ch][0], v: 1 }, { t: t + 2, d: 0.9, midi: CH[ch][0], v: 0.9 });
      if (b % 2 === 0) { choir(t, ch, 1.5, 0.9); choir(t + 2, ch, 1.5, 0.7); }
    }
    theme(at("kampf", 4), S.brass, 0, 0.9); theme(at("kampf", 8), S.brass, 12, 0.85);
    S.sfx.push({ t: at("kampf", 1, 0), type: "feuer", d: 7 }, { t: at("kampf", 1, 2), type: "schild" }, { t: at("kampf", 4, 0), type: "blitz" }, { t: at("kampf", 6, 2), type: "klirr" },
      { t: at("kampf", 7, 0), type: "bruellen" }, { t: at("kampf", 9, 0), type: "sprung" }, { t: at("kampf", 11, 0), type: "bruellen" }, { t: at("kampf", 12, 0), type: "magie" }, { t: at("kampf", 13, 0), type: "bann", d: 4 });
    S.vocals.push({ t: at("kampf", 6, 0), d: 1.2, midi: 50, cat: 0, word: "HAAAA!" }, { t: at("kampf", 12, 0), d: 1.4, midi: 55, cat: 2, word: "Fluch, weiche!" });

    // Wende: der Fluch ist gebrochen – Harfe und Chor in Dur
    for (b = 0; b < 5; b++) {
      t = at("wende", b); ch = ["F", "C", "Bb", "F", "A"][b];
      harp(t, ch, 1); choir(t, ch, 4, 0.9); chord(t, ch, 4, 0.55);
    }
    S.sfx.push({ t: at("wende", 0), type: "glanz" }, { t: at("wende", 3, 0), type: "schnurren" });

    // Finale: Heldenthema in D-Dur, alle Instrumente
    for (b = 0; b < 10; b++) {
      t = at("finale", b); ch = ["D", "G", "D", "A"][b % 4];
      if (b < 9) { chord(t, ch, 4, 0.6); choir(t, ch, 4, 0.7); march(t, 0.9); S.bass.push({ t: t, d: 1.8, midi: CH[ch][0] + 12, v: 0.8 }, { t: t + 2, d: 1.8, midi: CH[ch][0] + 12, v: 0.7 }); }
      if (b % 4 === 0) S.drums.push({ t: t, type: "becken", v: 0.8 });
    }
    theme(at("finale", 0), S.brass, 0, 1, true); theme(at("finale", 4), S.brass, 12, 0.9, true); theme(at("finale", 4), S.brass, 0, 0.6, true);
    S.sfx.push({ t: at("finale", 0), type: "fluegel", d: 32 });
    t = at("finale", 9);
    [[0, 62], [0, 66], [0, 69], [0, 74]].forEach(function (n) { S.brass.push({ t: t, d: 3.5, midi: n[1], v: 0.9 }); });
    choir(t, "D", 4, 0.9); chord(t, "D", 4, 0.7); timp(t, 1, false); timp(t - 1, 0.7, false); S.drums.push({ t: t, type: "becken", v: 1 });
    S.drone.push({ t: t, d: 4, midi: 26, v: 0.8 });

    Object.keys(S).forEach(function (k) { S[k].sort(function (x, y) { return x.t - y.t; }); });
    return S;
  }
  var song = build();

  function at2(time) {
    var beat = time / BEAT, bar = Math.floor(beat / BAR), s, i;
    if (bar >= TOTAL_BARS) return { section: "ende", index: SECTIONS.length, bar: bar - TOTAL_BARS, beat: beat, inBar: beat % BAR, progress: 1 };
    for (i = 0; i < SECTIONS.length; i++) if (bar < SECTIONS[i].start + SECTIONS[i].bars) { s = SECTIONS[i]; break; }
    return { section: s.name, index: i, bar: bar - s.start, beat: beat, inBar: beat % BAR, progress: (beat / BAR - s.start) / s.bars };
  }
  function sectionStart(name) { return sec(name).start * BAR * BEAT; }

  // ---------- Klangerzeugung ----------

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function tanhCurve(drive, ceiling) {
    var n = 2048, c = new Float32Array(n), norm = Math.tanh(drive);
    for (var i = 0; i < n; i++) c[i] = Math.tanh((i / (n - 1) * 2 - 1) * drive) / norm * ceiling;
    return c;
  }
  function makeNoise(ctx, seconds) {
    var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 41;
    for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    return b;
  }
  function makeImpulse(ctx, seconds) {
    var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, n, ctx.sampleRate), s = 13;
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 2.2); } }
    return b;
  }
  function pluckData(sampleRate, freq, seconds, seed) {
    if (global.Musik && global.Musik.makePluck) return global.Musik.makePluck(sampleRate, freq, seconds, seed);
    var n = Math.floor(sampleRate * seconds), out = new Float32Array(n), period = Math.max(2, Math.round(sampleRate / freq)), buf = new Float32Array(period), s = seed || 1, idx = 0;
    for (var i = 0; i < period; i++) { s = (s * 16807) % 2147483647; buf[i] = (s / 2147483647) * 2 - 1; }
    for (var t = 0; t < n; t++) { var nx = (idx + 1) % period, v = buf[idx]; out[t] = v; buf[idx] = 0.997 * 0.5 * (v + buf[nx]); idx = nx; }
    return out;
  }
  var VOWELS = { a: [800, 1150, 2900], o: [450, 800, 2830], e: [400, 1700, 2600], i: [300, 2200, 3000], u: [350, 700, 2700], "ü": [300, 1700, 2200] };

  function createEngine(ctx, destination, startTime, fromBeat) {
    var master = ctx.createGain(), limiter = ctx.createWaveShaper();
    master.gain.value = 1.1; limiter.curve = tanhCurve(1.5, 0.9);
    master.connect(limiter).connect(destination);
    var reverb = ctx.createConvolver(), wet = ctx.createGain();
    reverb.buffer = makeImpulse(ctx, 3.2); wet.gain.value = 0.5; reverb.connect(wet).connect(master);
    function bus(v, rev, pan) {
      var g = ctx.createGain(); g.gain.value = v;
      var out = g;
      if (pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
      out.connect(master);
      if (rev) { var r = ctx.createGain(); r.gain.value = rev; out.connect(r).connect(reverb); }
      return g;
    }
    var brassBus = bus(0.22, 0.35, -0.15), strBus = bus(0.14, 0.4, 0.25), choirBus = bus(0.3, 0.6, 0), harpBus = bus(0.45, 0.5, 0.3), drumBus = bus(0.4, 0.3, 0),
      droneBus = bus(0.08, 0.5, 0), bassBus = bus(0.25, 0.15, 0), fxBus = bus(0.45, 0.4, 0), voxBus = bus(0.5, 0.4, 0);
    var noise = makeNoise(ctx, 3), plucks = {};

    function beatTime(b, i) { return startTime + b * BEAT + (hash(b * 3.7 + i) - 0.5) * 0.01; }
    function osc(t, type, f, len, dest, vol, a, rel, detune) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (a || 0.01)); g.gain.setTargetAtTime(0.0001, t + len, rel || 0.08);
      o.connect(g).connect(dest); o.start(t); o.stop(t + len + (rel || 0.08) * 6);
      return o;
    }
    function noiseHit(t, vol, type, freq, len, q, dest) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f).connect(g).connect(dest || drumBus); src.start(t, (t * 0.7) % 2); src.stop(t + len + 0.02);
      return { f: f, g: g };
    }
    function sweep(t, type, f0, f1, len, vol, dest) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.8);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g).connect(dest || drumBus); o.start(t); o.stop(t + len + 0.02);
    }
    function pluck(t, midi, len, vol) {
      if (!plucks[midi]) { var d = pluckData(ctx.sampleRate, midiToFreq(midi), 3, midi * 71 + 3), b = ctx.createBuffer(1, d.length, ctx.sampleRate); b.getChannelData(0).set(d); plucks[midi] = b; }
      var src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      src.buffer = plucks[midi]; f.type = "lowpass"; f.frequency.value = 2600;
      g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t + len, 0.3);
      src.connect(f).connect(g).connect(harpBus); src.start(t); src.stop(t + len + 1.5);
    }
    function drum(t, e) {
      if (e.type === "pauke") { sweep(t, "sine", 110, 70, 0.9, e.v); noiseHit(t, 0.15 * e.v, "lowpass", 400, 0.3); }
      else if (e.type === "trommel") { sweep(t, "sine", 90, 50, 0.4, e.v * 0.9); noiseHit(t, 0.3 * e.v, "bandpass", 600, 0.15, 0.8); }
      else if (e.type === "tom") { sweep(t, "sine", 180, 110, 0.3, e.v * 0.7); noiseHit(t, 0.15 * e.v, "bandpass", 900, 0.1, 1); }
      else if (e.type === "becken") { noiseHit(t, 0.35 * e.v, "highpass", 4500, 2.2); noiseHit(t, 0.12 * e.v, "bandpass", 8000, 1.5, 2); }
    }
    /** Blechbläser: Sägezähne mit sich öffnendem Filter */
    function brass(t, e) {
      var d = e.d * BEAT, f = ctx.createBiquadFilter(), fr = midiToFreq(e.midi);
      f.type = "lowpass"; f.Q.value = 1.5; f.frequency.setValueAtTime(fr * 1.5, t); f.frequency.linearRampToValueAtTime(fr * 6 + 800, t + 0.12); f.frequency.setTargetAtTime(fr * 3.5 + 400, t + 0.2, 0.3);
      f.connect(brassBus);
      [-8, 8].forEach(function (dt) { var o = osc(t, "sawtooth", fr, d, f, 0.5 * e.v, 0.06, 0.12, dt); if (d > 0.5) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5; lg.gain.setValueAtTime(0, t + 0.3); lg.gain.linearRampToValueAtTime(fr * 0.01, t + 0.6); l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + d + 0.2); } });
    }
    function strings(t, e) {
      var d = e.d * BEAT, f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = e.short ? 2200 : 2800; f.connect(strBus);
      e.notes.forEach(function (m) { (e.short ? [0, 10] : [-12, 0, 12]).forEach(function (dt) { osc(t, "sawtooth", midiToFreq(m), d, f, 0.3 * e.v, e.short ? 0.01 : 0.25, e.short ? 0.04 : 0.4, dt); }); });
    }
    /** Chor auf „Aah“: drei Formant-Filter über verstimmten Sägezähnen */
    function choir(t, e) {
      var d = e.d * BEAT, src = ctx.createGain(), out = ctx.createGain();
      e.notes.forEach(function (m) { [-10, 0, 10].forEach(function (dt) { var o = osc(t, "sawtooth", midiToFreq(m - 12), d, src, 0.25, 0.3, 0.5, dt); }); });
      VOWELS.a.forEach(function (fr, k) { var bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = "bandpass"; bp.frequency.value = fr; bp.Q.value = [5, 8, 10][k]; g.gain.value = [1, 0.6, 0.25][k]; src.connect(bp); bp.connect(g).connect(out); });
      out.gain.value = e.v; out.connect(choirBus);
    }
    function voice(t, n) {
      var d = n.d * BEAT, f = midiToFreq(n.midi), o = ctx.createOscillator(), o2 = ctx.createOscillator(), src = ctx.createGain(), out = ctx.createGain(), o2g = ctx.createGain();
      o.type = "sawtooth"; o2.type = "square"; o2g.gain.value = n.cat === 0 ? 0.5 : 0.15;
      [o.frequency, o2.frequency].forEach(function (p, i) { var m = i ? 0.5 : 1; p.setValueAtTime(f * 0.9 * m, t); p.exponentialRampToValueAtTime(f * m, t + 0.08); p.exponentialRampToValueAtTime(f * 0.85 * m, t + d); });
      o.connect(src); o2.connect(o2g).connect(src);
      var vs = n.word.toLowerCase().replace(/[^aeiouü]/g, "").split(""); if (!vs.length) vs = ["a"];
      var sc = n.cat === 1 ? 1.15 : n.cat === 2 ? 0.9 : 0.85;
      [0, 1, 2].forEach(function (k) {
        var bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = "bandpass"; bp.Q.value = [6, 9, 11][k];
        vs.forEach(function (v, j) { var fr = VOWELS[v][k] * sc, tt = t + j / Math.max(1, vs.length - 1) * d * 0.9; if (j === 0) bp.frequency.setValueAtTime(fr, tt); else bp.frequency.linearRampToValueAtTime(fr, tt); });
        g.gain.value = [1, 0.7, 0.3][k]; src.connect(bp); bp.connect(g).connect(out);
      });
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.9, t + 0.04); out.gain.setTargetAtTime(0.0001, t + d - 0.1, 0.06);
      out.connect(voxBus); [o, o2].forEach(function (x) { x.start(t); x.stop(t + d + 0.3); });
    }
    function fx(t, e) {
      var d = (e.d || 1) * BEAT, i, n;
      if (e.type === "donner") { noiseHit(t, 0.9, "lowpass", 280, 2.5, 0, fxBus); noiseHit(t, 0.5, "lowpass", 1800, 0.25, 0, fxBus); }
      else if (e.type === "fluegel") { for (i = 0; i < e.d / 2; i++) { n = noiseHit(t + i * 2 * BEAT, 0.35, "lowpass", 300, 0.5, 0, fxBus); n.f.frequency.linearRampToValueAtTime(700, t + i * 2 * BEAT + 0.25); } }
      else if (e.type === "bruellen") {
        var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), ws = ctx.createWaveShaper();
        o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + 0.4); o.frequency.exponentialRampToValueAtTime(45, t + 1.8);
        ws.curve = tanhCurve(4, 1); f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 1.2;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
        o.connect(ws).connect(f).connect(g).connect(fxBus); o.start(t); o.stop(t + 2);
        noiseHit(t, 0.4, "bandpass", 900, 1.6, 1.5, fxBus);
      }
      else if (e.type === "feuer") { n = noiseHit(t, 0.001, "bandpass", 1200, d, 0.7, fxBus); n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.001, t); n.g.gain.exponentialRampToValueAtTime(0.5, t + 0.3); n.g.gain.setValueAtTime(0.5, t + d * 0.7); n.g.gain.exponentialRampToValueAtTime(0.001, t + d); for (i = 0; i < d * 12; i++) noiseHit(t + hash(i + t) * d, 0.15, "highpass", 3000, 0.03, 0, fxBus); }
      else if (e.type === "magie" || e.type === "glanz") { for (i = 0; i < 16; i++) osc(t + i * 0.07, "sine", midiToFreq(79 + [0, 3, 7, 10, 12, 15, 19][i % 7]), 0.1, fxBus, 0.07, 0.005, 0.3); }
      else if (e.type === "schild") { [523, 1197, 1871, 2603].forEach(function (f) { osc(t, "sine", f, 0.02, fxBus, 0.18, 0.002, 0.4); }); noiseHit(t, 0.4, "highpass", 2500, 0.2, 0, fxBus); }
      else if (e.type === "klirr") { [740, 1690, 2410, 3330].forEach(function (f) { osc(t, "sine", f, 0.02, fxBus, 0.2, 0.002, 0.35); }); noiseHit(t, 0.5, "highpass", 3000, 0.15, 0, fxBus); }
      else if (e.type === "blitz") { noiseHit(t, 0.9, "highpass", 1500, 0.4, 0, fxBus); noiseHit(t + 0.05, 0.8, "lowpass", 250, 2, 0, fxBus); }
      else if (e.type === "sprung") { n = noiseHit(t, 0.3, "bandpass", 400, 0.6, 2, fxBus); n.f.frequency.exponentialRampToValueAtTime(2000, t + 0.5); }
      else if (e.type === "bann") { for (i = 0; i < 4; i++) sweep(t + i * 0.3, "sine", 300 + i * 100, 1200 + i * 200, 1.2, 0.1, fxBus); }
      else if (e.type === "wind") { n = noiseHit(t, 0.001, "bandpass", 500, d, 1.5, fxBus); n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.001, t); n.g.gain.exponentialRampToValueAtTime(0.12, t + d * 0.4); n.g.gain.exponentialRampToValueAtTime(0.001, t + d); n.f.frequency.linearRampToValueAtTime(900, t + d * 0.5); }
      else if (e.type === "schnurren") { for (i = 0; i < 10; i++) sweep(t + i * 0.12, "sawtooth", 40, 34, 0.1, 0.12, fxBus); }
    }
    var tracks = [
      { list: song.drums, play: drum },
      { list: song.brass, play: brass },
      { list: song.strings, play: strings },
      { list: song.choir, play: choir },
      { list: song.harp, play: function (t, e) { pluck(t, e.midi, e.d * BEAT, e.v * 0.8); } },
      { list: song.drone, play: function (t, e) { var dd = e.d * BEAT; [-6, 0, 6].forEach(function (dt) { osc(t, "sawtooth", midiToFreq(e.midi), dd, (function () { var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 220; f.connect(droneBus); return f; })(), 0.4 * e.v, 0.5, 0.6, dt); }); } },
      { list: song.bass, play: function (t, e) { osc(t, "triangle", midiToFreq(e.midi), e.d * BEAT, bassBus, 0.6 * e.v, 0.01, 0.1); } },
      { list: song.vocals, play: voice },
      { list: song.sfx, play: fx }
    ];
    tracks.forEach(function (tr) { tr.i = 0; while (tr.i < tr.list.length && tr.list[tr.i].t < (fromBeat || 0)) tr.i++; });
    return {
      master: master,
      scheduleUntil: function (until) {
        tracks.forEach(function (tr, ti) {
          while (tr.i < tr.list.length) {
            var e = tr.list[tr.i], t = beatTime(e.t, ti);
            if (t >= until) break;
            if (t >= 0) tr.play(t, e);
            tr.i++;
          }
        });
      }
    };
  }

  var ctx = null, engine = null, timer = null, playing = false, startTime = 0;
  function start(offset) {
    offset = offset || 0;
    ctx = global.Musik ? global.Musik.getContext() : new (global.AudioContext || global.webkitAudioContext)();
    if (!ctx || playing) return;
    if (ctx.state !== "running") ctx.resume();
    startTime = ctx.currentTime + 0.12 - offset;
    engine = createEngine(ctx, ctx.destination, startTime, offset / BEAT);
    timer = setInterval(function () { if (ctx.state === "running") engine.scheduleUntil(ctx.currentTime + 0.3); }, 40);
    engine.scheduleUntil(ctx.currentTime + 0.3);
    playing = true;
  }
  function stop() {
    if (!playing) return;
    clearInterval(timer);
    var g = engine.master.gain, now = ctx.currentTime, old = engine;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.3);
    setTimeout(function () { old.master.disconnect(); }, 600);
    engine = null; playing = false;
  }
  function time() { return playing ? Math.max(0, ctx.currentTime - startTime) : null; }
  function render(seconds, sampleRate, from) {
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100);
    from = from || 0;
    createEngine(off, off.destination, -from, from / BEAT).scheduleUntil(seconds);
    return off.startRendering();
  }

  global.DrachenMusik = {
    BPM: BPM, BEAT: BEAT, BAR: BAR, SECTIONS: SECTIONS, TOTAL_BARS: TOTAL_BARS, DURATION: DURATION, THEME: THEME, THEME_MAJOR: THEME_MAJOR,
    song: song, at: at2, sectionStart: sectionStart, start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
