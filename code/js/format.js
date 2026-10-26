(function (CV) {
  var COUNT = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });
  var ONE_DECIMAL = new Intl.NumberFormat("en-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function sign(n) {
    if (n > 0) return "+";
    if (n < 0) return "−";
    return "";
  }

  var FORMATTERS = {
    count: function (n) { return COUNT.format(n); },
    percent: function (n) { return ONE_DECIMAL.format(n) + "%"; },
    change: function (n) { return sign(Number(n.toFixed(1))) + ONE_DECIMAL.format(Math.abs(n)) + "%"; },
  };

  function value(n, unit) {
    var formatter = FORMATTERS[unit];
    if (!formatter) throw new Error('Unknown unit "' + unit + '"');
    if (n === null || n === undefined) return "n/a";
    return formatter(n);
  }

  CV.format = { value: value };
})(window.CensusViewer = window.CensusViewer || {});
