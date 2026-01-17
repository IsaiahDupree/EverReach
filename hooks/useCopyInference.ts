import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { analytics } from '@/utils/analytics';
import { trpc } from '@/lib/trpc';

interface UseCopyInferenceProps {
  onSentInferred: (messageId: string) => void;
}

export function useCopyInference({ onSentInferred }: UseCopyInferenceProps) {
  const lastCopyTs = useRef<number | undefined>(undefined);
  const lastMessageId = useRef<string | undefined>(undefined);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const trackEvent = trpc.messages.trackEvent.useMutation();

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App came back to foreground
      console.log('App returned to foreground');
    } else if (
      appStateRef.current === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      // App went to background
      if (lastCopyTs.current && lastMessageId.current) {
        const deltaMs = Date.now() - lastCopyTs.current;
        
        // If copy happened within last 10 seconds, infer it was sent
        if (deltaMs < 10000) {
          console.log('Inferring message was sent (app backgrounded after copy)');
          trackEvent.mutate({
            name: 'app_backgrounded_after_copy',
            properties: {
              delta_ms: deltaMs,
              message_id: lastMessageId.current
            }
          });
          
          analytics.trackAppBackgroundedAfterCopy({
            deltaMs,
            messageId: lastMessageId.current
          });
          onSentInferred(lastMessageId.current);
        }
      }
    }
    
    appStateRef.current = nextAppState;
  }, [onSentInferred, trackEvent]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  const copyMessage = useCallback(async (text: string, messageId: string, variantIndex: number, goalId: string, channel: string) => {
    try {
      await Clipboard.setStringAsync(text);
      lastCopyTs.current = Date.now();
      lastMessageId.current = messageId;
      
      // Track via tRPC
      trackEvent.mutate({
        name: 'message_copied',
        properties: {
          variant_index: variantIndex,
          text_length: text.length,
          edited: false,
          message_id: messageId,
          goal_id: goalId,
          channel
        }
      });
      
      // Track via analytics utility
      analytics.trackMessageCopied({
        variantIndex,
        textLength: text.length,
        edited: false,
        messageId,
        goalId,
        channel
      });
      
      console.log('Message copied to clipboard');
      return true;
    } catch (error) {
      console.error('Failed to copy message:', error);
      return false;
    }
  }, [trackEvent]);

  const markAsSent = useCallback((messageId: string, goalId: string, contactId: string) => {
    // Track via tRPC
    trackEvent.mutate({
      name: 'message_outcome_recorded',
      properties: {
        message_id: messageId,
        outcome: 'sent_confirmed',
        goal_id: goalId,
        contact_id: contactId
      }
    });
    
    // Track via analytics utility
    analytics.trackMessageOutcome({
      messageId,
      outcome: 'sent_confirmed',
      goalId,
      contactId
    });
    console.log('Message marked as sent');
  }, [trackEvent]);

  return {
    copyMessage,
    markAsSent
  };
}