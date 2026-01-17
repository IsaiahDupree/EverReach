import { options, ok, badRequest, serverError, created } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// DELETE /v1/me/account — Immediate account deletion
export async function DELETE(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    console.log(`[Account] Deleting user ${user.id} immediately...`);
    const supabase = getServiceClient();
    
    // Delete the user from Auth (cascades to public tables if configured, or leaves orphaned data)
    // For App Store compliance, this must delete the account.
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    
    if (error) {
      // If user is already deleted (user_not_found), treat as success
      // Check multiple ways the error might indicate "user not found"
      const isUserNotFound = 
        error.status === 404 || 
        error.code === 'user_not_found' ||
        (error as any).__isAuthError && String(error.message).toLowerCase().includes('not found');
      
      if (isUserNotFound) {
        console.log(`[Account] User ${user.id} already deleted, returning success`);
        return ok({ deleted: true, already_deleted: true }, req);
      }
      
      console.error('[Account] Failed to delete user:', error);
      return serverError(error.message, req);
    }

    console.log(`[Account] User ${user.id} deleted successfully.`);
    return ok({ deleted: true }, req);
  } catch (e: any) {
    // Handle case where user is already deleted
    const isUserNotFound = 
      e?.status === 404 || 
      e?.code === 'user_not_found' || 
      (e?.__isAuthError && String(e?.message).toLowerCase().includes('not found'));
    
    if (isUserNotFound) {
      console.log(`[Account] User ${user.id} already deleted (exception), returning success`);
      return ok({ deleted: true, already_deleted: true }, req);
    }
    
    console.error('[Account] Delete exception:', e);
    return serverError(e?.message || 'Internal error', req);
  }
}
