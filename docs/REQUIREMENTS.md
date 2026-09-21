# muslimowned.sg — v1 requirements

**Status:** decisions locked 17 Sep 2026; implementation in this folder; open-source + PR CI locked 17 Sep 2026.  
**Working folder:** `muslimowned-sg/` (git root you will push as a **public GitHub** repo)

This document extracts the MSOCIETY chat, your build constraints, and a scan of existing Singapore directories so the first version is a **public self-attested register**, not a copy of SMCCI’s paid certification site or a halal food map.

The **source code is open source**. Production listings, UEN documents, login emails, and Firebase secrets are **not**. See §17–§19.

---

## 0. Do this before any deploy

You pasted a Resend API key and a DeepSeek API key in chat. Treat both as **compromised**.

1. Rotate them at the provider.
2. Put replacements only in `.env.local` / Firebase Functions secrets.
3. Never commit keys. `.gitignore` will cover `.env*`.

This requirements file does not contain those values.

---

## 1. Idea extracted from the conversation

### What the group actually agreed

- Build an **open, non-commercial** database of Muslim-owned businesses in Singapore.
- **Self-attestation**, not MUIS and not a paid chamber seal. Being “Muslim-owned” is not a regulated claim like halal certification.
- Make false claims embarrassing/costly (identity friction + public history), not legally certified.
- Domain already held: **muslimowned.sg**.
- Mo will not monetise it (name is already close to an existing site).
- Aziz: keep it open source. That means the **code** on GitHub, not dumping private evidence or the live Firestore into git.
- Named maintainer is required after launch; “open source and hope” is not a moderation plan. GitHub contributors are **not** listing admins unless separately granted.
- First admin: **afiq980@gmail.com**.

### Verification (from chat + your later spec)

| Signal | Role in v1 |
| --- | --- |
| Owner email OTP / magic link | Account. Not proof of faith. |
| Self-attestation + legal consent | Required before a listing is submitted. |
| UEN document, downloaded within 1 year | Primary evidence for makcik/pakcik and everyone else. Admin checks it. |
| LinkedIn (optional, later) | Schema supports `verification_url`. Not required to go live in v1 unless you say otherwise. |
| Community vouching | Out of v1 unless you want it. Chat liked it; your spec did not require it. |
| Admin accept | Listing is **not public** until an admin completes the verification task. Owner is emailed when live. |
| 6-month reconfirmation | Email the owner; if ignored, listing is flagged / queued as an admin task. Fights stale spam because there is no annual fee. |
| Public change history | Every mutate writes a `*_history` record. Visitors can self-assess suspicious edits. |
| Admin removal | Any admin, any reason, or no reason. |

### Explicit non-goals (chat + landscape)

- Not a halal authority. Not Shariah compliance theatre.
- Not MOE 2.0, not SMCCI membership, not a certificate or decal.
- Not blockchain.
- Not responsible for third parties who crawl and republish.

---

## 2. Singapore context — do not look or sound like these

Fetched 17 Sep 2026.

### [muslimownedsg.com](https://www.muslimownedsg.com/) — highest copycat risk

Operated by **SMCCI / SMCCI Enterprise Pte. Ltd.** as **Muslim-Owned Enterprise (MOE 2.0)**.

- Paid certification (~S$819.85 new / S$619.85 renewal).
- Must be SMCCI ordinary member.
- Must be ≥51% Muslim-owned, ACRA registered; F&B needs NEA/SFA licence.
- Outputs: e-certificate, storefront decal, directory listing, social features, PAssion Card merchants, GeBiz/tender framing.
- Copy: “certified”, “enhanced certification”, “adhering to Shariah law”, success stories, chamber contact at 15 Jalan Pinang.

**We must not use:** Muslim-Owned Enterprise, MOE, “certified”, gold seals, decals, membership, training, Shariah-compliance claims, chamber photography, “join our network / thrive” marketing.

The domain **muslimowned.sg** is already adjacent to **muslimownedsg.com**. That is why the homepage needs an obvious disclaimer (image + legal text). Product **voice** and **UI** have to do the rest: this is a **register of claims**, not a chamber programme.

### [Humble Halal](https://www.humblehalal.com/)

Food / hawker / wedding discovery. MUIS Certified vs Muslim-owned vs self-declared badges, maps, confidence scores, prayer spaces.

**We must not use:** maps-first food SEO, cuisine guides, wedding-planner hub, “halal-confidence” scores, or looking like a restaurant app.

### MUIS / HalalSG

The actual halal certifier. If we ever mention halal, it is a link out, never a badge we issue.

### [SMCCI members directory](https://smcci.org.sg/membership-directory/)

Chamber list with an MOE column. We are not a members’ club.

### Existing MSOCIETY concept repo

[github.com/msocietyhq/muslim-owned-registry](https://github.com/msocietyhq/muslim-owned-registry) (concept + UEN PRD). Stack there was git-tracked JSON/CSV and Next.js + Supabase. **Your instruction overrides that stack: Firebase for hosting, functions, auth, and data.** This folder is a new app root you can push as its own repo.

---

## 3. Product positioning (recommended)

**One sentence:** A free public register where a business owner attests that a Singapore-registered business is Muslim-owned, shows the evidence they offered, and publishes a change log.

**Tone:** Warm, neighbourly, and practical. Full sentences. Talk about how listing helps families find owners and how listing helps owners be found. Legal independence copy lives in the footer image and on `/disclaimer`, not in every hero.

**Working brand (pending your decision):**

- Domain: `muslimowned.sg`
- Do not brand as “Muslim-Owned Enterprise”
- Prefer “the register” / “public listings” / a distinct wordmark (see questions)

**Homepage disclaimer (image + identical text on `/disclaimer`):**

> We are not associated with any other Muslim-owned enterprise websites or organisation.

Image lives in the site footer. Legal force still requires HTML text on `/disclaimer` (images-only disclaimers fail in disputes). The homepage should lead with search for visitors, not a wall of disclaimers. Owner benefits live on `/why`.

**Language:** Public chrome and marketing copy ship in English and Bahasa Melayu (Singapore). Mandarin Chinese and Tamil are offered from the same header toggle (**EN | BM | 中文 | தமிழ்**). Those two languages auto-translate page chrome, listings, tags, stories, and terms from English through Google Translate at request time. Brand names, registered company names, UEN, and the footer disclaimer sentence stay in their original language. Choice is stored in the `mosg_lang` cookie and applied on the next render. URLs stay the same.

---

## 4. Users and what they can do

### Visitor (no account)

- Start on `/` with Smart search and a grid of live businesses.
- Search live listings, including neighbourhood queries such as “near Jurong West”.
- Open `/biz/{slug}` and `/owner/{slug}`.
- Filter by tags (including parent tags, e.g. food → catering).
- Read public history on a listing.
- Type an intent (“organise a birthday party”, “plumber in Tampines”) and get businesses from **our** data grouped by role. Pins rank nearby matches first.

### Business owner

- Create an account with **email only**.
- Login via **magic link** (opens and signs in) **or** **one-time code** typed on the site. **No passwords.**
- One owner, many businesses.
- Must accept the public-data terms before the first listing submit (re-accept if terms version changes).
- Submit required fields, optional URL name/pairs, optional OpenStreetMap pin (or leave it empty for an online business), optional 280-character summary, optional longer markdown description (WYSIWYG on `/app/businesses/*`, rendered on `/biz/{slug}`), tags, UEN document.
- If the auto-slug from brand name is taken, type a preferred slug that **still starts with the brand-name slug**.
- Unpublish / remove their listing **on this website only**.
- Receive email when an admin accepts (listing is live) and every ~6 months to confirm the business still operates.

### Admin (one or more)

- Seeded first admin: `afiq980@gmail.com`.
- Shared task list (any admin may complete any task).
- Verification task shows business registration info + UEN evidence.
- Accept → listing `live` + email owner.
- Reject → listing stays off the public site + email with reason (recommended).
- Remove a live listing for any reason or no reason.
- Later task types: overdue reconfirmation, visitor flags.

---

## 5. Routes

| Path | Auth | Purpose |
| --- | --- | --- |
| `/` | public | Visitor home: Smart search hero, 9 live businesses, how-the-directory-works timeline |
| `/browse` | public | Search and tag filters for live businesses |
| `/why` | public | Owner pitch: why list, screenshots, how a listing goes live |
| `/biz/[slug]` | public | Listing + history + tags |
| `/owner/[slug]` | public | Owner catalogue of live businesses |
| `/tags/[slug]` | public | Tag archive (SEO) |
| `/plan` | public | Smart search |
| `/login` | public | Magic link + OTP |
| `/app` | owner | Businesses, drafts, status |
| `/app/businesses/new` | owner | Create + terms |
| `/app/businesses/[id]` | owner | Edit (writes history) |
| `/admin` | admin | Task queue |
| `/admin/tasks/[id]` | admin | Review / accept / reject |
| `/terms` `/privacy` `/disclaimer` | public | Legal |
| `/sitemap.xml` `/robots.txt` | crawler | Index live pages only |

---

## 6. Data model

Firestore collections. Each mutable collection has `{name}_history` with a full snapshot plus `created_at` (history write time) and `op`: `create` | `update` | `delete`.

### `owners`

| Field | Required | Public? | Notes |
| --- | --- | --- | --- |
| `id` | yes | yes (as opaque id) | Firebase Auth uid |
| `email` | yes | **decision** | Login mailbox. Recommend private. |
| `displayName` | yes | yes | Used to build owner slug |
| `slug` | yes | yes | `/owner/{slug}` |
| `termsAcceptedAt` | yes | no | Timestamp + terms version |
| `isAdmin` | yes | no | `true` for seeded admin |

### `businesses`

| Field | Required | Notes |
| --- | --- | --- |
| `id` | system UUID | |
| `ownerId` | yes | |
| `uen` | yes | Unique among live/pending |
| `registeredName` | yes | ACRA name |
| `brandName` | yes | Public name; slug source |
| `slug` | yes | Unique. Default: slugify(brandName). On collision owner supplies a brand-prefixed variant |
| `contactEmail` | yes in your spec | **decision:** public vs private |
| `summary` | optional | Short card blurb, max 280 characters. Plain text. |
| `description` | optional | Longer public markdown about the business, max 8000 characters. Owners write it in a MIT-licensed WYSIWYG editor (`@mdxeditor/editor`). HTML, images, and `javascript:` / `data:` URLs are stripped on save. Rendered with `react-markdown` + GFM on `/biz/{slug}`. Description-only edits stay live and do not reopen review. |
| `urls` | optional | `[{ url, label }]` e.g. `{ url: "https://domain.com", label: "Corporate" }` |
| `is_demo` | no | Nullable boolean. `true` marks a sample listing for testing (shown with a Demo badge, omitted from the sitemap). `false` is a real listing. Missing/`null` is treated as not demo. |
| `status` | yes | `draft` \| `pending_review` \| `live` \| `unpublished` \| `removed` |
| `lastConfirmedAt` | system | Set on accept and on 6-month confirm |
| `confirmationDueAt` | system | `lastConfirmedAt + 6 months` |

### `tags` and `businessTags`

- `tags`: `id`, `name`, `slug`, `parentId?` (1 parent, many children). Enables catering ⊂ food and later tag migrations.
- `businessTags`: `businessId`, `tagId` (many-to-many). History on assign/unassign.

### `verifications` (separate layer, as specified)

| Field | Notes |
| --- | --- |
| `id` | UUID |
| `businessId` | |
| `email` | Address used for that verification event |
| `type` | `uen_document` \| `linkedin` \| `other` |
| `verificationUrl` | LinkedIn / future types |
| `storagePath` | Private Storage path for UEN upload (never public) |
| `documentDownloadedAt` | Must be ≤ 365 days before submit |
| `verifiedAt` | Set when admin accepts |
| `reviewerId` | Admin uid |

### `adminTasks`

| Field | Notes |
| --- | --- |
| `type` | `listing_verification` \| `reconfirmation_overdue` \| `flag` |
| `status` | `open` \| `done` \| `rejected` |
| `businessId` | |
| `payload` | Snapshot of registration fields at submit time |
| `claimedBy` | optional; v1 can skip claiming (any admin may act) |

### UEN document rules

- PDF or image.
- Must show UEN, registered name, status, and a **downloaded/generated date** (not incorporation date).
- Downloaded date ≤ 12 months.
- Stored privately. Admins view via a signed URL in the task UI.
- Does **not** prove Muslim ownership. It proves a currently registered Singapore business identity for the listing.

---

## 7. Consent copy (v1 draft)

Shown as a required checkbox. Stored with timestamp and terms version.

> By submitting this listing I confirm that I am the owner or an authorised representative of the business. I consent to the publication of the information I submit, and of a public change history of that information, on this website and through any public API operated from it. I understand that anyone (including search engines, archives, and other organisations) may access, copy, and republish that public information. If I later remove the listing on this website, the operators will stop displaying it here; copies held by others remain with those others. I understand that administrators may remove any listing at any time, with or without reason, and without liability.
>
> This listing is my own public introduction of the business as Muslim-owned. Neighbours can read the page, see the change history, and write to the public contact I provide. Halal certification in Singapore is issued by MUIS. muslimowned.sg is an independent community listing.

---

## 8. Auth and email

- **Firebase Auth** custom claims: `{ admin: true }` for admins.
- **Magic link:** Firebase email-link sign-in, branded via Resend if we send the link ourselves; otherwise Firebase email (less pretty).
- **OTP:** Cloud Function generates a 6-digit code, stores a hash + expiry (10 minutes), Resend sends it, login page verifies via Function and creates a session cookie / custom token.
- **No passwords**, no Google/Apple in v1 unless you ask.
- Transactional mail via **Resend** (env `RESEND_API_KEY`): login, listing live, 6-month confirm, admin rejection.
- From-address: decide (e.g. `register@muslimowned.sg`) once DNS is pointed.

---

## 9. Planner agent

- UI: one text field, example placeholder “organise a birthday party”.
- Server Function only. DeepSeek key never shipped to the browser (`DEEPSEEK_API_KEY`).
- Prompt is constrained: choose from the JSON of **live** businesses (id, brand, slug, tags, summary, longer description flattened to plain text) and the tag tree.
- Output: groups `{ title, reason, businessIds[] }` e.g. food, venue, party logistics.
- UI renders only those ids. If the model invents a name, drop it.
- Rate limit per IP. App Check when a Firebase app exists.

---

## 10. SEO

Crawlers (Google, archives, LLMs that fetch HTML) only reliably index what is **already in the first HTTP response**. They do not log in, do not wait for client-side Firebase, and often skip JavaScript.

### Firebase workflow (data in Firestore, HTML on the page)

This is not “export Firestore to a static site and hope it stays current.” It is **server render + cache**.

| Layer | What it is | What crawlers see |
| --- | --- | --- |
| Firestore | Source of truth for listings, owners, history, tags | Nothing. Private database. |
| Next.js on **Railway** | Server reads Neon, returns HTML | The listing text, titles, JSON-LD, history |
| ISR / on-demand revalidate | After admin accept / unpublish / confirm, rebuild that URL’s HTML snapshot | Same HTML, now fresh |
| Articles (`/blog`, `/article/*`) | Markdown in git, statically generated | Fully static files |
| Classic Firebase Hosting (static files only) | **Do not use** for `/`, `/biz/*`, `/owner/*` | Would force a client SPA; crawlers get an empty shell |

Wrong pattern: browser SDK `onSnapshot` on the public pages. That is a SPA. Google may eventually render it; many other crawlers will not.

Right pattern:

1. Public pages (`/`, `/biz/[slug]`, `/owner/[slug]`, `/tags/[slug]`, sitemap) run **on the server**.
2. Cache the HTML (ISR, e.g. hourly, **plus** `revalidatePath` when an admin accepts, rejects, unpublishes, or an owner confirms).
3. `/app` and `/admin` stay client-auth and are `noindex`.
4. Articles stay file-based in the repo so they are crawlable even if Firestore is empty.

v1 listing pages use ISR (hourly) plus `revalidatePath` after admin accept / unpublish / confirm.

- Unique `<title>` and meta description: brand, registered name, tags, Singapore.
- Canonical `https://muslimowned.sg/biz/{slug}`.
- Open Graph using brand name + register wordmark (not competitor-like “certified” imagery).
- JSON-LD `LocalBusiness` / `Organization` **without** review stars.
- `sitemap.xml` = live `/`, `/browse`, `/biz/*`, `/owner/*`, `/tags/*`, `/blog`, `/article/*` only.
- `robots.txt` allow those; disallow `/app`, `/admin`, `/login`.
- Visible last-confirmed date on listing pages. Never say “certified”.
- Fast LCP: SVG/PNG logo, system or self-hosted fonts, no hero video.
- Slug URLs, semantic headings, internal links from tags, owner catalogues, and articles.

---

## 11. Visual direction (anti-copycat)

Looked at **Al-Mawaddah Mosque**, **Muslim.SG**, **MUIS**, **Masjid.SG**, and **Sultan Mosque** architecture (17 Sep 2026). Borrow neighbourhood warmth, not their logos or official status.

| They do | We do |
| --- | --- |
| Gold seals, certificates, “trusted network” (SMCCI) | Thin gold **geometry** only — stars and arches, never a seal |
| Food photography / maps (Humble Halal) | Cards of listings, tags, change logs |
| MUIS statutory-board chrome | Light sticky header, mosque-green home hero, cream page |
| Al-Mawaddah “home for the community” | Same friendliness: benefits of listing, kenduri/birthday planner |
| “Certified Muslim-Owned Enterprise” | “Listed on muslimowned.sg” |

Palette: mihrab green, jade, cream, modest gold trim. Type: Plus Jakarta Sans + Fraunces. No crescent-star cliché, no chamber photography. The mark is a circular mihrab/shop doorway (green field, cream arch, gold door) in the same simple geometric style as a product icon, not a certificate stamp.

---

## 12. Firebase topology

**Region (locked):** every regional Firebase / Google Cloud resource lives in **`asia-southeast1` (Singapore)**. Do not use `us-central1`. Do not use the **`ASIA` multi-region** bucket/database (that is not Singapore-only). Location is chosen at first create and **cannot be moved**.

| Product | Use | Location |
| --- | --- | --- |
| Authentication | Email link + custom OTP | Global (Firebase has no Auth region) |
| Firestore | All records + history | `asia-southeast1` regional |
| Storage | Private UEN files | `asia-southeast1` regional bucket |
| Cloud Functions (2nd gen) | OTP, mail, accept-listing, planner, confirmation | `asia-southeast1` |
| Cloud Scheduler | Daily confirmation due-date scan | `asia-southeast1`, timezone `Asia/Singapore` |
| App Hosting | Next.js SSR (preferred over classic Hosting) | backend primary region `asia-southeast1` |
| Emulators | Local full stack before any cloud project | localhost |

Cloud project id (prod alias): `muslimownedsg-d04cb` (display name muslimownedsg). Local emulators keep `demo-muslimowned-sg`.

When enabling products in the Firebase console or CLI, pick **Singapore / `asia-southeast1`** every time. App Hosting: `firebase apphosting:backends:create --project muslimownedsg-d04cb --primary-region asia-southeast1`.

Security rules: public read of `status == 'live'` business/owner/tag/history public fields only. Writes only via authenticated owner or admin Functions. Storage: no public ACL.

---

## 13. Local-first delivery (once coding starts)

1. Scaffold Next.js in `muslimowned-sg/`.
2. Firebase emulator suite (Auth, Firestore, Functions, Storage, Hosting).
3. Seed admin `afiq980@gmail.com` and a small tag tree (food/catering, venue, logistics, services, retail, etc.).
4. You run `npm run dev` + emulators; no production Firebase until you create the project and paste rotated keys locally.

---

## 14. Implementation todo (after sign-off)

### P0 — foundation

- [x] Confirm questions in §15 (locked 17 Sep 2026)
- [ ] You rotate API keys
- [x] Next.js + TypeScript + ESLint + `.env.example` + `.gitignore`
- [x] Firebase config (emulators), security rules, indexes
- [x] Logo + visual tokens + disclaimer raster image
- [x] Terms / privacy / disclaimer pages

### P1 — accounts and listings

- [x] Magic link + OTP login
- [x] Owner profile + `/owner/{slug}`
- [x] Create/edit business + terms gate + slug collision UI
- [x] Tag picker (parent/child)
- [x] UEN upload + `pending_review` + history writer
- [x] Public SSR `/biz/{slug}` with history (`force-dynamic` today; ISR still open)

### P2 — admin and mail

- [x] Seed admin claim for `afiq980@gmail.com`
- [x] `/admin` task queue
- [x] Accept → live + Resend
- [x] Reject / remove
- [x] 6-month confirmation + overdue tasks

### P3 — planner and SEO

- [x] `/plan` + DeepSeek Function
- [x] sitemap, robots, JSON-LD, Open Graph
- [x] Seed tags + empty states
- [x] README for local emulator run
- [ ] ISR + on-demand revalidate on listing pages (see §10)
- [x] `/blog` and `/article/[slug]` from markdown

### P4 — open source and CI (required before the repo is public)

- [ ] `LICENSE` (Apache-2.0)
- [ ] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- [ ] Issue + PR templates, `CODEOWNERS`
- [ ] Automated tests (unit + emulator) and `npm test`
- [ ] GitHub Actions on every PR to `main`; required status checks
- [ ] Branch protection on `main` (no direct push, CI must be green)
- [ ] Dependabot + secret scanning
- [ ] Fork / trademark notice on README: this repo is not the live register
- [ ] `package.json` `"private": true` can stay (prevents accidental npm publish); the **git** repo is public

### Explicitly later

- LinkedIn follower/age checks
- Community vouching
- Public JSON API dump / git **listings** mirror (Aziz OSS ask — **code** is OSS now; **data dump** is later and still excludes private fields)
- Ratings, maps, payments

---

## 15. Locked decisions (17 Sep 2026)

1. **Public name.** Use **muslimowned.sg** as the product name. Still never say Enterprise, MOE, or “certified”.
2. **Emails.** Login email is private. Business **contact email is public** (listing + history).
3. **Verification.** Owner picks **UEN document + admin review** *or* **LinkedIn URL + admin review**. Either path can take a listing live.
4. **Stale listings.** After the confirmation window, **unpublish**. The owner can log in and reconfirm / republish. Not a hard delete.
5. **Repo.** New folder `muslimowned-sg/`, not the existing MSOCIETY git/JSON repo. Host it as a **public GitHub** repository (not GitLab).
6. **Open source.** The application source is Apache-2.0. Production data, UEN files, and secrets are not in git. See §17.
7. **Merge gate.** No PR is merged to `main` unless GitHub Actions is green. See §18.
8. **Region.** Firebase/GCP regional resources are **Singapore only** (`asia-southeast1`). Not `us-central1`, not `ASIA` multi-region. Auth remains global (Google limitation).

Defaults still in force: operator contact is the first admin (`afiq980@gmail.com`) until a legal entity is named; owner display name is public (needed for `/owner/{slug}`); optional 280-character summary plus an optional longer markdown description; LinkedIn checks are manual by admin (no follower scraping); local Firebase emulators first.

## 16. Remaining non-blocking questions

1. **Operator identity.** What legal name goes on the privacy policy (you personally, MSOCIETY, a company)? Using the first admin email as contact until named.
2. **From-address** for Resend? Using `register@muslimowned.sg` with fallback to the admin Gmail until DNS.
3. **Firebase project.** Cloud project **muslimownedsg** (`muslimownedsg-d04cb`) exists and the CLI is now `afiq980@gmail.com`. Resource location is still unspecified — enable Firestore, Storage, App Hosting, and Scheduler in **`asia-southeast1` only** before any other region. Location is immutable.
4. **GitHub home.** Personal account vs a GitHub org (e.g. under MSOCIETY). Org is nicer for succession; personal is faster for v1.
5. **Reviewers.** Solo maintainer may self-merge after CI is green. Add a required human review once a second maintainer exists.

---

## 17. Open source — code vs the live site

Aziz asked for OSS. That is **the codebase**, not a dump of Singapore businesses into git.

### What is public (the GitHub repo)

- Next.js app, Firebase rules, Cloud Function/API routes, Tailwind, article markdown, tests, GitHub Actions.
- Seed **fixtures** that are obviously fake (`Example Catering Pte. Ltd.`, `UEN 000000000A`).
- Documentation: this file, README, CONTRIBUTING, SECURITY.

### What is never in git

- `.env.local`, Resend / DeepSeek / Firebase service-account keys, `JOBS_SECRET`.
- Production Firestore export, owner login emails, UEN PDFs/images.
- Real people in `emulator-data/` if you ever signed in locally with a real mailbox — keep that folder gitignored.
- Admin allowlists beyond the documented first admin email (already in this requirements file by design).

### What “open source” does **not** grant

| They can | They cannot (without you) |
| --- | --- |
| Clone, run emulators, send PRs, fork the code | Become an admin of **muslimowned.sg** |
| Deploy their own instance with their own Firebase | Use the domain, logo-as-official-mark, or imply they are this register |
| Read public listings **on the website** like any visitor | Download private Storage (UEN documents) |
| Propose tags, copy, or features | Skip admin review of live listings |

The official instance is the site on **muslimowned.sg**. A fork is a different operator. README and `/disclaimer` must say that, so a scraper cannot treat a fork as the register.

### License (locked)

**Apache License 2.0.** Patent grant, compatible with Firebase/Next.js, usual default for this kind of civic app.

Not GPL/AGPL for v1: copyleft would scare casual contributors and does not stop someone running a closed directory of *listings* (data is not the code). Trademark and the disclaimer do that job.

Not “no license”: GitHub “public” without a LICENSE is not open source; people cannot safely reuse it.

### Governance (lightweight, first OSS)

- **Maintainer** of the repo and of the live site: you (Mo), first admin `afiq980@gmail.com`.
- **Code contributors** submit PRs. Merge requires green CI. They do not get Firestore admin, Storage, or Resend.
- **Listing admins** are a Firebase custom claim / `ADMIN_EMAILS` on the deployed project. Grant that out of band, never by merging a PR that adds a random email.
- **Succession:** if the named maintainer disappears, the GitHub org (when you have one) and the domain registrar are the recovery path. “Hope the community forks” is not a moderation plan — same as the original chat.

### DCO, not a CLA

PRs include a **Developer Certificate of Origin** (`Signed-off-by:` on each commit, or a checkbox in the PR template). No Contributor License Agreement: CLAs slow first-time contributors and you do not have a company counsel loop.

### Accept / reject PRs on product grounds

Refuse (even if tests pass):

- Certified / MOE / SMCCI-lookalike branding, gold seals, “halal confidence” scores, maps-first food SEO.
- Payments, ads, or monetising the directory.
- Client-side Firebase on public listing pages (breaks the SEO workflow in §10).
- Secrets, production data, or real UEN files.

---

## 18. GitHub: tests on every PR to `main`

**Rule:** a pull request **cannot** be merged into `main` unless the required GitHub Actions workflow has succeeded. That is a GitHub **branch protection** setting, not a polite README request.

### Workflow (`.github/workflows/ci.yml`)

Trigger: `pull_request` to `main`, and `push` to `main` (so the default branch itself stays green).

Jobs, all required:

| Job | Command | Needs |
| --- | --- | --- |
| Lint | `npm ci` then `npm run lint` | Node 20 |
| Types | `npx tsc --noEmit` | Node 20 |
| Unit tests | `npm test` | Node 20, **no** cloud Firebase, **no** secrets |
| Emulator tests | `npm run test:emulators` | Node 20 + **Java 21** (Firebase emulator suite) |
| Production build | `npm run build` with dummy `NEXT_PUBLIC_*` | Proves App Hosting will compile |

CI uses the **demo / emulator** project only (`demo-muslimowned-sg`, `FIREBASE_USE_EMULATOR=true`, `ALLOW_DEV_OTP=true`). GitHub Actions secrets for Resend/DeepSeek stay empty; planner tests use the keyword fallback. Do not put production keys in Actions.

### What the tests must cover (so CI is not a green rubber stamp)

**Unit (fast, no Java):**

- Slugify + brand-prefixed collision rule.
- History writer shape (`op`, snapshot, no login email in public snapshot).
- Article markdown: frontmatter, `/article` → `/blog` redirect, listing slug extraction.
- Public vs private field filters (login email never on `/biz` HTML).
- Planner output: drop invented business ids.

**Emulator (slower, Java in CI):**

- Owner OTP/magic path against Auth emulator.
- Submit listing → `pending_review` → **not** in public `getLiveBusinesses`.
- Admin accept → `live` → appears on `/biz/{slug}` HTML (SSR, not client SDK).
- Missed confirmation → `unpublished` → gone from sitemap.
- Firestore rules: unauthenticated read of `live` only; Storage: UEN path denied to public.
- Security rules compiled (`@firebase/rules-unit-testing` or emulator).

Until those exist, **do not make the repo public**. A public repo with no tests and an unprotected `main` is how first-time OSS projects eat a drive-by PR that looks helpful and ships a secret or a broken listing page.

### Branch protection on `main` (you click this in GitHub once the workflow exists)

- Require the CI workflow.
- Require branches to be up to date before merge (optional but good).
- Do not allow bypassing for admins once you are not the only person with push.
- No force-push.
- Linear history optional.
- For v1 you may self-merge after green CI. Turn on “require 1 review” when a second maintainer exists.

### Other GitHub switches (cheap, do them at repo create)

- Secret scanning + push protection (Settings → Code security).
- Dependabot alerts + weekly npm PRs (those PRs also must pass CI).
- Discussions optional; issues on for bugs/features.
- Do not enable GitHub Pages for this app (Railway is the site).

---

## 19. First-time open source — what you are missing

This is the checklist of things a first public repo usually forgets. None of this is code yet; it is the work before `git remote add` to a **public** GitHub URL.

### Must exist before the repo is public

| Artifact | Why it matters |
| --- | --- |
| `LICENSE` (Apache-2.0 text) | Without it, “public on GitHub” is not a license grant. |
| `README.md` that a stranger can run | You already have a local README; add license, CoC link, “this is not the live register”, CI badge. |
| `CONTRIBUTING.md` | How to run emulators, Java 21, `npm test`, PR rules, DCO, what PRs we refuse. |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1. Report to the maintainer email, not a public issue, for harassment. |
| `SECURITY.md` | Vulnerabilities to a private inbox (`afiq980@gmail.com` until you have `security@`). **Never** “open a public issue with the exploit.” |
| `.github/ISSUE_TEMPLATE/` | Bug / feature / listing-moderation-is-not-an-issue (send owners to the site). |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist: tests, no secrets, no SMCCI-lookalike copy, DCO. |
| `.github/CODEOWNERS` | `@you` owns `/`, so you get requested on every PR. |
| `.github/workflows/ci.yml` | §18. |
| Tests + `npm test` | Do not exist today. CI cannot gate `main` without them. |
| Branch protection | Workflow file alone does not block merge. |
| Clean git history | No `.env`, no key dumps, no `emulator-data` with real users. Scan before first push (`gitleaks` or GitHub secret scanning). |

### Must decide / set in GitHub, not in the repo

| Setting | Default |
| --- | --- |
| Public vs private | Public once §19 must-haves land. Private is fine while tests are missing. |
| Org vs personal | Unlocked; see §16. |
| Who can push to `main` | Nobody except via PR. |
| Pages / Codespaces secrets | No production Firebase in Codespaces. |
| GitHub Admin of the repo vs Firebase Admin of the site | Different hats. A helpful contributor is not a listing moderator. |

### Should have soon after public

| Artifact | Why |
| --- | --- |
| `NOTICE` / attribution | Apache-2.0 expects NOTICE if you later bundle other Apache works; a short one is enough. |
| `CHANGELOG.md` or GitHub Releases | So forks know what `main` did. |
| `good first issue` labels | Else you get drive-by refactors of Tailwind. |
| Roadmap issue or discussion | Stops duplicate “add maps / payments” PRs. |
| Trademark line | “muslimowned.sg” names the official instance; license is for code, not the domain. |

### Easy to get wrong (read this twice)

1. **Open-sourcing the app does not open-source people’s data.** PDPA still applies. Public listing fields are public *on the website* because owners consented; that is not a reason to commit a Firestore export.
2. **A fork with live listings is a different data controller.** Your privacy policy cannot cover it. Say so.
3. **CI that needs production credentials will leak them.** Emulators only.
4. **`ALLOW_DEV_OTP` must be false in production.** Easy to copy `.env.example` into Railway and skip email.
5. **Dependabot PRs are still PRs.** They must pass the same tests. Do not auto-merge until the suite is trustworthy.
6. **You still have to moderate.** OSS is extra reviewers for *code*, not a replacement for the admin queue.
7. **License cannot make SMCCI’s site “ours” and cannot stop them existing.** It only covers *this* code.
8. **Do not put the rotated API keys in a GitHub wiki, issue, or screenshot.**
9. **`package.json` `"private": true`** means “don’t publish to npm,” not “this git repo is private.”
10. **First commit to a public repo is forever.** If you ever committed a key in this folder, rotate it and consider `git filter-repo` before the first public push.

### Suggested order when you say “make the repo public”

1. Tests + GitHub Actions (can be developed while the repo is still private).
2. LICENSE, CONTRIBUTING, CoC, SECURITY, templates.
3. Create the GitHub repo **private**, push, turn on branch protection + secret scanning.
4. Confirm CI is green on a throwaway PR.
5. Flip the repo to **public**.
6. Then, and only then, point muslimowned.sg DNS at Railway.
