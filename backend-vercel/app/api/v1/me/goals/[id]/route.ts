import { options, ok, badRequest, notFound, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

const updateGoalSchema = z.object({
  goal_text: z.string().min(1).max(500).optional(),
  goal_description: z.string().max(2000).optional(),
  goal_category: z.enum(['business', 'networking', 'personal']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  is_active: z.boolean().optional(),
  target_date: z.string().nullable().optional(),
  target_count: z.number().int().positive().nullable().optional(),
  current_progress: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional()
});

// GET /v1/me/goals/:id - Get single goal
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const supabase = getClientOrThrow(req);
    
    const { data: goal, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns this goal
      .maybeSingle();

    if (error) {
      console.error('[Get Goal Error]', error);
      return serverError(error.message, req);
    }

    if (!goal) {
      return notFound('Goal not found', req);
    }

    // Get associated contacts if any
    const { data: contacts } = await supabase
      .from('goal_contact_associations')
      .select('contact_id, relevance_score, notes, contacts(id, display_name, warmth)')
      .eq('goal_id', params.id);

    return ok({
      goal,
      associated_contacts: contacts || []
    }, req);

  } catch (error: any) {
    console.error('[Get Goal Error]', error);
    return serverError(error.message, req);
  }
}

// PATCH /v1/me/goals/:id - Update goal
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const body = await req.json();
    const parsed = updateGoalSchema.safeParse(body);
    
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message || 'Invalid request', req);
    }

    const supabase = getClientOrThrow(req);

    // Verify goal exists and belongs to user
    const { data: existingGoal } = await supabase
      .from('user_goals')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingGoal) {
      return notFound('Goal not found', req);
    }

    // Update goal
    const { data: goal, error } = await supabase
      .from('user_goals')
      .update(parsed.data)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[Update Goal Error]', error);
      return serverError(error.message, req);
    }

    return ok({
      goal,
      message: 'Goal updated successfully'
    }, req);

  } catch (error: any) {
    console.error('[Update Goal Error]', error);
    return serverError(error.message, req);
  }
}

// DELETE /v1/me/goals/:id - Delete goal
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const supabase = getClientOrThrow(req);

    // Verify goal exists and belongs to user
    const { data: existingGoal } = await supabase
      .from('user_goals')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingGoal) {
      return notFound('Goal not found', req);
    }

    // Delete goal (associations will cascade)
    const { error } = await supabase
      .from('user_goals')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Delete Goal Error]', error);
      return serverError(error.message, req);
    }

    return ok({
      message: 'Goal deleted successfully'
    }, req);

  } catch (error: any) {
    console.error('[Delete Goal Error]', error);
    return serverError(error.message, req);
  }
}
