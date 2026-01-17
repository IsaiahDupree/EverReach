/**
 * Screenshot Analysis Hook
 * 
 * Handles screenshot upload, analysis, and action execution
 */

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import analytics from '@/lib/analytics';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export interface ScreenshotAnalysisResult {
  id: string;
  ocr_text: string;
  vision_summary: string;
  detected_entities: {
    contacts: Array<{
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      confidence: number;
    }>;
    interactions: Array<{
      type: string;
      date?: string;
      summary: string;
    }>;
    action_items: string[];
  };
  suggested_actions: Array<{
    type: 'create_contact' | 'create_interaction' | 'add_note';
    data: any;
    confidence: number;
  }>;
}

export interface ScreenshotImage {
  uri: string;
  base64?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useScreenshotAnalysis() {
  const [image, setImage] = useState<ScreenshotImage | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ScreenshotAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Request camera/photo library permissions
   */
  const requestPermissions = async (type: 'camera' | 'library'): Promise<boolean> => {
    try {
      let permission;
      
      if (type === 'camera') {
        permission = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          `Please enable ${type === 'camera' ? 'camera' : 'photo library'} access in Settings.`,
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('[useScreenshotAnalysis] Permission error:', err);
      return false;
    }
  };

  /**
   * Pick image from library
   */
  const pickImage = async (): Promise<void> => {
    try {
      const hasPermission = await requestPermissions('library');
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        const imageData: ScreenshotImage = {
          uri: asset.uri,
          base64: asset.base64 || undefined,
          fileName: asset.uri.split('/').pop() || 'screenshot.jpg',
          mimeType: 'image/jpeg',
          fileSize: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
        };

        setImage(imageData);
        setError(null);

        // Track screenshot attached
        analytics.track('screenshot_attached', {
          source: 'library',
          file_size: imageData.fileSize,
          mime_type: imageData.mimeType,
        });
      }
    } catch (err) {
      console.error('[useScreenshotAnalysis] Pick image error:', err);
      setError('Failed to select image');
      analytics.errors.occurred(err as Error, 'useScreenshotAnalysis');
    }
  };

  /**
   * Take photo with camera
   */
  const takePhoto = async (): Promise<void> => {
    try {
      const hasPermission = await requestPermissions('camera');
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        const imageData: ScreenshotImage = {
          uri: asset.uri,
          base64: asset.base64 || undefined,
          fileName: `photo-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
        };

        setImage(imageData);
        setError(null);

        // Track screenshot attached
        analytics.track('screenshot_attached', {
          source: 'camera',
          file_size: imageData.fileSize,
          mime_type: imageData.mimeType,
        });
      }
    } catch (err) {
      console.error('[useScreenshotAnalysis] Take photo error:', err);
      setError('Failed to take photo');
      analytics.errors.occurred(err as Error, 'useScreenshotAnalysis');
    }
  };

  /**
   * Show action sheet to choose image source
   * On web or simulator, skip to photo library directly
   */
  const showImagePicker = async (): Promise<void> => {
    // Web platform - only photo library available
    if (Platform.OS === 'web') {
      await pickImage();
      return;
    }
    
    // Check if camera is available (not available on iOS simulator)
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      const cameraAvailable = status !== 'undetermined' || Platform.OS === 'android';
      
      // If camera not available (likely simulator), go straight to photo library
      if (!cameraAvailable && Platform.OS === 'ios') {
        await pickImage();
        return;
      }
    } catch {
      // On error, just show photo library
      await pickImage();
      return;
    }
    
    // Show options on real device
    Alert.alert(
      'Add Screenshot',
      'Choose a method',
      [
        {
          text: '📷 Take Photo',
          onPress: takePhoto,
        },
        {
          text: '🖼️ Choose from Photos',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  /**
   * Analyze screenshot using correct API flow:
   * 1. Upload image as multipart/form-data
   * 2. Trigger GPT-4 Vision analysis
   */
  const analyzeScreenshot = async (context?: string): Promise<ScreenshotAnalysisResult | null> => {
    if (!image) {
      setError('No image selected');
      return null;
    }

    setAnalyzing(true);
    setError(null);

    const startTime = Date.now();

    try {
      // Step 1: Upload image
      console.log('[useScreenshotAnalysis] Uploading image...');
      
      const formData = new FormData();
      formData.append('file', {
        uri: image.uri,
        type: image.mimeType,
        name: image.fileName,
      } as any);
      
      if (context) {
        formData.append('context', context);
      }

      const uploadResponse = await apiFetch('/api/v1/screenshots', {
        method: 'POST',
        body: formData as any,
        requireAuth: true,
      });

      console.log('[useScreenshotAnalysis] Upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[useScreenshotAnalysis] Upload failed:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('[useScreenshotAnalysis] Upload response:', uploadData);
      
      if (!uploadData.screenshot_id && !uploadData.id) {
        throw new Error('Upload failed - no screenshot ID returned');
      }

      const screenshotId = uploadData.screenshot_id || uploadData.id;

      // Step 2: Trigger analysis
      console.log('[useScreenshotAnalysis] Triggering analysis for:', screenshotId);
      
      const analyzeResponse = await apiFetch(
        `/api/v1/screenshots/${screenshotId}/analyze`,
        {
          method: 'POST',
          requireAuth: true,
        }
      );

      console.log('[useScreenshotAnalysis] Analyze response status:', analyzeResponse.status);

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        console.error('[useScreenshotAnalysis] Analyze failed:', errorText);
        throw new Error(`Failed to trigger analysis: ${analyzeResponse.status} - ${errorText}`);
      }

      const response = await analyzeResponse.json();
      console.log('[useScreenshotAnalysis] Analysis response:', JSON.stringify(response, null, 2));

      // Check if analysis has error
      if (response.error) {
        throw new Error(`Analysis error: ${response.error}`);
      }

      // Backend returns: { screenshot_id, status, analysis: { ocr_text, entities, insights } }
      const analysisData = response.analysis || response;
      const entities = analysisData.entities || {};
      const insights = analysisData.insights || {};

      console.log('[useScreenshotAnalysis] Parsed data:', {
        hasAnalysisObject: !!response.analysis,
        hasOcrText: !!analysisData.ocr_text,
        ocrTextLength: analysisData.ocr_text?.length || 0,
        hasSummary: !!insights.summary,
        summaryLength: insights.summary?.length || 0,
        contactsCount: entities.contacts?.length || 0,
        actionItemsCount: insights.action_items?.length || 0,
      });

      // Normalize response to match ScreenshotAnalysisResult interface
      const normalizedResponse: ScreenshotAnalysisResult = {
        id: screenshotId,
        ocr_text: analysisData.ocr_text || '',
        vision_summary: insights.summary || '',
        detected_entities: {
          contacts: entities.contacts || [],
          interactions: [],
          action_items: insights.action_items || [],
        },
        suggested_actions: (entities.contacts || []).map((contact: any) => {
          // Build helpful default tags
          const defaultTags: string[] = [];
          if (contact.company) defaultTags.push(String(contact.company));
          defaultTags.push('From Screenshot');
          // Optionally include first action item as a tag for context
          if (insights.action_items && insights.action_items.length > 0) {
            const first = String(insights.action_items[0]).slice(0, 40);
            defaultTags.push(first);
          }
          return {
            type: 'create_contact' as const,
            data: { ...contact, tags: defaultTags },
            confidence: contact.confidence || 0.8,
          };
        }),
      };

      setAnalysisResult(normalizedResponse);

      const duration = Date.now() - startTime;

      // Track successful analysis
      analytics.track('Screenshot Analyzed', {
        contacts_found: normalizedResponse.detected_entities.contacts.length,
        action_items_found: normalizedResponse.detected_entities.action_items.length,
        processing_time: duration,
        context,
      });

      return normalizedResponse;
    } catch (err) {
      const duration = Date.now() - startTime;
      
      console.error('[useScreenshotAnalysis] Analysis error:', err);
      
      // Provide more specific error message
      const errorMessage = (err as Error).message || 'Unknown error';
      if (errorMessage.includes('Upload failed')) {
        setError('Failed to upload screenshot. Please try again.');
      } else if (errorMessage.includes('Failed to trigger analysis')) {
        setError('Screenshot uploaded but analysis failed. Please check backend configuration.');
      } else if (errorMessage.includes('Analysis error')) {
        setError(`Analysis error: ${errorMessage.replace('Analysis error: ', '')}`);
      } else {
        setError('Failed to analyze screenshot. Please try again.');
      }
      
      // Track failed analysis
      analytics.track('Screenshot Analysis Failed', {
        error: errorMessage,
        processing_time: duration,
        context,
      });

      analytics.errors.occurred(err as Error, 'useScreenshotAnalysis');
      
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Execute suggested action
   */
  const executeSuggestedAction = async (action: ScreenshotAnalysisResult['suggested_actions'][0]): Promise<boolean> => {
    try {
      // Import router dynamically
      const { router } = await import('expo-router');
      
      switch (action.type) {
        case 'create_contact':
          // Navigate to add-contact page with pre-populated data
          const contactData = action.data;
          const params = new URLSearchParams();
          
          if (contactData.display_name || contactData.fullName) {
            params.append('name', contactData.display_name || contactData.fullName);
          }
          if (contactData.emails && contactData.emails.length > 0) {
            params.append('email', contactData.emails[0]);
          }
          if (contactData.phones && contactData.phones.length > 0) {
            params.append('phone', contactData.phones[0]);
          }
          if (contactData.company) {
            params.append('company', contactData.company);
          }
          if (contactData.notes) {
            params.append('notes', contactData.notes);
          }
          // Pass tags if present
          if (contactData.tags && Array.isArray(contactData.tags) && contactData.tags.length > 0) {
            try {
              params.append('tags', contactData.tags.join(','));
            } catch {}
          }
          
          console.log('[useScreenshotAnalysis] Navigating to add-contact with params:', params.toString());
          router.push(`/add-contact?${params.toString()}`);
          break;
          
        case 'create_interaction':
          // Still handle interactions via API
          await apiFetch('/api/v1/interactions', {
            method: 'POST',
            body: JSON.stringify(action.data),
          });
          break;
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Track action execution
      analytics.track('screenshot_action_taken', {
        action_type: action.type,
        confidence: action.confidence,
      });

      return true;
    } catch (err) {
      console.error('[useScreenshotAnalysis] Execute action error:', err);
      setError(`Failed to ${action.type.replace('_', ' ')}`);
      analytics.errors.occurred(err as Error, 'useScreenshotAnalysis');
      return false;
    }
  };

  /**
   * Remove attached image
   */
  const removeImage = (): void => {
    setImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  /**
   * Reset everything
   */
  const reset = (): void => {
    setImage(null);
    setAnalyzing(false);
    setAnalysisResult(null);
    setError(null);
  };

  return {
    // State
    image,
    analyzing,
    analysisResult,
    error,
    
    // Actions
    showImagePicker,
    pickImage,
    takePhoto,
    analyzeScreenshot,
    executeSuggestedAction,
    removeImage,
    reset,
  };
}
