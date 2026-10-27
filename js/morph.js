/**
 * CatMorph – Rechenlogik für das Katzen-Morphing (ohne DOM-Abhängigkeit
 * außer einem Canvas-2D-Kontext beim Zeichnen).
 *
 * Ablauf: Auf beiden Bildern liegen dieselben Merkmalspunkte (Augen, Nase …).
 * Für einen Mischwert t werden die Zwischenpunkte berechnet, beide Bilder
 * dreiecksweise per affiner Abbildung auf diese Punkte verzerrt und dann
 * mit dem Anteil t übereinander geblendet.
 */
(function (global) {
  "use strict";

  /** Merkmalspunkte eines Katzengesichts mit Standardposition (0..1). */
  var LANDMARKS = [
    { name: "Ohrspitze links", x: 0.28, y: 0.14 },
    { name: "Ohrspitze rechts", x: 0.72, y: 0.14 },
    { name: "Stirn", x: 0.50, y: 0.30 },
    { name: "Auge links", x: 0.38, y: 0.45 },
    { name: "Auge rechts", x: 0.62, y: 0.45 },
    { name: "Nase", x: 0.50, y: 0.57 },
    { name: "Maul", x: 0.50, y: 0.65 },
    { name: "Kinn", x: 0.50, y: 0.78 },
    { name: "Wange links", x: 0.24, y: 0.62 },
    { name: "Wange rechts", x: 0.76, y: 0.62 }
  ];

  function defaultPoints(width, height) {
    return LANDMARKS.map(function (l) { return { x: l.x * width, y: l.y * height }; });
  }

  /** Ecken und Kantenmitten, damit auch der Bildrand mitverzerrt wird. */
  function borderPoints(width, height) {
    var w = width, h = height;
    return [
      { x: 0, y: 0 }, { x: w / 2, y: 0 }, { x: w, y: 0 },
      { x: w, y: h / 2 }, { x: w, y: h }, { x: w / 2, y: h },
      { x: 0, y: h }, { x: 0, y: h / 2 }
    ];
  }

  function lerpPoints(a, b, t) {
    return a.map(function (p, i) {
      return { x: p.x + (b[i].x - p.x) * t, y: p.y + (b[i].y - p.y) * t };
    });
  }

  function circumcircle(a, b, c) {
    var d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-12) return null;
    var a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
    var x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
    var y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    return { x: x, y: y, r2: (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) };
  }

  /**
   * Delaunay-Triangulierung (Bowyer-Watson). Gibt Index-Tripel zurück.
   */
  function triangulate(points) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(function (p) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    });
    var size = Math.max(maxX - minX, maxY - minY) || 1;
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var pts = points.concat([
      { x: cx - 20 * size, y: cy - size },
      { x: cx, y: cy + 20 * size },
      { x: cx + 20 * size, y: cy - size }
    ]);
    var n = points.length;

    function makeTri(i, j, k) {
      return { v: [i, j, k], c: circumcircle(pts[i], pts[j], pts[k]) };
    }

    var tris = [makeTri(n, n + 1, n + 2)];

    for (var i = 0; i < n; i++) {
      var p = pts[i];
      var bad = [], good = [];
      tris.forEach(function (t) {
        var inside = t.c && (p.x - t.c.x) * (p.x - t.c.x) + (p.y - t.c.y) * (p.y - t.c.y) < t.c.r2 * (1 + 1e-9);
        (inside ? bad : good).push(t);
      });
      // Randkanten des Lochs = Kanten, die nur in einem "schlechten" Dreieck vorkommen
      var edges = {};
      bad.forEach(function (t) {
        for (var e = 0; e < 3; e++) {
          var a = t.v[e], b = t.v[(e + 1) % 3];
          var key = a < b ? a + "," + b : b + "," + a;
          edges[key] = edges[key] ? null : [a, b];
        }
      });
      tris = good;
      Object.keys(edges).forEach(function (key) {
        var edge = edges[key];
        if (!edge) return;
        var t = makeTri(edge[0], edge[1], i);
        if (t.c) tris.push(t);
      });
    }

    return tris
      .filter(function (t) { return t.v[0] < n && t.v[1] < n && t.v[2] < n; })
      .map(function (t) { return t.v.slice(); });
  }

  /**
   * Affine Abbildung, die das Dreieck src auf dst abbildet, im Format von
   * CanvasRenderingContext2D.setTransform(a, b, c, d, e, f).
   */
  function affineFromTriangles(src, dst) {
    var x0 = src[0].x, y0 = src[0].y;
    var dx1 = src[1].x - x0, dy1 = src[1].y - y0;
    var dx2 = src[2].x - x0, dy2 = src[2].y - y0;
    var det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 1e-9) return null;

    function solve(u0, u1, u2) {
      var du1 = u1 - u0, du2 = u2 - u0;
      var p = (du1 * dy2 - du2 * dy1) / det;
      var q = (du2 * dx1 - du1 * dx2) / det;
      return [p, q, u0 - p * x0 - q * y0];
    }

    var X = solve(dst[0].x, dst[1].x, dst[2].x);
    var Y = solve(dst[0].y, dst[1].y, dst[2].y);
    return [X[0], Y[0], X[1], Y[1], X[2], Y[2]];
  }

  function applyAffine(m, p) {
    return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
  }

  /** Vergrößert ein Dreieck minimal, damit zwischen Dreiecken keine Haarlinien entstehen. */
  function expandTriangle(tri, amount) {
    var cx = (tri[0].x + tri[1].x + tri[2].x) / 3;
    var cy = (tri[0].y + tri[1].y + tri[2].y) / 3;
    return tri.map(function (p) {
      var dx = p.x - cx, dy = p.y - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: p.x + (dx / len) * amount, y: p.y + (dy / len) * amount };
    });
  }

  /** Zeichnet image so verzerrt in ctx, dass srcPts auf dstPts landen. */
  function warp(ctx, image, srcPts, dstPts, triangles) {
    triangles.forEach(function (t) {
      var src = [srcPts[t[0]], srcPts[t[1]], srcPts[t[2]]];
      var dst = [dstPts[t[0]], dstPts[t[1]], dstPts[t[2]]];
      var m = affineFromTriangles(src, dst);
      if (!m) return;
      var clip = expandTriangle(dst, 0.8);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(clip[0].x, clip[0].y);
      ctx.lineTo(clip[1].x, clip[1].y);
      ctx.lineTo(clip[2].x, clip[2].y);
      ctx.closePath();
      ctx.clip();
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
    });
  }

  /**
   * Erzeugt einen Morph zwischen zwei Bildern gleicher Größe.
   * options: { imageA, imageB, pointsA, pointsB, t, triangles, bufferA, bufferB }
   * pointsA/pointsB enthalten nur die Merkmalspunkte; Randpunkte werden ergänzt.
   */
  function morph(ctx, options) {
    var w = ctx.canvas.width, h = ctx.canvas.height;
    var border = borderPoints(w, h);
    var a = options.pointsA.concat(border);
    var b = options.pointsB.concat(border);
    var mid = lerpPoints(a, b, options.t);
    var triangles = options.triangles || triangulate(lerpPoints(a, b, 0.5));

    var bufA = options.bufferA, bufB = options.bufferB;
    [bufA, bufB].forEach(function (c) { c.width = w; c.height = h; });
    var ctxA = bufA.getContext("2d"), ctxB = bufB.getContext("2d");
    warp(ctxA, options.imageA, a, mid, triangles);
    warp(ctxB, options.imageB, b, mid, triangles);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.drawImage(bufA, 0, 0);
    ctx.globalAlpha = options.t;
    ctx.drawImage(bufB, 0, 0);
    ctx.restore();
    return triangles;
  }

  global.CatMorph = {
    LANDMARKS: LANDMARKS,
    defaultPoints: defaultPoints,
    borderPoints: borderPoints,
    lerpPoints: lerpPoints,
    triangulate: triangulate,
    affineFromTriangles: affineFromTriangles,
    applyAffine: applyAffine,
    expandTriangle: expandTriangle,
    warp: warp,
    morph: morph
  };
})(typeof window !== "undefined" ? window : globalThis);
