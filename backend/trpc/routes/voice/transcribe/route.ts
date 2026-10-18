import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/server';
import { transcribeAudio } from '@/backend/lib/openai';
import { supabaseAdmin } from '@/backend/lib/supabase';
import crypto from 'crypto';

export const transcribeVoiceNoteProcedure = protectedProcedure
  .input(z.object({
    audioUrl: z.string().url(),
    personId: z.string().uuid().optional(),
    contextScope: z.enum(['about_person', 'about_me']).default('about_person'),
    scenario: z.string().default('voice_note'),
  }))
  .mutation(async ({ input, ctx }) => {
    const { audioUrl, personId, contextScope, scenario } = input;
    const { user, orgId } = ctx;

    try {
      // Download audio file
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error('Failed to download audio file');
      }
      
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioFile = new File([audioBuffer], 'voice-note.m4a', { 
        type: audioResponse.headers.get('content-type') || 'audio/m4a' 
      });

      // Transcribe audio
      const transcription = await transcribeAudio(audioFile);
      
      // Create source record
      const sha256 = crypto.createHash('sha256').update(Buffer.from(audioBuffer)).digest('hex');
      const { data: source, error: sourceError } = await supabaseAdmin
        .from('sources')
        .insert({
          org_id: orgId,
          kind: 'audio',
          uri: audioUrl,
          sha256,
          meta: { 
            mime: audioFile.type, 
            size: audioBuffer.byteLength,
            duration: 0 // Duration not available from Whisper API
          },
          created_by: user.id
        })
        .select('id')
        .single();

      if (sourceError) throw sourceError;

      // Create media file record
      const { data: mediaFile, error: mediaError } = await supabaseAdmin
        .from('media_files')
        .insert({
          org_id: orgId,
          source_id: source.id,
          kind: 'audio',
          storage_url: audioUrl,
          mime_type: audioFile.type,
          duration_seconds: 0 // Duration not available from Whisper API
        })
        .select('id')
        .single();

      if (mediaError) throw mediaError;

      // Create voice call record
      const { data: voiceCall, error: voiceCallError } = await supabaseAdmin
        .from('voice_calls')
        .insert({
          org_id: orgId,
          person_id: personId || null,
          source_id: source.id,
          media_id: mediaFile.id,
          scenario,
          context_scope: contextScope,
          started_at: new Date().toISOString(),
          lang: transcription.language,
          stt_model: 'whisper-1',
          stt_confidence: 0.85,
          transcript: transcription.text,
          transcript_json: null // Segments not available in basic transcription
        })
        .select('*')
        .single();

      if (voiceCallError) throw voiceCallError;

      // Create document for the transcript
      const { data: document, error: docError } = await supabaseAdmin
        .from('documents')
        .insert({
          org_id: orgId,
          source_id: source.id,
          person_id: personId || null,
          title: `Voice note ${voiceCall.id}`,
          kind: 'transcript',
          raw: transcription.text
        })
        .select('id')
        .single();

      if (docError) throw docError;

      // Create document chunk for embeddings
      const { error: chunkError } = await supabaseAdmin
        .from('doc_chunks')
        .insert({
          org_id: orgId,
          doc_id: document.id,
          ord: 0,
          text: transcription.text,
          meta: { voice_call_id: voiceCall.id }
        });

      if (chunkError) throw chunkError;

      return {
        voiceCallId: voiceCall.id,
        sourceId: source.id,
        transcript: transcription.text,
        language: transcription.language,
        duration: 0 // Duration not available from Whisper API
      };
    } catch (error) {
      console.error('Voice transcription error:', error);
      throw new Error('Failed to transcribe voice note');
    }
  });