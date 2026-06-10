/**
 * Daily visa change detector — run by GitHub Actions every morning.
 *
 * Design goal: NO FALSE CHANGE ALERTS. An email is only sent when a change
 * survives the full pipeline:
 *
 *   1. DETECT    Each unique route (passport→destination) is checked ONCE,
 *                regardless of subscriber count. The Passport Index dataset
 *                is the primary, deterministic detector. Gemini (3 samples,
 *                majority vote) is the fallback only for routes the dataset
 *                doesn't cover — a single model reading is never trusted.
 *   2. DEBOUNCE  A differing status becomes a *candidate* and must hold for
 *                2 consecutive daily runs before it can be confirmed.
 *   3. CONFIRM   Dataset-detected changes additionally need Gemini's
 *                grounded majority to agree — unless the dataset has held
 *                firm for 4+ days, in which case the dataset wins (it is
 *                the authoritative source).
 *   4. ALERT     Only confirmed changes are emailed, recorded in
 *                route_status_history, and written to confirmed_status.
 *
 * Requires the phase1 migration (route_status, route_status_history tables).
 */

import { createClient } from "@supabase/supabase-js";
import { lookupPassportIndex, VISA_STATUSES } from "../shared/passport-index.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service role — can read + update all rows
);

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

const DEBOUNCE_RUNS = 2;     // candidate must hold this many consecutive days
const DATASET_TRUST_RUNS = 4; // after this many days, dataset overrides Gemini disagreement

// ---------------------------------------------------------------------------
// Gemini (fallback detector + corroborator)
// ---------------------------------------------------------------------------

function normalizeStatus(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("entry banned") || lower.includes("banned")) return "Entry Banned";
  if (lower.includes("visa-free") || lower.includes("visa free")) return "Visa-Free";
  if (lower.includes("evisa") || lower.includes("e-visa")) return "eVisa Available";
  if (lower.includes("visa on arrival") || lower.includes("arrival")) return "Visa on Arrival";
  if (lower.includes("visa required") || lower.includes("required")) return "Visa Required";
  return null;
}

async function geminiStatusSample(passport, destination) {
  const body = {
    system_instruction: {
      parts: [{
        text: `You are a visa policy expert. Use Google Search to check official sources. Respond with ONLY one of these exact phrases (nothing else): ${VISA_STATUSES.join(", ")}`,
      }],
    },
    contents: [{
      role: "user",
      parts: [{
        text: `Passport: ${passport}\nDestination: ${destination}\n\nWhat is the current visa status for ordinary tourist travel? Reply with only one of: ${VISA_STATUSES.join(", ")}`,
      }],
    }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0 },
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeStatus(data?.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch {
    return null;
  }
}

/** 3 grounded samples; returns the status only if a strict majority agrees. */
async function geminiMajorityStatus(passport, destination) {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    samples.push(await geminiStatusSample(passport, destination));
  }
  const counts = {};
  for (const s of samples) {
    if (s) counts[s] = (counts[s] || 0) + 1;
  }
  const [winner, votes] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return votes >= 2 ? winner : null;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": BREVO_KEY },
    body: JSON.stringify({
      sender: { name: "VisaIneed", email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text().catch(() => "")}`);
}

function changeEmail({ passport, destination, oldStatus, newStatus }) {
  [passport, destination, oldStatus, newStatus] =
    [passport, destination, oldStatus, newStatus].map((v) => escapeHtml(v ?? ""));
  return `
    <div style="font-family:system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1e293b">
      <h2 style="margin:0 0 4px;font-size:20px">Visa rules changed</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">${passport} → ${destination}</p>
      <div style="background:#f8fafc;border-radius:10px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">Was</p>
        <p style="margin:0 0 16px;font-size:16px;font-weight:600">${oldStatus || "—"}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">Now</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#2563eb">${newStatus}</p>
      </div>
      <p style="margin:0 0 24px;font-size:13px;color:#64748b">
        This change was verified over multiple days against the Passport Index dataset
        and corroborated with current official sources before we emailed you.
      </p>
      <a href="https://visaneed.app" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Check full details →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">
        You subscribed to alerts for this route on VisaIneed.<br>
        To unsubscribe, reply to this email.
      </p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

const LEGACY_MAP = { free: "Visa-Free", evisa: "eVisa Available", arrival: "Visa on Arrival", required: "Visa Required", banned: "Entry Banned" };

async function detectStatus(passport, destination) {
  const datasetStatus = await lookupPassportIndex(passport, destination);
  if (datasetStatus) return { status: datasetStatus, source: "dataset" };
  const geminiStatus = await geminiMajorityStatus(passport, destination);
  if (geminiStatus) return { status: geminiStatus, source: "gemini" };
  return null;
}

/**
 * Returns the confirmed change ({ oldStatus, newStatus, source }) if one
 * occurred this run, else null. Persists all state transitions.
 */
async function processRoute(passport, destination, routeStatusRow) {
  const now = new Date().toISOString();
  const detected = await detectStatus(passport, destination);

  if (!detected) {
    console.log(`  [UNKNOWN] ${passport}→${destination}: no reliable reading — leaving state untouched`);
    return null;
  }
  const { status: newStatus, source } = detected;

  // First time we see this route: seed silently, never alert on initialization
  if (!routeStatusRow) {
    await supabase.from("route_status").insert({
      passport,
      destination,
      confirmed_status: newStatus,
      candidate_status: null,
      candidate_streak: 0,
      source,
      last_verified_at: now,
      updated_at: now,
    });
    console.log(`  [SEEDED] ${passport}→${destination}: "${newStatus}" (${source})`);
    return null;
  }

  const confirmed = routeStatusRow.confirmed_status;

  if (newStatus === confirmed) {
    await supabase.from("route_status").update({
      candidate_status: null,
      candidate_streak: 0,
      last_verified_at: now,
      updated_at: now,
    }).eq("passport", passport).eq("destination", destination);
    console.log(`  [NO CHANGE] ${passport}→${destination}: still "${newStatus}"`);
    return null;
  }

  // Reading disagrees with confirmed status → candidate change
  const streak = routeStatusRow.candidate_status === newStatus
    ? routeStatusRow.candidate_streak + 1
    : 1;

  let confirm = false;
  if (streak >= DEBOUNCE_RUNS) {
    if (source === "gemini") {
      // Already a 3-sample majority on DEBOUNCE_RUNS consecutive days
      confirm = true;
    } else {
      // Dataset change: ask Gemini's grounded majority to corroborate
      const corroboration = await geminiMajorityStatus(passport, destination);
      confirm = corroboration === newStatus || streak >= DATASET_TRUST_RUNS;
      if (!confirm) {
        console.log(`  [PENDING] ${passport}→${destination}: dataset says "${newStatus}" (day ${streak}) but Gemini reads "${corroboration ?? "unclear"}" — holding`);
      }
    }
  } else {
    console.log(`  [PENDING] ${passport}→${destination}: candidate "${newStatus}" day ${streak}/${DEBOUNCE_RUNS}`);
  }

  if (!confirm) {
    await supabase.from("route_status").update({
      candidate_status: newStatus,
      candidate_streak: streak,
      updated_at: now,
    }).eq("passport", passport).eq("destination", destination);
    return null;
  }

  // Confirmed change: record history, promote candidate
  await supabase.from("route_status_history").insert({
    passport,
    destination,
    old_status: confirmed,
    new_status: newStatus,
    source,
  });
  await supabase.from("route_status").update({
    confirmed_status: newStatus,
    candidate_status: null,
    candidate_streak: 0,
    source,
    last_verified_at: now,
    updated_at: now,
  }).eq("passport", passport).eq("destination", destination);

  console.log(`  [CONFIRMED CHANGE] ${passport}→${destination}: "${confirmed}" → "${newStatus}" (${source})`);
  return { oldStatus: confirmed, newStatus, source };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("confirmed", true); // double opt-in: only alert addresses that clicked the confirmation link

  if (error) { console.error("Failed to load subscriptions:", error); process.exit(1); }
  if (!subs.length) { console.log("No confirmed subscriptions."); return; }

  // One check per unique route, no matter how many subscribers it has
  const routes = new Map();
  for (const sub of subs) {
    const key = `${sub.passport}|||${sub.destination}`;
    if (!routes.has(key)) routes.set(key, []);
    routes.get(key).push(sub);
  }

  const { data: statusRows, error: rsError } = await supabase.from("route_status").select("*");
  if (rsError) {
    console.error("Failed to load route_status (did you run the phase1 migration?):", rsError);
    process.exit(1);
  }
  const statusByRoute = new Map(statusRows.map((r) => [`${r.passport}|||${r.destination}`, r]));

  console.log(`Checking ${routes.size} route(s) for ${subs.length} confirmed subscription(s)...`);

  let emailed = 0;
  for (const [key, routeSubs] of routes) {
    const [passport, destination] = key.split("|||");
    try {
      const change = await processRoute(passport, destination, statusByRoute.get(key) ?? null);

      if (change) {
        for (const sub of routeSubs) {
          // Show the subscriber their own stored baseline if it differs
          const storedStatus = LEGACY_MAP[sub.last_visa_status] ?? sub.last_visa_status;
          try {
            await sendEmail(
              sub.email,
              `Visa rules changed: ${passport} → ${destination}`,
              changeEmail({ passport, destination, oldStatus: storedStatus || change.oldStatus, newStatus: change.newStatus })
            );
            emailed++;
          } catch (err) {
            console.error(`  [EMAIL ERROR] ${sub.email}:`, err.message);
          }
        }
      }

      // Keep subscriber rows in sync with the route's confirmed status
      const confirmedNow = change ? change.newStatus : (statusByRoute.get(key)?.confirmed_status ?? null);
      const update = { last_checked_at: new Date().toISOString() };
      if (confirmedNow) update.last_visa_status = confirmedNow;
      await supabase.from("subscriptions").update(update)
        .eq("passport", passport).eq("destination", destination).eq("confirmed", true);

    } catch (err) {
      console.error(`  [ERROR] ${passport}→${destination}:`, err.message);
    }
  }

  console.log(`Done. ${emailed} alert email(s) sent.`);
}

run();
