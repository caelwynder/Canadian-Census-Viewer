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
