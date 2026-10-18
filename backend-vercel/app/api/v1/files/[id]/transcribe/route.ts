/**
 * Audio Transcription with Automatic Chunking
 * POST /v1/files/:id/transcribe - Transcribe audio file with automatic chunking for large files
 */

import { options, ok, badRequest, serverError, unauthorized, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { prepareFileForProcessing, cleanupChunks, MAX_FILE_SIZES } from "@/lib/file-chunking";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large file processing

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * POST /v1/files/:id/transcribe
 * Transcribe audio file with automatic chunking for files > 20MB
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);

    // Get file metadata
    const { data: attachment, error } = await supabase
      .from('attachments')
      .select('id, file_path, mime_type, size_bytes')
      .eq('id', params.id)
      .single();

    if (error || !attachment) {
      return notFound("File not found", req);
    }

    // Validate it's an audio file
    if (!attachment.mime_type?.startsWith('audio/')) {
      return badRequest("File must be an audio file", req);
    }

    // Parse request body for options
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine, use defaults
    }

    const language = body.language || 'en';
    const prompt = body.prompt || '';

    console.log(`[Transcribe] Processing file ${params.id} (${attachment.size_bytes} bytes)`);

    // Prepare file (chunks if needed)
    const result = await prepareFileForProcessing(
      attachment.file_path,
      MAX_FILE_SIZES.WHISPER
    );

    console.log(`[Transcribe] Needs chunking: ${result.needsChunking}`);
    console.log(`[Transcribe] Total size: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB`);

    let fullTranscript = '';
    const openai = getOpenAIClient();

    if (!result.needsChunking && result.singleFile) {
      // Single file - transcribe directly
      console.log(`[Transcribe] Processing single file`);

      // Download file from storage
      const { downloadFile } = await import('@/lib/file-chunking');
      const arrayBuffer = await downloadFile(result.singleFile.path);
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const file = new File([blob], 'audio.wav', { type: 'audio/wav' });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language,
        prompt,
      });

      fullTranscript = transcription.text;

    } else if (result.chunks) {
      // Multiple chunks - transcribe each and concatenate
      console.log(`[Transcribe] Processing ${result.chunks.length} chunks`);

      const transcripts: string[] = [];
      const { downloadFile } = await import('@/lib/file-chunking');

      for (const chunk of result.chunks) {
        console.log(`[Transcribe] Processing chunk ${chunk.index + 1}/${result.chunks.length}`);

        try {
          // Download chunk from storage
          const arrayBuffer = await downloadFile(chunk.path);
          const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
          const file = new File([blob], `chunk${chunk.index}.wav`, { type: 'audio/wav' });

          const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language,
            prompt: chunk.index === 0 ? prompt : transcripts[chunk.index - 1]?.slice(-200) || '', // Use end of previous chunk as context
          });

          transcripts.push(transcription.text);
        } catch (chunkError: any) {
          console.error(`[Transcribe] Chunk ${chunk.index} failed:`, chunkError);
          transcripts.push(`[Chunk ${chunk.index + 1} transcription failed: ${chunkError.message}]`);
        }
      }

      fullTranscript = transcripts.join(' ');

      // Cleanup temporary chunks
      await cleanupChunks(result.chunks);
      console.log(`[Transcribe] Cleaned up ${result.chunks.length} temporary chunks`);
    }

    // Store transcript in database (optional)
    try {
      await supabase
        .from('attachments')
        .update({
          metadata: {
            transcript: fullTranscript,
            transcribed_at: new Date().toISOString(),
            chunked: result.needsChunking,
            chunks_processed: result.chunks?.length || 1,
          },
        })
        .eq('id', params.id);
    } catch (updateError) {
      console.error('[Transcribe] Failed to update metadata:', updateError);
    }

    return ok({
      transcript: fullTranscript,
      metadata: {
        file_id: params.id,
        total_size_mb: (result.totalSize / 1024 / 1024).toFixed(2),
        was_chunked: result.needsChunking,
        chunks_processed: result.chunks?.length || 1,
        transcript_length: fullTranscript.length,
      },
    }, req);

  } catch (err: any) {
    console.error('[Transcribe] Error:', err);
    return serverError(err?.message || 'Transcription failed', req);
  }
}
