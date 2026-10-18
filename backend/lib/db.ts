import { Pool } from 'pg';

// Database connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/crm_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper function for queries
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Types
export interface Person {
  id: string;
  org_id: string;
  full_name: string;
  title?: string;
  company?: string;
  emails: string[];
  phones: string[];
  timezone?: string;
  locale?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };
  comms: {
    channelsPreferred: string[];
    style: {
      tone?: 'casual' | 'neutral' | 'formal';
      brevity?: 'short' | 'medium' | 'long';
      emojiOk?: boolean;
      voiceNotesOk?: boolean;
    };
  };
  tags: string[];
  interests: string[];
  goals: string[];
  values: string[];
  key_dates: {
    type: string;
    dateISO: string;
    note?: string;
  }[];
  last_interaction?: string;
  last_interaction_summary?: string;
  warmth: number;
  last_suggest_copy_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VoiceCall {
  id: string;
  org_id: string;
  person_id?: string;
  source_id: string;
  media_id?: string;
  scenario?: string;
  context_scope: 'about_person' | 'about_me';
  started_at?: string;
  ended_at?: string;
  lang?: string;
  stt_model?: string;
  stt_confidence?: number;
  transcript?: string;
  transcript_json?: any;
  created_at: string;
}

export interface Insight {
  id: string;
  org_id: string;
  person_id: string;
  source_id?: string;
  proposal: {
    notes?: string;
    goals?: string[];
    interests?: string[];
    values?: string[];
    keyDates?: {
      type: string;
      dateISO: string;
      note?: string;
    }[];
    tasks?: string[];
  };
  confidence?: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface OutboundMessage {
  id: string;
  org_id: string;
  person_id: string;
  channel: 'sms' | 'email' | 'dm';
  draft_text: string;
  suggested_send_at?: string;
  reason?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  send_status: 'drafted' | 'queued' | 'sent' | 'failed';
  provider_meta?: any;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  error?: string;
  created_at: string;
}

export interface MessageGoal {
  goal: 'check_in' | 'congratulate' | 'share_resource' | 'ask_intro' | 'schedule_meet';
  channel: 'sms' | 'email' | 'dm';
  tone: 'casual' | 'neutral' | 'formal';
  brevity: 'short' | 'medium' | 'long';
  constraints?: {
    quiet_hours_ok?: boolean;
    no_emojis?: boolean;
  };
  cta?: 'open_ended' | 'specific_time' | 'link_click';
  avoid?: string[];
  success_criteria?: string;
}

export interface ContextCard {
  hook: string;
  bullets: string[];
  highlights?: string[];
}

export interface MessageDrafts {
  subject?: string;
  variants: string[];
  reasons: string[];
}