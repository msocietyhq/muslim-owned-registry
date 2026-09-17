# Initial concept

## A lightweight trust model

The registry combines a business's own statement with independent, understandable social signals. It does not pretend that any one signal can prove a person's faith or certify a business. Self-attestation is the basis for a listing; other signals are optional.

| Signal | Meaning | Limit |
| --- | --- | --- |
| Self-attested | An owner or authorised representative claims the business is Muslim-owned | A claim, not independent verification |
| LinkedIn linked | A public business/founder profile is linked | A profile link is not an endorsement or proof |
| ACRA business profile | Relevant public business-registration information is linked | Registration does not establish faith, ownership context, or halal status |
| Community vouching | Members with firsthand knowledge vouch for a listing | Vouches can be mistaken or biased and need abuse safeguards |

The product should display these as separate badges: **Self-attested**, **Vouched by N members**, and **LinkedIn linked**. ACRA should be shown as supporting business information rather than a faith-verification badge.

## Data and implementation

The source of truth should be git-tracked JSON/CSV so changes are reviewable and the project remains true open source. The planned product is a serverless **Next.js + Supabase** application. Public fields should be minimised and consent-based; private contact and moderation information must not be exposed in the public data files.

## Boundaries and governance

The registry is not a halal authority, halal certifier, religious authority, or definitive arbiter of Muslim identity. It records voluntary claims and community context. It must not imply that a listed business or product is halal-certified or endorsed by maintainers.

Before launch, the project needs a named maintainer responsible for moderation, privacy requests, abuse reports, and keeping policy current. The name and contact route should be published as part of launch readiness.

## Open questions

- What qualifies as a firsthand community vouch, and how should conflicts or coordinated abuse be handled?
- How should a listing owner update or withdraw a claim?
- Which business fields are safe and useful to publish in git-tracked data?
- What retention, appeal, and takedown process will protect businesses and community members?
- Who is the named post-launch maintainer, and what is the succession plan?
