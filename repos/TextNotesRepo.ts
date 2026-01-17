import { KV } from '@/storage/AsyncStorageService';
import { TextNote } from '@/storage/types';
import { FLAGS } from '@/constants/flags';
import { SupabaseTextNotesRepo } from './SupabaseTextNotesRepo';

const PREFIX = 'textnotes/';

const LocalTextNotesRepo = {
  async all(): Promise<TextNote[]> {
    const keys = await KV.keys(PREFIX);
    const rows = await Promise.all(keys.map(k => KV.get<TextNote>(k)));
    return (rows.filter(Boolean) as TextNote[]).sort((a, b) => b.createdAt - a.createdAt);
  },

  async upsert(textNote: TextNote): Promise<void> {
    await KV.set(PREFIX + textNote.id, textNote);
  },

  async get(id: string): Promise<TextNote | null> {
    return KV.get<TextNote>(PREFIX + id);
  },

  async remove(id: string): Promise<void> {
    await KV.remove(PREFIX + id);
  },

  async byPerson(personId: string): Promise<TextNote[]> {
    const all = await this.all();
    return all.filter(tn => tn.personId === personId);
  }
};

export const TextNotesRepo = {
  async all(): Promise<TextNote[]> {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[TextNotesRepo] Using LOCAL storage');
      return LocalTextNotesRepo.all();
    }
    console.log('[TextNotesRepo] Using SUPABASE');
    return SupabaseTextNotesRepo.all();
  },

  async get(id: string): Promise<TextNote | null> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalTextNotesRepo.get(id);
    }
    return SupabaseTextNotesRepo.get(id);
  },

  async upsert(textNote: TextNote): Promise<void> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalTextNotesRepo.upsert(textNote);
    }
    return SupabaseTextNotesRepo.upsert(textNote);
  },

  async remove(id: string): Promise<void> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalTextNotesRepo.remove(id);
    }
    return SupabaseTextNotesRepo.remove(id);
  },

  async byPerson(personId: string): Promise<TextNote[]> {
    if (FLAGS.LOCAL_ONLY) {
      return LocalTextNotesRepo.byPerson(personId);
    }
    return SupabaseTextNotesRepo.byPerson(personId);
  }
};