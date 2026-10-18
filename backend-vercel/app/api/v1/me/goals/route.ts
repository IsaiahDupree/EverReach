import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

// Validation schemas
const createGoalSchema = z.object({
  goal_category: z.enum(['business', 'networking', 'personal']),
  goal_text: z.string().min(1).max(500),
  goal_description: z.string().max(2000).optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  is_active: z.boolean().default(true),
  target_date: z.string().optional(), // ISO date string
  target_count: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional()
});

const updateGoalSchema = z.object({
  goal_text: z.string().min(1).max(500).optional(),
  goal_description: z.string().max(2000).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  is_active: z.boolean().optional(),
  target_date: z.string().nullable().optional(),
  target_count: z.number().int().positive().nullable().optional(),
  current_progress: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional()
});

// GET /v1/me/goals - List user's goals
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const supabase = getClientOrThrow(req);
    const url = new URL(req.url);
    
    // Query parameters
    const category = url.searchParams.get('category'); // business, networking, personal
    const active = url.searchParams.get('active'); // true, false
    const priority = url.searchParams.get('priority'); // high, medium, low
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('goal_category', category);
    }
    if (active === 'true') {
      query = query.eq('is_active', true);
    } else if (active === 'false') {
      query = query.eq('is_active', false);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    query = query.limit(limit);

    const { data: goals, error } = await query;

    if (error) {
      console.error('[Get Goals Error]', error);
      return serverError("Internal server error", req);
    }

    // Get summary stats
    const { data: summary } = await supabase
      .from('user_goals_summary')
      .select('*')
      .eq('user_id', user.id);

    return ok({
      goals: goals || [],
      total: goals?.length || 0,
      summary: summary || []
    }, req);

  } catch (error: any) {
    console.error('[Get Goals Error]', error);
    return serverError("Internal server error", req);
  }
}

// POST /v1/me/goals - Create new goal
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json" } 
  });

  try {
    const body = await req.json();
    const parsed = createGoalSchema.safeParse(body);
    
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message || 'Invalid request', req);
    }

    const supabase = getClientOrThrow(req);
    
    const { data: goal, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: user.id,
        ...parsed.data
      })
      .select()
      .single();

    if (error) {
      console.error('[Create Goal Error]', error);
      return serverError("Internal server error", req);
    }

    return ok({
      goal,
      message: 'Goal created successfully'
    }, req);

  } catch (error: any) {
    console.error('[Create Goal Error]', error);
    return serverError("Internal server error", req);
  }
}
