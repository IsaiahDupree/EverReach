# Custom Message Goal Integration

## Overview
Allows users to define custom messaging goals through voice notes, screenshots, or text input, which are then used to generate personalized messages.

## Component Created
- **`CustomMessageGoalModal.tsx`** - Reusable modal for custom goal input

## Integration Points

### 1. Contact Detail Page - Quick Actions

Add a "Custom Goal" button alongside Voice Note, Screenshot, and Ask AI:

```typescript
// In app/contact/[id].tsx

import CustomMessageGoalModal from '@/components/CustomMessageGoalModal';

// Add state
const [showCustomGoalModal, setShowCustomGoalModal] = useState(false);

// Add handler
const handleCustomGoal = (customGoal: string, source: 'text' | 'voice' | 'screenshot') => {
  console.log('[ContactDetail] Custom goal from', source, ':', customGoal);
  
  router.push({
    pathname: '/message-results',
    params: {
      personId: contact.id,
      channel: 'sms', // or user's preference
      goalId: 'custom',
      customGoal: customGoal,
      tone: 'casual', // or user's preference
    },
  });
};

// In the UI (add to quick actions section)
<TouchableOpacity 
  style={styles.quickActionButton}
  onPress={() => setShowCustomGoalModal(true)}
>
  <View style={[styles.quickActionIconContainer, { backgroundColor: '#F59E0B' }]}>
    <Sparkles size={24} color="#FFFFFF" />
  </View>
  <Text style={styles.quickActionLabel}>Custom Goal</Text>
</TouchableOpacity>

// Add modal
<CustomMessageGoalModal
  visible={showCustomGoalModal}
  onClose={() => setShowCustomGoalModal(false)}
  onConfirm={handleCustomGoal}
  contactName={contact.display_name}
/>
```

### 2. Voice Note Page Enhancement

After recording a voice note, offer to extract messaging goal:

```typescript
// In app/voice-note.tsx

const handleVoiceNoteComplete = async (transcription: string) => {
  // Show option to use as custom goal
  Alert.alert(
    'Voice Note Saved',
    'Would you like to use this as a custom message goal?',
    [
      { text: 'Just Save', onPress: () => saveVoiceNote() },
      {
        text: 'Generate Message',
        onPress: () => {
          router.push({
            pathname: '/message-results',
            params: {
              personId: selectedPerson.id,
              channel: 'sms',
              goalId: 'custom',
              customGoal: transcription, // Use transcription as goal
              tone: 'casual',
            },
          });
        },
      },
    ]
  );
};
```

### 3. Screenshot Analysis Integration

Extract messaging intent from screenshot analysis:

```typescript
// In app/screenshot-analysis.tsx or components/AnalysisResults.tsx

const handleUseAsMessageGoal = (analysisText: string) => {
  // Extract key points or use full summary
  const customGoal = `Respond to: ${analysisText.substring(0, 200)}`;
  
  router.push({
    pathname: '/message-results',
    params: {
      personId: selectedPersonId,
      channel: 'sms',
      goalId: 'custom',
      customGoal: customGoal,
      tone: 'professional',
    },
  });
};

// Add button to analysis results
<TouchableOpacity
  style={styles.actionButton}
  onPress={() => handleUseAsMessageGoal(analysisResult.vision_summary)}
>
  <MessageSquare size={18} color="#FFFFFF" />
  <Text style={styles.actionButtonText}>Draft Response</Text>
</TouchableOpacity>
```

### 4. Ask AI Chat Integration

Allow converting chat context into message goal:

```typescript
// In components/ChatInterface.tsx or CRM Assistant chat

const handleGenerateMessageFromChat = (chatContext: string, contactId: string) => {
  router.push({
    pathname: '/message-results',
    params: {
      personId: contactId,
      channel: 'sms',
      goalId: 'custom',
      customGoal: `Based on our conversation: ${chatContext}`,
      tone: 'friendly',
    },
  });
};

// Add "Generate Message" button in chat after AI provides advice
{aiResponse && (
  <TouchableOpacity
    style={styles.generateButton}
    onPress={() => handleGenerateMessageFromChat(aiResponse, currentContactId)}
  >
    <Sparkles size={16} color="#FFFFFF" />
    <Text style={styles.generateButtonText}>Draft Message</Text>
  </TouchableOpacity>
)}
```

## Message Results Page Updates

The `message-results.tsx` already supports `customGoal` parameter. Enhance the display:

```typescript
// Show custom goal prominently in the UI
{params.customGoal && (
  <View style={styles.customGoalBanner}>
    <Sparkles size={18} color={theme.colors.primary} />
    <View style={styles.customGoalContent}>
      <Text style={[styles.customGoalLabel, { color: theme.colors.textSecondary }]}>
        Custom Goal
      </Text>
      <Text style={[styles.customGoalText, { color: theme.colors.text }]}>
        {params.customGoal}
      </Text>
    </View>
  </View>
)}
```

## User Flow Examples

### Flow 1: Voice Note → Custom Goal
```
1. User records voice note about wanting to discuss pricing
2. Transcription: "I want to talk to them about our new pricing model"
3. System offers: "Generate message from this?"
4. User confirms
5. → Message Results with custom goal pre-filled
6. AI generates message about pricing discussion
```

### Flow 2: Screenshot → Custom Goal
```
1. User uploads screenshot of email from contact
2. AI analyzes: "Contact is asking about meeting availability"
3. User clicks "Draft Response"
4. → Message Results with goal: "Respond to meeting request"
5. AI generates available times and professional response
```

### Flow 3: Ask AI → Custom Goal
```
1. User asks AI: "How should I follow up with John about the proposal?"
2. AI provides advice
3. User clicks "Generate Message"
4. → Message Results with context from chat
5. AI generates follow-up message incorporating advice
```

### Flow 4: Direct Custom Goal Entry
```
1. User clicks "Custom Goal" button on contact page
2. Modal opens
3. User types: "Congratulate them on their promotion"
4. Selects input method: Text
5. Clicks "Generate Message"
6. → Message Results with custom goal
7. AI generates congratulatory message
```

## Benefits

1. **Flexibility** - Users aren't limited to predefined goals
2. **Context-Aware** - Goals can incorporate specific details from voice, screenshots, or chats
3. **Natural** - Users express intent in their own words
4. **Unified** - One feature across multiple input methods
5. **Efficient** - Reduces steps from idea to generated message

## Analytics to Track

```typescript
analytics.track('custom_message_goal_created', {
  source: 'voice' | 'screenshot' | 'text' | 'chat',
  goal_length: customGoal.length,
  contact_id: contactId,
  channel: selectedChannel,
});

analytics.track('custom_goal_message_generated', {
  source: goalSource,
  success: true,
  generation_time_ms: generationTime,
});
```

## Future Enhancements

1. **Goal Templates** - Save frequently used custom goals
2. **Goal History** - Show recent custom goals for quick reuse
3. **Smart Suggestions** - AI suggests goals based on recent interactions
4. **Multi-Contact** - Generate messages for multiple contacts with same goal
5. **Voice-to-Goal** - Direct voice recording in the modal itself
