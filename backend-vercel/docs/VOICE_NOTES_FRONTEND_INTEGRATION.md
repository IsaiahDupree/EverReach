# Voice Notes Frontend Integration Guide

## 🚨 **Quick Fix for "Bucket not found" Error**

Your app is trying to upload to `voice-notes` bucket, but you should use the **`attachments`** bucket with `voice-notes/` folder path.

### **Fix in Your Code:**

```typescript
// ❌ WRONG - trying to use 'voice-notes' bucket
const { data, error } = await supabase.storage
  .from('voice-notes')  // This bucket doesn't exist!
  .upload(filePath, audioBlob);

// ✅ CORRECT - use 'attachments' bucket with voice-notes/ folder
const filePath = `voice-notes/${userId}/${Date.now()}-${randomId}.m4a`;
const { data, error } = await supabase.storage
  .from('attachments')  // ✅ Use existing attachments bucket
  .upload(filePath, audioBlob, {
    contentType: 'audio/m4a',
    upsert: false,
  });
```

**Location to fix:** Your `SupabaseVoiceNotesRepo` or voice notes upload service.

This immediate fix will solve the error! ✅

---

## 🎯 Overview

Instead of uploading directly to Supabase Storage, use the backend API endpoint which provides:
- ✅ Automatic contact extraction
- ✅ Action item detection
- ✅ Sentiment analysis
- ✅ Auto-categorization
- ✅ Tag suggestions
- ✅ Proper file storage

---

## 🔄 Current Flow (Direct Upload - Not Recommended)

```
Web App → Record Audio → Transcribe → Upload to Supabase Storage → Save to DB
         ❌ No AI processing
         ❌ No contact extraction
         ❌ No action detection
```

---

## ✅ New Flow (Backend API - Recommended)

```
Web App → Record Audio → Send to Backend API → AI Processing → Save & Return
         ✅ Contact extraction
         ✅ Action items
         ✅ Sentiment analysis
         ✅ Auto-categorization
```

---

## 📝 Step-by-Step Integration

### **Step 1: Update Voice Note Service**

Create or update `services/voiceNotes.ts`:

```typescript
/**
 * Voice Notes Service - Backend API Integration
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';

export interface VoiceNoteProcessingResult {
  voice_note_id: string;
  transcription: string;
  audio_url: string;
  duration_seconds: number;
  extracted_contacts: Array<{
    name: string;
    confidence: number;
    context: string;
  }>;
  detected_actions: Array<{
    action_type: 'call' | 'email' | 'meeting' | 'task' | 'follow_up';
    description: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
  }>;
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
  };
  suggested_category: string;
  suggested_tags: string[];
  metadata: {
    processing_time_ms: number;
    token_usage: number;
  };
}

/**
 * Process voice note through backend API with AI features
 */
export async function processVoiceNote(
  audioBlob: Blob,
  transcription: string,
  durationSeconds: number
): Promise<VoiceNoteProcessingResult> {
  // Get auth token
  const token = await getAuthToken();
  
  // Create FormData
  const formData = new FormData();
  formData.append('audio', audioBlob, `voice-note-${Date.now()}.m4a`);
  formData.append('transcription', transcription);
  formData.append('duration_seconds', durationSeconds.toString());
  
  // Send to backend
  const response = await fetch(`${API_BASE}/api/v1/agent/voice-note/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type - let browser set it with boundary for FormData
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to process voice note');
  }
  
  return response.json();
}

/**
 * Save voice note (simple save without AI processing)
 */
export async function saveVoiceNote(
  audioBlob: Blob,
  transcription: string,
  durationSeconds: number,
  contactId?: string
): Promise<{ id: string; audio_url: string }> {
  const token = await getAuthToken();
  
  const formData = new FormData();
  formData.append('audio', audioBlob, `voice-note-${Date.now()}.m4a`);
  formData.append('transcription', transcription);
  formData.append('duration_seconds', durationSeconds.toString());
  if (contactId) {
    formData.append('contact_id', contactId);
  }
  
  const response = await fetch(`${API_BASE}/api/v1/voice-notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to save voice note');
  }
  
  return response.json();
}

/**
 * Get auth token from Supabase
 */
async function getAuthToken(): Promise<string> {
  // For React Native
  if (typeof window === 'undefined' || !window.localStorage) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const session = await AsyncStorage.getItem('supabase.auth.token');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed.access_token || parsed.token;
    }
  }
  
  // For Web
  const projectRef = 'utasetfxiqcrnwyfforx';
  const authData = localStorage.getItem(`sb-${projectRef}-auth-token`);
  if (authData) {
    const parsed = JSON.parse(authData);
    return parsed.access_token || parsed.token;
  }
  
  throw new Error('No auth token found');
}
```

---

### **Step 2: Update Voice Note Recording Component**

Update your recording component to use the new service:

```typescript
// In your VoiceNoteRecorder component

import { processVoiceNote } from '@/services/voiceNotes';
import { trackEvent } from '@/services/analytics';

async function handleSaveVoiceNote() {
  try {
    setSaving(true);
    
    // Track start
    trackEvent('voice_note_save_started', {
      duration_seconds: durationSeconds,
      transcription_length: transcription.length,
    });
    
    // Process through backend API (with AI features)
    const result = await processVoiceNote(
      audioBlob,
      transcription,
      durationSeconds
    );
    
    // Show AI results to user
    console.log('AI Processing Results:', {
      contacts: result.extracted_contacts,
      actions: result.detected_actions,
      sentiment: result.sentiment,
      tags: result.suggested_tags,
    });
    
    // Track success
    trackEvent('voice_note_saved', {
      voice_note_id: result.voice_note_id,
      contacts_found: result.extracted_contacts.length,
      actions_found: result.detected_actions.length,
      sentiment: result.sentiment.overall,
      processing_time_ms: result.metadata.processing_time_ms,
    });
    
    // Show success message with AI insights
    Alert.alert(
      'Voice Note Saved!',
      `Found ${result.extracted_contacts.length} contacts and ${result.detected_actions.length} action items.\n\nSentiment: ${result.sentiment.overall}`,
      [
        { text: 'View Details', onPress: () => navigateToVoiceNote(result.voice_note_id) },
        { text: 'OK' },
      ]
    );
    
    // Navigate or close
    navigation.goBack();
    
  } catch (error) {
    console.error('Failed to save voice note:', error);
    
    trackEvent('voice_note_save_failed', {
      error: error.message,
    });
    
    Alert.alert(
      'Save Failed',
      error.message || 'Could not save voice note. Please try again.',
      [{ text: 'OK' }]
    );
  } finally {
    setSaving(false);
  }
}
```

---

### **Step 3: Display AI Results (Optional but Cool!)**

Show the AI-extracted insights to users:

```typescript
// AIInsightsCard.tsx
interface Props {
  result: VoiceNoteProcessingResult;
}

export function AIInsightsCard({ result }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Insights</Text>
      
      {/* Contacts Found */}
      {result.extracted_contacts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🎯 Found {result.extracted_contacts.length} Contact{result.extracted_contacts.length > 1 ? 's' : ''}
          </Text>
          {result.extracted_contacts.map((contact, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.itemText}>{contact.name}</Text>
              <Text style={styles.confidence}>{Math.round(contact.confidence * 100)}% match</Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Action Items */}
      {result.detected_actions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ✅ {result.detected_actions.length} Action Item{result.detected_actions.length > 1 ? 's' : ''}
          </Text>
          {result.detected_actions.map((action, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.actionType}>{action.action_type.toUpperCase()}</Text>
              <Text style={styles.itemText}>{action.description}</Text>
              <Text style={styles.priority}>Priority: {action.priority}</Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Sentiment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💭 Sentiment</Text>
        <Text style={styles.sentiment}>
          {getSentimentEmoji(result.sentiment.overall)} {result.sentiment.overall}
        </Text>
      </View>
      
      {/* Suggested Tags */}
      {result.suggested_tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Suggested Tags</Text>
          <View style={styles.tags}>
            {result.suggested_tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function getSentimentEmoji(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return '😊';
    case 'negative': return '😞';
    default: return '😐';
  }
}
```

---

## 🎨 **UI Flow Example**

```
1. User records voice note → "Recording..." ✅
2. Send for transcription → "Transcribing..." ✅  
3. User taps Save → "Processing with AI..." 🤖
4. Show AI results → "Found 2 contacts, 3 actions!" ✨
5. Navigate away → Voice note saved! 🎉
```

---

## 🔧 **Environment Variables Needed**

Add to your `.env`:

```bash
# Backend API
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app

# Or for local development
# EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## 📦 **Backend Endpoints Available**

### **1. Process Voice Note (with AI)**
```
POST /api/v1/agent/voice-note/process
Content-Type: multipart/form-data

FormData:
- audio: File (audio blob)
- transcription: string
- duration_seconds: number
- contact_id?: string (optional)

Response: VoiceNoteProcessingResult (see above)
```

### **2. Simple Save (without AI)**
```
POST /api/v1/voice-notes
Content-Type: multipart/form-data

FormData:
- audio: File
- transcription: string
- duration_seconds: number
- contact_id?: string

Response: { id: string, audio_url: string }
```

### **3. List Voice Notes**
```
GET /api/v1/voice-notes?contact_id=xxx

Response: Array<VoiceNote>
```

### **4. Get Single Voice Note**
```
GET /api/v1/voice-notes/:id

Response: VoiceNote with full details
```

### **5. Delete Voice Note**
```
DELETE /api/v1/voice-notes/:id

Response: { success: true }
```

---

## ✅ **Migration Checklist**

- [ ] Create `voice-notes` bucket in Supabase Storage (Quick fix)
- [ ] Set bucket RLS policies
- [ ] Create/update `services/voiceNotes.ts` with backend API calls
- [ ] Update recording component to use `processVoiceNote()`
- [ ] Add AI insights display component (optional)
- [ ] Update analytics tracking
- [ ] Test recording → processing → save flow
- [ ] Test on both web and mobile
- [ ] Remove direct Supabase Storage calls

---

## 🚀 **Benefits of Backend API Approach**

✅ **AI Features:**
- Automatic contact extraction
- Action item detection
- Sentiment analysis
- Smart categorization
- Tag suggestions

✅ **Better Architecture:**
- Centralized file storage
- Consistent error handling
- Rate limiting
- Audit logging
- Analytics tracking

✅ **Scalability:**
- Can swap storage providers
- Can add virus scanning
- Can add compression
- Can add transcription improvements

---

## 🐛 **Troubleshooting**

### **"Bucket not found" error**
→ Create the `voice-notes` bucket in Supabase Storage

### **"Failed to process voice note" error**
→ Check that OPENAI_API_KEY is set in Vercel environment variables

### **"No auth token found" error**
→ Verify user is logged in and token is in localStorage/AsyncStorage

### **Audio file too large**
→ Backend supports up to 25MB. Compress audio if needed.

---

## 📚 **Additional Resources**

- Backend Voice Note API: `backend-vercel/app/api/v1/agent/voice-note/`
- Agent Tools: `backend-vercel/lib/agent-tools.ts`
- Complete AI System: `backend-vercel/docs/AGENT_SYSTEM_DOCUMENTATION.md`

---

**Choose your path:**
1. **Quick Fix:** Create Supabase bucket (works immediately)
2. **Best Fix:** Integrate backend API (get AI features!)

Both will work, but the backend API gives you much more value! 🚀
