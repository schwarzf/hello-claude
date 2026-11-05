/**
 * Demo „Katzenfrieden“: verfeindete Katzen fauchen und raufen, bekommen
 * Katzenminze, wälzen sich darin, werden Freunde und tanzen am Ende einen
 * griechischen Volkstanz in der Seitenansicht – mit Longcats.
 *
 * Wie bei der Katzen-Demo ist jedes Bild eine reine Funktion der Songzeit
 * (renderAt); Musik und Grafik lesen denselben Song (FriedenMusik).
 */
(function () {
  "use strict";

  var M = FriedenMusik;
  var W = 320, H = 200;
  var FONT = '"Press Start 2P", monospace';
  var canvas = document.getElementById("demo");
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var INK = "#111";
  var RAINBOW = ["#ff3b3b", "#ff9f1c", "#ffe14d", "#4cd964", "#3b9dff", "#8e5bff"];
  // die verfeindeten Katzen: rot, grau, schwarz, weiß-getigert, braun
  var CATS = ["#e2552b", "#8d93a3", "#3a3a48", "#e9e4d8", "#9b6b3c"];
  var NAMES = ["ROTE", "GRAUE", "SCHWARZE", "WEISSE", "BRAUNE"];

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
  function hsl(h, s, l, a) { return "hsla(" + h + "," + s + "%," + l + "%," + (a === undefined ? 1 : a) + ")"; }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    return "rgb(" + Math.min(255, ((n >> 16) * f) | 0) + "," + Math.min(255, (((n >> 8) & 255) * f) | 0) + "," + Math.min(255, ((n & 255) * f) | 0) + ")";
  }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function line(x0, y0, x1, y1, w, color, outline) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    (outline === false ? [[w, color]] : [[w + 2, INK], [w, color]]).forEach(function (p) {
      var o = (p[0] - w) / 2;
      for (var i = 0; i <= n; i++) rect(x0 + (x1 - x0) * i / n - o, y0 + (y1 - y0) * i / n - o, p[0], p[0], p[1]);
    });
  }
  function sprite(rows, x, y, body, flip) {
    var pal = { k: INK, e: INK, w: "#fff", p: "#ffb3c8", n: "#ff6f9a", m: "#a0122e", t: "#fff", b: body, d: shade(body, 0.72) };
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r][c];
        if (ch !== "." && ch !== " ") rect(flip ? x + width - 1 - c : x + c, y + r, 1, 1, pal[ch]);
      }
    }
  }
  function scaled(x, y, s, flipX, fn) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(flipX ? -s : s, s);
    fn();
    ctx.restore();
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
    var width = ctx.measureText(str).width, x0 = x - width / 2;
    for (var i = 0; i < str.length; i++) {
      var cx = x0 + ctx.measureText(str.slice(0, i)).width, cy = y + Math.sin(t * 4 + i * 0.6) * (wave || 0);
      ctx.fillStyle = INK;
      ctx.fillText(str[i], Math.round(cx + 1), Math.round(cy + 1));
      ctx.fillStyle = hsl((i * 30 + t * 160) % 360, 100, 62);
      ctx.fillText(str[i], Math.round(cx), Math.round(cy));
    }
  }

  /** Zackige Comic-Sprechblase (für Fauchen) oder runde (für Fragen). */
  function bubble(x, y, str, spiky, color) {
    ctx.font = "8px " + FONT;
    var w = ctx.measureText(str).width + 10, h = 16;
    ctx.fillStyle = spiky ? "#fff35c" : "#fff";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (spiky) {
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * Math.PI * 2, r = i % 2 ? 0.75 : 1.15;
        ctx.lineTo(x + Math.cos(a) * w * 0.62 * r, y + Math.sin(a) * h * 0.75 * r);
      }
    } else {
      ctx.ellipse(x, y, w * 0.6, h * 0.6, 0, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    text(str, x, y + 1, 8, color || "#d81b60");
  }

  // ---------- Sprites ----------

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
  var SIDE_HISS = SIDE.slice(0, 6).concat([".kbbbbbbbbbbbbbbbbwwnwwk", ".kwwwwwwwwwwwbbbbbbwkmtk", "..kwwwwwwwwwwkkkkkkkkmk."]);
  var SIDE_MAD = SIDE.slice(0, 4).concat([".kbbdbbbdbbbbbbbbbkekbekk"]).concat(SIDE.slice(5));
  var HEAD_SIDE = [
    "..k...k....",
    ".kpk.kpk...",
    ".kbbkbbbk..",
    "kbbbbbbbbk.",
    "kbbbbebbbbk",
    "kbbbbbbbwnk",
    "kbbbbbwwwwk",
    ".kbbbwwwwk.",
    "..kkkkkkk.."
  ];
  var HEAD_SIDE_HAPPY = HEAD_SIDE.slice(0, 4).concat(["kbbbkbkbbbk"]).concat(HEAD_SIDE.slice(5, 7)).concat([".kbbbwkmwk.", "..kkkkkkk.."]);

  /**
   * Katze auf allen Vieren von der Seite (Blick nach rechts). x/y = links oben
   * der 24×9-Figur. mode: "walk", "stand", "arch" (Buckel), "sniff".
   */
  function sideCat(x, y, body, t, mode, hissing) {
    var arch = mode === "arch", lift = arch ? 4 : 0;
    // Schwanz: beim Buckel steil und gesträubt
    for (var i = 0; i < 8; i++) {
      var tx, ty;
      if (arch) { tx = x - 1 + Math.sin(t * 30) * 0.5; ty = y + 2 - lift - i * 1.4; }
      else { tx = x - i; ty = y + 3 - i * 0.9 + Math.sin(t * 6 + i * 0.7) * 1.2; }
      rect(tx - 1 - (arch ? 1 : 0), ty - 1, arch ? 5 : 3, 3, INK);
    }
    for (var j = 0; j < 8; j++) {
      var tx2 = arch ? x - 1 + Math.sin(t * 30) * 0.5 : x - j, ty2 = arch ? y + 2 - lift - j * 1.4 : y + 3 - j * 0.9 + Math.sin(t * 6 + j * 0.7) * 1.2;
      rect(tx2 - (arch ? 1 : 0), ty2, arch ? 3 : 1, 1, body);
    }
    // Beine (beim Buckel lang und steif)
    [3, 7, 13, 17].forEach(function (lx, k) {
      var ox = 0, len = 3 + lift;
      if (mode === "walk") { ox = Math.round(Math.sin(t * 12 + (k % 2) * Math.PI) * 1.5); len = 2 + (Math.sin(t * 12 + k) > 0 ? 1 : 0); }
      rect(x + lx + ox - 1, y + 8 - lift, 4, len + 2, INK);
      rect(x + lx + ox, y + 8 - lift, 2, len, body);
      rect(x + lx + ox, y + 8 - lift + len - 1, 2, 1, "#fff");
    });
    ctx.save();
    if (arch) {
      // Rücken hochgezogen: Körper in der Mitte angehoben, Fell gesträubt
      ctx.translate(0, -lift);
      for (var s = 3; s < 15; s += 2) {
        var hgt = 2 + Math.round(Math.sin((s - 3) / 12 * Math.PI) * 4);
        rect(x + s, y + 2 - hgt, 1, hgt + 1, INK);
        rect(x + s + 1, y + 3 - hgt, 1, hgt, body);
      }
    }
    var rows = hissing ? SIDE_HISS : (arch ? SIDE_MAD : SIDE);
    if (mode === "sniff") ctx.translate(0, 1);
    sprite(rows, x, y, body);
    ctx.restore();
  }

  /**
   * Aufrechte Katze in Seitenansicht (Blick nach rechts), Füße bei (x, y).
   * o: { kick: -1…1 (vorderes/hinteres Bein hoch), dip, arm: [dx,dy], happy, lean, longBody }
   */
  function uprightCat(x, y, body, t, o) {
    o = o || {};
    var dip = o.dip || 0, long = o.longBody || 0, lean = o.lean || 0;
    var hipY = y - 10 + dip, top = hipY - 16 - long;
    // Schwanz
    var sw = Math.sin(t * 5 + (o.phase || 0)) * 2;
    line(x - 5, hipY - 2, x - 10, hipY - 5 + sw, 1, body);
    line(x - 10, hipY - 5 + sw, x - 12 + sw, hipY - 13, 1, body);
    // Beine: Standbein und Tanzbein (kick > 0 vorn hoch, < 0 hinten hoch)
    var k = o.kick || 0, a = Math.abs(k) * 2.1; // bis über die Waagerechte
    var standX = x - (k > 0 ? 1 : -1), kickDir = k >= 0 ? 1 : -1;
    var fx = x + 1 + Math.sin(a) * 12 * kickDir, fy = hipY + Math.cos(a) * 11;
    line(x, hipY, standX, y - 1, 2, body);
    rect(standX - 1, y - 1, 5, 2, "#fff");
    var kickLeg = function () {
      line(x + 1, hipY, fx, fy, 2, body);
      rect(fx - 1, fy - 1, 4, 3, "#fff");
    };
    if (!k) kickLeg(); // ruhig: hinter dem Körper
    // Körper (mit weißem Bauch vorn)
    rect(x - 6 + lean, top, 11, hipY - top + 2, INK);
    rect(x - 5 + lean, top + 1, 9, hipY - top, body);
    rect(x + 1 + lean, top + 3, 3, hipY - top - 4, "#fff");
    if (!long) [[-4, 4], [-3, 8]].forEach(function (s) { rect(x + s[0] + lean, top + s[1], 3, 1, shade(body, 0.72)); });
    else for (var sy = top + 6; sy < hipY - 4; sy += 10) rect(x - 4 + lean, sy, 3, 2, shade(body, 0.72));
    if (k) kickLeg(); // beim Tanzen fliegt das Bein vor dem Körper hoch
    // Arm (bei Longcats auf normaler Schulterhöhe, dazu ein winkender Arm oben)
    var arm = o.arm || [8, 2], sh = [x + 1 + lean, long ? hipY - 11 : top + 5];
    line(sh[0], sh[1], sh[0] + arm[0], sh[1] + arm[1], 2, body);
    rect(sh[0] + arm[0], sh[1] + arm[1] - 1, 3, 3, "#fff");
    if (long) {
      var wave = Math.sin(t * 8) * 4;
      line(x + 1 + lean, top + 5, x + 8 + lean, top - 4 + wave, 2, body);
      rect(x + 7 + lean, top - 5 + wave, 3, 3, "#fff");
    }
    sprite(o.happy ? HEAD_SIDE_HAPPY : HEAD_SIDE, x - 4 + lean, top - 8, body);
    return { shoulder: sh, top: top };
  }

  // ---------- Hintergründe ----------

  function yard(t, tint) {
    var g = ctx.createLinearGradient(0, 0, 0, 140);
    g.addColorStop(0, tint ? hsl((t * 40) % 360, 60, 22) : "#0d1030");
    g.addColorStop(1, tint ? hsl((t * 40 + 120) % 360, 60, 34) : "#2a2350");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Mond und Sterne
    rect(258, 18, 18, 18, "#fff6c9");
    rect(254, 22, 26, 10, "#fff6c9");
    rect(262, 14, 10, 26, "#fff6c9");
    var r = rng(3);
    for (var i = 0; i < 40; i++) {
      var sx = r() * W, sy = r() * 90, on = Math.sin(t * 3 + i) > -0.6;
      if (on) rect(sx, sy, 1, 1, "#cfd4ff");
    }
    // Häuserwand und Zaun
    rect(0, 70, W, 70, "#3b2f4f");
    for (var by = 74; by < 140; by += 8) for (var bx = (by / 8) % 2 ? 0 : 10; bx < W; bx += 20) rect(bx, by, 18, 6, "#46395c");
    rect(30, 86, 22, 26, "#ffd76a");
    rect(31, 87, 9, 11, "#f5b942");
    rect(42, 87, 9, 11, "#f5b942");
    rect(31, 100, 9, 11, "#f5b942");
    rect(42, 100, 9, 11, "#f5b942");
    for (var fx = 0; fx < W; fx += 14) { rect(fx, 112, 10, 30, "#6b4a2b"); rect(fx + 2, 108, 6, 4, "#6b4a2b"); }
    rect(0, 120, W, 3, "#5a3d22");
    // Boden
    rect(0, 142, W, 58, tint ? hsl((t * 60 + 200) % 360, 40, 20) : "#26222e");
    rect(0, 142, W, 2, "#3a3546");
    // Mülltonne
    rect(250, 112, 26, 30, INK);
    rect(251, 113, 24, 28, "#7c8590");
    rect(248, 108, 30, 5, INK);
    rect(249, 109, 28, 3, "#9aa3ad");
    for (var tl = 254; tl < 274; tl += 6) rect(tl, 116, 2, 22, "#6a727c");
  }

  function greece(t) {
    var g = ctx.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, "#3fa9f5");
    g.addColorStop(1, "#bfe9ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    rect(262, 14, 22, 22, "#ffe14d");
    rect(258, 19, 30, 12, "#ffe14d");
    rect(267, 10, 12, 30, "#ffe14d");
    rect(0, 92, W, 30, "#1f6fd1");
    for (var w = 0; w < W; w += 16) rect((w + t * 10) % W, 96 + (w % 32 ? 6 : 14), 8, 1, "#7fc4ff");
    // weiße Häuser mit blauen Kuppeln
    [[8, 70, 40, 34], [52, 78, 34, 28], [210, 66, 44, 38], [262, 76, 40, 30]].forEach(function (h, i) {
      rect(h[0] - 1, h[1] - 1, h[2] + 2, h[3] + 2, "#c9d3e0");
      rect(h[0], h[1], h[2], h[3], "#fafcff");
      rect(h[0] + 6, h[1] + 8, 6, 8, "#2a65c9");
      rect(h[0] + h[2] - 12, h[1] + 8, 6, 8, "#2a65c9");
      if (i % 2 === 0) {
        ctx.fillStyle = "#2a65c9";
        ctx.beginPath(); ctx.arc(h[0] + h[2] / 2, h[1], h[2] / 3, Math.PI, 0); ctx.fill();
        rect(h[0] + h[2] / 2, h[1] - h[2] / 3 - 6, 1, 6, "#fafcff");
        rect(h[0] + h[2] / 2 - 2, h[1] - h[2] / 3 - 4, 5, 1, "#fafcff");
      }
    });
    // Terrasse mit Fliesen
    rect(0, 122, W, 78, "#f4efe4");
    for (var ty = 122; ty < H; ty += 10) for (var tx = (ty / 10) % 2 ? 0 : 10; tx < W; tx += 20) rect(tx, ty, 10, 10, "#dfe9f7");
    rect(0, 122, W, 2, "#c9d3e0");
  }

  // ---------- Szenen ----------

  // Startplätze der verfeindeten Katzen: [x, y, Blick nach links?, Skalierung]
  var SPOTS = [[52, 160, false, 2], [212, 160, true, 2], [18, 92, false, 1], [244, 92, true, 1], [130, 178, false, 1]];

  function hissAge(step, frac, idx) {
    for (var k = 0; k < 24 && step - k >= 0; k++) {
      var e = M.at(step - k).events;
      if (e.hiss === idx) return (k + frac) * M.stepLength(step - k);
    }
    return 99;
  }

  function sceneFight(t, a, step, frac) {
    yard(t, false);
    var fight = a.events.fight || (a.step >= M.FIGHT[0] && a.step < M.FIGHT[1]);
    SPOTS.forEach(function (sp, i) {
      if (fight && i < 2) return;
      var age = hissAge(step, frac, i), hiss = age < 1.2;
      var approach = Math.sin(t * 1.3 + i) * 6 + (i < 2 ? (i === 0 ? 1 : -1) * Math.min(1, a.step / 64) * 24 : 0);
      if (a.step >= M.FIGHT[1] && i < 2) approach = (i === 0 ? -10 : 10);
      var x = sp[0] + approach, mode = hiss || a.step >= 40 ? "arch" : "walk";
      scaled(x + (sp[2] ? sp[3] * 24 : 0), sp[1] - 9 * sp[3], sp[3], sp[2], function () { sideCat(0, 0, CATS[i], t + i, mode, hiss && age < 0.8); });
      if (hiss) {
        var words = ["FAUCH!", "GRRR!", "KSSS!", "MRRAU!", "FFFT!"];
        var bx = x + (sp[2] ? -4 : sp[3] * 24 + 8), by = sp[1] - 9 * sp[3] - 12;
        bubble(Math.max(24, Math.min(W - 24, bx)), Math.max(12, by), words[i], true);
      }
    });
    if (fight) {
      // Comic-Rauferei: Staubwolke mit Pfoten, Schwänzen und Flüchen
      var cx = 150, cy = 136, r = rng(Math.floor(t * 12));
      for (var p = 0; p < 9; p++) {
        var ang = r() * Math.PI * 2, len = 32 + r() * 18;
        line(cx + Math.cos(ang) * 14, cy + Math.sin(ang) * 10, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len * 0.7, 2, p % 2 ? CATS[0] : CATS[1]);
        rect(cx + Math.cos(ang) * len - 1, cy + Math.sin(ang) * len * 0.7 - 1, 3, 3, "#fff");
      }
      for (var c = 0; c < 9; c++) {
        var ca = c / 9 * Math.PI * 2 + t * 3;
        ctx.fillStyle = c % 2 ? "#d9d4c8" : "#f3efe4";
        ctx.beginPath(); ctx.arc(cx + Math.cos(ca) * 22 + r() * 5, cy + Math.sin(ca) * 13 + r() * 4, 15 + r() * 5, 0, Math.PI * 2); ctx.fill();
      }
      ["#@!", "%&!", "*!?", "ZACK"].forEach(function (w, i) { if ((Math.floor(t * 8) + i) % 3 === 0) text(w, cx - 44 + i * 28 + r() * 6, cy - 40 - r() * 8, 8, "#ff3b3b"); });
      for (var st = 0; st < 3; st++) rect(cx - 20 + r() * 40, cy - 22 + r() * 12, 2, 2, "#ffe14d");
    }
    text(a.bar < 2 ? "VERFEINDETE KATZEN ..." : fight ? "RAUFEREI!" : "", W / 2, 14, 8, "#ff9f1c");
  }

  function leaf(x, y, rot, c) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(rot);
    ctx.fillStyle = c || "#3fbf4a";
    ctx.fillRect(-3, -1, 6, 3);
    ctx.fillStyle = "#2a8a33";
    ctx.fillRect(-3, 0, 6, 1);
    ctx.restore();
  }

  function sceneMint(t, a, sinceStart) {
    yard(t, false);
    var dropT = sinceStart, landY = 150, burst = M.stepTime(16) - M.stepTime(0); // Platzen bei Schritt 16
    var minzeStart = M.stepTime(128);
    var tLocal = t - minzeStart;
    // Beutel fällt
    if (tLocal < burst) {
      var y = -30 + Math.min(1, tLocal / burst) * (landY + 30);
      rect(146, y - 2, 28, 26, INK);
      rect(147, y - 1, 26, 24, "#8bc34a");
      rect(150, y + 4, 20, 10, "#fff");
      ctx.font = "8px " + FONT;
      text("MINZE", 160, y + 9, 8, "#2a8a33");
      rect(155, y - 6, 10, 5, "#8bc34a");
      leaf(160, y - 8, Math.sin(t * 4), "#3fbf4a");
    }
    // Blätter explodieren und rieseln
    var r = rng(11);
    for (var i = 0; i < 70; i++) {
      var vx = (r() - 0.5) * 220, vy = -60 - r() * 140, ground = 146 + r() * 40, hue = r();
      var age = tLocal - burst;
      if (age < 0) continue;
      var lx = 160 + vx * Math.min(age, 1.2) * 0.8, ly = landY + vy * age + 160 * age * age;
      if (ly > ground) ly = ground;
      leaf(lx, ly, age * (2 + hue * 4) + i, hue > 0.7 ? "#7ddc5a" : "#3fbf4a");
    }
    // Katzen werden neugierig und kommen näher
    SPOTS.forEach(function (sp, i) {
      var k = Math.min(1, Math.max(0, (tLocal - burst) / 3));
      var tx = 60 + i * 50, x = sp[0] + (tx - sp[0]) * k, y = sp[1] + (172 - sp[1]) * k, s = sp[3] + (2 - sp[3]) * k * 0;
      var left = x > 160;
      scaled(x + (left ? s * 24 : 0), y - 9 * s, s, left, function () { sideCat(0, 0, CATS[i], t + i, k > 0 && k < 1 ? "walk" : (tLocal > burst ? "sniff" : "arch"), false); });
      if (tLocal > burst && tLocal < burst + 2.5 && i < 4) bubble(Math.max(14, Math.min(W - 14, x + 12 * s)), y - 9 * s - 14, tLocal < burst + 1.2 ? "?!" : "!", false, "#2a8a33");
    });
    text("KATZENMINZE!", W / 2, 14, 8, "#7ddc5a");
  }

  function sceneRoll(t, a) {
    yard(t, true);
    // Minze am Boden
    var r = rng(5);
    for (var i = 0; i < 60; i++) leaf(r() * W, 146 + r() * 50, r() * 6 + Math.sin(t * 2 + i) * 0.3, r() > 0.5 ? "#7ddc5a" : "#3fbf4a");
    // Katzen auf dem Rücken, Beine in der Luft, schaukelnd
    CATS.forEach(function (c, i) {
      var x = 26 + i * 60 + Math.sin(t * 1.5 + i * 2) * 10, y = 170 + (i % 2) * 14, rock = Math.sin(t * 3 + i) * 0.35;
      ctx.save();
      ctx.translate(Math.round(x + 24), Math.round(y));
      ctx.rotate(rock);
      ctx.scale(2, -2);
      sideCat(-12, -4, c, t * 1.6 + i, "walk", false);
      ctx.restore();
    });
    // Herzen und Glitzer steigen auf
    for (var h = 0; h < 14; h++) {
      var hx = (h * 47 + Math.sin(t + h) * 10) % W, hy = 150 - ((t * 25 + h * 37) % 150);
      ctx.fillStyle = RAINBOW[h % 6];
      [[0, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [1, 3]].forEach(function (p) { rect(hx + p[0], hy + p[1], 1, 1, ctx.fillStyle); });
      if (h % 3 === 0) rect((hx + 20) % W, (hy + 30) % 150, 1, 1, "#fff");
    }
    rainbowText(a.bar < 4 ? "SCHNURR ..." : "SOOO ENTSPANNT ...", W / 2, 20, 8, t, 3);
  }

  function scenePeace(t, a) {
    var k = a.progress;
    var g = ctx.createLinearGradient(0, 0, 0, 140);
    g.addColorStop(0, hsl(210 - k * 20, 60, 30 + k * 30));
    g.addColorStop(1, hsl(30, 90, 55 + k * 10));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    rect(0, 142, W, 58, "#5a8f3a");
    rect(0, 142, W, 2, "#7cc35a");
    // Katzen stehen auf und reichen sich die Pfoten
    CATS.forEach(function (c, i) {
      var x = 40 + i * 58, rise = Math.min(1, k * 3);
      var flip = i % 2 === 1;
      scaled(x, 180, 2, flip, function () {
        uprightCat(0, 0, c, t + i, { arm: [8, rise > 0.5 ? -6 : 2], happy: true, dip: Math.round((1 - rise) * 4), phase: i });
      });
    });
    for (var h = 0; h < 4; h++) {
      var hx = 70 + h * 58, hy = 100 - Math.abs(Math.sin(t * 3 + h)) * 10;
      ctx.fillStyle = "#ff3b6b";
      [[0, 0], [1, 0], [3, 0], [4, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [2, 4]].forEach(function (p) { rect(hx + p[0] * 2, hy + p[1] * 2, 2, 2, "#ff3b6b"); });
    }
    rainbowText("FREUNDE!", W / 2, 30, 16, t, 3);
  }

  /** Griechischer Tanz: Reihe in Seitenansicht, Pfote auf der Schulter des Vordermanns. */
  var DANCERS = [
    { c: CATS[0] }, { c: CATS[1] }, { c: RAINBOW[4], long: 38 }, { c: CATS[2] }, { c: CATS[3] }, { c: RAINBOW[5], long: 52 }, { c: CATS[4] }
  ];
  function sceneDance(t, a, step, frac) {
    greece(t);
    // Taktposition: ein Tanzmuster über 2 Takte = 8 Schläge
    var beatF = (a.step + frac) / 4, beat = Math.floor(beatF), ph = beatF - beat, b8 = beat % 8;
    var kickPattern = [0, 0, 0, 1, 0, -0.8, 0, 1];
    var kick = kickPattern[b8] * Math.sin(Math.PI * ph);
    var dip = b8 === 6 ? Math.round(Math.sin(Math.PI * ph) * 3) : 0;
    // Die Reihe wandert hin und her (Seitschritte)
    var travel = Math.sin(beatF / 16 * Math.PI) * 30 + (b8 < 3 ? ph * 2 : 0);
    var spacing = 40, x0 = W / 2 - (DANCERS.length - 1) * spacing / 2 + travel;
    var hop = (b8 === 3 || b8 === 7) ? Math.round(Math.sin(Math.PI * ph) * 3) : 0;
    DANCERS.forEach(function (d, i) {
      var x = x0 + i * spacing, y = 186 - hop;
      // Pfote auf dem Rücken der Katze davor; die vorderste winkt
      var arm = DANCERS[i + 1] ? [(spacing / 2) - 7, 0] : [8, -10 - Math.abs(kick) * 4];
      scaled(x, y, 2, false, function () {
        uprightCat(0, 0, d.c, t + i, { kick: kick, dip: dip, arm: arm, happy: true, longBody: d.long || 0, phase: i, lean: Math.round(kick * 1) });
      });
    });
    if (a.events.opa || since(step, frac, "opa") < 1) text("OPA!", W / 2 + Math.sin(t * 20) * 2, 40, 16, "#ff3b3b");
    // zerbrochene Teller auf den Crash
    var sc = since(step, frac, "crash");
    if (sc < 0.8) {
      var r = rng(Math.floor((t - sc) * 10));
      for (var p = 0; p < 14; p++) {
        var px = 40 + r() * 240, vx = (r() - 0.5) * 120, vy = -40 - r() * 80;
        rect(px + vx * sc, 120 + vy * sc + 200 * sc * sc, 3, 2, "#fff");
      }
    }
    var tempo = Math.round(60 / (M.stepLength(step) * 4));
    text("TEMPO " + tempo, 46, 14, 8, "#1f3f8a");
    if (a.bar >= 12) rainbowText("SCHNELLER!", W / 2, 60, 8, t, 2);
  }

  function sceneEnd(t, a, frac) {
    greece(t);
    var k = Math.min(1, (a.step + frac) / 10);
    DANCERS.forEach(function (d, i) {
      scaled(40 + i * 40, 186, 2, false, function () {
        uprightCat(0, 0, d.c, t + i, { arm: [6, 6], happy: true, longBody: d.long || 0, lean: Math.round(k * 3), dip: Math.round(k * 2) });
      });
    });
    rect(70, 26, 180, 58, "rgba(10,30,80,0.75)");
    text("OPA!", W / 2, 42, 16, "#ff3b3b");
    rainbowText("THE END", W / 2, 68, 16, t, 3);
  }

  function since(step, frac, key) {
    for (var k = 0; k < 32 && step - k >= 0; k++) {
      if (M.at(step - k).events[key]) return M.stepTime(step) + frac * M.stepLength(step) - M.stepTime(step - k);
    }
    return 99;
  }

  // ---------- Bild zu einem Zeitpunkt ----------

  var current = { scene: "streit" };

  /** Zeichnet das Bild zur Songzeit t. noLoop: nach dem Ende bleibt das letzte Bild stehen (Video). */
  function renderAt(t, noLoop) {
    if (noLoop) t = Math.min(t, M.DURATION - 0.001);
    var pos = M.stepAt(t), step = pos.step, frac = pos.frac, a = M.at(step);
    var songT = t % M.DURATION;
    current.scene = a.section;
    ctx.save();
    if (a.section === "streit" && a.events.fight !== undefined) ctx.translate(Math.round(Math.sin(t * 70) * 1.5), 0);
    if (a.section === "streit") sceneFight(songT, a, step, frac);
    else if (a.section === "minze") sceneMint(songT, a);
    else if (a.section === "waelzen") sceneRoll(songT, a);
    else if (a.section === "frieden") scenePeace(songT, a);
    else if (a.section === "tanz") sceneDance(songT, a, step, frac);
    else sceneEnd(songT, a, frac);
    ctx.restore();
    var sk = since(step, frac, "kick");
    if (sk < 0.1 && (a.section === "tanz" || a.section === "frieden")) rect(0, 0, W, H, "rgba(255,255,255," + ((0.1 - sk) * 1.2).toFixed(3) + ")");
    var fade = songT < 0.6 ? 1 - songT / 0.6 : 0;
    if (noLoop && a.section === "ende" && a.bar >= 1) fade = Math.min(1, (a.inBar + frac) / 16);
    if (fade > 0) rect(0, 0, W, H, "rgba(0,0,0," + fade.toFixed(3) + ")");
    return a.section;
  }

  // ---------- Live-Wiedergabe ----------

  var running = false, withSound = true, clock = 0, last = null, frames = 0, offset = 0;
  var LABELS = { streit: "STREIT", minze: "KATZENMINZE", waelzen: "WAELZEN", frieden: "FRIEDEN", tanz: "GRIECHISCHER TANZ", ende: "OPA!" };
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
    renderAt(3 + (now || 0) / 1000);
    requestAnimationFrame(idle);
  }
  if (document.fonts && document.fonts.load) document.fonts.load("8px " + FONT).catch(function () {});
  requestAnimationFrame(idle);
  requestAnimationFrame(frame);

  window.frieden = {
    renderAt: renderAt,
    get scene() { return current.scene; },
    get frames() { return frames; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return M.DURATION; }
  };
})();
