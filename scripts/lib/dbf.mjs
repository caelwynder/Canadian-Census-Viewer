const HEADER_SIZE = 32;
const FIELD_DESCRIPTOR_SIZE = 32;
const HEADER_TERMINATOR = 0x0d;
const DELETED_FLAG = 0x2a;

function readFields(buf, headerLength) {
  const fields = [];
  for (let at = HEADER_SIZE; at < headerLength - 1; at += FIELD_DESCRIPTOR_SIZE) {
    if (buf[at] === HEADER_TERMINATOR) break;
    fields.push({
      name: buf.toString("latin1", at, at + 11).replace(/\0.*$/s, ""),
      type: String.fromCharCode(buf[at + 11]),
      length: buf[at + 16],
    });
  }
  return fields;
}

function readRecord(buf, start, fields) {
  let at = start + 1;
  return fields.map((f) => {
    const value = buf.toString("utf8", at, at + f.length).replace(/\0/g, "").trim();
    at += f.length;
    return value;
  });
}

export function readDbf(buf) {
  if (buf.length < HEADER_SIZE) throw new Error("Input is not a valid dBASE file");
  const recordCount = buf.readUInt32LE(4);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);
  if (buf[headerLength - 1] !== HEADER_TERMINATOR || headerLength + recordCount * recordLength > buf.length) {
    throw new Error("Input is not a valid dBASE file");
  }
  const fields = readFields(buf, headerLength);
  const rows = [];
  for (let i = 0; i < recordCount; i++) {
    const start = headerLength + i * recordLength;
    if (buf[start] === DELETED_FLAG) continue;
    rows.push(readRecord(buf, start, fields));
  }
  return { fields, rows };
}
