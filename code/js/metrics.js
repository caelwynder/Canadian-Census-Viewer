(function (CV) {
  var SEQUENTIAL = ["#440154", "#443983", "#31688e", "#21918c", "#35b779", "#90d743", "#fde725"];
  var YEARS = [2006, 2011, 2016];
  var CENSUS_INTERVAL = 5;
  var DEFAULT_ID = "population";

  function isMissing(n) {
    return n === null || n === undefined;
  }

  function per100(part, whole) {
    if (isMissing(part) || !whole) return null;
    return (part / whole) * 100;
  }

  function sum(a, b) {
    if (isMissing(a) || isMissing(b)) return null;
    return a + b;
  }

  function change(now, before) {
    if (isMissing(now) || !before) return null;
    return ((now - before) / before) * 100;
  }

  function count(field) {
    return function (row, year) { return row[field + "_" + year]; };
  }

  function share(group) {
    return function (row, year) { return per100(row[group + "_" + year], row["total_" + year]); };
  }

  var list = [
    { id: "population", label: "Population", theme: "Population", unit: "count", years: YEARS, value: count("total") },
    {
      id: "change",
      label: "Population change over 5 years",
      theme: "Population",
      unit: "change",
      years: [2011, 2016],
      breaks: [-5, -1, 1, 5, 10],
      colors: ["#2166ac", "#67a9cf", "#8c8f96", "#fdb863", "#e66101", "#b2182b"],
      value: function (row, year) { return change(row["total_" + year], row["total_" + (year - CENSUS_INTERVAL)]); },
    },
    {
      id: "density",
      label: "Population density",
      theme: "Population",
      unit: "density",
      years: YEARS,
      value: function (row, year) { return isMissing(row["total_" + year]) || !row.landArea ? null : row["total_" + year] / row.landArea; },
    },
    { id: "share_0_14", label: "Share aged 0–14", theme: "Age", unit: "percent", years: YEARS, value: share("a0_14") },
    { id: "share_15_64", label: "Share aged 15–64", theme: "Age", unit: "percent", years: YEARS, value: share("a15_64") },
    { id: "share_65p", label: "Share aged 65+", theme: "Age", unit: "percent", years: YEARS, value: share("a65p") },
    { id: "share_85p", label: "Share aged 85+", theme: "Age", unit: "percent", years: YEARS, value: share("a85p") },
    {
      id: "dependency",
      label: "Dependency ratio (under 15 and 65+ per 100 aged 15–64)",
      theme: "Age",
      unit: "ratio",
      years: YEARS,
      value: function (row, year) { return per100(sum(row["a0_14_" + year], row["a65p_" + year]), row["a15_64_" + year]); },
    },
    {
      id: "sex_ratio",
      label: "Males per 100 females",
      theme: "Sex",
      unit: "ratio",
      years: YEARS,
      breaks: [95, 98, 100, 102, 105],
      colors: ["#762a83", "#9970ab", "#c2a5cf", "#a6dba0", "#5aae61", "#1b7837"],
      value: function (row, year) { return per100(row["m_total_" + year], row["f_total_" + year]); },
    },
  ];

  function byId(id) {
    return list.find(function (m) { return m.id === id; }) || byId(DEFAULT_ID);
  }

  function yearFor(metric, year) {
    return metric.years.indexOf(year) !== -1 ? year : metric.years[metric.years.length - 1];
  }

  function allValues(metric, rows) {
    return metric.years.flatMap(function (year) {
      return rows.map(function (row) { return metric.value(row, year); });
    });
  }

  function themes() {
    return list.reduce(function (groups, m) {
      var last = groups[groups.length - 1];
      if (last && last.theme === m.theme) return groups.slice(0, -1).concat([{ theme: m.theme, metrics: last.metrics.concat([m.id]) }]);
      return groups.concat([{ theme: m.theme, metrics: [m.id] }]);
    }, []);
  }

  CV.metrics = { SEQUENTIAL: SEQUENTIAL, YEARS: YEARS, DEFAULT_ID: DEFAULT_ID, list: list, byId: byId, yearFor: yearFor, allValues: allValues, themes: themes };
})(window.CensusViewer = window.CensusViewer || {});
