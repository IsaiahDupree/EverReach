# Contact CRUD Operations

## 📝 Complete CRUD Reference

### Create Contact

#### Basic Create
```typescript
import { usePeople } from '@/providers/PeopleProvider';

function CreateContactExample() {
  const { addPerson } = usePeople();
  
  const createContact = async () => {
    const newContact = await addPerson({
      fullName: 'John Doe',
      emails: ['john@example.com'],
      phones: ['+1234567890'],
      createdAt: Date.now()
    });
    
    console.log('Created with ID:', newContact.id);
  };
}
```

#### Create with All Fields
```typescript
const fullContact = await addPerson({
  fullName: 'Jane Smith',
  name: 'Jane Smith', // Short name
  emails: ['jane@company.com', 'jane@personal.com'],
  phones: ['+1234567890', '+0987654321'],
  company: 'Acme Corporation',
  title: 'Product Manager',
  tags: ['client', 'vip', 'tech'],
  interests: ['AI', 'Product Design', 'Running'],
  notes: 'Met at conference in NYC',
  cadenceDays: 14, // Follow up every 2 weeks
  warmth: 85, // Initial warmth score
  lastInteraction: new Date().toISOString(),
  lastInteractionSummary: 'Initial meeting at conference',
  createdAt: Date.now()
});
```

#### Create with Backend-Compatible Format
```typescript
// Emails and phones can be objects with types
const contact = await addPerson({
  fullName: 'Mike Johnson',
  emails: [
    { email: 'mike@work.com', type: 'work' },
    { email: 'mike@personal.com', type: 'personal' }
  ],
  phones: [
    { phone: '+1234567890', type: 'mobile' },
    { phone: '+0987654321', type: 'office' }
  ],
  createdAt: Date.now()
});
```

### Read Contacts

#### Get All Contacts
```typescript
function ContactsList() {
  const { people } = usePeople();
  
  console.log('Total contacts:', people.length);
  return <FlatList data={people} />;
}
```

#### Find Contact by ID
```typescript
function ContactDetail({ id }: { id: string }) {
  const { people } = usePeople();
  
  const contact = people.find(p => p.id === id);
  
  if (!contact) return <Text>Contact not found</Text>;
  
  return <Text>{contact.fullName}</Text>;
}
```

#### Search Contacts
```typescript
function SearchContacts() {
  const { people } = usePeople();
  const [query, setQuery] = useState('');
  
  const results = useMemo(() => {
    if (!query) return people;
    
    const lower = query.toLowerCase();
    return people.filter(p =>
      p.fullName.toLowerCase().includes(lower) ||
      p.company?.toLowerCase().includes(lower) ||
      p.emails?.some(e => 
        typeof e === 'string' 
          ? e.toLowerCase().includes(lower)
          : e.email.toLowerCase().includes(lower)
      )
    );
  }, [people, query]);
  
  return (
    <>
      <TextInput value={query} onChangeText={setQuery} />
      <FlatList data={results} />
    </>
  );
}
```

#### Filter by Tags
```typescript
function FilterByTag({ tag }: { tag: string }) {
  const { people } = usePeople();
  
  const filtered = people.filter(p =>
    p.tags?.includes(tag)
  );
  
  return <FlatList data={filtered} />;
}
```

#### Sort Contacts
```typescript
function SortedContacts() {
  const { people } = usePeople();
  
  // Sort by name
  const byName = useMemo(() =>
    [...people].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [people]
  );
  
  // Sort by last interaction (most recent first)
  const byRecent = useMemo(() =>
    [...people].sort((a, b) => {
      const dateA = a.lastInteraction ? new Date(a.lastInteraction).getTime() : 0;
      const dateB = b.lastInteraction ? new Date(b.lastInteraction).getTime() : 0;
      return dateB - dateA;
    }),
    [people]
  );
  
  // Sort by warmth (hottest first)
  const byWarmth = useMemo(() =>
    [...people].sort((a, b) => (b.warmth || 0) - (a.warmth || 0)),
    [people]
  );
  
  return <FlatList data={byName} />;
}
```

### Update Contact

#### Partial Update
```typescript
const { updatePerson } = usePeople();

// Update just tags
await updatePerson(contactId, {
  tags: ['vip', 'client']
});

// Update just company
await updatePerson(contactId, {
  company: 'New Company Inc'
});

// Update multiple fields
await updatePerson(contactId, {
  title: 'Senior Manager',
  company: 'Tech Corp',
  warmth: 90
});
```

#### Add Tag
```typescript
function AddTagButton({ contactId, tag }: { contactId: string; tag: string }) {
  const { people, updatePerson } = usePeople();
  
  const addTag = async () => {
    const contact = people.find(p => p.id === contactId);
    if (!contact) return;
    
    const existingTags = contact.tags || [];
    if (existingTags.includes(tag)) {
      Alert.alert('Tag already exists');
      return;
    }
    
    await updatePerson(contactId, {
      tags: [...existingTags, tag]
    });
  };
  
  return <Button onPress={addTag} title={`Add ${tag}`} />;
}
```

#### Remove Tag
```typescript
const removeTag = async (contactId: string, tagToRemove: string) => {
  const contact = people.find(p => p.id === contactId);
  if (!contact) return;
  
  await updatePerson(contactId, {
    tags: (contact.tags || []).filter(t => t !== tagToRemove)
  });
};
```

#### Update Last Interaction
```typescript
const recordInteraction = async (contactId: string, summary: string) => {
  await updatePerson(contactId, {
    lastInteraction: new Date().toISOString(),
    lastInteractionSummary: summary
  });
};
```

#### Update Warmth Score
```typescript
const updateWarmth = async (contactId: string, newScore: number) => {
  // Ensure score is between 0-100
  const normalizedScore = Math.max(0, Math.min(100, newScore));
  
  await updatePerson(contactId, {
    warmth: normalizedScore
  });
};
```

#### Bulk Update
```typescript
async function bulkUpdateTags(contactIds: string[], tag: string) {
  const promises = contactIds.map(id => {
    const contact = people.find(p => p.id === id);
    if (!contact) return Promise.resolve();
    
    return updatePerson(id, {
      tags: [...(contact.tags || []), tag]
    });
  });
  
  await Promise.all(promises);
}
```

### Delete Contact

#### Simple Delete
```typescript
const { deletePerson } = usePeople();

await deletePerson(contactId);
```

#### Delete with Confirmation
```typescript
function DeleteButton({ contactId, contactName }: Props) {
  const { deletePerson } = usePeople();
  
  const confirmDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePerson(contactId);
              Alert.alert('Success', 'Contact deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact');
            }
          }
        }
      ]
    );
  };
  
  return (
    <TouchableOpacity onPress={confirmDelete}>
      <Text style={{ color: 'red' }}>Delete</Text>
    </TouchableOpacity>
  );
}
```

#### Bulk Delete
```typescript
async function bulkDelete(contactIds: string[]) {
  const promises = contactIds.map(id => deletePerson(id));
  
  try {
    await Promise.allSettled(promises);
    Alert.alert('Deleted', `${contactIds.length} contacts deleted`);
  } catch (error) {
    Alert.alert('Error', 'Some contacts could not be deleted');
  }
}
```

## 🔄 Advanced Operations

### Upsert Pattern (Create or Update)
```typescript
async function upsertContact(email: string, updates: Partial<Person>) {
  const existing = people.find(p =>
    p.emails?.some(e =>
      typeof e === 'string' ? e === email : e.email === email
    )
  );
  
  if (existing) {
    // Update existing
    return await updatePerson(existing.id, updates);
  } else {
    // Create new
    return await addPerson({
      fullName: updates.fullName || 'New Contact',
      emails: [email],
      ...updates,
      createdAt: Date.now()
    });
  }
}
```

### Merge Duplicate Contacts
```typescript
async function mergeDuplicates(keepId: string, mergeId: string) {
  const keep = people.find(p => p.id === keepId);
  const merge = people.find(p => p.id === mergeId);
  
  if (!keep || !merge) return;
  
  // Combine data
  const merged = {
    emails: [...new Set([...keep.emails, ...merge.emails])],
    phones: [...new Set([...keep.phones, ...merge.phones])],
    tags: [...new Set([...(keep.tags || []), ...(merge.tags || [])])],
    interests: [...new Set([...(keep.interests || []), ...(merge.interests || [])])],
    notes: [keep.notes, merge.notes].filter(Boolean).join('\n\n'),
  };
  
  // Update primary contact
  await updatePerson(keepId, merged);
  
  // Delete duplicate
  await deletePerson(mergeId);
}
```

### Archive Contact (Soft Delete Alternative)
```typescript
// Add 'archived' tag instead of deleting
async function archiveContact(contactId: string) {
  const contact = people.find(p => p.id === contactId);
  if (!contact) return;
  
  await updatePerson(contactId, {
    tags: [...(contact.tags || []), 'archived']
  });
}

// Get non-archived contacts
const activeContacts = people.filter(p =>
  !p.tags?.includes('archived')
);
```

## 🎯 Real-World Examples

### Example 1: Contact Form
```typescript
function ContactForm({ contactId }: { contactId?: string }) {
  const { people, addPerson, updatePerson } = usePeople();
  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    email: '',
    phone: ''
  });
  
  const contact = contactId ? people.find(p => p.id === contactId) : null;
  
  useEffect(() => {
    if (contact) {
      setFormData({
        fullName: contact.fullName,
        company: contact.company || '',
        email: contact.emails?.[0] || '',
        phone: contact.phones?.[0] || ''
      });
    }
  }, [contact]);
  
  const handleSave = async () => {
    if (contactId) {
      await updatePerson(contactId, {
        fullName: formData.fullName,
        company: formData.company,
        emails: [formData.email],
        phones: [formData.phone]
      });
    } else {
      await addPerson({
        fullName: formData.fullName,
        company: formData.company,
        emails: [formData.email],
        phones: [formData.phone],
        createdAt: Date.now()
      });
    }
  };
  
  return (
    <View>
      <TextInput
        value={formData.fullName}
        onChangeText={text => setFormData({...formData, fullName: text})}
        placeholder="Full Name"
      />
      {/* More fields */}
      <Button onPress={handleSave} title="Save" />
    </View>
  );
}
```

### Example 2: Quick Actions Menu
```typescript
function ContactActions({ contactId }: { contactId: string }) {
  const { updatePerson, deletePerson } = usePeople();
  
  const actions = [
    {
      title: 'Mark as VIP',
      onPress: () => updatePerson(contactId, { tags: ['vip'] })
    },
    {
      title: 'Record Interaction',
      onPress: () => updatePerson(contactId, {
        lastInteraction: new Date().toISOString(),
        lastInteractionSummary: 'Quick check-in'
      })
    },
    {
      title: 'Archive',
      onPress: () => updatePerson(contactId, { tags: ['archived'] })
    },
    {
      title: 'Delete',
      onPress: () => deletePerson(contactId),
      destructive: true
    }
  ];
  
  return (
    <ActionSheet actions={actions} />
  );
}
```

## Next Steps

Continue to [04-basic-integration.md](./04-basic-integration.md) for integration walkthrough.
