# AI Compose System - Implementation Guide

**Step-by-step code implementation for the AI-powered message composition system**

---

## Table of Contents

1. [Frontend Components](#frontend-components)
2. [Custom Hooks](#custom-hooks)
3. [Backend API Routes](#backend-api-routes)
4. [Database Schema](#database-schema)
5. [Testing](#testing)

---

## Frontend Components

### 1. Compose Screen (Main UI)

**File:** `app/compose/[contactId].tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCachedGoals } from '@/hooks/useCachedGoals';
import { apiFetch } from '@/lib/api';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { Sparkles, Send, Edit } from 'lucide-react-native';

export default function ComposeMessageScreen() {
  const { contactId } = useLocalSearchParams();
  const { theme } = useAppSettings();
  
  // State
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [customGoal, setCustomGoal] = useState('');
  const [channel, setChannel] = useState('email');
  const [tone, setTone] = useState('warm');
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  // Load cached goals
  const { goals, isStale, loading } = useCachedGoals(contactId as string);
  
  const handleGenerate = async () => {
    if (!selectedGoal && !customGoal) {
      alert('Please select a goal or describe your own');
      return;
    }
    
    setGenerating(true);
    
    try {
      const message = await apiFetch('/v1/agent/compose/smart', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          contact_id: contactId,
          goal_type: selectedGoal?.kind || 'custom',
          goal_description: customGoal || selectedGoal?.description,
          channel,
          tone,
          include_voice_context: true,
          include_interaction_history: true
        })
      });
      
      setGeneratedMessage(message);
    } catch (error: any) {
      alert(`Generation failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };
  
  const handleSend = () => {
    // Navigate to send/copy screen
    router.push({
      pathname: '/send',
      params: {
        contactId,
        subject: generatedMessage.message.subject,
        body: generatedMessage.message.body,
        channel
      }
    });
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Sparkles size={24} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Compose Message
        </Text>
      </View>
      
      {/* Goal Picker */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Message Goal {isStale && <Text style={styles.staleIndicator}>⟳</Text>}
        </Text>
        
        {loading ? (
          <ActivityIndicator />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {goals.map(goal => (
              <GoalChip
                key={goal.goal_id}
                goal={goal}
                selected={selectedGoal?.goal_id === goal.goal_id}
                onPress={() => {
                  setSelectedGoal(goal);
                  setCustomGoal('');
                }}
              />
            ))}
          </ScrollView>
        )}
        
        <TextInput
          style={[styles.customInput, { 
            borderColor: theme.colors.border,
            color: theme.colors.text 
          }]}
          placeholder="Or describe your own goal..."
          placeholderTextColor={theme.colors.textSecondary}
          value={customGoal}
          onChangeText={(text) => {
            setCustomGoal(text);
            setSelectedGoal(null);
          }}
          multiline
        />
      </View>
      
      {/* Channel & Tone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Channel
        </Text>
        <View style={styles.optionRow}>
          {['email', 'sms', 'dm'].map(ch => (
            <TouchableOpacity
              key={ch}
              style={[
                styles.optionChip,
                channel === ch && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setChannel(ch)}
            >
              <Text style={[
                styles.optionText,
                { color: channel === ch ? '#fff' : theme.colors.text }
              ]}>
                {ch.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Tone
        </Text>
        <View style={styles.optionRow}>
          {['warm', 'professional', 'concise', 'playful'].map(t => (
            <TouchableOpacity
              key={t}
              style={[
                styles.optionChip,
                tone === t && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setTone(t)}
            >
              <Text style={[
                styles.optionText,
                { color: tone === t ? '#fff' : theme.colors.text }
              ]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateBtn, { backgroundColor: theme.colors.primary }]}
        onPress={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Sparkles size={20} color="#fff" />
            <Text style={styles.generateText}>Generate Message</Text>
          </>
        )}
      </TouchableOpacity>
      
      {/* Generated Message Preview */}
      {generatedMessage && (
        <View style={[styles.messagePreview, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border 
        }]}>
          <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
            Generated Message
          </Text>
          
          {generatedMessage.message.subject && (
            <>
              <Text style={[styles.subject, { color: theme.colors.text }]}>
                Subject: {generatedMessage.message.subject}
              </Text>
              <View style={styles.divider} />
            </>
          )}
          
          <Text style={[styles.body, { color: theme.colors.text }]}>
            {generatedMessage.message.body}
          </Text>
          
          {/* Context Sources */}
          <View style={styles.contextBadges}>
            {generatedMessage.context_sources.voice_notes_used && (
              <ContextBadge icon="🎤" text="Voice notes" />
            )}
            {generatedMessage.context_sources.interactions_used && (
              <ContextBadge icon="💬" text="Interactions" />
            )}
            <ContextBadge 
              icon="❤️" 
              text={`Warmth: ${generatedMessage.context_sources.contact_warmth}`} 
            />
          </View>
          
          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.colors.border }]}
              onPress={() => setGeneratedMessage(null)}
            >
              <Edit size={16} color={theme.colors.text} />
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                Regenerate
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn, { 
                backgroundColor: theme.colors.primary 
              }]}
              onPress={handleSend}
            >
              <Send size={16} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  staleIndicator: { fontSize: 12, opacity: 0.6 },
  customInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  optionText: { fontSize: 12, fontWeight: '600' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24
  },
  generateText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  messagePreview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  previewLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  subject: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  body: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  contextBadges: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  primaryBtn: { borderWidth: 0 },
  actionText: { fontSize: 14, fontWeight: '600' }
});
```

---

### 2. Goal Chip Component

**File:** `components/GoalChip.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';

interface GoalChipProps {
  goal: {
    goal_id: string;
    name: string;
    score: number;
    reason: string;
  };
  selected: boolean;
  onPress: () => void;
}

export function GoalChip({ goal, selected, onPress }: GoalChipProps) {
  const { theme } = useAppSettings();
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && { 
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary 
        },
        { borderColor: theme.colors.border }
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={[
          styles.name,
          { color: selected ? '#fff' : theme.colors.text }
        ]}>
          {goal.name}
        </Text>
        
        {goal.score > 0.8 && (
          <View style={styles.scoreBadge}>
            <Sparkles size={10} color={theme.colors.success} />
            <Text style={styles.scoreText}>
              {Math.round(goal.score * 100)}%
            </Text>
          </View>
        )}
      </View>
      
      <Text style={[
        styles.reason,
        { color: selected ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }
      ]}>
        {goal.reason}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 200,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginRight: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  name: { fontSize: 14, fontWeight: '600', flex: 1 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  scoreText: { fontSize: 10, fontWeight: '600', color: '#10b981' },
  reason: { fontSize: 11, lineHeight: 16 }
});
```

---

### 3. Context Badge Component

**File:** `components/ContextBadge.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ContextBadgeProps {
  icon: string;
  text: string;
}

export function ContextBadge({ icon, text }: ContextBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12
  },
  icon: { fontSize: 12 },
  text: { fontSize: 11, fontWeight: '500' }
});
```

---

## Custom Hooks

### useCachedGoals Hook

**File:** `hooks/useCachedGoals.ts`

```typescript
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/lib/api';
import crypto from 'crypto';

interface MessageGoal {
  goal_id: string;
  name: string;
  kind: string;
  description: string;
  score: number;
  reason: string;
}

interface GoalContext {
  contactWarmth: number;
  contactTags: string[];
  pipelineStatus: string;
  interactionCount: number;
  personalNotesHash: string;
  timestamp: string;
}

interface GoalCache {
  goals: MessageGoal[];
  context: GoalContext;
  lastUpdated: string;
  expiresAt: string;
}

export function useCachedGoals(contactId: string) {
  const [goals, setGoals] = useState<MessageGoal[]>([]);
  const [isStale, setIsStale] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadGoals();
  }, [contactId]);
  
  async function loadGoals() {
    try {
      // Try cache first
      const cacheKey = `goals:${contactId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const parsed: GoalCache = JSON.parse(cached);
        setGoals(parsed.goals);
        setLoading(false);
        
        // Check staleness in background
        checkStaleness(parsed.context);
      } else {
        // No cache - fetch fresh
        await fetchFreshGoals();
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
      setLoading(false);
    }
  }
  
  async function fetchFreshGoals() {
    setLoading(true);
    
    try {
      const response = await apiFetch(`/v1/contacts/${contactId}/goal-suggestions`, {
        requireAuth: true
      });
      
      setGoals(response.items);
      
      // Get current context and cache
      const context = await fetchCurrentContext(contactId);
      await cacheGoals(response.items, context);
      
      setIsStale(false);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchCurrentContext(contactId: string): Promise<GoalContext> {
    // Fetch contact details
    const contact = await apiFetch(`/v1/contacts/${contactId}`, {
      requireAuth: true
    });
    
    // Fetch interaction count
    const interactions = await apiFetch(`/v1/contacts/${contactId}/interactions?limit=1`, {
      requireAuth: true
    });
    
    // Hash personal notes (simplified - would need actual notes)
    const notesHash = crypto.createHash('md5').update(contact.notes || '').digest('hex');
    
    return {
      contactWarmth: contact.warmth,
      contactTags: contact.tags || [],
      pipelineStatus: contact.pipeline_status || 'active',
      interactionCount: interactions.total || 0,
      personalNotesHash: notesHash,
      timestamp: new Date().toISOString()
    };
  }
  
  async function cacheGoals(goals: MessageGoal[], context: GoalContext) {
    const cacheKey = `goals:${contactId}`;
    const cache: GoalCache = {
      goals,
      context,
      lastUpdated: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
  }
  
  async function checkStaleness(cachedContext: GoalContext) {
    try {
      const currentContext = await fetchCurrentContext(contactId);
      
      // Major changes - immediate refresh
      if (
        Math.abs(currentContext.contactWarmth - cachedContext.contactWarmth) > 10 ||
        currentContext.pipelineStatus !== cachedContext.pipelineStatus ||
        JSON.stringify(currentContext.contactTags) !== JSON.stringify(cachedContext.contactTags)
      ) {
        setIsStale(true);
        await fetchFreshGoals();
        return;
      }
      
      // Minor changes - mark stale for background refresh
      if (
        currentContext.personalNotesHash !== cachedContext.personalNotesHash ||
        currentContext.interactionCount > cachedContext.interactionCount ||
        Date.now() - new Date(cachedContext.timestamp).getTime() > 24 * 60 * 60 * 1000
      ) {
        setIsStale(true);
        // Refresh in background without blocking UI
        setTimeout(() => fetchFreshGoals(), 100);
      }
    } catch (error) {
      console.error('Staleness check failed:', error);
    }
  }
  
  return { goals, isStale, loading, refresh: fetchFreshGoals };
}
```

---

## Backend API Routes

**See main documentation:** [AI_COMPOSE_SYSTEM.md](./AI_COMPOSE_SYSTEM.md#api-endpoints)

Backend files:
- `backend-vercel/app/api/v1/contacts/[id]/goal-suggestions/route.ts` - Goal suggestions endpoint
- `backend-vercel/app/api/v1/agent/compose/smart/route.ts` - Smart compose endpoint

---

## Testing

### Manual Testing Checklist

```bash
# 1. Test goal caching
✅ Load compose screen → goals appear instantly (if cached)
✅ Wait 2 seconds → no refresh if context unchanged
✅ Update contact warmth → goals refresh automatically

# 2. Test goal suggestions  
✅ Verify 3-5 goals returned
✅ Verify scores are 0-1
✅ Verify reasons are contextual

# 3. Test message generation
✅ Select goal → tap generate → message appears in 2-4s
✅ Custom goal → tap generate → message appears
✅ Check context badges show correct sources

# 4. Test staleness detection
✅ Add interaction → goals marked stale
✅ Update tags → goals refresh immediately
✅ Wait 25 hours → goals refresh on load
```

### Automated Tests

```typescript
// test/agent/agent-compose-smart.mjs

import { apiFetch, getAuthHeaders } from './_shared.mjs';
import assert from 'assert';

export const tests = [
  {
    name: 'compose with full context',
    run: async () => {
      const result = await apiFetch('/v1/agent/compose/smart', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          contact_id: 'test-contact-id',
          goal_type: 'networking',
          goal_description: 'Follow up on Q4 planning',
          channel: 'email',
          tone: 'warm',
          include_voice_context: true,
          include_interaction_history: true
        })
      });
      
      assert(result.message, 'Should have message');
      assert(result.message.subject, 'Should have subject');
      assert(result.message.body, 'Should have body');
      assert(result.context_sources, 'Should have context sources');
      assert(result.usage, 'Should have token usage');
      
      console.log('✅ Message composed with full context');
      console.log('   Subject:', result.message.subject);
      console.log('   Body length:', result.message.body.length);
      console.log('   Tokens used:', result.usage.total_tokens);
    }
  }
];
```

---

**Implementation Guide Last Updated:** 2025-10-05
**Version:** 1.0.0
