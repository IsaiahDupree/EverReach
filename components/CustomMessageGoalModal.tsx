import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Mic, Image as ImageIcon, MessageSquare, Sparkles } from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';

interface CustomMessageGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (customGoal: string, source: 'text' | 'voice' | 'screenshot') => void;
  initialGoal?: string;
  contactName?: string;
}

export default function CustomMessageGoalModal({
  visible,
  onClose,
  onConfirm,
  initialGoal = '',
  contactName = 'contact',
}: CustomMessageGoalModalProps) {
  const { theme } = useAppSettings();
  const [goalText, setGoalText] = useState(initialGoal);
  const [selectedSource, setSelectedSource] = useState<'text' | 'voice' | 'screenshot'>('text');

  const handleConfirm = () => {
    if (!goalText.trim()) {
      return;
    }
    onConfirm(goalText.trim(), selectedSource);
    handleClose();
  };

  const handleClose = () => {
    setGoalText('');
    setSelectedSource('text');
    onClose();
  };

  const exampleGoals = [
    'Ask about their upcoming project deadline',
    'Follow up on our last conversation',
    'Inquire about their budget for Q1',
    'Schedule a coffee meeting',
    'Thank them for the referral',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkles size={24} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Custom Message Goal
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Description */}
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              Describe what you want to communicate to {contactName}. The AI will generate a message tailored to your specific goal.
            </Text>

            {/* Input Method Selection */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              Input Method
            </Text>
            <View style={styles.sourceButtons}>
              <TouchableOpacity
                style={[
                  styles.sourceButton,
                  { borderColor: theme.colors.border },
                  selectedSource === 'text' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
                onPress={() => setSelectedSource('text')}
              >
                <MessageSquare
                  size={20}
                  color={selectedSource === 'text' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.sourceButtonText,
                    { color: selectedSource === 'text' ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  Type
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sourceButton,
                  { borderColor: theme.colors.border },
                  selectedSource === 'voice' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
                onPress={() => setSelectedSource('voice')}
              >
                <Mic
                  size={20}
                  color={selectedSource === 'voice' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.sourceButtonText,
                    { color: selectedSource === 'voice' ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  Voice
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sourceButton,
                  { borderColor: theme.colors.border },
                  selectedSource === 'screenshot' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
                onPress={() => setSelectedSource('screenshot')}
              >
                <ImageIcon
                  size={20}
                  color={selectedSource === 'screenshot' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.sourceButtonText,
                    { color: selectedSource === 'screenshot' ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  Screenshot
                </Text>
              </TouchableOpacity>
            </View>

            {/* Text Input */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              Your Goal
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              placeholder="E.g., Ask if they're interested in partnering on a new project..."
              placeholderTextColor={theme.colors.textSecondary}
              value={goalText}
              onChangeText={setGoalText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
              {goalText.length}/500 characters
            </Text>

            {/* Example Goals */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              Example Goals
            </Text>
            <View style={styles.examplesContainer}>
              {exampleGoals.map((example, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.exampleChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => setGoalText(example)}
                >
                  <Text style={[styles.exampleText, { color: theme.colors.text }]}>
                    {example}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: theme.colors.primary },
                !goalText.trim() && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!goalText.trim()}
            >
              <Sparkles size={18} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Generate Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area for iOS
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sourceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  sourceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 24,
  },
  examplesContainer: {
    gap: 8,
  },
  exampleChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  exampleText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
