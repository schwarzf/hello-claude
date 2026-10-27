/**
 * Katzen-Jump'n'Run: Zeichnen, Steuerung und Spielablauf.
 * Die Spielregeln selbst stehen in js/spiel.js (KatzenSpiel).
 */
(function () {
  "use strict";

  var K = KatzenSpiel;
  var W = 960, H = 400, GROUND = 330, CAT_SCREEN_X = 190, STEP = 1 / 120;
  var INK = "#2b1a12";

  var THEMES = [
    { sky: ["#8fdcff", "#d9f4ff"], hills: "#8fd16f", far: "#b5e3a1", ground: "#7cc35a", dirt: "#a9743f", sun: "#ffe35c" },
    { sky: ["#9ccff0", "#e4f3fb"], hills: "#c99a6b", far: "#dcbc98", ground: "#9b9b9b", dirt: "#6f6f6f", sun: "#ffe35c", fence: true },
    { sky: ["#7fd3ff", "#cdf1ff"], hills: "#4fae5b", far: "#8ccf8c", ground: "#68b84e", dirt: "#8b5e34", sun: "#ffd23f", trees: true },
    { sky: ["#ffb37a", "#ffe2b8"], hills: "#8c5a8f", far: "#b98bb5", ground: "#c4553d", dirt: "#8e3424", sun: "#ff7b3a", roofs: true },
    { sky: ["#141c4a", "#3a3f86"], hills: "#2a3a5e", far: "#3c4c78", ground: "#2f6b3c", dirt: "#3d2c22", moon: true }
  ];

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayText = document.getElementById("overlay-text");
  var overlayButton = document.getElementById("overlay-button");
  var hudLevel = document.getElementById("hud-level");
  var hudLives = document.getElementById("hud-lives");
  var hudScore = document.getElementById("hud-score");
  var hudProgress = document.getElementById("hud-progress");
  var btnJump = document.getElementById("btn-jump");
  var btnDuck = document.getElementById("btn-duck");
  var btnPause = document.getElementById("btn-pause");
  var btnSound = document.getElementById("btn-sound");

  var game = K.createGame(0);
  var input = { jump: false, jumpHeld: false, duck: false };
  var running = false, paused = false, overlayAction = null;
  var highscore = readHighscore();
  var shake = 0, flash = 0;

  // ---------- Hilfsfunktionen ----------

  function readHighscore() {
    try { return Number(localStorage.getItem("katzenspiel.highscore")) || 0; } catch (e) { return 0; }
  }
  function saveHighscore() {
    if (game.score <= highscore) return false;
    highscore = game.score;
    try { localStorage.setItem("katzenspiel.highscore", String(highscore)); } catch (e) { /* egal */ }
    return true;
  }

  function setupCanvas(c, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = h * dpr;
    c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- Ton (kleine Pieptöne per Web Audio) ----------

  var audio = null, soundOn = true;
  function beep(freq, duration, type, slide) {
    if (!soundOn) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain(), now = audio.currentTime;
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, now);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, now + duration);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      o.connect(g).connect(audio.destination);
      o.start(now);
      o.stop(now + duration);
    } catch (e) { /* ohne Ton weiterspielen */ }
  }
  var SOUNDS = {
    jump: function () { beep(420, 0.15, "square", 760); },
    bird: function () { beep(880, 0.08, "triangle"); setTimeout(function () { beep(1320, 0.12, "triangle"); }, 70); },
    hit: function () { beep(220, 0.3, "sawtooth", 90); },
    level: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { beep(f, 0.15, "triangle"); }, i * 110); }); },
    gameover: function () { [392, 330, 262].forEach(function (f, i) { setTimeout(function () { beep(f, 0.25, "triangle"); }, i * 180); }); }
  };

  // ---------- Zeichnen ----------

  function outline(width) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = width || 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 22 * s, y - 10 * s, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 46 * s, y, 18 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBackground(theme, camX) {
    var g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (theme.moon) {
      ctx.fillStyle = "#fff";
      for (var i = 0; i < 40; i++) {
        var sx = ((i * 137) % W + W - (camX * 0.02) % W) % W, sy = (i * 71) % 220;
        ctx.globalAlpha = 0.4 + (i % 3) * 0.2;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff6c9";
      ctx.beginPath(); ctx.arc(800, 70, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = theme.sky[0];
      ctx.beginPath(); ctx.arc(815, 60, 30, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = theme.sun;
      ctx.beginPath(); ctx.arc(820, 70, 36, 0, Math.PI * 2); ctx.fill();
      for (var c = 0; c < 5; c++) {
        var cx = ((c * 260 - camX * 0.15) % (W + 200) + W + 200) % (W + 200) - 100;
        drawCloud(cx, 60 + (c % 3) * 34, 0.8 + (c % 2) * 0.4);
      }
    }

    // ferne und nahe Hügel bzw. Häuser
    [[theme.far, 0.2, 70, 260], [theme.hills, 0.45, 50, 200]].forEach(function (layer, li) {
      ctx.fillStyle = layer[0];
      var off = (camX * layer[1]) % layer[3];
      if (theme.roofs) {
        for (var hx = -off - layer[3]; hx < W + layer[3]; hx += layer[3] * 0.6) {
          var hh = 70 + ((Math.round((hx + camX * layer[1]) / 50) * 37) % 60) - li * 20;
          ctx.fillRect(hx, GROUND - hh, layer[3] * 0.5, hh);
          ctx.beginPath();
          ctx.moveTo(hx - 6, GROUND - hh);
          ctx.lineTo(hx + layer[3] * 0.25, GROUND - hh - 30);
          ctx.lineTo(hx + layer[3] * 0.5 + 6, GROUND - hh);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(0, GROUND);
        for (var x = -off - layer[3]; x <= W + layer[3]; x += layer[3]) {
          ctx.quadraticCurveTo(x + layer[3] / 2, GROUND - layer[2] * 2, x + layer[3], GROUND);
        }
        ctx.lineTo(W, GROUND);
        ctx.fill();
      }
    });

    if (theme.trees) {
      for (var t = 0; t < 6; t++) {
        var tx = ((t * 230 - camX * 0.6) % (W + 230) + W + 230) % (W + 230) - 115;
        ctx.fillStyle = "#7a4b2a";
        ctx.fillRect(tx - 6, GROUND - 70, 12, 70);
        ctx.fillStyle = "#3f9b4c";
        ctx.beginPath(); ctx.arc(tx, GROUND - 90, 34, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (theme.fence) {
      ctx.fillStyle = "#e9d6b5";
      var fo = (camX * 0.8) % 30;
      ctx.fillRect(0, GROUND - 52, W, 8);
      ctx.fillRect(0, GROUND - 26, W, 8);
      for (var fx = -fo; fx < W; fx += 30) ctx.fillRect(fx, GROUND - 64, 16, 64);
    }

    // Boden
    ctx.fillStyle = theme.dirt;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = theme.ground;
    ctx.fillRect(0, GROUND, W, 14);
    outline(3);
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    var go = camX % 48;
    for (var dx = -go; dx < W; dx += 48) ctx.fillRect(dx, GROUND + 28 + (Math.round((dx + camX) / 48) % 2) * 14, 20, 5);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawObstacle(o, sx, first) {
    var top = GROUND - o.top, bottom = GROUND - o.bottom;
    outline(3);
    if (o.type === "kiste") {
      ctx.fillStyle = "#c98a4b";
      ctx.fillRect(sx, top, o.w, o.top);
      ctx.strokeRect(sx, top, o.w, o.top);
      ctx.beginPath();
      ctx.moveTo(sx + 4, top + 4); ctx.lineTo(sx + o.w - 4, GROUND - 4);
      ctx.moveTo(sx + o.w - 4, top + 4); ctx.lineTo(sx + 4, GROUND - 4);
      ctx.stroke();
    } else if (o.type === "topf") {
      ctx.fillStyle = "#4caf50";
      ctx.beginPath();
      ctx.ellipse(sx + o.w / 2 - 8, top + 8, 6, 12, -0.5, 0, Math.PI * 2);
      ctx.ellipse(sx + o.w / 2 + 8, top + 8, 6, 12, 0.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ff5fa2";
      ctx.beginPath(); ctx.arc(sx + o.w / 2, top - 2, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#d9683b";
      ctx.beginPath();
      ctx.moveTo(sx, top + 16); ctx.lineTo(sx + o.w, top + 16);
      ctx.lineTo(sx + o.w - 6, GROUND); ctx.lineTo(sx + 6, GROUND);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillRect(sx - 3, top + 12, o.w + 6, 8);
      ctx.strokeRect(sx - 3, top + 12, o.w + 6, 8);
    } else if (o.type === "heuballen") {
      ctx.fillStyle = "#f2c94c";
      roundRect(sx, top, o.w, o.top, 12);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#b8902a";
      ctx.lineWidth = 2;
      for (var l = 1; l < 4; l++) {
        ctx.beginPath(); ctx.moveTo(sx + 6, top + l * o.top / 4); ctx.lineTo(sx + o.w - 6, top + l * o.top / 4); ctx.stroke();
      }
    } else if (o.type === "tunnel") {
      // Karton mit Durchgang unten
      ctx.fillStyle = "#d8a86a";
      ctx.fillRect(sx, top, o.w, o.top);
      ctx.fillStyle = "#3a2516";
      roundRect(sx + 6, bottom, o.w - 12, o.bottom + 6, 10);
      ctx.fill();
      outline(3);
      ctx.strokeRect(sx, top, o.w, o.top);
      ctx.fillStyle = "#c79558";
      ctx.fillRect(sx + o.w / 2 - 14, top, 28, o.top - o.bottom - 8);
      ctx.strokeStyle = "rgba(43,26,18,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + o.w / 2 - 14, top, 28, o.top - o.bottom - 8);
      ctx.fillStyle = INK;
      ctx.font = "26px Bangers, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(first ? "DUCKEN!" : "KARTON", sx + o.w / 2, top + 60);
      if (first) {
        ctx.font = "34px sans-serif";
        ctx.fillText("⬇", sx + o.w / 2, top + 110);
      }
    }
  }

  function drawBird(x, y, t) {
    var flap = Math.sin(t * 18);
    outline(2.5);
    ctx.fillStyle = "#4aa3ff";
    ctx.beginPath(); ctx.ellipse(x, y, 16, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2f7fd6";
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 2);
    ctx.lineTo(x + 8, y - 2);
    ctx.lineTo(x + 2, y - 2 - 16 * flap);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffb020";
    ctx.beginPath(); ctx.moveTo(x - 15, y - 2); ctx.lineTo(x - 25, y + 1); ctx.lineTo(x - 15, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(x - 8, y - 4, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  function drawGoal(sx) {
    outline(3);
    ctx.fillStyle = "#fff";
    ctx.fillRect(sx + 40, GROUND - 120, 5, 120);
    ctx.strokeRect(sx + 40, GROUND - 120, 5, 120);
    ctx.fillStyle = "#ff3b3b";
    ctx.beginPath(); ctx.moveTo(sx + 45, GROUND - 120); ctx.lineTo(sx + 90, GROUND - 106); ctx.lineTo(sx + 45, GROUND - 92); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Fisch im Napf
    ctx.fillStyle = "#9fd3ff";
    ctx.beginPath(); ctx.ellipse(sx, GROUND - 26, 20, 9, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 18, GROUND - 30); ctx.lineTo(sx + 30, GROUND - 40); ctx.lineTo(sx + 30, GROUND - 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e2552b";
    ctx.beginPath();
    ctx.moveTo(sx - 34, GROUND - 22); ctx.lineTo(sx + 34, GROUND - 22);
    ctx.lineTo(sx + 26, GROUND); ctx.lineTo(sx - 26, GROUND);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "15px Bangers, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MIAU", sx, GROUND - 6);
  }

  /** Rote Katze mit weißem Bauch, Blick nach rechts. x = Mitte, y = Unterkante (Bildschirm). */
  function drawCat(c, x, y, pose, t, scale) {
    c.save();
    c.translate(x, y);
    if (scale) c.scale(scale, scale);
    var red = "#e2552b", dark = "#b23a1a";
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.lineJoin = "round";
    c.lineCap = "round";

    var duck = pose === "duck", air = pose === "air";
    var bodyY = duck ? -13 : -26, bodyRy = duck ? 10 : 14, headX = duck ? 26 : 22, headY = duck ? -16 : -38;
    var run = Math.sin(t * 16);

    // Schwanz
    c.strokeStyle = INK;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(-24, bodyY - 4);
    if (duck) c.quadraticCurveTo(-46, bodyY - 2, -54, bodyY + 4);
    else c.quadraticCurveTo(-46, bodyY - 4 - (air ? 4 : run * 3), -44, bodyY - 26 - (air ? 6 : run * 4));
    c.stroke();
    c.strokeStyle = red;
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = INK;
    c.lineWidth = 2.5;

    // Beine
    var legs = duck ? [] : [[14, 1], [6, -1], [-14, -1], [-22, 1]];
    legs.forEach(function (l) {
      var swing = air ? (l[0] > 0 ? 8 : -8) : run * 7 * l[1];
      var footY = air ? -4 : 0;
      c.fillStyle = red;
      c.beginPath();
      c.moveTo(l[0] - 4, bodyY + 6);
      c.lineTo(l[0] + swing - 4, footY);
      c.lineTo(l[0] + swing + 4, footY);
      c.lineTo(l[0] + 4, bodyY + 6);
      c.closePath();
      c.fill(); c.stroke();
      c.fillStyle = "#fff";
      c.beginPath(); c.ellipse(l[0] + swing, footY - 2, 5, 3, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    });
    if (duck) {
      c.fillStyle = "#fff";
      [[16, 0], [-18, 0]].forEach(function (p) { c.beginPath(); c.ellipse(p[0], -3, 7, 3.5, 0, 0, Math.PI * 2); c.fill(); c.stroke(); });
    }

    // Körper mit weißem Bauch und Streifen
    c.fillStyle = red;
    c.beginPath(); c.ellipse(-2, bodyY, 28, bodyRy, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.save();
    c.beginPath(); c.ellipse(-2, bodyY, 28, bodyRy, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = "#fff";
    c.beginPath(); c.ellipse(2, bodyY + bodyRy * 0.75, 20, bodyRy * 0.6, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = dark;
    c.lineWidth = 3;
    [-14, -4, 6].forEach(function (sx) {
      c.beginPath(); c.moveTo(sx, bodyY - bodyRy); c.quadraticCurveTo(sx + 3, bodyY - bodyRy * 0.4, sx, bodyY - bodyRy * 0.1); c.stroke();
    });
    c.restore();
    c.strokeStyle = INK;
    c.lineWidth = 2.5;

    // Kopf
    c.fillStyle = red;
    var earBack = duck ? 6 : 0;
    [[-9, 1], [5, 1]].forEach(function (e) {
      c.beginPath();
      c.moveTo(headX + e[0] - 2, headY - 8);
      c.lineTo(headX + e[0] + 2 - earBack, headY - 22 + earBack);
      c.lineTo(headX + e[0] + 9, headY - 9);
      c.closePath(); c.fill(); c.stroke();
    });
    c.beginPath(); c.arc(headX, headY, 14, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = "#ffb3c1";
    c.beginPath(); c.moveTo(headX + 6 - earBack, headY - 18 + earBack); c.lineTo(headX + 2, headY - 11); c.lineTo(headX + 9, headY - 11); c.closePath(); c.fill();
    c.fillStyle = "#fff";
    c.beginPath(); c.ellipse(headX + 7, headY + 5, 9, 6.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = INK;
    c.beginPath(); c.ellipse(headX + 4, headY - 3, 2.6, 3.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff";
    c.beginPath(); c.arc(headX + 5, headY - 4.5, 1, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ff6f8f";
    c.beginPath(); c.arc(headX + 13, headY + 2, 2.6, 0, Math.PI * 2); c.fill();
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(headX + 10, headY + 5); c.lineTo(headX + 26, headY + 2);
    c.moveTo(headX + 10, headY + 7); c.lineTo(headX + 26, headY + 9);
    c.stroke();
    c.restore();
  }

  function render(frameTime) {
    var theme = THEMES[game.level.index];
    var camX = game.cat.x - CAT_SCREEN_X;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 6 * shake);
    drawBackground(theme, camX);

    var firstTunnel = game.level.index === 1 ? game.level.obstacles.filter(function (o) { return o.kind === "tunnel"; })[0] : null;
    game.level.obstacles.forEach(function (o) {
      var sx = o.x - camX;
      if (sx > -o.w - 20 && sx < W + 20) drawObstacle(o, sx, o === firstTunnel);
    });
    var gx = game.level.goalX + 40 - camX;
    if (gx < W + 120) drawGoal(gx);

    game.level.birds.forEach(function (b) {
      if (b.caught) return;
      var p = K.birdPosition(b, game);
      var sx = p.x - camX;
      if (sx > -40 && sx < W + 40) drawBird(sx, GROUND - p.y, game.time + b.phase);
    });

    var cat = game.cat;
    var pose = cat.ducking ? "duck" : (cat.onGround ? "run" : "air");
    var blink = game.invulnerable > 0 && Math.floor(game.invulnerable * 10) % 2 === 0;
    if (!blink) drawCat(ctx, CAT_SCREEN_X, GROUND - cat.y, pose, running ? game.time : 0);

    ctx.font = "30px Bangers, sans-serif";
    ctx.textAlign = "center";
    game.popups.forEach(function (p) {
      ctx.globalAlpha = 1 - p.age;
      ctx.fillStyle = "#ffe14d";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      var sy = GROUND - p.y - 20 - p.age * 50;
      ctx.strokeText(p.text, p.x - camX, sy);
      ctx.fillText(p.text, p.x - camX, sy);
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = "rgba(255,60,60," + (flash * 0.35) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- Anzeige (HUD) ----------

  var lastHud = "";
  function updateHud() {
    var key = game.level.index + "|" + game.lives + "|" + game.score;
    var progress = Math.min(1, game.cat.x / game.level.goalX);
    hudProgress.style.width = (progress * 100).toFixed(1) + "%";
    if (key === lastHud) return;
    lastHud = key;
    hudLevel.textContent = "Level " + (game.level.index + 1) + ": " + game.level.name;
    hudScore.textContent = String(game.score);
    var hearts = "";
    for (var i = 0; i < K.START_LIVES; i++) hearts += i < game.lives ? "❤️" : '<span class="lost">❤️</span>';
    hudLives.innerHTML = hearts;
    hudLives.setAttribute("aria-label", game.lives + " von " + K.START_LIVES + " Leben");
  }

  // ---------- Spielablauf ----------

  function showOverlay(title, html, buttonText, action) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = html;
    overlayButton.textContent = buttonText;
    overlayAction = action;
    overlay.hidden = false;
    running = false;
    overlayButton.focus({ preventScroll: true });
  }

  function hideOverlay() {
    overlay.hidden = true;
    running = true;
    paused = false;
    btnPause.textContent = "⏸";
    last = null;
  }

  function levelIntro(index, score, lives) {
    game = K.createGame(index, score, lives);
    var def = K.LEVELS[index];
    var hints = [
      "Spring über Kisten und Blumentöpfe. Fang die Vögel für Extrapunkte!",
      "Neu: Kartons mit Durchgang – hier musst du dich <strong>ducken</strong>!",
      "Neu: Heuballen – die sind etwas größer.",
      "Es wird schneller – pass gut auf!",
      "Das letzte Level. Schaffst du es bis zum Napf?"
    ];
    render(0);
    updateHud();
    showOverlay("Level " + (index + 1) + ": " + def.name, "<p>" + hints[index] + "</p>", "Start!", hideOverlay);
  }

  function onEvents(events) {
    events.forEach(function (e) {
      if (SOUNDS[e]) SOUNDS[e]();
      if (e === "hit") { shake = 1; flash = 1; }
    });
    if (game.status === "level") {
      var best = saveHighscore();
      var next = game.level.index + 1, score = game.score, lives = game.lives;
      showOverlay("Level geschafft! 🎉",
        '<p class="big">' + score + " Punkte</p><p>Noch " + lives + " von 9 Leben übrig." + (best ? " Neuer Rekord!" : "") + "</p>",
        "Weiter zu Level " + (next + 1), function () { levelIntro(next, score, lives); });
    } else if (game.status === "won") {
      var record = saveHighscore();
      showOverlay("Gewonnen! 😺",
        "<p>Die Katze hat alle 5 Futternäpfe erreicht!</p><p class=\"big\">" + game.score + " Punkte</p><p>" +
        (record ? "Neuer Rekord!" : "Rekord: " + highscore + " Punkte") + "</p>",
        "Nochmal spielen", function () { levelIntro(0, 0); });
    } else if (game.status === "gameover") {
      var index = game.level.index, startScore = game.levelStartScore;
      showOverlay("Oh nein! 🙀",
        "<p>Alle 9 Leben sind weg. Aber keine Sorge – du startest das Level einfach nochmal mit 9 Leben.</p>",
        "Level nochmal", function () { levelIntro(index, startScore); });
    }
  }

  var last = null, acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (running && !paused) {
      if (last === null) last = now;
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP && running) {
        acc -= STEP;
        var events = K.step(game, STEP, input);
        input.jump = false;
        if (events.length) onEvents(events);
      }
      shake = Math.max(0, shake - 0.05);
      flash = Math.max(0, flash - 0.05);
      render(now);
      updateHud();
    } else {
      last = null;
    }
  }

  function pause() {
    if (!running) return;
    showOverlay("Pause", "<p>Kurz durchatmen …</p>", "Weiterspielen", hideOverlay);
    paused = true;
    btnPause.textContent = "▶";
  }

  // ---------- Steuerung ----------

  function pressJump() { input.jump = true; input.jumpHeld = true; }
  function releaseJump() { input.jumpHeld = false; }

  function holdButton(btn, down, up) {
    btn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      btn.classList.add("pressed");
      if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
      down();
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) {
      btn.addEventListener(type, function () { btn.classList.remove("pressed"); up(); });
    });
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }
  holdButton(btnJump, pressJump, releaseJump);
  holdButton(btnDuck, function () { input.duck = true; }, function () { input.duck = false; });

  canvas.addEventListener("pointerdown", function (e) {
    if (!running) return;
    e.preventDefault();
    pressJump();
  });
  canvas.addEventListener("pointerup", releaseJump);

  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
      e.preventDefault();
      if (!overlay.hidden) return;
      if (!e.repeat) pressJump();
    } else if (k === "ArrowDown" || k === "s" || k === "S") {
      e.preventDefault();
      input.duck = true;
    } else if (k === "p" || k === "P" || k === "Escape") {
      if (overlay.hidden) pause();
    } else if (k === "Enter" && !overlay.hidden && overlayAction) {
      e.preventDefault();
      overlayAction();
    }
  });
  document.addEventListener("keyup", function (e) {
    var k = e.key;
    if (k === " " || k === "ArrowUp" || k === "w" || k === "W") releaseJump();
    if (k === "ArrowDown" || k === "s" || k === "S") input.duck = false;
  });

  overlayButton.addEventListener("click", function () {
    if (overlayAction) overlayAction();
  });
  btnPause.addEventListener("click", function () {
    if (paused) hideOverlay();
    else pause();
  });
  btnSound.addEventListener("click", function () {
    soundOn = !soundOn;
    btnSound.textContent = soundOn ? "🔊" : "🔇";
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause();
  });

  // ---------- Start ----------

  setupCanvas(canvas, W, H);
  var mascot = document.getElementById("mascot");
  setupCanvas(mascot, 180, 120);
  drawCat(mascot.getContext("2d"), 100, 110, "run", 0.3, 1.6);

  render(0);
  updateHud();
  showOverlay("Katzen-Jump'n'Run",
    "<p>Hilf der roten Katze, in 5 Leveln zum Futternapf zu kommen!</p><ul>" +
    "<li><strong>Springen</strong> über Kisten, Töpfe und Heuballen</li>" +
    "<li><strong>Ducken</strong> in Kartons mit Durchgang</li>" +
    "<li><strong>Vögel fangen</strong> gibt +50 Punkte</li>" +
    "<li>Du hast <strong>9 Leben</strong> – wie eine echte Katze</li></ul>" +
    (highscore ? "<p>Rekord: " + highscore + " Punkte</p>" : ""),
    "Los geht's!", function () { levelIntro(0, 0); });

  // für Tests
  window.katzenspiel = { get game() { return game; }, input: input };
  requestAnimationFrame(frame);
})();
