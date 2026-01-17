import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import OpenAI from 'openai';

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/me/persona-notes/:id/transcribe
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const supabase = getClientOrThrow(req);
    // Load note to get file_url
    const { data: note, error: nErr } = await supabase
      .from('persona_notes')
      .select('id, type, file_url, status')
      .eq('id', params.id)
      .maybeSingle();
    if (nErr) return serverError(nErr.message, req);
    if (!note) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    const noteId: string = (note as any).id;
    const noteType: string = (note as any).type;
    const fileUrl: string | null = (note as any).file_url ?? null;
    if (noteType !== 'voice' || !fileUrl) return badRequest('not_a_voice_note_or_missing_file', req);

    // Privacy: require analytics_opt_in (server-side control)
    const { data: profile } = await supabase
      .from('profiles')
      .select('analytics_opt_in')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.analytics_opt_in) {
      return new Response(JSON.stringify({ error: { code: 'analytics_opt_in_required' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: { code: 'transcription_provider_not_configured' } }), { status: 501, headers: { 'Content-Type': 'application/json' } });
    }

    // Mark as processing
    await supabase.from('persona_notes').update({ status: 'processing' } as any).eq('id', noteId);

    async function attemptOnce(fileUrlStr: string): Promise<string> {
      const audioResp = await fetch(fileUrlStr);
      if (!audioResp.ok) {
        throw new Error(`failed_to_fetch_audio:${audioResp.status}`);
      }
      const buf = Buffer.from(await audioResp.arrayBuffer());
      const file = new File([buf], 'note.m4a', { type: audioResp.headers.get('content-type') || 'audio/m4a' });
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.TRANSCRIBE_MODEL || 'whisper-1';
      const tr = await client.audio.transcriptions.create({ file, model } as any);
      const text: string = (tr as any).text || (tr as any).output_text || '';
      return text;
    }

    let text = '';
    try {
      text = await attemptOnce(fileUrl);
    } catch (e1: any) {
      // Retry with jitter once
      const jitterMs = 200 + Math.floor(Math.random() * 400);
      await new Promise((r) => setTimeout(r, jitterMs));
      try {
        text = await attemptOnce(fileUrl);
      } catch (e2: any) {
        await supabase.from('persona_notes').update({ status: 'failed' } as any).eq('id', noteId);
        return serverError(e2?.message || e1?.message || 'transcription_failed', req);
      }
    }

    const { error: upErr } = await supabase
      .from('persona_notes')
      .update({ transcript: text, status: 'ready' } as any)
      .eq('id', noteId);
    if (upErr) return serverError(upErr.message, req);

    return ok({ id: noteId, status: 'ready', transcript_len: text.length }, req);
  } catch (e: any) {
    try {
      const supabase = getClientOrThrow(req);
      await supabase.from('persona_notes').update({ status: 'failed' } as any).eq('id', params.id);
    } catch {}
    return serverError(e?.message || 'Internal error', req);
  }
}
