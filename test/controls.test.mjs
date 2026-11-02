import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteScripts, plain } from "./load-site-scripts.mjs";

const { controls } = loadSiteScripts("controls.js");

const feature = (cduid, name, province) => ({ properties: { cduid, name, province } });
const features = [
  feature("3520", "Toronto", "Ontario"),
  feature("1001", "Division No. 1", "Newfoundland and Labrador"),
  feature("4601", "Division No. 1", "Manitoba"),
];

test("searchOptions adds the province only when the region spans several", () => {
  assert.deepEqual(plain(controls.searchOptions(features.slice(0, 1), false)), [{ label: "Toronto", cduid: "3520" }]);
  assert.deepEqual(plain(controls.searchOptions(features, true).map((o) => o.label)), [
    "Division No. 1, Manitoba",
    "Division No. 1, Newfoundland and Labrador",
    "Toronto, Ontario",
  ]);
});

test("matchOption finds an exact label, ignoring case and spacing", () => {
  const options = controls.searchOptions(features, true);
  assert.equal(controls.matchOption(options, "  toronto, ontario ").cduid, "3520");
  assert.equal(controls.matchOption(options, "toronto").cduid, "3520");
  assert.equal(controls.matchOption(options, "Division No. 1"), null);
  assert.equal(controls.matchOption(options, "Atlantis"), null);
});

test("stripEnds labels the low and high ends of the colour strip", () => {
  const format = (n) => n.toLocaleString("en-CA");
  assert.deepEqual(plain(controls.stripEnds([15130, 46200, 139355], format)), { low: "<15,130", high: "139,355+" });
  assert.deepEqual(plain(controls.stripEnds([], format)), { low: "All values", high: "" });
});

test("millions shortens large counts", () => {
  assert.equal(controls.millions(13448494), "13.4 million");
  assert.equal(controls.millions(35874), "35,874");
});
