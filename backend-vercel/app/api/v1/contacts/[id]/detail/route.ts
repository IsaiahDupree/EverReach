import { options, ok, unauthorized, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * GET /api/v1/contacts/:id/detail
 * 
 * Frontend-friendly endpoint that returns ALL data for a contact in one call:
 * - Contact basic info
 * - All interactions (recent + count)
 * - All persona notes (voice, screenshot, text)
 * - Pipeline/stage info
 * - Tags, warmth, custom fields
 * 
 * This eliminates the need for multiple API calls on contact detail pages.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const contactId = params.id;
  const supabase = getClientOrThrow(req);

  try {
    // 1. Get contact basic info
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`
        id,
        display_name,
        emails,
        phones,
        company,
        tags,
        warmth,
        warmth_band,
        last_interaction_at,
        pipeline_id,
        stage_id,
        custom,
        notes,
        avatar_url,
        metadata,
        created_at,
        updated_at
      `)
      .eq('id', contactId)
      .is('deleted_at', null)
      .maybeSingle();

    if (contactError) {
      console.error('[GET /detail] Contact query error:', contactError);
      return notFound(`Contact not found: ${contactError.message}`, req);
    }
    
    if (!contact) {
      console.warn('[GET /detail] No contact found for ID:', contactId);
      return notFound('Contact not found', req);
    }

    // 2. Get interactions (recent 20 + total count)
    const [
      { data: recentInteractions, error: interactionsError },
      { count: totalInteractions }
    ] = await Promise.all([
      supabase
        .from('interactions')
        .select('id, channel, direction, summary, content, metadata, occurred_at, created_at')
        .eq('contact_id', contactId)
        .order('occurred_at', { ascending: false })
        .limit(20),
      supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
    ]);

    // 3. Get persona notes (voice, screenshot, text)
    const { data: personaNotes, error: notesError } = await supabase
      .from('persona_notes')
      .select('id, type, status, title, body_text, file_url, duration_sec, transcript, tags, created_at, updated_at')
      .contains('linked_contacts', [contactId])
      .order('created_at', { ascending: false })
      .limit(50);

    // 4. Get pipeline/stage info if applicable
    let pipelineInfo = null;
    if (contact.pipeline_id && contact.stage_id) {
      const { data: stage } = await supabase
        .from('pipeline_stages')
        .select('id, name, key, pipeline_id, pipelines(id, name, key)')
        .eq('id', contact.stage_id)
        .maybeSingle();
      
      if (stage) {
        pipelineInfo = {
          pipeline_id: contact.pipeline_id,
          pipeline_name: (stage as any).pipelines?.name,
          pipeline_key: (stage as any).pipelines?.key,
          stage_id: stage.id,
          stage_name: stage.name,
          stage_key: stage.key,
        };
      }
    }

    // 5. Group persona notes by type for easy frontend access
    const notesByType = {
      voice: personaNotes?.filter(n => n.type === 'voice') || [],
      screenshot: personaNotes?.filter(n => n.type === 'screenshot') || [],
      text: personaNotes?.filter(n => n.type === 'text') || [],
    };

    // 6. Build comprehensive response
    const response = {
      // Core contact info
      contact: {
        ...contact,
        pipeline: pipelineInfo,
      },
      
      // Interactions summary
      interactions: {
        recent: (recentInteractions || []).map((interaction: any) => ({
          ...interaction,
          body: interaction.content,  // Backward compatibility alias for frontend
        })),
        total_count: totalInteractions || 0,
        has_more: (totalInteractions || 0) > 20,
      },
      
      // Persona notes grouped by type
      notes: {
        all: personaNotes || [],
        by_type: notesByType,
        total_count: personaNotes?.length || 0,
        counts: {
          voice: notesByType.voice.length,
          screenshot: notesByType.screenshot.length,
          text: notesByType.text.length,
        },
      },

      // Metadata
      meta: {
        fetched_at: new Date().toISOString(),
        interactions_limit: 20,
        notes_limit: 50,
      },
    };

    return ok(response, req);

  } catch (error: any) {
    console.error('[Contact Detail] Error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
