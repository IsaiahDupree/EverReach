import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from './AuthProvider';
import { useSubscription } from './SubscriptionProvider';
import { useWarmthSettings } from './WarmthSettingsProvider';
import { PeopleRepo } from '@/repos/PeopleRepo';
import { Person } from '@/storage/types';



interface PeopleContextType {
  people: Person[];
  addPerson: (person: Omit<Person, 'id'>) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<Person | void>;
  deletePerson: (id: string) => Promise<void>;
  getWarmthStatus: (personId: string) => 'hot' | 'warm' | 'cool' | 'cold';
  getWarmthScore: (personId: string) => number;
}



export const [PeopleProvider, usePeople] = createContextHook<PeopleContextType>(() => {
  const [people, setPeople] = useState<Person[]>([]);
  const { settings, getWarmthStatus } = useWarmthSettings();

  const loadPeople = useCallback(async () => {
    try {
      const existingPeople = await PeopleRepo.all();
      if (existingPeople.length > 0) {
        setPeople(existingPeople);
      } else {
        // Initialize with sample data
        const samplePeople: Person[] = [
          {
            id: 'default-person',
            name: 'Michael Rodriguez',
            fullName: 'Michael Rodriguez',
            emails: ['michael@example.com'],
            phones: ['+1 555 123 4567'],
            company: 'Example Corp',
            title: 'Contact',
            tags: ['contact'],
            interests: ['cool stuff'],
            lastInteraction: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString(),
            lastInteractionSummary: 'New contact',
            cadenceDays: 30,
            warmth: 80,
            createdAt: Date.now(),
          },
          {
            id: '1',
            name: 'Sarah Chen',
            fullName: 'Sarah Chen',
            emails: ['sarah@techstartup.com'],
            phones: ['+1 415 555 0123'],
            company: 'TechStartup Inc',
            title: 'Product Manager',
            tags: ['tech', 'startup', 'product'],
            interests: ['AI', 'Product Design', 'Hiking'],
            lastInteraction: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            lastInteractionSummary: 'Discussed new AI features for Q2',
            cadenceDays: 14,
            warmth: 70,
            createdAt: Date.now(),
          },
          {
            id: '2',
            name: 'Michael Rodriguez',
            fullName: 'Michael Rodriguez',
            emails: ['michael@designstudio.io'],
            company: 'Design Studio',
            title: 'Creative Director',
            tags: ['design', 'creative', 'agency'],
            interests: ['Typography', 'Branding', 'Coffee'],
            lastInteraction: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            lastInteractionSummary: 'Reviewed portfolio pieces',
            cadenceDays: 30,
            warmth: 40,
            createdAt: Date.now(),
          },
          {
            id: '3',
            name: 'Emily Johnson',
            fullName: 'Emily Johnson',
            emails: ['emily@venturecap.com'],
            company: 'Venture Capital Partners',
            title: 'Investment Associate',
            tags: ['investor', 'vc', 'finance'],
            interests: ['Startups', 'SaaS', 'Tennis'],
            lastInteraction: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            lastInteractionSummary: 'Initial meeting about Series A',
            cadenceDays: 60,
            warmth: 15,
            createdAt: Date.now(),
          },
        ];
        
        // Save sample data using repo
        for (const person of samplePeople) {
          await PeopleRepo.upsert(person);
        }
        setPeople(samplePeople);
      }
    } catch (error) {
      console.error('Failed to load people:', error);
    }
  }, []);

  useEffect(() => {
    loadPeople();

    // Set up real-time subscriptions (Supabase only)
    const unsubscribe = PeopleRepo.subscribeToChanges((payload) => {
      console.log('[PeopleProvider] Real-time update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setPeople(prev => {
          // Check if already exists to avoid duplicates
          if (prev.some(p => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      } else if (payload.eventType === 'UPDATE') {
        setPeople(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      } else if (payload.eventType === 'DELETE') {
        setPeople(prev => prev.filter(p => p.id !== payload.old.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadPeople]);

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
      setPeople(prev => {
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
    if (!person || !person.lastInteraction) return 0;

    const daysSinceContact = Math.floor(
      (Date.now() - new Date(person.lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
    );

    const halfLife = person.cadenceDays || 30;
    const score = Math.round(100 * Math.exp(-daysSinceContact / halfLife));
    
    return Math.max(0, Math.min(100, score));
  }, [people]);

  const getWarmthStatusForPerson = useCallback((personId: string): 'hot' | 'warm' | 'cool' | 'cold' => {
    const person = people.find(p => p.id === personId);
    if (!person) return 'cold';
    
    // Use stored warmth value if available, otherwise calculate from interactions
    const score = person.warmth ?? getWarmthScore(personId);
    return getWarmthStatus(score);
  }, [people, getWarmthScore, getWarmthStatus]);

  return useMemo(() => ({
    people,
    addPerson,
    updatePerson,
    deletePerson,
    getWarmthStatus: getWarmthStatusForPerson,
    getWarmthScore,
  }), [people, addPerson, updatePerson, deletePerson, getWarmthStatusForPerson, getWarmthScore]);
});