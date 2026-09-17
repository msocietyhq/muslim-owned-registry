# Muslim-Owned Registry

An open-source directory for discovering Muslim-owned businesses through **self-attestation and social proof**. The registry helps people understand ownership claims without presenting itself as a religious, halal, or certification authority.

> **Status:** Initial concept. The verification model, privacy practices, and moderation process should be validated with the community before launch.

## Verification model

Verification is deliberately **tiered**, not a pass/fail certification:

1. **Self-attestation** — An owner or authorised representative states that the business is Muslim-owned. This is the baseline and is clearly labelled.
2. **LinkedIn linked (optional)** — A business or founder LinkedIn profile can provide an additional public identity and ownership signal. This is not an endorsement by LinkedIn.
3. **ACRA business profile (optional)** — Where relevant, an ACRA business profile can be linked or referenced as supporting business information. It does not establish faith or halal status.
4. **Community vouching** — People with relevant firsthand knowledge may vouch for a listing. Vouches should be attributable where practical, subject to privacy and abuse safeguards, and displayed as a count rather than treated as conclusive proof.

These signals remain distinct so visitors can tell what has—and has not—been checked. No signal guarantees that a business is halal-certified, that every product is halal, or that an ownership claim is permanently current.

## Display badges

Listings can show simple, descriptive badges:

- **Self-attested**
- **Vouched by N members**
- **LinkedIn linked**

Badges describe the evidence available in the registry; they are not rankings, endorsements, or official certification. A future interface should show when a claim was last updated and provide a way to report inaccurate or harmful information.

## Open data and technology

- Registry data is stored in **git-tracked JSON/CSV** so the project remains genuinely open source and changes can be reviewed.
- The planned application stack is **Next.js + Supabase**, deployed with a serverless architecture.
- Public data should be minimised, consent-based, and documented. Private contact or moderation data must not be committed to the repository.

See [`docs/concept.md`](docs/concept.md) for the fuller initial concept and open questions. The [`data/`](data/) directory documents the intended data boundary, while [`src/`](src/) is reserved for the future application.

## Scope and boundaries

This project is **not a halal authority**, halal certifier, religious authority, or definitive arbiter of Muslim identity. It records voluntary claims and clearly labelled community signals. It should not imply that a listed business, product, or service is halal-certified or endorsed by the maintainers.

The project needs a **named maintainer post-launch** with responsibility for moderation, privacy requests, abuse reports, and keeping the verification policy current. That role should be identified before a public launch.

## Contributing

Until the application exists, contributions should focus on improving the concept, data model, privacy safeguards, and community governance. Please avoid adding real personal or business data without explicit permission.
