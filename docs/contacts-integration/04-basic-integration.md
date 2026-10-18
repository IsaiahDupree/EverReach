# Basic Integration Guide

## 🚀 Step-by-Step Integration

### Step 1: Setup Provider

Wrap your app with `PeopleProvider` in `app/_layout.tsx`:

```typescript
import { PeopleProvider } from '@/providers/PeopleProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { WarmthSettingsProvider } from '@/providers/WarmthSettingsProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <WarmthSettingsProvider>
        <PeopleProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Other screens */}
          </Stack>
        </PeopleProvider>
      </WarmthSettingsProvider>
    </AuthProvider>
  );
}
```

**Important**: PeopleProvider depends on:
- `AuthProvider` - Must be ancestor
- `WarmthSettingsProvider` - Must be ancestor

### Step 2: Configure Storage Mode

Set storage mode in `constants/flags.ts`:

```typescript
export const FLAGS = {
  // false = Cloud Mode (Supabase + Backend API)
  // true = Local Only (AsyncStorage)
  LOCAL_ONLY: false,
};
```

**Recommendation**: Use `false` for production.

### Step 3: Display Contacts List

Create a simple contacts list screen:

```typescript
// app/(tabs)/people.tsx
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { usePeople } from '@/providers/PeopleProvider';

export default function PeopleScreen() {
  const { people } = usePeople();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contacts ({people.length})</Text>
      <FlatList
        data={people}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.contactCard}>
            <Text style={styles.name}>{item.fullName}</Text>
            <Text style={styles.company}>{item.company}</Text>
            <Text style={styles.email}>
              {typeof item.emails?.[0] === 'string' 
                ? item.emails[0] 
                : item.emails?.[0]?.email}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  contactCard: { 
    padding: 16, 
    backgroundColor: '#f9f9f9', 
    borderRadius: 8, 
    marginBottom: 8 
  },
  name: { fontSize: 18, fontWeight: '600' },
  company: { fontSize: 14, color: '#666', marginTop: 4 },
  email: { fontSize: 12, color: '#999', marginTop: 4 },
});
```

### Step 4: Create Contact Form

Add a form to create new contacts:

```typescript
// app/add-contact.tsx
import { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { usePeople } from '@/providers/PeopleProvider';

export default function AddContactScreen() {
  const { addPerson } = usePeople();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      await addPerson({
        fullName: name,
        emails: email ? [email] : [],
        phones: phone ? [phone] : [],
        company: company || undefined,
        createdAt: Date.now()
      });
      
      Alert.alert('Success', 'Contact created!');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create contact');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Company"
        value={company}
        onChangeText={setCompany}
      />
      <Button title="Save Contact" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16
  }
});
```

### Step 5: Contact Detail Screen

Create a screen to view and edit contact details:

```typescript
// app/contact/[id].tsx
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePeople } from '@/providers/PeopleProvider';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { people, updatePerson, deletePerson } = usePeople();
  
  const contact = people.find(p => p.id === id);
  
  if (!contact) {
    return (
      <View style={styles.container}>
        <Text>Contact not found</Text>
      </View>
    );
  }
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Delete ${contact.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePerson(contact.id);
            router.back();
          }
        }
      ]
    );
  };
  
  const handleAddVIP = async () => {
    await updatePerson(contact.id, {
      tags: [...(contact.tags || []), 'vip']
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{contact.fullName}</Text>
      
      {contact.company && (
        <Text style={styles.company}>{contact.company}</Text>
      )}
      
      {contact.emails && contact.emails.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Email:</Text>
          {contact.emails.map((e, i) => (
            <Text key={i}>
              {typeof e === 'string' ? e : e.email}
            </Text>
          ))}
        </View>
      )}
      
      {contact.phones && contact.phones.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Phone:</Text>
          {contact.phones.map((p, i) => (
            <Text key={i}>
              {typeof p === 'string' ? p : p.phone}
            </Text>
          ))}
        </View>
      )}
      
      {contact.tags && contact.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Tags:</Text>
          <Text>{contact.tags.join(', ')}</Text>
        </View>
      )}
      
      <View style={styles.actions}>
        <Button title="Add VIP Tag" onPress={handleAddVIP} />
        <Button title="Delete" onPress={handleDelete} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  company: { fontSize: 18, color: '#666', marginBottom: 16 },
  section: { marginTop: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  actions: { marginTop: 32, gap: 12 }
});
```

### Step 6: Add Search Functionality

Implement contact search:

```typescript
// In your people screen
import { useState, useMemo } from 'react';
import { TextInput } from 'react-native';

export default function PeopleScreen() {
  const { people } = usePeople();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPeople = useMemo(() => {
    if (!searchQuery) return people;
    
    const lower = searchQuery.toLowerCase();
    return people.filter(p =>
      p.fullName.toLowerCase().includes(lower) ||
      p.company?.toLowerCase().includes(lower) ||
      p.emails?.some(e => {
        const email = typeof e === 'string' ? e : e.email;
        return email.toLowerCase().includes(lower);
      })
    );
  }, [people, searchQuery]);
  
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search contacts..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={filteredPeople}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ContactCard contact={item} />}
      />
    </View>
  );
}
```

## ✅ Integration Checklist

### Required Steps
- [ ] Add `PeopleProvider` to `_layout.tsx`
- [ ] Ensure `AuthProvider` is ancestor
- [ ] Ensure `WarmthSettingsProvider` is ancestor
- [ ] Set `FLAGS.LOCAL_ONLY` mode
- [ ] Create contacts list screen
- [ ] Create contact detail screen
- [ ] Create add contact form

### Recommended Steps
- [ ] Add search functionality
- [ ] Add tag filtering
- [ ] Add sort options
- [ ] Implement contact editing
- [ ] Add bulk operations
- [ ] Add contact import from device

### Testing Steps
- [ ] Test creating a contact
- [ ] Test updating a contact
- [ ] Test deleting a contact
- [ ] Test search functionality
- [ ] Test offline mode (if LOCAL_ONLY)
- [ ] Test real-time sync (if cloud mode)

## 🎯 Quick Wins

### 1. Add "Quick Add" FAB

```typescript
import { TouchableOpacity } from 'react-native';

<TouchableOpacity
  style={{
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  }}
  onPress={() => router.push('/add-contact')}
>
  <Text style={{ color: 'white', fontSize: 24 }}>+</Text>
</TouchableOpacity>
```

### 2. Add Contact Count Badge

```typescript
<Text style={styles.title}>
  Contacts ({people.length})
</Text>
```

### 3. Add Empty State

```typescript
{people.length === 0 ? (
  <View style={styles.emptyState}>
    <Text>No contacts yet</Text>
    <Button title="Add First Contact" onPress={goToAddContact} />
  </View>
) : (
  <FlatList data={people} />
)}
```

### 4. Add Loading State

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  // PeopleProvider loads asynchronously
  const timer = setTimeout(() => setLoading(false), 500);
  return () => clearTimeout(timer);
}, []);

if (loading) {
  return <ActivityIndicator />;
}
```

## 🐛 Common Issues

### Issue 1: Contacts not loading
**Solution**: Verify `FLAGS.LOCAL_ONLY` is set correctly and auth is working.

### Issue 2: Duplicate contacts appearing
**Solution**: Check that real-time subscription isn't creating duplicates. Provider has duplicate prevention built-in.

### Issue 3: Updates not reflecting
**Solution**: Ensure you're using the returned value from `updatePerson()`.

### Issue 4: Provider not found error
**Solution**: Verify PeopleProvider is ancestor of component calling `usePeople()`.

## Next Steps

- **Advanced patterns**: [05-advanced-patterns.md](./05-advanced-patterns.md)
- **Contact import**: [06-contact-import.md](./06-contact-import.md)
- **Real-time sync**: [07-real-time-sync.md](./07-real-time-sync.md)
