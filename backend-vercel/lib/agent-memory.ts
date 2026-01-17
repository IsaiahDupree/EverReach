import { SupabaseClient } from '@supabase/supabase-js';
import { estimateTokens } from './openai';

export type ConversationMessage = {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
  timestamp?: string;
};

export type ConversationMemory = {
  conversation_id: string;
  user_id: string;
  messages: ConversationMessage[];
  context: Record<string, any>;
  token_count: number;
  created_at: string;
  updated_at: string;
};

const MAX_CONTEXT_TOKENS = 12000; // Leave room for response

export class AgentMemoryManager {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  // Store conversation in database
  async saveConversation(conversationId: string, messages: ConversationMessage[], context: Record<string, any> = {}) {
    const tokenCount = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
    
    const { data, error } = await this.supabase
      .from('agent_conversations')
      .upsert({
        id: conversationId,
        user_id: this.userId,
        messages: JSON.stringify(messages),
        context: JSON.stringify(context),
        token_count: tokenCount,
        updated_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();
    
    if (error) throw new Error(`Failed to save conversation: ${error.message}`);
    return data;
  }

  // Load conversation from database
  async loadConversation(conversationId: string): Promise<ConversationMemory | null> {
    const { data, error } = await this.supabase
      .from('agent_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', this.userId)
      .maybeSingle();
    
    if (error || !data) return null;
    
    return {
      conversation_id: data.id,
      user_id: data.user_id,
      messages: JSON.parse(data.messages || '[]'),
      context: JSON.parse(data.context || '{}'),
      token_count: data.token_count || 0,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  // List user's conversations
  async listConversations(limit: number = 20) {
    const { data, error } = await this.supabase
      .from('agent_conversations')
      .select('id, created_at, updated_at, token_count')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(`Failed to list conversations: ${error.message}`);
    return data || [];
  }

  // Delete conversation
  async deleteConversation(conversationId: string) {
    const { error } = await this.supabase
      .from('agent_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', this.userId);
    
    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
  }

  // Trim messages to fit within token limit
  trimMessages(messages: ConversationMessage[], maxTokens: number = MAX_CONTEXT_TOKENS): ConversationMessage[] {
    // Always keep system message
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    let totalTokens = systemMessages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
    const trimmedMessages = [...systemMessages];
    
    // Add messages from most recent until we hit token limit
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const msg = otherMessages[i];
      const msgTokens = estimateTokens(msg.content);
      
      if (totalTokens + msgTokens <= maxTokens) {
        trimmedMessages.push(msg);
        totalTokens += msgTokens;
      } else {
        break;
      }
    }
    
    // Sort to maintain chronological order (except system first)
    return [
      ...systemMessages,
      ...trimmedMessages.filter(m => m.role !== 'system').sort((a, b) => {
        const aTime = a.timestamp || '';
        const bTime = b.timestamp || '';
        return aTime.localeCompare(bTime);
      })
    ];
  }

  // Summarize conversation for long-term memory
  async summarizeConversation(messages: ConversationMessage[]): Promise<string> {
    // Extract key points from conversation
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);
    
    const summary = {
      message_count: messages.length,
      user_topics: this.extractKeywords(userMessages.join(' ')),
      assistant_actions: this.extractKeywords(assistantMessages.join(' ')),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(summary);
  }

  // Simple keyword extraction
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4); // Words longer than 4 chars
    
    // Count frequency
    const frequency: Record<string, number> = {};
    words.forEach(w => {
      frequency[w] = (frequency[w] || 0) + 1;
    });
    
    // Return top 5 keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Store user preferences/context
  async saveUserContext(key: string, value: any) {
    const { error } = await this.supabase
      .from('user_agent_context')
      .upsert({
        user_id: this.userId,
        context_key: key,
        context_value: JSON.stringify(value),
        updated_at: new Date().toISOString()
      });
    
    if (error) throw new Error(`Failed to save context: ${error.message}`);
  }

  // Retrieve user preferences/context
  async loadUserContext(key: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('user_agent_context')
      .select('context_value')
      .eq('user_id', this.userId)
      .eq('context_key', key)
      .maybeSingle();
    
    if (error || !data) return null;
    return JSON.parse(data.context_value || 'null');
  }
}
