/**
 * HabaneraMusik – die Habanera aus Bizets „Carmen“ (1875, gemeinfrei) als
 * Pop-Rock-Rap für zwei Katzen, live per Web Audio erzeugt.
 *
 * Damit es möglichst natürlich klingt: Bass und Gitarren sind gezupfte
 * Saiten (Karplus-Strong aus musik.js), die Rock-Gitarre läuft durch eine
 * Verzerrung, die Katzenstimmen sind Formant-Synthese mit Vibrato, Anschleifen
 * der Töne und „mi-a-u“-Vokalen; dazu Hall und leicht ungenaues Timing.
 *
 * Der Song ist als Liste von Ereignissen in Schlägen beschrieben (song),
 * Musik und Grafik lesen beide daraus.
 */
(function (global) {
  "use strict";

  var BPM = 100, BEAT = 60 / BPM, BAR = 2; // 2/4-Takt
  var SECTIONS = [
    { name: "intro", bars: 4 }, { name: "strophe", bars: 8 }, { name: "rap", bars: 8 }, { name: "aufbau", bars: 2 },
    { name: "refrain", bars: 8 }, { name: "rap2", bars: 4 }, { name: "refrain2", bars: 8 }, { name: "outro", bars: 4 }
  ];
  (function () { var b = 0; SECTIONS.forEach(function (s) { s.start = b; b += s.bars; }); })();
  var TOTAL_BARS = SECTIONS.reduce(function (n, s) { return n + s.bars; }, 0);
  var DURATION = TOTAL_BARS * BAR * BEAT + 2.5;

  // Bizets Melodie in d-Moll: [Schlag im Zweitakter, Länge, MIDI-Ton]; T = Triole
  var T = 1 / 6;
  var P1 = [[0, 1, 74], [1, 0.5, 73], [1.5, T, 72], [1.5 + T, T, 72], [1.5 + 2 * T, T, 72], [2, 0.5, 71], [2.5, 0.5, 70], [3, 0.5, 69], [3.5, 0.5, 69]];
  var P2 = [[0, 1, 68], [1, 0.5, 67], [1.5, T, 65], [1.5 + T, T, 67], [1.5 + 2 * T, T, 65], [2, 0.5, 64], [2.5, 0.5, 65], [3, 0.5, 67], [3.5, 0.5, 65]];
  var P4 = [[0, 1, 67], [1, 0.5, 65], [1.5, T, 64], [1.5 + T, T, 65], [1.5 + 2 * T, T, 64], [2, 0.5, 62], [2.5, 0.5, 61], [3, 1, 62]];
  var LINES = ["L'amour est un oiseau rebelle", "que nul ne peut apprivoiser,", "et c'est bien en vain qu'on l'appelle,", "s'il lui convient de refuser."];
  var CHORDS = {
    Dm: { bass: 38, gtr: [50, 57, 62, 65] }, A: { bass: 33, gtr: [45, 52, 57, 61] },
    Bb: { bass: 34, gtr: [46, 53, 58, 62] }, Gm: { bass: 31, gtr: [43, 50, 55, 58] }
  };
  var RAP_WORDS = ["Miau", "mau", "mi-", "MAU!", "mrrr", "miau", "yo!", "Mau"];
  var RAP_PATTERNS = [[0, 0.25, 0.5, 1, 1.25, 1.75], [0, 0.5, 0.75, 1, 1.5, 1.75], [0, 0.25, 0.75, 1, 1.5], [0, 0.5, 0.75, 1.25, 1.5, 1.75]];

  function hash(n) { var h = Math.sin(n * 91.7 + 13.1) * 43758.5453; return h - Math.floor(h); }

  /** Baut den ganzen Song als Ereignislisten (Zeiten in Schlägen). */
  function build() {
    var vocals = [], drums = [], bass = [], guitar = [], sfx = [], lines = [];
    function sec(name) { return SECTIONS.filter(function (s) { return s.name === name; })[0]; }
    function phrase(P, bar, cat, shift, lineIdx) {
      P.forEach(function (n) { vocals.push({ t: bar * BAR + n[0], d: n[1] * 0.95, midi: n[2] + shift, cat: cat, type: "sing" }); });
      if (lineIdx !== undefined) lines.push({ t: bar * BAR, d: 4, text: LINES[lineIdx], cat: cat });
    }
    function drumBar(bar, kind, first) {
      var t = bar * BAR;
      if (kind === "light") {
        drums.push({ t: t, type: "k", v: 0.8 }, { t: t + 0.75, type: "k", v: 0.5 }, { t: t + 1, type: "r", v: 0.6 });
        [0, 0.5, 1, 1.5].forEach(function (o) { drums.push({ t: t + o, type: "h", v: 0.5 }); });
      } else if (kind === "boom") {
        drums.push({ t: t, type: "k", v: 1 }, { t: t + 0.75, type: "k", v: 0.8 }, { t: t + 1, type: "s", v: 0.9 });
        if (bar % 2) drums.push({ t: t + 1.5, type: "k", v: 0.7 });
        for (var i = 0; i < 8; i++) drums.push({ t: t + i * 0.25 + (i % 2 ? 0.03 : 0), type: "h", v: i % 2 ? 0.3 : 0.6 });
      } else if (kind === "rock") {
        drums.push({ t: t, type: "k", v: 1 }, { t: t + 0.75, type: "k", v: 0.9 }, { t: t + 1.5, type: "k", v: 0.8 }, { t: t + 1, type: "s", v: 1 });
        [0, 0.5, 1, 1.5].forEach(function (o) { drums.push({ t: t + o, type: "o", v: 0.55 }); });
        if (first) drums.push({ t: t, type: "c", v: 1 });
      } else if (kind === "fill") {
        drums.push({ t: t, type: "k", v: 1 }, { t: t + 0.75, type: "k", v: 0.8 });
        [1, 1.25, 1.5, 1.75].forEach(function (o, i) { drums.push({ t: t + o, type: "s", v: 0.55 + i * 0.15 }); });
      }
    }
    function bassBar(bar, ch, v) {
      var t = bar * BAR, r = CHORDS[ch].bass;
      bass.push({ t: t, d: 0.7, midi: r, v: v }, { t: t + 0.75, d: 0.25, midi: r + 7, v: v * 0.8 }, { t: t + 1, d: 0.45, midi: r + 12, v: v * 0.9 }, { t: t + 1.5, d: 0.45, midi: r + 7, v: v * 0.85 });
    }
    function gtrBar(bar, ch, kind) {
      var t = bar * BAR, g = CHORDS[ch].gtr;
      if (kind === "arp") [0, 1, 2, 3].forEach(function (i) { guitar.push({ t: t + i * 0.5, d: 0.9, notes: [g[[1, 2, 3, 2][i]] + 12], v: 0.6 }); });
      else if (kind === "stab") guitar.push({ t: t + 1, d: 0.3, notes: g, v: 0.55 }, { t: t + 1.5, d: 0.25, notes: g, v: 0.45 });
      else if (kind === "funk") guitar.push({ t: t + 0.75, d: 0.15, notes: g.slice(1), v: 0.5 }, { t: t + 1.5, d: 0.15, notes: g.slice(1), v: 0.5 }, { t: t + 1.75, d: 0.12, notes: g.slice(2), v: 0.35 });
      else if (kind === "rock") {
        var p = [g[0], g[1], g[0] + 12];
        guitar.push({ t: t, d: 0.7, notes: p, v: 1, dist: true }, { t: t + 0.75, d: 0.22, notes: p, v: 0.8, dist: true }, { t: t + 1, d: 0.45, notes: p, v: 0.9, dist: true }, { t: t + 1.5, d: 0.45, notes: p, v: 0.85, dist: true });
      }
    }
    function rapBar(bar, cat, base, seed) {
      RAP_PATTERNS[(bar + seed) % RAP_PATTERNS.length].forEach(function (o, i) {
        var h = hash(bar * 17 + i * 3 + seed);
        vocals.push({ t: bar * BAR + o, d: 0.2, midi: base + [0, 3, 0, 5, 7, 0, 3, -2][Math.floor(h * 8)], cat: cat, type: "rap", word: RAP_WORDS[(bar * 3 + i + seed) % RAP_WORDS.length], accent: o === 0 || o === 1 });
      });
    }

    var s, b, ch;
    // Intro: Bass und gezupfte Gitarre im Habanera-Rhythmus
    s = sec("intro");
    for (b = 0; b < s.bars; b++) { ch = b < 2 ? "Dm" : b === 2 ? "A" : "A"; bassBar(s.start + b, ch, 0.8); gtrBar(s.start + b, ch, "arp"); if (b >= 2) drumBar(s.start + b, b === 3 ? "fill" : "light"); }
    vocals.push({ t: (s.start + 3) * BAR + 0.5, d: 0.25, midi: 69, cat: 0, type: "adlib", word: "Ähem!" });

    // Strophe: die Diva singt, der Kater antwortet eine Oktave tiefer
    s = sec("strophe");
    ["Dm", "Dm", "A", "A", "Dm", "Dm", "A", "A"].forEach(function (c, i) { bassBar(s.start + i, c, 0.85); gtrBar(s.start + i, c, i % 2 ? "stab" : "arp"); drumBar(s.start + i, i === 7 ? "fill" : "light"); });
    phrase(P1, s.start, 0, 0, 0); phrase(P2, s.start + 2, 0, 0, 1);
    phrase(P1, s.start + 4, 1, -12, 2); phrase(P4, s.start + 6, 1, -12, 3);

    // Rap: der Kater rappt, die Diva wirft „Miau!“ ein
    s = sec("rap");
    ["Dm", "Dm", "Bb", "A", "Dm", "Dm", "Bb", "A"].forEach(function (c, i) {
      bassBar(s.start + i, c, 1); gtrBar(s.start + i, c, "funk"); drumBar(s.start + i, i === 7 ? "fill" : "boom");
      rapBar(s.start + i, 1, 50, 0);
      if (i % 2) vocals.push({ t: (s.start + i) * BAR + 1.5, d: 0.3, midi: i % 4 === 3 ? 81 : 77, cat: 0, type: "adlib", word: i % 4 === 3 ? "MIAU!" : "Miau!" });
    });

    // Aufbau: die Diva zieht einen Ton nach oben
    s = sec("aufbau");
    bassBar(s.start, "A", 1); bassBar(s.start + 1, "A", 1); drumBar(s.start, "boom"); drumBar(s.start + 1, "fill");
    guitar.push({ t: s.start * BAR, d: 3.8, notes: [45, 52, 57], v: 0.7, dist: true });
    vocals.push({ t: s.start * BAR, d: 3.7, midi: 69, to: 76, cat: 0, type: "sing", word: "Miaaaaau!" });
    [0, 1, 2, 3, 3.5].forEach(function (o) { vocals.push({ t: s.start * BAR + o, d: 0.2, midi: 57, cat: 1, type: "rap", word: "yo!", accent: true }); });

    // Refrain: Rock, beide singen die Melodie in Oktaven
    function refrain(name, big) {
      s = sec(name);
      ["Dm", "Bb", "Gm", "A", "Dm", "Bb", "Gm", "A"].forEach(function (c, i) { bassBar(s.start + i, c, 1); gtrBar(s.start + i, c, "rock"); drumBar(s.start + i, i === 7 ? "fill" : "rock", i % 4 === 0); });
      [[P1, 0], [P2, 1], [P1, 2], [P4, 3]].forEach(function (p, i) {
        phrase(p[0], s.start + i * 2, 0, 0, p[1]);
        phrase(p[0], s.start + i * 2, 1, -12);
        if (big) vocals.push({ t: (s.start + i * 2) * BAR + 3.5, d: 0.4, midi: 81, cat: 0, type: "adlib", word: "Miau!" });
      });
    }
    refrain("refrain", false);

    // Rap im Wechsel
    s = sec("rap2");
    ["Dm", "Dm", "Bb", "A"].forEach(function (c, i) {
      bassBar(s.start + i, c, 1); gtrBar(s.start + i, c, "funk"); drumBar(s.start + i, i === 3 ? "fill" : "boom");
      if (i === 3) { rapBar(s.start + i, 1, 50, 5); rapBar(s.start + i, 0, 69, 2); } else rapBar(s.start + i, i % 2, i % 2 ? 50 : 69, 3);
    });
    refrain("refrain2", true);

    // Schluss: langer Ton, ein Stiefel fliegt, ein letztes „Miau?“
    s = sec("outro");
    var t0 = s.start * BAR;
    drums.push({ t: t0, type: "c", v: 1 }, { t: t0, type: "k", v: 1 });
    guitar.push({ t: t0, d: 3.6, notes: [50, 57, 62], v: 1, dist: true });
    bass.push({ t: t0, d: 3.5, midi: 38, v: 1 });
    vocals.push({ t: t0, d: 3.4, midi: 74, cat: 0, type: "sing", word: "MIAAAAU!" }, { t: t0, d: 3.4, midi: 62, cat: 1, type: "sing", word: "MAAAAU!" });
    sfx.push({ t: t0 + 3.6, type: "whoosh" }, { t: t0 + 4.4, type: "thud" });
    vocals.push({ t: t0 + 4.4, d: 0.3, midi: 79, to: 86, cat: 0, type: "adlib", word: "MRAU!" });
    vocals.push({ t: t0 + 6, d: 0.45, midi: 62, to: 67, cat: 1, type: "adlib", word: "… Miau?" });
    guitar.push({ t: t0 + 7, d: 0.6, notes: [50, 57, 62, 65], v: 0.8 });
    bass.push({ t: t0 + 7, d: 0.8, midi: 38, v: 0.9 });
    drums.push({ t: t0 + 7, type: "k", v: 0.9 }, { t: t0 + 7, type: "c", v: 0.5 });

    [vocals, drums, bass, guitar, sfx, lines].forEach(function (a) { a.sort(function (x, y) { return x.t - y.t; }); });
    return { vocals: vocals, drums: drums, bass: bass, guitar: guitar, sfx: sfx, lines: lines };
  }
  var song = build();

  /** Abschnitt, Takt und Position im Takt zu einer Songzeit in Sekunden. */
  function at(time) {
    var beat = time / BEAT, bar = Math.floor(beat / BAR), s = SECTIONS[SECTIONS.length - 1];
    if (bar >= TOTAL_BARS) return { section: "ende", index: SECTIONS.length, bar: bar - TOTAL_BARS, beat: beat, inBar: beat % BAR, progress: 1 };
    for (var i = 0; i < SECTIONS.length; i++) if (bar < SECTIONS[i].start + SECTIONS[i].bars) { s = SECTIONS[i]; break; }
    return { section: s.name, index: SECTIONS.indexOf(s), bar: bar - s.start, beat: beat, inBar: beat % BAR, progress: (beat / BAR - s.start) / s.bars };
  }

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
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch);
      for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    }
    return b;
  }
  /** Gezupfte Saite (Karplus-Strong), wie in musik.js. */
  function pluckData(sampleRate, freq, seconds, seed) {
    if (global.Musik && global.Musik.makePluck) return global.Musik.makePluck(sampleRate, freq, seconds, seed);
    var n = Math.floor(sampleRate * seconds), out = new Float32Array(n), period = Math.max(2, Math.round(sampleRate / freq)), buf = new Float32Array(period), s = seed || 1, idx = 0;
    for (var i = 0; i < period; i++) { s = (s * 16807) % 2147483647; buf[i] = (s / 2147483647) * 2 - 1; }
    for (var t = 0; t < n; t++) { var nx = (idx + 1) % period, v = buf[idx]; out[t] = v; buf[idx] = 0.996 * 0.5 * (v + buf[nx]); idx = nx; }
    return out;
  }

  // Formanten der Vokale (Hz) für „m-i-a-u“
  var VOWELS = { m: [250, 1100, 2300], i: [320, 2400, 3100], a: [900, 1400, 2800], u: [380, 850, 2400] };

  function createEngine(ctx, destination, startTime, fromBeat) {
    var master = ctx.createGain(), limiter = ctx.createWaveShaper();
    master.gain.value = 0.8;
    limiter.curve = tanhCurve(1.5, 0.9);
    master.connect(limiter).connect(destination);
    var reverb = ctx.createConvolver(), wet = ctx.createGain();
    reverb.buffer = makeImpulse(ctx, 1.7);
    wet.gain.value = 0.5;
    reverb.connect(wet).connect(master);
    function bus(v, sendAmount) {
      var g = ctx.createGain();
      g.gain.value = v;
      g.connect(master);
      if (sendAmount) { var sd = ctx.createGain(); sd.gain.value = sendAmount; g.connect(sd).connect(reverb); }
      return g;
    }
    var drumBus = bus(0.7, 0.12), bassBus = bus(0.46, 0), cleanBus = bus(0.34, 0.3), voxBus = bus(0.5, 0.35), fxBus = bus(0.5, 0.3);
    // Rock-Gitarre: Verzerrung, dann ein „Lautsprecher“-Filter
    var drive = ctx.createWaveShaper(), cab = ctx.createBiquadFilter(), pre = ctx.createGain();
    pre.gain.value = 2.2;
    drive.curve = tanhCurve(6, 1);
    cab.type = "lowpass"; cab.frequency.value = 3200; cab.Q.value = 0.8;
    pre.connect(drive).connect(cab).connect(bus(0.15, 0.2));
    var noise = makeNoise(ctx, 1), plucks = {};

    function beatTime(b, i) { return startTime + b * BEAT + (hash(b * 7.3 + i) - 0.5) * 0.014; }   // leicht ungenau wie echte Spieler
    function pluckBuffer(midi) {
      if (!plucks[midi]) {
        var data = pluckData(ctx.sampleRate, midiToFreq(midi), 2.2, midi * 97 + 1), b = ctx.createBuffer(1, data.length, ctx.sampleRate);
        b.getChannelData(0).set(data);
        plucks[midi] = b;
      }
      return plucks[midi];
    }
    function pluck(t, midi, len, vol, dest, cutoff) {
      var src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      src.buffer = pluckBuffer(midi);
      f.type = "lowpass"; f.frequency.value = cutoff;
      g.gain.setValueAtTime(vol, t);
      g.gain.setTargetAtTime(0, t + len, 0.05);
      src.connect(f).connect(g).connect(dest);
      src.start(t);
      src.stop(t + len + 0.4);
    }
    function noiseHit(t, vol, type, freq, len, q, dest) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise;
      f.type = type; f.frequency.value = freq;
      if (q) f.Q.value = q;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f).connect(g).connect(dest || drumBus);
      src.start(t, (t * 1.9) % 0.5);
      src.stop(t + len + 0.02);
      return f;
    }
    function tone(t, type, f0, f1, len, vol, dest) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.7);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g).connect(dest || drumBus);
      o.start(t); o.stop(t + len + 0.02);
    }
    function drum(t, e) {
      if (e.type === "k") { tone(t, "sine", 150, 48, 0.28, e.v); noiseHit(t, 0.15 * e.v, "lowpass", 2500, 0.02); }
      else if (e.type === "s") { noiseHit(t, 0.5 * e.v, "bandpass", 2300, 0.2, 0.7); noiseHit(t, 0.25 * e.v, "highpass", 5000, 0.12); tone(t, "triangle", 220, 170, 0.12, 0.45 * e.v); }
      else if (e.type === "r") { noiseHit(t, 0.3 * e.v, "bandpass", 1700, 0.04, 4); tone(t, "triangle", 820, 780, 0.04, 0.2 * e.v); }
      else if (e.type === "h") noiseHit(t, 0.26 * e.v, "highpass", 8500, 0.035);
      else if (e.type === "o") noiseHit(t, 0.17 * e.v, "highpass", 7000, 0.16);
      else if (e.type === "c") { noiseHit(t, 0.3 * e.v, "highpass", 4500, 1.5); noiseHit(t, 0.12 * e.v, "bandpass", 9000, 1.1, 2); }
    }

    /** Katzenstimme: Sägezahn mit Vibrato durch drei wandernde Formant-Filter („mi-a-u“). */
    function voice(t, n) {
      var cat = n.cat, rap = n.type === "rap", d = Math.max(0.09, n.d * BEAT), f = midiToFreq(n.midi + (hash(n.t * 3.1 + cat) - 0.5) * 0.25);
      var scale = cat === 0 ? 1.12 : 0.92, vol = (rap ? 0.8 : 1) * (n.accent === false ? 0.75 : 1);
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), src = ctx.createGain(), out = ctx.createGain();
      o.type = "sawtooth";
      o2.type = "square";
      var freqs = [o.frequency, o2.frequency];
      freqs.forEach(function (p, i) {
        var m = i ? 0.5 : 1;
        if (rap) {
          p.setValueAtTime(f * 1.12 * m, t);
          p.exponentialRampToValueAtTime(f * 0.84 * m, t + d);
        } else {
          p.setValueAtTime(f * 0.89 * m, t);                                // Ton von unten anschleifen
          p.exponentialRampToValueAtTime(f * m, t + Math.min(0.08, d * 0.4));
          if (n.to) p.exponentialRampToValueAtTime(midiToFreq(n.to) * m, t + d * 0.95);
          else { p.setValueAtTime(f * m, t + d * 0.85); p.exponentialRampToValueAtTime(f * 0.95 * m, t + d); }
        }
      });
      var o2g = ctx.createGain();
      o2g.gain.value = cat === 1 ? 0.35 : 0.12;      // der Kater klingt rauer
      o.connect(src); o2.connect(o2g).connect(src);
      if (!rap && d > 0.32) {
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 5.3 + cat * 0.5;
        lg.gain.setValueAtTime(0, t + 0.14);
        lg.gain.linearRampToValueAtTime(f * (d > 1.5 ? 0.022 : 0.012), t + 0.4);
        lfo.connect(lg);
        lg.connect(o.frequency); lg.connect(o2.frequency);
        lfo.start(t); lfo.stop(t + d + 0.1);
      }
      var path = rap ? [["a", 0], ["u", 1]] : d < 0.25 ? [["i", 0], ["a", 1]] : [["m", 0], ["i", 0.05 / d], ["a", 0.45], ["u", 1]];
      [0, 1, 2].forEach(function (k) {
        var bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = "bandpass"; bp.Q.value = [6, 9, 11][k];
        path.forEach(function (v, j) {
          var fr = VOWELS[v[0]][k] * scale, tt = t + v[1] * d;
          if (j === 0) bp.frequency.setValueAtTime(fr, tt); else bp.frequency.linearRampToValueAtTime(fr, tt);
        });
        g.gain.value = [1, 0.7, 0.3][k];
        src.connect(bp); bp.connect(g).connect(out);
      });
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(vol, t + (rap ? 0.012 : 0.03));
      out.gain.setTargetAtTime(0.0001, t + d - (rap ? 0.03 : 0.06), rap ? 0.02 : 0.035);
      out.connect(voxBus);
      [o, o2].forEach(function (x) { x.start(t); x.stop(t + d + 0.25); });
      if (rap) noiseHit(t, 0.12, "highpass", 3500, 0.02, 0, voxBus);       // kleiner Konsonant vorweg
      else noiseHit(t, 0.03, "highpass", 4000, Math.min(d, 0.3), 0, voxBus); // Atem
    }

    var tracks = [
      { list: song.drums, play: function (t, e) { drum(t, e); } },
      { list: song.bass, play: function (t, e) { pluck(t, e.midi, e.d * BEAT, e.v, bassBus, 700); tone(t, "sine", midiToFreq(e.midi), midiToFreq(e.midi), Math.min(0.5, e.d * BEAT), 0.35 * e.v, bassBus); } },
      { list: song.guitar, play: function (t, e) { e.notes.forEach(function (m, i) { pluck(t + i * (e.dist ? 0.006 : 0.018), m, e.d * BEAT, e.v * (e.dist ? 0.5 : 0.8), e.dist ? pre : cleanBus, e.dist ? 2600 : 3800); }); } },
      { list: song.vocals, play: function (t, e) { voice(t, e); } },
      { list: song.sfx, play: function (t, e) {
        if (e.type === "whoosh") { var f = noiseHit(t, 0.35, "bandpass", 500, 0.75, 2, fxBus); f.frequency.exponentialRampToValueAtTime(3000, t + 0.6); }
        else { tone(t, "sine", 120, 45, 0.3, 1, fxBus); noiseHit(t, 0.5, "lowpass", 900, 0.18, 0, fxBus); }
      } }
    ];
    tracks.forEach(function (tr) { tr.i = 0; while (tr.i < tr.list.length && tr.list[tr.i].t < (fromBeat || 0)) tr.i++; });

    return {
      master: master,
      scheduleUntil: function (until) {
        tracks.forEach(function (tr, ti) {
          while (tr.i < tr.list.length) {
            var e = tr.list[tr.i], t = beatTime(e.t, ti);
            if (t >= until) break;
            tr.play(Math.max(t, 0), e);
            tr.i++;
          }
        });
      }
    };
  }

  // ---------- Wiedergabe ----------

  var ctx = null, engine = null, timer = null, playing = false, startTime = 0;
  /** Startet die Musik; offset (Sekunden) steigt mitten im Stück ein. */
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
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 0.25);
    setTimeout(function () { old.master.disconnect(); }, 500);
    engine = null;
    playing = false;
  }
  function time() { return playing ? Math.max(0, ctx.currentTime - startTime) : null; }
  /** Rendert `seconds` Sekunden offline, beginnend bei Songzeit `from` (für Tests und Hörproben). */
  function render(seconds, sampleRate, from) {
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100);
    from = from || 0;
    createEngine(off, off.destination, -from, from / BEAT).scheduleUntil(seconds);
    return off.startRendering();
  }

  global.HabaneraMusik = {
    BPM: BPM, BEAT: BEAT, BAR: BAR, SECTIONS: SECTIONS, TOTAL_BARS: TOTAL_BARS, DURATION: DURATION, LINES: LINES, P1: P1, P2: P2, P4: P4,
    song: song, at: at, start: start, stop: stop, time: time, render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
