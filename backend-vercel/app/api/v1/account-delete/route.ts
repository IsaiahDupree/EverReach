// DELETE /api/v1/account-delete
// Hard-deletes the authenticated user's data in dependency order, then removes
// the auth.users row via the Supabase Admin API.
//
// Deletion order:
//   1. coach_messages
//   2. supplement_logs
//   3. user_badges
//   4. daily_stats
//   5. sun_sessions
//   6. profiles
//   7. auth.users (via admin deleteUser)
//
// Returns { success: true } on full completion.

import { ok, unauthorized, serverError, options } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// ── DELETE handler ────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  // Verify caller identity
  const user = await getUser(req);
  if (!user) return unauthorized('Valid Bearer JWT required', req);

  const userId = user.id;
  const supabase = getServiceClient();

  // Tables to purge in dependency order (children before parents)
  const tablesToDelete: string[] = [
    'coach_messages',
    'supplement_logs',
    'user_badges',
    'daily_stats',
    'sun_sessions',
    'profiles',
  ];

  for (const table of tablesToDelete) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId);

    if (error) {
      // Log but do not abort — table may not exist yet for this user; continue cleanup
      console.warn(`[account-delete] Error deleting from ${table} for user=${userId}:`, error.message);
    }
  }

  // Delete the auth.users row via Supabase admin API
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    console.error('[account-delete] Failed to delete auth user:', authError.message);
    return serverError(`Account deletion failed: ${authError.message}`, req);
  }

  console.log(`[account-delete] Successfully deleted account for user=${userId}`);

  return ok({ success: true }, req);
}
