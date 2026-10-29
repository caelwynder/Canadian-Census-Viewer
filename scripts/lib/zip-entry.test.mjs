import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { text } from "node:stream/consumers";
import { openZipEntry } from "./zip-entry.mjs";

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data, stored } of entries) {
    const nameBuf = Buffer.from(name);
    const body = stored ? Buffer.from(data) : deflateRawSync(Buffer.from(data));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, body);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

function writeTemp(buf) {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "zip-entry-")), "test.zip");
  writeFileSync(file, buf);
  return file;
}

const zip = writeTemp(makeZip([
  { name: "README.txt", data: "readme" },
  { name: "folder/table_CSV_data.csv", data: "a,b\n1,2\n" },
  { name: "plain.txt", data: "stored bytes", stored: true },
]));

test("streams a deflated entry found by name suffix", async () => {
  assert.equal(await text(await openZipEntry(zip, "CSV_data.csv")), "a,b\n1,2\n");
});

test("streams a stored entry", async () => {
  assert.equal(await text(await openZipEntry(zip, "plain.txt")), "stored bytes");
});

test("throws when no entry matches", async () => {
  await assert.rejects(openZipEntry(zip, "missing.csv"), /No entry ending in "missing.csv"/);
});

test("throws for a file that is not a zip", async () => {
  await assert.rejects(openZipEntry(writeTemp(Buffer.from("not a zip")), "x"), /is not a zip file/);
});
