(function (CV) {
  var SEQUENTIAL = ["#440154", "#443983", "#31688e", "#21918c", "#35b779", "#90d743", "#fde725"];
  var DEFAULT_ID = "population";

  function ratio(part, whole) {
    if (part === null || part === undefined || !whole) return null;
    return (part / whole) * 100;
  }

  function change(now, before) {
    if (now === null || now === undefined || !before) return null;
    return ((now - before) / before) * 100;
  }

  var list = [
    {
      id: "population",
      label: "Population, 2016",
      theme: "Population",
      unit: "count",
      value: function (row) { return row.total_2016; },
    },
    {
      id: "change_2011_2016",
      label: "Population change, 2011–2016",
      theme: "Population",
      unit: "change",
      breaks: [-5, -1, 1, 5, 10],
      colors: ["#2166ac", "#67a9cf", "#8c8f96", "#fdb863", "#e66101", "#b2182b"],
      value: function (row) { return change(row.total_2016, row.total_2011); },
    },
    {
      id: "share_65p",
      label: "Share aged 65+, 2016",
      theme: "Age",
      unit: "percent",
      value: function (row) { return ratio(row.a65p_2016, row.total_2016); },
    },
  ];

  function byId(id) {
    return list.find(function (m) { return m.id === id; }) || byId(DEFAULT_ID);
  }

  CV.metrics = { SEQUENTIAL: SEQUENTIAL, DEFAULT_ID: DEFAULT_ID, list: list, byId: byId };
})(window.CensusViewer = window.CensusViewer || {});
