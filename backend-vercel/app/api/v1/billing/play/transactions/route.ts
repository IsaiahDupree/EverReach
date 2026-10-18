import { options, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// POST /api/v1/billing/play/transactions
// Body: { obfuscatedAccountId: string, purchaseToken: string, productId: string }
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  // Stub: accept payload but not yet verifying with Google Play
  await req.json().catch(() => ({}));
  return serverError("Not implemented: Play transaction verification", req);
}
