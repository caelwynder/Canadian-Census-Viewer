import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "code", "data");

export const RAW_DIR = path.join(DATA, "raw");
export const BOUNDARY_ZIP = path.join(RAW_DIR, "lcd_000b16a_e.zip");
export const AGE_SEX_DBF = path.join(DATA, "output", "98-402-X2016002-T1-CD-eng.dbf");

export const BOUNDARIES_OUT = path.join(DATA, "census-boundaries.js");
export const AGE_SEX_OUT = path.join(DATA, "census-age-sex-2016.js");
