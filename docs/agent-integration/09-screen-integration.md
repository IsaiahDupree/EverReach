# Screen Integration Examples

## 🎯 Adding Agent Features to Existing Screens

### 1. Voice Notes Screen - Add Processing

```tsx
// app/(tabs)/persona-notes.tsx or similar

import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { processVoiceNote } from '@/lib/agent-api';

export default function PersonaNotesScreen() {
  const [notes, setNotes] = useState([]);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleProcessNote = async (noteId: string) => {
    setProcessing(noteId);
    try {
      const result = await processVoiceNote({
        note_id: noteId,
        extract_contacts: true,
        extract_actions: true,
        categorize: true,
        suggest_tags: true
      });

      // Show results
      Alert.alert(
        'Processing Complete!',
        `Found ${result.extracted.contacts?.length || 0} contacts, ${result.extracted.actions?.length || 0} actions`,
        [{ text: 'OK' }]
      );

      // Refresh notes to see updated tags
      refreshNotes();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <FlatList
      data={notes}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1 }}>
          <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
          <Text>{item.transcript?.substring(0, 100)}...</Text>
          
          {/* Add AI Processing Button */}
          <TouchableOpacity
            onPress={() => handleProcessNote(item.id)}
            disabled={processing === item.id}
            style={{
              marginTop: 8,
              padding: 8,
              backgroundColor: '#007AFF',
              borderRadius: 4
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>
              {processing === item.id ? '⏳ Processing...' : '🤖 Process with AI'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}
```

### 2. Contact Detail Screen - Add Analysis

```tsx
// app/contact/[id].tsx or similar

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { analyzeContact } from '@/lib/agent-api';
import { useLocalSearchParams } from 'expo-router';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const [contact, setContact] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeContact({
        contact_id: id as string,
        analysis_type: 'context_summary',
        include_voice_notes: true,
        include_interactions: true
      });
      setAnalysis(result.analysis);
      setShowAnalysis(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* Existing contact details */}
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        {contact?.display_name}
      </Text>
      <Text>{contact?.emails?.[0]}</Text>

      {/* Add Analysis Button */}
      <TouchableOpacity
        onPress={handleAnalyze}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#007AFF',
          borderRadius: 8
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
          {loading ? '⏳ Analyzing...' : '🔍 Analyze Relationship'}
        </Text>
      </TouchableOpacity>

      {/* Analysis Modal */}
      <Modal visible={showAnalysis} animationType="slide">
        <View style={{ flex: 1, padding: 20, backgroundColor: 'white' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
            Analysis for {contact?.display_name}
          </Text>
          <ScrollView>
            <Text style={{ lineHeight: 24 }}>{analysis}</Text>
          </ScrollView>
          <TouchableOpacity
            onPress={() => setShowAnalysis(false)}
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: '#666',
              borderRadius: 8
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}
```

### 3. Message Composer - Add Smart Compose

```tsx
// app/compose-message.tsx or similar

import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { composeSmartMessage } from '@/lib/agent-api';

export default function ComposeMessageScreen({ route }) {
  const { contactId, contactName } = route.params;
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [composing, setComposing] = useState(false);

  const handleAICompose = async () => {
    setComposing(true);
    try {
      const result = await composeSmartMessage({
        contact_id: contactId,
        goal_type: 'networking',
        channel: 'email',
        tone: 'warm',
        include_voice_context: true,
        include_interaction_history: true
      });

      setSubject(result.message.subject || '');
      setBody(result.message.body);
      
      Alert.alert('✨ Message Generated!', 'AI has composed a message for you.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setComposing(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>
        Message to {contactName}
      </Text>

      {/* AI Compose Button */}
      <TouchableOpacity
        onPress={handleAICompose}
        disabled={composing}
        style={{
          padding: 12,
          backgroundColor: '#28a745',
          borderRadius: 8,
          marginBottom: 16
        }}
      >
        {composing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', textAlign: 'center' }}>
            ✨ AI Compose
          </Text>
        )}
      </TouchableOpacity>

      <TextInput
        placeholder="Subject"
        value={subject}
        onChangeText={setSubject}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12
        }}
      />

      <TextInput
        placeholder="Message body"
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={10}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          height: 200,
          textAlignVertical: 'top'
        }}
      />

      <TouchableOpacity
        onPress={() => {/* Send message */}}
        style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#007AFF',
          borderRadius: 8
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 4. Dashboard - Add Suggested Actions Widget

```tsx
// app/(tabs)/home.tsx or dashboard

import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { suggestActions } from '@/lib/agent-api';

function SuggestedActionsWidget() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const result = await suggestActions({
        context: 'dashboard',
        focus: 'all',
        limit: 3
      });
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>💡 Suggested Actions</Text>
        <TouchableOpacity onPress={loadSuggestions}>
          <Text style={{ color: '#007AFF' }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {suggestions.map((suggestion, idx) => (
        <TouchableOpacity
          key={idx}
          style={{
            padding: 12,
            backgroundColor: 'white',
            borderRadius: 8,
            marginBottom: 8,
            borderLeftWidth: 4,
            borderLeftColor: suggestion.priority === 'high' ? '#dc3545' : '#28a745'
          }}
        >
          <Text style={{ fontWeight: '600', marginBottom: 4 }}>
            {suggestion.title}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            {suggestion.description}
          </Text>
          <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
            Priority: {suggestion.priority.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  return (
    <ScrollView style={{ flex: 1 }}>
      {/* Your existing dashboard content */}
      
      {/* Add Suggested Actions Widget */}
      <SuggestedActionsWidget />
    </ScrollView>
  );
}
```

### 5. Global Agent Chat - Floating Action Button

```tsx
// Add to your root layout or main tab navigator

import { useState } from 'react';
import { TouchableOpacity, Modal, Text, View } from 'react-native';
import { AgentChat } from '@/components/AgentChat'; // If you implement the component

export default function RootLayout() {
  const [showAgent, setShowAgent] = useState(false);

  return (
    <>
      {/* Your existing layout */}
      
      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => setShowAgent(true)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#007AFF',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5
        }}
      >
        <Text style={{ fontSize: 28 }}>🤖</Text>
      </TouchableOpacity>

      {/* Agent Chat Modal */}
      <Modal
        visible={showAgent}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1 }}>
          <AgentChat />
          <TouchableOpacity
            onPress={() => setShowAgent(false)}
            style={{ padding: 16, backgroundColor: '#f0f0f0' }}
          >
            <Text style={{ textAlign: 'center' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}
```

## 🎨 UI/UX Tips

### Loading States
Always show loading indicators:
```tsx
{loading ? <ActivityIndicator /> : <Text>Button Text</Text>}
```

### Error Handling
Use alerts for errors:
```tsx
try {
  await apiCall();
} catch (error) {
  Alert.alert('Error', error.message);
}
```

### Success Feedback
Confirm successful operations:
```tsx
Alert.alert('✅ Success', 'Operation completed!');
```

### Optimistic Updates
Show results immediately, sync later:
```tsx
// Update UI first
setData(newData);

// Then sync with API
await syncToBackend(newData);
```

## 📝 Integration Checklist

For each screen:
- [ ] Import necessary API functions
- [ ] Add state management (loading, results, errors)
- [ ] Add UI triggers (buttons, menu items)
- [ ] Handle loading states
- [ ] Handle errors gracefully
- [ ] Show success feedback
- [ ] Test with real data

## Next Steps

- Review [10-api-reference.md](./10-api-reference.md) for complete API details
- Check [08-usage-examples.md](./08-usage-examples.md) for more code snippets
