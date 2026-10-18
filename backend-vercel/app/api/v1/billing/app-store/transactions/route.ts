import { options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// POST /api/v1/billing/app-store/transactions
// Body: { appAccountToken: string, transactionJWS: string }
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  // Stub: accept payload but not yet verifying with Apple
  const body = await req.json().catch(() => ({}));
  return serverError("Not implemented: Apple transaction verification", req);
}
