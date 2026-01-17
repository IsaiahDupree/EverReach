import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Bubble, SectionTitle } from './ui';
import type { ContactContext } from './types';

export default function ContextBubble({ ctx, personId }: { ctx: ContactContext; personId?: string }) {
  const router = useRouter();

  const handlePress = () => {
    if (personId) {
      router.push(`/contact-context/${personId}`);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Bubble muted testID="contextBubble">
        <SectionTitle>Context</SectionTitle>
        <View style={styles.line}>
          <Text style={styles.name}>{ctx.name}</Text>
          <Text style={styles.meta}> — {ctx.title} at {ctx.company}</Text>
        </View>
        <Text style={styles.sub}>
          Last contact: {ctx.lastContactDays} days ago
          {ctx.lastTopic ? ` — Initial meeting about ${ctx.lastTopic}` : ''}
        </Text>
        {ctx.interests?.length ? (
          <Text style={styles.sub}>Interests: {ctx.interests.join(', ')}</Text>
        ) : null}
        <Text style={styles.tapHint}>Tap to view full context</Text>
      </Bubble>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: '#0f1223' },
  meta: { fontSize: 16, color: '#0f1223' },
  sub: { color: '#616776', marginTop: 2 },
  tapHint: { color: '#4A90E2', fontSize: 12, marginTop: 8, fontWeight: '500' },
});
