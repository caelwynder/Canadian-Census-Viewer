import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPECTED_HEADER, GROUPS, YEARS, parseCount, toAgeSexTable } from "./census-table.mjs";

const fields = EXPECTED_HEADER.map((name) => ({ name, type: "C", length: 10 }));

function row({ code = "3520", name = "Toronto", sex = "Both sexes", counts = {} } = {}) {
  const base = [code, name, "City", "Ontario", "35", "4.5", "0", sex];
  const countCells = YEARS.flatMap((year) => GROUPS.map((g) => counts[`${g}_${year}`] ?? "100"));
  const derivedCells = Array(EXPECTED_HEADER.length - base.length - countCells.length).fill("1.0");
  return [...base, ...countCells, ...derivedCells];
}

test("parseCount turns numeric strings into numbers", () => {
  assert.equal(parseCount("2731571"), 2731571);
  assert.equal(parseCount("0"), 0);
});

test("parseCount returns null for blank or suppressed cells instead of zero", () => {
  assert.equal(parseCount(""), null);
  assert.equal(parseCount(".."), null);
  assert.equal(parseCount("x"), null);
});

test("maps the 2016, 2011 and 2006 count columns to named fields", () => {
  const table = toAgeSexTable({
    fields,
    rows: [row({ counts: { total_2016: "2731571", a65p_2016: "426945", total_2011: "2615060", a0_14_2006: "430000" } })],
  });
  const t = table["3520"];
  assert.equal(t.total_2016, 2731571);
  assert.equal(t.a65p_2016, 426945);
  assert.equal(t.total_2011, 2615060);
  assert.equal(t.a0_14_2006, 430000);
});

test("keeps descriptive fields for each division", () => {
  const t = toAgeSexTable({ fields, rows: [row()] })["3520"];
  assert.equal(t.name, "Toronto");
  assert.equal(t.typeName, "City");
  assert.equal(t.province, "Ontario");
  assert.equal(t.pruid, "35");
  assert.equal(t.nonResponseRate, 4.5);
  assert.equal(t.dataQualityFlag, "00000");
});

test("merges male and female rows under m_ and f_ prefixes", () => {
  const t = toAgeSexTable({
    fields,
    rows: [
      row({ counts: { total_2016: "300" } }),
      row({ sex: "Male", counts: { total_2016: "140" } }),
      row({ sex: "Female", counts: { total_2016: "160" } }),
    ],
  })["3520"];
  assert.equal(t.total_2016, 300);
  assert.equal(t.m_total_2016, 140);
  assert.equal(t.f_total_2016, 160);
});

test("stores suppressed counts as null", () => {
  const t = toAgeSexTable({ fields, rows: [row({ counts: { total_2006: "" } })] })["3520"];
  assert.equal(t.total_2006, null);
});

test("skips blank trailer rows that have no geographic code", () => {
  const table = toAgeSexTable({ fields, rows: [row(), row({ code: "", name: "", sex: "" })] });
  assert.deepEqual(Object.keys(table), ["3520"]);
});

test("rejects a table whose columns are not in the expected order", () => {
  const shuffled = [...fields];
  [shuffled[8], shuffled[9]] = [shuffled[9], shuffled[8]];
  assert.throws(() => toAgeSexTable({ fields: shuffled, rows: [] }), /Unexpected column layout/);
});

test("rejects an unknown sex value rather than silently dropping it", () => {
  assert.throws(() => toAgeSexTable({ fields, rows: [row({ sex: "Unknown" })] }), /Unknown sex value "Unknown"/);
});
