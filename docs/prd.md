# Product Requirements Document: UEN Verification and Recurring Confirmation

**Status:** Draft
**Owner:** Registry maintainers

## Problem statement

The registry is a lightweight trust model, not a religious authority, halal certifier, or definitive arbiter of Muslim identity. A listing starts with an owner's voluntary self-attestation and may include understandable social signals. LinkedIn is a useful optional signal, but it is unavailable or uncomfortable for many small, offline businesses, particularly the *makcik/pakcik* scenario. Requiring it would exclude legitimate businesses and overstate what a profile can prove.

We need an accessible alternative that demonstrates that a business is currently registered, while keeping business-registration evidence separate from a claim of Muslim ownership. We also need a lightweight way to detect listings that may no longer be current. This PRD adds an ACRA UEN document pathway and a six-month reconfirmation process without turning either into religious certification.

## Goals and non-goals

### Goals

- Let an owner apply without LinkedIn by uploading a recent UEN business-registration document.
- Preserve self-attestation as the basis for inclusion and social proof as optional context.
- Make freshness visible and give owners a simple way to keep a listing active.
- Give moderators consistent, auditable validation and follow-up states.

### Non-goals

- Proving faith, ownership context beyond the submitted claim, halal status, product quality, or legal compliance beyond the checks below.
- Requiring LinkedIn, UEN, community vouching, or any single signal from every business.
- Publishing identity documents or private contact information in the public registry.

## Database schema

The database keeps business identity, categorisation, and verification as separate concerns. System-generated UUIDs are the primary keys for records that expose a UUID below. Public views must expose only fields for which the business has consented; contact email and verification evidence should be access-controlled.

### Businesses

The `businesses` table is the source of the registry listing:

| Field | Requirements |
| --- | --- |
| `id` | System-generated UUID, primary key |
| `uen` | The business UEN; indexed and unique where present |
| `registered_business_name` | Registered business name |
| `contact_email` | Email used for owner contact and confirmation; private by default |
| `urls` | Optional collection of URL/name pairs, allowing multiple entries (for example, `{ "url": "https://domain.com", "name": "Corporate" }`) |
| `created_at`, `updated_at` | Timestamps maintained by the system |

URLs must be validated and stored as structured pairs rather than as an unlabelled string list, so a business can provide multiple links such as Corporate, LinkedIn, or Menu.

### Tags

- `tags` has a system-generated UUID `id`, a unique tag `name`, and an optional `parent_tag_id` foreign key to `tags.id`. A parent reference supports one-to-many hierarchical categorisation, such as `food` → `catering`, while keeping migration of the taxonomy straightforward.
- `business_tags` is a join table containing `business_id` and `tag_id` foreign keys (with a uniqueness constraint on the pair). This allows one business to have multiple tags and each tag to apply to multiple businesses.
- Tag deletion or renaming must preserve historical references and should be handled through migration/deprecation rather than destructive edits.

### Verification (separate layer)

The `verification` table is separate from `businesses` so that a verification signal does not alter or imply the business's identity record:

| Field | Requirements |
| --- | --- |
| `id` | System-generated UUID, primary key |
| `business_id` | UUID foreign key to `businesses.id` |
| `email` | Email used for this verification event |
| `verified_at` | Timestamp of successful verification; nullable until verified |
| `verification_url` | URL for the evidence, such as a LinkedIn profile; designed to support other verification types in future |

A business may have multiple verification records over time or for different evidence types. Verification status and evidence must not be presented as proof of faith, halal certification, endorsement, or guaranteed ongoing operation.

### History and auditability

Each primary data table has a corresponding history table: `businesses_history`, `tags_history`, and `verification_history`. A history row is an immutable snapshot of the record before or after a change and includes the source row's fields plus:

- `created_at`, the timestamp when that historical snapshot was recorded;
- the operation/change type (create, update, or delete); and
- the original record UUID, retained so history remains queryable after a record is removed.

History rows are append-only and are written transactionally whenever a record changes. The `businesses_history` snapshot includes the business fields (including its URL/name pairs), `tags_history` includes the tag and parent relationship, and `verification_history` includes the business foreign key, email, verification timestamp, and verification URL. Changes to `business_tags` must also be captured in the audit trail (including added and removed relationships), so tag assignment changes cannot bypass review. Retaining these records lets visitors and moderators self-assess suspicious changes without exposing private contact details or verification evidence.

## Verification flows

### Common starting flow

1. The owner submits business details, confirms they are the owner or authorised representative, and completes the existing self-attestation.
2. The owner consents to evidence storage/review and provides an email address for follow-up.
3. The owner chooses one or both optional evidence paths. Community/social proof remains optional.
4. Automated checks run where possible; ambiguous cases go to moderator review.
5. The listing shows separate, accurately named signals—not one "certified" status.

### With LinkedIn

1. The owner provides a public LinkedIn business or founder profile link and self-attests.
2. The system checks that the link resolves, is publicly viewable, and plausibly relates to the submitted business or owner. A moderator handles ambiguous names, stale profiles, and mismatches.
3. On acceptance, the listing receives **LinkedIn linked**. This is a social/professional corroborating signal, not proof of faith, ownership, endorsement, or current operation.
4. The owner may also submit UEN evidence; both signals are reviewed and displayed separately.

### Without LinkedIn: UEN pathway

1. The owner self-attests and uploads an eligible UEN document through a secure upload flow.
2. The system records or extracts the UEN, legal/business name, registration status, and downloaded date, then checks file type, readability, malware safety, and age.
3. A moderator confirms that the UEN and business identity match the listing and that the document indicates an active registration. On success, the listing receives **UEN registration linked**.
4. Community vouches and other social proof remain optional; no LinkedIn-equivalent is required merely because LinkedIn is unavailable.
5. If evidence is unclear, expired, mismatched, or unverifiable, the owner is asked to re-upload or the listing remains self-attested pending review. The owner may appeal a rejection.

## UEN requirements and validation rules

- **Source:** A document issued or downloaded from Singapore ACRA/BizFile containing the business UEN. A screenshot or scan is acceptable only when all required fields are legible and provenance can be reasonably assessed.
- **Freshness:** The downloaded date must be no more than one year (365 days) before submission. Use the download/generated date, not incorporation date. Older documents are rejected.
- **Required fields:** UEN, registered/business name, active/registered status, and downloaded/issued date.
- **Identity match:** UEN and name must match the listing, allowing moderator review for trading names, punctuation, and transliteration. Material mismatches require clarification or rejection.
- **Integrity:** Accept only documented PDF/image types and sizes; malware-scan; reject unreadable, edited, password-protected, or visibly altered documents. Never expose uploads publicly.
- **Review record:** Store submission time, document date, decision, reason, reviewer, and secure reference outside public git-tracked data. Set and publish a retention period; honour deletion requests where possible.
- **Expiry:** UEN evidence does not prove daily operation. The six-month confirmation is the separate freshness check. Changed, cancelled, or suspicious registration can trigger earlier review.

## Verification tiers and display

Self-attestation remains the minimum basis for a listing. Tiers describe evidence, not confidence in faith:

| Tier | Signals | Public presentation |
| --- | --- | --- |
| 1 — Self-attested | Owner/authorised representative self-attestation | **Self-attested** |
| 2 — Social | Tier 1 plus accepted LinkedIn and/or community vouches | Tier 1 plus **LinkedIn linked** and/or **Vouched by N members** |
| 2 — UEN registration | Tier 1 plus accepted UEN document | Tier 1 plus **UEN registration linked** |
| 3 — Multiple signals | Tier 1 plus any combination of LinkedIn, UEN, and social proof | Each signal separately; never a certification badge |

UEN supplements or replaces the LinkedIn pathway for access purposes; it does not replace self-attestation or imply halal status.

## Recurring confirmation process and timeline

1. **At approval:** Record `confirmed_at` and schedule the first confirmation six months later. Explain the process and provide an authenticated confirmation link.
2. **Six months:** Email a reminder asking the owner to confirm that the business is still running and active and that details and self-attestation remain accurate. The owner may confirm, update, or request removal. Record `confirmation_due_at` and delivery.
3. **Reminder:** If there is no response after 7 days, send one reminder (and an alternate consented channel where available). The proposed response window is **14 days from the first message** (`X = 14`), configurable by maintainers.
4. **After 14 days:** Without a response, mark the listing **needs reconfirmation**, notify the owner, and provide a recovery link. Keep it visibly flagged rather than representing it as recently confirmed; final hide/archive policy remains a governance decision.
5. **Response:** Record the owner, timestamp, and current details; reset the six-month clock and clear the flag. Changes go to moderator review. Closure requests follow takedown policy.
6. **Escalation:** Bounced mail, reports that the business closed, or a failed UEN recheck can trigger early review. A maintainer may temporarily hide a listing, with an appeal route.

Messages must be mobile-accessible and contain no sensitive UEN document or unnecessary personal data. Track send, delivery/bounce, reminder, confirmation, status transition, and removal events. Respect unsubscribe and privacy requests while retaining a necessary operational contact route.

## Success metrics

- Increase the share of new listings completing verification without LinkedIn, without decreasing self-attestation completion.
- UEN review pass rate and median time to decision; track rejection reasons (age, mismatch, unreadable, inactive, suspected alteration).
- At least 95% of scheduled confirmation messages successfully delivered, with delivery/bounce monitoring.
- Owner confirmation rate within 14 days; median time from reminder to confirmation.
- Reduce the proportion of listings remaining unconfirmed, and measure the number and age of **needs reconfirmation** listings.
- No material increase in privacy incidents, fraudulent evidence, or successful abuse reports; monitor appeals and takedowns.
- Survey owners, including makcik/pakcik users, for completion difficulty and clarity of the flow.

Metrics are reviewed monthly after launch and segmented by verification path. Do not use completion or confirmation as a proxy for Muslim identity.

## Open questions and risks

- Confirm the exact ACRA/BizFile document types, fields, and source verification method that can be supported reliably.
- Should a UEN upload be required, optional, or offered only when LinkedIn is unavailable? How should owners without a Singapore UEN be served?
- What secure storage, encryption, access control, retention duration, and deletion workflow apply to UEN documents? Who is the data owner and privacy contact?
- Is 14 days (`X`) the right no-response period, and should a flagged listing remain public, be de-ranked, or be hidden? What is the appeal SLA?
- What email consent, unsubscribe, bounce handling, and alternate contact rules satisfy applicable privacy and anti-spam requirements?
- How should multiple owners, franchises, sole proprietors, renamed businesses, and businesses with registered names different from public trading names be matched?
- How will moderators detect fabricated or edited documents, and what escalation is available when ACRA access or automation is unavailable?
- What exact retention and audit requirements apply to evidence and confirmation events?
- Who owns moderation, abuse reports, privacy requests, and succession after launch?

The registry should continue to publish its boundaries clearly: self-attestation is a claim, social proof can be mistaken or biased, and UEN confirms registration evidence—not faith, halal certification, endorsement, or guaranteed ongoing operation.
