(function (CV) {
  var SVG = "http://www.w3.org/2000/svg";
  var CHART = { width: 340, height: 130, pad: 14 };
  var SIMILAR_COUNT = 3;
  var BADGE_HIGH = 1.1;
  var BADGE_LOW = 0.9;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS(SVG, tag);
    Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function fmt(n, unit) {
    return CV.format.value(n, unit);
  }

  function compareTo(ctx, metric, year) {
    return CV.profile.compare(metric, ctx.row, ctx.base.row, year, ctx.base.isDivision);
  }

  function badge(ratio, regionName) {
    if (ratio === null) return el("span");
    var tone = ratio >= BADGE_HIGH ? " high" : ratio <= BADGE_LOW ? " low" : "";
    var node = el("span", "badge" + tone, ratio.toFixed(2) + "×");
    node.title = "Compared with " + regionName;
    return node;
  }

  function summaryParagraph(segments) {
    var p = el("p", "summary");
    segments.forEach(function (s) { p.append(s.strong ? el("strong", null, s.text) : document.createTextNode(s.text)); });
    return p;
  }

  function card(label, value, note, extra) {
    var node = el("div", "stat");
    node.append(el("span", "stat-label", label), el("span", "stat-value mono", value));
    var foot = el("div", "stat-note");
    if (extra) foot.append(extra);
    foot.append(el("span", null, note));
    node.append(foot);
    return node;
  }

  function growthCard(ctx) {
    var change = CV.metrics.byId("change");
    if (change.years.indexOf(ctx.year) === -1) return card("Growth", "n/a", "No earlier census in this set");
    var c = compareTo(ctx, change, ctx.year);
    var node = card("Growth " + (ctx.year - 5) + "–" + String(ctx.year).slice(2), fmt(c.value, "change"), ctx.base.name + " " + fmt(c.region, "change"));
    if (c.value !== null) node.classList.add(c.value < 0 ? "down" : "up");
    return node;
  }

  function shareCard(label, id, ctx) {
    var c = compareTo(ctx, CV.metrics.byId(id), ctx.year);
    return card(label, fmt(c.value, "percent"), ctx.base.name + " " + fmt(c.region, "percent"), badge(c.ratio, ctx.base.name));
  }

  function cards(ctx) {
    var grid = el("div", "stats");
    grid.append(
      card("Population", fmt(ctx.row["total_" + ctx.year], "count"), "#" + CV.profile.rank(ctx.rows, ctx.row, ctx.year) + " of " + ctx.rows.length + " in " + ctx.regionName),
      growthCard(ctx),
      shareCard("Aged 65+", "share_65p", ctx),
      shareCard("Under 15", "share_0_14", ctx)
    );
    return grid;
  }

  function box(title, legend) {
    var node = el("section", "box");
    var head = el("div", "box-head");
    head.append(el("h3", null, title));
    if (legend) head.append(legend);
    node.append(head);
    return node;
  }

  function keyLegend(own, region) {
    var legend = el("div", "key");
    legend.append(el("span", "key-own", own), el("span", "key-region", region));
    return legend;
  }

  function series(chart, points, x, y, className) {
    var known = points.filter(function (p) { return p.index !== null; });
    chart.append(svg("polyline", { points: known.map(function (p) { return x(points.indexOf(p)) + "," + y(p.index); }).join(" "), class: className }));
    known.forEach(function (p) { chart.append(svg("circle", { cx: x(points.indexOf(p)), cy: y(p.index), r: 3.5, class: className })); });
  }

  function growthChart(ctx) {
    var own = CV.profile.growth(ctx.row);
    var region = CV.profile.growth(ctx.base.row);
    var values = own.concat(region).map(function (p) { return p.index; }).filter(function (v) { return v !== null; });
    var min = Math.min.apply(null, values.concat(100)) - 1;
    var max = Math.max.apply(null, values.concat(100)) + 1;
    var x = function (i) { return CHART.pad + (i * (CHART.width - 2 * CHART.pad)) / (own.length - 1); };
    var y = function (v) { return CHART.height - CHART.pad - ((v - min) / (max - min)) * (CHART.height - 2 * CHART.pad); };
    var chart = svg("svg", { viewBox: "0 0 " + CHART.width + " " + (CHART.height + 16), class: "chart", role: "img", "aria-label": "Population index, " + own[0].year + " = 100" });
    chart.append(svg("line", { x1: CHART.pad, x2: CHART.width - CHART.pad, y1: y(100), y2: y(100), class: "baseline" }));
    series(chart, region, x, y, "series-region");
    series(chart, own, x, y, "series-own");
    own.forEach(function (p, i) {
      var label = svg("text", { x: x(i), y: CHART.height + 12, "text-anchor": i === 0 ? "start" : i === own.length - 1 ? "end" : "middle" });
      label.textContent = p.year;
      chart.append(label);
    });
    var last = own.length - 1;
    var section = box("Growth since " + own[0].year, el("span", "muted mono", "index, " + own[0].year + " = 100"));
    section.append(chart, keyLegend(ctx.name + " " + fmt(own[last].index, "ratio"), ctx.base.name + " " + fmt(region[last].index, "ratio")));
    return section;
  }

  function ageRow(label, c, top) {
    var row = el("div", "bar-row");
    var bars = el("div", "bars");
    [["bar-own", c.value], ["bar-region", c.region]].forEach(function (b) {
      var bar = el("span", "bar " + b[0]);
      bar.style.width = top ? ((b[1] || 0) / top) * 100 + "%" : "0";
      bars.append(bar);
    });
    var nums = el("span", "bar-nums mono");
    nums.append(el("strong", null, fmt(c.value, "percent")), document.createTextNode(" / " + fmt(c.region, "percent")));
    row.append(el("span", "bar-label", label), bars, nums);
    return row;
  }

  function ageBars(ctx) {
    var groups = [["0–14", "share_0_14"], ["15–64", "share_15_64"], ["65+", "share_65p"], ["85+", "share_85p"]].map(function (g) {
      return { label: g[0], cmp: compareTo(ctx, CV.metrics.byId(g[1]), ctx.year) };
    });
    var top = Math.max.apply(null, groups.map(function (g) { return Math.max(g.cmp.value || 0, g.cmp.region || 0); }));
    var section = box("Age structure", keyLegend(ctx.name, ctx.base.name));
    groups.forEach(function (g) { section.append(ageRow(g.label, g.cmp, top)); });
    return section;
  }

  function themeItem(id, ctx) {
    var metric = CV.metrics.byId(id);
    var year = CV.metrics.yearFor(metric, ctx.year);
    var c = compareTo(ctx, metric, year);
    var item = el("div", id === ctx.metric.id ? "theme-item active" : "theme-item");
    var value = el("dd", "mono", fmt(c.value, metric.unit) + (year === ctx.year ? "" : " (" + year + ")"));
    var region = el("span", "theme-region", c.region === null ? "" : ctx.base.name + " " + fmt(c.region, metric.unit));
    item.append(el("dt", null, metric.label), value, region, badge(c.ratio, ctx.base.name));
    return item;
  }

  function themeSection(group, ctx) {
    var section = el("section", "theme");
    var list = el("dl", "theme-list");
    group.metrics.forEach(function (id) { list.append(themeItem(id, ctx)); });
    section.append(el("h3", "eyebrow", group.theme), list);
    return section;
  }

  function similarList(ctx) {
    var change = CV.metrics.byId("change");
    var section = el("section", "theme");
    section.append(el("h3", "eyebrow", "Similar-sized divisions"));
    CV.profile.similar(ctx.rows, ctx.row, ctx.year, SIMILAR_COUNT).forEach(function (r) {
      var growth = change.years.indexOf(ctx.year) === -1 ? "" : " · " + fmt(change.value(r, ctx.year), "change");
      var item = el("div", "similar");
      var open = el("button", "similar-open");
      open.type = "button";
      open.append(el("strong", null, r.name), el("span", "muted", fmt(r["total_" + ctx.year], "count") + growth));
      open.addEventListener("click", function () { ctx.onSelect(r.cduid); });
      item.append(open, actionButton("+ Compare", "Compare " + ctx.name + " with " + r.name, function () { ctx.onCompare(r.cduid); }));
      section.append(item);
    });
    return section;
  }

  function actionButton(text, label, onClick) {
    var button = el("button", "pill-button", text);
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.addEventListener("click", onClick);
    return button;
  }

  function compareBanner(ctx) {
    if (!ctx.base.isDivision) return el("span");
    var banner = el("div", "compare-banner");
    banner.append(
      el("span", null, "Comparing with " + ctx.base.name),
      actionButton("× Clear", "Stop comparing with " + ctx.base.name, ctx.onClearCompare)
    );
    return banner;
  }

  function header(ctx, onClose) {
    var close = el("button", "icon-button", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close profile");
    close.addEventListener("click", onClose);
    var head = el("header", "drawer-head");
    head.append(el("p", "crumbs", "Canada › " + ctx.row.province), close);
    return head;
  }

  function heading(name) {
    var h = el("h2", "place-name", name);
    h.tabIndex = -1;
    return h;
  }

  function render(container, ctx, onClose) {
    container.replaceChildren(
      header(ctx, onClose),
      heading(ctx.name),
      el("p", "muted", "Census division " + ctx.row.cduid + " · " + ctx.year + " Census"),
      compareBanner(ctx),
      summaryParagraph(CV.profile.summary(ctx.row, ctx.rows, ctx.regionName, ctx.year)),
      cards(ctx),
      growthChart(ctx),
      ageBars(ctx),
      ...CV.metrics.themes().map(function (group) { return themeSection(group, ctx); }),
      similarList(ctx)
    );
  }

  CV.panel = { render: render };
})(window.CensusViewer = window.CensusViewer || {});
