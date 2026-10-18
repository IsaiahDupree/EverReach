import { KV } from '@/storage/AsyncStorageService';
import { TextNote } from '@/storage/types';

const PREFIX = 'textnotes/';

export const TextNotesRepo = {
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