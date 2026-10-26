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

  function legendRow(color, label) {
    var row = el("div", "legend-row");
    var swatch = el("span", "legend-swatch");
    swatch.style.background = color;
    row.append(swatch, el("span", null, label));
    return row;
  }

  function renderLegend(container, metric, scale) {
    var labels = CV.breaks.labels(scale.thresholds, function (n) { return CV.format.value(n, metric.unit); });
    var rows = scale.colors.map(function (color, i) { return legendRow(color, labels[i]); });
    container.replaceChildren(el("h2", "panel-heading", metric.label), ...rows, legendRow(CV.breaks.NO_DATA_COLOR, "No data"));
  }

  function renderDetail(container, feature, row, activeMetric) {
    if (!feature) {
      container.replaceChildren(el("p", "muted", "Hover over a census division to see its figures. Click one to zoom in."));
      return;
    }
    var list = el("dl", "detail-list");
    CV.metrics.list.forEach(function (m) {
      var item = el("div", m.id === activeMetric.id ? "detail-item active" : "detail-item");
      item.append(el("dt", null, m.label), el("dd", null, row ? CV.format.value(m.value(row), m.unit) : "n/a"));
      list.append(item);
    });
    container.replaceChildren(el("h2", "detail-name", feature.properties.name), el("p", "muted", feature.properties.province), list);
  }

  function renderMetricPicker(select, activeMetric, onChange) {
    var options = CV.metrics.list.map(function (m) {
      var option = el("option", null, m.label);
      option.value = m.id;
      option.selected = m.id === activeMetric.id;
      return option;
    });
    select.replaceChildren(...options);
    select.addEventListener("change", function () { onChange(CV.metrics.byId(select.value)); });
  }

  function renderRegionLinks(region, metric) {
    document.querySelectorAll("a[data-region]").forEach(function (a) {
      a.href = "?region=" + a.dataset.region + "&metric=" + metric.id;
      if (a.dataset.region === region.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function showError(message) {
    document.getElementById("detail").replaceChildren(el("p", "error", message));
  }

  function start() {
    if (!window.CENSUS || !CENSUS.boundaries || !CENSUS.ageSex2016) {
      showError("Census data did not load. Run npm run data:build and reload.");
      return;
    }
    var region = CV.regions.fromSearch(location.search);
    var rows = CENSUS.ageSex2016;
    var features = CV.regions.select(CENSUS.boundaries, region);
    var detail = document.getElementById("detail");
    var legend = document.getElementById("legend");
    var state = { metric: null, scale: null, pinned: null };

    function rowFor(feature) {
      return rows[feature.properties.cduid];
    }

    function valueFor(feature, metric) {
      var row = rowFor(feature);
      return row ? metric.value(row) : null;
    }

    function setMetric(metric) {
      var values = features.features.map(function (f) { return valueFor(f, metric); });
      state.metric = metric;
      state.scale = CV.breaks.scale(metric, values, CV.metrics.SEQUENTIAL);
    }

    function style(feature) {
      return Object.assign({}, BASE_STYLE, { fillColor: state.scale.colorFor(valueFor(feature, state.metric)) });
    }

    function showFeature(feature) {
      renderDetail(detail, feature, feature && rowFor(feature), state.metric);
    }

    setMetric(CV.metrics.byId(new URLSearchParams(location.search).get("metric")));
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

    function render() {
      renderLegend(legend, state.metric, state.scale);
      renderRegionLinks(region, state.metric);
      showFeature(state.pinned);
      history.replaceState(null, "", "?region=" + region.id + "&metric=" + state.metric.id);
    }

    renderMetricPicker(document.getElementById("metric"), state.metric, function (metric) {
      setMetric(metric);
      divisions.setStyle(style);
      render();
    });
    render();
  }

  CV.map = { start: start };
})(window.CensusViewer = window.CensusViewer || {});
