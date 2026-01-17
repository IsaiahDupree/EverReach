import { Alert, Linking, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';

export async function ensureContactsPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { granted, canAskAgain } = await Contacts.getPermissionsAsync();
    if (granted) return true;

    const req = await Contacts.requestPermissionsAsync();
    if (req.granted) return true;

    if (!canAskAgain) {
      Alert.alert(
        'Allow Contacts',
        'To import contacts, enable Contacts access in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  } catch (e) {
    console.warn('ensureContactsPermission error', e);
  }
  return false;
}
