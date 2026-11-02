(function (CV) {
  function isMissing(n) {
    return n === null || n === undefined;
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
    aggregate: aggregate,
    compare: compare,
    rank: rank,
    growth: growth,
    similar: similar,
  };
})(window.CensusViewer = window.CensusViewer || {});
