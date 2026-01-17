/**
 * GET /api/v1/contacts/import/health
 * Check which import providers are configured
 */

import { options, ok } from "@/lib/cors";
import { isGoogleConfigured } from "@/lib/google-contacts";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  return ok({
    providers: {
      google: {
        configured: isGoogleConfigured(),
        available: true,
      },
      microsoft: {
        configured: false,
        available: true,
      },
      icloud: {
        configured: false,
        available: false,
      },
    },
  }, req);
}
