/**
 * Oberfläche des Gesichter-Morphings: Fotos laden, Gesichtspunkte automatisch
 * erkennen (FaceMorph), bei Bedarf korrigieren und mit CatMorph mischen.
 */
(function () {
  "use strict";

  var SIZE = 512;

  var state = {
    images: [null, null],
    points: [FaceMorph.templatePoints(SIZE), FaceMorph.templatePoints(SIZE)],
    initial: [FaceMorph.templatePoints(SIZE), FaceMorph.templatePoints(SIZE)],
    selected: -1,
    triangles: null,
    animating: false,
    loads: [0, 0]
  };

  var slots = Array.prototype.map.call(document.querySelectorAll(".slot"), function (el) {
    return {
      el: el,
      editor: el.querySelector(".editor"),
      canvas: el.querySelector("canvas"),
      markers: el.querySelector(".markers"),
      status: el.querySelector(".status"),
      input: el.querySelector("input[type=file]")
    };
  });
  var result = document.getElementById("result");
  var resultCtx = result.getContext("2d");
  var resultPlaceholder = document.getElementById("result-placeholder");
  var mix = document.getElementById("mix");
  var mixValue = document.getElementById("mix-value");
  var animateBtn = document.getElementById("animate");
  var downloadBtn = document.getElementById("download");
  var showMesh = document.getElementById("show-mesh");
  var showPoints = document.getElementById("show-points");
  var bufferA = document.createElement("canvas");
  var bufferB = document.createElement("canvas");

  function clonePoints(points) {
    return points.map(function (p) { return { x: p.x, y: p.y }; });
  }

  function setStatus(index, text, kind) {
    slots[index].status.textContent = text;
    slots[index].status.className = "status" + (kind ? " " + kind : "");
  }

  // ---------- Bilder laden ----------

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("Das Bild konnte nicht geladen werden.")); };
      img.src = src;
    });
  }

  /** Mittiger quadratischer Ausschnitt, falls kein Gesicht erkannt wurde. */
  function centerCrop(img) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, side = Math.min(w, h);
    return { x: (w - side) / 2, y: (h - side) / 2, size: side };
  }

  function setImage(index, img, crop, points) {
    var c = document.createElement("canvas");
    c.width = c.height = SIZE;
    FaceMorph.drawCrop(c.getContext("2d"), img, crop, SIZE);
    state.images[index] = c;
    state.points[index] = clonePoints(points);
    state.initial[index] = clonePoints(points);
    state.triangles = null;
    slots[index].el.classList.add("has-image");
    slots[index].canvas.getContext("2d").drawImage(c, 0, 0);
    renderMarkers(index);
    scheduleRender();
  }

  function processPhoto(index, img) {
    var load = ++state.loads[index]; // spätere Uploads gewinnen
    setStatus(index, "Suche Gesicht …", "busy");
    FaceMorph.loadDetector()
      .then(function (detector) {
        if (load !== state.loads[index]) return;
        var pts = FaceMorph.detect(detector, img);
        if (!pts) {
          setImage(index, img, centerCrop(img), FaceMorph.templatePoints(SIZE));
          setStatus(index, "Kein Gesicht gefunden – bitte die Punkte von Hand setzen.", "warn");
          return;
        }
        var crop = FaceMorph.cropAroundFace(pts);
        setImage(index, img, crop, FaceMorph.toCrop(pts, crop, SIZE));
        setStatus(index, "Gesicht erkannt ✔", "ok");
      })
      .catch(function () {
        if (load !== state.loads[index]) return;
        setImage(index, img, centerCrop(img), FaceMorph.templatePoints(SIZE));
        setStatus(index, "Automatische Erkennung nicht verfügbar (keine Verbindung?) – bitte die Punkte von Hand setzen.", "warn");
      });
  }

  slots.forEach(function (slot, index) {
    slot.input.addEventListener("change", function () {
      var file = slot.input.files[0];
      slot.input.value = "";
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        setStatus(index, "Bitte eine Bilddatei wählen.", "warn");
        return;
      }
      var url = URL.createObjectURL(file);
      loadImage(url)
        .then(function (img) { processPhoto(index, img); })
        .catch(function (e) { setStatus(index, e.message, "warn"); })
        .then(function () { setTimeout(function () { URL.revokeObjectURL(url); }, 0); });
    });
  });

  document.getElementById("load-demo").addEventListener("click", function () {
    Promise.all(FACE_DEMO.map(function (d) { return loadImage(d.src); }))
      .then(function (imgs) {
        imgs.forEach(function (img, i) {
          state.loads[i]++;
          setImage(i, img, { x: 0, y: 0, size: SIZE }, FACE_DEMO[i].points.map(function (p) { return { x: p[0], y: p[1] }; }));
          setStatus(i, "Beispielgesicht geladen ✔", "ok");
        });
      })
      .catch(function (e) { setStatus(0, e.message, "warn"); });
  });

  // ---------- Gesichtspunkte ----------

  function renderMarkers(index) {
    var container = slots[index].markers;
    container.innerHTML = "";
    state.points[index].forEach(function (p, i) {
      var g = FaceMorph.GROUPS[FaceMorph.POINT_GROUP[i]];
      var m = document.createElement("button");
      m.type = "button";
      m.className = "marker" + (i === state.selected ? " selected" : "");
      m.style.background = g.color;
      m.style.left = (p.x / SIZE * 100) + "%";
      m.style.top = (p.y / SIZE * 100) + "%";
      m.dataset.index = String(i);
      m.setAttribute("aria-label", g.name + ", Punkt " + (i + 1) + " (Pfeiltasten zum Verschieben)");
      container.appendChild(m);
    });
  }

  function select(i) {
    state.selected = i;
    slots.forEach(function (s) {
      Array.prototype.forEach.call(s.markers.children, function (c, j) {
        c.classList.toggle("selected", j === i);
      });
    });
  }

  function movePoint(slotIndex, i, x, y) {
    state.points[slotIndex][i] = {
      x: Math.max(0, Math.min(SIZE, x)),
      y: Math.max(0, Math.min(SIZE, y))
    };
    state.triangles = null;
    var marker = slots[slotIndex].markers.children[i];
    if (marker) {
      marker.style.left = (state.points[slotIndex][i].x / SIZE * 100) + "%";
      marker.style.top = (state.points[slotIndex][i].y / SIZE * 100) + "%";
    }
    scheduleRender();
  }

  FaceMorph.GROUPS.forEach(function (g) {
    var li = document.createElement("li");
    var dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = g.color;
    li.appendChild(dot);
    li.appendChild(document.createTextNode(g.name));
    document.getElementById("legend").appendChild(li);
  });

  slots.forEach(function (slot, slotIndex) {
    var dragging = null;

    slot.markers.addEventListener("pointerdown", function (e) {
      var m = e.target.closest(".marker");
      if (!m) return;
      e.preventDefault();
      dragging = Number(m.dataset.index);
      select(dragging);
      m.setPointerCapture(e.pointerId);
    });
    slot.markers.addEventListener("pointermove", function (e) {
      if (dragging === null) return;
      var rect = slot.editor.getBoundingClientRect();
      movePoint(slotIndex, dragging,
        (e.clientX - rect.left) / rect.width * SIZE,
        (e.clientY - rect.top) / rect.height * SIZE);
    });
    function stop() { dragging = null; }
    slot.markers.addEventListener("pointerup", stop);
    slot.markers.addEventListener("pointercancel", stop);

    slot.markers.addEventListener("keydown", function (e) {
      var m = e.target.closest(".marker");
      if (!m) return;
      var step = e.shiftKey ? 10 : 2;
      var d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      var i = Number(m.dataset.index), p = state.points[slotIndex][i];
      movePoint(slotIndex, i, p.x + d[0], p.y + d[1]);
    });
    slot.markers.addEventListener("focusin", function (e) {
      var m = e.target.closest(".marker");
      if (m) select(Number(m.dataset.index));
    });
  });

  document.getElementById("reset-points").addEventListener("click", function () {
    state.points = [clonePoints(state.initial[0]), clonePoints(state.initial[1])];
    state.triangles = null;
    renderMarkers(0);
    renderMarkers(1);
    scheduleRender();
  });

  showPoints.addEventListener("change", function () {
    slots.forEach(function (s) { s.el.classList.toggle("hide-points", !showPoints.checked); });
  });

  // ---------- Ergebnis ----------

  var renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      render();
    });
  }

  function ready() { return state.images[0] && state.images[1]; }

  function drawMesh(t) {
    var border = CatMorph.borderPoints(SIZE, SIZE);
    var pts = CatMorph.lerpPoints(state.points[0].concat(border), state.points[1].concat(border), t);
    resultCtx.save();
    resultCtx.strokeStyle = "rgba(255,255,255,0.85)";
    resultCtx.lineWidth = 1.2;
    state.triangles.forEach(function (tri) {
      resultCtx.beginPath();
      resultCtx.moveTo(pts[tri[0]].x, pts[tri[0]].y);
      resultCtx.lineTo(pts[tri[1]].x, pts[tri[1]].y);
      resultCtx.lineTo(pts[tri[2]].x, pts[tri[2]].y);
      resultCtx.closePath();
      resultCtx.stroke();
    });
    resultCtx.restore();
  }

  function render() {
    var t = Number(mix.value) / 100;
    mixValue.textContent = Math.round((1 - t) * 100) + " % Gesicht 1 · " + Math.round(t * 100) + " % Gesicht 2";
    var ok = ready();
    resultPlaceholder.style.display = ok ? "none" : "";
    animateBtn.disabled = downloadBtn.disabled = !ok;
    if (!ok) return;

    state.triangles = CatMorph.morph(resultCtx, {
      imageA: state.images[0],
      imageB: state.images[1],
      pointsA: state.points[0],
      pointsB: state.points[1],
      t: t,
      triangles: state.triangles,
      bufferA: bufferA,
      bufferB: bufferB
    });
    if (showMesh.checked) drawMesh(t);
  }

  mix.addEventListener("input", function () {
    if (state.animating) toggleAnimation();
    scheduleRender();
  });
  showMesh.addEventListener("change", scheduleRender);

  function toggleAnimation() {
    state.animating = !state.animating;
    animateBtn.textContent = state.animating ? "⏸ Stopp" : "▶ Animation";
    if (!state.animating) return;
    var start = null, from = Number(mix.value) / 100;
    var offset = Math.acos(1 - 2 * from); // startet beim aktuellen Reglerwert
    function step(now) {
      if (!state.animating) return;
      if (start === null) start = now;
      var phase = offset + (now - start) / 1000 * Math.PI / 2; // 4 s pro Hin und Zurück
      mix.value = String(Math.round((1 - Math.cos(phase)) / 2 * 100));
      render();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  animateBtn.addEventListener("click", toggleAnimation);

  downloadBtn.addEventListener("click", function () {
    var mesh = showMesh.checked;
    showMesh.checked = false;
    render();
    showMesh.checked = mesh;
    result.toBlob(function (blob) {
      if (mesh) scheduleRender();
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "gesichter-mix-" + mix.value + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  });

  render();
})();
