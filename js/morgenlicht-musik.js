/**
 * MorgenlichtMusik – eigene Komposition für „Morgenlicht“, live per Web Audio.
 * Melancholisch und ruhig (a-Moll, 80 BPM): Klavier, warme Flächen, ein leiser
 * Puls durch die nächtliche Stadt, Meeresrauschen. Mit den Laternen hellt sich
 * alles auf, und der Sonnenaufgang wird ein aufsteigendes C-Dur mit sanftem Beat.
 */
(function (global) {
  "use strict";

  var BPM = 80, BEAT = 60 / BPM, BAR = 4;
  var SECTIONS = [{ name: "erwachen", bars: 6 }, { name: "stadt", bars: 8 }, { name: "meer", bars: 8 }, { name: "erinnerung", bars: 8 }, { name: "morgen", bars: 10 }];
  (function () { var b = 0; SECTIONS.forEach(function (s) { s.start = b; b += s.bars; }); })();
  var TOTAL_BARS = SECTIONS.reduce(function (n, s) { return n + s.bars; }, 0);
  var DURATION = TOTAL_BARS * BAR * BEAT + 4;
  function sec(name) { return SECTIONS.filter(function (s) { return s.name === name; })[0]; }
  function at(name, bar, beat) { return (sec(name).start + bar) * BAR + (beat || 0); }
  var CH = { Am: [45, [57, 60, 64]], F: [41, [57, 60, 65]], C: [36, [55, 60, 64]], G: [43, [55, 59, 62]], Em: [40, [55, 59, 64]], Dm: [38, [57, 62, 65]], Fmaj7: [41, [57, 60, 64]], Cadd9: [36, [60, 62, 67]] };
  // das Motiv: melancholisch in Moll, im Morgen aufsteigend in Dur. [Schlag, Länge, Ton]
  var SAD = [[0, 1, 76], [1, 1, 72], [2, 2, 69], [4, 1, 74], [5, 1, 72], [6, 2, 71], [8, 1, 72], [9, 1, 69], [10, 2, 64], [12, 4, 67]];
  var HOPE = [[0, 1, 76], [1, 1, 72], [2, 2, 79], [4, 1, 77], [5, 1, 76], [6, 2, 74], [8, 1, 76], [9, 1, 79], [10, 2, 84], [12, 4, 83]];
  function hash(n) { var h = Math.sin(n * 91.7 + 13.1) * 43758.5453; return h - Math.floor(h); }

  function build() {
    var S = { piano: [], pad: [], pulse: [], strings: [], bells: [], drums: [], sfx: [] };
    function motif(t, M, v, shift) { M.forEach(function (n) { S.piano.push({ t: t + n[0], d: n[1], midi: n[2] + (shift || 0), v: v }); }); }
    function pianoChord(t, ch, v) { var ns = CH[ch][1]; S.piano.push({ t: t, d: 3.8, midi: CH[ch][0] + 12, v: v * 0.9 }); ns.forEach(function (m, i) { S.piano.push({ t: t + 0.5 + i * 0.5, d: 3, midi: m, v: v * 0.6 }); }); }
    var b, t, ch, sad = ["Am", "F", "C", "G"], hope = ["F", "G", "Am", "C", "F", "G", "C", "C"];
    for (b = 0; b < 6; b++) { t = at("erwachen", b); ch = sad[b % 4]; pianoChord(t, ch, 0.6); if (b >= 2) S.pad.push({ t: t, d: 4, notes: CH[ch][1], v: 0.35 }); }
    motif(at("erwachen", 2), SAD, 0.7);
    S.sfx.push({ t: at("erwachen", 0), type: "stadt", d: 24 });
    for (b = 0; b < 8; b++) {
      t = at("stadt", b); ch = sad[b % 4];
      S.pad.push({ t: t, d: 4, notes: CH[ch][1], v: 0.45 });
      for (var i = 0; i < 8; i++) S.pulse.push({ t: t + i * 0.5, d: 0.4, midi: CH[ch][0] + (i % 4 === 3 ? 12 : 0), v: 0.5 + (i % 2 ? 0 : 0.2) });
      if (b >= 2) S.drums.push({ t: t, type: "k", v: 0.45 }, { t: t + 2, type: "k", v: 0.35 });
      for (i = 0; i < 4; i++) S.drums.push({ t: t + i + 0.5, type: "h", v: 0.25 });
    }
    motif(at("stadt", 0), SAD, 0.6); motif(at("stadt", 4), SAD, 0.65, 12);
    S.sfx.push({ t: at("stadt", 3, 1), type: "miau" });
    for (b = 0; b < 8; b++) {
      t = at("meer", b); ch = ["Am", "Fmaj7", "C", "G"][b % 4];
      S.pad.push({ t: t, d: 4, notes: CH[ch][1], v: 0.5 }); S.strings.push({ t: t, d: 4, notes: CH[ch][1].map(function (m) { return m - 12; }), v: 0.35 });
      if (b % 2 === 0) S.sfx.push({ t: t, type: "welle", d: 8 });
      if (b >= 4) for (i = 0; i < 4; i++) S.bells.push({ t: t + i, d: 2, midi: CH[ch][1][i % 3] + 24, v: 0.35 });
    }
    motif(at("meer", 2), SAD, 0.55);
    for (b = 0; b < 8; b++) {
      t = at("erinnerung", b); ch = ["Am", "F", "C", "G", "F", "G", "C", "C"][b];
      S.pad.push({ t: t, d: 4, notes: CH[ch][1], v: 0.45 }); S.strings.push({ t: t, d: 4, notes: CH[ch][1], v: 0.4 + b * 0.04 });
      pianoChord(t, ch, 0.45);
      if (b % 2 === 0) S.sfx.push({ t: t, type: "welle", d: 8 });
    }
    motif(at("erinnerung", 0), SAD, 0.55); motif(at("erinnerung", 4), HOPE, 0.65, -12);
    S.sfx.push({ t: at("erinnerung", 5, 2), type: "funkeln" });
    // Morgen: die Laterne steigt, Sonnenaufgang in C-Dur, sanfter Beat
    for (b = 0; b < 10; b++) {
      t = at("morgen", b); ch = hope[b % 8];
      S.pad.push({ t: t, d: 4, notes: CH[ch][1].map(function (m) { return m + 12; }), v: 0.5 }); S.strings.push({ t: t, d: 4, notes: CH[ch][1], v: 0.55 });
      if (b >= 2 && b < 9) {
        for (i = 0; i < 8; i++) S.pulse.push({ t: t + i * 0.5, d: 0.4, midi: CH[ch][0] + 12, v: 0.6 });
        S.drums.push({ t: t, type: "k", v: 0.7 }, { t: t + 1, type: "k", v: 0.5 }, { t: t + 2, type: "k", v: 0.7 }, { t: t + 3, type: "k", v: 0.5 }, { t: t + 1, type: "c", v: 0.4 }, { t: t + 3, type: "c", v: 0.4 });
        for (i = 0; i < 8; i++) S.drums.push({ t: t + i * 0.5 + 0.25, type: "h", v: 0.3 });
        for (i = 0; i < 8; i++) S.bells.push({ t: t + i * 0.5, d: 1, midi: CH[ch][1][[0, 1, 2, 1][i % 4]] + 24, v: 0.3 });
      }
    }
    S.sfx.push({ t: at("morgen", 0), type: "aufstieg", d: 8 }, { t: at("morgen", 4), type: "voegel" }, { t: at("morgen", 7), type: "voegel" });
    motif(at("morgen", 2), HOPE, 0.75); motif(at("morgen", 6), HOPE, 0.8, 12);
    t = at("morgen", 9); S.piano.push({ t: t, d: 4, midi: 48, v: 0.8 }); [60, 64, 67, 72, 76].forEach(function (m, i) { S.piano.push({ t: t + i * 0.25, d: 4, midi: m, v: 0.6 }); });
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
  function makeNoise(ctx, seconds) { var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 53; for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } return b; }
  function makeImpulse(ctx, seconds) { var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, n, ctx.sampleRate), s = 17; for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 2); } } return b; }

  function createEngine(ctx, destination, startTime, fromBeat) {
    var master = ctx.createGain(), limiter = ctx.createWaveShaper();
    master.gain.value = 1.2; limiter.curve = tanhCurve(1.4, 0.9); master.connect(limiter).connect(destination);
    var reverb = ctx.createConvolver(), wet = ctx.createGain(); reverb.buffer = makeImpulse(ctx, 3.5); wet.gain.value = 0.55; reverb.connect(wet).connect(master);
    var echo = ctx.createDelay(2), fb = ctx.createGain(), eo = ctx.createGain(); echo.delayTime.value = BEAT * 0.75; fb.gain.value = 0.35; eo.gain.value = 0.3; echo.connect(fb).connect(echo); echo.connect(eo).connect(master);
    function bus(v, rev, ec) { var g = ctx.createGain(); g.gain.value = v; g.connect(master); if (rev) { var r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(reverb); } if (ec) { var e = ctx.createGain(); e.gain.value = ec; g.connect(e).connect(echo); } return g; }
    var pianoBus = bus(0.32, 0.5, 0.25), padBus = bus(0.12, 0.6), pulseBus = bus(0.2, 0.2, 0.3), strBus = bus(0.1, 0.6), bellBus = bus(0.12, 0.5, 0.5), drumBus = bus(0.45, 0.15), fxBus = bus(0.35, 0.4);
    var noise = makeNoise(ctx, 3);
    function beatTime(b, i) { return startTime + b * BEAT + (hash(b * 2.9 + i) - 0.5) * 0.012; }
    function osc(t, type, f, len, dest, vol, a, rel, detune) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (a || 0.01)); g.gain.setTargetAtTime(0.0001, t + len, rel || 0.1); o.connect(g).connect(dest); o.start(t); o.stop(t + len + (rel || 0.1) * 6); return o; }
    function noiseHit(t, vol, type, freq, len, q, dest) { var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noise; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); src.connect(f).connect(g).connect(dest || drumBus); src.start(t, (t * 0.9) % 2); src.stop(t + len + 0.02); return { f: f, g: g }; }
    function sweep(t, type, f0, f1, len, vol, dest) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.8); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.connect(g).connect(dest || drumBus); o.start(t); o.stop(t + len + 0.02); }
    /** Klavier: Grundton, Obertöne mit eigenem Abklingen, weicher Anschlag */
    function piano(t, e) {
      var f = midiToFreq(e.midi), d = Math.max(0.6, e.d * BEAT) + 1.5, v = e.v;
      osc(t, "triangle", f, 0.01, pianoBus, 0.5 * v, 0.004, d * 0.35);
      osc(t, "sine", f * 2.002, 0.01, pianoBus, 0.22 * v, 0.003, d * 0.2);
      osc(t, "sine", f * 3.01, 0.01, pianoBus, 0.07 * v, 0.002, d * 0.1);
      noiseHit(t, 0.02 * v, "bandpass", f * 4, 0.03, 2, pianoBus);
    }
    function fx(t, e) {
      var d = (e.d || 1) * BEAT, n, i;
      if (e.type === "stadt") { n = noiseHit(t, 0.001, "lowpass", 300, d, 0, fxBus); n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.001, t); n.g.gain.exponentialRampToValueAtTime(0.08, t + 3); n.g.gain.setValueAtTime(0.08, t + d - 3); n.g.gain.exponentialRampToValueAtTime(0.001, t + d); }
      else if (e.type === "welle") { n = noiseHit(t, 0.001, "lowpass", 500, d, 0, fxBus); n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.001, t); n.g.gain.exponentialRampToValueAtTime(0.18, t + d * 0.45); n.g.gain.exponentialRampToValueAtTime(0.001, t + d); n.f.frequency.linearRampToValueAtTime(1400, t + d * 0.45); n.f.frequency.linearRampToValueAtTime(400, t + d); }
      else if (e.type === "miau") { var o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter(); o.type = "sawtooth"; o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(760, t + 0.2); o.frequency.exponentialRampToValueAtTime(480, t + 0.5); bp.type = "bandpass"; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1500, t + 0.25); bp.Q.value = 5; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55); o.connect(bp).connect(g).connect(fxBus); o.start(t); o.stop(t + 0.6); }
      else if (e.type === "funkeln") { for (i = 0; i < 12; i++) osc(t + i * 0.09, "sine", midiToFreq(84 + [0, 4, 7, 11, 12, 16][i % 6]), 0.05, fxBus, 0.06, 0.003, 0.4); }
      else if (e.type === "aufstieg") { for (i = 0; i < 16; i++) osc(t + i * d / 16, "sine", midiToFreq(72 + [0, 4, 7, 12][i % 4] + Math.floor(i / 4) * 2), 0.1, fxBus, 0.04, 0.01, 0.6); n = noiseHit(t, 0.001, "bandpass", 800, d, 1, fxBus); n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.001, t); n.g.gain.exponentialRampToValueAtTime(0.06, t + d * 0.8); n.g.gain.exponentialRampToValueAtTime(0.001, t + d); n.f.frequency.exponentialRampToValueAtTime(4000, t + d); }
      else if (e.type === "voegel") { for (i = 0; i < 6; i++) { var tt = t + i * 0.22 + hash(i + t) * 0.1; sweep(tt, "sine", 2600 + hash(i) * 800, 3800 + hash(i * 2) * 600, 0.09, 0.05, fxBus); } }
    }
    var tracks = [
      { list: song.piano, play: piano },
      { list: song.pad, play: function (t, e) { var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1500; f.connect(padBus); e.notes.forEach(function (m) { [-9, 9].forEach(function (dt) { osc(t, "sawtooth", midiToFreq(m), e.d * BEAT, f, 0.3 * e.v, 0.9, 1.0, dt); }); }); } },
      { list: song.pulse, play: function (t, e) { var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(250, t + 0.25); f.Q.value = 4; f.connect(pulseBus); osc(t, "sawtooth", midiToFreq(e.midi), e.d * BEAT, f, 0.6 * e.v, 0.005, 0.05); } },
      { list: song.strings, play: function (t, e) { var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2400; f.connect(strBus); e.notes.forEach(function (m) { [-12, 0, 12].forEach(function (dt) { osc(t, "sawtooth", midiToFreq(m), e.d * BEAT, f, 0.3 * e.v, 0.7, 0.8, dt); }); }); } },
      { list: song.bells, play: function (t, e) { var f = midiToFreq(e.midi); osc(t, "sine", f, 0.01, bellBus, 0.4 * e.v, 0.003, 0.5); osc(t, "sine", f * 2.76, 0.01, bellBus, 0.1 * e.v, 0.002, 0.2); } },
      { list: song.drums, play: function (t, e) { if (e.type === "k") sweep(t, "sine", 120, 45, 0.3, e.v); else if (e.type === "c") { noiseHit(t, 0.25 * e.v, "bandpass", 1600, 0.12, 1); } else noiseHit(t, 0.15 * e.v, "highpass", 8000, 0.04); } },
      { list: song.sfx, play: fx }
    ];
    tracks.forEach(function (tr) { tr.i = 0; while (tr.i < tr.list.length && tr.list[tr.i].t < (fromBeat || 0)) tr.i++; });
    return { master: master, scheduleUntil: function (until) { tracks.forEach(function (tr, ti) { while (tr.i < tr.list.length) { var e = tr.list[tr.i], t = beatTime(e.t, ti); if (t >= until) break; if (t >= 0) tr.play(t, e); tr.i++; } }); } };
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
  function stop() { if (!playing) return; clearInterval(timer); var g = engine.master.gain, now = ctx.currentTime, old = engine; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.4); setTimeout(function () { old.master.disconnect(); }, 700); engine = null; playing = false; }
  function time() { return playing ? Math.max(0, ctx.currentTime - startTime) : null; }
  function render(seconds, sampleRate, from) { var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext; var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100); from = from || 0; createEngine(off, off.destination, -from, from / BEAT).scheduleUntil(seconds); return off.startRendering(); }

  global.MorgenlichtMusik = { BPM: BPM, BEAT: BEAT, BAR: BAR, SECTIONS: SECTIONS, TOTAL_BARS: TOTAL_BARS, DURATION: DURATION, SAD: SAD, HOPE: HOPE, song: song, at: at2, sectionStart: sectionStart, start: start, stop: stop, time: time, render: render, get playing() { return playing; } };
})(typeof window !== "undefined" ? window : globalThis);
