/**
 * RegenkatzeMusik – Noir-Jazz für den Comic „Die Katze im Regen“, eigene
 * Komposition, live per Web Audio: Kontrabass (gezupfte Saite) im Walking-Bass,
 * Besen und Ride-Becken im Swing, Klavier-Akkorde und eine gestopfte Trompete.
 * Jede Comic-Seite hat 8 Takte; bei der Verfolgung wird es doppelt so schnell,
 * im Epilog wechselt die Musik von d-Moll nach D-Dur.
 */
(function (global) {
  "use strict";

  var BPM = 104, BEAT = 60 / BPM, BAR = 4, SWING = 0.66;
  var SECTIONS = [{ name: "titel", bars: 8 }, { name: "fall", bars: 8 }, { name: "spuren", bars: 8 }, { name: "jagd", bars: 8 }, { name: "enthuellung", bars: 8 }, { name: "epilog", bars: 8 }];
  (function () { var b = 0; SECTIONS.forEach(function (s) { s.start = b; b += s.bars; }); })();
  var TOTAL_BARS = SECTIONS.reduce(function (n, s) { return n + s.bars; }, 0);
  var DURATION = TOTAL_BARS * BAR * BEAT + 3;
  function sec(name) { return SECTIONS.filter(function (s) { return s.name === name; })[0]; }
  function at(name, bar, beat) { return (sec(name).start + bar) * BAR + (beat || 0); }
  // Akkorde: Bass-Grundton, Klavier-Voicing, Walking-Linie (Halbtöne über dem Grundton)
  var CH = {
    Dm9: [38, [65, 69, 72, 76], [0, 3, 7, 8]], Bb13: [34, [62, 67, 68, 72], [0, 4, 7, 9]], Gm9: [43, [58, 62, 65, 69], [0, 3, 5, 6]], A7: [33, [61, 65, 67, 70], [0, 4, 7, 6]],
    Dmaj9: [38, [64, 66, 69, 73], [0, 4, 7, 9]], G13: [43, [59, 64, 65, 69], [0, 4, 7, 5]], Em9: [40, [62, 66, 67, 71], [0, 3, 7, 6]], A13: [33, [61, 66, 67, 71], [0, 4, 7, 8]]
  };
  var MINOR = ["Dm9", "Bb13", "Gm9", "A7"], MAJOR = ["Dmaj9", "G13", "Em9", "A13"];
  // Trompeten-Thema (8 Takte): [Schlag, Länge, Ton]
  var THEME = [[0, 1.5, 74], [1.5, 0.5, 77], [2, 1, 81], [3, 1, 79], [4, 1.5, 77], [5.5, 0.5, 76], [6, 2, 74], [8, 0.5, 73], [8.5, 0.5, 76], [9, 1, 79], [10, 1, 82], [11, 1, 81], [12, 4, 81],
    [16, 1.5, 74], [17.5, 0.5, 77], [18, 1, 81], [19, 1, 84], [20, 1, 82], [21, 1, 81], [22, 2, 79], [24, 1, 77], [25, 1, 76], [26, 1, 73], [27, 1, 76], [28, 4, 74]];
  function hash(n) { var h = Math.sin(n * 91.7 + 13.1) * 43758.5453; return h - Math.floor(h); }
  function sw(b) { var f = b - Math.floor(b); return Math.floor(b) + (Math.abs(f - 0.5) < 0.01 ? SWING : f); }   // Swing-Achtel

  function build() {
    var S = { bass: [], piano: [], horn: [], drums: [], sfx: [], vocals: [] };
    function walkBar(t, ch, v, dbl) {
      var c = CH[ch];
      if (dbl) for (var i = 0; i < 8; i++) S.bass.push({ t: t + i / 2, d: 0.45, midi: c[0] + c[2][i % 4] + (i >= 4 ? 12 : 0), v: v });
      else c[2].forEach(function (o, i) { S.bass.push({ t: t + i, d: 0.95, midi: c[0] + o + (i === 3 && hash(t) > 0.5 ? 12 : 0), v: v }); });
    }
    function swingDrums(t, v, dbl) {
      [0, 1, 1.5, 2, 3, 3.5].forEach(function (o) { S.drums.push({ t: t + sw(o), type: "ride", v: v * (o % 1 ? 0.6 : 1) }); });
      if (dbl) { [0, 1, 2, 3].forEach(function (o) { S.drums.push({ t: t + o, type: "kick", v: v }); }); [1, 3].forEach(function (o) { S.drums.push({ t: t + o, type: "snare", v: v }); }); for (var i = 0; i < 8; i++) S.drums.push({ t: t + i / 2, type: "ride", v: v * 0.5 }); }
      else { [1, 3].forEach(function (o) { S.drums.push({ t: t + o, type: "besen", v: v }); }); [0, 2].forEach(function (o) { S.drums.push({ t: t + o, type: "kick", v: v * 0.35 }); }); }
    }
    function comp(t, ch, v) { [[0, 1.2], [1 + SWING, 0.4], [2.5 + 0.16, 0.8]].forEach(function (p, i) { if (i === 1 && hash(t * 3) > 0.6) return; S.piano.push({ t: t + p[0], d: p[1], notes: CH[ch][1], v: v * (i ? 0.75 : 1) }); }); }
    function theme(t, shift, v, from, to) { THEME.forEach(function (n) { if (n[0] >= (from || 0) && n[0] < (to || 99)) S.horn.push({ t: t + sw(n[0]) - (from || 0), d: n[1] * 0.92, midi: n[2] + (shift || 0), v: v }); }); }
    var b, t, ch;
    // Seite 1: Titel – Regen, Bass und Besen, die Trompete setzt ein
    for (b = 0; b < 8; b++) { t = at("titel", b); ch = MINOR[b % 4]; walkBar(t, ch, 0.8); swingDrums(t, 0.6); if (b >= 4) comp(t, ch, 0.5); }
    S.sfx.push({ t: at("titel", 0), type: "regen", d: 32 * 6 }, { t: at("titel", 0, 2), type: "donner" });
    theme(at("titel", 2), 0, 0.7, 0, 24);
    // Seite 2: der Fall – Thema vollständig
    for (b = 0; b < 8; b++) { t = at("fall", b); ch = MINOR[b % 4]; walkBar(t, ch, 0.85); swingDrums(t, 0.7); comp(t, ch, 0.6); }
    theme(at("fall", 0), 0, 0.8);
    S.sfx.push({ t: at("fall", 0, 0), type: "glas" });
    S.vocals.push({ t: at("fall", 2, 0), d: 1.6, midi: 50, cat: 1, word: "Die Kette meiner Frau – fort!" }, { t: at("fall", 5, 0), d: 1.4, midi: 60, cat: 0, word: "Ich übernehme den Fall." });
    // Seite 3: Spuren – sparsamer, Klavier allein, Pizzicato-Bass
    for (b = 0; b < 8; b++) { t = at("spuren", b); ch = MINOR[b % 4]; S.bass.push({ t: t, d: 1.8, midi: CH[ch][0], v: 0.7 }, { t: t + 2, d: 1.8, midi: CH[ch][0] + 7, v: 0.6 }); comp(t, ch, 0.55); S.drums.push({ t: t, type: "ride", v: 0.35 }, { t: t + 2, type: "ride", v: 0.35 }); }
    theme(at("spuren", 4), -12, 0.55, 0, 16);
    S.sfx.push({ t: at("spuren", 0, 0), type: "schritte", d: 6 });
    S.vocals.push({ t: at("spuren", 3, 0), d: 1.8, midi: 47, cat: 2, word: "Ich war's nicht!" });
    // Seite 4: Verfolgung über die Dächer – doppeltes Tempo
    for (b = 0; b < 8; b++) { t = at("jagd", b); ch = MINOR[b % 4]; walkBar(t, ch, 1, true); swingDrums(t, 0.9, true); [0, 1.5, 3].forEach(function (o) { S.horn.push({ t: t + o, d: 0.35, midi: CH[ch][1][3] + 12, v: 0.8 }); }); }
    S.sfx.push({ t: at("jagd", 0, 0), type: "wusch" }, { t: at("jagd", 2, 0), type: "wusch" }, { t: at("jagd", 4, 0), type: "donner" }, { t: at("jagd", 6, 2), type: "wusch" });
    S.vocals.push({ t: at("jagd", 2, 2), d: 0.8, midi: 64, cat: 0, word: "HALT!" });
    // Seite 5: Enthüllung – alles hält an, leises Klavier, Miauen
    for (b = 0; b < 8; b++) { t = at("enthuellung", b); ch = ["Dm9", "Gm9", "Bb13", "A7", "Dm9", "Gm9", "Dmaj9", "Dmaj9"][b]; S.piano.push({ t: t, d: 3.5, notes: CH[ch][1], v: 0.5 }); if (b >= 2) S.bass.push({ t: t, d: 3.5, midi: CH[ch][0], v: 0.5 }); }
    S.sfx.push({ t: at("enthuellung", 1, 0), type: "miau" }, { t: at("enthuellung", 2, 2), type: "miau-klein" }, { t: at("enthuellung", 3, 0), type: "miau-klein" });
    S.vocals.push({ t: at("enthuellung", 5, 0), d: 2.4, midi: 62, cat: 0, word: "Du bist also mein Juwelendieb …" });
    // Seite 6: Epilog – das Thema in Dur
    for (b = 0; b < 8; b++) { t = at("epilog", b); ch = MAJOR[b % 4]; if (b < 7) { walkBar(t, ch, 0.8); swingDrums(t, 0.6); comp(t, ch, 0.6); } }
    theme(at("epilog", 0), 0, 0.8, 0, 24);
    S.vocals.push({ t: at("epilog", 1, 0), d: 1.6, midi: 52, cat: 1, word: "Sie dürfen alle bleiben!" });
    S.sfx.push({ t: at("epilog", 3, 0), type: "schnurren" });
    t = at("epilog", 7); S.piano.push({ t: t, d: 4, notes: [62, 66, 69, 73, 76], v: 0.8 }); S.bass.push({ t: t, d: 4, midi: 38, v: 0.9 }); S.horn.push({ t: t, d: 3.5, midi: 74, v: 0.7 }); S.drums.push({ t: t, type: "ride", v: 0.8 });
    // in Dur heißt die Terz fis statt f (Thema anpassen)
    S.horn.forEach(function (n) { if (n.t >= at("epilog", 0) && n.midi % 12 === 5) n.midi += 1; if (n.t >= at("epilog", 0) && n.midi % 12 === 0) n.midi += 1; });
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

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function tanhCurve(drive, ceiling) { var n = 2048, c = new Float32Array(n), norm = Math.tanh(drive); for (var i = 0; i < n; i++) c[i] = Math.tanh((i / (n - 1) * 2 - 1) * drive) / norm * ceiling; return c; }
  function makeNoise(ctx, seconds) { var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 61; for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } return b; }
  function makeImpulse(ctx, seconds) { var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, n, ctx.sampleRate), s = 19; for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 3); } } return b; }
  function pluckData(sr, f, sec2, seed) {
    if (global.Musik && global.Musik.makePluck) return global.Musik.makePluck(sr, f, sec2, seed);
    var n = Math.floor(sr * sec2), out = new Float32Array(n), period = Math.max(2, Math.round(sr / f)), buf = new Float32Array(period), s = seed || 1, idx = 0;
    for (var i = 0; i < period; i++) { s = (s * 16807) % 2147483647; buf[i] = (s / 2147483647) * 2 - 1; }
    for (var t = 0; t < n; t++) { var nx = (idx + 1) % period, v = buf[idx]; out[t] = v; buf[idx] = 0.994 * 0.5 * (v + buf[nx]); idx = nx; }
    return out;
  }
  var VOWELS = { a: [800, 1150, 2900], o: [450, 800, 2830], e: [400, 1700, 2600], i: [300, 2200, 3000], u: [350, 700, 2700], "ü": [300, 1700, 2200], "ä": [650, 1700, 2600] };

  function createEngine(ctx, destination, startTime, fromBeat) {
    var master = ctx.createGain(), limiter = ctx.createWaveShaper();
    master.gain.value = 1.15; limiter.curve = tanhCurve(1.4, 0.9); master.connect(limiter).connect(destination);
    var reverb = ctx.createConvolver(), wet = ctx.createGain(); reverb.buffer = makeImpulse(ctx, 1.8); wet.gain.value = 0.35; reverb.connect(wet).connect(master);
    function bus(v, rev, pan) { var g = ctx.createGain(); g.gain.value = v; var o = g; if (pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); o = p; } o.connect(master); if (rev) { var r = ctx.createGain(); r.gain.value = rev; o.connect(r).connect(reverb); } return g; }
    var bassBus = bus(0.55, 0.1, -0.1), pianoBus = bus(0.22, 0.3, 0.25), hornBus = bus(0.2, 0.4, -0.2), drumBus = bus(0.4, 0.2, 0.15), fxBus = bus(0.4, 0.3, 0), voxBus = bus(0.45, 0.3, 0);
    var noise = makeNoise(ctx, 3), plucks = {};
    function beatTime(b, i) { return startTime + b * BEAT + (hash(b * 4.1 + i) - 0.5) * 0.014; }
    function osc(t, type, f, len, dest, vol, a, rel, detune) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (a || 0.01)); g.gain.setTargetAtTime(0.0001, t + len, rel || 0.08); o.connect(g).connect(dest); o.start(t); o.stop(t + len + (rel || 0.08) * 6); return o; }
    function noiseHit(t, vol, type, freq, len, q, dest) { var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noise; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); src.connect(f).connect(g).connect(dest || drumBus); src.start(t, (t * 1.1) % 2); src.stop(t + len + 0.02); return { f: f, g: g }; }
    function sweep(t, type, f0, f1, len, vol, dest) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.8); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.connect(g).connect(dest || drumBus); o.start(t); o.stop(t + len + 0.02); }
    function bass(t, e) {
      if (!plucks[e.midi]) { var d = pluckData(ctx.sampleRate, midiToFreq(e.midi), 2, e.midi * 37 + 5), b = ctx.createBuffer(1, d.length, ctx.sampleRate); b.getChannelData(0).set(d); plucks[e.midi] = b; }
      var src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      src.buffer = plucks[e.midi]; f.type = "lowpass"; f.frequency.value = 900;
      g.gain.setValueAtTime(e.v, t); g.gain.setTargetAtTime(0, t + e.d * BEAT, 0.06);
      src.connect(f).connect(g).connect(bassBus); src.start(t); src.stop(t + e.d * BEAT + 0.5);
      osc(t, "sine", midiToFreq(e.midi), e.d * BEAT * 0.8, bassBus, 0.4 * e.v, 0.01, 0.08);
    }
    function piano(t, e) { e.notes.forEach(function (m, i) { var f = midiToFreq(m), d = e.d * BEAT; osc(t + i * 0.008, "triangle", f, 0.01, pianoBus, 0.4 * e.v, 0.004, d * 0.6); osc(t + i * 0.008, "sine", f * 2.003, 0.01, pianoBus, 0.15 * e.v, 0.003, d * 0.3); }); }
    /** gestopfte Trompete: Sägezahn durch einen engen „Cup-Mute“-Filter, Vibrato */
    function horn(t, e) {
      var d = e.d * BEAT, f = midiToFreq(e.midi), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1500, t + 0.08); bp.Q.value = 2.5; lp.type = "lowpass"; lp.frequency.value = 3500;
      bp.connect(lp).connect(hornBus);
      var o = osc(t, "sawtooth", f, d, bp, 0.7 * e.v, 0.03, 0.08);
      o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      if (d > 0.3) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t + 0.15); lg.gain.linearRampToValueAtTime(f * 0.012, t + 0.4); l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + d + 0.2); }
    }
    function drum(t, e) {
      if (e.type === "ride") { noiseHit(t, 0.12 * e.v, "highpass", 6500, 0.5); osc(t, "sine", 5200, 0.01, drumBus, 0.02 * e.v, 0.001, 0.2); }
      else if (e.type === "besen") { var n = noiseHit(t - 0.05, 0.001, "bandpass", 3000, 0.35, 0.8); n.g.gain.cancelScheduledValues(t - 0.05); n.g.gain.setValueAtTime(0.001, t - 0.05); n.g.gain.exponentialRampToValueAtTime(0.25 * e.v, t + 0.02); n.g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); }
      else if (e.type === "snare") { noiseHit(t, 0.35 * e.v, "bandpass", 2200, 0.15, 0.8); sweep(t, "triangle", 220, 160, 0.08, 0.2 * e.v); }
      else if (e.type === "kick") sweep(t, "sine", 110, 45, 0.25, 0.8 * e.v);
    }
    function voice(t, n) {
      var d = n.d * BEAT, f = midiToFreq(n.midi), o = ctx.createOscillator(), o2 = ctx.createOscillator(), src = ctx.createGain(), out = ctx.createGain(), o2g = ctx.createGain();
      o.type = "sawtooth"; o2.type = "square"; o2g.gain.value = n.cat === 2 ? 0.5 : 0.15;
      [o.frequency, o2.frequency].forEach(function (p, i) { var m = i ? 0.5 : 1; p.setValueAtTime(f * m, t); p.linearRampToValueAtTime(f * (1 + Math.sin(i) * 0.03) * m, t + d * 0.5); p.exponentialRampToValueAtTime(f * 0.85 * m, t + d); });
      o.connect(src); o2.connect(o2g).connect(src);
      var vs = n.word.toLowerCase().replace(/[^aeiouäü]/g, "").split("").slice(0, 8); if (!vs.length) vs = ["a"];
      var sc = n.cat === 0 ? 1.1 : 0.9;
      [0, 1, 2].forEach(function (k) { var bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = "bandpass"; bp.Q.value = [6, 9, 11][k]; vs.forEach(function (v, j) { var fr = VOWELS[v][k] * sc, tt = t + j / Math.max(1, vs.length - 1) * d * 0.9; if (j === 0) bp.frequency.setValueAtTime(fr, tt); else bp.frequency.linearRampToValueAtTime(fr, tt); }); g.gain.value = [1, 0.7, 0.3][k]; src.connect(bp); bp.connect(g).connect(out); });
      // Silben: die Lautstärke pulsiert mit den Vokalen
      out.gain.setValueAtTime(0.0001, t);
      vs.forEach(function (v, j) { var tt = t + j / vs.length * d; out.gain.exponentialRampToValueAtTime(0.7, tt + 0.03); out.gain.exponentialRampToValueAtTime(0.25, tt + d / vs.length * 0.85); });
      out.gain.setTargetAtTime(0.0001, t + d, 0.05);
      out.connect(voxBus); [o, o2].forEach(function (x) { x.start(t); x.stop(t + d + 0.3); });
    }
    function miau(t, high) {
      var o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter(), f0 = high ? 900 : 560;
      o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.3, t + 0.2); o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + 0.55);
      bp.type = "bandpass"; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1600, t + 0.25); bp.frequency.linearRampToValueAtTime(800, t + 0.55); bp.Q.value = 5;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(high ? 0.18 : 0.3, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(bp).connect(g).connect(fxBus); o.start(t); o.stop(t + 0.65);
    }
    function fx(t, e) {
      var d = (e.d || 1) * BEAT, n, i;
      if (e.type === "regen") { n = noiseHit(t, 0.001, "highpass", 2500, d, 0, fxBus); n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.001, t); n.g.gain.exponentialRampToValueAtTime(0.07, t + 2); n.g.gain.setValueAtTime(0.07, t + d - 8); n.g.gain.exponentialRampToValueAtTime(0.001, t + d); }
      else if (e.type === "donner") { noiseHit(t, 0.7, "lowpass", 250, 2.5, 0, fxBus); noiseHit(t, 0.3, "lowpass", 1500, 0.2, 0, fxBus); }
      else if (e.type === "glas") { for (i = 0; i < 14; i++) osc(t + hash(i) * 0.3, "sine", 2000 + hash(i * 3) * 4000, 0.01, fxBus, 0.08, 0.001, 0.15); noiseHit(t, 0.4, "highpass", 3000, 0.3, 0, fxBus); }
      else if (e.type === "schritte") { for (i = 0; i < e.d; i++) { noiseHit(t + i * BEAT, 0.2, "lowpass", 600, 0.08, 0, fxBus); noiseHit(t + i * BEAT, 0.08, "highpass", 3000, 0.05, 0, fxBus); } }
      else if (e.type === "wusch") { n = noiseHit(t, 0.4, "bandpass", 400, 0.5, 2, fxBus); n.f.frequency.exponentialRampToValueAtTime(3000, t + 0.4); }
      else if (e.type === "miau") miau(t, false);
      else if (e.type === "miau-klein") miau(t, true);
      else if (e.type === "schnurren") { for (i = 0; i < 16; i++) sweep(t + i * 0.1, "sawtooth", 38, 32, 0.09, 0.12, fxBus); }
    }
    var tracks = [{ list: song.bass, play: bass }, { list: song.piano, play: piano }, { list: song.horn, play: horn }, { list: song.drums, play: drum }, { list: song.vocals, play: voice }, { list: song.sfx, play: fx }];
    tracks.forEach(function (tr) { tr.i = 0; while (tr.i < tr.list.length && tr.list[tr.i].t < (fromBeat || 0)) tr.i++; });
    return { master: master, scheduleUntil: function (until) { tracks.forEach(function (tr, ti) { while (tr.i < tr.list.length) { var e = tr.list[tr.i], t = beatTime(e.t, ti); if (t >= until) break; if (t >= 0) tr.play(t, e); tr.i++; } }); } };
  }

  var ctx = null, engine = null, timer = null, playing = false, startTime = 0;
  function start(offset) { offset = offset || 0; ctx = global.Musik ? global.Musik.getContext() : new (global.AudioContext || global.webkitAudioContext)(); if (!ctx || playing) return; if (ctx.state !== "running") ctx.resume(); startTime = ctx.currentTime + 0.12 - offset; engine = createEngine(ctx, ctx.destination, startTime, offset / BEAT); timer = setInterval(function () { if (ctx.state === "running") engine.scheduleUntil(ctx.currentTime + 0.3); }, 40); engine.scheduleUntil(ctx.currentTime + 0.3); playing = true; }
  function stop() { if (!playing) return; clearInterval(timer); var g = engine.master.gain, now = ctx.currentTime, old = engine; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.3); setTimeout(function () { old.master.disconnect(); }, 600); engine = null; playing = false; }
  function time() { return playing ? Math.max(0, ctx.currentTime - startTime) : null; }
  function render(seconds, sampleRate, from) { var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext; var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100); from = from || 0; createEngine(off, off.destination, -from, from / BEAT).scheduleUntil(seconds); return off.startRendering(); }

  global.RegenkatzeMusik = { BPM: BPM, BEAT: BEAT, BAR: BAR, SECTIONS: SECTIONS, TOTAL_BARS: TOTAL_BARS, DURATION: DURATION, THEME: THEME, song: song, at: at2, sectionStart: sectionStart, start: start, stop: stop, time: time, render: render, get playing() { return playing; } };
})(typeof window !== "undefined" ? window : globalThis);
