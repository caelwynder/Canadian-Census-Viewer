import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readDbf } from "./lib/dbf.mjs";
import { toAgeSexTable } from "./lib/census-table.mjs";
import { buildBoundaries } from "./lib/boundaries.mjs";
import { checkJoin, checkCanadaTotal } from "./lib/validate.mjs";
import { toJsGlobal } from "./lib/js-global.mjs";
import { AGE_SEX_DBF, AGE_SEX_OUT, BOUNDARIES_OUT, BOUNDARY_ZIP } from "./paths.mjs";

// Canada's official 2016 population. Division counts are randomly rounded to multiples of 5,
// so their sum drifts slightly from this figure.
const CANADA_POPULATION_2016 = 35_151_728;
const ROUNDING_TOLERANCE = 1_000;

const SOURCE_NOTE = {
  boundaries: "// Statistics Canada, 2016 Census Divisions cartographic boundary file (lcd_000b16a_e). Open Government Licence - Canada.\n",
  ageSex: "// Statistics Canada, Age and Sex Highlight Tables, 2016 Census (98-402-X2016002). Open Government Licence - Canada.\n",
};

function requireInput(file, hint) {
  if (!existsSync(file)) throw new Error(`Missing ${file}. ${hint}`);
}

function writeOutput(file, note, key, data) {
  const source = note + toJsGlobal(key, data);
  writeFileSync(file, source);
  console.log(`Wrote ${path.relative(process.cwd(), file)} (${(source.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  requireInput(BOUNDARY_ZIP, "Run npm run data:fetch first.");
  requireInput(AGE_SEX_DBF, "The 98-402-X2016002 table should be committed in code/data/output/.");

  const ageSex = toAgeSexTable(readDbf(readFileSync(AGE_SEX_DBF)));
  const boundaries = await buildBoundaries(BOUNDARY_ZIP);

  const problems = [
    ...checkJoin(boundaries, ageSex),
    ...checkCanadaTotal(ageSex, CANADA_POPULATION_2016, ROUNDING_TOLERANCE),
  ];
  if (problems.length) throw new Error(`Validation failed:\n- ${problems.join("\n- ")}`);

  writeOutput(BOUNDARIES_OUT, SOURCE_NOTE.boundaries, "boundaries", boundaries);
  writeOutput(AGE_SEX_OUT, SOURCE_NOTE.ageSex, "ageSex2016", ageSex);
  console.log(`${boundaries.features.length} census divisions joined; validation passed.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
