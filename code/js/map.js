(function (CV) {
  var ui = CV.controls;
  var MAP_STYLE = { weight: 0.6, opacity: 0.9, fillOpacity: 0.85 };
  var DOT_STYLE = { weight: 0.6, opacity: 1, fillOpacity: 1 };
  var PER_DOT = 1000;
  var DRAWER_WIDTH = 440;
  var CONTROL_WIDTH = 400;
  var NARROW = 700;
  var VIEWS = ["map", "dots"];
  var ATTRIBUTION = "Boundaries &copy; Statistics Canada";
  var COUNT = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });

  function showError(message) {
    document.getElementById("headline").textContent = "Something went wrong";
    document.getElementById("intro").replaceChildren(ui.el("span", "error", message));
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

    function outline(cduid) {
      if (cduid === state.pinned) return { weight: 2.5, color: themeColor("--accent") };
      if (cduid === state.vs) return { weight: 2.5, color: themeColor("--compare") };
      return {};
    }

    function style(feature) {
      var highlight = outline(feature.properties.cduid);
      if (state.view === "dots") return Object.assign({}, DOT_STYLE, { color: themeColor("--edge"), fillColor: themeColor("--land") }, highlight);
      var row = rowFor(feature);
      var fill = scale.colorFor(row ? state.metric.value(row, year()) : null);
      return Object.assign({}, MAP_STYLE, { color: themeColor("--bg"), fillColor: fill }, highlight);
    }

    function tooltip(layer) {
      var row = rowFor(layer.feature);
      var value = state.view === "dots"
        ? CV.format.value(row && row["total_" + year()], "count") + " people"
        : CV.format.value(row ? state.metric.value(row, year()) : null, state.metric.unit);
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
    map.fitBounds(divisions.getBounds(), { paddingTopLeft: [window.innerWidth > NARROW ? CONTROL_WIDTH : 0, 0] });

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
      var intro = document.getElementById("intro");
      if (state.view === "map") {
        headline.textContent = state.metric.label;
        intro.textContent = region.title + " census divisions, " + year() + ". Hover for figures; click a division for its profile.";
        return;
      }
      var scheme = state.scheme;
      var total = regionRows.reduce(function (sum, r) { return sum + (scheme.total(r, year()) || 0); }, 0);
      var who = scheme.unit === "people" ? region.people : region.title + " households";
      headline.textContent = ui.millions(total) + " " + who + ", by " + scheme.label.toLowerCase();
      intro.textContent = "One dot = " + COUNT.format(PER_DOT) + " " + scheme.unit + ", placed at random inside its census division and coloured by " +
        scheme.label.toLowerCase() + ". " + COUNT.format(dotsFor(scheme, year()).length) + " dots in this view. Dots show how many, not exactly where within a division.";
    }

    function renderControls() {
      var isDots = state.view === "dots";
      document.getElementById("map-controls").hidden = isDots;
      document.getElementById("dot-controls").hidden = !isDots;
      ui.renderViewToggle(document.getElementById("view-toggle"), state.view, function (view) { state.view = view; render(); });
      ui.renderTimeline(document.getElementById("timeline"), activeYears(), year(), function (y) { state.year = y; render(); });
      if (isDots) {
        ui.renderDotLegend(document.getElementById("dot-legend"), state.scheme);
        ui.renderChips(document.getElementById("chips"), state.scheme, function (s) { state.scheme = s; render(); });
        return;
      }
      ui.renderLegend(document.getElementById("legend"), state.metric, year(), scale);
    }

    function queryString(regionId) {
      var query = "?region=" + regionId + "&view=" + state.view + "&metric=" + state.metric.id + "&dots=" + state.scheme.id + "&year=" + year();
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
    ui.renderRegionSelect(document.getElementById("region"), CV.regions.list, region.id, function (id) { location.search = queryString(id); });
    ui.renderSearch(document.getElementById("search"), document.getElementById("search-list"), ui.searchOptions(features.features, !region.pruids), function (cduid) {
      select(cduid, true, true);
    });
    document.getElementById("collapse").addEventListener("click", function (e) {
      var collapsed = document.body.classList.toggle("collapsed");
      e.currentTarget.setAttribute("aria-expanded", String(!collapsed));
      e.currentTarget.textContent = collapsed ? "Show controls" : "Hide controls";
    });
    render();
    if (state.pinned) select(state.pinned, true);
  }

  CV.map = { start: start };
})(window.CensusViewer = window.CensusViewer || {});
