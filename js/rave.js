/**
 * Miau-Rave – eine Katzen-Demo im Mischstil: handgezeichnete Figuren mit
 * wackelnder Tusche-Linie („Line Boil“) treffen Amiga-Demoszene. Alles wird
 * in 640×400 gezeichnet, mit Copper-Bars, Chrom-Logo, Sinus-Scroller,
 * Sternenfeld, Plasma, Schachbrett-Boden und Pixel-Feuerwerk – und am Ende
 * jedes Bildes auf eine kleine Farbpalette mit Bayer-Dithering reduziert,
 * wie auf dem Amiga.
 *
 * Geschichte: Leo, Kiki, Bruno und Mini fahren im Bus zur Rave-Party, bauen
 * ihr Zelt auf, feiern, Mini geht verloren, alle finden sich am Treffpunkt
 * (dem Mond-Ballon) wieder und haben danach die beste Nacht.
 *
 * Jedes Bild ist eine reine Funktion der Songzeit (renderAt); Grafik und
 * Musik lesen dieselben Song-Daten.
 */
(function () {
  "use strict";

  var M = window.RaveMusik;
  var canvas = document.getElementById("demo");
  if (!canvas || !M) return;
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var W = 640, H = 400, BEAT = M.BEAT;
  var INK = "#1d1626", HAND = '"Patrick Hand", "Comic Sans MS", "Chalkboard SE", cursive', PIXEL = '"Press Start 2P", monospace';
  var CATS = [
    { name: "Leo", fur: "#e8954a", belly: "#f8dcb4", ear: "#f0a7a0", eye: "#4f9a3c", stripes: "#b8642a", size: 1 },
    { name: "Kiki", fur: "#f4eee6", belly: "#ffffff", ear: "#f5a8c4", eye: "#3fae8f", size: 0.95 },
    { name: "Bruno", fur: "#8e7a68", belly: "#c9b8a2", ear: "#c99a8e", eye: "#d8a640", size: 1.18 },
    { name: "Mini", fur: "#3b3444", belly: "#5d5468", ear: "#e7a3b5", eye: "#f2d24a", size: 0.68 },
    { name: "DJ", fur: "#c4c9d6", belly: "#e8ebf2", ear: "#d9a0b0", eye: "#7a5cd6", size: 1 }
  ];
  var CAPTIONS = { abfahrt: "Kapitel 1: Ab zum Rave!", zelten: "Kapitel 2: Zelten", party: "Kapitel 3: Party!", verloren: "Kapitel 4: Verloren …",
    wiederfinden: "Kapitel 5: Der Treffpunkt", finale: "Kapitel 6: Die beste Nacht", morgen: "Kapitel 7: Guten Morgen" };
  var SCROLL = "MIAU-RAVE!   LEO, KIKI, BRUNO UND MINI FAHREN ZUR GRÖSSTEN KATZENPARTY DER WELT ...   " +
    "HANDGEZEICHNET TRIFFT AMIGA ...   GRÜSSE AN ALLE DINOS DER TASKLISTE, DIE MIAUS, DIE GLÜCKSKATZE UND DIE REGENBOGENKATZE ...   ";
  var SCROLL_END = "DANKE FÜRS ZUSCHAUEN!   UND DENKT DRAN: IMMER EINEN TREFFPUNKT AUSMACHEN ...   MIAU!   ";
  var crashes = M.song.drums.filter(function (d) { return d.type === "r"; });
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  // ---------- Zeichenwerkzeug ----------

  function hash(n) { var h = Math.sin(n * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
  function shade(hex, d) {
    var n = parseInt(hex.slice(1), 16), r = clamp((n >> 16) + d, 0, 255), g = clamp(((n >> 8) & 255) + d, 0, 255), b = clamp((n & 255) + d, 0, 255);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function jit(pts, seed, amp) {
    return pts.map(function (p, i) { return [p[0] + (hash(seed + i * 2.3) - 0.5) * 2 * amp, p[1] + (hash(seed + i * 2.3 + 7.7) - 0.5) * 2 * amp]; });
  }
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
    var n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 40)), pts = [];
    for (var i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
    return pts;
  }

  /** Stift; k skaliert Linienbreite und Wackeln (für verkleinerte Figuren) */
  function Pen(c, seed) {
    var n = 0;
    return {
      c: c, k: 1,
      ink: function (pts, closed, w, straight, color) {
        n++;
        c.strokeStyle = color || INK; c.lineCap = "round"; c.lineJoin = "round";
        c.lineWidth = (w || 2) * this.k;
        (straight ? poly : trace)(c, jit(pts, seed + n * 13.7, 0.7 * this.k), closed);
        c.stroke();
      },
      wash: function (pts, color, straight, alpha) {
        n++;
        c.globalAlpha = alpha || 1; c.fillStyle = color;
        (straight ? poly : trace)(c, jit(pts, Math.floor(seed / 2) + n * 5.1, 1.2 * this.k), true);
        c.fill(); c.globalAlpha = 1;
      },
      shape: function (pts, color, w, straight) { this.wash(pts, color, straight); this.ink(pts, true, w, straight); },
      tube: function (pts, color, w) {
        n++;
        var p = jit(pts, seed + n * 3.3, 0.6 * this.k);
        c.lineCap = "round"; c.lineJoin = "round";
        trace(c, p, false); c.strokeStyle = INK; c.lineWidth = w + 4 * this.k; c.stroke();
        trace(c, p, false); c.strokeStyle = color; c.lineWidth = w; c.stroke();
      },
      text: function (str, x, y, size, font, color, rot, align) {
        n++;
        c.save(); c.translate(x, y); c.rotate(rot || 0);
        c.font = size + "px " + (font || HAND); c.textAlign = align || "center"; c.textBaseline = "middle"; c.fillStyle = color || INK;
        c.fillText(str, 0, 0); c.restore();
      }
    };
  }

  // ---------- Amiga-Effekte ----------

  /** Himmel als Copper-Verlauf in 4-Pixel-Streifen */
  function copperSky(stops, y0, y1) {
    for (var y = y0; y < y1; y += 4) {
      var k = (y - y0) / (y1 - y0), i = Math.min(stops.length - 2, Math.floor(k * (stops.length - 1))), f = k * (stops.length - 1) - i;
      var a = stops[i], b = stops[i + 1];
      ctx.fillStyle = "rgb(" + Math.round(lerp(a[0], b[0], f)) + "," + Math.round(lerp(a[1], b[1], f)) + "," + Math.round(lerp(a[2], b[2], f)) + ")";
      ctx.fillRect(0, y, W, 4);
    }
  }
  function copperBars(t, n, y, amp, alpha) {
    var cols = [[255, 60, 120], [255, 170, 40], [80, 220, 255], [170, 90, 255], [90, 255, 140]];
    ctx.globalAlpha = alpha || 1;
    for (var i = n - 1; i >= 0; i--) {
      var yy = y + Math.sin(t * 2.2 + i * 0.7) * amp, c = cols[i % cols.length];
      for (var k = -7; k <= 7; k++) {
        var l = 1 - Math.abs(k) / 8;
        ctx.fillStyle = "rgb(" + Math.round(c[0] * l + 255 * l * l * 0.4) + "," + Math.round(c[1] * l + 255 * l * l * 0.4) + "," + Math.round(c[2] * l + 255 * l * l * 0.4) + ")";
        ctx.fillRect(0, Math.round(yy + k * 2), W, 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  function stars(t, n, speed, yMax, seed) {
    for (var i = 0; i < n; i++) {
      var layer = 1 + (i % 3), x = ((hash(i * 3.1 + seed) * W - t * speed * layer * 20) % W + W) % W, y = hash(i * 7.7 + seed) * yMax;
      var tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.fillStyle = layer === 3 ? "#ffffff" : layer === 2 ? "#b8c4ff" : "#6b74b8";
      ctx.globalAlpha = 0.5 + 0.5 * tw;
      ctx.fillRect(Math.round(x), Math.round(y), layer > 2 ? 2 : 1, layer > 2 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }
  var logoCanvas = null;
  function chromeLogo(text, cx, cy, t, size) {
    if (!logoCanvas || logoCanvas.text !== text + size) {
      logoCanvas = document.createElement("canvas");
      var c = logoCanvas.getContext("2d");
      c.font = size + "px " + PIXEL;
      var w = Math.ceil(c.measureText(text).width) + 12;
      logoCanvas.width = w; logoCanvas.height = size + 16; logoCanvas.text = text + size;
      c.font = size + "px " + PIXEL; c.textBaseline = "top";
      var g = c.createLinearGradient(0, 4, 0, size + 4);
      g.addColorStop(0, "#2a3c8c"); g.addColorStop(0.35, "#bfe8ff"); g.addColorStop(0.5, "#ffffff"); g.addColorStop(0.52, "#6b3e1e"); g.addColorStop(0.75, "#f2a33a"); g.addColorStop(1, "#fff1b0");
      c.fillStyle = "#000"; c.fillText(text, 9, 9);
      c.fillStyle = g; c.fillText(text, 6, 6);
    }
    var L = logoCanvas, x0 = Math.round(cx - L.width / 2);
    for (var x = 0; x < L.width; x += 4) ctx.drawImage(L, x, 0, 4, L.height, x0 + x, Math.round(cy - L.height / 2 + Math.sin(t * 3 + x * 0.03) * 6), 4, L.height);
  }
  function scroller(t, text, y) {
    ctx.font = "16px " + PIXEL; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    var cw = 16, total = text.length * cw, off = (t * 110) % total;
    for (var i = 0; i < text.length; i++) {
      var x = i * cw - off;
      if (x < -cw) x += total;
      if (x > W) continue;
      ctx.fillStyle = "hsl(" + ((i * 18 + t * 120) % 360) + ",95%,62%)";
      ctx.fillText(text[i], x, y + Math.sin(t * 4 + x * 0.025) * 8);
    }
  }
  var plasmaImg = null, plasmaCv = null;
  function plasma(t, x, y, w, h) {
    var pw = 48, ph = 24;
    if (!plasmaCv) { plasmaCv = document.createElement("canvas"); plasmaCv.width = pw; plasmaCv.height = ph; plasmaImg = plasmaCv.getContext("2d").createImageData(pw, ph); }
    var d = plasmaImg.data;
    for (var j = 0; j < ph; j++) for (var i = 0; i < pw; i++) {
      var v = Math.sin(i * 0.25 + t * 2) + Math.sin(j * 0.35 - t * 1.4) + Math.sin((i + j) * 0.18 + t) + Math.sin(Math.hypot(i - pw / 2, j - ph / 2) * 0.4 - t * 2.5);
      var k = (j * pw + i) * 4;
      d[k] = 128 + 127 * Math.sin(v * 1.5); d[k + 1] = 128 + 127 * Math.sin(v * 1.5 + 2.1); d[k + 2] = 128 + 127 * Math.sin(v * 1.5 + 4.2); d[k + 3] = 255;
    }
    plasmaCv.getContext("2d").putImageData(plasmaImg, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(plasmaCv, x, y, w, h);
  }
  function checkerFloor(t, horizon, colA, colB) {
    for (var r = 0; r < 10; r++) {
      var z0 = r + (t * 2 % 1), z1 = z0 + 1, y0 = horizon + 300 / (12 - z0) - 25, y1 = horizon + 300 / (12 - z1) - 25;
      if (y0 > H) continue;
      for (var c = -10; c < 10; c++) {
        var s0 = (y0 - horizon + 25) / 300 * 1.6, s1 = (y1 - horizon + 25) / 300 * 1.6;
        ctx.fillStyle = (c + r) % 2 ? colA : colB;
        poly(ctx, [[W / 2 + c * 40 * s0 * 4, y0], [W / 2 + (c + 1) * 40 * s0 * 4, y0], [W / 2 + (c + 1) * 40 * s1 * 4, y1], [W / 2 + c * 40 * s1 * 4, y1]], true);
        ctx.fill();
      }
    }
  }
  function lasers(t, n, ox, oy, beatPulse, wild) {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + Math.sin(t * (0.8 + i * 0.13) + i * 1.7) * (wild ? 1.25 : 0.8), col = "hsl(" + ((i * 70 + t * 40) % 360) + ",100%,60%)";
      var x0 = ox + (i - n / 2) * 30, x1 = x0 + Math.cos(a) * 700, y1 = oy + Math.sin(a) * 700;
      ctx.strokeStyle = col; ctx.globalAlpha = 0.18 + beatPulse * 0.15; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x0, oy); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = 0.85; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function confetti(t, n, alpha) {
    for (var i = 0; i < n; i++) {
      var sp = 40 + hash(i * 2.7) * 50, x = (hash(i * 1.3) * W + Math.sin(t * 2 + i) * 14) % W, y = ((t * sp + hash(i * 5.1) * H) % (H + 20)) - 10;
      ctx.fillStyle = "hsl(" + Math.floor(hash(i * 9.1) * 6) * 60 + ",95%,60%)"; ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(x), Math.round(y), 3, Math.sin(t * 6 + i) > 0 ? 3 : 1);
    }
    ctx.globalAlpha = 1;
  }
  function firework(x, y, age, seed) {
    if (age < 0 || age > 1.8) return;
    var col = "hsl(" + Math.floor(hash(seed) * 6) * 60 + ",100%,65%)";
    if (age < 0.35) { ctx.fillStyle = "#fff4c0"; ctx.fillRect(Math.round(x), Math.round(lerp(H, y, age / 0.35)), 2, 4); return; }
    var a = age - 0.35;
    ctx.fillStyle = col; ctx.globalAlpha = clamp(1.3 - a, 0, 1);
    for (var i = 0; i < 36; i++) {
      var ang = i / 36 * Math.PI * 2 + hash(seed + i) * 0.2, r = 70 * (1 - Math.exp(-a * 3)) * (0.7 + hash(seed * 3 + i) * 0.3);
      ctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r + a * a * 25), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  /** Amiga-Look: Farben auf 6 Stufen je Kanal reduzieren, mit 4×4-Bayer-Dithering */
  var ditherTables = null;
  function dither() {
    if (!ditherTables) {
      ditherTables = BAYER.map(function (b) {
        var tab = new Uint8ClampedArray(256), step = 255 / 5, off = ((b + 0.5) / 16 - 0.5) * step;
        for (var v = 0; v < 256; v++) tab[v] = Math.round(clamp(Math.round((v + off) / step), 0, 5) * step);
        return tab;
      });
    }
    var img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (var y = 0; y < H; y++) {
      var row = (y & 3) * 4;
      for (var x = 0; x < W; x++) {
        var tab = ditherTables[row + (x & 3)], i = (y * W + x) * 4;
        d[i] = tab[d[i]]; d[i + 1] = tab[d[i + 1]]; d[i + 2] = tab[d[i + 2]];
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---------- Figuren ----------

  /** Katzenkopf in eigenen Einheiten (Mittelpunkt 0,0; Radius ~55) */
  function drawHead(pen, c, p) {
    var cat = CATS[c], fur = cat.fur, g = pen.c;
    [-1, 1].forEach(function (s) {
      pen.shape([[s * 52, -18], [s * 50, -82], [s * 14, -44]], fur, 2.4, true);
      pen.wash([[s * 46, -28], [s * 45, -66], [s * 24, -42]], cat.ear, true);
    });
    pen.shape([[-60, 4], [-54, -30], [-28, -50], [0, -54], [28, -50], [54, -30], [60, 4], [48, 32], [20, 46], [0, 48], [-20, 46], [-48, 32]], fur, 2.6);
    if (cat.stripes) [[-10, -50, -6, -32], [0, -53, 0, -34], [10, -50, 6, -32]].forEach(function (l) { pen.ink(line(l[0], l[1], l[2], l[3]), false, 3, false, cat.stripes); });
    pen.wash(ellipse(0, 22, 28, 18, 8), cat.belly);
    // Augen
    [-1, 1].forEach(function (s) {
      var ex = s * 24, ey = -6, e = p.eyes || "open";
      if (e === "closed") pen.ink([[ex - 11, ey + 2], [ex - 4, ey + 6], [ex + 4, ey + 6], [ex + 11, ey + 2]], false, 3);
      else if (e === "happy") pen.ink([[ex - 11, ey + 4], [ex - 5, ey - 4], [ex + 5, ey - 4], [ex + 11, ey + 4]], false, 3);
      else {
        var big = e === "wide" ? 1.25 : e === "sad" ? 1.12 : 1;
        pen.shape(ellipse(ex, ey, 11 * big, 13 * big, 8), "#fffdf2", 2);
        pen.wash(ellipse(ex + (p.look || 0) * 3, ey + 1, 7.5 * big, 10 * big, 7), cat.eye);
        g.fillStyle = INK; trace(g, ellipse(ex + (p.look || 0) * 4, ey + 1, 3.5, e === "wide" ? 4 : 7, 6), true); g.fill();
        g.fillStyle = "#fff"; g.fillRect(ex + (p.look || 0) * 4 - 4, ey - 5, 3, 3);
        if (e === "sad") pen.ink(line(ex - s * 14, ey - 20, ex + s * 8, ey - 15), false, 3);
      }
    });
    if (p.tear) { var tk = (p.tear % 1); pen.shape(ellipse(28, 8 + tk * 22, 3.5, 5, 6), "#7fd0ff", 1.4); }
    // Nase, Mund, Schnurrhaare
    pen.shape([[-6, 10], [6, 10], [0, 17]], "#e58a9c", 1.6, true);
    if ((p.mouth || 0) > 0.08) {
      var mh = 3 + p.mouth * 13, mw = 7 + p.mouth * 5;
      pen.shape(ellipse(0, 20 + mh * 0.7, mw, mh, 8), "#7a2233", 2);
      pen.wash(ellipse(0, 20 + mh * 1.1, mw * 0.6, mh * 0.4, 6), "#ee8d9f");
    } else if (p.eyes === "sad") pen.ink([[-9, 28], [0, 23], [9, 28]], false, 2.2);
    else { pen.ink([[0, 17], [-3, 24], [-9, 26], [-14, 22]], false, 2); pen.ink([[0, 17], [3, 24], [9, 26], [14, 22]], false, 2); }
    [-1, 1].forEach(function (s) { [0, 1, 2].forEach(function (n) { pen.ink([[s * 32, 14 + n * 4], [s * 58, 10 + n * 8], [s * 82, 6 + n * 13]], false, 1.2); }); });
    // Zubehör
    if (c === 0) {   // Leo: Entdecker-Hut
      pen.shape([[-70, -36], [-40, -48], [-34, -78], [0, -88], [34, -78], [40, -48], [70, -36], [0, -44]], "#6f8a3c", 2.4);
      pen.wash([[-36, -52], [36, -52], [34, -60], [-34, -60]], "#4a5d26", true);
    } else if (c === 1) {   // Kiki: Neon-Stirnband
      pen.shape([[-56, -26], [-30, -44], [0, -48], [30, -44], [56, -26], [52, -18], [28, -34], [0, -38], [-28, -34], [-52, -18]], "#ff3fb4", 2);
    } else if (c === 3) {   // Mini: große Ohrenschützer
      pen.tube([[-50, -40], [-30, -78], [0, -88], [30, -78], [50, -40]], "#ffd23f", 6);
      [-1, 1].forEach(function (s) { pen.shape(ellipse(s * 52, -34, 18, 18, 8), "#ffd23f", 2.4); pen.wash(ellipse(s * 52, -34, 9, 9, 6), "#fff0a0"); });
    } else if (c === 4) {   // DJ: Kopfhörer und Sonnenbrille
      pen.tube([[-58, -10], [-50, -60], [0, -80], [50, -60], [58, -10]], "#2b2b3a", 6);
      [-1, 1].forEach(function (s) { pen.shape(ellipse(s * 60, -6, 12, 20, 8), "#ff5a5a", 2.4); });
      pen.shape([[-38, -16], [-6, -16], [-10, 2], [-34, 2]], "#1a1a2a", 2, true);
      pen.shape([[38, -16], [6, -16], [10, 2], [34, 2]], "#1a1a2a", 2, true);
      pen.ink(line(-6, -12, 6, -12), false, 2);
    }
  }

  /** ganze Katze, Füße bei (x,y), Größe s (1 ≈ 190 px hoch) */
  function drawCat(pen, c, x, y, s, p) {
    var cat = CATS[c], fur = cat.fur, g = pen.c, sz = s * cat.size;
    g.save();
    g.translate(x, y - (p.jump || 0));
    g.scale(sz * (p.dir || 1), sz);
    pen.k = 1 / sz;
    // Schwanz
    var tw = Math.sin((p.tail || 0)) * 30;
    pen.tube([[-30, -16], [-70, -24], [-88, -60], [-80 - tw * 0.5, -100], [-64 - tw, -118]], fur, 13);
    // Füße
    var wp = p.walk === undefined ? null : p.walk;
    [-1, 1].forEach(function (s2, i) {
      var lift = wp === null ? 0 : Math.max(0, Math.sin(wp + i * Math.PI)) * 14;
      pen.shape(ellipse(s2 * 22, -6 - lift, 17, 9, 8), fur, 2.2);
    });
    // Körper
    pen.shape([[-44, -4], [-52, -44], [-38, -86], [0, -96], [38, -86], [52, -44], [44, -4], [0, 4]], fur, 2.6);
    pen.wash(ellipse(0, -44, 24, 34, 8), cat.belly);
    if (cat.stripes) [[-50, -50], [-46, -66], [50, -50], [46, -66]].forEach(function (q) { pen.ink(line(q[0] - 7 * Math.sign(q[0]), q[1] + 3, q[0] + 4 * Math.sign(q[0]), q[1] - 2), false, 3, false, cat.stripes); });
    if (c === 2) { pen.tube([[-30, -88], [-36, -40]], "#7a4a28", 6); pen.tube([[30, -88], [36, -40]], "#7a4a28", 6); }   // Bruno: Rucksackgurte
    // Arme
    [-1, 1].forEach(function (s2, i) {
      var up = i ? (p.armR || 0) : (p.armL || 0), hx = s2 * lerp(46, 62, up), hy = lerp(-34, -150, up) + (up > 0.5 ? Math.sin((p.wave || 0) + i) * 8 : 0);
      pen.tube([[s2 * 34, -78], [s2 * lerp(52, 58, up), lerp(-60, -110, up)], [hx, hy]], fur, 15);
      pen.shape(ellipse(hx, hy, 10, 9, 7), fur, 2);
      if (p.glow && up > 0.3) {
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = p.glow; g.lineCap = "round";
        g.globalAlpha = 0.35; g.lineWidth = 12; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + s2 * 6, hy - 34); g.stroke();
        g.globalAlpha = 1; g.lineWidth = 5; g.stroke();
        g.globalCompositeOperation = "source-over";
      }
      if (p.lamp && i === 1) {   // Taschenlampe mit Lichtkegel
        g.globalCompositeOperation = "lighter"; g.fillStyle = "#fff3b0"; g.globalAlpha = 0.25;
        poly(g, [[hx, hy], [hx + 260, hy - 80 + p.lamp * 60], [hx + 260, hy + 40 + p.lamp * 60]], true); g.fill();
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
        pen.shape([[hx - 4, hy - 6], [hx + 18, hy - 8], [hx + 18, hy + 6], [hx - 4, hy + 6]], "#555a66", 2, true);
      }
    });
    // Kopf
    g.translate(0, -140 - (p.bob || 0));
    g.rotate(p.lean || 0);
    drawHead(pen, c, p);
    g.restore();
    pen.k = 1;
    return [x, y - (p.jump || 0) - (140 + 60 + (p.bob || 0)) * sz];   // Mund-Position für Sprechblasen
  }

  function heart(pen, x, y, r, col) {
    pen.shape([[x, y + r], [x - r * 1.1, y - r * 0.1], [x - r * 0.9, y - r * 0.8], [x - r * 0.3, y - r * 0.9], [x, y - r * 0.4], [x + r * 0.3, y - r * 0.9], [x + r * 0.9, y - r * 0.8], [x + r * 1.1, y - r * 0.1]], col || "#ff4f7a", 2);
  }
  function balloon(pen, x, y, s, t) {
    var sw = Math.sin(t * 1.3) * 4;
    pen.ink([[x + sw, y + 60 * s], [x + sw * 0.5 + 4, y + 120 * s], [x - 2, y + 200 * s]], false, 1.6);
    pen.shape(ellipse(x + sw, y, 55 * s, 58 * s, 12), "#ffe36b", 2.6);
    [[-20, -18, 9], [18, 22, 12], [24, -24, 6]].forEach(function (k) { pen.wash(ellipse(x + sw + k[0] * s, y + k[1] * s, k[2] * s, k[2] * s * 0.85, 7), "#e8c548"); });
    pen.ink([[x + sw - 22 * s, y + 4 * s], [x + sw - 14 * s, y - 2 * s], [x + sw - 6 * s, y + 4 * s]], false, 2);
    pen.ink([[x + sw + 6 * s, y + 4 * s], [x + sw + 14 * s, y - 2 * s], [x + sw + 22 * s, y + 4 * s]], false, 2);
    pen.ink([[x + sw - 12 * s, y + 18 * s], [x + sw, y + 26 * s], [x + sw + 12 * s, y + 18 * s]], false, 2);
  }
  function tent(pen, x, y, s, h, lump) {
    var up = clamp(h, 0, 1), pts = [[x - 110 * s, y], [x - 70 * s, y - 80 * s * up - 6], [x, y - 112 * s * up - 8], [x + 70 * s, y - 80 * s * up - 6], [x + 110 * s, y]];
    if (lump) pts.splice(2, 0, [x - 30 * s, y - 34 * s]);
    pen.shape(pts, "#ff7a3a", 2.6);
    if (up > 0.5) { pen.shape([[x - 30 * s, y], [x, y - 90 * s * up], [x + 30 * s, y]], "#ffb26a", 2.2, true); pen.ink(line(x, y - 112 * s * up, x, y), false, 1.6); }
    pen.wash([[x - 105 * s, y - 4], [x + 105 * s, y - 4], [x + 105 * s, y], [x - 105 * s, y]], "#c7531f", true);
  }
  function bus(pen, x, y, t, heads, beat) {
    var g = pen.c, bob = Math.abs(Math.sin(beat * Math.PI)) * 3;
    g.save(); g.translate(x, y - bob);
    // Gepäck auf dem Dach
    pen.shape([[-110, -150], [-60, -150], [-60, -124], [-110, -124]], "#c8463c", 2, true);
    pen.shape(ellipse(-20, -136, 30, 13, 9), "#3d8f6a", 2);
    pen.shape([[20, -152], [70, -152], [70, -124], [20, -124]], "#5a67c8", 2, true);
    pen.ink(line(-130, -122, 130, -122), false, 3);
    // Karosserie
    pen.shape([[-150, -40], [-150, -100], [-136, -122], [120, -122], [146, -96], [150, -40], [140, -26], [-140, -26]], "#4fc6c0", 2.8);
    pen.wash([[-150, -60], [150, -60], [150, -48], [-150, -48]], "#ffffff", true, 0.9);
    [[-110, -56, "#ff5a8a"], [-40, -56, "#ffd23f"], [30, -56, "#8a5aff"], [100, -56, "#5aff9a"]].forEach(function (f) { heart(pen, f[0], f[1], 6, f[2]); });
    // Fenster mit Köpfen
    var wins = [[-136, -112, -84, -72], [-72, -112, -20, -72], [-8, -112, 44, -72], [56, -112, 108, -72]];
    wins.forEach(function (w, i) {
      pen.wash([[w[0], w[1]], [w[2], w[1]], [w[2], w[3]], [w[0], w[3]]], "#bde6ff", true);
      if (heads[i] !== undefined) {
        g.save(); g.beginPath(); g.rect(w[0], w[1] - 30, w[2] - w[0], w[3] - w[1] + 30); g.clip();
        g.save(); g.translate((w[0] + w[2]) / 2, w[3] - 14 - Math.abs(Math.sin(beat * Math.PI + i)) * 3); g.scale(0.38 * CATS[heads[i]].size, 0.38 * CATS[heads[i]].size); pen.k = 2.6;
        drawHead(pen, heads[i], { eyes: "happy", mouth: Math.abs(Math.sin(beat * Math.PI + i * 0.7)) * 0.4 });
        pen.k = 1; g.restore(); g.restore();
      }
      pen.ink([[w[0], w[1]], [w[2], w[1]], [w[2], w[3]], [w[0], w[3]]], true, 2.4, true);
    });
    pen.shape([[118, -112], [140, -96], [140, -72], [118, -72]], "#bde6ff", 2.4, true);
    // Räder
    [-90, 90].forEach(function (wx) {
      pen.shape(ellipse(wx, -24, 24, 24, 10), "#2a2a35", 2.6);
      pen.shape(ellipse(wx, -24, 10, 10, 8), "#c9ccd6", 2);
      var a = t * 8; pen.ink(line(wx + Math.cos(a) * 18, -24 + Math.sin(a) * 18, wx - Math.cos(a) * 18, -24 - Math.sin(a) * 18), false, 2, true, "#c9ccd6");
    });
    g.restore();
  }
  function crowd(pen, t, y, n, scale, seed, color, glowOn, beatPulse, jump, gap) {
    var g = pen.c;
    for (var i = 0; i < n; i++) {
      var x = (i + 0.5) / n * (W + 60) - 30 + (hash(i + seed) - 0.5) * 30;
      if (gap && x > gap[0] && x < gap[1]) continue;
      var bob = Math.abs(Math.sin(t * Math.PI * 2 / BEAT / 2 + i * 1.3)) * 6 * scale + jump * Math.abs(Math.sin(i)) * 10;
      var yy = y - bob, s = scale * (0.85 + hash(i * 3 + seed) * 0.3);
      g.fillStyle = color;
      trace(g, jit([[x - 36 * s, yy + 40 * s], [x - 34 * s, yy - 10 * s], [x - 26 * s, yy - 38 * s], [x - 22 * s, yy - 62 * s], [x - 10 * s, yy - 44 * s], [x + 10 * s, yy - 44 * s], [x + 22 * s, yy - 62 * s], [x + 26 * s, yy - 38 * s], [x + 34 * s, yy - 10 * s], [x + 36 * s, yy + 40 * s]], seed + i, 0.8), true);
      g.fill();
      if (glowOn && hash(i * 7 + seed) > 0.55) {
        var gx = x + (hash(i) > 0.5 ? 30 : -30) * s, gy = yy - 40 * s + Math.sin(t * 6 + i) * 6;
        g.globalCompositeOperation = "lighter"; g.strokeStyle = "hsl(" + Math.floor(hash(i * 11) * 6) * 60 + ",100%,60%)"; g.lineCap = "round";
        g.globalAlpha = 0.3 + beatPulse * 0.3; g.lineWidth = 9; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.sin(t * 5 + i) * 12, gy - 26); g.stroke();
        g.globalAlpha = 1; g.lineWidth = 3; g.stroke();
        g.globalCompositeOperation = "source-over";
      }
    }
  }
  function fire(pen, x, y, t) {
    var g = pen.c;
    g.globalCompositeOperation = "lighter";
    var rg = g.createRadialGradient(x, y - 20, 4, x, y - 20, 120);
    rg.addColorStop(0, "rgba(255,170,60,0.55)"); rg.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = rg; g.fillRect(x - 130, y - 140, 260, 200);
    g.globalCompositeOperation = "source-over";
    pen.shape([[x - 34, y - 2], [x + 30, y - 12], [x + 34, y - 4], [x - 30, y + 6]], "#6b3e1e", 2, true);
    pen.shape([[x - 30, y - 12], [x + 34, y - 2], [x + 30, y + 6], [x - 34, y - 4]], "#7d4a26", 2, true);
    var f = Math.floor(t * 8);
    [["#ff5a1f", 1], ["#ffb23a", 0.7], ["#fff1a0", 0.4]].forEach(function (c, k) {
      var hgt = (46 + hash(f + k) * 14) * c[1], w = 26 * c[1];
      pen.shape([[x - w, y - 6], [x - w * 0.6, y - hgt * 0.5], [x - w * 0.2 + (hash(f * 2 + k) - 0.5) * 8, y - hgt], [x + w * 0.3, y - hgt * 0.6], [x + w * 0.5 + (hash(f * 3 + k) - 0.5) * 6, y - hgt * 0.85], [x + w, y - 6]], c[0], 1.8);
    });
  }
  function hills(pen, off, y, amp, col, seed, step) {
    var pts = [[-20, H + 10]];
    for (var x = -20; x <= W + 40; x += step) pts.push([x, y - amp * (0.5 + 0.5 * Math.sin((x + off) * 0.008 + seed)) - amp * 0.4 * Math.sin((x + off) * 0.019 + seed * 2)]);
    pts.push([W + 40, H + 10]);
    pen.shape(pts, col, 2.4);
  }
  function tree(pen, x, y, s) {
    pen.shape([[x - 4 * s, y], [x - 4 * s, y - 30 * s], [x + 4 * s, y - 30 * s], [x + 4 * s, y]], "#7a4a28", 2, true);
    pen.shape(ellipse(x, y - 46 * s, 22 * s, 26 * s, 9), "#3f9a4a", 2.2);
  }
  function cloud(pen, x, y, s) {
    pen.shape([[x - 40 * s, y], [x - 34 * s, y - 16 * s], [x - 14 * s, y - 24 * s], [x + 6 * s, y - 30 * s], [x + 26 * s, y - 20 * s], [x + 42 * s, y - 6 * s], [x + 36 * s, y + 6 * s], [x - 30 * s, y + 8 * s]], "#ffffff", 2);
  }

  // ---------- Comic-Elemente ----------

  function bubble(pen, x, y, text, tx, ty, loud, fill) {
    var g = pen.c;
    g.font = (loud ? 20 : 18) + "px " + HAND;
    var w = Math.max(30, g.measureText(text).width / 2 + 16), h = 18;
    x = clamp(x, w + 6, W - w - 6); y = clamp(y, h + 6, H - h - 6);
    var pts, i, n;
    if (loud) { pts = []; n = 18; for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2, r = i % 2 ? 1.18 : 0.92; pts.push([x + Math.cos(a) * w * r, y + Math.sin(a) * h * r * 1.2]); } }
    else pts = ellipse(x, y, w, h * 1.15, 12);
    var a0 = Math.atan2(ty - y, tx - x), tail = [[x + Math.cos(a0 - 0.25) * w * 0.7, y + Math.sin(a0 - 0.25) * h * 0.7], [tx, ty], [x + Math.cos(a0 + 0.25) * w * 0.7, y + Math.sin(a0 + 0.25) * h * 0.7]];
    pen.shape(tail, fill || "#fffdf4", 2, true);
    pen.shape(pts, fill || "#fffdf4", 2.2, loud);
    pen.wash([tail[0], [lerp(x, tx, 0.6), lerp(y, ty, 0.6)], tail[2]], fill || "#fffdf4", true);
    pen.text(text, x, y + 1, loud ? 20 : 18, HAND, INK);
  }
  function caption(pen, text, k) {
    ctx.font = "10px " + PIXEL;
    var w = ctx.measureText(text).width + 20, x = 10 - (1 - ease(k)) * (w + 20);
    ctx.fillStyle = "#1a1030"; ctx.fillRect(x, 10, w, 24);
    ctx.fillStyle = "#ff3fb4"; ctx.fillRect(x, 10, w, 2); ctx.fillRect(x, 32, w, 2);
    ctx.fillStyle = "#ffe36b"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, x + 10, 23);
  }

  // ---------- Szenen ----------

  function pulseAt(beat) { return Math.pow(1 - (beat % 1), 3); }
  function danceAt(c, b, strong) {
    var ph = b * Math.PI + c * 1.1;
    return { bob: Math.abs(Math.sin(ph)) * 8, armL: strong ? 0.6 + 0.4 * Math.sin(ph) : 0.3 + 0.3 * Math.sin(ph), armR: strong ? 0.6 + 0.4 * Math.cos(ph) : 0.3 + 0.3 * Math.cos(ph),
      wave: b * 4, eyes: "happy", tail: b * 2 + c, lean: Math.sin(ph) * 0.08, glow: ["#5aff9a", "#ff3fb4", "#ffd23f", "#5ad8ff"][c] };
  }
  function voiceOpen(c, b) {
    var v = M.song.vocals;
    for (var i = v.length - 1; i >= 0; i--) { var e = v[i]; if (e.cat === c && b >= e.t && b < e.t + e.d) return 0.5 + 0.5 * Math.sin((b - e.t) / e.d * Math.PI); }
    return 0;
  }

  function sceneAbfahrt(pen, info, t, heads) {
    var b = info.beat, bar = info.bar;
    if (bar < 4) {
      copperSky([[8, 6, 40], [30, 10, 70], [10, 6, 30]], 0, H);
      stars(t, 90, 1.2, H, 1);
      copperBars(t, 5, 90, 50);
      chromeLogo("MIAU RAVE", W / 2, 170, t, 48);
      pen.text("eine Katzen-Demo", W / 2, 236, 22, HAND, "#ffe36b");
      // der Bus fährt schon klein durchs Bild
      ctx.save(); ctx.translate(lerp(-120, W + 120, info.progress * 3 % 1), 312); ctx.scale(0.45, 0.45); bus(pen, 0, 0, t, [0, 1, 2, 3], b); ctx.restore();
      scroller(t, SCROLL, 374);
      return;
    }
    copperSky([[70, 140, 240], [130, 200, 255], [255, 230, 190]], 0, 300);
    pen.shape(ellipse(520, 70, 30, 30, 10), "#fff09a", 2.4);
    var off = t * 120;
    [[100, 60, 1], [330, 90, 0.8], [560, 50, 1.1]].forEach(function (c, i) { cloud(pen, ((c[0] - off * 0.1) % (W + 120) + W + 120) % (W + 120) - 60, c[1], c[2]); });
    hills(pen, off * 0.25, 250, 50, "#7cc46a", 1, 40);
    for (var i = 0; i < 6; i++) tree(pen, ((i * 140 - off * 0.6) % (W + 140) + W + 140) % (W + 140) - 70, 282 + (i % 2) * 6, 0.9);
    hills(pen, off * 0.6, 300, 14, "#5aa84e", 4, 50);
    pen.wash([[0, 300], [W, 300], [W, H], [0, H]], "#6d6a74", true);
    for (i = 0; i < 8; i++) { var lx = ((i * 100 - off) % (W + 100) + W + 100) % (W + 100) - 50; pen.wash([[lx, 338], [lx + 50, 338], [lx + 50, 344], [lx, 344]], "#fff4c0", true); }
    var bx = 320 + Math.sin(t * 0.7) * 30;
    // Abgaswölkchen
    for (i = 0; i < 4; i++) { var a = ((t * 2 + i / 4) % 1); ctx.globalAlpha = 1 - a; pen.wash(ellipse(bx - 160 - a * 70, 352 - a * 20, 8 + a * 10, 6 + a * 8, 7), "#d8d8e0"); ctx.globalAlpha = 1; }
    bus(pen, bx, 372, t, [0, 1, 2, 3], b);
    heads[0] = [bx - 110, 250];
    if (bar >= 8 && bar < 9) pen.text("HUP! HUP!", bx + 190, 250 - (info.inBar % 1) * 6, 26, PIXEL, "#ff3f6a", -0.1);
    scroller(t, SCROLL, 386);
  }

  function sceneZelten(pen, info, t, heads) {
    var bar = info.bar, b = info.beat, k = clamp((bar - 6) / 4, 0, 1);
    copperSky([[lerp(255, 20, k), lerp(150, 20, k), lerp(110, 70, k)], [lerp(190, 40, k), lerp(110, 30, k), lerp(170, 90, k)], [lerp(90, 10, k), lerp(60, 8, k), lerp(140, 40, k)]], 0, 310);
    if (k > 0.3) { ctx.globalAlpha = k; stars(0, 70, 0, 230, 7); ctx.globalAlpha = 1; }
    // Festival in der Ferne mit dem Mond-Ballon
    pen.shape([[450, 280], [470, 220], [560, 214], [600, 280]], "#2a2240", 2);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < 4; i++) { ctx.fillStyle = "hsl(" + ((i * 90 + t * 60) % 360) + ",100%,55%)"; ctx.globalAlpha = 0.25; poly(ctx, [[520, 220], [440 + i * 50 + Math.sin(t + i) * 30, 40], [460 + i * 50 + Math.sin(t + i) * 30, 40]], true); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    balloon(pen, 540, 120, 0.55, t);
    hills(pen, 0, 300, 20, k > 0.5 ? "#2f5a3a" : "#5aa84e", 2, 60);
    pen.wash([[0, 300], [W, 300], [W, H], [0, H]], k > 0.5 ? "#28472f" : "#4e9a46", true);
    if (bar < 8) {
      // Zeltaufbau: zweimal klappt es über Bruno zusammen
      var tb = info.inBar + bar * 4, h, lump = false;
      if (tb < 4) h = ease((tb - 1) / 2);
      else if (tb < 10.5) h = tb < 10 ? (tb < 6 ? lerp(1, 0, ease((tb - 6) / 0.4 + 1)) : ease((tb - 6.5) / 2.5)) : 0;
      else if (tb < 18.5) h = tb < 18 ? ease((tb - 12.5) / 4) : 0;
      else h = ease((tb - 19) / 3);
      if ((tb >= 10 && tb < 12.5) || (tb >= 18 && tb < 19)) { h = 0; lump = true; }
      if (tb >= 24) h = 1;
      var collapsed = lump;
      tent(pen, 300, 340, 1, h, lump);
      var cheer = bar >= 6;
      heads[0] = drawCat(pen, 0, 140, 360, 0.48, { eyes: cheer ? "happy" : "open", armR: cheer ? 1 : 0.4, wave: b * 3, mouth: voiceOpen(0, b), tail: b });
      heads[1] = drawCat(pen, 1, 470, 360, 0.48, { eyes: cheer ? "happy" : "open", armL: cheer ? 1 : 0.2, armR: cheer ? 1 : 0, wave: b * 3, mouth: voiceOpen(1, b), tail: b + 1, jump: cheer ? Math.abs(Math.sin(b * Math.PI)) * 14 : 0 });
      if (!collapsed) heads[2] = drawCat(pen, 2, 300, 372, 0.44, { eyes: cheer ? "happy" : "open", armL: 0.9, armR: 0.9, mouth: voiceOpen(2, b), tail: b });
      else { heads[2] = [290, 300]; pen.text("?!", 270, 290, 22, HAND, "#fff"); }
      heads[3] = drawCat(pen, 3, 560, 366, 0.48, { eyes: cheer ? "happy" : "wide", armL: cheer ? 1 : 0, wave: b * 4, tail: b * 2, jump: cheer ? Math.abs(Math.sin(b * Math.PI * 2)) * 10 : 0 });
    } else {
      tent(pen, 470, 330, 0.8, 1, false);
      fire(pen, 250, 350, t);
      var pointing = bar >= 10 && bar < 12;
      heads[0] = drawCat(pen, 0, 120, 368, 0.42, { eyes: "open", look: 1, armR: pointing ? 1 : 0.2, mouth: voiceOpen(0, b), tail: b * 0.5 });
      heads[1] = drawCat(pen, 1, 380, 372, 0.42, { eyes: pointing ? "open" : "happy", look: 1, mouth: voiceOpen(1, b), tail: b * 0.5 + 1, dir: -1 });
      heads[2] = drawCat(pen, 2, 190, 392, 0.4, { eyes: "happy", armL: 0.4, mouth: voiceOpen(2, b), tail: b * 0.5 + 2 });
      heads[3] = drawCat(pen, 3, 320, 392, 0.42, { eyes: bar >= 12 && bar < 14 ? "happy" : "wide", look: 1, armL: bar >= 12 && bar < 14 ? 1 : 0, wave: b * 4, mouth: voiceOpen(3, b), tail: b, dir: -1 });
      if (pointing) { ctx.globalAlpha = 0.8; pen.ink([[150, 240], [300, 190], [470, 150]], false, 2, false, "#ffe36b"); ctx.globalAlpha = 1; }
    }
  }

  function stage(pen, t, b, pulse, wild) {
    copperSky([[10, 4, 30], [40, 10, 70], [20, 6, 40]], 0, 240);
    stars(t, 50, 0.2, 140, 3);
    copperBars(t, 4, 60, 30, 0.75);
    lasers(t, wild ? 8 : 5, 320, 140, pulse, wild);
    // Bühne
    pen.shape([[90, 250], [90, 110], [550, 110], [550, 250]], "#2a2240", 2.6, true);
    plasma(t, 150, 122, 340, 108);
    pen.ink([[150, 122], [490, 122], [490, 230], [150, 230]], true, 2.4, true);
    pen.shape([[60, 100], [580, 100], [580, 112], [60, 112]], "#8a8fa0", 2, true);
    [70, 570].forEach(function (x) {
      pen.shape([[x - 30, 252], [x - 30, 150], [x + 30, 150], [x + 30, 252]], "#1e1e28", 2.4, true);
      [176, 220].forEach(function (y) { pen.shape(ellipse(x, y, 18 + pulse * 3, 18 + pulse * 3, 9), "#3a3a4a", 2); pen.wash(ellipse(x, y, 6, 6, 6), "#888"); });
    });
    checkerFloor(t * (wild ? 1.5 : 1), 250, "#5a2a8a", "#ff3fb4");
  }
  function sceneParty(pen, info, t, heads, finale) {
    var bar = info.bar, b = info.beat, pulse = pulseAt(b), drop = finale ? bar < 15 : bar >= 12 && bar < 28, build = !finale && bar >= 8 && bar < 12;
    stage(pen, t, b, drop || finale ? pulse : pulse * 0.5, drop);
    // DJ hinter dem Pult
    var djp = danceAt(4, b, drop); djp.eyes = "open"; djp.glow = null; djp.mouth = voiceOpen(4, b);
    heads[4] = drawCat(pen, 4, 320, 262, 0.42, djp);
    pen.shape([[250, 262], [250, 226], [390, 226], [390, 262]], "#3a3450", 2.4, true);
    [280, 360].forEach(function (x, i) { pen.shape(ellipse(x, 234, 16, 6, 8), "#1a1a24", 2); pen.ink(line(x, 234, x + Math.cos(t * 6 + i) * 14, 234 + Math.sin(t * 6 + i) * 4), false, 1.6, true, "#ddd"); });
    if (finale) {
      // Mini drückt den großen roten Knopf, die Bande feiert auf der Bühne
      var press = info.beat - (M.SECTIONS[5].start * 4) < 0.5;
      pen.shape([[400, 262], [400, 236], [440, 236], [440, 262]], "#3a3450", 2, true);
      pen.shape(ellipse(420, 232 + (press ? 3 : 0), 14, 6, 8), "#ff2a2a", 2);
      heads[3] = drawCat(pen, 3, 450, 262, 0.36, Object.assign(danceAt(3, b, true), { armL: press ? 0.4 : danceAt(3, b, true).armL, mouth: voiceOpen(3, b) }));
      heads[0] = drawCat(pen, 0, 150, 262, 0.4, Object.assign(danceAt(0, b, true), { jump: Math.abs(Math.sin(b * Math.PI)) * 10, mouth: voiceOpen(0, b) }));
      heads[1] = drawCat(pen, 1, 210, 262, 0.4, Object.assign(danceAt(1, b, true), { jump: Math.abs(Math.sin(b * Math.PI + 1)) * 10, mouth: voiceOpen(1, b) }));
      heads[2] = drawCat(pen, 2, 520, 262, 0.4, Object.assign(danceAt(2, b, true), { jump: Math.abs(Math.sin(b * Math.PI + 2)) * 8, mouth: voiceOpen(2, b) }));
      crowd(pen, t, 352, 9, 0.9, 5, "#2a1846", true, pulse, 1);
      crowd(pen, t, 400, 7, 1.2, 9, "#160c26", true, pulse, 1);
      // Feuerwerk zu jedem Becken
      crashes.forEach(function (cr, i) { if (cr.t < M.SECTIONS[5].start * 4) return; firework(80 + hash(i * 3.3) * 480, 40 + hash(i * 5.1) * 70, (b - cr.t - 0.5) * BEAT, i); });
      confetti(t, 90, 1);
      if (press || (b - M.SECTIONS[5].start * 4) < 2) pen.text("BOOM!", 470, 150, 34, PIXEL, "#ffe36b", -0.15);
      if (bar >= 12) chromeLogo("MIAU RAVE", W / 2, 40, t, 32);
      return;
    }
    crowd(pen, t, 330, 10, 0.75, 1, "#2a1846", drop || build, pulse, drop ? 1 : 0);
    // die Bande vorne in der Mitte
    var lost = bar >= 28, miniX = lost ? lerp(400, 720, ease((info.progress * 32 - 28) / 4)) : 400;
    var gang = [[170, 0], [250, 1], [330, 2], [miniX, 3]];
    gang.forEach(function (gc) {
      var c = gc[1], p = drop ? danceAt(c, b, true) : danceAt(c, b, build);
      if (drop) p.jump = Math.abs(Math.sin(b * Math.PI + c * 0.3)) * 18 * (b % 2 < 1 ? 1 : 0.3);
      if (build) { p.eyes = "wide"; p.look = 0; p.glow = null; p.armL = p.armR = 0.2; }
      if (c === 3 && lost) { p = { eyes: "wide", look: 1, walk: b * 4, armR: 0.7, tail: b, dir: 1 }; }
      if (c !== 3 && lost) { p.eyes = "closed"; }
      p.mouth = voiceOpen(c, b);
      heads[c] = drawCat(pen, c, gc[0], 372, 0.42, p);
    });
    if (lost) {   // das Glühwürmchen, dem Mini nachläuft
      var fx = miniX + 50 + Math.sin(t * 5) * 10, fy = 250 + Math.sin(t * 3.3) * 14;
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "#d8ff6a"; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(fx, fy, 10, 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillRect(fx - 2, fy - 2, 4, 4); ctx.globalCompositeOperation = "source-over";
    }
    crowd(pen, t, 404, 8, 1.1, 2, "#160c26", drop, pulse, drop ? 1 : 0, [110, 470]);
    if (drop) confetti(t, 60, 0.9);
    if (drop && bar === 12 && info.inBar < 0.5) { ctx.fillStyle = "rgba(255,255,255," + (0.35 * (1 - info.inBar * 2)) + ")"; ctx.fillRect(0, 0, W, H); }
  }

  function sceneVerloren(pen, info, t, heads) {
    var bar = info.bar, b = info.beat, shotA = Math.floor(bar / 2) % 2 === 0;
    copperSky([[8, 10, 40], [20, 26, 70], [10, 10, 30]], 0, H);
    ctx.globalCompositeOperation = "lighter";
    var rg = ctx.createRadialGradient(320, 80, 10, 320, 80, 260); rg.addColorStop(0, "rgba(120,60,200,0.35)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
    if (shotA) {
      // Mini allein zwischen lauter großen Beinen
      for (var i = 0; i < 9; i++) {
        var x = i * 80 - 20 + Math.sin(t * 0.8 + i) * 6;
        if (i === 4) continue;
        var lc = i % 2 ? "#2a2148" : "#211a3a";
        pen.tube([[x + 14, 210], [x + 40, 250 + Math.sin(t * 2 + i) * 14], [x + 34, 300 + Math.sin(t * 2 + i) * 20]], lc, 9);
        pen.shape([[x - 22, H - 8], [x - 18, 120], [x + 18, 120], [x + 22, H - 8]], lc, 2, true);
        pen.shape(ellipse(x, H - 8, 28, 12, 8), lc, 2);
      }
      var look = Math.sin(t * 1.4);
      heads[3] = drawCat(pen, 3, 330, 380, 0.5, { eyes: "sad", look: look, tear: bar >= 4 ? t * 0.8 : 0, mouth: voiceOpen(3, b), tail: 0.3, lean: look * 0.1 });
      if (bar === 0) { var fy = lerp(250, -20, info.inBar / 4); ctx.fillStyle = "#d8ff6a"; ctx.fillRect(360 + Math.sin(t * 6) * 10, fy, 4, 4); }
    } else {
      // die Freunde suchen mit der Taschenlampe
      for (i = 0; i < 6; i++) pen.shape([[i * 120 - 40, H + 10], [i * 120 - 30, 210], [i * 120 + 10, 200], [i * 120 + 30, H + 10]], "#1d1834", 2, true);
      var sw = Math.sin(t * 1.2);
      heads[0] = drawCat(pen, 0, 160, 384, 0.44, { eyes: "open", look: 1, lamp: sw, armR: 0.5, mouth: voiceOpen(0, b), walk: b * 2 });
      heads[1] = drawCat(pen, 1, 330, 384, 0.44, { eyes: "sad", look: -1, armL: 0.8, mouth: voiceOpen(1, b), walk: b * 2 + 1 });
      heads[2] = drawCat(pen, 2, 480, 386, 0.42, { eyes: "sad", look: -1, armL: 0.3, armR: 0.3, mouth: voiceOpen(2, b), walk: b * 2 + 2, dir: -1 });
    }
  }

  function sceneWiederfinden(pen, info, t, heads) {
    var bar = info.bar, b = info.beat, k;
    copperSky([[10, 10, 50], [40, 30, 90], [20, 12, 50]], 0, H);
    stars(0, 40, 0, 200, 9);
    if (bar < 2) {
      for (var i = 0; i < 9; i++) { var x = i * 80 - 20; if (i === 4) continue; pen.shape([[x - 22, H - 8], [x - 18, 150], [x + 18, 150], [x + 22, H - 8]], i % 2 ? "#2a2148" : "#211a3a", 2, true); pen.shape(ellipse(x, H - 8, 28, 12, 8), i % 2 ? "#2a2148" : "#211a3a", 2); }
      balloon(pen, 470, 80, 0.6, t);
      heads[3] = drawCat(pen, 3, 300, 380, 0.5, { eyes: "wide", look: 1, armR: 1, tail: b, lean: -0.1 });
      pen.shape(ellipse(300, 160, 18, 22, 9), "#fff27a", 2.4);
      pen.text("!", 300, 162, 26, PIXEL, INK);
      ctx.globalAlpha = 0.85; pen.ink([[330, 170], [400, 120], [430, 105]], false, 2, false, "#ffe36b"); ctx.globalAlpha = 1;
      return;
    }
    balloon(pen, 320, 90, 0.7, t);
    pen.wash([[0, 330], [W, 330], [W, H], [0, H]], "#2a1f46", true);
    if (bar < 6) {
      // alle rennen zum Ballon
      k = ease((info.progress * 8 - 2) / 4);
      heads[3] = drawCat(pen, 3, lerp(-40, 250, k), 378, 0.42, { eyes: "open", look: 1, walk: b * 6, tail: b * 3, lean: 0.12, armL: 0.5 });
      heads[0] = drawCat(pen, 0, lerp(700, 360, k), 382, 0.4, { eyes: "open", look: -1, walk: b * 6, tail: b * 3, lean: -0.12, dir: -1 });
      heads[1] = drawCat(pen, 1, lerp(760, 420, k), 382, 0.4, { eyes: "open", look: -1, walk: b * 6 + 1, tail: b * 3, lean: -0.12, dir: -1 });
      heads[2] = drawCat(pen, 2, lerp(820, 490, k), 384, 0.38, { eyes: "open", look: -1, walk: b * 6 + 2, tail: b * 3, lean: -0.12, dir: -1 });
      for (i = 0; i < 6; i++) { var ly = 300 + i * 14; pen.ink(line(lerp(-40, 250, k) - 70 - i * 10, ly, lerp(-40, 250, k) - 40 - i * 10, ly), false, 1.6, true, "#a89ad8"); }
      return;
    }
    // Wiedersehen unter dem Ballon: Gruppenumarmung
    var hug = Math.abs(Math.sin(b * Math.PI)) * 4;
    heads[0] = drawCat(pen, 0, 220, 384, 0.44, { eyes: "happy", armR: 0.55, mouth: voiceOpen(0, b), tail: b, lean: 0.1 });
    heads[2] = drawCat(pen, 2, 420, 386, 0.42, { eyes: "happy", armL: 0.55, mouth: voiceOpen(2, b), tail: b, lean: -0.1, dir: -1 });
    heads[1] = drawCat(pen, 1, 270, 386, 0.42, { eyes: "happy", armR: 0.5, mouth: voiceOpen(1, b), tail: b + 1, lean: 0.05 });
    heads[3] = drawCat(pen, 3, 340, 388, 0.48, { eyes: "happy", armL: 1, armR: 1, wave: b * 4, mouth: voiceOpen(3, b), tail: b * 2, jump: hug * 2 });
    for (i = 0; i < 8; i++) { var age = ((b * 0.5 + i / 8) % 1); ctx.globalAlpha = 1 - age; heart(pen, 320 + Math.sin(i * 2.3) * 140 * age, 260 - age * 160, 8 + i % 3 * 3, ["#ff4f7a", "#ff8ab0", "#ffd23f"][i % 3]); }
    ctx.globalAlpha = 1;
  }

  function sceneMorgen(pen, info, t, heads, ende) {
    var k = ende ? 1 : clamp(info.progress, 0, 1);
    copperSky([[lerp(40, 120, k), lerp(40, 170, k), lerp(110, 240, k)], [lerp(200, 255, k), lerp(110, 190, k), lerp(140, 150, k)], [255, lerp(170, 230, k), lerp(110, 170, k)]], 0, 300);
    pen.shape(ellipse(470, lerp(300, 170, k), 46, 46, 12), "#ffd23f", 2.6);
    hills(pen, 0, 290, 40, "#3f8a4a", 2, 60);
    pen.wash([[0, 300], [W, 300], [W, H], [0, H]], "#4e9a46", true);
    tent(pen, 260, 360, 1.25, 1, false);
    // alle schlafen eingekuschelt im offenen Zelt
    var s = 0.3;
    [[200, 2], [236, 0], [272, 1], [306, 3]].forEach(function (q, i) {
      ctx.save(); ctx.translate(q[0], 344 + Math.sin(t * 1.5 + i) * 1.5); ctx.scale(s * CATS[q[1]].size, s * CATS[q[1]].size); pen.k = 1 / (s * CATS[q[1]].size);
      drawHead(pen, q[1], { eyes: "closed" }); pen.k = 1; ctx.restore();
    });
    heads[2] = [200, 320];
    for (var i = 0; i < 3; i++) { var a = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = 1 - a; pen.text("Z", 330 + a * 50 + i * 8, 300 - a * 80, 20 + i * 6, HAND, "#ffffff"); }
    ctx.globalAlpha = 1;
    [[120, 120], [160, 100]].forEach(function (p, i) { var y = p[1] + Math.sin(t * 3 + i) * 5; pen.ink([[p[0] - 10, y], [p[0] - 4, y - 5 - Math.abs(Math.sin(t * 8 + i)) * 4], [p[0], y], [p[0] + 4, y - 5 - Math.abs(Math.sin(t * 8 + i)) * 4], [p[0] + 10, y]], false, 2); });
    if (ende || info.bar >= 4) { chromeLogo("ENDE", W / 2, 90, t, 40); }
    scroller(t, SCROLL_END, 386);
  }

  // ---------- ein Bild ----------

  var current = { scene: "abfahrt" };
  function renderAt(t, boil) {
    t = Math.max(0, t);
    var info = M.at(t), b = info.beat, sec = info.section;
    var seed = Math.floor((boil === undefined ? t : boil) * 6) * 17.3 + 1, pen = Pen(ctx, seed), heads = {};
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (sec === "abfahrt") sceneAbfahrt(pen, info, t, heads);
    else if (sec === "zelten") sceneZelten(pen, info, t, heads);
    else if (sec === "party") sceneParty(pen, info, t, heads, false);
    else if (sec === "verloren") sceneVerloren(pen, info, t, heads);
    else if (sec === "wiederfinden") sceneWiederfinden(pen, info, t, heads);
    else if (sec === "finale") sceneParty(pen, info, t, heads, true);
    else sceneMorgen(pen, info, t, heads, sec === "ende");

    // Sprechblasen aus den Song-Daten
    var said = "";
    M.song.vocals.forEach(function (e) {
      if (b < e.t || b > e.t + e.d + 0.6 || !heads[e.cat]) return;
      var text = e.word;
      if (e.type === "sing") {   // Ruf „Mi-a-u!“: die Silben wachsen mit
        var parts = M.song.vocals.filter(function (x) { return x.cat === e.cat && x.type === "sing" && x.t <= e.t && x.t > e.t - 1.6; });
        for (var k = parts.length - 2; k >= 0; k--) if (/!/.test(parts[k].word)) { parts = parts.slice(k + 1); break; }   // ein Ruf endet am „!“
        text = parts.map(function (x) { return x.word; }).join("");
        var next = M.song.vocals.filter(function (x) { return x.cat === e.cat && x.type === "sing" && x.t > e.t && x.t < e.t + 1.6; });
        if (next.length && b > next[0].t) return;
      }
      if (e.type === "sing" && e.cat !== 3 && sec === "wiederfinden") return;   // im Chor reicht Minis Blase
      var h = heads[e.cat], loud = /!/.test(text) && text.length < 10;
      bubble(pen, h[0] + (h[0] > W / 2 ? -60 : 60), h[1] - 50, text, h[0], h[1] - 4, loud);
      said = text;
    });
    // Kapitel-Titel
    var secStart = sec === "ende" ? Infinity : M.sectionStart(sec) + (sec === "abfahrt" ? 4 * M.BAR * BEAT : 0), st = t - secStart;
    if (CAPTIONS[sec] && st >= 0 && st < 3.5) caption(pen, CAPTIONS[sec], Math.min(st / 0.4, (3.5 - st) / 0.4));
    dither();
    current = { scene: sec, bubble: said, heads: Object.keys(heads).map(Number) };
    return sec;
  }

  // ---------- Ablauf ----------

  var LABELS = { abfahrt: "Abfahrt", zelten: "Zelten", party: "Party", verloren: "Verloren", wiederfinden: "Wiederfinden", finale: "Finale", morgen: "Guten Morgen", ende: "Ende" };
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
    if (partEl && partEl.textContent !== "TEIL: " + LABELS[scene].toUpperCase()) partEl.textContent = "TEIL: " + LABELS[scene].toUpperCase();
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
  var idleFrame = 0;
  function idle(now) { if (running) return; if (idleFrame++ % 4 === 0) renderAt(5, (now || 0) / 1000); requestAnimationFrame(idle); }
  if (document.fonts && document.fonts.load) { document.fonts.load("16px " + PIXEL).catch(function () {}); document.fonts.load("18px " + HAND).catch(function () {}); }
  requestAnimationFrame(idle);
  requestAnimationFrame(frame);

  window.rave = {
    renderAt: renderAt,
    get scene() { return current.scene; },
    get state() { return current; },
    get frames() { return frames; },
    get running() { return running; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return M.DURATION; }
  };
})();
