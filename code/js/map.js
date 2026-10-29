(function (CV) {
  var BASE_STYLE = { weight: 0.6, color: "#0e1116", opacity: 0.9, fillOpacity: 0.8 };
  var HOVER_STYLE = { weight: 2.5, color: "#ffffff" };
  var ATTRIBUTION = "Boundaries &copy; Statistics Canada";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatMetric(metric, row, year) {
    if (!row || metric.years.indexOf(year) === -1) return "n/a";
    return CV.format.value(metric.value(row, year), metric.unit);
  }

  function legendRow(color, label) {
    var row = el("div", "legend-row");
    var swatch = el("span", "legend-swatch");
    swatch.style.background = color;
    row.append(swatch, el("span", null, label));
    return row;
  }

  function renderLegend(container, metric, year, scale) {
    var labels = CV.breaks.labels(scale.thresholds, function (n) { return CV.format.value(n, metric.unit); });
    var rows = scale.colors.map(function (color, i) { return legendRow(color, labels[i]); });
    container.replaceChildren(el("h2", "panel-heading", metric.label + ", " + year), ...rows, legendRow(CV.breaks.NO_DATA_COLOR, "No data"));
  }

  function renderTrend(metric, row, year) {
    var trend = el("div", "trend");
    metric.years.forEach(function (y) {
      var cell = el("div", y === year ? "trend-cell active" : "trend-cell");
      cell.append(el("span", "trend-year", String(y)), el("span", "trend-value", formatMetric(metric, row, y)));
      trend.append(cell);
    });
    return trend;
  }

  function renderDetail(container, feature, row, state) {
    if (!feature) {
      container.replaceChildren(el("p", "muted", "Hover over a census division to see its figures. Click one to zoom in."));
      return;
    }
    var list = el("dl", "detail-list");
    CV.metrics.list.forEach(function (m) {
      var item = el("div", m.id === state.metric.id ? "detail-item active" : "detail-item");
      item.append(el("dt", null, m.label), el("dd", null, formatMetric(m, row, state.year)));
      list.append(item);
    });
    container.replaceChildren(
      el("h2", "detail-name", feature.properties.name),
      el("p", "muted", feature.properties.province + " · " + state.year),
      renderTrend(state.metric, row, state.year),
      list
    );
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

  function renderTimeline(container, state, onChange) {
    var buttons = CV.metrics.YEARS.map(function (year) {
      var button = el("button", "year-button", String(year));
      button.type = "button";
      button.disabled = state.metric.years.indexOf(year) === -1;
      button.setAttribute("aria-pressed", String(year === state.year));
      button.addEventListener("click", function () { onChange(year); });
      return button;
    });
    container.replaceChildren(...buttons);
  }

  function queryString(region, state) {
    return "?region=" + region.id + "&metric=" + state.metric.id + "&year=" + state.year;
  }

  function renderRegionLinks(region, state) {
    document.querySelectorAll("a[data-region]").forEach(function (a) {
      a.href = queryString({ id: a.dataset.region }, state);
      if (a.dataset.region === region.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function showError(message) {
    document.getElementById("detail").replaceChildren(el("p", "error", message));
  }

  function joinRows() {
    var rows = {};
    Object.keys(CENSUS.ageSex2016).forEach(function (id) {
      rows[id] = Object.assign({}, CENSUS.ageSex2016[id], CENSUS.profile2016[id]);
    });
    return rows;
  }

  function start() {
    if (!window.CENSUS || !CENSUS.boundaries || !CENSUS.ageSex2016 || !CENSUS.profile2016) {
      showError("Census data did not load. Run npm run data:build and reload.");
      return;
    }
    var params = new URLSearchParams(location.search);
    var region = CV.regions.fromSearch(location.search);
    var rows = joinRows();
    var features = CV.regions.select(CENSUS.boundaries, region);
    var regionRows = features.features.map(function (f) { return rows[f.properties.cduid] || {}; });
    var detail = document.getElementById("detail");
    var state = { metric: null, year: null, scale: null, pinned: null };

    function rowFor(feature) {
      return rows[feature.properties.cduid];
    }

    function setMetric(metric, year) {
      state.metric = metric;
      state.year = CV.metrics.yearFor(metric, year);
      state.scale = CV.breaks.scale(metric, CV.metrics.allValues(metric, regionRows), CV.metrics.SEQUENTIAL);
    }

    function style(feature) {
      var row = rowFor(feature);
      return Object.assign({}, BASE_STYLE, { fillColor: state.scale.colorFor(row ? state.metric.value(row, state.year) : null) });
    }

    function showFeature(feature) {
      renderDetail(detail, feature, feature && rowFor(feature), state);
    }

    setMetric(CV.metrics.byId(params.get("metric")), Number(params.get("year")));
    document.title = region.title + " · Canadian Census Viewer";
    document.getElementById("region-title").textContent = region.title + " census divisions";

    var map = L.map("map", { zoomSnap: 0.25 });
    map.attributionControl.addAttribution(ATTRIBUTION);

    var divisions = L.geoJSON(features, {
      style: style,
      onEachFeature: function (feature, layer) {
        layer.on({
          mouseover: function () { layer.setStyle(HOVER_STYLE).bringToFront(); showFeature(feature); },
          mouseout: function () { divisions.resetStyle(layer); showFeature(state.pinned); },
          click: function () { state.pinned = feature; showFeature(feature); map.fitBounds(layer.getBounds(), { maxZoom: 9 }); },
        });
      },
    }).addTo(map);
    map.fitBounds(divisions.getBounds());

    function update(metric, year) {
      setMetric(metric, year);
      divisions.setStyle(style);
      render();
    }

    function render() {
      renderLegend(document.getElementById("legend"), state.metric, state.year, state.scale);
      renderTimeline(document.getElementById("timeline"), state, function (year) { update(state.metric, year); });
      renderRegionLinks(region, state);
      showFeature(state.pinned);
      history.replaceState(null, "", queryString(region, state));
    }

    renderMetricPicker(document.getElementById("metric"), state.metric, function (metric) { update(metric, state.year); });
    render();
  }

  CV.map = { start: start };
})(window.CensusViewer = window.CensusViewer || {});
