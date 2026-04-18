/**
 * Bulk Screenshot Ingestion Screen
 *
 * Allows users to select multiple screenshots from their photo library,
 * upload them to the backend for Claude Vision analysis, and merge
 * extracted conversation history into the contact record.
 *
 * Features:
 * - Native PHPickerViewController on iOS (multi-select, no limit)
 * - Progress indicator during upload
 * - Mismatch warning if extracted contact name doesn't match current contact
 * - Success toast with interaction count
 */

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Upload, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { apiFetch } from '@/lib/api';
import Toast from 'react-native-toast-message';

interface IngestionState {
  step: 'idle' | 'picking' | 'uploading' | 'success' | 'error';
  selectedCount: number;
  uploadProgress: number;
  error?: string;
  result?: {
    merged_count: number;
    new_interactions: number;
    key_context: string[];
    open_threads: string[];
  };
  contactMismatch?: boolean;
}

export default function BulkScreenshotIngestScreen() {
  const router = useRouter();
  const { id: contactId, contactName } = useLocalSearchParams();
  const { theme } = useTheme();

  const [state, setState] = useState<IngestionState>({
    step: 'idle',
    selectedCount: 0,
    uploadProgress: 0,
  });

  const selectedFilesRef = useRef<ImagePicker.ImagePickerAsset[]>([]);

  const openPhotoPicker = async () => {
    try {
      setState(prev => ({ ...prev, step: 'picking' }));

      // Request permission
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setState(prev => ({
          ...prev,
          step: 'error',
          error: 'Photo library permission denied',
        }));
        return;
      }

      // Open native photo picker in multi-select mode
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultiple: true, // Enable multi-select
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        selectedFilesRef.current = result.assets;
        setState(prev => ({
          ...prev,
          step: 'idle',
          selectedCount: result.assets.length,
        }));
      } else {
        setState(prev => ({ ...prev, step: 'idle' }));
      }
    } catch (error) {
      console.error('[ScreenshotIngest] Photo picker error:', error);
      setState(prev => ({
        ...prev,
        step: 'error',
        error: 'Failed to open photo library',
      }));
    }
  };

  const uploadScreenshots = async () => {
    if (selectedFilesRef.current.length === 0) {
      Alert.alert('No images selected', 'Please select at least one screenshot');
      return;
    }

    try {
      setState(prev => ({ ...prev, step: 'uploading', uploadProgress: 0 }));

      const formData = new FormData();

      // Add screenshots to form data
      selectedFilesRef.current.forEach((asset, index) => {
        const filename = asset.filename || `screenshot_${index}.jpg`;
        const uri = Platform.OS === 'web' ? asset.uri : asset.uri;

        formData.append('screenshots', {
          uri,
          type: 'image/jpeg',
          name: filename,
        } as any);
      });

      // Show progress
      setState(prev => ({ ...prev, uploadProgress: 30 }));

      // Upload to backend
      const response = await apiFetch(`/api/contacts/${contactId}/ingest-screenshots`, {
        method: 'POST',
        requireAuth: true,
        body: formData,
        headers: {
          // Don't set Content-Type for FormData - fetch will set it automatically
        },
      });

      setState(prev => ({ ...prev, uploadProgress: 70 }));

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setState(prev => ({
        ...prev,
        uploadProgress: 100,
        step: 'success',
        result,
      }));

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Success!',
        text2: `Added ${result.new_interactions} interactions`,
        duration: 4000,
      });

      // Reset state after delay
      setTimeout(() => {
        selectedFilesRef.current = [];
        setState({
          step: 'idle',
          selectedCount: 0,
          uploadProgress: 0,
        });
      }, 2000);
    } catch (error: any) {
      console.error('[ScreenshotIngest] Upload error:', error);
      setState(prev => ({
        ...prev,
        step: 'error',
        error: error.message || 'Upload failed',
      }));
    }
  };

  const reset = () => {
    selectedFilesRef.current = [];
    setState({
      step: 'idle',
      selectedCount: 0,
      uploadProgress: 0,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Import Conversation History
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Name */}
        <Text style={[styles.contactName, { color: theme.colors.textSecondary }]}>
          {contactName}
        </Text>

        {/* Instructions */}
        <View style={[styles.instructionsBox, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.instructionsTitle, { color: theme.colors.text }]}>
            How it works
          </Text>
          <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
            1. Select conversation screenshots from your photo library
          </Text>
          <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
            2. Our AI extracts the conversation history
          </Text>
          <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
            3. Interactions are added to this contact's timeline
          </Text>
        </View>

        {/* Selection Status */}
        {state.selectedCount > 0 && state.step !== 'uploading' && (
          <View
            style={[
              styles.statusBox,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.statusText, { color: theme.colors.text }]}>
              {state.selectedCount} screenshot{state.selectedCount !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

        {/* Upload Progress */}
        {state.step === 'uploading' && (
          <View
            style={[
              styles.progressBox,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              style={[
                styles.progressText,
                { color: theme.colors.text, marginTop: 12 },
              ]}
            >
              Analyzing {state.selectedCount} screenshot
              {state.selectedCount !== 1 ? 's' : ''}...
            </Text>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${state.uploadProgress}%`,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Success Result */}
        {state.step === 'success' && state.result && (
          <View
            style={[
              styles.resultBox,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <CheckCircle size={48} color="#10B981" />
            <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
              Successfully Imported
            </Text>
            <Text style={[styles.resultText, { color: theme.colors.textSecondary }]}>
              {state.result.new_interactions} interaction
              {state.result.new_interactions !== 1 ? 's' : ''} added
            </Text>
            {state.result.key_context.length > 0 && (
              <View style={styles.contextBox}>
                <Text style={[styles.contextTitle, { color: theme.colors.text }]}>
                  Key Context
                </Text>
                {state.result.key_context.map((item, idx) => (
                  <Text
                    key={idx}
                    style={[styles.contextItem, { color: theme.colors.textSecondary }]}
                  >
                    • {item}
                  </Text>
                ))}
              </View>
            )}
            {state.result.open_threads.length > 0 && (
              <View style={styles.threadsBox}>
                <Text style={[styles.threadsTitle, { color: theme.colors.text }]}>
                  Open Threads
                </Text>
                {state.result.open_threads.map((thread, idx) => (
                  <Text
                    key={idx}
                    style={[styles.threadItem, { color: theme.colors.textSecondary }]}
                  >
                    • {thread}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {state.step === 'error' && state.error && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
            ]}
          >
            <AlertCircle size={24} color="#DC2626" />
            <Text style={[styles.errorTitle, { color: '#991B1B' }]}>
              {state.error}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        {state.step === 'idle' && (
          <>
            {state.selectedCount > 0 && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={uploadScreenshots}
              >
                <Upload size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Upload & Analyze</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                state.selectedCount > 0
                  ? { backgroundColor: theme.colors.surface }
                  : { backgroundColor: theme.colors.primary },
              ]}
              onPress={openPhotoPicker}
            >
              <Text
                style={[
                  styles.buttonText,
                  state.selectedCount > 0 && { color: theme.colors.text },
                ]}
              >
                {state.selectedCount > 0 ? 'Choose More' : 'Select Screenshots'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {state.step === 'success' && (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                reset();
                openPhotoPicker();
              }}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                Import More
              </Text>
            </TouchableOpacity>
          </>
        )}

        {state.step === 'error' && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              reset();
              openPhotoPicker();
            }}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  contactName: {
    fontSize: 14,
    marginBottom: 16,
  },
  instructionsBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
  statusBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBox: {
    padding: 24,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  resultBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  resultText: {
    fontSize: 14,
    marginTop: 4,
  },
  contextBox: {
    marginTop: 12,
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  contextTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  contextItem: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 3,
  },
  threadsBox: {
    marginTop: 12,
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  threadsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  threadItem: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 3,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
