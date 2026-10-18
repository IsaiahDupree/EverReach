import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

// POST /v1/contacts/:id/files/commit - Save uploaded file metadata to database
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('invalid_json', req);
  }

  const { file_path, mime_type, size_bytes } = body;
  
  if (!file_path || !mime_type) {
    return badRequest('file_path and mime_type are required', req);
  }

  try {
    const supabase = getClientOrThrow(req);
    
    // Insert attachment record
    const { data, error } = await supabase
      .from('attachments')
      .insert([{
        file_path,
        mime_type,
        size_bytes: size_bytes || 0,
        contact_id: params.id
      }])
      .select('id, file_path, mime_type, size_bytes, created_at')
      .single();
    
    if (error) {
      return serverError("Internal server error", req);
    }
    
    return ok({ attachment: data }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
