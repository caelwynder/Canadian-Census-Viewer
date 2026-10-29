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

const text = (segments) => segments.map((s) => s.text).join("");

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

test("compare skips the region for raw counts", () => {
  const c = profile.compare(metrics.byId("population"), big, region, 2016);
  assert.equal(c.value, 1000);
  assert.equal(c.region, null);
});

test("rank orders divisions by population, largest first", () => {
  assert.equal(profile.rank(rows, big, 2016), 1);
  assert.equal(profile.rank(rows, small, 2016), 3);
});

test("summary describes size, growth and age skew in plain language", () => {
  assert.equal(
    text(profile.summary(big, rows, "Ontario", 2016)),
    "It is the largest of 3 census divisions in Ontario, home to 62.5% of its residents. " +
      "It grew 11.1% between 2011 and 2016, compared with +4.9% across Ontario. " +
      "It skews working-age: 80.0% of residents are 15–64, compared with 71.3% across Ontario."
  );
  assert.equal(
    text(profile.summary(small, rows, "Ontario", 2016)),
    "It is the 3rd-largest of 3 census divisions in Ontario, home to 6.3% of its residents. " +
      "It shrank 20.0% between 2011 and 2016, compared with +4.9% across Ontario. " +
      "It skews older: 50.0% of residents are 65+, compared with 15.6% across Ontario."
  );
});

test("summary bolds the figures and drops growth when there is no earlier census", () => {
  const segments = profile.summary(big, rows, "Ontario", 2006);
  assert.ok(segments.some((s) => s.strong && s.text === "largest"));
  assert.doesNotMatch(text(segments), /grew|shrank/);
});

test("summary calls a typical age mix close to the region", () => {
  const even = row("4", 1600, 1600, 210, 1140, 250);
  assert.match(text(profile.summary(even, [even, ...rows], "Canada", 2016)), /age mix is close to the Canada average/);
});

test("ordinal handles teens and other endings", () => {
  assert.deepEqual(plain([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(profile.ordinal)),
    ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "103rd"]);
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
