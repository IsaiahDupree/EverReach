# Quick Usage Examples

## 🚀 Copy-Paste Ready Code

### Process a Voice Note

```typescript
import { processVoiceNote } from '@/lib/agent-api';

const handleProcess = async (noteId: string) => {
  try {
    const result = await processVoiceNote({
      note_id: noteId,
      extract_contacts: true,
      extract_actions: true,
      categorize: true,
      suggest_tags: true
    });
    
    console.log('✅ Processed!');
    console.log('Contacts:', result.extracted.contacts);
    console.log('Actions:', result.extracted.actions);
    console.log('Category:', result.extracted.category);
    console.log('Tags:', result.extracted.tags);
    
    return result;
  } catch (error) {
    console.error('❌ Processing failed:', error);
  }
};
```

### Compose a Smart Message

```typescript
import { composeSmartMessage } from '@/lib/agent-api';

const handleCompose = async (contactId: string) => {
  try {
    const result = await composeSmartMessage({
      contact_id: contactId,
      goal_type: 'networking',
      goal_description: 'Catch up and explore partnership',
      channel: 'email',
      tone: 'warm',
      include_voice_context: true,
      include_interaction_history: true
    });
    
    console.log('✅ Message generated!');
    console.log('Subject:', result.message.subject);
    console.log('Body:', result.message.body);
    console.log('Warmth used:', result.context_sources.contact_warmth);
    
    return result.message;
  } catch (error) {
    console.error('❌ Composition failed:', error);
  }
};
```

### Analyze a Contact

```typescript
import { analyzeContact } from '@/lib/agent-api';

const handleAnalyze = async (contactId: string) => {
  try {
    const result = await analyzeContact({
      contact_id: contactId,
      analysis_type: 'full_analysis',
      include_voice_notes: true,
      include_interactions: true
    });
    
    console.log('✅ Analysis complete!');
    console.log(result.analysis);
    
    return result;
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
};
```

### Send Agent Chat Message

```typescript
import { sendAgentMessage } from '@/lib/agent-api';

const handleChat = async (message: string) => {
  try {
    const result = await sendAgentMessage({
      message,
      context: { use_tools: true }
    });
    
    console.log('✅ Agent response:', result.message);
    console.log('Tools used:', result.tools_used);
    
    return result;
  } catch (error) {
    console.error('❌ Chat failed:', error);
  }
};
```

### Stream Agent Chat (Real-time)

```typescript
import { streamAgentChat } from '@/lib/agent-api';

const handleStreamChat = async (message: string) => {
  try {
    let fullResponse = '';
    
    const stream = streamAgentChat({
      message,
      context: { use_tools: true }
    });
    
    for await (const chunk of stream) {
      fullResponse += chunk;
      console.log(chunk); // Print each word/phrase as it arrives
    }
    
    console.log('✅ Complete response:', fullResponse);
    return fullResponse;
  } catch (error) {
    console.error('❌ Stream failed:', error);
  }
};
```

### Get Suggested Actions

```typescript
import { suggestActions } from '@/lib/agent-api';

const handleSuggestions = async () => {
  try {
    const result = await suggestActions({
      context: 'dashboard',
      focus: 'engagement',
      limit: 5
    });
    
    console.log('✅ Suggestions:');
    result.suggestions.forEach(s => {
      console.log(`${s.priority.toUpperCase()}: ${s.title}`);
      console.log(`  → ${s.description}`);
    });
    
    return result.suggestions;
  } catch (error) {
    console.error('❌ Suggestions failed:', error);
  }
};
```

## 🎯 Use in Components

### Button to Process Voice Note

```tsx
import { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { processVoiceNote } from '@/lib/agent-api';

function ProcessButton({ noteId }: { noteId: string }) {
  const [loading, setLoading] = useState(false);
  
  const handlePress = async () => {
    setLoading(true);
    try {
      const result = await processVoiceNote({
        note_id: noteId,
        extract_contacts: true,
        extract_actions: true,
        categorize: true,
        suggest_tags: true
      });
      alert('Processed! Found: ' + result.extracted.contacts?.join(', '));
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <TouchableOpacity onPress={handlePress} disabled={loading}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text>🤖 Process with AI</Text>
      )}
    </TouchableOpacity>
  );
}
```

### Button to Compose Message

```tsx
import { useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { composeSmartMessage } from '@/lib/agent-api';

function ComposeButton({ contactId, onMessage }: {
  contactId: string;
  onMessage: (body: string, subject?: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  
  const handlePress = async () => {
    setLoading(true);
    try {
      const result = await composeSmartMessage({
        contact_id: contactId,
        goal_type: 'networking',
        channel: 'email',
        tone: 'warm'
      });
      onMessage(result.message.body, result.message.subject);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <TouchableOpacity onPress={handlePress} disabled={loading}>
      <Text>✨ AI Compose</Text>
    </TouchableOpacity>
  );
}
```

### Button to Analyze Contact

```tsx
import { useState } from 'react';
import { TouchableOpacity, Text, Modal, ScrollView } from 'react-native';
import { analyzeContact } from '@/lib/agent-api';

function AnalyzeButton({ contactId }: { contactId: string }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const handlePress = async () => {
    setLoading(true);
    try {
      const result = await analyzeContact({
        contact_id: contactId,
        analysis_type: 'context_summary'
      });
      setAnalysis(result.analysis);
      setShowModal(true);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <TouchableOpacity onPress={handlePress} disabled={loading}>
        <Text>🔍 Analyze</Text>
      </TouchableOpacity>
      
      <Modal visible={showModal} onRequestClose={() => setShowModal(false)}>
        <ScrollView style={{ padding: 20 }}>
          <Text>{analysis}</Text>
        </ScrollView>
      </Modal>
    </>
  );
}
```

## ⚡ Quick Integration Patterns

### Add to Voice Notes List

```tsx
// In your persona notes list screen
<FlatList
  data={notes}
  renderItem={({ item }) => (
    <View>
      <Text>{item.title}</Text>
      <ProcessButton noteId={item.id} />
    </View>
  )}
/>
```

### Add to Contact Detail

```tsx
// In your contact detail screen
<View>
  <Text>{contact.name}</Text>
  <AnalyzeButton contactId={contact.id} />
  <ComposeButton contactId={contact.id} onMessage={handleMessage} />
</View>
```

### Add to Dashboard

```tsx
// In your dashboard
<View>
  <Text>Suggested Actions</Text>
  <SuggestionsWidget />
</View>
```

## 📚 More Details

- For full hooks: [04-hooks.md](./04-hooks.md)
- For complete components: [05-voice-processor.md](./05-voice-processor.md), [06-smart-composer.md](./06-smart-composer.md), [07-agent-chat.md](./07-agent-chat.md)
- For screen integration: [09-screen-integration.md](./09-screen-integration.md)
