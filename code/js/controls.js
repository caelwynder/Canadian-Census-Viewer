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

  function swatch(className, color, title) {
    var node = el("span", className);
    node.style.background = color;
    node.title = title;
    return node;
  }

  function stripEnds(thresholds, formatValue) {
    if (!thresholds.length) return { low: "All values", high: "" };
    return { low: "<" + formatValue(thresholds[0]), high: "≥" + formatValue(thresholds[thresholds.length - 1]) };
  }

  function renderLegend(container, scale, unit, ends) {
    var formatValue = function (n) { return CV.format.value(n, unit); };
    var labels = CV.breaks.labels(scale.thresholds, formatValue);
    var strip = el("div", "strip");
    strip.setAttribute("role", "img");
    strip.setAttribute("aria-label", labels.join("; "));
    strip.append(...scale.colors.map(function (color, i) { return swatch(null, color, labels[i]); }));
    var row = el("div", "strip-row");
    row.append(strip, swatch("strip-nodata", CV.breaks.NO_DATA_COLOR, "No data"));
    ends = ends || stripEnds(scale.thresholds, formatValue);
    var endLabels = el("div", "strip-ends mono");
    endLabels.append(el("span", null, ends.low), el("span", null, ends.high));
    container.replaceChildren(row, endLabels);
  }

  function renderDotLegend(container, scheme, note) {
    var key = el("div", "dot-key");
    key.append(...scheme.categories.map(function (c) {
      var item = el("span");
      var dot = el("i");
      dot.style.background = c.color;
      item.append(dot, document.createTextNode(c.label));
      return item;
    }));
    container.replaceChildren(key, el("p", "dot-note", note));
  }

  function bindInfo(button) {
    function setOpen(open) { button.setAttribute("aria-expanded", String(open)); }
    button.addEventListener("click", function () { setOpen(button.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("click", function (e) { if (e.target !== button) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
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

  function renderSchemePicker(select, active, onChange) {
    select.replaceChildren(...CV.dots.SCHEMES.map(function (scheme) {
      var option = el("option", null, "Colour by: " + scheme.label);
      option.value = scheme.id;
      option.selected = scheme.id === active.id;
      return option;
    }));
    select.addEventListener("change", function () { onChange(CV.dots.schemeById(select.value)); });
  }

  function renderViewToggle(container, view, onChange) {
    container.replaceChildren(
      toggleButton("Map", view === "map", function () { onChange("map"); }, "segment"),
      toggleButton("Dots", view === "dots", function () { onChange("dots"); }, "segment")
    );
  }

  function renderBaselineToggle(container, on, onChange) {
    container.replaceChildren(
      toggleButton("Values", !on, function () { onChange(false); }, "segment"),
      toggleButton("vs Canada", on, function () { onChange(true); }, "segment")
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
    stripEnds: stripEnds,
    renderLegend: renderLegend,
    renderDotLegend: renderDotLegend,
    bindInfo: bindInfo,
    renderMetricPicker: renderMetricPicker,
    renderSchemePicker: renderSchemePicker,
    renderViewToggle: renderViewToggle,
    renderBaselineToggle: renderBaselineToggle,
    renderTimeline: renderTimeline,
  };
})(window.CensusViewer = window.CensusViewer || {});
