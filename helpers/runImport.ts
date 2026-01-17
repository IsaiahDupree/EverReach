import type { Snapshot } from './contactsImport';
import { loadSnapshot, saveSnapshot, normalizeEmail, normalizePhone } from './contactsImport';
import { fetchAllContacts } from './fetchAllContacts';
import type * as Contacts from 'expo-contacts';

import { Person } from '@/storage/types';

type RunImportArgs = {
  existingPeople: Person[];
  addPerson: (p: Omit<Person, 'id'>) => Promise<void> | void;
  onProgress?: (current: number, total: number, imported: number) => void;
  mode?: 'delta' | 'full';
  groupId?: string;
  isCancelled?: () => boolean;
};

function versionKey(c: any) {
  const name = (c.name ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()) || '';
  const emails = (c.emails ?? [])
    .map((e: any) => (typeof e === 'string' ? e : e?.email))
    .filter(Boolean)
    .join(';');
  const phones = (c.phoneNumbers ?? [])
    .map((p: any) => (typeof p === 'string' ? p : p?.number))
    .filter(Boolean)
    .join(';');
  const company = c.company ?? '';
  const mod = (c.modificationDate ?? c.creationDate ?? '') as string;
  return `${name}|${company}|${emails}|${phones}|${mod}`;
}

export async function runContactsImport({
  existingPeople,
  addPerson,
  onProgress,
  mode = 'delta',
  groupId,
  isCancelled,
}: RunImportArgs) {
  const snapshot: Snapshot = mode === 'delta' ? await loadSnapshot() : {};
  const contacts = await fetchAllContacts({ groupId });

  const existingEmails = new Set<string>();
  const existingPhones = new Set<string>();
  const existingNames = new Set<string>();

  for (const p of existingPeople) {
    (p.emails ?? []).forEach((e) => e && existingEmails.add(normalizeEmail(e)));
    (p.phones ?? []).forEach((ph) => ph && existingPhones.add(normalizePhone(ph)));
    if (p.fullName) existingNames.add(p.fullName.trim().toLowerCase());
  }

  let imported = 0;
  const total = contacts.length;

  for (let i = 0; i < contacts.length; i++) {
    if (isCancelled?.()) break;

    const c = contacts[i] as unknown as Contacts.Contact;
    const fullName = (c.name?.trim() || `${(c as any).firstName ?? ''} ${(c as any).lastName ?? ''}`.trim());
    if (!fullName) {
      onProgress?.(i + 1, total, imported);
      continue;
    }

    const vKey = versionKey(c as any);
    if (mode === 'delta' && (snapshot as any)[(c as any).id] === vKey) {
      onProgress?.(i + 1, total, imported);
      continue;
    }

    const emails: string[] = ((c as any).emails ?? [])
      .map((e: any) => (typeof e === 'string' ? e : e?.email))
      .filter(Boolean)
      .map((e: string) => normalizeEmail(e));

    const phones: string[] = ((c as any).phoneNumbers ?? [])
      .map((p: any) => (typeof p === 'string' ? p : p?.number))
      .filter(Boolean)
      .map((p: string) => normalizePhone(p));

    const hasDup =
      emails.some((e) => existingEmails.has(e)) ||
      phones.some((p) => existingPhones.has(p)) ||
      (!emails.length && !phones.length && existingNames.has(fullName.toLowerCase()));

    if (!hasDup) {
      const personData = {
        name: fullName,
        fullName,
        emails: emails.length ? emails : undefined,
        phones: phones.length ? phones : undefined,
        company: typeof (c as any).company === 'string' ? (c as any).company : undefined,
        tags: ['imported'],
        createdAt: Date.now(),
      };
      
      console.log('\n🔵 [runImport] About to add person:', JSON.stringify(personData, null, 2));
      
      await Promise.resolve(addPerson(personData));
      imported++;
      
      console.log('✅ [runImport] Person added successfully');

      emails.forEach((e: string) => existingEmails.add(e));
      phones.forEach((p: string) => existingPhones.add(p));
      existingNames.add(fullName.toLowerCase());
    }

    (snapshot as any)[(c as any).id] = vKey;

    onProgress?.(i + 1, total, imported);

    if (i % 25 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  await saveSnapshot(snapshot);
  return { imported, total };
}
