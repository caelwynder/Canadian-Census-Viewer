(function (CV) {
  function radiusFor(zoom) {
    if (zoom < 5) return 0.7;
    if (zoom < 7) return 1;
    if (zoom < 9) return 1.5;
    return 2.2;
  }

  var DotLayer = L.Layer.extend({
    initialize: function (dots, colors, options) {
      L.setOptions(this, options);
      this._dots = dots;
      this._colors = colors;
    },

    onAdd: function (map) {
      this._canvas = L.DomUtil.create("canvas", "dot-layer leaflet-zoom-hide");
      map.getPane(this.options.pane).appendChild(this._canvas);
      map.on("moveend zoomend resize", this._redraw, this);
      this._redraw();
    },

    onRemove: function (map) {
      L.DomUtil.remove(this._canvas);
      map.off("moveend zoomend resize", this._redraw, this);
    },

    setData: function (dots, colors) {
      this._dots = dots;
      this._colors = colors;
      if (this._map) this._redraw();
      return this;
    },

    _redraw: function () {
      var map = this._map;
      var size = map.getSize();
      var ratio = window.devicePixelRatio || 1;
      var canvas = this._canvas;
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
      canvas.width = size.x * ratio;
      canvas.height = size.y * ratio;
      canvas.style.width = size.x + "px";
      canvas.style.height = size.y + "px";
      var ctx = canvas.getContext("2d");
      var r = radiusFor(map.getZoom()) * ratio;
      var colors = this._colors;
      this._dots.forEach(function (d) {
        var p = map.latLngToContainerPoint([d.lat, d.lng]);
        if (p.x < 0 || p.y < 0 || p.x > size.x || p.y > size.y) return;
        ctx.fillStyle = colors[d.category];
        ctx.fillRect(p.x * ratio - r, p.y * ratio - r, 2 * r, 2 * r);
      });
    },
  });

  CV.dotLayer = function (dots, colors, options) {
    return new DotLayer(dots, colors, options);
  };
})(window.CensusViewer = window.CensusViewer || {});
