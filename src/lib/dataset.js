// Client-side access to the verified Passport Index dataset.
// Reuses the exact same lookup logic as the server (shared/passport-index.js),
// so the instant preview can never disagree with the full check.
import { fetchPassportIndex, mapRequirement, variants } from "../../shared/passport-index.js";
import { COUNTRIES } from "../data/countries";

export { lookupPassportIndex } from "../../shared/passport-index.js";

let _reverse = null;
function reverseNameMap() {
  if (_reverse) return _reverse;
  _reverse = new Map();
  for (const c of COUNTRIES) {
    for (const v of variants(c.name)) _reverse.set(v, c.name);
  }
  return _reverse;
}

export const GROUP_ORDER = ["Visa-Free", "Visa on Arrival", "eVisa Available", "Visa Required", "Entry Banned"];

/**
 * Everywhere a passport can go, grouped by visa status.
 * Returns { "Visa-Free": [{ name, mappable }], ... } sorted alphabetically.
 * `mappable` is false for dataset country names we can't map back to our
 * own country list (they display fine but can't be one-click checked).
 */
export async function passportSummary(passportName) {
  const map = await fetchPassportIndex();
  const selfNames = new Set(variants(passportName));
  const reverse = reverseNameMap();
  const groups = Object.fromEntries(GROUP_ORDER.map((g) => [g, []]));
  const seen = new Set();

  for (const key in map) {
    const i = key.indexOf("|||");
    const pass = key.slice(0, i);
    const dest = key.slice(i + 3);
    if (!selfNames.has(pass) || selfNames.has(dest)) continue;
    const status = mapRequirement(map[key]);
    if (!status) continue;
    const ourName = reverse.get(dest) || null;
    const display = ourName || dest;
    if (seen.has(display)) continue;
    seen.add(display);
    groups[status].push({ name: display, mappable: Boolean(ourName) });
  }

  for (const g of GROUP_ORDER) {
    groups[g].sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
}
