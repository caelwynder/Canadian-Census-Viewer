import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { BOUNDARIES_OUT, AGE_SEX_OUT, PROFILE_OUT } from "./paths.mjs";

const OUTPUTS = [BOUNDARIES_OUT, AGE_SEX_OUT, PROFILE_OUT];
const built = OUTPUTS.every((file) => existsSync(file));

function loadCensus() {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of OUTPUTS) vm.runInContext(readFileSync(file, "utf8"), context);
  return JSON.parse(JSON.stringify(context.window.CENSUS));
}

test("generated data files load in a browser-like global scope and join one-to-one", { skip: !built && "run npm run data:build first" }, () => {
  const { boundaries, ageSex2016, profile2016 } = loadCensus();
  const ids = boundaries.features.map((f) => f.properties.cduid).sort();
  assert.equal(ids.length, 293);
  assert.deepEqual(ids, Object.keys(ageSex2016).sort());
  assert.deepEqual(ids, Object.keys(profile2016).sort());
});

test("Ontario is a plain filter on the national data", { skip: !built && "run npm run data:build first" }, () => {
  const { boundaries } = loadCensus();
  const ontario = boundaries.features.filter((f) => f.properties.pruid === "35");
  assert.equal(ontario.length, 49);
});

test("Toronto carries population, age and sex counts for all three census years", { skip: !built && "run npm run data:build first" }, () => {
  const toronto = loadCensus().ageSex2016["3520"];
  assert.equal(toronto.name, "Toronto");
  for (const key of ["total_2016", "total_2011", "total_2006", "a65p_2016", "m_total_2016", "f_total_2016"]) {
    assert.equal(typeof toronto[key], "number", key);
  }
  assert.equal(toronto.m_total_2016 + toronto.f_total_2016, toronto.total_2016);
});

test("accented names are stored correctly", { skip: !built && "run npm run data:build first" }, () => {
  const names = Object.values(loadCensus().ageSex2016).map((t) => t.name);
  assert.ok(names.includes("Les Îles-de-la-Madeleine"));
});

test("boundary names decode accents from the Latin-1 shapefile", { skip: !built && "run npm run data:build first" }, () => {
  const names = loadCensus().boundaries.features.map((f) => f.properties.name);
  assert.deepEqual(names.filter((n) => n.includes("\uFFFD")), []);
  assert.ok(names.includes("Montréal"));
});

test("every census division has a positive land area", { skip: !built && "run npm run data:build first" }, () => {
  const { profile2016 } = loadCensus();
  assert.equal(profile2016["3520"].landArea, 630.2);
  for (const [id, p] of Object.entries(profile2016)) assert.ok(p.landArea > 0, id);
});

test("Toronto carries the census profile fields behind the Phase 4 metrics", { skip: !built && "run npm run data:build first" }, () => {
  const toronto = loadCensus().profile2016["3520"];
  assert.equal(toronto.householdIncome, 65829);
  assert.equal(toronto.renters, 525830);
  assert.equal(toronto.transit, 463000);
  assert.equal(toronto.population, undefined, "cross-check fields are not published");
});

test("the Canada row carries StatCan's national figures", { skip: !built && "run npm run data:build first" }, () => {
  const { canada2016 } = loadCensus();
  assert.equal(canada2016.householdIncome, 70336);
  assert.equal(canada2016.unemploymentRate, 7.7);
  assert.equal(canada2016.population, undefined, "cross-check fields are not published");
});

test("profile gaps are limited to the ones StatCan publishes", { skip: !built && "run npm run data:build first" }, () => {
  const rows = Object.entries(loadCensus().profile2016);
  const lowIncomeMissing = rows.filter(([, p]) => p.lowIncomeRate === null).map(([id]) => id);
  assert.ok(lowIncomeMissing.length === 10 && lowIncomeMissing.every((id) => /^6/.test(id)), "LIM-AT is not published for the territories");
  const noImmigrantTotal = rows.filter(([, p]) => !p.immigrantTotal).map(([id]) => id).sort();
  assert.deepEqual(noImmigrantTotal, ["4619", "4622", "4623", "4718", "5945"]);
});
