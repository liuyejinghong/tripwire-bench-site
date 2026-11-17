
(function () {
  "use strict";

  var packs = window.TRIPWIRE_I18N || {};
  var LANG_KEY = "tripwire-lang";
  var VERSION_KEY = "tripwire-version";

  function store(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) {}
  }

  function load(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }

  function applyLanguage(code) {
    var pack = packs[code] || packs.zh;
    if (!pack) { return; }
    document.documentElement.lang = code === "zh" ? "zh-CN" : code;
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      var key = node.getAttribute("data-i18n");
      if (pack.strings[key] !== undefined) { node.textContent = pack.strings[key]; }
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (node) {
      var key = node.getAttribute("data-i18n-title");
      if (pack.strings[key] !== undefined) { node.setAttribute("title", pack.strings[key]); }
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (node) {
      var key = node.getAttribute("data-i18n-aria");
      if (pack.strings[key] !== undefined) { node.setAttribute("aria-label", pack.strings[key]); }
    });
    document.querySelectorAll("[data-i18n-content]").forEach(function (node) {
      var key = node.getAttribute("data-i18n-content");
      if (pack.strings[key] !== undefined) { node.setAttribute("content", pack.strings[key]); }
    });
    document.querySelectorAll(".lang-button").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.getAttribute("data-lang") === code ? "true" : "false"
      );
    });
  }

  var initial = new URLSearchParams(window.location.search).get("lang");
  if (!initial) { initial = load(LANG_KEY); }
  if (!initial || !packs[initial]) { initial = "zh"; }
  applyLanguage(initial);

  document.querySelectorAll(".lang-button").forEach(function (button) {
    button.addEventListener("click", function () {
      var code = button.getAttribute("data-lang");
      if (!packs[code]) { return; }
      applyLanguage(code);
      store(LANG_KEY, code);
      var url = new URL(window.location.href);
      url.searchParams.set("lang", code);
      window.history.replaceState(null, "", url);
    });
  });

  var select = document.getElementById("version-select");
  function showVersion(version) {
    document.querySelectorAll(".version-panel[data-version]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-version") !== version;
    });
  }
  if (select) {
    var storedVersion = load(VERSION_KEY);
    if (storedVersion) {
      for (var index = 0; index < select.options.length; index += 1) {
        if (select.options[index].value === storedVersion) {
          select.value = storedVersion;
          break;
        }
      }
    }
    select.addEventListener("change", function () {
      showVersion(select.value);
      store(VERSION_KEY, select.value);
    });
    showVersion(select.value);
  }

  document.querySelectorAll("[data-tablist]").forEach(function (root) {
    var tabs = root.querySelectorAll("[role=tab]");
    var panels = root.querySelectorAll("[data-panel]");
    function selectTab(name) {
      tabs.forEach(function (tab) {
        var active = tab.getAttribute("data-tab") === name;
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-panel") !== name;
      });
    }
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        selectTab(tab.getAttribute("data-tab"));
      });
    });
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) { return; }
    var button = target.closest("button.expand");
    if (!button) { return; }
    var row = button.closest("tr.model-row");
    if (!row) { return; }
    var detail = row.nextElementSibling;
    if (!detail || !detail.classList.contains("detail-row")) { return; }
    var expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    detail.hidden = expanded;
  });

  function rowNumber(row, key) {
    var text = row.getAttribute("data-" + key);
    if (text === null || text === "") { return null; }
    var value = Number(text);
    return isNaN(value) ? null : value;
  }

  function initSortable(table) {
    var tbody = table.tBodies[0];
    if (!tbody) { return; }
    var headers = Array.prototype.slice.call(
      table.querySelectorAll("th[data-sort-column]")
    );
    var pairs = [];
    Array.prototype.forEach.call(tbody.children, function (row) {
      if (!row.classList.contains("model-row")) { return; }
      var detail = row.nextElementSibling;
      pairs.push([
        row,
        detail && detail.classList.contains("detail-row") ? detail : null
      ]);
    });
    if (!pairs.length) { return; }

    var defaults = { rank: 1, total: -1, value: -1, seconds: 1 };
    var sortKey = "rank";
    var direction = 1;

    function tie(a, b) {
      return a[0].getAttribute("data-model").localeCompare(
        b[0].getAttribute("data-model")
      );
    }

    function compare(a, b) {
      var rowA = a[0];
      var rowB = b[0];
      var partialA = rowA.getAttribute("data-partial") === "1" ? 1 : 0;
      var partialB = rowB.getAttribute("data-partial") === "1" ? 1 : 0;
      if (sortKey !== "rank" && partialA !== partialB) { return partialA - partialB; }
      var valueA = rowNumber(rowA, sortKey);
      var valueB = rowNumber(rowB, sortKey);
      if (valueA === null && valueB === null) { return tie(a, b); }
      if (valueA === null) { return 1; }
      if (valueB === null) { return -1; }
      if (valueA !== valueB) { return (valueA - valueB) * direction; }
      return tie(a, b);
    }

    function apply() {
      pairs.sort(compare);
      pairs.forEach(function (pair) {
        tbody.appendChild(pair[0]);
        if (pair[1]) { tbody.appendChild(pair[1]); }
      });
      headers.forEach(function (th) {
        var active = th.getAttribute("data-sort-column") === sortKey;
        th.setAttribute(
          "aria-sort",
          active ? (direction === 1 ? "ascending" : "descending") : "none"
        );
      });
    }

    headers.forEach(function (th) {
      var button = th.querySelector(".sort-button");
      if (!button) { return; }
      button.addEventListener("click", function () {
        var key = button.getAttribute("data-sort");
        if (key === sortKey) {
          direction = -direction;
        } else {
          sortKey = key;
          direction = defaults[key] || 1;
        }
        apply();
      });
    });
    apply();
  }

  document.querySelectorAll("table[data-sortable-table]").forEach(initSortable);

  document.querySelectorAll("[data-vendor-filter]").forEach(function (filter) {
    var section = filter.closest(".report-section");
    var table = section && section.querySelector("table[data-sortable-table]");
    if (!table) { return; }
    var rows = Array.prototype.slice.call(
      table.querySelectorAll("tr.model-row")
    );
    function applyFilter() {
      var vendor = filter.value;
      var visible = 0;
      rows.forEach(function (row) {
        var show = !vendor || row.getAttribute("data-vendor") === vendor;
        row.hidden = !show;
        var detail = row.nextElementSibling;
        if (detail && detail.classList.contains("detail-row")) {
          detail.hidden = true;
        }
        var button = row.querySelector("button.expand");
        if (button) { button.setAttribute("aria-expanded", "false"); }
        if (show) { visible += 1; }
      });
      var empty = table.parentElement.querySelector("[data-filter-empty]");
      if (empty) { empty.hidden = visible > 0; }
    }
    filter.addEventListener("change", applyFilter);
    applyFilter();
  });
})();
