/**
 * Katzen-Habanera – ein gezeichneter Comic: zwei Katzen singen auf dem Dach
 * die Habanera aus „Carmen“ als Pop-Rock-Rap.
 *
 * Handgezeichneter Look statt Pixel: jede Form besteht aus wenigen Stützpunkten,
 * die ein paar Mal pro Sekunde neu „verwackelt“ und als weiche Kurve mit Tusche
 * nachgezogen werden (wie im Zeichentrick, wo jedes Bild neu gezeichnet ist).
 * Die Flächen sind Aquarell: halbtransparent, leicht neben der Linie, mit
 * dunklerem Rand; darüber liegt eine Papierstruktur.
 *
 * Jedes Bild ist eine reine Funktion der Songzeit (renderAt), Münder, Gesten und
 * Sprechblasen lesen dieselben Song-Daten wie die Musik.
 */
(function () {
  "use strict";

  var M = window.HabaneraMusik;
  var canvas = document.getElementById("demo");
  if (!canvas || !M) return;
  var ctx = canvas.getContext("2d");
  var W = 1280, H = 800, BEAT = M.BEAT, RIDGE = 612;
  var INK = "#2b2420", HAND = '"Patrick Hand", "Comic Sans MS", "Chalkboard SE", cursive', LOUD = '"Bangers", "Impact", "Arial Black", sans-serif';
  var CATS = [
    { x: 440, dir: 1, fur: "#f1dfbd", belly: "#fbf3e2", ear: "#eba3b3", eye: "#5fa8c9" },   // die Diva
    { x: 840, dir: -1, fur: "#8d99a9", belly: "#c5ccd6", ear: "#c98f9a", eye: "#d8b23c" }   // der Kater
  ];
  var CAPTIONS = {
    intro: "Mitternacht. Auf dem Dach.", strophe: "Die Diva singt Bizet …", rap: "… doch der Kater hat Beats dabei.", aufbau: "Achtung …",
    refrain: "REFRAIN!", rap2: "Miau-Battle!", refrain2: "Und jetzt alle!", outro: "Die Nachbarn sind begeistert.", ende: ""
  };
  var SYLL = ["Miau", "miau", "mi-", "a-", "au", "miau", "miau", "mi-", "au!"];
  var vox = [0, 1].map(function (c) { return M.song.vocals.filter(function (v) { return v.cat === c; }); });
  var crashes = M.song.drums.filter(function (d) { return d.type === "c"; });
  var OUT = M.SECTIONS[M.SECTIONS.length - 1].start * M.BAR;   // Schlag, an dem der Schluss beginnt

  // ---------- Zeichenwerkzeug ----------

  function hash(n) { var h = Math.sin(n * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
  function shade(hex, d) {
    var n = parseInt(hex.slice(1), 16), r = clamp((n >> 16) + d, 0, 255), g = clamp(((n >> 8) & 255) + d, 0, 255), b = clamp((n & 255) + d, 0, 255);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  /** verwackelt Stützpunkte */
  function jit(pts, seed, amp) {
    return pts.map(function (p, i) { return [p[0] + (hash(seed + i * 2.3) - 0.5) * 2 * amp, p[1] + (hash(seed + i * 2.3 + 7.7) - 0.5) * 2 * amp]; });
  }
  /** weiche Kurve durch die Punkte (Catmull-Rom) */
  function trace(c, pts, closed) {
    var n = pts.length;
    function P(i) { return closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]; }
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 0; i < (closed ? n : n - 1); i++) {
      var p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  function poly(c, pts, closed) {
    c.beginPath();
    pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
    if (closed) c.closePath();
  }
  function ellipse(cx, cy, rx, ry, n, rot) {
    var pts = [], cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
    for (var i = 0; i < (n || 10); i++) { var a = i / (n || 10) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
    return pts;
  }
  function line(x0, y0, x1, y1) {
    var n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 70)), pts = [];
    for (var i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
    return pts;
  }

  /** Ein Stift für eine Zeichenfläche; seed wechselt mit dem „Zeichentrick-Bild“. */
  function Pen(c, seed) {
    var k = 0;
    return {
      c: c,
      /** Tuschelinie: zweimal leicht versetzt gezogen */
      ink: function (pts, closed, w, straight, color) {
        k++;
        c.strokeStyle = color || INK; c.lineCap = "round"; c.lineJoin = "round";
        for (var pass = 0; pass < 2; pass++) {
          c.lineWidth = (w || 3.4) * (pass ? 0.45 : 1);
          c.globalAlpha = pass ? 0.55 : 0.95;
          (straight ? poly : trace)(c, jit(pts, seed + k * 13.7 + pass * 91, pass ? 2.4 : 1.3), closed);
          c.stroke();
        }
        c.globalAlpha = 1;
      },
      /** Aquarellfläche: läuft etwas über die Linie, Rand dunkler */
      wash: function (pts, color, straight, alpha) {
        k++;
        var p = jit(pts, Math.floor(seed / 2) + k * 5.1, 2.5);
        c.save();
        c.translate(2.5, 2);
        (straight ? poly : trace)(c, p, true);
        c.globalAlpha = alpha || 0.97; c.fillStyle = color; c.fill();
        // Pigmentwolke: eine etwas dunklere Stelle innerhalb der Fläche
        c.save(); c.clip(); c.globalAlpha = 0.1; c.fillStyle = shade(color, -40);
        var q = p[k % p.length]; c.beginPath(); c.arc(q[0], q[1], 46, 0, 7); c.fill(); c.restore();
        (straight ? poly : trace)(c, p, true);
        c.globalAlpha = 0.3; c.strokeStyle = shade(color, -45); c.lineWidth = 5; c.stroke();
        c.restore();
        c.globalAlpha = 1;
      },
      shape: function (pts, color, w, straight) { this.wash(pts, color, straight); this.ink(pts, true, w, straight); },
      /** Schlauch mit Umriss – für Arme und Schwänze */
      tube: function (pts, color, w) {
        k++;
        var p = jit(pts, seed + k * 3.3, 1.5);
        c.lineCap = "round"; c.lineJoin = "round";
        trace(c, p, false); c.strokeStyle = INK; c.lineWidth = w + 6; c.stroke();
        trace(c, p, false); c.strokeStyle = color; c.lineWidth = w; c.stroke();
      },
      text: function (str, x, y, size, font, color, rot, align) {
        k++;
        c.save();
        c.translate(x + (hash(seed + k) - 0.5) * 2, y + (hash(seed + k + 3) - 0.5) * 2);
        c.rotate((rot || 0) + (hash(seed + k + 5) - 0.5) * 0.012);
        c.font = size + "px " + (font || HAND); c.textAlign = align || "center"; c.textBaseline = "middle"; c.fillStyle = color || INK;
        c.fillText(str, 0, 0);
        c.restore();
      }
    };
  }

  // ---------- Papier und Hintergrund (einmal gemalt) ----------

  var paper = null, backdrop = null, BX = 180, BY = 120;
  function makePaper() {
    var p = document.createElement("canvas"), c = p.getContext("2d"), i;
    p.width = p.height = 256;
    c.fillStyle = "#fff"; c.fillRect(0, 0, 256, 256);
    for (i = 0; i < 2600; i++) {
      var g = 215 + Math.floor(hash(i) * 40);
      c.fillStyle = "rgba(" + g + "," + (g - 4) + "," + (g - 14) + ",0.5)";
      c.fillRect(hash(i + 0.3) * 256, hash(i + 0.6) * 256, 1 + hash(i + 0.9) * 2.5, 1 + hash(i + 1.2) * 1.5);
    }
    c.strokeStyle = "rgba(150,135,110,0.16)";
    for (i = 0; i < 46; i++) {
      var x = hash(i * 3.1) * 256, y = hash(i * 5.3) * 256, a = hash(i * 7.7) * Math.PI;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26); c.stroke();
    }
    return p;
  }
  function makeBackdrop() {
    var b = document.createElement("canvas"), c = b.getContext("2d"), pen = Pen(c, 4), i, x;
    b.width = W + 2 * BX; b.height = H + 2 * BY;
    c.translate(BX, BY);
    // Nachthimmel: mehrere Lasuren
    var g = c.createLinearGradient(0, -BY, 0, H);
    g.addColorStop(0, "#1e2a5c"); g.addColorStop(0.55, "#4a4a8c"); g.addColorStop(0.85, "#b0709a"); g.addColorStop(1, "#e2a48c");
    c.fillStyle = g; c.fillRect(-BX, -BY, b.width, b.height);
    for (i = 0; i < 70; i++) {
      c.globalAlpha = 0.05 + hash(i * 1.9) * 0.05;
      c.fillStyle = hash(i * 4.1) > 0.5 ? "#101a48" : "#7d6fc0";
      trace(c, jit(ellipse(-BX + hash(i) * b.width, -BY + hash(i + 0.5) * 620, 90 + hash(i * 2.2) * 200, 30 + hash(i * 3.3) * 60, 9, hash(i) - 0.5), i, 14), true);
      c.fill();
    }
    c.globalAlpha = 1;
    // Sterne
    for (i = 0; i < 60; i++) {
      var sx = -BX + hash(i * 9.1) * b.width, sy = -BY + hash(i * 6.7) * 520, r = 3 + hash(i * 2.9) * 6;
      if (Math.hypot(sx - 640, sy - 250) < 235) continue;
      c.strokeStyle = "#fff6d0"; c.globalAlpha = 0.85; c.lineWidth = 2.2; c.lineCap = "round";
      c.beginPath(); c.moveTo(sx - r, sy); c.lineTo(sx + r, sy + 1); c.moveTo(sx, sy - r); c.lineTo(sx + 1, sy + r); c.stroke();
    }
    c.globalAlpha = 1;
    // Mond mit Hof
    for (i = 3; i >= 1; i--) { c.globalAlpha = 0.1; c.fillStyle = "#fff3c0"; trace(c, jit(ellipse(640, 250, 180 + i * 34, 180 + i * 34, 12), i, 8), true); c.fill(); }
    c.globalAlpha = 1;
    pen.shape(ellipse(640, 250, 182, 182, 14), "#fbeeb4", 4);
    [[560, 190, 30], [700, 330, 38], [690, 170, 18], [585, 320, 15]].forEach(function (k) { pen.wash(ellipse(k[0], k[1], k[2], k[2] * 0.85, 8), "#e9d590", false, 0.6); });
    // Dächer der Stadt
    var sky = [[-BX, 560]];
    for (x = -BX, i = 0; x < W + BX; i++) {
      var w = 60 + hash(i * 3.7) * 90, h = 430 + hash(i * 8.3) * 130;
      if (hash(i * 5.9) > 0.55) sky.push([x, h + 40], [x + w / 2, h - 10], [x + w, h + 40]); else sky.push([x, h], [x + w, h]);
      x += w;
    }
    sky.push([W + BX, 560], [W + BX, H + BY], [-BX, H + BY]);
    pen.wash(sky, "#2a2a55", true, 0.93); pen.ink(sky, true, 3, true);
    for (i = 0; i < 46; i++) {
      var wx = -BX + hash(i * 12.7) * b.width, wy = 505 + hash(i * 4.9) * 80;
      pen.wash([[wx, wy], [wx + 15, wy], [wx + 15, wy + 20], [wx, wy + 20]], hash(i * 3.3) > 0.4 ? "#f6cf6a" : "#3b3f78", true, 0.9);
    }
    // das Dach vorn mit Ziegeln, Schornstein und Antenne
    var roof = [[-BX, RIDGE + 14], [W + BX, RIDGE + 4], [W + BX, H + BY], [-BX, H + BY]];
    pen.wash(roof, "#a8503f", true, 0.95);
    for (var row = 0; row < 8; row++) for (x = -BX + (row % 2) * 30; x < W + BX; x += 60) {
      var ty = RIDGE + 30 + row * 40;
      pen.ink([[x, ty], [x + 8, ty + 24], [x + 30, ty + 33], [x + 52, ty + 24], [x + 60, ty]], false, 2.2);
      if (hash(x * 0.37 + row) > 0.7) pen.wash([[x, ty], [x + 8, ty + 24], [x + 30, ty + 33], [x + 52, ty + 24], [x + 60, ty]], "#8c3d32", false, 0.5);
    }
    pen.shape([[-BX, RIDGE - 6], [W + BX, RIDGE - 14], [W + BX, RIDGE + 14], [-BX, RIDGE + 22]], "#7d3a30", 4, true);
    pen.shape([[150, RIDGE + 6], [150, 440], [250, 436], [252, RIDGE + 4]], "#b9705a", 4, true);
    pen.shape([[136, 442], [136, 412], [264, 408], [266, 438]], "#8c4a3c", 4, true);
    [[150, 480, 250, 478], [150, 520, 251, 518], [150, 560, 251, 558], [200, 440, 200, 480], [176, 480, 176, 520], [226, 480, 226, 520], [200, 520, 200, 560]].forEach(function (l) { pen.ink(line(l[0], l[1], l[2], l[3]), false, 2); });
    pen.ink(line(1120, RIDGE, 1124, 400), false, 4);
    [[1070, 430, 1178, 424], [1084, 462, 1164, 458], [1098, 492, 1150, 490]].forEach(function (l) { pen.ink(line(l[0], l[1], l[2], l[3]), false, 3.4); });
    return b;
  }

  // ---------- Song lesen ----------

  /** was eine Katze zum Schlag b gerade singt */
  function voiceAt(c, b) {
    var list = vox[c], cur = null, last = null, count = 0;
    for (var i = 0; i < list.length && list[i].t <= b; i++) { last = list[i]; count = i; if (b < list[i].t + list[i].d) cur = list[i]; }
    var open = 0;
    if (cur) {
      var k = (b - cur.t) / cur.d;
      open = cur.type === "rap" ? 0.55 + 0.45 * Math.sin(k * Math.PI) : Math.min(1, (b - cur.t) / 0.12) * (0.75 + 0.25 * Math.sin(k * Math.PI)) * (k > 0.9 ? (1 - k) * 10 : 1);
      if (cur.d > 2) open *= 0.9 + 0.1 * Math.sin(b * 16);
    }
    return { cur: cur, last: last, index: count, open: open, since: last ? b - last.t : 99 };
  }
  function lineAt(b) {
    var L = M.song.lines;
    for (var i = L.length - 1; i >= 0; i--) if (b >= L[i].t - 0.15 && b < L[i].t + L[i].d + 0.3) return L[i];
    return null;
  }

  /** Haltung beider Katzen zur Songzeit */
  function poseAt(c, b, info) {
    var v = voiceAt(c, b), sec = info.section, rock = sec === "refrain" || sec === "refrain2", cur = v.cur;
    var beat = Math.abs(Math.sin(Math.PI * b)), p = { open: v.open, voice: v, eyes: "open", look: 0.6, lean: 0, bob: 0, jump: 0, arm: 0, hand: 0, tail: Math.sin(b * Math.PI / 2 + c * 2) * 0.5, squash: 0, fur: 0, dx: 0 };
    var long = cur && cur.type === "sing" && cur.d > 0.9;
    if (sec === "intro") { p.bob = beat * 3; p.eyes = c === 0 && b > 6.3 ? "closed" : "open"; p.look = c ? 1 : 0.2; }
    else if (sec === "strophe") {
      if (c === 0) { p.arm = info.bar < 4 ? (long ? 1 : 0.35) : 0; p.eyes = info.bar < 4 ? "closed" : "open"; p.lean = info.bar < 4 ? -0.08 + (long ? -0.07 : 0) : 0; p.bob = beat * 4; p.look = info.bar < 4 ? 0 : 1; }
      else { p.eyes = info.bar < 4 ? "half" : "open"; p.bob = beat * (info.bar < 4 ? 2 : 6); p.hand = info.bar < 4 ? 0 : 0.5 + 0.5 * Math.sin(b * Math.PI); p.lean = info.bar < 4 ? 0.05 : -0.04; }
    } else if (sec === "rap" || sec === "rap2") {
      var active = cur && cur.type === "rap" || v.since < 0.6 && v.last.type === "rap";
      if (active) { p.hand = v.index % 2 ? 1 : 0.15; p.bob = beat * 12; p.lean = Math.sin(b * Math.PI) * 0.09; p.dx = Math.sin(b * Math.PI) * 10; p.eyes = "half"; p.arm = c === 0 ? 0.5 + 0.5 * Math.sin(b * Math.PI * 2) : 0; }
      else { p.bob = beat * (info.bar > 1 || sec === "rap2" ? 9 : 2); p.eyes = sec === "rap" && info.bar < 2 ? "wide" : cur ? "closed" : "open"; p.look = 1; p.arm = cur ? 0.8 : 0; p.fur = sec === "rap" && info.bar < 1 ? 1 - info.inBar / 2 : 0; }
    } else if (sec === "aufbau") {
      if (c === 0) { p.arm = ease((b - M.SECTIONS[3].start * 2) / 3); p.lean = -0.16 * p.arm; p.eyes = "closed"; p.squash = -0.04 * p.arm; }
      else { p.bob = beat * 10; p.hand = Math.floor(b) % 2; p.look = 1; }
    } else if (rock) {
      p.jump = beat * (sec === "refrain2" ? 26 : 16); p.bob = beat * 6; p.eyes = long ? "closed" : "open"; p.look = 0.3;
      p.arm = c === 0 ? (long ? 1 : 0.5) : 0.6 + 0.4 * Math.sin(b * Math.PI); p.hand = c === 1 ? 0.5 + 0.5 * Math.cos(b * Math.PI) : 0;
      p.lean = (long ? -0.1 : 0) + Math.sin(b * Math.PI / 2) * 0.05; p.tail = Math.sin(b * Math.PI) * 0.9;
    } else {  // Schluss
      var o = b - OUT;
      if (o < 3.5) { p.arm = 1; p.lean = -0.18; p.eyes = "closed"; p.squash = -0.05; p.hand = 1; }
      else if (o < 4.4) { p.eyes = "wide"; p.look = c ? -1 : 1; }
      else if (c === 0) { var j = clamp((o - 4.4) / 0.9, 0, 1); p.jump = Math.sin(j * Math.PI) * 120; p.fur = o < 6.6 ? 1 : 0; p.eyes = "wide"; p.arm = j < 1 ? 1 : 0.2; p.look = -1; }
      else { p.eyes = o < 5.8 ? "wide" : "open"; p.look = o < 5.8 ? 1 : 0; p.hand = o > 5.8 ? 1 : 0; p.lean = o > 5.8 ? 0.12 : 0; }
    }
    return p;
  }

  // ---------- die Katzen ----------

  function drawCat(pen, c, p) {
    var cat = CATS[c], g = pen.c, fur = cat.fur, i;
    g.save();
    g.translate(cat.x + p.dx, RIDGE - p.jump);
    g.scale(cat.dir * (1 - p.squash), 1 + p.squash);
    // Schwanz
    var ty = -130 + p.tail * 50;
    pen.tube([[-62, -24], [-128, -30], [-158, -78 + p.tail * 12], [-150 - p.tail * 22, ty], [-128 - p.tail * 38, ty - 40]], fur, 22);
    if (c === 1) [[-150, -62], [-153, -98]].forEach(function (s) { pen.ink(line(s[0] - 12, s[1], s[0] + 12, s[1] + 4), false, 4, false, "#5d6878"); });
    // hinterer Arm
    var ax = lerp(-62, -128, p.arm), ay = lerp(-62, -262, p.arm);
    pen.tube([[-40, -150], [lerp(-66, -100, p.arm), lerp(-100, -170, p.arm)], [ax, ay]], shade(fur, -14), 24);
    // Körper
    var body = [[-70, 0], [-86, -70], [-60, -150], [-24, -186], [26, -186], [60, -150], [86, -70], [70, 0], [0, 9]];
    if (p.fur) body = body.map(function (q, n) { return n % 2 ? [q[0] * 1.12, q[1]] : q; });
    pen.shape(body, fur, 4);
    pen.wash(ellipse(10, -78, 42, 64, 9), cat.belly, false, 0.8);
    if (c === 1) [[-70, -92], [-64, -122], [70, -92], [64, -122]].forEach(function (s) { pen.ink(line(s[0] - 12, s[1] + 3, s[0] + 12, s[1] - 3), false, 4, false, "#5d6878"); });
    pen.shape(ellipse(-44, -3, 30, 15, 8), fur, 3.4);
    pen.shape(ellipse(50, -3, 30, 15, 8), fur, 3.4);
    // Kette
    if (c === 0) for (i = 0; i < 7; i++) { var a = i / 6 * Math.PI; pen.shape(ellipse(-36 + i * 12.5, -168 + Math.sin(a) * 20, 6, 6, 6), "#fdfaf0", 2); }
    else { pen.tube([[-40, -172], [-20, -138], [8, -128], [34, -140], [48, -172]], "#e8b93a", 5); pen.shape(ellipse(8, -110, 14, 14, 7), "#f2c84a", 3); pen.text("M", 8, -109, 18, LOUD, INK); }
    // vorderer Arm
    var hx, hy;
    if (c === 0) { hx = 60; hy = -200 + p.bob; pen.tube([[36, -150], [72, -150], [hx, hy]], fur, 23); pen.tube([[hx, hy + 4], [hx + 8, hy - 26]], "#4a4650", 9); pen.shape(ellipse(hx + 10, hy - 38, 14, 14, 7), "#8f8a96", 3); }
    else { hx = lerp(84, 138, p.hand); hy = lerp(-88, -196, p.hand); pen.tube([[38, -150], [lerp(76, 96, p.hand), lerp(-126, -150, p.hand)], [hx, hy]], fur, 23); pen.shape(ellipse(hx + 4, hy - 4, 17, 15, 7), fur, 3); }

    // Kopf
    g.translate(0, -258 - p.bob);
    g.rotate(p.lean);
    var er = p.eyes === "wide" ? 1.25 : 1;
    [-1, 1].forEach(function (s) {
      if (c === 1 && s === -1) return;   // unter der Kappe
      pen.shape([[s * 84, -34], [s * 70 + (p.fur ? s * 8 : 0), -122 - (p.fur ? 8 : 0)], [s * 22, -72]], fur, 4, true);
      pen.wash([[s * 72, -48], [s * 66, -100], [s * 38, -70]], cat.ear, true, 0.8);
    });
    var head = [[-100, 6], [-92, -40], [-52, -74], [0, -82], [52, -74], [92, -40], [100, 6], [80, 48], [36, 70], [0, 74], [-36, 70], [-80, 48]];
    if (p.fur) head = head.map(function (q, n) { return n % 2 ? q : [q[0] * 1.1, q[1] * 1.08]; });
    pen.shape(head, fur, 4);
    pen.wash(ellipse(0, 36, 46, 30, 8), cat.belly, false, 0.75);
    // Augen
    [-1, 1].forEach(function (s) {
      var ex = s * 40, ey = -10;
      if (p.eyes === "closed") pen.ink([[ex - 17, ey + 4], [ex - 8, ey - 6], [ex + 8, ey - 6], [ex + 17, ey + 4]], false, 4);
      else {
        pen.shape(ellipse(ex, ey, 17 * er, 21 * er, 8), "#fffdf2", 3);
        pen.wash(ellipse(ex + p.look * 5, ey + 2, 11, 15, 7), cat.eye, false, 0.95);
        g.fillStyle = INK; trace(g, ellipse(ex + p.look * 6, ey + 2, p.eyes === "wide" ? 3.5 : 5.5, p.eyes === "wide" ? 7 : 12, 7), true); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + p.look * 6 - 3, ey - 5, 3, 0, 7); g.fill();
        if (p.eyes === "half") { pen.wash([[ex - 22, ey - 26], [ex + 22, ey - 26], [ex + 22, ey - 3], [ex - 22, ey - 3]], fur, true, 1); pen.ink(line(ex - 20, ey - 3, ex + 20, ey - 3), false, 4); }
      }
      if (c === 0) [[-1, -14, -9, -24], [5, -17, 2, -29], [11, -14, 14, -25]].forEach(function (l) { pen.ink([[ex + s * (8 + l[0]), ey + l[1] - (p.eyes === "closed" ? -8 : 6) * er], [ex + s * (12 + l[2]), ey + l[3] - (p.eyes === "closed" ? -8 : 6) * er]], false, 2.4, true); });
      if (c === 1 && p.eyes !== "closed") pen.ink(line(ex - s * 20, ey - 30 - (p.eyes === "wide" ? 10 : 0), ex + s * 16, ey - 24 - (p.eyes === "wide" ? 12 : 0)), false, 5);
    });
    // Nase, Mund, Schnurrhaare
    pen.shape([[-9, 16], [9, 16], [0, 27]], "#e58a9c", 2.6, true);
    if (p.open > 0.06) {
      var mh = 5 + p.open * 26, mw = 13 + p.open * 9, my = 34 + mh * 0.75;
      pen.shape(ellipse(0, my, mw, mh, 9), "#7a2233", 3.4);
      pen.wash(ellipse(0, my + mh * 0.45, mw * 0.62, mh * 0.42, 7), "#ee8d9f", false, 0.95);
      if (c === 1) pen.shape([[-9, my - mh + 2], [-3, my - mh + 2], [-6, my - mh + 12]], "#fffdf2", 2, true);
    } else {
      pen.ink([[0, 27], [-3, 38], [-12, 43], [-21, 37]], false, 3);
      pen.ink([[0, 27], [3, 38], [12, 43], [21, 37]], false, 3);
    }
    [-1, 1].forEach(function (s) { [6, 22, 40].forEach(function (wy, n) { pen.ink([[s * 54, 24 + n * 5], [s * 96, wy + 4], [s * 138, wy + (n - 1) * 8]], false, 1.9); }); });
    // Schleife bzw. Kappe
    if (c === 0) {
      pen.shape([[40, -80], [8, -104], [10, -62]], "#e45f8c", 3.4, true);
      pen.shape([[40, -80], [76, -108], [78, -60]], "#e45f8c", 3.4, true);
      pen.shape(ellipse(41, -81, 10, 11, 6), "#f08fb0", 3);
    } else {
      pen.shape([[-96, -34], [-86, -84], [-40, -112], [20, -112], [70, -86], [84, -44], [0, -56]], "#d5463b", 4);
      pen.shape([[-84, -44], [-150, -40], [-160, -26], [-90, -24]], "#b3352d", 3.6);
      pen.wash(ellipse(-4, -82, 15, 13, 7), "#fbe9a8", false, 0.95);
    }
    g.restore();
  }

  // ---------- Comic-Elemente ----------

  /** Sprechblase mit Dorn zum Mund; jagged = Zackenblase für laute Wörter */
  function bubble(pen, x, y, w, h, tx, ty, jagged, fill) {
    var pts, i, n;
    if (jagged) { pts = []; n = 22; for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2, r = i % 2 ? 1 : 0.76; pts.push([x + Math.cos(a) * w * r, y + Math.sin(a) * h * r]); } }
    else pts = ellipse(x, y, w, h, 14);
    var a0 = Math.atan2(ty - y, tx - x), tail = [[x + Math.cos(a0 - 0.16) * w * 0.8, y + Math.sin(a0 - 0.16) * h * 0.8], [tx, ty], [x + Math.cos(a0 + 0.16) * w * 0.8, y + Math.sin(a0 + 0.16) * h * 0.8]];
    pen.shape(tail, fill || "#fffdf4", 3.4, true);
    pen.shape(pts, fill || "#fffdf4", 3.6, jagged);
    pen.wash(tail.map(function (q, k) { return k === 1 ? [lerp(x, tx, 0.75), lerp(y, ty, 0.75)] : q; }), fill || "#fffdf4", true, 1);
  }
  function box(pen, x, y, w, h, color) {
    pen.shape([[x, y], [x + w, y - 3], [x + w + 3, y + h], [x - 2, y + h + 3]], color || "#fbe7a0", 3.6, true);
  }
  function mouthPos(c, p) { var cat = CATS[c]; return [cat.x + p.dx + cat.dir * 4, RIDGE - p.jump - 258 - p.bob + 60]; }

  function cameraTarget(t) {
    var info = M.at(t), b = info.beat, s = info.section, c = { x: 640, y: 400, z: 1, r: 0 };
    if (s === "intro") { c.z = lerp(1.0, 1.08, info.progress); c.y = 410; }
    else if (s === "strophe") { var d = info.bar < 4 ? 0 : 1; c.x = lerp(640, CATS[d].x, 0.55); c.y = 390; c.z = 1.22; }
    else if (s === "rap") { c.x = 700; c.y = 390; c.z = 1.16; c.r = Math.sin(b * Math.PI / 2) * 0.012; }
    else if (s === "aufbau") { c.x = lerp(640, CATS[0].x, 0.5); c.y = 380; c.z = lerp(1.2, 1.4, info.progress); }
    else if (s === "rap2") { var who = info.bar === 3 ? -1 : info.bar % 2; if (who < 0) { c.z = 1.1; } else { c.x = CATS[who].x + (who ? -40 : 40); c.y = 370; c.z = 1.5; c.r = who ? 0.05 : -0.05; } }
    else if (s === "refrain" || s === "refrain2") { var pulse = Math.pow(1 - (b % 1), 3); c.z = 1.04 + pulse * (s === "refrain2" ? 0.05 : 0.03); c.r = Math.sin(b * Math.PI / 4) * 0.02; c.y = 395; }
    else { c.z = 1.03; }
    return c;
  }
  function cameraAt(t) {
    if (M.at(t).section === "rap2") return cameraTarget(t);       // harte Schnitte wie Comic-Panels
    var c = { x: 0, y: 0, z: 0, r: 0 }, n = 7;
    for (var i = 0; i < n; i++) { var k = cameraTarget(Math.max(0, t - i * 0.07)); c.x += k.x / n; c.y += k.y / n; c.z += k.z / n; c.r += k.r / n; }
    return c;
  }

  // ---------- ein Bild ----------

  var current = { scene: "intro" };
  /** Zeichnet das Bild zur Songzeit t; boil (optional) legt das „Zeichentrick-Bild“ fest. */
  function renderAt(t, boil) {
    if (!paper) { paper = ctx.createPattern(makePaper(), "repeat"); backdrop = makeBackdrop(); }
    t = Math.max(0, t);
    var info = M.at(t), b = info.beat, sec = info.section, seed = Math.floor((boil === undefined ? t : boil) * 7) * 17.3 + 1;
    var pen = Pen(ctx, seed), rock = sec === "refrain" || sec === "refrain2", cam = cameraAt(t), o = b - OUT, i;
    var poses = [poseAt(0, b, info), poseAt(1, b, info)];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#1e2a5c"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(cam.r); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    ctx.drawImage(backdrop, -BX, -BY);

    // Mondgesicht
    var moonOpen = rock ? 0.5 + 0.5 * Math.abs(Math.sin(b * Math.PI)) : 0;
    if (rock) { pen.shape([[568, 208], [636, 204], [632, 244], [576, 248]], "#30283a", 4); pen.shape([[648, 204], [716, 208], [708, 248], [652, 244]], "#30283a", 4); pen.ink(line(632, 214, 650, 214), false, 5); }
    else [-1, 1].forEach(function (s) { if (sec === "strophe" || sec === "intro") pen.ink([[640 + s * 44 - 16, 226], [640 + s * 44, 234], [640 + s * 44 + 16, 226]], false, 3.4); else pen.shape(ellipse(640 + s * 44, 226, 10, sec === "outro" && o > 3.5 ? 16 : 12, 7), INK, 2); });
    if (moonOpen) pen.shape(ellipse(640, 300, 24, 6 + moonOpen * 16, 8), "#b9654a", 3.4); else pen.ink([[610, 296], [640, sec === "rap" && info.bar < 2 ? 292 : 308], [670, 296]], false, 3.4);

    // Scheinwerfer und Tempolinien im Refrain
    if (rock) {
      ctx.globalCompositeOperation = "lighter";
      [["#ff5fa8", 80, CATS[0].x], ["#4fd8ff", 1200, CATS[1].x]].forEach(function (l, n) {
        var sw = Math.sin(b * Math.PI / 2 + n * 2) * 60;
        ctx.globalAlpha = 0.13 + 0.09 * Math.pow(1 - (b % 1), 2);
        ctx.fillStyle = l[0]; poly(ctx, jit([[l[1], -BY], [l[2] - 170 + sw, RIDGE + 10], [l[2] + 170 + sw, RIDGE + 10]], seed + n, 6), true); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      for (i = 0; i < 26; i++) {
        var a = hash(seed + i * 3.1) * Math.PI * 2, r0 = 520 + hash(seed + i) * 120, r1 = r0 + 90 + hash(seed + i * 7) * 160;
        if (Math.sin(a) > 0.35) continue;
        ctx.globalAlpha = 0.5;
        pen.ink([[640 + Math.cos(a) * r0, 380 + Math.sin(a) * r0 * 0.62], [640 + Math.cos(a) * r1, 380 + Math.sin(a) * r1 * 0.62]], false, 3, true, "#fff6d8");
      }
      ctx.globalAlpha = 1;
    }

    // Schluss: ein Fenster geht an, ein Stiefel fliegt
    var bootLanded = sec === "ende" || o >= 4.4;
    if (sec === "ende" || (sec === "outro" && o > 3.1)) pen.shape([[1172, 500], [1232, 498], [1234, 572], [1174, 574]], "#ffe58a", 4, true);
    drawCat(pen, 1, poses[1]);
    drawCat(pen, 0, poses[0]);
    if (sec === "ende" || (sec === "outro" && o > 3.6)) {
      var k = clamp((o - 3.6) / 0.8, 0, 1), bx = lerp(1200, 318, k), by = lerp(520, RIDGE - 26, k) - Math.sin(k * Math.PI) * 420, hop = bootLanded && sec !== "ende" ? Math.max(0, Math.sin(clamp((o - 4.4) / 0.5, 0, 1) * Math.PI)) * 40 : 0;
      ctx.save();
      ctx.translate(bx, by - hop); ctx.rotate(bootLanded ? 0.12 : -k * 9);
      pen.shape([[-20, -52], [14, -54], [16, -8], [52, -2], [56, 22], [-22, 24]], "#6b4a2e", 4);
      pen.ink(line(-22, 14, 56, 13), false, 3);
      pen.ink(line(-20, -40, 14, -42), false, 2.4);
      ctx.restore();
      if (o >= 4.4 && o < 5.2) pen.text("PLONK!", 300, RIDGE - 120 - (o - 4.4) * 40, 62, LOUD, "#ffd84a", -0.12);
    }

    // Noten, die aus den Mündern steigen
    [0, 1].forEach(function (c) {
      vox[c].forEach(function (v, n) {
        var age = (b - v.t) * BEAT;
        if (v.type !== "sing" || age < 0 || age > 2.2) return;
        var cat = CATS[c], k = age / 2.2, nx = cat.x + cat.dir * (40 + k * 90) + Math.sin(n * 2.4 + age * 3) * 24, ny = RIDGE - 215 - k * 250 - (n % 3) * 18;
        ctx.globalAlpha = 1 - k * k;
        pen.text(n % 3 ? "♪" : "♫", nx, ny, 40 + (n % 2) * 12, "Georgia, serif", c ? "#bfe6ff" : "#ffe9a8", Math.sin(n) * 0.4);
      });
    });
    ctx.globalAlpha = 1;

    // Sprechblasen
    var bubbleText = "";
    var ln = lineAt(b), duo = rock;
    if (ln) {
      var notes = M.song.vocals.filter(function (v) { return v.cat === ln.cat && v.type === "sing" && v.t >= ln.t && v.t < ln.t + 4; });
      var cx = duo ? 640 : CATS[ln.cat].x + (ln.cat ? -110 : 110), cy = duo ? 100 : 172, mp = mouthPos(ln.cat, poses[ln.cat]);
      if (duo) { var m2 = mouthPos(1, poses[1]); bubble(pen, cx, cy, 310, 62, m2[0] - 20, m2[1] - 150, false); }
      bubble(pen, cx, cy, duo ? 310 : 285, duo ? 62 : 58, mp[0] + (ln.cat ? -20 : 20), mp[1] - 150, false);
      ctx.font = "34px " + HAND;
      var words = notes.map(function (v, n) { return SYLL[n % SYLL.length]; }), total = ctx.measureText(words.join("  ")).width, wx = cx - total / 2;
      words.forEach(function (w, n) {
        var sung = b >= notes[n].t, now = sung && b < notes[n].t + notes[n].d + 0.1, ww = ctx.measureText(w + "  ").width;
        pen.text(w, wx, cy - 4 - (now ? 6 : 0), now ? 37 : 34, HAND, sung ? (now ? "#c2264a" : INK) : "#b9b2a6", 0, "left");
        wx += ww;
      });
      bubbleText = words.join(" ");
    }
    [0, 1].forEach(function (c) {
      var v = poses[c].voice, e = v.last;
      if (!e || !e.word || v.since > e.d + 0.45) return;
      var cat = CATS[c], rap = e.type === "rap", pop = Math.min(1, v.since / 0.08), mp = mouthPos(c, poses[c]);
      var side = rap ? (v.index % 3) - 1 : 0, bxx = cat.x - cat.dir * (rap ? 60 + side * 70 : 40), byy = (rap ? 130 + (v.index % 2) * 50 : 110) - poses[c].jump * 0.5;
      var size = (rap ? 54 : 56) * (0.7 + 0.3 * pop), big = e.d > 2;
      ctx.font = size + "px " + LOUD;
      var tw = ctx.measureText(e.word).width;
      bubble(pen, bxx, byy, (tw / 2 + 50) * pop, (rap ? 58 : 64) * pop, mp[0] - cat.dir * 30, mp[1] - 140, rap || big || /!/.test(e.word), rap ? (c ? "#d9f1ff" : "#ffe3ee") : "#fffdf4");
      pen.text(e.word, bxx, byy + 2, size, LOUD, c ? "#1f4f86" : "#b3264f", rap ? (side * 0.06) : 0);
      bubbleText = e.word;
    });
    if (sec === "outro" && o > 3.2 && o < 5.8) {
      bubble(pen, 1090, 420, 120, 56, 1200, 500, true, "#fff3a8");
      pen.text("RUHE!!!", 1090, 422, 50, LOUD, "#c22b2b", -0.05);
    }

    // Schlagwörter zum Becken
    crashes.forEach(function (cr, n) {
      var age = (b - cr.t) * BEAT;
      if (age < 0 || age > 0.7 || cr.t >= OUT + 6) return;
      ctx.globalAlpha = 1 - age / 0.7;
      pen.text(["KRACH!", "WUMM!", "ZACK!"][n % 3], n % 2 ? 1040 : 240, 330 - age * 40, 76 + age * 30, LOUD, "#ffd84a", n % 2 ? 0.14 : -0.14);
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    // Erzählkästen und Liedzeile (ohne Kamera)
    var cap = CAPTIONS[sec], st = sec === "ende" ? 9 : (info.progress * M.SECTIONS[info.index].bars * M.BAR) * BEAT;
    if (cap && st < 4.2) {
      ctx.font = "32px " + HAND;
      var cw = ctx.measureText(cap).width + 44, slide = ease(st / 0.3) * ease((4.2 - st) / 0.3);
      ctx.save(); ctx.translate(-(1 - slide) * (cw + 60), 0);
      box(pen, 34, 30, cw, 54); pen.text(cap, 34 + cw / 2, 58, 32, HAND, INK);
      ctx.restore();
    }
    if (ln) {
      ctx.font = "30px " + HAND;
      var lw = ctx.measureText("»" + ln.text + "«").width + 50;
      box(pen, W / 2 - lw / 2, H - 82, lw, 50, "#fffdf4");
      pen.text("»" + ln.text + "«", W / 2, H - 56, 30, HAND, INK);
    }
    if (sec === "ende") {
      box(pen, W / 2 - 330, H - 150, 660, 112);
      pen.text("ENDE", W / 2, H - 112, 58, LOUD, "#c2264a");
      pen.text("Musik: Georges Bizet, Habanera aus „Carmen“ (1875)", W / 2, H - 64, 28, HAND, INK);
    }
    // Papier, Bildrand
    ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#fbf6e8"; ctx.lineWidth = 26; ctx.strokeRect(0, 0, W, H);
    pen.ink([[14, 15], [W - 15, 13], [W - 13, H - 15], [15, H - 13]], true, 4.5, true);

    current = { scene: sec, bubble: bubbleText, open: [poses[0].open, poses[1].open], line: ln ? ln.text : "" };
    return sec;
  }

  // ---------- Ablauf ----------

  var LABELS = { intro: "Vorspiel", strophe: "Strophe", rap: "Katzen-Rap", aufbau: "Aufbau", refrain: "Refrain", rap2: "Miau-Battle", refrain2: "Großer Refrain", outro: "Schluss", ende: "Ende" };
  var running = false, withSound = false, clock = 0, last = null, offset = 0, frames = 0;
  var partEl = document.getElementById("part"), startEl = document.getElementById("start");

  function songTime() { var t = withSound ? M.time() : null; return t === null ? clock - offset : t; }
  function finish() {
    running = false;
    if (M.playing) M.stop();
    if (startEl) startEl.hidden = false;
    var p = document.getElementById("play"); if (p) p.textContent = "▶ Nochmal!";
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
    if (partEl && partEl.textContent !== LABELS[scene]) partEl.textContent = LABELS[scene];
  }
  function begin(sound) {
    withSound = sound;
    if (M.playing) M.stop();
    if (sound) M.start();
    offset = clock;
    running = true;
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
    document.getElementById("btn-full").addEventListener("click", function () {
      var el = document.getElementById("screen"), req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (req) { try { var r = req.call(el); if (r && r.catch) r.catch(function () {}); } catch (e) { /* kein Vollbild */ } }
    });
    document.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !running) { e.preventDefault(); begin(true); } });
  }
  // Standbild vor dem Start: die Linien „leben“ schon
  function idle(now) { if (running) return; renderAt(7.3, (now || 0) / 1000); requestAnimationFrame(idle); }
  if (document.fonts && document.fonts.load) { document.fonts.load("30px " + HAND).catch(function () {}); document.fonts.load("30px " + LOUD).catch(function () {}); }
  requestAnimationFrame(idle);
  requestAnimationFrame(frame);

  window.habanera = {
    renderAt: renderAt,
    get scene() { return current.scene; },
    get state() { return current; },
    get frames() { return frames; },
    get running() { return running; },
    /** springt ohne Ton zu einer Songzeit (für Tests) */
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return M.DURATION; }
  };
})();
