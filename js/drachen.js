/**
 * Drachenfeuer – eine Fantasy-Demo im Amiga-Stil (320×200), inspiriert von
 * der Fantasy-Malerei der 70er/80er: dramatisches Gegenlicht, dunkle
 * Silhouetten vor glühenden Himmeln, heroische Posen, wehende Umhänge und ein
 * riesiger Drache. Alle Figuren sind eigene Entwürfe (familientauglich).
 *
 * Geschichte: Der Zauberer Merowin sieht in der Kristallkugel, wie ein
 * verfluchter Drache erwacht. Thorgar der Barbar und Sira die Kriegerin
 * stellen sich ihm, Merowin schließt sich an. Im Kampf auf dem Gipfel bricht
 * Merowin den Fluch – und der Drache wird zum Freund, auf dessen Rücken alle
 * in den Morgen fliegen.
 *
 * Die Figuren haben ein Gelenk-Gerüst für Posen; jede Figur bekommt eine
 * Gegenlicht-Kante. Am Ende jedes Bildes werden die Farben wie auf dem Amiga
 * (12 Bit, 16 Stufen je Kanal) mit Bayer-Dithering reduziert.
 *
 * Jedes Bild ist eine reine Funktion der Songzeit (renderAt).
 */
(function () {
  "use strict";

  var M = window.DrachenMusik;
  var canvas = document.getElementById("demo");
  if (!canvas || !M) return;
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var W = 320, H = 200, BEAT = M.BEAT;
  var FONT = '"Press Start 2P", monospace';
  var INK = "#0c0608";
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var CREDITS = "DRACHENFEUER ...   EINE FANTASY-DEMO IM AMIGA-STIL ...   MIT THORGAR DEM BARBAREN, SIRA DER KRIEGERIN, MEROWIN DEM ZAUBERER " +
    "UND DEM DRACHEN, DER EIGENTLICH NUR SEINEN FLUCH LOSWERDEN WOLLTE ...   GRÜSSE AN ALLE KATZEN UND DINOS DER TASKLISTE ...   ";

  function sb(name, bar, beat) { return (M.SECTIONS.filter(function (s) { return s.name === name; })[0].start + bar) * M.BAR + (beat || 0); }
  // Erzähltexte: [Schlag, Dauer in Schlägen, Text]
  var NARRATION = [
    [sb("zauberer", 0, 1), 14, "Im Turm von Eldor blickt der Zauberer Merowin in seine Kristallkugel …"],
    [sb("zauberer", 4, 1), 13, "Der alte Drache erwacht – verflucht und voller Zorn!"],
    [sb("drache", 0, 1), 7, "Tief im Berg schläft er auf seinem Gold …"],
    [sb("drache", 6, 1), 14, "Sein Feuer färbt den Himmel über dem Tal."],
    [sb("helden", 0, 1), 14, "Thorgar der Barbar und Sira die Kriegerin stellen sich dem Drachen."],
    [sb("helden", 8, 1), 12, "Der Zauberer Merowin schließt sich ihnen an."],
    [sb("kampf", 0, 0), 6, "Auf dem Gipfel des Drachenbergs …"],
    [sb("wende", 0, 1), 10, "Der Fluch ist gebrochen. Der Drache ist frei …"],
    [sb("wende", 3, 0), 8, "… und ein neuer Freund."],
    [sb("finale", 0, 1), 10, "Und so fliegen sie gemeinsam in den Morgen."]
  ];
  var SPEAKER = ["THORGAR", "SIRA", "MEROWIN"];

  // ---------- Hilfen ----------

  function hash(x, y) { var h = Math.sin(x * 127.1 + (y || 0) * 311.7) * 43758.5453; return h - Math.floor(h); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function rgb(h) {
    if (h[0] !== "#") return h.replace(/[^\d,.]/g, "").split(",").slice(0, 3).map(Number);   // schon gemischt: "rgb(r,g,b)"
    var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, k) { var x = rgb(a), y = rgb(b); return "rgb(" + Math.round(lerp(x[0], y[0], k)) + "," + Math.round(lerp(x[1], y[1], k)) + "," + Math.round(lerp(x[2], y[2], k)) + ")"; }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function disc(cx, cy, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill(); }
  function poly(pts, c) { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill(); }
  function stroke(pts, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }
  function text(str, x, y, size, color, align) {
    ctx.font = size + "px " + FONT; ctx.textBaseline = "middle"; ctx.textAlign = align || "center";
    ctx.fillStyle = INK; ctx.fillText(str, Math.round(x + 1), Math.round(y + 1));
    ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y));
  }
  function sky(stops, y0, y1) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); });
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
  }
  function glow(x, y, r, color, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r), c = rgb(color);
    g.addColorStop(0, "rgba(" + c + "," + (a === undefined ? 0.8 : a) + ")"); g.addColorStop(1, "rgba(" + c + ",0)");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = "source-over";
  }
  function stars(n, yMax, seed, t) { for (var i = 0; i < n; i++) { var tw = 0.5 + 0.5 * Math.sin((t || 0) * 2 + i); rect(hash(i, seed) * W, hash(i * 3, seed) * yMax, 1, 1, tw > 0.3 ? "#fff8e0" : "#8a7a90"); } }
  function mountains(y, amp, color, seed, step, off) {
    var pts = [[-10, H + 10]];
    for (var x = -10; x <= W + 10; x += step) { var xx = x + (off || 0); pts.push([x, y - amp * (0.5 + 0.5 * Math.sin(xx * 0.021 + seed)) - amp * 0.5 * Math.abs(Math.sin(xx * 0.057 + seed * 2)) - (hash(Math.floor(xx / step), seed) - 0.5) * amp * 0.3]); }
    pts.push([W + 10, H + 10]); poly(pts, color);
  }
  var logoCv = null;
  function goldLogo(str, cx, cy, t, size) {
    if (!logoCv || logoCv.key !== str + size) {
      logoCv = document.createElement("canvas");
      var c = logoCv.getContext("2d");
      c.font = size + "px " + FONT;
      logoCv.width = Math.ceil(c.measureText(str).width) + 8; logoCv.height = size + 10; logoCv.key = str + size;
      c.font = size + "px " + FONT; c.textBaseline = "top";
      var g = c.createLinearGradient(0, 2, 0, size + 2);
      g.addColorStop(0, "#5a1a08"); g.addColorStop(0.3, "#ffd27a"); g.addColorStop(0.48, "#fff6d8"); g.addColorStop(0.52, "#8a3a0a"); g.addColorStop(0.8, "#ff8a1c"); g.addColorStop(1, "#ffd27a");
      c.fillStyle = "#000"; c.fillText(str, 5, 5); c.fillStyle = "#2a0a04"; c.fillText(str, 3, 3); c.fillStyle = g; c.fillText(str, 2, 2);
    }
    var L = logoCv;
    ctx.drawImage(L, Math.round(cx - L.width / 2), Math.round(cy - L.height / 2 + Math.sin(t * 2) * 1.5));
    // Glanzlicht, das über das Logo wandert
    var gx = ((t * 80) % (L.width + 80)) - 40 + cx - L.width / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(cx - L.width / 2, cy - L.height / 2, L.width, L.height); ctx.clip();
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,240,200,0.35)";
    ctx.beginPath(); ctx.moveTo(gx, cy - L.height / 2); ctx.lineTo(gx + 8, cy - L.height / 2); ctx.lineTo(gx - 4, cy + L.height / 2); ctx.lineTo(gx - 12, cy + L.height / 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over"; ctx.restore();
  }
  function scroller(t, str, y) {
    ctx.font = "8px " + FONT; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    var total = str.length * 8, off = (t * 45) % total;
    for (var i = 0; i < str.length; i++) {
      var x = i * 8 - off; if (x < -8) x += total; if (x > W) continue;
      var yy = Math.round(y + Math.sin(t * 3 + x * 0.04) * 4);
      ctx.fillStyle = INK; ctx.fillText(str[i], Math.round(x) + 1, yy + 1);
      ctx.fillStyle = "hsl(" + (30 + 20 * Math.sin(i * 0.3 + t)) + ",95%," + (60 + 10 * Math.sin(i + t * 3)) + "%)"; ctx.fillText(str[i], Math.round(x), yy);
    }
  }
  var ditherTables = null;
  /** Amiga-Farben: 16 Stufen je Kanal (12 Bit), 4×4-Bayer-Dithering */
  function dither() {
    if (!ditherTables) ditherTables = BAYER.map(function (b) {
      var tab = new Uint8ClampedArray(256), step = 17, off = ((b + 0.5) / 16 - 0.5) * step;
      for (var v = 0; v < 256; v++) tab[v] = clamp(Math.round((v + off) / step), 0, 15) * 17;
      return tab;
    });
    var img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (var y = 0; y < H; y++) { var row = (y & 3) * 4; for (var x = 0; x < W; x++) { var tab = ditherTables[row + (x & 3)], i = (y * W + x) * 4; d[i] = tab[d[i]]; d[i + 1] = tab[d[i + 1]]; d[i + 2] = tab[d[i + 2]]; } }
    ctx.putImageData(img, 0, 0);
  }

  // ---------- Figuren mit Gelenk-Gerüst ----------

  /** Gelenk am Ende eines Gliedes: Winkel 0 = nach unten, positiv = nach vorn */
  function joint(x, y, a, l) { return [x + Math.sin(a) * l, y + Math.cos(a) * l]; }
  var HEROES = {
    barbar: { skin: "#c9875a", cloth: "#6b4426", fur: "#8a6a4a", cape: "#5a3a22", hair: "#2a1a10", metal: "#b8b8c0", build: 1.25 },
    kriegerin: { skin: "#e0a880", cloth: "#7a1a1a", fur: "#c0c4cc", cape: "#9a1a22", hair: "#c8401c", metal: "#d8dce4", build: 0.95 },
    zauberer: { skin: "#d8a888", cloth: "#2a3a8a", fur: "#2a3a8a", cape: "#1e2a6a", hair: "#eeeeee", metal: "#8a6a3a", build: 1 }
  };
  /**
   * Eine Heldenfigur (Füße bei x,y; Größe s ≈ Höhe/100 px).
   * p: { dir, armF, elbF, armB, elbB, legF, kneeF, legB, kneeB, lean, wind, sil (0 bunt … 1 Silhouette), shield, glowOrb }
   */
  function hero(kind, x, y, s, p, t, rim) {
    var C = HEROES[kind], b = C.build;
    function col(c) { return rim ? rim : p.sil ? mix(c, "#140a10", p.sil) : c; }
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (p.dir || 1), s);
    var hip = [0, -46], lean = p.lean || 0, neck = [Math.sin(lean) * 34, -46 - Math.cos(lean) * 34], head = [neck[0] + Math.sin(lean) * 9, neck[1] - 9];
    var shF = [neck[0] + 6 * b, neck[1] + 3], shB = [neck[0] - 5 * b, neck[1] + 3];
    var w = Math.sin(t * 6) * 4 * (p.wind === undefined ? 1 : p.wind);
    // Umhang
    poly([[shB[0] + 2, shB[1]], [shF[0] - 2, shF[1]], [-10 - 6 * b, -22 + w * 0.5], [-30 - 6 * b + w, -10 + w], [-26 + w * 0.5, -2], [-6, -20]], col(C.cape));
    // hinteres Bein und hinterer Arm (etwas dunkler)
    var kB = joint(hip[0] - 3, hip[1], p.legB || 0, 22), fB = joint(kB[0], kB[1], (p.legB || 0) + (p.kneeB || 0), 22);
    stroke([[hip[0] - 3, hip[1]], kB, fB], 8 * b, col(mix(C.skin, "#000", 0.35)));
    stroke([fB, [fB[0] + 5, fB[1]]], 5, col(mix(C.cloth, "#000", 0.4)));
    var eB = joint(shB[0], shB[1], p.armB || 0.2, 15), hB = joint(eB[0], eB[1], (p.armB || 0.2) + (p.elbB || 0), 14);
    stroke([shB, eB, hB], 6.5 * b, col(mix(C.skin, "#000", 0.35)));
    // Rumpf
    if (kind === "zauberer") poly([[shB[0] - 2, shB[1] - 2], [shF[0] + 2, shF[1] - 2], [16, -2], [-16, -2]], col(C.cloth));
    else {
      poly([[shB[0] - 3, shB[1] - 2], [shF[0] + 3, shF[1] - 2], [hip[0] + 7 * b, hip[1]], [hip[0] - 7 * b, hip[1]]], col(kind === "kriegerin" ? C.metal : C.skin));
      if (kind === "barbar") poly([[shB[0] - 3, shB[1] - 2], [shF[0] + 3, shF[1] - 2], [shF[0] - 2, shF[1] + 12], [shB[0] + 2, shB[1] + 12]], col(C.fur));
      if (kind === "kriegerin") { stroke([[shB[0] + 2, shB[1] + 8], [shF[0] - 2, shF[1] + 8]], 1.5, col("#8a8e98")); }
      poly([[hip[0] - 8 * b, hip[1] - 4], [hip[0] + 8 * b, hip[1] - 4], [hip[0] + 9 * b, hip[1] + 10], [hip[0] - 9 * b, hip[1] + 10]], col(C.cloth));
      stroke([[hip[0] - 8 * b, hip[1] - 4], [hip[0] + 8 * b, hip[1] - 4]], 2.5, col("#4a2a14"));
    }
    // vorderes Bein
    if (kind !== "zauberer" || p.legF) {
      var kF = joint(hip[0] + 3, hip[1], p.legF || 0, 22), fF = joint(kF[0], kF[1], (p.legF || 0) + (p.kneeF || 0), 22);
      if (kind === "zauberer") { stroke([[hip[0] + 3, hip[1] + 8], fF], 6, col(C.cloth)); }
      else stroke([[hip[0] + 3, hip[1]], kF, fF], 8 * b, col(C.skin));
      stroke([fF, [fF[0] + 5, fF[1]]], 5, col(mix(C.cloth, "#000", 0.3)));
      if (kind !== "zauberer") stroke([[kF[0], kF[1] + 4], [fF[0], fF[1] - 2]], 7 * b, col(kind === "kriegerin" ? C.metal : "#5a3a22"));
    }
    // Kopf und Haare / Helm / Hut
    if (kind === "kriegerin") poly([[head[0] - 6, head[1] - 4], [head[0] - 16 + w, head[1] + 10], [head[0] - 22 + w * 1.5, head[1] + 24], [head[0] - 4, head[1] + 8]], col(C.hair));
    disc(head[0], head[1], 7, col(C.skin));
    if (kind === "barbar") {
      poly([[head[0] - 8, head[1] - 2], [head[0] + 8, head[1] - 2], [head[0] + 6, head[1] - 9], [head[0] - 6, head[1] - 9]], col(C.metal));
      poly([[head[0] - 6, head[1] - 6], [head[0] - 14, head[1] - 16], [head[0] - 9, head[1] - 7]], col("#e8dcc0"));
      poly([[head[0] + 6, head[1] - 6], [head[0] + 14, head[1] - 16], [head[0] + 9, head[1] - 7]], col("#e8dcc0"));
      poly([[head[0] - 7, head[1] - 2], [head[0] - 12 + w * 0.5, head[1] + 10], [head[0] - 4, head[1] + 4]], col(C.hair));
    } else if (kind === "kriegerin") {
      poly([[head[0] - 7, head[1] - 1], [head[0] + 7, head[1] - 1], [head[0] + 6, head[1] - 8], [head[0] - 6, head[1] - 8]], col(C.hair));
      stroke([[head[0] - 7, head[1] - 3], [head[0] + 7, head[1] - 3]], 1.5, col("#ffd27a"));
    } else {
      poly([[head[0] - 12, head[1] - 3], [head[0] + 12, head[1] - 3], [head[0] + 2 + w * 0.3, head[1] - 30], [head[0] - 4, head[1] - 10]], col(C.cloth));
      poly([[head[0] - 4, head[1] + 2], [head[0] + 8, head[1] + 2], [head[0] + 2 + w * 0.3, head[1] + 22]], col(C.hair));
      if (!rim) { rect(head[0] - 1, head[1] - 16, 1, 1, "#ffe66b"); rect(head[0] + 2, head[1] - 10, 1, 1, "#ffe66b"); }
    }
    if (!rim && !p.sil) rect(head[0] + 3, head[1] - 1, 2, 1, INK);
    // vorderer Arm mit Waffe
    var eF = joint(shF[0], shF[1], p.armF || 0.3, 15), hF = joint(eF[0], eF[1], (p.armF || 0.3) + (p.elbF || 0), 14), wa = (p.armF || 0.3) + (p.elbF || 0);
    if (kind === "barbar") {   // Axt
      var top = joint(hF[0], hF[1], wa + Math.PI, 26), bot = joint(hF[0], hF[1], wa, 10);
      stroke([bot, top], 3, col("#5a3a1a"));
      var ax = joint(top[0], top[1], wa, 3), n1 = joint(ax[0], ax[1], wa + Math.PI / 2, 12), n2 = joint(ax[0], ax[1], wa - Math.PI / 2, 12);
      poly([ax, [n1[0] + Math.sin(wa + Math.PI) * 8, n1[1] + Math.cos(wa + Math.PI) * 8], n1, [n1[0] + Math.sin(wa) * 6, n1[1] + Math.cos(wa) * 6]], col(C.metal));
      poly([ax, [n2[0] + Math.sin(wa + Math.PI) * 8, n2[1] + Math.cos(wa + Math.PI) * 8], n2, [n2[0] + Math.sin(wa) * 6, n2[1] + Math.cos(wa) * 6]], col(C.metal));
    } else if (kind === "kriegerin") {   // Schwert
      var tip = joint(hF[0], hF[1], wa + Math.PI, 30);
      stroke([hF, tip], 2.5, col(C.metal)); stroke([joint(hF[0], hF[1], wa + Math.PI / 2, 5), joint(hF[0], hF[1], wa - Math.PI / 2, 5)], 2.5, col("#ffd27a"));
    } else {   // Stab mit leuchtender Kugel
      var st = joint(hF[0], hF[1], wa + Math.PI, 30), sb2 = joint(hF[0], hF[1], wa, 18);
      stroke([sb2, st], 2.5, col(C.metal));
      if (!rim) { disc(st[0], st[1], 4, "#9ad8ff"); disc(st[0], st[1], 2, "#ffffff"); }
      p._orb = [st[0], st[1]];
    }
    stroke([shF, eF, hF], 6.5 * b, col(kind === "zauberer" ? C.cloth : C.skin));
    if (kind === "kriegerin") {   // Rundschild am hinteren Arm, nach vorn gehalten
      var sh = p.shield ? [shF[0] + 12, shF[1] - 4] : [hB[0] + 4, hB[1] - 4];
      disc(sh[0], sh[1], 11, col("#6a2a1a")); disc(sh[0], sh[1], 9, col("#b8bcc6")); disc(sh[0], sh[1], 3, col("#ffd27a"));
    }
    ctx.restore();
    if (p._orb) return [x + p._orb[0] * s * (p.dir || 1), y + p._orb[1] * s];
    return [x + head[0] * s * (p.dir || 1), y + head[1] * s];
  }
  /** Figur mit Gegenlicht-Kante: erst die Kante versetzt, dann die Figur */
  function heroLit(kind, x, y, s, p, t, rimColor, lx) {
    hero(kind, x + (lx === undefined ? -1 : lx), y - 1, s, p, t, rimColor);
    return hero(kind, x, y, s, p, t, null);
  }

  /**
   * Der Drache (Körpermitte bei x,y; s = Größe; facing via dir).
   * o: { flap -1…1, neck 0…1, jaw 0…1, eye: "zu"|"rot"|"gold", tail, sil, curled }
   */
  function dragon(x, y, s, o, t, rim) {
    var base = "#3a5a3a", belly = "#a8904a", wing = "#5a2a2a", horn = "#e8dcc0";
    function col(c) { return rim ? rim : o.sil ? mix(c, "#120a10", o.sil) : c; }
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.dir || 1), s);
    var f = o.flap || 0;
    /** Fledermausflügel: Schulter, Handgelenk, drei Fingerspitzen, dazwischen gebogte Haut */
    function wingPts(dx, dy, k) {
      var up = (f + 1) / 2, sh = [10 + dx, -14 + dy], wr = [lerp(-4, 14, up) + dx, lerp(20, -58, up) * k + dy];
      var tips = [[wr[0] - 4, lerp(46, -96, up) * k + dy], [wr[0] - 34, lerp(40, -76, up) * k + dy], [wr[0] - 58, lerp(26, -40, up) * k + dy]];
      var pts = [sh, wr, tips[0]];
      for (var i = 0; i < 3; i++) {
        var a = tips[i], bb = i < 2 ? tips[i + 1] : [-34 + dx, -2 + dy], mid = [(a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2], cx2 = (wr[0] + -10 + dx) / 2, cy2 = (wr[1] + dy) / 2;
        pts.push([lerp(mid[0], cx2, 0.28), lerp(mid[1], cy2, 0.28)]);
        if (i < 2) pts.push(tips[i + 1]);
      }
      pts.push([-34 + dx, -2 + dy]);
      return { pts: pts, wr: wr, tips: tips, sh: sh };
    }
    function drawWing(wg, fill, bone) {
      poly(wg.pts, fill);
      stroke([wg.sh, wg.wr], 3, bone);
      wg.tips.forEach(function (tp) { stroke([wg.wr, tp], 1.5, bone); });
      rect(wg.wr[0] - 1, wg.wr[1] - 3, 2, 3, col("#e8dcc0"));
    }
    var far = wingPts(8, -4, 0.85);
    if (!o.curled) drawWing(far, col(mix(wing, "#000", 0.4)), col("#2a1414"));
    // Schwanz
    for (var i = 0; i < 14; i++) {
      var u = i / 13, tx = -28 - u * (o.curled ? 40 : 80), ty = 6 - u * 10 + Math.sin(t * 2 + u * 4) * (o.tail === undefined ? 6 : o.tail) * u;
      if (o.curled) { tx = -28 - Math.sin(u * 2.4) * 40; ty = 12 + (1 - Math.cos(u * 2.4)) * 18; }
      disc(tx, ty, 9 - u * 7, col(base));
      if (i % 2 === 0) poly([[tx - 2, ty - (9 - u * 7)], [tx + 2, ty - (9 - u * 7) - 5], [tx + 4, ty - (9 - u * 7)]], col(horn));
    }
    // Beine
    stroke([[-18, 6], [-24, 22], [-18, 32]], 9, col(mix(base, "#000", 0.3)));
    stroke([[22, 6], [28, 20], [32, 30]], 8, col(mix(base, "#000", 0.3)));
    // Körper
    ctx.save(); ctx.scale(1, 0.5); disc(0, 2, 36, col(base)); ctx.restore();
    ctx.save(); ctx.scale(1, 0.32); disc(4, 24, 30, col(belly)); ctx.restore();
    for (var sp = 0; sp < 6; sp++) poly([[-24 + sp * 9, -14 + Math.abs(sp - 3)], [-20 + sp * 9, -24 + Math.abs(sp - 3)], [-16 + sp * 9, -14 + Math.abs(sp - 3)]], col(horn));
    stroke([[-18, 10], [-22, 24], [-14, 32]], 9, col(base));
    stroke([[24, 8], [32, 20], [38, 30]], 8, col(base));
    // Hals und Kopf
    var hx = o.curled ? 30 : 58, hy = o.curled ? 14 : -30 - (o.neck || 0) * 20;
    for (var n = 0; n <= 8; n++) { var v = n / 8, nx = lerp(26, hx - 4, v), ny = lerp(-6, hy + 2, v) - Math.sin(v * Math.PI) * (o.curled ? 0 : 10); disc(nx, ny, 9 - v * 3, col(base)); }
    var jaw = (o.jaw || 0) * 0.5;
    poly([[hx - 6, hy - 7], [hx + 8, hy - 8], [hx + 24, hy - 3], [hx + 24, hy + 1], [hx - 4, hy + 2]], col(base));
    ctx.save(); ctx.translate(hx - 4, hy + 1); ctx.rotate(jaw); if (jaw > 0.05 && !rim) poly([[0, -1], [26, -1], [22, 4], [0, 5]], "#5a0a0a");
    poly([[0, 0], [26, 0], [22, 5], [0, 6]].map(function (q) { return [q[0], q[1] + jaw * 4]; }), col(mix(base, "#000", 0.1))); if (jaw > 0.05 && !rim) poly([[2, jaw * 4], [24, jaw * 4], [22, 2 + jaw * 4]], "#ffe8b0"); ctx.restore();
    if (!rim) rect(hx + 20, hy - 4, 2, 1, "#1a1a1a");
    poly([[hx - 4, hy - 6], [hx - 18, hy - 18], [hx - 2, hy - 9]], col(horn)); poly([[hx + 2, hy - 7], [hx - 8, hy - 20], [hx + 5, hy - 8]], col(horn));
    if (!rim) {
      if (o.eye === "zu") stroke([[hx + 4, hy - 4], [hx + 10, hy - 4]], 1.5, "#1a1a1a");
      else { var ec = o.eye === "gold" ? "#ffd84a" : "#ff2a1a"; disc(hx + 7, hy - 4, 2.6, ec); stroke([[hx + 7, hy - 6], [hx + 7, hy - 2]], 1, "#1a0a0a"); }
    }
    // vorderer Flügel
    if (!o.curled) drawWing(wingPts(0, 0, 1), col(wing), col("#3a1a14"));
    else poly([[10, -8], [-10, -24], [-34, -18], [-30, -4]], col(wing));
    ctx.restore();
    var mouth = [x + (hx + 24) * s * (o.dir || 1), y + (hy + 1) * s];
    if (!rim && o.eye !== "zu" && !o.sil) glow(x + (hx + 7) * s * (o.dir || 1), y + (hy - 4) * s, 6 * s + 3, o.eye === "gold" ? "#ffd84a" : "#ff2a1a", 0.6);
    return mouth;
  }
  function dragonLit(x, y, s, o, t, rimColor) { dragon(x - 1, y - 1, s, o, t, rimColor); return dragon(x, y, s, o, t, null); }

  /** Feuerstrahl aus dem Maul in Richtung dir (Winkel) */
  function fire(mx, my, ang, len, t, k, block) {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < 70; i++) {
      var u = ((t * 1.6 + hash(i, 1)) % 1) * k, sp = (hash(i, 2) - 0.5) * 0.35 * (0.3 + u), d = u * len;
      if (block && d > block.d) { var over = (d - block.d) / len; sp += (hash(i, 3) > 0.5 ? 1 : -1) * over * 2.2; d = block.d + over * len * 0.5; }
      var x = mx + Math.cos(ang + sp) * d, y = my + Math.sin(ang + sp) * d, r = 1.5 + u * 7;
      var c = u < 0.15 ? "#fff6c0" : u < 0.4 ? "#ffd04a" : u < 0.7 ? "#ff7a1a" : "#c22a0a";
      ctx.globalAlpha = (1 - u) * 0.85; disc(x, y, r, c);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function lightning(x0, y0, x1, y1, seed, w) {
    var pts = [[x0, y0]], n = 9;
    for (var i = 1; i < n; i++) pts.push([lerp(x0, x1, i / n) + (hash(i, seed) - 0.5) * 22, lerp(y0, y1, i / n) + (hash(i * 2, seed) - 0.5) * 8]);
    pts.push([x1, y1]);
    ctx.globalCompositeOperation = "lighter"; stroke(pts, w + 4, "rgba(150,190,255,0.35)"); stroke(pts, w, "#eef4ff"); ctx.globalCompositeOperation = "source-over";
  }
  function sparks(x, y, k, seed, color) {
    for (var i = 0; i < 20; i++) { var a = hash(i, seed) * Math.PI * 2, r = k * (12 + hash(i * 3, seed) * 30); rect(x + Math.cos(a) * r, y + Math.sin(a) * r + k * k * 10, 1.5, 1.5, color || "#fff2a0"); }
  }

  // ---------- Szenen ----------

  function sinceSfx(type, b) { var best = 99; M.song.sfx.forEach(function (e) { if (e.type === type && b >= e.t) best = Math.min(best, (b - e.t) * BEAT); }); return best; }

  function sceneTitel(info, t) {
    var b = info.beat;
    sky(["#05020a", "#3a0a1a", "#a02a14", "#ffb04a"], 0, 150);
    stars(40, 70, 1, t);
    disc(200, 112, 46, "#ffd88a"); glow(200, 112, 90, "#ff8a3a", 0.5);
    // der Drache kreuzt den Mond
    var k = clamp((b - 12) / 6, 0, 1);
    if (k > 0 && k < 1) dragon(lerp(-40, 380, k), 100 - Math.sin(k * Math.PI) * 30, 0.45, { flap: Math.sin(t * 7), sil: 1, neck: 0.3 }, t);
    mountains(150, 30, "#2a0e14", 1, 8);
    // Burg auf dem Felsen
    poly([[230, 200], [244, 120], [262, 110], [300, 116], [320, 140], [320, 200]], "#1a080c");
    [[250, 70, 12], [270, 58, 14], [292, 76, 10]].forEach(function (q) { rect(q[0], q[1], q[2], 60, "#1a080c"); poly([[q[0] - 2, q[1]], [q[0] + q[2] / 2, q[1] - 16], [q[0] + q[2] + 2, q[1]]], "#1a080c"); });
    [[254, 90], [276, 76], [294, 96], [272, 100]].forEach(function (w, i) { if (Math.sin(t * 3 + i) > -0.6) rect(w[0], w[1], 2, 3, "#ffc04a"); });
    poly([[0, 200], [0, 150], [60, 140], [140, 156], [230, 150], [320, 162], [320, 200]], "#12060a");
    var fl = Math.max(0, 1 - sinceSfx("donner", b) / 0.35);
    if (fl > 0) { lightning(90 + hash(Math.floor(b), 7) * 80, 0, 120, 140, Math.floor(b), 1.5); ctx.fillStyle = "rgba(255,240,255," + fl * 0.35 + ")"; ctx.fillRect(0, 0, W, H); }
    if (info.bar >= 4) { goldLogo("DRACHENFEUER", W / 2, 46, t, 16); text("EINE FANTASY-DEMO", W / 2, 70, 8, "#ffe0b0"); }
  }

  function sceneZauberer(info, t) {
    var bar = info.bar, b = info.beat;
    // Turmzimmer: Steinwand, Fenster mit Mond, Kerzen
    rect(0, 0, W, H, "#1a1420");
    for (var r = 0; r < 14; r++) for (var c = 0; c < 12; c++) { var x = c * 30 - (r % 2) * 15, y = r * 14; rect(x + 1, y + 1, 28, 12, mix("#3a2e3a", "#2a2028", hash(c, r))); }
    poly([[30, 30], [30, 90], [80, 90], [80, 30], [55, 14]], "#0a0a24"); stars(12, 60, 3, t);
    disc(62, 46, 10, "#e8e4c8"); ctx.strokeStyle = "#2a2028"; ctx.lineWidth = 3; ctx.strokeRect(30, 30, 50, 60); stroke([[55, 30], [55, 90]], 2, "#2a2028");
    rect(240, 20, 60, 110, "#2a1a10"); for (var sh = 0; sh < 4; sh++) { rect(240, 42 + sh * 26, 60, 3, "#4a2e18"); for (var bk = 0; bk < 8; bk++) rect(244 + bk * 7, 24 + sh * 26, 5, 18, ["#7a1a1a", "#1a3a6a", "#3a5a2a", "#8a6a2a"][(bk + sh) % 4]); }
    rect(0, 150, W, 50, "#2a1e1a"); rect(110, 128, 140, 8, "#4a2e18"); rect(118, 136, 8, 40, "#3a2412"); rect(234, 136, 8, 40, "#3a2412");
    [[130, 120], [228, 118]].forEach(function (k2, i) { rect(k2[0], k2[1], 4, 8, "#e8dcc0"); disc(k2[0] + 2, k2[1] - 2 + Math.sin(t * 9 + i) * 0.5, 2, "#ffd04a"); glow(k2[0] + 2, k2[1] - 2, 30, "#ff9a3a", 0.35); });
    // Kristallkugel
    var bx = 180, by = 114, vision = bar >= 4;
    rect(170, 122, 20, 6, "#6a4a2a");
    disc(bx, by, 13, vision ? "#3a0a1a" : "#2a4a8a"); glow(bx, by, 50, vision ? "#ff3a2a" : "#6ac8ff", 0.45);
    if (vision) {
      var open = ease((info.progress * 8 - 4) / 1.5);
      ctx.save(); ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.clip();
      ctx.save(); ctx.translate(bx, by); ctx.scale(1, Math.max(0.05, open)); disc(0, 0, 9, "#ff8a1a"); disc(0, 0, 6, "#ffd04a"); ctx.restore();
      rect(bx - 1, by - 8 * open, 2, 16 * open, "#120408");
      ctx.restore();
    }
    disc(bx - 4, by - 5, 3, "rgba(255,255,255,0.6)");
    // Merowin am Tisch
    var orb = heroLit("zauberer", 140, 160, 0.95, { armF: 1.5, elbF: 0.3, armB: 1.2, elbB: 0.4, wind: 0.15, lean: 0.12 }, t, "#ff9a3a", -1);
    for (var i = 0; i < 24; i++) { var a = t * 1.5 + i / 24 * Math.PI * 2, rr = 22 + Math.sin(t * 2 + i) * 6; rect(bx + Math.cos(a) * rr, by + Math.sin(a) * rr * 0.6, 1, 1, vision ? "#ff6a4a" : "#9ad8ff"); }
  }

  function sceneDrache(info, t) {
    var bar = info.bar, b = info.beat, s0 = M.sectionStart("drache") / BEAT;
    if (bar < 6) {
      // Höhle mit Goldschatz
      rect(0, 0, W, H, "#0e0a10");
      poly([[0, 0], [320, 0], [320, 40], [260, 60], [200, 30], [120, 50], [60, 34], [0, 60]], "#1e1620");
      glow(160, 160, 160, "#ffb03a", 0.35);
      for (var g = 0; g < 160; g++) { var gx = 60 + hash(g, 1) * 200, gy = 150 + Math.pow(hash(g, 2), 0.7) * 50 - Math.sin((gx - 60) / 200 * Math.PI) * 20; disc(gx, gy, 2, hash(g, 3) > 0.5 ? "#ffd04a" : "#c8901a"); }
      for (g = 0; g < 8; g++) { if (Math.sin(t * 5 + g * 3) > 0.7) { var px = 70 + hash(g, 9) * 180, py = 140 + hash(g, 8) * 30; rect(px - 2, py, 5, 1, "#fff"); rect(px, py - 2, 1, 5, "#fff"); } }
      var wake = clamp((b - s0 - 8) / 1, 0, 1), rise = ease((b - s0 - 16) / 8);
      if (bar >= 2 && bar < 4) {
        // Großaufnahme: das Auge öffnet sich
        dragon(150, 150, 2.2, { curled: true, eye: wake > 0.5 ? "rot" : "zu", sil: 0.25 }, t);
        if (wake > 0.3) for (var sm = 0; sm < 6; sm++) { var a2 = ((t * 0.8 + sm / 6) % 1); ctx.globalAlpha = 1 - a2; disc(300 + a2 * 10, 120 - a2 * 40, 3 + a2 * 8, "#6a6070"); ctx.globalAlpha = 1; }
        return;
      }
      dragonLit(160, 140 - rise * 30, 1.1, { curled: bar < 4, flap: bar >= 4 ? Math.sin(t * 3) * 0.6 + 0.3 : 0, neck: rise, eye: bar < 2 ? "zu" : "rot", jaw: bar >= 4 ? 0.3 : 0, sil: 0.15 }, t, "#ffb03a");
      return;
    }
    // Flug über das Tal, Feuer färbt den Himmel
    var burn = clamp((b - s0 - 24) / 8, 0, 1);
    sky(["#1a0a2a", mix("#4a1a3a", "#a02a0a", burn), mix("#ff8a4a", "#ffb02a", burn)], 0, 150);
    stars(30, 60, 4, t);
    mountains(130, 40, "#2a1020", 2, 10, t * 4);
    mountains(155, 20, "#1a0a14", 5, 8, t * 10);
    rect(0, 155, W, 45, "#120810");
    for (var h = 0; h < 10; h++) { var hx = ((h * 40 - t * 20) % 400 + 400) % 400 - 40; poly([[hx, 168], [hx, 156], [hx + 8, 148], [hx + 16, 156], [hx + 16, 168]], "#0a0408"); if (burn > 0.3 && hash(h, 4) > 0.4) glow(hx + 8, 160, 16, "#ff6a1a", 0.6 * burn); else rect(hx + 6, 158, 3, 3, "#ffc04a"); }
    var k = (b - s0 - 24) / 16, dx = lerp(-60, 380, clamp(k, 0, 1)), dy = 70 + Math.sin(t * 1.5) * 8;
    var breathing = M.song.sfx.some(function (e) { return e.type === "feuer" && b >= e.t && b < e.t + e.d; });
    var mouth = dragonLit(dx, dy, 0.9, { flap: Math.sin(t * 5), neck: 0.2, jaw: breathing ? 1 : 0.1, eye: "rot", sil: 0.35 }, t, "#ffb03a");
    if (breathing) fire(mouth[0], mouth[1], 0.5, 110, t, 1);
  }

  function sceneHelden(info, t) {
    var bar = info.bar, b = info.beat, s0 = M.sectionStart("helden") / BEAT;
    if (bar < 6) {
      // Klippe im Sonnenuntergang – heroische Silhouetten
      sky(["#200a2a", "#8a1a2a", "#ff6a2a", "#ffd88a"], 0, 140);
      disc(160, 128, 58, "#ffe8a0"); glow(160, 128, 140, "#ff9a3a", 0.6);
      for (var cl = 0; cl < 5; cl++) { var cx = ((cl * 90 + t * 6) % 420) - 50; poly([[cx, 60 + cl * 8], [cx + 70, 56 + cl * 8], [cx + 90, 62 + cl * 8], [cx + 10, 66 + cl * 8]], "rgba(90,20,40,0.6)"); }
      mountains(150, 26, "#3a1020", 3, 12);
      poly([[60, 200], [96, 150], [130, 140], [210, 142], [250, 160], [270, 200]], "#140810");
      var raise = ease((b - s0 - 16) / 2);
      heroLit("barbar", 140, 142, 0.82, { armF: lerp(0.3, 2.9, raise), elbF: lerp(0.3, 0.1, raise), armB: 0.3, legF: 0.15, legB: -0.2, wind: 1.3, sil: 0.85 }, t, "#ffd88a", 1);
      heroLit("kriegerin", 184, 142, 0.78, { armF: lerp(0.5, 2.7, raise), elbF: 0.1, armB: 0.6, elbB: 0.8, legF: 0.25, legB: -0.15, wind: 1.3, sil: 0.85, dir: -1 }, t, "#ffd88a", -1);
      return;
    }
    // Marsch durch die Berge, Merowin kommt dazu
    sky(["#2a1a4a", "#a04a5a", "#ffb07a"], 0, 140);
    disc(260, 70, 20, "#fff0c0");
    mountains(120, 50, "#5a3a6a", 1, 14, t * 3);
    mountains(145, 30, "#3a2040", 6, 10, t * 8);
    rect(0, 160, W, 40, "#2a1420"); mountains(168, 8, "#3a1e28", 9, 6, t * 30);
    for (var tr = 0; tr < 6; tr++) { var tx = ((tr * 70 - t * 30) % 420 + 420) % 420 - 50; poly([[tx, 170], [tx + 8, 130], [tx + 16, 170]], "#140a14"); }
    var step = t * 7;
    heroLit("barbar", 120, 176, 0.62, { armF: 0.6 + Math.sin(step) * 0.3, elbF: 0.4, armB: -Math.sin(step) * 0.4, legF: Math.sin(step) * 0.5, kneeF: Math.max(0, -Math.sin(step)) * 0.6, legB: -Math.sin(step) * 0.5, kneeB: Math.max(0, Math.sin(step)) * 0.6, wind: 1 }, t, "#ffb07a");
    heroLit("kriegerin", 160, 176, 0.6, { armF: 0.4 + Math.sin(step + 1) * 0.3, elbF: 0.3, armB: 0.5, elbB: 0.8, legF: Math.sin(step + 1) * 0.5, kneeF: Math.max(0, -Math.sin(step + 1)) * 0.6, legB: -Math.sin(step + 1) * 0.5, kneeB: Math.max(0, Math.sin(step + 1)) * 0.6, wind: 1 }, t, "#ffb07a");
    if (bar >= 8) {
      var ap = clamp((b - s0 - 32) / 2, 0, 1);
      if (ap < 1) { glow(206, 150, 40 * (1 - ap) + 10, "#9ad8ff", 0.9); sparks(206, 150, ap, 5, "#9ad8ff"); }
      if (ap > 0.3) heroLit("zauberer", 206, 176, 0.6, { armF: 0.6 + Math.sin(step + 2) * 0.2, elbF: 0.5, armB: 0.3, legF: Math.sin(step + 2) * 0.4, wind: 1 }, t, "#ffb07a");
    }
  }

  function sceneKampf(info, t) {
    var bar = info.bar, b = info.beat, s0 = M.sectionStart("kampf") / BEAT, sbeat = b - s0;
    sky(["#05020a", "#3a0a2a", "#8a1a1a"], 0, 160);
    disc(90, 60, 30, "#f0c8a0"); glow(90, 60, 70, "#ff6a4a", 0.4);
    stars(40, 90, 7, t);
    mountains(160, 30, "#1a0a14", 4, 10);
    poly([[150, 200], [170, 166], [230, 160], [300, 170], [320, 200]], "#2a1418");
    rect(0, 186, W, 14, "#1a0c10");
    var shake = sinceSfx("bruellen", b) < 0.5 || sinceSfx("blitz", b) < 0.3 ? Math.round((hash(Math.floor(t * 40), 2) - 0.5) * 5) : 0;
    ctx.save(); ctx.translate(shake, 0);
    // der Drache
    var hover = Math.sin(t * 1.8) * 6, dxp = 80 + Math.sin(t * 0.6) * 10, dyp = 90 + hover, calm = sbeat >= 52;
    var breathing = M.song.sfx.some(function (e) { return e.type === "feuer" && b >= e.t && b < e.t + e.d; });
    var roar = sinceSfx("bruellen", b) < 1.2, banned = sbeat >= 52;
    var mouth = dragonLit(dxp, dyp, 0.95, { flap: Math.sin(t * 5), neck: roar ? 0.6 : 0.2, jaw: breathing || roar ? 1 : 0.15, eye: calm && sbeat >= 55 ? "gold" : "rot", tail: 10 }, t, "#ff6a3a");
    // die Helden
    var shieldUp = sbeat >= 5 && sbeat < 12, leap = clamp((sbeat - 22) / 4, 0, 1), siraJump = clamp((sbeat - 36) / 3, 0, 1);
    var tx = lerp(210, 150, ease(leap)), ty = 184 - Math.sin(leap * Math.PI) * 60;
    if (leap >= 1) { tx = 170; ty = 184; }
    heroLit("barbar", tx, ty, 0.62, leap > 0 && leap < 1 ? { armF: 3, elbF: -0.4, armB: 2.2, legF: 0.8, kneeF: 0.8, legB: -0.6, kneeB: 0.9, dir: -1, wind: 1.5 } : { armF: 2.2, elbF: 0.5, armB: 0.5, legF: 0.2, legB: -0.3, dir: -1, wind: 1 }, t, "#ff6a3a", 1);
    var sx = lerp(240, 130, ease(siraJump)), sy = lerp(184, 84, ease(siraJump)) - Math.sin(siraJump * Math.PI) * 30;
    if (siraJump >= 1) { sx = dxp + 4; sy = dyp - 12 + hover * 0.2; }
    heroLit("kriegerin", sx, sy, 0.6, shieldUp ? { armF: 0.4, elbF: 0.6, armB: 1.4, legF: 0.4, kneeF: 0.3, legB: -0.4, shield: true, dir: -1, wind: 1.5 } : siraJump > 0 ? { armF: 2.6, elbF: 0.2, armB: 1, legF: 0.9, kneeF: 1, legB: -0.5, kneeB: 0.8, dir: -1 } : { armF: 1.8, elbF: 0.4, armB: 0.7, legF: 0.2, legB: -0.2, dir: -1, wind: 1 }, t, "#ff6a3a", 1);
    var casting = (sbeat >= 14 && sbeat < 18) || sbeat >= 48;
    var orb = heroLit("zauberer", 284, 184, 0.62, { armF: casting ? 2.8 : 0.6, elbF: casting ? 0 : 0.5, armB: casting ? 2 : 0.3, dir: -1, wind: 1.2 }, t, "#ff6a3a", 1);
    if (breathing) fire(mouth[0], mouth[1], Math.atan2(150 - mouth[1], 240 - mouth[0]), 150, t, 1, shieldUp ? { d: Math.hypot(240 - mouth[0], 150 - mouth[1]) - 12 } : null);
    if (sinceSfx("blitz", b) < 0.6) { lightning(orb[0], orb[1], dxp + 10, dyp - 10, Math.floor(t * 20), 2); ctx.fillStyle = "rgba(220,230,255," + (0.3 * (1 - sinceSfx("blitz", b) / 0.6)) + ")"; ctx.fillRect(-10, 0, W + 20, H); }
    var cl = sinceSfx("klirr", b); if (cl < 0.5) sparks(150, 120, cl / 0.5 + 0.1, 3);
    var sh = sinceSfx("schild", b); if (sh < 0.4) sparks(244, 140, sh / 0.4 + 0.1, 4, "#ffd04a");
    // Bannkreis aus Runen
    if (banned) {
      var k = clamp((sbeat - 52) / 3, 0, 1);
      glow(orb[0], orb[1], 30, "#6ad8ff", 0.8);
      ctx.save(); ctx.translate(dxp + 10, dyp); ctx.rotate(t);
      for (var r = 0; r < 12; r++) { var a = r / 12 * Math.PI * 2; ctx.save(); ctx.rotate(a); rect(54 * k - 2, -3, 4, 6, "#9ae8ff"); rect(54 * k - 1, -5, 2, 2, "#fff"); ctx.restore(); }
      ctx.restore();
      ctx.strokeStyle = "rgba(150,230,255," + (0.6 * k) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dxp + 10, dyp, 56 * k, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function sceneWende(info, t) {
    var b = info.beat, sbeat = b - M.sectionStart("wende") / BEAT;
    sky(["#1a1a4a", "#5a3a7a", "#e08a7a"], 0, 160);
    stars(50, 90, 2, t);
    disc(240, 50, 26, "#fff4d8"); glow(240, 50, 70, "#ffe0b0", 0.4);
    mountains(160, 26, "#2a1a3a", 4, 10);
    rect(0, 168, W, 32, "#2a1a28");
    var bow = ease(sbeat / 4);
    var mouth = dragonLit(110, 140, 1, { flap: -0.8, neck: -bow * 0.9, jaw: 0, eye: "gold", tail: 3 }, t, "#ffd88a");
    heroLit("kriegerin", 200, 172, 0.62, { armF: 1.4, elbF: 0.2, armB: 0.4, dir: -1, wind: 0.4 }, t, "#ffd88a", 1);
    heroLit("barbar", 236, 172, 0.64, { armF: 0.4, elbF: 0.3, armB: 0.3, dir: -1, wind: 0.4 }, t, "#ffd88a", 1);
    heroLit("zauberer", 270, 172, 0.62, { armF: 0.8, elbF: 0.4, armB: 0.3, dir: -1, wind: 0.4 }, t, "#ffd88a", 1);
    // Lichtfunken, wo der Fluch weicht
    for (var i = 0; i < 30; i++) { var u = (t * 0.4 + hash(i, 2)) % 1; ctx.globalAlpha = 1 - u; rect(80 + hash(i, 3) * 120, 150 - u * 120, 2, 2, i % 2 ? "#ffd84a" : "#9ae8ff"); }
    ctx.globalAlpha = 1;
  }

  function sceneFinale(info, t, ende) {
    var b = info.beat, sbeat = ende ? 40 : b - M.sectionStart("finale") / BEAT, dawn = clamp((sbeat - 16) / 20, 0, 1);
    sky([mix("#05051a", "#2a3a8a", dawn), mix("#1a1a4a", "#e07a6a", dawn), mix("#3a2a6a", "#ffd08a", dawn)], 0, H);
    ctx.globalAlpha = 1 - dawn * 0.8; stars(80, 140, 9, t); ctx.globalAlpha = 1;
    disc(160, 90, 62, mix("#fff4d8", "#ffe0a0", dawn)); glow(160, 90, 120, "#ffe8c0", 0.35);
    if (dawn > 0) glow(160, 200, 160, "#ffb04a", 0.6 * dawn);
    for (var c = 0; c < 8; c++) { var cx = ((c * 70 - t * 25) % 480 + 480) % 480 - 80; poly([[cx, 170 + (c % 3) * 8], [cx + 60, 160 + (c % 3) * 8], [cx + 100, 168 + (c % 3) * 8], [cx + 30, 180 + (c % 3) * 8]], mix("#3a3a6a", "#e8a08a", dawn)); }
    var dx = lerp(-80, 400, clamp(sbeat / 36, 0, 1)), dy = 96 + Math.sin(t * 1.6) * 8;
    if (ende) { dx = 160; dy = 120; }
    dragon(dx, dy, 0.9, { flap: Math.sin(t * 4), neck: 0.3, eye: "gold", sil: ende ? 0.2 : 0.9 - dawn * 0.6 }, t);
    [["zauberer", -16], ["kriegerin", 0], ["barbar", 16]].forEach(function (r, i) {
      hero(r[0], dx + r[1] * 0.9, dy - 10 + Math.sin(t * 1.6 + i) * 0.5, 0.36, { armF: i === 1 ? 2.8 : 1, elbF: 0.2, armB: 0.6, legF: 1.2, kneeF: -1, legB: 1, kneeB: -1, wind: 1.5, sil: ende ? 0.2 : 0.9 - dawn * 0.6 }, t);
    });
    if (sbeat >= 24 || ende) { goldLogo("DRACHENFEUER", W / 2, 30, t, 16); text(ende ? "ENDE" : "", W / 2, 52, 8, "#ffe0b0"); }
    if (sbeat >= 28 || ende) scroller(t, CREDITS, 188);
  }

  // ---------- Erzähler ----------

  function wrap(str, max) {
    var words = str.split(" "), lines = [""];
    words.forEach(function (w) { if ((lines[lines.length - 1] + " " + w).trim().length > max) lines.push(w); else lines[lines.length - 1] = (lines[lines.length - 1] + " " + w).trim(); });
    return lines;
  }
  function narration(str, k) {
    var shown = str.slice(0, Math.floor(str.length * clamp(k * 2.2, 0, 1))), lines = wrap(shown, 36), all = wrap(str, 36);
    var h = all.length * 11 + 8, y = H - h - 4;
    rect(6, y, W - 12, h, "#1a0e08"); rect(7, y + 1, W - 14, h - 2, "#e8d4a8"); rect(9, y + 3, W - 18, h - 6, "#f4e4c0");
    ctx.font = "8px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "#3a1a08";
    lines.forEach(function (l, i) { ctx.fillText(l, 14, y + 6 + i * 11); });
  }

  // ---------- ein Bild ----------

  var current = { scene: "titel" };
  function renderAt(t) {
    t = Math.max(0, t);
    var info = M.at(t), b = info.beat, sec = info.section;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.imageSmoothingEnabled = false;
    rect(0, 0, W, H, "#000");
    if (sec === "titel") sceneTitel(info, t);
    else if (sec === "zauberer") sceneZauberer(info, t);
    else if (sec === "drache") sceneDrache(info, t);
    else if (sec === "helden") sceneHelden(info, t);
    else if (sec === "kampf") sceneKampf(info, t);
    else if (sec === "wende") sceneWende(info, t);
    else sceneFinale(info, t, sec === "ende");
    var said = "";
    NARRATION.forEach(function (n) { if (b >= n[0] && b < n[0] + n[1]) { narration(n[2], (b - n[0]) / n[1]); said = n[2]; } });
    M.song.vocals.forEach(function (e) { if (b >= e.t && b < e.t + e.d + 2.5) { var s = SPEAKER[e.cat] + ": „" + e.word + "“"; narration(s, 1); said = s; } });
    dither();
    current = { scene: sec, said: said };
    return sec;
  }

  // ---------- Ablauf ----------

  var LABELS = { titel: "TITEL", zauberer: "DER ZAUBERER", drache: "DER DRACHE", helden: "DIE HELDEN", kampf: "DER KAMPF", wende: "DIE WENDE", finale: "FINALE", ende: "ENDE" };
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
    if (partEl && partEl.textContent !== "TEIL: " + LABELS[scene]) partEl.textContent = "TEIL: " + LABELS[scene];
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
  var idleN = 0;
  function idle(now) { if (running) return; if (idleN++ % 3 === 0) renderAt(11 + ((now || 0) / 1000) % 3); requestAnimationFrame(idle); }
  if (document.fonts && document.fonts.load) document.fonts.load("8px " + FONT).catch(function () {});
  requestAnimationFrame(idle);
  requestAnimationFrame(frame);

  window.drachen = {
    renderAt: renderAt,
    get scene() { return current.scene; },
    get state() { return current; },
    get frames() { return frames; },
    get running() { return running; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return M.DURATION; }
  };
})();
