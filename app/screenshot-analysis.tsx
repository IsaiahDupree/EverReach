import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Camera, ImageIcon, X, Check, ArrowLeft, Users, MessageSquare, Home, UserCircle } from 'lucide-react-native';
import { useScreenshotAnalysis } from '@/hooks/useScreenshotAnalysis';
import { useTheme } from '@/providers/ThemeProvider';
import { usePeople } from '@/providers/PeopleProvider';
import ContactPicker from '@/components/ContactPicker';
import { useAnalytics } from '@/hooks/useAnalytics';
import { apiFetch } from '@/lib/api';
// Using legacy import for expo-file-system (SDK 54+ deprecated uploadAsync)
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as FileSystem from 'expo-file-system';
import { PaywallGate } from '@/components/PaywallGate';

export default function ScreenshotAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { people } = usePeople();
  const screenAnalytics = useAnalytics('ScreenshotAnalysis');
  
  const {
    image,
    analyzing,
    analysisResult,
    error,
    showImagePicker,
    analyzeScreenshot,
    executeSuggestedAction,
    removeImage,
  } = useScreenshotAnalysis();
  
  // Contact selection state
  const personId = typeof params.personId === 'string' ? params.personId : undefined;
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(personId || null);
  const [showContactPicker, setShowContactPicker] = useState(!personId);
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatingMessage, setGeneratingMessage] = useState(false);
  
  // Removed tRPC media upload; using REST endpoint instead

  const handleAnalyze = async () => {
    await analyzeScreenshot('crm');
  };

  const handleActionExecute = async (action: any) => {
    const success = await executeSuggestedAction(action);
    if (success) {
      alert('Action completed successfully!');
    }
  };

  /**
   * Upload screenshot image using tRPC media.upload
   * This uploads to Supabase Storage and creates a media_assets record
   */
  const uploadScreenshotToContact = async (
    contactId: string,
    imageData: typeof image
  ): Promise<{ url: string; id: string; path: string }> => {
    if (!imageData || (!imageData.base64 && !imageData.uri)) {
      throw new Error('No image data to upload - base64 or uri required');
    }
    
    console.log('[ScreenshotAnalysis] Using 3-step presigned upload flow (from E2E docs)');
    console.log('[ScreenshotAnalysis] Contact ID:', contactId);
    console.log('[ScreenshotAnalysis] File:', imageData.fileName, imageData.mimeType);
    console.log('[ScreenshotAnalysis] File size:', imageData.fileSize, 'bytes');
    console.log('[ScreenshotAnalysis] Has URI:', !!imageData.uri);
    console.log('[ScreenshotAnalysis] Has Base64:', !!imageData.base64);

    // Step 1: Request presigned upload URL
    const path = `contacts/${contactId}/${Date.now()}-${imageData.fileName}`;
    console.log('[ScreenshotAnalysis] Step 1: Requesting presigned URL...');
    
    const signResponse = await apiFetch('/api/v1/files', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        path,
        contentType: imageData.mimeType,
      }),
    });

    if (!signResponse.ok) {
      const text = await signResponse.text().catch(() => '');
      throw new Error(`Presigned URL request failed (${signResponse.status}): ${text}`);
    }

    const signResult = await signResponse.json();
    const presignedUrl = signResult.url;
    
    console.log('[ScreenshotAnalysis] Presigned URL obtained');
    
    // Step 2: Upload file to storage using presigned URL
    console.log('[ScreenshotAnalysis] Step 2: Uploading to storage...');
    
    let filePathToUpload: string;
    let needsCleanup = false;
    
    // Prefer using the URI directly (avoids Base64 encoding issues)
    if (imageData.uri && !imageData.uri.startsWith('data:')) {
      // Use URI directly (file:// path)
      filePathToUpload = imageData.uri;
      console.log('[ScreenshotAnalysis] Using image URI directly:', filePathToUpload);
    } else if (imageData.base64) {
      // Need to write base64 to temp file using legacy API
      const tempFilePath = `${FileSystemLegacy.cacheDirectory}${Date.now()}-${imageData.fileName}`;
      
      // Check if EncodingType is available
      const encodingType = FileSystemLegacy.EncodingType?.Base64;
      if (!encodingType) {
        console.warn('[ScreenshotAnalysis] FileSystemLegacy.EncodingType.Base64 not available, using fallback');
        throw new Error('FileSystem.EncodingType not available. Please ensure expo-file-system is properly installed.');
      }
    
      // Write base64 to temp file using legacy API
      await FileSystemLegacy.writeAsStringAsync(tempFilePath, imageData.base64, {
        encoding: encodingType,
    });
    
      filePathToUpload = tempFilePath;
      needsCleanup = true;
      console.log('[ScreenshotAnalysis] Temp file written:', filePathToUpload);
    } else {
      throw new Error('No valid image source available');
    }
    
    // Upload using legacy FileSystem.uploadAsync (deprecated in SDK 54+ but works)
    console.log('[ScreenshotAnalysis] Uploading with FileSystemLegacy.uploadAsync...');
    const uploadResult = await FileSystemLegacy.uploadAsync(presignedUrl, filePathToUpload, {
      httpMethod: 'PUT',
      headers: {
        'Content-Type': imageData.mimeType,
      },
    });

    if (uploadResult.status !== 200) {
      throw new Error(`Storage PUT failed (${uploadResult.status})`);
    }

    console.log('[ScreenshotAnalysis] File uploaded to storage');
    
    // Clean up temp file if we created one
    if (needsCleanup) {
      await FileSystemLegacy.deleteAsync(filePathToUpload, { idempotent: true });
    }
    
    // Step 3: Link uploaded file to contact
    console.log('[ScreenshotAnalysis] Step 3: Linking file to contact...');
    const linkResponse = await apiFetch(`/api/v1/contacts/${contactId}/files`, {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        path,
        mime_type: imageData.mimeType,
        size_bytes: imageData.fileSize || Math.floor(imageData.base64.length * 0.75), // Estimate from base64
      }),
    });

    if (!linkResponse.ok) {
      const text = await linkResponse.text().catch(() => '');
      throw new Error(`File linking failed (${linkResponse.status}): ${text}`);
    }

    const linkResult = await linkResponse.json();
    console.log('[ScreenshotAnalysis] File linked successfully!');
    console.log('[ScreenshotAnalysis] Attachment ID:', linkResult.attachment?.id);

    // Build public URL from environment (do not hardcode project)
    const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    const SUPABASE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'attachments';
    const publicUrl = SUPABASE_URL
      ? `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`
      : `https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
    console.log('[ScreenshotAnalysis] Public URL:', publicUrl);

    return {
      url: publicUrl,
      id: linkResult.attachment?.id,
      path,
    };
  };

  /**
   * Format analysis data into readable note content
   */
  const formatAnalysisNote = (data: {
    visionSummary?: string;
    ocrText?: string;
    additionalContext?: string;
  }): string => {
    let content = '📸 Screenshot Analysis\n\n';
    
    if (data.visionSummary) {
      content += `🤖 AI Summary:\n${data.visionSummary}\n\n`;
    }
    
    if (data.ocrText) {
      content += `📝 Extracted Text:\n${data.ocrText}\n\n`;
    }
    
    if (data.additionalContext) {
      content += `💭 Additional Context:\n${data.additionalContext}`;
    }
    
    return content.trim();
  };

  /**
   * Save screenshot analysis as a note to the contact
   */
  const saveAnalysisToContact = async (contactId: string): Promise<void> => {
    if (!analysisResult) {
      throw new Error('No analysis to save');
    }
    
    if (!image) {
      throw new Error('No screenshot image to upload');
    }
    
    // Step 1: Upload screenshot image to contact files (required)
    console.log('[ScreenshotAnalysis] Step 1: Uploading screenshot...');
    const uploadResult = await uploadScreenshotToContact(contactId, image);
    console.log('[ScreenshotAnalysis] Screenshot uploaded:', uploadResult.url);
    
    // Step 2: Create note with analysis and link to uploaded file
    const noteContent = formatAnalysisNote({
      visionSummary: analysisResult.vision_summary,
      ocrText: analysisResult.ocr_text,
      additionalContext: additionalContext || undefined,
    });
    
    console.log('[ScreenshotAnalysis] Step 2: Creating note...');
    const response = await apiFetch(`/api/v1/contacts/${contactId}/notes`, {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        content: noteContent,
        metadata: {
          type: 'screenshot_analysis',
          file_path: uploadResult.path,
          file_url: uploadResult.url,
          file_id: uploadResult.id,
          vision_summary: analysisResult.vision_summary,
          ocr_text: analysisResult.ocr_text,
          additional_context: additionalContext || undefined,
          analyzed_at: new Date().toISOString(),
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ScreenshotAnalysis] Note creation failed:', response.status, errorText);
      throw new Error(`Failed to save note: ${response.status} - ${errorText}`);
    }
    
    console.log('[ScreenshotAnalysis] Analysis saved successfully to contact');
  };

  const styles = createStyles(theme);

  return (
    <PaywallGate featureArea="screenshot_analysis">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Screenshot Analysis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Instructions */}
        {!image && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📸 Analyze Screenshots</Text>
            <Text style={styles.instructionsText}>
              Upload a screenshot or photo to extract contacts, interactions, and action items automatically.
            </Text>
          </View>
        )}

        {/* Image Picker Buttons */}
        {!image && (
          <View style={styles.pickerButtons}>
            <TouchableOpacity
              style={[styles.pickerButton, styles.primaryButton]}
              onPress={showImagePicker}
            >
              <ImageIcon size={24} color="#FFFFFF" />
              <Text style={styles.pickerButtonText}>Select Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Image Preview */}
        {image && (
          <View style={styles.imagePreviewCard}>
            <View style={styles.imageHeader}>
              <Text style={styles.imageLabel}>Selected Image</Text>
              <TouchableOpacity onPress={removeImage} style={styles.removeButton}>
                <X size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="contain" />
            
            {!analyzing && !analysisResult && (
              <TouchableOpacity
                style={[styles.analyzeButton, styles.primaryButton]}
                onPress={handleAnalyze}
              >
                <Text style={styles.analyzeButtonText}>Analyze Screenshot</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Contact Picker Section */}
        {image && (
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>
              <Users size={18} color={theme.colors.text} /> Select Contact
            </Text>
            <ContactPicker
              multiSelect={false}
              selectedId={selectedPersonId}
              onSelect={setSelectedPersonId}
            />
          </View>
        )}

        {/* Loading State */}
        {analyzing && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Analyzing screenshot...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <View style={styles.resultsContainer}>
            {/* Show pending message if no results yet */}
            {!analysisResult.ocr_text && !analysisResult.vision_summary && (
              <View style={styles.pendingCard}>
                <Text style={styles.pendingTitle}>⏳ Analysis In Progress</Text>
                <Text style={styles.pendingText}>
                  Your screenshot has been uploaded and is being analyzed. 
                  {'\n\n'}
                  This feature requires backend configuration (OCR and Vision AI services).
                  {'\n\n'}
                  Analysis ID: {analysisResult.id}
                </Text>
              </View>
            )}

            {/* OCR Text */}
            {analysisResult.ocr_text && (
              <View style={styles.resultCard}>
                <Text style={styles.resultCardTitle}>📝 Extracted Text</Text>
                <Text style={styles.resultCardText}>{analysisResult.ocr_text}</Text>
              </View>
            )}

            {/* Vision Summary */}
            {analysisResult.vision_summary && (
              <View style={styles.resultCard}>
                <Text style={styles.resultCardTitle}>👁️ AI Summary</Text>
                <Text style={styles.resultCardText}>{analysisResult.vision_summary}</Text>
              </View>
            )}

            {/* Detected Contacts */}
            {analysisResult.detected_entities?.contacts && analysisResult.detected_entities.contacts.length > 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultCardTitle}>
                  👤 Contacts ({analysisResult.detected_entities.contacts.length})
                </Text>
                {analysisResult.detected_entities.contacts.map((contact, index) => (
                  <View key={index} style={styles.entityItem}>
                    <Text style={styles.entityName}>{contact.name}</Text>
                    {contact.email && <Text style={styles.entityDetail}>✉️ {contact.email}</Text>}
                    {contact.phone && <Text style={styles.entityDetail}>📞 {contact.phone}</Text>}
                    {contact.company && (
                      <Text style={styles.entityDetail}>🏢 {contact.company}</Text>
                    )}
                    <Text style={styles.entityConfidence}>
                      Confidence: {Math.round(contact.confidence * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Items */}
            {analysisResult.detected_entities?.action_items && analysisResult.detected_entities.action_items.length > 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultCardTitle}>
                  ✅ Action Items ({analysisResult.detected_entities.action_items.length})
                </Text>
                {analysisResult.detected_entities.action_items.map((item, index) => (
                  <View key={index} style={styles.actionItem}>
                    <Text style={styles.actionItemText}>• {item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suggested Actions */}
            {analysisResult.suggested_actions && analysisResult.suggested_actions.length > 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultCardTitle}>🎯 Suggested Actions</Text>
                {analysisResult.suggested_actions.map((action, index) => (
                  <View key={index} style={styles.suggestedActionItem}>
                    <View style={styles.actionInfoExpanded}>
                      <View style={styles.actionHeader}>
                        <Text style={styles.actionType}>
                          {action.type.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                        <Text style={styles.actionConfidence}>
                          {Math.round(action.confidence * 100)}% confident
                        </Text>
                      </View>
                      
                      {/* Show action details */}
                      {action.type === 'create_contact' && action.data && (
                        <View style={styles.actionDetails}>
                          {action.data.name && (
                            <Text style={styles.actionDetailText}>
                              👤 <Text style={styles.actionDetailBold}>{action.data.name}</Text>
                            </Text>
                          )}
                          {action.data.email && (
                            <Text style={styles.actionDetailText}>
                              📧 {action.data.email}
                            </Text>
                          )}
                          {action.data.phone && (
                            <Text style={styles.actionDetailText}>
                              📱 {action.data.phone}
                            </Text>
                          )}
                          {action.data.company && (
                            <Text style={styles.actionDetailText}>
                              🏢 {action.data.company}
                            </Text>
                          )}
                        </View>
                      )}
                      
                      {action.type === 'create_interaction' && action.data && (
                        <View style={styles.actionDetails}>
                          {action.data.type && (
                            <Text style={styles.actionDetailText}>
                              Type: <Text style={styles.actionDetailBold}>{action.data.type}</Text>
                            </Text>
                          )}
                          {action.data.summary && (
                            <Text style={styles.actionDetailText}>
                              {action.data.summary}
                            </Text>
                          )}
                        </View>
                      )}
                      
                      {action.type === 'add_note' && action.data && (
                        <View style={styles.actionDetails}>
                          {action.data.note && (
                            <Text style={styles.actionDetailText}>
                              📝 {action.data.note.substring(0, 100)}
                              {action.data.note.length > 100 ? '...' : ''}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    
                    <TouchableOpacity
                      style={styles.executeButton}
                      onPress={() => handleActionExecute(action)}
                    >
                      <Check size={16} color="#FFFFFF" />
                      <Text style={styles.executeButtonText}>Execute</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            {/* Additional Context Field - Optional */}
            {selectedPersonId && analysisResult && (
              <View style={styles.contextSection}>
                <Text style={styles.sectionTitle}>
                  Additional Context (Optional)
                </Text>
                <Text style={styles.contextSubtitle}>
                  Add extra details to help craft a better message
                </Text>
                <TextInput
                  style={styles.contextInput}
                  placeholder="e.g., Mention the deadline, ask about budget, offer to help..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={additionalContext}
                  onChangeText={setAdditionalContext}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {additionalContext.length}/500 characters
                </Text>
                
                {/* Craft Message Button - Below additional context */}
                <TouchableOpacity
                  style={[styles.craftMessageButton, generatingMessage && styles.craftMessageButtonDisabled]}
                  onPress={async () => {
                    if (!selectedPersonId || !analysisResult || generatingMessage) return;
                    
                    setGeneratingMessage(true);
                    try {
                      screenAnalytics.track('craft_message_from_screenshot', {
                        contact_id: selectedPersonId,
                        has_vision_summary: !!analysisResult.vision_summary,
                        has_ocr_text: !!analysisResult.ocr_text,
                        has_additional_context: !!additionalContext,
                      });
                      
                      // Step 1: Save analysis and image to contact as note
                      console.log('[ScreenshotAnalysis] Saving analysis to contact...');
                      await saveAnalysisToContact(selectedPersonId);
                      
                      // Step 2: Generate message using compose endpoint
                      const messageGoal = analysisResult.vision_summary || analysisResult.ocr_text || 'Screenshot analysis';
                      console.log('[ScreenshotAnalysis] Calling compose API for contact:', selectedPersonId);
                      
                      const response = await apiFetch(`/api/v1/compose`, {
                        method: 'POST',
                        requireAuth: true,
                        body: JSON.stringify({
                          contact_id: selectedPersonId,
                          goal: messageGoal,
                          channel: 'sms',
                          tone: 'casual',
                          context: {
                            screenshot_analysis: analysisResult.vision_summary,
                            ocr_text: analysisResult.ocr_text,
                            additional_context: additionalContext || undefined,
                          },
                        }),
                      });
                      
                      if (!response.ok) {
                        throw new Error('Failed to generate message');
                      }
                      
                      const data = await response.json();
                      console.log('[ScreenshotAnalysis] Message generated successfully');
                      
                      // Step 3: Navigate to message-results with compose response
                      router.push({
                        pathname: '/message-results',
                        params: {
                          personId: selectedPersonId,
                          channel: 'sms',
                          goalId: 'screenshot_response',
                          customGoal: messageGoal,
                          // The compose endpoint returns the full message data
                          // message-results will handle displaying it
                        },
                      });
                    } catch (error) {
                      console.error('[ScreenshotAnalysis] Failed:', error);
                      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process. Please try again.');
                    } finally {
                      setGeneratingMessage(false);
                    }
                  }}
                  disabled={generatingMessage}
                >
                  {generatingMessage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MessageSquare size={20} color="#FFFFFF" />
                      <Text style={styles.craftMessageButtonText}>
                        Craft Message
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Actions - Cancel and Save */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <X size={20} color="#666666" />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, (!analysisResult || !selectedPersonId || generatingMessage) && styles.saveButtonDisabled]}
          onPress={async () => {
            if (!analysisResult || !selectedPersonId || generatingMessage) return;
            
            setGeneratingMessage(true);
            try {
              screenAnalytics.track('screenshot_analysis_saved', {
                contact_id: selectedPersonId,
                has_additional_context: !!additionalContext,
              });
              
              // Save analysis and image to contact as note
              console.log('[ScreenshotAnalysis] Saving analysis to contact...');
              await saveAnalysisToContact(selectedPersonId);
              
              Alert.alert('Success', 'Screenshot analysis saved to contact!', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('[ScreenshotAnalysis] Failed to save analysis:', error);
              Alert.alert('Error', 'Failed to save analysis. Please try again.');
            } finally {
              setGeneratingMessage(false);
            }
          }}
          disabled={!analysisResult || !selectedPersonId || generatingMessage}
        >
          {generatingMessage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Analysis</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </PaywallGate>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    instructionsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
    },
    instructionsTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    instructionsText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    pickerButtons: {
      gap: 12,
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    pickerButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    imagePreviewCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    imageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    imageLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    removeButton: {
      padding: 4,
    },
    imagePreview: {
      width: '100%',
      height: 300,
      borderRadius: 8,
      marginBottom: 12,
    },
    analyzeButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    analyzeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    loadingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 40,
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    loadingSubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    errorCard: {
      backgroundColor: theme.colors.errorBackground || '#FEE',
      borderRadius: 12,
      padding: 16,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.error,
    },
    pendingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
    },
    pendingTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    pendingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      textAlign: 'center',
    },
    resultsContainer: {
      gap: 16,
    },
    resultCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    resultCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    resultCardText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    entityItem: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    entityName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    entityDetail: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    entityConfidence: {
      fontSize: 12,
      color: theme.colors.primary,
      marginTop: 4,
    },
    actionItem: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    actionItemText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    suggestedActionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    actionInfo: {
      flex: 1,
    },
    actionInfoExpanded: {
      flex: 1,
      marginRight: 12,
    },
    actionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    actionType: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    actionConfidence: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    actionDetails: {
      backgroundColor: theme.colors.surface,
      borderRadius: 6,
      padding: 10,
      gap: 6,
    },
    actionDetailText: {
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 18,
    },
    actionDetailBold: {
      fontWeight: '600',
      color: theme.colors.text,
    },
    executeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.success || theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      gap: 4,
    },
    executeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    contactSection: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    contextSection: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    contextSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    contextInput: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: theme.colors.text,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    characterCount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 6,
      textAlign: 'right',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    craftMessageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3B82F6',
      padding: 14,
      borderRadius: 12,
      gap: 8,
      marginTop: 16,
    },
    craftMessageButtonDisabled: {
      backgroundColor: '#93C5FD',
      opacity: 0.7,
    },
    craftMessageButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E5E5',
    },
    cancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      gap: 6,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#666666',
    },
    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: '#000000',
      gap: 6,
    },
    saveButtonDisabled: {
      backgroundColor: '#CCCCCC',
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
