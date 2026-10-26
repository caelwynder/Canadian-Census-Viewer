import { test } from "node:test";
import assert from "node:assert/strict";
import { checkJoin, checkCanadaTotal } from "./validate.mjs";

const fc = (...ids) => ({ type: "FeatureCollection", features: ids.map((cduid) => ({ properties: { cduid } })) });

test("checkJoin reports nothing when every boundary has metrics and vice versa", () => {
  assert.deepEqual(checkJoin(fc("1001", "3520"), { 1001: {}, 3520: {} }), []);
});

test("checkJoin lists boundaries that have no census row", () => {
  assert.deepEqual(checkJoin(fc("1001", "3520"), { 1001: {} }), ["Boundary 3520 has no census row"]);
});

test("checkJoin lists census rows that have no boundary", () => {
  assert.deepEqual(checkJoin(fc("1001"), { 1001: {}, 9999: {} }), ["Census row 9999 has no boundary"]);
});

test("checkJoin flags duplicate boundary ids", () => {
  assert.deepEqual(checkJoin(fc("1001", "1001"), { 1001: {} }), ["Boundary 1001 appears 2 times"]);
});

test("checkCanadaTotal accepts a sum within the random-rounding tolerance", () => {
  assert.deepEqual(checkCanadaTotal({ a: { total_2016: 600 }, b: { total_2016: 405 } }, 1000, 10), []);
});

test("checkCanadaTotal reports a sum outside the tolerance", () => {
  const problems = checkCanadaTotal({ a: { total_2016: 500 } }, 1000, 10);
  assert.deepEqual(problems, ["Sum of total_2016 is 500, expected 1000 ± 10"]);
});

test("checkCanadaTotal ignores suppressed (null) totals", () => {
  assert.deepEqual(checkCanadaTotal({ a: { total_2016: 1000 }, b: { total_2016: null } }, 1000, 0), []);
});
