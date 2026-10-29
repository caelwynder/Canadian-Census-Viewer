import { parseCsvLine } from "./csv.mjs";
import { parseCount } from "./census-table.mjs";

export const PROFILE_FIELDS = [
  { key: "population", memberId: 1, name: "Population, 2016" },
  { key: "density", memberId: 6, name: "Population density per square kilometre" },
  { key: "landArea", memberId: 7, name: "Land area in square kilometres" },
];

// Census-division rows: GEO_LEVEL 2 with a four-digit CDUID. Checked before parsing
// because the file has about 12 million lines.
const CENSUS_DIVISION_LINE = /^2016,"\d{4}","2",/;
const COL = { code: 1, characteristic: 8, member: 9, total: 11 };

export async function extractProfile(lines, fields) {
  const byMember = new Map(fields.map((f) => [f.memberId, f]));
  const profile = {};
  for await (const line of lines) {
    if (!CENSUS_DIVISION_LINE.test(line)) continue;
    const cols = parseCsvLine(line);
    const field = byMember.get(Number(cols[COL.member]));
    if (!field) continue;
    if (cols[COL.characteristic] !== field.name) {
      throw new Error(`Member ${field.memberId} is "${cols[COL.characteristic]}", expected "${field.name}"`);
    }
    const cduid = cols[COL.code];
    profile[cduid] = { ...profile[cduid], [field.key]: parseCount(cols[COL.total]) };
  }
  return profile;
}
