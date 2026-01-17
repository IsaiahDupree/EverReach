import React, { useMemo, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContextBubble from './ContextBubble';
import SuggestedGoalsCarousel from './SuggestedGoalsCarousel';
import { CustomGoalBubble, ScreenshotResponseBubble } from './CustomAndScreenshot';
import { OrDivider, SectionTitle, Bubble } from './ui';
import { deriveSuggestedGoals, exampleContext, type ChosenMode, type ContactContext } from './types';

export default function GoalPickerScreen({
  ctx = exampleContext,
  personId,
  onGenerate,
  isProcessingScreenshot = false,
}: {
  ctx?: ContactContext;
  personId?: string;
  onGenerate?: (payload: { mode: ChosenMode; goal?: string; screenshotUri?: string }) => void;
  isProcessingScreenshot?: boolean;
}) {
  const suggestions = useMemo(() => deriveSuggestedGoals(ctx), [ctx]);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<ChosenMode>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState<string>('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  const canGenerate =
    (mode === 'suggested' && !!selectedGoal) ||
    (mode === 'custom' && customGoal.trim().length > 0) ||
    (mode === 'screenshot' && !!screenshotUri);

  const handleGenerate = () => {
    if (!canGenerate) return;
    const payload =
      mode === 'suggested'
        ? { mode, goal: selectedGoal as string }
        : mode === 'custom'
        ? { mode, goal: customGoal.trim() }
        : { mode, screenshotUri: screenshotUri as string };
    onGenerate?.(payload);
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} 
        testID="goalPickerScreen"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEnabled={true}
      >
          <SectionTitle><Text>Pick or Create Goal</Text></SectionTitle>
          <Text style={styles.step}>Step 1 of 4 • What&apos;s your goal for reaching out?</Text>

          <ContextBubble ctx={ctx} personId={personId} />

          <OrDivider />
          <SuggestedGoalsCarousel
            suggestions={suggestions}
            selected={mode === 'suggested' ? selectedGoal : null}
            onSelect={(g) => {
              setMode('suggested');
              setSelectedGoal(g);
            }}
            contactName={ctx.name}
          />

          <OrDivider />
          <CustomGoalBubble
            value={customGoal}
            onFocusSelect={() => {
              setMode('custom');
              // Scroll to custom goal section when focused
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 400, animated: true });
              }, 100);
            }}
            onChange={(t) => {
              setMode('custom');
              setCustomGoal(t);
            }}
          />

          <OrDivider />
          <ScreenshotResponseBubble
            imageUri={screenshotUri}
            onPick={(uri) => setScreenshotUri(uri)}
            onModeSelect={() => setMode('screenshot')}
            isProcessing={isProcessingScreenshot}
          />

          <View style={styles.contentBottomSpacer} />
        </ScrollView>
      
      {/* Fixed Generate Button at Bottom */}
      <View style={[styles.fixedButtonContainer, { paddingBottom: insets.bottom }]}>
        <Bubble>
          <Pressable
            disabled={!canGenerate}
            onPress={handleGenerate}
            style={[styles.cta, !canGenerate ? styles.ctaDisabled : null]}
            accessibilityRole="button"
            testID="generateButton"
          >
            <Text style={styles.ctaText}>Generate Message</Text>
          </Pressable>
        </Bubble>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 0,
  },
  step: { 
    color: '#616776', 
    marginBottom: 16 
  },
  contentBottomSpacer: { 
    height: 20 
  },
  fixedButtonContainer: {
    backgroundColor: '#F6F7FB',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  cta: {
    backgroundColor: '#0f62fe',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaDisabled: { 
    backgroundColor: '#c7cfec' 
  },
  ctaText: { 
    color: '#fff', 
    fontWeight: '700' as const, 
    fontSize: 16 
  },
});