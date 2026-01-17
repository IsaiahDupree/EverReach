import { z } from 'zod';
import type { Channel, ContextTab } from './navigation';

// Shared enums
export const ContextTabSchema = z.enum(['details', 'interactions', 'notes', 'activity', 'insights']);
export const ChannelSchema = z.enum(['sms', 'email', 'dm']);

// /contact-context/[id]?tab=...
export const ContactContextParamsSchema = z.object({
  id: z.union([z.string(), z.array(z.string())]).transform((v) => Array.isArray(v) ? v[0] : v),
  tab: z
    .union([z.undefined(), z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v[0] : v))
    .refine((v) => v === undefined || ContextTabSchema.safeParse(v).success, 'Invalid tab')
    .optional(),
});

export type ContactContextParams = {
  id: string;
  tab?: ContextTab;
};

export function parseContactContextParams(raw: Record<string, unknown>): ContactContextParams {
  const result = ContactContextParamsSchema.safeParse(raw);
  if (!result.success) {
    // Fallback best-effort parse
    const id = (raw as any)?.id;
    return { id: Array.isArray(id) ? id[0] : String(id || '') };
  }
  const id = result.data.id;
  const rawTab = (result.data.tab ?? undefined) as string | undefined;
  const tab = rawTab && ContextTabSchema.safeParse(rawTab).success ? (rawTab as ContextTab) : undefined;
  return { id, tab };
}

// /contact-notes/[id]
export const ContactNotesParamsSchema = z.object({
  id: z.union([z.string(), z.array(z.string())]).transform((v) => Array.isArray(v) ? v[0] : v),
});

export type ContactNotesParams = { id: string };

export function parseContactNotesParams(raw: Record<string, unknown>): ContactNotesParams {
  const r = ContactNotesParamsSchema.safeParse(raw);
  if (!r.success) {
    const id = (raw as any)?.id;
    return { id: Array.isArray(id) ? id[0] : String(id || '') };
  }
  return { id: r.data.id };
}

// /voice-note params
export const VoiceNoteParamsSchema = z.object({
  personId: z.union([z.string(), z.undefined()]).optional(),
  personName: z.union([z.string(), z.undefined()]).optional(),
});

export type VoiceNoteParams = {
  personId?: string;
  personName?: string;
};

export function parseVoiceNoteParams(raw: Record<string, unknown>): VoiceNoteParams {
  const q = VoiceNoteParamsSchema.safeParse(raw);
  if (!q.success) return {};
  return { personId: q.data.personId, personName: q.data.personName };
}

// Chat Intro or Chat tabs params
export const ChatIntroParamsSchema = z.object({
  initialQuery: z.union([z.string(), z.undefined()]).optional(),
  threadId: z.union([z.string(), z.undefined()]).optional(),
  threadLabel: z.union([z.string(), z.undefined()]).optional(),
});

export type ChatIntroParams = {
  initialQuery?: string;
  threadId?: string;
  threadLabel?: string;
};

export function parseChatIntroParams(raw: Record<string, unknown>): ChatIntroParams {
  const q = ChatIntroParamsSchema.safeParse(raw);
  if (!q.success) return {};
  return q.data as ChatIntroParams;
}

// /goal-picker params
export const GoalPickerParamsSchema = z.object({
  personId: z.union([z.string(), z.undefined()]).optional(),
  channel: ChannelSchema.default('sms'),
  suggestionContext: z.union([z.string(), z.undefined()]).optional(),
});

export type SuggestionContext = {
  goal: string;
  reason?: string;
  category?: string;
};

export type GoalPickerParams = {
  personId?: string;
  channel: Channel;
  suggestionContext?: SuggestionContext | null;
};

export function parseGoalPickerParams(raw: Record<string, unknown>): GoalPickerParams {
  const q = GoalPickerParamsSchema.safeParse(raw);
  if (!q.success) {
    return { channel: 'sms' } as GoalPickerParams;
  }
  const { personId, channel, suggestionContext } = q.data;
  let parsed: SuggestionContext | null | undefined = undefined;
  if (typeof suggestionContext === 'string') {
    try {
      parsed = JSON.parse(decodeURIComponent(suggestionContext)) as SuggestionContext;
    } catch {
      parsed = null;
    }
  }
  return { personId, channel: channel as Channel, suggestionContext: parsed };
}

// /message-results params
export const MessageResultsParamsSchema = z.object({
  personId: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v[0] : v),
  goalId: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v[0] : v),
  customGoal: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  channel: ChannelSchema.default('sms'),
  tone: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  additionalContext: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  generatedSubject: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  generatedBody: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  composeSessionId: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  screenshotContext: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  screenshotText: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  screenshotAssetId: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  aiSuggestionGoal: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  aiSuggestionReason: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
  aiSuggestionCategory: z.union([z.string(), z.undefined(), z.array(z.string())]).optional(),
});

export type MessageResultsParams = {
  personId: string;
  goalId: string;
  customGoal?: string;
  channel: Channel;
  tone?: string;
  additionalContext?: string;
  generatedSubject?: string;
  generatedBody?: string;
  composeSessionId?: string;
  screenshotContext?: string;
  screenshotText?: string;
  screenshotAssetId?: string;
  aiSuggestionGoal?: string;
  aiSuggestionReason?: string;
  aiSuggestionCategory?: string;
};

export function parseMessageResultsParams(raw: Record<string, unknown>): MessageResultsParams {
  const r = MessageResultsParamsSchema.safeParse(raw);
  if (!r.success) {
    // best-effort fallbacks
    const personId = Array.isArray((raw as any).personId) ? (raw as any).personId[0] : String((raw as any).personId || '');
    const goalId = Array.isArray((raw as any).goalId) ? (raw as any).goalId[0] : String((raw as any).goalId || '');
    const channel = ((raw as any).channel as Channel) || 'sms';
    return { personId, goalId, channel } as MessageResultsParams;
  }
  const d = r.data as any;
  const normalize = (v: any) => Array.isArray(v) ? v[0] : v;
  return {
    personId: d.personId,
    goalId: d.goalId,
    customGoal: normalize(d.customGoal),
    channel: d.channel as Channel,
    tone: normalize(d.tone),
    additionalContext: normalize(d.additionalContext),
    generatedSubject: normalize(d.generatedSubject),
    generatedBody: normalize(d.generatedBody),
    composeSessionId: normalize(d.composeSessionId),
    screenshotContext: normalize(d.screenshotContext),
    screenshotText: normalize(d.screenshotText),
    screenshotAssetId: normalize(d.screenshotAssetId),
    aiSuggestionGoal: normalize(d.aiSuggestionGoal),
    aiSuggestionReason: normalize(d.aiSuggestionReason),
    aiSuggestionCategory: normalize(d.aiSuggestionCategory),
  };
}

// /message-sent-success params
export const MessageSentSuccessParamsSchema = z.object({
  personId: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v[0] : v),
  personName: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v[0] : v),
});

export type MessageSentSuccessParams = {
  personId: string;
  personName: string;
};

export function parseMessageSentSuccessParams(raw: Record<string, unknown>): MessageSentSuccessParams {
  const r = MessageSentSuccessParamsSchema.safeParse(raw);
  if (!r.success) {
    const personId = Array.isArray((raw as any).personId) ? (raw as any).personId[0] : String((raw as any).personId || '');
    const personName = Array.isArray((raw as any).personName) ? (raw as any).personName[0] : String((raw as any).personName || 'Contact');
    return { personId, personName };
  }
  return r.data as MessageSentSuccessParams;
}
