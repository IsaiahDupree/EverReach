import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import * as DocumentPicker from 'expo-document-picker';
import { Mic, Image as ImageIcon, Paperclip, X } from 'lucide-react-native';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useScreenshotAnalysis } from '@/hooks/useScreenshotAnalysis';
import VoiceMicButton from '@/components/VoiceMicButton';

export type Attachment = { uri: string; name: string; mimeType?: string; size?: number };

interface Props {
  visible: boolean;
  title: string;
  text: string;
  setText: (v: string) => void;
  attachments: Attachment[];
  onPickAttachment: (att: Attachment) => void;
  onRemoveAttachment: (index: number) => void;
  onSave: () => void;
  onClose: () => void;
  onPressVoice: () => void;
  onPressScreenshot: () => void;
  saving?: boolean;
  recordingUri: string | null;
  setRecordingUri: (uri: string | null) => void;
}

export default function NotesComposerModal(props: Props) {
  const {
    visible,
    title,
    text,
    setText,
    attachments,
    onPickAttachment,
    onRemoveAttachment,
    onSave,
    onClose,
    onPressVoice,
    onPressScreenshot,
    saving,
    recordingUri,
    setRecordingUri,
  } = props;

  const {
    isRecording,
    hasRecording,
    start: startRecording,
    stop: stopRecording,
    duration,
    reset: resetRecording,
  } = useAudioRecorder();

  const { image, showImagePicker, analyzeScreenshot, removeImage, analyzing } = useScreenshotAnalysis();

  const handlePickAttachment = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;
      onPickAttachment({
        uri: asset.uri,
        name: asset.name || 'attachment',
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      });
    } catch (e) {
      // Silent; provider handles user messaging
      console.warn('[NotesComposerModal] attachment pick failed', e);
    }
  };

  const handleMicPress = async () => {
    try {
      if (isRecording) {
        const uri = await stopRecording();
        if (uri) setRecordingUri(uri);
        return;
      }
      await startRecording();
    } catch (e) {
      Alert.alert('Recording error', 'Unable to access microphone.');
    }
  };

  const handleScreenshotPress = async () => {
    try {
      await showImagePicker();
      const result = await analyzeScreenshot('notes_composer');
      if (result) {
        // Inject analysis into text
        const injected = `${text ? text + '\n\n' : ''}Summary:\n${result.vision_summary || '(none)'}\n\nOCR:\n${result.ocr_text || '(none)'}\n`;
        setText(injected);
        // If we have image metadata, add as attachment for upload on save
        if (image) {
          onPickAttachment({ uri: image.uri, name: image.fileName, mimeType: image.mimeType, size: image.fileSize });
        }
      }
    } catch (e) {
      Alert.alert('Screenshot error', 'Failed to analyze screenshot.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={onSave}
              disabled={saving || (!text.trim() && attachments.length === 0 && !recordingUri)}
              style={[styles.saveBtn, (saving || (!text.trim() && attachments.length === 0 && !recordingUri)) && styles.saveBtnDisabled]}
            >
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>

          {/* Text Input */}
          <View style={styles.inputWrap}>
            <CrossPlatformTextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Write your detailed note here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={12}
              textAlignVertical="top"
              autoFocus
            />
          </View>

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsRow}>
              {attachments.map((att, idx) => (
                <View key={`${att.uri}-${idx}`} style={styles.attachmentChip}>
                  {att.mimeType?.startsWith('image') ? (
                    <Image source={{ uri: att.uri }} style={styles.thumbnail} />
                  ) : (
                    <Paperclip size={14} color="#374151" />
                  )}
                  <Text numberOfLines={1} style={styles.attachmentName}>{att.name}</Text>
                  <TouchableOpacity onPress={() => onRemoveAttachment(idx)}>
                    <X size={14} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Footer actions */}
          <View style={styles.footerRow}>
            <View style={styles.actionsLeft}>
              <VoiceMicButton
                size={40}
                onRecordingComplete={(uri, duration) => {
                  setRecordingUri(uri);
                }}
                onTranscriptReady={(transcript) => {
                  // Populate text field with transcript
                  if (transcript.trim()) {
                    setText(text ? `${text}\n\n${transcript}` : transcript);
                  }
                }}
                style={styles.iconBtn}
              />
              <TouchableOpacity style={styles.iconBtn} onPress={handleScreenshotPress} onLongPress={onPressScreenshot}>
                <ImageIcon size={18} color="#666666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handlePickAttachment}>
                <Paperclip size={18} color="#666666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.charCount}>{analyzing ? 'Analyzing… ' : ''}{text.length} characters</Text>
          </View>

          {(isRecording || recordingUri) && (
            <View style={styles.recorderRow}>
              <Text style={styles.recorderText}>
                {isRecording ? `Recording… ${duration}s` : 'Voice note attached'}
              </Text>
              {recordingUri ? (
                <TouchableOpacity onPress={() => { setRecordingUri(null); resetRecording(); }}>
                  <Text style={styles.removeLink}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cancel: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#111827', borderRadius: 8 },
  saveBtnDisabled: { backgroundColor: '#9CA3AF' },
  saveText: { color: '#FFFFFF', fontWeight: '600' },
  inputWrap: { flexGrow: 1 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 16, color: '#111827', minHeight: 200, textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  attachmentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  attachmentChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  thumbnail: { width: 36, height: 36, borderRadius: 6 },
  attachmentName: { fontSize: 12, color: '#374151', fontWeight: '500', maxWidth: 160 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  actionsLeft: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  charCount: { fontSize: 12, color: '#9CA3AF' },
  recorderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  recorderText: { fontSize: 13, color: '#10B981', fontWeight: '500' },
  removeLink: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
});
