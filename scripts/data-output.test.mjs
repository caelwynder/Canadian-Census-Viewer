import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { BOUNDARIES_OUT, AGE_SEX_OUT } from "./paths.mjs";

const built = existsSync(BOUNDARIES_OUT) && existsSync(AGE_SEX_OUT);

function loadCensus() {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of [BOUNDARIES_OUT, AGE_SEX_OUT]) vm.runInContext(readFileSync(file, "utf8"), context);
  return JSON.parse(JSON.stringify(context.window.CENSUS));
}

test("generated data files load in a browser-like global scope and join one-to-one", { skip: !built && "run npm run data:build first" }, () => {
  const { boundaries, ageSex2016 } = loadCensus();
  const ids = boundaries.features.map((f) => f.properties.cduid).sort();
  assert.equal(ids.length, 293);
  assert.deepEqual(ids, Object.keys(ageSex2016).sort());
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
