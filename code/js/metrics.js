(function (CV) {
  var SEQUENTIAL = ["#440154", "#443983", "#31688e", "#21918c", "#35b779", "#90d743", "#fde725"];
  var YEARS = [2006, 2011, 2016];
  var PROFILE_YEARS = [2016];
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

  function field(key) {
    return function (row) { return isMissing(row[key]) ? null : row[key]; };
  }

  function ofTotal(parts, total) {
    return function (row) {
      var part = parts.map(function (key) { return row[key]; }).reduce(sum);
      return per100(part, row[total]);
    };
  }

  function profile(id, label, theme, unit, value) {
    return { id: id, label: label, theme: theme, unit: unit, years: PROFILE_YEARS, value: value };
  }

  function notAdditive(metric) {
    return Object.assign({}, metric, { additive: false });
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
    notAdditive(profile("median_age", "Median age", "Age", "years", field("medianAge"))),
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
    notAdditive(profile("household_income", "Median household income (income year 2015)", "Income", "currency", field("householdIncome"))),
    notAdditive(profile("low_income", "Low-income rate (LIM-AT)", "Income", "percent", field("lowIncomeRate"))),
    profile("renters", "Households that rent", "Housing", "percent", ofTotal(["renters"], "tenureTotal")),
    profile("shelter_30", "Households spending 30%+ of income on shelter", "Housing", "percent", ofTotal(["shelterCost30"], "shelterCostTotal")),
    notAdditive(profile("owner_cost", "Median monthly shelter cost, owners", "Housing", "currency", field("ownerShelterCost"))),
    notAdditive(profile("rent", "Median monthly shelter cost, renters", "Housing", "currency", field("renterShelterCost"))),
    profile("immigrants", "Immigrants", "Immigration & diversity", "percent", ofTotal(["immigrants"], "immigrantTotal")),
    profile("visible_minority", "Visible minority", "Immigration & diversity", "percent", ofTotal(["visibleMinority"], "visibleMinorityTotal")),
    profile("indigenous", "Indigenous identity", "Immigration & diversity", "percent", ofTotal(["indigenous"], "indigenousTotal")),
    profile("mother_tongue_en", "Mother tongue English", "Language", "percent", ofTotal(["motherTongueEnglish"], "motherTongueTotal")),
    profile("mother_tongue_fr", "Mother tongue French", "Language", "percent", ofTotal(["motherTongueFrench"], "motherTongueTotal")),
    profile("bilingual", "Speaks English and French", "Language", "percent", ofTotal(["bilingual"], "officialLanguageTotal")),
    profile("bachelor", "Bachelor's degree or higher (aged 25–64)", "Education & work", "percent", ofTotal(["bachelorPlus"], "educationTotal")),
    notAdditive(profile("participation", "Labour force participation rate", "Education & work", "percent", field("participationRate"))),
    notAdditive(profile("unemployment", "Unemployment rate", "Education & work", "percent", field("unemploymentRate"))),
    profile("transit", "Commute by public transit", "Commute", "percent", ofTotal(["transit"], "commuteTotal")),
    profile("active_commute", "Commute by walking or cycling", "Commute", "percent", ofTotal(["walked", "bicycle"], "commuteTotal")),
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
