import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProviderV2';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBackendBase } from '@/constants/endpoints';

const API_BASE_URL = getBackendBase();

export default function ContactsDebugScreen() {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/contacts?limit=5`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      setResponse(data);
      console.log('=== CONTACTS API RESPONSE ===');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.items && data.items.length > 0) {
        console.log('=== FIRST CONTACT STRUCTURE ===');
        console.log('Available fields:', Object.keys(data.items[0]));
        console.log('Pipeline field:', data.items[0].pipeline);
        console.log('Theme field:', data.items[0].theme);
        console.log('Stage field:', data.items[0].stage);
        console.log('Status field:', data.items[0].status);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setResponse({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleContact = async () => {
    setLoading(true);
    try {
      // First get a contact ID
      const listRes = await fetch(`${API_BASE_URL}/v1/contacts?limit=1`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const listData = await listRes.json();
      
      if (listData.items && listData.items.length > 0) {
        const contactId = listData.items[0].id;
        
        // Then get full contact details
        const detailRes = await fetch(`${API_BASE_URL}/v1/contacts/${contactId}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        const detailData = await detailRes.json();
        setResponse(detailData);
        
        console.log('=== SINGLE CONTACT DETAIL ===');
        console.log(JSON.stringify(detailData, null, 2));
        console.log('=== FIELDS AVAILABLE ===');
        console.log('All fields:', Object.keys(detailData.contact || detailData));
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      setResponse({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Contacts API Debug</Text>
      
      <View style={styles.buttons}>
        <TouchableOpacity 
          style={[styles.button, styles.buttonPrimary]} 
          onPress={fetchContacts}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Fetch Contacts List (5)'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]} 
          onPress={fetchSingleContact}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Fetch Single Contact Detail'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instruction}>
        Check the console for detailed output!{'\n'}
        Look for: pipeline, theme, stage, status fields
      </Text>

      <ScrollView style={styles.response}>
        <Text style={styles.responseText}>
          {response ? JSON.stringify(response, null, 2) : 'No data yet'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttons: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  response: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
  },
  responseText: {
    color: '#d4d4d4',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
