import { parseCsvLine } from "./csv.mjs";
import { parseCount } from "./census-table.mjs";

// `of` names the total a count is a share of; `rate` marks values StatCan publishes as a percentage.
// `checkOnly` fields cross-check other tables and are not published.
export const PROFILE_FIELDS = [
  { key: "population", memberId: 1, name: "Population, 2016", checkOnly: true },
  { key: "density", memberId: 6, name: "Population density per square kilometre", checkOnly: true },
  { key: "landArea", memberId: 7, name: "Land area in square kilometres" },
  { key: "medianAge", memberId: 40, name: "Median age of the population" },
  { key: "officialLanguageTotal", memberId: 100, name: "Total - Knowledge of official languages for the total population excluding institutional residents - 100% data" },
  { key: "bilingual", memberId: 103, name: "English and French", of: "officialLanguageTotal" },
  { key: "motherTongueTotal", memberId: 112, name: "Total - Mother tongue for the total population excluding institutional residents - 100% data" },
  { key: "motherTongueEnglish", memberId: 115, name: "English", of: "motherTongueTotal" },
  { key: "motherTongueFrench", memberId: 116, name: "French", of: "motherTongueTotal" },
  { key: "householdIncome", memberId: 742, name: "Median total income of households in 2015 ($)" },
  { key: "lowIncomeRate", memberId: 857, name: "Prevalence of low income based on the Low-income measure, after tax (LIM-AT) (%)", rate: true },
  { key: "immigrantTotal", memberId: 1140, name: "Total - Immigrant status and period of immigration for the population in private households - 25% sample data" },
  { key: "immigrants", memberId: 1142, name: "Immigrants", of: "immigrantTotal" },
  { key: "indigenousTotal", memberId: 1289, name: "Total - Aboriginal identity for the population in private households - 25% sample data" },
  { key: "indigenous", memberId: 1290, name: "Aboriginal identity", of: "indigenousTotal" },
  { key: "visibleMinorityTotal", memberId: 1323, name: "Total - Visible minority for the population in private households - 25% sample data" },
  { key: "visibleMinority", memberId: 1324, name: "Total visible minority population", of: "visibleMinorityTotal" },
  { key: "tenureTotal", memberId: 1617, name: "Total - Private households by tenure - 25% sample data" },
  { key: "renters", memberId: 1619, name: "Renter", of: "tenureTotal" },
  { key: "shelterCostTotal", memberId: 1667, name: "Total -  Owner and tenant households with household total income greater than zero, in non-farm, non-reserve private dwellings by shelter-cost-to-income ratio - 25% sample data" },
  { key: "shelterCost30", memberId: 1669, name: "Spending 30% or more of income on shelter costs", of: "shelterCostTotal" },
  { key: "ownerShelterCost", memberId: 1674, name: "Median monthly shelter costs for owned dwellings ($)" },
  { key: "renterShelterCost", memberId: 1681, name: "Median monthly shelter costs for rented dwellings ($)" },
  { key: "educationTotal", memberId: 1698, name: "Total - Highest certificate, diploma or degree for the population aged 25 to 64 years in private households - 25% sample data" },
  { key: "bachelorPlus", memberId: 1707, name: "University certificate, diploma or degree at bachelor level or above", of: "educationTotal" },
  { key: "participationRate", memberId: 1870, name: "Participation rate", rate: true },
  { key: "unemploymentRate", memberId: 1872, name: "Unemployment rate", rate: true },
  { key: "commuteTotal", memberId: 1930, name: "Total - Main mode of commuting for the employed labour force aged 15 years and over in private households with a usual place of work or no fixed workplace address - 25% sample data" },
  { key: "transit", memberId: 1933, name: "Public transit", of: "commuteTotal" },
  { key: "walked", memberId: 1934, name: "Walked", of: "commuteTotal" },
  { key: "bicycle", memberId: 1935, name: "Bicycle", of: "commuteTotal" },
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

export function publishedProfile(profile, fields) {
  const keys = fields.filter((f) => !f.checkOnly).map((f) => f.key);
  return Object.fromEntries(
    Object.entries(profile).map(([id, p]) => [id, Object.fromEntries(keys.filter((k) => k in p).map((k) => [k, p[k]]))])
  );
}
