import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteScripts, plain } from "./load-site-scripts.mjs";

const { breaks } = loadSiteScripts("breaks.js");

test("quantile splits values into equal-count classes", () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(plain(breaks.quantile(values, 4)), [3, 5, 7]);
});

test("quantile ignores nulls and moves past repeated values instead of collapsing", () => {
  assert.deepEqual(plain(breaks.quantile([5, 5, 5, 5, null, 9], 4)), [9]);
});

test("quantile of identical values has no thresholds", () => {
  assert.deepEqual(plain(breaks.quantile([3, 3, 3], 4)), []);
});

test("quantile of no values has no thresholds", () => {
  assert.deepEqual(plain(breaks.quantile([null], 5)), []);
});

test("classify returns the number of thresholds at or below the value", () => {
  const thresholds = [10, 20, 30];
  assert.equal(breaks.classify(5, thresholds), 0);
  assert.equal(breaks.classify(10, thresholds), 1);
  assert.equal(breaks.classify(25, thresholds), 2);
  assert.equal(breaks.classify(99, thresholds), 3);
});

test("pickColors spreads a ramp across the requested number of classes", () => {
  const ramp = ["a", "b", "c", "d", "e"];
  assert.deepEqual(plain(breaks.pickColors(ramp, 3)), ["a", "c", "e"]);
  assert.deepEqual(plain(breaks.pickColors(ramp, 1)), ["e"]);
  assert.deepEqual(plain(breaks.pickColors(ramp, 5)), ramp);
});

test("scale uses fixed breaks and colours when a metric defines them", () => {
  const metric = { breaks: [0, 5], colors: ["blue", "grey", "red"] };
  const scale = breaks.scale(metric, [-3, 1, 9], ["x"]);
  assert.deepEqual(plain(scale.thresholds), [0, 5]);
  assert.equal(scale.colorFor(-3), "blue");
  assert.equal(scale.colorFor(9), "red");
});

test("scale falls back to quantiles over the visible values", () => {
  const scale = breaks.scale({}, [1, 2, 3, 4], ["lo", "mid", "hi", "top"]);
  assert.deepEqual(plain(scale.thresholds), [2, 3, 4]);
  assert.equal(scale.colorFor(1), "lo");
  assert.equal(scale.colorFor(4), "top");
});

test("labels describe each class range", () => {
  const fmt = (n) => `#${n}`;
  assert.deepEqual(plain(breaks.labels([10, 20], fmt)), ["Under #10", "#10 – #20", "#20 and over"]);
});

test("labels of a single class cover all values", () => {
  assert.deepEqual(plain(breaks.labels([], String)), ["All values"]);
});

test("scale colours missing values with the no-data colour", () => {
  const scale = breaks.scale({}, [1, 2], ["lo", "hi"]);
  assert.equal(scale.colorFor(null), breaks.NO_DATA_COLOR);
});
