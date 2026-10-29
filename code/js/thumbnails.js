(function (CV) {
  var DEG = Math.PI / 180;

  function polygons(geometry) {
    return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  }

  function bounds(features) {
    var points = features.flatMap(function (f) {
      return polygons(f.geometry).flatMap(function (rings) { return rings[0]; });
    });
    var xs = points.map(function (p) { return p[0]; });
    var ys = points.map(function (p) { return p[1]; });
    return {
      minX: xs.reduce(function (a, b) { return Math.min(a, b); }),
      maxX: xs.reduce(function (a, b) { return Math.max(a, b); }),
      minY: ys.reduce(function (a, b) { return Math.min(a, b); }),
      maxY: ys.reduce(function (a, b) { return Math.max(a, b); }),
    };
  }

  function projector(box, width, height, pad) {
    var k = Math.cos(((box.minY + box.maxY) / 2) * DEG);
    var scale = Math.min((width - 2 * pad) / ((box.maxX - box.minX) * k), (height - 2 * pad) / (box.maxY - box.minY));
    var offsetX = (width - (box.maxX - box.minX) * k * scale) / 2;
    var offsetY = (height - (box.maxY - box.minY) * scale) / 2;
    return function (point) {
      return [offsetX + (point[0] - box.minX) * k * scale, offsetY + (box.maxY - point[1]) * scale];
    };
  }

  function tracePath(ctx, geometry, project) {
    ctx.beginPath();
    polygons(geometry).forEach(function (rings) {
      rings.forEach(function (ring) {
        ring.forEach(function (point, i) {
          var p = project(point);
          if (i === 0) ctx.moveTo(p[0], p[1]);
          else ctx.lineTo(p[0], p[1]);
        });
        ctx.closePath();
      });
    });
  }

  // options: { fill(feature) -> colour, stroke, dots: [{lng, lat, category}], colors, radius }
  function draw(canvas, features, options) {
    var ratio = window.devicePixelRatio || 1;
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    var ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    var project = projector(bounds(features), width, height, 8);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = options.stroke;
    features.forEach(function (f) {
      tracePath(ctx, f.geometry, project);
      ctx.fillStyle = options.fill(f);
      ctx.fill("evenodd");
      ctx.stroke();
    });
    (options.dots || []).forEach(function (d) {
      var p = project([d.lng, d.lat]);
      ctx.fillStyle = options.colors[d.category];
      ctx.fillRect(p[0] - options.radius / 2, p[1] - options.radius / 2, options.radius, options.radius);
    });
  }

  CV.thumbnails = { bounds: bounds, projector: projector, draw: draw };
})(window.CensusViewer = window.CensusViewer || {});
