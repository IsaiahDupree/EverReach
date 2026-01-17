import { jwtVerify, decodeProtectedHeader, decodeJwt } from 'jose';

export type User = { id: string } | null;

const enc = new TextEncoder();

export async function getUser(req: Request): Promise<User> {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error('[auth] SUPABASE_JWT_SECRET not set');
    return null;
  }

  // Fast-path reject non-HS256 tokens (e.g., Google ID tokens are RS256)
  try {
    const header = decodeProtectedHeader(token);
    if (header?.alg && header.alg !== 'HS256') {
      let iss: string | undefined;
      try { iss = decodeJwt(token)?.iss as string | undefined; } catch {}
      console.warn(`[auth] unsupported token alg=${header.alg}${iss ? ` iss=${iss}` : ''} — expected HS256 Supabase access token`);
      return null;
    }
  } catch {
    // If header can't be decoded, fall through to verification which will fail
  }

  try {
    const { payload } = await jwtVerify(token, enc.encode(secret), {
      algorithms: ['HS256'],
      audience: 'authenticated',
      // Optionally enforce issuer if desired:
      // issuer: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1` : undefined,
    });
    const sub = payload?.sub;
    if (!sub || typeof sub !== 'string') return null;
    return { id: sub };
  } catch (e: any) {
    console.error('[auth] jwt verify failed:', e?.message);
    return null;
  }
}
