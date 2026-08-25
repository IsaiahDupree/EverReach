# Attribution publication registration

## Current production status

The repository can now register a signed publication manifest and return a
complete tracked destination. No production manifest or real public link was
registered while implementing this capability. Real-link tracking remains
**unverified** until an authorized registration call succeeds and the returned
tracked destination is installed in a post, profile, or redirect.

Registration is server-to-server. A publisher must never construct ACTP query
parameters or a publication claim itself.

## Registration contract

`POST /api/v1/attribution/publications/register` requires bearer authorization
and a JSON body containing:

- `destination_url`: an absolute HTTPS URL without embedded credentials.
- `actp_content_id`: the vetted content or script identifier.
- `actp_published_id`: the stable publication/source identifier.
- `actp_campaign_id`: the campaign identifier.
- `actp_offer_id`: the offer identifier.
- `actp_source_platform`: the exact platform, independent from UTM source.
- Optional `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and
  `utm_content` values.
- Optional `expires_in_seconds`, from 60 through 7,776,000.

On success, the route durably registers the exact five dimensions before it
returns `publication_id`, `expires_at`, `actp_publication_claim`, and
`tracked_url`.

The returned tracked URL contains the five exact ACTP dimensions and the signed
publication claim. It never contains `actp_touch_token`; that token is minted
per anonymous page view by the public touch endpoint. Stale ACTP control
parameters in `destination_url` are replaced, and any static touch token is
removed.

The route rejects non-HTTPS destinations, credential-bearing destinations,
invalid or oversized destinations, oversized final tracked URLs, missing exact
dimensions, missing server secrets, failed manifest persistence, and invalid
authorization.

## Required environment

The deployed backend requires the publication-registration control credential
and claim-signing secret. Their environment names are:

```text
ATTRIBUTION_PUBLICATION_CONTROL_TOKEN
ATTRIBUTION_CLAIM_SIGNING_SECRET
```

It also requires the isolated owned-outcome Supabase configuration below. The
backend's existing `SUPABASE_URL` remains authoritative for EverReach auth and
app data and is never used as a fallback for this lane:

```text
OWNED_OUTCOME_SUPABASE_URL
OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY
```

Secret values belong in the deployment secret store, never in a tracked file,
command-line argument, URL, or log.

The registration CLI requires:

```text
EVERREACH_BACKEND_URL
ATTRIBUTION_PUBLICATION_CONTROL_TOKEN
```

`EVERREACH_BACKEND_URL` must use HTTPS, except that loopback HTTP is accepted
for a local integration test. The CLI sends the bearer credential only in the
request header and emits a whitelist of non-secret response fields.

## Register one tracked publication

With the two CLI environment variables already exported:

```sh
node scripts/register-attribution-publication.mjs \
  --destination-url 'https://everreach.app/get-started' \
  --content-id '<content-id>' \
  --published-id '<stable-publication-id>' \
  --campaign-id '<campaign-id>' \
  --offer-id '<offer-id>' \
  --source-platform 'youtube' \
  --utm-source 'youtube' \
  --utm-medium 'organic-video' \
  --utm-campaign '<campaign-slug>'
```

Use the returned `tracked_url` exactly as emitted. Store its `publication_id`
next to the upstream publication record for audit and revocation. A shared
static URL is not a substitute for per-publication registration.

Registration claims expire (30 days by default, 90 days maximum). A long-lived
bio or redirect integration must rotate the registered link before
`expires_at`; it must not silently keep serving an expired claim.

If a platform-assigned post ID exists only after publishing, first persist a
stable internal publication ID and later map the provider's post ID to it, or
update the profile or redirect after the provider ID is known. Do not invent a
provider ID.

## Owned-outcome bridge runner contract

The bridge remains a bounded one-shot process. The wrapper at
`scripts/run-owned-outcome-bridge-job.sh` loads an optional private environment
file, fails closed when configuration is missing, runs exactly one bridge pass,
and atomically records its JSON result. It does not contain a polling loop.

Before draining the retention stream, each pass runs the bounded producer at
`scripts/owned-retention-producer.mjs`. The producer uses real exact-attribution
install outcomes as its denominator. It prefers PostHog product activity when a
personal query credential is available and falls back to the first-party
`app_events` mirror. It never substitutes generated or estimated activity.

The default curve is interval retention at day 1, day 7, and day 30. A user is
retained at a checkpoint only when a configured lifecycle or product event was
measured in the 24-hour interval beginning at `install + checkpoint`. A cohort
must have at least two fully elapsed intervals before the producer calls it a
curve. Every point records its explicit numerator, denominator, source-data
cutoff, deterministic measurement-basis hash, and exact publication dimensions. The payload
also records `causal_interpretation_status=not_inferred`; these measurements do
not claim to explain why a user stopped returning.

When credentials, schema, attributed installs, mature intervals, or qualifying
activity are absent, the producer emits no samples and returns a specific
`blocked_*` component state. Delivery of already queued event facts continues.

Required runner environment:

```text
OWNED_OUTCOME_SUPABASE_URL
OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY
CONTENT_QUALITY_URL
CONTENT_QUALITY_CONTROL_TOKEN
OWNED_OUTCOME_BRIDGE_STATE_DB
OWNED_OUTCOME_RUN_STATUS_FILE
```

Optional runner environment:

```text
OWNED_OUTCOME_ENV_FILE
OWNED_OUTCOME_SQLITE_BIN
OWNED_OUTCOME_HEALTH_MAX_AGE_SECONDS
POSTHOG_PERSONAL_API_KEY
POSTHOG_API_KEY
POSTHOG_PROJECT_ID
POSTHOG_PROJECT_KEY
POSTHOG_QUERY_HOST
OWNED_RETENTION_ACTIVITY_EVENTS
OWNED_RETENTION_CHECKPOINTS_MS
OWNED_RETENTION_WINDOW_MS
OWNED_RETENTION_MIN_CURVE_POINTS
OWNED_RETENTION_CUTOFF_LAG_HOURS
OWNED_RETENTION_MAX_SOURCE_ROWS
OWNED_RETENTION_MAX_COHORT_USERS
OWNED_RETENTION_IDENTITY_BATCH_SIZE
OWNED_RETENTION_TIMEOUT_SECONDS
```

`POSTHOG_PERSONAL_API_KEY` is preferred. For compatibility, `POSTHOG_API_KEY`
is accepted for queries only when it is a personal key with the `phx_` prefix;
the public `phc_` project key is never treated as a query credential. If no
project ID is configured, discovery succeeds only when `POSTHOG_PROJECT_KEY`
matches exactly one accessible project. The first-party fallback needs no new
credential beyond the existing Supabase service-role configuration. Cohort
identities are queried in bounded batches; row and cohort ceilings fail closed
instead of silently truncating a denominator.

Run a source-complete dry check without writing to the outbox:

```sh
npm run owned-retention:produce -- --health
```

Run one bounded producer pass without the delivery bridge:

```sh
npm run owned-retention:produce
```

The source and target addresses must use HTTPS, except for credential-free
loopback HTTP during integration tests. Put the required values in a private
file owned by the current user and set its mode to `0600`. Do not put secret
values in the launchd property list. The wrapper rejects symlinked, relatively
addressed, differently owned, or group/world-readable environment files. State
database and run-status paths must also be absolute.

`ops/com.everreach.owned-outcome-bridge.plist.example` is an **uninstalled
template**. Replace every `/ABSOLUTE/...` placeholder in a private copy, lint
that copy with `plutil -lint`, and only then install it with the normal per-user
launchd procedure. No launchd job was installed or loaded by this change.

The template schedules one pass every 60 seconds and relies on launchd's
single-job supervision rather than an uncontrolled acquisition loop. Standard
output and errors go only to the explicitly configured private log paths.

Run the health contract in an environment containing the same variables:

```sh
node scripts/owned-outcome-bridge-health.mjs
```

Health is `ok` only when configuration is present, service addresses are safe,
the bridge state database exists, the latest atomic run result is valid and
successful, and that result is no older than the configured maximum age
(default 300 seconds). The health command prints no credential values.
