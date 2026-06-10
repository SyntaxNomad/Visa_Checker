/**
 * Passport Index dataset lookup — the deterministic source of truth for visa
 * status. Shared by the /api functions (Vercel) and the daily checker
 * (GitHub Actions).
 */

export const VISA_STATUSES = [
  "Entry Banned",
  "Visa-Free",
  "eVisa Available",
  "Visa on Arrival",
  "Visa Required",
];

// Cache the parsed CSV in memory for the lifetime of the process
let _passportIndexCache = null;

export async function fetchPassportIndex() {
  if (_passportIndexCache) return _passportIndexCache;
  const res = await fetch(
    "https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy.csv"
  );
  if (!res.ok) throw new Error(`Passport index fetch failed: ${res.status}`);
  const text = await res.text();
  const map = {};
  for (const line of text.split("\n").slice(1)) {
    const [pass, dest, req] = line.split(",");
    if (!pass || !dest || !req) continue;
    const key = `${pass.trim()}|||${dest.trim()}`;
    map[key] = req.trim();
  }
  _passportIndexCache = map;
  return map;
}

export function mapRequirement(req) {
  if (!req) return null;
  if (req === "-1") return "Entry Banned";
  if (req === "visa free" || /^\d+$/.test(req)) return "Visa-Free";
  if (req === "visa on arrival") return "Visa on Arrival";
  if (req === "e-visa") return "eVisa Available";
  if (req === "visa required") return "Visa Required";
  return null;
}

// Common name variants between our country list and the dataset
function variants(name) {
  return [
    name,
    name.replace("United States", "United States of America"),
    name.replace("United States of America", "United States"),
    name.replace("Russia", "Russian Federation"),
    name.replace("Russian Federation", "Russia"),
    name.replace("South Korea", "Korea, Republic of"),
    name.replace("North Korea", "Korea, Democratic People's Republic of"),
    name.replace("Iran", "Iran, Islamic Republic of"),
    name.replace("Syria", "Syrian Arab Republic"),
    name.replace("Tanzania", "Tanzania, United Republic of"),
    name.replace("Bolivia", "Bolivia, Plurinational State of"),
    name.replace("Venezuela", "Venezuela, Bolivarian Republic of"),
  ];
}

/**
 * Returns one of VISA_STATUSES, or null when the route is not in the dataset
 * (or the dataset is unreachable — callers must treat null as "unknown",
 * never as "changed").
 */
export async function lookupPassportIndex(passport, destination) {
  if (passport === destination) return null; // same country — no visa needed, skip lookup
  try {
    const map = await fetchPassportIndex();
    for (const p of variants(passport)) {
      for (const d of variants(destination)) {
        const req = map[`${p}|||${d}`];
        if (req !== undefined) return mapRequirement(req);
      }
    }
    return null;
  } catch {
    return null;
  }
}
