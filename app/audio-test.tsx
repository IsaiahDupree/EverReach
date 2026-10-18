import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AudioAttachmentChip } from '@/components/AudioAttachmentChip';
import VoiceRecorder from '@/components/VoiceRecorder';

export default function AudioTestScreen() {
  const handleRecordingComplete = (uri: string, duration: number) => {
    console.log('Recording completed:', { uri, duration });
    Alert.alert('Recording Complete', `Duration: ${duration}s\nURI: ${uri}`);
  };

  const handleTranscriptReady = (text: string) => {
    console.log('Transcript ready:', text);
    Alert.alert('Transcript Ready', text);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Audio Recording Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Simple Audio Chip</Text>
          <AudioAttachmentChip
            onRecordingComplete={handleRecordingComplete}
            onTranscriptReady={handleTranscriptReady}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Voice Recorder</Text>
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onTranscriptReady={handleTranscriptReady}
            personId="test-person"
            contextScope="about_person"
            maxDuration={60} // 1 minute for testing
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
});