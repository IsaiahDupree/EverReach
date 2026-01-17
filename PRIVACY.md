# EverReach Privacy Policy

_Last updated: 2025-10-22_

**Who we are.** EverReach ("we", "us", "our") operates the EverReach CRM services and the EverReach app inside ChatGPT ("ChatGPT App").  
**Contact:** privacy@everreach.app • 123 Example St, City, State, Country

## Scope
This policy covers personal data we process when you use: (a) EverReach web/mobile apps; (b) our ChatGPT App and Custom GPT actions; (c) our public website; (d) APIs and webhooks.

## Data We Collect
- **Account Data:** name, email, password hash/credentials from your chosen auth provider, profile photo, plan tier, workspace membership.
- **Contact Records (You Provide):** names, emails, phone numbers, notes, tags, relationship metadata, message history pointers/IDs (not message contents unless you import them).
- **Content You Upload:** screenshots/images and derived OCR text, entities, and insights.
- **Product Analytics:** event telemetry (e.g., `user_signed_up`, `screenshot_uploaded`, `warmth_score_viewed`), feature flags, app/version, device/OS, timestamps. We do not store raw passwords or full payment card numbers.
- **OAuth Tokens & Integrations:** limited-scope tokens for providers you connect (e.g., email, ads, analytics). Stored encrypted at rest.
- **Support Data:** emails, chat messages, bug reports.
- **Marketing Data:** campaign/UTM parameters, referral info.

## Sources
You; teammates who invite you; connected services you authorize; cookies/SDKs; publicly available sources for enrichment (if you enable it).

## How We Use Data
- Provide and secure the service; personalize UI; compute and explain **Warmth** scores; analyze screenshots; recommend outreach; measure usage; prevent abuse; comply with law.
- **Legal bases (EEA/UK):** contract, legitimate interests (product analytics, fraud prevention), consent (marketing, optional enrichments), legal obligation.

## Sharing
- **Processors (sub-processors):** hosting, storage, analytics, email, logging, CI/CD (see Sub-processors list below).
- **Vendors/Partners you connect:** only with your action/consent (e.g., email provider).
- **Legal:** to comply with law, enforce terms, or protect rights.
- We do **not** sell personal information. We do not use your contact records to train public models.

## International Transfers
We may transfer data to countries with different protections. Where required, we use SCCs or other lawful transfer mechanisms.

## Retention
We keep data while you have an account and delete or anonymize within the retention windows below (see table). You can request deletion at any time.

## Your Rights
Depending on your location, you may have rights to access, correct, delete, port, restrict, or object to processing.  
**Requests:** email privacy@everreach.app with "Privacy Request". We may verify identity and respond within applicable timelines.

## Children
Not for use by children under 13 (or 16 where applicable). We do not knowingly collect data from children.

## Security
Encryption in transit and at rest, access controls, least-privilege, audit logging, periodic reviews, incident response procedures. No method is 100% secure.

## Changes
We'll post updates here and revise the date. Material changes will be notified via email or in-app.

## Contact
EverReach Privacy • privacy@everreach.app • 123 Example St, City, State, Country

---

### Sub-processors (core)
- **Supabase** (database, auth, storage)
- **Vercel** (hosting)
- **PostHog** (product analytics & feature flags)
- **Resend / Flodesk** (transactional & marketing email — if enabled)
- **Sentry** (error monitoring — if enabled)
- **OpenAI** (model inference for screenshot analysis / text generation when you invoke those features)

### Data Retention Schedule (summary)
| Category | Examples | Retention |
|---|---|---|
| Account & Workspace | name, email, auth IDs | For life of account + 30 days after deletion |
| Contacts | names, emails, notes, warmth | For life of workspace or until you delete; hard-delete within 30 days of workspace deletion |
| Screenshots & OCR | images, extracted text | 365 days (configurable); you can delete anytime |
| Events/Telemetry | app events, performance logs | 18 months (aggregated thereafter) |
| OAuth Tokens | provider access tokens | Rotated per provider; deleted within 24 hours after disconnect |
| Support Data | tickets, chats | 24 months |

> For a current sub-processor list and locations, contact privacy@everreach.app.
