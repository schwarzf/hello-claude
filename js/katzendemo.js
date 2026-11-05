/**
 * Katzen-Demo: Regenbogen-Flug, Wollknäuel-Jagd und ein Finale mit tanzenden
 * Katzen, Longcats und einer Katzenband – in 320×200 Pixeln.
 *
 * Alles wird als reine Funktion der Songzeit gezeichnet (renderAt). Musik und
 * Grafik lesen denselben Song (KatzenDemoMusik.at), deshalb passen Bild und
 * Ton auch im gerenderten Video exakt zusammen.
 */
(function () {
  "use strict";

  var M = KatzenDemoMusik;
  var W = 320, H = 200, STEP = M.STEP;
  var FONT = '"Press Start 2P", monospace';
  var canvas = document.getElementById("demo");
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var INK = "#111";
  var RAINBOW = ["#ff3b3b", "#ff9f1c", "#ffe14d", "#4cd964", "#3b9dff", "#8e5bff"];
  var RED = "#e2552b";

  // ---------- Hilfen ----------

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hsl(h, s, l) { return "hsl(" + h + "," + s + "%," + l + "%)"; }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) * f, g = ((n >> 8) & 255) * f, b = (n & 255) * f;
    return "rgb(" + Math.min(255, r | 0) + "," + Math.min(255, g | 0) + "," + Math.min(255, b | 0) + ")";
  }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

  /** Pixel-Linie mit Kontur (für Arme, Beine, Schwänze, Instrumente). */
  function line(x0, y0, x1, y1, w, color, outline) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    var pass = outline === false ? [[w, color]] : [[w + 2, INK], [w, color]];
    pass.forEach(function (p) {
      var o = (p[0] - w) / 2;
      for (var i = 0; i <= n; i++) {
        var x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
        rect(x - o, y - o, p[0], p[0], p[1]);
      }
    });
  }

  /** Pixel-Sprite aus Textzeilen; b = Fellfarbe, d = dunkle Streifen. */
  function sprite(rows, x, y, body, flip) {
    var pal = { k: INK, e: INK, w: "#fff", p: "#ffb3c8", n: "#ff6f9a", b: body, d: shade(body.charAt(0) === "#" ? body : "#e2552b", 0.72) };
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r][c];
        if (ch === "." || ch === " ") continue;
        rect(flip ? x + width - 1 - c : x + c, y + r, 1, 1, pal[ch]);
      }
    }
  }

  // ---------- Sprites ----------

  var HEAD = [
    "k..........k",
    "kpk......kpk",
    "kbbkkkkkkbbk",
    "kbbbbbbbbbbk",
    "kbeebbbbeebk",
    "kbeebbbbeebk",
    "kbbbwwwwbbbk",
    "kbbwwnnwwbbk",
    ".kbbwwwwbbk.",
    "..kkkkkkkk.."
  ];
  var HEAD_SING = HEAD.slice(0, 7).concat(["kbbwwnnwwbbk", ".kbwkkkkwbk.", "..kkkppkkk.."]);
  var HEAD_BLINK = HEAD.slice(0, 4).concat(["kbbbbbbbbbbk", "kbeebbbbeebk"]).concat(HEAD.slice(6));
  var TORSO = [
    ".kbbbbbbk.",
    "kbbwwwwbbk",
    "kbwwwwwwbk",
    "kbwwwwwwbk",
    "kbwwwwwwbk",
    "kbbwwwwbbk",
    "kbbbbbbbbk",
    ".kbbbbbbk.",
    "..kkkkkk.."
  ];
  var SIDE = [
    "...............k....k...",
    "..............kpk..kpk..",
    "..kkkkkkkkkkkkkbbkkbbbk.",
    ".kbbbdbbbdbbbbbbbbbbbbbk",
    ".kbbdbbbdbbbbbbbbbbebbek",
    ".kbbbbbbbbbbbbbbbbbbbbbk",
    ".kbbbbbbbbbbbbbbbbwwnwwk",
    ".kwwwwwwwwwwwbbbbbbwwwk.",
    "..kwwwwwwwwwwkkkkkkkkk.."
  ];

  /** Katze von der Seite (Blick nach rechts, flip = nach links). x/y = links oben. */
  function sideCat(x, y, body, t, mode, flip) {
    var dir = flip ? -1 : 1, w = 24;
    // Schwanz
    for (var i = 0; i < 7; i++) {
      var tx = flip ? x + w + i : x - i, ty = y + 3 - i * 0.9 + Math.sin(t * 9 + i * 0.7) * 1.2;
      rect(tx - 1, ty - 1, 3, 3, INK);
    }
    for (var j = 0; j < 7; j++) {
      var tx2 = flip ? x + w + j : x - j, ty2 = y + 3 - j * 0.9 + Math.sin(t * 9 + j * 0.7) * 1.2;
      rect(tx2, ty2, 1, 1, body);
    }
    // Beine
    var legs = [3, 7, 13, 17];
    legs.forEach(function (lx, k) {
      var px = flip ? x + w - 1 - lx - 1 : x + lx, ox = 0, len = 3;
      if (mode === "run") { ox = Math.round(Math.sin(t * 20 + (k % 2) * Math.PI) * 1.5); len = 2 + (Math.sin(t * 20 + k) > 0 ? 1 : 0); }
      if (mode === "fly") { ox = (k < 2 ? -2 : 2) * dir; len = 2; }
      if (mode === "jump") { ox = (k < 2 ? -2 : 2) * dir; len = 3; }
      rect(px + ox - 1, y + 8, 4, len + 2, INK);
      rect(px + ox, y + 8, 2, len, body);
      rect(px + ox, y + 8 + len - 1, 2, 1, "#fff");
    });
    sprite(SIDE, x, y, body, flip);
  }

  /** Seitenansicht vergrößert (scale = 2 für die Hauptkatze). */
  function bigSideCat(x, y, body, t, mode, flip, scale) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    sideCat(0, 0, body, t, mode, flip);
    ctx.restore();
  }

  /**
   * Katze auf den Hinterbeinen (von vorn). x = Mitte, y = Füße.
   * o: { arms: [[dxL,dyL],[dxR,dyR]], step, mouth, blink, tail }
   */
  function standingCat(x, y, body, t, o) {
    o = o || {};
    var hipY = y - 7, torsoY = y - 15, headY = torsoY - 9;
    // Schwanz
    var sw = Math.sin(t * 5 + (o.tail || 0)) * 3;
    line(x + 4, y - 9, x + 9, y - 13 + sw * 0.3, 1, body);
    line(x + 9, y - 13 + sw * 0.3, x + 10 + sw, y - 20, 1, body);
    // Beine
    var st = o.step || 0;
    line(x - 3, hipY, x - 3 - st, y - 1, 2, body);
    line(x + 2, hipY, x + 2 + st, y - 1, 2, body);
    rect(x - 5 - st, y - 1, 4, 2, "#fff");
    rect(x + 2 + st, y - 1, 4, 2, "#fff");
    sprite(TORSO, x - 5, torsoY, body);
    // Arme
    var arms = o.arms || [[-4, 6], [4, 6]];
    var shL = [x - 4, torsoY + 2], shR = [x + 3, torsoY + 2];
    line(shL[0], shL[1], shL[0] + arms[0][0], shL[1] + arms[0][1], 2, body);
    line(shR[0], shR[1], shR[0] + arms[1][0], shR[1] + arms[1][1], 2, body);
    rect(shL[0] + arms[0][0] - 1, shL[1] + arms[0][1] - 1, 3, 3, "#fff");
    rect(shR[0] + arms[1][0], shR[1] + arms[1][1] - 1, 3, 3, "#fff");
    sprite(o.mouth ? HEAD_SING : (o.blink ? HEAD_BLINK : HEAD), x - 6, headY + (o.bob || 0), body);
    return { shL: shL, shR: shR, mouthX: x, mouthY: headY + 8 };
  }

  var DANCE = [
    [[-6, -9], [6, -9]],   // beide Pfoten hoch
    [[-8, 0], [8, 0]],     // seitlich
    [[-6, -9], [5, 6]],    // links hoch
    [[-5, 6], [6, -9]]     // rechts hoch
  ];

  function longcat(x, yBottom, height, body, t, rainbow) {
    var top = yBottom - 7 - height;
    // Beine und Schwanz
    line(x - 3, yBottom - 7, x - 4, yBottom - 1, 2, rainbow ? RAINBOW[0] : body);
    line(x + 2, yBottom - 7, x + 3, yBottom - 1, 2, rainbow ? RAINBOW[0] : body);
    line(x + 4, yBottom - 9, x + 12 + Math.sin(t * 4) * 3, yBottom - 30, 1, rainbow ? RAINBOW[5] : body);
    // langer Körper
    rect(x - 5, top, 10, height, INK);
    for (var yy = top; yy < yBottom - 7; yy++) {
      var c = rainbow ? RAINBOW[Math.floor((yy - top) / 12) % RAINBOW.length] : body;
      rect(x - 4, yy, 8, 1, c);
    }
    rect(x - 2, top + 2, 4, height - 4, "rgba(255,255,255,0.9)");
    // winkende Arme oben
    var wave = Math.sin(t * 6) * 4;
    line(x - 4, top + 6, x - 10, top - 2 + wave, 2, rainbow ? RAINBOW[2] : body);
    line(x + 3, top + 6, x + 9, top - 2 - wave, 2, rainbow ? RAINBOW[3] : body);
    sprite(HEAD, x - 6, top - 9, rainbow ? RAINBOW[Math.floor(t * 4) % RAINBOW.length] : body);
  }

  // ---------- Hintergründe ----------

  var STARS = (function () {
    var r = rng(42), s = [];
    for (var i = 0; i < 90; i++) s.push({ x: r() * W, y: r() * H, layer: 1 + Math.floor(r() * 3), tw: r() * 6 });
    return s;
  })();
  function drawStars(t, speed) {
    STARS.forEach(function (s) {
      var x = ((s.x - t * speed * s.layer) % W + W) % W;
      var b = s.layer === 3 ? 255 : s.layer === 2 ? 180 : 110;
      rect(x, s.y, 1, 1, "rgb(" + b + "," + b + "," + Math.min(255, b + 30) + ")");
      if (s.layer === 3 && Math.sin(t * 4 + s.tw) > 0.85) {
        rect(x - 1, s.y, 3, 1, "#fff");
        rect(x, s.y - 1, 1, 3, "#fff");
      }
    });
  }

  function drawGrid(t, top, colorA, colorB) {
    ctx.fillStyle = colorA;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = colorB;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= W; x += 20) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, top); }
    for (var y = 0; y <= top; y += 16) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    var off = (t * 40) % 20;
    for (var fx = -400; fx <= W + 400; fx += 20) { ctx.moveTo(W / 2 + (fx - off - W / 2) * 0.4, top + 0.5); ctx.lineTo(fx - off, H); }
    [top + 6, top + 15, top + 28, top + 46].forEach(function (yy) { ctx.moveTo(0, yy + 0.5); ctx.lineTo(W, yy + 0.5); });
    ctx.stroke();
  }

  // ---------- Texte ----------

  function rainbowText(text, x, y, size, t, align, wave) {
    ctx.font = size + "px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    var width = ctx.measureText(text).width, x0 = align === "center" ? x - width / 2 : x;
    for (var i = 0; i < text.length; i++) {
      var cx = x0 + ctx.measureText(text.slice(0, i)).width, cy = y + Math.sin(t * 4 + i * 0.6) * (wave || 0);
      ctx.fillStyle = INK;
      ctx.fillText(text[i], Math.round(cx + 1), Math.round(cy + 1));
      ctx.fillStyle = hsl((i * 30 + t * 160) % 360, 100, 62);
      ctx.fillText(text[i], Math.round(cx), Math.round(cy));
    }
  }

  var SCROLL = "*** HELLO-CLAUDE PRESENTS: DIE KATZEN-DEMO ***   MIAU! ALLES LIVE GERECHNET, NUR SYNTHESIZER UND JEDE MENGE BASS ...   " +
    "AUF DER BUEHNE: DIE KATZENBAND! AM SCHLAGZEUG: TATZE - AM BASS: SCHNURRI - GESANG: MIAU MIAU - GITARRE: KRALLE - KEYBOARD: PFOTI   " +
    "GRUESSE AN DIE DINO-TASKLISTE, DIE AMIGA-DEMO, DAS GESICHTER-LABOR UND DIE ROTE KATZE MIT DEM WEISSEN BAUCH!   ";
  function scroller(t, y, amp) {
    ctx.font = "8px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    var total = SCROLL.length * 8, start = W - ((t * 60) % (total + W));
    for (var i = 0; i < SCROLL.length; i++) {
      var x = start + i * 8;
      if (x < -8 || x > W) continue;
      var cy = y + Math.sin(x * 0.05 + t * 3) * amp;
      ctx.fillStyle = INK;
      ctx.fillText(SCROLL[i], Math.round(x + 1), Math.round(cy + 1));
      ctx.fillStyle = hsl((x + t * 100) % 360, 100, 65);
      ctx.fillText(SCROLL[i], Math.round(x), Math.round(cy));
    }
  }

  // ---------- Takt-Informationen aus dem Song ----------

  /** Zeit seit dem letzten Ereignis einer Art (bis 2 Takte zurück). */
  function since(stepNow, frac, key, noLoop) {
    for (var k = 0; k < 32 && stepNow - k >= 0; k++) {
      if (M.at(stepNow - k, noLoop).events[key]) return (k + frac) * STEP;
    }
    return 9;
  }
  /** Welcher Lead-Ton gerade klingt (für die singende Katze). */
  function leadSounding(stepNow, noLoop) {
    for (var k = 0; k < 16 && stepNow - k >= 0; k++) {
      var l = M.at(stepNow - k, noLoop).events.lead;
      if (l) return k < l.len ? { midi: l.midi, age: k } : null;
    }
    return null;
  }

  // ---------- Szenen ----------

  var RAINBOW_FLYERS = RAINBOW.map(function (c, i) { return { color: c, phase: i * 1.1, y: 30 + i * 22, speed: 0.6 + i * 0.07 }; });

  function trail(x, y, len, t, thick) {
    var seg = 6;
    for (var j = 0; j < len; j++) {
      var bump = ((j + Math.floor(t * 10)) % 2) ? 1 : 0;
      for (var s = 0; s < 6; s++) rect(x - (j + 1) * seg, y + bump + s * thick, seg, thick, RAINBOW[s]);
    }
  }

  function sceneFlight(t, local, sinceKick) {
    ctx.fillStyle = "#0b0630";
    ctx.fillRect(0, 0, W, H);
    drawStars(t, 25);
    // kleine Regenbogen-Katzen im Hintergrund
    RAINBOW_FLYERS.forEach(function (f, i) {
      var x = ((t * 40 * f.speed + i * 70) % (W + 80)) - 40, y = f.y + Math.sin(t * 2 + f.phase) * 6;
      for (var j = 0; j < 4; j++) rect(x - 6 - j * 5, y + 2 + ((j + Math.floor(t * 8)) % 2), 5, 3, f.color);
      ctx.globalAlpha = 0.85;
      sideCat(Math.round(x), Math.round(y - 3), f.color, t + i, "fly");
      ctx.globalAlpha = 1;
    });
    // die rote Hauptkatze mit großem Regenbogen-Schweif, folgt einer Sinusbahn
    var hop = Math.max(0, 0.2 - sinceKick) * 15;
    var cx = 170 + Math.sin(t * 0.7) * 40, cy = 96 + Math.sin(t * 1.6) * 22 - hop;
    for (var j = 0; j < 20; j++) {
      var tt = t - j * 0.04, py = 96 + Math.sin(tt * 1.6) * 22, px = cx - 24 - (j + 1) * 8;
      var bump = ((j + Math.floor(t * 10)) % 2) ? 2 : 0;
      for (var s = 0; s < 6; s++) rect(px, py - 7 + bump + s * 3, 8, 3, RAINBOW[s]);
    }
    bigSideCat(cx - 24, cy - 10, RED, t, "fly", false, 2);
    if (local < 4) rainbowText("KATZEN-DEMO", W / 2, 30, 16, t, "center", 3);
    else if (local < 8) rainbowText("MIAU!", W / 2, 30, 16, t, "center", 4);
    scroller(t, 186, 6);
  }

  function sceneYarn(t, local, sinceKick, sinceSnare) {
    drawGrid(t, 140, "#2b1650", "#c05cff");
    // Wollknäuel: hüpft auf jedem Schlag, rollt hin und her
    var beat = t / (STEP * 4), phase = beat % 1, seg = Math.floor(beat / 16) % 2;
    var u = (beat % 16) / 16, bx = seg ? 280 - u * 240 : 40 + u * 240, dir = seg ? -1 : 1;
    var by = 168 - Math.sin(Math.PI * phase) * 55, r = 13;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(bx, 182, r * (1 - Math.sin(Math.PI * phase) * 0.4), 3, 0, 0, Math.PI * 2); ctx.fill();
    // Faden
    ctx.strokeStyle = RAINBOW[(Math.floor(t * 4)) % 6];
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var k = 0; k < 30; k++) ctx.lineTo(bx - dir * (r + k * 3), Math.min(182, by + 6 + k * 1.2 + Math.sin(k * 0.8 + t * 6) * 2));
    ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.clip();
    var rot = t * 6 * dir;
    for (var s = -4; s < 10; s++) {
      ctx.fillStyle = RAINBOW[((s % 6) + 6) % 6];
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot * 0.3);
      ctx.fillRect(-r, -r + s * 4 + (rot * 3 % 4), r * 2, 4);
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.arc(bx, by, r - 4, -0.5 + rot, 1.5 + rot); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
    // Katze jagt hinterher und springt auf der Snare
    var jump = sinceSnare < 0.45 ? Math.sin(Math.PI * sinceSnare / 0.45) : 0;
    var catX = bx - dir * 58 - 24, catY = 160 - jump * 38;
    bigSideCat(catX, catY, RED, t, jump > 0 ? "jump" : "run", dir < 0, 2);
    // zwei Regenbogen-Katzen machen mit
    sideCat(Math.round(catX + 12 - dir * 44), 176 - Math.round(Math.abs(Math.sin(t * 5)) * 6), RAINBOW[4], t + 1, "run", dir < 0);
    sideCat(Math.round(catX + 12 - dir * 78), 176 - Math.round(Math.abs(Math.sin(t * 5 + 1)) * 6), RAINBOW[1], t + 2, "run", dir < 0);
    rainbowText(local < 4 ? "WOLLE!" : "FANG DAS KNAEUEL!", W / 2, 14, 8, t, "center", 2);
    scroller(t, 46, 4);
  }

  function drawStage(t, sinceKick) {
    ctx.fillStyle = "#170a2a";
    ctx.fillRect(0, 0, W, H);
    // Scheinwerfer
    for (var i = 0; i < 4; i++) {
      var sx = 40 + i * 80, swing = Math.sin(t * 1.2 + i * 1.7) * 50, hue = (t * 60 + i * 90) % 360;
      ctx.fillStyle = "hsla(" + hue + ",100%,70%," + (0.16 + Math.max(0, 0.25 - sinceKick) * 0.6) + ")";
      ctx.beginPath(); ctx.moveTo(sx - 4, 0); ctx.lineTo(sx + 4, 0); ctx.lineTo(sx + swing + 30, 150); ctx.lineTo(sx + swing - 30, 150); ctx.fill();
    }
    // Banner
    ctx.font = "8px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    rect(96, 8, 128, 16, "#ffe14d");
    rect(98, 10, 124, 12, "#d81b60");
    ctx.fillStyle = "#fff";
    ctx.fillText("THE MIAUS", 160, 17);
    // Vorhänge
    for (var c = 0; c < 2; c++) {
      var x0 = c ? W - 22 : 0;
      for (var f = 0; f < 22; f += 4) rect(x0 + f, 0, 4, 200, f % 8 ? "#a3122a" : "#c81d38");
    }
    // Bühne (Podest) und Boden
    rect(18, 132, 284, 10, "#7a4b2a");
    rect(18, 132, 284, 2, "#b07a4a");
    rect(0, 142, W, 58, "#2a1a3a");
    for (var b = 0; b < W; b += 16) rect(b, 142, 1, 58, "#352348");
  }

  function drumKit(x, y, sinceKick, sinceSnare) {
    var shake = sinceKick < 0.08 ? 1 : 0;
    // Becken
    rect(x + 12, y - 26, 1, 22, "#ccc");
    rect(x + 7, y - 27 - (sinceSnare < 0.1 ? 1 : 0), 12, 2, "#ffd34d");
    // Snare
    rect(x - 16, y - 13, 10, 4, "#eee");
    rect(x - 16, y - 13, 10, 1, INK);
    // Bassdrum mit Pfote
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(x, y - 8 + shake, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e53935";
    ctx.beginPath(); ctx.arc(x, y - 8 + shake, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x, y - 8 + shake, 6, 0, Math.PI * 2); ctx.fill();
    rect(x - 2, y - 8 + shake, 4, 3, "#e53935");
    [[-3, -12], [-1, -13], [1, -13], [3, -12]].forEach(function (p) { rect(x + p[0], y + p[1] + shake, 1, 2, "#e53935"); });
  }

  function band(t, info) {
    var e = info.events, sk = info.sinceKick, ss = info.sinceSnare, y = 132;
    var beat = Math.floor(t / (STEP * 4));
    // Schlagzeug: Tatze
    var hitL = ss < 0.12, hitR = info.sinceHat < 0.06;
    standingCat(52, y, RAINBOW[5], t, { arms: [hitL ? [-10, 3] : [-8, -4], hitR ? [10, -3] : [9, -9]], bob: sk < 0.1 ? 1 : 0 });
    drumKit(52, y, sk, ss);
    // Bass: Schnurri
    var pl = info.sinceBass < 0.06;
    var bassCat = standingCat(100, y, RAINBOW[3], t, { arms: [[-7, 1], [pl ? 4 : 2, pl ? 7 : 4]], step: beat % 2 ? 1 : 0, blink: (t % 3) > 2.85 });
    line(bassCat.shR[0] - 2, bassCat.shR[1] + 6, bassCat.shL[0] - 12, bassCat.shL[1] - 4, 1, "#d7b07a");
    rect(bassCat.shR[0] - 4, bassCat.shR[1] + 3, 7, 6, "#4a90e2");
    // Gesang: Miau Miau
    var lead = info.lead;
    var singer = standingCat(160, y, RED, t, { arms: lead ? [[-6, -8], [3, -2]] : [[-4, 6], [3, -2]], mouth: Boolean(lead), bob: lead && lead.age === 0 ? -1 : 0 });
    rect(162, singer.mouthY - 2, 1, y - singer.mouthY + 2, "#bbb");
    rect(161, singer.mouthY - 3, 3, 3, "#555");
    if (lead) {
      var ny = singer.mouthY - 10 - lead.age * 3;
      ctx.font = "8px " + FONT;
      ctx.textAlign = "center";
      ctx.fillStyle = hsl((lead.midi * 40) % 360, 100, 70);
      ctx.fillText(lead.age < 2 ? "MIAU" : "~", 160 + (lead.age % 2 ? 6 : -6), ny);
    }
    // Gitarre: Kralle
    var strum = info.sinceArp < 0.07;
    var guit = standingCat(212, y, RAINBOW[1], t, { arms: [[-2, 6], [strum ? 5 : 6, strum ? 8 : 3]], step: beat % 2 ? 0 : 1 });
    line(guit.shL[0] + 2, guit.shL[1] + 5, guit.shL[0] - 9, guit.shL[1] - 3, 1, "#d7b07a");
    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath(); ctx.ellipse(guit.shR[0] + 1, guit.shR[1] + 7, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    // Keyboard: Pfoti
    var k = Math.floor(t / STEP) % 2;
    standingCat(264, y, RAINBOW[0], t, { arms: [[-5, k ? 7 : 5], [5, k ? 5 : 7]], bob: sk < 0.1 ? 1 : 0 });
    rect(250, y - 10, 28, 4, "#fff");
    for (var key = 0; key < 28; key += 3) rect(250 + key, y - 10, 1, 2, INK);
    rect(250, y - 6, 28, 1, INK);
    line(256, y - 6, 252, y, 1, "#888", false);
    line(272, y - 6, 276, y, 1, "#888", false);
  }

  function dancers(t, local, sinceKick, enterBars) {
    var beat = Math.floor(t / (STEP * 4)), colors = [RAINBOW[0], RAINBOW[2], RED, RAINBOW[4], RAINBOW[5]];
    var enter = Math.min(1, local / (enterBars || 1));
    for (var i = 0; i < 5; i++) {
      var home = 40 + i * 60, from = i < 2 ? -30 : i > 2 ? W + 30 : home;
      var x = from + (home - from) * enter, hop = sinceKick < 0.15 ? -2 : 0;
      var pose = DANCE[(beat + (i % 2) * 2) % 4];
      standingCat(Math.round(x), 190 + hop, colors[i], t, { arms: pose, step: beat % 2 ? 1 : -1, tail: i, blink: ((t + i) % 4) > 3.85 });
    }
  }

  function confetti(t, amount) {
    var r = rng(7);
    for (var i = 0; i < amount; i++) {
      var x0 = r() * W, sp = 20 + r() * 40, c = RAINBOW[i % 6], y = ((r() * 220 + t * sp) % 220) - 10;
      rect(x0 + Math.sin(t * 2 + i) * 6, y, 2, 2, c);
    }
  }

  function sceneBand(t, local, info, withLongcats, finale) {
    drawStage(t, info.sinceKick);
    if (withLongcats) {
      var grow = Math.min(1, (local + info.inBar / 16) / 4), height = 20 + grow * 210;
      longcat(30, 142, height, RAINBOW[4], t, true);
      longcat(290, 142, height * 0.9, RED, t + 1, false);
    }
    band(t, info);
    dancers(t, local, info.sinceKick, withLongcats || finale ? 0 : 2);
    if (withLongcats && !finale && local >= 2) rainbowText("LONGCAT IS LOOOOONG", W / 2, 34, 8, t, "center", 2);
    if (finale) {
      confetti(t, 90);
      rainbowText("GREETINGS!", W / 2, 34, 16, t, "center", 3);
    }
    if (!withLongcats && !finale && local < 2) rainbowText("DIE KATZENBAND!", W / 2, 34, 8, t, "center", 2);
  }

  function sceneEnd(t, local, sinceStart) {
    drawStage(t, 9);
    var bow = Math.min(1, sinceStart * 2);
    for (var i = 0; i < 5; i++) {
      standingCat(40 + i * 60, 190, [RAINBOW[0], RAINBOW[2], RED, RAINBOW[4], RAINBOW[5]][i], t, { arms: [[-6, 6], [6, 6]], bob: Math.round(bow * 3) });
    }
    rainbowText("THE END", W / 2, 70, 16, t, "center", 3);
    ctx.font = "8px " + FONT;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText("CODE + MUSIK: CLAUDE", W / 2, 96);
  }

  // ---------- Bild zu einem Zeitpunkt ----------

  var current = { scene: "flug" };

  /** Zeichnet das Bild zur Songzeit t (Sekunden). noLoop: Song endet (für das Video). */
  function renderAt(t, noLoop) {
    var stepF = t / STEP, step = Math.floor(stepF), frac = stepF - step;
    var a = M.at(step, noLoop);
    var info = {
      events: a.events,
      inBar: a.inBar,
      sinceKick: since(step, frac, "kick", noLoop),
      sinceSnare: since(step, frac, "snare", noLoop),
      sinceHat: since(step, frac, "hat", noLoop),
      sinceBass: since(step, frac, "bass", noLoop),
      sinceArp: since(step, frac, "arp", noLoop),
      lead: leadSounding(step, noLoop)
    };
    current.scene = a.section;
    ctx.save();
    if (a.section === "finale" && info.sinceSnare < 0.06) ctx.translate(Math.round(Math.sin(t * 90) * 2), 0);
    if (a.section === "flug") sceneFlight(t, a.bar, info.sinceKick);
    else if (a.section === "wolle") sceneYarn(t, a.bar, info.sinceKick, info.sinceSnare);
    else if (a.section === "band") sceneBand(t, a.bar, info, false, false);
    else if (a.section === "longcat") sceneBand(t, a.bar, info, true, false);
    else if (a.section === "finale") sceneBand(t, a.bar, info, true, true);
    else sceneEnd(t, a.bar, a.step * STEP + frac * STEP);
    ctx.restore();
    // Blitz auf dem Kick, Ein- und Ausblenden
    if (info.sinceKick < 0.12 && a.section !== "ende") rect(0, 0, W, H, "rgba(255,255,255," + ((0.12 - info.sinceKick) * 1.2).toFixed(3) + ")");
    var fade = t < 0.6 ? 1 - t / 0.6 : 0;
    if (a.section === "ende" && a.bar >= 1) fade = Math.min(1, (a.inBar + frac) / 16);
    if (fade > 0) rect(0, 0, W, H, "rgba(0,0,0," + fade.toFixed(3) + ")");
    return a.section;
  }

  // ---------- Live-Wiedergabe auf der Seite ----------

  var running = false, withSound = true, clock = 0, last = null, frames = 0, offset = 0;
  var LABELS = { flug: "REGENBOGEN-FLUG", wolle: "WOLLKNAEUEL-JAGD", band: "DIE KATZENBAND", longcat: "LONGCATS", finale: "FINALE" };
  var partEl = document.getElementById("part");

  function songTime() {
    var t = withSound ? M.time() : null;
    return t === null ? clock - offset : t;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    clock += last === null ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    var scene = renderAt(songTime());
    frames++;
    var label = "TEIL: " + (LABELS[scene] || scene.toUpperCase());
    if (partEl && partEl.textContent !== label) partEl.textContent = label;
  }

  var startEl = document.getElementById("start");
  function begin(sound) {
    withSound = sound;
    if (sound) M.start();
    offset = clock;
    running = true;
    if (startEl) startEl.hidden = true;
    var b = document.getElementById("btn-sound");
    if (b) b.setAttribute("aria-pressed", String(sound));
  }

  if (startEl) {
    ["pointerdown", "touchend"].forEach(function (type) {
      document.getElementById("play").addEventListener(type, function () { if (window.Musik) Musik.unlock(); });
    });
    document.getElementById("play").addEventListener("click", function () { begin(true); });
    document.getElementById("play-silent").addEventListener("click", function () { begin(false); });
    document.getElementById("btn-sound").addEventListener("click", function () {
      if (!running) return;
      if (M.playing) {
        var t = M.time();
        M.stop();
        withSound = false;
        offset = clock - t;
      } else {
        // Musik startet am Songanfang neu, die Grafik springt mit
        if (window.Musik) Musik.unlock();
        M.start();
        withSound = true;
      }
      this.setAttribute("aria-pressed", String(withSound));
    });
    document.getElementById("btn-crt").addEventListener("click", function () {
      var off = document.getElementById("screen").classList.toggle("no-crt");
      this.setAttribute("aria-pressed", String(!off));
    });
    document.getElementById("btn-full").addEventListener("click", function () {
      var el = document.getElementById("screen"), req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (req) { try { var r = req.call(el); if (r && r.catch) r.catch(function () {}); } catch (e) { /* kein Vollbild */ } }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Enter") && !running) { e.preventDefault(); begin(true); }
    });
  }

  // Standbild vor dem Start
  function idle(now) {
    if (running) return;
    renderAt(2 + (now || 0) / 1000);
    requestAnimationFrame(idle);
  }
  if (document.fonts && document.fonts.load) document.fonts.load("8px " + FONT).catch(function () {});
  requestAnimationFrame(idle);
  requestAnimationFrame(frame);

  window.katzendemo = {
    renderAt: renderAt,
    get scene() { return current.scene; },
    get frames() { return frames; },
    get running() { return running; },
    /** springt ohne Ton zu einer Songzeit (für Tests) */
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return (M.SONG_BARS + 2) * M.BAR * STEP; }
  };
})();
