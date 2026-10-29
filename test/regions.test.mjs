import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { loadSiteScripts } from "./load-site-scripts.mjs";
import { BOUNDARIES_OUT } from "../scripts/paths.mjs";

const { regions } = loadSiteScripts("regions.js");

const feature = (cduid, pruid) => ({ type: "Feature", properties: { cduid, pruid }, geometry: null });
const fc = { type: "FeatureCollection", features: [feature("3520", "35"), feature("2466", "24")] };

test("fromSearch reads the region from the query string", () => {
  assert.equal(regions.fromSearch("?region=ontario").id, "ontario");
  assert.equal(regions.fromSearch("?region=canada").id, "canada");
});

test("fromSearch falls back to Canada for a missing or unknown region", () => {
  assert.equal(regions.fromSearch("").id, "canada");
  assert.equal(regions.fromSearch("?region=atlantis").id, "canada");
});

test("every province and territory is a region", () => {
  assert.equal(regions.list.length, 14);
  assert.equal(regions.fromSearch("?region=quebec").pruids[0], "24");
  assert.equal(regions.fromSearch("?region=british-columbia").title, "British Columbia");
  assert.equal(regions.fromSearch("?region=quebec").people, "people in Quebec");
  assert.equal(regions.fromSearch("?region=ontario").people, "Ontarians");
});

test("Quebec keeps only features in province 24", () => {
  const ids = regions.select(fc, regions.fromSearch("?region=quebec")).features.map((f) => f.properties.cduid);
  assert.deepEqual(ids, ["2466"]);
});

test("Ontario keeps only features in province 35", () => {
  const ids = regions.select(fc, regions.fromSearch("?region=ontario")).features.map((f) => f.properties.cduid);
  assert.deepEqual(ids, ["3520"]);
});

test("Canada keeps every feature without changing the input", () => {
  const selected = regions.select(fc, regions.fromSearch("?region=canada"));
  assert.equal(selected.features.length, 2);
  assert.notEqual(selected, fc);
});

test("Ontario selects 49 divisions from the real boundary file", { skip: !existsSync(BOUNDARIES_OUT) && "run npm run data:build first" }, () => {
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(readFileSync(BOUNDARIES_OUT, "utf8"), context);
  assert.equal(regions.select(context.CENSUS.boundaries, regions.fromSearch("?region=ontario")).features.length, 49);
});
