import 'server-only';

// Server-side guard to prevent client-side imports
if (typeof window !== 'undefined') {
  throw new Error('backend/trpc/app-router.ts was imported in a client bundle. This file should only be imported server-side.');
}

import { router, publicProcedure } from "./server";
import hiRoute from "./routes/example/hi/route";
import { 
  listGoalsProcedure, 
  createGoalProcedure, 
  updateGoalProcedure, 
  deleteGoalProcedure, 
  getDefaultGoalsProcedure 
} from "./routes/messages/goals/route";
import { 
  generateMessageProcedure, 
  updateMessageProcedure, 
  trackEventProcedure, 
  listMessagesProcedure 
} from "./routes/messages/generate/route";
import {
  uploadMediaProcedure,
  listMediaAssetsProcedure,
  deleteMediaAssetProcedure
} from "./routes/media/upload/route";
import {
  analyzeMediaProcedure,
  getMediaAssetProcedure
} from "./routes/media/analyze/route";
import {
  addNoteProcedure,
  updateInterestsProcedure,
  updateGoalsProcedure,
  updateTagsProcedure,
  getPersonNotesProcedure,
  updatePersonInfoProcedure,
  addPersonalNoteProcedure,
  updatePersonalNoteProcedure,
  deletePersonalNoteProcedure,
  getPersonalNotesProcedure,
  getAllNotesProcedure
} from "./routes/people/notes/route";

// AI Texting Concierge routes
import {
  findMatchesProcedure,
  createIntroProcedure,
  respondToIntroProcedure
} from "./routes/concierge/matching/route";
import {
  startOnboardingProcedure,
  updateProfileProcedure,
  grantConsentProcedure,
  getProfileProcedure,
  suggestInterestsProcedure
} from "./routes/concierge/onboarding/route";
import {
  queueMessageProcedure,
  getPendingJobsProcedure,
  updateJobStatusProcedure,
  recordInboundMessageProcedure,
  getConnectorConfigProcedure,
  updateConnectorHealthProcedure
} from "./routes/concierge/relay/route";
import {
  testOpenAIProcedure,
  listOpenAIModelsProcedure
} from "./routes/openai/test/route";
import { z } from "zod";
import crypto from "crypto";
import { 
  supabaseAdmin, 
  getPersonById, 
  listPeople, 
  createVoiceCall, 
  createInsight, 
  getPendingInsights, 
  approveInsight, 
  rejectInsight, 
  logUXEvent, 
  updatePersonLastCopy 
} from "../lib/supabase";
import { 
  transcribeAudio, 
  extractInsights, 
  buildContextCard, 
  craftMessage, 
  generateEmbeddings 
} from "../lib/openai";

// Mock org and user IDs for development
const MOCK_ORG_ID = "550e8400-e29b-41d4-a716-446655440000";
const MOCK_USER_ID = "550e8400-e29b-41d4-a716-446655440001";

export const appRouter = router({
  example: router({
    hi: hiRoute,
  }),
  
  voice: router({
    transcribe: publicProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        personId: z.string().uuid().optional(),
        contextScope: z.enum(['about_person', 'about_me']).default('about_person'),
        mimeType: z.string().optional(),
        durationSeconds: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          // Fetch audio file
          const response = await fetch(input.audioUrl);
          if (!response.ok) throw new Error('Failed to fetch audio file');
          
          const arrayBuffer = await response.arrayBuffer();
          const file = new File([arrayBuffer], 'voice-note.m4a', { 
            type: input.mimeType || 'audio/m4a' 
          });

          // Transcribe with OpenAI
          const transcription = await transcribeAudio(file);
          
          // Create provenance records
          const sha256 = crypto.createHash('sha256').update(transcription.text).digest('hex');
          
          const { data: source, error: sourceError } = await supabaseAdmin
            .from('sources')
            .insert({
              org_id: MOCK_ORG_ID,
              kind: 'audio',
              uri: input.audioUrl,
              sha256,
              meta: { 
                mime: input.mimeType || 'audio/m4a', 
                duration: input.durationSeconds,
                length: transcription.text.length 
              },
              created_by: MOCK_USER_ID
            })
            .select()
            .single();
          
          if (sourceError) throw sourceError;

          const { data: media, error: mediaError } = await supabaseAdmin
            .from('media_files')
            .insert({
              org_id: MOCK_ORG_ID,
              source_id: source.id,
              kind: 'audio',
              storage_url: input.audioUrl,
              mime_type: input.mimeType || 'audio/m4a',
              duration_seconds: input.durationSeconds
            })
            .select()
            .single();
          
          if (mediaError) throw mediaError;

          const voiceCall = await createVoiceCall({
            org_id: MOCK_ORG_ID,
            person_id: input.personId || undefined,
            source_id: source.id,
            media_id: media.id,
            scenario: 'voice_note',
            context_scope: input.contextScope,
            started_at: new Date().toISOString(),
            stt_model: 'whisper-1',
            stt_confidence: 0.85,
            transcript: transcription.text,
            lang: transcription.language
          });

          // Create document for indexing
          const { data: doc, error: docError } = await supabaseAdmin
            .from('documents')
            .insert({
              org_id: MOCK_ORG_ID,
              source_id: source.id,
              person_id: input.personId || null,
              title: `Voice note ${voiceCall.id}`,
              kind: 'transcript',
              raw: transcription.text
            })
            .select()
            .single();
          
          if (docError) throw docError;

          // Create document chunk for embeddings
          const { error: chunkError } = await supabaseAdmin
            .from('doc_chunks')
            .insert({
              org_id: MOCK_ORG_ID,
              doc_id: doc.id,
              ord: 0,
              text: transcription.text,
              meta: { voice_call_id: voiceCall.id }
            });
          
          if (chunkError) throw chunkError;

          return {
            voiceCallId: voiceCall.id,
            sourceId: source.id,
            docId: doc.id,
            transcript: transcription.text,
            language: transcription.language
          };
        } catch (error: any) {
          console.error('Transcription error:', error);
          throw new Error(`Transcription failed: ${error.message}`);
        }
      }),

    extractInsights: publicProcedure
      .input(z.object({
        transcript: z.string(),
        sourceId: z.string().uuid(),
        personId: z.string().uuid().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          const insights = await extractInsights(input.transcript);
          
          const insight = await createInsight({
            org_id: MOCK_ORG_ID,
            person_id: input.personId || MOCK_USER_ID, // Use user ID if no person specified
            source_id: input.sourceId,
            proposal: insights,
            confidence: 0.85,
            status: 'pending'
          });

          return {
            insightId: insight.id,
            insights
          };
        } catch (error: any) {
          console.error('Insight extraction error:', error);
          throw new Error(`Insight extraction failed: ${error.message}`);
        }
      })
  }),

  people: router({
    list: publicProcedure
      .input(z.object({
        warmthFilter: z.enum(['hot', 'warm', 'cool', 'cold']).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0)
      }))
      .query(async ({ input }) => {
        try {
          const people = await listPeople(MOCK_ORG_ID, {
            warmthFilter: input.warmthFilter,
            limit: input.limit,
            offset: input.offset
          });

          return {
            people: people.map(person => ({
              id: person.id,
              full_name: person.full_name,
              title: person.title,
              company: person.company,
              warmth: person.warmth,
              last_interaction: person.last_interaction,
              last_interaction_summary: person.last_interaction_summary,
              interests: person.interests,
              goals: person.goals,
              tags: person.tags,
              created_at: person.created_at,
              updated_at: person.updated_at
            })),
            total: people.length
          };
        } catch (error: any) {
          console.error('List people error:', error);
          throw new Error(`Failed to list people: ${error.message}`);
        }
      }),

    getById: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        try {
          const person = await getPersonById(MOCK_ORG_ID, input.id);
          return person;
        } catch (error: any) {
          console.error('Get person error:', error);
          throw new Error(`Failed to get person: ${error.message}`);
        }
      }),

    contextCard: publicProcedure
      .input(z.object({
        personId: z.string().uuid(),
        myContext: z.object({
          currentFocus: z.array(z.string()).optional(),
          personalHooks: z.array(z.string()).optional()
        }).optional()
      }))
      .query(async ({ input }) => {
        try {
          const person = await getPersonById(MOCK_ORG_ID, input.personId);
          const contextCard = await buildContextCard(person, input.myContext);
          return { card: contextCard };
        } catch (error: any) {
          console.error('Context card error:', error);
          throw new Error(`Failed to build context card: ${error.message}`);
        }
      }),

    craftMessage: publicProcedure
      .input(z.object({
        personId: z.string().uuid(),
        messageGoal: z.object({
          goal: z.enum(['check_in', 'congratulate', 'share_resource', 'ask_intro', 'schedule_meet']),
          channel: z.enum(['sms', 'email', 'dm']),
          tone: z.enum(['casual', 'neutral', 'formal']),
          brevity: z.enum(['short', 'medium', 'long']),
          constraints: z.object({
            quiet_hours_ok: z.boolean().optional(),
            no_emojis: z.boolean().optional()
          }).optional(),
          cta: z.enum(['open_ended', 'specific_time', 'link_click']).optional(),
          avoid: z.array(z.string()).optional(),
          success_criteria: z.string().optional()
        }),
        myContext: z.object({
          currentFocus: z.array(z.string()).optional(),
          personalHooks: z.array(z.string()).optional()
        }).optional()
      }))
      .mutation(async ({ input }) => {
        try {
          const person = await getPersonById(MOCK_ORG_ID, input.personId);
          
          const contactCard = {
            name: person.full_name,
            title: person.title,
            company: person.company,
            interests: person.interests,
            goals: person.goals,
            values: person.values,
            lastTouch: person.last_interaction,
            recentNotes: person.last_interaction_summary ? [person.last_interaction_summary] : [],
            preferences: person.comms
          };

          const { drafts, flagged } = await craftMessage(contactCard, input.myContext, input.messageGoal);

          // Log the suggestion event
          await logUXEvent({
            org_id: MOCK_ORG_ID,
            user_id: MOCK_USER_ID,
            person_id: input.personId,
            kind: 'message_suggested',
            payload: {
              messageGoal: input.messageGoal,
              preview: drafts.variants?.[0]
            }
          });

          return { drafts, flagged };
        } catch (error: any) {
          console.error('Craft message error:', error);
          throw new Error(`Failed to craft message: ${error.message}`);
        }
      }),

    copyMessage: publicProcedure
      .input(z.object({
        personId: z.string().uuid(),
        channel: z.enum(['sms', 'email', 'dm']),
        preview: z.string()
      }))
      .mutation(async ({ input }) => {
        try {
          await updatePersonLastCopy(input.personId, input.channel, input.preview, MOCK_USER_ID);
          
          await logUXEvent({
            org_id: MOCK_ORG_ID,
            user_id: MOCK_USER_ID,
            person_id: input.personId,
            kind: 'message_copied',
            payload: {
              channel: input.channel,
              preview: input.preview
            }
          });

          return { success: true };
        } catch (error: any) {
          console.error('Copy message error:', error);
          throw new Error(`Failed to log message copy: ${error.message}`);
        }
      }),

    // Local storage routes for notes management
    addNote: addNoteProcedure,
    updateInterests: updateInterestsProcedure,
    updateGoals: updateGoalsProcedure,
    updateTags: updateTagsProcedure,
    getNotes: getPersonNotesProcedure,
    updateInfo: updatePersonInfoProcedure
  }),

  // Personal notes management
  personalNotes: router({
    add: addPersonalNoteProcedure,
    update: updatePersonalNoteProcedure,
    delete: deletePersonalNoteProcedure,
    list: getPersonalNotesProcedure,
    search: getAllNotesProcedure
  }),

  insights: router({
    pending: publicProcedure
      .query(async () => {
        try {
          const insights = await getPendingInsights(MOCK_ORG_ID);
          return { insights };
        } catch (error: any) {
          console.error('Get pending insights error:', error);
          throw new Error(`Failed to get pending insights: ${error.message}`);
        }
      }),

    approve: publicProcedure
      .input(z.object({ 
        insightId: z.string().uuid(),
        edits: z.object({
          interests: z.array(z.string()).optional(),
          goals: z.array(z.string()).optional(),
          values: z.array(z.string()).optional(),
          notes: z.string().optional(),
          keyDates: z.array(z.object({
            type: z.string(),
            dateISO: z.string(),
            note: z.string().optional()
          })).optional()
        }).optional()
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await approveInsight(input.insightId, MOCK_USER_ID, input.edits);
          return result;
        } catch (error: any) {
          console.error('Approve insight error:', error);
          throw new Error(`Failed to approve insight: ${error.message}`);
        }
      }),

    reject: publicProcedure
      .input(z.object({ 
        insightId: z.string().uuid(),
        reason: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await rejectInsight(input.insightId, MOCK_USER_ID, input.reason);
          return result;
        } catch (error: any) {
          console.error('Reject insight error:', error);
          throw new Error(`Failed to reject insight: ${error.message}`);
        }
      })
  }),

  embeddings: router({
    generate: publicProcedure
      .input(z.object({
        texts: z.array(z.string()),
        docId: z.string().uuid().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          const embeddings = await generateEmbeddings(input.texts);
          
          // If docId provided, update the doc_chunks with embeddings
          if (input.docId) {
            const { data: chunks, error: fetchError } = await supabaseAdmin
              .from('doc_chunks')
              .select('id')
              .eq('doc_id', input.docId)
              .is('embedding', null)
              .order('ord');
            
            if (fetchError) throw fetchError;
            
            // Update chunks with embeddings
            for (let i = 0; i < Math.min(chunks.length, embeddings.length); i++) {
              const { error: updateError } = await supabaseAdmin
                .from('doc_chunks')
                .update({ embedding: embeddings[i] })
                .eq('id', chunks[i].id);
              
              if (updateError) throw updateError;
            }
            
            return { embeddings, updated: Math.min(chunks.length, embeddings.length) };
          }
          
          return { embeddings };
        } catch (error: any) {
          console.error('Generate embeddings error:', error);
          throw new Error(`Failed to generate embeddings: ${error.message}`);
        }
      })
  }),

  messageGoals: router({
    list: listGoalsProcedure,
    create: createGoalProcedure,
    update: updateGoalProcedure,
    delete: deleteGoalProcedure,
    defaults: getDefaultGoalsProcedure
  }),

  messages: router({
    generate: generateMessageProcedure,
    update: updateMessageProcedure,
    list: listMessagesProcedure,
    trackEvent: trackEventProcedure
  }),

  media: router({
    upload: uploadMediaProcedure,
    list: listMediaAssetsProcedure,
    delete: deleteMediaAssetProcedure,
    analyze: analyzeMediaProcedure,
    get: getMediaAssetProcedure
  }),

  // AI Texting Concierge
  concierge: router({
    matching: router({
      findMatches: findMatchesProcedure,
      createIntro: createIntroProcedure,
      respondToIntro: respondToIntroProcedure
    }),
    
    onboarding: router({
      start: startOnboardingProcedure,
      updateProfile: updateProfileProcedure,
      grantConsent: grantConsentProcedure,
      getProfile: getProfileProcedure,
      suggestInterests: suggestInterestsProcedure
    }),
    
    relay: router({
      queueMessage: queueMessageProcedure,
      getPendingJobs: getPendingJobsProcedure,
      updateJobStatus: updateJobStatusProcedure,
      recordInboundMessage: recordInboundMessageProcedure,
      getConnectorConfig: getConnectorConfigProcedure,
      updateConnectorHealth: updateConnectorHealthProcedure
    })
  }),

  // OpenAI Testing
  openai: router({
    test: testOpenAIProcedure,
    listModels: listOpenAIModelsProcedure
  })
});

export type AppRouter = typeof appRouter;