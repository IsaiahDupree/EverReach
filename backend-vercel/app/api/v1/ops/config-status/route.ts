import { options, ok, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// GET /api/v1/ops/config-status
// Returns booleans indicating the presence of important envs. Does not expose values.
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const envs = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      EMAIL_FROM: !!process.env.EMAIL_FROM,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      APPLE_ASN_VERIFY: process.env.APPLE_ASN_VERIFY !== undefined,
      APPLE_APPSTORE_KEY_ID: !!process.env.APPLE_APPSTORE_KEY_ID,
      APPLE_APPSTORE_ISSUER_ID: !!process.env.APPLE_APPSTORE_ISSUER_ID,
      APPLE_APPSTORE_BUNDLE_ID: !!process.env.APPLE_APPSTORE_BUNDLE_ID,
      APPLE_APPSTORE_PRIVATE_KEY_or_BASE64: !!process.env.APPLE_APPSTORE_PRIVATE_KEY || !!process.env.APPLE_APPSTORE_PRIVATE_KEY_BASE64,
      PLAY_PACKAGE_NAME: !!process.env.PLAY_PACKAGE_NAME,
      GOOGLE_SERVICE_ACCOUNT_JSON: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    } as const;

    return ok({ envs }, req);
  } catch (e: any) {
    return serverError(e?.message || 'config_status_failed', req);
  }
}
