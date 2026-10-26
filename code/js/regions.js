(function (CV) {
  var REGIONS = {
    canada: { id: "canada", title: "Canada", pruids: null },
    ontario: { id: "ontario", title: "Ontario", pruids: ["35"] },
  };

  function fromSearch(search) {
    var id = new URLSearchParams(search).get("region");
    return REGIONS[id] || REGIONS.canada;
  }

  function select(fc, region) {
    var features = region.pruids
      ? fc.features.filter(function (f) { return region.pruids.indexOf(f.properties.pruid) !== -1; })
      : fc.features.slice();
    return { type: "FeatureCollection", features: features };
  }

  CV.regions = { fromSearch: fromSearch, select: select };
})(window.CensusViewer = window.CensusViewer || {});
