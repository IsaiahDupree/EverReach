import 'server-only';
import { jwtVerify } from 'jose';

export type User = { id: string } | null;

export async function getUser(req: Request): Promise<User> {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error('[auth] SUPABASE_JWT_SECRET not set');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    const sub = payload?.sub;
    if (!sub || typeof sub !== 'string') return null;
    return { id: sub };
  } catch (e: any) {
    console.error('[auth] jwt verify failed:', e?.message);
    return null;
  }
}
