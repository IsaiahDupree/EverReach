import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const pushTokenSchema = z.object({
  push_token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  device_id: z.string().optional(),
  device_name: z.string().optional(),
  notifications_enabled: z.boolean().optional(),
  warmth_alerts_enabled: z.boolean().optional()
});

/**
 * GET /v1/push-tokens
 * Get user's registered push tokens
 */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);
    
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      return serverError("Internal server error", req);
    }
    
    return ok({ tokens: tokens || [], items: tokens || [] }, req);
    
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}

/**
 * POST /v1/push-tokens
 * Register a new push token
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON', req);
  }
  // Accept alias 'token' for 'push_token'
  if (body && !body.push_token && typeof body.token === 'string') {
    body.push_token = body.token;
  }
  const parsed = pushTokenSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.message, req);
  }
  
  const tokenData = parsed.data;
  
  try {
    const supabase = getClientOrThrow(req);
    
    // Check if token already exists
    const { data: existing } = await supabase
      .from('user_push_tokens')
      .select('id')
      .eq('push_token', tokenData.push_token)
      .maybeSingle();
    
    if (existing) {
      // Update existing token
      const { data: updated, error } = await supabase
        .from('user_push_tokens')
        .update({
          is_active: true,
          last_used_at: new Date().toISOString(),
          platform: tokenData.platform,
          device_id: tokenData.device_id,
          device_name: tokenData.device_name,
          notifications_enabled: tokenData.notifications_enabled ?? true,
          warmth_alerts_enabled: tokenData.warmth_alerts_enabled ?? true
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) return serverError("Internal server error", req);
      
      return ok({ token: updated, updated: true }, req);
    }
    
    // Create new token
    const { data: created, error } = await supabase
      .from('user_push_tokens')
      .insert({
        user_id: user.id,
        push_token: tokenData.push_token,
        platform: tokenData.platform,
        device_id: tokenData.device_id,
        device_name: tokenData.device_name,
        notifications_enabled: tokenData.notifications_enabled ?? true,
        warmth_alerts_enabled: tokenData.warmth_alerts_enabled ?? true,
        is_active: true
      })
      .select()
      .single();
    
    if (error) return serverError("Internal server error", req);
    
    return ok({ token: created, created: true }, req);
    
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}

/**
 * DELETE /v1/push-tokens
 * Remove a push token
 */
export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const url = new URL(req.url);
  const pushToken = url.searchParams.get('token');
  
  if (!pushToken) {
    return badRequest('token parameter required', req);
  }
  
  try {
    const supabase = getClientOrThrow(req);
    
    const { error } = await supabase
      .from('user_push_tokens')
      .update({ is_active: false })
      .eq('push_token', pushToken);
    
    if (error) return serverError("Internal server error", req);
    
    return ok({ success: true }, req);
    
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}
