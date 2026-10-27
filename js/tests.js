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
      });
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
    var uiList = document.getElementById("ui-results");
    var summary = document.getElementById("summary");
    unitList.innerHTML = "";
    morphList.innerHTML = "";
    faceList.innerHTML = "";
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

    // UI-Tests nutzen den echten localStorage → vorher sichern, danach wiederherstellen.
    backupStorage();
    return loadApp().then(function (win) {
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
