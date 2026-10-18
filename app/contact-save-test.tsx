import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { usePeople } from '@/providers/PeopleProvider';
import { useAuth } from '@/providers/AuthProviderV2';
import { FLAGS } from '@/constants/flags';
import { Person } from '@/storage/types';

export default function ContactSaveTestScreen() {
  const { addPerson, people } = usePeople();
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
  });

  const runTest = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      console.log('\n╔═══════════════════════════════════════════════════════════');
      console.log('║ 🧪 CONTACT SAVE TEST');
      console.log('╠═══════════════════════════════════════════════════════════');
      console.log('║ 👤 User:', user?.email || 'Not authenticated');
      console.log('║ 🏁 Mode:', FLAGS.LOCAL_ONLY ? 'LOCAL_ONLY' : 'CLOUD');
      console.log('║ 📊 Current contacts count:', people.length);
      console.log('╚═══════════════════════════════════════════════════════════\n');

      if (!formData.fullName) {
        throw new Error('Name is required');
      }

      if (!formData.email && !formData.phone) {
        throw new Error('At least one email or phone is required');
      }

      const newContact: Omit<Person, 'id'> = {
        name: formData.fullName,
        fullName: formData.fullName,
        emails: formData.email ? [formData.email] : [],
        phones: formData.phone ? [formData.phone] : [],
        company: formData.company || '',
        title: '',
        tags: ['test-contact'],
        interests: [],
        lastInteraction: new Date().toISOString(),
        lastInteractionSummary: 'Test contact created',
        cadenceDays: 30,
        warmth: 50,
        createdAt: Date.now(),
      };

      console.log('🔄 Creating contact:', newContact);
      
      const created = await addPerson(newContact);
      
      console.log('✅ Contact created successfully:', created);
      console.log('   - ID:', created.id);
      console.log('   - Name:', created.fullName);
      console.log('   - Email:', created.emails);
      console.log('   - Phone:', created.phones);
      
      setTestResult(`✅ SUCCESS!\n\nContact created:\n- ID: ${created.id}\n- Name: ${created.fullName}\n- Email: ${created.emails?.join(', ') || 'None'}\n- Phone: ${created.phones?.join(', ') || 'None'}\n- Company: ${created.company || 'None'}\n\nMode: ${FLAGS.LOCAL_ONLY ? 'LOCAL_ONLY' : 'CLOUD'}\nUser: ${user?.email || 'Not authenticated'}\n\nTotal contacts: ${people.length + 1}`);
      
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        company: '',
      });
      
      Alert.alert('Success', 'Contact saved successfully!', [
        { text: 'View Contacts', onPress: () => router.push('/(tabs)/people') },
        { text: 'OK' },
      ]);
    } catch (error: any) {
      console.error('❌ Test failed:', error);
      setTestResult(`❌ FAILED\n\nError: ${error.message}\n\nMode: ${FLAGS.LOCAL_ONLY ? 'LOCAL_ONLY' : 'CLOUD'}\nUser: ${user?.email || 'Not authenticated'}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const testAccountSync = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      console.log('\n╔═══════════════════════════════════════════════════════════');
      console.log('║ 🔄 ACCOUNT SYNC TEST');
      console.log('╠═══════════════════════════════════════════════════════════');
      console.log('║ 👤 User:', user?.email || 'Not authenticated');
      console.log('║ 🏁 Mode:', FLAGS.LOCAL_ONLY ? 'LOCAL_ONLY' : 'CLOUD');
      console.log('║ 📊 Current contacts count:', people.length);
      console.log('╚═══════════════════════════════════════════════════════════\n');

      if (FLAGS.LOCAL_ONLY) {
        setTestResult(`⚠️ LOCAL_ONLY MODE\n\nContacts are stored locally on this device only.\n\nTo test cross-platform sync:\n1. Set EXPO_PUBLIC_LOCAL_ONLY=false in .env\n2. Restart the app\n3. Sign in with your account\n4. Run this test again\n\nCurrent contacts: ${people.length}`);
        return;
      }

      if (!user) {
        setTestResult(`❌ NOT AUTHENTICATED\n\nYou must be signed in to test account sync.\n\nPlease sign in and try again.`);
        return;
      }

      const testContacts = people.filter(p => p.tags?.includes('test-contact'));
      
      setTestResult(`✅ CLOUD MODE ACTIVE\n\nAccount: ${user.email}\nUser ID: ${user.id}\n\nContacts are synced to your account and will be available across all devices.\n\nTotal contacts: ${people.length}\nTest contacts: ${testContacts.length}\n\nTo verify cross-platform sync:\n1. Create a contact here\n2. Sign in on another device\n3. Check if the contact appears there`);
    } catch (error: any) {
      console.error('❌ Sync test failed:', error);
      setTestResult(`❌ FAILED\n\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Contact Save Test',
          headerBackTitle: 'Back',
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Mode:</Text>
            <Text style={styles.statusValue}>
              {FLAGS.LOCAL_ONLY ? '📱 LOCAL_ONLY' : '☁️ CLOUD'}
            </Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>User:</Text>
            <Text style={styles.statusValue}>
              {user?.email || '❌ Not authenticated'}
            </Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Total Contacts:</Text>
            <Text style={styles.statusValue}>{people.length}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Test Contact</Text>
          
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholder="John Doe"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="john@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="+1 555 123 4567"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Company</Text>
          <TextInput
            style={styles.input}
            value={formData.company}
            onChangeText={(text) => setFormData({ ...formData, company: text })}
            placeholder="Acme Corp"
            placeholderTextColor="#999"
          />

          <Text style={styles.note}>
            * At least one email or phone is required
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={runTest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Contact</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={testAccountSync}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Test Account Sync</Text>
          </TouchableOpacity>
        </View>

        {testResult ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Result</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>{testResult}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>LOCAL_ONLY Mode:</Text>{'\n'}
              Contacts are stored locally using AsyncStorage. They won't sync across devices.
              {'\n\n'}
              <Text style={styles.bold}>CLOUD Mode:</Text>{'\n'}
              Contacts are saved to Supabase and tied to your account. They sync across all devices where you're signed in.
              {'\n\n'}
              <Text style={styles.bold}>Backend API:</Text>{'\n'}
              POST /api/v1/contacts{'\n'}
              GET /api/v1/contacts{'\n'}
              PUT /api/v1/contacts/:id{'\n'}
              DELETE /api/v1/contacts/:id
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600' as const,
  },
  statusValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultText: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700' as const,
    color: '#000',
  },
});
