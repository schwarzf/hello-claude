/**
 * TaskStore – Logik der Taskverwaltung (ohne DOM, ohne Datenbank).
 * Tasks werden im localStorage des Browsers gespeichert. Für Tests kann
 * ein beliebiges Objekt mit getItem/setItem übergeben werden.
 */
(function (global) {
  "use strict";

  var PRIORITIES = ["niedrig", "mittel", "hoch"];

  function createMemoryStorage() {
    var data = {};
    return {
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
      },
      setItem: function (key, value) {
        data[key] = String(value);
      },
      removeItem: function (key) {
        delete data[key];
      }
    };
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function TaskStore(storage, key) {
    this.storage = storage || global.localStorage || createMemoryStorage();
    this.key = key || "hello-claude.tasks";
    this.tasks = this._load();
  }

  TaskStore.PRIORITIES = PRIORITIES;
  TaskStore.createMemoryStorage = createMemoryStorage;

  TaskStore.prototype._load = function () {
    try {
      var raw = this.storage.getItem(this.key);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  TaskStore.prototype._save = function () {
    this.storage.setItem(this.key, JSON.stringify(this.tasks));
  };

  TaskStore.prototype._find = function (id) {
    for (var i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].id === id) return this.tasks[i];
    }
    return null;
  };

  function normalizeTitle(title) {
    var t = typeof title === "string" ? title.trim() : "";
    if (!t) throw new Error("Der Titel darf nicht leer sein.");
    return t;
  }

  function normalizePriority(priority) {
    if (priority === undefined) return "mittel";
    if (PRIORITIES.indexOf(priority) === -1) {
      throw new Error("Ungültige Priorität: " + priority);
    }
    return priority;
  }

  function normalizeDueDate(dueDate) {
    if (!dueDate) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || isNaN(Date.parse(dueDate))) {
      throw new Error("Ungültiges Datum (erwartet JJJJ-MM-TT): " + dueDate);
    }
    return dueDate;
  }

  /** Legt einen neuen Task an und gibt ihn zurück. */
  TaskStore.prototype.add = function (title, options) {
    options = options || {};
    var task = {
      id: generateId(),
      title: normalizeTitle(title),
      done: false,
      priority: normalizePriority(options.priority),
      dueDate: normalizeDueDate(options.dueDate),
      createdAt: new Date().toISOString()
    };
    this.tasks.push(task);
    this._save();
    return task;
  };

  /** Ändert Titel, Priorität, Fälligkeit oder Erledigt-Status eines Tasks. */
  TaskStore.prototype.update = function (id, changes) {
    var task = this._find(id);
    if (!task) throw new Error("Task nicht gefunden: " + id);
    changes = changes || {};
    if ("title" in changes) task.title = normalizeTitle(changes.title);
    if ("priority" in changes) task.priority = normalizePriority(changes.priority);
    if ("dueDate" in changes) task.dueDate = normalizeDueDate(changes.dueDate);
    if ("done" in changes) task.done = Boolean(changes.done);
    this._save();
    return task;
  };

  TaskStore.prototype.toggle = function (id) {
    var task = this._find(id);
    if (!task) throw new Error("Task nicht gefunden: " + id);
    return this.update(id, { done: !task.done });
  };

  TaskStore.prototype.remove = function (id) {
    var before = this.tasks.length;
    this.tasks = this.tasks.filter(function (t) { return t.id !== id; });
    var removed = this.tasks.length !== before;
    if (removed) this._save();
    return removed;
  };

  TaskStore.prototype.clearCompleted = function () {
    var before = this.tasks.length;
    this.tasks = this.tasks.filter(function (t) { return !t.done; });
    this._save();
    return before - this.tasks.length;
  };

  TaskStore.prototype.get = function (id) {
    var task = this._find(id);
    return task ? Object.assign({}, task) : null;
  };

  /**
   * Liefert Tasks gefiltert und sortiert.
   * filter: "alle" | "offen" | "erledigt"; search: Teilstring im Titel.
   * Sortierung: offene vor erledigten, dann Priorität (hoch zuerst), dann Fälligkeit.
   */
  TaskStore.prototype.list = function (options) {
    options = options || {};
    var filter = options.filter || "alle";
    var search = (options.search || "").trim().toLowerCase();

    return this.tasks
      .filter(function (t) {
        if (filter === "offen" && t.done) return false;
        if (filter === "erledigt" && !t.done) return false;
        if (search && t.title.toLowerCase().indexOf(search) === -1) return false;
        return true;
      })
      .map(function (t) { return Object.assign({}, t); })
      .sort(function (a, b) {
        if (a.done !== b.done) return a.done ? 1 : -1;
        var p = PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority);
        if (p !== 0) return p;
        if (a.dueDate !== b.dueDate) {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate < b.dueDate ? -1 : 1;
        }
        return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
      });
  };

  TaskStore.prototype.stats = function () {
    var done = this.tasks.filter(function (t) { return t.done; }).length;
    return { total: this.tasks.length, done: done, open: this.tasks.length - done };
  };

  global.TaskStore = TaskStore;
  if (typeof module !== "undefined" && module.exports) module.exports = TaskStore;
})(typeof window !== "undefined" ? window : globalThis);
