import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { GeneratedMessage, MessageGoal, MessageStatus } from '@/types/message';

/**
 * Supabase-backed repository for messages
 * Uses both direct Supabase queries and REST API endpoints
 */
export const SupabaseMessagesRepo = {
  /**
   * Fetch all messages from Supabase
   */
  async all(): Promise<GeneratedMessage[]> {
    try {
      const response = await apiFetch('/api/v1/messages', { requireAuth: true });

      if (!response.ok) {
        console.error('[SupabaseMessagesRepo] Failed to fetch messages:', response.status);
        return [];
      }

      const data = await response.json();
      return (data.messages || data.items || []).map(mapBackendMessageToGenerated);
    } catch (error) {
      console.error('[SupabaseMessagesRepo.all] failed:', error);
      return [];
    }
  },

  /**
   * Fetch single message by ID
   */
  async get(id: string): Promise<GeneratedMessage | null> {
    try {
      const response = await apiFetch(`/api/v1/messages/${id}`, { requireAuth: true });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return mapBackendMessageToGenerated(data.message || data);
    } catch (error) {
      console.error(`[SupabaseMessagesRepo.get(${id})] failed:`, error);
      return null;
    }
  },

  /**
   * Create a new message
   */
  async create(message: Omit<GeneratedMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneratedMessage> {
    try {
      const payload = mapGeneratedMessageToBackend(message);

      const response = await apiFetch('/api/v1/messages', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Create failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return mapBackendMessageToGenerated(data.message || data);
    } catch (error) {
      console.error('[SupabaseMessagesRepo.create] failed:', error);
      throw error;
    }
  },

  /**
   * Update an existing message
   */
  async update(id: string, updates: Partial<GeneratedMessage>): Promise<GeneratedMessage> {
    try {
      const payload = mapGeneratedMessageToBackend(updates);

      const response = await apiFetch(`/api/v1/messages/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Update failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return mapBackendMessageToGenerated(data.message || data);
    } catch (error) {
      console.error(`[SupabaseMessagesRepo.update(${id})] failed:`, error);
      throw error;
    }
  },

  /**
   * Delete a message
   */
  async remove(id: string): Promise<void> {
    try {
      const response = await apiFetch(`/api/v1/messages/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error(`[SupabaseMessagesRepo.remove(${id})] failed:`, error);
      throw error;
    }
  },

  /**
   * Get messages for a specific contact
   */
  async getByContact(contactId: string): Promise<GeneratedMessage[]> {
    try {
      const response = await apiFetch(
        `/api/v1/contacts/${contactId}/messages`,
        { requireAuth: true }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.messages || data.items || []).map(mapBackendMessageToGenerated);
    } catch (error) {
      console.error(`[SupabaseMessagesRepo.getByContact(${contactId})] failed:`, error);
      return [];
    }
  },

  /**
   * Prepare a message using AI composition
   */
  async prepare(params: {
    contactId: string;
    goalId: string;
    tone?: string;
    length?: string;
    channel?: string;
  }): Promise<{ variants: Array<{ text: string; subject?: string }> }> {
    try {
      const response = await apiFetch('/api/v1/messages/prepare', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Prepare failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[SupabaseMessagesRepo.prepare] failed:', error);
      throw error;
    }
  },

  /**
   * Send a message
   */
  async send(messageId: string, params: {
    channel: string;
    variantIndex: number;
  }): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await apiFetch('/api/v1/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          message_id: messageId,
          ...params,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Send failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[SupabaseMessagesRepo.send] failed:', error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time message updates
   */
  subscribeToChanges(callback: (payload: any) => void) {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generated_messages',
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

/**
 * Map backend message schema to frontend GeneratedMessage type
 */
function mapBackendMessageToGenerated(backendMsg: any): GeneratedMessage {
  return {
    id: backendMsg.id,
    contactId: backendMsg.person_id || backendMsg.contactId,
    goalId: backendMsg.goal_id || backendMsg.goalId,
    contextSnapshot: backendMsg.context_snapshot || backendMsg.contextSnapshot || {},
    variants: backendMsg.variants || [],
    chosenIndex: backendMsg.chosen_index ?? backendMsg.chosenIndex,
    channelSelected: backendMsg.channel_selected || backendMsg.channelSelected,
    status: backendMsg.status || 'draft',
    createdAt: backendMsg.created_at 
      ? new Date(backendMsg.created_at).getTime() 
      : (backendMsg.createdAt || Date.now()),
    updatedAt: backendMsg.updated_at 
      ? new Date(backendMsg.updated_at).getTime() 
      : (backendMsg.updatedAt || Date.now()),
  };
}

/**
 * Map frontend GeneratedMessage to backend schema
 */
function mapGeneratedMessageToBackend(msg: Partial<GeneratedMessage>): any {
  return {
    id: msg.id,
    person_id: msg.contactId,
    goal_id: msg.goalId,
    context_snapshot: msg.contextSnapshot,
    variants: msg.variants,
    chosen_index: msg.chosenIndex,
    channel_selected: msg.channelSelected,
    status: msg.status,
  };
}

export default SupabaseMessagesRepo;
