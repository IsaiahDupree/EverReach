# EverReach Data Practices

## Sub-processors (categories)
- **Cloud hosting & DB:** Vercel, Supabase
- **Product analytics & flags:** PostHog
- **Email delivery:** Resend / Flodesk (as configured)
- **Error monitoring:** Sentry (optional)
- **Model inference (optional features):** OpenAI API
- **Payments:** Stripe (if/when enabled)
- **Enrichment Services:** RapidAPI, Perplexity AI (optional, with consent)

> We sign DPAs where available and use encryption in transit/at rest. Access is least-privilege and audited.

## Retention (operator view)
- **Contacts & notes:** until deletion or workspace removal; 30-day hard-delete window.
- **Screenshots/OCR:** default 365 days; configurable per workspace; immediate manual delete available.
- **Event telemetry:** 18 months, then aggregated.
- **Backups:** rolling 30 days.
- **Marketing intelligence data:** 18 months for user_event, 90 days for enrichment attempts.

## User Request Playbooks
- **Access/Export:** admin can export workspace data; otherwise email privacy@everreach.app.
- **Deletion:** delete item(s) in-app, or request workspace deletion; confirmed within 30 days.
- **Revoke integrations:** disconnect in app → tokens revoked within 24 hours.
- **Opt-out of marketing:** link in footer or email unsubscribe@everreach.app.
- **Enrichment opt-out:** disable in workspace settings; existing data retained per schedule unless deletion requested.

## Security Highlights
- TLS everywhere, at-rest encryption, API keys/OAuth tokens stored encrypted.
- RLS policies on user-owned tables; audit logs on sensitive actions.
- Incident response: triage within 24h, notify affected users as required by law.
- SHA-256 hashing for user IDs in analytics events.
- Property whitelisting to prevent PII leakage in event telemetry.
- Rate limiting on all public-facing endpoints.
- Webhook signature verification (HMAC-SHA256).

## Marketing Intelligence Data Processing
When you enable marketing intelligence features:
- **User events:** Collected via PostHog webhook, mirrored to Supabase with SHA-256 hashed user IDs
- **Enrichment data:** Email hash, company info, social profiles (no raw emails stored)
- **Persona assignment:** AI-generated persona buckets with confidence scores
- **Magnetism index:** Calculated engagement score (no PII)
- **Attribution:** Anonymous user journey tracking (hashed identifiers only)

**Cost & Privacy:** Our enrichment costs $0.041 per user vs. Clay's $0.25 (84% savings). All enrichment is optional and requires explicit consent. You can disable enrichment at any time, and we'll delete enrichment data within 30 days of your request.

## Data Subject Rights (GDPR/CCPA)
- **Right to Access:** Request a copy of your personal data
- **Right to Rectification:** Correct inaccurate data
- **Right to Erasure:** Request deletion of your data
- **Right to Portability:** Export your data in machine-readable format
- **Right to Restrict Processing:** Limit how we process your data
- **Right to Object:** Object to processing based on legitimate interests
- **Right to Opt-Out:** Opt out of marketing communications

To exercise these rights, email privacy@everreach.app with "Privacy Request" in the subject line.
