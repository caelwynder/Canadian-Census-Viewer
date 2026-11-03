import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { toJsGlobal } from "./js-global.mjs";

function run(...sources) {
  const context = { window: {} };
  vm.createContext(context);
  sources.forEach((src) => vm.runInContext(src, context));
  return JSON.parse(JSON.stringify(context.window));
}

test("exposes the data under window.CENSUS[key] when loaded with a script tag", () => {
  const window = run(toJsGlobal("ageSex2016", { 3520: { total_2016: 2731571 } }));
  assert.deepEqual(window.CENSUS.ageSex2016, { 3520: { total_2016: 2731571 } });
});

test("several data files can be loaded side by side without overwriting each other", () => {
  const window = run(toJsGlobal("boundaries", { type: "FeatureCollection", features: [] }), toJsGlobal("ageSex2016", {}));
  assert.deepEqual(Object.keys(window.CENSUS).sort(), ["ageSex2016", "boundaries"]);
});

test("rejects keys that are not plain identifiers", () => {
  assert.throws(() => toJsGlobal("bad key", {}), /Invalid key/);
});
