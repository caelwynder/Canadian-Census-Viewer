import { test } from "node:test";
import assert from "node:assert/strict";
import { extractProfile, PROFILE_FIELDS } from "./census-profile.mjs";

const row = (code, level, name, member, total) =>
  `2016,"${code}","${level}","Place",3.7,6.2,"00000","${code}","${name}",${member},,${total},...,...`;

const LINES = [
  '"CENSUS_YEAR","GEO_CODE (POR)","GEO_LEVEL"',
  row("10", "1", "Population, 2016", 1, 519716),
  row("1001", "2", "Population, 2016", 1, 270348),
  row("1001", "2", "Population, 2011", 2, 262410),
  row("1001", "2", "Population density per square kilometre", 6, 29.3),
  row("1001", "2", "Land area in square kilometres", 7, 9220.61),
  row("10010001", "3", "Land area in square kilometres", 7, 12.5),
  row("6208", "2", "Land area in square kilometres", 7, "x"),
];

async function* lines(list) {
  yield* list;
}

test("keeps only census-division rows for the requested members", async () => {
  const profile = await extractProfile(lines(LINES), PROFILE_FIELDS);
  assert.deepEqual(Object.keys(profile).sort(), ["1001", "6208"]);
  assert.deepEqual(profile["1001"], { population: 270348, density: 29.3, landArea: 9220.61 });
});

test("stores suppressed values as null", async () => {
  const profile = await extractProfile(lines(LINES), PROFILE_FIELDS);
  assert.equal(profile["6208"].landArea, null);
});

test("fails if a member id no longer has the expected name", async () => {
  const shifted = [row("1001", "2", "Total private dwellings", 7, 131336)];
  await assert.rejects(extractProfile(lines(shifted), PROFILE_FIELDS), /Member 7 is "Total private dwellings", expected "Land area in square kilometres"/);
});
