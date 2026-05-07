/**
 * Daily subscription checker.
 * Run by GitHub Actions every morning.
 * For each subscription: re-checks visa status with Gemini,
 * compares to stored status, emails user if it changed.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service role — can read + update all rows
);

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL; // the email you signed up to Brevo with

async function callGemini(passport, residence, destination, residenceStatus) {
  const residenceLine = residence
    ? `Country of residence: ${residence}${residenceStatus ? ` (Status: ${residenceStatus})` : ""}`
    : "Country of residence: Not specified";

  const body = {
    system_instruction: {
      parts: [{ text: "You are a visa expert. Respond with ONLY one of these exact phrases (nothing else): Visa-Free, eVisa Available, Visa on Arrival, Visa Required, Entry Banned" }],
    },
    contents: [{
      role: "user",
      parts: [{ text: `Passport: ${passport}\n${residenceLine}\nDestination: ${destination}\n\nWhat is the visa status? Reply with only one of: Visa-Free, eVisa Available, Visa on Arrival, Visa Required, Entry Banned` }],
    }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

async function sendEmail(to, subject, html) {
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": BREVO_KEY },
    body: JSON.stringify({
      sender: { name: "VisaIneed", email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
}

function changeEmail({ email, passport, residence, destination, oldStatus, newStatus }) {
  const route = residence ? `${passport} → ${destination} (residing in ${residence})` : `${passport} → ${destination}`;
  return `
    <div style="font-family:system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1e293b">
      <h2 style="margin:0 0 4px;font-size:20px">Visa rules changed</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">${route}</p>
      <div style="background:#f8fafc;border-radius:10px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">Was</p>
        <p style="margin:0 0 16px;font-size:16px;font-weight:600">${oldStatus}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">Now</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#2563eb">${newStatus}</p>
      </div>
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

async function run() {
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*");

  if (error) { console.error("Failed to load subscriptions:", error); process.exit(1); }
  if (!subs.length) { console.log("No subscriptions."); return; }

  console.log(`Checking ${subs.length} subscription(s)...`);

  for (const sub of subs) {
    try {
      const newStatus = await callGemini(sub.passport, sub.residence, sub.destination, sub.residence_status);
      if (!newStatus) { console.log(`  [SKIP] No result for ${sub.email} — ${sub.passport}→${sub.destination}`); continue; }

      const changed = sub.last_visa_status && sub.last_visa_status !== newStatus;

      if (changed) {
        console.log(`  [CHANGED] ${sub.passport}→${sub.destination}: "${sub.last_visa_status}" → "${newStatus}" — emailing ${sub.email}`);
        await sendEmail(
          sub.email,
          `Visa rules changed: ${sub.passport} → ${sub.destination}`,
          changeEmail({ ...sub, oldStatus: sub.last_visa_status, newStatus })
        );
      } else {
        console.log(`  [NO CHANGE] ${sub.passport}→${sub.destination}: still "${newStatus}"`);
      }

      await supabase.from("subscriptions").update({
        last_visa_status: newStatus,
        last_checked_at: new Date().toISOString(),
      }).eq("id", sub.id);

    } catch (err) {
      console.error(`  [ERROR] ${sub.email}:`, err.message);
    }
  }

  console.log("Done.");
}

run();
