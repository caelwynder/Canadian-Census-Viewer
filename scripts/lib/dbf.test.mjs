import { test } from "node:test";
import assert from "node:assert/strict";
import { readDbf } from "./dbf.mjs";

function makeDbf(fields, rows) {
  const recordLength = 1 + fields.reduce((sum, f) => sum + f.length, 0);
  const headerLength = 32 + fields.length * 32 + 1;
  const buf = Buffer.alloc(headerLength + rows.length * recordLength + 1, 0x20);
  buf.fill(0, 0, headerLength);
  buf.writeUInt8(0x03, 0);
  buf.writeUInt32LE(rows.length, 4);
  buf.writeUInt16LE(headerLength, 8);
  buf.writeUInt16LE(recordLength, 10);
  fields.forEach((f, i) => {
    const at = 32 + i * 32;
    buf.write(f.name, at, "latin1");
    buf.write(f.type, at + 11, "latin1");
    buf.writeUInt8(f.length, at + 16);
  });
  buf.writeUInt8(0x0d, headerLength - 1);
  rows.forEach((row, r) => {
    let at = headerLength + r * recordLength + 1;
    fields.forEach((f, i) => {
      const bytes = Buffer.from(String(row[i]), "utf8");
      bytes.copy(buf, at, 0, Math.min(bytes.length, f.length));
      at += f.length;
    });
  });
  buf.writeUInt8(0x1a, buf.length - 1);
  return buf;
}

const FIELDS = [
  { name: "Code", type: "N", length: 4 },
  { name: "Name", type: "C", length: 30 },
  { name: "Total", type: "N", length: 7 },
];

test("reads field names, types and lengths from the header", () => {
  const { fields } = readDbf(makeDbf(FIELDS, []));
  assert.deepEqual(fields, [
    { name: "Code", type: "N", length: 4 },
    { name: "Name", type: "C", length: 30 },
    { name: "Total", type: "N", length: 7 },
  ]);
});

test("returns each record as an array of trimmed strings in column order", () => {
  const { rows } = readDbf(makeDbf(FIELDS, [["3520", "Toronto", "2731571"], ["1001", "Division No.  1", "270350"]]));
  assert.deepEqual(rows, [["3520", "Toronto", "2731571"], ["1001", "Division No.  1", "270350"]]);
});

test("decodes text as UTF-8 so accented names survive", () => {
  const { rows } = readDbf(makeDbf(FIELDS, [["2401", "Les Îles-de-la-Madeleine", "12010"]]));
  assert.equal(rows[0][1], "Les Îles-de-la-Madeleine");
});

test("strips NUL padding inside text fields", () => {
  const buf = makeDbf(FIELDS, [["1001", "Kings", "17160"]]);
  const nameStart = 32 + FIELDS.length * 32 + 1 + 1 + 4;
  buf.fill(0, nameStart + 5, nameStart + 30);
  assert.equal(readDbf(buf).rows[0][1], "Kings");
});

test("skips records flagged as deleted", () => {
  const buf = makeDbf(FIELDS, [["1", "Kept", "1"], ["2", "Gone", "2"]]);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);
  buf.write("*", headerLength + recordLength, "latin1");
  assert.deepEqual(readDbf(buf).rows.map((r) => r[1]), ["Kept"]);
});

test("throws a clear error when the buffer is not a dBASE file", () => {
  assert.throws(() => readDbf(Buffer.from("not a dbf")), /not a valid dBASE file/);
});
