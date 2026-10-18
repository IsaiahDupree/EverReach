import { NextRequest } from 'next/server';
import { options, ok } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

/**
 * GET /v1/contacts/import/health
 * 
 * Check OAuth configuration status for all providers
 * 
 * Returns which providers are properly configured
 */
export async function GET(req: NextRequest) {
  const providers = {
    google: {
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      client_id_set: !!process.env.GOOGLE_CLIENT_ID,
      client_secret_set: !!process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://ever-reach-be.vercel.app'}/api/v1/contacts/import/google/callback`,
      setup_url: 'https://console.cloud.google.com/',
    },
    microsoft: {
      configured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
      client_id_set: !!process.env.MICROSOFT_CLIENT_ID,
      client_secret_set: !!process.env.MICROSOFT_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://ever-reach-be.vercel.app'}/api/v1/contacts/import/microsoft/callback`,
      setup_url: 'https://portal.azure.com/',
    },
  };

  const allConfigured = providers.google.configured && providers.microsoft.configured;

  return ok({
    status: allConfigured ? 'healthy' : 'partial',
    providers,
    message: allConfigured
      ? 'All OAuth providers configured'
      : 'Some providers missing configuration. Check provider details.',
  }, req);
}
