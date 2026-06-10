/**
 * POST /api/check
 * Server-side visa check: passport-index dataset lookup + Gemini enrichment.
 * The Gemini API key lives only here (GEMINI_API_KEY env var) — never in the
 * client bundle.
 */

import { COUNTRIES } from "../src/data/countries.js";
import { lookupPassportIndex } from "../shared/passport-index.js";

const RESIDENCE_STATUSES = [
  "Permanent Resident",
  "Long-term Visa (work, study, or family)",
  "Short-term / Tourist Visa",
];

const COUNTRY_NAMES = new Set(COUNTRIES.map((c) => c.name));

const SYSTEM_PROMPT = `You are an expert visa consultant. Your job is to give accurate, up-to-date visa information for international travelers.

The VISA STATUS has been verified from a trusted dataset. Use it exactly — it is more reliable than your training data.

STEP 1 — Accept the verified VISA STATUS. Do not second-guess it.
STEP 2 — The only exception: search Google for "[passport] banned from [destination]" — if results confirm a COMPLETE entry ban (no visa of any kind issued), use "Entry Banned" instead. Partial restrictions or advisories are NOT a ban.
STEP 3 — Search Google for the specific documents, application process, and where to apply for this passport/destination pair.
STEP 4 — Consider residence and whether it changes the application process or options available.
STEP 5 — Be CONSISTENT. Every section must agree with the final VISA STATUS.

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is not configured (missing GEMINI_API_KEY)." });
  }

  const { passport, residence, destination, residenceStatus } = req.body || {};

  if (!COUNTRY_NAMES.has(passport) || !COUNTRY_NAMES.has(destination)) {
    return res.status(400).json({ error: "Invalid passport or destination country." });
  }
  if (residence && !COUNTRY_NAMES.has(residence)) {
    return res.status(400).json({ error: "Invalid residence country." });
  }
  if (residenceStatus && !RESIDENCE_STATUSES.includes(residenceStatus)) {
    return res.status(400).json({ error: "Invalid residence status." });
  }

  const verifiedStatus = await lookupPassportIndex(passport, destination);

  const residenceLine = residence
    ? `Country of residence: ${residence}${residenceStatus ? ` (Status: ${residenceStatus})` : ""}`
    : "Country of residence: Not specified";

  const statusLine = verifiedStatus
    ? `VERIFIED VISA STATUS (use this exactly): ${verifiedStatus}`
    : `VISA STATUS: not in dataset — search Google to determine the correct status.`;

  const userMessage = `Passport country: ${passport}
${residenceLine}
Destination country: ${destination}

${statusLine}

Search Google for the documents, application steps, and where to apply for ${passport} citizens traveling to ${destination}. Also check if there is a complete entry ban — if yes, override the status with "Entry Banned".`;

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
    return res
      .status(response.status === 429 ? 429 : 502)
      .json({ error: err?.error?.message || `Upstream API error ${response.status}` });
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return res.status(502).json({ error: "Empty response from Gemini API." });
  }

  return res.status(200).json({ text });
}
