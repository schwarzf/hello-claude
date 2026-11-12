/**
 * Die Katze im Regen – ein animierter Comic-Roman (Noir), gebaut mit dem
 * Werkzeugkasten js/toon/toon.js.
 *
 * Jede Seite wird in Grautönen (plus Rot als Akzent) gezeichnet und danach
 * Panel für Panel durch den Comic-Filter geschickt: Schwarz, Kreuz- und
 * Einzelschraffur, Rasterpunkte und Papierweiß; Rot bleibt als flache
 * Akzentfarbe stehen. Sprechblasen, Lautwörter und Regen kommen danach
 * sauber obendrauf. Die Panels erscheinen nacheinander wie beim Lesen, die
 * Kamera gleitet zum neuesten Panel.
 *
 * Geschichte: Eine Detektivin sucht nachts im Regen eine gestohlene Kette.
 * Spuren, ein Verdächtiger, eine Jagd über die Dächer – und am Ende war es
 * eine Katzenmutter, die für ihre Jungen glänzende Dinge sammelt.
 */
(function () {
  "use strict";

  var M = window.RegenkatzeMusik, T = window.Toon;
  var out = document.getElementById("demo");
  if (!out || !M || !T) return;
  var octx = out.getContext("2d");
  var W = 640, H = 400, BEAT = M.BEAT, BARS = M.BAR * BEAT;
  var page = document.createElement("canvas"); page.width = W; page.height = H;
  var ctx = page.getContext("2d", { willReadFrequently: true });
  var HAND = '"Patrick Hand", "Comic Sans MS", sans-serif', LOUD = '"Bangers", Impact, sans-serif';
  var RED = "#d02020", PAPER = "#f4ecdc";
  var lerp = T.lerp, clamp = T.clamp, hash = T.hash, ease = T.EASE.inOut;

  var DET = T.human({ coat: true, hat: true, hairStyle: "lang" }), JEW = T.human({ hairStyle: "kahl" }), SUS = T.human({ hat: true }), CAT = T.cat();
  var G = function (a, b) { return [a, b]; };
  var DET_C = { skin: G("#d8d0c8", "#8a8078"), hair: G("#3a3434", "#161212"), top: G("#a8a39a", "#5a554e"), topB: G("#8e8980", "#48443e"), legs: G("#4a4848", "#222"), legsB: G("#3a3838", "#1a1a1a"), shoes: G("#2a2828", "#111"), hat: G("#5a5654", "#262422") };
  var JEW_C = { skin: G("#dcd4cc", "#908880"), hair: G("#ccc", "#888"), top: G("#78746e", "#3e3a36"), topB: G("#6a665e", "#34302c"), legs: G("#5a5856", "#2a2a2a"), legsB: G("#4a4846", "#222"), shoes: G("#2a2828", "#111") };
  var SUS_C = { skin: G("#c8c0b8", "#7a726a"), hair: G("#2a2626", "#111"), top: G("#5a5652", "#282624"), topB: G("#4a4642", "#201e1c"), legs: G("#3a3836", "#1a1a1a"), legsB: G("#302e2c", "#151515"), shoes: G("#222", "#0e0e0e"), hat: G("#3a3634", "#1a1818") };
  var CAT_C = { fur: G("#3a3636", "#141212"), furB: G("#2a2626", "#0e0c0c"), eye: "#f0f0e0" };
  var KIT_C = [{ fur: G("#8a8682", "#4a4642"), furB: G("#6a6662", "#3a3632"), eye: "#f0f0e0" }, { fur: G("#c8c4c0", "#78746e"), furB: G("#a8a4a0", "#5a5652"), eye: "#f0f0e0" }, CAT_C];
  function st(colors, extra) { var s = { light: -2.4, inkW: 2.2, shadowSize: 4, colors: colors, ink: "#0e0c0c" }; for (var k in extra || {}) s[k] = extra[k]; return s; }

  // ---------- Zeichenhilfen ----------

  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function poly(pts, c, ink) { T.path(ctx, pts, false); ctx.fillStyle = c; ctx.fill(); if (ink) { ctx.lineWidth = ink; ctx.strokeStyle = "#0e0c0c"; ctx.lineJoin = "round"; ctx.stroke(); } }
  function grad(x0, y0, x1, y1, stops) { var g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); }); return g; }
  function skyline(x, y, w, h, seed, dark) {
    for (var b = 0; b < 12; b++) {
      var bx = x + b * w / 10 - 20, bw = w / 12 + hash(b, seed) * 20, bh = h * (0.4 + hash(b * 3, seed) * 0.6);
      rect(bx, y - bh, bw, bh + 4, dark || "#3a3838");
      for (var r = 0; r < bh / 14 - 1; r++) for (var c = 0; c < bw / 10 - 1; c++) if (hash(c + b * 7, r + seed) > 0.62) rect(bx + 4 + c * 10, y - bh + 6 + r * 14, 4, 6, "#e8e4dc");
    }
  }
  function lamp(x, y, h) { rect(x - 2, y - h, 4, h, "#1a1818"); poly([[x - 2, y - h], [x + 22, y - h], [x + 22, y - h + 6], [x - 2, y - h + 6]], "#1a1818"); ctx.fillStyle = "rgba(255,255,240,0.35)"; T.path(ctx, [[x + 14, y - h + 6], [x - 30, y], [x + 60, y]], false); ctx.fill(); rect(x + 10, y - h + 6, 8, 4, "#fffff0"); }
  function necklace(x, y, s, sway) {
    ctx.strokeStyle = "#e8e0d0"; ctx.lineWidth = 1.2 * s;
    for (var i = 0; i < 11; i++) { var a = Math.PI * (0.15 + i * 0.07) + (sway || 0); ctx.beginPath(); ctx.arc(x + Math.cos(a) * 14 * s, y + Math.sin(a) * 10 * s - 4 * s, 2.2 * s, 0, Math.PI * 2); ctx.fillStyle = RED; ctx.fill(); }
    poly([[x - 3 * s, y + 5 * s], [x + 3 * s, y + 5 * s], [x, y + 12 * s]], RED, 1);
  }
  function pawprints(x0, y0, x1, y1, n) {
    for (var i = 0; i < n; i++) {
      var k = i / (n - 1), x = lerp(x0, x1, k) + (i % 2 ? 8 : -8), y = lerp(y0, y1, k);
      ctx.fillStyle = "#2a2828"; ctx.beginPath(); ctx.ellipse(x, y, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
      [[-6, -7], [-2, -10], [3, -10], [7, -7]].forEach(function (o) { ctx.beginPath(); ctx.arc(x + o[0], y + o[1], 2.2, 0, Math.PI * 2); ctx.fill(); });
    }
  }
  function speedLines(x, y, w, h, n, dir) { ctx.strokeStyle = "#1a1818"; ctx.lineWidth = 1.5; for (var i = 0; i < n; i++) { var yy = y + hash(i, 4) * h, xx = x + hash(i, 5) * w * 0.6; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + dir * (40 + hash(i, 6) * 80), yy); ctx.stroke(); } }
  /** Nahaufnahme: Figur so groß zeichnen, dass der Kopf im Panel sitzt */
  function closeUp(fig, colors, p, hx, hy, s, extra) { var head = fig.point("head", 0, 0, 1, p, 1, 0); fig.draw(ctx, hx - head[0] * s, hy - head[1] * s, s, p, st(colors, extra)); }

  // ---------- Seiten ----------
  // jedes Panel: [x, y, w, h, Takt des Erscheinens, Zeichenfunktion(lt, t), Regen?, Text-Funktion(lt)]

  var PAGES = {
    titel: [
      [10, 10, 620, 380, 0, function (lt, t) {
        rect(10, 10, 620, 380, grad(0, 10, 0, 390, ["#1a1818", "#4a4846", "#8a8682"]));
        skyline(10, 250, 620, 200, 1, "#2a2828");
        skyline(10, 300, 620, 150, 2, "#141212");
        rect(10, 300, 620, 90, "#3a3838");
        for (var i = 0; i < 14; i++) rect(10 + i * 48, 330 + (i % 3) * 14, 30, 2, "#9a9690");
        lamp(120, 330, 120);
        poly([[400, 300], [400, 200], [580, 200], [580, 300]], "#2a2626", 2);
        rect(420, 220, 140, 26, "#141212"); ctx.font = "20px " + LOUD; ctx.fillStyle = RED; ctx.textAlign = "center"; ctx.fillText("JUWELIER", 490, 241);
        rect(420, 252, 64, 48, "#d8d4cc"); rect(496, 252, 64, 48, "#d8d4cc");
        var walk = clamp(lt / (6 * BARS), 0, 1);
        var p = T.walk(t * 3.2);
        DET.draw(ctx, lerp(200, 330, walk), 330 - 48 * 1.1 - p._bob, 1.1, p, st(DET_C));
        // Regenschirm
        var ux = lerp(200, 330, walk) + 4, uy = 330 - 48 * 1.1 - 62 - p._bob;
        ctx.fillStyle = "#1a1818"; ctx.beginPath(); ctx.arc(ux, uy, 30, Math.PI, 0); ctx.fill(); rect(ux - 1, uy, 2, 30, "#1a1818");
      }, true, function (lt) {
        ctx.save(); ctx.font = "44px " + LOUD; ctx.textAlign = "left"; ctx.lineJoin = "round"; ctx.lineWidth = 8; ctx.strokeStyle = "#0e0c0c"; ctx.strokeText("DIE KATZE IM REGEN", 30, 70); ctx.fillStyle = PAPER; ctx.fillText("DIE KATZE IM REGEN", 30, 70); ctx.restore();
        if (lt > BARS) T.caption(ctx, 30, 92, "Mitternacht. Der Regen wäscht die Stadt nicht sauber.", { font: HAND, size: 14, maxW: 220 });
      }]
    ],
    fall: [
      [10, 10, 620, 180, 0, function (lt, t) {
        rect(10, 10, 620, 180, "#6a6662"); skyline(10, 120, 620, 100, 3, "#3a3838");
        poly([[160, 190], [160, 60], [480, 60], [480, 190]], "#2a2626", 2);
        rect(190, 80, 260, 100, "#0e0c0c");
        for (var i = 0; i < 9; i++) poly([[190 + hash(i, 1) * 260, 80], [200 + hash(i, 2) * 240, 80 + hash(i, 3) * 60], [210 + hash(i, 4) * 240, 82]], "#e8e4dc", 1);
        rect(270, 150, 100, 20, RED); poly([[270, 150], [370, 150], [360, 140], [280, 140]], "#a01818", 1.5);
      }, true, function (lt) { T.sfx(ctx, 540, 70, "KLIRR!", 40, "#fffdf4", -0.2, LOUD); T.caption(ctx, 20, 20, "Juwelier Brandt, 0:14 Uhr.", { font: HAND, size: 13 }); }],
      [10, 200, 300, 190, 2, function (lt, t) {
        rect(10, 200, 300, 190, "#b8b4ac"); rect(10, 330, 300, 60, "#8a8682");
        rect(30, 230, 120, 70, "#5a5652"); for (var s = 0; s < 3; s++) rect(40 + s * 36, 240, 28, 50, "#e8e4dc");
        var p = T.stand({ upperF: 2.8, lowerF: -0.6, upperB: 2.6, lowerB: -0.4, neck: -0.2, brow: 1 });
        JEW.draw(ctx, 220, 330 - 48 * 1.15, 1.15, p, st(JEW_C, { dir: -1, brow: 1 }));
      }, false, function (lt) { T.bubble(ctx, 130, 225, "Die Kette meiner Frau – fort!", 196, 262, { font: HAND, size: 14, maxW: 140 }); }],
      [320, 200, 310, 190, 5, function (lt, t) {
        rect(320, 200, 310, 190, grad(320, 200, 630, 390, ["#8a8682", "#3a3838"]));
        closeUp(DET, DET_C, T.stand({ neck: -0.1 }), 470, 300, 4.2, { light: -0.8, brow: 1, smile: -0.2 });
      }, false, function (lt) { T.bubble(ctx, 400, 236, "Ich übernehme den Fall.", 450, 262, { font: HAND, size: 14, maxW: 130 }); }]
    ],
    spuren: [
      [10, 10, 300, 230, 0, function (lt, t) {
        rect(10, 10, 300, 230, "#a8a49c");
        for (var b = 0; b < 8; b++) rect(10, 10 + b * 30, 300, 2, "#8a8680");
        pawprints(40, 200, 270, 60, 7);
        ctx.strokeStyle = "#0e0c0c"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(200, 120, 44, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(232, 152); ctx.lineTo(276, 196); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(200, 120, 42, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#0e0c0c"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(180, 100); ctx.quadraticCurveTo(200, 140, 226, 110); ctx.stroke();
      }, false, function () { T.caption(ctx, 20, 20, "Spuren … aber wovon?", { font: HAND, size: 14 }); }],
      [320, 10, 310, 230, 2, function (lt, t) {
        rect(320, 10, 310, 230, grad(320, 10, 320, 240, ["#3a3838", "#7a7672"]));
        for (var i = 0; i < 6; i++) rect(340 + i * 46, 40, 12, 40, ["#9a9690", "#5a5652", "#c8c4bc"][i % 3]);
        rect(320, 170, 310, 14, "#2a2626"); rect(320, 184, 310, 56, "#4a4644");
        var p = T.stand({ upperF: 1.3, lowerF: 1.1, neck: -0.05 });
        SUS.draw(ctx, 470, 230 - 48 * 1.1, 1.1, p, st(SUS_C, { brow: -1 }));
        rect(512, 160, 10, 12, "#e8e4dc");
      }, false, function (lt) { if (lt > BARS * 1.2) T.bubble(ctx, 392, 150, "Ich war's nicht! Ich war die ganze Nacht hier!", 452, 96, { font: HAND, size: 13, maxW: 140, loud: true }); }],
      [10, 250, 620, 140, 5, function (lt, t) {
        rect(10, 250, 620, 140, "#8a8682");
        rect(330, 262, 280, 118, "#2a2828"); skyline(330, 380, 280, 90, 7, "#141212");
        // Silhouette einer Katze auf dem Dach
        CAT.draw(ctx, 520, 318, 1.6, T.catWalk(0, 0, 2.6), st({ fur: G("#0e0c0c", "#0e0c0c"), furB: G("#0e0c0c", "#0e0c0c"), eye: "#ffffff" }));
        rect(326, 258, 288, 6, "#3a3634"); rect(326, 380, 288, 6, "#3a3634"); rect(468, 258, 6, 128, "#3a3634");
        DET.draw(ctx, 200, 390 - 48 * 1.2, 1.2, T.stand({ upperF: 1.2, lowerF: 1.6, neck: -0.25 }), st(DET_C, { light: 0 }));
      }, true, function () { T.bubble(ctx, 110, 280, "Pfotenspuren …?", 190, 320, { font: HAND, size: 14, thought: true }); }]
    ],
    jagd: [
      [10, 10, 400, 190, 0, function (lt, t) {
        rect(10, 10, 400, 190, grad(0, 10, 0, 200, ["#2a2828", "#6a6662"]));
        poly([[10, 200], [10, 150], [140, 130], [220, 150], [220, 200]], "#141212"); poly([[260, 200], [260, 140], [410, 120], [410, 200]], "#141212");
        var k = clamp(lt / (2 * BARS), 0, 1), x = lerp(150, 330, k), y = 120 - Math.sin(k * Math.PI) * 50;
        speedLines(10, 40, 300, 120, 18, -1);
        CAT.draw(ctx, x, y, 1.5, { legFF: -1.2, legFB: -1.0, legHF: 1.1, legHB: 1.3, pawFF: 0.3, pawHF: -0.3, tail1: 1.9, tail2: -0.2, neck: -0.3 }, st(CAT_C));
        necklace(x + 30, y - 4, 0.7, Math.sin(t * 6) * 0.1);
      }, true, function () { T.sfx(ctx, 110, 60, "WUSCH!", 40, "#fffdf4", -0.15, LOUD); }],
      [420, 10, 210, 190, 2, function (lt, t) {
        rect(420, 10, 210, 190, "#5a5652");
        poly([[420, 200], [420, 150], [490, 150], [490, 200]], "#141212"); poly([[560, 200], [560, 160], [630, 160], [630, 200]], "#141212");
        var k = clamp(lt / BARS, 0, 1);
        DET.draw(ctx, lerp(470, 560, k), 120 - Math.sin(k * Math.PI) * 30, 0.95, { thighF: -1.3, shinF: 1.3, thighB: 1.1, shinB: -1.0, upperF: -2.2, lowerF: 0.2, upperB: 1.8, torso: 0.25 }, st(DET_C));
        speedLines(430, 40, 120, 120, 10, -1);
      }, true, function (lt) { if (lt > BARS * 0.5) T.bubble(ctx, 580, 40, "HALT!", 548, 80, { font: LOUD, size: 18, loud: true }); }],
      [10, 210, 250, 180, 4, function (lt, t) {
        var fl = Math.max(0, 1 - lt / 0.6);
        rect(10, 210, 250, 180, fl > 0.2 ? "#e8e4dc" : "#3a3838");
        ctx.strokeStyle = "#fffff0"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(180, 210); ctx.lineTo(150, 270); ctx.lineTo(170, 280); ctx.lineTo(130, 350); ctx.stroke();
        poly([[10, 390], [10, 330], [120, 320], [260, 340], [260, 390]], "#0e0c0c");
        DET.draw(ctx, 80, 320 - 48 * 0.8, 0.8, T.walk(t * 6), st({ skin: G("#0e0c0c", "#0e0c0c"), hair: G("#0e0c0c", "#0e0c0c"), top: G("#0e0c0c", "#0e0c0c"), topB: G("#0e0c0c", "#0e0c0c"), legs: G("#0e0c0c", "#0e0c0c"), legsB: G("#0e0c0c", "#0e0c0c"), shoes: G("#0e0c0c", "#0e0c0c"), hat: G("#0e0c0c", "#0e0c0c") }));
        CAT.draw(ctx, 200, 320, 1, T.catWalk(t * 8, 1.4), st({ fur: G("#0e0c0c", "#0e0c0c"), furB: G("#0e0c0c", "#0e0c0c"), eye: "#ffffff" }));
      }, true, function () { T.sfx(ctx, 140, 240, "KRAWUMM!", 34, "#fffdf4", 0.1, LOUD); }],
      [270, 210, 360, 180, 6, function (lt, t) {
        rect(270, 210, 360, 180, "#6a6662");
        poly([[270, 390], [270, 300], [450, 250], [630, 300], [630, 390]], "#2a2626", 2);
        ctx.fillStyle = "#e8e4dc"; ctx.beginPath(); ctx.arc(450, 300, 26, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#0e0c0c"; ctx.lineWidth = 4; ctx.stroke();
        var k = clamp(lt / BARS, 0, 1);
        ctx.save(); ctx.beginPath(); ctx.rect(270, 210, 360, 180); ctx.arc(450, 300, 24, 0, Math.PI * 2, true); ctx.clip("evenodd");
        CAT.draw(ctx, lerp(380, 470, k), 312, 1.3, T.catWalk(t * 10, 1.2, 2.4), st(CAT_C));
        ctx.restore();
      }, true, function () { T.sfx(ctx, 560, 240, "HUSCH!", 30, "#fffdf4", -0.1, LOUD); }]
    ],
    enthuellung: [
      [10, 10, 620, 230, 0, function (lt, t) {
        rect(10, 10, 620, 230, grad(0, 10, 0, 240, ["#4a4644", "#9a9690"]));
        poly([[10, 10], [320, 10], [10, 140]], "#2a2626"); poly([[630, 10], [320, 10], [630, 140]], "#2a2626");
        ctx.fillStyle = "rgba(255,255,240,0.45)"; T.path(ctx, [[300, 10], [340, 10], [420, 240], [220, 240]], false); ctx.fill();
        // Nest aus glänzenden Dingen
        poly([[180, 230], [200, 200], [440, 196], [460, 230]], "#5a5450", 2);
        for (var i = 0; i < 16; i++) { var x = 210 + hash(i, 1) * 220, y = 206 + hash(i, 2) * 18; ctx.fillStyle = "#f4f0e8"; ctx.strokeStyle = "#0e0c0c"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, 5 + hash(i, 3) * 5, 2.5, hash(i, 4) * 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        necklace(330, 196, 1.3, 0);
        T.catSit(CAT, ctx, 262, 182, 2.1, st(CAT_C), { neck: Math.sin(t) * 0.05 });
        [[372, 0], [408, 1], [440, 2]].forEach(function (k2, j) { T.catSit(CAT, ctx, k2[0], 204 - Math.abs(Math.sin(t * 3 + j)) * 3, 0.85, st(KIT_C[k2[1]], { dir: -1 }), { neck: Math.sin(t * 2 + j) * 0.2 }); });
      }, false, function (lt) {
        if (lt > BARS) T.bubble(ctx, 200, 60, "Miau?", 252, 150, { font: HAND, size: 16 });
        if (lt > BARS * 2.5) T.bubble(ctx, 470, 70, "Miu!", 410, 172, { font: HAND, size: 14 });
        if (lt > BARS * 3) T.bubble(ctx, 560, 120, "Mii!", 440, 180, { font: HAND, size: 13 });
      }],
      [10, 250, 620, 140, 4, function (lt, t) {
        rect(10, 250, 620, 140, "#8a8682"); rect(10, 360, 620, 30, "#5a5450");
        var p = T.stand({ thighF: 1.5, shinF: -1.55, thighB: -0.3, shinB: -1.3, torso: 0.2, upperF: 1.2, lowerF: 0.2 });
        DET.draw(ctx, 260, 362 - 48 * 1.05 + 18, 1.05, p, st(DET_C, { smile: 1 }));
        T.catSit(CAT, ctx, 388, 352, 1.4, st(CAT_C, { dir: -1 }));
      }, false, function (lt) { if (lt > BARS * 0.9) T.bubble(ctx, 470, 285, "Du bist also mein Juwelendieb …", 330, 320, { font: HAND, size: 14, maxW: 170 }); }]
    ],
    epilog: [
      [10, 10, 380, 230, 0, function (lt, t) {
        rect(10, 10, 380, 230, grad(0, 10, 0, 240, ["#c8c4bc", "#8a8682"]));
        rect(10, 180, 380, 60, "#5a5652");
        var p = T.stand({ upperF: 1.3, lowerF: 1.4, upperB: 1.2, lowerB: 1.3, smile: 1 });
        JEW.draw(ctx, 170, 240 - 48 * 1.4, 1.4, p, st(JEW_C, { smile: 1 }));
        [[196, 150, 0], [220, 146, 1], [244, 152, 2]].forEach(function (k, j) { T.catSit(CAT, ctx, k[0], k[1] + Math.sin(t * 3 + j) * 1.5, 0.7, st(KIT_C[k[2]])); });
        necklace(206, 168, 0.9, Math.sin(t * 2) * 0.1);
      }, false, function (lt) { if (lt > BARS * 0.9) T.bubble(ctx, 300, 84, "Sie dürfen alle bleiben!", 196, 106, { font: HAND, size: 15, maxW: 130 }); }],
      [400, 10, 230, 230, 3, function (lt, t) {
        rect(400, 10, 230, 230, "#b8b4ac"); rect(400, 170, 230, 70, "#4a4644");
        for (var i = 0; i < 3; i++) rect(420 + i * 64, 40, 50, 60, "#e8e4dc");
        T.catSit(CAT, ctx, 506, 150, 2.2, st(CAT_C, { eyes: Math.sin(t * 2) > 0.7 ? 0 : 1 }));
        poly([[522, 106], [514, 98], [514, 114]], RED, 1.5); poly([[526, 106], [534, 98], [534, 114]], RED, 1.5);
      }, false, function () { T.sfx(ctx, 470, 60, "Schnurr …", 24, "#fffdf4", -0.1, LOUD); }],
      [10, 250, 620, 140, 5, function (lt, t) {
        rect(10, 250, 620, 140, grad(0, 250, 0, 390, ["#5a5652", "#c8c4bc"]));
        ctx.fillStyle = "#f8f4ec"; ctx.beginPath(); ctx.arc(520, 290, 24, 0, Math.PI * 2); ctx.fill();
        skyline(10, 360, 620, 90, 9, "#3a3838"); rect(10, 360, 620, 30, "#5a5652");
        var k = clamp(lt / (3 * BARS), 0, 1), p = T.walk(t * 3.4);
        DET.draw(ctx, lerp(260, 470, k), 360 - 48 * 0.75 - p._bob, 0.75, p, st(DET_C));
      }, false, function (lt) {
        T.caption(ctx, 24, 262, "Manche Fälle lösen sich mit einem Schnurren.", { font: HAND, size: 14, maxW: 240 });
        if (lt > BARS * 1.5) T.sfx(ctx, 530, 350, "ENDE", 36, "#fffdf4", -0.05, LOUD);
      }]
    ]
  };
  // Erscheinen in Sekunden umrechnen
  Object.keys(PAGES).forEach(function (k) { PAGES[k].forEach(function (p) { p.revealAt = M.sectionStart(k) + p[4] * BARS; }); });

  // ---------- eine Seite zeichnen ----------

  function drawPage(name, t) {
    var panels = PAGES[name];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    rect(0, 0, W, H, PAPER);
    panels.forEach(function (p) {
      var lt = t - p.revealAt;
      if (lt < 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(p[0], p[1], p[2], p[3]); ctx.clip();
      p[5](lt, t);
      ctx.restore();
      T.filters.comic(ctx, { accent: [208, 32, 32], accentHue: 0, paper: [244, 236, 220] }, [p[0], p[1], p[2], p[3]]);
      if (p[6]) { ctx.save(); ctx.beginPath(); ctx.rect(p[0], p[1], p[2], p[3]); ctx.clip(); ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1; for (var i = 0; i < 70; i++) { var x = p[0] + ((hash(i, 1) * p[2] + t * 60) % p[2]), y = p[1] + ((hash(i, 2) * p[3] + t * 420) % p[3]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12); ctx.stroke(); } ctx.restore(); }
      ctx.strokeStyle = "#0e0c0c"; ctx.lineWidth = 3; ctx.strokeRect(p[0], p[1], p[2], p[3]);
      if (p[7]) { ctx.save(); ctx.beginPath(); ctx.rect(p[0] - 4, p[1] - 4, p[2] + 8, p[3] + 8); ctx.clip(); p[7](lt); ctx.restore(); }
      // frisch erschienenes Panel blendet weich ein
      var k = clamp(lt / 0.35, 0, 1);
      if (k < 1) { ctx.fillStyle = "rgba(244,236,220," + (1 - k) + ")"; ctx.fillRect(p[0] - 2, p[1] - 2, p[2] + 4, p[3] + 4); }
    });
  }

  // ---------- ein Bild ----------

  var current = { scene: "titel", panels: 0 };
  function renderAt(t) {
    t = Math.max(0, t);
    var info = M.at(t), sec = info.section, name = sec === "ende" ? "epilog" : sec;
    drawPage(name, t);
    // Kamera: leicht zum neuesten Panel hin; am Seitenende wieder ganz zeigen, Seitenwechsel als Wischen
    var panels = PAGES[name], newest = null;
    panels.forEach(function (p) { if (t >= p.revealAt) newest = p; });
    var pageStart = M.sectionStart(name), pageEnd = pageStart + 8 * BARS, z = 1, cx = W / 2, cy = H / 2;
    if (newest && panels.length > 1 && sec !== "ende") {
      var k = ease(clamp((t - newest.revealAt) / 1.2, 0, 1)) * (1 - ease(clamp((t - (pageEnd - 2.5)) / 1.5, 0, 1)));
      z = 1 + 0.06 * k; cx = lerp(W / 2, newest[0] + newest[2] / 2, k * 0.35); cy = lerp(H / 2, newest[1] + newest[3] / 2, k * 0.35);
    }
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.fillStyle = "#1a1614"; octx.fillRect(0, 0, W, H);
    var slide = sec === "ende" ? 0 : clamp((t - (pageEnd - 0.5)) / 0.5, 0, 1), slideIn = sec === "titel" || sec === "ende" ? 0 : 1 - clamp((t - pageStart) / 0.5, 0, 1);
    octx.save(); octx.translate(W / 2 - ease(slide) * W + ease(slideIn) * W, H / 2); octx.scale(z, z); octx.translate(-cx, -cy);
    octx.drawImage(page, 0, 0); octx.restore();
    current = { scene: sec, panels: panels.filter(function (p) { return t >= p.revealAt; }).length };
    return sec;
  }

  // ---------- Ablauf ----------

  var LABELS = { titel: "Seite 1", fall: "Seite 2", spuren: "Seite 3", jagd: "Seite 4", enthuellung: "Seite 5", epilog: "Seite 6", ende: "Ende" };
  var running = false, withSound = false, clock = 0, last = null, offset = 0, frames = 0;
  var partEl = document.getElementById("part"), startEl = document.getElementById("start");
  function songTime() { var t = withSound ? M.time() : null; return t === null ? clock - offset : t; }
  function finish() { running = false; if (M.playing) M.stop(); if (startEl) startEl.hidden = false; var p = document.getElementById("play"); if (p) p.textContent = "▶ Nochmal lesen"; requestAnimationFrame(idle); }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) { last = now; return; }
    clock += last === null ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
    var t = songTime();
    if (t > M.DURATION + 1.5) { finish(); return; }
    var scene = renderAt(t); frames++;
    if (partEl && partEl.textContent !== LABELS[scene]) partEl.textContent = LABELS[scene];
  }
  function begin(sound) { withSound = sound; if (M.playing) M.stop(); if (sound) M.start(); offset = clock; running = true; if (startEl) startEl.hidden = true; var s = document.getElementById("btn-sound"); if (s) s.setAttribute("aria-pressed", String(sound)); }
  if (startEl) {
    ["pointerdown", "touchend"].forEach(function (type) { document.getElementById("play").addEventListener(type, function () { if (window.Musik) Musik.unlock(); }); });
    document.getElementById("play").addEventListener("click", function () { begin(true); });
    document.getElementById("play-silent").addEventListener("click", function () { begin(false); });
    document.getElementById("btn-sound").addEventListener("click", function () {
      if (!running) return;
      var t = songTime();
      if (M.playing) { M.stop(); withSound = false; offset = clock - t; } else { if (window.Musik) Musik.unlock(); M.start(Math.min(t, M.DURATION)); withSound = true; }
      this.setAttribute("aria-pressed", String(withSound));
    });
    document.getElementById("btn-full").addEventListener("click", function () {
      var el = document.getElementById("screen"), req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (req) { try { var r = req.call(el); if (r && r.catch) r.catch(function () {}); } catch (e) { /* kein Vollbild */ } }
    });
    document.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !running) { e.preventDefault(); begin(true); } });
  }
  var idleN = 0;
  function idle(now) { if (running) return; if (idleN++ % 4 === 0) renderAt(6 + ((now || 0) / 1000) % 8); requestAnimationFrame(idle); }
  if (document.fonts && document.fonts.load) { document.fonts.load("20px " + LOUD).catch(function () {}); document.fonts.load("14px " + HAND).catch(function () {}); }
  requestAnimationFrame(idle); requestAnimationFrame(frame);

  window.regenkatze = {
    renderAt: renderAt, get scene() { return current.scene; }, get state() { return current; }, get frames() { return frames; }, get running() { return running; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; }, duration: function () { return M.DURATION; }
  };
})();
