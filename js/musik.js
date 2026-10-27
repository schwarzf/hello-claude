/**
 * Musik – entspannte Akustik-Pop-Hintergrundmusik, live per Web Audio erzeugt.
 * Eigene Komposition (keine fremden Songs): gezupfte bzw. geschlagene
 * Akustikgitarre, Bass, weicher Beat, Flächenklang und eine Refrain-Melodie.
 *
 * Musik.start()/pause()/resume()/stop() steuern die Wiedergabe,
 * Musik.render(sekunden) erzeugt die Musik offline (für Tests).
 */
(function (global) {
  "use strict";

  var BPM = 92;
  var STEP = 60 / BPM / 4;   // Sechzehntel in Sekunden
  var BAR = 16;              // Schritte pro Takt

  // Gitarrengriffe (MIDI-Töne, tief → hoch)
  var CHORDS = {
    G: [43, 47, 50, 55, 59, 67],
    D: [50, 57, 62, 66],
    Em: [40, 47, 52, 55, 59, 64],
    C: [48, 52, 55, 60, 64],
    Am: [45, 52, 57, 60, 64]
  };
  var BASS = { G: 43, D: 38, Em: 40, C: 36, Am: 45 };

  // Refrain-Melodie über 8 Takte: [Schritt, MIDI-Ton, Länge in Schritten]
  var MELODY = [
    [2, 76, 2], [4, 74, 2], [6, 76, 4], [10, 79, 2], [12, 76, 4],
    [18, 74, 2], [20, 71, 2], [22, 74, 6], [28, 71, 2], [30, 69, 2],
    [34, 69, 2], [36, 71, 2], [38, 69, 2], [40, 66, 4], [44, 69, 4],
    [50, 67, 2], [52, 71, 4], [56, 76, 6],
    [66, 76, 2], [68, 74, 2], [70, 76, 4], [74, 79, 2], [76, 81, 4],
    [82, 79, 2], [84, 76, 2], [86, 74, 6], [92, 71, 2], [94, 74, 2],
    [98, 76, 2], [100, 74, 2], [102, 69, 4], [106, 71, 2], [108, 69, 4],
    [114, 67, 10]
  ];

  // Songaufbau; nach dem Ende geht es bei LOOP_FROM weiter
  var SECTIONS = [
    { name: "intro", chords: ["G", "D", "Em", "C"], guitar: "pick" },
    { name: "strophe", chords: ["G", "D", "Em", "C", "G", "D", "C", "C"], guitar: "pick", bass: true, drums: "soft" },
    { name: "refrain", chords: ["C", "G", "D", "Em", "C", "G", "D", "D"], guitar: "strum", bass: true, drums: "full", pad: true, melody: true },
    { name: "strophe", chords: ["G", "D", "Em", "C", "G", "D", "C", "C"], guitar: "pick", bass: true, drums: "soft" },
    { name: "refrain", chords: ["C", "G", "D", "Em", "C", "G", "D", "D"], guitar: "strum", bass: true, drums: "full", pad: true, melody: true },
    { name: "zwischenteil", chords: ["Am", "C", "G", "D"], guitar: "pick", pad: true },
    { name: "refrain", chords: ["C", "G", "D", "Em", "C", "G", "D", "D"], guitar: "strum", bass: true, drums: "full", pad: true, melody: true }
  ];
  var LOOP_FROM = 1;

  // Zupfmuster in Achteln (Index in den Gitarrengriff) und Schlagmuster (Schritt, Richtung)
  var PICK = [0, 2, 3, 4, 5, 4, 3, 2];
  var STRUM = [[0, 1], [4, 1], [6, -1], [10, -1], [12, 1], [14, -1]];

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /**
   * Gezupfte Saite nach Karplus-Strong: Rauschen in einer Verzögerungsschleife,
   * die bei jedem Durchlauf leicht gedämpft wird.
   */
  function makePluck(sampleRate, freq, seconds, seed) {
    var n = Math.floor(sampleRate * seconds), out = new Float32Array(n);
    var period = Math.max(2, Math.round(sampleRate / freq));
    var buf = new Float32Array(period), s = seed || 1;
    for (var i = 0; i < period; i++) {
      s = (s * 16807) % 2147483647;
      buf[i] = (s / 2147483647) * 2 - 1;
    }
    for (var k = 0; k < 2; k++) { // etwas weicher anschlagen
      for (var j = 0; j < period; j++) buf[j] = 0.5 * (buf[j] + buf[(j + 1) % period]);
    }
    var decay = 0.996, idx = 0;
    for (var t = 0; t < n; t++) {
      var next = (idx + 1) % period;
      var v = buf[idx];
      out[t] = v;
      buf[idx] = decay * 0.5 * (v + buf[next]);
      idx = next;
    }
    return out;
  }

  /** Kurzer, künstlicher Hall (abklingendes Rauschen). */
  function makeImpulse(ctx, seconds) {
    var n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, n, ctx.sampleRate), s = 7;
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch);
      for (var i = 0; i < n; i++) {
        s = (s * 16807) % 2147483647;
        d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / n, 3);
      }
    }
    return b;
  }

  function makeNoise(ctx) {
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 3;
    for (var i = 0; i < n; i++) {
      s = (s * 16807) % 2147483647;
      d[i] = (s / 2147483647) * 2 - 1;
    }
    return b;
  }

  /** Baut das Klangnetz auf und liefert eine Funktion, die bis zu einer Zeit vorausplant. */
  function createEngine(ctx, destination, startTime) {
    var master = ctx.createGain();
    master.gain.value = 0.55;
    var comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(destination);

    var reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 1.5);
    var reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.28;
    reverb.connect(reverbGain).connect(master);

    function bus(volume, wet) {
      var g = ctx.createGain();
      g.gain.value = volume;
      g.connect(master);
      if (wet) {
        var send = ctx.createGain();
        send.gain.value = wet;
        g.connect(send).connect(reverb);
      }
      return g;
    }
    var guitarBus = bus(0.32, 0.6), guitarIn = ctx.createBiquadFilter(), bassBus = bus(0.42, 0), drumBus = bus(0.22, 0.2), padBus = bus(0.05, 1), leadBus = bus(0.13, 0.9);

    // ein gemeinsamer Filter für alle Gitarrentöne spart Rechenleistung
    guitarIn.type = "lowpass";
    guitarIn.frequency.value = 3200;
    guitarIn.connect(guitarBus);

    var plucks = {}, noise = makeNoise(ctx);
    function pluckBuffer(midi) {
      if (!plucks[midi]) {
        var data = makePluck(ctx.sampleRate, midiToFreq(midi), 1.6, midi * 97 + 1);
        var b = ctx.createBuffer(1, data.length, ctx.sampleRate);
        b.getChannelData(0).set(data);
        plucks[midi] = b;
      }
      return plucks[midi];
    }

    function guitar(midi, time, volume, length) {
      var src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = pluckBuffer(midi);
      g.gain.setValueAtTime(volume, time);
      g.gain.setTargetAtTime(0, time + length, 0.08);
      src.connect(g).connect(guitarIn);
      src.start(time);
      src.stop(time + length + 0.4);
    }

    function bass(midi, time, length) {
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = "triangle";
      o.frequency.value = midiToFreq(midi);
      f.type = "lowpass";
      f.frequency.value = 500;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(1, time + 0.02);
      g.gain.setTargetAtTime(0.0001, time + length * 0.8, 0.08);
      o.connect(f).connect(g).connect(bassBus);
      o.start(time);
      o.stop(time + length + 0.5);
    }

    function kick(time, volume) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(120, time);
      o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      g.gain.setValueAtTime(volume, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
      o.connect(g).connect(drumBus);
      o.start(time);
      o.stop(time + 0.32);
    }

    function noiseHit(time, volume, freq, length, type) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise;
      f.type = type;
      f.frequency.value = freq;
      g.gain.setValueAtTime(volume, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + length);
      src.connect(f).connect(g).connect(drumBus);
      src.start(time, Math.random() * 0.5);
      src.stop(time + length + 0.02);
    }

    function pad(chord, time, length) {
      var notes = CHORDS[chord].slice(-3).map(function (m) { return m < 55 ? m + 12 : m; });
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(1, time + 0.6);
      g.gain.setTargetAtTime(0, time + length - 0.2, 0.4);
      f.connect(g).connect(padBus);
      notes.forEach(function (m) {
        [-6, 6].forEach(function (cents) {
          var o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = midiToFreq(m);
          o.detune.value = cents;
          o.connect(f);
          o.start(time);
          o.stop(time + length + 2);
        });
      });
    }

    function lead(midi, time, length) {
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      var vib = ctx.createOscillator(), vibGain = ctx.createGain();
      o.type = "triangle";
      o2.type = "sine";
      o.frequency.value = o2.frequency.value = midiToFreq(midi);
      vib.frequency.value = 5;
      vibGain.gain.value = 3;
      vib.connect(vibGain);
      vibGain.connect(o.frequency);
      vibGain.connect(o2.frequency);
      f.type = "lowpass";
      f.frequency.value = 2200;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(1, time + 0.04);
      g.gain.setTargetAtTime(0.0001, time + length * 0.85, 0.1);
      o.connect(f);
      o2.connect(f);
      f.connect(g).connect(leadBus);
      [o, o2, vib].forEach(function (x) { x.start(time); x.stop(time + length + 0.6); });
    }

    var section = 0, step = 0, nextTime = startTime;

    function playStep(sec, s, time) {
      var bar = Math.floor(s / BAR), inBar = s % BAR, chord = sec.chords[bar], shape = CHORDS[chord];
      if (sec.guitar === "pick" && inBar % 2 === 0) {
        var note = shape[PICK[inBar / 2] % shape.length];
        guitar(note, time, inBar === 0 ? 0.9 : 0.6, 1.1);
      }
      if (sec.guitar === "strum") {
        STRUM.forEach(function (st) {
          if (st[0] !== inBar) return;
          var notes = st[1] > 0 ? shape : shape.slice().reverse().slice(0, 4);
          notes.forEach(function (m, i) { guitar(m, time + i * 0.012, st[1] > 0 ? 0.42 : 0.26, STEP * 3.5); });
        });
      }
      if (sec.bass) {
        if (inBar === 0 || inBar === 8) bass(BASS[chord], time, STEP * 6);
        if (inBar === 14) bass(BASS[chord] + 7, time, STEP * 2);
      }
      if (sec.drums) {
        var full = sec.drums === "full";
        if (inBar === 0 || inBar === 8 || (full && inBar === 10)) kick(time, full ? 0.9 : 0.6);
        if (full && (inBar === 4 || inBar === 12)) noiseHit(time, 0.5, 1800, 0.12, "bandpass");
        if (inBar % 2 === 0) noiseHit(time, inBar % 4 === 2 ? 0.16 : 0.08, 7000, 0.04, "highpass");
      }
      if (sec.pad && inBar === 0) pad(chord, time, STEP * BAR);
      if (sec.melody) {
        MELODY.forEach(function (m) { if (m[0] === s) lead(m[1], time, m[2] * STEP); });
      }
    }

    return {
      master: master,
      scheduleUntil: function (until) {
        while (nextTime < until) {
          var sec = SECTIONS[section];
          playStep(sec, step, nextTime);
          nextTime += STEP;
          step++;
          if (step >= sec.chords.length * BAR) {
            step = 0;
            section = section + 1 < SECTIONS.length ? section + 1 : LOOP_FROM;
          }
        }
      }
    };
  }

  // ---------- Wiedergabe im Browser ----------

  var ctx = null, engine = null, timer = null, playing = false;

  function tick() {
    if (engine && ctx.state === "running") engine.scheduleUntil(ctx.currentTime + 0.25);
  }

  function start() {
    if (playing) return resume();
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended") ctx.resume();
      engine = createEngine(ctx, ctx.destination, ctx.currentTime + 0.1);
      engine.master.gain.setValueAtTime(0, ctx.currentTime);
      engine.master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2);
      timer = setInterval(tick, 50);
      tick();
      playing = true;
    } catch (e) { /* ohne Musik weiterspielen */ }
  }

  function pause() {
    if (ctx && playing) ctx.suspend();
  }

  function resume() {
    if (ctx && playing) ctx.resume();
  }

  function stop() {
    if (!playing) return;
    clearInterval(timer);
    var g = engine.master.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 0.4);
    var old = engine;
    setTimeout(function () { old.master.disconnect(); }, 600);
    engine = null;
    playing = false;
  }

  /** Erzeugt die ersten Sekunden der Musik offline (z. B. für Tests). */
  function render(seconds, sampleRate) {
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100);
    createEngine(off, off.destination, 0).scheduleUntil(seconds);
    return off.startRendering();
  }

  global.Musik = {
    BPM: BPM,
    CHORDS: CHORDS,
    MELODY: MELODY,
    SECTIONS: SECTIONS,
    makePluck: makePluck,
    start: start,
    pause: pause,
    resume: resume,
    stop: stop,
    render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
