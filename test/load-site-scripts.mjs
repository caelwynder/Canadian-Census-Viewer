import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SITE_JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "code", "js");

export function loadSiteScripts(...names) {
  const context = vm.createContext({ Intl, URLSearchParams });
  context.window = context;
  for (const name of names) {
    const file = path.join(SITE_JS, name);
    vm.runInContext(readFileSync(file, "utf8"), context, { filename: file });
  }
  return context.CensusViewer;
}

export const plain = (value) => JSON.parse(JSON.stringify(value));
