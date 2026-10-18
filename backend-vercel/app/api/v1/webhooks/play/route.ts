import { options, badRequest, ok, serverError } from "@/lib/cors";
import { getServiceClient } from "@/lib/supabase";
import { recomputeEntitlementsForUser, getProductIdForStoreSku, insertSubscriptionSnapshot } from "@/lib/entitlements";
import { google } from "googleapis";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// POST /api/v1/webhooks/play (RTDN via Pub/Sub push)
export async function POST(req: Request) {
  try {
    const envelope = await req.json().catch(() => null);
    if (!envelope || typeof envelope !== 'object' || !envelope.message?.data) {
      return badRequest('Invalid Pub/Sub envelope');
    }

    // Decode base64 data
    let payload: any = null;
    try {
      const decoded = Buffer.from(envelope.message.data, 'base64').toString('utf8');
      payload = JSON.parse(decoded);
    } catch {
      return badRequest('Invalid RTDN message payload');
    }

    const subscriptionId: string | null = payload?.subscriptionNotification?.subscriptionId || null;
    const purchaseToken: string | null = payload?.subscriptionNotification?.purchaseToken || null;

    if (!subscriptionId || !purchaseToken) {
      return ok({ received: true, linked: false, reason: 'no-subscription-or-token' });
    }

    const PLAY_PACKAGE_NAME = requireEnv('PLAY_PACKAGE_NAME');
    const SERVICE_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!SERVICE_JSON) {
      return serverError('Server misconfigured: GOOGLE_SERVICE_ACCOUNT_JSON not set');
    }

    const credentials = JSON.parse(SERVICE_JSON);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
    // Pass the GoogleAuth instance directly; typings accept GoogleAuth<JSONClient>
    const publisher = google.androidpublisher({ version: 'v3', auth });

    // Verify subscription via Google Play Developer API
    const resp = await publisher.purchases.subscriptions.get({
      packageName: PLAY_PACKAGE_NAME,
      subscriptionId,
      token: purchaseToken,
    });

    const data = resp.data || {} as any;
    const expiryMs = Number(data.expiryTimeMillis || 0);
    const currentPeriodEndISO = expiryMs ? new Date(expiryMs).toISOString() : null;
    const nowMs = Date.now();
    let status: string | null = null;
    if (expiryMs && expiryMs > nowMs) status = 'active';
    if (data.cancelReason != null) status = 'canceled';

    const supabase = getServiceClient();

    // Try to link user via obfuscated account id if present
    let userId: string | null = null;
    const obfuscatedId: string | null = data.obfuscatedExternalAccountId || null;
    if (obfuscatedId) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('play_obfuscated_account_id', obfuscatedId)
          .maybeSingle();
        userId = (prof as any)?.user_id || null;
      } catch {}
    }

    if (userId) {
      // Store receipt
      try {
        await supabase.from('store_receipts').insert({
          user_id: userId,
          store: 'play',
          external_tx_id: purchaseToken,
          payload,
        });
      } catch {}

      // Map product and snapshot subscription
      const logicalProductId = await getProductIdForStoreSku(supabase, 'play', subscriptionId);
      await insertSubscriptionSnapshot(supabase, {
        userId,
        productId: logicalProductId,
        store: 'play',
        storeAccountId: obfuscatedId || 'unknown',
        status,
        currentPeriodEndISO,
      });

      await recomputeEntitlementsForUser(supabase, userId);
    }

    return ok({ received: true, linked: Boolean(userId) });
  } catch (e: any) {
    return serverError(e?.message || 'play webhook failure');
  }
}
