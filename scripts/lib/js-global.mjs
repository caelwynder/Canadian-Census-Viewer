// Data ships as plain scripts (not JSON) so the site still works when opened from disk,
// where browsers block fetch() of local files.
export function toJsGlobal(key, data) {
  if (!/^[A-Za-z_$][\w$]*$/.test(key)) throw new Error(`Invalid key "${key}"`);
  return `window.CENSUS = window.CENSUS || {};\nwindow.CENSUS.${key} = ${JSON.stringify(data)};\n`;
}
