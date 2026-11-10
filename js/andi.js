/**
 * Andis Geburtstags-Demo: Die Andi-Katze fliegt auf einer Gitarre durchs All,
 * bekommt Regenbogenschweif und Begleiter, jagt das Wollknäuel und feiert mit
 * The Miaus und Longcats die Mega-Geburtstagsparty. Baut auf der Katzen-Demo auf.
 *
 * Alles wird als reine Funktion der Songzeit gezeichnet (renderAt). Musik und
 * Grafik lesen denselben Song (KatzenDemoMusik.at), deshalb passen Bild und
 * Ton auch im gerenderten Video exakt zusammen.
 */
(function () {
  "use strict";

  var M = AndiMusik;
  var W = 320, H = 200, STEP = M.STEP;
  var FONT = '"Press Start 2P", monospace';
  var canvas = document.getElementById("demo");
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var INK = "#111";
  var RAINBOW = ["#ff3b3b", "#ff9f1c", "#ffe14d", "#4cd964", "#3b9dff", "#8e5bff"];
  var RED = "#e2552b";
  var ANDI = "#24242f"; // die Andi-Katze: schwarz, mit Sonnenbrille, Partyhut und Regenbogen-Schimmer
  var animT = 0;

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
        var color = body === ANDI && ch === "d" ? RAINBOW[(c + r + Math.floor(animT * 6)) % 6] : pal[ch];
        rect(flip ? x + width - 1 - c : x + c, y + r, 1, 1, color);
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
      rect(tx2, ty2, 1, 1, body === ANDI ? RAINBOW[(j + Math.floor(animT * 6)) % 6] : body);
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
    if (body === ANDI) {
      var fx = function (c, n) { return flip ? x + w - c - n : x + c; };
      // verspiegelte Sonnenbrille
      rect(fx(16, 8), y + 3, 8, 1, "#ddd");
      rect(fx(17, 3), y + 4, 3, 2, "#22e6ff");
      rect(fx(21, 3), y + 4, 3, 2, "#ff2bd6");
      // Partyhut
      for (var hh = 0; hh < 6; hh++) rect(fx(18 - Math.floor(hh / 2), hh + 1), y - 5 + hh, hh + 1, 1, hh % 2 ? "#ffe14d" : "#ff4fa3");
      rect(fx(18, 1), y - 6, 1, 1, "#fff");
    }
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
    if (body === ANDI) {
      var hx = x - 6, hy = headY + (o.bob || 0);
      rect(hx + 1, hy + 3, 10, 1, "#ddd");
      rect(hx + 1, hy + 4, 4, 2, "#22e6ff");
      rect(hx + 7, hy + 4, 4, 2, "#ff2bd6");
      for (var hh = 0; hh < 7; hh++) rect(hx + 6 - Math.ceil(hh / 2), hy - 6 + hh, hh + 1, 1, hh % 2 ? "#ffe14d" : "#ff4fa3");
      rect(hx + 6, hy - 7, 1, 1, "#fff");
      for (var sh = 0; sh < 3; sh++) {
        rect(x - 4, torsoY + 2 + sh * 2, 1, 1, RAINBOW[(sh + Math.floor(animT * 6)) % 6]);
        rect(x + 3, torsoY + 2 + sh * 2, 1, 1, RAINBOW[(sh + 3 + Math.floor(animT * 6)) % 6]);
      }
    }
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

  var SCROLL = "*** HAPPY BIRTHDAY ANDI! ***   ALLES GUTE ZUM GEBURTSTAG WUENSCHEN THE MIAUS UND ALLE KATZEN DIESER GALAXIE!   " +
    "HEUTE AUF DER BUEHNE: AN DER GITARRE: ANDI! - AM SCHLAGZEUG: TATZE - AM BASS: SCHNURRI - GESANG: MIAU MIAU - KEYBOARD: PFOTI   " +
    "LASS DICH FEIERN, ANDI - MIT TORTE, KONFETTI, LONGCATS UND JEDER MENGE BASS!   ";
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

  /** E-Gitarre als Fluggerät (in Sprite-Pixeln, Katze sitzt darauf). */
  function flyingGuitar() {
    rect(-7, 9, 16, 8, INK);
    rect(-6, 10, 14, 6, "#e53935");
    rect(-3, 11, 6, 3, "#fff");
    rect(8, 11, 21, 4, INK);
    rect(9, 12, 19, 2, "#d7b07a");
    for (var f = 11; f < 27; f += 3) rect(f, 12, 1, 2, "#8a6a3a");
    rect(27, 10, 5, 6, INK);
    rect(28, 11, 3, 4, "#e53935");
    rect(-6, 12, 34, 1, "#eee");
  }

  var BIG_FLYERS = [
    { c: RAINBOW[4], x: 46, y: 44, ph: 0.5 }, { c: RAINBOW[1], x: 250, y: 150, ph: 2.1 }, { c: RAINBOW[5], x: 70, y: 152, ph: 3.4 }, { c: RAINBOW[3], x: 262, y: 52, ph: 4.9 }
  ];

  /**
   * Flug durchs All: erst allein auf der Gitarre, dann (power) mit
   * Regenbogenschweif, kleinen und großen Begleitern und mehr Tempo.
   */
  function sceneFlight(t, local, sinceKick, power, enter) {
    ctx.fillStyle = power ? "#12063a" : "#070418";
    ctx.fillRect(0, 0, W, H);
    drawStars(t, power ? 60 : 22);
    var hop = Math.max(0, 0.2 - sinceKick) * 15, speed = power ? 2.2 : 1.6;
    var cx = 170 + Math.sin(t * 0.7) * 40, cy = 96 + Math.sin(t * speed) * 22 - hop;
    if (power) {
      var slide = (1 - enter) * 260;
      // kleine Begleiter
      RAINBOW_FLYERS.forEach(function (f, i) {
        var x = ((t * 70 * f.speed + i * 70) % (W + 80)) - 40 - slide, y = f.y + Math.sin(t * 2 + f.phase) * 6;
        for (var j = 0; j < 4; j++) rect(x - 6 - j * 5, y + 2 + ((j + Math.floor(t * 8)) % 2), 5, 3, f.color);
        sideCat(Math.round(x), Math.round(y - 3), f.color, t + i, "fly");
      });
      // große Begleiter fliegen in Formation mit
      BIG_FLYERS.forEach(function (f, i) {
        var x = f.x + Math.sin(t * 0.9 + f.ph) * 14 - slide * (1 + i * 0.3), y = f.y + Math.sin(t * 1.7 + f.ph) * 9;
        for (var j = 0; j < 7; j++) rect(x - 8 - j * 7, y + 6 + ((j + Math.floor(t * 9)) % 2) * 2, 7, 6, f.c);
        bigSideCat(x, y, f.c, t + i, "fly", false, 2);
      });
      // Regenbogenschweif hinter der Gitarre
      var len = Math.round(22 * enter);
      for (var j = 0; j < len; j++) {
        var tt = t - j * 0.04, py = 96 + Math.sin(tt * speed) * 22, px = cx - 38 - (j + 1) * 8;
        var bump = ((j + Math.floor(t * 10)) % 2) ? 2 : 0;
        for (var s = 0; s < 6; s++) rect(px, py + 2 + bump + s * 3, 8, 3, RAINBOW[s]);
      }
    }
    // Lichtschein, damit die schwarze Katze im dunklen All gut zu sehen ist
    var halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60);
    halo.addColorStop(0, "rgba(150,170,255,0.35)");
    halo.addColorStop(1, "rgba(150,170,255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(cx - 60, cy - 60, 120, 120);
    ctx.save();
    ctx.translate(Math.round(cx - 24), Math.round(cy - 10));
    ctx.rotate(Math.cos(t * speed) * 0.12);
    ctx.scale(2, 2);
    sideCat(0, 0, ANDI, t, "fly", false);
    flyingGuitar();
    ctx.restore();
    if (!power) {
      if (local < 4) rainbowText("ANDI", W / 2, 30, 16, t, "center", 3);
      else rainbowText("ALLEIN IM WELTRAUM ...", W / 2, 30, 8, t, "center", 2);
    } else if (local < 4) rainbowText("REGENBOGEN-POWER!", W / 2, 24, 8, t, "center", 3);
    else rainbowText("ALLE FLIEGEN MIT!", W / 2, 24, 8, t, "center", 3);
    scroller(t, 190, 4);
  }

  function sceneYarn(t, local, sinceKick, sinceSnare, kittens) {
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
    bigSideCat(catX, catY, ANDI, t, jump > 0 ? "jump" : "run", dir < 0, 2);
    // erst zwei, dann vier kleine Katzen machen mit
    for (var n = 0; n < kittens; n++) {
      var kx = catX + 12 - dir * (44 + n * 30), ky = 176 - Math.round(Math.abs(Math.sin(t * 5 + n * 1.3)) * 6) + (n % 2) * 6;
      sideCat(Math.round(kx), ky, RAINBOW[[4, 1, 3, 0][n]], t + n, "run", dir < 0);
    }
    rainbowText(kittens === 2 ? "WOLLKNAEUEL-JAGD!" : "JETZT ZU FUENFT!", W / 2, 14, 8, t, "center", 2);
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
    // Geburtstags-Deko: Wimpelkette, Luftballons und Torte
    for (var wi = 0; wi < 14; wi++) {
      var wx = 30 + wi * 20, wy = 28 + Math.sin(wi / 13 * Math.PI) * 8;
      ctx.fillStyle = RAINBOW[wi % 6];
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 10, wy); ctx.lineTo(wx + 5, wy + 9); ctx.fill();
    }
    [[40, 70], [58, 54], [280, 70], [262, 54], [72, 80], [248, 80]].forEach(function (bl, i) {
      var bx = bl[0] + Math.sin(t * 1.5 + i) * 3, by = bl[1] + Math.cos(t * 1.2 + i) * 2;
      rect(bx, by + 9, 1, 26, "#bbb");
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.ellipse(bx, by, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = RAINBOW[(i * 2 + 1) % 6];
      ctx.beginPath(); ctx.ellipse(bx, by, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
      rect(bx - 3, by - 5, 2, 3, "rgba(255,255,255,0.7)");
    });
    rect(117, 143, 26, 3, "#eee");
    rect(119, 131, 22, 12, INK);
    rect(120, 132, 20, 11, "#ff8fc0");
    rect(120, 132, 20, 3, "#fff");
    for (var dr = 0; dr < 5; dr++) rect(121 + dr * 4, 135, 2, 2, "#fff");
    rect(120, 139, 20, 1, "#d81b60");
    for (var ca = 0; ca < 3; ca++) {
      rect(124 + ca * 5, 126, 2, 6, RAINBOW[ca * 2]);
      rect(124 + ca * 5, 123 + (Math.sin(t * 12 + ca) > 0 ? 0 : 1), 2, 3, "#ffd23f");
    }
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
    var guit = standingCat(212, y, ANDI, t, { arms: [[-2, 6], [strum ? 5 : 6, strum ? 8 : 3]], step: beat % 2 ? 0 : 1 });
    line(guit.shL[0] + 2, guit.shL[1] + 5, guit.shL[0] - 9, guit.shL[1] - 3, 1, "#d7b07a");
    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath(); ctx.ellipse(guit.shR[0] + 1, guit.shR[1] + 7, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.font = "8px " + FONT;
    ctx.textAlign = "center";
    ctx.fillStyle = hsl((t * 200) % 360, 100, 70);
    ctx.fillText("ANDI", 212, y - 44 - (strum ? 1 : 0));
    rect(211, y - 39, 2, 3, "#fff");
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
    if (withLongcats && !finale && local >= 2) rainbowText("LONGCATS FUER ANDI!", W / 2, 46, 8, t, "center", 2);
    if (finale) {
      confetti(t, 90);
      rect(40, 36, 240, 46, "rgba(10,5,30,0.6)");
      rainbowText("HAPPY BIRTHDAY", W / 2, 48, 16, t, "center", 2);
      rainbowText("ANDI!", W / 2, 70, 16, t, "center", 2);
    }
    if (!withLongcats && !finale && local < 4) rainbowText("HAPPY BIRTHDAY ANDI!", W / 2, 46, 8, t, "center", 2);
    else if (!withLongcats && !finale) rainbowText("DIE MEGA-GEBURTSTAGSPARTY!", W / 2, 46, 8, t, "center", 2);
  }

  function sceneEnd(t, local, sinceStart) {
    drawStage(t, 9);
    var bow = Math.min(1, sinceStart * 2);
    for (var i = 0; i < 5; i++) {
      standingCat(40 + i * 60, 190, [RAINBOW[0], RAINBOW[2], ANDI, RAINBOW[4], RAINBOW[5]][i], t, { arms: [[-6, 6], [6, 6]], bob: Math.round(bow * 3) });
    }
    rect(40, 36, 240, 70, "rgba(10,5,30,0.7)");
    rainbowText("HAPPY BIRTHDAY", W / 2, 50, 16, t, "center", 2);
    rainbowText("ANDI!", W / 2, 72, 16, t, "center", 2);
    ctx.font = "8px " + FONT;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText("ALLES GUTE VON THE MIAUS", W / 2, 94);
  }

  // ---------- Bild zu einem Zeitpunkt ----------

  var current = { scene: "flug1" };

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
    animT = t;
    if (a.section === "flug1") sceneFlight(t, a.bar, info.sinceKick, false, 0);
    else if (a.section === "flug2") sceneFlight(t, a.bar, info.sinceKick, true, Math.min(1, (a.step + frac) / 24));
    else if (a.section === "wolle1") sceneYarn(t, a.bar, info.sinceKick, info.sinceSnare, 2);
    else if (a.section === "wolle2") sceneYarn(t, a.bar, info.sinceKick, info.sinceSnare, 4);
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
  var LABELS = { flug1: "ANDI IM WELTRAUM", flug2: "REGENBOGEN-FLUG", wolle1: "WOLLKNAEUEL-JAGD", wolle2: "WOLLKNAEUEL-JAGD", band: "GEBURTSTAGSPARTY", longcat: "LONGCATS", finale: "HAPPY BIRTHDAY ANDI!" };
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

  window.andi = {
    renderAt: renderAt,
    get scene() { return current.scene; },
    get frames() { return frames; },
    get running() { return running; },
    /** springt ohne Ton zu einer Songzeit (für Tests) */
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return (M.SONG_BARS + 2) * M.BAR * STEP; }
  };
})();
