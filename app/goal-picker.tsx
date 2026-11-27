import React, { useMemo, useState } from 'react';
import { View, Alert, Platform, StyleSheet, KeyboardAvoidingView, Keyboard, PanResponder } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GoalPickerScreen from '@/components/GoalPicker/GoalPickerScreen';
import { usePeople } from '@/providers/PeopleProvider';
import type { ContactContext } from '@/components/GoalPicker/types';
import { trpc } from '@/lib/trpc';
import { FLAGS } from '@/constants/flags';

export default function GoalPickerRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { people } = usePeople();
  const [isProcessingScreenshot, setIsProcessingScreenshot] = useState(false);
  
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
  
  const uploadMediaMutation = trpc.media.upload.useMutation();
  const analyzeMediaMutation = trpc.media.analyze.useMutation();

  const personId = typeof params.personId === 'string' ? params.personId : undefined;
  const channel = typeof params.channel === 'string' ? params.channel : 'sms';

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Pick Goal' }} />
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
          
          const params: Record<string, string> = { personId: finalPersonId, channel };
          
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
              params.goalId = 'custom';
              params.customGoal = `Ask about ${askAboutMatch[1]}`;
            } else {
              const mappedGoalId = goalMapping[raw];
              if (mappedGoalId) {
                params.goalId = mappedGoalId;
              } else {
                params.goalId = 'custom';
                params.customGoal = raw;
              }
            }
          } else if (payload.mode === 'custom') {
            params.goalId = 'custom';
            params.customGoal = payload.goal || '';
          }
          
          console.log('Navigating to message-results with params:', params);
          router.push({
            pathname: '/message-results',
            params,
          });
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
      
      // Upload the screenshot
      console.log('📤 Uploading screenshot...');
      const uploadResult = await uploadMediaMutation.mutateAsync({
        fileName: `screenshot-${Date.now()}.jpg`,
        mimeType,
        fileSize: base64Data.length * 0.75, // Approximate file size from base64
        base64Data,
        personId: finalPersonId,
        kind: 'screenshot'
      });
      
      console.log('✅ Screenshot uploaded:', uploadResult.id);
      
      // Analyze the screenshot
      console.log('🔍 Analyzing screenshot...');
      const analysisResult = await analyzeMediaMutation.mutateAsync({
        assetId: uploadResult.id
      });
      
      console.log('✅ Screenshot analyzed:', analysisResult);
      
      // Navigate to message results with screenshot context
      const params: Record<string, string> = {
        personId: finalPersonId,
        channel,
        goalId: 'screenshot_response',
        screenshotAssetId: uploadResult.id,
        screenshotContext: analysisResult.vision_summary || 'Screenshot uploaded',
        screenshotText: analysisResult.ocr_text || ''
      };
      
      console.log('Navigating to message-results with screenshot params:', params);
      router.push({
        pathname: '/message-results',
        params,
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
    backgroundColor: '#F6F7FB',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
});
