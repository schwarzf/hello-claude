/**
 * Demo „Zwei Katzen“: eine Glückskatze und eine Regenbogenkatze können sich
 * nicht leiden – bis die Tür offen steht. Gezeigt aus dem Zimmer heraus:
 * Fenster mit Fensterbank, daneben die Tür.
 *
 * Jedes Bild ist eine reine Funktion der Songzeit (renderAt); Musik und
 * Grafik lesen denselben Song (GeschichteMusik).
 */
(function () {
  "use strict";

  var M = GeschichteMusik;
  var W = 320, H = 200;
  var FONT = '"Press Start 2P", monospace';
  var canvas = document.getElementById("demo");
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var INK = "#111";
  var RAINBOW = ["#ff3b3b", "#ff9f1c", "#ffe14d", "#4cd964", "#3b9dff", "#8e5bff"];
  var WIN = { x: 92, y: 30, w: 120, h: 86 };     // Fensteröffnung
  var DOOR = { x: 236, y: 46, w: 62, h: 126 };   // Türöffnung
  var SILL_Y = 116, FLOOR_Y = 172, WALK_Y = 112; // Fensterbank, Fußboden, Gehweg draußen

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
  function hash(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }
  function hsl(h, s, l, a) { return "hsla(" + h + "," + s + "%," + l + "%," + (a === undefined ? 1 : a) + ")"; }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function line(x0, y0, x1, y1, w, color, outline) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    (outline === false ? [[w, color]] : [[w + 2, INK], [w, color]]).forEach(function (p) {
      var o = (p[0] - w) / 2;
      for (var i = 0; i <= n; i++) rect(x0 + (x1 - x0) * i / n - o, y0 + (y1 - y0) * i / n - o, p[0], p[0], p[1]);
    });
  }
  function text(str, x, y, size, color, align) {
    ctx.font = size + "px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = align || "center";
    ctx.fillStyle = INK;
    ctx.fillText(str, Math.round(x + 1), Math.round(y + 1));
    ctx.fillStyle = color;
    ctx.fillText(str, Math.round(x), Math.round(y));
  }
  function rainbowText(str, x, y, size, t, wave) {
    ctx.font = size + "px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    var x0 = x - ctx.measureText(str).width / 2;
    for (var i = 0; i < str.length; i++) {
      var cx = x0 + ctx.measureText(str.slice(0, i)).width, cy = y + Math.sin(t * 4 + i * 0.6) * (wave || 0);
      ctx.fillStyle = INK;
      ctx.fillText(str[i], Math.round(cx + 1), Math.round(cy + 1));
      ctx.fillStyle = hsl((i * 30 + t * 160) % 360, 100, 62);
      ctx.fillText(str[i], Math.round(cx), Math.round(cy));
    }
  }
  function bubble(x, y, str, spiky) {
    ctx.font = "8px " + FONT;
    var w = ctx.measureText(str).width + 10, h = 16;
    x = clamp(x, w * 0.7, W - w * 0.7);
    ctx.fillStyle = spiky ? "#fff35c" : "#fff";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (spiky) {
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * Math.PI * 2, r = i % 2 ? 0.75 : 1.15;
        ctx.lineTo(x + Math.cos(a) * w * 0.62 * r, y + Math.sin(a) * h * 0.75 * r);
      }
    } else ctx.ellipse(x, y, w * 0.6, h * 0.6, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    text(str, x, y + 1, 8, spiky ? "#d81b60" : "#333");
  }
  function heart(x, y, s, color) {
    var rows = [".kk.kk.", "kppkppk", "kpppppk", ".kpppk.", "..kpk..", "...k..."];
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < 7; c++) {
      var ch = rows[r][c];
      if (ch !== ".") rect(x + (c - 3.5) * s, y + (r - 3) * s, s, s, ch === "k" ? INK : (color || "#ff4f8b"));
    }
  }

  // ---------- Fellmuster ----------

  /** Glückskatze: weiß mit orangen und schwarzen Flecken (fest pro Pixelblock). */
  function calico(c, r) {
    var h = hash(Math.floor((c + 1) / 4), Math.floor((r + 1) / 4));
    return h < 0.33 ? "#f08a3c" : h < 0.52 ? "#3d3535" : "#f8f4ea";
  }
  /** Regenbogenkatze: schimmernde Streifen, die langsam weiterwandern. */
  function rainbowFur(t) {
    return function (c, r) { return RAINBOW[((Math.floor((r + c * 0.25) / 2) + Math.floor(t * 5)) % 6 + 6) % 6]; };
  }
  function furOf(cat, t) { return cat.lucky ? calico : rainbowFur(t + cat.phase); }

  function sprite(rows, x, y, fur, flip) {
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    var pal = { k: INK, e: INK, w: "#fff", p: "#ffb3c8", n: "#ff6f9a", m: "#a0122e", r: "#d81b1b", g: "#ffd23f" };
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r][c];
        if (ch === "." || ch === " ") continue;
        var color = ch === "b" || ch === "d" ? fur(c, r) : pal[ch];
        rect(flip ? x + width - 1 - c : x + c, y + r, 1, 1, color);
      }
    }
  }

  // ---------- Sprites ----------

  var BACK = [
    "..k........k....",
    ".kbk......kbk...",
    ".kbbk....kbbk...",
    ".kbbbkkkkbbbk...",
    "kbbbbbbbbbbbbk..",
    "kbbbbbbbbbbbbk..",
    "kbbbbbbbbbbbbk..",
    ".kbbbbbbbbbbk...",
    "..kbbbbbbbbk....",
    ".kbbbbbbbbbbk...",
    "kbbbbbbbbbbbbk..",
    "kbbbbbbbbbbbbbk.",
    "kbbbbbbbbbbbbbk.",
    "kbbbbbbbbbbbbbbk",
    "kbbbbbbbbbbbbbbk",
    "kbbbbbbbbbbbbbbk",
    "kbbbbbbbbbbbbbbk",
    ".kbbbbbbbbbbbbk.",
    "..kkkkkkkkkkkk.."
  ];
  // Ohren angelegt (wütend) und Kopf zur Seite gedreht (ein Auge, Nase sichtbar)
  var BACK_ANGRY = ["................", "................", "kkk........kkk..", "kbbkkkkkkkkbbk.."].concat(BACK.slice(4));
  var BACK_TURN = BACK.slice(0, 4).concat(["kbbbbbbbbbbbbk..", "kbbbbbbbbbbkek..", "kbbbbbbbbbbwnk..", ".kbbbbbbbbwwk..."]).concat(BACK.slice(8));
  var BACK_TURN_ANGRY = BACK_ANGRY.slice(0, 4).concat(["kbbbbbbbbbkkbk..", "kbbbbbbbbbbkek..", "kbbbbbbbbbkmnk..", ".kbbbbbbbbwwk..."]).concat(BACK.slice(8));

  var FRONT = [
    "..k........k....",
    ".kpk......kpk...",
    ".kbbk....kbbk...",
    ".kbbbkkkkbbbk...",
    "kbbbbbbbbbbbbk..",
    "kbbeebbbbeebbk..",
    "kbbeebbbbeebbk..",
    "kbbbbwwwwbbbbk..",
    ".kbbwwnnwwbbk...",
    "..kbwwwwwwbk....",
    ".kbbbwwwwbbbk...",
    "kbbbbwwwwbbbbk..",
    "kbbbwwwwwwbbbk..",
    "kbbbwwwwwwbbbk..",
    "kbbbwwwwwwbbbk..",
    "kbbwwwwwwwwbbk..",
    "kbbbbbbbbbbbbk..",
    "kbwwbkkkkbwwbk..",
    ".kkkk....kkkk..."
  ];
  var FRONT_ANGRY = ["................", "................", "kkk........kkk..", "kbbkkkkkkkkbbk..",
    "kbbkbbbbbbkbbk..", "kbbbkebbekbbbk..", "kbbeebbbbeebbk..", "kbbbbwwwwbbbbk..", ".kbbwkmmkwbbk..."].concat(FRONT.slice(9));
  var FRONT_HAPPY = FRONT.slice(0, 5).concat(["kbbkkbbbbkkbbk..", "kbbbbbbbbbbbbk..", "kbpbbwwwwbbpbk..", ".kbbwwnnwwbbk..."]).concat(FRONT.slice(9));

  var SIDE = [
    "...............k....k...",
    "..............kpk..kpk..",
    "..kkkkkkkkkkkkkbbkkbbbk.",
    ".kbbbbbbbbbbbbbbbbbbbbbk",
    ".kbbbbbbbbbbbbbbbbbbebbk",
    ".kbbbbbbbbbbbbbbbbbbbbbk",
    ".kbbbbbbbbbbbbbbbbwwnwwk",
    ".kwwwwwwwwwwwbbbbbbwwwk.",
    "..kwwwwwwwwwwkkkkkkkkk.."
  ];
  var SIDE_ANGRY = SIDE.slice(0, 4).concat([".kbbbbbbbbbbbbbbbbbkekbk"]).concat(SIDE.slice(5, 7)).concat([".kwwwwwwwwwwwbbbbbbwkmk.", "..kwwwwwwwwwwkkkkkkkkmk."]);

  // ---------- Katzen zeichnen ----------

  var LUCKY = { lucky: true, phase: 0, name: "GLUECKSKATZE" };
  var RAINBOWCAT = { lucky: false, phase: 1.7, name: "REGENBOGENKATZE" };

  function tailCurve(x0, y0, x1, y1, bend, w, fur) {
    var pts = [];
    for (var i = 0; i <= 10; i++) {
      var u = i / 10, mx = (x0 + x1) / 2 + bend[0], my = (y0 + y1) / 2 + bend[1];
      pts.push([(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1]);
    }
    pts.forEach(function (p) { rect(p[0] - (w + 2) / 2, p[1] - (w + 2) / 2, w + 2, w + 2, INK); });
    pts.forEach(function (p, i) { rect(p[0] - w / 2, p[1] - w / 2, w, w, fur(i, i)); });
  }

  /** Sitzende Katze von hinten (x/y = links oben), mit Schwanz und ggf. Winkepfote. */
  function catBack(cat, x, y, t, o) {
    o = o || {};
    var fur = furOf(cat, t), angry = o.angry, puff = angry ? 3 : 2;
    var sw = angry ? Math.sin(t * 14) * 3 : Math.sin(t * 2.2 + cat.phase) * 4;
    if (!o.noTail) tailCurve(x + 13, y + 17, x + 20 + sw, y + 4, [6, 4], puff, fur);
    var rows = angry ? (o.turn ? BACK_TURN_ANGRY : BACK_ANGRY) : (o.turn ? BACK_TURN : BACK);
    sprite(rows, x, y, fur, o.flip);
    if (cat.lucky) rect(x + 3, y + 8, 9, 1, "#d81b1b"); // Halsband
    if (cat.lucky && o.wave !== undefined) {
      var a = -1.2 + Math.sin(o.wave) * 0.45;
      var sx = o.flip ? x + 2 : x + 12, dir = o.flip ? -1 : 1;
      line(sx, y + 12, sx + dir * Math.cos(a) * 5, y + 12 + Math.sin(a) * 9, 2, "#f8f4ea");
      rect(sx + dir * Math.cos(a) * 5 - 1, y + 12 + Math.sin(a) * 9 - 2, 3, 3, "#fff");
    }
  }

  /** Sitzende Katze von vorn (x/y = links oben). mood: "angry", "happy" oder normal. */
  function catFront(cat, x, y, t, o) {
    o = o || {};
    var fur = furOf(cat, t);
    var sw = Math.sin(t * 2 + cat.phase) * 3;
    tailCurve(x + 12, y + 17, x + 17 + sw, y + 6, [4, 3], o.mood === "angry" ? 3 : 2, fur);
    var rows = o.mood === "angry" ? FRONT_ANGRY : o.mood === "happy" ? FRONT_HAPPY : FRONT;
    sprite(rows, x, y, fur);
    if (cat.lucky) {
      rect(x + 3, y + 9, 8, 1, "#d81b1b");
      rect(x + 6, y + 10, 2, 2, "#ffd23f");
      if (o.wave !== undefined) {
        var lift = Math.sin(o.wave) * 2;
        line(x + 11, y + 12, x + 14, y + 5 + lift, 2, "#f8f4ea");
        rect(x + 13, y + 3 + lift, 3, 3, "#fff");
      }
    }
  }

  /** Laufende Katze von der Seite (x/y = links oben), Blick nach rechts oder links. */
  function catSide(cat, x, y, t, o) {
    o = o || {};
    var fur = furOf(cat, t), flip = o.left, w = 24;
    for (var i = 0; i < 7; i++) {
      var tx = flip ? x + w + i : x - i, ty = y + 3 - i * 0.9 + Math.sin(t * 6 + i * 0.7) * 1.2;
      rect(tx - 1, ty - 1, 3, 3, INK);
      rect(tx, ty, 1, 1, fur(i, 3));
    }
    [3, 7, 13, 17].forEach(function (lx, k) {
      var px = flip ? x + w - 1 - lx - 1 : x + lx, ox = 0, len = 3;
      if (o.walking) { ox = Math.round(Math.sin(t * 12 + (k % 2) * Math.PI) * 1.5); len = 2 + (Math.sin(t * 12 + k) > 0 ? 1 : 0); }
      if (o.jump) { ox = (k < 2 ? -2 : 2) * (flip ? -1 : 1); }
      rect(px + ox - 1, y + 8, 4, len + 2, INK);
      rect(px + ox, y + 8, 2, len, fur(lx, 9));
      rect(px + ox, y + 8 + len - 1, 2, 1, "#fff");
    });
    sprite(o.angry ? SIDE_ANGRY : SIDE, x, y, fur, flip);
    if (cat.lucky) {
      var cx = flip ? x + 8 : x + 13;
      rect(cx, y + 3, 3, 5, "#d81b1b");
      rect(cx, y + 7, 2, 2, "#ffd23f");
    }
  }

  function scaled(x, y, s, fn) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(s, s);
    fn();
    ctx.restore();
  }

  // ---------- Draußen ----------

  var MOODS = {
    szene1: { sky: ["#5fb6ff", "#cfeeff"], ground: "#7cc35a", sun: [270, 52, "#ffe14d"] },
    szene2: { sky: ["#2b2a4a", "#5d5a7a"], ground: "#4c6b3c", storm: true },
    szene3: { sky: ["#3a2a6a", "#f2a477"], ground: "#5a7b44", stars: true, sun: [200, 108, "#ff9a4d"] },
    zoegern: { sky: ["#ff9a5c", "#ffd59e"], ground: "#6f9a4a", sun: [180, 92, "#ffd23f"] },
    romantik: { sky: ["#7a3f8f", "#ff8a6a"], ground: "#6a8a44", sun: [150, 96, "#ffcf4d"], stars: true },
    ende: { sky: ["#3b2466", "#ff7a6a"], ground: "#5a7b44", sun: [150, 110, "#ffb347"], stars: true }
  };

  function outside(t, mood, flash, sunset) {
    var m = MOODS[mood];
    var g = ctx.createLinearGradient(0, 0, 0, 104);
    g.addColorStop(0, m.sky[0]);
    g.addColorStop(1, m.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (m.stars) { var r = rng(9); for (var s = 0; s < 30; s++) { var sx = r() * W, sy = r() * 60; if (Math.sin(t * 3 + s) > -0.3) rect(sx, sy, 1, 1, "#fff6d0"); } }
    if (m.sun) {
      var sy2 = m.sun[1] + (sunset || 0) * 14;
      ctx.fillStyle = m.sun[2];
      ctx.beginPath(); ctx.arc(m.sun[0], sy2, 12, 0, Math.PI * 2); ctx.fill();
    }
    // Wolken
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 110 + t * (m.storm ? 30 : 6)) % (W + 80)) - 40, cy = 40 + (c % 2) * 14;
      ctx.fillStyle = m.storm ? "#3b3a55" : "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.arc(cx + 11, cy - 4, 11, 0, 7); ctx.arc(cx + 23, cy, 9, 0, 7); ctx.fill();
    }
    // Häuser und Bäume gegenüber
    [[96, 64, 30, 40, "#c97b5a"], [140, 70, 26, 34, "#e2c08a"], [176, 60, 34, 44, "#9db2c9"]].forEach(function (h) {
      rect(h[0], h[1], h[2], h[3], h[4]);
      ctx.fillStyle = "#7a3b2a";
      ctx.beginPath(); ctx.moveTo(h[0] - 3, h[1]); ctx.lineTo(h[0] + h[2] / 2, h[1] - 12); ctx.lineTo(h[0] + h[2] + 3, h[1]); ctx.fill();
      rect(h[0] + 5, h[1] + 8, 6, 6, mood === "szene1" ? "#bfe6ff" : "#ffd76a");
      rect(h[0] + h[2] - 11, h[1] + 8, 6, 6, mood === "szene1" ? "#bfe6ff" : "#ffd76a");
    });
    [[230, 70], [262, 64], [300, 72]].forEach(function (tr, i) {
      var sway = m.storm ? Math.sin(t * 6 + i) * 3 : 0;
      rect(tr[0] - 2, tr[1] + 10, 4, 24, "#6b4a2b");
      ctx.fillStyle = m.storm ? "#2f5a30" : "#3f9b4c";
      ctx.beginPath(); ctx.arc(tr[0] + sway, tr[1] + 6, 12, 0, 7); ctx.fill();
    });
    // Zaun, Gehweg und Vorgarten (durch die Tür sichtbar)
    for (var f = 0; f < W; f += 8) rect(f, 92, 5, 12, "#eae2d0");
    rect(0, 96, W, 2, "#d6ccb6");
    rect(0, 104, W, 12, "#b9b2a5");
    for (var p = 0; p < W; p += 16) rect(p, 104, 1, 12, "#a39c90");
    rect(0, 116, W, H - 116, m.ground);
    ctx.fillStyle = "#c9b48f";
    ctx.beginPath(); ctx.moveTo(250, 116); ctx.lineTo(276, 116); ctx.lineTo(292, H); ctx.lineTo(232, H); ctx.fill();
    if (m.storm && flash > 0) rect(0, 0, W, 116, "rgba(255,255,255," + (flash * 0.6).toFixed(2) + ")");
  }

  // ---------- Drinnen ----------

  function room(t, doorOpen, warm) {
    // Wand mit Aussparungen für Fenster und Tür
    ctx.fillStyle = warm ? "#e9c79a" : "#e4d2b0";
    ctx.beginPath();
    ctx.rect(0, 0, W, FLOOR_Y);
    ctx.rect(WIN.x + WIN.w, WIN.y, -WIN.w, WIN.h);
    ctx.rect(DOOR.x + DOOR.w, DOOR.y, -DOOR.w, DOOR.h);
    ctx.fill("evenodd");
    for (var sx = 4; sx < W; sx += 12) {
      if ((sx > WIN.x - 2 && sx < WIN.x + WIN.w) || (sx > DOOR.x - 2 && sx < DOOR.x + DOOR.w)) continue;
      rect(sx, 0, 2, FLOOR_Y, warm ? "#ddb684" : "#d8c49e");
    }
    // Fensterrahmen und Fensterbank
    rect(WIN.x - 5, WIN.y - 5, WIN.w + 10, 5, "#8a5a36");
    rect(WIN.x - 5, WIN.y, 5, WIN.h, "#8a5a36");
    rect(WIN.x + WIN.w, WIN.y, 5, WIN.h, "#8a5a36");
    rect(WIN.x + WIN.w / 2 - 1, WIN.y, 2, WIN.h, "#8a5a36");
    rect(WIN.x - 10, SILL_Y, WIN.w + 20, 6, "#a8703f");
    rect(WIN.x - 10, SILL_Y, WIN.w + 20, 1, "#c98f55");
    rect(WIN.x - 8, SILL_Y + 6, WIN.w + 16, 2, "#6b4426");
    // Vorhänge
    rect(WIN.x - 22, WIN.y - 8, 14, 96, "#c0394f");
    rect(WIN.x + WIN.w + 8, WIN.y - 8, 14, 96, "#c0394f");
    for (var v = 0; v < 96; v += 6) { rect(WIN.x - 18, WIN.y - 8 + v, 2, 3, "#a12a3e"); rect(WIN.x + WIN.w + 12, WIN.y - 8 + v, 2, 3, "#a12a3e"); }
    // Türrahmen und Tür
    rect(DOOR.x - 4, DOOR.y - 4, DOOR.w + 8, 4, "#7a4e2e");
    rect(DOOR.x - 4, DOOR.y, 4, DOOR.h, "#7a4e2e");
    rect(DOOR.x + DOOR.w, DOOR.y, 4, DOOR.h, "#7a4e2e");
    var open = clamp(doorOpen || 0, 0, 1), dw = Math.round(DOOR.w * (1 - open * 0.86));
    if (dw > 0) {
      var dx = DOOR.x + DOOR.w - dw;
      rect(dx, DOOR.y, dw, DOOR.h, "#9a6438");
      rect(dx + 3, DOOR.y + 6, Math.max(1, dw - 6), 50, "#8a5630");
      rect(dx + 3, DOOR.y + 66, Math.max(1, dw - 6), 54, "#8a5630");
      if (open < 0.3) rect(dx + 5, DOOR.y + 64, 4, 4, "#ffd23f");
    }
    // Bild mit Fisch, Lampe, Pflanze
    rect(18, 40, 40, 30, "#6b4426");
    rect(21, 43, 34, 24, "#bfe6ff");
    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath(); ctx.ellipse(36, 55, 9, 5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(44, 55); ctx.lineTo(50, 50); ctx.lineTo(50, 60); ctx.fill();
    rect(32, 54, 2, 2, INK);
    rect(26, 90, 2, 82, "#555");
    ctx.fillStyle = warm ? "#ffd76a" : "#f5e6b8";
    ctx.beginPath(); ctx.moveTo(18, 92); ctx.lineTo(36, 92); ctx.lineTo(31, 80); ctx.lineTo(23, 80); ctx.fill();
    if (warm) { ctx.fillStyle = "rgba(255,215,106,0.18)"; ctx.beginPath(); ctx.arc(27, 92, 30, 0, 7); ctx.fill(); }
    rect(60, 150, 18, 22, "#c96a3c");
    ctx.fillStyle = "#3f9b4c";
    [[64, 140], [70, 134], [76, 142], [68, 146]].forEach(function (l) { ctx.beginPath(); ctx.ellipse(l[0], l[1], 4, 9, (l[0] - 70) / 10, 0, 7); ctx.fill(); });
    // Fußboden und Teppich
    rect(0, FLOOR_Y, W, H - FLOOR_Y, "#a8703f");
    for (var fb = 0; fb < W; fb += 22) rect(fb, FLOOR_Y, 1, H - FLOOR_Y, "#8a5a36");
    rect(0, FLOOR_Y, W, 2, "#6b4426");
    rect(96, 182, 120, 14, "#5b7fc4");
    rect(100, 185, 112, 8, "#ffd23f");
    rect(104, 187, 104, 4, "#5b7fc4");
  }

  // ---------- Szenen ----------

  function since(step, frac, test) {
    for (var k = 0; k < 40 && step - k >= 0; k++) {
      var e = M.at(step - k).events;
      if (test(e)) return M.stepTime(step) + frac * M.stepLength(step) - M.stepTime(step - k);
    }
    return 99;
  }

  function caption(str, sub) {
    rect(0, 0, W, 14, "rgba(0,0,0,0.55)");
    text(str, W / 2, 7, 8, "#ffe14d");
    if (sub) { rect(0, H - 14, W, 14, "rgba(0,0,0,0.55)"); text(sub, W / 2, H - 7, 8, "#fff"); }
  }

  /**
   * Szene 1 und 2: eine Katze sitzt drinnen, die andere kommt draußen vorbei,
   * bleibt stehen, beide knurren sich an, dann geht sie weiter.
   */
  function sceneWindow(t, a, step, frac, inside, passer, mood, title) {
    var p = a.progress;
    var growlAge = [0, 1].map(function (i) { return since(step, frac, function (e) { return e.growl === i; }); });
    var catIdx = function (c) { return c.lucky ? 0 : 1; };
    var hit = since(step, frac, function (e) { return e.hit; });
    outside(t, mood, mood === "szene2" ? Math.max(0, 1 - hit * 5) : 0);

    // Die Katze draußen: kommt von rechts, bleibt stehen, schaut herein, geht nach links weiter
    var stopX = 170, x, phase;
    if (p < 0.4) { x = W + 20 - (W + 20 - stopX) * ease(p / 0.4); phase = "walk"; }
    else if (p < 0.82) { x = stopX; phase = "stare"; }
    else { x = stopX - (stopX + 40) * ease((p - 0.82) / 0.18); phase = "walk"; }
    var passerAngry = phase === "stare" && p > 0.45;
    if (phase === "walk") scaled(x - 24, WALK_Y - 22, 2, function () { catSide(passer, 0, 0, t, { left: true, walking: true }); });
    else scaled(x - 14, WALK_Y - 38, 2, function () { catFront(passer, 0, 0, t, { mood: passerAngry ? "angry" : "normal", wave: passer.lucky && !passerAngry ? t * 3 : undefined }); });

    room(t, 0, false);

    // Die Katze drinnen auf der Fensterbank (von hinten), dreht den Kopf zur anderen
    var insideAngry = phase === "stare" && p > 0.45 && p < 0.86;
    var turn = phase === "stare" || (p > 0.3 && p < 0.9);
    scaled(104, SILL_Y - 38, 2, function () {
      catBack(inside, 0, 0, t, { angry: insideAngry, turn: turn, wave: inside.lucky && !insideAngry ? t * 3 : undefined });
    });

    // Knurren
    if (growlAge[catIdx(passer)] < 1.4) bubble(x + 6, WALK_Y - 50, "GRRR!", true);
    if (growlAge[catIdx(inside)] < 1.4) bubble(100, SILL_Y - 50, "GRRRR!", true);
    if (phase === "stare" && p < 0.47) bubble(x + 4, WALK_Y - 48, "!", false);
    caption(title, p < 0.4 ? (inside.lucky ? "DIE GLUECKSKATZE SITZT DRINNEN ..." : "JETZT SITZT DIE REGENBOGENKATZE DRINNEN ...") :
      p < 0.86 ? "DIE BEIDEN MOEGEN SICH NICHT!" : "");
  }

  /** Splitscreen-Duell in Szene 2: beide Gesichter in Großaufnahme. */
  function duel(t, step, frac, left, right) {
    var hit = since(step, frac, function (e) { return e.hit; }), shake = hit < 0.15 ? Math.round(Math.sin(t * 80) * 3) : 0;
    rect(0, 0, W / 2, H, "#5a1030");
    rect(W / 2, 0, W / 2, H, "#1f1050");
    for (var i = 0; i < 12; i++) rect(i % 2 ? W / 2 - 4 : W / 2, i * 17, 4, 17, "#ffe14d");
    scaled(22 + shake, 34, 8, function () { sprite(FRONT_ANGRY.slice(0, 11), 0, 0, furOf(left, t)); });
    scaled(178 - shake, 34, 8, function () { sprite(FRONT_ANGRY.slice(0, 11), 0, 0, furOf(right, t)); });
    var g0 = since(step, frac, function (e) { return e.growl === 0; }), g1 = since(step, frac, function (e) { return e.growl === 1; });
    var leftIdx = left.lucky ? 0 : 1;
    if ((leftIdx === 0 ? g0 : g1) < 1.4) text("GRRR!", 80, 24, 16, "#ff6b6b");
    if ((leftIdx === 0 ? g1 : g0) < 1.4) text("GRRR!", 240, 24, 16, "#b98bff");
    text("DUELL AM FENSTER", W / 2, 186, 8, "#fff");
  }

  function sceneMeet(t, a) {
    var p = a.progress;
    outside(t, "szene3", 0);
    // Beide kommen von zwei Seiten, bleiben stehen und schauen sich an – ohne Knurren
    var meet = ease(p / 0.45), lx = 40 + (124 - 40) * meet, rx = 280 - (280 - 182) * meet;
    var walking = p < 0.45;
    scaled(lx - 24, WALK_Y - 22, 2, function () { catSide(LUCKY, 0, 0, t, { walking: walking }); });
    scaled(rx - 24, WALK_Y - 22, 2, function () { catSide(RAINBOWCAT, 0, 0, t, { left: true, walking: walking }); });
    room(t, 0, false);
    // leere Fensterbank mit Kissen
    rect(130, SILL_Y - 5, 40, 5, "#c0394f");
    rect(132, SILL_Y - 6, 36, 1, "#e05a70");
    if (p > 0.5 && p < 0.7) { bubble(lx - 6, WALK_Y - 40, "...", false); bubble(rx + 6, WALK_Y - 40, "...", false); }
    if (p >= 0.7 && p < 0.9) { bubble(lx - 6, WALK_Y - 40, "?", false); bubble(rx + 6, WALK_Y - 40, "?", false); }
    caption("SZENE 3", p < 0.5 ? "NIEMAND SITZT DRINNEN ..." : "SIE SEHEN SICH - DIESMAL OHNE KNURREN");
  }

  function sceneHesitate(t, a) {
    var p = a.progress, open = ease(p / 0.25);
    outside(t, "zoegern", 0);
    // Im Türrahmen: beide tasten sich vor und zurück
    if (p > 0.25) {
      var appear = ease((p - 0.25) / 0.2);
      var stepL = Math.round(Math.sin(t * 2.4) * 3), stepR = Math.round(Math.sin(t * 2.4 + Math.PI) * 3);
      scaled(DOOR.x - 20 + appear * 22, FLOOR_Y - 30 + stepL, 1.6, function () { catFront(LUCKY, 0, 0, t, { wave: t * 3 }); });
      scaled(DOOR.x + DOOR.w - 6 - appear * 22, FLOOR_Y - 30 + stepR, 1.6, function () { catFront(RAINBOWCAT, 0, 0, t); });
    }
    room(t, open, true);
    if (p > 0.5) { bubble(DOOR.x + 8, DOOR.y + 76, "?", false); bubble(DOOR.x + DOOR.w - 6, DOOR.y + 68, "?", false); }
    caption("SZENE 4", p < 0.25 ? "DIE TUER GEHT AUF ..." : "BEIDE WOLLEN HEREIN - ABER ZOEGERN");
  }

  function sceneLove(t, a, step, frac) {
    var p = a.progress, sunset = p;
    outside(t, "romantik", 0, sunset);
    var noseUntil = 0.14, walkUntil = 0.36, jumpUntil = 0.44;
    // 1) Nasenstupser in der Tür
    if (p < noseUntil) {
      var close = ease(p / (noseUntil * 0.6));
      scaled(DOOR.x - 14 + close * 10, FLOOR_Y - 22, 1.6, function () { catSide(LUCKY, 0, 0, t, { walking: close < 1 }); });
      scaled(DOOR.x + DOOR.w - 24 - close * 10, FLOOR_Y - 22, 1.6, function () { catSide(RAINBOWCAT, 0, 0, t, { left: true, walking: close < 1 }); });
    }
    room(t, 1, true);
    if (p < noseUntil && p > noseUntil * 0.55) heart(DOOR.x + DOOR.w / 2, FLOOR_Y - 36 - (p - noseUntil * 0.55) * 160, 3);
    // 2) gemeinsam hinein und zum Fenster
    if (p >= noseUntil && p < walkUntil) {
      var u = ease((p - noseUntil) / (walkUntil - noseUntil)), x = 250 - u * 120;
      scaled(x, FLOOR_Y - 16, 2, function () { catSide(LUCKY, 0, 0, t, { left: true, walking: true }); });
      scaled(x + 40, FLOOR_Y - 10, 2, function () { catSide(RAINBOWCAT, 0, 0, t, { left: true, walking: true }); });
    }
    // 3) Sprung auf die Fensterbank
    if (p >= walkUntil && p < jumpUntil) {
      var j = (p - walkUntil) / (jumpUntil - walkUntil), arc = Math.sin(Math.PI * j) * 30;
      scaled(130 - j * 20, FLOOR_Y - 16 - j * (FLOOR_Y - SILL_Y - 16 + 22) - arc, 2, function () { catSide(LUCKY, 0, 0, t, { left: true, jump: true }); });
      scaled(170 - j * 20, FLOOR_Y - 10 - j * (FLOOR_Y - SILL_Y - 10 + 22) - arc * 0.8, 2, function () { catSide(RAINBOWCAT, 0, 0, t, { left: true, jump: true }); });
    }
    // 4) zusammen am Fenster, die Schwänze formen ein Herz
    if (p >= jumpUntil) {
      var hk = ease((p - jumpUntil) / 0.12);
      scaled(102, SILL_Y - 38, 2, function () { catBack(LUCKY, 0, 0, t, { noTail: true, wave: t * 3 }); });
      scaled(146, SILL_Y - 38, 2, function () { catBack(RAINBOWCAT, 0, 0, t, { noTail: true }); });
      var mid = 147, base = SILL_Y - 4, topY = base - 34 * hk;
      tailCurve(126, base, mid, topY + 6 * hk, [-4, -24 * hk], 4, calico);
      tailCurve(168, base, mid, topY + 6 * hk, [4, -24 * hk], 4, rainbowFur(t + RAINBOWCAT.phase));
      for (var h = 0; h < 6; h++) {
        var hy = SILL_Y - 50 - ((t * 14 + h * 23) % 90), hx = 110 + ((h * 37) % 80) + Math.sin(t + h) * 6;
        if (hy > WIN.y) heart(hx, hy, 1, RAINBOW[h % 6]);
      }
      if (p > 0.62) rainbowText("FREUNDE FUER IMMER", W / 2, 22, 8, t, 2);
    }
    caption(p < 0.62 ? "SZENE 4" : "", p < noseUntil ? "STUPS! SIE VERSOEHNEN SICH" : p < jumpUntil ? "UND GEHEN GEMEINSAM HINEIN ..." : "");
  }

  function sceneEnd(t, a, frac, noLoop) {
    outside(t, "ende", 0, 1);
    room(t, 1, true);
    scaled(102, SILL_Y - 38, 2, function () { catBack(LUCKY, 0, 0, t, { noTail: true, wave: t * 3 }); });
    scaled(146, SILL_Y - 38, 2, function () { catBack(RAINBOWCAT, 0, 0, t, { noTail: true }); });
    tailCurve(126, SILL_Y - 4, 147, SILL_Y - 32, [-4, -24], 4, calico);
    tailCurve(168, SILL_Y - 4, 147, SILL_Y - 32, [4, -24], 4, rainbowFur(t + RAINBOWCAT.phase));
    rect(80, 140, 160, 26, "rgba(20,10,40,0.7)");
    rainbowText("THE END", W / 2, 153, 16, t, 2);
  }

  // ---------- Bild zu einem Zeitpunkt ----------

  var current = { scene: "szene1" };

  function renderAt(t, noLoop) {
    if (noLoop) t = Math.min(t, M.DURATION - 0.001);
    var pos = M.stepAt(t), step = pos.step, frac = pos.frac, a = M.at(step), songT = t % M.DURATION;
    current.scene = a.section;
    ctx.save();
    if (a.section === "szene1") sceneWindow(songT, a, step, frac, LUCKY, RAINBOWCAT, "szene1", "SZENE 1");
    else if (a.section === "szene2") {
      if (a.step >= M.DUEL[0] && a.step < M.DUEL[1]) duel(songT, step, frac, RAINBOWCAT, LUCKY);
      else sceneWindow(songT, a, step, frac, RAINBOWCAT, LUCKY, "szene2", "SZENE 2");
    } else if (a.section === "szene3") sceneMeet(songT, a);
    else if (a.section === "zoegern") sceneHesitate(songT, a);
    else if (a.section === "romantik") sceneLove(songT, a, step, frac);
    else sceneEnd(songT, a, frac, noLoop);
    ctx.restore();
    // weiche Übergänge zwischen den Szenen
    var stepT = M.stepTime(step) + frac * M.stepLength(step) - M.stepTime(step - a.step), secLen = M.stepTime(step - a.step + M.SECTIONS.filter(function (s) { return s.name === a.section; })[0].bars * 16) - M.stepTime(step - a.step);
    var fade = 0;
    if (stepT < 0.5) fade = 1 - stepT / 0.5;
    if (secLen - stepT < 0.5 && a.section !== "ende") fade = Math.max(fade, 1 - (secLen - stepT) / 0.5);
    if (a.section === "szene2" && (Math.abs(a.step - M.DUEL[0]) < 1 || Math.abs(a.step - M.DUEL[1]) < 1)) fade = Math.max(fade, 0.5);
    if (noLoop && a.section === "ende" && a.bar >= 1) fade = Math.max(fade, ease((a.inBar + frac) / 16));
    if (fade > 0) rect(0, 0, W, H, "rgba(0,0,0," + fade.toFixed(3) + ")");
    return a.section;
  }

  // ---------- Live-Wiedergabe ----------

  var running = false, withSound = true, clock = 0, last = null, frames = 0, offset = 0;
  var LABELS = { szene1: "SZENE 1", szene2: "SZENE 2", szene3: "SZENE 3", zoegern: "SZENE 4", romantik: "SZENE 4", ende: "THE END" };
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

  function idle(now) {
    if (running) return;
    renderAt(14 + ((now || 0) / 1000) % 4);
    requestAnimationFrame(idle);
  }
  if (document.fonts && document.fonts.load) document.fonts.load("8px " + FONT).catch(function () {});
  requestAnimationFrame(idle);
  requestAnimationFrame(frame);

  window.geschichte = {
    renderAt: renderAt,
    get scene() { return current.scene; },
    get frames() { return frames; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return M.DURATION; }
  };
})();
