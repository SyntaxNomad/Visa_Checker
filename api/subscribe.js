/**
 * POST /api/subscribe
 * Creates an unconfirmed subscription and sends a double opt-in email via
 * Brevo. The row only becomes active once /api/confirm is visited, so nobody
 * can sign up an email address they don't control.
 *
 * Writes go through the service-role key server-side — the browser no longer
 * talks to Supabase at all.
 */

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { COUNTRIES } from "../src/data/countries.js";

const COUNTRY_NAMES = new Set(COUNTRIES.map((c) => c.name));

const RESIDENCE_STATUSES = [
  "Permanent Resident",
  "Long-term Visa (work, study, or family)",
  "Short-term / Tourist Visa",
];

const VISA_STATUSES = [
  "Visa-Free",
  "eVisa Available",
  "Visa on Arrival",
  "Visa Required",
  "Entry Banned",
  "Check Details",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

function confirmEmail({ passport, residence, destination, confirmUrl }) {
  const route = residence
    ? `${escapeHtml(passport)} → ${escapeHtml(destination)} (residing in ${escapeHtml(residence)})`
    : `${escapeHtml(passport)} → ${escapeHtml(destination)}`;
  return `
    <div style="font-family:system-ui,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1e293b">
      <h2 style="margin:0 0 4px;font-size:20px">Confirm your visa alerts</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">${route}</p>
      <p style="margin:0 0 24px;font-size:15px">
        Click below to confirm you want email alerts when visa rules change for this route.
        If you didn't request this, ignore this email and nothing will be sent.
      </p>
      <a href="${confirmUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Confirm subscription →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">Sent by VisaIneed because this address was entered at visaneed.app.</p>
    </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, BREVO_API_KEY, FROM_EMAIL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BREVO_API_KEY || !FROM_EMAIL) {
    return res.status(500).json({ error: "Server is not configured for subscriptions." });
  }

  const { email, passport, residence, destination, residenceStatus, currentVisaStatus } =
    req.body || {};

  if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (!COUNTRY_NAMES.has(passport) || !COUNTRY_NAMES.has(destination)) {
    return res.status(400).json({ error: "Invalid passport or destination country." });
  }
  if (residence && !COUNTRY_NAMES.has(residence)) {
    return res.status(400).json({ error: "Invalid residence country." });
  }
  if (residenceStatus && !RESIDENCE_STATUSES.includes(residenceStatus)) {
    return res.status(400).json({ error: "Invalid residence status." });
  }
  const visaStatus = VISA_STATUSES.includes(currentVisaStatus) ? currentVisaStatus : "";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existing, error: selectError } = await supabase
    .from("subscriptions")
    .select("id, confirmed, confirm_token")
    .eq("email", normalizedEmail)
    .eq("passport", passport)
    .eq("destination", destination)
    .eq("residence", residence || "")
    .limit(1);

  if (selectError) {
    console.error("Supabase select error:", selectError);
    return res.status(500).json({ error: "Could not save subscription. Try again later." });
  }

  if (existing?.[0]?.confirmed) {
    return res.status(200).json({ status: "already_subscribed" });
  }

  let confirmToken = existing?.[0]?.confirm_token;

  if (existing?.[0]) {
    if (!confirmToken) {
      confirmToken = randomUUID();
      const { error } = await supabase
        .from("subscriptions")
        .update({ confirm_token: confirmToken })
        .eq("id", existing[0].id);
      if (error) {
        console.error("Supabase update error:", error);
        return res.status(500).json({ error: "Could not save subscription. Try again later." });
      }
    }
  } else {
    confirmToken = randomUUID();
    const { error: insertError } = await supabase.from("subscriptions").insert({
      email: normalizedEmail,
      passport,
      residence: residence || "",
      destination,
      residence_status: residenceStatus || "",
      last_visa_status: visaStatus,
      confirmed: false,
      confirm_token: confirmToken,
    });
    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return res.status(500).json({ error: "Could not save subscription. Try again later." });
    }
  }

  const confirmUrl = `${baseUrl(req)}/api/confirm?token=${confirmToken}`;
  const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
    body: JSON.stringify({
      sender: { name: "VisaIneed", email: FROM_EMAIL },
      to: [{ email: normalizedEmail }],
      subject: `Confirm visa alerts: ${passport} → ${destination}`,
      htmlContent: confirmEmail({ passport, residence, destination, confirmUrl }),
    }),
  });

  if (!brevoRes.ok) {
    const err = await brevoRes.text().catch(() => "");
    console.error("Brevo error:", brevoRes.status, err);
    return res.status(502).json({ error: "Could not send confirmation email. Try again later." });
  }

  return res.status(200).json({ status: "confirmation_sent" });
}
