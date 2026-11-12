/**
 * Amiga-Demo: Effekte im Stil der Demoszene, gerechnet in 320×200 Pixeln.
 * Die Szenen folgen der Musik (DemoMusik); ohne Ton läuft ein eigener Takt.
 */
(function () {
  "use strict";

  var W = 320, H = 200;
  var canvas = document.getElementById("demo");
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var FONT = '"Press Start 2P", monospace';
  var SCROLL_TEXT = "*** HELLO-CLAUDE PRESENTS: THE AMIGA DEMO 2026 ***   " +
    "ALLES WIRD LIVE IM BROWSER GERECHNET - KEINE SAMPLES, NUR SYNTHESIZER UND JEDE MENGE BASS!   " +
    "COPPER-BARS, STERNENFELD, PLASMA, GLENZ-VEKTOREN UND NATUERLICH DER BOING-BALL ...   " +
    "GRUESSE AN DIE DINO-TASKLISTE, DIE KATZEN-MORPHER, DAS GESICHTER-LABOR UND DIE ROTE KATZE MIT DEM WEISSEN BAUCH!   " +
    "CODE + MUSIK: CLAUDE   ***   ";

  // Szenenfolge wie in der Musik (Takte); ohne Ton wird sie per Uhr abgespielt
  var SCENES = DemoMusik.SECTIONS.map(function (s) { return { name: s.name, bars: s.bars }; });
  var BAR_TIME = DemoMusik.STEP * 16;
  var LABELS = { intro: "INTRO", aufbau: "AUFBAU", hauptteil: "GLENZ-VEKTOREN", melodie: "BOING!", "break": "GREETINGS", finale: "FINALE" };

  // ---------- Hilfen ----------

  function hsl(h, s, l) { return "hsl(" + h + "," + s + "%," + l + "%)"; }

  // ---------- Sternenfeld ----------

  var stars = [];
  for (var i = 0; i < 220; i++) stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
  function drawStars(dt, speed) {
    stars.forEach(function (s) {
      s.z -= dt * speed;
      if (s.z <= 0.02) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; }
      var px = W / 2 + (s.x / s.z) * 90, py = H / 2 + (s.y / s.z) * 90;
      if (px < 0 || px >= W || py < 0 || py >= H) return;
      var b = Math.min(255, Math.round((1 - s.z) * 300));
      ctx.fillStyle = "rgb(" + b + "," + b + "," + Math.min(255, b + 40) + ")";
      var size = s.z < 0.3 ? 2 : 1;
      ctx.fillRect(px | 0, py | 0, size, size);
    });
  }

  // ---------- Copper-Bars ----------

  function drawCopperBars(t, count, pulse) {
    var hues = [0, 30, 55, 200, 280];
    for (var b = 0; b < count; b++) {
      var y = H / 2 + Math.sin(t * 1.7 + b * 0.55) * 70 - 7;
      var height = 14 + pulse * 4;
      var g = ctx.createLinearGradient(0, y, 0, y + height);
      var hue = hues[b % hues.length];
      g.addColorStop(0, hsl(hue, 90, 12));
      g.addColorStop(0.5, hsl(hue, 100, 70));
      g.addColorStop(1, hsl(hue, 90, 12));
      ctx.fillStyle = g;
      ctx.fillRect(0, y | 0, W, height);
    }
  }

  // ---------- Plasma (halbe Auflösung, hochskaliert) ----------

  var plasmaCanvas = document.createElement("canvas");
  plasmaCanvas.width = 160;
  plasmaCanvas.height = 100;
  var plasmaCtx = plasmaCanvas.getContext("2d");
  var plasmaImage = plasmaCtx.createImageData(160, 100);
  var palette = [];
  for (var p = 0; p < 256; p++) {
    var a = p / 256 * Math.PI * 2;
    palette.push([
      Math.round(128 + 127 * Math.sin(a)),
      Math.round(128 + 127 * Math.sin(a + 2.1)),
      Math.round(128 + 127 * Math.sin(a + 4.2))
    ]);
  }
  function drawPlasma(t, dim) {
    var d = plasmaImage.data, k = 0;
    for (var y = 0; y < 100; y++) {
      for (var x = 0; x < 160; x++) {
        var v = Math.sin(x * 0.06 + t) + Math.sin(y * 0.08 - t * 1.3) +
          Math.sin((x + y) * 0.04 + t * 0.7) + Math.sin(Math.sqrt((x - 80) * (x - 80) + (y - 50) * (y - 50)) * 0.09 - t * 2);
        var c = palette[((v + 4) * 32 + t * 40) & 255];
        d[k++] = c[0] * dim; d[k++] = c[1] * dim; d[k++] = c[2] * dim; d[k++] = 255;
      }
    }
    plasmaCtx.putImageData(plasmaImage, 0, 0);
    ctx.drawImage(plasmaCanvas, 0, 0, W, H);
  }

  // ---------- Glenz-Würfel (halbtransparente Vektorflächen) ----------

  var CUBE_V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  var CUBE_F = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [4, 5, 1, 0], [3, 2, 6, 7]];
  function drawCube(t, cx, cy, size) {
    var ax = t * 0.9, ay = t * 1.3, az = t * 0.4;
    var pts = CUBE_V.map(function (v) {
      var x = v[0], y = v[1], z = v[2], c, s, nx, ny;
      c = Math.cos(ax); s = Math.sin(ax); ny = y * c - z * s; z = y * s + z * c; y = ny;
      c = Math.cos(ay); s = Math.sin(ay); nx = x * c + z * s; z = -x * s + z * c; x = nx;
      c = Math.cos(az); s = Math.sin(az); nx = x * c - y * s; y = x * s + y * c; x = nx;
      var f = 3.2 / (z + 4.5);
      return { x: cx + x * size * f, y: cy + y * size * f, z: z };
    });
    var faces = CUBE_F.map(function (f, i) {
      var z = (pts[f[0]].z + pts[f[1]].z + pts[f[2]].z + pts[f[3]].z) / 4;
      var a = pts[f[0]], b = pts[f[1]], c2 = pts[f[2]];
      var front = (b.x - a.x) * (c2.y - a.y) - (b.y - a.y) * (c2.x - a.x) < 0;
      return { f: f, z: z, i: i, front: front };
    }).sort(function (a, b) { return b.z - a.z; });
    faces.forEach(function (face) {
      ctx.beginPath();
      face.f.forEach(function (vi, k) { var q = pts[vi]; if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
      ctx.closePath();
      ctx.globalAlpha = face.front ? 0.55 : 0.3;
      ctx.fillStyle = face.i % 2 ? "#7fb2ff" : "#ffffff";
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = face.front ? "#fff" : "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // ---------- Boing-Ball (rot-weiß kariert, pixelweise gerechnet) ----------

  var BALL_R = 34;
  var ballCanvas = document.createElement("canvas");
  ballCanvas.width = ballCanvas.height = BALL_R * 2;
  var ballCtx = ballCanvas.getContext("2d");
  var ballImage = ballCtx.createImageData(BALL_R * 2, BALL_R * 2);
  function renderBall(spin) {
    var d = ballImage.data, tilt = 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);
    for (var y = 0; y < BALL_R * 2; y++) {
      for (var x = 0; x < BALL_R * 2; x++) {
        var k = (y * BALL_R * 2 + x) * 4;
        var nx = (x - BALL_R + 0.5) / BALL_R, ny = (y - BALL_R + 0.5) / BALL_R, r2 = nx * nx + ny * ny;
        if (r2 > 1) { d[k + 3] = 0; continue; }
        var nz = Math.sqrt(1 - r2);
        var ry = ny * ct - nz * st, rz = ny * st + nz * ct; // Neigung
        var lat = Math.asin(Math.max(-1, Math.min(1, ry))), lon = Math.atan2(nx, rz) + spin;
        var check = (Math.floor(lat / (Math.PI / 8) + 8) + Math.floor(lon / (Math.PI / 8) + 64)) & 1;
        var light = 0.45 + 0.55 * Math.max(0, nx * -0.4 + ny * -0.5 + nz * 0.77);
        if (check) { d[k] = 230 * light; d[k + 1] = 20 * light; d[k + 2] = 30 * light; }
        else { d[k] = 255 * light; d[k + 1] = 255 * light; d[k + 2] = 255 * light; }
        d[k + 3] = 255;
      }
    }
    ballCtx.putImageData(ballImage, 0, 0);
  }
  function drawBoingGrid() {
    ctx.fillStyle = "#a9a9b8";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#8a2be2";
    ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x + 0.5, 10); ctx.lineTo(x + 0.5, 160); ctx.stroke(); }
    for (var y = 10; y <= 160; y += 15) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
    for (var fx = -200; fx <= W + 200; fx += 20) { ctx.beginPath(); ctx.moveTo(W / 2 + (fx - W / 2) * 0.55, 160.5); ctx.lineTo(fx, 199.5); ctx.stroke(); }
    [168, 180, 194].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(0, yy + 0.5); ctx.lineTo(W, yy + 0.5); ctx.stroke(); });
  }
  function drawBall(t) {
    var period = 3.2, u = (t % (period * 2)) / period;      // hin und her
    var x = 40 + (u < 1 ? u : 2 - u) * (W - 80);
    var bounce = Math.abs(Math.sin(t * 3.1));
    var y = 150 - bounce * 95;
    renderBall(t * (u < 1 ? 3 : -3));
    ctx.fillStyle = "rgba(40,40,60,0.45)";
    ctx.beginPath(); ctx.ellipse(x + 14, y + 6, BALL_R, BALL_R * 0.95, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(ballCanvas, (x - BALL_R) | 0, (y - BALL_R) | 0);
  }

  // ---------- Logo und Texte ----------

  function drawLogo(t, y, pulse) {
    var text = "HELLO CLAUDE";
    ctx.font = "16px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    var width = ctx.measureText(text).width, x0 = (W - width) / 2;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i], cw = ctx.measureText(ch).width;
      var cx = x0 + ctx.measureText(text.slice(0, i)).width;
      var cy = y + Math.sin(t * 3 + i * 0.5) * 5 - pulse * 3;
      var g = ctx.createLinearGradient(0, cy - 9, 0, cy + 9);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.45, "#5f8dff");
      g.addColorStop(0.55, "#1a237e");
      g.addColorStop(1, "#ff9b3a");
      ctx.fillStyle = "#000";
      ctx.fillText(ch, cx + 2, cy + 2);
      ctx.fillStyle = g;
      ctx.fillText(ch, cx, cy);
      if (cw && ch !== " ") {
        ctx.fillStyle = "rgba(255,255,255," + (0.5 + 0.5 * Math.sin(t * 6 + i)) + ")";
        ctx.fillRect(cx + 2, cy - 7, 2, 2);
      }
    }
  }

  var scrollX = W;
  function drawScroller(t, dt, y, amplitude) {
    ctx.font = "8px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    scrollX -= dt * 70;
    var charW = 8, total = SCROLL_TEXT.length * charW;
    if (scrollX < -total) scrollX += total;
    for (var i = 0; i < SCROLL_TEXT.length; i++) {
      var x = scrollX + i * charW;
      if (x < -charW) { if (x + total < W) x += total; else continue; }
      if (x > W) continue;
      var cy = y + Math.sin(x * 0.045 + t * 2.4) * amplitude;
      ctx.fillStyle = "#000";
      ctx.fillText(SCROLL_TEXT[i], x + 1, cy + 1);
      ctx.fillStyle = hsl((x * 1.2 + t * 120) % 360, 100, 65);
      ctx.fillText(SCROLL_TEXT[i], x, cy);
    }
  }

  var GREETS = ["GREETINGS", "DINOS", "KATZEN", "GESICHTER", "ROTE KATZE", "DU!"];
  function drawGreets(t, sinceKick) {
    var word = GREETS[Math.floor(t / (BAR_TIME / 2)) % GREETS.length];
    var zoom = 1 + Math.max(0, 0.25 - sinceKick) * 2;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.font = "16px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(word, 2, 2);
    ctx.fillStyle = hsl((t * 200) % 360, 100, 65);
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }

  // ---------- Ablauf ----------

  var clock = 0, startedAt = 0, running = false, withSound = true, lastFrame = null, frames = 0;
  var timeline = { scene: "intro", sinceKick: 9, sinceSnare: 9 };

  /** Szene und Takt: aus der Musik, oder ohne Ton aus der eigenen Uhr. */
  function updateTimeline() {
    var pos = withSound ? DemoMusik.position() : null;
    if (pos) {
      timeline.scene = pos.section;
      timeline.sinceKick = pos.sinceKick;
      timeline.sinceSnare = pos.sinceSnare;
      return;
    }
    var bars = (clock - startedAt) / BAR_TIME, total = 0, loopStart = 0, all = 0;
    SCENES.forEach(function (s, i) { if (i === 2) loopStart = all; all += s.bars; });
    if (bars >= all) bars = loopStart + (bars - loopStart) % (all - loopStart);
    for (var i = 0; i < SCENES.length; i++) {
      if (bars < total + SCENES[i].bars) { timeline.scene = SCENES[i].name; break; }
      total += SCENES[i].bars;
    }
    var beat = ((clock - startedAt) / (BAR_TIME / 4)) % 1;
    timeline.sinceKick = timeline.scene === "intro" || timeline.scene === "break" ? 9 : beat * BAR_TIME / 4;
    timeline.sinceSnare = 9;
  }

  function drawScene(t, dt) {
    var scene = timeline.scene, pulse = Math.max(0, 1 - timeline.sinceKick * 6);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    if (scene === "intro") {
      drawStars(dt, 0.15);
      drawCopperBars(t, 3, 0);
      drawLogo(t, 100, 0);
    } else if (scene === "aufbau") {
      drawStars(dt, 0.35 + pulse * 0.3);
      drawCopperBars(t, 5, pulse);
      drawLogo(t, 60, pulse);
      drawScroller(t, dt, 160, 10);
    } else if (scene === "hauptteil") {
      drawCopperBars(t, 5, pulse);
      drawStars(dt, 0.4);
      drawCube(t, W / 2, 92, 38 + pulse * 6);
      drawLogo(t, 22, pulse);
      drawScroller(t, dt, 176, 8);
    } else if (scene === "melodie") {
      drawBoingGrid();
      drawBall(t);
      drawScroller(t, dt, 22, 6);
    } else if (scene === "break") {
      drawPlasma(t, 0.55);
      drawStars(dt, 0.9);
      drawGreets(t, timeline.sinceKick);
    } else {
      drawPlasma(t, 0.8);
      drawCopperBars(t, 3, pulse);
      drawCube(t, 90, 96, 30 + pulse * 6);
      drawLogo(t, 22, pulse);
      ctx.save();
      ctx.translate(140, 10);
      drawBall(t * 1.3);
      ctx.restore();
      drawScroller(t, dt, 182, 6);
    }

    // Blitz auf dem Kick
    if (pulse > 0 && scene !== "melodie") {
      ctx.fillStyle = "rgba(255,255,255," + (pulse * 0.12) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  var partEl = document.getElementById("part"), lastScene = "";
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    var dt = lastFrame === null ? 0 : Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    clock += dt;
    updateTimeline();
    var shakeOn = timeline.scene === "finale" && timeline.sinceSnare < 0.08;
    ctx.save();
    if (shakeOn) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
    drawScene(clock, dt);
    ctx.restore();
    frames++;
    if (timeline.scene !== lastScene) {
      lastScene = timeline.scene;
      partEl.textContent = "TEIL: " + (LABELS[lastScene] || lastScene.toUpperCase());
    }
  }

  // ---------- Bedienung ----------

  var startEl = document.getElementById("start");
  var btnSound = document.getElementById("btn-sound");

  function begin(sound) {
    withSound = sound;
    if (sound) DemoMusik.start();
    btnSound.setAttribute("aria-pressed", String(sound));
    startedAt = clock;
    running = true;
    startEl.hidden = true;
  }
  // Ton schon beim Berühren freischalten (Safari)
  ["pointerdown", "touchend"].forEach(function (type) {
    document.getElementById("play").addEventListener(type, function () { if (window.Musik) Musik.unlock(); });
  });
  document.getElementById("play").addEventListener("click", function () { begin(true); });
  document.getElementById("play-silent").addEventListener("click", function () { begin(false); });

  btnSound.addEventListener("click", function () {
    if (!running) return;
    if (DemoMusik.playing) {
      DemoMusik.stop();
      withSound = false;
      startedAt = clock;
    } else {
      if (window.Musik) Musik.unlock();
      DemoMusik.start();
      withSound = true;
    }
    btnSound.setAttribute("aria-pressed", String(withSound));
  });

  document.getElementById("btn-crt").addEventListener("click", function () {
    var off = document.getElementById("screen").classList.toggle("no-crt");
    this.setAttribute("aria-pressed", String(!off));
  });

  document.getElementById("btn-full").addEventListener("click", function () {
    var el = document.getElementById("screen");
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (req) {
      try { var r = req.call(el); if (r && r.catch) r.catch(function () {}); } catch (e) { /* kein Vollbild möglich */ }
    }
  });

  document.addEventListener("keydown", function (e) {
    if ((e.key === " " || e.key === "Enter") && !running) { e.preventDefault(); begin(true); }
  });

  // Hintergrundbild vor dem Start
  function idle() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    drawStars(0.016, 0.1);
    drawCopperBars(clock, 3, 0);
    clock += 0.016;
    if (!running) requestAnimationFrame(idle);
  }
  if (document.fonts && document.fonts.load) document.fonts.load("8px " + FONT).catch(function () {});
  idle();
  requestAnimationFrame(frame);

  /** Ein Bild zur Songzeit t (Sekunden, ohne Wiederholung) – für das Video. */
  function renderVideo(t, dt) {
    var steps = Math.floor(t / DemoMusik.STEP), total = 0, sec = DemoMusik.SECTIONS[DemoMusik.SECTIONS.length - 1], k = 0;
    for (var i = 0; i < DemoMusik.SECTIONS.length; i++) {
      if (steps < (total + DemoMusik.SECTIONS[i].bars) * 16) { sec = DemoMusik.SECTIONS[i]; break; }
      total += DemoMusik.SECTIONS[i].bars;
    }
    var lastKick = null, lastSnare = null;
    for (var st = steps; st >= Math.max(0, steps - 16); st--) {
      if (lastKick === null && sec.kick && st % 4 === 0) lastKick = st;
      if (lastSnare === null && sec.snare && (st % 16 === 4 || st % 16 === 12)) lastSnare = st;
    }
    timeline.scene = sec.name;
    timeline.sinceKick = lastKick === null ? 9 : t - lastKick * DemoMusik.STEP;
    timeline.sinceSnare = lastSnare === null ? 9 : t - lastSnare * DemoMusik.STEP;
    clock = t;
    ctx.save();
    if (timeline.scene === "finale" && timeline.sinceSnare < 0.08) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
    drawScene(t, dt);
    ctx.restore();
    return sec.name;
  }

  // für Tests
  window.demo = {
    renderVideo: renderVideo,
    duration: function () { return DemoMusik.SECTIONS.reduce(function (n, s) { return n + s.bars; }, 0) * BAR_TIME; },
    get scene() { return timeline.scene; },
    get frames() { return frames; },
    get running() { return running; },
    setScene: function (name) { withSound = false; var t = 0; for (var i = 0; i < SCENES.length && SCENES[i].name !== name; i++) t += SCENES[i].bars; startedAt = clock - t * BAR_TIME - 0.01; }
  };
})();
