// Country code → world region, for Explorer filtering and trip analysis.
const REGION_CODES = {
  Europe: "AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA",
  Asia: "AF AM AZ BD BT BN KH CN GE HK IN ID JP KZ KG LA MO MY MV MN MM NP KP KR PK PH SG LK TJ TH TL TM UZ VN",
  "Middle East": "BH IQ IR IL JO KW LB OM PS QA SA SY TR AE YE",
  Africa: "DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW",
  Americas: "AG AR BS BB BZ BO BR CA CL CO CR CU DM DO EC SV GD GT GY HT HN JM MX NI PA PY PE KN LC VC SR TT US UY VE",
  Oceania: "AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU",
};

const CODE_TO_REGION = new Map();
for (const [region, codes] of Object.entries(REGION_CODES)) {
  for (const code of codes.split(" ")) CODE_TO_REGION.set(code, region);
}

export const REGIONS = Object.keys(REGION_CODES);

export function regionOfCode(code) {
  return CODE_TO_REGION.get(code) || null;
}
