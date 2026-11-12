/**
 * Morgenlicht – ein Zeichentrick im Stil des animierten Dokumentarfilms der
 * 2000er (dicke Konturen, flache Farben, harte Schatten, Cutout-Figuren,
 * Parallax-Kamera und eine stark gefärbte Palette). Gebaut mit dem
 * Werkzeugkasten js/toon/toon.js.
 *
 * Geschichte: Ein Mann kann nachts nicht schlafen, geht durch die leere Stadt
 * zum Meer und sitzt allein auf dem Steg. Laternen steigen über dem Wasser auf.
 * Am Strand begegnet er einem Jungen mit einer Laterne – sich selbst als Kind.
 * Gemeinsam lassen sie die Laterne fliegen, und der Morgen bricht an.
 *
 * Jedes Bild ist eine reine Funktion der Songzeit (renderAt).
 */
(function () {
  "use strict";

  var M = window.MorgenlichtMusik, T = window.Toon;
  var canvas = document.getElementById("demo");
  if (!canvas || !M || !T) return;
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var W = 640, H = 360, BEAT = M.BEAT, BARS = M.BAR * BEAT;
  var FONT = '"Fira Sans", "Helvetica Neue", Arial, sans-serif';
  var lerp = T.lerp, clamp = T.clamp, hash = T.hash, ease = T.EASE.inOut;

  var MAN = T.human({ hairStyle: "kurz" }), KID = T.human({ child: true, hairStyle: "kurz" }), CAT = T.cat();
  var MAN_C = { skin: ["#d8a07a", "#8a5a40"], hair: ["#2a2220", "#141010"], top: ["#4a5a6a", "#262e3a"], topB: ["#3e4c5a", "#1e2630"], legs: ["#2e3038", "#16181e"], legsB: ["#26282e", "#121418"], shoes: ["#1e1814", "#0e0a08"] };
  var KID_C = { skin: ["#e8b88a", "#9a6a48"], hair: ["#3a2a1e", "#1a120c"], top: ["#e0703a", "#904020"], topB: ["#c0602e", "#7a361a"], legs: ["#3a4a6a", "#1e2638"], legsB: ["#32405c", "#1a2030"], shoes: ["#e8e0d0", "#8a8478"] };
  var CAT_C = { fur: ["#2a2626", "#121010"], furB: ["#1e1a1a", "#0a0808"], eye: "#f0d040" };

  // Paletten (dunkel → hell); die Szenen werden über ihre Helligkeit eingefärbt
  var PAL = {
    nacht: ["#040508", "#121a2c", "#2e2c44", "#a85e2a", "#f8c04a", "#fff0b0"],
    meer: ["#02050a", "#0c1e34", "#24425e", "#c8823a", "#ffd878", "#fff6d0"],
    morgen: ["#1a0c18", "#5a2440", "#d0604a", "#ffa860", "#ffd89a", "#fffaf0"]
  };
  function hex(c) { var n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function toHex(a) { return "#" + a.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join(""); }
  function mixPal(a, b, k) { return a.map(function (c, i) { var x = hex(c), y = hex(b[i]); return toHex([0, 1, 2].map(function (j) { return lerp(x[j], y[j], k); })); }); }

  // Untertitel: [Abschnitt, Takt, Dauer in Takten, Text]
  var SUBS = [
    ["erwachen", 1, 3, "Manche Nächte sind länger als andere."],
    ["stadt", 1, 3, "Ich lief durch die leere Stadt."],
    ["stadt", 5, 3, "Dann sah ich die Lichter über dem Meer."],
    ["meer", 1, 3, "Ich erinnere mich an das Meer."],
    ["meer", 5, 3, "Es war still. Ich war allein."],
    ["erinnerung", 0, 3, "Und an einen Jungen mit einer Laterne."],
    ["erinnerung", 5, 3, "Er sagte: „Lass sie fliegen.“"],
    ["morgen", 1, 3, "Und dann kam der Morgen."],
    ["morgen", 5, 4, "Manche Nächte sind lang. Aber der Morgen kommt immer."]
  ].map(function (s) { return [M.sectionStart(s[0]) + s[1] * BARS, s[2] * BARS, s[3]]; });

  // ---------- Hilfen ----------

  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function polyFill(pts, c, ink) { T.path(ctx, pts, false); ctx.fillStyle = c; ctx.fill(); if (ink) { ctx.strokeStyle = "#0e0a08"; ctx.lineWidth = ink; ctx.lineJoin = "round"; ctx.stroke(); } }
  function sky(stops, y0, y1) { var g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); }); ctx.fillStyle = g; ctx.fillRect(-400, y0, W + 800, y1 - y0); }
  function glow(x, y, r, color, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r), c = hex(color);
    g.addColorStop(0, "rgba(" + c + "," + a + ")"); g.addColorStop(1, "rgba(" + c + ",0)");
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function style(colors, extra) { var s = { light: -2.2, inkW: 2, shadowSize: 3.5, colors: colors }; for (var k in extra || {}) s[k] = extra[k]; return s; }
  function building(x, w, h, base, col, seed, lit) {
    polyFill([[x, base], [x, base - h], [x + w, base - h], [x + w, base]], col, 2);
    for (var r = 0; r < Math.floor((h - 14) / 16); r++) for (var c = 0; c < Math.floor((w - 8) / 12); c++) {
      var on = hash(seed + c, r) < lit;
      rect(x + 6 + c * 12, base - h + 10 + r * 16, 6, 9, on ? "#ffd070" : "#1a1a26");
    }
  }
  /** Papierlaterne mit Leuchten */
  function lantern(x, y, s, t, seed) {
    var sw = Math.sin(t * 1.3 + seed) * 2 * s;
    glow(x + sw, y, 26 * s, "#ffb040", 0.55);
    polyFill([[x + sw - 6 * s, y - 8 * s], [x + sw + 6 * s, y - 8 * s], [x + sw + 7 * s, y + 6 * s], [x + sw - 7 * s, y + 6 * s]], "#ffd890", Math.max(0.8, 1.6 * s));
    rect(x + sw - 3 * s, y + 6 * s, 6 * s, 2 * s, "#ffe8b0");
  }
  function lanternsRising(t, t0, n, x0, x1, yStart, speed, scale) {
    for (var i = 0; i < n; i++) {
      var start = t0 + hash(i, 3) * 8, age = t - start;
      if (age < 0) continue;
      var x = lerp(x0, x1, hash(i, 1)) + Math.sin(age * 0.5 + i) * 10, y = yStart - age * speed * (0.6 + hash(i, 2) * 0.6), s = scale * (0.5 + hash(i, 4) * 0.5) * clamp(1 - (yStart - y) / 600, 0.35, 1);
      if (y < -40) continue;
      lantern(x, y, s, t, i);
    }
  }
  function sub(str, k) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "15px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.globalAlpha = clamp(Math.min(k * 6, (1 - k) * 6), 0, 1);
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineJoin = "round"; ctx.strokeText(str, W / 2, H - 26);
    ctx.fillStyle = "#fff8e8"; ctx.fillText(str, W / 2, H - 26);
    ctx.restore();
  }

  // ---------- Szenen ----------

  var cam = T.camera(W, H);

  function sceneErwachen(t, info) {
    var bt = info.beat - M.SECTIONS[0].start * M.BAR, z = 1 + bt / 24 * 0.12;
    cam.x = W / 2; cam.y = H / 2; cam.zoom = z; cam.rot = 0;
    cam.layer(ctx, 1, function () {
      rect(-100, -100, W + 200, H + 200, "#262636");
      for (var i = 0; i < 6; i++) rect(-100, 40 + i * 48, W + 200, 2, "#2e2e40");
      // Fenster mit nächtlicher Stadt
      ctx.save(); T.path(ctx, [[380, 50], [570, 50], [570, 230], [380, 230]], false); ctx.clip();
      sky(["#0a0a1a", "#3a2240", "#c86a2a"], 50, 230);
      for (var b = 0; b < 8; b++) building(372 + b * 26, 22, 50 + hash(b, 7) * 90, 232, "#141420", b, 0.4);
      ctx.restore();
      polyFill([[376, 46], [574, 46], [574, 234], [376, 234]], "rgba(0,0,0,0)", 5);
      rect(470, 46, 5, 188, "#141420"); rect(376, 136, 198, 5, "#141420");
      glow(475, 140, 160, "#ff9a40", 0.25);
      // Bett
      polyFill([[60, 300], [60, 240], [76, 240], [76, 262], [360, 262], [360, 300]], "#3a2e2a", 2);
      polyFill([[70, 266], [80, 250], [350, 252], [356, 268]], "#7a8aa0", 2);
      // der Mann: liegt, setzt sich auf, steht auf und geht zum Fenster
      var sit = ease(clamp((bt - 16) / 3, 0, 1)), stand = clamp((bt - 20) / 4, 0, 1), blink = Math.sin(t * 1.7) > 0.96 ? 0.1 : 1;
      if (stand <= 0) {
        ctx.save(); ctx.translate(lerp(150, 200, sit), lerp(254, 250, sit)); ctx.rotate(lerp(-Math.PI / 2, 0, sit));
        MAN.draw(ctx, 0, 0, 1.15, T.stand({ thighF: lerp(0, 1.5, sit), shinF: lerp(0, -1.5, sit), thighB: lerp(0, 1.4, sit), shinB: lerp(0, -1.4, sit), upperF: 0.3, lowerF: 0.3, neck: lerp(0, -0.2, sit) }), style(MAN_C, { eyes: blink, light: lerp(-2.2, 0, sit) }));
        ctx.restore();
        polyFill([[180, 250], [360, 252], [356, 268], [176, 266]], "#7a8aa0", 2);
      } else {
        var x = lerp(220, 440, ease(stand)), p = stand < 1 ? T.walk(t * 5) : T.stand({ neck: -0.15 });
        MAN.draw(ctx, x, 262 - 48 * 1.15 - (p._bob || 0), 1.15, p, style(MAN_C, { light: -0.3 }));
      }
    });
    return "nacht";
  }

  function sceneStadt(t, info) {
    var bt = info.beat - M.SECTIONS[1].start * M.BAR, stop = clamp((bt - 24) / 3, 0, 1);
    var walked = bt < 24 ? bt * 0.6 * BEAT * 60 : 24 * 0.6 * BEAT * 60 + (1 - Math.pow(1 - stop, 2)) * 40;
    var mx = 160 + walked;
    cam.x = mx + 80; cam.y = H / 2 - stop * 30; cam.zoom = 1; cam.rot = 0;
    cam.layer(ctx, 0, function () { sky(["#050510", "#2a1a30", "#a0502a", "#e08a3a"], 0, H); });
    cam.layer(ctx, 0.15, function () { lanternsRising(t, M.sectionStart("stadt") + 5 * BARS, 14, 380, 1000, 330, 12, 0.5); });
    cam.layer(ctx, 0.25, function () { for (var b = -2; b < 30; b++) building(b * 46 + 40, 40, 90 + hash(b, 1) * 120, 330, "#1a1426", b + 50, 0.25); });
    cam.layer(ctx, 0.55, function () { for (var b = -2; b < 22; b++) building(b * 90, 76, 120 + hash(b, 2) * 100, 320, "#100c18", b, 0.45); });
    cam.layer(ctx, 1, function () {
      rect(-200, 300, 3000, 80, "#201a20"); rect(-200, 298, 3000, 4, "#3a3238");
      for (var l = -1; l < 16; l++) {
        var lx = l * 160;
        polyFill([[lx - 2, 300], [lx - 2, 170], [lx + 2, 170], [lx + 2, 300]], "#0e0a0e", 1.5);
        polyFill([[lx - 2, 170], [lx + 18, 170], [lx + 18, 176], [lx - 2, 176]], "#0e0a0e", 1.5);
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,200,90,0.22)";
        T.path(ctx, [[lx + 10, 176], [lx - 40, 300], [lx + 60, 300]], false); ctx.fill(); ctx.restore();
        glow(lx + 10, 178, 22, "#ffd070", 0.8);
      }
      var p = stop < 1 ? T.walk(t * 4.2, 1 - stop * 0.8) : T.stand({ neck: -0.45, torso: -0.05 });
      MAN.draw(ctx, mx, 300 - 48 - (p._bob || 0), 1, p, style(MAN_C, { light: -1.2 }));
      // eine Katze huscht vorbei
      var ck = clamp((bt - 12) / 6, 0, 1);
      if (ck > 0 && ck < 1) CAT.draw(ctx, mx + lerp(260, -160, ck), 330, 0.9, T.catWalk(t * 9, 1.2), style(CAT_C, { dir: -1, light: -1.2 }));
    });
    return "nacht";
  }

  function sceneMeer(t, info) {
    var bt = info.beat - M.SECTIONS[2].start * M.BAR;
    cam.x = W / 2 + 40; cam.y = H / 2; cam.zoom = 1 + bt / 32 * 0.15; cam.rot = 0;
    cam.layer(ctx, 0, function () {
      sky(["#02040a", "#0e1a30", "#2a2a4a", "#6a3a3a"], 0, 210);
      for (var s = 0; s < 70; s++) rect(hash(s, 1) * W, hash(s, 2) * 170, 1.5, 1.5, "#fff4d0");
    });
    cam.layer(ctx, 0.3, function () {
      rect(-200, 210, W + 400, 200, "#0a1828");
      for (var r = 0; r < 26; r++) { var y = 214 + r * r * 0.25; rect(-200 + ((r * 37 + t * 8) % 60), y, W + 400, 1, "#163050"); }
      lanternsRising(t, M.sectionStart("meer") - 2, 26, 60, 700, 214, 10, 0.55);
      // Spiegelungen der Laternen im Wasser
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,180,70,0.12)";
      for (var i = 0; i < 18; i++) { var lx = lerp(60, 700, hash(i, 1)); for (var k = 0; k < 6; k++) rect(lx + Math.sin(t * 2 + k + i) * 3, 216 + k * 8, 8 - k, 3, "rgba(255,180,70,0.18)"); }
      ctx.restore();
    });
    cam.layer(ctx, 1, function () {
      // Steg
      polyFill([[-100, 262], [400, 262], [400, 272], [-100, 272]], "#3a2a20", 2);
      for (var pl = -4; pl < 18; pl++) rect(pl * 24, 262, 2, 10, "#1e140e");
      for (var po = -1; po < 6; po++) polyFill([[po * 80, 272], [po * 80, 340], [po * 80 + 8, 340], [po * 80 + 8, 272]], "#1e140e", 1.5);
      // der Mann sitzt am Ende des Stegs, die Beine baumeln
      var dangle = Math.sin(t * 1.2) * 0.12;
      MAN.draw(ctx, 352, 262, 1.05, T.stand({ thighF: 1.45, shinF: -1.35 + dangle, thighB: 1.35, shinB: -1.25 - dangle, torso: 0.12, neck: -0.05, upperF: 0.4, lowerF: 0.6, upperB: 0.3, lowerB: 0.5 }), style(MAN_C, { light: -0.6 }));
    });
    return "meer";
  }

  function sceneErinnerung(t, info) {
    var bt = info.beat - M.SECTIONS[3].start * M.BAR;
    cam.x = W / 2; cam.y = H / 2; cam.zoom = 1.05; cam.rot = 0;
    cam.layer(ctx, 0, function () { sky(["#03050c", "#14223a", "#3a3450", "#8a4a3a"], 0, 200); for (var s = 0; s < 60; s++) rect(hash(s, 5) * W, hash(s, 6) * 160, 1.5, 1.5, "#fff4d0"); });
    cam.layer(ctx, 0.2, function () { lanternsRising(t, M.sectionStart("meer"), 30, 0, 640, 200, 10, 0.45); rect(-100, 196, W + 200, 60, "#0c1a2c"); for (var r = 0; r < 8; r++) rect(-100, 200 + r * 7, W + 200, 1, "#1a3456"); });
    cam.layer(ctx, 1, function () {
      polyFill([[-100, 250], [740, 236], [740, 400], [-100, 400]], "#8a7458", 2);
      // Brandung: wellige Schaumkanten, die heranrollen
      for (var w = 0; w < 2; w++) {
        var wy = 244 - w * 5 + Math.sin(t * 0.7 + w * 2) * 3, pts = [];
        for (var x = -100; x <= 740; x += 20) pts.push([x, wy - (x + 100) / 840 * 14 + Math.sin(x * 0.05 + t * 1.5 + w) * 2]);
        ctx.strokeStyle = w ? "#5a7088" : "#a8b8c8"; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke();
      }
      var come = ease(clamp(bt / 14, 0, 1)), kneel = ease(clamp((bt - 20) / 3, 0, 1)), give = ease(clamp((bt - 22) / 3, 0, 1));
      var mx = 250, kx = lerp(620, 340, come);
      // Junge mit Laterne kommt näher
      var kp = come < 1 ? T.walk(t * 6, 0.9) : T.stand({});
      var reach = T.ik(17 * 0.62, 16 * 0.62, lerp(8, 14, give), lerp(-6, -20, give), false);
      kp.upperF = reach[0]; kp.lowerF = reach[1];
      var kh = KID.draw(ctx, kx, 330 - 48 * 0.62 * 1.3 - (kp._bob || 0), 1.3, kp, style(KID_C, { dir: -1, light: -1.6, smile: come >= 1 ? 1 : 0.3 }));
      var hand = KID.point("handF", kx, 330 - 48 * 0.62 * 1.3 - (kp._bob || 0), 1.3, kp, -1);
      // der Mann kniet sich hin
      var mp = T.stand({ thighF: lerp(0, 1.5, kneel), shinF: lerp(0, -1.55, kneel), thighB: lerp(0, -0.3, kneel), shinB: lerp(0, -1.3, kneel), torso: kneel * 0.15 });
      var r2 = T.ik(17, 16, lerp(4, 18, give), lerp(4, -14, give), false); mp.upperF = r2[0]; mp.lowerF = r2[1];
      MAN.draw(ctx, mx, 330 - 48 * 1.1 + kneel * 18, 1.1, mp, style(MAN_C, { light: -0.4, smile: give }));
      lantern(hand[0] - 6, hand[1] - 14, 1.4, t, 0);
    });
    return "meer";
  }

  function sceneMorgen(t, info, ende) {
    var bt = ende ? 40 : info.beat - M.SECTIONS[4].start * M.BAR, rise = clamp(bt / 12, 0, 1), dawn = ease(clamp((bt - 4) / 16, 0, 1)), sun = ease(clamp((bt - 8) / 16, 0, 1));
    var tilt = ease(clamp(bt / 6, 0, 1)) * (1 - ease(clamp((bt - 18) / 6, 0, 1)));
    cam.x = W / 2; cam.y = H / 2 - tilt * 120; cam.zoom = 1; cam.rot = 0;
    cam.layer(ctx, 0.5, function () {
      sky([toHex([lerp(3, 70, dawn), lerp(5, 70, dawn), lerp(12, 150, dawn)]), toHex([lerp(20, 200, dawn), lerp(34, 100, dawn), lerp(58, 110, dawn)]), toHex([lerp(58, 240, dawn), lerp(52, 150, dawn), lerp(80, 100, dawn)])], -200, 205);
      for (var s = 0; s < 60; s++) { ctx.globalAlpha = 1 - dawn; rect(hash(s, 5) * W, hash(s, 6) * 300 - 160, 1.5, 1.5, "#fff4d0"); } ctx.globalAlpha = 1;
      var sy = lerp(250, 150, sun); glow(W / 2, sy, 260, "#ffb060", 0.6 * sun + 0.1);
      ctx.beginPath(); ctx.arc(W / 2, sy, 46, 0, Math.PI * 2); ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#ffd890"; ctx.stroke();
      lanternsRising(t, M.sectionStart("meer"), 40, -100, 740, 205, 10, 0.5);
      rect(-200, 200, W + 400, 70, toHex([lerp(12, 200, dawn), lerp(26, 120, dawn), lerp(44, 110, dawn)]));
      for (var r = 0; r < 10; r++) rect(-200, 204 + r * 6, W + 400, 1, toHex([lerp(26, 255, dawn), lerp(52, 200, dawn), lerp(86, 150, dawn)]));
      for (r = 0; r < 12; r++) rect(W / 2 - 40 + Math.sin(t * 2 + r) * 6, 206 + r * 5, 80 - r * 5, 2, "rgba(255,230,170," + sun * 0.6 + ")");
    });
    cam.layer(ctx, 1, function () {
      polyFill([[-100, 250], [740, 236], [740, 500], [-100, 500]], "#8a7458", 2);
      var walk = clamp((bt - 30) / 10, 0, 1);
      // die Laterne steigt von den Händen in den Himmel
      lantern(W / 2 - 30 + Math.sin(t) * 10, lerp(262, -140, ease(rise)), lerp(1.4, 0.6, rise), t, 1);
      if (bt > 4 && bt < 34) for (var bd = 0; bd < 5; bd++) { var bx = ((t * 30 + bd * 60) % 900) - 150, by = 40 - bd * 12 + Math.sin(t * 2 + bd) * 6; ctx.strokeStyle = "#1a1010"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 6, by - 3); ctx.quadraticCurveTo(bx - 3, by - 6 + Math.sin(t * 9 + bd) * 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 6 + Math.sin(t * 9 + bd) * 3, bx + 6, by - 3); ctx.stroke(); }
      var mx = lerp(270, 520, ease(walk)), mp = walk > 0 && walk < 1 ? T.walk(t * 4.5) : T.stand({ neck: bt < 14 ? -0.5 : -0.1, upperF: bt < 3 ? 2.6 : 0.1, lowerF: bt < 3 ? -0.4 : 0.15 });
      MAN.draw(ctx, mx, 330 - 48 * 1.1 - (mp._bob || 0), 1.1, mp, style(MAN_C, { light: -1.57, smile: 1 }));
      // der Junge winkt und läuft ins Licht
      var kidGo = clamp((bt - 22) / 6, 0, 1), kx = lerp(330, 760, ease(kidGo)), kp = kidGo > 0 ? T.walk(t * 6) : T.stand({ upperF: bt < 3 ? 2.7 : 2.6 + Math.sin(t * 6) * 0.3, lowerF: -0.3 });
      if (kidGo < 1) KID.draw(ctx, kx, 330 - 48 * 0.62 * 1.3 - (kp._bob || 0), 1.3, kp, style(KID_C, { light: -1.57, smile: 1, dir: kidGo > 0 ? 1 : -1 }));
    });
    return dawn;
  }

  // ---------- ein Bild ----------

  var current = { scene: "erwachen" };
  function renderAt(t) {
    t = Math.max(0, t);
    var info = M.at(t), sec = info.section, pal;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    rect(0, 0, W, H, "#000");
    if (sec === "erwachen") pal = PAL[sceneErwachen(t, info)];
    else if (sec === "stadt") pal = PAL[sceneStadt(t, info)];
    else if (sec === "meer") pal = PAL[sceneMeer(t, info)];
    else if (sec === "erinnerung") pal = PAL[sceneErinnerung(t, info)];
    else { var dawn = sceneMorgen(t, info, sec === "ende"); pal = mixPal(PAL.meer, PAL.morgen, dawn); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    T.filters.gradientMap(ctx, pal, 0, null, sec === "morgen" || sec === "ende" ? lerp(0.82, 0.55, clamp((t - M.sectionStart("morgen")) / 20, 0, 1)) : 0.82);
    T.filters.vignette(ctx, 0.55);
    T.filters.grain(ctx, 0.05, Math.floor(t * 24));
    // weiche Übergänge zwischen den Szenen (Abblende ins Schwarze)
    var secStart = sec === "ende" ? Infinity : M.sectionStart(sec), into = t - secStart, left = (sec === "ende" ? Infinity : secStart + M.SECTIONS[info.index].bars * BARS) - t;
    var fade = sec === "ende" ? 0 : Math.max(clamp(1 - into / 0.8, 0, 1), sec !== "morgen" ? clamp(1 - left / 0.8, 0, 1) : 0, t < 1.5 ? 1 - t / 1.5 : 0);
    if (fade > 0) { ctx.fillStyle = "rgba(0,0,0," + fade + ")"; ctx.fillRect(0, 0, W, H); }
    var said = "";
    SUBS.forEach(function (s) { if (t >= s[0] && t < s[0] + s[1]) { sub(s[2], (t - s[0]) / s[1]); said = s[2]; } });
    if (sec === "ende" || (sec === "morgen" && info.bar >= 8)) {
      ctx.save(); ctx.font = "bold 34px " + FONT; ctx.textAlign = "center"; ctx.letterSpacing = "8px";
      ctx.globalAlpha = sec === "ende" ? 1 : clamp((info.progress * 10 - 8) / 1, 0, 1);
      ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,10,10,0.7)"; ctx.strokeText("MORGENLICHT", W / 2, 70); ctx.fillStyle = "#fff6e0"; ctx.fillText("MORGENLICHT", W / 2, 70); ctx.restore();
    }
    current = { scene: sec, said: said };
    return sec;
  }

  // ---------- Ablauf ----------

  var LABELS = { erwachen: "Erwachen", stadt: "Die Stadt", meer: "Das Meer", erinnerung: "Die Erinnerung", morgen: "Der Morgen", ende: "Ende" };
  var running = false, withSound = false, clock = 0, last = null, offset = 0, frames = 0;
  var partEl = document.getElementById("part"), startEl = document.getElementById("start");
  function songTime() { var t = withSound ? M.time() : null; return t === null ? clock - offset : t; }
  function finish() { running = false; if (M.playing) M.stop(); if (startEl) startEl.hidden = false; var p = document.getElementById("play"); if (p) p.textContent = "▶ Nochmal"; requestAnimationFrame(idle); }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) { last = now; return; }
    clock += last === null ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
    var t = songTime();
    if (t > M.DURATION + 1) { finish(); return; }
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
  function idle(now) { if (running) return; if (idleN++ % 3 === 0) renderAt(52 + ((now || 0) / 1000) % 6); requestAnimationFrame(idle); }
  requestAnimationFrame(idle); requestAnimationFrame(frame);

  window.morgenlicht = {
    renderAt: renderAt, get scene() { return current.scene; }, get state() { return current; }, get frames() { return frames; }, get running() { return running; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; }, duration: function () { return M.DURATION; }
  };
})();
