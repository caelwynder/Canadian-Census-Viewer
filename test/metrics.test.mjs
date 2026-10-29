import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteScripts, plain } from "./load-site-scripts.mjs";

const { metrics } = loadSiteScripts("format.js", "metrics.js");

const toronto = {
  landArea: 630.2,
  total_2016: 2731570, total_2011: 2615060, total_2006: 2503280,
  a0_14_2016: 398135, a15_64_2016: 1906490, a65p_2016: 426945, a85p_2016: 66235,
  m_total_2016: 1323100, f_total_2016: 1408470,
};

const value = (id, year, row = toronto) => metrics.byId(id).value(row, year);

test("every metric has the fields the map needs", () => {
  assert.ok(metrics.list.length >= 9);
  for (const m of metrics.list) {
    assert.equal(typeof m.id, "string");
    assert.equal(typeof m.label, "string");
    assert.equal(typeof m.theme, "string");
    assert.match(m.unit, /^(count|percent|change|density|ratio)$/);
    assert.equal(typeof m.value, "function");
    assert.ok(m.years.length > 0 && m.years.every((y) => metrics.YEARS.includes(y)), `${m.id} years`);
    if (m.breaks) assert.equal(m.colors.length, m.breaks.length + 1, `${m.id} needs one colour per class`);
  }
});

test("metric ids are unique", () => {
  const ids = metrics.list.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("population metrics", () => {
  assert.equal(value("population", 2006), 2503280);
  assert.equal(value("change", 2016).toFixed(2), "4.46");
  assert.equal(value("change", 2011).toFixed(2), "4.47");
  assert.equal(value("density", 2016).toFixed(1), "4334.4");
});

test("age metrics", () => {
  assert.equal(value("share_0_14", 2016).toFixed(1), "14.6");
  assert.equal(value("share_15_64", 2016).toFixed(1), "69.8");
  assert.equal(value("share_65p", 2016).toFixed(1), "15.6");
  assert.equal(value("share_85p", 2016).toFixed(1), "2.4");
  assert.equal(value("dependency", 2016).toFixed(1), "43.3");
});

test("sex ratio is males per 100 females", () => {
  assert.equal(value("sex_ratio", 2016).toFixed(1), "93.9");
});

test("change has no value for the first census year", () => {
  assert.deepEqual(plain(metrics.byId("change").years), [2011, 2016]);
});

test("derived metrics are null when an input is suppressed, missing or zero", () => {
  assert.equal(value("share_65p", 2016, { total_2016: 100, a65p_2016: null }), null);
  assert.equal(value("change", 2016, { total_2016: 100, total_2011: 0 }), null);
  assert.equal(value("density", 2016, { total_2016: 100 }), null);
  assert.equal(value("dependency", 2016, { a0_14_2016: 1, a65p_2016: null, a15_64_2016: 5 }), null);
});

test("byId falls back to the default metric for an unknown id", () => {
  assert.equal(metrics.byId("nope").id, metrics.DEFAULT_ID);
});

test("yearFor keeps a year the metric has and otherwise uses its latest", () => {
  const change = metrics.byId("change");
  assert.equal(metrics.yearFor(change, 2011), 2011);
  assert.equal(metrics.yearFor(change, 2006), 2016);
  assert.equal(metrics.yearFor(change, null), 2016);
});

test("allValues pools every year so colours mean the same thing on the timeline", () => {
  const rows = [{ total_2016: 3, total_2011: 2, total_2006: 1 }, { total_2016: null, total_2011: 5, total_2006: 4 }];
  assert.deepEqual(plain(metrics.allValues(metrics.byId("population"), rows)).sort(), [1, 2, 3, 4, 5, null].sort());
});

test("themes groups metrics in registry order", () => {
  const themes = plain(metrics.themes());
  assert.deepEqual(themes.map((t) => t.theme), ["Population", "Age", "Sex"]);
  assert.ok(themes[0].metrics.includes("population"));
});
