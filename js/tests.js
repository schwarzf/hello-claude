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

  // ---------- UI-Tests ----------

  var frame = document.getElementById("app-frame");
  var TEST_KEY = "hello-claude.tasks";
  var savedTasks = null;

  function loadApp() {
    return new Promise(function (resolve) {
      frame.onload = function () { resolve(frame.contentWindow); };
      frame.src = "index.html?t=" + Date.now();
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
    var uiList = document.getElementById("ui-results");
    var summary = document.getElementById("summary");
    unitList.innerHTML = "";
    uiList.innerHTML = "";
    summary.className = "test-summary";
    summary.textContent = "Tests laufen …";
    var passed = 0, failed = 0;

    unitTests.forEach(function (t) {
      try { t[1](); passed++; report(unitList, t[0]); }
      catch (e) { failed++; report(unitList, t[0], e); }
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
