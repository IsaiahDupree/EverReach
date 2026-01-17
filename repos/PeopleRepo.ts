import { KV } from '@/storage/AsyncStorageService';
import { Person } from '@/storage/types';
import { FLAGS } from '@/constants/flags';
import { SupabaseContactsRepo } from './SupabaseContactsRepo';

const PREFIX = 'people/';

/**
 * Hybrid People Repository
 * Uses local storage when LOCAL_ONLY is true, otherwise uses Supabase
 */

// Local storage implementation
const LocalPeopleRepo = {
  async all(): Promise<Person[]> {
    const keys = await KV.keys(PREFIX);
    const rows = await Promise.all(keys.map(k => KV.get<Person>(k)));
    return rows.filter(Boolean) as Person[];
  },

  async upsert(person: Person): Promise<Person> {
    console.log('[LocalPeopleRepo] Upserting person:', person.fullName, 'with ID:', person.id);
    try {
      await KV.set(PREFIX + person.id, person);
      console.log('[LocalPeopleRepo] Person upserted successfully');
      return person;
    } catch (error) {
      console.error('[LocalPeopleRepo] Failed to upsert person:', error);
      throw error;
    }
  },

  async get(id: string): Promise<Person | null> {
    return KV.get<Person>(PREFIX + id);
  },

  async remove(id: string): Promise<void> {
    await KV.remove(PREFIX + id);
  },

  async findByEmail(email: string): Promise<Person[]> {
    const all = await this.all();
    return all.filter(p => p.emails?.includes(email));
  },

  async findByPhone(phone: string): Promise<Person[]> {
    const all = await this.all();
    return all.filter(p => p.phones?.includes(phone));
  },

  async search(query: string): Promise<Person[]> {
    const all = await this.all();
    const lowerQuery = query.toLowerCase();
    return all.filter(p => 
      p.fullName.toLowerCase().includes(lowerQuery) ||
      p.company?.toLowerCase().includes(lowerQuery) ||
      p.emails?.some(e => e.toLowerCase().includes(lowerQuery))
    );
  },
};

// Export hybrid repo that switches based on FLAGS.LOCAL_ONLY
export const PeopleRepo = {
  async all(): Promise<Person[]> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[PeopleRepo] Using LOCAL storage');
      return LocalPeopleRepo.all();
    }
    console.log('[PeopleRepo] Using SUPABASE');
    return SupabaseContactsRepo.all();
  },

  async upsert(person: Person): Promise<Person> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalPeopleRepo.upsert(person);
    }
    return SupabaseContactsRepo.upsert(person);
  },

  async get(id: string): Promise<Person | null> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalPeopleRepo.get(id);
    }
    return SupabaseContactsRepo.get(id);
  },

  async remove(id: string): Promise<void> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalPeopleRepo.remove(id);
    }
    return SupabaseContactsRepo.remove(id);
  },

  async findByEmail(email: string): Promise<Person[]> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalPeopleRepo.findByEmail(email);
    }
    return SupabaseContactsRepo.findByEmail(email);
  },

  async findByPhone(phone: string): Promise<Person[]> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalPeopleRepo.findByPhone(phone);
    }
    return SupabaseContactsRepo.findByPhone(phone);
  },

  async search(query: string): Promise<Person[]> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalPeopleRepo.search(query);
    }
    return SupabaseContactsRepo.search(query);
  },

  /**
   * Subscribe to real-time changes (Supabase only)
   */
  subscribeToChanges(callback: (payload: any) => void) {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[PeopleRepo] Real-time subscriptions not available in LOCAL_ONLY mode');
      return () => {}; // No-op unsubscribe
    }
    return SupabaseContactsRepo.subscribeToChanges(callback);
  },
};