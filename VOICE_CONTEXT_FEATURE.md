# Voice & Tone Context Feature

## ✅ **Feature Implemented!**

The **Voice & Tone Context** field has been added to the Message Templates screen to allow users to personalize how AI-generated messages sound.

---

## 🎯 **What It Does**

Allows users to define their natural communication style so AI-generated messages match their personality, regional dialect, industry jargon, or preferred tone.

### **Examples:**
- "Make it sound Gen Z and casual"
- "Arizona slang and phrasing"
- "Fintech professional but friendly, keep it short and sweet"
- "Southern charm with warmth"
- "Tech startup vibe - innovative but approachable"

---

## 📱 **User Interface**

### **Location:**
Message Templates screen (`/message-templates`)

### **New Section Added:**
Between "Enable Templates" toggle and the Email/SMS/DM tabs

### **UI Components:**
1. **Title:** "Voice & Tone Context"
2. **Description:** "Describe how you want your messages to sound. This guides AI to match your natural communication style."
3. **Multi-line Text Input** (4 lines)
   - Placeholder with examples
   - Saves automatically as user types
4. **Hint Text:** 💡 Examples: "Gen Z casual", "Arizona slang", "Fintech professional but friendly", "Southern charm", "Tech startup vibe"

---

## 🔧 **Technical Implementation**

### **1. Data Model Updates**

#### **`types/templates.ts`**
```typescript
export interface MessageTemplates {
  email: EmailTemplate;
  sms: SMSTemplate;
  dm: DMTemplate;
  enabled: boolean;
  voiceContext?: string; // ✅ NEW
}
```

#### **`types/message.ts`**
```typescript
export interface MessageContext {
  personId?: string;
  goal_name: string;
  user_bio?: string;
  brand_voice?: string;
  voiceContext?: string; // ✅ NEW
  contact_first: string;
  // ... other fields
}
```

---

### **2. Template Provider**

#### **`providers/TemplatesProvider.tsx`**

**New Function Added:**
```typescript
const updateVoiceContext = useCallback(async (voiceContext: string) => {
  const newTemplates = {
    ...templates,
    voiceContext,
  };
  await saveTemplates(newTemplates);
}, [templates, saveTemplates]);
```

**Exported in hook:**
```typescript
return useMemo(() => ({
  templates,
  isLoading,
  updateTemplate,
  updateVoiceContext, // ✅ NEW
  toggleEnabled,
  resetToDefaults,
  applyTemplate,
}), [templates, isLoading, updateTemplate, updateVoiceContext, ...]);
```

---

### **3. UI Screen**

#### **`app/message-templates.tsx`**

**New Section UI:**
```tsx
<View style={styles.voiceContextSection}>
  <Text style={styles.sectionTitle}>Voice & Tone Context</Text>
  <Text style={styles.sectionDescription}>
    Describe how you want your messages to sound. This guides AI to match your natural communication style.
  </Text>
  <CrossPlatformTextInput
    style={[styles.input, styles.voiceContextInput]}
    value={templates.voiceContext || ''}
    onChangeText={(text) => updateVoiceContext(text)}
    onBlur={() => {
      screenAnalytics.track('voice_context_edited', {
        hasContent: !!templates.voiceContext,
        length: templates.voiceContext?.length || 0,
      });
    }}
    placeholder="Example: 'Make it sound Gen Z and casual' or 'Professional fintech tone, short and concise' or 'Arizona slang and phrasing'"
    placeholderTextColor="#8E8E93"
    multiline
    numberOfLines={4}
  />
  <Text style={styles.voiceHint}>
    💡 Examples: "Gen Z casual", "Arizona slang", "Fintech professional but friendly", "Southern charm", "Tech startup vibe"
  </Text>
</View>
```

**Styles Added:**
- `voiceContextSection`: Container styling
- `sectionTitle`: Bold title text
- `sectionDescription`: Helper text styling
- `voiceContextInput`: Multi-line input with proper height
- `voiceHint`: Styled hint text with emoji

---

### **4. Message Generation Integration**

#### **`services/messageGeneration.ts`**

**Voice Context Included in Prompt:**
```typescript
// Build prompt with optional voice context
let prompt = `Generate a ${context.tone} ${context.channel} message for ${goal.name}. Context: ${context.contact_first} ${context.contact_last} at ${context.company}. Recent notes: ${context.recent_notes}. Shared interests: ${context.shared_interests}.`;

if (context.voiceContext) {
  prompt += ` VOICE & TONE: ${context.voiceContext}`; // ✅ ADDED
}

const response = await apiFetch('/api/messages/craft', {
  method: 'POST',
  requireAuth: true,
  body: JSON.stringify({
    prompt,
    tone: context.tone,
    voiceContext: context.voiceContext // ✅ INCLUDED
  })
});
```

---

#### **`utils/promptBuilder.ts`**

**Updated Function Signature:**
```typescript
export function buildMessageContext(
  goal: MessageGoal,
  person: any,
  voiceNotes: any[],
  channel: Channel,
  tone: ToneStyle = 'casual',
  additionalContext?: string,
  voiceContext?: string // ✅ NEW PARAMETER
): MessageContext {
  // ...
  return {
    goal_name: goal.name.toLowerCase(),
    user_bio: 'Professional networker focused on meaningful relationships',
    brand_voice: 'Friendly, authentic, and value-focused',
    voiceContext, // ✅ INCLUDED
    contact_first: firstName,
    // ... other fields
  };
}
```

---

### **5. Analytics Tracking**

**Event Tracked:**
```typescript
screenAnalytics.track('voice_context_edited', {
  hasContent: !!templates.voiceContext,
  length: templates.voiceContext?.length || 0,
});
```

---

## 💡 **How It Works**

### **User Flow:**
1. User opens **Message Templates** (`/message-templates`)
2. Enters their voice preference in **"Voice & Tone Context"** field
   - Example: "Gen Z casual with tech startup vibes"
3. Voice context is **saved automatically** to local storage
4. When generating messages:
   - Voice context is retrieved from templates
   - Included in the AI prompt as: `VOICE & TONE: {user's context}`
   - AI generates messages matching the specified style

---

## 📊 **User Benefits**

### **1. Personalization**
- Messages sound like they're actually from the user
- No more "AI-generated" feel

### **2. Regional Authenticity**
- Support for local dialects and slang
- "Arizona slang", "Southern charm", "NYC directness"

### **3. Professional Consistency**
- Industry-specific tone
- "Fintech professional", "Creative agency vibe", "Legal precision"

### **4. Generational Voice**
- "Gen Z casual", "Millennial friendly", "Boomer formal"

### **5. Brand Alignment**
- Keep messages consistent with personal/company brand
- "Warm but professional", "Innovative yet approachable"

---

## 🎨 **Example Use Cases**

### **Example 1: Gen Z Professional**
```
Voice Context: "Gen Z casual but professional, use contemporary slang, keep it real"

Generated Message:
"hey Sarah! 👋 saw your post about the new fintech project - that's fire! 
would love to hop on a quick call this week if you're down. lmk what works!"
```

### **Example 2: Arizona Local**
```
Voice Context: "Arizona native, use regional phrases and desert state pride"

Generated Message:
"Hey Mike! Hope you're staying cool in this heat! 
Been meaning to reach out about that collaboration we discussed. 
Free for coffee in Old Town Scottsdale this week?"
```

### **Example 3: Fintech Executive**
```
Voice Context: "Fintech industry professional, concise and data-driven but friendly"

Generated Message:
"Hi Jennifer, following up on our discussion re: Q4 metrics. 
Quick 15-min sync to align on KPIs? Tuesday 2pm works on my end."
```

---

## ✅ **What's Complete**

- [x] Data types updated (`MessageTemplates`, `MessageContext`)
- [x] Template provider with `updateVoiceContext` function
- [x] UI section added to Message Templates screen
- [x] Styling for new section
- [x] Local storage persistence
- [x] Integration with message generation service
- [x] Voice context included in AI prompts
- [x] Analytics tracking
- [x] Example placeholders and hints

---

## 🚀 **Next Steps (Optional Enhancements)**

### **Phase 2 - Advanced Features:**
1. **Pre-defined Voice Profiles**
   - Quick select buttons: "Casual", "Professional", "Creative", "Regional"
   
2. **Voice Context Preview**
   - Show example messages with current voice context
   
3. **Industry Templates**
   - Pre-written contexts for: Tech, Finance, Healthcare, Education, etc.
   
4. **Regional Presets**
   - Drop-down with: Southwest, Northeast, Southern, West Coast, International
   
5. **Tone Analyzer**
   - Analyze user's past messages to suggest voice context

6. **A/B Testing**
   - Test different voice contexts and track response rates

---

## 🎯 **Summary**

✅ **Voice & Tone Context is fully implemented and functional!**

Users can now define how they want their AI-generated messages to sound by describing their natural communication style in the Message Templates screen. This context is automatically included in all message generation requests, ensuring messages match the user's authentic voice.

**Perfect for:**
- Regional dialects (Arizona, NYC, Southern, etc.)
- Generational styles (Gen Z, Millennial, Boomer)
- Industry tones (Fintech, Tech, Creative, Legal)
- Personal brands (Warm, Direct, Innovative, Professional)

**The app now generates messages that sound like YOU!** 🎉
