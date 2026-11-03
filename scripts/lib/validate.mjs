export function checkJoin(boundaries, table) {
  const problems = [];
  const seen = new Map();
  for (const f of boundaries.features) {
    const id = f.properties.cduid;
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  for (const [id, n] of seen) {
    if (n > 1) problems.push(`Boundary ${id} appears ${n} times`);
    if (!(id in table)) problems.push(`Boundary ${id} has no census row`);
  }
  for (const id of Object.keys(table)) {
    if (!seen.has(id)) problems.push(`Census row ${id} has no boundary`);
  }
  return problems;
}

export function checkCanadaTotal(table, official, tolerance) {
  const sum = Object.values(table).reduce((acc, row) => acc + (row.total_2016 ?? 0), 0);
  if (Math.abs(sum - official) <= tolerance) return [];
  return [`Sum of total_2016 is ${sum}, expected ${official} ± ${tolerance}`];
}

// Random rounding to a multiple of 5 moves a count by at most 4. Density is published to 0.1,
// computed from a land area that is itself published to 0.01 km².
const COUNT_ROUNDING = 4;
const DENSITY_ROUNDING = 0.05;
const AREA_ROUNDING = 0.005;

function profileProblems(id, profile, row) {
  if (!profile) return [`Census row ${id} has no profile row`];
  if (!(profile.landArea > 0)) return [`Profile ${id} has no land area`];
  const problems = [];
  if (row.total_2016 !== null && Math.abs(profile.population - row.total_2016) > COUNT_ROUNDING) {
    problems.push(`Profile ${id} population ${profile.population} differs from age table ${row.total_2016}`);
  }
  const densityTolerance = DENSITY_ROUNDING + (profile.density * AREA_ROUNDING) / profile.landArea;
  if (profile.density !== null && Math.abs(profile.population / profile.landArea - profile.density) > densityTolerance) {
    problems.push(`Profile ${id} density ${profile.density} does not match ${profile.population} / ${profile.landArea}`);
  }
  return problems;
}

export function checkProfile(profile, table) {
  return Object.entries(table).flatMap(([id, row]) => profileProblems(id, profile[id], row));
}

const PERCENT_MAX = 100;

function shareProblems(id, p, fields) {
  return fields.flatMap((f) => {
    const v = p[f.key];
    if (v === null || v === undefined) return [];
    if (f.rate && (v < 0 || v > PERCENT_MAX)) return [`Profile ${id} ${f.key} ${v} is not a percentage`];
    const total = f.of && p[f.of];
    // Part and total are each randomly rounded, so the part can overshoot by up to twice the rounding.
    if (typeof total === "number" && v > total + 2 * COUNT_ROUNDING) return [`Profile ${id} ${f.key} ${v} exceeds ${f.of} ${total}`];
    return [];
  });
}

export function checkShares(profile, fields) {
  return Object.entries(profile).flatMap(([id, p]) => shareProblems(id, p, fields));
}
