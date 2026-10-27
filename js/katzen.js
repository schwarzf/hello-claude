/**
 * Oberfläche des Katzen-Morphings: Fotos laden, Merkmalspunkte setzen,
 * Ergebnis mit CatMorph berechnen.
 */
(function () {
  "use strict";

  var SIZE = 512;
  var COLORS = ["#e63946", "#f77f00", "#c9a227", "#2a9d8f", "#3a86ff", "#8338ec", "#ff006e", "#6a4c93", "#43aa8b", "#577590"];

  // Merkmalspunkte der Beispielkatzen (Reihenfolge wie CatMorph.LANDMARKS)
  var DEMO = [
    {
      src: "img/katze-rot.svg",
      points: [[150, 72], [362, 72], [256, 150], [195, 235], [317, 235], [256, 300], [256, 328], [256, 410], [110, 322], [402, 322]]
    },
    {
      src: "img/katze-grau.svg",
      points: [[120, 40], [392, 40], [256, 172], [200, 250], [312, 250], [256, 318], [256, 342], [256, 440], [140, 332], [372, 332]]
    }
  ];

  var state = {
    images: [null, null],
    points: [CatMorph.defaultPoints(SIZE, SIZE), CatMorph.defaultPoints(SIZE, SIZE)],
    selected: 0,
    triangles: null,
    animating: false
  };

  var slots = Array.prototype.map.call(document.querySelectorAll(".slot"), function (el) {
    return {
      el: el,
      editor: el.querySelector(".editor"),
      canvas: el.querySelector("canvas"),
      markers: el.querySelector(".markers"),
      input: el.querySelector("input[type=file]")
    };
  });
  var legend = document.getElementById("legend");
  var errorEl = document.getElementById("error");
  var result = document.getElementById("result");
  var resultCtx = result.getContext("2d");
  var resultPlaceholder = document.getElementById("result-placeholder");
  var mix = document.getElementById("mix");
  var mixValue = document.getElementById("mix-value");
  var animateBtn = document.getElementById("animate");
  var downloadBtn = document.getElementById("download");
  var showMesh = document.getElementById("show-mesh");
  var bufferA = document.createElement("canvas");
  var bufferB = document.createElement("canvas");

  // ---------- Bilder laden ----------

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("Das Bild konnte nicht geladen werden.")); };
      img.src = src;
    });
  }

  /** Schneidet das Bild quadratisch zu (mittig) und skaliert es auf SIZE×SIZE. */
  function toSquareCanvas(img) {
    var c = document.createElement("canvas");
    c.width = c.height = SIZE;
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var side = Math.min(w, h);
    c.getContext("2d").drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return c;
  }

  function setImage(index, img, points) {
    state.images[index] = toSquareCanvas(img);
    state.points[index] = points || CatMorph.defaultPoints(SIZE, SIZE);
    state.triangles = null;
    slots[index].el.classList.add("has-image");
    drawSlot(index);
    renderMarkers(index);
    scheduleRender();
  }

  function showError(msg) { errorEl.textContent = msg || ""; }

  slots.forEach(function (slot, index) {
    slot.input.addEventListener("change", function () {
      var file = slot.input.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        showError("Bitte eine Bilddatei wählen.");
        return;
      }
      var url = URL.createObjectURL(file);
      loadImage(url)
        .then(function (img) { setImage(index, img); showError(""); })
        .catch(function (e) { showError(e.message); })
        .then(function () { URL.revokeObjectURL(url); slot.input.value = ""; });
    });
  });

  document.getElementById("load-demo").addEventListener("click", function () {
    Promise.all(DEMO.map(function (d) { return loadImage(d.src); }))
      .then(function (imgs) {
        imgs.forEach(function (img, i) {
          setImage(i, img, DEMO[i].points.map(function (p) { return { x: p[0], y: p[1] }; }));
        });
        showError("");
      })
      .catch(function (e) { showError(e.message); });
  });

  // ---------- Merkmalspunkte ----------

  function drawSlot(index) {
    var ctx = slots[index].canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (state.images[index]) ctx.drawImage(state.images[index], 0, 0);
  }

  function renderMarkers(index) {
    var container = slots[index].markers;
    container.innerHTML = "";
    state.points[index].forEach(function (p, i) {
      var m = document.createElement("button");
      m.type = "button";
      m.className = "marker" + (i === state.selected ? " selected" : "");
      m.style.background = COLORS[i];
      m.style.left = (p.x / SIZE * 100) + "%";
      m.style.top = (p.y / SIZE * 100) + "%";
      m.textContent = String(i + 1);
      m.dataset.index = String(i);
      m.setAttribute("aria-label", CatMorph.LANDMARKS[i].name + " (Pfeiltasten zum Verschieben)");
      container.appendChild(m);
    });
  }

  function renderAllMarkers() {
    renderMarkers(0);
    renderMarkers(1);
    updateSelection();
  }

  /** Hebt den ausgewählten Punkt hervor, ohne die Marker neu aufzubauen. */
  function updateSelection() {
    slots.forEach(function (s) {
      Array.prototype.forEach.call(s.markers.children, function (c, i) {
        c.classList.toggle("selected", i === state.selected);
      });
    });
    Array.prototype.forEach.call(legend.querySelectorAll("button"), function (b, i) {
      b.setAttribute("aria-pressed", String(i === state.selected));
    });
  }

  function select(i) {
    state.selected = i;
    updateSelection();
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

  function eventToImage(slotIndex, e) {
    var rect = slots[slotIndex].editor.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * SIZE,
      y: (e.clientY - rect.top) / rect.height * SIZE
    };
  }

  CatMorph.LANDMARKS.forEach(function (l, i) {
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<span class="dot"></span>';
    b.firstChild.style.background = COLORS[i];
    b.firstChild.textContent = String(i + 1);
    b.appendChild(document.createTextNode(l.name));
    b.addEventListener("click", function () { select(i); });
    li.appendChild(b);
    legend.appendChild(li);
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
      var p = eventToImage(slotIndex, e);
      movePoint(slotIndex, dragging, p.x, p.y);
    });
    function stop() { dragging = null; }
    slot.markers.addEventListener("pointerup", stop);
    slot.markers.addEventListener("pointercancel", stop);

    // Tippen ins Foto setzt den ausgewählten Punkt dorthin
    slot.canvas.addEventListener("click", function (e) {
      if (!state.images[slotIndex]) return;
      var p = eventToImage(slotIndex, e);
      movePoint(slotIndex, state.selected, p.x, p.y);
    });

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
    state.points = [CatMorph.defaultPoints(SIZE, SIZE), CatMorph.defaultPoints(SIZE, SIZE)];
    state.triangles = null;
    renderAllMarkers();
    scheduleRender();
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
    resultCtx.lineWidth = 1.5;
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
    mixValue.textContent = Math.round((1 - t) * 100) + " % Katze 1 · " + Math.round(t * 100) + " % Katze 2";
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
    try {
      result.toBlob(function (blob) {
        if (mesh) scheduleRender();
        if (!blob) { showError("Das Bild konnte nicht gespeichert werden."); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "katzen-mix-" + mix.value + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }, "image/png");
    } catch (e) {
      showError("Das Bild konnte nicht gespeichert werden: " + e.message);
    }
  });

  renderAllMarkers();
  render();
})();
