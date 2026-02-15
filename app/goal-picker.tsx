import React, { useMemo, useState } from 'react';
import { View, Alert, Platform, StyleSheet, KeyboardAvoidingView, Keyboard, PanResponder, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoalPickerScreen from '@/components/GoalPicker/GoalPickerScreen';
import { usePeople } from '@/providers/PeopleProvider';
import type { ContactContext } from '@/components/GoalPicker/types';
import { FLAGS } from '@/constants/flags';
import { useTheme } from '@/providers/ThemeProvider';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';
import { X } from 'lucide-react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { MediaRepo } from '@/repos/MediaRepo';
import { apiFetch } from '@/lib/api';

export default function GoalPickerRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { people } = usePeople();
  const [isProcessingScreenshot, setIsProcessingScreenshot] = useState(false);
  const { theme } = useTheme();
  const { isPaid } = useSubscription();
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('GoalPicker');
  
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 50) {
        Keyboard.dismiss();
      }
    },
  });
  
  const personId = typeof params.personId === 'string' ? params.personId : undefined;
  const channel = typeof params.channel === 'string' ? params.channel : 'sms';
  const suggestionContextParam = typeof params.suggestionContext === 'string' ? params.suggestionContext : undefined;
  
  // Parse the suggestion context if provided
  const suggestionContext = useMemo(() => {
    if (!suggestionContextParam) return null;
    try {
      return JSON.parse(decodeURIComponent(suggestionContextParam));
    } catch (e) {
      console.error('Failed to parse suggestion context:', e);
      return null;
    }
  }, [suggestionContextParam]);

  const ctx: ContactContext = useMemo(() => {
    const p = people.find(pp => pp.id === personId);
    return {
      name: p?.fullName ?? 'new person',
      title: p?.title ?? '—',
      company: p?.company ?? '—',
      lastContactDays: 0,
      lastTopic: undefined,
      interests: ['cool stuff'],
    };
  }, [people, personId]);
  
  // Auto-navigate to message generation if we have suggestion context
  React.useEffect(() => {
    if (suggestionContext && personId) {
      const navParams: Record<string, string> = {
        personId,
        channel,
        goalId: 'custom',
        customGoal: suggestionContext.goal,
        aiSuggestionGoal: suggestionContext.goal,
        aiSuggestionReason: suggestionContext.reason,
        aiSuggestionCategory: suggestionContext.category,
      };
      
      console.log('Auto-navigating to message-results with AI suggestion:', navParams);
      const query = Object.entries(navParams)
        .filter(([, v]) => typeof v === 'string' && v.length > 0)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      
      // Use setTimeout to avoid navigation during render
      setTimeout(() => {
        router.replace(`/message-results?${query}`);
      }, 100);
    }
  }, [suggestionContext, personId, channel, router]);


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerBackVisible: true,
          headerTitle: 'Pick Goal',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingLeft: 16 }}
            >
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <View style={styles.innerContainer} {...panResponder.panHandlers}>
          <GoalPickerScreen
          ctx={ctx}
          personId={personId}
          isProcessingScreenshot={isProcessingScreenshot}
          onGenerate={async (payload) => {
          // Create a default personId if none provided
          const finalPersonId = personId || 'default-person';
          if (payload.mode === 'screenshot') {
            await handleScreenshotGeneration(payload.screenshotUri!, finalPersonId);
            return;
          }
          
          const navParams: Record<string, string> = { personId: finalPersonId, channel };
          
          // If we have suggestion context from AI Goal Suggestions, pass it along
          if (suggestionContext) {
            navParams.aiSuggestionGoal = suggestionContext.goal;
            navParams.aiSuggestionReason = suggestionContext.reason;
            navParams.aiSuggestionCategory = suggestionContext.category;
          }
          
          if (payload.mode === 'suggested') {
            const raw = (payload.goal ?? '').trim();
            const goalMapping: Record<string, string> = {
              'Follow up on our last chat': 'follow_up',
              'Share a quick update': 'check_in',
              'Propose a quick call': 'schedule_meet',
              'Casual check-in': 'check_in',
              'Casual check in': 'check_in',
            };

            const askAboutMatch = /^ask about\s+(.+)$/i.exec(raw);
            if (askAboutMatch && askAboutMatch[1]) {
              navParams.goalId = 'custom';
              navParams.customGoal = `Ask about ${askAboutMatch[1]}`;
            } else {
              const mappedGoalId = goalMapping[raw];
              if (mappedGoalId) {
                navParams.goalId = mappedGoalId;
              } else {
                navParams.goalId = 'custom';
                navParams.customGoal = raw;
              }
            }
            
            // Track suggested goal selection
            screenAnalytics.track('goal_selected', {
              type: 'suggested',
              goal: raw,
              goalId: navParams.goalId,
              contactId: finalPersonId,
              fromAISuggestion: !!suggestionContext,
            });
          } else if (payload.mode === 'custom') {
            navParams.goalId = 'custom';
            navParams.customGoal = payload.goal || '';
            
            // Track custom goal selection
            screenAnalytics.track('goal_selected', {
              type: 'custom',
              goal: payload.goal,
              contactId: finalPersonId,
            });
          }
          
          console.log('Navigating to message-results with params:', navParams);
          const query = Object.entries(navParams)
            .filter(([, v]) => typeof v === 'string' && v.length > 0)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
          Keyboard.dismiss();
          router.push(`/message-results?${query}`);
        }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  async function handleScreenshotGeneration(screenshotUri: string, finalPersonId: string) {
    try {
      setIsProcessingScreenshot(true);
      
      if (FLAGS.LOCAL_ONLY) {
        // For local-only mode, we'll create a simple local analysis
        console.log('🏠 Local-only screenshot analysis - using basic context');
        
        // Create a simple local analysis
        const localAnalysis = {
          vision_summary: 'Screenshot uploaded for message context',
          ocr_text: 'Text content from screenshot (local mode)'
        };
        
        // Navigate directly to message results with local screenshot context
        const params: Record<string, string> = {
          personId: finalPersonId,
          channel,
          goalId: 'screenshot_response',
          screenshotContext: localAnalysis.vision_summary,
          screenshotText: localAnalysis.ocr_text
        };
        
        console.log('Navigating to message-results with local screenshot params:', params);
        router.push({
          pathname: '/message-results',
          params,
        });
        return;
      }
      
      // Convert image URI to base64
      let base64Data: string;
      let mimeType = 'image/jpeg';
      
      if (Platform.OS === 'web') {
        // For web, the URI is already a data URL
        if (screenshotUri.startsWith('data:')) {
          const [header, data] = screenshotUri.split(',');
          mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          base64Data = data;
        } else {
          throw new Error('Invalid image format for web');
        }
      } else {
        // For native, convert file URI to base64
        const response = await fetch(screenshotUri);
        const blob = await response.blob();
        const reader = new FileReader();
        
        base64Data = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        mimeType = blob.type || 'image/jpeg';
      }
      
      // Analyze the screenshot via repo
      console.log('🔍 Analyzing screenshot (repo)...');
      const analysisResult = await MediaRepo.analyzeScreenshot({
        base64Data,
        mimeType,
        personId: finalPersonId,
      });
      
      console.log('✅ Screenshot analyzed:', analysisResult);
      
      // Track analysis completion
      screenAnalytics.track('screenshot_analyzed', {
        contactId: finalPersonId,
        has_vision_summary: !!analysisResult.vision_summary,
        has_ocr_text: !!analysisResult.ocr_text,
      });
      
      // Generate message using compose endpoint (same as Screenshot Analysis page)
      const messageGoal = analysisResult.vision_summary || analysisResult.ocr_text || 'Screenshot analysis';
      console.log('[GoalPicker] Calling compose API for contact:', finalPersonId);
      
      const response = await apiFetch(`/api/v1/compose`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          contact_id: finalPersonId,
          goal: messageGoal,
          channel,
          tone: 'casual',
          context: {
            screenshot_analysis: analysisResult.vision_summary,
            ocr_text: analysisResult.ocr_text,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate message');
      }
      
      const data = await response.json();
      console.log('[GoalPicker] Message generated successfully');
      
      // Navigate to message-results with compose response
      router.push({
        pathname: '/message-results',
        params: {
          personId: finalPersonId,
          channel,
          goalId: 'screenshot_response',
          customGoal: messageGoal,
        },
      });
      
    } catch (error) {
      console.error('Screenshot processing failed:', error);
      Alert.alert('Error', 'Failed to process screenshot. Please try again.');
    } finally {
      setIsProcessingScreenshot(false);
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
