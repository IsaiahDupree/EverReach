/**
 * HelpOverlay Component
 * Feature: HO-HELP-001
 *
 * A reusable modal overlay component for first-time feature help.
 * Features:
 * - Full-screen modal overlay
 * - Dismissible with button or backdrop tap
 * - AsyncStorage persistence for dismissal state
 * - Customizable content
 *
 * @module components/common/HelpOverlay
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * HelpOverlay component props
 */
export interface HelpOverlayProps {
  /**
   * Unique ID for this overlay (used for persistence)
   */
  id: string;

  /**
   * Title of the help overlay
   */
  title: string;

  /**
   * Content text (optional if using children)
   */
  content?: string;

  /**
   * Custom content component (alternative to content prop)
   */
  children?: React.ReactNode;

  /**
   * Text for the dismiss button
   * @default 'Dismiss'
   */
  dismissText?: string;

  /**
   * Callback when overlay is dismissed
   */
  onDismiss?: () => void;

  /**
   * Custom styles for the overlay content
   */
  style?: ViewStyle;
}

/**
 * AsyncStorage key prefix for help overlay dismissal
 */
const STORAGE_KEY_PREFIX = 'help_overlay_dismissed_';

/**
 * HelpOverlay Component
 *
 * Displays a full-screen modal overlay with helpful information for first-time
 * feature use. Remembers dismissal state across app sessions.
 *
 * @example
 * ```tsx
 * <HelpOverlay
 *   id="voice-notes-help"
 *   title="Voice Notes"
 *   content="Record and transcribe voice notes easily"
 *   dismissText="Got it"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <HelpOverlay
 *   id="ai-chat-help"
 *   title="AI Chat Assistant"
 * >
 *   <Text>Custom help content with formatting</Text>
 * </HelpOverlay>
 * ```
 */
export default function HelpOverlay({
  id,
  title,
  content,
  children,
  dismissText = 'Dismiss',
  onDismiss,
  style,
}: HelpOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load dismissal state from AsyncStorage on mount
   */
  useEffect(() => {
    loadDismissalState();
  }, [id]);

  /**
   * Check if overlay has been dismissed before
   */
  const loadDismissalState = async () => {
    try {
      const dismissed = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
      setIsVisible(dismissed !== 'true');
    } catch (error) {
      console.error('Failed to load help overlay dismissal state:', error);
      setIsVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle overlay dismissal
   */
  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, 'true');
      setIsVisible(false);
      onDismiss?.();
    } catch (error) {
      console.error('Failed to save help overlay dismissal state:', error);
    }
  };

  // Don't render while loading or if dismissed
  if (isLoading || !isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      testID="help-overlay-modal"
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleDismiss}
        testID="help-overlay-backdrop"
      >
        <Pressable
          style={[styles.container, style]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.content}>
              {content && <Text style={styles.contentText}>{content}</Text>}
              {children}
            </View>

            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.dismissButton}
              testID="help-overlay-dismiss"
              accessibilityLabel={dismissText}
              accessibilityRole="button"
            >
              <Text style={styles.dismissButtonText}>{dismissText}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  content: {
    marginBottom: 24,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
    textAlign: 'center',
  },
  dismissButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
