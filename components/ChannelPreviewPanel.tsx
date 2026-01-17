'use client';
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import type { Channel } from '@/lib/channelPreview';

interface ChannelPreviewPanelProps {
  channel: Channel;
  setChannel: (c: Channel) => void;
  preview: any;
  meta?: any;
  emailSubject?: string;
  setEmailSubject?: (s: string) => void;
}

export function ChannelPreviewPanel({
  channel, setChannel,
  preview, meta, emailSubject, setEmailSubject,
}: ChannelPreviewPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Channel preview</Text>
        <View style={styles.channelButtons}>
          {(['sms','email','dm'] as const).map(ch=>(
            <TouchableOpacity 
              key={ch}
              onPress={()=>setChannel(ch)}
              style={[
                styles.channelButton,
                channel === ch && styles.channelButtonSelected
              ]}
            >
              <Text style={[
                styles.channelButtonText,
                channel === ch && styles.channelButtonTextSelected
              ]}>
                {ch.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {channel === 'email' && (
        <View style={styles.subjectContainer}>
          <Text style={styles.subjectLabel}>Subject</Text>
          <TextInput
            style={styles.subjectInput}
            value={emailSubject ?? ''}
            onChangeText={setEmailSubject}
            placeholder="Subject line"
          />
        </View>
      )}

      <View style={styles.previewContainer}>
        <Text style={styles.previewText}>
          {channel === 'email' ? preview : preview || 'Your preview will appear here.'}
        </Text>
      </View>

      {channel === 'sms' && (
        <Text style={styles.smsInfo}>
          {meta?.len ?? 0} chars • ~{meta?.segments ?? 0} segment{meta?.segments===1?'':'s'} • {meta?.encoding || 'GSM-7'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  channelButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  channelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  channelButtonSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  channelButtonText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
  },
  channelButtonTextSelected: {
    color: '#FFFFFF',
  },
  subjectContainer: {
    marginBottom: 8,
  },
  subjectLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
  },
  subjectInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  previewContainer: {
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    padding: 12,
  },
  previewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  smsInfo: {
    marginTop: 8,
    fontSize: 11,
    color: '#666666',
  },
});