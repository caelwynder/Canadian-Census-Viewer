import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsvLine } from "./csv.mjs";

test("splits plain and quoted fields", () => {
  assert.deepEqual(parseCsvLine('2016,"1001","Division No. 1",3.7'), ["2016", "1001", "Division No. 1", "3.7"]);
});

test("keeps commas inside quotes", () => {
  assert.deepEqual(parseCsvLine('"Population, 2016",1'), ["Population, 2016", "1"]);
});

test("unescapes doubled quotes", () => {
  assert.deepEqual(parseCsvLine('"say ""hi""",x'), ['say "hi"', "x"]);
});

test("keeps empty fields", () => {
  assert.deepEqual(parseCsvLine("a,,c,"), ["a", "", "c", ""]);
});
