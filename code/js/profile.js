(function (CV) {
  var CENSUS_INTERVAL = 5;
  var SKEW_THRESHOLD = 1.1;
  var AGE_GROUPS = [
    { key: "a0_14", label: "0–14", word: "young" },
    { key: "a15_64", label: "15–64", word: "working-age" },
    { key: "a65p", label: "65+", word: "older" },
  ];

  function isMissing(n) {
    return n === null || n === undefined;
  }

  function pct(n) {
    return CV.format.value(n, "percent");
  }

  function aggregate(rows) {
    return rows.reduce(function (total, row) {
      Object.keys(row).forEach(function (key) {
        if (typeof row[key] === "number") total[key] = (total[key] || 0) + row[key];
      });
      return total;
    }, {});
  }

  function comparable(metric, isDivision) {
    return isDivision || (metric.additive !== false && metric.unit !== "count");
  }

  function compare(metric, row, region, year, isDivision) {
    var value = metric.value(row, year);
    var regionValue = comparable(metric, isDivision) ? metric.value(region, year) : null;
    var ratio = isMissing(value) || !regionValue ? null : value / regionValue;
    return { value: value, region: regionValue, ratio: ratio };
  }

  function population(row, year) {
    return row["total_" + year];
  }

  function rank(rows, row, year) {
    var own = population(row, year);
    return 1 + rows.filter(function (r) { return population(r, year) > own; }).length;
  }

  function ordinal(n) {
    var teen = n % 100 >= 11 && n % 100 <= 13;
    var suffix = teen ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
    return n + suffix;
  }

  function plain(text) {
    return { text: text };
  }

  function strong(text) {
    return { text: text, strong: true };
  }

  function sizeSentence(row, rows, regionName, region, year) {
    var position = rank(rows, row, year);
    return [
      plain((row.name || "It") + " is the "),
      strong(position === 1 ? "largest" : ordinal(position) + "-largest"),
      plain(" of " + rows.length + " census divisions in " + regionName + ", home to "),
      strong(pct((population(row, year) / population(region, year)) * 100)),
      plain(" of its residents."),
    ];
  }

  function growthSentence(row, regionName, region, year) {
    var change = CV.metrics.byId("change");
    if (change.years.indexOf(year) === -1) return [];
    var own = change.value(row, year);
    var regional = change.value(region, year);
    if (isMissing(own) || isMissing(regional)) return [];
    return [
      plain(own < 0 ? "It shrank " : "It grew "),
      strong(pct(Math.abs(own))),
      plain(" between " + (year - CENSUS_INTERVAL) + " and " + year + ", compared with " + CV.format.value(regional, "change") + " across " + regionName + "."),
    ];
  }

  function share(row, key, year) {
    return CV.metrics.byId("share_" + key.slice(1)).value(row, year);
  }

  function ageSentence(row, regionName, region, year) {
    var groups = AGE_GROUPS.map(function (g) {
      var own = share(row, g.key, year);
      var regional = share(region, g.key, year);
      return { group: g, own: own, regional: regional, ratio: isMissing(own) || !regional ? null : own / regional };
    });
    if (groups.some(function (g) { return g.ratio === null; })) return [];
    var top = groups.reduce(function (a, b) { return b.ratio > a.ratio ? b : a; });
    if (top.ratio < SKEW_THRESHOLD) return [plain("Its age mix is close to the " + regionName + " average.")];
    return [
      plain("It skews "),
      strong(top.group.word),
      plain(": "),
      strong(pct(top.own)),
      plain(" of residents are " + top.group.label + ", compared with " + pct(top.regional) + " across " + regionName + "."),
    ];
  }

  function summary(row, rows, regionName, year) {
    var region = aggregate(rows);
    var sentences = [
      sizeSentence(row, rows, regionName, region, year),
      growthSentence(row, regionName, region, year),
      ageSentence(row, regionName, region, year),
    ].filter(function (s) { return s.length > 0; });
    return sentences.flatMap(function (s, i) { return i === 0 ? s : [plain(" ")].concat(s); });
  }

  function growth(row) {
    var base = population(row, CV.metrics.YEARS[0]);
    return CV.metrics.YEARS.map(function (year) {
      var now = population(row, year);
      return { year: year, index: isMissing(now) || !base ? null : (now / base) * 100 };
    });
  }

  function similar(rows, row, year, n) {
    var own = population(row, year);
    return rows
      .filter(function (r) { return r.cduid !== row.cduid && population(r, year) > 0; })
      .map(function (r) { return { row: r, distance: Math.abs(Math.log(population(r, year) / own)) }; })
      .sort(function (a, b) { return a.distance - b.distance; })
      .slice(0, n)
      .map(function (d) { return d.row; });
  }

  function joinRows(ageSex, census) {
    return Object.keys(ageSex).reduce(function (rows, id) {
      rows[id] = Object.assign({ cduid: id }, ageSex[id], census[id]);
      return rows;
    }, {});
  }

  CV.profile = {
    joinRows: joinRows,
    AGE_GROUPS: AGE_GROUPS,
    aggregate: aggregate,
    compare: compare,
    rank: rank,
    ordinal: ordinal,
    summary: summary,
    growth: growth,
    similar: similar,
  };
})(window.CensusViewer = window.CensusViewer || {});
