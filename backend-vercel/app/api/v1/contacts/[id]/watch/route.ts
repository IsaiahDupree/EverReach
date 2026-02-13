import { options, ok, badRequest, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const watchStatusSchema = z.object({
  watch_status: z.enum(['none', 'watch', 'important', 'vip']),
  warmth_alert_threshold: z.number().int().min(0).max(100).optional()
});

/**
 * GET /v1/contacts/:id/watch
 * Get watch status for a contact
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const supabase = getClientOrThrow(req);
    
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('id, display_name, watch_status, warmth_alert_threshold, last_warmth_alert_sent_at')
      .eq('id', params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return notFound('Contact not found', req);
      return serverError("Internal server error", req);
    }
    
    return ok({
      contact_id: contact.id,
      contact_name: contact.display_name,
      watch_status: contact.watch_status || 'none',
      warmth_alert_threshold: contact.warmth_alert_threshold || 30,
      last_alert_sent_at: contact.last_warmth_alert_sent_at
    }, req);
    
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}

/**
 * PATCH /v1/contacts/:id/watch
 * Update watch status for a contact
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
  
  const parsed = watchStatusSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.message, req);
  }
  
  const { watch_status, warmth_alert_threshold } = parsed.data;
  
  try {
    const supabase = getClientOrThrow(req);
    
    // Build update object
    const updates: any = {
      watch_status,
      updated_at: new Date().toISOString()
    };
    
    // Set threshold if provided, or use default based on watch_status
    if (warmth_alert_threshold !== undefined) {
      updates.warmth_alert_threshold = warmth_alert_threshold;
    } else if (watch_status !== 'none') {
      // Set default thresholds by watch level
      updates.warmth_alert_threshold = watch_status === 'vip' ? 40 :
                                        watch_status === 'important' ? 30 : 25;
    } else {
      updates.warmth_alert_threshold = null;
    }
    
    // If removing watch, clear last alert time
    if (watch_status === 'none') {
      updates.last_warmth_alert_sent_at = null;
    }
    
    const { data: contact, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', params.id)
      .select('id, display_name, watch_status, warmth_alert_threshold, warmth')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return notFound('Contact not found', req);
      return serverError("Internal server error", req);
    }
    
    return ok({
      success: true,
      contact: {
        id: contact.id,
        name: contact.display_name,
        watch_status: contact.watch_status,
        warmth_alert_threshold: contact.warmth_alert_threshold,
        current_warmth: contact.warmth
      }
    }, req);
    
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}
