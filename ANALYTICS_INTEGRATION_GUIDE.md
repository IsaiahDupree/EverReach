# Analytics Integration Guide

**Date**: October 21, 2025  
**Goal**: Add event tracking to all mobile app screens

---

## 🎯 Quick Start

### 1. Import the Hook
```typescript
import { useAnalytics, useTrackScreen } from '@/hooks/useAnalytics';
```

### 2. Track Screen View
```typescript
export default function MyScreen() {
  useTrackScreen('screen_name');
  // ... rest of component
}
```

### 3. Track Events
```typescript
const { track } = useAnalytics();

const handleAction = () => {
  track('event_name', {
    property: 'value',
  });
};
```

---

## 📱 Screen-by-Screen Implementation

### Auth Screens

#### Sign In (`app/sign-in.tsx`)
```typescript
import { useAnalytics, useTrackScreen } from '@/hooks/useAnalytics';
import { useAuth } from '@/providers/AuthProvider';

export default function SignInScreen() {
  useTrackScreen('sign_in');
  const { track } = useAnalytics();
  const { signIn } = useAuth();

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signIn(email, password);
      
      // Track successful login
      track('user_logged_in', {
        method: 'email',
      });
    } catch (error) {
      // Error handling
    }
  };

  return (
    // ... UI
  );
}
```

#### Sign Up
```typescript
const handleSignUp = async (email: string, password: string) => {
  try {
    await signUp(email, password);
    
    // Track signup
    track('user_signed_up', {
      method: 'email',
      source: 'mobile_app',
    });
  } catch (error) {
    // Error handling
  }
};
```

---

### Contact Screens

#### Contact Detail (`app/contact/[id].tsx`)
```typescript
import { useAnalytics, useTrackScreen } from '@/hooks/useAnalytics';
import { useLocalSearchParams } from 'expo-router';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const { track } = useAnalytics();
  
  useTrackScreen('contact_detail');

  // Track on mount (contact viewed)
  useEffect(() => {
    if (contact) {
      track('contact_viewed', {
        contact_id: id as string,
        warmth_score: contact.warmth_score,
      });
    }
  }, [contact]);

  return (
    // ... UI
  );
}
```

#### Add Contact (`app/add-contact.tsx`)
```typescript
const handleSaveContact = async (data: ContactFormData) => {
  try {
    const newContact = await createContact(data);
    
    // Track contact creation
    track('contact_created', {
      source: 'manual',
      has_email: !!data.email,
      has_phone: !!data.phone,
      has_tags: (data.tags?.length || 0) > 0,
    });
    
    router.back();
  } catch (error) {
    // Error handling
  }
};
```

#### Import Contacts (`app/import-contacts.tsx`)
```typescript
const handleImport = async (contacts: Contact[]) => {
  try {
    await importContacts(contacts);
    
    // Track bulk import
    track('contact_imported', {
      count: contacts.length,
      source: 'csv',
    });
  } catch (error) {
    // Error handling
  }
};
```

---

### Interaction Screens

#### Log Interaction
```typescript
const handleLogInteraction = async (data: InteractionData) => {
  try {
    await createInteraction(data);
    
    // Track interaction
    track('interaction_logged', {
      channel: data.channel, // 'email', 'sms', 'call', etc.
      direction: data.direction, // 'inbound' or 'outbound'
      has_notes: !!data.notes,
    });
  } catch (error) {
    // Error handling
  }
};
```

---

### Message Screens

#### Send Message
```typescript
const handleSendMessage = async (message: MessageData) => {
  try {
    await sendMessage(message);
    
    // Track message sent
    track('message_sent', {
      channel: message.channel, // 'email', 'sms', 'dm'
      character_count: message.body.length,
      was_ai_generated: message.ai_generated || false,
      goal: message.goal,
    });
  } catch (error) {
    // Error handling
  }
};
```

#### AI Message Generation
```typescript
const handleGenerateMessage = async (prompt: string) => {
  const startTime = Date.now();
  
  try {
    const message = await generateAIMessage(prompt);
    const duration = Date.now() - startTime;
    
    // Track AI generation
    track('ai_message_generated', {
      channel: selectedChannel,
      goal: selectedGoal,
      tone: selectedTone,
      generation_time_ms: duration,
    });
    
    return message;
  } catch (error) {
    // Error handling
  }
};
```

---

### Warmth Screens

#### View Warmth Score
```typescript
useEffect(() => {
  if (contact?.warmth_score) {
    track('warmth_score_viewed', {
      score: contact.warmth_score,
      band: contact.warmth_band, // 'hot', 'warm', 'cooling', 'cold'
    });
  }
}, [contact]);
```

#### Recompute Warmth
```typescript
const handleRecompute = async (contactId: string) => {
  try {
    await recomputeWarmth(contactId);
    
    track('warmth_recomputed', {
      contact_id: contactId,
    });
  } catch (error) {
    // Error handling
  }
};
```

---

### AI Features

#### Contact Analysis
```typescript
const handleAnalyzeContact = async (contactId: string) => {
  const startTime = Date.now();
  
  try {
    const analysis = await analyzeContact(contactId);
    const duration = Date.now() - startTime;
    
    track('ai_contact_analyzed', {
      analysis_type: 'full',
      analysis_time_ms: duration,
    });
    
    return analysis;
  } catch (error) {
    // Error handling
  }
};
```

#### Screenshot Upload
```typescript
const handleUploadScreenshot = async (image: ImageInfo) => {
  try {
    await uploadScreenshot(image);
    
    track('screenshot_uploaded', {
      file_size_bytes: image.fileSize,
      width: image.width,
      height: image.height,
      source: 'camera', // or 'gallery'
    });
  } catch (error) {
    // Error handling
  }
};
```

---

### Subscription Screens

#### View Plans
```typescript
useTrackScreen('subscription_plans');

useEffect(() => {
  track('plan_viewed', {
    current_plan: userPlan,
  });
}, []);
```

#### Select Plan
```typescript
const handleSelectPlan = (plan: string) => {
  track('plan_selected', {
    plan: plan, // 'free', 'pro', 'team'
    billing_period: billingPeriod, // 'monthly', 'yearly'
    price: planPrice,
  });
  
  router.push('/checkout');
};
```

#### Checkout
```typescript
const handleCheckoutStart = () => {
  track('checkout_started', {
    plan: selectedPlan,
    amount: totalAmount,
  });
};

const handleCheckoutComplete = (orderId: string) => {
  track('checkout_completed', {
    plan: selectedPlan,
    amount: totalAmount,
    currency: 'USD',
  });
};
```

---

### App Lifecycle

#### App Provider (`providers/AppProvider.tsx`)
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';
import { AppState, AppStateStatus } from 'react-native';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { track } = useAnalytics();
  
  useEffect(() => {
    // Track app open
    track('app_opened', {});
    
    // Track app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        track('app_foregrounded', {});
      } else if (nextAppState === 'background') {
        track('app_backgrounded', {});
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  return children;
}
```

---

## 🎨 Common Patterns

### Pattern 1: Track Button Clicks
```typescript
<TouchableOpacity
  onPress={() => {
    track('cta_clicked', {
      cta_name: 'upgrade_button',
      screen: 'settings',
    });
    handleUpgrade();
  }}
>
  <Text>Upgrade to Pro</Text>
</TouchableOpacity>
```

### Pattern 2: Track Form Submissions
```typescript
const handleSubmit = async (formData: FormData) => {
  // Validate first
  if (!validate(formData)) return;
  
  // Track submission
  track('form_submitted', {
    form_name: 'contact_form',
    fields_filled: Object.keys(formData).length,
  });
  
  // Submit
  await submitForm(formData);
};
```

### Pattern 3: Track Navigation
```typescript
const router = useRouter();

const handleNavigate = (path: string) => {
  track('navigation', {
    from: currentScreen,
    to: path,
  });
  
  router.push(path);
};
```

### Pattern 4: Track Errors
```typescript
try {
  await riskyOperation();
} catch (error) {
  track('error_occurred', {
    error_type: error.name,
    error_message: error.message,
    screen: 'contact_detail',
    action: 'save_contact',
  });
  
  // Show error to user
}
```

---

## 📋 Implementation Checklist

### Priority 1: Auth & Onboarding
- [ ] Sign in screen
- [ ] Sign up screen
- [ ] Email verification
- [ ] Password reset
- [ ] Onboarding flow

### Priority 2: Core Features
- [ ] Contact list view
- [ ] Contact detail view
- [ ] Add contact
- [ ] Edit contact
- [ ] Delete contact
- [ ] Import contacts

### Priority 3: Interactions
- [ ] Log interaction
- [ ] View interaction history
- [ ] Edit interaction
- [ ] Delete interaction

### Priority 4: Messages
- [ ] Compose message
- [ ] Send message
- [ ] AI message generation
- [ ] Template selection
- [ ] Schedule message

### Priority 5: Warmth
- [ ] View warmth score
- [ ] Warmth explanation
- [ ] Recompute warmth
- [ ] Warmth alerts

### Priority 6: AI Features
- [ ] Contact analysis
- [ ] Screenshot upload
- [ ] Screenshot analysis
- [ ] Voice note recording
- [ ] Voice note transcription

### Priority 7: Admin
- [ ] View analytics
- [ ] View billing
- [ ] Manage subscription
- [ ] Export data

### Priority 8: Settings
- [ ] Update profile
- [ ] Notification preferences
- [ ] Privacy settings
- [ ] App preferences

---

## 🧪 Testing Your Tracking

### 1. Check PostHog Dashboard
Go to PostHog (https://us.i.posthog.com) and verify events are appearing:
- Events → Live Events (see real-time events)
- Insights → Create chart with your events
- Users → See users with their events

### 2. Check Supabase
Query the `app_events` table:
```sql
SELECT 
  event_name, 
  COUNT(*) as count,
  MAX(occurred_at) as last_seen
FROM app_events
WHERE user_id = 'your-user-id'
GROUP BY event_name
ORDER BY count DESC;
```

### 3. Debug in App
Add temporary logging:
```typescript
const { track } = useAnalytics();

const handleAction = () => {
  console.log('[Analytics] Tracking event:', 'event_name');
  track('event_name', { property: 'value' });
};
```

---

## 🚀 Quick Wins

Start with these high-impact screens:

1. **Sign In** - Track logins (most frequent event)
2. **Contact Detail** - Track views (core feature)
3. **Add Contact** - Track creation (conversion metric)
4. **Send Message** - Track sends (key engagement)
5. **AI Features** - Track AI usage (premium feature)

---

## 📊 Expected Events After Implementation

After implementing tracking on all screens, you should see:

### Daily Events (Per Active User)
- `app_opened`: 3-5 times
- `screen_rendered`: 15-30 times
- `contact_viewed`: 5-10 times
- `interaction_logged`: 1-3 times
- `warmth_score_viewed`: 2-5 times

### Weekly Events
- `contact_created`: 2-5 times
- `message_sent`: 3-10 times
- `ai_message_generated`: 1-5 times
- `screenshot_uploaded`: 0-3 times

### Monthly Events
- `user_signed_up`: 1 time (first month only)
- `plan_selected`: 0-1 times
- `checkout_completed`: 0-1 times

---

## 🎯 Next Steps

1. **Start Simple**: Add tracking to 5 screens
2. **Test**: Verify events in PostHog
3. **Expand**: Add tracking to all screens
4. **Analyze**: Use dashboard to view analytics
5. **Optimize**: Improve UX based on data

---

**Estimated Time**: 2-3 hours for all screens  
**Impact**: Full visibility into user behavior  
**Value**: Data-driven product decisions
