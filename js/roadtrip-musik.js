/**
 * RoadtripMusik – „Regenbogen-Roadtrip“: eigene Komposition im Stil eines
 * Amiga-Tracker-Moduls (125 BPM, vier „Paula“-Kanäle, hart links/rechts,
 * leicht 8-bittig gekörnt), live per Web Audio erzeugt.
 *
 * Die Musik erzählt mit: Das Motiv der Regenbogenkatze erklingt nach dem
 * Farbraub nur noch auf einem einzigen Ton. Mit jeder zurückgewonnenen Farbe
 * kommt ein Instrument dazu (Rot/Orange: Bass, Gelb/Grün: Arpeggio,
 * Blau: zweite Stimme, Violett: Akkorde) – im Finale spielt alles.
 *
 * Der Song ist als Ereignisliste in Schlägen beschrieben (song); Musik und
 * Grafik lesen beide daraus, auch wann welche Farbe zurückkommt (COLORS).
 */
(function (global) {
  "use strict";

  var BPM = 125, BEAT = 60 / BPM, BAR = 4;
  var SECTIONS = [
    { name: "prolog", bars: 10 }, { name: "aufbruch", bars: 10 }, { name: "wueste", bars: 16 }, { name: "blumen", bars: 13 },
    { name: "faehre", bars: 13 }, { name: "sturm", bars: 13 }, { name: "bruecke", bars: 16 }, { name: "abspann", bars: 6 }
  ];
  (function () { var b = 0; SECTIONS.forEach(function (s) { s.start = b; b += s.bars; }); })();
  var TOTAL_BARS = SECTIONS.reduce(function (n, s) { return n + s.bars; }, 0);
  var DURATION = TOTAL_BARS * BAR * BEAT + 2.5;
  function sec(name) { return SECTIONS.filter(function (s) { return s.name === name; })[0]; }
  function at(name, bar, beat) { return (sec(name).start + bar) * BAR + (beat || 0); }

  // Wann kommen die Farben zurück? (Schlag → Anzahl der Farben im Regenbogen-Fell)
  var COLORS = [
    { t: at("prolog", 0), n: 6 }, { t: at("prolog", 4), n: 0, drain: 12 },
    { t: at("wueste", 12), n: 2 }, { t: at("blumen", 9), n: 4 }, { t: at("faehre", 8), n: 5 }, { t: at("sturm", 10), n: 6 }
  ];

  var CH = {
    C: [36, [60, 64, 67]], G: [43, [59, 62, 67]], Am: [45, [57, 60, 64]], F: [41, [57, 60, 65]], Em: [40, [59, 64, 67]],
    Dm: [38, [57, 62, 65]], E: [40, [56, 59, 64]]
  };
  // das Motiv der Regenbogenkatze: [Achtel, Länge in Achteln, Ton], 2 Takte Frage + 2 Takte Antwort
  var MOTIF = [[0, 1, 64], [1, 1, 67], [2, 2, 72], [4, 1, 71], [5, 1, 67], [6, 2, 69], [8, 1, 67], [9, 1, 65], [10, 2, 64], [12, 2, 62], [14, 2, 60]];
  var ANSWER = [[0, 1, 69], [1, 1, 72], [2, 2, 77], [4, 1, 76], [5, 1, 72], [6, 2, 74], [8, 2, 71], [10, 2, 67], [12, 4, 72]];
  var STORM = [[0, 2, 69], [2, 1, 72], [3, 1, 71], [4, 2, 69], [6, 2, 64]];

  function hash(n) { var h = Math.sin(n * 91.7 + 13.1) * 43758.5453; return h - Math.floor(h); }

  function build() {
    var S = { lead: [], lead2: [], bass: [], arp: [], chords: [], drums: [], drone: [], vocals: [], sfx: [] };
    function motif(t, shift, v, list, single) {
      MOTIF.forEach(function (n) { (list || S.lead).push({ t: t + n[0] / 2, d: n[1] / 2 * 0.9, midi: single ? single : n[2] + (shift || 0), v: v }); });
      ANSWER.forEach(function (n) { (list || S.lead).push({ t: t + 8 + n[0] / 2, d: n[1] / 2 * 0.9, midi: single ? single : n[2] + (shift || 0), v: v }); });
    }
    function beat(t, kind, v) {
      if (kind === "road") {
        S.drums.push({ t: t, type: "k", v: v }, { t: t + 1.5, type: "k", v: v * 0.8 }, { t: t + 2.5, type: "k", v: v * 0.6 }, { t: t + 1, type: "s", v: v }, { t: t + 3, type: "s", v: v });
        for (var i = 0; i < 8; i++) S.drums.push({ t: t + i / 2, type: "h", v: v * (i % 2 ? 0.45 : 0.7) });
      } else if (kind === "soft") {
        S.drums.push({ t: t, type: "k", v: v * 0.7 }, { t: t + 2, type: "s", v: v * 0.5 });
        for (var j = 0; j < 4; j++) S.drums.push({ t: t + j + 0.5, type: "h", v: v * 0.4 });
      } else if (kind === "storm") {
        S.drums.push({ t: t, type: "k", v: v }, { t: t + 0.75, type: "k", v: v * 0.7 }, { t: t + 2, type: "k", v: v }, { t: t + 2.75, type: "k", v: v * 0.7 }, { t: t + 1, type: "s", v: v }, { t: t + 3, type: "s", v: v });
        for (var k = 0; k < 16; k++) S.drums.push({ t: t + k / 4, type: "h", v: v * (k % 2 ? 0.3 : 0.55) });
      } else if (kind === "fill") {
        S.drums.push({ t: t, type: "k", v: v });
        [2, 2.5, 3, 3.25, 3.5, 3.75].forEach(function (o, i) { S.drums.push({ t: t + o, type: "s", v: v * (0.5 + i * 0.1) }); });
      }
    }
    function bass(t, ch, v, pattern) {
      var r = CH[ch][0];
      (pattern || [[0, 0.9, 0], [1, 0.4, 12], [1.5, 0.4, 0], [2, 0.9, 7], [3, 0.4, 12], [3.5, 0.4, 7]]).forEach(function (p) { S.bass.push({ t: t + p[0], d: p[1], midi: r + p[2], v: v }); });
    }
    function arp(t, ch, v, beats) { for (var i = 0; i < (beats || 4) * 2; i++) S.arp.push({ t: t + i / 2, d: 0.45, notes: CH[ch][1].map(function (m) { return m + 12; }), v: v }); }
    function chords(t, ch, v, d) { S.chords.push({ t: t, d: d || 4, notes: CH[ch][1], v: v }); }
    function say(t, cat, word, midi, d, extra) { var e = { t: t, d: d || 0.6, midi: midi, cat: cat, type: "adlib", word: word }; for (var k in extra || {}) e[k] = extra[k]; S.vocals.push(e); }
    var b, t, ch, prog = ["C", "Am", "F", "G"];

    // Prolog: die bunte Stadt, dann zieht die graue Wolke auf und nimmt alle Farben
    for (b = 0; b < 10; b++) {
      t = at("prolog", b); ch = prog[b % 4];
      if (b < 4) { arp(t, ch, 0.6); bass(t, ch, 0.5, [[0, 1.8, 0], [2, 1.8, 7]]); }
      if (b >= 3) S.drone.push({ t: t, d: 4, midi: 31, v: Math.min(1, (b - 2) * 0.3) });
    }
    motif(at("prolog", 0), 0, 0.8);
    S.sfx.push({ t: at("prolog", 4), type: "saugen", d: 12 });
    say(at("prolog", 4, 2), 3, "Grrrau!", 40, 1.2);
    say(at("prolog", 7, 0), 0, "Miau?!", 76, 0.8, { to: 82 });
    // nach dem Farbraub: das Motiv auf einem einzigen Ton
    MOTIF.forEach(function (n) { if (n[0] < 8) S.lead.push({ t: at("prolog", 8) + n[0] / 2, d: n[1] / 2 * 0.9, midi: 64, v: 0.55 }); });

    // Aufbruch: Landkarte, dann hustet und knallt der Bus los
    for (b = 0; b < 10; b++) { t = at("aufbruch", b); if (b >= 8) { beat(t, "road", 0.8); } }
    motif(at("aufbruch", 0), 0, 0.6, null, 67);
    say(at("aufbruch", 1, 0), 1, "Wir holen sie zurück!", 72, 1);
    say(at("aufbruch", 3, 0), 2, "Alle einsteigen!", 52, 1);
    [0, 0.5, 1.5, 2].forEach(function (o) { S.sfx.push({ t: at("aufbruch", 6, o), type: "husten" }); });
    S.sfx.push({ t: at("aufbruch", 7, 0), type: "knall" });
    S.lead.push({ t: at("aufbruch", 8), d: 0.4, midi: 72, v: 0.7 }, { t: at("aufbruch", 8, 0.5), d: 0.4, midi: 76, v: 0.7 }, { t: at("aufbruch", 8, 1), d: 1.5, midi: 79, v: 0.7 });

    // Wüstenstraße: Schlagzeug und Motiv (noch ohne Bass) – Rettung des Kaktus-Igels – Rot und Orange kommen zurück, mit ihnen der Bass
    for (b = 0; b < 16; b++) {
      t = at("wueste", b); ch = prog[b % 4];
      if (b < 8 || b >= 12) beat(t, b === 7 ? "fill" : "road", 0.9);
      else beat(t, "soft", 0.6);
      if (b >= 12) bass(t, ch, 0.9);
      if (b % 4 === 0 && (b < 8 || b >= 12)) motif(t, 0, 0.75);
      if (b % 2 === 0 && b < 8) S.sfx.push({ t: t, type: "motor", d: 8 });
    }
    say(at("wueste", 8, 0), 4, "Hilfe! Ich häng fest!", 86, 1);
    say(at("wueste", 9, 2), 1, "Wir ziehen!", 74, 0.8);
    S.sfx.push({ t: at("wueste", 10, 2), type: "plopp" });
    say(at("wueste", 11, 0), 4, "Danke!", 88, 0.8);
    S.sfx.push({ t: at("wueste", 12), type: "funkeln" });

    // Sonnenblumenmeer: der Bus bleibt liegen, die Glücksmünze repariert ihn – Gelb und Grün, dazu das Arpeggio
    for (b = 0; b < 13; b++) {
      t = at("blumen", b); ch = ["F", "C", "G", "C"][b % 4];
      if (b < 6) { beat(t, "road", 0.85); bass(t, ch, 0.85); }
      else if (b < 9) { S.bass.push({ t: t, d: 3.8, midi: 36, v: 0.4 }); }
      else { beat(t, "road", 0.9); bass(t, ch, 0.9); arp(t, ch, 0.6); }
    }
    motif(at("blumen", 0), 0, 0.7); motif(at("blumen", 9), 12, 0.6);
    S.sfx.push({ t: at("blumen", 6, 0), type: "pfff" });
    say(at("blumen", 6, 2), 2, "Oh nein!", 50, 0.8);
    say(at("blumen", 7, 2), 1, "Zeit für Glück!", 76, 1);
    S.sfx.push({ t: at("blumen", 8, 2), type: "pling" }, { t: at("blumen", 9), type: "funkeln" });

    // Fähre: ruhiges Meer, der Delfin bringt Blau zurück – mit ihm die zweite Stimme
    for (b = 0; b < 13; b++) {
      t = at("faehre", b); ch = ["Am", "F", "C", "G"][b % 4];
      beat(t, "soft", 0.7); bass(t, ch, 0.7, [[0, 1.4, 0], [1.5, 0.4, 7], [2, 1.4, 12], [3.5, 0.4, 7]]); arp(t, ch, 0.45);
      if (b % 2 === 0) S.sfx.push({ t: t, type: "welle" });
    }
    motif(at("faehre", 0), 0, 0.6); motif(at("faehre", 8), 0, 0.65);
    motif(at("faehre", 8), -5, 0.45, S.lead2);
    S.sfx.push({ t: at("faehre", 7, 2), type: "platsch" }, { t: at("faehre", 8), type: "funkeln" });
    say(at("faehre", 10, 0), 0, "Blau ist zurück!", 79, 1);

    // Sturm: Nebelbart holt sie ein – dann die Wendung: er ist nur einsam. Violett kommt zurück, mit ihm die Akkorde.
    for (b = 0; b < 13; b++) {
      t = at("sturm", b); ch = ["Am", "Dm", "E", "Am"][b % 4];
      if (b < 8) { beat(t, b === 7 ? "fill" : "storm", 1); bass(t, ch, 1, [[0, 0.4, 0], [0.5, 0.4, 0], [1, 0.4, 12], [1.5, 0.4, 0], [2, 0.4, 0], [2.5, 0.4, 0], [3, 0.4, 12], [3.5, 0.4, 7]]);
        STORM.forEach(function (n) { S.lead.push({ t: t + n[0] / 2, d: n[1] / 2 * 0.9, midi: n[2] + (ch === "Dm" ? 5 : ch === "E" ? 7 : 0) - 12, v: 0.8 }); });
        if (b % 2 === 1) S.sfx.push({ t: t + 1, type: "donner" });
      } else if (b < 10) { arp(t, ch, 0.35); S.sfx.push({ t: t, type: "regen", d: 4 }); }
      else { ch = ["C", "Am", "F"][b - 10]; chords(t, ch, 0.7); arp(t, ch, 0.4); beat(t, "soft", 0.6); bass(t, ch, 0.6, [[0, 1.8, 0], [2, 1.8, 7]]); }
    }
    say(at("sturm", 0, 2), 3, "Die Farben gehören mir!", 38, 1.4);
    say(at("sturm", 8, 0), 3, "Bei mir ist alles grau …", 41, 1.6, { soft: true });
    say(at("sturm", 9, 0), 0, "Wir teilen!", 77, 0.9);
    S.sfx.push({ t: at("sturm", 10), type: "klatsch" }, { t: at("sturm", 10, 0.1), type: "funkeln" });
    motif(at("sturm", 10), 0, 0.55);

    // Regenbogenbrücke: alle vier Kanäle, das volle Motiv in zwei Stimmen
    for (b = 0; b < 16; b++) {
      t = at("bruecke", b); ch = prog[b % 4];
      beat(t, b === 15 ? "fill" : "road", 0.95); bass(t, ch, 0.95); arp(t, ch, 0.55); chords(t, ch, 0.45);
      if (b % 4 === 0) { motif(t, 0, 0.85); motif(t, -5, 0.5, S.lead2); S.drums.push({ t: t, type: "c", v: 0.9 }); }
    }
    S.sfx.push({ t: at("bruecke", 0), type: "regenbogen" });
    say(at("bruecke", 2, 0), 3, "Ich hab ja einen Hut!", 45, 1.2);
    say(at("bruecke", 8, 0), 1, "Die Stadt ist wieder bunt!", 76, 1.2);
    say(at("bruecke", 12, 2), 0, "MIAU!", 84, 0.8);

    // Abspann: ruhiger Groove, Schlussakkord
    for (b = 0; b < 6; b++) {
      t = at("abspann", b); ch = prog[b % 4];
      if (b < 5) { beat(t, "soft", 0.7); bass(t, ch, 0.7, [[0, 1.8, 0], [2, 1.8, 7]]); arp(t, ch, 0.45); }
    }
    t = at("abspann", 4);
    [[0, 2, 72], [2, 2, 67], [4, 4, 72]].forEach(function (n) { S.lead.push({ t: t + n[0] / 2, d: n[1] / 2, midi: n[2], v: 0.7 }); });
    t = at("abspann", 5);
    S.chords.push({ t: t, d: 4, notes: [60, 64, 67, 72], v: 0.7 }); S.bass.push({ t: t, d: 3.8, midi: 36, v: 0.8 }); S.drums.push({ t: t, type: "c", v: 0.8 }, { t: t, type: "k", v: 0.9 });

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
  /** Farben im Regenbogen-Fell zum Schlag b (gebrochen während des Farbraubs) */
  function colorsAt(b) {
    var n = 6;
    COLORS.forEach(function (c) {
      if (b < c.t) return;
      if (c.drain) n = Math.max(0, 6 - 6 * Math.min(1, (b - c.t) / c.drain));
      else n = c.n;
    });
    return n;
  }

  // ---------- Klangerzeugung ----------

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function tanhCurve(drive, ceiling) {
    var n = 2048, c = new Float32Array(n), norm = Math.tanh(drive);
    for (var i = 0; i < n; i++) c[i] = Math.tanh((i / (n - 1) * 2 - 1) * drive) / norm * ceiling;
    return c;
  }
  /** 8-Bit-Treppe wie bei Paulas Samples */
  function crushCurve(levels) {
    var n = 4096, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; c[i] = Math.round(x * levels) / levels; }
    return c;
  }
  function makeNoise(ctx, seconds) {
    var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 23;
    for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    return b;
  }
  function makeImpulse(ctx, seconds) {
    var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, n, ctx.sampleRate), s = 9;
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 3); } }
    return b;
  }
  var VOWELS = { m: [250, 1100, 2300], i: [320, 2400, 3100], a: [900, 1400, 2800], u: [380, 850, 2400], e: [500, 1900, 2600], o: [500, 900, 2400], "ä": [650, 1700, 2600], "ö": [450, 1500, 2400], "ü": [300, 1700, 2200] };
  var VOICE = [{ f: 1.15, rough: 0.08 }, { f: 1.05, rough: 0.12 }, { f: 0.85, rough: 0.4 }, { f: 0.7, rough: 0.6 }, { f: 1.35, rough: 0.05 }];

  function createEngine(ctx, destination, startTime, fromBeat) {
    var master = ctx.createGain(), limiter = ctx.createWaveShaper();
    master.gain.value = 1.25; limiter.curve = tanhCurve(1.5, 0.9);
    master.connect(limiter).connect(destination);
    // Paula: 8-Bit-Körnung und etwas Tiefpass
    var paula = ctx.createWaveShaper(), lp = ctx.createBiquadFilter();
    paula.curve = crushCurve(96); lp.type = "lowpass"; lp.frequency.value = 9500;
    paula.connect(lp).connect(master);
    var reverb = ctx.createConvolver(), wet = ctx.createGain();
    reverb.buffer = makeImpulse(ctx, 1.6); wet.gain.value = 0.35; reverb.connect(wet).connect(master);
    var echo = ctx.createDelay(1), fb = ctx.createGain(), echoOut = ctx.createGain();
    echo.delayTime.value = BEAT * 0.75; fb.gain.value = 0.3; echoOut.gain.value = 0.3;
    echo.connect(fb).connect(echo); echo.connect(echoOut).connect(master);
    function chan(v, pan, rev, ec) {
      var g = ctx.createGain(); g.gain.value = v;
      var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.value = pan; g.connect(p).connect(paula); } else g.connect(paula);
      if (rev) { var r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(reverb); }
      if (ec) { var e = ctx.createGain(); e.gain.value = ec; g.connect(e).connect(echo); }
      return g;
    }
    // Amiga-typisch: Kanal 1 und 4 links, 2 und 3 rechts
    var leadBus = chan(0.17, -0.6, 0.15, 0.6), bassBus = chan(0.36, 0.6, 0), arpBus = chan(0.11, 0.6, 0.15), drumBus = chan(0.55, -0.6, 0.06),
      lead2Bus = chan(0.12, 0.6, 0.2, 0.4), chordBus = chan(0.12, -0.3, 0.3), droneBus = chan(0.3, 0, 0.4);
    var voxBus = ctx.createGain(); voxBus.gain.value = 0.42; voxBus.connect(master);
    var vr = ctx.createGain(); vr.gain.value = 0.3; voxBus.connect(vr).connect(reverb);
    var fxBus = ctx.createGain(); fxBus.gain.value = 0.42; fxBus.connect(master);
    var fr = ctx.createGain(); fr.gain.value = 0.25; fxBus.connect(fr).connect(reverb);
    var noise = makeNoise(ctx, 2);

    function beatTime(b, i) { return startTime + b * BEAT + (hash(b * 5.3 + i) - 0.5) * 0.004; }
    function osc(t, type, f, len, dest, vol, a, rel, detune) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (a || 0.004)); g.gain.setTargetAtTime(0.0001, t + len, rel || 0.04);
      o.connect(g).connect(dest); o.start(t); o.stop(t + len + (rel || 0.04) * 6);
      return o;
    }
    function noiseHit(t, vol, type, freq, len, q, dest) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f).connect(g).connect(dest || drumBus); src.start(t, (t * 1.3) % 1); src.stop(t + len + 0.02);
      return { f: f, g: g };
    }
    function sweep(t, type, f0, f1, len, vol, dest) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.8);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g).connect(dest || drumBus); o.start(t); o.stop(t + len + 0.02);
    }
    function drum(t, e) {
      if (e.type === "k") { sweep(t, "sine", 140, 45, 0.22, e.v); noiseHit(t, 0.1 * e.v, "lowpass", 2500, 0.015); }
      else if (e.type === "s") { noiseHit(t, 0.4 * e.v, "bandpass", 2000, 0.14, 0.7); sweep(t, "square", 220, 150, 0.06, 0.15 * e.v); }
      else if (e.type === "h") noiseHit(t, 0.2 * e.v, "highpass", 8000, 0.03);
      else if (e.type === "c") noiseHit(t, 0.28 * e.v, "highpass", 5000, 1.3);
    }
    /** Lead wie ein Tracker-Sample: Rechteck mit leichtem Vibrato */
    function lead(t, e, bus) {
      var d = e.d * BEAT, o = osc(t, "square", midiToFreq(e.midi), d, bus, 0.5 * e.v, 0.004, 0.05);
      if (d > 0.3) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.setValueAtTime(0, t + 0.1); lg.gain.linearRampToValueAtTime(midiToFreq(e.midi) * 0.012, t + 0.3); l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + d + 0.1); }
      osc(t, "triangle", midiToFreq(e.midi), d, bus, 0.35 * e.v, 0.004, 0.05);
    }
    /** klassischer Tracker-Arpeggio-Effekt: Grundton/Terz/Quinte im 50-Hz-Takt */
    function arpeggio(t, e) {
      var o = ctx.createOscillator(), g = ctx.createGain(), d = e.d * BEAT, tick = 0.02, k = 0;
      o.type = "square";
      for (var tt = 0; tt < d; tt += tick, k++) o.frequency.setValueAtTime(midiToFreq(e.notes[k % e.notes.length]), t + tt);
      g.gain.setValueAtTime(0.5 * e.v, t); g.gain.setTargetAtTime(0.0001, t + d * 0.6, 0.04);
      o.connect(g).connect(arpBus); o.start(t); o.stop(t + d + 0.2);
    }
    function voice(t, n) {
      var V = VOICE[n.cat] || VOICE[0], d = Math.max(0.12, n.d * BEAT), f = midiToFreq(n.midi);
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), src = ctx.createGain(), out = ctx.createGain(), o2g = ctx.createGain();
      o.type = "sawtooth"; o2.type = "square"; o2g.gain.value = V.rough;
      [o.frequency, o2.frequency].forEach(function (p, i) {
        var m = i ? 0.5 : 1;
        p.setValueAtTime(f * 0.92 * m, t); p.exponentialRampToValueAtTime(f * m, t + 0.06);
        if (n.to) p.exponentialRampToValueAtTime(midiToFreq(n.to) * m, t + d * 0.95); else p.exponentialRampToValueAtTime(f * 0.88 * m, t + d);
      });
      o.connect(src); o2.connect(o2g).connect(src);
      var w = (n.word || "miau").toLowerCase(), vs = w.replace(/[^aeiouäöü]/g, "").split("").slice(0, 6);
      if (!vs.length) vs = ["a"];
      [0, 1, 2].forEach(function (k) {
        var bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = "bandpass"; bp.Q.value = [6, 9, 11][k];
        vs.forEach(function (v, j) { var fr = VOWELS[v][k] * V.f, tt = t + j / Math.max(1, vs.length - 1) * d * 0.9; if (j === 0) bp.frequency.setValueAtTime(fr, tt); else bp.frequency.linearRampToValueAtTime(fr, tt); });
        g.gain.value = [1, 0.7, 0.3][k];
        src.connect(bp); bp.connect(g).connect(out);
      });
      var vol = n.soft ? 0.5 : 0.85;
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(vol, t + 0.03); out.gain.setTargetAtTime(0.0001, t + d - 0.05, 0.04);
      out.connect(voxBus);
      [o, o2].forEach(function (x) { x.start(t); x.stop(t + d + 0.25); });
    }
    function fx(t, e) {
      var d = (e.d || 1) * BEAT, i, n;
      if (e.type === "saugen") { n = noiseHit(t, 0.001, "bandpass", 3000, d, 3, fxBus); n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.001, t); n.g.gain.exponentialRampToValueAtTime(0.3, t + d * 0.5); n.g.gain.exponentialRampToValueAtTime(0.001, t + d); n.f.frequency.exponentialRampToValueAtTime(150, t + d); sweep(t, "sawtooth", 600, 60, d, 0.08, fxBus); }
      else if (e.type === "husten") { sweep(t, "sawtooth", 90, 50, 0.15, 0.3, fxBus); noiseHit(t, 0.2, "lowpass", 600, 0.15, 0, fxBus); }
      else if (e.type === "knall") { noiseHit(t, 0.9, "lowpass", 2500, 0.4, 0, fxBus); sweep(t, "sine", 120, 40, 0.4, 0.8, fxBus); }
      else if (e.type === "motor") { for (i = 0; i < e.d * 2; i++) sweep(t + i * BEAT / 2, "sawtooth", 95, 80, 0.1, 0.04, fxBus); }
      else if (e.type === "plopp") { sweep(t, "sine", 700, 90, 0.2, 0.7, fxBus); }
      else if (e.type === "funkeln") { for (i = 0; i < 12; i++) osc(t + i * 0.05, "square", midiToFreq(84 + [0, 4, 7, 12][i % 4] + Math.floor(i / 4) * 2), 0.05, fxBus, 0.06, 0.002, 0.08); }
      else if (e.type === "pfff") { noiseHit(t, 0.4, "highpass", 2000, 1.2, 0, fxBus); sweep(t, "sawtooth", 80, 30, 0.6, 0.2, fxBus); }
      else if (e.type === "pling") { osc(t, "square", 1976, 0.05, fxBus, 0.12, 0.002, 0.15); osc(t + 0.08, "square", 2637, 0.05, fxBus, 0.12, 0.002, 0.25); }
      else if (e.type === "welle") { n = noiseHit(t, 0.12, "lowpass", 500, 1.8, 0, fxBus); n.f.frequency.linearRampToValueAtTime(1200, t + 0.9); }
      else if (e.type === "platsch") { noiseHit(t, 0.5, "bandpass", 1200, 0.5, 1, fxBus); sweep(t, "sine", 400, 900, 0.3, 0.2, fxBus); }
      else if (e.type === "donner") { noiseHit(t, 0.8, "lowpass", 300, 1.8, 0, fxBus); noiseHit(t, 0.4, "lowpass", 1500, 0.2, 0, fxBus); }
      else if (e.type === "regen") { noiseHit(t, 0.12, "highpass", 3000, d, 0, fxBus); }
      else if (e.type === "klatsch") { [0, 0.01, 0.02].forEach(function (o) { noiseHit(t + o, 0.5, "bandpass", 1500, 0.1, 1.2, fxBus); }); }
      else if (e.type === "regenbogen") { for (i = 0; i < 24; i++) osc(t + i * 0.06, "triangle", midiToFreq(60 + [0, 4, 7, 12, 16, 19][i % 6] + Math.floor(i / 6) * 12), 0.12, fxBus, 0.08, 0.003, 0.2); }
    }
    var tracks = [
      { list: song.drums, play: drum },
      { list: song.lead, play: function (t, e) { lead(t, e, leadBus); } },
      { list: song.lead2, play: function (t, e) { lead(t, e, lead2Bus); } },
      { list: song.bass, play: function (t, e) { var d = e.d * BEAT, f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; f.connect(bassBus); osc(t, "sawtooth", midiToFreq(e.midi), d, f, 0.6 * e.v, 0.004, 0.04); osc(t, "triangle", midiToFreq(e.midi), d, bassBus, 0.5 * e.v, 0.004, 0.04); } },
      { list: song.arp, play: arpeggio },
      { list: song.chords, play: function (t, e) { if (!e.v) return; e.notes.forEach(function (m) { [-7, 7].forEach(function (dt) { osc(t, "sawtooth", midiToFreq(m), e.d * BEAT, chordBus, 0.22 * e.v, 0.12, 0.3, dt); }); }); } },
      { list: song.drone, play: function (t, e) { var d = e.d * BEAT; [-15, 0, 15].forEach(function (dt) { osc(t, "sawtooth", midiToFreq(e.midi), d, droneBus, 0.25 * e.v, 0.6, 0.6, dt); }); noiseHit(t, 0.06 * e.v, "lowpass", 400, d, 0, droneBus); } },
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

  global.RoadtripMusik = {
    BPM: BPM, BEAT: BEAT, BAR: BAR, SECTIONS: SECTIONS, TOTAL_BARS: TOTAL_BARS, DURATION: DURATION, COLORS: COLORS, MOTIF: MOTIF,
    song: song, at: at2, sectionStart: sectionStart, colorsAt: colorsAt, start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
