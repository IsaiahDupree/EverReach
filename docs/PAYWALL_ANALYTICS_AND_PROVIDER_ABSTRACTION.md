# 🧭 Paywall Analytics + Provider Abstraction (Superwall + RevenueCat)

Status: Draft for implementation  
Last updated: Nov 14, 2025

---

## 🎯 Goals

- Single dashboard to monitor paywall performance across providers (Superwall, RevenueCat, custom web)
- Unified event model: impressions, dismissals, purchases, restores, skips, errors
- Enable A/B testing across providers and within a provider
- Central config management to choose provider per placement and variant
- Cross-platform (iOS, Android, Expo, Web) with clean adapter pattern

---

## 🔌 Provider Abstraction

Define a thin interface used by mobile/web apps.

```ts
export interface PaywallAdapter {
  init(options: { platform: 'ios'|'android'|'web'; debug?: boolean }): Promise<void>
  identify(userId: string, attrs?: Record<string, any>): Promise<void>
  setAttributes(attrs: Record<string, any>): Promise<void>
  presentPlacement(args: {
    placement: string
    params?: Record<string, any>
    onPresent?: (info: NormalizedPaywallInfo) => void
    onDismiss?: (info: NormalizedPaywallInfo, result: NormalizedPaywallResult) => void
    onSkip?: (reason: NormalizedSkipReason) => void
    onError?: (error: string) => void
    feature?: () => void
  }): Promise<void>
  subscribeEvents(cb: (evt: NormalizedEvent) => void): () => void
}
```

Adapters:
- SuperwallAdapter (expo-superwall)
- RevenueCatAdapter (react-native-purchases + RevenueCat Paywalls OR local UI + RC purchases)
- CustomWebAdapter (existing PaywallGate + Stripe)

App selects adapter per placement from backend config.

---

## 🧪 Adapter Usage in App (Example)

```typescript
import { Platform } from 'react-native';

async function presentPaywall(placement: string) {
  const res = await fetch(`${API_BASE}/v1/paywalls/config?placement=${placement}`);
  const cfg = await res.json();

  const adapter =
    cfg.provider === 'superwall' && Platform.OS !== 'web'
      ? superwallAdapter
      : cfg.provider === 'revenuecat' && Platform.OS !== 'web'
      ? revenueCatAdapter
      : customWebAdapter;

  await adapter.presentPlacement({ placement, params: cfg.metadata?.params, feature: () => unlockFeature() });
}
```

---

## 🧱 Normalized Event Model

```ts
// Core
type Provider = 'superwall' | 'revenuecat' | 'custom';

type NormalizedEvent = {
  provider: Provider
  type:
    | 'paywall_present' | 'paywall_dismiss' | 'paywall_skip' | 'paywall_error'
    | 'transaction_start' | 'transaction_complete' | 'transaction_fail' | 'transaction_restore'
    | 'subscription_status_change'
  placement?: string
  paywallId?: string
  variantId?: string
  experimentId?: string
  productId?: string
  platform: 'ios'|'android'|'web'
  userId?: string
  ts: string // ISO
  params?: Record<string, any>
};

// Presentation results
type NormalizedPaywallResult = { type: 'purchased'; productId: string } | { type: 'declined' } | { type: 'restored' };

// Skip reasons
type NormalizedSkipReason = 'Holdout' | 'NoAudienceMatch' | 'PlacementNotFound' | 'AlreadySubscribed' | 'Error';

// Paywall info (subset)
type NormalizedPaywallInfo = {
  id?: string
  name?: string
  products?: { id: string; entitlements?: string[] }[]
  experimentId?: string
  variantId?: string
  featureGating?: 'gated'|'nonGated'
};
```

Mapping:
- Superwall → map from `useSuperwallEvents` and `usePlacement` (see docs/SUPERWALL_IMPLEMENTATION_GUIDE.md)
- RevenueCat → client-side: paywall exposure events (if using RC Paywalls) + server-side: webhook purchase/renewal events
- Custom web → existing PaywallGate emits impression/dismiss/purchase-intent

---

## 🔎 Superwall Event Mapping (Details)

Map expo-superwall events (via `useSuperwallEvents`) into NormalizedEvent:

- `willPresentPaywall` / `onPaywallPresent` → `paywall_present`
  - params: `{ paywallId: info.identifier, experimentId: info.experiment?.id, variantId: info.experiment?.variant.id }`
- `onPaywallDismiss` → `paywall_dismiss`
  - params: `{ result: result.type }`
- `onPaywallSkip` → `paywall_skip`
  - params: `{ reason: reason.type }`
- `handleSuperwallEvent`
  - `transactionStart` → `transaction_start`
  - `transactionComplete` → `transaction_complete`
  - `transactionFail` → `transaction_fail`
  - `transactionRestore` → `transaction_restore`
  - `subscriptionStatusDidChange` → `subscription_status_change`

Adapter emission example:

```ts
useSuperwallEvents({
  onPaywallPresent: (info) => emit({ type: 'paywall_present', paywallId: info.identifier, provider: 'superwall' }),
  onPaywallDismiss: (info, result) => emit({ type: 'paywall_dismiss', paywallId: info.identifier, params: { result: result.type }, provider: 'superwall' }),
  onPaywallSkip: (reason) => emit({ type: 'paywall_skip', params: { reason: reason.type }, provider: 'superwall' }),
  onSuperwallEvent: ({ event, params }) => {
    switch (event.event) {
      case 'transactionStart':
        emit({ type: 'transaction_start', productId: params?.product?.id, provider: 'superwall' });
        break;
      case 'transactionComplete':
        emit({ type: 'transaction_complete', productId: params?.product?.id, provider: 'superwall' });
        break;
      case 'transactionFail':
        emit({ type: 'transaction_fail', provider: 'superwall', params });
        break;
      case 'subscriptionStatusDidChange':
        emit({ type: 'subscription_status_change', provider: 'superwall', params });
        break;
    }
  },
});
```

---

## 🧰 SuperwallAdapter (Pseudo-implementation)

```ts
class SuperwallAdapter implements PaywallAdapter {
  async init({ platform, debug }: { platform: 'ios'|'android'|'web'; debug?: boolean }) {
    // configure provider via <SuperwallProvider> in app root; set log level using useSuperwall().setLogLevel
  }
  async identify(userId: string, attrs?: Record<string, any>) {
    const { identify, update } = useUser();
    await identify(userId);
    if (attrs) await update((old) => ({ ...old, ...attrs }));
  }
  async setAttributes(attrs: Record<string, any>) {
    const sw = useSuperwall();
    await sw.setUserAttributes(attrs);
  }
  async presentPlacement(args: { placement: string; params?: Record<string, any>; feature?: () => void }) {
    const { registerPlacement } = usePlacement();
    await registerPlacement({ placement: args.placement, params: args.params, feature: args.feature });
  }
  subscribeEvents(cb: (evt: NormalizedEvent) => void) { /* useSuperwallEvents and map to cb */ return () => {}; }
}
```

---

## 🧰 RevenueCatAdapter (Pseudo-implementation)

```ts
import Purchases from 'react-native-purchases';

class RevenueCatAdapter implements PaywallAdapter {
  async init({ platform }: { platform: 'ios'|'android'|'web' }) {
    if (platform === 'web') return; // web uses Stripe flow (see payments.web.ts)
    await Purchases.configure({ apiKey: RC_API_KEY });
  }
  async identify(userId: string, attrs?: Record<string, any>) {
    await Purchases.logIn(userId);
    if (attrs) await Purchases.setAttributes(attrs);
  }
  async setAttributes(attrs: Record<string, any>) {
    await Purchases.setAttributes(attrs);
  }
  async presentPlacement(args: { placement: string; params?: Record<string, any>; feature?: () => void }) {
    // Fetch offering mapped to placement from backend config
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    // App decides UI: either present RC Paywall UI or custom sheet listing packages
    // Example purchase (custom UI)
    const pkg = current?.availablePackages?.[0];
    if (pkg) {
      try {
        emit({ type: 'transaction_start', provider: 'revenuecat', productId: pkg.product.identifier });
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        emit({ type: 'transaction_complete', provider: 'revenuecat', productId: pkg.product.identifier });
        if (customerInfo.entitlements.active && args.feature) args.feature();
      } catch (e: any) {
        emit({ type: 'transaction_fail', provider: 'revenuecat', params: { code: e?.code } });
      }
    }
  }
  subscribeEvents(cb: (evt: NormalizedEvent) => void) {
    // RC SDK doesn't broadcast paywall present/dismiss; emit around UI presentation in app
    // For subscription status, poll getCustomerInfo() on app resume and emit subscription_status_change
    return () => {};
  }
}
```

---

## 🗃️ Supabase Schema (Analytics)

Tables (DDL summarized):

- paywall_events
  - id (uuid, pk), org_id, user_id, provider, platform, placement
  - event_type (text)
  - paywall_id, variant_id, experiment_id, product_id
  - session_id, ts timestamptz, params jsonb
  - indexes: (org_id, ts), (org_id, placement, ts), (org_id, provider, event_type, ts)

- purchase_events
  - id, org_id, user_id, provider, platform, store ('app_store'|'play'|'stripe'|'unknown')
  - event ('initial_purchase'|'renewal'|'cancellation'|'billing_issue'|'non_renewing'|'trial_started'|'refund')
  - product_id, price, currency, is_trial, is_intro, is_upgrade
  - rc_transaction_id, original_transaction_id
  - ts timestamptz, raw jsonb
  - indexes: (org_id, ts), (org_id, product_id, ts)

- paywall_config
  - id, org_id, placement (text), provider (text), provider_config_id (text)
  - enabled boolean, rollout_percent int, variant_key text
  - metadata jsonb

Materialized views:
- mv_paywall_funnels_by_day (org_id, date, placement, provider, impressions, dismissals, purchases, conversion_rate)
- mv_experiment_variants (org_id, placement, provider, experiment_id, variant_id, impressions, purchases, cr, ci_low, ci_high, winner boolean)

---

## 🧾 Example Supabase DDL (Sketch)

```sql
create table if not exists paywall_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid,
  provider text check (provider in ('superwall','revenuecat','custom')) not null,
  platform text check (platform in ('ios','android','web')) not null,
  placement text,
  event_type text not null,
  paywall_id text,
  variant_id text,
  experiment_id text,
  product_id text,
  session_id text,
  ts timestamptz not null default now(),
  params jsonb default '{}'
);
create index on paywall_events (org_id, ts desc);
create index on paywall_events (org_id, placement, ts desc);
create index on paywall_events (org_id, provider, event_type, ts desc);

create table if not exists purchase_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid,
  provider text not null,
  platform text,
  store text,
  event text not null,
  product_id text,
  price numeric,
  currency text,
  rc_transaction_id text,
  original_transaction_id text,
  ts timestamptz not null default now(),
  raw jsonb
);
create index on purchase_events (org_id, ts desc);
create index on purchase_events (org_id, product_id, ts desc);
```

Add RLS by `org_id` and a view limited for the current tenant (consistent with existing project patterns).

```sql
-- Enable RLS
alter table paywall_events enable row level security;
alter table purchase_events enable row level security;

-- Assume current tenant is set via: set local app.tenant_id = '<org-uuid>';
create policy "tenant_select_paywall_events" on paywall_events
  for select using (org_id::text = current_setting('app.tenant_id', true));
create policy "tenant_insert_paywall_events" on paywall_events
  for insert with check (org_id::text = current_setting('app.tenant_id', true));

create policy "tenant_select_purchase_events" on purchase_events
  for select using (org_id::text = current_setting('app.tenant_id', true));
create policy "tenant_insert_purchase_events" on purchase_events
  for insert with check (org_id::text = current_setting('app.tenant_id', true));
```

---

## 🌐 Backend Endpoints

Public (admin-auth via existing middleware):
- GET /v1/analytics/paywalls/overview?from&to&placement&provider
- GET /v1/analytics/paywalls/experiments?from&to
- GET /v1/analytics/paywalls/events?cursor=… (paginated)

Ingest:
- POST /v1/analytics/paywalls/events
  - Body: NormalizedEvent[] | NormalizedEvent
- POST /v1/webhooks/revenuecat
  - Verify secret, upsert `purchase_events`
  - Event types: INITIAL_PURCHASE, RENEWAL, CANCELLATION, BILLING_ISSUE, PRODUCT_CHANGE, TRIAL_STARTED, REFUND
- (Optional) POST /v1/webhooks/superwall
  - If using SW server webhooks. Otherwise rely on client events.

Config:
- GET /v1/paywalls/config?placement=ai_chat_access → { provider, provider_config_id, rollout_percent, variant_key }
- PATCH /v1/paywalls/config/:id (admin)

Notes
- Respect branching rule: implement in feat/backend-vercel-only-clean.
- RLS by org_id.

---

## 📊 Dashboard (Option A)

Route: /admin/paywalls (or /dashboard/paywalls)

Widgets:
- **Active Experiments**: table of placement/provider → variants (A/B), impressions, purchases, CR, CI, winner flag
- **Conversion by Placement**: bar chart (CR %) across providers
- **Impressions / Dismissals**: time series line chart with filters (provider, platform)
- **Purchases by Product**: bar/line segmented by trial vs paid
- **Event Stream**: latest 100 events

Winner Detection:
- Use Wilson score interval (95%) for variant CR
- Winner if intervals don’t overlap and min sample size threshold (e.g., >500 impressions per variant)

Filters:
- Date range, provider, platform, placement

---

## 🧪 Provider Config Management

- Dashboard manages `paywall_config` rows (placement → provider + provider_config_id)
- Frontend fetches /v1/paywalls/config?placement=… before presenting
- Allows A/B: set rollout_percent and variant_key (client can randomize or server assigns variant)
- Exchange configs: support both Superwall and RevenueCat Paywalls for the same placement by changing provider in config

---

## 🧾 Provider Config Metadata (Schema)

Store provider-specific metadata in `paywall_config.metadata`:

- For Superwall
  - `{ sw: { placement: 'ai_chat_access', paywallId?: 'pw_...', experimentGroupId?: 'exp_group_...' } }`
- For RevenueCat Paywalls
  - `{ rc: { offering: 'default', paywallId?: 'rc_pw_...', packageId?: 'annual', productId?: 'com.app.pro.annual' } }`
- For Custom Web
  - `{ web: { template: 'v2', variantKey: 'A' } }`

Client fetches `/v1/paywalls/config?placement=x` and selects adapter + fills params from metadata.

---

## 🔐 RevenueCat Integration (Research Summary)

SDKs:
- React Native: `react-native-purchases` (Expo dev builds required)
- iOS: `purchases-ios`
- Android: `purchases-android`
- Web: use Stripe or the `expo-web-billing-demo` tutorial repo

Client APIs (RN):
- `Purchases.configure({ apiKey })`
- `Purchases.getOfferings()`
- `Purchases.purchasePackage()` / `purchaseProduct()`
- `Purchases.restorePurchases()`
- `Purchases.getCustomerInfo()`
- `Purchases.logIn(userId)` / `logOut()`
- `Purchases.setAttributes({ ... })`

Webhooks (server):
- Events include: INITIAL_PURCHASE, RENEWAL, CANCELLATION, BILLING_ISSUE, PRODUCT_CHANGE, TRIAL_STARTED, REFUND
- Use webhook secret verification; map to `purchase_events`

Paywalls:
- RevenueCat Paywalls product supports remote-configured paywalls
- Exposure events captured client-side; conversions via webhooks

---

## 🔔 RevenueCat Webhook Normalization

We normalize RevenueCat webhook events into `purchase_events` and (optionally) `paywall_events`:

- `INITIAL_PURCHASE` → purchase_events(event='initial_purchase')
- `RENEWAL` → purchase_events(event='renewal')
- `CANCELLATION` → purchase_events(event='cancellation')
- `BILLING_ISSUE` → purchase_events(event='billing_issue')
- `PRODUCT_CHANGE` → purchase_events(event='product_change')
- `TRIAL_STARTED` → purchase_events(event='trial_started')
- `REFUND` → purchase_events(event='refund')

Essential fields captured:
- `user_id` (our app user identifier, if set via RC logIn)
- `original_app_user_id` (RC’s customer identity)
- `product_id`, `price`, `currency`
- `store` (app_store | play | stripe | unknown)
- `transaction_id`, `original_transaction_id`
- `purchased_at`, `expires_at` (if applicable)
- full `raw` JSON payload for forensics

Security:
- Require shared secret validation and constant-time comparison
- Enforce timestamp freshness window
- Rate-limit endpoint and log request IDs for audit

---

## 📈 PostHog / Analytics Mapping

Normalize analytics event names and properties:

- Name: `sw:paywall_present`, `sw:transaction_complete`, `rc:initial_purchase`, `rc:renewal`, `web:paywall_present`, etc.
- Common props: `{ placement, provider, platform, paywallId, variantId, experimentId, productId }`
- User aliasing: use stable `userId` (do not send PII beyond ID); optionally send hashed email if needed
- Batch/queue client emissions; fallback to retry with backoff

---

## 🧮 Winner Detection (Wilson Score)

For each variant: `cr = purchases / impressions`.
Wilson 95% CI:

```ts
function wilson(p: number, n: number) {
  const z = 1.96;
  const denom = 1 + (z*z)/n;
  const center = p + (z*z)/(2*n);
  const margin = z * Math.sqrt((p*(1-p)/n) + (z*z)/(4*n*n));
  return { low: (center - margin)/denom, high: (center + margin)/denom };
}
```

Winner rule: minimal sample size (e.g., 500 impressions per variant) and non-overlapping CIs.

---

## 📡 Dashboard API: Example Responses

`GET /v1/analytics/paywalls/overview?from=…&to=…` →

```json
{
  "series": [{ "date": "2025-11-14", "placement": "ai_chat_access", "provider": "superwall", "impressions": 1200, "dismissals": 800, "purchases": 96, "cr": 0.08 }],
  "totals": { "impressions": 1200, "dismissals": 800, "purchases": 96, "cr": 0.08 }
}
```

`GET /v1/analytics/paywalls/experiments` →

```json
{
  "rows": [
    { "placement": "ai_chat_access", "provider": "superwall", "experimentId": "exp1", "variantId": "A", "impressions": 600, "purchases": 60, "cr": 0.1, "ci": {"low": 0.08, "high": 0.12}, "winner": true },
    { "placement": "ai_chat_access", "provider": "superwall", "experimentId": "exp1", "variantId": "B", "impressions": 600, "purchases": 36, "cr": 0.06, "ci": {"low": 0.045, "high": 0.075}, "winner": false }
  ]
}
```

---

## 🌐 Platform Notes (Expo/Web/iOS/Android)

- Expo
  - Superwall works on native; gate provider initialization behind `Platform.OS !== 'web'`
  - RevenueCat requires dev builds; use `react-native-purchases` with EAS
- Web
  - If adopting RC Web Billing, mirror `lib/payments.native.ts` vs `lib/payments.web.ts` structure
  - Use Stripe Checkout/Payment Links; normalize events the same way
- iOS/Android
  - Use store test accounts and sandbox environments
  - Ensure webhook events reconcile with client events (server is source of truth)

---

## 🧪 Observability & Rate Limits

- Log request_id for each ingest/webhook; include org_id, provider, event_type.
- Return 2xx for idempotent duplicates; drop with idempotency keys/hashes.
- Rate limit client ingest per org and per IP.
- Add health check to dashboard cards; show “stale data” banner if MVs older than X minutes.

---

## 🗄️ Data Retention & Rollups

- Keep raw `paywall_events` for 90 days; archive beyond.
- Keep `purchase_events` for 2 years (financial relevance).
- Nightly job: refresh materialized views; weekly: compute cohort CR snapshots.
- Endpoint performance budget: overview ≤ 400ms P95, events pagination ≤ 200ms page.

---

## 📌 Open Questions

- Will we use RevenueCat Paywalls UI or custom UI with Offerings? (affects exposure event capture)
- Do we need Superwall server webhooks, or are client events sufficient initially?
- Assignment source of truth: client vs server? (recommend server)
- Do we unify receipt validation in backend or rely on RC webhooks + SW client state?

---

## 🎯 Experiment Assignment & Stickiness

- Assignment: server returns `{ variant_key: 'A'|'B', rollout_percent }` per placement.
- Stickiness: persist variant in local storage / secure storage keyed by user + placement.
- Cross-device: optionally persist assignment server-side keyed by user_id.
- Sampling: ensure uniform distribution; avoid mid-experiment changes.

---

## 📥 Ingest Payload Examples

Client → `POST /v1/analytics/paywalls/events`

```json
{
  "provider": "superwall",
  "type": "paywall_present",
  "platform": "ios",
  "placement": "ai_chat_access",
  "paywallId": "pw_123",
  "variantId": "A",
  "experimentId": "exp_1",
  "ts": "2025-11-14T22:01:00Z",
  "params": { "source": "chat_tab" }
}
```

RevenueCat Webhook → `POST /v1/webhooks/revenuecat`

```json
{
  "event": "INITIAL_PURCHASE",
  "api_version": "1.0",
  "product_id": "com.app.pro.annual",
  "price": 99.99,
  "currency": "USD",
  "store": "app_store",
  "app_user_id": "user_123",
  "transaction_id": "100000100",
  "purchased_at_ms": 1731620000000
}
```

Server maps and stores into `purchase_events`.

---

## 🚚 Implementation Phases

Phase 0 (30 min)
- Add docs + keys checklist (Option B)
- Create `paywall_config` table migration (stub) and endpoints spec doc

Phase 1 (2-3 h, Option A)
- Create `paywall_events`, `purchase_events` tables + basic ingest endpoints
- Add simple /admin/paywalls page with 3 charts + event table

Phase 2 (1-2 h)
- Add RevenueCat webhook handler and purchase mapping
- Materialized views + winner detection

Phase 3 (1-2 h)
- Provider abstraction in mobile (SuperwallAdapter now, RC adapter stub)
- Placement config fetch before present

---

## 📝 Notes & Guardrails

- Don’t overwrite .env; store secrets in secure backend settings (Supabase secrets / Vercel env)
- Keep dev/test/prod env separation in tables and endpoints
- Do not duplicate logic across providers; use normalization layer
- Start with `ai_chat_access` as pilot
- Branch: `feat/backend-vercel-only-clean`

---

## ✅ Deliverables

- Supabase migrations (3 tables + 2 MVs)
- Ingest endpoints + RevenueCat webhook
- Admin dashboard page with charts
- Provider adapters + config fetch in mobile
- Documentation (this file + quickstart keys guide)

---

## 🧭 Architecture Flow (Text Diagram)

```text
[App (mobile/web)]
  ↓ fetch /v1/paywalls/config?placement=…
[Adapter selection]
  ↓ present paywall via Superwall | RevenueCat | Custom
  ↳ emit normalized client events → POST /v1/analytics/paywalls/events

[Stores / RC]
  ↳ purchases/renewals/cancellations → RevenueCat Webhook → /v1/webhooks/revenuecat

[Supabase]
  ↳ paywall_events, purchase_events
  ↳ mv_paywall_funnels_by_day, mv_experiment_variants

[Dashboard]
  ↳ GET /v1/analytics/paywalls/overview | /experiments | /events
```

---

## 🧾 Event Taxonomy (Mapping Cheatsheet)

- **Presentation**
  - Superwall: `onPaywallPresent` → `paywall_present`
  - RevenueCat UI (if used): emit from UI wrapper → `paywall_present`
  - Custom: PaywallGate on open → `paywall_present`

- **Dismiss/Skip/Error**
  - SW: `onPaywallDismiss` → `paywall_dismiss`
  - SW: `onPaywallSkip` → `paywall_skip`
  - Any SDK errors → `paywall_error`

- **Transactions**
  - SW client: `transactionStart|Complete|Fail|Restore` → normalized
  - RC client: emit around `purchasePackage()` success/failure
  - RC server: webhook → `purchase_events`

- **Subscription Status**
  - SW: `subscriptionStatusDidChange` → normalized
  - RC: poll `getCustomerInfo()` on app resume; compare entitlement → normalized
  - RC entitlements → map active entitlement to our business tier using `products_map`

---

## 🧮 Example SQL: Funnels & Experiments (MVs)

```sql
create materialized view if not exists mv_paywall_funnels_by_day as
select
  org_id,
  date_trunc('day', ts) as day,
  placement,
  provider,
  count(*) filter (where event_type = 'paywall_present') as impressions,
  count(*) filter (where event_type = 'paywall_dismiss') as dismissals,
  count(*) filter (where event_type = 'transaction_complete') as purchases,
  case when count(*) filter (where event_type = 'paywall_present') > 0
       then (count(*) filter (where event_type = 'transaction_complete')::decimal /
             count(*) filter (where event_type = 'paywall_present'))
       else 0 end as conversion_rate
from paywall_events
group by 1,2,3,4;

create materialized view if not exists mv_experiment_variants as
select org_id, placement, provider, experiment_id, variant_id,
  count(*) filter (where event_type = 'paywall_present') as impressions,
  count(*) filter (where event_type = 'transaction_complete') as purchases,
  case when count(*) filter (where event_type = 'paywall_present') > 0 then
    (count(*) filter (where event_type = 'transaction_complete')::decimal /
     count(*) filter (where event_type = 'paywall_present')) else 0 end as cr
from paywall_events
where experiment_id is not null and variant_id is not null
group by 1,2,3,4,5;
```

Refresh cadence via cron functions; add additional columns for CI if desired.

---

## 📑 API Examples: Events + Config

- `GET /v1/analytics/paywalls/events?from=…&to=…&provider=superwall&placement=ai_chat_access&limit=100&cursor=…`
  - Response:
  ```json
  { "items": [
      { "ts": "2025-11-14T22:00:01Z", "type": "paywall_present", "placement": "ai_chat_access", "provider": "superwall", "platform": "ios" }
    ],
    "nextCursor": "eyJvZmZzZXQiOjEwMH0=" }
  ```

- `GET /v1/paywalls/config?placement=ai_chat_access`
  - Response:
  ```json
  { "placement": "ai_chat_access", "provider": "superwall", "provider_config_id": "sw_ai_chat_access",
    "rollout_percent": 100, "variant_key": "A",
    "metadata": { "sw": { "placement": "ai_chat_access" } } }
  ```

---

## 📜 OpenAPI Snippets (YAML)

```yaml
paths:
  /v1/analytics/paywalls/events:
    post:
      summary: Ingest normalized paywall events
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/NormalizedEvent'
                - type: array
                  items: { $ref: '#/components/schemas/NormalizedEvent' }
      responses:
        '200': { description: OK }
  /v1/paywalls/config:
    get:
      parameters:
        - in: query
          name: placement
          schema: { type: string }
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PaywallConfig' }
components:
  schemas:
    NormalizedEvent:
      type: object
      properties:
        provider: { type: string, enum: [superwall, revenuecat, custom] }
        type: { type: string }
        placement: { type: string }
        platform: { type: string, enum: [ios, android, web] }
        paywallId: { type: string }
        variantId: { type: string }
        experimentId: { type: string }
        productId: { type: string }
        ts: { type: string, format: date-time }
        params: { type: object, additionalProperties: true }
    PaywallConfig:
      type: object
      properties:
        placement: { type: string }
        provider: { type: string }
        provider_config_id: { type: string }
        rollout_percent: { type: integer }
        variant_key: { type: string }
        metadata: { type: object, additionalProperties: true }
```

---

## 🚀 Client Event Emitter Helper (TypeScript)

```ts
type EmitEvent = Omit<NormalizedEvent, 'ts'> & { ts?: string };

export function createEmitter({ orgId, baseUrl }: { orgId: string; baseUrl: string }) {
  const queue: EmitEvent[] = [];
  let sending = false;

  async function flush() {
    if (sending || queue.length === 0) return;
    sending = true;
    const batch = queue.splice(0, 50);
    try {
      await fetch(`${baseUrl}/v1/analytics/paywalls/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Org-Id': orgId },
        body: JSON.stringify(batch.map(e => ({ ...e, ts: e.ts ?? new Date().toISOString() }))),
      });
    } catch (_) {
      // exponential backoff retry
      queue.unshift(...batch);
      setTimeout(flush, 1000 + Math.random()*1000);
    } finally {
      sending = false;
    }
  }

  function emit(e: EmitEvent) {
    queue.push(e);
    if (!sending) setTimeout(flush, 0);
  }

  return { emit };
}
```

---

## 🔒 Security & Compliance

- Webhooks: HMAC validation, timestamp freshness, IP allowlist optional.
- PII: avoid sending emails/phones in events; use stable user_id.
- Multi-tenant: strict RLS on all tables by org_id; audit logs for admin reads.
- Secrets: store provider keys in secure settings; rotate regularly.

---

## ✅ Test Plan (Smoke + E2E)

- Client Events
  - Present paywall on iOS/Android; verify `paywall_present` stored.
  - Complete/abandon purchase; verify `transaction_*` stored.

- Webhooks
  - Send RC webhook fixtures for each event type; verify `purchase_events` rows.

- Dashboard
  - Charts render within 400ms P95; event stream paginates.

- A/B Winner
  - Seed synthetic events to create non-overlapping CIs; winner flags correct.

---

## 🧰 Operations Runbook

- If events drop: check ingest rate limits, Supabase errors, PostHog queue.
- If webhooks fail: validate secret mismatch, clock skew, retry backoff status.
- If charts stale: refresh MVs, inspect cron logs, reindex heavy tables.
- If outliers in CR: review double-count guard, duplicate impression dedup keys.

---

## 🔗 Cross-Provider Attribution Strategy

We attribute server-side purchases (RevenueCat webhooks) to client paywall exposures using a session.

- Create `paywall_sessions` to track each exposure and outcome.
- Link purchase_events to the most recent session matching `(org_id, user_id, product_id)` within X hours (e.g., 24h).
- Fall back to `(org_id, user_id)` if product unknown, with tighter window (e.g., 2h).

```sql
create table if not exists paywall_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid,
  provider text not null,
  placement text,
  paywall_id text,
  product_id text,
  started_at timestamptz not null,
  dismissed_at timestamptz,
  result text, -- 'purchased' | 'declined' | 'skipped' | null
  params jsonb default '{}'
);
```

Attribution algorithm:

1. On `paywall_present`: insert session (started_at = ts).
2. On `paywall_dismiss`/`paywall_skip`: update session dismissed_at/result.
3. On webhook purchase: find latest session for `(org_id,user_id,product_id)` within 24h and mark `result='purchased'`.

---

## 🧩 Product Mapping Table

Normalize cross-store SKUs to business products.

```sql
create table if not exists products_map (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  business_product text not null, -- e.g., 'pro_annual'
  rc_product_id text,
  sw_product_id text,
  app_store_sku text,
  play_sku text,
  stripe_price_id text,
  metadata jsonb
);
```

Use this table to unify analytics and SKU reporting.

---

## 🧷 Developer Dashboard Integration

- Reuse existing Feature Flags / Experiments system to flip provider per placement.
- Store `paywall_config` in admin UI with validation against provider metadata.
- Expose an audit log for config changes (who/when/what) to ensure experiment hygiene.

---

## 📦 SDK Version Matrix (minimums)

- Superwall Expo SDK: latest (per expo-superwall)
- RevenueCat RN Purchases: React Native ≥ 0.73.0; Android Kotlin ≥ 1.8.0
- iOS: `purchases-ios` latest stable; Android: `purchases-android` latest stable

Keep pinned minor versions in package.json for stability; update quarterly.

---

## 🧾 Webhook Verification (TypeScript pseudocode)

```ts
import crypto from 'crypto';

export function verifyHmac({ body, header, secret }: { body: string; header: string; secret: string }) {
  const pairs = Object.fromEntries(header.split(',').map(p => p.split('=')));
  const ts = Number(pairs.t);
  if (Math.abs(Date.now()/1000 - ts) > 300) return false; // 5 min window
  const expected = crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(pairs.v1, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

---

## 🚦 Rate Limit & Retry Policy

- Client ingest: 600/min per API key, 60/min per IP; burst allowed 2× within 10s.
- Webhooks: accept at least 10 req/s; retry with exponential backoff on 5xx.
- Idempotency: hash of `(org_id, provider, type, placement, paywall_id, product_id, ts bucket)`.
