import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteScripts, plain } from "./load-site-scripts.mjs";

const { thumbnails } = loadSiteScripts("thumbnails.js");

const square = (x, y, size) => ({
  geometry: { type: "Polygon", coordinates: [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]] },
});

test("bounds covers every outer ring", () => {
  assert.deepEqual(plain(thumbnails.bounds([square(0, 0, 1), square(5, -2, 1)])), { minX: 0, maxX: 6, minY: -2, maxY: 1 });
});

test("projector fits the shape inside the box with north up", () => {
  const project = thumbnails.projector({ minX: 0, maxX: 10, minY: 0, maxY: 10 }, 200, 100, 10);
  const [left, top] = project([0, 10]);
  const [right, bottom] = project([10, 0]);
  assert.ok(left >= 10 && right <= 190, "within horizontal padding");
  assert.ok(Math.abs(top - 10) < 1e-9 && Math.abs(bottom - 90) < 1e-9, "fills the height");
  assert.ok(top < bottom, "north is up");
  assert.ok(Math.abs((left + right) / 2 - 100) < 1e-9, "centred");
});

test("projector narrows longitude by the cosine of the middle latitude", () => {
  const project = thumbnails.projector({ minX: 0, maxX: 10, minY: 59, maxY: 61 }, 1000, 1000, 0);
  const width = project([10, 60])[0] - project([0, 60])[0];
  const height = project([0, 59])[1] - project([0, 61])[1];
  assert.ok(Math.abs(width / height - (10 * Math.cos((60 * Math.PI) / 180)) / 2) < 1e-9);
});
