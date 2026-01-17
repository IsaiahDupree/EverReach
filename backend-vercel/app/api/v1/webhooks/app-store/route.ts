import { options, badRequest, ok, serverError } from "@/lib/cors";
import { getServiceClient } from "@/lib/supabase";
import { recomputeEntitlementsForUser, getProductIdForStoreSku, insertSubscriptionSnapshot } from "@/lib/entitlements";
import { compactVerify, decodeProtectedHeader, importJWK, createRemoteJWKSet, JWTPayload, JWSHeaderParameters } from "jose";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// Forward App Store Connect events to Superwall
async function forwardToSuperwall(eventBody: any): Promise<void> {
  const superwallPk = process.env.SUPERWALL_API_KEY;
  if (!superwallPk) {
    console.warn('[App Store] SUPERWALL_API_KEY not configured, skipping forward');
    return;
  }

  const superwallUrl = `https://superwall.com/api/integrations/app-store-connect/webhook?pk=${superwallPk}`;
  
  try {
    const response = await fetch(superwallUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      console.log('[App Store] Successfully forwarded to Superwall');
    } else {
      console.error(`[App Store] Failed to forward to Superwall: ${response.status} ${response.statusText}`);
    }
  } catch (error: any) {
    console.error('[App Store] Error forwarding to Superwall:', error.message);
  }
}

// POST /api/v1/webhooks/app-store (ASN v2)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.signedPayload !== 'string') {
      return badRequest('Invalid payload: missing signedPayload');
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return serverError('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    // Verification toggle: require verification in prod
    const VERIFY = (process.env.APPLE_ASN_VERIFY || 'true').toLowerCase() === 'true';
    const JWKS_URL = process.env.APPLE_JWKS_URL || 'https://api.storekit.itunes.apple.com/inApps/v1/notifications/jwsKeys';

    let notifPayload: any = null;
    if (VERIFY) {
      try {
        const JWKS = createRemoteJWKSet(new URL(JWKS_URL));
        const verified = await compactVerify(body.signedPayload, JWKS as any);
        const text = new TextDecoder().decode(verified.payload);
        notifPayload = JSON.parse(text);
      } catch (e: any) {
        return badRequest(`Invalid Apple ASN signature: ${e.message || e}`);
      }
    } else {
      // Decode without verification (not recommended). Only enabled if APPLE_ASN_VERIFY=false
      try {
        const parts = body.signedPayload.split('.');
        const text = Buffer.from(parts[1], 'base64url').toString('utf8');
        notifPayload = JSON.parse(text);
      } catch {
        return badRequest('Malformed signedPayload');
      }
    }

    // Extract transaction JWS if present and decode to get productId, originalTransactionId, appAccountToken
    const signedTransactionInfo: string | undefined = notifPayload?.data?.signedTransactionInfo;
    let tx: any = null;
    if (signedTransactionInfo && typeof signedTransactionInfo === 'string') {
      try {
        const parts = signedTransactionInfo.split('.');
        const text = Buffer.from(parts[1], 'base64url').toString('utf8');
        tx = JSON.parse(text);
      } catch {
        // ignore; tx remains null
      }
    }

    const productId: string | null = tx?.productId || null;
    const appAccountToken: string | null = tx?.appAccountToken || null;
    const originalTransactionId: string | null = tx?.originalTransactionId || null;

    const supabase = getServiceClient();

    // Resolve user from appAccountToken mapping on profiles
    let userId: string | null = null;
    if (appAccountToken) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('app_account_token', appAccountToken)
          .maybeSingle();
        userId = (data as any)?.user_id || null;
      } catch {
        // Column may not exist yet; skip linking
        userId = null;
      }
    }

    // Store receipt row only if we can link to a user; otherwise skip (ops can resend when mapping exists)
    if (userId && originalTransactionId) {
      try {
        await supabase.from('store_receipts').insert({
          user_id: userId,
          store: 'app_store',
          external_tx_id: originalTransactionId,
          payload: notifPayload,
        });
      } catch {}

      // Map product
      const logicalProductId = await getProductIdForStoreSku(supabase, 'app_store', productId);
      // Rough status mapping from notification subtype/type if available
      const status: string | null = (notifPayload?.notificationType ? 'active' : null);
      const expiresISO: string | null = tx?.expiresDate ? new Date(Number(tx.expiresDate)).toISOString() : null;

      await insertSubscriptionSnapshot(supabase, {
        userId,
        productId: logicalProductId,
        store: 'app_store',
        storeAccountId: appAccountToken || 'unknown',
        status,
        currentPeriodEndISO: expiresISO,
      });
      await recomputeEntitlementsForUser(supabase, userId);
    }

    // Forward event to Superwall (async, don't block response)
    forwardToSuperwall(body).catch(err => {
      console.error('[App Store] Error in Superwall forward:', err);
    });

    return ok({ received: true, linked: Boolean(userId) });
  } catch (e: any) {
    return serverError(e?.message || 'app-store webhook failure');
  }
}
