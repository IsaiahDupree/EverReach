import { options, ok, badRequest, notFound, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const associateContactSchema = z.object({
  contact_id: z.string().uuid(),
  relevance_score: z.number().int().min(1).max(10).default(5),
  notes: z.string().max(500).optional()
});

// GET /v1/me/goals/:id/contacts - List contacts associated with goal
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const supabase = getClientOrThrow(req);

    // Verify goal exists and belongs to user
    const { data: goal } = await supabase
      .from('user_goals')
      .select('id, goal_text')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!goal) {
      return notFound('Goal not found', req);
    }

    // Get associated contacts with full details
    const { data: associations, error } = await supabase
      .from('goal_contact_associations')
      .select(`
        id,
        contact_id,
        relevance_score,
        notes,
        created_at,
        contacts (
          id,
          display_name,
          emails,
          phones,
          company,
          warmth,
          warmth_band,
          tags
        )
      `)
      .eq('goal_id', params.id)
      .eq('user_id', user.id)
      .order('relevance_score', { ascending: false });

    if (error) {
      console.error('[Get Goal Contacts Error]', error);
      return serverError(error.message, req);
    }

    return ok({
      goal,
      associations: associations || [],
      total: associations?.length || 0
    }, req);

  } catch (error: any) {
    console.error('[Get Goal Contacts Error]', error);
    return serverError(error.message, req);
  }
}

// POST /v1/me/goals/:id/contacts - Associate contact with goal
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const body = await req.json();
    const parsed = associateContactSchema.safeParse(body);
    
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message || 'Invalid request', req);
    }

    const supabase = getClientOrThrow(req);

    // Verify goal exists and belongs to user
    const { data: goal } = await supabase
      .from('user_goals')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!goal) {
      return notFound('Goal not found', req);
    }

    // Verify contact exists and belongs to user
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, display_name')
      .eq('id', parsed.data.contact_id)
      .maybeSingle();

    if (!contact) {
      return notFound('Contact not found', req);
    }

    // Create association (upsert to handle duplicates)
    const { data: association, error } = await supabase
      .from('goal_contact_associations')
      .upsert({
        goal_id: params.id,
        contact_id: parsed.data.contact_id,
        user_id: user.id,
        relevance_score: parsed.data.relevance_score,
        notes: parsed.data.notes
      }, {
        onConflict: 'goal_id,contact_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[Associate Contact Error]', error);
      return serverError(error.message, req);
    }

    return ok({
      association,
      message: 'Contact associated with goal successfully'
    }, req);

  } catch (error: any) {
    console.error('[Associate Contact Error]', error);
    return serverError(error.message, req);
  }
}

// DELETE /v1/me/goals/:id/contacts/:contactId - Remove contact association
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const url = new URL(req.url);
    const contactId = url.searchParams.get('contact_id');

    if (!contactId) {
      return badRequest('contact_id query parameter required', req);
    }

    const supabase = getClientOrThrow(req);

    // Delete association
    const { error } = await supabase
      .from('goal_contact_associations')
      .delete()
      .eq('goal_id', params.id)
      .eq('contact_id', contactId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Remove Contact Association Error]', error);
      return serverError(error.message, req);
    }

    return ok({
      message: 'Contact association removed successfully'
    }, req);

  } catch (error: any) {
    console.error('[Remove Contact Association Error]', error);
    return serverError(error.message, req);
  }
}
