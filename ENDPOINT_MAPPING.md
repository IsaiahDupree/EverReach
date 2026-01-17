# Frontend Pages → Backend Endpoints Mapping

## Overview
This document maps each frontend page/screen to the backend API endpoints it should use. Currently, most data is stored locally in AsyncStorage. We need to migrate to use Supabase and backend REST/tRPC endpoints.

**Backend Base URL**: `https://ever-reach-be.vercel.app`
**Supabase Project**: `utasetfxiqcrnwyfforx`

---

## 🏠 Main Tab Screens

### 1. Home (`app/(tabs)/home.tsx`)
**Current**: Sample data from local storage
**Should Use**:
- `GET /api/v1/contacts` - List all contacts with recent activity
- `GET /api/recommendations/daily` - Get daily contact recommendations
- `GET /api/v1/interactions` - Recent interactions
- tRPC: `contacts.list` - Paginated contact list

**Integration Priority**: 🔴 HIGH

**Example Integration**:
```typescript
import { apiFetch } from '@/lib/api';
import { trpc } from '@/lib/trpc';

// Option 1: REST API
const response = await apiFetch('/api/v1/contacts?limit=20&order=last_interaction', { 
  requireAuth: true 
});
const contacts = await response.json();

// Option 2: tRPC
const { data: contacts } = trpc.contacts.list.useQuery();
```

---

### 2. People (`app/(tabs)/people.tsx`)
**Current**: Local AsyncStorage via `PeopleProvider` → `PeopleRepo`
**Should Use**:
- `GET /api/v1/contacts` - List all contacts
- `GET /api/v1/contacts?search=query` - Search contacts
- `GET /api/v1/search?q=query` - Global search
- `GET /api/v1/contacts?tags=tag1,tag2` - Filter by tags
- `GET /api/v1/warmth/recompute` - Recalculate warmth scores
- tRPC: `contacts.list`, `contacts.search`

**Current Data Source**: `providers/PeopleProvider.tsx` → `repos/PeopleRepo.ts`

**Integration Priority**: 🔴 HIGH

**Migration Steps**:
1. Update `PeopleRepo.ts` to use Supabase queries
2. Add pagination support
3. Implement real-time subscriptions for updates
4. Wire warmth calculations to backend

---

### 3. Chat (`app/(tabs)/chat.tsx`)
**Current**: Local storage for messages
**Should Use**:
- `GET /api/v1/messages` - List messages
- `POST /api/v1/messages` - Create message
- `GET /api/v1/messages/prepare` - Prepare draft message
- `POST /api/v1/messages/send` - Send message
- `POST /api/v1/compose` - AI-assisted composition
- `POST /api/v1/compose/validate` - Validate message
- tRPC: `messages.list`, `messages.send`

**Current Data Source**: `providers/MessageProvider.tsx`

**Integration Priority**: 🟡 MEDIUM

---

### 4. Events (`app/(tabs)/events.tsx`)
**Current**: Not implemented
**Should Use**:
- `GET /api/v1/interactions` - List interactions/events
- `POST /api/v1/interactions` - Create interaction
- `PUT /api/v1/interactions/[id]` - Update interaction
- `GET /api/v1/interactions/[id]/files` - Get interaction attachments

**Integration Priority**: 🟢 LOW

---

### 5. Settings (`app/(tabs)/settings.tsx`)
**Current**: Local preferences
**Should Use**:
- `GET /api/v1/me` - User profile
- `PUT /api/v1/me` - Update profile
- `GET /api/v1/me/account` - Account settings
- `GET /api/v1/me/compose-settings` - Composition preferences
- `PUT /api/v1/me/compose-settings` - Update preferences
- `GET /api/health` - Backend health (already integrated ✅)
- `GET /api/version` - Backend version (already integrated ✅)

**Integration Priority**: 🟡 MEDIUM

---

## 📱 Detail Screens

### 6. Contact Detail (`app/contact/[id].tsx`)
**Current**: Local storage
**Should Use**:
- `GET /api/v1/contacts/[id]` - Get contact details
- `PUT /api/v1/contacts/[id]` - Update contact
- `DELETE /api/v1/contacts/[id]` - Delete contact
- `GET /api/v1/contacts/[id]/messages` - Contact messages
- `GET /api/v1/contacts/[id]/notes` - Contact notes
- `GET /api/v1/contacts/[id]/files` - Contact files
- `GET /api/v1/contacts/[id]/tags` - Contact tags
- `PUT /api/v1/contacts/[id]/tags` - Update tags
- `POST /api/v1/contacts/[id]/warmth/recompute` - Recalculate warmth

**Integration Priority**: 🔴 HIGH

---

### 7. Contact Context (`app/contact-context/[id].tsx`)
**Should Use**:
- `GET /api/v1/contacts/[id]/context-summary` - AI-generated context
- `GET /api/v1/contacts/[id]/goal-suggestions` - Goal suggestions

**Integration Priority**: 🟡 MEDIUM

---

### 8. Contact Notes (`app/contact-notes/[id].tsx`)
**Should Use**:
- `GET /api/v1/contacts/[id]/notes` - List notes
- `POST /api/v1/contacts/[id]/notes` - Create note

**Integration Priority**: 🟡 MEDIUM

---

## 🎯 Feature Screens

### 9. Add Contact (`app/add-contact.tsx`)
**Current**: Creates in local storage
**Should Use**:
- `POST /api/v1/contacts` - Create new contact
- `POST /api/v1/merge/contacts` - Merge duplicate contacts

**Integration Priority**: 🔴 HIGH

**Current Flow**:
```typescript
// providers/PeopleProvider.tsx
const addPerson = useCallback((person: Omit<Person, 'id'>) => {
  const newPerson = { ...person, id: Date.now().toString() };
  PeopleRepo.upsert(newPerson);
  setPeople(prev => [...prev, newPerson]);
}, []);
```

**Should Be**:
```typescript
const addPerson = useCallback(async (person: Omit<Person, 'id'>) => {
  const response = await apiFetch('/api/v1/contacts', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(person)
  });
  const newContact = await response.json();
  setPeople(prev => [...prev, newContact]);
}, []);
```

---

### 10. Import Contacts (`app/import-contacts.tsx`)
**Should Use**:
- `POST /api/v1/contacts` (bulk) - Import multiple contacts
- `POST /api/files` - Upload contact file
- Contact parsing logic

**Integration Priority**: 🟢 LOW

---

### 11. Voice Notes (`app/voice-note.tsx`)
**Current**: Uses external `toolkit.rork.com` service
**Should Use**:
- `POST /api/v1/me/persona-notes` - Create voice note
- `POST /api/v1/me/persona-notes/[id]/transcribe` - Transcribe audio
- `GET /api/v1/me/persona-notes` - List notes
- `PUT /api/v1/me/persona-notes/[id]` - Update note
- `DELETE /api/v1/me/persona-notes/[id]` - Delete note
- Supabase Storage: `media-assets` bucket for audio files

**Current Data Source**: `providers/VoiceNotesProvider.tsx`

**Integration Priority**: 🟡 MEDIUM

**Note**: Backend has persona-note-specific transcription. May need generic `/api/v1/transcribe` endpoint.

---

### 12. Personal Notes (`app/personal-notes.tsx`)
**Should Use**:
- `GET /api/v1/me/persona-notes?type=text` - List personal notes
- `POST /api/v1/me/persona-notes` - Create note
- `PUT /api/v1/me/persona-notes/[id]` - Update note

**Integration Priority**: 🟢 LOW

---

### 13. Goals (`app/goal-picker.tsx`)
**Current**: Uses tRPC (already integrated! ✅)
**Uses**:
- tRPC: Contact goals queries (already working)

**Integration Priority**: ✅ DONE

---

### 14. Concierge Demo (`app/concierge-demo.tsx`)
**Current**: Uses tRPC (already integrated! ✅)
**Uses**:
- tRPC: Message crafting and recommendations

**Integration Priority**: ✅ DONE

---

### 15. Message Results (`app/message-results.tsx`)
**Should Use**:
- `GET /api/v1/messages/[id]` - Get message details
- Message tracking and analytics

**Integration Priority**: 🟢 LOW

---

## 🔐 Auth & Onboarding

### 16. Sign In (`app/sign-in.tsx`)
**Current**: Supabase Auth (already integrated! ✅)
**Uses**:
- Supabase: `supabase.auth.signInWithOAuth()`
- Redirect: `everreach://auth/callback`

**Integration Priority**: ✅ DONE

---

### 17. Auth Callback (`app/auth/callback.tsx`)
**Current**: Supabase Auth (already integrated! ✅)

**Integration Priority**: ✅ DONE

---

### 18. Onboarding (`app/onboarding.tsx`)
**Should Use**:
- `POST /api/v1/me` - Create user profile
- `PUT /api/v1/me/compose-settings` - Set initial preferences

**Integration Priority**: 🟡 MEDIUM

---

## 💰 Subscription & Billing

### 19. Subscription Plans (`app/subscription-plans.tsx`)
**Current**: Local mock data
**Should Use**:
- `GET /api/v1/me/entitlements` - User entitlements
- `POST /api/v1/billing/checkout` - Create checkout session
- `POST /api/v1/billing/portal` - Customer portal
- `POST /api/v1/billing/restore` - Restore purchases
- `POST /api/v1/billing/app-store/transactions` - Apple IAP
- `POST /api/v1/billing/play/transactions` - Google Play

**Current Data Source**: `providers/SubscriptionProvider.tsx`

**Integration Priority**: 🟡 MEDIUM

---

## 🧪 Test/Debug Screens

### 20. Health Status (`app/health-status.tsx`)
**Current**: Already integrated! ✅
**Uses**:
- `GET /api/health` - Health check
- `GET /api/version` - Version info

**Integration Priority**: ✅ DONE

---

### 21. Mode Settings (`app/mode-settings.tsx`)
**Current**: Already integrated! ✅
**Uses**:
- `apiFetch('/api/health')` - Health check via lib/api.ts

**Integration Priority**: ✅ DONE

---

### 22. tRPC Test (`app/trpc-test.tsx`)
**Current**: Testing tRPC connection
**Integration Priority**: ✅ DONE (for testing)

---

### 23. Supabase Test/Debug (`app/supabase-test.tsx`, `app/supabase-debug.tsx`)
**Current**: Testing Supabase connection
**Integration Priority**: ✅ DONE (for testing)

---

## 📊 Data Providers & Repos

### Current Architecture (Local-First)
```
Screen/Page
    ↓
Provider (React Context)
    ↓
Repo (Data Layer)
    ↓
AsyncStorage (Local KV Store)
```

### Target Architecture (API-First)
```
Screen/Page
    ↓
Provider (React Context)
    ↓
Repo (Data Layer)
    ↓  ↓  ↓
├─ apiFetch (REST)
├─ tRPC (Type-safe RPC)
└─ Supabase (Real-time DB)
```

---

## 🔄 Providers to Migrate

### 1. PeopleProvider ✅ Ready to Migrate
**File**: `providers/PeopleProvider.tsx`
**Repo**: `repos/PeopleRepo.ts`
**Target**:
- Replace `PeopleRepo` with Supabase queries
- Use `apiFetch('/api/v1/contacts')` for REST
- Use `trpc.contacts.list` for tRPC
- Add real-time subscriptions

---

### 2. MessageProvider ✅ Ready to Migrate
**File**: `providers/MessageProvider.tsx`
**Target**:
- Use `/api/v1/messages` endpoints
- Integrate with tRPC `messages` router

---

### 3. VoiceNotesProvider ✅ Ready to Migrate
**File**: `providers/VoiceNotesProvider.tsx`
**Target**:
- Use `/api/v1/me/persona-notes`
- Upload audio to Supabase Storage `media-assets`
- Use backend transcription endpoint

---

### 4. SubscriptionProvider ✅ Ready to Migrate
**File**: `providers/SubscriptionProvider.tsx`
**Target**:
- Use `/api/v1/me/entitlements`
- Integrate with Stripe/IAP endpoints

---

### 5. AuthProvider ✅ Already Integrated
**File**: `providers/AuthProvider.tsx`
**Status**: Uses Supabase Auth correctly

---

### 6. AppSettingsProvider ⚠️ Keep Local
**File**: `providers/AppSettingsProvider.tsx`
**Status**: Theme and UI settings can stay local

---

### 7. WarmthSettingsProvider ✅ Hybrid
**File**: `providers/WarmthSettingsProvider.tsx`
**Target**:
- Keep local settings
- Use `/api/v1/warmth/recompute` for calculations

---

### 8. OnboardingProvider ⚠️ Keep Local
**File**: `providers/OnboardingProvider.tsx`
**Status**: Onboarding state can stay local

---

## 🎯 Integration Priority Summary

### Phase 1: Core Features (HIGH Priority)
1. ✅ Auth & Health Check (DONE)
2. 🔴 **PeopleProvider** → Contacts API
3. 🔴 **Add Contact** → Create contact API
4. 🔴 **Contact Detail** → Contact CRUD API

### Phase 2: Interactions (MEDIUM Priority)
5. 🟡 **MessageProvider** → Messages API
6. 🟡 **VoiceNotesProvider** → Persona Notes API
7. 🟡 **Settings** → User profile API
8. 🟡 **SubscriptionProvider** → Entitlements API

### Phase 3: Advanced Features (LOW Priority)
9. 🟢 **Events** → Interactions API
10. 🟢 **Import Contacts** → Bulk import
11. 🟢 **Analytics & Tracking** → Telemetry API

---

## 🛠 Integration Pattern

### Standard Integration Template

```typescript
// 1. In repos/PeopleRepo.ts
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export const PeopleRepo = {
  async all(): Promise<Person[]> {
    // Option A: REST API
    const response = await apiFetch('/api/v1/contacts', { requireAuth: true });
    return response.json();
    
    // Option B: Supabase Direct
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('last_interaction', { ascending: false });
    if (error) throw error;
    return data;
  },

  async upsert(person: Person): Promise<void> {
    if (person.id) {
      // Update existing
      await apiFetch(`/api/v1/contacts/${person.id}`, {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify(person)
      });
    } else {
      // Create new
      await apiFetch('/api/v1/contacts', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(person)
      });
    }
  },
};
```

### With tRPC

```typescript
// In components
import { trpc } from '@/lib/trpc';

function PeopleList() {
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery();
  const createContact = trpc.contacts.create.useMutation();

  const handleAdd = async (contact: NewContact) => {
    await createContact.mutateAsync(contact);
  };
}
```

---

## 📝 Next Steps

1. **Start with PeopleProvider Migration**:
   - Update `repos/PeopleRepo.ts` to use Supabase
   - Add error handling and loading states
   - Test with real backend data

2. **Create Supabase Repo Adapter**:
   - Create `repos/SupabaseContactsRepo.ts`
   - Implement all CRUD operations
   - Add caching and optimistic updates

3. **Wire up Add Contact**:
   - Use `POST /api/v1/contacts`
   - Invalidate cache after creation

4. **Migrate Contact Detail**:
   - Fetch from backend
   - Enable real-time updates

5. **Test End-to-End**:
   - Create contact in app
   - Verify it appears in Supabase dashboard
   - Check backend logs for API calls

---

## 🔗 Useful Links

- **Backend API Base**: `https://ever-reach-be.vercel.app`
- **OpenAPI Spec**: `https://ever-reach-be.vercel.app/api/v1/.well-known/openapi.json`
- **Supabase Dashboard**: `https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx`
- **API Helper**: `fifth_pull/lib/api.ts`
- **tRPC Client**: `fifth_pull/lib/trpc.ts`

---

*Last Updated: 2025-09-30 12:48 EDT*
*Status: Planning Phase - Ready to implement Phase 1*
