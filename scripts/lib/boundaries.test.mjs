import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { normalizeProperties, buildBoundaries } from "./boundaries.mjs";
import { BOUNDARY_ZIP } from "../paths.mjs";

test("normalizeProperties renames StatCan fields and keeps the English province name", () => {
  const props = normalizeProperties({
    CDUID: "1101",
    CDNAME: "Kings",
    CDTYPE: "CTY",
    PRUID: "11",
    PRNAME: "Prince Edward Island / Île-du-Prince-Édouard",
  });
  assert.deepEqual(props, { cduid: "1101", name: "Kings", type: "CTY", pruid: "11", province: "Prince Edward Island" });
});

test("normalizeProperties collapses repeated spaces in names", () => {
  assert.equal(normalizeProperties({ CDUID: "1001", CDNAME: "Division No.  1", PRNAME: "Newfoundland and Labrador / Terre-Neuve-et-Labrador" }).name, "Division No. 1");
});

test("buildBoundaries produces simplified WGS84 polygons for all 293 divisions", { skip: !existsSync(BOUNDARY_ZIP) && "run npm run data:fetch first" }, async () => {
  const fc = await buildBoundaries(BOUNDARY_ZIP);
  assert.equal(fc.type, "FeatureCollection");
  assert.equal(fc.features.length, 293);
  for (const f of fc.features) {
    assert.match(f.geometry.type, /^(Multi)?Polygon$/);
    assert.deepEqual(Object.keys(f.properties).sort(), ["cduid", "name", "province", "pruid", "type"]);
  }
  const [lon, lat] = fc.features.find((f) => f.properties.cduid === "3520").geometry.coordinates.flat(3).slice(0, 2);
  assert.ok(lon > -80 && lon < -79 && lat > 43.5 && lat < 44, `Toronto vertex ${lon},${lat} should be in WGS84`);
  assert.ok(JSON.stringify(fc).length < 3_000_000, "boundaries should stay under 3 MB");
});
