# PeopleProvider Overview

## 🏗️ Architecture

The PeopleProvider is a React Context provider that manages contact/people state across your application.

### Layer Structure

```
┌─────────────────────────────────────┐
│     UI Components (React)           │
│  (people.tsx, contact/[id].tsx)     │
└──────────────┬──────────────────────┘
               │ usePeople()
┌──────────────▼──────────────────────┐
│      PeopleProvider (Context)       │
│  - State management                 │
│  - Real-time subscriptions          │
│  - Business logic                   │
└──────────────┬──────────────────────┘
               │ PeopleRepo
┌──────────────▼──────────────────────┐
│       PeopleRepo (Hybrid)           │
│  if LOCAL_ONLY:                     │
│    → LocalPeopleRepo                │
│  else:                              │
│    → SupabaseContactsRepo           │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────┐   ┌───────▼────────┐
│AsyncStorage│   │Backend API     │
│(Local)     │   │+ Supabase      │
└────────────┘   └────────────────┘
```

## 🎯 Core Responsibilities

### 1. State Management
- Maintains global list of contacts
- Provides CRUD operations
- Handles optimistic updates

### 2. Real-time Sync
- Subscribes to Supabase changes
- Auto-updates UI on remote changes
- Prevents duplicate entries

### 3. Business Logic
- Warmth score calculations
- Interaction tracking
- Tag management

## 📝 API Surface

### Hook: `usePeople()`

```typescript
const {
  people,              // Person[] - All contacts
  addPerson,           // (person) => Promise<Person>
  updatePerson,        // (id, updates) => Promise<Person>
  deletePerson,        // (id) => Promise<void>
  getWarmthStatus,     // (id) => 'hot'|'warm'|'cool'|'cold'
  getWarmthScore,      // (id) => number (0-100)
} = usePeople();
```

## 🔄 Data Flow

### Creating a Contact

```
1. UI calls addPerson()
   ↓
2. PeopleProvider.addPerson()
   - Adds defaults (warmth, timestamps)
   - Generates temporary ID
   ↓
3. PeopleRepo.upsert()
   - Routes to Local or Supabase repo
   ↓
4. Backend/Storage
   - Saves contact
   - Returns with real ID
   ↓
5. PeopleProvider updates state
   - Replaces temp contact with real one
   - Triggers re-render
   ↓
6. UI updates automatically
```

### Real-time Update

```
1. Another device updates contact
   ↓
2. Supabase broadcasts change
   ↓
3. PeopleProvider subscription receives event
   ↓
4. State updated based on event type:
   - INSERT: Add to list (if not duplicate)
   - UPDATE: Replace existing
   - DELETE: Remove from list
   ↓
5. UI re-renders with new data
```

## 💾 Storage Modes

### Local-Only Mode (`FLAGS.LOCAL_ONLY = true`)

**Storage**: AsyncStorage  
**Sync**: None  
**Best For**: Development, offline-first, privacy-focused

```typescript
// Data stored at: people/{id}
{
  id: "local-uuid",
  fullName: "John Doe",
  emails: ["john@example.com"]
  // ... other fields
}
```

### Cloud Mode (`FLAGS.LOCAL_ONLY = false`)

**Storage**: Supabase + Backend API  
**Sync**: Real-time via Supabase subscriptions  
**Best For**: Production, multi-device sync

```typescript
// Backend API: /api/v1/contacts
// Supabase table: contacts
{
  id: "uuid-from-backend",
  user_id: "auth-user-id",
  display_name: "John Doe",
  emails: [{"email": "john@example.com"}]
  // ... other fields
}
```

## 🎨 Usage Patterns

### Pattern 1: List All Contacts

```typescript
function ContactsList() {
  const { people } = usePeople();
  
  return (
    <FlatList
      data={people}
      renderItem={({ item }) => (
        <Text>{item.fullName}</Text>
      )}
    />
  );
}
```

### Pattern 2: Create Contact

```typescript
function AddContactButton() {
  const { addPerson } = usePeople();
  
  const handleAdd = async () => {
    try {
      const newContact = await addPerson({
        fullName: 'Jane Doe',
        emails: ['jane@example.com'],
        createdAt: Date.now()
      });
      console.log('Created:', newContact.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to create contact');
    }
  };
  
  return <Button onPress={handleAdd} title="Add" />;
}
```

### Pattern 3: Update Contact

```typescript
function UpdateContactTags({ contactId }: { contactId: string }) {
  const { updatePerson } = usePeople();
  
  const addTag = async (tag: string) => {
    await updatePerson(contactId, {
      tags: [...existingTags, tag]
    });
  };
  
  return <Button onPress={() => addTag('vip')} title="Add VIP Tag" />;
}
```

### Pattern 4: Delete Contact

```typescript
function DeleteContactButton({ contactId }: { contactId: string }) {
  const { deletePerson } = usePeople();
  
  const handleDelete = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePerson(contactId);
          }
        }
      ]
    );
  };
  
  return <Button onPress={handleDelete} title="Delete" color="red" />;
}
```

### Pattern 5: Warmth Calculation

```typescript
function ContactWarmth({ contactId }: { contactId: string }) {
  const { getWarmthStatus, getWarmthScore } = usePeople();
  
  const status = getWarmthStatus(contactId); // 'hot'|'warm'|'cool'|'cold'
  const score = getWarmthScore(contactId);   // 0-100
  
  return (
    <View>
      <Text>Status: {status}</Text>
      <Text>Score: {score}/100</Text>
    </View>
  );
}
```

## 🔧 Configuration

### Setup in Root Layout

```typescript
// app/_layout.tsx
import { PeopleProvider } from '@/providers/PeopleProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <WarmthSettingsProvider>
        <PeopleProvider>
          {/* Your app */}
        </PeopleProvider>
      </WarmthSettingsProvider>
    </AuthProvider>
  );
}
```

### Dependencies

PeopleProvider requires:
1. **AuthProvider** - For user authentication
2. **WarmthSettingsProvider** - For warmth calculation settings

## 🎯 Best Practices

### 1. Always Handle Errors

```typescript
try {
  await addPerson(newContact);
} catch (error) {
  console.error('Failed to add:', error);
  Alert.alert('Error', 'Could not add contact');
}
```

### 2. Use Optimistic Updates

```typescript
// Update UI immediately
setPeople(prev => [...prev, tempContact]);

// Then sync with backend
try {
  const real = await addPerson(tempContact);
  setPeople(prev => prev.map(p => p.id === temp.id ? real : p));
} catch (error) {
  // Revert on failure
  setPeople(prev => prev.filter(p => p.id !== temp.id));
}
```

### 3. Debounce Search

```typescript
import { useMemo } from 'react';

function useContactSearch(query: string) {
  const { people } = usePeople();
  
  return useMemo(() => {
    if (!query) return people;
    const lower = query.toLowerCase();
    return people.filter(p =>
      p.fullName.toLowerCase().includes(lower) ||
      p.company?.toLowerCase().includes(lower)
    );
  }, [people, query]);
}
```

### 4. Memoize Expensive Calculations

```typescript
const sortedPeople = useMemo(() => {
  return [...people].sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );
}, [people]);
```

## 📊 Performance Considerations

### Real-time Subscription
- Only active when not in LOCAL_ONLY mode
- Automatically cleaned up on unmount
- Prevents duplicate inserts with existence check

### State Updates
- Uses functional updates to prevent stale closures
- Memoizes returned values to prevent unnecessary re-renders

### Initial Load
- Loads sample data if no contacts exist
- Async load doesn't block UI

## Next Steps

Continue to [02-contact-repositories.md](./02-contact-repositories.md) to understand the repository layer.
