import * as Contacts from 'expo-contacts';
import { Alert, Platform, Linking } from 'react-native';
import { mapContactToPerson, buildExistingLookups, isDuplicate, updateLookups } from './nativeContactUtils';
import { Person } from '@/storage/types';
import { logInfo, logWarn, logError } from './diagnosticLogger';

type ImportResult = { imported: number; total: number; duplicates: number; errors: number };

async function ensurePermission() {
  const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
  if (status === 'granted') return true;

  if (status === 'denied' && !canAskAgain) {
    Alert.alert(
      'Permission Required',
      'Please enable contacts permission in Settings to use this feature.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
    return false;
  }

  return false;
}

export async function pickOneNativeContact(
  existingPeople: Person[],
  addPerson: (p: Omit<Person, 'id'>) => Promise<Person>
): Promise<ImportResult> {
  try {
    logInfo('Starting contact picker');
    const ok = await ensurePermission();
    if (!ok) {
      logWarn('Permission denied');
      return { imported: 0, total: 0, duplicates: 0, errors: 1 };
    }

    const picked = await Contacts.presentContactPickerAsync().catch((err) => {
      logError('Picker error', { error: err.message || String(err) });
      return null;
    });
    
    if (!picked) {
      logInfo('User cancelled or picker failed');
      return { imported: 0, total: 0, duplicates: 0, errors: 0 };
    }

    logInfo('Contact picked, mapping...');
    const mapped = mapContactToPerson(picked as any);
    
    if (!mapped) {
      logError('Failed to map contact - contact may be missing required fields');
      return { imported: 0, total: 1, duplicates: 0, errors: 1 };
    }

    const lookups = buildExistingLookups(existingPeople);
    if (isDuplicate(mapped, lookups)) {
      logInfo('Duplicate contact detected', { name: mapped.fullName });
      return { imported: 0, total: 1, duplicates: 1, errors: 0 };
    }

    const { id, ...personWithoutId} = mapped;
    logInfo('Adding contact to CRM', { 
      name: personWithoutId.fullName,
      emails: personWithoutId.emails,
      phones: personWithoutId.phones,
      company: personWithoutId.company
    });
    
    await addPerson(personWithoutId);
    logInfo('Contact added successfully', { 
      name: personWithoutId.fullName,
      id: 'assigned_by_backend'
    });
    
    return { imported: 1, total: 1, duplicates: 0, errors: 0 };
  } catch (error: any) {
    logError('Unexpected error during import', { error: error.message || String(error) });
    return { imported: 0, total: 1, duplicates: 0, errors: 1 };
  }
}

/** Opens the picker repeatedly until the user cancels. */
export async function pickLoopNativeContacts(
  existingPeople: Person[],
  addPerson: (p: Omit<Person, 'id'>) => Promise<Person>,
  onProgress?: (current: number, imported: number) => void
): Promise<ImportResult> {
  try {
    console.log('[pickLoopNativeContacts] Starting loop picker');
    const ok = await ensurePermission();
    if (!ok) {
      console.warn('[pickLoopNativeContacts] Permission denied');
      return { imported: 0, total: 0, duplicates: 0, errors: 1 };
    }

    let imported = 0, total = 0, duplicates = 0, errors = 0;
    const lookups = buildExistingLookups(existingPeople);

    while (true) {
      const contact = await Contacts.presentContactPickerAsync().catch((err) => {
        console.error('[pickLoopNativeContacts] Picker error:', err);
        return null;
      });
      
      if (!contact) {
        console.log('[pickLoopNativeContacts] User cancelled or picker failed, exiting loop');
        break;
      }

      total += 1;
      console.log(`[pickLoopNativeContacts] Processing contact ${total}`);
      
      const mapped = mapContactToPerson(contact as any);
      if (!mapped) {
        console.error(`[pickLoopNativeContacts] Failed to map contact ${total}`);
        errors += 1;
        onProgress?.(total, imported);
        continue;
      }

      if (isDuplicate(mapped, lookups)) {
        console.log(`[pickLoopNativeContacts] Contact ${total} is duplicate`);
        duplicates += 1;
        onProgress?.(total, imported);
        continue;
      }

      try {
        const { id, ...personWithoutId } = mapped;
        console.log(`[pickLoopNativeContacts] Adding person ${total}:`, personWithoutId);
        await addPerson(personWithoutId);
        updateLookups(mapped, lookups);
        imported += 1;
        console.log(`[pickLoopNativeContacts] Successfully added contact ${total}`);
        onProgress?.(total, imported);
      } catch (err) {
        console.error(`[pickLoopNativeContacts] Error adding contact ${total}:`, err);
        errors += 1;
        onProgress?.(total, imported);
      }
    }

    console.log('[pickLoopNativeContacts] Loop complete:', { imported, total, duplicates, errors });
    return { imported, total, duplicates, errors };
  } catch (error) {
    console.error('[pickLoopNativeContacts] Unexpected error:', error);
    return { imported: 0, total: 0, duplicates: 0, errors: 1 };
  }
}

/** iOS 18+ Limited Access picker – lets user grant more specific contacts. */
export async function showIosLimitedAccessPicker(): Promise<string[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const fn: any = (Contacts as any).presentAccessPickerAsync;
    if (typeof fn !== 'function') return [];
    const ids: string[] = await fn();
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}