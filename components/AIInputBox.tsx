import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Mic, Camera, Sparkles } from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import * as Haptics from 'expo-haptics';

export interface AIInputBoxProps {
  placeholder?: string;
  value: string;
  onValueChange: (text: string) => void;
  onVoicePress?: () => void;
  onScreenshotPress?: () => void;
  showVoice?: boolean;
  showScreenshot?: boolean;
  showExamples?: boolean;
  examples?: string[];
  autoFocus?: boolean;
  maxLength?: number;
  prefilled?: {
    source: 'voice' | 'screenshot' | 'chat';
    content: string;
    highlight?: boolean;
  };
}

export default function AIInputBox({
  placeholder = "What would you like to say?",
  value,
  onValueChange,
  onVoicePress,
  onScreenshotPress,
  showVoice = true,
  showScreenshot = true,
  showExamples = true,
  examples = [
    "Follow up on our last conversation",
    "Ask about their project timeline",
    "Schedule a coffee meeting",
  ],
  autoFocus = false,
  maxLength = 500,
  prefilled,
}: AIInputBoxProps) {
  const { theme } = useAppSettings();
  const inputRef = useRef<TextInput>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [showSourceBadge, setShowSourceBadge] = useState(!!prefilled?.highlight);

  // Glow animation for pre-filled content
  useEffect(() => {
    if (prefilled?.highlight) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ]),
        { iterations: 3 } // Pulse 3 times then stop
      ).start(() => {
        // Hide source badge after animation
        setTimeout(() => setShowSourceBadge(false), 2000);
      });

      // Auto-focus after a brief delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 1500);
    }
  }, [prefilled, glowAnim]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.primary],
  });

  const backgroundColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', 'rgba(59,130,246,0.05)'],
  });

  const getSourceIcon = () => {
    if (!prefilled) return null;
    switch (prefilled.source) {
      case 'voice':
        return <Mic size={14} color={theme.colors.primary} />;
      case 'screenshot':
        return <Camera size={14} color={theme.colors.primary} />;
      case 'chat':
        return <Sparkles size={14} color={theme.colors.primary} />;
    }
  };

  const getSourceLabel = () => {
    if (!prefilled) return '';
    switch (prefilled.source) {
      case 'voice':
        return 'From Voice Note';
      case 'screenshot':
        return 'From Screenshot';
      case 'chat':
        return 'From AI Chat';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Sparkles size={20} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          AI-Powered Goal Input
        </Text>
      </View>

      {/* Source Badge (when pre-filled) */}
      {showSourceBadge && prefilled && (
        <View style={[styles.sourceBadge, { backgroundColor: theme.colors.surface }]}>
          {getSourceIcon()}
          <Text style={[styles.sourceBadgeText, { color: theme.colors.primary }]}>
            {getSourceLabel()} ↓
          </Text>
        </View>
      )}

      {/* Input Box */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: prefilled?.highlight ? borderColor : theme.colors.border,
            backgroundColor: prefilled?.highlight ? backgroundColor : theme.colors.surface,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={value}
          onChangeText={onValueChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={maxLength}
          autoFocus={autoFocus && !prefilled?.highlight}
        />
        <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
          {value.length}/{maxLength}
        </Text>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {showVoice && onVoicePress && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={onVoicePress}
            activeOpacity={0.8}
          >
            <Mic size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Voice</Text>
          </TouchableOpacity>
        )}
        
        {showScreenshot && onScreenshotPress && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EC4899' }]}
            onPress={onScreenshotPress}
            activeOpacity={0.8}
          >
            <Camera size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Screenshot</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Examples */}
      {showExamples && examples.length > 0 && !value && (
        <View style={styles.examplesContainer}>
          <Text style={[styles.examplesLabel, { color: theme.colors.textSecondary }]}>
            💡 Examples:
          </Text>
          {examples.map((example, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.exampleChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => onValueChange(example)}
            >
              <Text style={[styles.exampleText, { color: theme.colors.text }]}>
                {example}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Helper Text */}
      {value && !prefilled?.highlight && (
        <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
          ✏️ Edit your goal or tap below to proceed
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  sourceBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  input: {
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  examplesContainer: {
    gap: 8,
  },
  examplesLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  exampleChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  exampleText: {
    fontSize: 14,
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
