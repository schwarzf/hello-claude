/**
 * Glühwürmchen: eine ruhige, interaktive Mini-Demo. Glühwürmchen schweben
 * über einer nächtlichen Wiese; wo man tippt oder zieht, sammeln sie sich,
 * und es erklingen leise Glockentöne (pentatonisch, klingt immer harmonisch).
 */
(function () {
  "use strict";

  var canvas = document.getElementById("wiese"), ctx = canvas.getContext("2d");
  var W = 0, H = 0, flies = [], target = null, t = 0, last = null, notes = 0;
  var SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81]; // C-Dur-Pentatonik

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function makeFlies(n) {
    flies = [];
    for (var i = 0; i < n; i++) {
      flies.push({ x: Math.random() * W, y: Math.random() * H * 0.85, vx: 0, vy: 0, phase: Math.random() * 6.28, speed: 0.6 + Math.random() * 0.8, hue: 55 + Math.random() * 50 });
    }
  }

  /** Ein Schritt der Simulation (dt in Sekunden). */
  function update(dt) {
    t += dt;
    flies.forEach(function (f, i) {
      // sanftes Umherschweben
      var a = Math.sin(t * 0.4 * f.speed + f.phase) * 2 + Math.cos(t * 0.23 + i) * 2;
      f.vx += Math.cos(a) * 14 * dt;
      f.vy += Math.sin(a) * 10 * dt;
      if (target) {
        var dx = target.x - f.x, dy = target.y - f.y, d = Math.sqrt(dx * dx + dy * dy) + 1;
        // anziehen, aber kurz vor dem Finger kreisen lassen
        var pull = d > 40 ? 140 : -60;
        f.vx += dx / d * pull * dt + -dy / d * 50 * dt;
        f.vy += dy / d * pull * dt + dx / d * 50 * dt;
      }
      f.vx *= 0.97; f.vy *= 0.97;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < -10) f.x = W + 10; if (f.x > W + 10) f.x = -10;
      if (f.y < 10) f.vy += 30 * dt; if (f.y > H * 0.9) f.vy -= 40 * dt;
    });
  }

  function draw() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#050a1e"); g.addColorStop(0.7, "#0d1f3a"); g.addColorStop(1, "#0b2a22");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Sterne und Mond
    for (var s = 0; s < 70; s++) {
      var sx = (s * 197.3) % W, sy = (s * 89.7) % (H * 0.6);
      ctx.fillStyle = "rgba(255,255,255," + (0.3 + 0.3 * Math.sin(t * 1.5 + s)) + ")";
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.fillStyle = "#fdf6d0";
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.18, 26, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#0a1430";
    ctx.beginPath(); ctx.arc(W * 0.82 + 11, H * 0.18 - 6, 23, 0, 6.3); ctx.fill();
    // Hügel und Gras
    ctx.fillStyle = "#071a16";
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 20) ctx.lineTo(x, H * 0.86 - Math.sin(x * 0.006 + 1) * 24 - Math.sin(x * 0.017) * 8);
    ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = "#0e2f24"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (var gx = 4; gx < W; gx += 9) {
      var gy = H * 0.9 + Math.sin(gx * 0.05) * 8, sway = Math.sin(t * 1.2 + gx * 0.04) * 4;
      ctx.moveTo(gx, H); ctx.quadraticCurveTo(gx, gy + 14, gx + sway, gy - 12 - (gx * 7 % 13));
    }
    ctx.stroke();
    // Glühwürmchen mit weichem Schein
    ctx.globalCompositeOperation = "lighter";
    flies.forEach(function (f) {
      var glow = Math.max(0, Math.sin(t * 2 * f.speed + f.phase)) ;
      var r = 3 + glow * 14, grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      grad.addColorStop(0, "hsla(" + f.hue + ",100%,75%," + (0.25 + glow * 0.75) + ")");
      grad.addColorStop(1, "hsla(" + f.hue + ",100%,50%,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.3); ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = last === null ? 0.016 : Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
  }

  // ---------- Ton: leise Glocken, Tonhöhe nach Position ----------

  var soundOn = true, lastNote = 0;
  function chime(x, y) {
    if (!soundOn || !window.Musik) return;
    var ac = Musik.getContext();
    if (!ac) return;
    var now = ac.currentTime;
    if (now - lastNote < 0.11) return;
    lastNote = now;
    var idx = Math.max(0, Math.min(SCALE.length - 1, Math.floor((1 - y / H) * SCALE.length)));
    var freq = 440 * Math.pow(2, (SCALE[idx] - 69) / 12);
    [1, 2.01, 3.02].forEach(function (ratio, i) {
      var o = ac.createOscillator(), g = ac.createGain(), pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      o.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime([0.12, 0.04, 0.015][i], now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      o.connect(g);
      if (pan) { pan.pan.value = x / W * 1.6 - 0.8; g.connect(pan).connect(ac.destination); } else g.connect(ac.destination);
      o.start(now); o.stop(now + 1.9);
    });
    notes++;
  }

  function point(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (window.Musik) Musik.unlock();
    target = point(e);
    chime(target.x, target.y);
    document.getElementById("tipp").classList.add("weg");
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* geht auch ohne */ }
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!target) return;
    var p = point(e), moved = Math.abs(p.x - target.x) + Math.abs(p.y - target.y);
    target = p;
    if (moved > 6) chime(p.x, p.y);
  });
  ["pointerup", "pointercancel"].forEach(function (type) {
    canvas.addEventListener(type, function () { target = null; });
  });
  var btn = document.getElementById("btn-sound");
  btn.addEventListener("click", function () {
    soundOn = !soundOn;
    btn.setAttribute("aria-pressed", String(soundOn));
    btn.textContent = soundOn ? "🔔 Ton an" : "🔕 Ton aus";
  });
  window.addEventListener("resize", function () { resize(); });

  resize();
  makeFlies(Math.round(Math.min(160, Math.max(60, W * H / 6000))));
  requestAnimationFrame(frame);

  // für Tests
  window.gluehwuermchen = {
    flies: flies, update: update, draw: draw,
    setTarget: function (x, y) { target = x === null ? null : { x: x, y: y }; },
    get notes() { return notes; },
    size: function () { return { w: W, h: H }; }
  };
})();
