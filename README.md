# VisaIneed

Instant visa requirement checker for any passport and destination. Built with React + Vite, powered by Gemini AI with Google Search grounding.

## What it does

- Check visa requirements for any passport → destination combination
- Optionally factor in your country of residence and residency status
- Shows visa status, type, processing time, required documents, and where to apply
- Subscribe to email alerts if visa rules change for a route you care about

## Tech stack

- **Frontend** — React + Vite, deployed on Vercel
- **API** — Vercel serverless functions in `api/` (visa check proxy, subscribe, confirm). All secrets live server-side; the client bundle contains no API keys.
- **AI** — Gemini 2.5 Flash with Google Search grounding for up-to-date results
- **Database** — Supabase (PostgreSQL) for email subscriptions, accessed only via the service-role key in serverless functions and the GitHub Action (RLS locked down, no anon access)
- **Email** — Brevo transactional email API, with double opt-in confirmation before any alerts are sent
- **Automation** — GitHub Actions cron job runs daily at 8am UTC and runs the change-detection pipeline below

## How change detection works (no false alerts)

Visa statuses from an LLM reading live search results vary day to day even when
policy hasn't changed, so alerts are **never** triggered by a single model
reading. The daily job (`scripts/check-subscriptions.mjs`):

1. **Detect** — each unique passport→destination route is checked once
   (not once per subscriber). The Passport Index dataset is the primary,
   deterministic detector; Gemini with Google Search grounding (3 samples,
   majority vote) is the fallback only for routes the dataset doesn't cover.
2. **Debounce** — a status that differs from the confirmed one becomes a
   *candidate* and must hold for 2 consecutive daily runs.
3. **Confirm** — dataset-detected changes additionally need Gemini's grounded
   majority to agree (after 4 days the dataset wins regardless, as the
   authoritative source).
4. **Alert** — only then are subscribers emailed; the change is recorded in
   `route_status_history` and the route's `confirmed_status` is updated.

State lives in the `route_status` table (confirmed status, pending candidate,
candidate streak) created by `supabase/migrations/2026-06-10-phase1-route-status.sql`.

## Local setup

1. Clone the repo
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root (server-side only — none of these are exposed to the browser):
   ```
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   BREVO_API_KEY=your_brevo_api_key
   FROM_EMAIL=your_verified_brevo_sender
   ```
4. Start the dev server (uses `vercel dev` so the `api/` functions run locally alongside Vite):
   ```
   npx vercel dev
   ```
   Plain `npm run dev` still works for UI-only work, but `/api/*` calls will fail without the Vercel dev server.

Set the same variables in the Vercel project settings for production. Optionally set `PUBLIC_URL` (e.g. `https://visaneed.app`) so confirmation-email links always point at the production domain.

> **Migrating from an older deploy?** The old `VITE_GEMINI_API_KEY` shipped in the client bundle and must be treated as compromised — rotate it in Google AI Studio and set the new key as `GEMINI_API_KEY`. Then run `supabase/migrations/2026-06-10-phase0-security.sql` in the Supabase SQL editor and remove the now-unused `VITE_*` variables from Vercel.

## GitHub Actions secrets

The daily subscription checker requires these secrets set in your GitHub repo settings:

| Secret | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `GEMINI_API_KEY` | Gemini API key |
| `BREVO_API_KEY` | Brevo API key for sending emails |
| `FROM_EMAIL` | Verified sender email address in Brevo |

## Supabase table

The `subscriptions` table needs these columns:

| Column | Type |
|---|---|
| `id` | uuid (primary key) |
| `email` | text |
| `passport` | text |
| `residence` | text |
| `destination` | text |
| `residence_status` | text |
| `last_visa_status` | text |
| `last_checked_at` | timestamptz |
| `confirmed` | boolean (default false — set true via double opt-in link) |
| `confirm_token` | uuid |

Run `supabase/migrations/2026-06-10-phase0-security.sql` to add the opt-in columns and lock down row-level security (no anon access; all access goes through the service-role key server-side).
