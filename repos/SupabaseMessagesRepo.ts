import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { GeneratedMessage } from '@/types/message';

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
      const { data, error } = await supabase
        .from('generated_messages')
        .select(`
          *,
          message_variants (
            id,
            variant_index,
            text,
            edited
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SupabaseMessagesRepo.all] Supabase error:', error);
        return [];
      }

      return (data || []).map(mapBackendMessageToGenerated);
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
      const { data, error } = await supabase
        .from('generated_messages')
        .select(`
          *,
          message_variants (
            id,
            variant_index,
            text,
            edited
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(`[SupabaseMessagesRepo.get(${id})] Supabase error:`, error);
        return null;
      }

      return mapBackendMessageToGenerated(data);
    } catch (error) {
      console.error(`[SupabaseMessagesRepo.get(${id})] failed:`, error);
      return null;
    }
  },

  /**
   * Create a new message
   * Note: This creates a record in the generated_messages table via Supabase directly
   * since there's no REST API endpoint for it yet
   */
  async create(message: Omit<GeneratedMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneratedMessage> {
    try {
      console.log('[SupabaseMessagesRepo.create] Creating message:', {
        contactId: message.contactId,
        goalId: message.goalId,
        channel: message.channelSelected,
        status: message.status,
        variantsCount: message.variants?.length,
      });

      // Validate required fields
      if (!message.contactId) {
        throw new Error('contactId is required');
      }
      if (!message.variants || message.variants.length === 0) {
        throw new Error('At least one variant is required');
      }
      if (!message.variants[0].text || message.variants[0].text.trim() === '') {
        throw new Error('Message text cannot be empty');
      }

      // Get user's org_id using ensure_user_org function
      const { data: orgData, error: orgError } = await supabase.rpc('ensure_user_org');
      if (orgError || !orgData) {
        console.error('[SupabaseMessagesRepo.create] Failed to get org_id:', orgError);
        throw new Error('Failed to get organization ID');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[SupabaseMessagesRepo.create] Failed to get user:', userError);
        throw new Error('User not authenticated');
      }

      console.log('[SupabaseMessagesRepo.create] Auth info:', {
        orgId: orgData,
        userId: user.id,
      });

      // Store goal identifier in context_snapshot instead of goal_id (which expects UUID)
      const contextSnapshot = {
        ...message.contextSnapshot,
        goalIdentifier: message.goalId,
        timestamp: new Date().toISOString(),
      };

      // Insert message into generated_messages table
      const messagePayload = {
        org_id: orgData,
        user_id: user.id,
        person_id: message.contactId,
        goal_id: null,
        context_snapshot: contextSnapshot,
        chosen_index: message.chosenIndex ?? 0,
        channel_selected: message.channelSelected,
        status: message.status || 'draft',
      };

      console.log('[SupabaseMessagesRepo.create] Inserting message with payload:', messagePayload);

      const { data: messageData, error: messageError } = await supabase
        .from('generated_messages')
        .insert([messagePayload])
        .select()
        .single();

      if (messageError) {
        console.error('[SupabaseMessagesRepo.create] Supabase error:', {
          code: messageError.code,
          message: messageError.message,
          details: messageError.details,
          hint: messageError.hint,
        });
        
        // Handle specific error codes
        if (messageError.code === '23505') {
          throw new Error('A message with this data already exists. Please try again.');
        }
        
        throw new Error(`Failed to create message: ${messageError.message}`);
      }

      console.log('[SupabaseMessagesRepo.create] Message created with ID:', messageData.id);

      // Insert variants into message_variants table
      const variantsToInsert = message.variants.map((variant, index) => ({
        message_id: messageData.id,
        variant_index: index,
        text: variant.text,
        edited: variant.edited || false,
      }));

      console.log('[SupabaseMessagesRepo.create] Inserting variants:', {
        messageId: messageData.id,
        variantsCount: variantsToInsert.length,
      });

      const { error: variantsError } = await supabase
        .from('message_variants')
        .insert(variantsToInsert);

      if (variantsError) {
        console.error('[SupabaseMessagesRepo.create] Failed to insert variants:', {
          code: variantsError.code,
          message: variantsError.message,
          details: variantsError.details,
        });
        
        // Try to clean up the message if variants failed
        console.log('[SupabaseMessagesRepo.create] Cleaning up message:', messageData.id);
        await supabase.from('generated_messages').delete().eq('id', messageData.id);
        
        if (variantsError.code === '23505') {
          throw new Error('Duplicate variant detected. This message may have already been saved.');
        }
        
        throw new Error(`Failed to create message variants: ${variantsError.message}`);
      }

      // Fetch the complete message with variants
      const createdMessage = await this.get(messageData.id);
      if (!createdMessage) {
        throw new Error('Failed to fetch created message');
      }

      return createdMessage;
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

      const { data, error } = await supabase
        .from('generated_messages')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[SupabaseMessagesRepo.update(${id})] Supabase error:`, error);
        throw new Error(`Failed to update message: ${error.message}`);
      }

      return mapBackendMessageToGenerated(data);
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
      const { error } = await supabase
        .from('generated_messages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[SupabaseMessagesRepo.remove(${id})] Supabase error:`, error);
        throw new Error(`Failed to delete message: ${error.message}`);
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
      const { data, error } = await supabase
        .from('generated_messages')
        .select(`
          *,
          message_variants (
            id,
            variant_index,
            text,
            edited
          )
        `)
        .eq('person_id', contactId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[SupabaseMessagesRepo.getByContact(${contactId})] Supabase error:`, error);
        return [];
      }

      return (data || []).map(mapBackendMessageToGenerated);
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
  }): Promise<{ variants: { text: string; subject?: string }[] }> {
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
  // Map message_variants array to variants format
  const variants = (backendMsg.message_variants || [])
    .sort((a: any, b: any) => a.variant_index - b.variant_index)
    .map((v: any) => ({
      text: v.text,
      subject: undefined, // Subject is stored in text for email messages
      edited: v.edited || false,
    }));

  const contextSnapshot = backendMsg.context_snapshot || backendMsg.contextSnapshot || {};
  
  return {
    id: backendMsg.id,
    contactId: backendMsg.person_id || backendMsg.contactId,
    goalId: contextSnapshot.goalIdentifier || backendMsg.goal_id || backendMsg.goalId || 'unknown',
    contextSnapshot,
    variants: variants.length > 0 ? variants : [],
    chosenIndex: backendMsg.chosen_index ?? backendMsg.chosenIndex ?? 0,
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
    chosen_index: msg.chosenIndex,
    channel_selected: msg.channelSelected,
    status: msg.status,
  };
}

export default SupabaseMessagesRepo;
