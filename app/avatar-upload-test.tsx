import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePeople } from '@/providers/PeopleProvider';
import { Camera, Upload, CheckCircle, XCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadContactAvatar } from '@/lib/imageUpload';
import Avatar from '@/components/Avatar';

interface TestResult {
  contactId: string;
  contactName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  avatarUrl?: string;
  error?: string;
}

export default function AvatarUploadTestScreen() {
  const { people, updatePerson } = usePeople();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const pickImageForContact = async (contactId: string, contactName: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to test image upload.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await testUploadForContact(contactId, contactName, result.assets[0].uri);
    }
  };

  const testUploadForContact = async (contactId: string, contactName: string, imageUri: string) => {
    setTestResults(prev => [
      ...prev,
      {
        contactId,
        contactName,
        status: 'uploading',
      },
    ]);

    try {
      console.log('[AvatarTest] Starting upload for:', contactName);
      
      const uploadResult = await uploadContactAvatar(imageUri, contactId);
      
      if (!uploadResult) {
        throw new Error('Upload failed - no result returned');
      }

      console.log('[AvatarTest] Upload successful:', uploadResult.url);

      await updatePerson(contactId, {
        avatarUrl: uploadResult.url,
      });

      console.log('[AvatarTest] Contact updated with avatar URL');

      setTestResults(prev =>
        prev.map(r =>
          r.contactId === contactId
            ? { ...r, status: 'success', avatarUrl: uploadResult.url }
            : r
        )
      );
    } catch (error) {
      console.error('[AvatarTest] Upload failed:', error);
      setTestResults(prev =>
        prev.map(r =>
          r.contactId === contactId
            ? {
                ...r,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            : r
        )
      );
    }
  };

  const runBulkTest = async () => {
    if (people.length === 0) {
      Alert.alert('No Contacts', 'Please add some contacts first to test avatar uploads.');
      return;
    }

    Alert.alert(
      'Bulk Test',
      'This will prompt you to select an image for each contact. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            setIsRunning(true);
            setTestResults([]);

            for (const person of people.slice(0, 5)) {
              await pickImageForContact(person.id, person.fullName);
            }

            setIsRunning(false);
          },
        },
      ]
    );
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'uploading':
        return <ActivityIndicator size="small" color="#4ECDC4" />;
      case 'success':
        return <CheckCircle size={20} color="#4ECDC4" />;
      case 'error':
        return <XCircle size={20} color="#FF6B6B" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'uploading':
        return '#FFD93D';
      case 'success':
        return '#4ECDC4';
      case 'error':
        return '#FF6B6B';
      default:
        return '#E5E5E5';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Avatar Upload Test</Text>
          <Text style={styles.subtitle}>
            Test uploading profile images to contacts
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runBulkTest}
            disabled={isRunning || people.length === 0}
          >
            <Upload size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              Test Bulk Upload (First 5 Contacts)
            </Text>
          </TouchableOpacity>

          {testResults.length > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={clearResults}
              disabled={isRunning}
            >
              <Text style={[styles.buttonText, { color: '#000000' }]}>
                Clear Results
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Contacts ({people.length})</Text>
          {people.slice(0, 10).map((person) => (
            <View key={person.id} style={styles.contactCard}>
              <Avatar
                name={person.fullName}
                avatarUrl={person.avatarUrl}
                size={40}
              />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{person.fullName}</Text>
                <Text style={styles.contactDetail}>
                  {person.emails?.[0] || person.phones?.[0] || 'No contact info'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImageForContact(person.id, person.fullName)}
                disabled={isRunning}
              >
                <Camera size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            {testResults.map((result, index) => (
              <View
                key={`${result.contactId}-${index}`}
                style={[
                  styles.resultCard,
                  { borderLeftColor: getStatusColor(result.status) },
                ]}
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.resultName}>{result.contactName}</Text>
                  {getStatusIcon(result.status)}
                </View>
                
                {result.status === 'uploading' && (
                  <Text style={styles.resultStatus}>Uploading image...</Text>
                )}
                
                {result.status === 'success' && result.avatarUrl && (
                  <View style={styles.successContent}>
                    <Text style={styles.resultStatus}>✓ Upload successful</Text>
                    <Avatar name={result.contactName} avatarUrl={result.avatarUrl} size={80} />
                    <Text style={styles.resultUrl} numberOfLines={1}>
                      {result.avatarUrl}
                    </Text>
                  </View>
                )}
                
                {result.status === 'error' && (
                  <View style={styles.errorContent}>
                    <Text style={styles.errorText}>✗ Upload failed</Text>
                    <Text style={styles.errorDetail}>{result.error}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Endpoint</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Endpoint:</Text>
            <Text style={styles.infoValue}>PATCH /v1/contacts/:id</Text>
            
            <Text style={[styles.infoLabel, { marginTop: 12 }]}>Field:</Text>
            <Text style={styles.infoValue}>avatar_url</Text>
            
            <Text style={[styles.infoLabel, { marginTop: 12 }]}>Example:</Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>
                {`{\n  "avatar_url": "https://cdn.example.com/avatars/contact-abc.jpg"\n}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#000000',
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  contactDetail: {
    fontSize: 12,
    color: '#666666',
  },
  uploadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCard: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  resultStatus: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  successContent: {
    gap: 8,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E5E5',
  },
  resultUrl: {
    fontSize: 11,
    color: '#999999',
    fontFamily: 'monospace',
  },
  errorContent: {
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  errorDetail: {
    fontSize: 11,
    color: '#666666',
  },
  infoCard: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#000000',
    fontFamily: 'monospace',
  },
  codeBlock: {
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  codeText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontFamily: 'monospace',
  },
  actions: {
    padding: 16,
  },
  backButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
});
