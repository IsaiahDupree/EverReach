import { KV } from '@/storage/AsyncStorageService';
import { GeneratedMessage } from '@/types/message';
import { FLAGS } from '@/constants/flags';
import { SupabaseMessagesRepo } from './SupabaseMessagesRepo';

const PREFIX = 'messages/';

/**
 * Hybrid Messages Repository
 * Uses local storage when LOCAL_ONLY is true, otherwise uses Supabase
 */

// Local storage implementation
const LocalMessagesRepo = {
  async all(): Promise<GeneratedMessage[]> {
    const keys = await KV.keys(PREFIX);
    const rows = await Promise.all(keys.map(k => KV.get<GeneratedMessage>(k)));
    return (rows.filter(Boolean) as GeneratedMessage[]).sort((a, b) => b.createdAt - a.createdAt);
  },

  async get(id: string): Promise<GeneratedMessage | null> {
    return KV.get<GeneratedMessage>(PREFIX + id);
  },

  async create(message: Omit<GeneratedMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneratedMessage> {
    const newMessage: GeneratedMessage = {
      ...message,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await KV.set(PREFIX + newMessage.id, newMessage);
    return newMessage;
  },

  async update(id: string, updates: Partial<GeneratedMessage>): Promise<GeneratedMessage> {
    const existing = await KV.get<GeneratedMessage>(PREFIX + id);
    if (!existing) {
      throw new Error(`Message ${id} not found`);
    }
    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await KV.set(PREFIX + id, updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    await KV.remove(PREFIX + id);
  },

  async getByContact(contactId: string): Promise<GeneratedMessage[]> {
    const all = await this.all();
    return all.filter(m => m.contactId === contactId).sort((a, b) => a.createdAt - b.createdAt);
  },
};

// Export hybrid repo that switches based on FLAGS.LOCAL_ONLY
export const MessagesRepo = {
  async all(): Promise<GeneratedMessage[]> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[MessagesRepo] Using LOCAL storage');
      return LocalMessagesRepo.all();
    }
    console.log('[MessagesRepo] Using SUPABASE');
    return SupabaseMessagesRepo.all();
  },

  async get(id: string): Promise<GeneratedMessage | null> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalMessagesRepo.get(id);
    }
    return SupabaseMessagesRepo.get(id);
  },

  async create(message: Omit<GeneratedMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneratedMessage> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalMessagesRepo.create(message);
    }
    return SupabaseMessagesRepo.create(message);
  },

  async update(id: string, updates: Partial<GeneratedMessage>): Promise<GeneratedMessage> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalMessagesRepo.update(id, updates);
    }
    return SupabaseMessagesRepo.update(id, updates);
  },

  async remove(id: string): Promise<void> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalMessagesRepo.remove(id);
    }
    return SupabaseMessagesRepo.remove(id);
  },

  async getByContact(contactId: string): Promise<GeneratedMessage[]> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalMessagesRepo.getByContact(contactId);
    }
    return SupabaseMessagesRepo.getByContact(contactId);
  },

  /**
   * Prepare a message using AI composition (backend only)
   */
  async prepare(params: {
    contactId: string;
    goalId: string;
    tone?: string;
    length?: string;
    channel?: string;
  }): Promise<{ variants: Array<{ text: string; subject?: string }> }> {
    if (FLAGS.LOCAL_ONLY) {
      throw new Error('Message preparation requires backend connection');
    }
    return SupabaseMessagesRepo.prepare(params);
  },

  /**
   * Send a message (backend only)
   */
  async send(messageId: string, params: {
    channel: string;
    variantIndex: number;
  }): Promise<{ success: boolean; messageId?: string }> {
    if (FLAGS.LOCAL_ONLY) {
      throw new Error('Sending messages requires backend connection');
    }
    return SupabaseMessagesRepo.send(messageId, params);
  },

  /**
   * Subscribe to real-time changes (Supabase only)
   */
  subscribeToChanges(callback: (payload: any) => void) {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[MessagesRepo] Real-time subscriptions not available in LOCAL_ONLY mode');
      return () => {}; // No-op unsubscribe
    }
    return SupabaseMessagesRepo.subscribeToChanges(callback);
  },
};