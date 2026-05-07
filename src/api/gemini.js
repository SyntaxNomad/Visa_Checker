// Cache the passport index CSV in memory for the session
let _passportIndexCache = null;

async function fetchPassportIndex() {
  if (_passportIndexCache) return _passportIndexCache;
  const res = await fetch(
    "https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy.csv"
  );
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

function mapRequirement(req) {
  if (!req) return null;
  if (req === "-1") return "Entry Banned";
  if (req === "visa free" || /^\d+$/.test(req)) return "Visa-Free";
  if (req === "visa on arrival") return "Visa on Arrival";
  if (req === "e-visa") return "eVisa Available";
  if (req === "visa required") return "Visa Required";
  return null;
}

async function lookupPassportIndex(passport, destination) {
  try {
    const map = await fetchPassportIndex();
    // Try exact match first, then common name variants
    const variants = (name) => [
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

const SYSTEM_PROMPT = `You are an expert visa consultant. Your job is to give accurate, up-to-date visa information for international travelers.

The VISA STATUS for this query has been pre-verified from a dataset and will be provided to you. Use it as the default — BUT you MUST search Google first to check for entry bans or travel prohibitions. Entry bans take priority over everything.

STEP 1 — Search Google for "[destination] entry ban [passport] citizens" and "[passport] banned from [destination]". If you find a confirmed entry ban or travel prohibition, use "Entry Banned" regardless of the dataset value.
STEP 2 — If no entry ban is found, use the verified dataset status exactly.
STEP 3 — Search Google for the specific documents, application process, and where to apply.
STEP 4 — Consider residence. If the traveler has a residence country/status, check whether it affects the application process or available options.
STEP 5 — Be CONSISTENT. Every section must agree with the final VISA STATUS.

Possible VISA STATUS values (pick exactly one, use these exact phrases):
- "Entry Banned" — passport holders are explicitly banned or prohibited from entering
- "Visa-Free" — no visa needed, entry is free
- "eVisa Available" — can apply online before travel
- "Visa on Arrival" — visa issued at the border
- "Visa Required" — must apply at an embassy/consulate in advance

Possible VISA STATUS values (pick exactly one, use these exact phrases):
- "Entry Banned" — passport holders are explicitly banned or prohibited from entering
- "Visa-Free" — no visa needed, entry is free
- "eVisa Available" — can apply online before travel
- "Visa on Arrival" — visa issued at the border
- "Visa Required" — must apply at an embassy/consulate in advance

Format your response EXACTLY like this, with no text before the first header:

**VISA STATUS**
[One of the five status phrases above, followed by a brief explanation. If residence unlocks a privilege, state it — e.g. "eVisa Available — as a UK resident, you qualify even with a Sudanese passport."]

**VISA TYPE**
[Specific visa category, where to apply, approximate fee. Write N/A if entry is banned or no visa is needed.]

**PROCESSING TIME**
[Standard and express times. Write N/A if entry is banned or no visa is needed.]

**REQUIRED DOCUMENTS**
[ALWAYS fill this section — never leave it empty or skip it.
- If entry is banned: write "Entry is not permitted — no documents will grant access."
- If visa-free: list the documents still checked at the border (e.g. valid passport with X months remaining, return/onward ticket, proof of accommodation, proof of funds). These are required even without a visa.
- If eVisa/visa on arrival/visa required: list all specific documents needed for the application.]

**WHERE TO APPLY**
[ALWAYS fill this section. Provide: (1) the official government website or online portal URL for the visa application if one exists, and (2) the embassy or consulate responsible for this passport in the residence country (name only, no specific city). If visa-free or entry is banned, state that clearly and explain why this section is N/A.]

**DISCLAIMER**
[One sentence: advise verifying with official government sources as rules change frequently.]`;

export async function callGemini(passport, residence, destination, residenceStatus) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_KEY") {
    throw new Error("VITE_GEMINI_API_KEY is not set. Please add it to your .env file.");
  }

  const verifiedStatus = await lookupPassportIndex(passport, destination);

  const residenceLine = residence
    ? `Country of residence: ${residence}${residenceStatus ? ` (Status: ${residenceStatus})` : ""}`
    : "Country of residence: Not specified";

  const statusLine = verifiedStatus
    ? `VERIFIED VISA STATUS (from trusted dataset — you MUST use this exactly): ${verifiedStatus}`
    : `VISA STATUS: Not available from dataset — search Google to determine the correct status.`;

  const userMessage = `Passport country: ${passport}
${residenceLine}
Destination country: ${destination}

${statusLine}

Now search Google for the specific entry requirements, required documents, and application process for ${passport} citizens traveling to ${destination}. Fill in all sections accurately based on current information.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API.");
  return text;
}
