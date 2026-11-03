import mapshaper from "mapshaper";

// 1.5% of vertices keeps coastlines readable at Ontario/GTA zoom while the
// national file stays around 1.3 MB.
const SIMPLIFY = "1.5%";
const PRECISION = 0.0001;

export function normalizeProperties({ CDUID, CDNAME, CDTYPE, PRUID, PRNAME }) {
  return {
    cduid: CDUID,
    name: CDNAME.replace(/\s+/g, " ").trim(),
    type: CDTYPE,
    pruid: PRUID,
    province: PRNAME.split(" / ")[0],
  };
}

export async function buildBoundaries(sourcePath) {
  const commands = [
    `-i "${sourcePath}" encoding=latin1`,
    "-proj wgs84",
    `-simplify ${SIMPLIFY} weighted keep-shapes`,
    `-o format=geojson precision=${PRECISION} out.json`,
  ].join(" ");
  const output = await mapshaper.applyCommands(commands);
  const fc = JSON.parse(output["out.json"]);
  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => ({ type: "Feature", properties: normalizeProperties(f.properties), geometry: f.geometry })),
  };
}
