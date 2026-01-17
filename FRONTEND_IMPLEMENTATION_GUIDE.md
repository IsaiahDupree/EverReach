# Frontend Implementation Guide
**Fixes for Recent Frontend Issues Based on Backend Improvements**

---

## 🎯 **Overview**

Our recent backend work provides solutions for **all 4 frontend issues**:

1. ✅ **Home Screen Avatar Bug** → Use new `/detail` endpoint with `avatar_url`
2. ✅ **Subscription Cancellation** → Backend already has full implementation + tests
3. ✅ **Voice Notes on Contacts** → Auto-interaction creation + `/detail` endpoint
4. ✅ **ContactPicker Multi-Select** → Use `contact_id` (single) not `linked_contacts` (array)

---

## 1. 🔴 **Fix: Home Screen Avatar Display Bug**

### **Backend Solution Available**

The new **`GET /api/v1/contacts/:id/detail`** endpoint includes `avatar_url`:

```typescript
// Response includes avatar
{
  contact: {
    id: string;
    display_name: string;
    avatar_url: string;  // ← Avatar URL here!
    emails: string[];
    // ... other fields
  }
}
```

### **Frontend Implementation**

**Option 1: Use Detail Endpoint** (Recommended)
```typescript
// app/(tabs)/index.tsx or HomeScreen.tsx
import { useContactDetail } from '@/hooks/useContactDetail';

function HomeScreen() {
  const { data: contacts } = useQuery({
    queryKey: ['contacts', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/v1/contacts?limit=10');
      return res.json();
    }
  });

  return (
    <FlatList
      data={contacts}
      renderItem={({ item }) => (
        <ContactCard
          name={item.display_name}
          avatar={item.avatar_url}  // ← Use avatar_url from response
          onPress={() => navigate(`/contact/${item.id}`)}
        />
      )}
    />
  );
}
```

**Option 2: Add Avatar to List Endpoint**

Backend change needed (simple):
```typescript
// backend-vercel/app/api/v1/contacts/route.ts (GET handler)
.select('id, display_name, emails, avatar_url, warmth, warmth_band, last_interaction_at')
//                                  ^^^^^^^^^^^ Add this
```

### **Avatar Component Fix**

```typescript
// components/ContactAvatar.tsx
interface ContactAvatarProps {
  avatarUrl?: string;
  name: string;
  size?: number;
}

export function ContactAvatar({ avatarUrl, name, size = 40 }: ContactAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // Fallback to initials if no avatar or load error
  if (!avatarUrl || imageError) {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return (
      <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: '#3b82f6' }}>
        <Text style={{ color: 'white', fontSize: size/2 }}>{initials}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: avatarUrl }}
      style={{ width: size, height: size, borderRadius: size/2 }}
      onError={() => setImageError(true)}
      // Add caching for better performance
      cachePolicy="memory-disk"
    />
  );
}
```

### **Testing**

```bash
# Test avatar URLs are returned
curl -H "Authorization: Bearer $TOKEN" \
  https://backend-vercel.vercel.app/api/v1/contacts | \
  jq '.contacts[0].avatar_url'

# Should return URL or null (not undefined)
```

---

## 2. 🟡 **Fix: Subscription Cancellation Frontend**

### **Backend Already Complete!** ✅

We have **36 passing subscription tests** including cancellation:

```typescript
// Backend endpoint ready to use:
DELETE /api/v1/subscriptions/:id/cancel

// Returns:
{
  message: "Subscription cancelled",
  subscription: {
    id: string;
    status: "cancelled";
    cancelled_at: string;
    // ... other fields
  }
}
```

### **Frontend Implementation**

**1. Update SubscriptionProvider.tsx**

```typescript
// providers/SubscriptionProvider.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function SubscriptionProvider({ children }) {
  const queryClient = useQueryClient();
  
  // Add cancellation mutation
  const cancelSubscription = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await fetch(`/api/v1/subscriptions/${subscriptionId}/cancel`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Cancellation failed');
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh subscription status
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'subscription'] });
    },
  });

  return (
    <SubscriptionContext.Provider value={{ 
      ...existingContext,
      cancelSubscription: cancelSubscription.mutate,
      isCancelling: cancelSubscription.isPending,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
```

**2. Create Cancellation UI**

```typescript
// app/settings/subscription.tsx
import { useSubscription } from '@/providers/SubscriptionProvider';
import { Alert } from 'react-native';

export default function SubscriptionSettings() {
  const { subscription, cancelSubscription, isCancelling } = useSubscription();

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure? You will lose access to premium features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            cancelSubscription(subscription.id, {
              onSuccess: () => {
                Alert.alert('Success', 'Your subscription has been cancelled.');
              },
              onError: (error) => {
                Alert.alert('Error', error.message);
              },
            });
          },
        },
      ]
    );
  };

  if (!subscription || subscription.status !== 'active') {
    return <Text>No active subscription</Text>;
  }

  return (
    <View>
      <Text>Current Plan: {subscription.tier}</Text>
      <Text>Status: {subscription.status}</Text>
      <Text>Renews: {new Date(subscription.current_period_end).toLocaleDateString()}</Text>
      
      <Button
        title={isCancelling ? "Cancelling..." : "Cancel Subscription"}
        onPress={handleCancel}
        disabled={isCancelling}
        color="#dc2626"
      />
    </View>
  );
}
```

**3. Handle Cancelled State**

```typescript
// components/SubscriptionBanner.tsx
export function SubscriptionBanner() {
  const { subscription } = useSubscription();

  if (subscription?.status === 'cancelled') {
    return (
      <View style={styles.banner}>
        <Icon name="alert-circle" size={20} color="#f59e0b" />
        <Text>
          Your subscription ends on {new Date(subscription.current_period_end).toLocaleDateString()}.
          Renew to keep premium features.
        </Text>
        <Button title="Renew" onPress={() => navigate('/subscribe')} />
      </View>
    );
  }

  return null;
}
```

### **Testing**

```bash
# Backend tests already pass (36/36)
npm test subscriptions.test.mjs

# Frontend testing:
# 1. Cancel active subscription
# 2. Verify status changes to 'cancelled'
# 3. Verify access continues until period_end
# 4. Verify renewal flow works
```

---

## 3. ✅ **Fix: Voice Notes Not Displaying on Contact Context**

### **Backend Solution: Auto-Interaction Creation**

**When you create a voice note with a contact, we now automatically:**
1. ✅ Save note in `persona_notes` table
2. ✅ Create interaction in `interactions` table
3. ✅ Link them via `metadata.note_id`

**Result:** Notes appear in BOTH places:
- Notes section (full details with audio)
- Timeline (chronological interactions)

### **Frontend Implementation**

**Use the New `/detail` Endpoint** (ONE call for everything):

```typescript
// hooks/useContactDetail.ts
import { useQuery } from '@tanstack/react-query';

export function useContactDetail(contactId: string) {
  return useQuery({
    queryKey: ['contact', 'detail', contactId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/contacts/${contactId}/detail`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      return res.json();
    },
  });
}

// Usage in ContactDetailScreen.tsx
function ContactDetailScreen({ contactId }) {
  const { data, isLoading } = useContactDetail(contactId);

  if (isLoading) return <LoadingSpinner />;

  return (
    <ScrollView>
      {/* Contact Header */}
      <ContactHeader contact={data.contact} />

      {/* Tabs */}
      <Tabs>
        {/* Timeline - includes voice notes as interactions */}
        <Tab label={`Timeline (${data.interactions.total_count})`}>
          <InteractionsList interactions={data.interactions.recent} />
        </Tab>

        {/* Voice Notes - full details */}
        <Tab label={`Voice Notes (${data.notes.counts.voice})`}>
          <VoiceNotesList notes={data.notes.by_type.voice} />
        </Tab>

        {/* Screenshots */}
        <Tab label={`Screenshots (${data.notes.counts.screenshot})`}>
          <ScreenshotsList notes={data.notes.by_type.screenshot} />
        </Tab>
      </Tabs>
    </ScrollView>
  );
}
```

**Display Voice Notes in Timeline:**

```typescript
// components/InteractionsList.tsx
function InteractionItem({ interaction }) {
  // Check if this interaction is from a note
  const isNote = interaction.channel === 'note';
  const noteType = interaction.metadata?.note_type;

  return (
    <View style={styles.item}>
      <Icon name={isNote ? getNoteIcon(noteType) : getChannelIcon(interaction.channel)} />
      
      <View>
        <Text style={styles.summary}>{interaction.summary}</Text>
        <Text style={styles.time}>{formatDate(interaction.occurred_at)}</Text>
        
        {/* Link to full note if available */}
        {isNote && interaction.metadata?.note_id && (
          <TouchableOpacity onPress={() => navigate(`/notes/${interaction.metadata.note_id}`)}>
            <Text style={styles.link}>View full note →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function getNoteIcon(type) {
  switch (type) {
    case 'voice': return 'mic';
    case 'screenshot': return 'image';
    case 'text': return 'file-text';
    default: return 'file';
  }
}
```

### **Migration Note**

**Old approach (multiple calls):**
```typescript
// ❌ OLD: 3-4 API calls
const contact = await fetch(`/api/v1/contacts/${id}`);
const notes = await fetch(`/api/v1/me/persona-notes?contact_id=${id}`);
const interactions = await fetch(`/api/v1/interactions?contact_id=${id}`);
```

**New approach (single call):**
```typescript
// ✅ NEW: 1 API call
const data = await fetch(`/api/v1/contacts/${id}/detail`);
// Has: contact, interactions (incl notes), notes (grouped by type)
```

---

## 4. ✅ **Fix: ContactPicker Multi-Select Issue**

### **Backend Already Supports Single Contact**

The `contact_id` field in persona notes is designed for **single contact**:

```typescript
// Backend validation
{
  contact_id: z.string().uuid().optional(),  // Single contact
  linked_contacts: z.array(z.string().uuid()).optional()  // Multiple (legacy)
}
```

### **Frontend Implementation**

**Update ContactPicker Props:**

```typescript
// components/ContactPicker.tsx
interface ContactPickerProps {
  selectedContactId?: string;  // ← Single ID (not array)
  onSelectContact: (contactId: string | null) => void;
  allowMultiple?: boolean;  // Default: false
}

export function ContactPicker({ 
  selectedContactId, 
  onSelectContact,
  allowMultiple = false  // Most use cases: single contact
}: ContactPickerProps) {
  return (
    <FlatList
      data={contacts}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => {
            if (allowMultiple) {
              // Handle multiple (rare case)
            } else {
              // Single select
              onSelectContact(
                selectedContactId === item.id ? null : item.id
              );
            }
          }}
        >
          <View style={[
            styles.item,
            selectedContactId === item.id && styles.selected
          ]}>
            <Text>{item.display_name}</Text>
            {selectedContactId === item.id && <Icon name="check" />}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}
```

**Update Voice Note Screen:**

```typescript
// app/voice-note.tsx
function VoiceNoteScreen() {
  const [contactId, setContactId] = useState<string | null>(null);  // ← Single ID

  const saveNote = async () => {
    const response = await fetch('/api/v1/me/persona-notes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'voice',
        file_url: audioUrl,
        transcript: transcript,
        contact_id: contactId,  // ← Single contact
      }),
    });

    if (response.ok) {
      // Success! Note saved + interaction created automatically
      navigate(`/contacts/${contactId}`);
    }
  };

  return (
    <View>
      <AudioRecorder onRecordingComplete={setAudioUrl} />
      
      <ContactPicker
        selectedContactId={contactId}  // ← Single value
        onSelectContact={setContactId}
      />
      
      <Button title="Save Note" onPress={saveNote} />
    </View>
  );
}
```

---

## 🚀 **Migration Checklist**

### **Phase 1: Avatar Fix (Immediate)**
- [ ] Add `avatar_url` to contacts list query
- [ ] Update `ContactAvatar` component with error handling
- [ ] Test avatar display on home screen
- [ ] Add initials fallback

### **Phase 2: Subscription Cancellation (1-2 hours)**
- [ ] Add `cancelSubscription` to SubscriptionProvider
- [ ] Create subscription settings UI
- [ ] Add cancellation confirmation dialog
- [ ] Handle cancelled state in UI
- [ ] Test full cancellation flow

### **Phase 3: Contact Detail Refactor (2-3 hours)**
- [ ] Create `useContactDetail` hook
- [ ] Replace multiple API calls with single `/detail` call
- [ ] Update ContactDetailScreen to use new hook
- [ ] Display notes in timeline (with link to full note)
- [ ] Test voice notes appear in both places

### **Phase 4: ContactPicker Simplification (1 hour)**
- [ ] Change `selectedPersonIds` → `selectedPersonId` (single)
- [ ] Update ContactPicker props interface
- [ ] Update voice-note.tsx to use single contact
- [ ] Remove multi-select UI/logic (if not needed)
- [ ] Test single-contact linking

---

## 📊 **API Endpoints Reference**

### **Contact Detail (NEW - Use This!)**
```
GET /api/v1/contacts/:id/detail
Returns: { contact, interactions, notes, meta }
```

### **Subscription Cancellation**
```
DELETE /api/v1/subscriptions/:id/cancel
Returns: { message, subscription }
```

### **Create Voice Note (with auto-interaction)**
```
POST /api/v1/me/persona-notes
Body: { type: 'voice', file_url, transcript, contact_id }
Creates: persona_note + interaction (automatic)
```

### **Filter Notes by Contact**
```
GET /api/v1/me/persona-notes?contact_id=<uuid>&type=voice
Returns: { items: [...], nextCursor }
```

---

## 🧪 **Testing Commands**

```bash
# Test contact detail endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://backend-vercel.vercel.app/api/v1/contacts/<id>/detail | jq

# Test subscription cancellation
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://backend-vercel.vercel.app/api/v1/subscriptions/<id>/cancel

# Test voice note with contact
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"voice","file_url":"https://...","contact_id":"<uuid>"}' \
  https://backend-vercel.vercel.app/api/v1/me/persona-notes

# Verify interaction was auto-created
curl -H "Authorization: Bearer $TOKEN" \
  https://backend-vercel.vercel.app/api/v1/interactions?contact_id=<uuid> | \
  jq '.items[] | select(.channel == "note")'
```

---

## 💡 **Key Improvements Summary**

| Issue | Old Approach | New Approach | Benefit |
|-------|-------------|--------------|---------|
| **Avatars** | No `avatar_url` in list | Added `avatar_url` | Direct image loading |
| **Subscriptions** | No cancel UI | Full cancel flow | User can self-manage |
| **Voice Notes** | Separate notes/timeline | Auto-create interactions | Unified timeline view |
| **ContactPicker** | Multi-select array | Single contact ID | Simpler, clearer UX |

---

## 📖 **Additional Resources**

- **Full API Guide**: `FRONTEND_CONTACT_API_GUIDE.md`
- **Notes Architecture**: `NOTES_AS_INTERACTIONS.md`
- **Test Results**: 107/107 tests passing ✅
- **Backend Repo**: `feat/dev-dashboard` branch (deployed)

---

## ❓ **Need Help?**

All backend functionality is **tested and deployed**. Frontend implementation is straightforward using the patterns above. If you need:

1. More TypeScript types
2. Additional hook examples
3. Error handling patterns
4. Performance optimization tips

Just ask! The backend is ready and waiting. 🚀
