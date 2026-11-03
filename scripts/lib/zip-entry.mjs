import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { createInflateRaw } from "node:zlib";

const EOCD_SIGNATURE = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const MAX_EOCD_SIZE = 22 + 0xffff;
const STORED = 0;
const DEFLATED = 8;

async function readAt(fh, length, position) {
  const buf = Buffer.alloc(length);
  await fh.read(buf, 0, length, position);
  return buf;
}

async function findEntry(fh, zipPath, suffix) {
  const { size } = await fh.stat();
  const tailLength = Math.min(size, MAX_EOCD_SIZE);
  const tail = await readAt(fh, tailLength, size - tailLength);
  const eocd = tail.lastIndexOf(EOCD_SIGNATURE);
  if (eocd < 0) throw new Error(`${zipPath} is not a zip file`);

  const count = tail.readUInt16LE(eocd + 10);
  const directory = await readAt(fh, tail.readUInt32LE(eocd + 12), tail.readUInt32LE(eocd + 16));
  let at = 0;
  for (let i = 0; i < count; i++) {
    const nameLength = directory.readUInt16LE(at + 28);
    const name = directory.toString("utf8", at + 46, at + 46 + nameLength);
    if (name.endsWith(suffix)) {
      return { method: directory.readUInt16LE(at + 10), size: directory.readUInt32LE(at + 20), offset: directory.readUInt32LE(at + 42) };
    }
    at += 46 + nameLength + directory.readUInt16LE(at + 30) + directory.readUInt16LE(at + 32);
  }
  throw new Error(`No entry ending in "${suffix}" in ${zipPath}`);
}

export async function openZipEntry(zipPath, suffix) {
  const fh = await open(zipPath);
  let entry, start;
  try {
    entry = await findEntry(fh, zipPath, suffix);
    const local = await readAt(fh, 30, entry.offset);
    start = entry.offset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
  } finally {
    await fh.close();
  }
  if (entry.method !== STORED && entry.method !== DEFLATED) throw new Error(`Unsupported compression method ${entry.method}`);

  const raw = createReadStream(zipPath, { start, end: start + entry.size - 1 });
  if (entry.method === STORED) return raw;
  const inflate = createInflateRaw();
  raw.on("error", (err) => inflate.destroy(err));
  return raw.pipe(inflate);
}
