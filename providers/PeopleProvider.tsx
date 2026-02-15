import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useWarmthSettings } from './WarmthSettingsProvider';
import { useWarmth } from './WarmthProvider';
import { useAuth } from './AuthProviderV2';
import { PeopleRepo } from '@/repos/PeopleRepo';
import { Person } from '@/storage/types';

interface PeopleContextType {
  people: Person[];
  isLoading: boolean;
  addPerson: (person: Omit<Person, 'id'>) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<Person | void>;
  deletePerson: (id: string) => Promise<void>;
  refreshPeople: () => Promise<void>;
  getWarmthStatus: (personId: string) => 'hot' | 'warm' | 'cool' | 'cold';
  getWarmthScore: (personId: string) => number;
}



export const [PeopleProvider, usePeople] = createContextHook<PeopleContextType>(() => {
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const warmthSettings = useWarmthSettings();
  const { refreshAllWarmth } = useWarmth();
  const settings = warmthSettings?.settings || { defaultWarmthForNewLeads: 30, hotThreshold: 80, warmThreshold: 60, coolThreshold: 20 };
  const getWarmthStatus = warmthSettings?.getWarmthStatus || ((score: number) => 'cold' as const);
  const authContext = useAuth();
  const { user, session } = authContext || { user: null, session: null };

  const mergePeopleLists = (prev: Person[], incoming: Person[]): Person[] => {
    const prevMap = new Map(prev.map(p => [p.id, p]));
    return incoming.map((p) => {
      const old = prevMap.get(p.id);
      if (!old) return p;
      const pickArr = <T,>(a?: T[], b?: T[]) => (Array.isArray(b) && b.length ? b : a);
      return {
        ...old,
        ...p,
        fullName: p.fullName || old.fullName,
        name: p.name || old.name,
        company: p.company ?? old.company,
        title: p.title ?? old.title,
        emails: pickArr(old.emails, p.emails),
        phones: pickArr(old.phones, p.phones),
        tags: pickArr(old.tags, p.tags),
        interests: pickArr(old.interests, p.interests),
        customFields: pickArr((old as any).customFields, (p as any).customFields) as any,
        avatarUrl: p.avatarUrl ?? old.avatarUrl,
        createdAt: old.createdAt || p.createdAt,
        lastInteraction: p.lastInteraction || old.lastInteraction,
        lastInteractionSummary: p.lastInteractionSummary || old.lastInteractionSummary,
        cadenceDays: p.cadenceDays ?? old.cadenceDays,
        nextTouchAt: p.nextTouchAt ?? old.nextTouchAt,
        warmth: typeof p.warmth === 'number' ? p.warmth : old.warmth,
        warmth_mode: p.warmth_mode ?? old.warmth_mode,
      } as Person;
    });
  };

  const loadPeople = useCallback(async () => {
    // Don't try to load if user isn't authenticated yet
    if (!user || !session) {
      console.log('[PeopleProvider] Skipping load - no authenticated user/session yet');
      setIsLoading(false);
      setPeople([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log('[PeopleProvider] Loading contacts from backend/storage...');
      const existingPeople = await PeopleRepo.all();
      console.log('[PeopleProvider] Loaded', existingPeople.length, 'contacts');
      
      // Merge with previous to preserve local fields when backend returns minimal objects
      setPeople(prev => mergePeopleLists(prev, existingPeople));
      
      // Sync warmth data to WarmthProvider
      console.log('[PeopleProvider] Syncing warmth data to WarmthProvider...');
      await refreshAllWarmth(existingPeople.map(p => ({
        id: p.id,
        warmth: p.warmth,
        last_touch_at: p.lastInteraction,
      })));
      console.log('[PeopleProvider] Warmth data synced');
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      
      // Only show detailed errors for non-auth issues
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.warn('[PeopleProvider] Authentication required - user needs to sign in');
      } else if (errorMessage.includes('Cannot connect to server') || errorMessage.includes('fetch')) {
        console.warn('[PeopleProvider] Cannot reach backend server - check connection');
      } else if (errorMessage.includes('timeout')) {
        console.warn('[PeopleProvider] Request timeout - check internet connection');
      } else {
        // Only log actual unexpected errors
        console.error('[PeopleProvider] Unexpected error loading contacts:', errorMessage);
      }
      
      // Keep existing data on error
      setPeople([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, session, refreshAllWarmth]);

  useEffect(() => {
    const userId = user?.id || 'no-user';
    const sessionId = session?.access_token?.substring(0, 10) || 'no-session';
    
    console.log('[PeopleProvider] User/session changed - reloading contacts');
    console.log('[PeopleProvider] User ID:', userId);
    console.log('[PeopleProvider] Session preview:', sessionId);
    
    setPeople([]);
    loadPeople();

    // Set up real-time subscriptions (Supabase only)
    const unsubscribe = PeopleRepo.subscribeToChanges((payload) => {
      console.log('[PeopleProvider] Real-time update:', payload);
      const id = payload.new?.id || payload.old?.id;

      // Always fetch through repo to ensure mapping → Person (e.g., avatar_url → avatarUrl)
      const applyUpsertFromRepo = async (contactId: string) => {
        try {
          const mapped = await PeopleRepo.get(contactId);
          if (!mapped) return;
          setPeople(prev => {
            const exists = prev.some(p => p.id === contactId);
            if (exists) return prev.map(p => p.id === contactId ? mapped : p);
            return [...prev, mapped];
          });
        } catch (e) {
          console.warn('[PeopleProvider] Failed to map real-time contact via repo:', e);
        }
      };

      if (payload.eventType === 'INSERT' && id) {
        applyUpsertFromRepo(id);
      } else if (payload.eventType === 'UPDATE' && id) {
        applyUpsertFromRepo(id);
      } else if (payload.eventType === 'DELETE' && id) {
        console.log('[PeopleProvider] Deleting contact from real-time:', id);
        setPeople(prev => prev.filter(p => p.id !== id));
      }
    });

    return () => {
      console.log('[PeopleProvider] Cleaning up subscriptions for user:', userId);
      unsubscribe();
    };
  }, [user?.id, session?.access_token, loadPeople]);

  const addPerson = useCallback(async (person: Omit<Person, 'id'>) => {
    // Build the new person with defaults for missing fields
    const newPerson: Person = {
      id: 'new', // Let backend assign ID
      ...person, // Spread incoming person data (name, fullName, createdAt, etc.)
      // Only set defaults if not already provided
      warmth: person.warmth ?? settings.defaultWarmthForNewLeads,
      lastInteraction: person.lastInteraction ?? new Date().toISOString(),
      lastInteractionSummary: person.lastInteractionSummary ?? 'Imported contact',
      nextTouchAt: person.nextTouchAt ?? (person.cadenceDays 
        ? new Date(Date.now() + person.cadenceDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined),
    };
    
    try {
      console.log('[PeopleProvider] Adding person to repo:', newPerson.fullName, newPerson);
      const createdPerson = await PeopleRepo.upsert(newPerson);
      console.log('[PeopleProvider] Person added to repo successfully with ID:', createdPerson.id);
      
      // Optimistically update state immediately
      setPeople(prev => {
        // Check if already exists (from real-time subscription)
        if (prev.some(p => p.id === createdPerson.id)) {
          console.log('[PeopleProvider] Contact already in state (from real-time), updating');
          return prev.map(p => p.id === createdPerson.id ? createdPerson : p);
        }
        const updated = [...prev, createdPerson];
        console.log('[PeopleProvider] Updated people count:', updated.length);
        return updated;
      });
      
      return createdPerson;
    } catch (error) {
      console.error('[PeopleProvider] Failed to add person:', error, person);
      throw error;
    }
  }, [settings.defaultWarmthForNewLeads]);

  const updatePerson = useCallback(async (id: string, updates: Partial<Person>) => {
    try {
      const existingPerson = await PeopleRepo.get(id);
      if (existingPerson) {
        const updatedPerson = { ...existingPerson, ...updates };
        const savedPerson = await PeopleRepo.upsert(updatedPerson);
        console.log('[PeopleProvider] Person updated:', savedPerson.fullName);
        setPeople(prev => prev.map(p => p.id === id ? savedPerson : p));
        // Ensure contact details screen refetches full bundle
        queryClient.invalidateQueries({ queryKey: ['contact-bundle', id] });
        return savedPerson;
      }
    } catch (error) {
      console.error('[PeopleProvider] Failed to update person:', error);
      throw error;
    }
  }, []);

  const deletePerson = useCallback(async (id: string) => {
    try {
      await PeopleRepo.remove(id);
      setPeople(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete person:', error);
    }
  }, []);

  const getWarmthScore = useCallback((personId: string): number => {
    const person = people.find(p => p.id === personId);
    if (!person) return 0;

    // Use backend-calculated warmth if available, otherwise fallback to 0
    // Backend warmth is calculated using a more sophisticated formula that considers:
    // - Recency (days since last interaction)
    // - Frequency (interaction count in last 90 days)
    // - Channel diversity (multiple interaction types)
    // - Decay over time
    return person.warmth ?? 0;
  }, [people]);

  const getWarmthStatusForPerson = useCallback((personId: string): 'hot' | 'warm' | 'cool' | 'cold' => {
    const person = people.find(p => p.id === personId);
    if (!person) return 'cold';
    
    // Use backend-calculated warmth value
    const score = person.warmth ?? 0;
    return getWarmthStatus(score);
  }, [people, getWarmthStatus]);

  return useMemo(() => ({
    people,
    isLoading,
    addPerson,
    updatePerson,
    deletePerson,
    refreshPeople: loadPeople,
    getWarmthStatus: getWarmthStatusForPerson,
    getWarmthScore,
  }), [people, isLoading, addPerson, updatePerson, deletePerson, loadPeople, getWarmthStatusForPerson, getWarmthScore]);
});