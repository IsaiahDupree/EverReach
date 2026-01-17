import { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { GeneratedMessage, MessageStatus, MessageGoal } from '@/types/message';
import { DEFAULT_MESSAGE_GOALS } from '@/constants/messageGoals';
import { MessagesRepo } from '@/repos/MessagesRepo';
import { KV } from '@/storage/AsyncStorageService';
import { useAuth } from './AuthProviderV2';

interface MessageContextType {
  messages: GeneratedMessage[];
  customGoals: MessageGoal[];
  addMessage: (message: Omit<GeneratedMessage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateMessage: (id: string, updates: Partial<GeneratedMessage>) => Promise<GeneratedMessage>;
  updateMessageStatus: (id: string, status: MessageStatus) => void;
  getMessage: (id: string) => GeneratedMessage | undefined;
  getMessagesByContact: (contactId: string) => Promise<GeneratedMessage[]>;
  addCustomGoal: (goal: Omit<MessageGoal, 'id' | 'isCustom'>) => void;
  getAllGoals: () => MessageGoal[];
}

const CUSTOM_GOALS_KEY = 'settings/customGoals';

export const [MessageProvider, useMessages] = createContextHook<MessageContextType>(() => {
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [customGoals, setCustomGoals] = useState<MessageGoal[]>([]);
  const authContext = useAuth();
  const { user, session } = authContext || { user: null, session: null };

  // Load data on initialization
  const loadData = useCallback(async () => {
    // Don't try to load if user isn't authenticated yet
    if (!user || !session) {
      console.log('[MessageProvider] Skipping load - no authenticated user/session yet');
      return;
    }

    try {
      // Load messages from repo (hybrid local/remote)
      const loadedMessages = await MessagesRepo.all();
      setMessages(loadedMessages);
      
      // Load custom goals (still local storage)
      const goalsData = await KV.get<MessageGoal[]>(CUSTOM_GOALS_KEY);
      if (goalsData) {
        setCustomGoals(goalsData);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.warn('[MessageProvider] Authentication required');
      } else {
        console.error('[MessageProvider] Failed to load message data:', error);
      }
    }
  }, [user, session]);

  // Save custom goals to storage
  const saveCustomGoals = useCallback(async (newGoals: MessageGoal[]) => {
    try {
      await KV.set(CUSTOM_GOALS_KEY, newGoals);
      setCustomGoals(newGoals);
    } catch (error) {
      console.error('Failed to save custom goals:', error);
    }
  }, []);

  // Initialize data loading and real-time subscriptions
  useEffect(() => {
    loadData();

    // Set up real-time subscriptions (Supabase only)
    const unsubscribe = MessagesRepo.subscribeToChanges((payload) => {
      console.log('[MessageProvider] Real-time update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setMessages(prev => {
          // Check if already exists to avoid duplicates
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      } else if (payload.eventType === 'UPDATE') {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      } else if (payload.eventType === 'DELETE') {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const addMessage = useCallback(async (messageData: Omit<GeneratedMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      console.log('[MessageProvider] Creating message');
      const createdMessage = await MessagesRepo.create(messageData);
      console.log('[MessageProvider] Message created with ID:', createdMessage.id);
      setMessages(prev => [createdMessage, ...prev]);
      return createdMessage.id;
    } catch (error) {
      console.error('[MessageProvider] Failed to add message:', error);
      throw error;
    }
  }, []);

  const updateMessage = useCallback(async (id: string, updates: Partial<GeneratedMessage>) => {
    try {
      const updatedMessage = await MessagesRepo.update(id, updates);
      console.log('[MessageProvider] Message updated:', id);
      setMessages(prev => prev.map(msg => msg.id === id ? updatedMessage : msg));
      return updatedMessage;
    } catch (error) {
      console.error('[MessageProvider] Failed to update message:', error);
      throw error;
    }
  }, []);

  const updateMessageStatus = useCallback((id: string, status: MessageStatus) => {
    updateMessage(id, { status });
  }, [updateMessage]);

  const getMessage = useCallback((id: string): GeneratedMessage | undefined => {
    return messages.find(msg => msg.id === id);
  }, [messages]);

  const getMessagesByContact = useCallback(async (contactId: string): Promise<GeneratedMessage[]> => {
    try {
      return await MessagesRepo.getByContact(contactId);
    } catch (error) {
      console.error(`[MessageProvider] Failed to get messages for contact ${contactId}:`, error);
      return [];
    }
  }, []);

  const addCustomGoal = useCallback((goalData: Omit<MessageGoal, 'id' | 'isCustom'>) => {
    const newGoal: MessageGoal = {
      ...goalData,
      id: `custom_${Date.now()}`,
      isCustom: true
    };
    
    const updatedGoals = [...customGoals, newGoal];
    saveCustomGoals(updatedGoals);
  }, [customGoals, saveCustomGoals]);

  const getAllGoals = useCallback((): MessageGoal[] => {
    return [...DEFAULT_MESSAGE_GOALS, ...customGoals];
  }, [customGoals]);

  return useMemo(() => ({
    messages,
    customGoals,
    addMessage,
    updateMessage,
    updateMessageStatus,
    getMessage,
    getMessagesByContact,
    addCustomGoal,
    getAllGoals
  }), [
    messages,
    customGoals,
    addMessage,
    updateMessage,
    updateMessageStatus,
    getMessage,
    getMessagesByContact,
    addCustomGoal,
    getAllGoals
  ]);
});