import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { canUseVoiceTranscription, incrementVoiceTranscriptionUsage } from "@/lib/usage-limits";
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
      .eq('user_id', user.id)
      .maybeSingle();
    if (nErr) return serverError((nErr as any).message || 'db_select_failed', req);
    if (!note) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    
    const noteId = note.id;
    const noteType = note.type;
    const fileUrl = note.file_url ?? null;
    
    if (noteType !== 'voice' || !fileUrl) return badRequest('not_a_voice_note_or_missing_file', req);

    // Privacy: require analytics consent (server-side control)
    const { data: profile } = await supabase
      .from('profiles')
      .select('analytics_consent')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.analytics_consent) {
      return new Response(JSON.stringify({ error: { code: 'analytics_consent_required' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (!process.env.OPENAI_API_KEY) {
      return badRequest('openai_not_configured', req);
    }

    // Estimate audio duration for usage tracking
    // Fetch audio to get file size for duration estimation
    let estimatedMinutes = 1.0; // Default to 1 minute if we can't estimate
    try {
      const audioResp = await fetch(fileUrl);
      if (audioResp.ok) {
        const contentLength = audioResp.headers.get('content-length');
        if (contentLength) {
          const fileSizeMB = parseInt(contentLength, 10) / (1024 * 1024);
          // Rough estimate: ~1MB per minute for compressed audio (m4a)
          // Clamp between 0.1 and 30 minutes for safety
          estimatedMinutes = Math.max(0.1, Math.min(30, fileSizeMB));
        }
      }
    } catch (e) {
      // If we can't estimate, use default
      console.warn('Could not estimate audio duration, using default:', e);
    }

    // Check tier-based usage limits for voice transcription
    const usageCheck = await canUseVoiceTranscription(supabase, user.id, estimatedMinutes);
    
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'usage_limit_exceeded',
            message: usageCheck.reason || 'Monthly voice transcription limit reached',
            details: {
              current_usage: usageCheck.current_usage,
              limit: usageCheck.limit,
              remaining: usageCheck.remaining,
              resets_at: usageCheck.resets_at,
              tier: usageCheck.tier,
              estimated_minutes: estimatedMinutes,
            },
          },
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(usageCheck.limit),
            'X-RateLimit-Remaining': String(usageCheck.remaining || 0),
            'X-RateLimit-Reset': usageCheck.resets_at || '',
          } 
        }
      );
    }

    // Mark as processing (best-effort if status column exists)
    try {
      await supabase.from('persona_notes').update({ status: 'processing' } as any).eq('id', noteId).eq('user_id', user.id);
    } catch {}

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

    // Update transcript
    const { error: upErr } = await supabase
      .from('persona_notes')
      .update({ transcript: text, status: 'ready' } as any)
      .eq('id', noteId)
      .eq('user_id', user.id);
    if (upErr) return serverError((upErr as any).message || 'db_update_failed', req);

    // Increment usage counter (after successful transcription)
    await incrementVoiceTranscriptionUsage(supabase, user.id, estimatedMinutes);

    // Get updated usage info for response
    const updatedUsage = await canUseVoiceTranscription(supabase, user.id, 0);

    return ok({ 
      id: noteId, 
      status: 'ready', 
      transcript_len: text.length,
      usage: {
        minutes_used: estimatedMinutes,
        current: (updatedUsage.current_usage || 0) + estimatedMinutes,
        limit: updatedUsage.limit,
        remaining: Math.max(0, (updatedUsage.remaining || 0) - estimatedMinutes),
        resets_at: updatedUsage.resets_at,
        tier: updatedUsage.tier,
      },
    }, req);
  } catch (e: any) {
    try {
      const supabase = getClientOrThrow(req);
      await supabase.from('persona_notes').update({ status: 'failed' } as any).eq('id', params.id).eq('user_id', user.id);
    } catch {}
    return serverError(e?.message || 'Internal error', req);
  }
}
