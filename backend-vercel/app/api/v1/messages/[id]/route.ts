import { options, ok, unauthorized, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('messages')
    .select('id, thread_id, role, content, metadata, created_at, updated_at')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return serverError("Internal server error", req);
  if (!data) return notFound('Message not found', req);
  return ok({ message: data }, req);
}
