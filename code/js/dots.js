(function (CV) {
  var MAX_TRIES = 200;
  var BLUE = "#4fb0e8";
  var YELLOW = "#f5c242";
  var PINK = "#f0648c";

  function key(name) {
    return function (row) { return row[name]; };
  }

  function byYear(name) {
    return function (row, year) { return row[name + "_" + year]; };
  }

  var SCHEMES = [
    {
      id: "age",
      label: "Age",
      unit: "people",
      years: [2006, 2011, 2016],
      total: byYear("total"),
      categories: [
        { label: "Children 0–14", color: YELLOW, value: byYear("a0_14") },
        { label: "Working age 15–64", color: BLUE, value: byYear("a15_64") },
        { label: "Seniors 65+", color: PINK, value: byYear("a65p") },
      ],
    },
    {
      id: "language",
      label: "Mother tongue",
      unit: "people",
      years: [2016],
      total: key("motherTongueTotal"),
      categories: [
        { label: "English", color: BLUE, value: key("motherTongueEnglish") },
        { label: "French", color: PINK, value: key("motherTongueFrench") },
        { label: "Other languages", color: YELLOW, remainder: true },
      ],
    },
    {
      id: "immigration",
      label: "Immigrant status",
      unit: "people",
      years: [2016],
      total: key("immigrantTotal"),
      categories: [
        { label: "Born in Canada or non-permanent resident", color: BLUE, remainder: true },
        { label: "Immigrants", color: YELLOW, value: key("immigrants") },
      ],
    },
    {
      id: "tenure",
      label: "Tenure",
      unit: "households",
      years: [2016],
      total: key("tenureTotal"),
      categories: [
        { label: "Owners", color: BLUE, remainder: true },
        { label: "Renters", color: PINK, value: key("renters") },
      ],
    },
  ];

  function schemeById(id) {
    return SCHEMES.find(function (s) { return s.id === id; }) || SCHEMES[0];
  }

  function isMissing(n) {
    return n === null || n === undefined;
  }

  function counts(scheme, row, year) {
    var parts = scheme.categories.map(function (c) { return c.remainder ? 0 : c.value(row, year); });
    var total = scheme.total(row, year);
    if (isMissing(total) || parts.some(isMissing)) return null;
    var rest = Math.max(0, total - parts.reduce(function (a, b) { return a + b; }, 0));
    return scheme.categories.map(function (c, i) { return c.remainder ? rest : parts[i]; });
  }

  function insideRing(ring, x, y) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function polygons(geometry) {
    return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  }

  function contains(geometry, x, y) {
    return polygons(geometry).some(function (rings) {
      return rings.reduce(function (inside, ring) { return insideRing(ring, x, y) ? !inside : inside; }, false);
    });
  }

  function bounds(geometry) {
    var points = polygons(geometry).flatMap(function (rings) { return rings[0]; });
    var xs = points.map(function (p) { return p[0]; });
    var ys = points.map(function (p) { return p[1]; });
    return { minX: Math.min.apply(null, xs), maxX: Math.max.apply(null, xs), minY: Math.min.apply(null, ys), maxY: Math.max.apply(null, ys) };
  }

  // mulberry32, seeded from a string hash so each division's dots stay put between renders.
  function random(seed) {
    var h = 1779033703;
    for (var i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    return function () {
      h = (h + 0x6d2b79f5) | 0;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomPoint(geometry, box, rng) {
    for (var i = 0; i < MAX_TRIES; i++) {
      var x = box.minX + rng() * (box.maxX - box.minX);
      var y = box.minY + rng() * (box.maxY - box.minY);
      if (contains(geometry, x, y)) return { lng: x, lat: y };
    }
    return null;
  }

  function shuffle(items, rng) {
    var out = items.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function place(geometry, categoryCounts, perDot, rng) {
    var box = bounds(geometry);
    var placed = categoryCounts.flatMap(function (n, category) {
      return Array.from({ length: Math.round(n / perDot) }, function () {
        var point = randomPoint(geometry, box, rng);
        return point && { lng: point.lng, lat: point.lat, category: category };
      });
    });
    return shuffle(placed.filter(Boolean), rng);
  }

  function generate(features, rows, scheme, year, perDot) {
    return features.flatMap(function (f) {
      var row = rows[f.properties.cduid];
      var c = row && counts(scheme, row, year);
      return c ? place(f.geometry, c, perDot, random(f.properties.cduid)) : [];
    });
  }

  CV.dots = { SCHEMES: SCHEMES, schemeById: schemeById, counts: counts, contains: contains, random: random, place: place, generate: generate };
})(window.CensusViewer = window.CensusViewer || {});
