(function (CV) {
  var NO_DATA_COLOR = "#4a4f5a";

  function isNumber(v) {
    return typeof v === "number" && !isNaN(v);
  }

  function quantile(values, classes) {
    var sorted = values.filter(isNumber).sort(function (a, b) { return a - b; });
    if (!sorted.length) return [];
    var thresholds = [];
    for (var i = 1; i < classes; i++) {
      var floor = thresholds.length ? thresholds[thresholds.length - 1] : sorted[0];
      var t = sorted[Math.floor((i * sorted.length) / classes)];
      if (t <= floor) t = sorted.find(function (v) { return v > floor; });
      if (t === undefined) break;
      thresholds.push(t);
    }
    return thresholds;
  }

  function classify(value, thresholds) {
    return thresholds.filter(function (t) { return value >= t; }).length;
  }

  function pickColors(ramp, n) {
    if (n === 1) return [ramp[ramp.length - 1]];
    return Array.from({ length: n }, function (_, i) {
      return ramp[Math.round((i * (ramp.length - 1)) / (n - 1))];
    });
  }

  function labels(thresholds, formatValue) {
    if (!thresholds.length) return ["All values"];
    var last = thresholds.length - 1;
    var middle = thresholds.slice(1).map(function (t, i) {
      return formatValue(thresholds[i]) + " – " + formatValue(t);
    });
    return ["Under " + formatValue(thresholds[0])].concat(middle, [formatValue(thresholds[last]) + " and over"]);
  }

  function scale(metric, values, ramp) {
    var thresholds = metric.breaks || quantile(values, ramp.length);
    var colors = metric.colors || pickColors(ramp, thresholds.length + 1);
    return {
      thresholds: thresholds,
      colors: colors,
      colorFor: function (value) {
        if (!isNumber(value)) return NO_DATA_COLOR;
        return colors[classify(value, thresholds)];
      },
    };
  }

  // Gaps from a balance point: classes are cut by size of gap so equal gaps either side share a shade.
  function diverging(values, ramp) {
    var sizes = [0].concat(values.filter(isNumber).map(Math.abs));
    var steps = quantile(sizes, (ramp.length + 1) / 2);
    var middle = (ramp.length - 1) / 2;
    var colors = ramp.slice(middle - steps.length, middle + steps.length + 1);
    return {
      thresholds: steps.map(function (s) { return -s; }).reverse().concat(steps),
      colors: colors,
      colorFor: function (value) {
        if (!isNumber(value)) return NO_DATA_COLOR;
        var n = classify(Math.abs(value), steps);
        return colors[steps.length + (value < 0 ? -n : n)];
      },
    };
  }

  CV.breaks = { NO_DATA_COLOR: NO_DATA_COLOR, quantile: quantile, classify: classify, pickColors: pickColors, labels: labels, scale: scale, diverging: diverging };
})(window.CensusViewer = window.CensusViewer || {});
