import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

interface PermState { status: 'unknown' | 'granted' | 'denied'; detail?: string }

export default function PermissionsSettingsScreen() {
  const [mic, setMic] = useState<PermState>({ status: 'unknown' });
  const [photos, setPhotos] = useState<PermState>({ status: 'unknown' });
  const [camera, setCamera] = useState<PermState>({ status: 'unknown' });
  const [contacts, setContacts] = useState<PermState>({ status: 'unknown' });
  const [notifications, setNotifications] = useState<PermState>({ status: 'unknown' });

  useEffect(() => { void refreshAll(); }, []);

  const refreshAll = async () => {
    try {
      const micPerm = await Audio.getPermissionsAsync();
      setMic({ status: micPerm.granted ? 'granted' : 'denied' });
    } catch {}

    try {
      const libPerm = await ImagePicker.getMediaLibraryPermissionsAsync();
      setPhotos({ status: libPerm.granted ? 'granted' : 'denied' });
    } catch {}

    try {
      const camPerm = await ImagePicker.getCameraPermissionsAsync();
      setCamera({ status: camPerm.granted ? 'granted' : 'denied' });
    } catch {}

    try {
      const c = await Contacts.getPermissionsAsync();
      setContacts({ status: c.status === Contacts.PermissionStatus.GRANTED ? 'granted' : 'denied' });
    } catch {}

    try {
      // Optional: expo-notifications may not be installed; treat as best-effort
      const Notifications = await import('expo-notifications');
      const settings = await Notifications.getPermissionsAsync();
      setNotifications({ status: settings.granted ? 'granted' : 'denied' });
    } catch {
      setNotifications({ status: 'unknown', detail: 'Notifications module unavailable' });
    }
  };

  const request = async (type: 'mic' | 'photos' | 'camera' | 'contacts' | 'notifications') => {
    try {
      if (type === 'mic') {
        const res = await Audio.requestPermissionsAsync();
        setMic({ status: res.granted ? 'granted' : 'denied' });
      } else if (type === 'photos') {
        const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setPhotos({ status: res.granted ? 'granted' : 'denied' });
      } else if (type === 'camera') {
        const res = await ImagePicker.requestCameraPermissionsAsync();
        setCamera({ status: res.granted ? 'granted' : 'denied' });
      } else if (type === 'contacts') {
        const res = await Contacts.requestPermissionsAsync();
        setContacts({ status: res.status === Contacts.PermissionStatus.GRANTED ? 'granted' : 'denied' });
      } else if (type === 'notifications') {
        try {
          const Notifications = await import('expo-notifications');
          const res = await Notifications.requestPermissionsAsync();
          setNotifications({ status: res.granted ? 'granted' : 'denied' });
        } catch {
          Alert.alert('Unavailable', 'Notifications module not installed in this build.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to request permission');
    }
  };

  const openSettings = async () => {
    try { await Linking.openSettings(); } catch {}
  };

  const Row = ({ name, state, onRequest }: { name: string; state: PermState; onRequest: () => void }) => (
    <View style={styles.row}>
      <View>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={[styles.rowStatus, state.status === 'granted' ? styles.ok : state.status === 'denied' ? styles.bad : styles.unknown]}>
          {state.status.toUpperCase()}
        </Text>
        {!!state.detail && <Text style={styles.detail}>{state.detail}</Text>}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={onRequest}><Text style={styles.btnText}>Request</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.outline]} onPress={openSettings}><Text style={[styles.btnText, styles.outlineText]}>Open Settings</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Permissions & Privacy',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <ArrowLeft size={22} color="#111827" />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Row name="Microphone" state={mic} onRequest={() => request('mic')} />
        <Row name="Photos / Media" state={photos} onRequest={() => request('photos')} />
        <Row name="Camera" state={camera} onRequest={() => request('camera')} />
        <Row name="Contacts" state={contacts} onRequest={() => request('contacts')} />
        <Row name="Notifications" state={notifications} onRequest={() => request('notifications')} />
        <TouchableOpacity style={styles.refresh} onPress={refreshAll}><Text style={styles.refreshText}>Refresh</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 12 },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  rowStatus: { marginTop: 4, fontSize: 12 },
  ok: { color: '#10B981' },
  bad: { color: '#EF4444' },
  unknown: { color: '#9CA3AF' },
  detail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { backgroundColor: '#3B82F6', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  outline: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#3B82F6' },
  outlineText: { color: '#3B82F6' },
  refresh: { marginTop: 8, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#111827' },
  refreshText: { color: '#fff', fontWeight: '600' },
});
