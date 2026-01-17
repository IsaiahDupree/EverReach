export type PipelineKey = 'networking' | 'personal' | 'business';

export type Person = {
  id: string;
  name: string;
  fullName: string;
  emails?: string[];
  phones?: string[];
  company?: string;
  title?: string;
  timezone?: string;
  locale?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  tags?: string[];
  interests?: string[];
  goals?: string[];
  values?: string[];
  keyDates?: {
    type: string;
    dateISO: string;
    note?: string;
  }[];
  lastInteraction?: string;
  lastInteractionSummary?: string;
  nextTouchAt?: string;
  cadenceDays?: number;
  lastSuggestCopyAt?: string;
  comms?: {
    channelsPreferred?: string[];
    style?: {
      tone?: 'casual' | 'neutral' | 'formal';
      brevity?: 'short' | 'medium' | 'long';
    };
  };
  interactions?: {
    id: string;
    channel: 'sms' | 'email' | 'dm' | 'call' | 'meet' | 'note';
    occurredAt: string;
    summary: string;
    sentiment?: 'pos' | 'neu' | 'neg';
  }[];
  warmth?: number;
  pipeline?: PipelineKey;
  status?: string;
  theme?: PipelineKey;
  createdAt: number;
};

export type Message = {
  id: string;
  personId: string;
  body: string;
  createdAt: number;
  kind?: 'ai' | 'human';
};

export type VoiceNote = {
  id: string;
  personId?: string;
  transcription: string;
  audioUri: string;
  createdAt: number;
  processed?: boolean;
};

export type TextNote = {
  id: string;
  personId?: string;
  content: string;
  createdAt: number;
};