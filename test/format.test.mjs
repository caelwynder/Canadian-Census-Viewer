import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteScripts } from "./load-site-scripts.mjs";

const { format } = loadSiteScripts("format.js");

test("formats counts with Canadian thousands separators", () => {
  assert.equal(format.value(2731571, "count"), "2,731,571");
});

test("formats percentages to one decimal place", () => {
  assert.equal(format.value(15.6123, "percent"), "15.6%");
});

test("formats change with an explicit sign", () => {
  assert.equal(format.value(4.46, "change"), "+4.5%");
  assert.equal(format.value(-2.04, "change"), "−2.0%");
  assert.equal(format.value(0, "change"), "0.0%");
});

test("shows missing values as n/a", () => {
  assert.equal(format.value(null, "count"), "n/a");
  assert.equal(format.value(undefined, "percent"), "n/a");
});

test("rejects an unknown unit", () => {
  assert.throws(() => format.value(1, "furlongs"), /Unknown unit "furlongs"/);
});
