import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify authentication from request headers.
 *
 * Only a Supabase-issued JWT (Authorization: Bearer <token>) is accepted.
 * A client-supplied `X-User-Id` header is NEVER trusted as authentication --
 * it carries no signature or session proof and is fully attacker-controlled,
 * so it must not be used to establish identity (it previously allowed a
 * trivial auth bypass / IDOR on every route that calls this function).
 */
export async function verifyAuth(request: NextRequest): Promise<{
  userId: string;
  email?: string;
  authenticated: boolean;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authentication provided');
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Invalid token');
    }

    return {
      userId: user.id,
      email: user.email,
      authenticated: true
    };
  } catch (error) {
    throw new Error('Authentication failed');
  }
}

/**
 * Extract user ID from request without throwing errors
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const auth = await verifyAuth(request);
    return auth.userId;
  } catch {
    return null;
  }
}

/**
 * Verify admin access (service role key)
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return apiKey === serviceKey;
}
