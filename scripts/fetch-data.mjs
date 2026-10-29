import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BOUNDARY_ZIP, PROFILE_ZIP, RAW_DIR } from "./paths.mjs";

// StatCan's server rejects scripted downloads, so a byte-identical archive mirror is the fallback.
const MIRROR = "https://data.source.coop/dataforcanada/d4c-datapkg-statistical/archive/statcan";
const BOUNDARY_URL = "https://www12.statcan.gc.ca/census-recensement/2011/geo/bound-limit/files-fichiers/2016/lcd_000b16a_e.zip";

const FILES = [
  {
    // 2016 Census Divisions, cartographic boundary file (92-160-X).
    target: BOUNDARY_ZIP,
    sha256: "fb7da22c9dab3d4c53dedafe6b19fe130bf434b9d119e07dfa20a9e57783c5c7",
    urls: [BOUNDARY_URL, `${MIRROR}/boundaries/2016/lcd_000b16a_e.zip`],
    manual: BOUNDARY_URL,
  },
  {
    // 2016 Census Profile for aggregate dissemination areas (98-401-X2016050), which includes every census division.
    target: PROFILE_ZIP,
    sha256: "81b2ec3321debd8f2f62adf27dc4bdbc2715c661777c1fc45b772152e2c0ca61",
    urls: [`${MIRROR}/census_of_population/2016/98-401-X2016050_eng_CSV.zip`],
    manual: "https://www12.statcan.gc.ca/census-recensement/2016/dp-pd/prof/details/download-telecharger/comp/page_dl-tc.cfm?Lang=E (Aggregate dissemination areas, CSV)",
  },
];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function download(url, expected) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = sha256(buf);
  if (hash !== expected) throw new Error(`checksum mismatch (${hash})`);
  return buf;
}

async function fetchFile({ target, sha256: expected, urls, manual }) {
  if (existsSync(target) && sha256(readFileSync(target)) === expected) {
    console.log(`Already present: ${target}`);
    return;
  }
  for (const url of urls) {
    try {
      writeFileSync(target, await download(url, expected));
      console.log(`Downloaded ${url}`);
      return;
    } catch (err) {
      console.warn(`Could not use ${url}: ${err.message}`);
    }
  }
  throw new Error(`No source worked. Download it in a browser from ${manual} and save it to ${target}`);
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  for (const file of FILES) await fetchFile(file);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
