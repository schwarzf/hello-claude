/**
 * Kleines Test-Framework und Tests für die Taskverwaltung.
 * Läuft komplett im Browser (test.html).
 */
(function () {
  "use strict";

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || "Assertion fehlgeschlagen");
  }
  function assertEqual(actual, expected, msg) {
    var a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) throw new Error((msg ? msg + ": " : "") + "erwartet " + e + ", erhalten " + a);
  }
  function assertThrows(fn, msg) {
    try { fn(); } catch (e) { return; }
    throw new Error(msg || "Exception erwartet");
  }
  function newStore() {
    return new TaskStore(TaskStore.createMemoryStorage(), "test");
  }
  function titles(tasks) {
    return tasks.map(function (t) { return t.title; });
  }

  var unitTests = [
    ["Neuer Store ist leer", function () {
      var s = newStore();
      assertEqual(s.list(), []);
      assertEqual(s.stats(), { total: 0, done: 0, open: 0 });
    }],
    ["Task hinzufügen mit Standardwerten", function () {
      var t = newStore().add("  Einkaufen  ");
      assertEqual(t.title, "Einkaufen", "Titel wird getrimmt");
      assertEqual(t.done, false);
      assertEqual(t.priority, "mittel");
      assertEqual(t.dueDate, null);
      assert(t.id, "ID vorhanden");
    }],
    ["Leerer Titel wird abgelehnt", function () {
      var s = newStore();
      assertThrows(function () { s.add(""); });
      assertThrows(function () { s.add("   "); });
      assertEqual(s.stats().total, 0);
    }],
    ["Ungültige Priorität und Datum werden abgelehnt", function () {
      var s = newStore();
      assertThrows(function () { s.add("x", { priority: "dringend" }); });
      assertThrows(function () { s.add("x", { dueDate: "morgen" }); });
    }],
    ["IDs sind eindeutig", function () {
      var s = newStore(), ids = {};
      for (var i = 0; i < 100; i++) ids[s.add("t" + i).id] = true;
      assertEqual(Object.keys(ids).length, 100);
    }],
    ["Task umschalten (toggle)", function () {
      var s = newStore(), t = s.add("A");
      assertEqual(s.toggle(t.id).done, true);
      assertEqual(s.toggle(t.id).done, false);
    }],
    ["Task bearbeiten (update)", function () {
      var s = newStore(), t = s.add("A");
      s.update(t.id, { title: "B", priority: "hoch", dueDate: "2030-01-31" });
      var u = s.get(t.id);
      assertEqual([u.title, u.priority, u.dueDate], ["B", "hoch", "2030-01-31"]);
      assertThrows(function () { s.update(t.id, { title: "" }); });
      assertThrows(function () { s.update("gibtsnicht", { title: "x" }); });
    }],
    ["Task löschen", function () {
      var s = newStore(), a = s.add("A");
      s.add("B");
      assertEqual(s.remove(a.id), true);
      assertEqual(s.remove(a.id), false);
      assertEqual(titles(s.list()), ["B"]);
    }],
    ["Erledigte löschen", function () {
      var s = newStore();
      s.toggle(s.add("A").id);
      s.add("B");
      s.toggle(s.add("C").id);
      assertEqual(s.clearCompleted(), 2);
      assertEqual(titles(s.list()), ["B"]);
    }],
    ["Filter offen / erledigt / alle", function () {
      var s = newStore();
      s.toggle(s.add("A").id);
      s.add("B");
      assertEqual(titles(s.list({ filter: "offen" })), ["B"]);
      assertEqual(titles(s.list({ filter: "erledigt" })), ["A"]);
      assertEqual(s.list({ filter: "alle" }).length, 2);
    }],
    ["Suche ist unabhängig von Groß-/Kleinschreibung", function () {
      var s = newStore();
      s.add("Milch kaufen");
      s.add("Auto waschen");
      assertEqual(titles(s.list({ search: "MILCH" })), ["Milch kaufen"]);
    }],
    ["Sortierung: offen, Priorität, Fälligkeit", function () {
      var s = newStore();
      s.add("niedrig", { priority: "niedrig" });
      s.add("hoch spät", { priority: "hoch", dueDate: "2030-12-01" });
      s.add("hoch früh", { priority: "hoch", dueDate: "2030-01-01" });
      s.toggle(s.add("erledigt hoch", { priority: "hoch" }).id);
      s.add("mittel");
      assertEqual(titles(s.list()), ["hoch früh", "hoch spät", "mittel", "niedrig", "erledigt hoch"]);
    }],
    ["list() liefert Kopien", function () {
      var s = newStore(), t = s.add("A");
      s.list()[0].title = "verändert";
      assertEqual(s.get(t.id).title, "A");
    }],
    ["Daten bleiben im Storage erhalten", function () {
      var storage = TaskStore.createMemoryStorage();
      var s1 = new TaskStore(storage, "k");
      s1.toggle(s1.add("Persistent", { priority: "hoch" }).id);
      var s2 = new TaskStore(storage, "k");
      assertEqual(s2.stats(), { total: 1, done: 1, open: 0 });
      assertEqual(s2.list()[0].title, "Persistent");
    }],
    ["Kaputte Daten im Storage führen zu leerem Store", function () {
      var storage = TaskStore.createMemoryStorage();
      storage.setItem("k", "{kein json");
      assertEqual(new TaskStore(storage, "k").stats().total, 0);
    }]
  ];

  // ---------- Unit-Tests Katzen-Morphing ----------

  function area(tri) {
    return Math.abs((tri[1].x - tri[0].x) * (tri[2].y - tri[0].y) - (tri[2].x - tri[0].x) * (tri[1].y - tri[0].y)) / 2;
  }
  function near(a, b, eps) { return Math.abs(a - b) < (eps || 1e-6); }
  function solidCanvas(color) {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
    return c;
  }
  function pixel(ctx, x, y) { return Array.prototype.slice.call(ctx.getImageData(x, y, 1, 1).data); }

  var morphTests = [
    ["Quadrat wird in zwei Dreiecke zerlegt", function () {
      var tris = CatMorph.triangulate([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
      assertEqual(tris.length, 2);
    }],
    ["Dreiecksnetz deckt das ganze Bild ab", function () {
      var pts = CatMorph.defaultPoints(512, 512).concat(CatMorph.borderPoints(512, 512));
      var tris = CatMorph.triangulate(pts);
      var sum = tris.reduce(function (acc, t) { return acc + area([pts[t[0]], pts[t[1]], pts[t[2]]]); }, 0);
      assert(near(sum, 512 * 512, 1e-3), "Fläche " + sum);
      assertEqual(tris.length, 2 * pts.length - 2 - 8, "Anzahl Dreiecke");
    }],
    ["Delaunay: kein Punkt liegt im Umkreis eines Dreiecks", function () {
      var pts = CatMorph.defaultPoints(512, 512).concat(CatMorph.borderPoints(512, 512));
      CatMorph.triangulate(pts).forEach(function (t) {
        var a = pts[t[0]], b = pts[t[1]], c = pts[t[2]];
        var d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
        var ux = ((a.x * a.x + a.y * a.y) * (b.y - c.y) + (b.x * b.x + b.y * b.y) * (c.y - a.y) + (c.x * c.x + c.y * c.y) * (a.y - b.y)) / d;
        var uy = ((a.x * a.x + a.y * a.y) * (c.x - b.x) + (b.x * b.x + b.y * b.y) * (a.x - c.x) + (c.x * c.x + c.y * c.y) * (b.x - a.x)) / d;
        var r2 = (a.x - ux) * (a.x - ux) + (a.y - uy) * (a.y - uy);
        pts.forEach(function (p, i) {
          if (t.indexOf(i) !== -1) return;
          assert((p.x - ux) * (p.x - ux) + (p.y - uy) * (p.y - uy) >= r2 - 1e-6, "Punkt " + i + " im Umkreis");
        });
      });
    }],
    ["Affine Abbildung trifft alle drei Eckpunkte", function () {
      var src = [{ x: 0, y: 0 }, { x: 100, y: 10 }, { x: 20, y: 80 }];
      var dst = [{ x: 50, y: 40 }, { x: 160, y: 30 }, { x: 70, y: 150 }];
      var m = CatMorph.affineFromTriangles(src, dst);
      src.forEach(function (p, i) {
        var q = CatMorph.applyAffine(m, p);
        assert(near(q.x, dst[i].x) && near(q.y, dst[i].y), "Ecke " + i);
      });
      assertEqual(CatMorph.affineFromTriangles([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], dst), null, "entartetes Dreieck");
    }],
    ["Zwischenpunkte werden linear interpoliert", function () {
      var a = [{ x: 0, y: 0 }], b = [{ x: 10, y: 20 }];
      assertEqual(CatMorph.lerpPoints(a, b, 0), a);
      assertEqual(CatMorph.lerpPoints(a, b, 1), b);
      assertEqual(CatMorph.lerpPoints(a, b, 0.5), [{ x: 5, y: 10 }]);
    }],
    ["Dreiecke werden gegen Haarlinien leicht vergrößert", function () {
      var tri = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }];
      assert(area(CatMorph.expandTriangle(tri, 1)) > area(tri));
    }],
    ["Morph: 0 % = Katze 1, 100 % = Katze 2, 50 % = Mischung", function () {
      var out = document.createElement("canvas");
      out.width = out.height = 64;
      var ctx = out.getContext("2d");
      var pts = CatMorph.defaultPoints(64, 64);
      var opts = {
        imageA: solidCanvas("#ff0000"), imageB: solidCanvas("#0000ff"),
        pointsA: pts, pointsB: pts,
        bufferA: document.createElement("canvas"), bufferB: document.createElement("canvas")
      };
      opts.t = 0; CatMorph.morph(ctx, opts);
      assertEqual(pixel(ctx, 32, 32), [255, 0, 0, 255]);
      opts.t = 1; CatMorph.morph(ctx, opts);
      assertEqual(pixel(ctx, 32, 32), [0, 0, 255, 255]);
      opts.t = 0.5; CatMorph.morph(ctx, opts);
      var p = pixel(ctx, 32, 32);
      assert(near(p[0], 127, 3) && near(p[2], 127, 3) && p[3] === 255, "erhalten " + p);
    }],
    ["Verzerrung verschiebt Bildinhalte mit den Punkten", function () {
      // Linke Hälfte rot: Wird der Mittelpunkt der Kante nach rechts gezogen, wandert die Kante mit.
      var a = document.createElement("canvas");
      a.width = a.height = 64;
      var actx = a.getContext("2d");
      actx.fillStyle = "#fff"; actx.fillRect(0, 0, 64, 64);
      actx.fillStyle = "#f00"; actx.fillRect(0, 0, 32, 64);
      var out = document.createElement("canvas");
      out.width = out.height = 64;
      var ctx = out.getContext("2d");
      var border = CatMorph.borderPoints(64, 64);
      var src = [{ x: 32, y: 32 }].concat(border), dst = [{ x: 48, y: 32 }].concat(border);
      CatMorph.warp(ctx, a, src, dst, CatMorph.triangulate(dst));
      assertEqual(pixel(ctx, 40, 32).slice(0, 3), [255, 0, 0], "Pixel bei x=40 jetzt rot");
      assertEqual(pixel(ctx, 56, 32).slice(0, 3), [255, 255, 255], "Pixel bei x=56 weiß");
    }]
  ];

  // ---------- Unit-Tests Gesichter ----------

  var faceTests = [
    ["54 Gesichtspunkte in fünf Gruppen, Vorlage passt dazu", function () {
      assertEqual(FaceMorph.INDICES.length, 54);
      assertEqual(FaceMorph.GROUPS.length, 5);
      assertEqual(FaceMorph.TEMPLATE.length, FaceMorph.INDICES.length);
      assertEqual(FaceMorph.POINT_GROUP.length, FaceMorph.INDICES.length);
      FaceMorph.INDICES.forEach(function (i) { assert(i >= 0 && i < 478, "Index " + i); });
      FaceMorph.TEMPLATE.forEach(function (p) { assert(p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1, "Vorlage im Bild"); });
    }],
    ["Vorlage ist symmetrisch", function () {
      var xs = FaceMorph.TEMPLATE.map(function (p) { return p[0]; }).sort();
      var mirrored = FaceMorph.TEMPLATE.map(function (p) { return +(1 - p[0]).toFixed(3); }).sort();
      xs.forEach(function (x, i) { assert(near(x, mirrored[i], 0.002), x + " vs " + mirrored[i]); });
    }],
    ["Punkte werden aus den 478 Landmarks ausgewählt", function () {
      var lm = [];
      for (var i = 0; i < 478; i++) lm.push({ x: i, y: -i });
      var pts = FaceMorph.selectPoints(lm);
      assertEqual(pts.length, 54);
      assertEqual(pts[0], { x: FaceMorph.INDICES[0], y: -FaceMorph.INDICES[0] });
    }],
    ["Ausschnitt ist quadratisch und enthält das ganze Gesicht", function () {
      var pts = [{ x: 100, y: 200 }, { x: 300, y: 200 }, { x: 200, y: 50 }, { x: 200, y: 400 }];
      var crop = FaceMorph.cropAroundFace(pts);
      assert(near(crop.size, 350 * 1.7), "Größe " + crop.size);
      var inCrop = FaceMorph.toCrop(pts, crop, 512);
      inCrop.forEach(function (p) { assert(p.x > 0 && p.x < 512 && p.y > 0 && p.y < 512, "im Ausschnitt"); });
      assert(near(inCrop[0].x + inCrop[1].x, 512), "waagerecht zentriert");
    }],
    ["Bereiche außerhalb des Fotos werden aufgefüllt", function () {
      var img = solidCanvas("#ff0000");
      var out = document.createElement("canvas");
      out.width = out.height = 100;
      var ctx = out.getContext("2d");
      FaceMorph.drawCrop(ctx, img, { x: -32, y: 0, size: 64 }, 100, "#00ff00");
      assertEqual(pixel(ctx, 10, 50).slice(0, 3), [0, 255, 0], "links Füllfarbe");
      assertEqual(pixel(ctx, 90, 50).slice(0, 3), [255, 0, 0], "rechts Foto");
    }]
  ];

  // ---------- Unit-Tests Katzenspiel ----------

  var KS = window.KatzenSpiel;

  /** Einfacher Bot: hält rechts, springt vor Hindernissen, kriecht durch Tunnel, jagt Mäuse per Satz. */
  function botInput(g) {
    var c = g.cat, box = KS.catBox(c), v = Math.max(c.vx, 60);
    var next = g.level.obstacles.filter(function (o) { return o.x + o.w > box.left - 2; })[0];
    var input = { right: true, jump: false, jumpHeld: true, duck: false, pounce: false };
    if (next) {
      var dist = next.x - box.right;
      if (next.kind === "tunnel") input.duck = dist < 30;
      else input.jump = dist > 0 && dist < v * 0.16 + 4;
    }
    var mouse = g.level.mice.filter(function (m) { return !m.caught && m.x > c.x && m.x - c.x < 170; })[0];
    var clear = !next || next.x - box.right > 280 || next.x + next.w < box.left;
    if (mouse && clear && c.onGround && !input.duck) input.pounce = true;
    return input;
  }

  function simulate(g, policy, maxSeconds) {
    var events = [];
    for (var i = 0; i < maxSeconds * 120 && g.status === "running"; i++) {
      events = events.concat(KS.step(g, 1 / 120, policy(g)));
    }
    return events;
  }
  function count(events, name) { return events.filter(function (e) { return e === name; }).length; }
  function emptyLevel(g) { g.level.obstacles = []; g.level.mice = []; g.level.birds = []; return g; }

  var gameTests = [
    ["Fünf Level mit Ziel, Hindernissen, Vögeln und Mäusen", function () {
      assertEqual(KS.LEVELS.length, 5);
      KS.LEVELS.forEach(function (def, i) {
        var l = KS.buildLevel(i);
        assert(l.obstacles.length >= 8, "Level " + (i + 1) + " hat Hindernisse");
        assert(l.birds.length >= 5, "Level " + (i + 1) + " hat Vögel");
        assert(l.mice.length >= 3, "Level " + (i + 1) + " hat Mäuse");
        assert(l.obstacles[l.obstacles.length - 1].x + 200 < l.goalX, "Platz vor dem Ziel");
        l.mice.forEach(function (m) {
          l.obstacles.forEach(function (o) { assert(m.max < o.x || m.min > o.x + o.w, "Maus läuft nicht durch Hindernisse"); });
        });
      });
      assertEqual(KS.buildLevel(0).obstacles.some(function (o) { return o.kind === "tunnel"; }), false, "Level 1 ohne Tunnel");
      assert(KS.buildLevel(1).obstacles.some(function (o) { return o.kind === "tunnel"; }), "ab Level 2 Tunnel");
    }],
    ["Level sind bei jedem Laden gleich", function () {
      assertEqual(JSON.stringify(KS.buildLevel(3)), JSON.stringify(KS.buildLevel(3)));
    }],
    ["Katze bewegt sich nur, wenn man läuft", function () {
      var g = emptyLevel(KS.createGame(0)), x = g.cat.x;
      simulate(g, function () { return {}; }, 1);
      assertEqual(g.cat.x, x, "steht still");
      simulate(g, function () { return { right: true }; }, 1);
      assert(g.cat.x > x + 150, "läuft nach rechts");
      var right = g.cat.x;
      simulate(g, function () { return { left: true }; }, 1);
      assert(g.cat.x < right - 100, "läuft nach links");
      assertEqual(g.cat.facing, -1, "schaut nach links");
    }],
    ["Langes Halten macht schneller, geduckt geht es langsam", function () {
      var g = emptyLevel(KS.createGame(0));
      simulate(g, function () { return { right: true }; }, 0.5);
      assert(near(g.cat.vx, KS.WALK, 1), "normal " + g.cat.vx);
      simulate(g, function () { return { right: true }; }, 3);
      assert(near(g.cat.vx, KS.WALK * KS.SPRINT, 1), "Sprint " + g.cat.vx);
      simulate(g, function () { return { right: true, duck: true }; }, 1);
      assert(near(g.cat.vx, KS.CRAWL, 1), "kriechen " + g.cat.vx);
    }],
    ["Sprung ist hoch genug für jedes Hindernis, aber nicht über Tunnel", function () {
      var apex = KS.JUMP_SPEED * KS.JUMP_SPEED / (2 * KS.GRAVITY);
      Object.keys(KS.GROUND_TYPES).forEach(function (k) {
        assert(apex > KS.GROUND_TYPES[k].h + 40, k + " überspringbar");
      });
      assert(apex + KS.CAT.h < KS.TUNNEL_TOP, "Tunnel nicht überspringbar");
      assert(KS.CAT.duckH - KS.CAT.margin < KS.TUNNEL_GAP, "geduckt passt in den Tunnel");
      assert(KS.CAT.h - KS.CAT.margin > KS.TUNNEL_GAP, "stehend nicht");
    }],
    ["Gegen ein Hindernis laufen kostet ein Leben, danach kurz unverwundbar", function () {
      var g = KS.createGame(0);
      var ev = simulate(g, function () { return { right: true }; }, 3);
      assertEqual(count(ev, "hit"), 1);
      assertEqual(g.lives, 8);
    }],
    ["Im Tunnel: stehend Treffer, geduckt frei", function () {
      var g = KS.createGame(1), t = g.level.obstacles.filter(function (o) { return o.kind === "tunnel"; })[0];
      g.cat.x = t.x + 40;
      assertEqual(KS.step(g, 1 / 120, {}), ["hit"]);
      var g2 = KS.createGame(1);
      g2.cat.x = t.x + 40;
      assertEqual(KS.step(g2, 1 / 120, { duck: true }), []);
    }],
    ["Alle 5 Level sind ohne Treffer schaffbar, Mäuse sind fangbar", function () {
      var score = 0, lives = 9, mice = 0;
      for (var i = 0; i < 5; i++) {
        var g = KS.createGame(i, score, lives);
        var ev = simulate(g, botInput, 300);
        assertEqual(count(ev, "hit"), 0, "Treffer in Level " + (i + 1));
        assertEqual(g.status, i < 4 ? "level" : "won", "Level " + (i + 1));
        mice += count(ev, "mouse");
        score = g.score;
        lives = g.lives;
      }
      assertEqual(lives, 9);
      assert(mice >= 10, "Mäuse gefangen: " + mice);
    }],
    ["Mäuse flüchten und lassen sich nur mit einem Satz fangen", function () {
      var g = emptyLevel(KS.createGame(0));
      var m = { min: 300, max: 450, x: 330, dir: 1, fleeing: false, caught: false, wander: 0 };
      g.level.mice = [m];
      g.cat.x = 200;
      simulate(g, function () { return {}; }, 0.3);
      assert(m.fleeing && m.x > 330, "Maus flüchtet");
      // Maus in die Ecke treiben und einfach drüberlaufen: kein Fang
      var cornered = false;
      var ev = simulate(g, function () { cornered = cornered || m.cornered; return { right: true }; }, 2.5);
      assert(cornered, "Maus sitzt in der Ecke");
      assertEqual(count(ev, "mouse"), 0, "Laufen fängt keine Maus");
      // Mit einem Satz fangen
      m.x = m.max;
      g.cat.x = m.max - 120;
      g.cat.facing = 1;
      g.cat.vx = 0;
      ev = simulate(g, function (gg) { return { pounce: gg.cat.onGround && !gg.cat.pouncing }; }, 1);
      assertEqual(count(ev, "mouse"), 1, "Satz fängt die Maus");
      assert(g.score >= KS.POINTS.mouse, "Punkte für die Maus");
    }],
    ["Vogel fangen gibt Extrapunkte", function () {
      var g = KS.createGame(0), b = g.level.birds[0];
      g.level.obstacles.forEach(function (o) { o.done = true; }); // keine Punkte für übersprungene Hindernisse
      g.level.mice = [];
      b.baseY = 25;
      g.cat.x = b.x - 20;
      var ev = KS.step(g, 1 / 120, {});
      assertEqual(ev, ["bird"]);
      assertEqual(g.score, KS.POINTS.bird);
      assertEqual(KS.step(g, 1 / 120, {}), [], "nur einmal fangbar");
    }],
    ["Nach 9 Treffern ist das Spiel vorbei", function () {
      var g = KS.createGame(0), box = g.level.obstacles[0];
      g.cat.x = box.x + box.w / 2; // mitten in der Kiste stehen bleiben
      var ev = simulate(g, function () { return {}; }, 20);
      assertEqual(count(ev, "hit"), 9);
      assertEqual(g.status, "gameover");
    }]
  ];

  // ---------- Unit-Tests Musik ----------

  var musicTests = [
    ["Melodie bleibt in G-Dur", function () {
      var scale = [7, 9, 11, 0, 2, 4, 6]; // G A H C D E Fis
      Musik.MELODY.forEach(function (m) { assert(scale.indexOf(m[1] % 12) !== -1, "Ton " + m[1]); });
      Musik.MELODY.forEach(function (m) { assert(m[0] >= 0 && m[0] + m[2] <= 8 * 16, "innerhalb von 8 Takten"); });
    }],
    ["Songteile nutzen nur bekannte Akkorde", function () {
      Musik.SECTIONS.forEach(function (sec) {
        sec.chords.forEach(function (c) { assert(Musik.CHORDS[c], sec.name + ": " + c); });
        if (sec.melody) assertEqual(sec.chords.length, 8, sec.name + " passt zur Melodie");
      });
    }],
    ["Gezupfte Saite klingt ab und bleibt im Wertebereich", function () {
      var d = Musik.makePluck(44100, 196, 1.5, 1);
      var early = 0, late = 0;
      for (var i = 0; i < 4410; i++) early += Math.abs(d[i]);
      for (var j = d.length - 4410; j < d.length; j++) late += Math.abs(d[j]);
      assert(late < early * 0.5, "klingt ab");
      for (var k = 0; k < d.length; k++) assert(isFinite(d[k]) && Math.abs(d[k]) <= 1, "Wertebereich");
    }],
    ["Demo-Sound: Basslinie, Lead und Songteile sind stimmig", function () {
      assertEqual(DemoMusik.BASSLINE.length, 16, "16 Schritte pro Takt");
      var aMoll = [9, 11, 0, 2, 4, 5, 7]; // A H C D E F G
      DemoMusik.LEAD.forEach(function (m) {
        assert(aMoll.indexOf(m[1] % 12) !== -1, "Lead-Ton " + m[1] + " in a-Moll");
        assert(m[0] + m[2] <= 128, "Lead innerhalb von 8 Takten");
      });
      DemoMusik.SECTIONS.forEach(function (sec) {
        assert(sec.bars > 0 && sec.bars % 4 === 0, sec.name + ": ganze Akkordfolgen");
        if (sec.lead) assertEqual(sec.bars, 8, sec.name + " passt zur Lead-Melodie");
      });
      Object.keys(DemoMusik.ARPS).forEach(function (c) { assertEqual(DemoMusik.ARPS[c].length, 3, c); });
    }],
    ["Demo-Sound hat viel Bass und übersteuert nicht", function () {
      // Hauptteil (ab Takt 8) mit Kick, Bass und Arpeggio
      return DemoMusik.render(8 * DemoMusik.STEP * 16 + 4, 22050).then(function (buf) {
        var d = buf.getChannelData(0), from = Math.floor(8 * DemoMusik.STEP * 16 * 22050), peak = 0;
        var low = 0, all = 0, lp = 0;
        for (var i = from; i < d.length; i++) {
          peak = Math.max(peak, Math.abs(d[i]));
          lp += (d[i] - lp) * 0.04; // einfacher Tiefpass (~150 Hz)
          low += lp * lp;
          all += d[i] * d[i];
        }
        assert(peak < 0.95, "Spitze " + peak.toFixed(2));
        assert(Math.sqrt(all / (d.length - from)) > 0.05, "hörbar");
        assert(low / all > 0.3, "Bassanteil " + Math.round(low / all * 100) + " %");
      });
    }],
    ["Katzen-Demo: Song in F-Dur mit Miau-Melodie, Band-Ereignisse vorhanden", function () {
      var K = KatzenDemoMusik, fDur = [5, 7, 9, 10, 0, 2, 4]; // F G A B C D E
      K.LEAD.forEach(function (m) { assert(fDur.indexOf(m[1] % 12) !== -1, "Miau-Ton " + m[1] + " in F-Dur"); });
      assertEqual(K.SECTIONS.map(function (s) { return s.name; }), ["flug", "wolle", "band", "longcat", "finale"]);
      var counts = {};
      for (var st = 0; st < K.SONG_BARS * 16; st++) {
        var e = K.at(st, true).events;
        Object.keys(e).forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
      }
      ["kick", "snare", "hat", "bass", "purr", "arp", "lead", "crash"].forEach(function (k) { assert(counts[k] > 0, k + " kommt vor"); });
      assertEqual(K.at(K.SONG_BARS * 16, true).section, "ende", "Video endet");
      assertEqual(K.at(K.SONG_BARS * 16).section, "band", "live geht es mit der Band weiter");
    }],
    ["Katzen-Demo-Sound hat viel Bass und übersteuert nicht", function () {
      var K = KatzenDemoMusik, from = 16 * 16 * K.STEP; // Band-Teil
      return K.render(from + 4, 22050, true).then(function (buf) {
        var d = buf.getChannelData(0), i0 = Math.floor(from * 22050), peak = 0, low = 0, all = 0, lp = 0;
        for (var i = i0; i < d.length; i++) {
          peak = Math.max(peak, Math.abs(d[i]));
          lp += (d[i] - lp) * 0.04;
          low += lp * lp;
          all += d[i] * d[i];
        }
        assert(peak < 0.95, "Spitze " + peak.toFixed(2));
        assert(low / all > 0.25, "Bassanteil " + Math.round(low / all * 100) + " %");
      });
    }],
    ["Katzenfrieden: Songablauf, Tempo-Steigerung und Zeittabelle", function () {
      var F = FriedenMusik;
      assertEqual(F.SECTIONS.map(function (s) { return s.name; }), ["streit", "minze", "waelzen", "frieden", "tanz", "ende"]);
      var hidschas = [2, 3, 6, 7, 9, 10, 0]; // D Es Fis G A B C
      F.TANZ.forEach(function (m) { assert(hidschas.indexOf(m[1] % 12) !== -1, "Tanzton " + m[1]); });
      var tanz = 0;
      for (var i = 0; i < 4; i++) tanz += F.SECTIONS[i].bars * 16;
      var first = 60 / (F.stepLength(tanz) * 4), lastBpm = 60 / (F.stepLength(tanz + 16 * 16 - 1) * 4);
      assert(near(first, 100, 1), "Tanz beginnt mit 100 BPM: " + first);
      assert(lastBpm > 175, "Tanz endet schnell: " + lastBpm);
      for (var st = 0; st < F.STEPS; st += 37) {
        var p = F.stepAt(F.stepTime(st) + F.stepLength(st) / 2);
        assertEqual(p.step, st, "stepAt passt zu stepTime");
      }
      var counts = {};
      for (var k = 0; k < F.STEPS; k++) Object.keys(F.at(k).events).forEach(function (e) { counts[e] = (counts[e] || 0) + 1; });
      ["hiss", "fight", "drop", "burst", "pad", "lead", "clap", "opa", "kick", "bass", "purr"].forEach(function (e) { assert(counts[e] > 0, e + " kommt vor"); });
    }],
    ["Katzenfrieden-Sound hat viel Bass und übersteuert nicht", function () {
      var F = FriedenMusik, from = 28.8; // Wälzen und Frieden
      return F.render(from + 6, 22050, true).then(function (buf) {
        var d = buf.getChannelData(0), i0 = Math.floor(from * 22050), peak = 0, low = 0, all = 0, lp = 0;
        for (var i = i0; i < d.length; i++) {
          peak = Math.max(peak, Math.abs(d[i]));
          lp += (d[i] - lp) * 0.04;
          low += lp * lp;
          all += d[i] * d[i];
        }
        assert(peak < 0.95, "Spitze " + peak.toFixed(2));
        assert(low / all > 0.25, "Bassanteil " + Math.round(low / all * 100) + " %");
      });
    }],
    ["Zwei Katzen: vier Szenen, eigene Tempi, Knurren und Duell", function () {
      var G = GeschichteMusik;
      assertEqual(G.SECTIONS.map(function (s) { return s.name; }), ["szene1", "szene2", "szene3", "zoegern", "romantik", "ende"]);
      var cDur = [0, 2, 4, 5, 7, 9, 11];
      G.LIEBE.forEach(function (m) { assert(cDur.indexOf(m[1] % 12) !== -1, "Liebesmelodie in C-Dur: " + m[1]); });
      var bpm = function (name) { return 60 / (G.stepLength(Math.round(G.stepAt(G.sectionStart(name) + 0.01).step)) * 4); };
      assert(near(bpm("szene2"), 120, 0.5) && bpm("szene2") > bpm("szene1"), "Szene 2 ist schneller und spannender");
      assert(bpm("romantik") < bpm("szene1"), "Romantik ist ruhiger");
      var growls = { szene1: [0, 0], szene2: [0, 0], szene3: [0, 0], romantik: [0, 0] }, duel = 0;
      for (var st = 0; st < G.STEPS; st++) {
        var a = G.at(st);
        if (a.events.growl !== undefined && growls[a.section]) growls[a.section][a.events.growl]++;
        if (a.events.hit) duel++;
      }
      assert(growls.szene1[0] > 0 && growls.szene1[1] > 0, "in Szene 1 knurren beide");
      assert(growls.szene2[0] > 0 && growls.szene2[1] > 0, "in Szene 2 knurren beide");
      assertEqual(growls.szene3, [0, 0], "in Szene 3 knurrt niemand");
      assertEqual(growls.romantik, [0, 0], "beim Versöhnen knurrt niemand");
      assert(duel > 0, "Duell-Schläge in Szene 2");
    }],
    ["Zwei-Katzen-Musik übersteuert nicht", function () {
      var G = GeschichteMusik, from = G.sectionStart("szene2");
      return G.render(from + 8, 22050, true).then(function (buf) {
        var d = buf.getChannelData(0), peak = 0, sum = 0, i0 = Math.floor(from * 22050);
        for (var i = i0; i < d.length; i++) { peak = Math.max(peak, Math.abs(d[i])); sum += d[i] * d[i]; }
        assert(peak < 0.95, "Spitze " + peak.toFixed(2));
        assert(Math.sqrt(sum / (d.length - i0)) > 0.05, "hörbar");
      });
    }],
    ["HYPERFLUX: Songaufbau, Tonart und Ereignisse", function () {
      var N = NeonMusik, eMoll = [4, 6, 7, 9, 11, 0, 2];
      assertEqual(N.SECTIONS.map(function (s) { return s.name; }), ["boot", "terrain", "ocean", "acid", "morph", "final"]);
      N.LEAD.forEach(function (m) { assert(eMoll.indexOf(m[1] % 12) !== -1, "Lead-Ton " + m[1] + " in e-Moll"); });
      var per = {};
      for (var st = 0; st < N.SONG_STEPS; st++) {
        var a = N.at(st, true);
        per[a.section] = per[a.section] || {};
        Object.keys(a.events).forEach(function (k) { per[a.section][k] = true; });
        assert(a.acidCut >= 0 && a.acidCut <= 1, "Acid-Filter im Bereich");
      }
      assert(per.acid.acid && per.final.acid && !per.terrain.acid, "Acid-Linie nur in Acid und Finale");
      assert(per.ocean.wash && per.ocean.pad && !per.ocean.bass, "Ozean ist der ruhige Teil");
      assert(per.boot.riser && per.ocean.riser, "Riser vor den Drops");
      assertEqual(N.at(N.SONG_STEPS, true).section, "ende");
      assertEqual(N.at(N.SONG_STEPS).section, "terrain", "live geht es mit der Landschaft weiter");
    }],
    ["HYPERFLUX-Sound ist laut, basslastig und wird weich begrenzt", function () {
      var N = NeonMusik, from = 24 * 16 * N.STEP; // Acid-Teil
      return N.render(from + 4, 22050, true).then(function (buf) {
        var d = buf.getChannelData(0), i0 = Math.floor(from * 22050), peak = 0, low = 0, all = 0, lp = 0;
        for (var i = i0; i < d.length; i++) {
          peak = Math.max(peak, Math.abs(d[i]));
          lp += (d[i] - lp) * 0.04;
          low += lp * lp;
          all += d[i] * d[i];
        }
        assert(peak <= 0.92, "Begrenzer hält die Spitze: " + peak.toFixed(2));
        assert(Math.sqrt(all / (d.length - i0)) > 0.15, "laut");
        assert(low / all > 0.3, "Bassanteil " + Math.round(low / all * 100) + " %");
      });
    }],
    ["Andi-Demo: Songablauf mit Solo-Flug, Jagd und Party", function () {
      var A = AndiMusik;
      assertEqual(A.SECTIONS.map(function (s) { return s.name; }), ["flug1", "flug2", "wolle1", "wolle2", "band", "longcat", "finale"]);
      var has = {};
      for (var st = 0; st < A.SONG_BARS * 16; st++) {
        var a = A.at(st, true);
        has[a.section] = has[a.section] || {};
        Object.keys(a.events).forEach(function (k) { has[a.section][k] = true; });
      }
      assert(!has.flug1.bass && !has.flug1.lead, "Solo-Flug ist ruhig");
      assert(has.flug2.bass && has.flug2.kick, "mit Regenbogen kommt der Beat");
      assert(has.wolle1.lead && has.wolle2.lead && has.band.lead, "Miau-Melodie bei Jagd und Party");
      assertEqual(A.at(A.SONG_BARS * 16).section, "band", "live geht die Party weiter");
    }],
    ["SINGULARITY: Ablauf, Tempo-Rampe, Chaos-Regler und Motiv", function () {
      var S = SingularityMusik;
      assertEqual(S.SECTIONS.map(function (s) { return s.name; }), ["punkt", "gitter", "lorenz", "bruch", "fraktal", "pause", "horizont", "morph", "tunnel", "stille", "licht", "weiss"]);
      assert(S.DURATION > 115 && S.DURATION < 145, "rund zwei Minuten: " + S.DURATION.toFixed(1));
      var first = {}, lastStep = {};
      for (var st = 0; st < S.STEPS; st++) { var a = S.at(st); if (first[a.section] === undefined) first[a.section] = st; lastStep[a.section] = st; }
      assert(S.stepLength(lastStep.tunnel) < S.stepLength(first.gitter) * 0.5, "der Tunnel ist am Ende mehr als doppelt so schnell wie das Gitter");
      assert(S.at(first.punkt).chaos === 0 && S.at(lastStep.tunnel).chaos > 0.99, "Chaos-Regler läuft von 0 bis 1");
      assert(S.at(first.fraktal).chaos > S.at(first.bruch).chaos && S.at(first.bruch).chaos > S.at(first.lorenz).chaos, "Chaos steigt von Szene zu Szene");
      assertEqual(Object.keys(S.at(first.stille).events), ["mute"], "Stille vor dem Finale");
      assert(S.at(first.stille + 16).events.heart && S.at(first.stille + 16).events.unmute, "ein Herzschlag vor der Explosion");
      assert(S.at(first.licht).events.impact && S.at(first.licht).events.wall && S.at(first.licht).events.kick, "die Explosion setzt mit voller Wucht ein");
      assertEqual(Object.keys(S.at(first.weiss).events), ["hit"], "ein einziger Schlussschlag");
      assert(S.at(first.tunnel + 3).events.acid && !S.at(first.morph + 3).events.acid, "Acid-Linie im Tunnel");
      assert(S.at(first.morph).chaos < S.at(lastStep.fraktal).chaos, "der Morph-Teil ist freundlicher als das Fraktal");
      assertEqual(S.MO_MIN.map(function (m, i) { return S.MO_MAJ[i] - m; }), [0, 0, 1, 0], "aus Moll wird Dur: nur die Terz ändert sich");
      for (var k = 0; k < S.STEPS; k += 53) assertEqual(S.stepAt(S.stepTime(k) + S.stepLength(k) / 2).step, k, "Zeittabelle stimmig");
      assertEqual(S.at(S.STEPS + 5).section, "ende");
    }],
    ["SINGULARITY: Tunnel ist laut und begrenzt, danach herrscht Stille", function () {
      var S = SingularityMusik, stille = S.sectionStart("stille"), from = stille - 2.5;
      return S.render(3.9, 22050, from).then(function (buf) {
        var d = buf.getChannelData(0), sr = 22050, peak = 0, loud = 0, quiet = 0, n1 = Math.floor(2.4 * sr), n0 = Math.floor(2.9 * sr);
        for (var i = 0; i < n1; i++) { peak = Math.max(peak, Math.abs(d[i])); loud += d[i] * d[i]; }
        for (var j = n0; j < d.length; j++) quiet += d[j] * d[j];
        assert(peak <= 0.92, "Begrenzer hält die Spitze: " + peak.toFixed(2));
        assert(Math.sqrt(loud / n1) > 0.12, "Tunnel ist laut: " + Math.sqrt(loud / n1).toFixed(3));
        assert(Math.sqrt(quiet / (d.length - n0)) < 0.02, "Stille: " + Math.sqrt(quiet / (d.length - n0)).toFixed(4));
      });
    }],
    ["Katzen-Habanera: Bizets Melodie, Aufbau und wer wann singt", function () {
      var H = HabaneraMusik, v = H.song.vocals;
      assertEqual(H.SECTIONS.map(function (s) { return s.name; }), ["intro", "strophe", "rap", "aufbau", "refrain", "rap2", "refrain2", "outro"]);
      assert(H.DURATION > 50 && H.DURATION < 65, "knapp eine Minute: " + H.DURATION.toFixed(1));
      // die berühmte chromatische Linie abwärts: d'' cis'' c'' c'' c'' h' b' a' a'
      assertEqual(H.P1.map(function (n) { return n[2]; }), [74, 73, 72, 72, 72, 71, 70, 69, 69]);
      assertEqual(H.at(0).section, "intro");
      var st = H.SECTIONS[1].start * H.BAR, first = v.filter(function (e) { return e.type === "sing" && e.t >= st; })[0];
      assertEqual([first.cat, first.midi], [0, 74], "die Diva beginnt die Strophe auf d''");
      function who(name, type) {
        var s = H.SECTIONS.filter(function (x) { return x.name === name; })[0], cats = {};
        v.forEach(function (e) { if (e.type === type && e.t >= s.start * H.BAR && e.t < (s.start + s.bars) * H.BAR) cats[e.cat] = true; });
        return Object.keys(cats).join("");
      }
      assertEqual(who("rap", "rap"), "1", "im Rap rappt nur der Kater");
      assertEqual(who("rap", "sing"), "", "im Rap wird nicht gesungen");
      assertEqual(who("refrain", "sing"), "01", "im Refrain singen beide");
      assertEqual(who("rap2", "rap"), "01", "im Battle rappen beide");
      var ref = H.SECTIONS[4].start * H.BAR, duo = v.filter(function (e) { return e.type === "sing" && e.t === ref; });
      assertEqual(duo.map(function (e) { return e.midi; }).sort(), [62, 74], "Refrain in Oktaven");
      assert(H.song.guitar.some(function (g) { return g.dist; }) && !H.song.guitar.some(function (g) { return g.dist && g.t < H.SECTIONS[3].start * H.BAR; }), "die Rock-Gitarre kommt erst zum Aufbau");
      assertEqual(H.song.sfx.map(function (e) { return e.type; }), ["whoosh", "thud"], "am Ende fliegt ein Stiefel");
      assertEqual(H.at(H.DURATION - 0.5).section, "ende");
    }],
    ["Katzen-Habanera: Refrain ist lauter als die Strophe und übersteuert nicht", function () {
      var H = HabaneraMusik;
      function rms(d) { var s = 0; for (var i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length); }
      return H.render(3, 22050, 6).then(function (a) {
        return H.render(3, 22050, 28).then(function (b) {
          var d = b.getChannelData(0), peak = 0, ra = rms(a.getChannelData(0)), rb = rms(d);
          for (var i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
          assert(ra > 0.04, "Strophe hörbar: " + ra.toFixed(3));
          assert(rb > ra * 1.2, "Refrain lauter: " + rb.toFixed(3) + " gegen " + ra.toFixed(3));
          assert(peak <= 0.92, "Begrenzer hält die Spitze: " + peak.toFixed(2));
        });
      });
    }],
    ["Miau-Rave: knapp drei Minuten, Geschichte im Song, Rückung im Finale", function () {
      var R = RaveMusik, S = R.song;
      assertEqual(R.SECTIONS.map(function (s) { return s.name; }), ["abfahrt", "zelten", "party", "verloren", "wiederfinden", "finale", "morgen"]);
      assert(R.DURATION > 160 && R.DURATION < 180, "knapp drei Minuten: " + R.DURATION.toFixed(1));
      function inSec(list, name, pred) {
        var s = R.SECTIONS.filter(function (x) { return x.name === name; })[0], a = s.start * R.BAR, b = (s.start + s.bars) * R.BAR;
        return list.filter(function (e) { return e.t >= a && e.t < b && (!pred || pred(e)); });
      }
      assert(inSec(S.drums, "party", function (e) { return e.type === "k"; }).length > 100, "Party mit durchgehender Bassdrum");
      assertEqual(inSec(S.drums, "verloren", function (e) { return e.type !== "hb"; }).length, 0, "Verloren: nur der Herzschlag, keine Drums");
      assert(inSec(S.vocals, "verloren", function (e) { return e.cat === 3 && e.word === "Miau?"; }).length === 3, "Mini ruft dreimal „Miau?“");
      // der Gruppen-Ruf „Mi-a-u!“ verbindet Zelten, Wiederfinden und Finale
      ["zelten", "wiederfinden", "finale"].forEach(function (n) {
        assert(inSec(S.vocals, n, function (e) { return e.cat === 3 && e.type === "sing"; }).length >= 3, "Gruppen-Ruf im Abschnitt " + n);
      });
      assert(inSec(S.vocals, "wiederfinden", function (e) { return e.type === "sing"; }).map(function (e) { return e.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }).length === 4, "beim Wiederfinden rufen alle vier");
      var p = inSec(S.lead, "party"), f = inSec(S.lead, "finale");
      assertEqual(f[0].midi - p[0].midi, 2, "Finale zwei Halbtöne höher");
      assert(inSec(S.chip, "abfahrt").length > 100 && inSec(S.gtr, "zelten").length > 30, "Chip-Arpeggios bei der Abfahrt, Gitarre beim Zelten");
      assertEqual(R.at(R.DURATION - 0.5).section, "ende");
    }],
    ["Miau-Rave: Party ist laut und begrenzt, Verloren leise", function () {
      var R = RaveMusik;
      function rms(d) { var s = 0; for (var i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length); }
      return R.render(2.5, 22050, R.sectionStart("party") + 25).then(function (a) {
        return R.render(2.5, 22050, R.sectionStart("verloren") + 3).then(function (b) {
          var d = a.getChannelData(0), peak = 0, ra = rms(d), rb = rms(b.getChannelData(0));
          for (var i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
          assert(ra > 0.12, "Party laut: " + ra.toFixed(3));
          assert(rb < ra * 0.5 && rb > 0.01, "Verloren leise, aber hörbar: " + rb.toFixed(3));
          assert(peak <= 0.92, "Begrenzer hält die Spitze: " + peak.toFixed(2));
        });
      });
    }],
    ["Regenbogen-Roadtrip: Stationen, Farben kehren zurück, Instrumente kommen dazu", function () {
      var R = RoadtripMusik, S = R.song;
      assertEqual(R.SECTIONS.map(function (s) { return s.name; }), ["prolog", "aufbruch", "wueste", "blumen", "faehre", "sturm", "bruecke", "abspann"]);
      assert(R.DURATION > 175 && R.DURATION < 200, "etwa drei Minuten: " + R.DURATION.toFixed(1));
      function startOf(name) { return R.SECTIONS.filter(function (x) { return x.name === name; })[0].start * R.BAR; }
      // Farben: erst alle, nach dem Raub keine, dann 2 → 4 → 5 → 6
      assertEqual(R.colorsAt(0), 6);
      assertEqual(R.colorsAt(startOf("aufbruch")), 0, "nach dem Farbraub grau");
      assertEqual([R.colorsAt(startOf("blumen")), R.colorsAt(startOf("faehre")), R.colorsAt(startOf("sturm")), R.colorsAt(startOf("bruecke"))], [2, 4, 5, 6]);
      // mit jeder Farbe ein Instrument: Bass ab Rot/Orange, Arpeggio ab Gelb/Grün, zweite Stimme ab Blau, Akkorde ab Violett
      function first(list) { return list.filter(function (e) { return e.t >= startOf("aufbruch"); })[0].t; }
      var back = {}; R.COLORS.forEach(function (c) { if (!c.drain) back[c.n] = c.t; });
      assertEqual(first(S.bass), back[2], "Bass kommt mit Rot und Orange");
      assertEqual(first(S.arp), back[4], "Arpeggio kommt mit Gelb und Grün");
      assertEqual(S.lead2[0].t, back[5], "zweite Stimme kommt mit Blau");
      assertEqual(S.chords[0].t, back[6], "Akkorde kommen mit Violett");
      // nach dem Raub spielt das Motiv nur einen Ton
      var lonely = S.lead.filter(function (e) { return e.t >= startOf("prolog") + 32 && e.t < startOf("aufbruch"); });
      assert(lonely.length > 3 && lonely.every(function (e) { return e.midi === 64; }), "einsames Motiv auf einem Ton");
      assert(S.vocals.some(function (e) { return e.cat === 3 && /grau/.test(e.word); }), "Nebelbart ist einsam");
      assertEqual(R.at(R.DURATION - 0.5).section, "ende");
    }],
    ["Regenbogen-Roadtrip: Finale lauter als der Prolog und begrenzt", function () {
      var R = RoadtripMusik;
      function rms(d) { var s = 0; for (var i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length); }
      return R.render(2.5, 22050, R.sectionStart("bruecke") + 10).then(function (a) {
        return R.render(2.5, 22050, R.sectionStart("prolog") + 17).then(function (b) {
          var d = a.getChannelData(0), peak = 0, ra = rms(d), rb = rms(b.getChannelData(0));
          for (var i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
          assert(ra > 0.1, "Finale hörbar laut: " + ra.toFixed(3));
          assert(rb < ra && rb > 0.01, "Prolog nach dem Raub leiser: " + rb.toFixed(3));
          assert(peak <= 0.92, "Begrenzer hält die Spitze: " + peak.toFixed(2));
        });
      });
    }],
    ["Drachenfeuer: Ablauf, Heldenthema in Moll und Dur, Kampf mit Feuer, Schild und Blitz", function () {
      var D = DrachenMusik, S = D.song;
      assertEqual(D.SECTIONS.map(function (s) { return s.name; }), ["titel", "zauberer", "drache", "helden", "kampf", "wende", "finale"]);
      assert(D.DURATION > 150 && D.DURATION < 175, "gut zweieinhalb Minuten: " + D.DURATION.toFixed(1));
      function startOf(n) { return D.SECTIONS.filter(function (x) { return x.name === n; })[0].start * D.BAR; }
      function inSec(list, n) { var s = D.SECTIONS.filter(function (x) { return x.name === n; })[0]; return list.filter(function (e) { return e.t >= s.start * D.BAR && e.t < (s.start + s.bars) * D.BAR; }); }
      // das Heldenthema: in den Helden-Takten in d-Moll (mit f), im Finale in D-Dur (mit fis)
      var held = inSec(S.brass, "helden").map(function (e) { return e.midi % 12; }), fin = inSec(S.brass, "finale").map(function (e) { return e.midi % 12; });
      assert(held.indexOf(5) >= 0 && held.indexOf(6) < 0, "Helden in Moll");
      assert(fin.indexOf(6) >= 0 && fin.indexOf(5) < 0, "Finale in Dur");
      assertEqual(D.THEME.map(function (bar) { return bar[0][2]; }), [62, 70, 65, 69]);
      var fx = inSec(S.sfx, "kampf").map(function (e) { return e.type; });
      ["feuer", "schild", "blitz", "klirr", "bann"].forEach(function (k) { assert(fx.indexOf(k) >= 0, "im Kampf: " + k); });
      assert(fx.indexOf("schild") > fx.indexOf("feuer"), "der Schild hebt sich gegen das Feuer");
      assert(inSec(S.drums, "kampf").length > inSec(S.drums, "helden").length, "der Kampf trommelt mehr als der Marsch");
      assertEqual(inSec(S.drums, "wende").length, 0, "die Wende ist ruhig");
      assertEqual(D.at(D.DURATION - 0.5).section, "ende");
    }],
    ["Drachenfeuer: Kampf laut und begrenzt, Wende leise", function () {
      var D = DrachenMusik;
      function rms(d) { var s = 0; for (var i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length); }
      return D.render(2.5, 22050, D.sectionStart("kampf") + 12).then(function (a) {
        return D.render(2.5, 22050, D.sectionStart("wende") + 3).then(function (b) {
          var d = a.getChannelData(0), peak = 0, ra = rms(d), rb = rms(b.getChannelData(0));
          for (var i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
          assert(ra > 0.12, "Kampf laut: " + ra.toFixed(3));
          assert(rb < ra * 0.7 && rb > 0.02, "Wende leiser, aber hörbar: " + rb.toFixed(3));
          assert(peak <= 0.92, "Begrenzer hält die Spitze: " + peak.toFixed(2));
        });
      });
    }],
    ["Musik ist hörbar, aber nicht übersteuert", function () {
      return Musik.render(6, 22050).then(function (buf) {
        var d = buf.getChannelData(0), peak = 0, sum = 0;
        for (var i = 0; i < d.length; i++) { peak = Math.max(peak, Math.abs(d[i])); sum += d[i] * d[i]; }
        var rms = Math.sqrt(sum / d.length);
        assert(rms > 0.01, "hörbar (RMS " + rms.toFixed(3) + ")");
        assert(peak < 0.95, "nicht übersteuert (Spitze " + peak.toFixed(2) + ")");
      });
    }]
  ];

  // ---------- UI-Tests ----------

  var frame = document.getElementById("app-frame");
  var TEST_KEY = "hello-claude.tasks";
  var savedTasks = null;

  function loadApp(page) {
    return new Promise(function (resolve) {
      frame.onload = function () { resolve(frame.contentWindow); };
      frame.src = (page || "index.html") + "?t=" + Date.now();
    });
  }

  function waitFor(cond, ms) {
    var until = Date.now() + (ms || 3000);
    return new Promise(function (resolve, reject) {
      (function check() {
        var v;
        try { v = cond(); } catch (e) { v = false; }
        if (v) return resolve(v);
        if (Date.now() > until) return reject(new Error("Zeitüberschreitung"));
        setTimeout(check, 50);
      })();
    });
  }

  function setInput(win, input, value) {
    input.value = value;
    input.dispatchEvent(new win.Event("input", { bubbles: true }));
  }

  function addViaForm(win, title, priority) {
    var doc = win.document, form = doc.getElementById("new-task-form");
    form.elements.title.value = title;
    if (priority) form.elements.priority.value = priority;
    form.querySelector("button[type=submit]").click();
  }

  function visibleTitles(doc) {
    return Array.prototype.map.call(doc.querySelectorAll("#task-list li.task .title"), function (n) {
      return n.textContent;
    });
  }

  var uiTests = [
    ["Leere Liste zeigt Hinweis", function (win) {
      var doc = win.document;
      assert(doc.querySelector("#task-list .empty"), "Hinweis fehlt");
      assertEqual(doc.getElementById("stats").textContent, "0 offen · 0 erledigt · 0 gesamt");
    }],
    ["Task über Formular hinzufügen", function (win) {
      addViaForm(win, "Erster Task", "hoch");
      var doc = win.document;
      assertEqual(visibleTitles(doc), ["Erster Task"]);
      assertEqual(doc.querySelector("li.task .badge").textContent, "hoch");
      assertEqual(doc.getElementById("new-task-form").elements.title.value, "", "Formular zurückgesetzt");
    }],
    ["Leerer Titel zeigt Fehlermeldung", function (win) {
      addViaForm(win, "   ");
      var doc = win.document;
      assert(doc.getElementById("form-error").textContent.length > 0, "Fehlermeldung fehlt");
      assertEqual(visibleTitles(doc).length, 1);
    }],
    ["Task abhaken und filtern", function (win) {
      addViaForm(win, "Zweiter Task");
      var doc = win.document;
      var cb = doc.querySelector("li.task input[type=checkbox]");
      cb.click();
      assertEqual(doc.getElementById("stats").textContent, "1 offen · 1 erledigt · 2 gesamt");
      doc.querySelector("[data-filter=offen]").click();
      assertEqual(visibleTitles(doc), ["Zweiter Task"]);
      doc.querySelector("[data-filter=erledigt]").click();
      assertEqual(visibleTitles(doc), ["Erster Task"]);
      doc.querySelector("[data-filter=alle]").click();
      assertEqual(visibleTitles(doc).length, 2);
    }],
    ["Suche filtert die Liste", function (win) {
      var doc = win.document, s = doc.getElementById("search");
      setInput(win, s, "zweit");
      assertEqual(visibleTitles(doc), ["Zweiter Task"]);
      setInput(win, s, "");
      assertEqual(visibleTitles(doc).length, 2);
    }],
    ["Titel per Doppelklick bearbeiten", function (win) {
      var doc = win.document;
      var title = doc.querySelector("li.task .title");
      title.dispatchEvent(new win.MouseEvent("dblclick", { bubbles: true }));
      var input = doc.querySelector("li.task input.title");
      assert(input, "Eingabefeld erscheint");
      input.value = "Umbenannt";
      input.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      assert(visibleTitles(doc).indexOf("Umbenannt") !== -1, "Neuer Titel angezeigt");
    }],
    ["Erledigte löschen und einzelnen Task löschen", function (win) {
      var doc = win.document;
      doc.getElementById("clear-completed").click();
      assertEqual(visibleTitles(doc).length, 1);
      doc.querySelector("li.task button.link").click();
      assert(doc.querySelector("#task-list .empty"), "Liste wieder leer");
    }],
    ["Tasks überstehen ein Neuladen", function () {
      var win = frame.contentWindow;
      addViaForm(win, "Bleibt erhalten");
      return loadApp().then(function (w) {
        assertEqual(visibleTitles(w.document), ["Bleibt erhalten"]);
        assert(w.document.querySelector('a[href="katzen.html"]'), "Link zur Katzenseite fehlt");
        assert(w.document.querySelector('a[href="gesichter.html"]'), "Link zur Gesichterseite fehlt");
        assert(w.document.querySelector('a[href="katzenspiel.html"]'), "Link zum Katzenspiel fehlt");
        assert(w.document.querySelector('a[href="demo.html"]'), "Link zur Amiga-Demo fehlt");
        assert(w.document.querySelector('a[href="katzendemo.html"]'), "Link zur Katzen-Demo fehlt");
        assert(w.document.querySelector('a[href="katzenfrieden.html"]'), "Link zu Katzenfrieden fehlt");
        assert(w.document.querySelector('a[href="zweikatzen.html"]'), "Link zu Zwei Katzen fehlt");
        assert(w.document.querySelector('a[href="neon.html"]'), "Link zu HYPERFLUX fehlt");
        assert(w.document.querySelector('a[href="gluehwuermchen.html"]'), "Link zu den Glühwürmchen fehlt");
        assert(w.document.querySelector('a[href="andi.html"]'), "Link zur Andi-Demo fehlt");
        assert(w.document.querySelector('a[href="singularity.html"]'), "Link zu SINGULARITY fehlt");
        assert(w.document.querySelector('a[href="habanera.html"]'), "Link zur Katzen-Habanera fehlt");
        assert(w.document.querySelector('a[href="rave.html"]'), "Link zum Miau-Rave fehlt");
        assert(w.document.querySelector('a[href="roadtrip.html"]'), "Link zum Regenbogen-Roadtrip fehlt");
        assert(w.document.querySelector('a[href="drachen.html"]'), "Link zu Drachenfeuer fehlt");
      });
    }],
    ["Jede Demo mit festem Ablauf verlinkt ihr Video im Release", function () {
      var pages = ["demo", "katzendemo", "katzenfrieden", "zweikatzen", "andi", "neon", "singularity", "habanera", "rave", "roadtrip", "drachen"];
      return Promise.all(pages.map(function (p) {
        return fetch(p + ".html").then(function (r) { return r.text(); }).then(function (html) {
          assert(html.indexOf('href="https://github.com/schwarzf/hello-claude/releases/download/videos/' + p + '.mp4"') >= 0, p + ".html verlinkt sein Video nicht");
        });
      }));
    }],
    ["Katzenseite: Beispielkatzen laden und mischen", function () {
      return loadApp("katzen.html").then(function (w) {
        var doc = w.document;
        assert(doc.getElementById("download").disabled, "Speichern ohne Fotos deaktiviert");
        doc.getElementById("load-demo").click();
        return waitFor(function () { return !doc.getElementById("download").disabled; }).then(function () {
          assertEqual(doc.querySelectorAll(".slot.has-image").length, 2);
          assertEqual(doc.querySelectorAll(".slot .marker").length, 20, "10 Punkte je Katze");
          var mix = doc.getElementById("mix");
          mix.value = "0";
          mix.dispatchEvent(new w.Event("input", { bubbles: true }));
          return waitFor(function () { return doc.getElementById("mix-value").textContent.indexOf("100 % Katze 1") === 0; });
        }).then(function () {
          // Hintergrundfarbe der roten Beispielkatze (oben links) muss im Ergebnis stehen
          var p = pixel(doc.getElementById("result").getContext("2d"), 5, 5);
          assertEqual(p.slice(0, 3), [191, 230, 245], "Pixel oben links");
        });
      });
    }],
    ["Gesichterseite: Beispielgesichter laden und mischen", function () {
      return loadApp("gesichter.html").then(function (w) {
        var doc = w.document;
        assert(doc.getElementById("download").disabled, "Speichern ohne Fotos deaktiviert");
        doc.getElementById("load-demo").click();
        return waitFor(function () { return !doc.getElementById("download").disabled; }).then(function () {
          assertEqual(doc.querySelectorAll(".slot.has-image").length, 2);
          assertEqual(doc.querySelectorAll(".slot .marker").length, 108, "54 Punkte je Gesicht");
          var mix = doc.getElementById("mix");
          mix.value = "100";
          mix.dispatchEvent(new w.Event("input", { bubbles: true }));
          return waitFor(function () { return doc.getElementById("mix-value").textContent.indexOf("0 % Gesicht 1") === 0; });
        }).then(function () {
          // Hintergrund von Beispielgesicht B (#ffb3d1) oben links im Ergebnis
          var p = pixel(doc.getElementById("result").getContext("2d"), 3, 3);
          assert(near(p[0], 255, 2) && near(p[1], 179, 2) && near(p[2], 209, 2), "Pixel oben links: " + p);
        });
      });
    }],
    ["Amiga-Demo: startet, zeichnet und wechselt die Szenen", function () {
      return loadApp("demo.html").then(function (w) {
        var doc = w.document;
        assert(!doc.getElementById("start").hidden, "Startbildschirm");
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden, "Demo läuft");
        return waitFor(function () { return w.demo.frames > 5; }, 3000).then(function () {
          assertEqual(w.demo.scene, "intro");
          w.demo.setScene("melodie");
          return waitFor(function () { return w.demo.scene === "melodie"; }, 1000);
        }).then(function () {
          return new Promise(function (r) { setTimeout(r, 150); });
        }).then(function () {
          // Boing-Szene: grauer Hintergrund mit lila Gitter
          var p = pixel(doc.getElementById("demo").getContext("2d"), 5, 100);
          assert(p[0] > 120 && p[1] > 120 && p[2] > 120 || (p[2] > p[1]), "Boing-Hintergrund: " + p);
        });
      });
    }],
    ["Katzen-Demo: startet und zeigt alle Szenen", function () {
      return loadApp("katzendemo.html").then(function (w) {
        var doc = w.document, kd = w.katzendemo, bar = 60 / 130 * 4;
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden, "Demo läuft");
        return waitFor(function () { return kd.frames > 5; }, 3000).then(function () {
          assertEqual(kd.scene, "flug");
          // jede Szene lässt sich zeichnen, das Video endet mit „ende“
          [["flug", 1], ["wolle", 10], ["band", 18], ["longcat", 27], ["finale", 33], ["ende", 36.5]].forEach(function (s) {
            assertEqual(kd.renderAt(s[1] * bar, true), s[0], "Szene bei Takt " + s[1]);
          });
          kd.setTime(18 * bar);
          return waitFor(function () { return kd.scene === "band"; }, 1000);
        });
      });
    }],
    ["Katzenfrieden: startet und zeigt alle Szenen", function () {
      return loadApp("katzenfrieden.html").then(function (w) {
        var doc = w.document, fr = w.frieden;
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden, "Demo läuft");
        return waitFor(function () { return fr.frames > 5; }, 3000).then(function () {
          assertEqual(fr.scene, "streit");
          [["streit", 5], ["minze", 22], ["waelzen", 35], ["frieden", 50], ["tanz", 70], ["ende", 87]].forEach(function (s) {
            assertEqual(fr.renderAt(s[1], true), s[0], "Szene bei " + s[1] + " s");
          });
          fr.setTime(70);
          return waitFor(function () { return fr.scene === "tanz"; }, 1000);
        });
      });
    }],
    ["Zwei Katzen: startet und zeigt alle Szenen", function () {
      return loadApp("zweikatzen.html").then(function (w) {
        var doc = w.document, ge = w.geschichte;
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden, "Demo läuft");
        return waitFor(function () { return ge.frames > 5; }, 3000).then(function () {
          assertEqual(ge.scene, "szene1");
          [["szene1", 5], ["szene2", 30], ["szene3", 45], ["zoegern", 58], ["romantik", 80], ["ende", 100]].forEach(function (s) {
            assertEqual(ge.renderAt(s[1], true), s[0], "Szene bei " + s[1] + " s");
          });
          ge.setTime(45);
          return waitFor(function () { return ge.scene === "szene3"; }, 1000);
        });
      });
    }],
    ["HYPERFLUX: Shader laufen und alle Szenen zeichnen ein Bild", function () {
      return loadApp("neon.html").then(function (w) {
        var doc = w.document, ne = w.neon, bar = 60 / 145 * 4;
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden, "Demo läuft");
        if (!ne.ok) {
          // ohne WebGL2 muss ein Hinweis erscheinen
          assert(!doc.getElementById("fail").hidden, "Hinweis ohne WebGL2");
          return;
        }
        [["boot", 5], ["terrain", 11], ["ocean", 19], ["acid", 27], ["morph", 35], ["final", 43]].forEach(function (s) {
          assertEqual(ne.renderAt(s[1] * bar, true, 0.25), s[0], "Szene bei Takt " + s[1]);
          assert(ne.brightness() > 8, s[0] + " zeichnet ein Bild");
        });
        assertEqual(ne.renderAt(49.5 * bar, true, 0.25), "ende");
        return waitFor(function () { return ne.frames > 1; }, 8000);
      });
    }],
    ["Glühwürmchen: schweben und sammeln sich am Finger", function () {
      return loadApp("gluehwuermchen.html").then(function (w) {
        var g = w.gluehwuermchen, size = g.size(), tx = size.w / 2, ty = size.h / 2;
        assert(g.flies.length >= 60, "genug Glühwürmchen");
        function avgDist() {
          return g.flies.reduce(function (sum, f) { return sum + Math.sqrt((f.x - tx) * (f.x - tx) + (f.y - ty) * (f.y - ty)); }, 0) / g.flies.length;
        }
        var before = avgDist();
        g.setTarget(tx, ty);
        for (var i = 0; i < 240; i++) g.update(1 / 60);
        g.draw();
        assert(avgDist() < before * 0.6, "sammeln sich: " + Math.round(before) + " → " + Math.round(avgDist()));
        g.flies.forEach(function (f) { assert(isFinite(f.x) && isFinite(f.y), "Positionen gültig"); });
      });
    }],
    ["Andi-Demo: startet und zeigt alle Szenen", function () {
      return loadApp("andi.html").then(function (w) {
        var doc = w.document, an = w.andi, bar = 60 / 130 * 4;
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden, "Demo läuft");
        return waitFor(function () { return an.frames > 5; }, 3000).then(function () {
          assertEqual(an.scene, "flug1");
          [["flug1", 2], ["flug2", 10], ["wolle1", 17], ["wolle2", 21], ["band", 26], ["longcat", 34], ["finale", 41], ["ende", 44.5]].forEach(function (s) {
            assertEqual(an.renderAt(s[1] * bar, true), s[0], "Szene bei Takt " + s[1]);
          });
        });
      });
    }],
    ["Katzen-Habanera: Comic startet, Katzen singen, die Linien leben", function () {
      return loadApp("habanera.html").then(function (w) {
        var doc = w.document, ha = w.habanera, H = w.HabaneraMusik, cv = doc.getElementById("demo"), c = cv.getContext("2d");
        assertEqual([cv.width, cv.height], [1280, 800], "volle Auflösung statt Pixel-Look");
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden && ha.running, "Demo läuft");
        function secStart(name) { return H.SECTIONS.filter(function (s) { return s.name === name; })[0].start * H.BAR * H.BEAT; }
        H.SECTIONS.forEach(function (s) { assertEqual(ha.renderAt(secStart(s.name) + 1.3), s.name, "Szene " + s.name); });
        // Strophe: die Diva singt mit offenem Mund, der Kater schweigt; unten steht Bizets Zeile
        ha.renderAt(secStart("strophe") + 0.3);
        assert(ha.state.open[0] > 0.5 && ha.state.open[1] === 0, "nur die Diva singt: " + ha.state.open.join(" / "));
        assertEqual(ha.state.line, H.LINES[0]);
        assert(/^Miau/.test(ha.state.bubble), "Sprechblase: " + ha.state.bubble);
        // Rap: der Kater ist dran
        ha.renderAt(secStart("rap") + 0.05);
        assert(ha.state.open[1] > 0.5, "der Kater rappt");
        ha.renderAt(secStart("refrain") + 0.3);
        assert(ha.state.open[0] > 0.5 && ha.state.open[1] > 0.5, "im Refrain singen beide");
        // „Line Boil“: dasselbe Motiv wird neu gezeichnet, die Tuschelinie wackelt
        function ink(boil) { ha.renderAt(2, boil); var d = c.getImageData(300, 200, 400, 300).data, n = 0; for (var i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 200) n += i % 977; return n; }
        var a = ink(0), b = ink(0.05), d2 = ink(0.5);
        assert(a > 0, "es gibt Tuschelinien");
        assertEqual(a, b, "innerhalb eines Zeichentrick-Bildes steht die Linie");
        assert(a !== d2, "im nächsten Bild ist sie neu gezeichnet");
        // Papier statt Schwarz: der Bildrand ist hell
        ha.renderAt(2);
        assert(pixel(c, 5, 400)[0] > 200, "heller Papierrand");
        assertEqual(ha.renderAt(H.DURATION - 0.3), "ende");
      });
    }],
    ["Miau-Rave: alle Kapitel, Amiga-Farben, Mini verloren und wiedergefunden", function () {
      return loadApp("rave.html").then(function (w) {
        var doc = w.document, ra = w.rave, R = w.RaveMusik, cv = doc.getElementById("demo"), c = cv.getContext("2d");
        assertEqual([cv.width, cv.height], [640, 400]);
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden && ra.running, "Demo läuft");
        R.SECTIONS.forEach(function (s) { assertEqual(ra.renderAt(R.sectionStart(s.name) + 1), s.name, "Kapitel " + s.name); });
        // Amiga-Look: jede Farbe besteht nur aus 6 Stufen je Kanal
        ra.renderAt(R.sectionStart("party") + 30);
        var d = c.getImageData(0, 0, 640, 400).data, ok = true;
        for (var i = 0; i < d.length; i += 4 * 97) if ([0, 51, 102, 153, 204, 255].indexOf(d[i]) < 0 || [0, 51, 102, 153, 204, 255].indexOf(d[i + 2]) < 0) ok = false;
        assert(ok, "nur Palettenfarben nach dem Dithering");
        // auf der Party sind alle da, im Verloren-Kapitel sucht Mini allein bzw. die Freunde ohne Mini
        assertEqual(ra.state.heads, [0, 1, 2, 3, 4]);
        ra.renderAt(R.sectionStart("verloren") + 1);
        assertEqual(ra.state.heads, [3], "Mini allein");
        ra.renderAt(R.sectionStart("verloren") + 2 * R.BAR * R.BEAT + 1);
        assertEqual(ra.state.heads, [0, 1, 2], "die Freunde suchen");
        ra.renderAt(R.sectionStart("wiederfinden") + 6 * R.BAR * R.BEAT + 3.3 * R.BEAT);
        assertEqual(ra.state.heads, [0, 1, 2, 3], "wieder vereint");
        assertEqual(ra.state.bubble, "Mi-a-u!", "der Gruppen-Ruf");
        ra.renderAt(R.sectionStart("party") + 0.1);
        assertEqual(ra.state.bubble, "Pfoten hoch!");
        assertEqual(ra.renderAt(R.DURATION - 0.3), "ende");
      });
    }],
    ["Regenbogen-Roadtrip: alle Kapitel, die Farbleiste füllt sich, Dialoge", function () {
      return loadApp("roadtrip.html").then(function (w) {
        var doc = w.document, rt = w.roadtrip, R = w.RoadtripMusik, cv = doc.getElementById("demo"), c = cv.getContext("2d");
        assertEqual([cv.width, cv.height], [320, 200], "echte Amiga-Auflösung");
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden && rt.running, "Demo läuft");
        R.SECTIONS.forEach(function (s) { assertEqual(rt.renderAt(R.sectionStart(s.name) + 1), s.name, "Kapitel " + s.name); });
        // Farbleiste unten rechts: sechs Felder, so viele bunt wie Farben zurück sind
        function slots() { var n = 0; for (var i = 0; i < 6; i++) { var p = pixel(c, 320 - 61 + i * 10 + 4, 200 - 7); if (!(p[0] === 0x3a && p[1] === 0x3a && p[2] === 0x44)) n++; } return n; }
        rt.renderAt(R.sectionStart("aufbruch") + 15); assertEqual(slots(), 0, "nach dem Farbraub leer");
        rt.renderAt(R.sectionStart("faehre") + 2); assertEqual(slots(), 4, "vor der Fähre vier Farben");
        rt.renderAt(R.sectionStart("bruecke") + 2); assertEqual(slots(), 6, "auf der Brücke alle sechs");
        // die Stadt ist nach dem Raub grau und am Ende wieder bunt
        function sat(x, y) { var p = pixel(c, x, y); return Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]); }
        rt.renderAt(R.sectionStart("prolog") + 9 * R.BAR * R.BEAT); assert(sat(20, 140) < 12, "graue Stadt");
        rt.renderAt(R.sectionStart("bruecke") + 14 * R.BAR * R.BEAT); assert(sat(20, 140) > 60, "bunte Stadt");
        rt.renderAt(R.sectionStart("sturm") + 8 * R.BAR * R.BEAT + 1);
        assertEqual(rt.state.said, "Bei mir ist alles grau …");
        assertEqual(rt.renderAt(R.DURATION - 0.3), "ende");
      });
    }],
    ["Drachenfeuer: alle Szenen, Amiga-Farben, Erzähler und Rufe", function () {
      return loadApp("drachen.html").then(function (w) {
        var doc = w.document, dr = w.drachen, D = w.DrachenMusik, cv = doc.getElementById("demo"), c = cv.getContext("2d");
        assertEqual([cv.width, cv.height], [320, 200]);
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden && dr.running, "Demo läuft");
        D.SECTIONS.forEach(function (s) { assertEqual(dr.renderAt(D.sectionStart(s.name) + 1.5), s.name, "Szene " + s.name); });
        // 12-Bit-Amiga-Farben: jeder Kanal ist ein Vielfaches von 17
        dr.renderAt(D.sectionStart("helden") + 3);
        var d = c.getImageData(0, 0, 320, 200).data, ok = true;
        for (var i = 0; i < d.length; i += 4 * 53) if (d[i] % 17 || d[i + 1] % 17 || d[i + 2] % 17) ok = false;
        assert(ok, "nur 12-Bit-Farben");
        // der Himmel hinter den Helden glüht warm
        var p = pixel(c, 160, 20); assert(p[0] > p[2], "warmer Himmel: " + p.join(","));
        dr.renderAt(D.sectionStart("zauberer") + 2 * D.BEAT);
        assert(/Merowin/.test(dr.state.said), "der Erzähler: " + dr.state.said);
        dr.renderAt(D.sectionStart("kampf") + 6 * D.BAR * D.BEAT + 0.5);
        assertEqual(dr.state.said, "THORGAR: „HAAAA!“");
        assertEqual(dr.renderAt(D.DURATION - 0.3), "ende");
      });
    }],
    ["SINGULARITY: Shader laufen, alle Szenen zeichnen, am Ende ist es weiß", function () {
      return loadApp("singularity.html").then(function (w) {
        var doc = w.document, si = w.singularity, S = w.SingularityMusik;
        doc.getElementById("play-silent").click();
        assert(doc.getElementById("start").hidden, "Demo läuft");
        if (!si.ok) {
          assert(!doc.getElementById("fail").hidden, "Hinweis ohne WebGL2");
          return;
        }
        ["punkt", "gitter", "lorenz", "bruch", "fraktal", "pause", "horizont", "morph", "tunnel", "licht"].forEach(function (name) {
          var t = S.sectionStart(name) + 2.5;
          assertEqual(si.renderAt(t, 0.2), name, "Szene " + name);
          assertEqual(si.renderAt(t + 0.03, 0.2), name);
        });
        assertEqual(si.renderAt(S.sectionStart("punkt") + 6, 0.2), "punkt");
        assertEqual(si.word, "SINGULARITY", "Titel am Anfang");
        assert(si.brightness() > 60, "der Lichtpunkt leuchtet in der Bildmitte");
        // beide Hälften von Bruch und Fraktal zeichnen ein eigenes Bild
        ["bruch", "fraktal"].forEach(function (name) {
          si.renderAt(S.sectionStart(name) + 9, 0.2);
          assert(si.brightness() > 3, name + ", zweite Hälfte");
        });
        assertEqual(si.renderAt(S.sectionStart("stille") + 0.7, 0.2), "stille");
        assert(si.brightness() < 3, "Stille ist schwarz");
        si.renderAt(S.sectionStart("stille") + 1.75, 0.2);
        assert(si.brightness() > 30, "beim Herzschlag leuchtet der Lichtpunkt auf");
        assertEqual(si.renderAt(S.sectionStart("weiss") + 3, 0.2), "weiss");
        assert(si.brightness() > 250, "am Ende ist alles weiß");
        assertEqual(si.renderAt(S.DURATION + 2, 0.2), "ende");
        return waitFor(function () { return si.frames > 1; }, 8000);
      });
    }],
    ["Katzenspiel: starten, laufen, springen und pausieren", function () {
      return loadApp("katzenspiel.html").then(function (w) {
        var doc = w.document, ks = w.katzenspiel;
        assert(!doc.getElementById("overlay").hidden, "Startbildschirm");
        doc.getElementById("overlay-button").click();
        assertEqual(doc.getElementById("overlay-title").textContent, "Level 1: Im Garten");
        doc.getElementById("overlay-button").click();
        assert(doc.getElementById("overlay").hidden, "Spiel läuft");
        assertEqual(doc.querySelectorAll("#hud-lives .lost").length, 0, "9 volle Herzen");
        var startX = ks.game.cat.x;
        var right = doc.getElementById("btn-right"), jump = doc.getElementById("btn-jump");
        return new Promise(function (r) { setTimeout(r, 300); }).then(function () {
          assertEqual(ks.game.cat.x, startX, "läuft nicht von allein");
          right.dispatchEvent(new w.PointerEvent("pointerdown", { bubbles: true, pointerId: 2 }));
          jump.dispatchEvent(new w.PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
          return waitFor(function () { return ks.game.cat.y > 20 && ks.game.cat.x > startX + 20; }, 2000);
        }).then(function () {
          jump.dispatchEvent(new w.PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
          right.dispatchEvent(new w.PointerEvent("pointerup", { bubbles: true, pointerId: 2 }));
          doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "p", bubbles: true }));
          assertEqual(doc.getElementById("overlay-title").textContent, "Pause");
          var x = ks.game.cat.x;
          return new Promise(function (r) { setTimeout(r, 200); }).then(function () {
            assertEqual(ks.game.cat.x, x, "steht in der Pause");
            assert(w.Musik.playing, "Musik läuft");
            doc.getElementById("btn-music").click();
            assert(!w.Musik.playing, "Musik aus");
            assertEqual(doc.getElementById("btn-music").getAttribute("aria-pressed"), "false");
            doc.getElementById("btn-music").click(); // Einstellung wieder zurücksetzen
          });
        });
      });
    }]
  ];

  // ---------- Runner ----------

  function report(listEl, name, error) {
    var li = document.createElement("li");
    li.className = error ? "fail" : "pass";
    li.textContent = name;
    if (error) {
      var msg = document.createElement("span");
      msg.className = "msg";
      msg.textContent = error.message;
      li.appendChild(msg);
    }
    listEl.appendChild(li);
  }

  function backupStorage() {
    savedTasks = localStorage.getItem(TEST_KEY);
    localStorage.removeItem(TEST_KEY);
  }

  function restoreStorage() {
    if (savedTasks === null) localStorage.removeItem(TEST_KEY);
    else localStorage.setItem(TEST_KEY, savedTasks);
  }

  function run() {
    var unitList = document.getElementById("unit-results");
    var morphList = document.getElementById("morph-results");
    var faceList = document.getElementById("face-results");
    var gameList = document.getElementById("game-results");
    var musicList = document.getElementById("music-results");
    var uiList = document.getElementById("ui-results");
    var summary = document.getElementById("summary");
    unitList.innerHTML = "";
    morphList.innerHTML = "";
    faceList.innerHTML = "";
    gameList.innerHTML = "";
    musicList.innerHTML = "";
    uiList.innerHTML = "";
    summary.className = "test-summary";
    summary.textContent = "Tests laufen …";
    var passed = 0, failed = 0;

    unitTests.forEach(function (t) {
      try { t[1](); passed++; report(unitList, t[0]); }
      catch (e) { failed++; report(unitList, t[0], e); }
    });
    morphTests.forEach(function (t) {
      try { t[1](); passed++; report(morphList, t[0]); }
      catch (e) { failed++; report(morphList, t[0], e); }
    });
    faceTests.forEach(function (t) {
      try { t[1](); passed++; report(faceList, t[0]); }
      catch (e) { failed++; report(faceList, t[0], e); }
    });
    gameTests.forEach(function (t) {
      try { t[1](); passed++; report(gameList, t[0]); }
      catch (e) { failed++; report(gameList, t[0], e); }
    });

    // UI-Tests nutzen den echten localStorage → vorher sichern, danach wiederherstellen.
    backupStorage();
    return musicTests.reduce(function (p, t) {
      return p.then(function () { return t[1](); })
        .then(function () { passed++; report(musicList, t[0]); },
              function (e) { failed++; report(musicList, t[0], e); });
    }, Promise.resolve()).then(function () {
      return loadApp();
    }).then(function (win) {
      try {
        win.document.getElementById("task-list");
      } catch (e) {
        // Chrome/Edge blockieren den Zugriff auf iframes bei file://-URLs.
        var li = document.createElement("li");
        li.className = "skip";
        li.textContent = "UI-Tests übersprungen: Der Browser erlaubt keinen Zugriff auf das iframe (file://). " +
          "Bitte die Seite über einen lokalen Webserver öffnen, z. B. „python3 -m http.server“ → http://localhost:8000/test.html";
        uiList.appendChild(li);
        return;
      }
      return uiTests.reduce(function (p, t) {
        return p.then(function () {
          return Promise.resolve().then(function () { return t[1](frame.contentWindow || win); })
            .then(function () { passed++; report(uiList, t[0]); },
                  function (e) { failed++; report(uiList, t[0], e); });
        });
      }, Promise.resolve());
    }).then(function () {
      restoreStorage();
      summary.className = "test-summary " + (failed ? "fail" : "pass");
      summary.textContent = passed + " bestanden, " + failed + " fehlgeschlagen";
      window.testResults = { passed: passed, failed: failed };
    });
  }

  window.addEventListener("beforeunload", restoreStorage);
  document.getElementById("rerun").addEventListener("click", run);
  run();
})();
