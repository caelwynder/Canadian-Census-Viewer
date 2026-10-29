import { test } from "node:test";
import assert from "node:assert/strict";
import { checkJoin, checkCanadaTotal, checkProfile } from "./validate.mjs";

const fc = (...ids) => ({ type: "FeatureCollection", features: ids.map((cduid) => ({ properties: { cduid } })) });

test("checkJoin reports nothing when every boundary has metrics and vice versa", () => {
  assert.deepEqual(checkJoin(fc("1001", "3520"), { 1001: {}, 3520: {} }), []);
});

test("checkJoin lists boundaries that have no census row", () => {
  assert.deepEqual(checkJoin(fc("1001", "3520"), { 1001: {} }), ["Boundary 3520 has no census row"]);
});

test("checkJoin lists census rows that have no boundary", () => {
  assert.deepEqual(checkJoin(fc("1001"), { 1001: {}, 9999: {} }), ["Census row 9999 has no boundary"]);
});

test("checkJoin flags duplicate boundary ids", () => {
  assert.deepEqual(checkJoin(fc("1001", "1001"), { 1001: {} }), ["Boundary 1001 appears 2 times"]);
});

test("checkCanadaTotal accepts a sum within the random-rounding tolerance", () => {
  assert.deepEqual(checkCanadaTotal({ a: { total_2016: 600 }, b: { total_2016: 405 } }, 1000, 10), []);
});

test("checkCanadaTotal reports a sum outside the tolerance", () => {
  const problems = checkCanadaTotal({ a: { total_2016: 500 } }, 1000, 10);
  assert.deepEqual(problems, ["Sum of total_2016 is 500, expected 1000 ± 10"]);
});

test("checkCanadaTotal ignores suppressed (null) totals", () => {
  assert.deepEqual(checkCanadaTotal({ a: { total_2016: 1000 }, b: { total_2016: null } }, 1000, 0), []);
});

const ages = { 1001: { total_2016: 270350 } };
const goodProfile = { 1001: { population: 270348, landArea: 9220.61, density: 29.3 } };

test("checkProfile accepts a profile that agrees with the age table", () => {
  assert.deepEqual(checkProfile(goodProfile, ages), []);
});

test("checkProfile reports missing rows and land areas", () => {
  assert.deepEqual(checkProfile({}, ages), ["Census row 1001 has no profile row"]);
  assert.deepEqual(checkProfile({ 1001: { ...goodProfile[1001], landArea: null } }, ages), ["Profile 1001 has no land area"]);
});

test("checkProfile reports a population that differs by more than rounding", () => {
  assert.deepEqual(checkProfile({ 1001: { ...goodProfile[1001], population: 200000 } }, ages), [
    "Profile 1001 population 200000 differs from age table 270350",
    "Profile 1001 density 29.3 does not match 200000 / 9220.61",
  ]);
});

test("checkProfile skips the population check when the age table is suppressed", () => {
  assert.deepEqual(checkProfile(goodProfile, { 1001: { total_2016: null } }), []);
});

test("checkProfile allows for land area being rounded before density is published", () => {
  const toronto = { 3520: { population: 2731571, landArea: 630.2, density: 4334.4 } };
  assert.deepEqual(checkProfile(toronto, { 3520: { total_2016: 2731570 } }), []);
});
