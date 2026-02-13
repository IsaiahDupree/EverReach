import { options, ok, badRequest, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const alertActionSchema = z.object({
  action: z.enum(['dismiss', 'snooze', 'reached_out']),
  snooze_days: z.number().int().min(1).max(30).optional()
});

/**
 * PATCH /v1/alerts/:id
 * Update alert status (dismiss, snooze, mark as acted on)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON', req);
  }
  
  const parsed = alertActionSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.message, req);
  }
  
  const { action, snooze_days } = parsed.data;
  
  try {
    const supabase = getClientOrThrow(req);
    
    // Build update object based on action
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (action === 'dismiss') {
      updates.dismissed = true;
      updates.dismissed_at = new Date().toISOString();
      updates.action_taken = 'ignored';
      updates.action_taken_at = new Date().toISOString();
    } else if (action === 'snooze') {
      const days = snooze_days || 7;
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + days);
      updates.snooze_until = snoozeUntil.toISOString();
      updates.action_taken = 'snoozed';
      updates.action_taken_at = new Date().toISOString();
    } else if (action === 'reached_out') {
      updates.dismissed = true;
      updates.dismissed_at = new Date().toISOString();
      updates.action_taken = 'reached_out';
      updates.action_taken_at = new Date().toISOString();
    }
    
    const { data: alert, error } = await supabase
      .from('warmth_alerts')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return notFound('Alert not found', req);
      return serverError("Internal server error", req);
    }
    
    return ok({
      success: true,
      alert: {
        id: alert.id,
        dismissed: alert.dismissed,
        action_taken: alert.action_taken,
        snoozed_until: alert.snooze_until
      }
    }, req);
    
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}

/**
 * DELETE /v1/alerts/:id
 * Delete an alert permanently
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const supabase = getClientOrThrow(req);
    
    const { error } = await supabase
      .from('warmth_alerts')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      return serverError("Internal server error", req);
    }
    
    return ok({ success: true }, req);
    
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}
