/**
 * Screenshot Preview Component
 * 
 * Shows attached screenshot with option to remove
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenshotImage } from '@/hooks/useScreenshotAnalysis';

interface ScreenshotPreviewProps {
  image: ScreenshotImage;
  onRemove: () => void;
}

export default function ScreenshotPreview({ image, onRemove }: ScreenshotPreviewProps) {
  const fileSizeKB = Math.round(image.fileSize / 1024);
  const fileSizeMB = (image.fileSize / (1024 * 1024)).toFixed(1);
  const displaySize = fileSizeKB > 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>📎 Screenshot attached</Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>× Remove</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewCard}>
        <Image
          source={{ uri: image.uri }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.info}>
          <Text style={styles.fileName} numberOfLines={1}>
            {image.fileName}
          </Text>
          <Text style={styles.fileSize}>{displaySize}</Text>
          {image.width && image.height && (
            <Text style={styles.dimensions}>
              {image.width} × {image.height}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeText: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '600',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  dimensions: {
    fontSize: 11,
    color: '#adb5bd',
  },
});
