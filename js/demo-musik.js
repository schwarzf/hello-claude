/**
 * DemoMusik – synthetischer Tracker-Sound im Stil der Amiga-Demoszene,
 * live per Web Audio erzeugt (eigene Komposition, a-Moll, 125 BPM).
 * Viel Bass: Sägezahn-Bass mit Filter-Sweep plus Sub-Bass, der beim Kick
 * „pumpt“; dazu Kick, Snare, Hi-Hats, Chip-Arpeggios und eine Lead-Stimme.
 */
(function (global) {
  "use strict";

  var BPM = 125;
  var STEP = 60 / BPM / 4;   // Sechzehntel
  var BAR = 16;

  var ROOTS = { Am: 33, F: 29, C: 36, G: 31 };           // Bass-Grundtöne (MIDI)
  var ARPS = { Am: [57, 60, 64], F: [53, 57, 60], C: [55, 60, 64], G: [55, 59, 62] };
  var PROGRESSION = ["Am", "F", "C", "G"];

  // Basslinie: Abstand zum Grundton je Sechzehntel, null = Pause
  var BASSLINE = [0, null, 12, 0, null, 0, 12, null, 0, null, 12, 0, 10, null, 12, 7];

  // Lead-Melodie über 8 Takte: [Schritt, MIDI-Ton, Länge]
  var LEAD = [
    [0, 76, 3], [4, 74, 2], [6, 72, 2], [8, 69, 6], [14, 72, 2],
    [16, 72, 3], [20, 69, 2], [22, 65, 2], [24, 69, 8],
    [32, 67, 3], [36, 72, 2], [38, 76, 2], [40, 79, 4], [44, 76, 4],
    [48, 74, 6], [54, 71, 2], [56, 74, 4], [60, 71, 4],
    [64, 76, 3], [68, 77, 2], [70, 76, 2], [72, 74, 4], [76, 72, 4],
    [80, 72, 3], [84, 74, 2], [86, 72, 2], [88, 69, 8],
    [96, 67, 2], [98, 69, 2], [100, 72, 4], [104, 76, 4], [108, 79, 4],
    [112, 81, 8], [120, 79, 4], [124, 76, 4]
  ];

  // Songaufbau in Takten; nach dem Ende geht es bei LOOP_FROM weiter
  var SECTIONS = [
    { name: "intro", bars: 4, bass: true, hats: true, sweep: [180, 900] },
    { name: "aufbau", bars: 4, bass: true, hats: true, kick: true, roll: true, sweep: [900, 2400] },
    { name: "hauptteil", bars: 8, bass: true, hats: true, kick: true, snare: true, arp: true },
    { name: "melodie", bars: 8, bass: true, hats: true, kick: true, snare: true, arp: true, lead: true },
    { name: "break", bars: 4, sub: true, arp: true, sweep: [300, 3000] },
    { name: "finale", bars: 8, bass: true, hats: true, kick: true, snare: true, arp: true, lead: true, open: true }
  ];
  var LOOP_FROM = 2;

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function makeNoise(ctx) {
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 11;
    for (var i = 0; i < n; i++) {
      s = (s * 16807) % 2147483647;
      d[i] = (s / 2147483647) * 2 - 1;
    }
    return b;
  }

  /** Klangnetz aufbauen; liefert scheduleUntil(zeit) und Zugriff auf den Taktgeber. */
  function createEngine(ctx, destination, startTime) {
    var master = ctx.createGain();
    master.gain.value = 0.62;
    master.connect(destination);

    function bus(volume) {
      var g = ctx.createGain();
      g.gain.value = volume;
      g.connect(master);
      return g;
    }
    var bassBus = bus(0.17), subBus = bus(0.3), drumBus = bus(0.42), arpBus = bus(0.035), leadBus = bus(0.04);

    // „Pumpen“: Bass wird bei jedem Kick kurz leiser
    var duck = ctx.createGain();
    duck.connect(bassBus);
    var subDuck = ctx.createGain();
    subDuck.connect(subBus);

    // Echo für Arpeggio und Lead
    var delay = ctx.createDelay(1);
    delay.delayTime.value = STEP * 3;
    var feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    var delayOut = ctx.createGain();
    delayOut.gain.value = 0.18;
    delay.connect(feedback).connect(delay);
    delay.connect(delayOut).connect(master);

    var noise = makeNoise(ctx);

    function kick(t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      o.connect(g).connect(drumBus);
      o.start(t);
      o.stop(t + 0.4);
      [duck.gain, subDuck.gain].forEach(function (p) {
        p.cancelScheduledValues(t);
        p.setValueAtTime(0.25, t);
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
      src.start(t, (t * 7.3) % 0.8);
      src.stop(t + len + 0.02);
    }

    function snare(t, vol) {
      noiseHit(t, 0.5 * vol, "bandpass", 1900, 0.18);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      g.gain.setValueAtTime(0.35 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(drumBus);
      o.start(t);
      o.stop(t + 0.14);
    }

    function bass(t, midi, len, cutoff) {
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = "lowpass";
      f.Q.value = 6;
      f.frequency.setValueAtTime(cutoff * 2.2, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.5), t + len);
      g.gain.setValueAtTime(0.9, t);
      g.gain.setTargetAtTime(0, t + len * 0.8, 0.02);
      [[ "sawtooth", 0], ["square", 7]].forEach(function (v) {
        var o = ctx.createOscillator();
        o.type = v[0];
        o.frequency.value = midiToFreq(midi);
        o.detune.value = v[1];
        o.connect(f);
        o.start(t);
        o.stop(t + len + 0.1);
      });
      f.connect(g).connect(duck);
    }

    function sub(t, midi, len) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = midiToFreq(midi - 12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.01);
      g.gain.setTargetAtTime(0, t + len * 0.9, 0.03);
      o.connect(g).connect(subDuck);
      o.start(t);
      o.stop(t + len + 0.2);
    }

    /** Chip-Arpeggio: ein Ton, der schnell zwischen den Akkordtönen springt. */
    function arp(t, notes, len) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square";
      for (var k = 0, tt = t; tt < t + len; k++, tt += 1 / 25) {
        o.frequency.setValueAtTime(midiToFreq(notes[k % notes.length] + 12), tt);
      }
      g.gain.setValueAtTime(0.8, t);
      g.gain.setTargetAtTime(0, t + len - 0.03, 0.02);
      o.connect(g);
      g.connect(arpBus);
      g.connect(delay);
      o.start(t);
      o.stop(t + len + 0.1);
    }

    function lead(t, midi, len) {
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      var vib = ctx.createOscillator(), vibGain = ctx.createGain();
      o.type = "square";
      o2.type = "sawtooth";
      o.frequency.value = o2.frequency.value = midiToFreq(midi);
      o2.detune.value = 9;
      vib.frequency.value = 6;
      vibGain.gain.setValueAtTime(0, t);
      vibGain.gain.linearRampToValueAtTime(6, t + 0.25);
      vib.connect(vibGain);
      vibGain.connect(o.frequency);
      vibGain.connect(o2.frequency);
      f.type = "lowpass";
      f.frequency.value = 3000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.015);
      g.gain.setTargetAtTime(0.0001, t + len * 0.9, 0.05);
      o.connect(f);
      o2.connect(f);
      f.connect(g);
      g.connect(leadBus);
      g.connect(delay);
      [o, o2, vib].forEach(function (x) { x.start(t); x.stop(t + len + 0.4); });
    }

    var section = 0, step = 0, nextTime = startTime, bar0 = 0;

    function playStep(sec, s, t) {
      var bar = Math.floor(s / BAR), inBar = s % BAR, chord = PROGRESSION[(bar0 + bar) % 4];
      var progress = s / (sec.bars * BAR);
      var cutoff = sec.sweep ? sec.sweep[0] * Math.pow(sec.sweep[1] / sec.sweep[0], progress) : 1400 + Math.sin(s / 8) * 500;
      if (sec.open) cutoff = 2400;

      if (sec.bass) {
        var n = BASSLINE[inBar];
        if (n !== null) bass(t, ROOTS[chord] + 12 + n, STEP * 0.9, cutoff);
        if (inBar % 4 === 0) sub(t, ROOTS[chord] + 12, STEP * 3.5);
      }
      if (sec.sub && inBar % 8 === 0) sub(t, ROOTS[chord] + 12, STEP * 7.5);
      if (sec.kick && inBar % 4 === 0) kick(t);
      if (sec.snare && (inBar === 4 || inBar === 12)) snare(t, 1);
      if (sec.roll && bar === sec.bars - 1 && inBar >= 8) snare(t, 0.3 + (inBar - 8) * 0.09);
      if (sec.hats) {
        if (inBar % 2 === 0) noiseHit(t, inBar % 4 === 2 ? 0.28 : 0.12, "highpass", 8000, 0.04);
        else if (sec.kick) noiseHit(t, 0.06, "highpass", 9000, 0.02);
      }
      if (sec.arp && inBar % 4 === 0) arp(t, ARPS[chord], STEP * 4);
      if (sec.lead) {
        LEAD.forEach(function (m) { if (m[0] === s % 128) lead(t, m[1], m[2] * STEP); });
      }
    }

    var events = []; // für die Grafik: wann welcher Takt/Kick erklingt
    return {
      master: master,
      events: events,
      scheduleUntil: function (until) {
        while (nextTime < until) {
          var sec = SECTIONS[section];
          playStep(sec, step, nextTime);
          events.push({ time: nextTime, section: sec.name, step: step, kick: Boolean(sec.kick && step % 4 === 0), snare: Boolean(sec.snare && (step % 16 === 4 || step % 16 === 12)) });
          if (events.length > 64) events.shift();
          nextTime += STEP;
          step++;
          if (step >= sec.bars * BAR) {
            bar0 += sec.bars;
            step = 0;
            section = section + 1 < SECTIONS.length ? section + 1 : LOOP_FROM;
          }
        }
      }
    };
  }

  // ---------- Wiedergabe ----------

  var ctx = null, engine = null, timer = null, playing = false;

  function start() {
    // gemeinsamer, in Safari freigeschalteter Audio-Kontext aus musik.js
    ctx = global.Musik ? global.Musik.getContext() : new (global.AudioContext || global.webkitAudioContext)();
    if (!ctx || playing) return;
    if (ctx.state !== "running") ctx.resume();
    engine = createEngine(ctx, ctx.destination, ctx.currentTime + 0.1);
    timer = setInterval(function () {
      if (ctx.state === "running") engine.scheduleUntil(ctx.currentTime + 0.2);
    }, 40);
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

  /** Was gerade erklingt (für die Grafik): Songteil, Schritt, Zeit seit dem letzten Kick. */
  function position() {
    if (!playing) return null;
    var now = ctx.currentTime, current = null, lastKick = null, lastSnare = null;
    engine.events.forEach(function (e) {
      if (e.time <= now) {
        current = e;
        if (e.kick) lastKick = e.time;
        if (e.snare) lastSnare = e.time;
      }
    });
    if (!current) return null;
    return {
      section: current.section,
      step: current.step,
      sinceKick: lastKick === null ? 9 : now - lastKick,
      sinceSnare: lastSnare === null ? 9 : now - lastSnare
    };
  }

  function render(seconds, sampleRate) {
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var off = new OAC(2, Math.ceil((sampleRate || 44100) * seconds), sampleRate || 44100);
    createEngine(off, off.destination, 0).scheduleUntil(seconds);
    return off.startRendering();
  }

  global.DemoMusik = {
    BPM: BPM,
    STEP: STEP,
    SECTIONS: SECTIONS,
    BASSLINE: BASSLINE,
    LEAD: LEAD,
    ARPS: ARPS,
    start: start,
    stop: stop,
    position: position,
    render: render,
    get playing() { return playing; }
  };
})(typeof window !== "undefined" ? window : globalThis);
