/**
 * Toon – kleiner Werkzeugkasten für Zeichentrick und Comic im Browser.
 *
 *   Toon.track(keys)        Zeitleiste: Keyframes [Zeit, Wert, Easing] → Wert(t)
 *   Toon.camera(...)        Kamera mit Zoom/Drehung und Parallax-Ebenen
 *   Toon.figure(def)        Figur mit Gelenk-Gerüst, Posen und Zeichenreihenfolge
 *   Toon.ik(a, b, target)   Zwei-Knochen-IK (Hand/Fuß an einen Zielpunkt)
 *   Toon.human(opts), Toon.cat(opts)   fertige Figuren (Seitenansicht)
 *   Toon.walk(phase), Toon.catWalk(phase)   Lauf-Zyklen als Posen
 *   Toon.shaded(...)        Cel-Fläche: Grundfarbe, harter Schatten, Tuschekontur
 *   Toon.filters            Nachbearbeitung: gradientMap, posterize, inkEdges,
 *                           comic (Schwarz/Schraffur/Raster/Akzentfarbe), grain, vignette
 *   Toon.bubble/caption/sfx Sprechblasen, Erzählkästen, Lautwörter
 *
 * Alles arbeitet auf einem Canvas-2D-Kontext und ist eine reine Funktion der
 * übergebenen Zeit – damit lassen sich Demos auch Bild für Bild als Video rendern.
 */
(function (global) {
  "use strict";

  // ---------- Mathematik ----------

  function hash(x, y) { var h = Math.sin(x * 127.1 + (y || 0) * 311.7) * 43758.5453; return h - Math.floor(h); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  var EASE = {
    linear: function (k) { return k; },
    inOut: function (k) { return k * k * (3 - 2 * k); },
    in: function (k) { return k * k; },
    out: function (k) { return 1 - (1 - k) * (1 - k); },
    back: function (k) { var s = 1.7; k -= 1; return k * k * ((s + 1) * k + s) + 1; },
    hold: function () { return 0; }
  };
  /** glattes 1D-Rauschen (für Wackeln, Wind, Atmen) */
  function noise(x) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }

  /**
   * Zeitleiste. keys: [[t, wert, easing?], …] – wert darf Zahl oder Array sein.
   * Das Easing eines Keys gilt für den Übergang ZU diesem Key.
   */
  function track(keys) {
    keys = keys.slice().sort(function (a, b) { return a[0] - b[0]; });
    return function (t) {
      if (t <= keys[0][0]) return keys[0][1];
      for (var i = 1; i < keys.length; i++) {
        if (t <= keys[i][0]) {
          var a = keys[i - 1], b = keys[i], k = (EASE[b[2] || "inOut"])((t - a[0]) / (b[0] - a[0]));
          if (Array.isArray(a[1])) return a[1].map(function (v, j) { return lerp(v, b[1][j], k); });
          return lerp(a[1], b[1], k);
        }
      }
      return keys[keys.length - 1][1];
    };
  }

  // ---------- Kamera ----------

  /** Kamera: x/y = Blickpunkt in Weltkoordinaten, zoom, rot. depth < 1 = weiter weg (Parallax). */
  function camera(W, H) {
    var cam = { x: W / 2, y: H / 2, zoom: 1, rot: 0, W: W, H: H };
    cam.apply = function (ctx, depth) {
      var d = depth === undefined ? 1 : depth;
      ctx.translate(W / 2, H / 2); ctx.rotate(cam.rot * d); ctx.scale(lerp(1, cam.zoom, d), lerp(1, cam.zoom, d));
      ctx.translate(-lerp(W / 2, cam.x, d), -lerp(H / 2, cam.y, d));
    };
    cam.layer = function (ctx, depth, fn) { ctx.save(); cam.apply(ctx, depth); fn(); ctx.restore(); };
    return cam;
  }

  // ---------- Gelenk-Gerüst ----------

  /** Zwei-Knochen-IK: liefert Winkel (0 = nach unten, positiv = nach vorn) für Ober- und Unterglied. */
  function ik(l1, l2, tx, ty, bendForward) {
    var d = clamp(Math.hypot(tx, ty), 0.001, l1 + l2 - 0.001);
    var a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    var b = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
    var base = Math.atan2(tx, ty), s = bendForward ? 1 : -1;
    return [base + s * a, s * (b - Math.PI)];
  }

  /**
   * Figur aus Knochen. def.bones: [{ name, parent, at: [x, y] (am Elternknochen, lokal), len, draw(ctx, bone, style) }]
   * def.order: Zeichenreihenfolge (Namen). Pose: { name: Winkel } (relativ zum Elternknochen, 0 = nach unten).
   */
  function figure(def) {
    var byName = {};
    def.bones.forEach(function (b) { byName[b.name] = b; });
    function world(pose) {
      var W = {};
      def.bones.forEach(function (b) {
        var p = b.parent ? W[b.parent] : { x: 0, y: 0, a: 0 }, at = b.at || [0, b.parent ? byName[b.parent].len : 0];
        var ca = Math.cos(p.a), sa = Math.sin(p.a);
        var x = p.x + at[0] * ca - at[1] * sa, y = p.y + at[0] * sa + at[1] * ca;
        W[b.name] = { x: x, y: y, a: p.a - (pose[b.name] || 0) };
      });
      return W;
    }
    return {
      def: def,
      world: world,
      /** zeichnen: x/y = Ursprung (Hüfte), s = Größe, dir = 1 rechts / -1 links */
      draw: function (ctx, x, y, s, pose, style) {
        var Wd = world(pose || {});
        ctx.save(); ctx.translate(x, y); ctx.scale(s * (style.dir || 1), s);
        var st = Object.create(style); st.scale = s;
        (def.order || def.bones.map(function (b) { return b.name; })).forEach(function (name) {
          var b = byName[name], w = Wd[name];
          if (!b.draw) return;
          ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.a);
          st.boneAngle = w.a * (style.dir || 1);
          b.draw(ctx, b, st, pose || {});
          ctx.restore();
        });
        ctx.restore();
        return Wd;
      },
      /** Weltposition eines Knochenendes (z. B. für Hände, Sprechblasen) */
      point: function (name, x, y, s, pose, dir, along) {
        var Wd = world(pose || {}), b = byName[name], w = Wd[name], l = along === undefined ? b.len : along;
        var ex = w.x - l * Math.sin(w.a), ey = w.y + l * Math.cos(w.a);
        return [x + ex * s * (dir || 1), y + ey * s];
      }
    };
  }

  // ---------- Cel-Zeichnung ----------

  function pathOf(ctx, pts, smooth) {
    ctx.beginPath();
    if (!smooth) { pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); return; }
    var n = pts.length;
    ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (var i = 1; i <= n; i++) { var p = pts[i % n], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  }
  /**
   * Cel-Fläche: Grundfarbe, harter Schatten auf der lichtabgewandten Seite, Tuschekontur.
   * style: { ink, inkW, light: Winkel in Weltkoordinaten (zum Licht hin), shadow: Anteil, scale, boneAngle }
   */
  function shaded(ctx, pts, base, shadowCol, style, smooth) {
    var s = style.scale || 1, la = (style.light === undefined ? -2.3 : style.light) - (style.boneAngle || 0), o = (style.shadowSize || 4) / s;
    pathOf(ctx, pts, smooth);
    ctx.fillStyle = shadowCol || base; ctx.fill();
    if (shadowCol && shadowCol !== base) {
      ctx.save(); pathOf(ctx, pts, smooth); ctx.clip();
      ctx.translate(Math.cos(la) * o * (style.dir || 1), Math.sin(la) * o);
      pathOf(ctx, pts, smooth); ctx.fillStyle = base; ctx.fill(); ctx.restore();
    }
    if (style.ink !== false) { pathOf(ctx, pts, smooth); ctx.lineJoin = "round"; ctx.strokeStyle = style.ink || "#120c0a"; ctx.lineWidth = (style.inkW || 2) / s; ctx.stroke(); }
  }
  /** Glied als Kapsel entlang der Knochenachse (0..len), Breite w0 → w1 */
  function limbPts(len, w0, w1) {
    var pts = [], n = 6, i, a;
    for (i = 0; i <= n; i++) { a = Math.PI + i / n * Math.PI; pts.push([Math.cos(a) * w0 / 2, Math.sin(a) * w0 / 2 * 0.9]); }   // obere Kappe
    for (i = 0; i <= n; i++) { a = i / n * Math.PI; pts.push([Math.cos(a) * w1 / 2, len + Math.sin(a) * w1 / 2 * 0.9]); }       // untere Kappe
    return pts;
  }
  function limb(w0, w1, colorKey) {
    return function (ctx, b, st) { var c = st.colors[colorKey]; shaded(ctx, limbPts(b.len, w0, w1), c[0], c[1], st, true); };
  }

  // ---------- fertige Figuren ----------

  /**
   * Mensch in Seitenansicht (Blick nach +x). opts: { colors: { skin, hair, top, legs, shoes } je [Licht, Schatten],
   * child: true für kindliche Proportionen, coat: Mantel, hat: Hut, hairStyle: "kurz" | "lang" }
   */
  function human(opts) {
    var k = opts.child ? 0.62 : 1, hk = opts.child ? 1.25 : 1, C = opts;
    function head(ctx, b, st) {
      var c = st.colors.skin, r = 9 * hk;
      if (C.hairStyle === "lang") shaded(ctx, [[-r * 0.9, -r * 0.4], [-r * 1.6, r * 1.6], [-r * 0.2, r * 1.4], [0, 0]], st.colors.hair[0], st.colors.hair[1], st, true);
      shaded(ctx, [[-r, -r * 0.2], [-r * 0.6, -r * 1.1], [r * 0.4, -r * 1.15], [r * 1.0, -r * 0.5], [r * 1.05, r * 0.1], [r * 1.35, r * 0.35], [r * 1.0, r * 0.55], [r * 0.95, r * 0.9], [r * 0.4, r * 1.25], [-r * 0.5, r * 1.0]], c[0], c[1], st, false);
      // Auge, Braue, Mund
      var ink = st.ink || "#120c0a";
      ctx.strokeStyle = ink; ctx.lineWidth = 1.6 / st.scale; ctx.lineCap = "round";
      var open = st.eyes === undefined ? 1 : st.eyes;
      ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.05); ctx.lineTo(r * 0.75, -r * 0.08 + (1 - open) * r * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.38, -r * 0.35 - (st.brow || 0) * r * 0.1); ctx.lineTo(r * 0.82, -r * 0.42 + (st.brow || 0) * r * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.7, r * 0.72); ctx.quadraticCurveTo(r * 0.82, r * 0.72 + (st.smile || 0) * r * 0.18, r * 0.95, r * 0.66 - (st.smile || 0) * r * 0.08); ctx.stroke();
      // Haare
      if (C.hairStyle !== "kahl") shaded(ctx, [[-r * 1.05, r * 0.3], [-r * 1.1, -r * 0.6], [-r * 0.5, -r * 1.25], [r * 0.6, -r * 1.25], [r * 1.05, -r * 0.6], [r * 0.6, -r * 0.75], [r * 0.1, -r * 0.6], [-r * 0.3, -r * 0.1], [-r * 0.6, r * 0.4]], st.colors.hair[0], st.colors.hair[1], st, true);
      ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.15, r * 0.22, 0, Math.PI * 2); ctx.stroke();
      if (C.hat) {
        shaded(ctx, [[-r * 1.7, -r * 0.6], [r * 1.7, -r * 0.6], [r * 1.5, -r * 0.85], [-r * 1.5, -r * 0.85]], st.colors.hat[0], st.colors.hat[1], st, false);
        shaded(ctx, [[-r * 0.9, -r * 0.8], [r * 0.9, -r * 0.8], [r * 0.7, -r * 1.9], [-r * 0.8, -r * 1.9]], st.colors.hat[0], st.colors.hat[1], st, false);
      }
    }
    function torso(ctx, b, st) {
      var c = st.colors.top, w = 11 * k + (opts.child ? 2 : 0);
      var pts = C.coat ? [[-w, 0], [-w * 1.1, -b.len * 0.95], [-w * 0.4, -b.len * 1.08], [w * 0.6, -b.len * 1.05], [w * 1.0, -b.len * 0.9], [w * 1.25, b.len * 0.55], [-w * 1.35, b.len * 0.6]]
        : [[-w * 0.9, 0], [-w * 1.0, -b.len * 0.95], [-w * 0.3, -b.len * 1.08], [w * 0.6, -b.len * 1.05], [w * 0.95, -b.len * 0.9], [w * 0.85, 0]];
      shaded(ctx, pts, c[0], c[1], st, false);
      if (C.coat) { ctx.strokeStyle = st.ink || "#120c0a"; ctx.lineWidth = 1.2 / st.scale; ctx.beginPath(); ctx.moveTo(w * 0.5, -b.len * 0.95); ctx.lineTo(w * 0.15, b.len * 0.5); ctx.stroke(); }
    }
    function foot(ctx, b, st) { var c = st.colors.shoes; shaded(ctx, [[-3, -2], [9 * k, -2], [10 * k, 3], [-3, 3]], c[0], c[1], st, false); }
    function hand(ctx, b, st) { var c = st.colors.skin; shaded(ctx, [[-2.6, 0], [2.6, 0], [2.4, 5], [-2.2, 5]], c[0], c[1], st, true); }
    var thigh = 24 * k, shin = 24 * k, up = 17 * k, low = 16 * k, back = 30 * k;
    return figure({
      bones: [
        { name: "hip", len: 0 },
        { name: "torso", parent: "hip", at: [0, 0], len: back, draw: torso },
        { name: "neck", parent: "torso", at: [2 * k, -back], len: 6 * k },
        { name: "head", parent: "neck", at: [0, -6 * k - 8 * hk], len: 0, draw: head },
        { name: "thighB", parent: "hip", at: [-1, 0], len: thigh, draw: limb(10 * k, 8 * k, "legsB") },
        { name: "shinB", parent: "thighB", len: shin, draw: limb(8 * k, 6.5 * k, "legsB") },
        { name: "footB", parent: "shinB", len: 8, draw: foot },
        { name: "thighF", parent: "hip", at: [1, 0], len: thigh, draw: limb(10 * k, 8 * k, "legs") },
        { name: "shinF", parent: "thighF", len: shin, draw: limb(8 * k, 6.5 * k, "legs") },
        { name: "footF", parent: "shinF", len: 8, draw: foot },
        { name: "upperB", parent: "torso", at: [0, -back + 3], len: up, draw: limb(7 * k, 6 * k, "topB") },
        { name: "lowerB", parent: "upperB", len: low, draw: limb(6 * k, 5 * k, "topB") },
        { name: "handB", parent: "lowerB", len: 5, draw: hand },
        { name: "upperF", parent: "torso", at: [1, -back + 3], len: up, draw: limb(7 * k, 6 * k, "top") },
        { name: "lowerF", parent: "upperF", len: low, draw: limb(6 * k, 5 * k, "top") },
        { name: "handF", parent: "lowerF", len: 5, draw: hand }
      ],
      order: ["upperB", "lowerB", "handB", "thighB", "shinB", "footB", "torso", "thighF", "shinF", "footF", "head", "upperF", "lowerF", "handF"]
    });
  }
  /** Lauf-Zyklus für Menschen (phase in Radiant), speed 0…1.5 */
  function walk(phase, speed) {
    var s = speed === undefined ? 1 : speed, a = Math.sin(phase) * 0.45 * s, b = Math.sin(phase + Math.PI) * 0.45 * s;
    return {
      thighF: a, shinF: -Math.max(0, Math.sin(phase + 1.6)) * 0.8 * s, footF: 0,
      thighB: b, shinB: -Math.max(0, Math.sin(phase + Math.PI + 1.6)) * 0.8 * s, footB: 0,
      upperF: -a * 0.8, lowerF: 0.4, upperB: -b * 0.8, lowerB: 0.4, torso: 0.06 * s, neck: -0.06 * s,
      _bob: Math.abs(Math.cos(phase)) * 2 * s
    };
  }
  function stand(extra) { var p = { footF: 0, footB: 0, lowerF: 0.15, lowerB: 0.2, upperF: 0.05, upperB: -0.05 }; for (var k in extra || {}) p[k] = extra[k]; return p; }

  /** Katze in Seitenansicht (Blick nach +x). opts.colors: { fur: [Licht, Schatten], belly, eye } */
  function cat(opts) {
    function body(ctx, b, st) { var c = st.colors.fur; shaded(ctx, [[-20, -2], [-14, -11], [6, -12], [18, -8], [20, 2], [10, 7], [-16, 6]], c[0], c[1], st, true); }
    function head(ctx, b, st) {
      var c = st.colors.fur;
      shaded(ctx, [[-6, -2], [-6, -10], [-3, -17], [0, -10], [4, -10], [7, -17], [9, -9], [12, -3], [10, 3], [3, 5], [-4, 4]], c[0], c[1], st, false);
      ctx.fillStyle = st.colors.eye || "#e8c840"; ctx.beginPath(); ctx.ellipse(7, -4, 2, st.eyes === 0 ? 0.4 : 1.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#120c0a"; ctx.fillRect(6.6, -5.3, 0.9, 2.6);
      ctx.strokeStyle = st.ink || "#120c0a"; ctx.lineWidth = 0.7 / st.scale;
      [[11, 1, 19, -1], [11, 2, 19, 3]].forEach(function (w) { ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.lineTo(w[2], w[3]); ctx.stroke(); });
    }
    function tail(ctx, b, st) { var c = st.colors.fur; shaded(ctx, limbPts(b.len, 4, 3), c[0], c[1], st, true); }
    function leg(colorKey) { return function (ctx, b, st) { var c = st.colors[colorKey]; shaded(ctx, limbPts(b.len, 4, 3.2), c[0], c[1], st, true); }; }
    return figure({
      bones: [
        { name: "body", len: 0, draw: body },
        { name: "neck", parent: "body", at: [16, -6], len: 6 },
        { name: "head", parent: "neck", at: [0, -6], len: 0, draw: head },
        { name: "tail1", parent: "body", at: [-18, -4], len: 9, draw: tail },
        { name: "tail2", parent: "tail1", len: 9, draw: tail },
        { name: "tail3", parent: "tail2", len: 8, draw: tail },
        { name: "legFB", parent: "body", at: [12, 2], len: 8, draw: leg("furB") }, { name: "pawFB", parent: "legFB", len: 7, draw: leg("furB") },
        { name: "legHB", parent: "body", at: [-12, 2], len: 8, draw: leg("furB") }, { name: "pawHB", parent: "legHB", len: 7, draw: leg("furB") },
        { name: "legFF", parent: "body", at: [14, 2], len: 8, draw: leg("fur") }, { name: "pawFF", parent: "legFF", len: 7, draw: leg("fur") },
        { name: "legHF", parent: "body", at: [-10, 2], len: 8, draw: leg("fur") }, { name: "pawHF", parent: "legHF", len: 7, draw: leg("fur") }
      ],
      order: ["tail1", "tail2", "tail3", "legFB", "pawFB", "legHB", "pawHB", "body", "legFF", "pawFF", "legHF", "pawHF", "head"]
    });
  }
  function catWalk(phase, speed, tailUp) {
    var s = speed === undefined ? 1 : speed, f = function (o) { return Math.sin(phase + o) * 0.5 * s; };
    return { legFF: f(0), pawFF: -Math.max(0, Math.sin(phase + 1.5)) * 0.6 * s, legHB: f(0.3), pawHB: Math.max(0, Math.sin(phase + 1.8)) * 0.6 * s,
      legFB: f(Math.PI), pawFB: -Math.max(0, Math.sin(phase + Math.PI + 1.5)) * 0.6 * s, legHF: f(Math.PI + 0.3), pawHF: Math.max(0, Math.sin(phase + Math.PI + 1.8)) * 0.6 * s,
      tail1: tailUp === undefined ? 2.2 : tailUp, tail2: -0.3 + Math.sin(phase * 0.5) * 0.3, tail3: -0.3 + Math.sin(phase * 0.5 + 1) * 0.3, neck: -0.3 };
  }

  // ---------- Filter ----------

  function lum(d, i) { return (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255; }
  function region(ctx, r) { r = r || [0, 0, ctx.canvas.width, ctx.canvas.height]; return { r: r, img: ctx.getImageData(r[0], r[1], r[2], r[3]) }; }
  var filters = {
    /** Helligkeit → Farbverlauf (Palette), optional in harte Stufen gerastert */
    gradientMap: function (ctx, stops, bands, r, amount) {
      var R = region(ctx, r), d = R.img.data, cols = stops.map(function (s) { var n = parseInt(s.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
      var lut = new Uint8ClampedArray(256 * 3);
      for (var v = 0; v < 256; v++) {
        var k = v / 255; if (bands) k = Math.min(bands - 1, Math.floor(k * bands)) / (bands - 1);
        var x = k * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(x)), f = x - i;
        for (var c = 0; c < 3; c++) lut[v * 3 + c] = lerp(cols[i][c], cols[i + 1][c], f);
      }
      var a = amount === undefined ? 1 : amount;
      for (var p = 0; p < d.length; p += 4) { var l = Math.round(lum(d, p) * 255) * 3; d[p] = lerp(d[p], lut[l], a); d[p + 1] = lerp(d[p + 1], lut[l + 1], a); d[p + 2] = lerp(d[p + 2], lut[l + 2], a); }
      ctx.putImageData(R.img, R.r[0], R.r[1]);
    },
    posterize: function (ctx, levels, r) {
      var R = region(ctx, r), d = R.img.data, st = 255 / (levels - 1);
      for (var p = 0; p < d.length; p++) if ((p & 3) !== 3) d[p] = Math.round(d[p] / st) * st;
      ctx.putImageData(R.img, R.r[0], R.r[1]);
    },
    /** Tuschekanten: dunkle Linien, wo die Helligkeit springt (Sobel) */
    inkEdges: function (ctx, threshold, color, r) {
      var R = region(ctx, r), d = R.img.data, w = R.r[2], h = R.r[3], L = new Float32Array(w * h), c = color || [18, 12, 10];
      for (var i = 0; i < w * h; i++) L[i] = lum(d, i * 4);
      for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
        var o = y * w + x;
        var gx = -L[o - w - 1] - 2 * L[o - 1] - L[o + w - 1] + L[o - w + 1] + 2 * L[o + 1] + L[o + w + 1];
        var gy = -L[o - w - 1] - 2 * L[o - w] - L[o - w + 1] + L[o + w - 1] + 2 * L[o + w] + L[o + w + 1];
        if (gx * gx + gy * gy > threshold * threshold) { d[o * 4] = c[0]; d[o * 4 + 1] = c[1]; d[o * 4 + 2] = c[2]; }
      }
      ctx.putImageData(R.img, R.r[0], R.r[1]);
    },
    /**
     * Comic-Tusche: Schwarz für Schatten, Kreuz- und Einzelschraffur für Mitteltöne,
     * Rasterpunkte für helle Töne, Papier für Licht. Kräftig gesättigte Farben in der
     * Nähe von accentHue bleiben als flache Akzentfarbe stehen.
     */
    comic: function (ctx, opts, r) {
      opts = opts || {};
      var R = region(ctx, r), d = R.img.data, w = R.r[2], paper = opts.paper || [244, 236, 220], ink = opts.ink || [16, 12, 12], acc = opts.accent, dot = opts.dot || 4;
      for (var y = 0; y < R.r[3]; y++) for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4, rr = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(rr, g, b), mn = Math.min(rr, g, b), sat = mx ? (mx - mn) / mx : 0;
        if (acc && sat > 0.45 && mx > 70) {
          var hue = Math.atan2(Math.sqrt(3) * (g - b), 2 * rr - g - b);
          if (Math.abs(Math.atan2(Math.sin(hue - opts.accentHue), Math.cos(hue - opts.accentHue))) < 0.6) { var k = mx > 150 ? 1 : 0.7; d[i] = acc[0] * k; d[i + 1] = acc[1] * k; d[i + 2] = acc[2] * k; continue; }
        }
        var l = lum(d, i), X = x + R.r[0], Y = y + R.r[1], on;
        if (l < 0.18) on = true;
        else if (l < 0.36) on = ((X + Y) % 4 === 0) || ((X - Y + 4096) % 4 === 0);
        else if (l < 0.55) on = (X + Y) % 5 === 0;
        else if (l < 0.8) { var cx = (X % dot) - dot / 2 + 0.5, cy = (Y % dot) - dot / 2 + 0.5, rad = (0.8 - l) / 0.25 * dot * 0.42; on = cx * cx + cy * cy < rad * rad; }
        else on = false;
        var c = on ? ink : paper; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
      ctx.putImageData(R.img, R.r[0], R.r[1]);
    },
    grain: function (ctx, amount, seed, r) {
      var R = region(ctx, r), d = R.img.data, s = (seed | 0) * 7919 + 1;
      for (var p = 0; p < d.length; p += 4) { s = (s * 16807) % 2147483647; var n = ((s / 2147483647) - 0.5) * amount * 255; d[p] += n; d[p + 1] += n; d[p + 2] += n; }
      ctx.putImageData(R.img, R.r[0], R.r[1]);
    },
    vignette: function (ctx, strength, color) {
      var W = ctx.canvas.width, H = ctx.canvas.height, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, color || "rgba(0,0,0," + strength + ")");
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    },
    /** farbiges Licht über die Szene legen (z. B. warmes Morgenlicht), mode = Mischmodus */
    wash: function (ctx, color, alpha, mode) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = mode || "multiply"; ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
    }
  };

  // ---------- Comic-Text ----------

  function wrap(ctx, str, maxW) {
    var words = str.split(" "), lines = [""];
    words.forEach(function (w) { var t = (lines[lines.length - 1] + " " + w).trim(); if (ctx.measureText(t).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; });
    return lines;
  }
  /** Sprechblase (rund, oder zackig mit loud) mit Dorn zu (tx, ty) */
  function bubble(ctx, x, y, str, tx, ty, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.size || 11) + "px " + (o.font || "sans-serif");
    var lines = wrap(ctx, str, o.maxW || 130), lh = (o.size || 11) * 1.2, w = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; })) / 2 + 10, h = lines.length * lh / 2 + 7;
    ctx.fillStyle = o.fill || "#fffdf6"; ctx.strokeStyle = o.ink || "#120c0a"; ctx.lineWidth = o.inkW || 1.5;
    var a0 = Math.atan2(ty - y, tx - x);
    ctx.beginPath();
    if (o.thought) { ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); [0.55, 0.8].forEach(function (k, i) { ctx.beginPath(); ctx.arc(lerp(x, tx, k), lerp(y, ty, k), 4 - i * 1.5, 0, 7); ctx.fill(); ctx.stroke(); }); }
    else {
      if (o.loud) { for (var i = 0; i < 18; i++) { var a = i / 18 * Math.PI * 2, rr = i % 2 ? 1.25 : 0.95; ctx.lineTo(x + Math.cos(a) * w * rr, y + Math.sin(a) * h * rr); } ctx.closePath(); }
      else ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (tx !== undefined) {
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a0 - 0.25) * w * 0.8, y + Math.sin(a0 - 0.25) * h * 0.8); ctx.lineTo(tx, ty); ctx.lineTo(x + Math.cos(a0 + 0.25) * w * 0.8, y + Math.sin(a0 + 0.25) * h * 0.8);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a0 - 0.25) * w * 0.78, y + Math.sin(a0 - 0.25) * h * 0.78); ctx.lineTo(x + Math.cos(a0 + 0.25) * w * 0.78, y + Math.sin(a0 + 0.25) * h * 0.78); ctx.strokeStyle = o.fill || "#fffdf6"; ctx.lineWidth = 3; ctx.stroke();
      }
    }
    ctx.fillStyle = o.textColor || "#120c0a"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + (i - (lines.length - 1) / 2) * lh + 1); });
    ctx.restore();
  }
  /** Erzählkasten (rechteckig, z. B. oben links im Panel) */
  function caption(ctx, x, y, str, o) {
    o = o || {};
    ctx.save(); ctx.font = (o.size || 10) + "px " + (o.font || "sans-serif");
    var lines = wrap(ctx, str, o.maxW || 160), lh = (o.size || 10) * 1.25, w = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; })) + 12, h = lines.length * lh + 8;
    ctx.fillStyle = o.fill || "#f4e04a"; ctx.strokeStyle = o.ink || "#120c0a"; ctx.lineWidth = 1.5;
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = o.textColor || "#120c0a"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    lines.forEach(function (l, i) { ctx.fillText(l, x + 6, y + 5 + i * lh); });
    ctx.restore();
    return [w, h];
  }
  /** Lautwort („WUSCH!“) schräg, mit Kontur */
  function sfx(ctx, x, y, str, size, fill, rot, font) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || -0.15);
    ctx.font = size + "px " + (font || "Impact, sans-serif"); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.lineWidth = size / 5; ctx.strokeStyle = "#120c0a"; ctx.strokeText(str, 0, 0);
    ctx.fillStyle = fill || "#fff"; ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  /** sitzende Katze: Körper schräg aufgerichtet, Hinterbeine gefaltet, Vorderbeine senkrecht */
  function catSit(fig, ctx, x, y, s, style, extra) {
    var tilt = 0.55, p = { legFF: -tilt, pawFF: 0, legFB: -tilt + 0.08, pawFB: 0, legHF: Math.PI / 2 - tilt, pawHF: -3.0, legHB: Math.PI / 2 - tilt + 0.1, pawHB: -3.0, neck: -0.25 + tilt, tail1: 1.2, tail2: 0.6, tail3: 0.5 };   // Gelenke im gekippten Körper so, dass Vorderbeine senkrecht stehen und Hinterbeine am Boden liegen
    for (var k in extra || {}) p[k] = extra[k];
    ctx.save(); ctx.translate(x, y); ctx.rotate(-tilt * (style.dir || 1)); fig.draw(ctx, 0, 0, s, p, style); ctx.restore();
  }

  global.Toon = {
    hash: hash, clamp: clamp, lerp: lerp, noise: noise, EASE: EASE,
    track: track, camera: camera, ik: ik, figure: figure, human: human, cat: cat, walk: walk, stand: stand, catWalk: catWalk, catSit: catSit,
    shaded: shaded, limbPts: limbPts, path: pathOf, filters: filters, bubble: bubble, caption: caption, sfx: sfx, wrap: wrap
  };
})(typeof window !== "undefined" ? window : globalThis);
