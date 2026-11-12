/**
 * RaveMusik – „Miau-Rave“: eigene Komposition, fröhlicher Happy Rave mit
 * 140 BPM, live per Web Audio erzeugt. Knapp drei Minuten, die der
 * Geschichte folgen: Busfahrt (Chip-Arpeggios), Zelten (gezupfte Gitarre,
 * Grillen), Party (Rave-Piano, Offbeat-Bass, Supersaw, Lead mit Echo),
 * Verloren (nur Spieluhr und Herzschlag), Wiederfinden (der Gruppen-Ruf
 * „Mi-a-u“), Finale mit Rückung nach D-Dur und ein Morgen-Schlaflied.
 *
 * Der Song ist als Ereignisliste in Schlägen beschrieben (song); Musik und
 * Grafik lesen beide daraus.
 */
(function (global) {
  "use strict";

  var BPM = 140, BEAT = 60 / BPM, BAR = 4;
  var SECTIONS = [
    { name: "abfahrt", bars: 12 }, { name: "zelten", bars: 16 }, { name: "party", bars: 32 }, { name: "verloren", bars: 12 },
    { name: "wiederfinden", bars: 8 }, { name: "finale", bars: 16 }, { name: "morgen", bars: 6 }
  ];
  (function () { var b = 0; SECTIONS.forEach(function (s) { s.start = b; b += s.bars; }); })();
  var TOTAL_BARS = SECTIONS.reduce(function (n, s) { return n + s.bars; }, 0);
  var DURATION = TOTAL_BARS * BAR * BEAT + 2.5;
  var CATS = ["Leo", "Kiki", "Bruno", "Mini", "DJ"];

  // Akkorde: Bass-Grundton und Stimmen
  var CH = {
    C: [36, [60, 64, 67]], G: [43, [59, 62, 67]], Am: [45, [57, 60, 64]], F: [41, [57, 60, 65]], Em: [40, [59, 64, 67]],
    D: [38, [62, 66, 69]], A: [45, [61, 64, 69]], Fism: [42, [61, 66, 69]], Bm: [47, [59, 62, 66]]
  };
  // Lead der Party über F – G – Em – Am, je Takt: [Achtel, Länge in Achteln, Ton]
  var LEAD = [
    [[0, 1, 69], [1, 1, 72], [2, 2, 77], [4, 1, 76], [5, 1, 72], [6, 2, 74]],
    [[0, 1, 71], [1, 1, 74], [2, 2, 79], [4, 1, 77], [5, 1, 74], [6, 2, 76]],
    [[0, 1, 71], [1, 1, 76], [2, 2, 79], [4, 2, 83], [6, 2, 79]],
    [[0, 3, 81], [3, 1, 79], [4, 2, 76], [6, 2, 72]]
  ];
  var LEAD_END = [[0, 2, 81], [2, 2, 79], [4, 4, 84]];
  // der Gruppen-Ruf der Bande: „Mi-a-u!“ (Schlag, Länge, Ton)
  var CALL = [[0, 0.5, 79], [0.5, 0.5, 76], [1, 1.5, 84]];

  function hash(n) { var h = Math.sin(n * 91.7 + 13.1) * 43758.5453; return h - Math.floor(h); }

  function build() {
    var S = { drums: [], bass: [], pad: [], piano: [], lead: [], chip: [], gtr: [], box: [], vocals: [], sfx: [] };
    function sec(name) { return SECTIONS.filter(function (s) { return s.name === name; })[0]; }
    function at(name, bar, beat) { return (sec(name).start + bar) * BAR + (beat || 0); }
    function four(t, v, clap) { for (var i = 0; i < 4; i++) S.drums.push({ t: t + i, type: "k", v: v }); if (clap) S.drums.push({ t: t + 1, type: "c", v: 0.8 }, { t: t + 3, type: "c", v: 0.8 }); }
    function hats(t, v, open) { for (var i = 0; i < 4; i++) { S.drums.push({ t: t + i + 0.5, type: open ? "o" : "h", v: v }); S.drums.push({ t: t + i + 0.25, type: "h", v: v * 0.4 }, { t: t + i + 0.75, type: "h", v: v * 0.4 }); } }
    function offBass(t, ch, v, shift) { var r = CH[ch][0] + (shift || 0); for (var i = 0; i < 4; i++) S.bass.push({ t: t + i + 0.5, d: 0.4, midi: r + (i === 3 ? 12 : 0), v: v }); }
    function rootBass(t, ch, v) { var r = CH[ch][0]; for (var i = 0; i < 8; i++) S.bass.push({ t: t + i * 0.5, d: 0.35, midi: r + (i % 4 === 3 ? 7 : 0), v: v * (i % 2 ? 0.75 : 1) }); }
    function pad(t, ch, d, v, saw) { S.pad.push({ t: t, d: d, notes: CH[ch][1], v: v, saw: !!saw }); }
    function piano(t, ch, v) { [0, 1.5, 2.5, 3.5].forEach(function (o, i) { S.piano.push({ t: t + o, d: i ? 0.4 : 0.9, notes: CH[ch][1].map(function (m) { return m + 12; }), v: v }); }); }
    function roll(t, beats, v) { var n = beats * 4; for (var i = 0; i < n; i++) { var k = i / n; if (k < 0.5 && i % 2) continue; S.drums.push({ t: t + i * 0.25, type: "s", v: v * (0.35 + 0.65 * k) }); } }
    function lead(t, barIdx, shift, v, last) {
      (last ? LEAD_END : LEAD[barIdx % 4]).forEach(function (n) { S.lead.push({ t: t + n[0] / 2, d: n[1] / 2 * 0.92, midi: n[2] + shift, v: v }); });
    }
    function call(t, who, shift, word) { CALL.forEach(function (n, i) { S.vocals.push({ t: t + n[0], d: n[1], midi: n[2] + (shift || 0), cat: who, type: "sing", word: i === 2 ? (word || "u!") : ["Mi-", "a-"][i] }); }); }
    var b, t, chs;

    // 1. Abfahrt: Chip-Arpeggios wie auf dem Amiga, der Bus tuckert im Takt
    chs = ["C", "G", "Am", "F"];
    for (b = 0; b < 12; b++) {
      t = at("abfahrt", b); var ch = chs[b % 4];
      for (var i = 0; i < 16; i++) S.chip.push({ t: t + i * 0.25, d: 0.2, midi: CH[ch][1][i % 3] + 12 + (i % 6 > 2 ? 12 : 0), v: b < 4 ? 0.6 : 0.8 });
      pad(t, ch, 4, b < 4 ? 0.5 : 0.35);
      if (b >= 4) { rootBass(t, ch, 0.55); hats(t, 0.5); S.drums.push({ t: t, type: "k", v: 0.9 }, { t: t + 2, type: "k", v: 0.9 }, { t: t + 1, type: "c", v: 0.6 }, { t: t + 3, type: "c", v: 0.6 }); }
      if (b >= 8) S.drums.push({ t: t + 1, type: "k", v: 0.7 }, { t: t + 3, type: "k", v: 0.7 });
      if (b >= 4 && b % 2 === 0) S.sfx.push({ t: t, type: "motor", d: 8 });
    }
    S.sfx.push({ t: at("abfahrt", 8, 0), type: "hup" }, { t: at("abfahrt", 8, 1), type: "hup" });
    S.vocals.push({ t: at("abfahrt", 8, 2), d: 0.5, midi: 72, cat: 0, type: "adlib", word: "Los geht's!" });
    roll(at("abfahrt", 11), 4, 0.6);

    // 2. Zelten: gezupfte Gitarre im halben Tempo, Grillen, ein Zelt, das zweimal einstürzt
    chs = ["C", "C", "Am", "Am", "F", "F", "G", "G"];
    for (b = 0; b < 16; b++) {
      t = at("zelten", b); ch = chs[b % 8];
      [0, 2].forEach(function (o, k) { S.gtr.push({ t: t + o, d: 1.8, notes: [CH[ch][0] + 12].concat(CH[ch][1]), v: k ? 0.6 : 0.8 }); });
      [1, 3].forEach(function (o) { S.gtr.push({ t: t + o + 0.5, d: 0.4, notes: CH[ch][1].slice(1), v: 0.35 }); });
      for (i = 0; i < 8; i++) S.drums.push({ t: t + i * 0.5, type: "sh", v: i % 2 ? 0.35 : 0.2 });
      S.bass.push({ t: t, d: 3.5, midi: CH[ch][0] + 12, v: 0.45 });
      if (b >= 8) pad(t, ch, 4, 0.22);
      if (b % 4 === 0) S.sfx.push({ t: t, type: "grillen", d: 16 });
    }
    S.sfx.push({ t: at("zelten", 2, 2), type: "plopp" }, { t: at("zelten", 4, 2), type: "plopp" }, { t: at("zelten", 6, 0), type: "tada" });
    S.vocals.push({ t: at("zelten", 2, 2.5), d: 0.5, midi: 55, cat: 2, type: "adlib", word: "Uff!" }, { t: at("zelten", 4, 2.5), d: 0.6, midi: 53, cat: 2, type: "adlib", word: "Nicht schon wieder!" },
      { t: at("zelten", 6, 0.5), d: 0.6, midi: 76, cat: 1, type: "adlib", word: "Hurra!" });
    [[10, 0, 72], [10, 1, 76], [10, 2, 79], [11, 0, 84]].forEach(function (n) { S.box.push({ t: at("zelten", n[0], n[1]), d: 1, midi: n[2], v: 0.7 }); });
    S.vocals.push({ t: at("zelten", 10, 0), d: 0.6, midi: 64, cat: 0, type: "adlib", word: "Treffpunkt: Mond-Ballon!" });
    call(at("zelten", 12, 0), 3, 0, "u!");

    // 3. Party: Groove, Aufbau, Drop – und Mini läuft einem Glühwürmchen nach
    chs = ["F", "G", "Em", "Am"];
    for (b = 0; b < 32; b++) {
      t = at("party", b); ch = chs[b % 4];
      var build = b >= 8 && b < 12, drop = b >= 12 && b < 28;
      if (!build || b < 10) four(t, 1, true);
      if (!build) { offBass(t, ch, drop ? 1 : 0.85); hats(t, drop ? 0.7 : 0.55, drop); }
      piano(t, ch, drop ? 0.55 : 0.75);
      if (build) { pad(t, ch, 4, 0.25 + (b - 8) * 0.08, true); if (b === 8) S.sfx.push({ t: t, type: "riser", d: 16 }); }
      if (b === 10) roll(t, 8, 0.9);
      if (drop) { pad(t, ch, 4, 0.5, true); lead(t, b - 12, 0, 1); if ((b - 12) % 4 === 0) S.drums.push({ t: t, type: "r", v: 1 }); }
      if (b >= 28) pad(t, ch, 4, 0.3);
    }
    S.vocals.push({ t: at("party", 0, 0), d: 0.5, midi: 60, cat: 4, type: "adlib", word: "Pfoten hoch!" }, { t: at("party", 11, 3), d: 0.8, midi: 64, cat: 4, type: "adlib", word: "Jetzt!" });
    [13, 17, 21, 25].forEach(function (bb, k) { S.vocals.push({ t: at("party", bb, 3.5), d: 0.4, midi: [79, 72, 67, 84][k], cat: [1, 0, 2, 3][k], type: "adlib", word: ["Miau!", "Yeah!", "Mau!", "Mii!"][k] }); });
    S.sfx.push({ t: at("party", 31, 2), type: "abwaerts", d: 2 });

    // 4. Verloren: keine Drums, Spieluhr in Moll, ein leiser Herzschlag
    chs = ["Am", "F", "C", "G"];
    var sad = [[0, 76], [1, 72], [2, 69], [4, 77], [5, 76], [6, 72], [8, 76], [9, 79], [10, 76], [12, 74], [13, 71], [14, 67]];
    for (b = 0; b < 12; b++) {
      t = at("verloren", b); ch = chs[b % 4];
      pad(t, ch, 4, 0.28);
      S.drums.push({ t: t, type: "hb", v: 0.8 }, { t: t + 0.35, type: "hb", v: 0.5 });
      if (b % 4 < 4) sad.filter(function (n) { return Math.floor(n[0] / 4) === b % 4; }).forEach(function (n) { S.box.push({ t: t + n[0] % 4, d: 1.4, midi: n[1], v: 0.6 }); });
    }
    [1, 5, 9].forEach(function (bb, k) { S.vocals.push({ t: at("verloren", bb, 2), d: 0.6, midi: 81 + k, to: 86 + k, cat: 3, type: "adlib", word: "Miau?" }); });
    [3, 7, 10].forEach(function (bb, k) { S.vocals.push({ t: at("verloren", bb, 1), d: 0.7, midi: [62, 69, 57][k], cat: [0, 1, 2][k], type: "adlib", word: ["Mini?", "Miniii!", "Wo bist du?"][k], far: true }); });

    // 5. Wiederfinden: Mini hat eine Idee, alle rennen zum Ballon, der Gruppen-Ruf
    t = at("wiederfinden", 0);
    S.sfx.push({ t: t, type: "idee" });
    [[0, 72], [0.5, 76], [1, 79], [2, 84]].forEach(function (n) { S.box.push({ t: t + n[0], d: 1.2, midi: n[1], v: 0.8 }); });
    chs = ["C", "G", "Am", "F", "C", "G", "F", "G"];
    for (b = 2; b < 8; b++) {
      t = at("wiederfinden", b); ch = chs[b];
      if (b < 6) { four(t, 0.9, b >= 4); hats(t, 0.5); offBass(t, ch, 0.9); piano(t, ch, 0.5); }
      pad(t, ch, 4, 0.3 + (b - 2) * 0.05, b >= 4);
    }
    roll(at("wiederfinden", 4), 8, 0.85);
    S.sfx.push({ t: at("wiederfinden", 3), type: "riser", d: 12 });
    call(at("wiederfinden", 6, 0), 3, 0, "u!");
    [0, 1, 2].forEach(function (c) { call(at("wiederfinden", 6, 2), c, c === 2 ? -24 : -12, "u!"); });
    call(at("wiederfinden", 6, 2), 3, 0, "u!");
    S.vocals.push({ t: at("wiederfinden", 7, 2), d: 1.2, midi: 84, cat: 3, type: "adlib", word: "Da seid ihr!!" });

    // 6. Finale: Rückung nach D-Dur, Mini drückt den großen Knopf, Feuerwerk
    chs = ["G", "A", "Fism", "Bm"];
    for (b = 0; b < 16; b++) {
      t = at("finale", b); ch = chs[b % 4];
      var last = b >= 14;
      if (b < 15) { four(t, 1, true); offBass(t, ch, 1); hats(t, 0.7, true); pad(t, ch, 4, 0.5, true); piano(t, ch, 0.5); }
      if (b < 14) lead(t, b, 2, 1); else if (b === 14) lead(t, 0, 2, 1, true);
      if (b % 2 === 0 && b < 15) S.drums.push({ t: t, type: "r", v: 0.9 }), S.sfx.push({ t: t + 0.5, type: "feuerwerk" });
    }
    S.sfx.push({ t: at("finale", 0, 0), type: "boom" });
    t = at("finale", 15);
    S.pad.push({ t: t, d: 4, notes: [62, 66, 69, 74], v: 0.6, saw: true });
    S.bass.push({ t: t, d: 3.8, midi: 38, v: 1 });
    S.drums.push({ t: t, type: "k", v: 1 }, { t: t, type: "r", v: 1 });
    [1, 3, 5, 9].forEach(function (bb, k) { S.vocals.push({ t: at("finale", bb, 3.5), d: 0.4, midi: [81, 74, 69, 86][k], cat: [1, 0, 2, 3][k], type: "adlib", word: ["Miau!", "Hey!", "Mau!", "Juhuu!"][k] }); });
    call(at("finale", 12, 0), 3, 2, "u!");
    [0, 1, 2].forEach(function (c) { call(at("finale", 12, 0), c, c === 2 ? -22 : -10, "u!"); });

    // 7. Morgen: Sonnenaufgang, das Schlaflied der Spieluhr
    chs = ["D", "G", "D", "A", "D", "D"];
    for (b = 0; b < 6; b++) { t = at("morgen", b); pad(t, chs[b], 4, 0.5); }
    [[0, 0, 81], [0, 1, 78], [0, 2, 86], [1, 0, 79], [1, 2, 83], [2, 0, 78], [2, 1, 74], [2, 2, 81], [3, 0, 76], [3, 2, 73], [4, 0, 74]].forEach(function (n) {
      S.box.push({ t: at("morgen", n[0], n[1]), d: 2, midi: n[2], v: 1 });
    });
    S.sfx.push({ t: at("morgen", 1, 1), type: "vogel" }, { t: at("morgen", 2, 3), type: "vogel" });
    S.vocals.push({ t: at("morgen", 4, 1), d: 1.2, midi: 64, to: 60, cat: 2, type: "adlib", word: "Zzz …", soft: true });

    Object.keys(S).forEach(function (k) { S[k].sort(function (x, y) { return x.t - y.t; }); });
    return S;
  }
  var song = build();

  function at(time) {
    var beat = time / BEAT, bar = Math.floor(beat / BAR), s;
    if (bar >= TOTAL_BARS) return { section: "ende", index: SECTIONS.length, bar: bar - TOTAL_BARS, beat: beat, inBar: beat % BAR, progress: 1 };
    for (var i = 0; i < SECTIONS.length; i++) if (bar < SECTIONS[i].start + SECTIONS[i].bars) { s = SECTIONS[i]; break; }
    return { section: s.name, index: i, bar: bar - s.start, beat: beat, inBar: beat % BAR, progress: (beat / BAR - s.start) / s.bars };
  }
  function sectionStart(name) { var s = SECTIONS.filter(function (x) { return x.name === name; })[0]; return s.start * BAR * BEAT; }

  // ---------- Klangerzeugung ----------

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function tanhCurve(drive, ceiling) {
    var n = 2048, c = new Float32Array(n), norm = Math.tanh(drive);
    for (var i = 0; i < n; i++) c[i] = Math.tanh((i / (n - 1) * 2 - 1) * drive) / norm * ceiling;
    return c;
  }
  function makeNoise(ctx, seconds) {
    var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 31;
    for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    return b;
  }
  function makeImpulse(ctx, seconds) {
    var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, n, ctx.sampleRate), s = 7;
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 2.8); } }
    return b;
  }
  function pluckData(sampleRate, freq, seconds, seed) {
    if (global.Musik && global.Musik.makePluck) return global.Musik.makePluck(sampleRate, freq, seconds, seed);
    var n = Math.floor(sampleRate * seconds), out = new Float32Array(n), period = Math.max(2, Math.round(sampleRate / freq)), buf = new Float32Array(period), s = seed || 1, idx = 0;
    for (var i = 0; i < period; i++) { s = (s * 16807) % 2147483647; buf[i] = (s / 2147483647) * 2 - 1; }
    for (var t = 0; t < n; t++) { var nx = (idx + 1) % period, v = buf[idx]; out[t] = v; buf[idx] = 0.996 * 0.5 * (v + buf[nx]); idx = nx; }
    return out;
  }
  var VOWELS = { m: [250, 1100, 2300], i: [320, 2400, 3100], a: [900, 1400, 2800], u: [380, 850, 2400], e: [500, 1900, 2600], o: [500, 900, 2400] };
  var VOICE = [{ f: 1.0, rough: 0.25 }, { f: 1.12, rough: 0.12 }, { f: 0.85, rough: 0.45 }, { f: 1.28, rough: 0.05 }, { f: 0.92, rough: 0.3 }];

  function createEngine(ctx, destination, startTime, fromBeat) {
    var master = ctx.createGain(), limiter = ctx.createWaveShaper();
    master.gain.value = 0.75;
    limiter.curve = tanhCurve(1.6, 0.9);
    master.connect(limiter).connect(destination);
    var reverb = ctx.createConvolver(), wet = ctx.createGain();
    reverb.buffer = makeImpulse(ctx, 2.2); wet.gain.value = 0.45;
    reverb.connect(wet).connect(master);
    var echo = ctx.createDelay(1), fb = ctx.createGain(), echoOut = ctx.createGain();
    echo.delayTime.value = BEAT * 0.75; fb.gain.value = 0.32; echoOut.gain.value = 0.35;
    echo.connect(fb).connect(echo); echo.connect(echoOut).connect(master);
    // Sidechain: Bass, Flächen und Piano „pumpen“ mit der Bassdrum
    var duck = ctx.createGain(); duck.connect(master);
    function bus(v, rev, toDuck, toEcho) {
      var g = ctx.createGain(); g.gain.value = v; g.connect(toDuck ? duck : master);
      if (rev) { var s = ctx.createGain(); s.gain.value = rev; g.connect(s).connect(reverb); }
      if (toEcho) { var e = ctx.createGain(); e.gain.value = toEcho; g.connect(e).connect(echo); }
      return g;
    }
    var drumBus = bus(0.62, 0.08), bassBus = bus(0.42, 0, true), padBus = bus(0.17, 0.3, true), pianoBus = bus(0.2, 0.2, true),
      leadBus = bus(0.15, 0.2, false, 1), chipBus = bus(0.14, 0.15, false, 0.6), gtrBus = bus(0.34, 0.3), boxBus = bus(0.26, 0.6, false, 0.5),
      voxBus = bus(0.42, 0.3), farBus = bus(0.18, 1.2), fxBus = bus(0.4, 0.3);
    var noise = makeNoise(ctx, 2), plucks = {};

    function beatTime(b, i) { return startTime + b * BEAT + (hash(b * 7.3 + i) - 0.5) * 0.008; }
    function env(g, t, a, peak, d, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0.0001, t + d, rel); }
    function osc(t, type, f, len, dest, vol, a, rel, detune) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
      env(g, t, a || 0.005, vol, len, rel || 0.05);
      o.connect(g).connect(dest); o.start(t); o.stop(t + len + (rel || 0.05) * 6);
      return o;
    }
    function noiseHit(t, vol, type, freq, len, q, dest) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f).connect(g).connect(dest || drumBus);
      src.start(t, (t * 1.7) % 1); src.stop(t + len + 0.02);
      return { f: f, g: g };
    }
    function sweep(t, type, f0, f1, len, vol, dest) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.8);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g).connect(dest || drumBus); o.start(t); o.stop(t + len + 0.02);
    }
    function pluckBuffer(midi) {
      if (!plucks[midi]) { var d = pluckData(ctx.sampleRate, midiToFreq(midi), 2.5, midi * 97 + 1), b = ctx.createBuffer(1, d.length, ctx.sampleRate); b.getChannelData(0).set(d); plucks[midi] = b; }
      return plucks[midi];
    }
    function pluck(t, midi, len, vol, dest) {
      var src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      src.buffer = pluckBuffer(midi); f.type = "lowpass"; f.frequency.value = 3200;
      g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t + len, 0.08);
      src.connect(f).connect(g).connect(dest); src.start(t); src.stop(t + len + 0.6);
    }
    function drum(t, e) {
      if (e.type === "k") {
        sweep(t, "sine", 160, 45, 0.3, e.v); noiseHit(t, 0.12 * e.v, "lowpass", 3000, 0.02);
        duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(0.35, t); duck.gain.setTargetAtTime(1, t + 0.04, 0.07);
      } else if (e.type === "c") { [0, 0.012, 0.024].forEach(function (o) { noiseHit(t + o, 0.32 * e.v, "bandpass", 1500, 0.11, 1.2); }); noiseHit(t, 0.08 * e.v, "bandpass", 1500, 0.4, 1.2); }
      else if (e.type === "s") { noiseHit(t, 0.32 * e.v, "bandpass", 2600, 0.12, 0.8); sweep(t, "triangle", 240, 180, 0.08, 0.25 * e.v); }
      else if (e.type === "h") noiseHit(t, 0.22 * e.v, "highpass", 8500, 0.035);
      else if (e.type === "o") noiseHit(t, 0.18 * e.v, "highpass", 7000, 0.18);
      else if (e.type === "r") { noiseHit(t, 0.3 * e.v, "highpass", 4500, 1.8); noiseHit(t, 0.1 * e.v, "bandpass", 9000, 1.2, 2); }
      else if (e.type === "sh") noiseHit(t, 0.12 * e.v, "bandpass", 6000, 0.06, 1.5);
      else if (e.type === "hb") sweep(t, "sine", 70, 40, 0.22, 0.9 * e.v);
    }
    /** Katzenstimme: Sägezahn und Rechteck durch drei Formant-Filter, Vokale passend zum Wort */
    function voice(t, n) {
      var V = VOICE[n.cat] || VOICE[0], d = Math.max(0.12, n.d * BEAT), f = midiToFreq(n.midi), short = d < 0.3;
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), src = ctx.createGain(), out = ctx.createGain(), o2g = ctx.createGain();
      o.type = "sawtooth"; o2.type = "square"; o2g.gain.value = V.rough;
      [o.frequency, o2.frequency].forEach(function (p, i) {
        var m = i ? 0.5 : 1;
        p.setValueAtTime(f * 0.9 * m, t); p.exponentialRampToValueAtTime(f * m, t + Math.min(0.07, d * 0.3));
        if (n.to) p.exponentialRampToValueAtTime(midiToFreq(n.to) * m, t + d * 0.95);
        else p.exponentialRampToValueAtTime(f * (n.type === "adlib" ? 0.88 : 0.97) * m, t + d);
      });
      o.connect(src); o2.connect(o2g).connect(src);
      if (d > 0.35) {
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t + 0.12); lg.gain.linearRampToValueAtTime(f * 0.015, t + 0.35);
        lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency); lfo.start(t); lfo.stop(t + d + 0.1);
      }
      var w = (n.word || "miau").toLowerCase(), path = [];
      if (/^mi-?$/.test(w)) path = [["m", 0], ["i", 0.25]];
      else if (/^a-?$/.test(w)) path = [["a", 0]];
      else if (/^u/.test(w)) path = [["a", 0], ["u", 0.6]];
      else if (/^(mi|mau|miau|mrau)/.test(w)) path = short ? [["i", 0], ["a", 0.6]] : [["m", 0], ["i", 0.1], ["a", 0.45], ["u", 1]];
      else { var vs = w.replace(/[^aeiou]/g, "").split("").slice(0, 4); if (!vs.length) vs = ["a"]; path = vs.map(function (v, k) { return [v, k / Math.max(1, vs.length - 1)]; }); }
      [0, 1, 2].forEach(function (k) {
        var bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = "bandpass"; bp.Q.value = [6, 9, 11][k];
        path.forEach(function (v, j) { var fr = VOWELS[v[0]][k] * V.f, tt = t + v[1] * d; if (j === 0) bp.frequency.setValueAtTime(fr, tt); else bp.frequency.linearRampToValueAtTime(fr, tt); });
        g.gain.value = [1, 0.7, 0.3][k];
        src.connect(bp); bp.connect(g).connect(out);
      });
      var vol = n.soft ? 0.4 : n.type === "adlib" ? 0.85 : 1;
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(vol, t + 0.025); out.gain.setTargetAtTime(0.0001, t + d - 0.05, 0.035);
      out.connect(n.far ? farBus : voxBus);
      [o, o2].forEach(function (x) { x.start(t); x.stop(t + d + 0.25); });
      noiseHit(t, 0.05, "highpass", 4000, 0.04, 0, voxBus);
    }
    function fx(t, e) {
      var d = (e.d || 1) * BEAT, i;
      if (e.type === "motor") { for (i = 0; i < e.d * 2; i++) sweep(t + i * BEAT / 2, "sawtooth", 110, 90, 0.1, 0.05, fxBus); }
      else if (e.type === "hup") { osc(t, "square", 392, 0.28, fxBus, 0.12, 0.01, 0.03); osc(t, "square", 494, 0.28, fxBus, 0.1, 0.01, 0.03); }
      else if (e.type === "plopp") { sweep(t, "sine", 500, 70, 0.25, 0.8, fxBus); noiseHit(t, 0.3, "lowpass", 700, 0.3, 0, fxBus); }
      else if (e.type === "tada") { [72, 76, 79, 84].forEach(function (m, k) { osc(t + k * 0.07, "triangle", midiToFreq(m), 0.5, fxBus, 0.18, 0.005, 0.15); }); }
      else if (e.type === "grillen") { for (i = 0; i < e.d * 3; i++) { var tt = t + i * BEAT / 3 + hash(i + t) * 0.05; if (hash(i * 3.3 + t) > 0.45) osc(tt, "sine", 4300 + hash(i) * 400, 0.03, fxBus, 0.025, 0.003, 0.01); } }
      else if (e.type === "riser") { var n = noiseHit(t, 0.001, "bandpass", 400, d, 2, fxBus); n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.001, t); n.g.gain.exponentialRampToValueAtTime(0.35, t + d); n.g.gain.setValueAtTime(0.0001, t + d + 0.01); n.f.frequency.exponentialRampToValueAtTime(6000, t + d); }
      else if (e.type === "abwaerts") { var m = noiseHit(t, 0.3, "bandpass", 5000, d, 2, fxBus); m.f.frequency.exponentialRampToValueAtTime(200, t + d); }
      else if (e.type === "boom") { sweep(t, "sine", 120, 30, 1.2, 1, fxBus); noiseHit(t, 0.6, "lowpass", 1200, 0.8, 0, fxBus); }
      else if (e.type === "feuerwerk") { sweep(t, "sine", 900, 2600, 0.5, 0.05, fxBus); noiseHit(t + 0.55, 0.35, "lowpass", 2500, 0.5, 0, fxBus); for (i = 0; i < 6; i++) noiseHit(t + 0.7 + hash(i + t) * 0.6, 0.08, "highpass", 6000, 0.05, 0, fxBus); }
      else if (e.type === "idee") { osc(t, "sine", 1568, 0.5, fxBus, 0.25, 0.003, 0.2); osc(t, "sine", 2093, 0.5, fxBus, 0.15, 0.003, 0.2); }
      else if (e.type === "vogel") { for (i = 0; i < 3; i++) sweep(t + i * 0.15, "sine", 2800, 4200, 0.1, 0.06, fxBus); }
    }
    var tracks = [
      { list: song.drums, play: drum },
      { list: song.bass, play: function (t, e) { var dd = e.d * BEAT; osc(t, "sawtooth", midiToFreq(e.midi), dd, (function () { var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 650; f.Q.value = 4; f.connect(bassBus); return f; })(), 0.5 * e.v, 0.005, 0.03); osc(t, "sine", midiToFreq(e.midi), dd, bassBus, 0.6 * e.v, 0.005, 0.03); } },
      { list: song.pad, play: function (t, e) {
        var dd = e.d * BEAT, f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = e.saw ? 3600 : 1400; f.connect(padBus);
        e.notes.forEach(function (m) { (e.saw ? [-14, 0, 14] : [-6, 6]).forEach(function (dt) { osc(t, e.saw ? "sawtooth" : "triangle", midiToFreq(m), dd, f, 0.3 * e.v, 0.08, 0.25, dt); }); });
      } },
      { list: song.piano, play: function (t, e) { e.notes.forEach(function (m) { var fr = midiToFreq(m); osc(t, "triangle", fr, 0.02, pianoBus, 0.5 * e.v, 0.003, e.d * BEAT * 0.5); osc(t, "sine", fr * 2, 0.02, pianoBus, 0.25 * e.v, 0.003, e.d * BEAT * 0.3); osc(t, "sine", fr * 4.01, 0.02, pianoBus, 0.08 * e.v, 0.002, 0.08); }); } },
      { list: song.lead, play: function (t, e) { var dd = e.d * BEAT, f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 4200; f.connect(leadBus); [-9, 9].forEach(function (dt) { osc(t, "sawtooth", midiToFreq(e.midi), dd, f, 0.5 * e.v, 0.006, 0.06, dt); }); osc(t, "square", midiToFreq(e.midi - 12), dd, f, 0.18 * e.v, 0.006, 0.06); } },
      { list: song.chip, play: function (t, e) { osc(t, "square", midiToFreq(e.midi), e.d * BEAT, chipBus, 0.6 * e.v, 0.002, 0.02); } },
      { list: song.gtr, play: function (t, e) { e.notes.forEach(function (m, k) { pluck(t + k * 0.022, m, e.d * BEAT, e.v * 0.7, gtrBus); }); } },
      { list: song.box, play: function (t, e) { var fr = midiToFreq(e.midi); osc(t, "sine", fr, 0.02, boxBus, 0.5 * e.v, 0.002, e.d * BEAT * 0.35); osc(t, "sine", fr * 3, 0.02, boxBus, 0.12 * e.v, 0.002, 0.12); } },
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
    timer = setInterval(function () { if (ctx.state === "running") engine.scheduleUntil(ctx.currentTime + 0.25); }, 40);
    engine.scheduleUntil(ctx.currentTime + 0.25);
    playing = true;
  }
  function stop() {
    if (!playing) return;
    clearInterval(timer);
    var g = engine.master.gain, now = ctx.currentTime, old = engine;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.25);
    setTimeout(function () { old.master.disconnect(); }, 500);
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

  global.RaveMusik = {
    BPM: BPM, BEAT: BEAT, BAR: BAR, SECTIONS: SECTIONS, TOTAL_BARS: TOTAL_BARS, DURATION: DURATION, CATS: CATS, CALL: CALL, LEAD: LEAD,
    song: song, at: at, sectionStart: sectionStart, start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
