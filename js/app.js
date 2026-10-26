/**
 * Oberfläche der Taskverwaltung. Verbindet das DOM mit dem TaskStore.
 */
(function () {
  "use strict";

  var store = new TaskStore();
  var state = { filter: "alle", search: "" };

  var form = document.getElementById("new-task-form");
  var formError = document.getElementById("form-error");
  var list = document.getElementById("task-list");
  var stats = document.getElementById("stats");
  var search = document.getElementById("search");
  var filterButtons = document.querySelectorAll("[data-filter]");

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function formatDate(iso) {
    var parts = iso.split("-");
    return parts[2] + "." + parts[1] + "." + parts[0];
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderTask(task) {
    var li = el("li", { "class": "task" + (task.done ? " done" : ""), "data-id": task.id });

    var checkbox = el("input", { type: "checkbox", "aria-label": "Erledigt" });
    checkbox.checked = task.done;
    checkbox.addEventListener("change", function () {
      store.toggle(task.id);
      render();
    });

    var title = el("span", { "class": "title", title: "Doppelklick zum Bearbeiten" }, task.title);
    title.addEventListener("dblclick", function () { startEdit(li, title, task); });

    li.appendChild(checkbox);
    li.appendChild(title);
    li.appendChild(el("span", { "class": "badge " + task.priority }, task.priority));

    if (task.dueDate) {
      var overdue = !task.done && task.dueDate < today();
      li.appendChild(el("span", { "class": "meta" + (overdue ? " overdue" : "") }, "fällig " + formatDate(task.dueDate)));
    }

    var del = el("button", { type: "button", "class": "link", "aria-label": "Löschen" }, "✕");
    del.addEventListener("click", function () {
      store.remove(task.id);
      render();
    });
    li.appendChild(del);
    return li;
  }

  function startEdit(li, titleNode, task) {
    var input = el("input", { type: "text", "class": "title", "aria-label": "Titel bearbeiten" });
    input.value = task.title;
    li.replaceChild(input, titleNode);
    input.focus();
    input.select();

    var finished = false;
    function finish(save) {
      if (finished) return;
      finished = true;
      if (save && input.value.trim()) store.update(task.id, { title: input.value });
      render();
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", function () { finish(true); });
  }

  function render() {
    var tasks = store.list(state);
    list.innerHTML = "";
    if (tasks.length === 0) {
      list.appendChild(el("li", { "class": "empty" }, "Keine Tasks vorhanden."));
    } else {
      tasks.forEach(function (t) { list.appendChild(renderTask(t)); });
    }
    var s = store.stats();
    stats.textContent = s.open + " offen · " + s.done + " erledigt · " + s.total + " gesamt";
    filterButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.filter === state.filter));
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    try {
      store.add(form.elements.title.value, {
        priority: form.elements.priority.value,
        dueDate: form.elements.dueDate.value || null
      });
      form.reset();
      formError.textContent = "";
      form.elements.title.focus();
      render();
    } catch (err) {
      formError.textContent = err.message;
    }
  });

  filterButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      state.filter = b.dataset.filter;
      render();
    });
  });

  search.addEventListener("input", function () {
    state.search = search.value;
    render();
  });

  document.getElementById("clear-completed").addEventListener("click", function () {
    store.clearCompleted();
    render();
  });

  // Änderungen aus anderen Tabs übernehmen
  window.addEventListener("storage", function (e) {
    if (e.key === store.key) {
      store.tasks = store._load();
      render();
    }
  });

  render();
})();
