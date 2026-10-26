import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BOUNDARY_ZIP, RAW_DIR } from "./paths.mjs";

// 2016 Census Divisions, cartographic boundary file (Statistics Canada 92-160-X).
// StatCan's server rejects scripted downloads, so a byte-identical archive mirror is the fallback.
const SOURCES = [
  "https://www12.statcan.gc.ca/census-recensement/2011/geo/bound-limit/files-fichiers/2016/lcd_000b16a_e.zip",
  "https://data.source.coop/dataforcanada/d4c-datapkg-statistical/archive/statcan/boundaries/2016/lcd_000b16a_e.zip",
];
const SHA256 = "fb7da22c9dab3d4c53dedafe6b19fe130bf434b9d119e07dfa20a9e57783c5c7";

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = sha256(buf);
  if (hash !== SHA256) throw new Error(`checksum mismatch (${hash})`);
  return buf;
}

async function main() {
  if (existsSync(BOUNDARY_ZIP) && sha256(readFileSync(BOUNDARY_ZIP)) === SHA256) {
    console.log(`Boundary file already present: ${BOUNDARY_ZIP}`);
    return;
  }
  mkdirSync(RAW_DIR, { recursive: true });
  for (const url of SOURCES) {
    try {
      writeFileSync(BOUNDARY_ZIP, await download(url));
      console.log(`Downloaded ${url}`);
      return;
    } catch (err) {
      console.warn(`Could not use ${url}: ${err.message}`);
    }
  }
  throw new Error(`No source worked. Download lcd_000b16a_e.zip in a browser from ${SOURCES[0]} and save it to ${BOUNDARY_ZIP}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
