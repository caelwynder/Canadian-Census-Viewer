(function (CV) {
  var PROVINCES = [
    ["10", "Newfoundland and Labrador"],
    ["11", "Prince Edward Island"],
    ["12", "Nova Scotia"],
    ["13", "New Brunswick"],
    ["24", "Quebec"],
    ["35", "Ontario", "Ontarians"],
    ["46", "Manitoba"],
    ["47", "Saskatchewan"],
    ["48", "Alberta"],
    ["59", "British Columbia"],
    ["60", "Yukon"],
    ["61", "Northwest Territories"],
    ["62", "Nunavut"],
  ];

  function slug(name) {
    return name.toLowerCase().replace(/[^a-z]+/g, "-");
  }

  var CANADA = { id: "canada", title: "Canada", people: "Canadians", pruids: null };
  var list = [CANADA].concat(PROVINCES.map(function (p) {
    return { id: slug(p[1]), title: p[1], people: p[2] || "people in " + p[1], pruids: [p[0]] };
  }));

  function fromSearch(search) {
    var id = new URLSearchParams(search).get("region");
    return list.find(function (r) { return r.id === id; }) || CANADA;
  }

  function select(fc, region) {
    var features = region.pruids
      ? fc.features.filter(function (f) { return region.pruids.indexOf(f.properties.pruid) !== -1; })
      : fc.features.slice();
    return { type: "FeatureCollection", features: features };
  }

  CV.regions = { list: list, fromSearch: fromSearch, select: select };
})(window.CensusViewer = window.CensusViewer || {});
