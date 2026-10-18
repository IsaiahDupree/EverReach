import { NextRequest } from 'next/server';
import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /v1/auth/perform-reset
 * 
 * Completes password reset:
 * 1. Validates token exists and not expired
 * 2. Updates user password
 * 3. Marks token as used
 * 4. Deletes token
 * 
 * Security:
 * - Token is one-time use
 * - Token expires in 30 minutes
 * - Password requirements enforced by Supabase
 */
export async function POST(req: NextRequest){
  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON', req);
  }

  const { token, newPassword } = body;

  if (!token || typeof token !== 'string') {
    return badRequest('Token required', req);
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return badRequest('Password must be at least 8 characters', req);
  }

  const supabase = getClientOrThrow(req);

  try {
    // 1) Fetch and validate token
    const { data: resetData, error: fetchError } = await supabase
      .from('password_resets')
      .select('user_id, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();

    if (fetchError || !resetData) {
      console.error('[Reset] Token fetch error:', fetchError);
      return badRequest('Invalid or expired token', req);
    }

    // Check if already used
    if (resetData.used_at) {
      return badRequest('Token already used', req);
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(resetData.expires_at);
    if (expiresAt < now) {
      return badRequest('Token expired', req);
    }

    const userId = resetData.user_id;

    // 2) Update user password (using admin API)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('[Reset] Password update error:', updateError);
      return serverError('Failed to update password', req);
    }

    // 3) Mark token as used
    await supabase
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // 4) Delete used token (cleanup)
    await supabase
      .from('password_resets')
      .delete()
      .eq('token', token);

    return ok({ 
      success: true, 
      message: 'Password reset successful' 
    }, req);

  } catch (error: any) {
    console.error('[Reset] Error:', error);
    return serverError("Internal server error", req);
  }
}
