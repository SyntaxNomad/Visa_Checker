/**
 * GET /api/confirm?token=<uuid>
 * Activates a subscription created by /api/subscribe. Renders a tiny HTML
 * page so the link works straight from the email.
 */

import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — VisaIneed</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b">
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;max-width:420px;text-align:center">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <p style="font-size:15px;color:#64748b;margin:0 0 24px">${body}</p>
    <a href="/" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Back to VisaIneed</a>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).send(page("Something went wrong", "The server is not configured. Please try again later."));
  }

  const token = req.query?.token;
  if (typeof token !== "string" || !UUID_RE.test(token)) {
    return res
      .status(400)
      .send(page("Invalid link", "This confirmation link is invalid or incomplete."));
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ confirmed: true })
    .eq("confirm_token", token)
    .select("passport, destination");

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (error) {
    console.error("Supabase error:", error);
    return res
      .status(500)
      .send(page("Something went wrong", "We couldn't confirm your subscription. Please try again later."));
  }
  if (!data?.length) {
    return res
      .status(404)
      .send(page("Link expired", "This confirmation link is no longer valid. You can re-subscribe from the site."));
  }

  const { passport, destination } = data[0];
  return res
    .status(200)
    .send(
      page(
        "Subscription confirmed ✓",
        `You'll get an email if visa rules change for ${passport} → ${destination}.`
      )
    );
}
