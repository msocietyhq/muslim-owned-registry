# muslimowned.sg

A **free public register** of Muslim-owned businesses in Singapore. Families search for catering, venues, trades, and services. Owners list for free so neighbours can find them.

This is **self-attestation**, not a MUIS halal certificate and not SMCCI’s paid “Muslim-Owned Enterprise” programme. Listings go live only after an admin checks the evidence. Visitors can read a public change history. We are not associated with any other Muslim-owned enterprise website or organisation — see [`/disclaimer`](https://muslimowned.sg/disclaimer).

The **code** is Apache-2.0 and meant for [github.com/msocietyhq/muslim-owned-registry](https://github.com/msocietyhq/muslim-owned-registry). Production listings, UEN documents, login emails, and API keys stay **off git**. A clone is not the live register; only [muslimowned.sg](https://muslimowned.sg) is the official instance.

Product decisions: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md). Pull requests to `main` must pass GitHub Actions (lint, types, unit tests, Postgres store tests, production build).

## What it does

### For visitors (no account)

- Home (`/`) with Smart search and a grid of live listings
- Directory (`/browse`) with search and hierarchical tags (for example food → catering)
- Listing pages (`/biz/{slug}`) with photos, description, tags, map pin if any, and public history
- Owner catalogues (`/owner/{slug}`) and tag archives (`/tags/{slug}`)
- Intercepting modal when opening a listing from browse
- Neighbourhood-aware search (“plumber in Tampines”, “near Jurong West”)
- Event planner (`/plan`) that groups live listings by role for an intent such as a birthday gathering
- English, Bahasa Melayu (Singapore), Mandarin, and Tamil (header toggle; brand names and the disclaimer stay untranslated)
- Blog (`/blog`, `/article/{slug}`) written as markdown in git
- Legal: `/why`, `/who-we-are`, `/terms`, `/privacy`, `/disclaimer`
- SEO: unique titles, canonical URLs, JSON-LD `LocalBusiness`, sitemap, robots (`/app` and `/admin` stay `noindex`)

### For owners (passwordless)

- Email OTP and magic link — **no passwords**
- Login email is private; public contact email is what visitors see
- One owner, many businesses
- Terms checkbox before first submit (stored with version)
- Full listing wizard: ACRA name, brand, UEN, tags, optional OSM pin, optional summary and markdown description, optional extra URLs
- UEN document (PDF/image, downloaded within 12 months) **or** LinkedIn / verification URL
- Photos for the listing and optional team photos
- Fast path: `/list-for-free-in-3-minutes`
- Drafts, edit, unpublish, reconfirm when the six-month window is due
- Email when an admin accepts, rejects, or when a confirmation is due
- Magic listing link (`/m/{token}`) for sharing a draft or live page

### For admins (`ADMIN_EMAILS`, first admin `afiq980@gmail.com`)

- Shared queue: verification, overdue reconfirmation, flags
- Review UEN (private signed file URL) and listing snapshot; accept (goes `live`) or reject with reason
- Remove a live listing at any time
- Add a listing on behalf of someone (`/admin/add-for-others`)
- Team page, analytics, and listing stats

### Operational

- Six-month confirmation: miss the window → unpublish + admin task; owner can reconfirm
- Daily job: `npm run job:confirmations` or `POST /api/jobs/confirmations` with `JOBS_SECRET`
- Demo listings can be marked so they never enter the sitemap
- Public history on every create / update / delete of listings, owners, tags, verifications, admins

**Not in scope:** halal certification, paid seals, membership, maps-first food SEO, passwords, Google/Apple login.

## Current infrastructure

| Piece | Where |
| --- | --- |
| App (Next.js 15 App Router, SSR/ISR) | **Railway** service `web`, Southeast Asia (`asia-southeast1`) |
| Database | **Neon** Postgres 18, project `muslimowned.sg` (`little-scene-49442607`), `aws-ap-southeast-1` |
| Auth | **Better Auth** (cookie sessions) + existing OTP / magic-link tables |
| Files (UEN, listing photos) | Postgres `bytea` (`files` table). Neon Object Storage is not used (that product is `us-east-2` only) |
| Mail | Resend (`RESEND_API_KEY`) — empty until you set it on Railway |
| Smart search LLM | DeepSeek (`DEEPSEEK_API_KEY`) — falls back to a keyword matcher if unset |
| Cron | Railway Cron service still to add: `0 9 * * *` → `npm run job:confirmations` |
| Official domain | `muslimowned.sg` (point DNS at Railway when ready) |
| Preview URL | https://web-production-c4ddd.up.railway.app |

Firebase Auth / Firestore / App Hosting are **retired** for this app. A one-shot copy script remains: `npx tsx scripts/migrate-firestore.ts` (uses `firebase login`, never commit a service-account JSON).

Data shape is still Firestore-like JSON: table `documents(collection, id, data jsonb)` plus Better Auth tables (`user`, `session`, `account`, `verification`) and `files`. `src/lib/firebase/admin.ts` is a compatibility wrapper over Neon so listing code did not have to be rewritten query-by-query.

## Code map

```
src/app/            Routes (public, /app owner, /admin, API)
src/lib/auth.ts     Better Auth
src/lib/db/         Drizzle schema, Neon client, JSON document store, files
src/lib/data.ts     Listings / owners / tags (public reads)
src/lib/jobs/       Six-month confirmation scan
content/articles/   Blog markdown
drizzle/            SQL migrations
scripts/            seed, Firestore migrate, confirmation job
.github/workflows/  CI
```

Env template: [`.env.example`](.env.example). Never commit `.env.local`.

Required in production (Railway): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `JOBS_SECRET`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`. To send mail: `RESEND_API_KEY` and `MAIL_FROM`. Optional: `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`. `ALLOW_DEV_OTP` must be `false` in production. Mail From is not hardcoded — set `MAIL_FROM` on the host.

## Local run

Node 20+.

```bash
cp .env.example .env.local
# DATABASE_URL from the Neon console; a long BETTER_AUTH_SECRET
npm install
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With `ALLOW_DEV_OTP=true`, the login page shows the code. Sign in as `afiq980@gmail.com` to use `/admin`.

`USE_PGLITE=1` runs an in-memory Postgres for `npm run test:db` (also used in CI). `npm test` is unit tests; `npm run build` is the production Next compile (standalone output for Railway).

### Articles

Add `content/articles/your-slug.md`:

```yaml
---
title: Your title
description: One or two sentences for search results.
publishedAt: 2026-09-17
businessSlugs:
  - brand-slug-on-the-register
---
```

Link listings as `[Brand name](/biz/brand-slug)`. `/blog` is the index; `/article/your-slug` is the public URL (hourly revalidate).

## License

Apache-2.0. The license is for this **code**, not for the muslimowned.sg domain or other people’s listing data.
