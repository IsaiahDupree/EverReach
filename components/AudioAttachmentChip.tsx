import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

type Props = {
  onRecordingComplete?: (uri: string, duration: number) => void;
  onTranscriptReady?: (text: string) => void;
  disabled?: boolean;
};

export function AudioAttachmentChip({ 
  onRecordingComplete, 
  onTranscriptReady,
  disabled = false 
}: Props) {
  const { 
    state, 
    uri, 
    duration, 
    start, 
    stop, 
    reset,
    isRecording,
    hasRecording,
    permissionGranted 
  } = useAudioRecorder();

  const handlePress = async () => {
    if (disabled) return;
    
    if (isRecording) {
      await stop();
    } else if (hasRecording) {
      // Reset to record again
      reset();
    } else {
      await start();
    }
  };

  const handleUseRecording = () => {
    if (uri && onRecordingComplete) {
      onRecordingComplete(uri, duration);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonText = () => {
    if (state === 'permission-denied') return '⚠️ Permission denied';
    if (isRecording) return `⏺ Recording... ${formatDuration(duration)}`;
    if (hasRecording) return '✅ Recording ready';
    return '🎤 Add voice note';
  };

  const getButtonStyle = () => {
    if (disabled || state === 'permission-denied') return [styles.chip, styles.chipDisabled];
    if (isRecording) return [styles.chip, styles.chipRecording];
    if (hasRecording) return [styles.chip, styles.chipReady];
    return styles.chip;
  };

  return (
    <View style={styles.container}>
      <Pressable 
        style={getButtonStyle()} 
        onPress={handlePress}
        disabled={disabled || state === 'permission-denied' || !permissionGranted}
      >
        <Text style={styles.chipText}>{getButtonText()}</Text>
      </Pressable>
      
      {hasRecording && (
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={handleUseRecording}>
            <Text style={styles.actionText}>Use Recording</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => onTranscriptReady?.('Transcript placeholder')}>
            <Text style={styles.actionText}>Transcribe</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={reset}>
            <Text style={styles.actionText}>Remove</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
  },
  chipRecording: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  chipReady: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  chipDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});