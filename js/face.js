/**
 * FaceMorph – Gesichtspunkte für das Gesichter-Morphing.
 *
 * Die automatische Erkennung nutzt den MediaPipe Face Landmarker (läuft lokal
 * im Browser, das Modell wird beim ersten Mal aus dem Netz geladen). Von den
 * 478 erkannten Punkten werden die unten aufgeführten für das Morphing genutzt.
 */
(function (global) {
  "use strict";

  var MEDIAPIPE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  var MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

  /** Punktgruppen mit MediaPipe-Indizes (Kontur in Umlaufreihenfolge). */
  var GROUPS = [
    { name: "Kontur", color: "#ff3b3b", indices: [10, 297, 284, 389, 454, 361, 397, 379, 400, 152, 176, 150, 172, 132, 234, 162, 54, 67] },
    { name: "Augenbrauen", color: "#ff9f1c", indices: [70, 63, 105, 66, 107, 336, 296, 334, 293, 300] },
    { name: "Augen", color: "#1e88e5", indices: [33, 159, 133, 145, 468, 362, 386, 263, 374, 473] },
    { name: "Nase", color: "#43a047", indices: [168, 6, 1, 2, 98, 327] },
    { name: "Mund", color: "#d81b60", indices: [61, 37, 0, 267, 291, 314, 17, 84, 13, 14] }
  ];

  var INDICES = [], POINT_GROUP = [];
  GROUPS.forEach(function (g, gi) {
    g.indices.forEach(function (i) { INDICES.push(i); POINT_GROUP.push(gi); });
  });

  /**
   * Standardgesicht (0..1 im zugeschnittenen Quadrat), Reihenfolge wie INDICES.
   * Wird verwendet, wenn kein Gesicht erkannt wird.
   */
  var TEMPLATE = [
    [0.5, 0.241], [0.63, 0.25], [0.716, 0.294], [0.746, 0.367], [0.749, 0.464], [0.742, 0.57],
    [0.711, 0.681], [0.654, 0.755], [0.592, 0.806], [0.5, 0.829], [0.408, 0.806], [0.346, 0.755],
    [0.289, 0.681], [0.258, 0.57], [0.251, 0.464], [0.254, 0.367], [0.284, 0.294], [0.37, 0.25],
    [0.288, 0.356], [0.308, 0.338], [0.341, 0.33], [0.387, 0.333], [0.442, 0.342], [0.558, 0.342],
    [0.613, 0.333], [0.659, 0.33], [0.692, 0.338], [0.712, 0.356], [0.332, 0.408], [0.373, 0.391],
    [0.436, 0.42], [0.383, 0.426], [0.381, 0.409], [0.564, 0.42], [0.627, 0.391], [0.668, 0.408],
    [0.617, 0.426], [0.619, 0.409], [0.5, 0.404], [0.5, 0.434], [0.5, 0.57], [0.5, 0.583],
    [0.43, 0.564], [0.57, 0.564], [0.382, 0.619], [0.465, 0.618], [0.5, 0.623], [0.535, 0.618],
    [0.618, 0.619], [0.535, 0.698], [0.5, 0.702], [0.465, 0.698], [0.5, 0.638], [0.5, 0.671]
  ];

  function templatePoints(size) {
    return TEMPLATE.map(function (p) { return { x: p[0] * size, y: p[1] * size }; });
  }

  /** Wählt die Morphing-Punkte aus allen 478 Landmarks (in Pixeln) aus. */
  function selectPoints(landmarks) {
    return INDICES.map(function (i) { return { x: landmarks[i].x, y: landmarks[i].y }; });
  }

  /**
   * Quadratischer Bildausschnitt um das Gesicht, sodass Gesichter unabhängig
   * vom Foto gleich groß und mittig liegen. points: ausgewählte Punkte in Pixeln.
   */
  function cropAroundFace(points) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(function (p) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
    var w = maxX - minX, h = maxY - minY;
    var size = Math.max(w, h) * 1.7;
    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2 - h * 0.06; // etwas mehr Platz für die Haare
    return { x: cx - size / 2, y: cy - size / 2, size: size };
  }

  /** Rechnet Punkte aus Bildkoordinaten in den Ausschnitt (0..outSize) um. */
  function toCrop(points, crop, outSize) {
    var s = outSize / crop.size;
    return points.map(function (p) { return { x: (p.x - crop.x) * s, y: (p.y - crop.y) * s }; });
  }

  /** Zeichnet den Ausschnitt; Bereiche außerhalb des Fotos werden mit fill gefüllt. */
  function drawCrop(ctx, image, crop, outSize, fill) {
    var iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    var s = outSize / crop.size;
    ctx.fillStyle = fill || "#d9d9d9";
    ctx.fillRect(0, 0, outSize, outSize);
    // Quellrechteck auf das Foto begrenzen (Safari mag keine Quellbereiche außerhalb)
    var sx = Math.max(0, crop.x), sy = Math.max(0, crop.y);
    var ex = Math.min(iw, crop.x + crop.size), ey = Math.min(ih, crop.y + crop.size);
    if (ex <= sx || ey <= sy) return;
    ctx.drawImage(image, sx, sy, ex - sx, ey - sy, (sx - crop.x) * s, (sy - crop.y) * s, (ex - sx) * s, (ey - sy) * s);
  }

  var detectorPromise = null;

  /** Lädt MediaPipe und das Modell einmalig (Promise wird zwischengespeichert). */
  function loadDetector() {
    if (!detectorPromise) {
      detectorPromise = import(MEDIAPIPE + "/vision_bundle.mjs")
        .then(function (vision) {
          return vision.FilesetResolver.forVisionTasks(MEDIAPIPE + "/wasm").then(function (fileset) {
            return vision.FaceLandmarker.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
              runningMode: "IMAGE",
              numFaces: 1
            });
          });
        })
        .catch(function (e) {
          detectorPromise = null; // später erneut versuchen dürfen
          throw e;
        });
    }
    return detectorPromise;
  }

  function detectIn(detector, source, offsetX, offsetY, scale) {
    var w = source.naturalWidth || source.width, h = source.naturalHeight || source.height;
    var result = detector.detect(source);
    var face = result.faceLandmarks && result.faceLandmarks[0];
    if (!face) return null;
    return selectPoints(face.map(function (p) {
      return { x: offsetX + p.x * w * scale, y: offsetY + p.y * h * scale };
    }));
  }

  /**
   * Erkennt ein Gesicht und liefert die Morphing-Punkte in Pixeln oder null.
   * Kleine Gesichter in großen Fotos findet das Modell oft nicht; dann wird
   * zusätzlich in neun überlappenden Ausschnitten gesucht.
   */
  function detect(detector, image) {
    var found = detectIn(detector, image, 0, 0, 1);
    if (found) return found;
    var w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
    var side = Math.min(w, h) * 0.75, out = 512;
    var c = document.createElement("canvas");
    c.width = c.height = out;
    var ctx = c.getContext("2d");
    var fractions = [0.5, 0, 1];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        var x = (w - side) * fractions[i], y = (h - side) * fractions[j];
        ctx.clearRect(0, 0, out, out);
        ctx.drawImage(image, x, y, side, side, 0, 0, out, out);
        found = detectIn(detector, c, x, y, side / out);
        if (found) return found;
      }
    }
    return null;
  }

  global.FaceMorph = {
    GROUPS: GROUPS,
    INDICES: INDICES,
    POINT_GROUP: POINT_GROUP,
    TEMPLATE: TEMPLATE,
    templatePoints: templatePoints,
    selectPoints: selectPoints,
    cropAroundFace: cropAroundFace,
    toCrop: toCrop,
    drawCrop: drawCrop,
    loadDetector: loadDetector,
    detect: detect
  };
})(typeof window !== "undefined" ? window : globalThis);
