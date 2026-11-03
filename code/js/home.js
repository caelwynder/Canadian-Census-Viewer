(function (CV) {
  var ui = CV.controls;
  var DOT_SIZE = 1.4;
  var VIEWS = [
    { kicker: "Canada · Choropleth", title: "Population density", blurb: "People per km² across all 293 census divisions.", region: "canada", query: "metric=density", metric: "density" },
    { kicker: "Canada · Dot density", title: "Where Canadians live", blurb: "One dot per 5,000 people, coloured by age group.", region: "canada", query: "view=dots&dots=age", scheme: "age", perDot: 5000 },
    { kicker: "Ontario · Choropleth", title: "Share aged 65+", blurb: "Ontario's 49 divisions, 2006 to 2016.", region: "ontario", query: "metric=share_65p", metric: "share_65p" },
    { kicker: "Quebec · Dot density", title: "Mother tongue", blurb: "English, French and other languages, one dot per 2,000 people.", region: "quebec", query: "view=dots&dots=language", scheme: "language", perDot: 2000 },
  ];

  function themeColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function mapUrl(region, query) {
    return "map.html?region=" + region + (query ? "&" + query : "");
  }

  function viewCard(view) {
    var card = ui.el("a", "view-card");
    card.href = mapUrl(view.region, view.query);
    var canvas = ui.el("canvas", "thumb");
    canvas.setAttribute("aria-hidden", "true");
    var text = ui.el("div", "view-text");
    text.append(ui.el("span", "eyebrow", view.kicker), ui.el("h3", null, view.title), ui.el("p", "muted", view.blurb));
    card.append(canvas, text);
    return { node: card, canvas: canvas, view: view };
  }

  function choroplethFill(metric, features, rows) {
    var regionRows = features.map(function (f) { return rows[f.properties.cduid] || {}; });
    var scale = CV.breaks.scale(metric, CV.metrics.allValues(metric, regionRows), CV.metrics.SEQUENTIAL);
    var year = CV.metrics.yearFor(metric, 2016);
    return function (f) {
      var row = rows[f.properties.cduid];
      return scale.colorFor(row ? metric.value(row, year) : null);
    };
  }

  function drawCard(card, rows) {
    var view = card.view;
    var features = CV.regions.select(CENSUS.boundaries, CV.regions.fromSearch("?region=" + view.region)).features;
    if (view.metric) {
      CV.thumbnails.draw(card.canvas, features, { fill: choroplethFill(CV.metrics.byId(view.metric), features, rows), stroke: themeColor("--bg") });
      return;
    }
    var scheme = CV.dots.schemeById(view.scheme);
    CV.thumbnails.draw(card.canvas, features, {
      fill: function () { return themeColor("--land"); },
      stroke: themeColor("--edge"),
      dots: CV.dots.generate(features, rows, scheme, 2016, view.perDot),
      colors: scheme.categories.map(function (c) { return c.color; }),
      radius: DOT_SIZE,
    });
  }

  function renderRegions(container) {
    container.replaceChildren(...CV.regions.list.map(function (r) {
      var link = ui.el("a", "chip", r.title);
      link.href = mapUrl(r.id);
      return link;
    }));
  }

  function start() {
    if (!window.CENSUS || !CENSUS.boundaries || !CENSUS.ageSex2016 || !CENSUS.profile2016) {
      document.getElementById("views").replaceChildren(ui.el("p", "error", "Census data did not load. Run npm run data:build and reload."));
      return;
    }
    var rows = CV.profile.joinRows(CENSUS.ageSex2016, CENSUS.profile2016);
    var cards = VIEWS.map(viewCard);
    document.getElementById("views").replaceChildren(...cards.map(function (c) { return c.node; }));
    var drawAll = function () { cards.forEach(function (c) { drawCard(c, rows); }); };
    requestAnimationFrame(drawAll);
    renderRegions(document.getElementById("regions"));
    ui.renderSearch(document.getElementById("search"), document.getElementById("search-list"), ui.searchOptions(CENSUS.boundaries.features, true), function (cduid) {
      location.href = mapUrl("canada", "cd=" + cduid);
    });
    document.getElementById("theme").addEventListener("click", function () {
      ui.toggleTheme();
      drawAll();
    });
  }

  CV.home = { start: start };
})(window.CensusViewer = window.CensusViewer || {});
