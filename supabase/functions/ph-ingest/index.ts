/**
 * PostHog Webhook Ingest
 * 
 * Receives events from PostHog and stores them in Supabase event_log.
 * Also updates user_traits incrementally for fast segment evaluation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Verify PostHog webhook signature (optional but recommended)
function verifySignature(body: string, signature: string): boolean {
  // TODO: Implement HMAC verification if PostHog webhook secret is configured
  // const secret = Deno.env.get("POSTHOG_WEBHOOK_SECRET");
  // if (!secret) return true; // Skip if no secret configured
  
  // const hash = await crypto.subtle.digest(
  //   "SHA-256",
  //   new TextEncoder().encode(secret + body)
  // );
  // const computed = Array.from(new Uint8Array(hash))
  //   .map(b => b.toString(16).padStart(2, '0'))
  //   .join('');
  
  // return computed === signature;
  
  return true; // For now, accept all requests
}

serve(async (req) => {
  try {
    // Verify signature
    const signature = req.headers.get("x-posthog-signature") || "";
    const rawBody = await req.text();
    
    if (!verifySignature(rawBody, signature)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const body = JSON.parse(rawBody);
    
    // Handle both single events and batches
    const events = Array.isArray(body) ? body : [body];
    
    console.log(`[ph-ingest] Processing ${events.length} events`);
    
    // Transform PostHog events to our schema
    const rows = events.map((e: any) => {
      // Determine if this is a user ID or anonymous ID
      const isUser = e.properties?.$user_id || e.distinct_id?.startsWith('user_');
      
      return {
        id: crypto.randomUUID(),
        user_id: isUser ? e.distinct_id : null,
        anonymous_id: e.distinct_id,
        event_name: e.event,
        properties: e.properties || {},
        ts: e.timestamp ? new Date(e.timestamp) : new Date(),
        source: "posthog",
        idempotency_key: e.properties?.$idempotency_key || `${e.distinct_id}-${e.event}-${e.timestamp}`,
      };
    });
    
    // Insert events (ignore duplicates via idempotency_key)
    const { error: insertError, data } = await supabase
      .from("event_log")
      .upsert(rows, { 
        onConflict: "idempotency_key",
        ignoreDuplicates: true 
      })
      .select();
    
    if (insertError) {
      console.error("[ph-ingest] Insert error:", insertError);
      return new Response(
        JSON.stringify({ ok: false, error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[ph-ingest] Inserted ${data?.length || 0} events`);
    
    // Update session counters for session_started events
    const sessionEvents = rows.filter(r => r.event_name === "session_started" && r.user_id);
    
    for (const event of sessionEvents) {
      await supabase.rpc("bump_session_counters", { 
        p_user_id: event.user_id 
      });
    }
    
    return new Response(
      JSON.stringify({ ok: true, inserted: data?.length || 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("[ph-ingest] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
