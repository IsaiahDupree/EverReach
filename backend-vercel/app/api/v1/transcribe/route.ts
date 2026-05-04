import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import OpenAI from 'openai';

export const runtime = "nodejs";

export function OPTIONS(req: Request) {
  return options(req);
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    if (!process.env.OPENAI_API_KEY) {
      return badRequest('openai_not_configured', req);
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return badRequest('missing_audio_file', req);
    }

    console.log('[Transcribe] Processing audio file:', audioFile.name, audioFile.type, audioFile.size);

    // Transcribe using OpenAI Whisper
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.TRANSCRIBE_MODEL || 'whisper-1';
    
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: model as any,
    });

    const text: string = (transcription as any).text || '';

    console.log('[Transcribe] Success, transcript length:', text.length);

    return ok({ text }, req);
  } catch (error: any) {
    console.error('[Transcribe] Error:', error);
    return serverError(error?.message || 'transcription_failed', req);
  }
}
