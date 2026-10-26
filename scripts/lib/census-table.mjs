// Statistics Canada 98-402-X2016002 (Age and Sex Highlight Tables, census divisions).
// The .dbf truncates column names to 10 characters, so columns are mapped by position
// and the header is checked first to catch any change in layout.
export const EXPECTED_HEADER = [
  "Geographic", "Geograph_1", "Geograph_2", "Geograph_3", "Geograph_4", "Global_non", "Data_quali", "Sex",
  "Total_(201", "Broad_Age_", "Broad_Ag_1", "Broad_Ag_2", "Broad_Ag_3",
  "Total_(2_1", "Broad_Ag_4", "Broad_Ag_5", "Broad_Ag_6", "Broad_Ag_7",
  "Total_(200", "Broad_Ag_8", "Broad_Ag_9", "Broad_Ag10", "Broad_Ag11",
  "Total_(%_D", "Broad_Ag12", "Broad_Ag13", "Broad_Ag14", "Broad_Ag15",
  "Total_(%_1", "Broad_Ag16", "Broad_Ag17", "Broad_Ag18", "Broad_Ag19",
  "Total_(%_2", "Broad_Ag20", "Broad_Ag21", "Broad_Ag22", "Broad_Ag23",
  "Total_(Per", "Broad_Ag24", "Broad_Ag25", "Broad_Ag26", "Broad_Ag27",
  "Total_(P_1", "Broad_Ag28", "Broad_Ag29", "Broad_Ag30", "Broad_Ag31",
];

export const GROUPS = ["total", "a0_14", "a15_64", "a65p", "a85p"];
export const YEARS = [2016, 2011, 2006];

const FIRST_COUNT_COLUMN = 8;
const SEX_PREFIX = { "Both sexes": "", Male: "m_", Female: "f_" };
const DATA_QUALITY_DIGITS = 5;

export function parseCount(cell) {
  if (!/^-?\d+(\.\d+)?$/.test(cell)) return null;
  return Number(cell);
}

function assertLayout(fields) {
  const names = fields.map((f) => f.name);
  if (names.join("|") !== EXPECTED_HEADER.join("|")) {
    throw new Error(`Unexpected column layout in age-sex table: ${names.join(", ")}`);
  }
}

function countsFor(row, prefix) {
  const counts = {};
  YEARS.forEach((year, y) => {
    GROUPS.forEach((group, g) => {
      counts[`${prefix}${group}_${year}`] = parseCount(row[FIRST_COUNT_COLUMN + y * GROUPS.length + g]);
    });
  });
  return counts;
}

function describe(row) {
  const [, name, typeName, province, pruid, nonResponse, dataQuality] = row;
  return {
    name: name.replace(/\s+/g, " "),
    typeName,
    province,
    pruid,
    nonResponseRate: parseCount(nonResponse),
    dataQualityFlag: dataQuality.padStart(DATA_QUALITY_DIGITS, "0"),
  };
}

export function toAgeSexTable({ fields, rows }) {
  assertLayout(fields);
  const table = {};
  for (const row of rows) {
    const [cduid, , , , , , , sex] = row;
    if (!cduid) continue;
    if (!(sex in SEX_PREFIX)) throw new Error(`Unknown sex value "${sex}" for division ${cduid}`);
    const prefix = SEX_PREFIX[sex];
    table[cduid] = { ...(prefix === "" ? describe(row) : {}), ...table[cduid], ...countsFor(row, prefix) };
  }
  return table;
}
