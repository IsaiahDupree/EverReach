import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { InteractionsRepo, Interaction, TimelineFilters } from '@/repos/InteractionsRepo';

interface InteractionsContextType {
  interactions: Interaction[];
  loading: boolean;
  loadInteractions: (filters?: TimelineFilters) => Promise<void>;
  getByPerson: (personId: string) => Promise<Interaction[]>;
  addInteraction: (interaction: Omit<Interaction, 'id' | 'created_at' | 'updated_at'>) => Promise<Interaction>;
  updateInteraction: (id: string, updates: Partial<Interaction>) => Promise<Interaction>;
  deleteInteraction: (id: string) => Promise<void>;
  getTimeline: (filters?: TimelineFilters) => Promise<Interaction[]>;
}

export const [InteractionsProvider, useInteractions] = createContextHook<InteractionsContextType>(() => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadInteractions = useCallback(async (filters?: TimelineFilters) => {
    try {
      setLoading(true);
      console.log('[InteractionsProvider] Loading interactions');
      const data = await InteractionsRepo.getAll(filters);
      setInteractions(data);
      console.log('[InteractionsProvider] Loaded', data.length, 'interactions');
    } catch (error) {
      console.error('[InteractionsProvider] Failed to load interactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  const getByPerson = useCallback(async (personId: string): Promise<Interaction[]> => {
    try {
      return await InteractionsRepo.getByPerson(personId);
    } catch (error) {
      console.error(`[InteractionsProvider] Failed to get interactions for person ${personId}:`, error);
      return [];
    }
  }, []);

  const addInteraction = useCallback(async (
    interaction: Omit<Interaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Interaction> => {
    try {
      console.log('[InteractionsProvider] Adding interaction');
      const created = await InteractionsRepo.create(interaction);
      console.log('[InteractionsProvider] Interaction created:', created.id);
      setInteractions(prev => [created, ...prev]);
      return created;
    } catch (error) {
      console.error('[InteractionsProvider] Failed to add interaction:', error);
      throw error;
    }
  }, []);

  const updateInteraction = useCallback(async (
    id: string,
    updates: Partial<Interaction>
  ): Promise<Interaction> => {
    try {
      const updated = await InteractionsRepo.update(id, updates);
      console.log('[InteractionsProvider] Interaction updated:', id);
      setInteractions(prev => prev.map(i => i.id === id ? updated : i));
      return updated;
    } catch (error) {
      console.error('[InteractionsProvider] Failed to update interaction:', error);
      throw error;
    }
  }, []);

  const deleteInteraction = useCallback(async (id: string): Promise<void> => {
    try {
      console.log('[InteractionsProvider] Deleting interaction:', id);
      await InteractionsRepo.remove(id);
      setInteractions(prev => prev.filter(i => i.id !== id));
      console.log('[InteractionsProvider] Interaction deleted');
    } catch (error) {
      console.error('[InteractionsProvider] Failed to delete interaction:', error);
      throw error;
    }
  }, []);

  const getTimeline = useCallback(async (filters?: TimelineFilters): Promise<Interaction[]> => {
    try {
      return await InteractionsRepo.getTimeline(filters);
    } catch (error) {
      console.error('[InteractionsProvider] Failed to get timeline:', error);
      return [];
    }
  }, []);

  return useMemo(() => ({
    interactions,
    loading,
    loadInteractions,
    getByPerson,
    addInteraction,
    updateInteraction,
    deleteInteraction,
    getTimeline,
  }), [
    interactions,
    loading,
    loadInteractions,
    getByPerson,
    addInteraction,
    updateInteraction,
    deleteInteraction,
    getTimeline,
  ]);
});
