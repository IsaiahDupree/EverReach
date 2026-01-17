import { buildCorsHeaders, options } from "@/lib/cors";
import { getUser } from "@/lib/auth";

export function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin") ?? undefined;
  // Sanity check: confirm Authorization header reaches the server (prints prefix only)
  try {
    const hdr = req.headers.get('authorization') || req.headers.get('Authorization');
    if (hdr) console.log('[auth hdr]', hdr.slice(0, 20) + '…', 'origin=', req.headers.get('origin'));
    else console.log('[auth hdr] none', 'origin=', req.headers.get('origin'));
  } catch {}
  const user = await getUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
    });
  }
  return new Response(JSON.stringify({ userId: user.id }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) },
  });
}
