import { z } from "zod";

export const craftMessageSchema = z.object({
  tone: z.string().optional(),
  purpose: z.string().min(1),
  context: z.string().optional(),
  voiceContext: z.string().max(500).optional(),
  to: z
    .object({ name: z.string().optional(), email: z.string().email().optional() })
    .optional(),
});

export type CraftMessageInput = z.infer<typeof craftMessageSchema>;

export const uploadSignSchema = z.object({
  path: z.string().min(1),
  contentType: z.string().min(1).optional(),
});

export type UploadSignInput = z.infer<typeof uploadSignSchema>;

// Contacts
export const contactCreateSchema = z.object({
  display_name: z.string().min(1, 'display_name is required').max(120),
  emails: z.array(z.string().email()).max(10).optional(),
  phones: z.array(z.string().min(3).max(40)).max(10).optional(),
  company: z.string().max(120).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(50).optional(),
  avatar_url: z.string().url().optional(),
  photo_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  warmth: z.number().int().min(0).max(100).optional(),
  warmth_band: z.enum(['hot', 'warm', 'neutral', 'cool', 'cold']).optional(),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;

export const contactUpdateSchema = z.object({
  display_name: z.string().min(1).max(120).optional(),
  emails: z.array(z.string().email()).max(10).optional(),
  phones: z.array(z.string().min(3).max(40)).max(10).optional(),
  company: z.string().max(120).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(50).optional(),
  avatar_url: z.string().url().optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
  metadata: z.record(z.any()).optional(),
  warmth: z.number().int().min(0).max(100).optional(),
  warmth_band: z.enum(['hot', 'warm', 'neutral', 'cool', 'cold']).optional(),
  warmth_override: z.boolean().optional(),
  warmth_override_reason: z.string().max(500).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

// Files / attachments
export const fileCommitSchema = z.object({
  path: z.string().min(1),
  mime_type: z.string().min(1).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  contact_id: z.string().uuid().optional(),
  message_id: z.string().uuid().optional(),
});

export type FileCommitInput = z.infer<typeof fileCommitSchema>;

// Interactions
export const interactionCreateSchema = z.object({
  contact_id: z.string().uuid(),
  kind: z.string().min(1).default('note'),
  content: z.string().max(10000).optional(),
  metadata: z.record(z.any()).optional(),
  occurred_at: z.string().datetime().optional(),
});

export type InteractionCreateInput = z.infer<typeof interactionCreateSchema>;

export const interactionQuerySchema = z.object({
  contact_id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(), // ISO timestamp of created_at
});

export type InteractionQueryInput = z.infer<typeof interactionQuerySchema>;

// v1 additions
export const tagsModifySchema = z.object({
  add: z.array(z.string().min(1).max(40)).optional(),
  remove: z.array(z.string().min(1).max(40)).optional(),
}).refine(obj => (obj.add?.length || 0) + (obj.remove?.length || 0) > 0, { message: 'add or remove required' });

export type TagsModifyInput = z.infer<typeof tagsModifySchema>;

export const interactionUpdateSchema = z.object({
  content: z.string().max(10000).optional(),
  metadata: z.record(z.any()).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export type InteractionUpdateInput = z.infer<typeof interactionUpdateSchema>;

export const fileLinkSchema = z.object({
  path: z.string().min(1),
  mime_type: z.string().min(1).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
});

export type FileLinkInput = z.infer<typeof fileLinkSchema>;

export const contactsListQuerySchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  has_email: z.coerce.boolean().optional(),
  updated_since: z.string().datetime().optional(),
  warmth_gte: z.coerce.number().int().min(0).max(100).optional(),
  warmth_lte: z.coerce.number().int().min(0).max(100).optional(),
  warmth_band: z.enum(['hot','warm','neutral','cool','cold']).optional(),
  pipeline: z.enum(['networking','personal','business']).optional(),
  stage: z.string().max(80).optional(),
  sort: z.enum(['created_at.desc','created_at.asc','updated_at.desc','updated_at.asc','warmth.desc','warmth.asc']).default('created_at.desc').optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(20).optional(),
  cursor: z.string().optional(),
});

export type ContactsListQuery = z.infer<typeof contactsListQuerySchema>;

export const searchSchema = z.object({
  q: z.string().default(''),
  limit: z.number().int().min(1).max(50).default(20).optional(),
  filters: z.object({
    warmth_band: z.array(z.enum(['hot','warm','neutral','cool','cold'])).optional(),
    warmth_gte: z.number().int().min(0).max(100).optional(),
    warmth_lte: z.number().int().min(0).max(100).optional(),
  }).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;

// Messages
export const messageLogSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['user','assistant','system','note']).optional(),
  thread_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export type MessageLogInput = z.infer<typeof messageLogSchema>;

// Persona Notes
export const personaNoteCreateSchema = z.object({
  type: z.enum(['text','voice','screenshot']),
  title: z.string().max(200).optional(),
  body_text: z.string().max(10000).optional(),
  file_url: z.string().url().optional(),
  duration_sec: z.number().int().positive().max(60 * 60).optional(),
  transcript: z.string().max(20000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(50).optional(),
  linked_contacts: z
    .array(
      z.union([
        z.string().uuid(),
        z.object({ id: z.string().uuid(), name: z.string().min(1).max(200).optional() }),
      ])
    )
    .max(20)
    .optional(),
  contact_id: z.string().uuid().optional(),
}).refine((o) => {
  if (o.type === 'text') return !!o.body_text;
  if (o.type === 'voice') return !!o.file_url;
  if (o.type === 'screenshot') return !!o.file_url;
  return false;
}, {
  message: 'For type=text, body_text is required. For type=voice or screenshot, file_url is required.',
})
.refine((o) => !o.file_url || /^https?:\/\//i.test(o.file_url), {
  message: 'file_url must be an http(s) URL',
});

export type PersonaNoteCreateInput = z.infer<typeof personaNoteCreateSchema>;

export const personaNoteUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  body_text: z.string().max(10000).optional(),
  file_url: z.string().url().optional(),
  duration_sec: z.number().int().positive().max(60 * 60).optional(),
  transcript: z.string().max(20000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(50).optional(),
  linked_contacts: z
    .array(
      z.union([
        z.string().uuid(),
        z.object({ id: z.string().uuid(), name: z.string().min(1).max(200).optional() }),
      ])
    )
    .max(20)
    .optional(),
  contact_id: z.string().uuid().optional(),
})
.refine((o) => !o.file_url || /^https?:\/\//i.test(o.file_url), {
  message: 'file_url must be an http(s) URL',
})
.refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export type PersonaNoteUpdateInput = z.infer<typeof personaNoteUpdateSchema>;

export const personaNotesListQuerySchema = z.object({
  type: z.enum(['text','voice','screenshot']).optional(),
  contact_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  cursor: z.string().optional(),
});

export type PersonaNotesListQuery = z.infer<typeof personaNotesListQuerySchema>;

// Templates
export const templateCreateSchema = z.object({
  channel: z.enum(['email','sms','dm']),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  subject_tmpl: z.string().max(500).optional(),
  body_tmpl: z.string().min(1),
  closing_tmpl: z.string().max(500).optional(),
  variables: z.array(z.any()).optional(),
  visibility: z.enum(['private','team','org']).optional(),
});

export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;

export const templateUpdateSchema = z.object({
  channel: z.enum(['email','sms','dm']).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  subject_tmpl: z.string().max(500).optional(),
  body_tmpl: z.string().min(1).optional(),
  closing_tmpl: z.string().max(500).optional(),
  variables: z.array(z.any()).optional(),
  visibility: z.enum(['private','team','org']).optional(),
  is_default: z.boolean().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

export const templatesListQuerySchema = z.object({
  channel: z.enum(['email','sms','dm']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  cursor: z.string().optional(),
});

export type TemplatesListQuery = z.infer<typeof templatesListQuerySchema>;

// Compose Settings
export const composeSettingsUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  default_channel: z.enum(['email','sms','dm']).optional(),
  auto_use_persona_notes: z.boolean().optional(),
  default_template_id: z.string().uuid().nullable().optional(),
  tone: z.enum(['concise','warm','professional','playful']).optional(),
  max_length: z.number().int().positive().max(20000).nullable().optional(),
  guardrails: z.record(z.any()).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export type ComposeSettingsUpdateInput = z.infer<typeof composeSettingsUpdateSchema>;

// Compose Orchestrator
export const composeRequestSchema = z.object({
  contact_id: z.string().uuid(),
  channel: z.enum(['email','sms','dm']),
  goal: z.enum(['business','networking','personal']).or(z.string().min(1)),
  template_id: z.string().uuid().optional(),
  variables: z.record(z.any()).optional(),
  include: z.object({
    persona_notes: z.boolean().default(true).optional(),
    recent_interactions: z.number().int().min(0).max(50).default(5).optional(),
    screenshots: z.boolean().default(false).optional(),
    voice_tone: z.boolean().default(true).optional(),
  }).optional(),
});

export type ComposeRequestInput = z.infer<typeof composeRequestSchema>;

// Messages prepare/send
export const messagesPrepareSchema = z.object({
  contact_id: z.string().uuid().optional(),
  thread_id: z.string().uuid().optional(),
  channel: z.enum(['email','sms','dm']),
  draft: z.object({
    subject: z.string().optional(),
    body: z.string(),
    closing: z.string().optional(),
  }),
  composer_context: z.record(z.any()).optional(),
});

export type MessagesPrepareInput = z.infer<typeof messagesPrepareSchema>;

export const messagesSendSchema = z.object({
  message_id: z.string().uuid(),
  channel_account_id: z.string().min(1).optional(),
});

export type MessagesSendInput = z.infer<typeof messagesSendSchema>;

// Telemetry: prompt-first
export const promptFirstSchema = z.object({
  prompt_raw: z.string().min(1),
  lang: z.string().max(10).optional(),
  intent: z.string().max(60).optional(),
  entities: z.record(z.any()).optional(),
  source: z.string().max(60).optional(),
  session_id: z.string().max(120).optional(),
  latency_ms: z.number().int().nonnegative().optional(),
  result_kind: z.string().max(60).optional(),
  error_code: z.string().max(120).optional(),
  used: z.boolean().optional(),
});

export type PromptFirstInput = z.infer<typeof promptFirstSchema>;

export const trendingQuerySchema = z.object({
  window: z.enum(['today','week','month']).default('today'),
  org: z.enum(['me','all']).default('all').optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
});

export type TrendingQueryInput = z.infer<typeof trendingQuerySchema>;

export const paywallWindowSchema = z.object({
  window: z.enum(['30d','90d','mtd']).default('30d').optional(),
});

export type PaywallWindowInput = z.infer<typeof paywallWindowSchema>;

// Goals
export const goalsListQuerySchema = z.object({
  kind: z.enum(['business','network','personal']).optional(),
  scope: z.enum(['global','org','user']).default('global').optional(),
});
export type GoalsListQuery = z.infer<typeof goalsListQuerySchema>;

export const goalCreateSchema = z.object({
  kind: z.enum(['business','network','personal']),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  channel_suggestions: z.array(z.enum(['email','sms','dm'])).optional(),
  variables_schema: z.record(z.any()).default({}).optional(),
  default_template_id: z.string().uuid().optional(),
});
export type GoalCreateInput = z.infer<typeof goalCreateSchema>;

export const goalUpdateSchema = z.object({
  kind: z.enum(['business','network','personal']).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  channel_suggestions: z.array(z.enum(['email','sms','dm'])).optional(),
  variables_schema: z.record(z.any()).optional(),
  default_template_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;

export const goalPinSchema = z.object({ pinned: z.boolean() });
export type GoalPinInput = z.infer<typeof goalPinSchema>;

// Compose validate
export const composeValidateSchema = z.object({
  goal_id: z.string().uuid().optional(),
  goal_text: z.string().min(3).max(140).optional(),
  variables: z.record(z.any()).default({}).optional(),
}).refine(o => !!(o.goal_id || o.goal_text), { message: 'goal_id or goal_text required' });
export type ComposeValidateInput = z.infer<typeof composeValidateSchema>;

// Screenshot analysis
export const screenshotAnalysisCreateSchema = z.object({
  file_url: z.string().url(),
  contact_id: z.string().uuid().optional(),
});
export type ScreenshotAnalysisCreateInput = z.infer<typeof screenshotAnalysisCreateSchema>;
