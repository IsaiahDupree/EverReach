import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';

type FetchOpts = {
  pageSize?: number;
  groupId?: string;
};

function safeFields(): Contacts.FieldType[] {
  const maybe = (v: unknown) => (typeof v === 'string' ? (v as Contacts.FieldType) : undefined);
  const base = [
    maybe((Contacts.Fields as any)?.ID),
    maybe((Contacts.Fields as any)?.Name),
    maybe((Contacts.Fields as any)?.FirstName),
    maybe((Contacts.Fields as any)?.LastName),
    maybe((Contacts.Fields as any)?.Company),
    maybe((Contacts.Fields as any)?.JobTitle),
    maybe((Contacts.Fields as any)?.Emails),
    maybe((Contacts.Fields as any)?.PhoneNumbers),
    maybe((Contacts.Fields as any)?.Birthday),
    maybe((Contacts.Fields as any)?.ImageAvailable),
    maybe((Contacts.Fields as any)?.Image),
    maybe((Contacts.Fields as any)?.ModificationDate),
    maybe((Contacts.Fields as any)?.CreationDate),
  ];
  return base.filter(Boolean) as Contacts.FieldType[];
}

export async function fetchAllContacts({ pageSize = 500, groupId }: FetchOpts = {}) {
  let pageOffset = 0;
  let all: Contacts.Contact[] = [];
  const fields = safeFields();
  console.log('Contacts fields:', fields);

  const base: Partial<Contacts.ContactQuery> = {
    fields,
    pageSize,
    pageOffset,
    ...(Platform.OS === 'ios' && groupId ? { groupId } : {}),
  };

  while (true) {
    const res = await Contacts.getContactsAsync({ ...(base as Contacts.ContactQuery), pageOffset });
    all = all.concat(res.data ?? []);
    if (!res.hasNextPage) break;
    pageOffset += pageSize;
  }
  return all;
}

export async function listIosGroups() {
  if (Platform.OS !== 'ios') return [] as unknown[];
  try {
    const groups = await (Contacts as any).getGroupsAsync?.();
    return groups ?? [];
  } catch {
    return [];
  }
}
