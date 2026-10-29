import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteScripts, plain } from "./load-site-scripts.mjs";

const { dots } = loadSiteScripts("dots.js");

const square = { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
const squareWithHole = {
  type: "Polygon",
  coordinates: [square.coordinates[0], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]],
};
const twoSquares = {
  type: "MultiPolygon",
  coordinates: [square.coordinates, [[[20, 20], [21, 20], [21, 21], [20, 21], [20, 20]]]],
};

const row = {
  total_2016: 10000, a0_14_2016: 2000, a15_64_2016: 6000, a65p_2016: 2000,
  total_2011: 9000, a0_14_2011: 1000, a15_64_2011: 6000, a65p_2011: 2000,
  motherTongueTotal: 10000, motherTongueEnglish: 7000, motherTongueFrench: 1000,
  immigrantTotal: 10000, immigrants: 3000,
  tenureTotal: 4000, renters: 1000,
};

test("every scheme has categories with labels and colours", () => {
  assert.deepEqual(plain(dots.SCHEMES.map((s) => s.id)), ["age", "language", "immigration", "tenure"]);
  for (const s of dots.SCHEMES) {
    assert.ok(s.label && s.unit && s.years.length > 0, s.id);
    for (const c of s.categories) assert.match(c.color, /^#[0-9a-f]{6}$/);
  }
});

test("schemeById falls back to age", () => {
  assert.equal(dots.schemeById("tenure").id, "tenure");
  assert.equal(dots.schemeById("nope").id, "age");
});

test("counts splits a row into category counts, with remainders", () => {
  const counts = (id, year = 2016) => dots.counts(dots.schemeById(id), row, year);
  assert.deepEqual(plain(counts("age")), [2000, 6000, 2000]);
  assert.deepEqual(plain(counts("age", 2011)), [1000, 6000, 2000]);
  assert.deepEqual(plain(counts("language")), [7000, 1000, 2000]);
  assert.deepEqual(plain(counts("immigration")), [7000, 3000]);
  assert.deepEqual(plain(counts("tenure")), [3000, 1000]);
});

test("counts never goes negative and is null when data is missing", () => {
  const scheme = dots.schemeById("language");
  assert.deepEqual(plain(dots.counts(scheme, { ...row, motherTongueEnglish: 9500 }, 2016)), [9500, 1000, 0]);
  assert.equal(dots.counts(scheme, { ...row, motherTongueFrench: null }, 2016), null);
  assert.equal(dots.counts(dots.schemeById("age"), row, 2006), null);
});

test("contains handles holes and multipolygons", () => {
  assert.ok(dots.contains(square, 5, 5));
  assert.ok(!dots.contains(square, 11, 5));
  assert.ok(!dots.contains(squareWithHole, 5, 5));
  assert.ok(dots.contains(squareWithHole, 2, 2));
  assert.ok(dots.contains(twoSquares, 20.5, 20.5));
  assert.ok(!dots.contains(twoSquares, 15, 15));
});

test("random is seeded and repeatable", () => {
  const a = dots.random("3520");
  const b = dots.random("3520");
  const c = dots.random("3521");
  const first = [a(), a(), a()];
  assert.deepEqual([b(), b(), b()], first);
  assert.notDeepEqual([c(), c(), c()], first);
  assert.ok(first.every((n) => n >= 0 && n < 1));
});

test("place puts one dot per person-unit inside the shape", () => {
  const placed = dots.place(squareWithHole, [2400, 600], 100, dots.random("x"));
  assert.equal(placed.length, 30);
  assert.equal(placed.filter((d) => d.category === 0).length, 24);
  assert.equal(placed.filter((d) => d.category === 1).length, 6);
  assert.ok(placed.every((d) => dots.contains(squareWithHole, d.lng, d.lat)));
});

test("generate skips divisions without data and is stable", () => {
  const features = [
    { properties: { cduid: "1" }, geometry: square },
    { properties: { cduid: "2" }, geometry: twoSquares },
    { properties: { cduid: "3" }, geometry: square },
  ];
  const rows = { 1: row, 2: { ...row, a0_14_2016: null } };
  const scheme = dots.schemeById("age");
  const first = dots.generate(features, rows, scheme, 2016, 1000);
  assert.equal(first.length, 10);
  assert.deepEqual(plain(dots.generate(features, rows, scheme, 2016, 1000)), plain(first));
});
