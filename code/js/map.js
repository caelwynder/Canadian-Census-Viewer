(function (CV) {
  var ui = CV.controls;
  var MAP_STYLE = { weight: 0.6, opacity: 0.9, fillOpacity: 0.85 };
  var DOT_STYLE = { weight: 0.6, opacity: 1, fillOpacity: 1 };
  var PER_DOT = 1000;
  var DRAWER_WIDTH = 440;
  var TOP_BAR = 80;
  var NARROW = 700;
  var VIEWS = ["map", "dots"];
  var ATTRIBUTION = "Boundaries &copy; Statistics Canada";
  var COUNT = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });

  function showError(message) {
    document.getElementById("legend-title").textContent = "Something went wrong";
    document.getElementById("legend").replaceChildren(ui.el("p", "error", message));
  }

  function themeColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function themeControl(onToggle) {
    var Control = L.Control.extend({
      onAdd: function () {
        var bar = L.DomUtil.create("div", "leaflet-bar");
        var button = L.DomUtil.create("a", "theme-toggle", bar);
        button.href = "#";
        button.setAttribute("role", "button");
        button.setAttribute("aria-label", "Switch between dark and light theme");
        button.textContent = "◐";
        L.DomEvent.on(button, "click", function (e) { L.DomEvent.preventDefault(e); onToggle(); });
        L.DomEvent.disableClickPropagation(bar);
        return bar;
      },
    });
    return new Control({ position: "topright" });
  }

  function readState(params) {
    var view = params.get("view");
    return {
      view: VIEWS.indexOf(view) === -1 ? "map" : view,
      metric: CV.metrics.byId(params.get("metric")),
      scheme: CV.dots.schemeById(params.get("dots")),
      year: Number(params.get("year")) || CV.metrics.YEARS[CV.metrics.YEARS.length - 1],
      pinned: params.get("cd"),
      vs: params.get("vs"),
      baseline: params.get("baseline") === "canada",
    };
  }

  function start() {
    if (!window.CENSUS || !CENSUS.boundaries || !CENSUS.ageSex2016 || !CENSUS.profile2016) {
      showError("Census data did not load. Run npm run data:build and reload.");
      return;
    }
    var region = CV.regions.fromSearch(location.search);
    var rows = CV.profile.joinRows(CENSUS.ageSex2016, CENSUS.profile2016);
    var features = CV.regions.select(CENSUS.boundaries, region);
    var regionRows = features.features.map(function (f) { return rows[f.properties.cduid]; }).filter(Boolean);
    var regionTotals = CV.profile.aggregate(regionRows);
    var national = CV.profile.nationalRow(Object.values(rows), CENSUS.canada2016 || {});
    var state = readState(new URLSearchParams(location.search));
    var drawer = document.getElementById("drawer");
    var dotCache = {};
    var scale = metricScale();

    function versusCanada() {
      return state.baseline && state.metric.national !== false;
    }

    function shownValue(row, y) {
      var value = row ? state.metric.value(row, y) : null;
      return versusCanada() ? CV.metrics.gap(state.metric, value, state.metric.value(national, y)) : value;
    }

    function metricScale() {
      if (versusCanada()) {
        var gaps = state.metric.years.flatMap(function (y) { return regionRows.map(function (r) { return shownValue(r, y); }); });
        return CV.breaks.diverging(gaps, CV.metrics.ramp(state.metric));
      }
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

    function outline(cduid) {
      if (cduid === state.pinned) return { weight: 2.5, color: themeColor("--accent") };
      if (cduid === state.vs) return { weight: 2.5, color: themeColor("--compare") };
      return {};
    }

    function style(feature) {
      var highlight = outline(feature.properties.cduid);
      if (state.view === "dots") return Object.assign({}, DOT_STYLE, { color: themeColor("--edge"), fillColor: themeColor("--land") }, highlight);
      var fill = scale.colorFor(shownValue(rowFor(feature), year()));
      return Object.assign({}, MAP_STYLE, { color: themeColor("--bg"), fillColor: fill }, highlight);
    }

    function tooltip(layer) {
      var row = rowFor(layer.feature);
      var value = state.view === "dots"
        ? CV.format.value(row && row["total_" + year()], "count") + " people"
        : CV.format.value(row ? state.metric.value(row, year()) : null, state.metric.unit);
      if (state.view === "map" && versusCanada()) value += " · " + CV.format.value(shownValue(row, year()), CV.metrics.gapUnit(state.metric)) + " vs Canada";
      var tip = ui.el("div");
      tip.append(ui.el("strong", null, layer.feature.properties.name), ui.el("span", null, value));
      return tip;
    }

    var map = L.map("map", { zoomSnap: 0.25, zoomControl: false });
    L.control.zoom({ position: "topright" }).addTo(map);
    map.attributionControl.addAttribution(ATTRIBUTION);
    themeControl(toggleTheme).addTo(map);
    map.createPane("dots").style.zIndex = 450;

    var divisions = L.geoJSON(features, {
      style: function (f) { return style(f); },
      onEachFeature: function (feature, layer) {
        layer.bindTooltip(tooltip, { sticky: true, className: "map-tip", direction: "top", offset: [0, -10] });
        layer.on({
          mouseover: function () { layer.setStyle({ weight: 2, color: themeColor("--text") }).bringToFront(); },
          mouseout: function () { divisions.resetStyle(layer); },
          click: function () { select(feature.properties.cduid, true, true); },
        });
      },
    }).addTo(map);
    var dotLayer = CV.dotLayer([], [], { pane: "dots" });
    map.fitBounds(divisions.getBounds(), { paddingTopLeft: [0, TOP_BAR] });

    function layerFor(cduid) {
      return divisions.getLayers().find(function (l) { return l.feature.properties.cduid === cduid; });
    }

    function dotsFor(scheme, y) {
      var key = scheme.id + y;
      if (!dotCache[key]) dotCache[key] = CV.dots.generate(features.features, rows, scheme, y, PER_DOT);
      return dotCache[key];
    }

    function toggleTheme() {
      ui.toggleTheme();
      divisions.setStyle(style);
    }

    function select(cduid, zoom, focus) {
      var layer = layerFor(cduid);
      if (!layer) return;
      state.pinned = cduid;
      if (state.vs === cduid) state.vs = null;
      var padding = window.innerWidth > NARROW ? DRAWER_WIDTH : 0;
      if (zoom) map.fitBounds(layer.getBounds(), { maxZoom: 9, paddingBottomRight: [padding, 0] });
      render();
      if (focus) drawer.querySelector(".place-name").focus({ preventScroll: true });
    }

    function compareWith(cduid) {
      state.vs = cduid;
      render();
    }

    function closeDrawer() {
      state.pinned = null;
      state.vs = null;
      render();
    }

    function baseline() {
      var layer = state.vs && layerFor(state.vs);
      if (!layer) return { row: regionTotals, name: region.title, isDivision: false };
      return { row: rowFor(layer.feature), name: layer.feature.properties.name, isDivision: true };
    }

    function renderDrawer() {
      var layer = state.pinned && layerFor(state.pinned);
      drawer.hidden = !layer;
      if (!layer) return;
      CV.panel.render(drawer, {
        row: rowFor(layer.feature),
        name: layer.feature.properties.name,
        rows: regionRows,
        base: baseline(),
        regionName: region.title,
        year: year(),
        metric: state.metric,
        onSelect: function (cduid) { select(cduid, true, true); },
        onCompare: compareWith,
        onClearCompare: function () { compareWith(null); },
      }, closeDrawer);
    }

    function renderHeadline() {
      var headline = document.getElementById("headline");
      var title = document.getElementById("legend-title");
      var tip = document.getElementById("legend-tip");
      if (state.view === "map") {
        headline.textContent = state.metric.label;
        title.textContent = state.metric.label + " · " + year();
        tip.textContent = mapTip();
        return;
      }
      var scheme = state.scheme;
      var who = scheme.unit === "people" ? region.people : region.title + " households";
      headline.textContent = ui.millions(dotTotal()) + " " + who + ", by " + scheme.label.toLowerCase();
      title.textContent = scheme.label;
      tip.textContent = "Dots are placed at random inside each census division, so they show how many, not exactly where. " +
        COUNT.format(dotsFor(scheme, year()).length) + " dots in this view.";
    }

    function mapTip() {
      var hint = " Hover a division for its value; click it for a profile.";
      var metric = state.metric;
      if (versusCanada()) {
        var colours = metric.better ? "Green is better than Canada, red is worse." : "Green is above Canada, red is below.";
        return "Compared with Canada's " + CV.format.value(metric.value(national, year()), metric.unit) + ". " + colours + hint;
      }
      if (metric.id === "change") return "Centred on no change: green grew, red shrank." + hint;
      if (metric.id === "sex_ratio") return "Centred on 100, an even split: green has more men, red more women." + hint;
      return region.title + " census divisions." + hint;
    }

    function dotTotal() {
      return regionRows.reduce(function (sum, r) { return sum + (state.scheme.total(r, year()) || 0); }, 0);
    }

    function renderControls() {
      var isDots = state.view === "dots";
      var legend = document.getElementById("legend");
      var baseline = document.getElementById("baseline");
      baseline.hidden = isDots || state.metric.national === false;
      ui.renderBaselineToggle(baseline, state.baseline, function (on) { state.baseline = on; render(); });
      document.getElementById("metric").hidden = isDots;
      document.getElementById("scheme").hidden = !isDots;
      ui.renderViewToggle(document.getElementById("view-toggle"), state.view, function (view) { state.view = view; render(); });
      ui.renderTimeline(document.getElementById("timeline"), activeYears(), year(), function (y) { state.year = y; render(); });
      if (isDots) {
        ui.renderDotLegend(legend, state.scheme, "1 dot = " + COUNT.format(PER_DOT) + " " + state.scheme.unit + " · " + ui.millions(dotTotal()) + " total");
        return;
      }
      if (versusCanada()) {
        ui.renderLegend(legend, scale, CV.metrics.gapUnit(state.metric), { low: "Below Canada", high: "Above Canada" });
        return;
      }
      ui.renderLegend(legend, scale, state.metric.unit);
    }

    function queryString(regionId) {
      var query = "?region=" + regionId + "&view=" + state.view + "&metric=" + state.metric.id + "&dots=" + state.scheme.id + "&year=" + year() + (state.baseline ? "&baseline=canada" : "");
      if (regionId !== region.id || !state.pinned) return query;
      return query + "&cd=" + state.pinned + (state.vs ? "&vs=" + state.vs : "");
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
      document.body.dataset.view = state.view;
      history.replaceState(null, "", queryString(region.id));
    }

    document.title = region.title + " · Canadian Census Viewer";
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.pinned) closeDrawer(); });
    ui.renderMetricPicker(document.getElementById("metric"), state.metric, function (metric) { state.metric = metric; render(); });
    ui.bindInfo(document.getElementById("legend-info"));
    ui.renderSchemePicker(document.getElementById("scheme"), state.scheme, function (scheme) { state.scheme = scheme; render(); });
    ui.renderRegionSelect(document.getElementById("region"), CV.regions.list, region.id, function (id) { location.search = queryString(id); });
    ui.renderSearch(document.getElementById("search"), document.getElementById("search-list"), ui.searchOptions(features.features, !region.pruids), function (cduid) {
      select(cduid, true, true);
    });
    render();
    if (state.pinned) select(state.pinned, true);
  }

  CV.map = { start: start };
})(window.CensusViewer = window.CensusViewer || {});
