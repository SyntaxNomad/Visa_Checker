# VisaIneed

Instant visa requirement checker for any passport and destination. Built with React + Vite, powered by Gemini AI with Google Search grounding.

## What it does

- Check visa requirements for any passport → destination combination
- Optionally factor in your country of residence and residency status
- Shows visa status, type, processing time, required documents, and where to apply
- Subscribe to email alerts if visa rules change for a route you care about

## Tech stack

- **Frontend** — React + Vite, deployed on Vercel
- **AI** — Gemini 2.5 Flash with Google Search grounding for up-to-date results
- **Database** — Supabase (PostgreSQL) for email subscriptions
- **Email** — Brevo transactional email API
- **Automation** — GitHub Actions cron job runs daily at 8am UTC, re-checks every subscribed route and emails users if the visa status changed

## Local setup

1. Clone the repo
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the dev server:
   ```
   npm run dev
   ```

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
