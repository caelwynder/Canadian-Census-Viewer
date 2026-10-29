(function (CV) {
  var COUNT = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function toggleButton(label, pressed, onClick, className) {
    var button = el("button", className, label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(pressed));
    button.addEventListener("click", onClick);
    return button;
  }

  function millions(n) {
    return n >= 1e6 ? (n / 1e6).toFixed(1) + " million" : COUNT.format(n);
  }

  function legendRow(color, label, className) {
    var row = el("div", className || "legend-row");
    var swatch = el("span", "legend-swatch");
    swatch.style.background = color;
    row.append(swatch, el("span", null, label));
    return row;
  }

  function renderLegend(container, metric, year, scale) {
    var labels = CV.breaks.labels(scale.thresholds, function (n) { return CV.format.value(n, metric.unit); });
    var rows = scale.colors.map(function (color, i) { return legendRow(color, labels[i]); });
    container.replaceChildren(el("h2", "eyebrow", "Legend · " + year), ...rows, legendRow(CV.breaks.NO_DATA_COLOR, "No data"));
  }

  function renderDotLegend(container, scheme) {
    container.replaceChildren(...scheme.categories.map(function (c) { return legendRow(c.color, c.label, "legend-row dot-row"); }));
  }

  function renderMetricPicker(select, activeMetric, onChange) {
    var groups = CV.metrics.themes().map(function (group) {
      var optgroup = el("optgroup");
      optgroup.label = group.theme;
      group.metrics.forEach(function (id) {
        var option = el("option", null, CV.metrics.byId(id).label);
        option.value = id;
        option.selected = id === activeMetric.id;
        optgroup.append(option);
      });
      return optgroup;
    });
    select.replaceChildren(...groups);
    select.addEventListener("change", function () { onChange(CV.metrics.byId(select.value)); });
  }

  function renderChips(container, active, onChange) {
    container.replaceChildren(...CV.dots.SCHEMES.map(function (s) {
      return toggleButton(s.label, s.id === active.id, function () { onChange(s); }, "chip");
    }));
  }

  function renderViewToggle(container, view, onChange) {
    container.replaceChildren(
      toggleButton("Choropleth", view === "map", function () { onChange("map"); }, "segment"),
      toggleButton("Dot density", view === "dots", function () { onChange("dots"); }, "segment")
    );
  }

  function renderTimeline(container, years, year, onChange) {
    container.replaceChildren(...CV.metrics.YEARS.map(function (y) {
      var button = toggleButton(String(y), y === year, function () { onChange(y); }, "year-button");
      button.disabled = years.indexOf(y) === -1;
      return button;
    }));
  }

  function normalize(text) {
    return text.trim().replace(/\s+/g, " ").toLowerCase();
  }

  function searchOptions(features, withProvince) {
    return features
      .map(function (f) {
        var p = f.properties;
        return { label: withProvince ? p.name + ", " + p.province : p.name, cduid: p.cduid };
      })
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
  }

  function matchOption(options, text) {
    var wanted = normalize(text);
    var exact = options.find(function (o) { return normalize(o.label) === wanted; });
    if (exact) return exact;
    var byName = options.filter(function (o) { return normalize(o.label.split(",")[0]) === wanted; });
    return byName.length === 1 ? byName[0] : null;
  }

  function renderSearch(input, list, options, onPick) {
    list.replaceChildren(...options.map(function (o) {
      var option = el("option");
      option.value = o.label;
      return option;
    }));
    input.addEventListener("change", function () {
      var match = matchOption(options, input.value);
      if (!match) return;
      input.value = "";
      onPick(match.cduid);
    });
  }

  function renderRegionSelect(select, regions, activeId, onChange) {
    select.replaceChildren(...regions.map(function (r) {
      var option = el("option", null, r.title);
      option.value = r.id;
      option.selected = r.id === activeId;
      return option;
    }));
    select.addEventListener("change", function () { onChange(select.value); });
  }

  var THEME_KEY = "cv-theme";

  function toggleTheme() {
    var root = document.documentElement;
    var theme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      return theme;
    }
    return theme;
  }

  CV.controls = {
    toggleTheme: toggleTheme,
    searchOptions: searchOptions,
    matchOption: matchOption,
    renderSearch: renderSearch,
    renderRegionSelect: renderRegionSelect,
    el: el,
    toggleButton: toggleButton,
    millions: millions,
    legendRow: legendRow,
    renderLegend: renderLegend,
    renderDotLegend: renderDotLegend,
    renderMetricPicker: renderMetricPicker,
    renderChips: renderChips,
    renderViewToggle: renderViewToggle,
    renderTimeline: renderTimeline,
  };
})(window.CensusViewer = window.CensusViewer || {});
