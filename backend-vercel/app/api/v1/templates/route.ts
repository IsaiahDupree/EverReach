import { options, ok, badRequest, serverError, created, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { templatesListQuerySchema, templateCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/templates?channel=&limit=&cursor=
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const url = new URL(req.url);
    const input = templatesListQuerySchema.parse({
      channel: url.searchParams.get('channel') ?? undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });

    const supabase = getClientOrThrow(req);
    let q = supabase
      .from('templates')
      .select('id, channel, name, description, subject_tmpl, body_tmpl, closing_tmpl, variables, visibility, is_default, created_at, updated_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(input.limit ?? 20);
    if (input.channel) q = q.eq('channel', input.channel);
    if (input.cursor) q = q.lt('created_at', input.cursor);

    const { data, error } = await q;
    if (error) return serverError(error.message, req);

    const items = data ?? [];
    const nextCursor = items.length === (input.limit ?? 20) ? items[items.length - 1]?.created_at : null;
    return ok({ items, limit: input.limit ?? 20, nextCursor }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// POST /v1/templates
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = templateCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('templates')
      .insert([{ ...parsed.data }])
      .select('id, channel, name, created_at')
      .single();
    if (error) return serverError(error.message, req);
    return created({ template: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
