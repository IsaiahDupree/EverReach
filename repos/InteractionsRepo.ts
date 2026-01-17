import { apiFetch } from '@/lib/api';
import { FLAGS } from '@/constants/flags';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Interaction Event
 */
export interface Interaction {
  id: string;
  person_id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'message' | 'other';
  direction?: 'inbound' | 'outbound';
  summary?: string;
  notes?: string;
  duration_minutes?: number;
  occurred_at: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Timeline filters
 */
export interface TimelineFilters {
  person_id?: string;
  type?: string[];
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

const INTERACTIONS_PREFIX = 'interactions/';

/**
 * Local storage implementation
 */
const LocalInteractionsRepo = {
  async getAll(filters?: TimelineFilters): Promise<Interaction[]> {
    const keys = await AsyncStorage.getAllKeys();
    const interactionKeys = keys.filter(k => k.startsWith(INTERACTIONS_PREFIX));
    
    const items = await Promise.all(
      interactionKeys.map(k => AsyncStorage.getItem(k))
    );
    
    let interactions = items
      .filter(Boolean)
      .map(item => JSON.parse(item!)) as Interaction[];

    // Apply filters
    if (filters?.person_id) {
      interactions = interactions.filter(i => i.person_id === filters.person_id);
    }
    if (filters?.type && filters.type.length > 0) {
      interactions = interactions.filter(i => filters.type!.includes(i.type));
    }
    if (filters?.start_date) {
      interactions = interactions.filter(i => i.occurred_at >= filters.start_date!);
    }
    if (filters?.end_date) {
      interactions = interactions.filter(i => i.occurred_at <= filters.end_date!);
    }

    // Sort by occurred_at desc
    interactions.sort((a, b) => 
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    return interactions.slice(offset, offset + limit);
  },

  async get(id: string): Promise<Interaction | null> {
    const data = await AsyncStorage.getItem(INTERACTIONS_PREFIX + id);
    return data ? JSON.parse(data) : null;
  },

  async create(interaction: Omit<Interaction, 'id' | 'created_at' | 'updated_at'>): Promise<Interaction> {
    const newInteraction: Interaction = {
      ...interaction,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      INTERACTIONS_PREFIX + newInteraction.id,
      JSON.stringify(newInteraction)
    );
    return newInteraction;
  },

  async update(id: string, updates: Partial<Interaction>): Promise<Interaction> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`Interaction ${id} not found`);
    
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(INTERACTIONS_PREFIX + id, JSON.stringify(updated));
    return updated;
  },

  async remove(id: string): Promise<void> {
    await AsyncStorage.removeItem(INTERACTIONS_PREFIX + id);
  },

  async getByPerson(personId: string): Promise<Interaction[]> {
    return this.getAll({ person_id: personId });
  },
};

/**
 * Backend API implementation
 */
const BackendInteractionsRepo = {
  async getAll(filters?: TimelineFilters): Promise<Interaction[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.person_id) params.append('person_id', filters.person_id);
      if (filters?.type) filters.type.forEach(t => params.append('type', t));
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const url = `/api/v1/interactions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiFetch(url, { requireAuth: true });

      if (!response.ok) {
        console.error('[InteractionsRepo] Failed to fetch interactions:', response.status);
        return [];
      }

      const data = await response.json();
      return data.interactions || data.items || [];
    } catch (error) {
      console.error('[InteractionsRepo.getAll] failed:', error);
      return [];
    }
  },

  async get(id: string): Promise<Interaction | null> {
    try {
      const response = await apiFetch(`/api/v1/interactions/${id}`, { requireAuth: true });
      if (!response.ok) return null;
      const data = await response.json();
      return data.interaction || data;
    } catch (error) {
      console.error(`[InteractionsRepo.get(${id})] failed:`, error);
      return null;
    }
  },

  async create(interaction: Omit<Interaction, 'id' | 'created_at' | 'updated_at'>): Promise<Interaction> {
    const response = await apiFetch('/api/v1/interactions', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify(interaction),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Create interaction failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.interaction || data;
  },

  async update(id: string, updates: Partial<Interaction>): Promise<Interaction> {
    const response = await apiFetch(`/api/v1/interactions/${id}`, {
      method: 'PATCH',
      requireAuth: true,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update interaction failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.interaction || data;
  },

  async remove(id: string): Promise<void> {
    const response = await apiFetch(`/api/v1/interactions/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    });

    if (!response.ok) {
      throw new Error(`Delete interaction failed: ${response.status}`);
    }
  },

  async getByPerson(personId: string): Promise<Interaction[]> {
    return this.getAll({ person_id: personId });
  },

  async getTimeline(filters?: TimelineFilters): Promise<Interaction[]> {
    return this.getAll(filters);
  },
};

/**
 * Hybrid Interactions Repository
 */
export const InteractionsRepo = {
  async getAll(filters?: TimelineFilters): Promise<Interaction[]> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[InteractionsRepo] Using LOCAL storage');
      return LocalInteractionsRepo.getAll(filters);
    }
    console.log('[InteractionsRepo] Using BACKEND');
    return BackendInteractionsRepo.getAll(filters);
  },

  async get(id: string): Promise<Interaction | null> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalInteractionsRepo.get(id);
    }
    return BackendInteractionsRepo.get(id);
  },

  async create(interaction: Omit<Interaction, 'id' | 'created_at' | 'updated_at'>): Promise<Interaction> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalInteractionsRepo.create(interaction);
    }
    return BackendInteractionsRepo.create(interaction);
  },

  async update(id: string, updates: Partial<Interaction>): Promise<Interaction> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalInteractionsRepo.update(id, updates);
    }
    return BackendInteractionsRepo.update(id, updates);
  },

  async remove(id: string): Promise<void> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalInteractionsRepo.remove(id);
    }
    return BackendInteractionsRepo.remove(id);
  },

  async getByPerson(personId: string): Promise<Interaction[]> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalInteractionsRepo.getByPerson(personId);
    }
    return BackendInteractionsRepo.getByPerson(personId);
  },

  async getTimeline(filters?: TimelineFilters): Promise<Interaction[]> {
    return this.getAll(filters);
  },
};

export default InteractionsRepo;
