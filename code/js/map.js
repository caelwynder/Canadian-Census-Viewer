(function (CV) {
  var MAP_STYLE = { weight: 0.6, color: "#0b0d10", opacity: 0.9, fillOpacity: 0.85 };
  var DOT_STYLE = { weight: 0.6, color: "#2a2f3a", opacity: 1, fillColor: "#14171d", fillOpacity: 1 };
  var HOVER_STYLE = { weight: 2, color: "#ffffff" };
  var PINNED_STYLE = { weight: 2.5, color: "#f97a3c" };
  var PER_DOT = 1000;
  var DRAWER_WIDTH = 440;
  var CONTROL_WIDTH = 400;
  var NARROW = 700;
  var VIEWS = ["map", "dots"];
  var ATTRIBUTION = "Boundaries &copy; Statistics Canada";
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

  function showError(message) {
    document.getElementById("headline").textContent = "Something went wrong";
    document.getElementById("intro").replaceChildren(el("span", "error", message));
  }

  function joinRows() {
    var rows = {};
    Object.keys(CENSUS.ageSex2016).forEach(function (id) {
      rows[id] = Object.assign({ cduid: id }, CENSUS.ageSex2016[id], CENSUS.profile2016[id]);
    });
    return rows;
  }

  function readState(params) {
    var view = params.get("view");
    return {
      view: VIEWS.indexOf(view) === -1 ? "map" : view,
      metric: CV.metrics.byId(params.get("metric")),
      scheme: CV.dots.schemeById(params.get("dots")),
      year: Number(params.get("year")) || CV.metrics.YEARS[CV.metrics.YEARS.length - 1],
      pinned: params.get("cd"),
    };
  }

  function start() {
    if (!window.CENSUS || !CENSUS.boundaries || !CENSUS.ageSex2016 || !CENSUS.profile2016) {
      showError("Census data did not load. Run npm run data:build and reload.");
      return;
    }
    var region = CV.regions.fromSearch(location.search);
    var rows = joinRows();
    var features = CV.regions.select(CENSUS.boundaries, region);
    var regionRows = features.features.map(function (f) { return rows[f.properties.cduid]; }).filter(Boolean);
    var regionTotals = CV.profile.aggregate(regionRows);
    var state = readState(new URLSearchParams(location.search));
    var drawer = document.getElementById("drawer");
    var dotCache = {};
    var scale = metricScale();

    function metricScale() {
      return CV.breaks.scale(state.metric, CV.metrics.allValues(state.metric, regionRows), CV.metrics.SEQUENTIAL);
    }

    function activeYears() {
      return state.view === "dots" ? state.scheme.years : state.metric.years;
    }

    function year() {
      var years = activeYears();
      return years.indexOf(state.year) !== -1 ? state.year : years[years.length - 1];
    }

    function rowFor(feature) {
      return rows[feature.properties.cduid];
    }

    function style(feature) {
      var pinned = feature.properties.cduid === state.pinned ? PINNED_STYLE : {};
      if (state.view === "dots") return Object.assign({}, DOT_STYLE, pinned);
      var row = rowFor(feature);
      return Object.assign({}, MAP_STYLE, { fillColor: scale.colorFor(row ? state.metric.value(row, year()) : null) }, pinned);
    }

    function tooltip(layer) {
      var row = rowFor(layer.feature);
      var value = state.view === "dots"
        ? CV.format.value(row && row["total_" + year()], "count") + " people"
        : CV.format.value(row ? state.metric.value(row, year()) : null, state.metric.unit);
      var tip = el("div");
      tip.append(el("strong", null, layer.feature.properties.name), el("span", null, value));
      return tip;
    }

    var map = L.map("map", { zoomSnap: 0.25, zoomControl: false });
    L.control.zoom({ position: "topright" }).addTo(map);
    map.attributionControl.addAttribution(ATTRIBUTION);
    map.createPane("dots").style.zIndex = 450;

    var divisions = L.geoJSON(features, {
      style: function (f) { return style(f); },
      onEachFeature: function (feature, layer) {
        layer.bindTooltip(tooltip, { sticky: true, className: "map-tip", direction: "top", offset: [0, -10] });
        layer.on({
          mouseover: function () { layer.setStyle(HOVER_STYLE).bringToFront(); },
          mouseout: function () { divisions.resetStyle(layer); },
          click: function () { select(feature.properties.cduid, true); },
        });
      },
    }).addTo(map);
    var dotLayer = CV.dotLayer([], [], { pane: "dots" });
    map.fitBounds(divisions.getBounds(), { paddingTopLeft: [window.innerWidth > NARROW ? CONTROL_WIDTH : 0, 0] });

    function layerFor(cduid) {
      return divisions.getLayers().find(function (l) { return l.feature.properties.cduid === cduid; });
    }

    function dotsFor(scheme, y) {
      var key = scheme.id + y;
      if (!dotCache[key]) dotCache[key] = CV.dots.generate(features.features, rows, scheme, y, PER_DOT);
      return dotCache[key];
    }

    function select(cduid, zoom) {
      var layer = layerFor(cduid);
      if (!layer) return;
      state.pinned = cduid;
      var padding = window.innerWidth > NARROW ? DRAWER_WIDTH : 0;
      if (zoom) map.fitBounds(layer.getBounds(), { maxZoom: 9, paddingBottomRight: [padding, 0] });
      render();
    }

    function closeDrawer() {
      state.pinned = null;
      render();
    }

    function renderDrawer() {
      var layer = state.pinned && layerFor(state.pinned);
      drawer.hidden = !layer;
      if (!layer) return;
      CV.panel.render(drawer, {
        row: rowFor(layer.feature),
        name: layer.feature.properties.name,
        rows: regionRows,
        region: regionTotals,
        regionName: region.title,
        year: year(),
        metric: state.metric,
        onSelect: function (cduid) { select(cduid, true); },
      }, closeDrawer);
    }

    function renderHeadline() {
      var headline = document.getElementById("headline");
      var intro = document.getElementById("intro");
      if (state.view === "map") {
        headline.textContent = state.metric.label;
        intro.textContent = region.title + " census divisions, " + year() + ". Hover for figures; click a division for its profile.";
        return;
      }
      var scheme = state.scheme;
      var total = regionRows.reduce(function (sum, r) { return sum + (scheme.total(r, year()) || 0); }, 0);
      var who = scheme.unit === "people" ? region.people : region.title + " households";
      headline.textContent = millions(total) + " " + who + ", by " + scheme.label.toLowerCase();
      intro.textContent = "One dot = " + COUNT.format(PER_DOT) + " " + scheme.unit + ", placed at random inside its census division and coloured by " +
        scheme.label.toLowerCase() + ". " + COUNT.format(dotsFor(scheme, year()).length) + " dots in this view. Dots show how many, not exactly where within a division.";
    }

    function renderControls() {
      var isDots = state.view === "dots";
      document.getElementById("map-controls").hidden = isDots;
      document.getElementById("dot-controls").hidden = !isDots;
      renderViewToggle(document.getElementById("view-toggle"), state.view, function (view) { state.view = view; render(); });
      renderTimeline(document.getElementById("timeline"), activeYears(), year(), function (y) { state.year = y; render(); });
      if (isDots) {
        renderDotLegend(document.getElementById("dot-legend"), state.scheme);
        renderChips(document.getElementById("chips"), state.scheme, function (s) { state.scheme = s; render(); });
        return;
      }
      renderLegend(document.getElementById("legend"), state.metric, year(), scale);
    }

    function queryString(regionId) {
      var query = "?region=" + regionId + "&view=" + state.view + "&metric=" + state.metric.id + "&dots=" + state.scheme.id + "&year=" + year();
      return regionId === region.id && state.pinned ? query + "&cd=" + state.pinned : query;
    }

    function renderRegionLinks() {
      document.querySelectorAll("a[data-region]").forEach(function (a) {
        a.href = queryString(a.dataset.region);
        if (a.dataset.region === region.id) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    }

    function renderMap() {
      if (state.view === "dots") {
        dotLayer.setData(dotsFor(state.scheme, year()), state.scheme.categories.map(function (c) { return c.color; }));
        if (!map.hasLayer(dotLayer)) dotLayer.addTo(map);
      } else {
        scale = metricScale();
        if (map.hasLayer(dotLayer)) map.removeLayer(dotLayer);
      }
      divisions.setStyle(style);
      var pinned = state.pinned && layerFor(state.pinned);
      if (pinned) pinned.bringToFront();
    }

    function render() {
      renderMap();
      renderHeadline();
      renderControls();
      renderDrawer();
      renderRegionLinks();
      document.body.dataset.view = state.view;
      history.replaceState(null, "", queryString(region.id));
    }

    document.title = region.title + " · Canadian Census Viewer";
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.pinned) closeDrawer(); });
    renderMetricPicker(document.getElementById("metric"), state.metric, function (metric) { state.metric = metric; render(); });
    render();
    if (state.pinned) select(state.pinned, true);
  }

  CV.map = { start: start };
})(window.CensusViewer = window.CensusViewer || {});
