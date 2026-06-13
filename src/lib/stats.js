// Aggregate intelligence computed from the verified Passport Index dataset.
// One pass over ~39k route pairs, cached for the session. Powers the
// Passport Power Simulator and the Global Travel Intelligence Center —
// all real data, no API calls.
import { fetchPassportIndex, mapRequirement, variants } from "../../shared/passport-index.js";
import { COUNTRIES } from "../data/countries";

let _cache = null;
let _reverse = null;

function reverseNameMap() {
  if (_reverse) return _reverse;
  _reverse = new Map();
  for (const c of COUNTRIES) {
    for (const v of variants(c.name)) _reverse.set(v, c.name);
  }
  return _reverse;
}

const EMPTY = () => ({ free: 0, voa: 0, evisa: 0, required: 0, banned: 0 });

const FIELD = {
  "Visa-Free": "free",
  "Visa on Arrival": "voa",
  "eVisa Available": "evisa",
  "Visa Required": "required",
  "Entry Banned": "banned",
};

export async function globalStats() {
  if (_cache) return _cache;
  const map = await fetchPassportIndex();
  const reverse = reverseNameMap();

  const byPassport = new Map();
  const byDestination = new Map();
  const totals = EMPTY();

  for (const key in map) {
    const i = key.indexOf("|||");
    const passRaw = key.slice(0, i);
    const destRaw = key.slice(i + 3);
    if (passRaw === destRaw) continue;
    const status = mapRequirement(map[key]);
    if (!status) continue;
    const field = FIELD[status];
    const pass = reverse.get(passRaw) || passRaw;
    const dest = reverse.get(destRaw) || destRaw;

    if (!byPassport.has(pass)) byPassport.set(pass, EMPTY());
    if (!byDestination.has(dest)) byDestination.set(dest, EMPTY());
    byPassport.get(pass)[field]++;
    byDestination.get(dest)[field]++;
    totals[field]++;
  }

  const passports = [...byPassport.entries()]
    .map(([name, c]) => ({
      name,
      ...c,
      easy: c.free + c.voa + c.evisa,
      total: c.free + c.voa + c.evisa + c.required + c.banned,
    }))
    .sort((a, b) => b.easy - a.easy || b.free - a.free);
  passports.forEach((p, i) => { p.rank = i + 1; });

  const destinations = [...byDestination.entries()]
    .map(([name, c]) => ({
      name,
      ...c,
      open: c.free + c.voa + c.evisa,
      total: c.free + c.voa + c.evisa + c.required + c.banned,
    }));

  _cache = {
    passports,
    passportByName: new Map(passports.map((p) => [p.name, p])),
    destinations,
    welcoming: [...destinations].sort((a, b) => b.open - a.open || b.free - a.free),
    fortress: [...destinations].sort(
      (a, b) => (b.required + b.banned) - (a.required + a.banned) || b.banned - a.banned
    ),
    totals: { ...totals, corridors: Object.values(totals).reduce((a, b) => a + b, 0) },
  };
  return _cache;
}

/**
 * Head-to-head: destinations where `a` has strictly easier access than `b`.
 * "Easier" = higher tier in: Visa-Free > VOA/eVisa > Visa Required > Banned.
 */
export async function passportAdvantages(a, b) {
  const map = await fetchPassportIndex();
  const reverse = reverseNameMap();
  const TIER = { "Visa-Free": 3, "Visa on Arrival": 2, "eVisa Available": 2, "Visa Required": 1, "Entry Banned": 0 };

  const statusFor = (passport) => {
    const out = new Map();
    const selfNames = new Set(variants(passport));
    for (const key in map) {
      const i = key.indexOf("|||");
      if (!selfNames.has(key.slice(0, i))) continue;
      const destRaw = key.slice(i + 3);
      if (selfNames.has(destRaw)) continue;
      const status = mapRequirement(map[key]);
      if (!status) continue;
      out.set(reverse.get(destRaw) || destRaw, status);
    }
    return out;
  };

  const sa = statusFor(a);
  const sb = statusFor(b);
  const wins = [];
  for (const [dest, statA] of sa) {
    const statB = sb.get(dest);
    if (statB === undefined) continue;
    if (TIER[statA] > TIER[statB]) wins.push({ dest, a: statA, b: statB });
  }
  wins.sort((x, y) => (TIER[y.a] - TIER[y.b]) - (TIER[x.a] - TIER[x.b]) || x.dest.localeCompare(y.dest));
  return wins;
}
