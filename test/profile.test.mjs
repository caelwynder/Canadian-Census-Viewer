import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteScripts, plain } from "./load-site-scripts.mjs";

const { profile, metrics } = loadSiteScripts("format.js", "metrics.js", "profile.js");

const row = (cduid, now, before, kids, work, seniors) => ({
  cduid,
  total_2016: now, total_2011: before, total_2006: before,
  a0_14_2016: kids, a15_64_2016: work, a65p_2016: seniors, a85p_2016: 0,
  tenureTotal: now / 2, renters: now / 4, householdIncome: 50000,
});

const big = row("1", 1000, 900, 100, 800, 100);
const mid = row("2", 500, 500, 100, 300, 100);
const small = row("3", 100, 125, 10, 40, 50);
const rows = [big, mid, small];
const region = profile.aggregate(rows);

test("aggregate sums numeric fields across divisions", () => {
  assert.equal(region.total_2016, 1600);
  assert.equal(region.renters, 400);
  assert.equal(region.cduid, undefined);
});

test("compare gives division, region and ratio for additive metrics", () => {
  const c = profile.compare(metrics.byId("share_65p"), small, region, 2016);
  assert.equal(c.value, 50);
  assert.equal(c.region, 15.625);
  assert.equal(c.ratio, 3.2);
});

test("compare leaves the region out for medians and rates", () => {
  const c = profile.compare(metrics.byId("household_income"), big, region, 2016);
  assert.equal(c.value, 50000);
  assert.equal(c.region, null);
  assert.equal(c.ratio, null);
});

test("compare against another division includes medians and counts", () => {
  const income = profile.compare(metrics.byId("household_income"), big, { ...mid, householdIncome: 40000 }, 2016, true);
  assert.equal(income.region, 40000);
  assert.equal(income.ratio, 1.25);
  assert.equal(profile.compare(metrics.byId("population"), big, mid, 2016, true).ratio, 2);
});

test("compare skips the region for raw counts", () => {
  const c = profile.compare(metrics.byId("population"), big, region, 2016);
  assert.equal(c.value, 1000);
  assert.equal(c.region, null);
});

test("rank orders divisions by population, largest first", () => {
  assert.equal(profile.rank(rows, big, 2016), 1);
  assert.equal(profile.rank(rows, small, 2016), 3);
});

test("growth indexes population to the first census", () => {
  assert.deepEqual(plain(profile.growth(small)), [
    { year: 2006, index: 100 }, { year: 2011, index: 100 }, { year: 2016, index: 80 },
  ]);
});

test("similar picks the divisions closest in population", () => {
  const extra = row("5", 450, 450, 50, 300, 100);
  assert.deepEqual(plain(profile.similar([...rows, extra], mid, 2016, 2).map((r) => r.cduid)), ["5", "1"]);
});

test("joinRows merges both tables per division and adds its code", () => {
  const rows = profile.joinRows({ 3520: { name: "Toronto", total_2016: 5 } }, { 3520: { landArea: 2 } });
  assert.deepEqual(plain(rows), { 3520: { cduid: "3520", name: "Toronto", total_2016: 5, landArea: 2 } });
});
