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
- **Automation** — GitHub Actions cron job runs daily at 8am UTC, re-checks every confirmed subscribed route and emails users if the visa status changed

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
