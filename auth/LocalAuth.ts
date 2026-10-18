import { KV } from '@/storage/AsyncStorageService';
import { nanoid } from 'nanoid/non-secure';

const KEY = 'auth/localUser';

export type LocalUser = {
  id: string;
  displayName: string;
  email?: string;
  createdAt: number;
};

export async function getOrCreateLocalUser(): Promise<LocalUser> {
  const existing = await KV.get<LocalUser>(KEY);
  if (existing) return existing;
  
  const user: LocalUser = {
    id: `local_${nanoid(12)}`,
    displayName: 'Local User',
    email: 'local@device.local',
    createdAt: Date.now()
  };
  
  await KV.set(KEY, user);
  return user;
}

export async function updateLocalUser(updates: Partial<LocalUser>): Promise<LocalUser> {
  const user = await getOrCreateLocalUser();
  const updated = { ...user, ...updates };
  await KV.set(KEY, updated);
  return updated;
}