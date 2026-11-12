/**
 * Regenbogen-Roadtrip – eine Katzen-Demo im Retro-Amiga-Stil (320×200,
 * große Pixel). Die Regenbogenkatze verliert ihre Farben an Nebelbart, einen
 * grauen Wolkenkater, und holt sie mit der Glückskatze und Käpt'n Schnurrbart
 * auf einem Roadtrip im klapprigen Campingbus „Die Schnurre“ zurück.
 *
 * Jede Station zeigt einen klassischen Demoszene-Effekt: Copper-Bars,
 * Rennspiel-Straße mit Synth-Sonne, Parallax-Scrolling mit Sinus-Bienen,
 * Wasser-Spiegelung, Gewitter mit Bildwackeln, Polarlicht, Regenbogenbrücke,
 * Vektor-Bobs, Sternenfeld, Chrom-Logo und Sinus-Scroller. Dialoge erscheinen
 * wie in alten Amiga-Adventures mit Porträt und Schreibmaschinen-Text.
 *
 * Jedes Bild ist eine reine Funktion der Songzeit (renderAt); Grafik und
 * Musik lesen dieselben Song-Daten – auch, wann welche Farbe zurückkommt.
 */
(function () {
  "use strict";

  var M = window.RoadtripMusik;
  var canvas = document.getElementById("demo");
  if (!canvas || !M) return;
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  var W = 320, H = 200, BEAT = M.BEAT;
  var FONT = '"Press Start 2P", monospace';
  var INK = "#111";
  var RAINBOW = ["#ff3b3b", "#ff9f1c", "#ffe14d", "#4cd964", "#3b9dff", "#8e5bff"];
  var GREY = ["#8c8c8c", "#a8a8a8"];
  var NAMES = ["REGENBOGENKATZE", "GLÜCKSKATZE", "KÄPT'N SCHNURRBART", "NEBELBART", "KAKTUS-IGEL"];
  var CAPTIONS = {
    prolog: "REGENBOGENSTADT, MITTERNACHT", aufbruch: "KAPITEL 1: AUFBRUCH", wueste: "KAPITEL 2: DIE WÜSTENSTRASSE", blumen: "KAPITEL 3: DAS SONNENBLUMENMEER",
    faehre: "KAPITEL 4: DIE FÄHRE", sturm: "KAPITEL 5: DER STURM", bruecke: "KAPITEL 6: DIE REGENBOGENBRÜCKE", abspann: "ABSPANN"
  };
  var CREDITS = "REGENBOGEN-ROADTRIP ...   EINE KATZEN-DEMO IM AMIGA-STIL ...   GRÜSSE AN DIE GLÜCKSKATZE, DIE ANDI-KATZE, THE MIAUS, " +
    "LEO, KIKI, BRUNO UND MINI VOM MIAU-RAVE, DEN KAKTUS-IGEL UND ALLE DINOS DER TASKLISTE ...   UND AN NEBELBART: SCHÖNER HUT!   ";

  // ---------- Hilfen ----------

  function hash(x, y) { var h = Math.sin(x * 127.1 + (y || 0) * 311.7) * 43758.5453; return h - Math.floor(h); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function hsl(h, s, l, a) { return "hsla(" + h + "," + s + "%," + l + "%," + (a === undefined ? 1 : a) + ")"; }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function line(x0, y0, x1, y1, w, color, outline) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    (outline === false ? [[w, color]] : [[w + 2, INK], [w, color]]).forEach(function (p) {
      var o = (p[0] - w) / 2;
      for (var i = 0; i <= n; i++) rect(x0 + (x1 - x0) * i / n - o - w / 2, y0 + (y1 - y0) * i / n - o - w / 2, p[0], p[0], p[1]);
    });
  }
  /** gefüllter Pixel-Kreis aus Zeilen */
  function disc(cx, cy, r, c) {
    for (var y = -r; y <= r; y++) { var w = Math.round(Math.sqrt(r * r - y * y)); rect(cx - w, cy + y, w * 2 + 1, 1, c); }
  }
  function text(str, x, y, size, color, align) {
    ctx.font = size + "px " + FONT; ctx.textBaseline = "middle"; ctx.textAlign = align || "center";
    ctx.fillStyle = INK; ctx.fillText(str, Math.round(x + 1), Math.round(y + 1));
    ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y));
  }
  function rainbowText(str, x, y, size, t, wave) {
    ctx.font = size + "px " + FONT; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    var x0 = x - ctx.measureText(str).width / 2;
    for (var i = 0; i < str.length; i++) {
      var cx = x0 + ctx.measureText(str.slice(0, i)).width, cy = y + Math.sin(t * 4 + i * 0.6) * (wave || 0);
      ctx.fillStyle = INK; ctx.fillText(str[i], Math.round(cx + 1), Math.round(cy + 1));
      ctx.fillStyle = hsl((i * 30 + t * 160) % 360, 100, 62); ctx.fillText(str[i], Math.round(cx), Math.round(cy));
    }
  }
  function scaled(x, y, s, fn) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s, s); fn(); ctx.restore(); }
  /** Bildbereich entsättigen (k = 0 bunt … 1 grau) */
  function desat(k, y0, y1) {
    if (k <= 0) return;
    y0 = y0 || 0; y1 = y1 || H;
    var img = ctx.getImageData(0, y0, W, y1 - y0), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      d[i] = lerp(d[i], l, k); d[i + 1] = lerp(d[i + 1], l, k); d[i + 2] = lerp(d[i + 2], l * 1.05, k);
    }
    ctx.putImageData(img, 0, y0);
  }
  function copper(stops, y0, y1, step) {
    for (var y = y0; y < y1; y += step || 2) {
      var k = (y - y0) / (y1 - y0), i = Math.min(stops.length - 2, Math.floor(k * (stops.length - 1))), f = k * (stops.length - 1) - i, a = stops[i], b = stops[i + 1];
      rect(0, y, W, step || 2, "rgb(" + Math.round(lerp(a[0], b[0], f)) + "," + Math.round(lerp(a[1], b[1], f)) + "," + Math.round(lerp(a[2], b[2], f)) + ")");
    }
  }
  function copperBars(t, n, y, amp) {
    var cols = [[255, 60, 60], [255, 160, 30], [255, 230, 70], [70, 220, 100], [60, 150, 255], [150, 90, 255]];
    for (var i = n - 1; i >= 0; i--) {
      var yy = Math.round(y + Math.sin(t * 2 + i * 0.6) * amp), c = cols[i % 6];
      for (var k = -4; k <= 4; k++) { var l = 1 - Math.abs(k) / 5; rect(0, yy + k, W, 1, "rgb(" + Math.round(c[0] * l + 120 * l * l) + "," + Math.round(c[1] * l + 120 * l * l) + "," + Math.round(c[2] * l + 120 * l * l) + ")"); }
    }
  }
  function stars(t, n, speed, yMax, seed) {
    for (var i = 0; i < n; i++) {
      var layer = 1 + (i % 3), x = ((hash(i * 3.1, seed) * W - t * speed * layer * 12) % W + W) % W, y = hash(i * 7.7, seed) * yMax;
      rect(x, y, 1, 1, layer === 3 ? "#fff" : layer === 2 ? "#aab4ff" : "#5a6098");
    }
  }
  var logoCv = null;
  function chromeLogo(str, cx, cy, t, size) {
    if (!logoCv || logoCv.key !== str + size) {
      logoCv = document.createElement("canvas");
      var c = logoCv.getContext("2d");
      c.font = size + "px " + FONT;
      logoCv.width = Math.ceil(c.measureText(str).width) + 6; logoCv.height = size + 8; logoCv.key = str + size;
      c.font = size + "px " + FONT; c.textBaseline = "top";
      var g = c.createLinearGradient(0, 2, 0, size + 2);
      g.addColorStop(0, "#2a3c8c"); g.addColorStop(0.4, "#bfe8ff"); g.addColorStop(0.5, "#ffffff"); g.addColorStop(0.52, "#6b3e1e"); g.addColorStop(0.8, "#f2a33a"); g.addColorStop(1, "#fff1b0");
      c.fillStyle = "#000"; c.fillText(str, 4, 4); c.fillStyle = g; c.fillText(str, 2, 2);
    }
    var L = logoCv, x0 = Math.round(cx - L.width / 2);
    for (var x = 0; x < L.width; x += 2) ctx.drawImage(L, x, 0, 2, L.height, x0 + x, Math.round(cy - L.height / 2 + Math.sin(t * 3 + x * 0.05) * 3), 2, L.height);
  }
  function scroller(t, str, y) {
    ctx.font = "8px " + FONT; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    var cw = 8, total = str.length * cw, off = (t * 50) % total;
    for (var i = 0; i < str.length; i++) {
      var x = i * cw - off; if (x < -cw) x += total; if (x > W) continue;
      var yy = Math.round(y + Math.sin(t * 4 + x * 0.04) * 5);
      ctx.fillStyle = INK; ctx.fillText(str[i], Math.round(x) + 1, yy + 1);
      ctx.fillStyle = hsl((i * 20 + t * 100) % 360, 95, 62); ctx.fillText(str[i], Math.round(x), yy);
    }
  }

  // ---------- Fell und Sprites (wie in „Zwei Katzen“) ----------

  function calico(c, r) { var h = hash(Math.floor((c + 1) / 4), Math.floor((r + 1) / 4)); return h < 0.33 ? "#f08a3c" : h < 0.52 ? "#3d3535" : "#f8f4ea"; }
  /** Regenbogenfell mit n zurückgewonnenen Farben; der Rest ist grau */
  function rainbowFur(t, n) {
    return function (c, r) {
      var i = ((Math.floor((r + c * 0.25) / 2) + Math.floor(t * 5)) % 6 + 6) % 6;
      return i < Math.floor(n) ? RAINBOW[i] : GREY[(Math.floor((r + c * 0.25) / 2)) % 2];
    };
  }
  function captainFur(c, r) { return (r + c) % 7 === 0 ? "#7a5d40" : "#9a7b5a"; }
  function furOf(cat, t, n) { return cat.lucky ? calico : cat.captain ? captainFur : rainbowFur(t + cat.phase, n); }

  function sprite(rows, x, y, fur, flip) {
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    var pal = { k: INK, e: INK, w: "#fff", p: "#ffb3c8", n: "#ff6f9a", m: "#a0122e", r: "#d81b1b", g: "#ffd23f", s: "#f2f2f2", h: "#1d2a5c", t: "#59c9ff" };
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) {
      var ch = rows[r][c];
      if (ch === "." || ch === " ") continue;
      rect(flip ? x + width - 1 - c : x + c, y + r, 1, 1, ch === "b" || ch === "d" ? fur(c, r) : pal[ch]);
    }
  }
  var FRONT = [
    "..k........k....", ".kpk......kpk...", ".kbbk....kbbk...", ".kbbbkkkkbbbk...", "kbbbbbbbbbbbbk..", "kbbeebbbbeebbk..", "kbbeebbbbeebbk..", "kbbbbwwwwbbbbk..",
    ".kbbwwnnwwbbk...", "..kbwwwwwwbk....", ".kbbbwwwwbbbk...", "kbbbbwwwwbbbbk..", "kbbbwwwwwwbbbk..", "kbbbwwwwwwbbbk..", "kbbbwwwwwwbbbk..", "kbbwwwwwwwwbbk..",
    "kbbbbbbbbbbbbk..", "kbwwbkkkkbwwbk..", ".kkkk....kkkk..."
  ];
  var FRONT_HAPPY = FRONT.slice(0, 5).concat(["kbbkkbbbbkkbbk..", "kbbbbbbbbbbbbk..", "kbpbbwwwwbbpbk..", ".kbbwwnnwwbbk..."]).concat(FRONT.slice(9));
  var FRONT_SAD = FRONT.slice(0, 5).concat(["kbbbbbbbbbbbbk..", "kbbeebbbbeebbk..", "kbbtbwwwwbbbbk..", ".kbtwwnnwwbbk...", "..kbwkkkwwbk...."]).concat(FRONT.slice(10));
  var FRONT_WIDE = FRONT.slice(0, 4).concat(["kbwwwbbbbwwwbk..", "kbwkwbbbbwkwbk..", "kbwwwbbbbwwwbk..", "kbbbbwwwwbbbbk..", ".kbbwwnnwwbbk...", "..kbwwmmwwbk...."]).concat(FRONT.slice(10));
  var SIDE = [
    "...............k....k...", "..............kpk..kpk..", "..kkkkkkkkkkkkkbbkkbbbk.", ".kbbbbbbbbbbbbbbbbbbbbbk", ".kbbbbbbbbbbbbbbbbbbebbk", ".kbbbbbbbbbbbbbbbbbbbbbk",
    ".kbbbbbbbbbbbbbbbbwwnwwk", ".kwwwwwwwwwwwbbbbbbwwwk.", "..kwwwwwwwwwwkkkkkkkkk.."
  ];
  var MINI = ["k.....k.", "kbk.kbk.", "kbbkbbk.", "kebbbek.", "kbwnwbk.", ".kwwwk..", "..kkk..."];

  var RAINBOWCAT = { phase: 1.7, rainbow: true };
  var LUCKY = { lucky: true, phase: 0 };
  var CAPTAIN = { captain: true, phase: 0.5 };

  function tailCurve(x0, y0, x1, y1, bend, w, fur, tip) {
    var pts = [];
    for (var i = 0; i <= 10; i++) {
      var u = i / 10, mx = (x0 + x1) / 2 + bend[0], my = (y0 + y1) / 2 + bend[1];
      pts.push([(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1]);
    }
    pts.forEach(function (p) { rect(p[0] - (w + 2) / 2, p[1] - (w + 2) / 2, w + 2, w + 2, INK); });
    pts.forEach(function (p, i) { rect(p[0] - w / 2, p[1] - w / 2, w, w, tip && i >= 8 ? tip : fur(i, i)); });
  }
  /** sitzende Katze von vorn; o.mood: happy, sad, wide; o.n: Farben der Regenbogenkatze */
  function catFront(cat, x, y, t, o) {
    o = o || {};
    var fur = furOf(cat, t, o.n === undefined ? 6 : o.n), sw = Math.sin(t * 2 + cat.phase) * 3;
    tailCurve(x + 12, y + 17, x + 17 + sw, y + 6, [4, 3], 2, fur, cat.rainbow ? RAINBOW[0] : null);
    sprite(o.mood === "happy" ? FRONT_HAPPY : o.mood === "sad" ? FRONT_SAD : o.mood === "wide" ? FRONT_WIDE : FRONT, x, y, fur);
    if (cat.lucky) {
      rect(x + 3, y + 9, 8, 1, "#d81b1b"); rect(x + 6, y + 10, 2, 2, "#ffd23f");
      if (o.wave !== undefined) { var lift = Math.sin(o.wave) * 2; line(x + 11, y + 12, x + 14, y + 5 + lift, 2, "#f8f4ea"); rect(x + 13, y + 3 + lift, 3, 3, "#fff"); }
    }
    if (cat.captain) {
      rect(x + 1, y - 1, 12, 3, "#1d2a5c"); rect(x + 3, y - 4, 8, 3, "#1d2a5c"); rect(x + 1, y + 1, 12, 1, "#fff"); rect(x + 6, y - 3, 2, 2, "#ffd23f");
      rect(x + 3, y + 8, 3, 1, "#f2f2f2"); rect(x + 8, y + 8, 3, 1, "#f2f2f2"); rect(x + 2, y + 9, 2, 1, "#f2f2f2"); rect(x + 10, y + 9, 2, 1, "#f2f2f2");
    }
    if (o.paw) { line(x + 12, y + 12, x + 16, y + 3, 2, cat.lucky ? "#f8f4ea" : fur(3, 3)); }
  }
  function catSide(cat, x, y, t, o) {
    o = o || {};
    var fur = furOf(cat, t, o.n === undefined ? 6 : o.n), flip = o.left, w = 24;
    for (var i = 0; i < 7; i++) {
      var tx = flip ? x + w + i : x - i, ty = y + 3 - i * 0.9 + Math.sin(t * 6 + i * 0.7) * 1.2;
      rect(tx - 1, ty - 1, 3, 3, INK); rect(tx, ty, 1, 1, cat.rainbow && i >= 5 ? RAINBOW[0] : fur(i, 3));
    }
    [3, 7, 13, 17].forEach(function (lx, k) {
      var px = flip ? x + w - 1 - lx - 1 : x + lx, ox = 0, len = 3;
      if (o.walking) { ox = Math.round(Math.sin(t * 12 + (k % 2) * Math.PI) * 1.5); len = 2 + (Math.sin(t * 12 + k) > 0 ? 1 : 0); }
      if (o.pull) ox = (flip ? 1 : -1);
      rect(px + ox - 1, y + 8, 4, len + 2, INK); rect(px + ox, y + 8, 2, len, fur(lx, 9)); rect(px + ox, y + 8 + len - 1, 2, 1, "#fff");
    });
    sprite(SIDE, x, y, fur, flip);
    if (cat.lucky) { var cx = flip ? x + 8 : x + 13; rect(cx, y + 3, 3, 5, "#d81b1b"); rect(cx, y + 7, 2, 2, "#ffd23f"); }
    if (cat.captain) { var hx = flip ? x + 1 : x + 14; rect(hx, y - 1, 9, 3, "#1d2a5c"); rect(hx + 1, y - 3, 7, 2, "#1d2a5c"); rect(hx, y + 1, 9, 1, "#fff"); }
  }
  function miniHead(cat, x, y, t, n) {
    sprite(MINI, x, y, furOf(cat, t, n));
    if (cat.captain) { rect(x, y - 2, 7, 2, "#1d2a5c"); rect(x + 1, y - 3, 5, 1, "#1d2a5c"); }
    if (cat.lucky) rect(x + 1, y + 6, 5, 1, "#d81b1b");
  }

  // ---------- Fahrzeuge, Wolke, Landschaft ----------

  /** „Die Schnurre“ von der Seite (x = links, y = Bodenlinie), Regenbogenstreifen mit n Farben */
  function bus(x, y, t, n, o) {
    o = o || {};
    var bob = o.still ? 0 : Math.round(Math.abs(Math.sin(t * 9)) * 1);
    y -= bob;
    rect(x - 1, y - 31, 66, 25, INK);
    rect(x, y - 30, 64, 4, "#f4efe2"); rect(x, y - 26, 64, 18, "#e6a43a"); rect(x + 56, y - 26, 8, 18, "#e6a43a");
    for (var i = 0; i < 6; i++) rect(x + 2, y - 13 + i, 52, 1, i < Math.floor(n) ? RAINBOW[i] : GREY[i % 2]);
    [[4, 0], [20, 1], [36, 2]].forEach(function (wn) {
      rect(x + wn[0], y - 25, 13, 9, INK); rect(x + wn[0] + 1, y - 24, 11, 7, "#bfe6ff");
      var who = (o.heads || [RAINBOWCAT, LUCKY, null])[wn[1]];
      if (who) miniHead(who, x + wn[0] + 3, y - 24, t, n);
    });
    rect(x + 51, y - 25, 12, 9, INK); rect(x + 52, y - 24, 10, 7, "#bfe6ff");
    if (!o.noDriver) miniHead(CAPTAIN, x + 54, y - 23, t);
    rect(x + 62, y - 12, 3, 3, "#fff6a0");
    [12, 50].forEach(function (wx) {
      disc(x + wx, y - 5, 6, INK); disc(x + wx, y - 5, 4, "#3a3a44"); rect(x + wx - 1, y - 6, 3, 3, "#c9ccd6");
      var a = o.still ? 0 : t * 14; rect(x + wx + Math.round(Math.cos(a) * 3), y - 5 + Math.round(Math.sin(a) * 3), 1, 1, "#c9ccd6");
    });
    if (o.smoke) for (var s = 0; s < 4; s++) { var a2 = ((t * 1.5 + s / 4) % 1); disc(x - 4 - a2 * 18, y - 8 - a2 * 10, 2 + Math.round(a2 * 4), a2 > 0.6 ? "#bbb" : "#888"); }
  }
  /** der Bus von hinten (für die Rennspiel-Straße) */
  function busRear(cx, y, t, n) {
    var bob = Math.round(Math.abs(Math.sin(t * 10)));
    y -= bob;
    rect(cx - 27, y - 37, 54, 33, INK); rect(cx - 26, y - 36, 52, 4, "#f4efe2"); rect(cx - 26, y - 32, 52, 27, "#e6a43a");
    rect(cx - 20, y - 30, 40, 12, INK); rect(cx - 19, y - 29, 38, 10, "#bfe6ff");
    sprite(["k.....k", "kbk.kbk", "kbbbbbk"], cx - 14, y - 25, furOf(RAINBOWCAT, t, n)); sprite(["k.....k", "kbk.kbk", "kbbbbbk"], cx + 6, y - 25, calico);
    for (var i = 0; i < 6; i++) rect(cx - 24 + i * 8, y - 15, 8, 3, i < Math.floor(n) ? RAINBOW[i] : GREY[i % 2]);
    rect(cx - 25, y - 10, 6, 3, "#ff3030"); rect(cx + 19, y - 10, 6, 3, "#ff3030");
    rect(cx - 24, y - 5, 12, 6, INK); rect(cx + 12, y - 5, 12, 6, INK);
    for (var s = 0; s < 3; s++) { var a = ((t * 2 + s / 3) % 1); disc(cx - 18 - a * 6, y - 1 + a * 4, 1 + Math.round(a * 3), "#d9cdb0"); }
  }
  /** Nebelbart, der Wolkenkater. mood: angry, sad, happy; hat: bunter Hut */
  function cloudCat(x, y, s, t, mood, hat, rain) {
    var puffs = [[-30, 0, 18], [-10, -10, 22], [14, -8, 20], [32, 2, 15], [0, 8, 20], [-22, 10, 14], [22, 10, 14]];
    var wob = function (i) { return Math.round(Math.sin(t * 1.5 + i) * 1.5); };
    [[-22, -26], [14, -26]].forEach(function (e) { for (var k = 0; k < 10 * s; k++) rect(x + e[0] * s + k * 0.5 - 1, y + e[1] * s + k, 10 * s - k - 0, 1, INK); });
    puffs.forEach(function (p, i) { disc(x + p[0] * s, y + p[1] * s + wob(i), Math.round(p[2] * s) + 1, INK); });
    puffs.forEach(function (p, i) { disc(x + p[0] * s, y + p[1] * s + wob(i), Math.round(p[2] * s), i > 3 ? "#7d838e" : "#a3a9b4"); });
    [[-20, -24], [16, -24]].forEach(function (e) { for (var k = 1; k < 9 * s; k++) rect(x + e[0] * s + k * 0.5, y + e[1] * s + k, 8 * s - k, 1, "#a3a9b4"); });
    var ex = 9 * s, ey = y - 2 * s;
    [-1, 1].forEach(function (d) {
      if (mood === "happy") { rect(x + d * ex - 3 * s, ey, 2 * s, s, INK); rect(x + d * ex - s, ey - s, 2 * s, s, INK); rect(x + d * ex + s, ey, 2 * s, s, INK); }
      else { disc(x + d * ex, ey, Math.round(3 * s), "#fff"); disc(x + d * ex, ey + (mood === "sad" ? s : 0), Math.round(1.5 * s), INK); }
      if (mood === "angry") line(x + d * ex - d * 5 * s, ey - 5 * s, x + d * ex + d * 3 * s, ey - 2 * s, Math.max(1, s), INK, false);
      if (mood === "sad") line(x + d * ex - d * 4 * s, ey - 3 * s, x + d * ex + d * 3 * s, ey - 5 * s, Math.max(1, s), INK, false);
    });
    var my = y + 7 * s;
    if (mood === "angry") rect(x - 6 * s, my, 12 * s, 2 * s, INK);
    else if (mood === "sad") { rect(x - 5 * s, my + s, 10 * s, s, INK); rect(x - 6 * s, my + 2 * s, s, s, INK); rect(x + 5 * s, my + 2 * s, s, s, INK); rect(x + ex + 2 * s, ey + 4 * s + ((t * 30) % (8 * s)), s, 2 * s, "#59c9ff"); }
    else { rect(x - 5 * s, my, 10 * s, s, INK); rect(x - 6 * s, my - s, s, s, INK); rect(x + 5 * s, my - s, s, s, INK); }
    if (hat) {
      rect(x - 16 * s, y - 31 * s, 32 * s, 3 * s, INK);
      for (var i = 0; i < 6; i++) rect(x - 10 * s, y - 31 * s - (i + 1) * 3 * s, 20 * s, 3 * s, RAINBOW[i]);
      rect(x - 15 * s, y - 30 * s, 30 * s, 2 * s, "#ff3fb4");
    }
    if (rain) for (var r = 0; r < 26 * s; r++) { var rx = x + (hash(r, 3) - 0.5) * 60 * s, ry = y + 16 * s + ((t * 120 + hash(r, 5) * 100) % (100 * s)); rect(rx, ry, 1, 3, rain === "grey" ? "#9aa4b4" : "#7fc8ff"); }
  }
  function igel(x, y, t, stuck) {
    for (var i = 0; i < 7; i++) line(x - 6 + i * 2, y - 6, x - 9 + i * 3, y - 11 - (i % 2) * 2, 1, "#5a3d22", false);
    disc(x, y - 4, 5, "#8a6a42"); rect(x + 4, y - 4, 4, 3, "#e8c8a0"); rect(x + 7, y - 4, 1, 1, INK); rect(x + 5, y - 5, 1, 1, INK);
    if (stuck) text("!", x + 2, y - 18 + Math.sin(t * 10) * 1, 8, "#ff4040");
  }
  function cactus(x, y, s) {
    rect(x - 3 * s, y - 24 * s, 6 * s, 24 * s, "#2f8a3c"); rect(x - 2 * s, y - 24 * s, 2 * s, 24 * s, "#4cbf5a");
    rect(x - 10 * s, y - 16 * s, 7 * s, 3 * s, "#2f8a3c"); rect(x - 10 * s, y - 22 * s, 3 * s, 7 * s, "#2f8a3c");
    rect(x + 3 * s, y - 12 * s, 7 * s, 3 * s, "#2f8a3c"); rect(x + 7 * s, y - 18 * s, 3 * s, 7 * s, "#2f8a3c");
  }
  function sunflower(x, y, s, t) {
    rect(x, y, Math.max(1, s), 14 * s, "#3c8a2c"); rect(x + s, y + 6 * s, 3 * s, s, "#3c8a2c");
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 + t * 0.2; rect(x + Math.cos(a) * 4 * s - s, y + Math.sin(a) * 4 * s - s, 2 * s + 1, 2 * s + 1, "#ffd23f"); }
    disc(x, y, Math.max(1, Math.round(2.5 * s)), "#6b3e1e");
  }
  function coin(x, y, t) { var w = Math.max(1, Math.round(Math.abs(Math.cos(t * 12)) * 4)); rect(x - w - 1, y - 5, w * 2 + 2, 10, INK); rect(x - w, y - 4, w * 2, 8, "#ffd23f"); rect(x - w + 1, y - 3, 1, 3, "#fff6b0"); }
  function sparkleTrail(x0, y0, x1, y1, k, colors) {
    colors.forEach(function (c, i) {
      for (var j = 0; j < 5; j++) {
        var u = clamp(k * 1.3 - j * 0.06 - i * 0.08, 0, 1), x = lerp(x0, x1, u) + Math.sin(u * 9 + i) * 10, y = lerp(y0, y1, u) - Math.sin(u * Math.PI) * 30;
        if (u > 0 && u < 1) rect(x, y, 2, 2, c);
      }
    });
  }
  function house(x, w, h, col, roof, k) {
    var y = 170 - h;
    rect(x - 1, y - 1, w + 2, h + 2, INK); rect(x, y, w, h, col);
    if (roof) for (var i = 0; i < w / 2 + 2; i++) rect(x - 2 + i, y - i - 1, w + 4 - i * 2, 1, roof);
    for (var r = 0; r < Math.floor((h - 8) / 12); r++) for (var c = 0; c < Math.floor((w - 4) / 8); c++) rect(x + 3 + c * 8, y + 5 + r * 12, 4, 6, hash(x + c, r + k) > 0.3 ? "#ffe66b" : "#2a2a44");
  }
  function city(t) {
    copper([[20, 16, 60], [60, 30, 110], [120, 60, 150]], 0, 170, 2);
    stars(t, 40, 0, 110, 2);
    copperBars(t, 6, 50, 14);
    var hs = [[4, 30, 60, "#ff6b6b", "#c23b3b"], [38, 26, 80, "#ffb347", null], [68, 34, 52, "#ffe14d", "#c9a400"], [106, 28, 92, "#5ad86b", null], [138, 36, 64, "#5aa8ff", "#2a68c0"],
      [178, 26, 84, "#a77bff", null], [208, 32, 58, "#ff7ac6", "#c23b8a"], [244, 30, 76, "#4cd9c4", null], [278, 38, 62, "#ffa04c", "#c25a1c"]];
    hs.forEach(function (q, i) { house(q[0], q[1], q[2], q[3], q[4], i); });
    rect(0, 170, W, 30, "#4a4a5a"); for (var i = 0; i < 10; i++) rect(i * 34 + 6, 184, 18, 2, "#e8e8e8");
  }

  // ---------- Dialoge, Titel, Farbanzeige ----------

  function portrait(c, x, y, t, n) {
    rect(x, y, 26, 24, "#1a1a2e");
    if (c === 3) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, 26, 24); ctx.clip(); cloudCat(x + 13, y + 15, 0.38, t, n >= 6 ? "happy" : "angry", false); ctx.restore(); return; }
    if (c === 4) { igel(x + 12, y + 20, t, false); return; }
    var cat = [RAINBOWCAT, LUCKY, CAPTAIN][c];
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, 26, 24); ctx.clip();
    scaled(x + 2, y + 3, 1.5, function () { sprite(FRONT.slice(0, 11), 0, 0, furOf(cat, t, n)); if (cat.captain) { rect(1, -1, 12, 3, "#1d2a5c"); rect(1, 1, 12, 1, "#fff"); } if (cat.lucky) rect(3, 9, 8, 1, "#d81b1b"); });
    ctx.restore();
  }
  function dialog(e, b, t, n) {
    var shown = Math.floor(clamp((b - e.t) / Math.max(0.6, e.d) * e.word.length * 1.4, 0, e.word.length));
    rect(4, 4, W - 8, 32, "#ffffff"); rect(5, 5, W - 10, 30, "#101028");
    for (var i = 0; i < 6; i++) rect(5 + i * (W - 10) / 6, 5, (W - 10) / 6, 1, RAINBOW[i]);
    portrait(e.cat, 8, 9, t, n);
    text(NAMES[e.cat], 40, 13, 8, ["#ff9f1c", "#ffd23f", "#59c9ff", "#b8b8c8", "#e8c8a0"][e.cat], "left");
    ctx.font = "8px " + FONT; ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.fillText(e.word.slice(0, shown), 40, 27);
    if (shown < e.word.length && Math.floor(t * 8) % 2) rect(40 + ctx.measureText(e.word.slice(0, shown)).width + 1, 23, 6, 8, "#fff");
  }
  function caption(str, k) {
    ctx.font = "8px " + FONT;
    var w = ctx.measureText(str).width + 12, y = H - 16 + (1 - ease(k)) * 20;
    rect(W / 2 - w / 2 - 1, y - 1, w + 2, 14, "#fff"); rect(W / 2 - w / 2, y, w, 12, "#20103a");
    text(str, W / 2, y + 7, 8, "#ffe14d");
  }
  function hud(n) {
    rect(W - 62, H - 12, 60, 10, INK);
    for (var i = 0; i < 6; i++) rect(W - 61 + i * 10, H - 11, 8, 8, i < Math.floor(n) ? RAINBOW[i] : "#3a3a44");
  }

  // ---------- Szenen ----------

  function sb(info) { return info.beat - M.SECTIONS[info.index].start * M.BAR; }   // Schlag im Abschnitt
  function ev(name, bar, beat) { return (M.SECTIONS.filter(function (s) { return s.name === name; })[0].start + bar) * M.BAR + (beat || 0); }

  function sceneProlog(info, t, n) {
    var bar = info.bar, b = info.beat;
    city(t);
    var drain = clamp((sb(info) - 16) / 12, 0, 1);
    var cx = bar < 3 ? -90 : bar < 8 ? lerp(-60, 160, ease((sb(info) - 12) / 6)) : lerp(160, 420, ease((sb(info) - 32) / 6));
    if (drain > 0 && drain < 1) {   // Saugstrahl von der Stadt zur Wolke
      for (var i = 0; i < 40; i++) { var u = (t * 1.5 + i / 40) % 1, x = lerp(hash(i, 1) * W, cx, u), y = lerp(150, 50, u); rect(x, y, 2, 2, RAINBOW[i % 6]); }
    }
    desat(Math.max(drain, bar >= 8 ? 1 : 0), 0, 170);
    if (bar >= 3) cloudCat(cx, 45, 1, t, "angry", false, drain > 0 && drain < 1 ? "grey" : false);
    var mood = bar < 4 ? "happy" : bar >= 7 && bar < 8 ? "wide" : bar >= 8 ? "sad" : "wide";
    scaled(144, 128, 2, function () { catFront(RAINBOWCAT, 0, 0, t, { n: n, mood: mood }); });
    if (bar < 3) text("♪", 190 + Math.sin(t * 3) * 4, 120 - (t * 20 % 30), 8, "#fff");
  }

  function sceneAufbruch(info, t, n) {
    var bar = info.bar, s = sb(info);
    if (bar < 6) {
      // Pixel-Landkarte mit gestrichelter Route
      copper([[30, 80, 160], [20, 60, 140]], 0, H, 4);
      for (var i = 0; i < 60; i++) rect((hash(i, 9) * W + t * 6) % W, hash(i, 4) * H, 3, 1, "#4a8ad0");
      [[20, 120, 70, 60, "#4cbf5a"], [60, 30, 120, 70, "#e8c46a"], [150, 40, 70, 60, "#7ccf5a"], [240, 100, 70, 80, "#8a8a9a"], [10, 20, 40, 40, "#c8c8d8"]].forEach(function (l, k) {
        rect(l[0] - 1, l[1] - 1, l[2] + 2, l[3] + 2, INK); rect(l[0], l[1], l[2], l[3], l[4]);
        for (var j = 0; j < 8; j++) rect(l[0] + hash(j, k) * (l[2] - 4), l[1] + hash(j, k + 3) * (l[3] - 4), 2, 2, "rgba(0,0,0,0.15)");
      });
      var route = [[30, 40], [90, 70], [150, 60], [190, 70], [220, 110], [270, 130], [250, 170], [60, 160], [30, 40]];
      var prog = clamp(s / 18, 0, 1) * (route.length - 1);
      for (var r = 0; r < Math.floor(prog) + 1 && r < route.length - 1; r++) {
        var a = route[r], c = route[r + 1], f = r < Math.floor(prog) ? 1 : prog - Math.floor(prog);
        for (var d = 0; d < f; d += 0.08) if (Math.floor(d / 0.08) % 2 === 0) rect(lerp(a[0], c[0], d) - 1, lerp(a[1], c[1], d) - 1, 3, 3, "#d81b1b");
      }
      cactus(105, 78, 1); sunflower(180, 60, 1, t); rect(210, 112, 14, 4, "#8a4a2a"); rect(214, 106, 6, 6, "#e6a43a");
      cloudCat(275, 112, 0.35, t, "angry", false); for (var k = 0; k < 6; k++) rect(52 + k * 4, 160, 4, 3, RAINBOW[k]);
      [["START", 30, 30], ["WÜSTE", 92, 90], ["BLUMEN", 180, 78], ["FÄHRE", 216, 124], ["BERG", 276, 148]].forEach(function (l) { text(l[0], l[1], l[2], 8, "#fff"); });
      var pi = Math.min(route.length - 2, Math.floor(prog)), pf = prog - pi;
      rect(lerp(route[pi][0], route[pi + 1][0], pf) - 4, lerp(route[pi][1], route[pi + 1][1], pf) - 3, 8, 5, "#e6a43a");
      return;
    }
    // Abfahrt aus der grauen Stadt: husten, knallen, losfahren
    city(t); desat(1, 0, 170);
    var go = clamp((s - 32) / 6, 0, 1), bx = lerp(120, 360, ease(go) * ease(go));
    bus(bx, 186, t, n, { still: s < 28, smoke: s >= 24 });
    if (s >= 24 && s < 28) { for (var p = 0; p < 3; p++) disc(bx - 6 - p * 6, 176 - p * 4 - ((s * 4) % 4), 3 + p, "#777"); text("PUTT", bx - 20, 150 - ((s - 24) * 3), 8, "#ddd"); }
    if (s >= 28 && s < 31) { text("KNALL!", bx - 10, 140, 16, "#ff4040"); for (var q = 0; q < 8; q++) disc(bx - 10 + Math.cos(q) * 14, 176 + Math.sin(q) * 6, 4, "#999"); }
    if (s >= 32) { chromeLogo("REGENBOGEN-", W / 2, 70, t, 16); chromeLogo("ROADTRIP", W / 2, 94, t, 16); }
  }

  /** Rennspiel-Straße mit Synth-Sonne und Kakteen */
  function road(t, n) {
    var hor = 92;
    copper([[40, 10, 70], [150, 40, 110], [255, 120, 60], [255, 200, 90]], 0, hor, 2);
    for (var y = -30; y <= 30; y++) { if (y > 4 && (y % 6 < 2)) continue; var w = Math.round(Math.sqrt(900 - y * y)); rect(160 - w, 70 + y, w * 2, 1, y < 0 ? "#ffe14d" : "#ff7a3a"); }
    for (var m = 0; m < W; m += 4) { var mh = 8 + Math.abs(Math.sin(m * 0.05) * 14) + Math.abs(Math.sin(m * 0.13) * 6); rect(m, hor - mh, 4, mh, "#5a2a5a"); }
    var pos = t * 6, curve = Math.sin(t * 0.35) * 50;
    for (y = hor; y < H; y++) {
      var dz = (y - hor) / (H - hor), z = 1 / (dz + 0.03), hw = 6 + dz * 150, cx = 160 + curve * (1 - dz) * (1 - dz), st = Math.floor(z * 1.2 + pos) % 2;
      rect(0, y, W, 1, st ? "#e8c46a" : "#d8b45a");
      rect(cx - hw * 1.12, y, hw * 2.24, 1, st ? "#ff4040" : "#fff");
      rect(cx - hw, y, hw * 2, 1, st ? "#606068" : "#55555d");
      if (st) rect(cx - hw * 0.03, y, Math.max(1, hw * 0.06), 1, "#fff");
    }
    for (var i = 0; i < 6; i++) {
      var zz = ((i * 2.3 - pos * 0.45) % 14 + 14) % 14 + 0.6, dz2 = 1 / zz - 0.03;
      if (dz2 <= 0) continue;
      var yy = hor + dz2 * (H - hor), hw2 = 6 + dz2 * 150, cx2 = 160 + curve * (1 - dz2) * (1 - dz2), side = i % 2 ? 1 : -1;
      cactus(cx2 + side * hw2 * 1.5, yy, Math.max(0.3, dz2 * 2.2));
    }
    busRear(160, 190, t, n);
  }

  function sceneWueste(info, t, n) {
    var bar = info.bar, s = sb(info);
    if (bar < 8 || bar >= 12) {
      road(t, n);
      if (bar >= 12) { var k = clamp((s - 48) / 4, 0, 1); if (k < 1) sparkleTrail(60, 150, 160, 170, k, RAINBOW.slice(0, 2)); }
      return;
    }
    // Pause in der Wüste: der Kaktus-Igel steckt fest
    copper([[255, 150, 80], [255, 210, 120]], 0, 130, 2);
    disc(250, 50, 18, "#ffe14d");
    rect(0, 130, W, 70, "#e8c46a"); for (var i = 0; i < 30; i++) rect(hash(i, 2) * W, 135 + hash(i, 3) * 60, 3, 1, "#c9a44a");
    bus(-30, 176, t, n, { still: true, heads: [null, null, null] });
    cactus(262, 176, 2.6);
    var pop = clamp((s - 34) / 3, 0, 1), stuck = s < 34, pulling = s >= 36 - 6 && stuck;
    var ix = stuck ? 252 : lerp(252, 214, pop), iy = stuck ? 132 : lerp(132, 176, pop) - Math.sin(pop * Math.PI) * 40;
    if (pulling) line(178, 150, ix - 4, iy - 4, 1, "#c9a060");
    scaled(ix - 12, iy - 18, 2, function () { igel(6, 9, t, stuck); });
    var pullx = pulling ? Math.round(Math.sin(t * 12) * 1.5) : 0;
    scaled(146 + pullx, 148, 2, function () { catSide(LUCKY, 0, 0, t, { pull: pulling }); });
    scaled(94 + pullx, 148, 2, function () { catSide(RAINBOWCAT, 0, 0, t, { n: n, pull: pulling }); });
    scaled(48, 138, 2, function () { catFront(CAPTAIN, 0, 0, t, { mood: stuck ? "wide" : "happy" }); });
    if (s >= 34 && s < 37) text("PLOPP!", 230, 96, 8, "#ff4040");
  }

  function sceneBlumen(info, t, n) {
    var bar = info.bar, s = sb(info), broken = bar >= 6 && bar < 9;
    var tm = broken ? M.sectionStart("blumen") + 6 * 4 * BEAT : t;
    if (bar >= 9) tm = t - 3 * 4 * BEAT;
    copper([[90, 170, 255], [190, 230, 255]], 0, 120, 2);
    disc(270, 30, 14, "#fff3a0");
    for (var h = 0; h < 4; h++) { var hx = ((h * 110 - tm * 6) % 440 + 440) % 440 - 60; disc(hx, 130, 50, "#7fc06a"); }
    [[0.6, 108, 12, 0.7], [1.2, 130, 10, 1], [2.4, 160, 8, 1.4]].forEach(function (L, li) {
      rect(0, L[1] + 8, W, H, ["#5aa84e", "#4c9a40", "#3c8a2c"][li]);
      for (var x = 0; x < W + 40; x += L[2] * 2) { var fx = ((x - tm * 20 * L[0]) % (W + 40) + W + 40) % (W + 40) - 20; sunflower(fx, L[1] + (hash(x, li) - 0.5) * 6, L[3], t); }
    });
    rect(0, 176, W, 24, "#8a7a6a"); for (var i = 0; i < 8; i++) rect(((i * 50 - tm * 60) % (W + 50) + W + 50) % (W + 50) - 25, 186, 20, 2, "#e8e0c0");
    // Bienen in Sinus-Formation
    for (var be = 0; be < 8; be++) {
      var bx = ((t * 40 + be * 18) % (W + 80)) - 40, by = 70 + Math.sin(t * 3 + be * 0.7) * 16;
      rect(bx, by, 4, 3, "#ffd23f"); rect(bx + 1, by, 1, 3, INK); rect(bx + 3, by, 1, 3, INK); rect(bx + 1, by - 2, 2, 2, Math.floor(t * 20) % 2 ? "#fff" : "#cfe8ff");
    }
    bus(120, 188, t, n, { still: broken, smoke: !broken });
    if (broken) {
      for (var p = 0; p < 6; p++) { var a = ((t * 1.2 + p / 6) % 1); disc(182 + Math.sin(p) * 4, 160 - a * 40, 2 + Math.round(a * 5), a > 0.5 ? "#e8e8e8" : "#cfcfcf"); }
      if (s < 28) text("PFFF!", 196, 130, 8, "#fff");
      scaled(214, 160, 1, function () { catFront(LUCKY, 0, 0, t, { wave: t * 3 }); });
      if (s >= 34 - 4 && s < 36) { var cu = clamp((s - 30) / 4, 0, 1); coin(222, 156 - Math.sin(cu * Math.PI) * 40, t); }
      if (s >= 34 && s < 36) text("PLING!", 220, 120, 8, "#ffd23f");
    }
    if (bar >= 9) { var k = clamp((s - 36) / 4, 0, 1); if (k < 1) sparkleTrail(222, 150, 130, 166, k, RAINBOW.slice(2, 4)); }
  }

  function sceneFaehre(info, t, n) {
    var bar = info.bar, s = sb(info), hor = 108;
    copper([[60, 120, 220], [150, 200, 255], [255, 220, 180]], 0, hor, 2);
    copperBars(t, 3, 40, 10);
    disc(70, 44, 12, "#fff6c0");
    var cg = clamp((s - 16) / 36, 0, 1);
    if (cg > 0) cloudCat(290, hor - 10 - cg * 20, 0.25 + cg * 0.45, t, "angry", false);
    // Amiga-Wasser: der Himmel gespiegelt, jede Zeile wellig verschoben
    for (var y = hor; y < H; y++) {
      var src = Math.max(0, hor - (y - hor) * 1.4 - 1), off = Math.round(Math.sin(y * 0.35 + t * 4) * (1 + (y - hor) * 0.08));
      ctx.drawImage(canvas, 0, Math.floor(src), W, 1, off, y, W, 1);
    }
    ctx.fillStyle = "rgba(20,70,160,0.45)"; ctx.fillRect(0, hor, W, H - hor);
    for (var i = 0; i < 20; i++) rect(((hash(i, 1) * W + t * 10) % W), hor + 6 + hash(i, 2) * 90, 6, 1, "#cfe8ff");
    // Fähre mit Bus an Deck
    var rock = Math.round(Math.sin(t * 1.6) * 2), fx = 70;
    ctx.save(); ctx.translate(0, rock);
    rect(fx - 1, 150, 162, 18, INK); rect(fx, 151, 160, 16, "#d8d8e0"); rect(fx, 151, 160, 3, "#c23b3b");
    for (var w = 0; w < 8; w++) rect(fx + 10 + w * 18, 158, 6, 4, "#3a6aa0");
    rect(fx + 120, 128, 30, 24, INK); rect(fx + 121, 129, 28, 22, "#f4f4f8"); rect(fx + 126, 133, 8, 6, "#bfe6ff"); rect(fx + 138, 133, 8, 6, "#bfe6ff");
    rect(fx + 132, 116, 6, 13, "#c23b3b");
    bus(fx + 20, 151, t, n, { still: true, heads: [null, LUCKY, null] });
    scaled(fx + 92, 132, 1, function () { catFront(RAINBOWCAT, 0, 0, t, { n: n, mood: bar >= 8 ? "happy" : undefined }); });
    ctx.restore();
    // der Delfin-Fisch springt über die Fähre
    var j = clamp((s - 26) / 6, 0, 1);
    if (j > 0 && j < 1) {
      var dx = lerp(40, 250, j), dy = hor + 30 - Math.sin(j * Math.PI) * 100, ang = Math.cos(j * Math.PI) * -0.9;
      ctx.save(); ctx.translate(dx, dy); ctx.rotate(ang); ctx.scale(2, 2);
      rect(-11, -4, 22, 8, INK); rect(-10, -3, 20, 6, "#3b9dff"); rect(-10, 0, 20, 3, "#cfe8ff"); rect(-14, -6, 4, 12, "#3b9dff"); rect(-2, -7, 4, 3, "#3b9dff"); rect(6, -2, 2, 2, INK);
      ctx.restore();
    }
    if (s >= 30 && s < 33) text("PLATSCH!", 250, 120, 8, "#fff");
    if (bar >= 8) { var k = clamp((s - 32) / 4, 0, 1); if (k < 1) sparkleTrail(250, 120, fx + 100, 140, k, [RAINBOW[4]]); }
  }

  function sceneSturm(info, t, n) {
    var bar = info.bar, s = sb(info), calm = bar >= 10, sad = bar >= 8;
    var flash = 0;
    M.song.sfx.forEach(function (e) { if (e.type === "donner") { var a = (info.beat - e.t) * BEAT; if (a >= 0 && a < 0.35) flash = Math.max(flash, 1 - a / 0.35); } });
    var shake = !sad && flash > 0.3 ? Math.round((hash(Math.floor(t * 30), 1) - 0.5) * 6) : 0;
    ctx.save(); ctx.translate(shake, 0);
    if (calm) {
      copper([[10, 10, 40], [30, 20, 70]], 0, 140, 2);
      stars(0, 50, 0, 120, 4);
      // Polarlicht in Violett und Grün
      var au = clamp((s - 40) / 6, 0, 1);
      for (var x = 0; x < W; x += 2) for (var k = 0; k < 3; k++) {
        var y = 26 + Math.sin(x * 0.03 + t * 0.8 + k * 1.3) * 14 + k * 10, hgt = 22 + Math.sin(x * 0.05 + t + k) * 8;
        ctx.globalAlpha = 0.35 * au; rect(x, y, 2, hgt, k === 1 ? "#4cd964" : "#a77bff"); ctx.globalAlpha = 1;
      }
    } else copper([[20, 22, 40], [50, 54, 76]], 0, 140, 2);
    for (var m = 0; m < W; m += 2) { var mh = 30 + Math.abs(Math.sin(m * 0.02) * 40) + Math.abs(Math.sin(m * 0.07) * 10); rect(m, 150 - mh, 2, mh, calm ? "#2a2a48" : "#2c2e3a"); }
    rect(0, 150, W, 50, calm ? "#3a3a58" : "#3a3c48");
    for (var i = 0; i < 10; i++) rect(i * 34, 168, 16, 2, "#9a9aa8");
    bus(20, 176, t, n, { still: true, heads: [null, null, null] });
    scaled(150, 150, 1, function () { catFront(RAINBOWCAT, 0, 0, t, { n: n, mood: calm ? "happy" : sad ? undefined : "wide", paw: bar === 10 }); });
    scaled(176, 150, 1, function () { catFront(LUCKY, 0, 0, t, { mood: calm ? "happy" : "wide" }); });
    scaled(110, 150, 1, function () { catFront(CAPTAIN, 0, 0, t, { mood: calm ? "happy" : "wide" }); });
    var cy = sad ? 80 : 60;
    cloudCat(230, cy, 1.4, t, calm ? "happy" : sad ? "sad" : "angry", false, calm ? false : sad ? "blue" : "grey");
    if (bar === 10 && info.inBar < 1.5) { line(170, 152, 196, 110, 3, "#a3a9b4"); text("KLATSCH!", 186, 96, 8, "#ffe14d"); }
    if (bar >= 10) { var k2 = clamp((s - 40) / 4, 0, 1); if (k2 < 1) sparkleTrail(200, 100, 158, 160, k2, [RAINBOW[5]]); }
    if (!calm) for (var r = 0; r < 70; r++) { var rx = (hash(r, 7) * W + t * 60) % W, ry = (hash(r, 8) * H + t * 240) % H; line(rx, ry, rx - 2, ry + 5, 1, "#8fa0c0", false); }
    if (flash > 0) {
      var bx = 60 + hash(Math.floor(info.beat), 2) * 200;
      line(bx, 0, bx + 10, 40, 2, "#fff8c0", false); line(bx + 10, 40, bx - 4, 70, 2, "#fff8c0", false); line(bx - 4, 70, bx + 8, 110, 2, "#fff8c0", false);
      ctx.fillStyle = "rgba(255,255,240," + (flash * 0.45) + ")"; ctx.fillRect(-10, 0, W + 20, H);
    }
    ctx.restore();
  }

  function sceneBruecke(info, t, n) {
    var bar = info.bar, s = sb(info);
    if (bar < 8) {
      copper([[90, 160, 255], [200, 230, 255]], 0, 172, 2);
      var arc = clamp(s / 12, 0, 1), R = 120, cx = 160, cy = 170;
      for (var i = 0; i < 6; i++) { ctx.strokeStyle = RAINBOW[i]; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R - i * 6, Math.PI, Math.PI + Math.PI * arc); ctx.stroke(); }
      for (var h = 0; h < 4; h++) disc(h * 100 + 20, 170, 40, "#6ab05a");
      rect(0, 168, W, 32, "#5aa84e");
      cloudCat(286, 64, 0.7, t, "happy", bar >= 2, bar < 2 ? "blue" : false);
      disc(40, 30, 14, "#fff3a0");
      // der Bus fährt über die Brücke
      var u = clamp((s - 16) / 16, 0, 1);
      if (u > 0) {
        var a = Math.PI + Math.PI * (0.16 + 0.68 * u), rr = R + 3;
        ctx.save(); ctx.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); ctx.rotate(a + Math.PI / 2);
        bus(-32, 0, t, n); ctx.restore();
      }
      return;
    }
    // die Stadt bekommt ihre Farben zurück – Parade mit Vektor-Bobs
    city(t);
    desat(1 - clamp((s - 32) / 8, 0, 1), 0, 170);
    var bobs = [];
    for (var k = 0; k < 18; k++) {
      var p = k / 18 * Math.PI * 2, x3 = Math.sin(p * 2 + t) * 50, y3 = Math.cos(p * 3 + t * 0.7) * 22, z3 = Math.cos(p * 2 + t) * 50;
      var ca = Math.cos(t * 0.8), sa = Math.sin(t * 0.8), xr = x3 * ca - z3 * sa, zr = x3 * sa + z3 * ca, sc = 120 / (160 + zr);
      bobs.push([160 + xr * sc, 60 + y3 * sc, zr, RAINBOW[k % 6], sc]);
    }
    bobs.sort(function (a2, b2) { return b2[2] - a2[2]; }).forEach(function (bb) { var r = Math.max(2, Math.round(5 * bb[4])); disc(bb[0], bb[1], r + 1, INK); disc(bb[0], bb[1], r, bb[3]); rect(bb[0] - r / 2, bb[1] - r / 2, 2, 2, "#fff"); });
    cloudCat(272, 44, 0.6, t, "happy", true, false);
    for (var c = 0; c < 30; c++) rect((hash(c, 4) * W + Math.sin(t + c) * 6) % W, (hash(c, 5) * 140 + t * 30) % 140 + 30, 2, 2, RAINBOW[c % 6]);
    var hop = function (ph) { return Math.round(Math.abs(Math.sin(t * 6 + ph)) * 4); };
    scaled(90, 146 - hop(0), 1, function () { catFront(CAPTAIN, 0, 0, t, { mood: "happy" }); });
    scaled(140, 146 - hop(1), 1, function () { catFront(RAINBOWCAT, 0, 0, t, { n: n, mood: "happy" }); });
    scaled(190, 146 - hop(2), 1, function () { catFront(LUCKY, 0, 0, t, { mood: "happy", wave: t * 4 }); });
    igel(240, 166 - hop(3), t, false);
  }

  function sceneAbspann(info, t, n, ende) {
    copper([[6, 6, 24], [20, 10, 50]], 0, H, 2);
    stars(t, 80, 1, H, 6);
    copperBars(t, 6, 100, 30);
    chromeLogo("ENDE", W / 2, 60, t, 24);
    rainbowText("REGENBOGEN-ROADTRIP", W / 2, 92, 8, t, 2);
    for (var i = 0; i < 3; i++) { var cat = [CAPTAIN, RAINBOWCAT, LUCKY][i], x = ((t * 30 + i * 40) % (W + 80)) - 40; scaled(x, 150, 1, function () { catSide(cat, 0, 0, t, { walking: true, n: 6 }); }); }
    cloudCat(((t * 30 + 140) % (W + 80)) - 40 + 20, 120, 0.4, t, "happy", true, false);
    scroller(t, CREDITS, 180);
  }

  // ---------- ein Bild ----------

  var current = { scene: "prolog" };
  function renderAt(t) {
    t = Math.max(0, t);
    var info = M.at(t), b = info.beat, sec = info.section, n = M.colorsAt(b);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
    rect(0, 0, W, H, "#000");
    if (sec === "prolog") sceneProlog(info, t, n);
    else if (sec === "aufbruch") sceneAufbruch(info, t, n);
    else if (sec === "wueste") sceneWueste(info, t, n);
    else if (sec === "blumen") sceneBlumen(info, t, n);
    else if (sec === "faehre") sceneFaehre(info, t, n);
    else if (sec === "sturm") sceneSturm(info, t, n);
    else if (sec === "bruecke") sceneBruecke(info, t, n);
    else sceneAbspann(info, t, n, sec === "ende");
    // Dialog aus den Song-Daten
    var said = "";
    M.song.vocals.forEach(function (e) { if (b >= e.t && b < e.t + e.d + 2.5) { dialog(e, b, t, n); said = e.word; } });
    if (sec !== "prolog" && sec !== "abspann" && sec !== "ende") hud(n);
    var st = sec === "ende" ? 99 : t - M.sectionStart(sec);
    if (CAPTIONS[sec] && st < 3) caption(CAPTIONS[sec], Math.min(st / 0.4, (3 - st) / 0.4));
    current = { scene: sec, colors: n, said: said };
    return sec;
  }

  // ---------- Ablauf ----------

  var LABELS = { prolog: "PROLOG", aufbruch: "AUFBRUCH", wueste: "WÜSTENSTRASSE", blumen: "SONNENBLUMEN", faehre: "FÄHRE", sturm: "STURM", bruecke: "REGENBOGENBRÜCKE", abspann: "ABSPANN", ende: "ENDE" };
  var running = false, withSound = false, clock = 0, last = null, offset = 0, frames = 0;
  var partEl = document.getElementById("part"), startEl = document.getElementById("start");
  function songTime() { var t = withSound ? M.time() : null; return t === null ? clock - offset : t; }
  function finish() {
    running = false;
    if (M.playing) M.stop();
    if (startEl) startEl.hidden = false;
    var p = document.getElementById("play"); if (p) p.textContent = "▶ NOCHMAL!";
    requestAnimationFrame(idle);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) { last = now; return; }
    clock += last === null ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    var t = songTime();
    if (t > M.DURATION + 1.5) { finish(); return; }
    var scene = renderAt(t);
    frames++;
    if (partEl && partEl.textContent !== "TEIL: " + LABELS[scene]) partEl.textContent = "TEIL: " + LABELS[scene];
  }
  function begin(sound) {
    withSound = sound;
    if (M.playing) M.stop();
    if (sound) M.start();
    offset = clock; running = true;
    if (startEl) startEl.hidden = true;
    var s = document.getElementById("btn-sound"); if (s) s.setAttribute("aria-pressed", String(sound));
  }
  if (startEl) {
    ["pointerdown", "touchend"].forEach(function (type) { document.getElementById("play").addEventListener(type, function () { if (window.Musik) Musik.unlock(); }); });
    document.getElementById("play").addEventListener("click", function () { begin(true); });
    document.getElementById("play-silent").addEventListener("click", function () { begin(false); });
    document.getElementById("btn-sound").addEventListener("click", function () {
      if (!running) return;
      var t = songTime();
      if (M.playing) { M.stop(); withSound = false; offset = clock - t; }
      else { if (window.Musik) Musik.unlock(); M.start(Math.min(t, M.DURATION)); withSound = true; }
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
    document.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !running) { e.preventDefault(); begin(true); } });
  }
  function idle(now) { if (running) return; renderAt(3 + ((now || 0) / 1000) % 4); requestAnimationFrame(idle); }
  if (document.fonts && document.fonts.load) document.fonts.load("8px " + FONT).catch(function () {});
  requestAnimationFrame(idle);
  requestAnimationFrame(frame);

  window.roadtrip = {
    renderAt: renderAt,
    get scene() { return current.scene; },
    get state() { return current; },
    get frames() { return frames; },
    get running() { return running; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return M.DURATION; }
  };
})();
