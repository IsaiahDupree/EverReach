import React, { useState } from 'react';
import { View, Text, Pressable, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
// Using legacy import for expo-file-system (SDK 54+ deprecated many methods)
import * as FileSystem from 'expo-file-system/legacy';
// import { trpc } from '@/lib/trpc';

type MediaAsset = {
  id: string;
  kind: 'screenshot' | 'profile' | 'photo' | 'document' | 'other';
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  public_url: string;
  ocr_text?: string;
  vision_summary?: string;
  labels: string[];
  created_at: string;
};

type ImageAttachmentChipProps = {
  personId?: string;
  goalId?: string;
  messageId?: string;
  onInsertNotes?: (text: string) => void;
  onGenerateFromImage?: (text: string) => void;
};

export function ImageAttachmentChip({
  personId,
  goalId,
  messageId,
  onInsertNotes,
  onGenerateFromImage
}: ImageAttachmentChipProps) {
  const [status, setStatus] = useState<'idle' | 'picked' | 'uploading' | 'analyzing' | 'ready' | 'error'>('idle');
  const [asset, setAsset] = useState<MediaAsset | null>(null);

  // const uploadMutation = trpc.media.upload.useMutation();
  // const analyzeMutation = trpc.media.analyze.useMutation();

  const pickImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      });

      if (result.canceled) return;

      const imageAsset = result.assets[0];
      setStatus('uploading');

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageAsset.uri);
      if (!fileInfo.exists) {
        throw new Error('Selected file does not exist');
      }

      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(imageAsset.uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Placeholder - tRPC disabled
      setStatus('error');
      throw new Error('tRPC is temporarily disabled');

    } catch (error) {
      console.error('Image upload failed:', error);
      setStatus('error');
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    }
  };

  const handleInsertNotes = () => {
    if (!asset) return;
    const text = [asset.vision_summary, asset.ocr_text]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 1000);
    onInsertNotes?.(text);
  };

  const handleGenerateFromImage = () => {
    if (!asset) return;
    const text = asset.ocr_text || asset.vision_summary || '';
    onGenerateFromImage?.(text);
  };

  const reset = () => {
    setAsset(null);
    setStatus('idle');
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading': return '⬆️ Uploading...';
      case 'analyzing': return '🔍 Analyzing...';
      case 'ready': return '✅ Image ready';
      case 'error': return '⚠️ Failed';
      default: return '🖼️ Add image';
    }
  };

  const isLoading = status === 'uploading' || status === 'analyzing';

  return (
    <View style={{
      borderWidth: 1,
      borderColor: '#e5e5e5',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start',
      backgroundColor: '#fff'
    }}>
      {status === 'idle' && (
        <Pressable onPress={pickImage} disabled={isLoading}>
          <Text style={{ fontSize: 14, color: '#374151' }}>
            {getStatusText()}
          </Text>
        </Pressable>
      )}

      {isLoading && (
        <Text style={{ fontSize: 14, color: '#6b7280' }}>
          {getStatusText()}
        </Text>
      )}

      {status === 'ready' && asset && (
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 8,
          flexWrap: 'wrap'
        }}>
          {asset.public_url ? (
            <Image 
              source={{ uri: asset.public_url }} 
              style={{ 
                width: 24, 
                height: 24, 
                borderRadius: 4 
              }} 
            />
          ) : (
            <View 
              style={{ 
                width: 24, 
                height: 24, 
                borderRadius: 4,
                backgroundColor: '#f3f4f6',
                justifyContent: 'center',
                alignItems: 'center'
              }} 
            >
              <Text style={{ fontSize: 12 }}>🖼️</Text>
            </View>
          )}
          <Text 
            numberOfLines={1} 
            style={{ 
              maxWidth: 120, 
              fontSize: 14, 
              color: '#374151' 
            }}
          >
            {getStatusText()}
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {onInsertNotes && (
              <Pressable 
                onPress={handleInsertNotes}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 12
                }}
              >
                <Text style={{ fontSize: 12, color: '#374151' }}>
                  Insert Notes
                </Text>
              </Pressable>
            )}
            
            {onGenerateFromImage && (
              <Pressable 
                onPress={handleGenerateFromImage}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 12
                }}
              >
                <Text style={{ fontSize: 12, color: '#374151' }}>
                  Generate 3
                </Text>
              </Pressable>
            )}
            
            <Pressable 
              onPress={reset}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: '#fef2f2',
                borderRadius: 12
              }}
            >
              <Text style={{ fontSize: 12, color: '#dc2626' }}>
                Remove
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {status === 'error' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, color: '#dc2626' }}>
            {getStatusText()}
          </Text>
          <Pressable 
            onPress={reset}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: '#f3f4f6',
              borderRadius: 12
            }}
          >
            <Text style={{ fontSize: 12, color: '#374151' }}>
              Try again
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}