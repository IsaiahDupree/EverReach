import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const DEFAULT_MODEL = 'gpt-4o-mini';
export const ADVANCED_MODEL = 'gpt-4o';
export const TRANSCRIPTION_MODEL = 'whisper-1';

// System prompts for different agent personalities
export const SYSTEM_PROMPTS = {
  assistant: `You are an intelligent personal CRM assistant. You help users manage their contacts, relationships, and communications effectively. 
You have access to their contacts, interaction history, voice notes, and personal context. 
Be concise, helpful, and proactive in suggesting actions.`,

  composer: `You are a message composition expert. You craft personalized, context-aware messages for different purposes (personal, networking, business).
You analyze the relationship history, user's voice notes about the contact, and tailor the tone and content appropriately.
Always consider the user's goals and the contact's context when composing messages.`,

  analyzer: `You are a relationship intelligence analyst. You analyze contacts, interactions, and voice notes to provide insights.
You identify patterns, suggest engagement strategies, and help users strengthen their relationships.
Be specific, data-driven, and actionable in your recommendations.`,

  transcriber: `You are a voice note processor. You transcribe audio accurately and extract key information:
- Main points and action items
- Contact references
- Sentiment and context
- Categories (personal/networking/business)
Format the output as structured JSON with extracted metadata.`,

  contextBuilder: `You are a context aggregator. You synthesize information from multiple sources:
- Voice notes and persona notes
- Interaction history
- Contact details and tags
- User's stated goals
Create a comprehensive, relevant context summary for message composition or relationship insights.`
};

// Agent function/tool definitions
export const AGENT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_contact',
      description: 'Retrieve detailed information about a specific contact by ID or search criteria',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'UUID of the contact' },
          query: { type: 'string', description: 'Search query (name, email, tag)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_contacts',
      description: 'Search contacts by name, email, tags, or other criteria',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          filters: {
            type: 'object',
            properties: {
              tag: { type: 'string' },
              warmth_band: { type: 'string', enum: ['hot', 'warm', 'neutral', 'cool', 'cold'] },
              pipeline: { type: 'string', enum: ['personal', 'networking', 'business'] }
            }
          },
          limit: { type: 'number', default: 10 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_interactions',
      description: 'Get recent interactions/messages with a contact',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact UUID' },
          limit: { type: 'number', default: 10 }
        },
        required: ['contact_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_persona_notes',
      description: 'Get user\'s voice notes and personal context about contacts or topics',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Filter by contact' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
          type: { type: 'string', enum: ['text', 'voice'], description: 'Note type' },
          limit: { type: 'number', default: 5 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compose_message',
      description: 'Generate a context-aware message for a contact based on goal and relationship context',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact UUID' },
          goal_type: { type: 'string', enum: ['personal', 'networking', 'business'], description: 'Message goal' },
          goal_description: { type: 'string', description: 'Specific goal or purpose' },
          channel: { type: 'string', enum: ['email', 'sms', 'dm'], default: 'email' },
          tone: { type: 'string', enum: ['concise', 'warm', 'professional', 'playful'], default: 'warm' }
        },
        required: ['contact_id', 'goal_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_contact',
      description: 'Analyze a contact\'s profile and relationship to provide insights and suggestions',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact UUID' },
          analysis_type: {
            type: 'string',
            enum: ['relationship_health', 'engagement_suggestions', 'context_summary'],
            default: 'context_summary'
          }
        },
        required: ['contact_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_contact',
      description: 'Update contact information (tags, notes, warmth, etc)',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact UUID' },
          updates: {
            type: 'object',
            properties: {
              tags: { type: 'array', items: { type: 'string' } },
              notes: { type: 'string' },
              warmth: { type: 'number', minimum: 0, maximum: 100 }
            }
          }
        },
        required: ['contact_id', 'updates']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_message_goals',
      description: 'Get suggested message goals based on contact and user context',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'Contact UUID' },
          category: { type: 'string', enum: ['personal', 'networking', 'business'] }
        },
        required: ['contact_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'process_voice_note',
      description: 'Process a voice note: extract entities, sentiment, action items, and associate with contacts',
      parameters: {
        type: 'object',
        properties: {
          note_id: { type: 'string', description: 'Voice note UUID' },
          extract_contacts: { type: 'boolean', default: true, description: 'Extract contact references' },
          extract_actions: { type: 'boolean', default: true, description: 'Extract action items' }
        },
        required: ['note_id']
      }
    }
  }
];

// Helper to build context from multiple sources
export async function buildAgentContext(userId: string, contactId?: string, includePersonaNotes: boolean = true) {
  // This will be called by routes to aggregate context
  return {
    user_id: userId,
    contact_id: contactId,
    timestamp: new Date().toISOString(),
    context_sources: {
      persona_notes: includePersonaNotes,
      interactions: true,
      contact_details: !!contactId
    }
  };
}

// Token counting utility
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Stream handler helper
export function createStreamHandler(onChunk: (chunk: string) => void) {
  return async (stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) => {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) onChunk(content);
    }
  };
}
