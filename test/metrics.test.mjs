import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteScripts } from "./load-site-scripts.mjs";

const { metrics } = loadSiteScripts("format.js", "metrics.js");

const toronto = { total_2016: 2731571, total_2011: 2615060, a65p_2016: 426945 };

test("every metric has the fields the map needs", () => {
  assert.ok(metrics.list.length >= 3);
  for (const m of metrics.list) {
    assert.equal(typeof m.id, "string");
    assert.equal(typeof m.label, "string");
    assert.match(m.unit, /^(count|percent|change)$/);
    assert.equal(typeof m.value, "function");
    if (m.breaks) assert.equal(m.colors.length, m.breaks.length + 1, `${m.id} needs one colour per class`);
  }
});

test("metric ids are unique", () => {
  const ids = metrics.list.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("computes population, change and share aged 65+", () => {
  assert.equal(metrics.byId("population").value(toronto), 2731571);
  assert.equal(metrics.byId("change_2011_2016").value(toronto).toFixed(2), "4.46");
  assert.equal(metrics.byId("share_65p").value(toronto).toFixed(1), "15.6");
});

test("derived metrics are null when an input is suppressed or zero", () => {
  assert.equal(metrics.byId("share_65p").value({ total_2016: 100, a65p_2016: null }), null);
  assert.equal(metrics.byId("change_2011_2016").value({ total_2016: 100, total_2011: 0 }), null);
});

test("byId falls back to the default metric for an unknown id", () => {
  assert.equal(metrics.byId("nope").id, metrics.DEFAULT_ID);
});
