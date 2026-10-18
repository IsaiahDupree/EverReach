# Contacts & People Management Integration Guide

## 📚 Overview

This folder contains complete documentation for integrating contact/people management into your Expo app using the PeopleProvider and contact APIs.

## 📂 Documentation Structure

### Core Architecture
- **[01-people-provider-overview.md](./01-people-provider-overview.md)** - PeopleProvider architecture and patterns
- **[02-contact-repositories.md](./02-contact-repositories.md)** - Repo layer (local + Supabase)
- **[03-contact-operations.md](./03-contact-operations.md)** - CRUD operations detailed

### Integration Guides
- **[04-basic-integration.md](./04-basic-integration.md)** - Getting started with contacts
- **[05-advanced-patterns.md](./05-advanced-patterns.md)** - Advanced usage patterns
- **[06-contact-import.md](./06-contact-import.md)** - Importing device contacts
- **[07-real-time-sync.md](./07-real-time-sync.md)** - Real-time updates

### Reference
- **[08-api-endpoints.md](./08-api-endpoints.md)** - All contact-related API endpoints
- **[09-troubleshooting.md](./09-troubleshooting.md)** - Common issues and solutions

## 🎯 Quick Start

### 1. Understand the Architecture
The contact system uses a three-layer architecture:

```
PeopleProvider (State Management)
    ↓
PeopleRepo (Hybrid Storage)
    ↓
Local Storage ↔ Backend API + Supabase
```

### 2. Basic Usage

```typescript
import { usePeople } from '@/providers/PeopleProvider';

function MyComponent() {
  const { people, addPerson, updatePerson, deletePerson } = usePeople();
  
  // Access contacts
  console.log('Contacts:', people);
  
  // Add contact
  const newContact = await addPerson({
    fullName: 'John Doe',
    emails: ['john@example.com'],
    phones: ['+1234567890']
  });
  
  // Update contact
  await updatePerson(contact.id, { tags: ['vip'] });
  
  // Delete contact
  await deletePerson(contact.id);
}
```

## 🔑 Key Features

### Hybrid Storage
- **Local Mode**: AsyncStorage for offline-first
- **Cloud Mode**: Supabase + Backend API
- **Automatic Switching**: Based on `FLAGS.LOCAL_ONLY`

### Real-time Sync
- Supabase real-time subscriptions
- Automatic UI updates on changes
- Optimistic updates for fast UX

### Contact Operations
- ✅ List all contacts
- ✅ Create new contact
- ✅ Update contact (partial or full)
- ✅ Delete contact (soft delete in backend)
- ✅ Search contacts
- ✅ Find by email/phone
- ✅ Import from device
- ✅ Warmth scoring

## 📊 Integration Checklist

### Basic Setup
- [ ] Wrap app with `PeopleProvider`
- [ ] Configure `FLAGS.LOCAL_ONLY` mode
- [ ] Set up Supabase connection (if cloud mode)
- [ ] Test basic CRUD operations

### Advanced Features
- [ ] Enable real-time subscriptions
- [ ] Implement contact search
- [ ] Add contact import flow
- [ ] Configure warmth scoring
- [ ] Add tags management

### Production Ready
- [ ] Test offline mode
- [ ] Test conflict resolution
- [ ] Add error boundaries
- [ ] Implement retry logic
- [ ] Add analytics tracking

## 🚀 Common Use Cases

### Use Case 1: Display Contact List
```typescript
const { people } = usePeople();

<FlatList
  data={people}
  renderItem={({ item }) => <ContactCard contact={item} />}
/>
```

### Use Case 2: Create Contact
```typescript
const { addPerson } = usePeople();

await addPerson({
  fullName: 'Jane Smith',
  emails: [{ email: 'jane@example.com', type: 'work' }],
  company: 'Acme Inc',
  tags: ['client']
});
```

### Use Case 3: Update Contact Tags
```typescript
const { updatePerson } = usePeople();

await updatePerson(contactId, {
  tags: [...existingTags, 'vip']
});
```

### Use Case 4: Search Contacts
```typescript
const { people } = usePeople();

const filtered = people.filter(p => 
  p.fullName.toLowerCase().includes(query.toLowerCase())
);
```

### Use Case 5: Import Device Contacts
See [06-contact-import.md](./06-contact-import.md) for complete guide.

## 🔐 Security & Privacy

- **RLS Policies**: All contacts are user-scoped
- **Authentication Required**: All API calls need auth token
- **Permissions**: Device contact access requires user consent
- **Data Isolation**: Users can only access their own contacts

## 📝 Data Structure

### Person Type
```typescript
type Person = {
  id: string;
  name: string;
  fullName: string;
  emails: string[] | Array<{email: string, type?: string}>;
  phones: string[] | Array<{phone: string, type?: string}>;
  company?: string;
  title?: string;
  tags?: string[];
  interests?: string[];
  lastInteraction?: string;
  lastInteractionSummary?: string;
  cadenceDays?: number;
  warmth?: number;
  createdAt?: number;
  notes?: string;
  avatar?: string;
};
```

### Backend Contact Schema
```typescript
{
  id: uuid;
  user_id: uuid;
  display_name: string;
  emails: jsonb[];
  phones: jsonb[];
  company?: string;
  tags?: string[];
  warmth?: number;
  last_interaction_at?: timestamp;
  created_at: timestamp;
  updated_at: timestamp;
  deleted_at?: timestamp;
}
```

## 🔗 Related Documentation

- **Agent Integration**: [../agent-integration/](../agent-integration/)
- **API Reference**: [../api-database-reference/](../api-database-reference/)
- **Database Tables**: [../api-database-reference/02-supabase-tables.md](../api-database-reference/02-supabase-tables.md)

## 🆘 Need Help?

- Check [09-troubleshooting.md](./09-troubleshooting.md) for common issues
- See example implementations in `fifth_pull/app/(tabs)/people.tsx`
- Review contact import flow in `fifth_pull/app/import-contacts.tsx`
