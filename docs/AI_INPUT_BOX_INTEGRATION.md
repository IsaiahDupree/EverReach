# AIInputBox Integration Guide

## Quick Reference

The `AIInputBox` is a reusable component for AI-powered text/voice/screenshot input across the app.

---

## Usage Example 1: Pick Goal Page (Primary Use Case)

```typescript
// app/pick-goal.tsx

import AIInputBox from '@/components/AIInputBox';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function PickGoalPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [goalText, setGoalText] = useState('');

  // Check if pre-filled from external source
  const prefilled = params.prefillContent ? {
    source: params.prefillSource as 'voice' | 'screenshot' | 'chat',
    content: params.prefillContent as string,
    highlight: params.highlight === 'true',
  } : undefined;

  // Initialize with pre-filled content if available
  useState(() => {
    if (prefilled) {
      setGoalText(prefilled.content);
    }
  }, []);

  return (
    <ScrollView>
      <AIInputBox
        value={goalText}
        onValueChange={setGoalText}
        prefilled={prefilled}
        showVoice={true}
        showScreenshot={true}
        showExamples={true}
        onVoicePress={() => {
          // Navigate to voice recorder
          router.push(`/voice-note?personId=${params.personId}&returnTo=pick-goal`);
        }}
        onScreenshotPress={() => {
          // Navigate to screenshot capture
          router.push(`/screenshot-analysis?personId=${params.personId}&returnTo=pick-goal`);
        }}
      />

      {/* Quick Goals Section */}
      {/* ... */}

      {/* Generate Button */}
      <TouchableOpacity
        disabled={!goalText.trim()}
        onPress={() => {
          router.push({
            pathname: '/message-results',
            params: {
              personId: params.personId,
              goalId: 'custom',
              customGoal: goalText,
            },
          });
        }}
      >
        <Text>Generate Message</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

---

## Usage Example 2: CRM Assistant Chat

```typescript
// components/ChatInterface.tsx

import AIInputBox from '@/components/AIInputBox';

export default function ChatInterface() {
  const [message, setMessage] = useState('');

  return (
    <View style={styles.chatContainer}>
      {/* Chat messages */}
      <ScrollView>
        {messages.map(msg => <MessageBubble key={msg.id} {...msg} />)}
      </ScrollView>

      {/* Input at bottom */}
      <AIInputBox
        value={message}
        onValueChange={setMessage}
        placeholder="Ask me anything about your contacts..."
        showVoice={true}
        showScreenshot={false} // Don't need screenshot in chat
        showExamples={false} // Don't show examples in chat
        onVoicePress={handleVoiceInput}
      />
    </View>
  );
}
```

---

## Usage Example 3: Voice Note → Goal Flow

```typescript
// app/voice-note.tsx

import { router, useLocalSearchParams } from 'expo-router';

export default function VoiceNotePage() {
  const params = useLocalSearchParams();
  
  const handleAfterSave = (transcription: string) => {
    // Show popup
    Alert.alert(
      'Voice Note Saved',
      'Would you like to use this as a message goal?',
      [
        { text: 'Just Save', style: 'cancel' },
        {
          text: 'Create Message',
          onPress: () => {
            router.replace({
              pathname: '/pick-goal',
              params: {
                personId: params.personId,
                prefillSource: 'voice',
                prefillContent: transcription,
                highlight: 'true',
              },
            });
          },
        },
      ]
    );
  };

  return (
    // Voice recording UI
  );
}
```

---

## Usage Example 4: Screenshot → Response Flow

```typescript
// app/screenshot-analysis.tsx

export default function ScreenshotAnalysisPage() {
  const [analysisResult, setAnalysisResult] = useState<ScreenshotAnalysisResult | null>(null);
  
  const handleDraftResponse = () => {
    // Extract response goal from AI analysis
    const responseGoal = analysisResult?.vision_summary || 
                         `Respond to their message`;
    
    router.push({
      pathname: '/pick-goal',
      params: {
        personId: selectedPersonId,
        prefillSource: 'screenshot',
        prefillContent: responseGoal,
        highlight: 'true',
      },
    });
  };

  return (
    <View>
      {analysisResult && (
        <>
          {/* Analysis results */}
          <AnalysisResults result={analysisResult} />

          {/* Draft Response Button */}
          <TouchableOpacity
            style={styles.draftButton}
            onPress={handleDraftResponse}
          >
            <Text>Draft Response</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
```

---

## Auto-Scroll Implementation

When navigating to a page with pre-filled AIInputBox, auto-scroll to it:

```typescript
import { useRef, useEffect } from 'react';
import { ScrollView, findNodeHandle } from 'react-native';

export default function PickGoalPage() {
  const scrollViewRef = useRef<ScrollView>(null);
  const inputBoxRef = useRef<View>(null);
  const params = useLocalSearchParams();

  useEffect(() => {
    // If pre-filled, scroll to input after render
    if (params.highlight === 'true' && params.prefillContent) {
      setTimeout(() => {
        inputBoxRef.current?.measureLayout(
          findNodeHandle(scrollViewRef.current) as number,
          (x, y) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 100), // 100px padding from top
              animated: true,
            });
          },
          () => {} // onFail
        );
      }, 500); // Wait for animation to complete
    }
  }, [params]);

  return (
    <ScrollView ref={scrollViewRef}>
      <View ref={inputBoxRef}>
        <AIInputBox {...props} />
      </View>
    </ScrollView>
  );
}
```

---

## Navigation Helper Functions

Create reusable navigation helpers:

```typescript
// lib/navigationHelpers.ts

import { router } from 'expo-router';

export function navigateToPickGoalWithPrefill(
  contactId: string,
  source: 'voice' | 'screenshot' | 'chat',
  content: string,
  options?: {
    highlight?: boolean;
    autoScroll?: boolean;
  }
) {
  router.push({
    pathname: '/pick-goal',
    params: {
      personId: contactId,
      prefillSource: source,
      prefillContent: content,
      highlight: options?.highlight !== false ? 'true' : 'false',
    },
  });
}

// Usage:
navigateToPickGoalWithPrefill(
  contact.id,
  'voice',
  transcription,
  { highlight: true }
);
```

---

## Styling Customization

Override styles if needed:

```typescript
<AIInputBox
  value={text}
  onValueChange={setText}
  // Custom styling via wrapper
  containerStyle={{ marginHorizontal: 0 }}
  inputStyle={{ minHeight: 60 }}
/>
```

---

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | string | required | Current input value |
| `onValueChange` | function | required | Callback when text changes |
| `placeholder` | string | "What would you like to say?" | Placeholder text |
| `onVoicePress` | function | undefined | Voice button handler |
| `onScreenshotPress` | function | undefined | Screenshot button handler |
| `showVoice` | boolean | true | Show voice button |
| `showScreenshot` | boolean | true | Show screenshot button |
| `showExamples` | boolean | true | Show example chips |
| `examples` | string[] | [...default] | Custom examples |
| `autoFocus` | boolean | false | Auto-focus on mount |
| `maxLength` | number | 500 | Max character count |
| `prefilled` | object | undefined | Pre-fill configuration |

### Prefilled Object

```typescript
{
  source: 'voice' | 'screenshot' | 'chat',
  content: string,
  highlight?: boolean, // Enable glow animation
}
```

---

## Analytics Integration

Track usage of the AIInputBox:

```typescript
import analytics from '@/lib/analytics';

<AIInputBox
  value={text}
  onValueChange={(newText) => {
    setText(newText);
    
    // Track when user starts typing
    if (text.length === 0 && newText.length > 0) {
      analytics.track('ai_input_started', {
        source: prefilled?.source || 'manual',
        pre_filled: !!prefilled,
      });
    }
  }}
  onVoicePress={() => {
    analytics.track('ai_input_voice_pressed', {
      from_page: 'pick_goal',
    });
    // ... navigate
  }}
  onScreenshotPress={() => {
    analytics.track('ai_input_screenshot_pressed', {
      from_page: 'pick_goal',
    });
    // ... navigate
  }}
/>
```

---

## Testing

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import AIInputBox from '@/components/AIInputBox';

test('calls onValueChange when text is entered', () => {
  const onValueChange = jest.fn();
  const { getByPlaceholderText } = render(
    <AIInputBox value="" onValueChange={onValueChange} />
  );
  
  fireEvent.changeText(
    getByPlaceholderText('What would you like to say?'),
    'Test goal'
  );
  
  expect(onValueChange).toHaveBeenCalledWith('Test goal');
});

test('shows glow animation when pre-filled with highlight', () => {
  const { getByText } = render(
    <AIInputBox
      value="Pre-filled content"
      onValueChange={() => {}}
      prefilled={{
        source: 'voice',
        content: 'Pre-filled content',
        highlight: true,
      }}
    />
  );
  
  expect(getByText('From Voice Note ↓')).toBeTruthy();
});
```

---

## Accessibility

The component includes:
- ✅ Proper ARIA labels
- ✅ Keyboard navigation support
- ✅ Screen reader announcements for pre-filled content
- ✅ High contrast mode support
- ✅ Touch target sizes (44x44px minimum)

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Record voice message"
  accessibilityHint="Opens voice recorder to dictate your goal"
  accessibilityRole="button"
  onPress={onVoicePress}
>
  {/* Voice button */}
</TouchableOpacity>
```

---

## Best Practices

1. **Always provide onValueChange** - Component is controlled

2. **Use prefilled for external sources** - Don't manually set value, use prefilled prop

3. **Enable highlight for dramatic entries** - Voice/screenshot should pulse

4. **Disable autoFocus when pre-filled** - Let animation play first

5. **Provide examples** - Help users understand what to type

6. **Track analytics** - Understand which input methods are popular

7. **Handle keyboard** - Dismiss on scroll or when navigating away

8. **Clear after submission** - Reset value after generating message

---

## Troubleshooting

### Issue: Animation doesn't play
- Ensure `highlight: true` in prefilled prop
- Check that value matches prefilled.content

### Issue: Auto-scroll doesn't work
- Make sure ScrollView has a ref
- Verify timing (may need longer delay)
- Check that inputBoxRef is attached to correct View

### Issue: Voice/Screenshot buttons don't work
- Verify onVoicePress/onScreenshotPress are provided
- Check navigation params are correct
- Ensure permissions are requested

---

## Migration from Old Custom Goal Input

**Before:**
```typescript
<TextInput
  placeholder="Type your own goal..."
  value={customGoal}
  onChangeText={setCustomGoal}
/>
```

**After:**
```typescript
<AIInputBox
  value={customGoal}
  onValueChange={setCustomGoal}
  showVoice={true}
  showScreenshot={true}
/>
```

Benefits:
- ✅ Voice input built-in
- ✅ Screenshot input built-in
- ✅ Example suggestions
- ✅ Character counter
- ✅ Pre-fill animations
- ✅ Consistent styling
