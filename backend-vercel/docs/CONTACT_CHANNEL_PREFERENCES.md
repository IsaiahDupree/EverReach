# Contact Channel Preferences - User Guide

**Feature**: Smart Communication Channel Management  
**Endpoints**: `/api/v1/contacts/:id/preferences`, `/api/v1/contacts/:id/effective-channel`  
**Status**: ✅ Available in backend branch

---

## 📋 Overview

EverReach provides **flexible channel preference management** for each contact, allowing:

1. **Manual Selection** - Users explicitly set preferred channels
2. **AI Recommendations** - System suggests optimal channels based on behavior
3. **Smart Routing** - Automatic channel selection considering context
4. **Quiet Hours** - Time-aware communication
5. **Escalation Rules** - Auto-escalate to backup channels when needed

---

## 🎯 Use Cases

### Use Case 1: User Manually Sets Preferred Channel

**Scenario**: User knows John prefers email for business and phone for urgent matters.

**Steps**:
1. User navigates to John's contact page
2. Clicks on "Contact Channels" section
3. Sets:
   - **Primary**: Email
   - **Backup**: Phone, LinkedIn
   - **Quiet Hours**: 10 PM - 8 AM EST
4. System saves preferences

**API Call**:
```typescript
PATCH /api/v1/contacts/:id/preferences
{
  "preferred_channel": "email",
  "backup_channels": ["phone", "linkedin"],
  "quiet_hours": {
    "tz": "America/New_York",
    "start": "22:00",
    "end": "08:00"
  }
}
```

**Result**:
- All future messages to John default to email
- During quiet hours, messages queue until 8 AM
- If email fails, system tries phone next

---

### Use Case 2: AI Suggests Best Channel Based on Engagement

**Scenario**: System analyzes John's response patterns and suggests optimal channel.

**AI Analysis Factors**:
- ✅ **Response Rate**: Email 90%, LinkedIn 30%, Phone 60%
- ✅ **Response Time**: Email ~2 hours, Phone ~5 min, LinkedIn ~2 days
- ✅ **Engagement Quality**: Email = detailed replies, Phone = quick yes/no
- ✅ **Time Patterns**: Responds to emails 9 AM-5 PM, phone calls 7 PM-9 PM
- ✅ **Message Type**: Long-form = email, urgent = phone, casual = LinkedIn

**API Call**:
```typescript
GET /api/v1/contacts/:id/effective-channel?context=urgent
```

**Response**:
```json
{
  "recommended_channel": "phone",
  "confidence": 0.85,
  "reason": "High response rate (60%) and fast response time (5 min) for urgent matters",
  "alternatives": [
    {
      "channel": "email",
      "confidence": 0.45,
      "reason": "Better for detailed messages but slower for urgent needs"
    }
  ],
  "insights": {
    "best_time": "19:00-21:00",
    "avg_response_time": "5 minutes",
    "engagement_score": 8.5
  }
}
```

**UI Display**:
```
💡 AI Suggestion: Phone
   "John responds quickly to phone calls in the evening (avg 5 min)"
   
   Confidence: ⭐⭐⭐⭐⭐ 85%
   
   Alternative: Email (45% confidence)
```

---

### Use Case 3: Context-Aware Channel Selection

**Scenario**: System picks channel based on message context.

**Examples**:

#### A) Urgent Deal Update
```typescript
// Message: "Contract expires in 2 hours - need signature ASAP"
GET /api/v1/contacts/:id/effective-channel?context=urgent&type=business
```
**Recommendation**: Phone (immediate response needed)

#### B) Weekly Newsletter
```typescript
// Message: "This week's industry insights..."
GET /api/v1/contacts/:id/effective-channel?context=newsletter&type=informational
```
**Recommendation**: Email (low-priority, digestible content)

#### C) Partnership Proposal
```typescript
// Message: "Exploring collaboration opportunities..."
GET /api/v1/contacts/:id/effective-channel?context=proposal&type=networking
```
**Recommendation**: LinkedIn (professional context, allows research)

---

### Use Case 4: Respect Quiet Hours

**Scenario**: User tries to message contact during their quiet hours.

**Setup**:
```json
{
  "quiet_hours": {
    "tz": "America/Los_Angeles",
    "start": "22:00",
    "end": "08:00"
  }
}
```

**Check Before Sending**:
```typescript
GET /api/v1/contacts/:id/effective-channel
```

**Response**:
```json
{
  "can_contact_now": false,
  "reason": "contact_in_quiet_hours",
  "quiet_hours_end": "2025-10-14T08:00:00-07:00",
  "next_available_time": "in 6 hours",
  "recommendation": "schedule_for_later",
  "preferred_channel": "email"
}
```

**UI Display**:
```
⏰ John is in quiet hours (10 PM - 8 AM PST)
   Message will be queued and sent at 8:00 AM

   [Queue for 8 AM] [Send Anyway]
```

---

### Use Case 5: Auto-Escalation on No Response

**Scenario**: Email sent but no response after 48 hours.

**Setup**:
```json
{
  "preferred_channel": "email",
  "backup_channels": ["phone"],
  "escalation": {
    "enabled": true,
    "no_reply_hours": 48,
    "escalation_channel": "phone"
  }
}
```

**Timeline**:
- **Day 1, 9 AM**: Email sent to John
- **Day 3, 9 AM**: No response after 48 hours
- **Day 3, 9:05 AM**: System automatically:
  1. Marks email as "no_response"
  2. Creates follow-up task: "Call John (escalated from email)"
  3. Sends notification to user
  4. Updates next outreach channel to "phone"

**Notification**:
```
📞 Auto-Escalation: John hasn't responded to email
   Suggested action: Call John about "Q4 Partnership Proposal"
   
   [Call Now] [Send SMS] [Snooze 24h]
```

---

### Use Case 6: AI Learns from User Overrides

**Scenario**: System learns when users override AI suggestions.

**Example**:
1. **AI Suggests**: Email (based on past behavior)
2. **User Chooses**: Phone instead
3. **Outcome**: Contact responds immediately and closes deal
4. **AI Learns**: 
   - For similar urgent/deal contexts → increase phone confidence
   - Update contact's channel preferences
   - Adjust future suggestions

**Feedback Loop**:
```typescript
POST /api/v1/contacts/:id/channel-feedback
{
  "suggested_channel": "email",
  "actual_channel": "phone",
  "context": "urgent_deal",
  "outcome": "positive",  // positive/neutral/negative
  "response_time_minutes": 5,
  "deal_closed": true
}
```

**Result**: Next time, AI will suggest phone for urgent deals with this contact.

---

## 🔧 Technical Implementation

### Frontend Component Structure

```typescript
// ContactChannels.tsx
import { useContactPreferences, useEffectiveChannel } from '@/hooks/contacts';

function ContactChannels({ contactId }: { contactId: string }) {
  const { data: preferences, mutate } = useContactPreferences(contactId);
  const { data: aiSuggestion } = useEffectiveChannel(contactId);
  
  return (
    <Card>
      <CardHeader>
        <h3>📞 Contact Channels</h3>
        {aiSuggestion && (
          <Badge variant="ai">
            💡 AI Suggests: {aiSuggestion.channel} 
            ({Math.round(aiSuggestion.confidence * 100)}% confidence)
          </Badge>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Manual Selection */}
        <ChannelSelector
          value={preferences?.preferred_channel}
          onChange={(channel) => mutate({ preferred_channel: channel })}
          options={['email', 'phone', 'linkedin', 'sms']}
        />
        
        {/* AI Insights */}
        {aiSuggestion?.insights && (
          <AIInsights
            responseRate={aiSuggestion.insights.response_rate}
            avgResponseTime={aiSuggestion.insights.avg_response_time}
            bestTime={aiSuggestion.insights.best_time}
          />
        )}
        
        {/* Quiet Hours */}
        <QuietHoursConfig
          value={preferences?.quiet_hours}
          onChange={(hours) => mutate({ quiet_hours: hours })}
        />
      </CardContent>
    </Card>
  );
}
```

---

### API Hooks

```typescript
// hooks/useContactPreferences.ts
export function useContactPreferences(contactId: string) {
  const { data, mutate } = useSWR(
    `/api/v1/contacts/${contactId}/preferences`,
    fetcher
  );
  
  const updatePreferences = async (updates: Partial<Preferences>) => {
    await fetch(`/api/v1/contacts/${contactId}/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    mutate(); // Revalidate
  };
  
  return { data, mutate: updatePreferences };
}

// hooks/useEffectiveChannel.ts
export function useEffectiveChannel(
  contactId: string, 
  context?: string
) {
  const url = `/api/v1/contacts/${contactId}/effective-channel${
    context ? `?context=${context}` : ''
  }`;
  
  return useSWR(url, fetcher);
}
```

---

## 📊 Channel Preference Data Model

```typescript
interface ContactPreferences {
  contact_id: string;
  
  // Channel Selection
  preferred_channel: 'email' | 'phone' | 'linkedin' | 'sms' | 'dm';
  backup_channels: ('email' | 'phone' | 'linkedin' | 'sms' | 'dm')[];
  
  // Timing
  timezone: string;
  quiet_hours_start?: string;  // "22:00"
  quiet_hours_end?: string;    // "08:00"
  
  // Frequency
  contact_frequency: 'low' | 'normal' | 'high';
  allow_ai_outreach: boolean;
  
  // Content Preferences
  content_tone: 'casual' | 'friendly' | 'professional' | 'formal';
  content_length: 'short' | 'medium' | 'long';
  topics_blocklist: string[];
  
  // Scheduling
  preferred_days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  preferred_hours: { start: string; end: string }[];
  
  // Escalation
  escalation_enabled: boolean;
  escalation_no_reply_hours: number;
  escalation_channel: 'email' | 'phone' | 'sms';
  
  // Metadata
  last_confirmed_at?: string;
}

interface EffectiveChannelResponse {
  recommended_channel: string;
  confidence: number;
  reason: string;
  alternatives: {
    channel: string;
    confidence: number;
    reason: string;
  }[];
  insights: {
    response_rate: number;
    avg_response_time: string;
    best_time: string;
    engagement_score: number;
  };
  can_contact_now: boolean;
  quiet_hours_active: boolean;
  next_available_time?: string;
}
```

---

## 🎨 UI/UX Recommendations

### 1. **Visual Channel Indicators**

```
📧 Email (primary) ⭐
   Response rate: 90% • Avg: 2 hours
   
📱 Phone
   Response rate: 60% • Avg: 5 min
   [Set as primary]
   
💼 LinkedIn
   Response rate: 30% • Avg: 2 days
```

---

### 2. **AI Suggestion Badge**

```
┌─────────────────────────────────────┐
│ 💡 AI Suggestion                    │
│                                     │
│ Based on John's behavior, we        │
│ recommend using Phone for urgent    │
│ matters (85% confidence)            │
│                                     │
│ [Use Suggestion] [Ignore]           │
└─────────────────────────────────────┘
```

---

### 3. **Quiet Hours Indicator**

```
⏰ Quiet Hours: 10 PM - 8 AM PST
   
   Current time: 11:30 PM PST
   
   🔕 John is likely asleep
   
   [Queue for 8 AM] [Send Anyway]
```

---

### 4. **Channel Comparison View**

```
Compare Channels:

Email           Phone           LinkedIn
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Response: 90%   Response: 60%   Response: 30%
Speed: 2 hrs    Speed: 5 min    Speed: 2 days
Best for:       Best for:       Best for:
• Detailed      • Urgent        • Professional
• Follow-ups    • Quick Q&A     • Networking
```

---

## 🔐 Privacy & Compliance

### GDPR Considerations

1. **Consent Required**:
   ```json
   {
     "double_opt_in_required": {
       "email": true,
       "sms": true,
       "phone": false
     }
   }
   ```

2. **Right to Update**:
   - Users can change preferences anytime
   - Contact can request preference changes

3. **Data Retention**:
   - Channel interaction data retained for 90 days
   - Preference history logged for audit

---

## 📈 Analytics & Insights

### Track Channel Performance

```typescript
GET /api/v1/contacts/:id/channel-analytics

Response:
{
  "channels": {
    "email": {
      "sent": 50,
      "opened": 45,
      "replied": 40,
      "response_rate": 0.80,
      "avg_response_time_hours": 2.5
    },
    "phone": {
      "attempted": 10,
      "connected": 8,
      "voicemail": 2,
      "response_rate": 0.80,
      "avg_call_duration_minutes": 12
    }
  },
  "insights": [
    "Email has highest response rate (80%)",
    "Phone calls typically happen 7-9 PM",
    "LinkedIn messages rarely get responses"
  ],
  "recommendation": "Continue using email as primary"
}
```

---

## 🚀 Advanced Features

### 1. **Multi-Channel Campaigns**

```typescript
POST /api/v1/campaigns
{
  "name": "Q4 Partnership Outreach",
  "contacts": ["uuid1", "uuid2"],
  "strategy": "auto",  // Use each contact's preferred channel
  "fallback_enabled": true,
  "escalation_rules": {
    "no_reply_hours": 72,
    "escalation_sequence": ["email", "linkedin", "phone"]
  }
}
```

---

### 2. **Channel A/B Testing**

```typescript
POST /api/v1/experiments/channel-test
{
  "hypothesis": "Phone calls convert better than emails for enterprise deals",
  "segment": "enterprise_contacts",
  "test_group": {
    "channel": "phone",
    "size": 50
  },
  "control_group": {
    "channel": "email",
    "size": 50
  },
  "success_metric": "deal_closed"
}
```

---

### 3. **Smart Channel Sequencing**

```typescript
POST /api/v1/contacts/:id/outreach-sequence
{
  "sequence": [
    {
      "channel": "email",
      "wait_hours": 48,
      "condition": "no_reply"
    },
    {
      "channel": "linkedin",
      "wait_hours": 72,
      "condition": "no_engagement"
    },
    {
      "channel": "phone",
      "condition": "final_attempt"
    }
  ]
}
```

---

## ✅ Best Practices

### 1. **Always Check Before Sending**

```typescript
// ❌ BAD: Send immediately
await sendMessage(contactId, message);

// ✅ GOOD: Check effective channel first
const { recommended_channel, can_contact_now } = 
  await getEffectiveChannel(contactId);

if (!can_contact_now) {
  await queueMessage(contactId, message, recommended_channel);
} else {
  await sendMessage(contactId, message, recommended_channel);
}
```

---

### 2. **Respect User Overrides**

```typescript
// If user explicitly chose a channel, use it
if (userSelectedChannel) {
  channel = userSelectedChannel;
} else {
  // Otherwise, use AI recommendation
  const { recommended_channel } = await getEffectiveChannel(contactId);
  channel = recommended_channel;
}
```

---

### 3. **Provide Transparency**

```typescript
// Show why AI chose this channel
<ChannelRecommendation>
  <Badge>AI Recommendation: Email</Badge>
  <Reason>
    John responds to 90% of emails within 2 hours
  </Reason>
  <Alternative>
    Or try Phone for urgent matters
  </Alternative>
</ChannelRecommendation>
```

---

### 4. **Learn from Outcomes**

```typescript
// After message sent, track outcome
await trackChannelOutcome({
  contact_id: contactId,
  channel: 'email',
  opened: true,
  replied: true,
  response_time_hours: 1.5,
  outcome: 'positive'
});

// AI will use this to improve future suggestions
```

---

## 🎯 Summary

**EverReach Channel Preferences** provide:

✅ **Flexibility** - Manual selection or AI automation  
✅ **Intelligence** - Learn from behavior patterns  
✅ **Respect** - Honor quiet hours and preferences  
✅ **Optimization** - Use best channel for context  
✅ **Escalation** - Auto-escalate when needed  
✅ **Privacy** - GDPR compliant with consent tracking  

**API Endpoints**:
- `GET/PATCH /api/v1/contacts/:id/preferences` - Manage preferences
- `GET /api/v1/contacts/:id/effective-channel` - Get AI recommendation
- `GET /api/v1/contacts/:id/channel-analytics` - View performance
- `POST /api/v1/contacts/:id/channel-feedback` - Improve AI

**Status**: ✅ Fully implemented and ready to use!

---

**Last Updated**: October 13, 2025  
**Backend Branch**: feat/backend-vercel-only-clean  
**Documentation**: Complete
