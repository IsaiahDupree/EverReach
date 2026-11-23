import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Send, AlertTriangle } from 'lucide-react-native';
import { getCoachMessages, saveCoachMessage, getCoachMessageCountToday, getProfile, getTodayStats, getSessions } from '@/services/suntraceApi';
import { SUNTRACE_COLORS, SUNTRACE_CONFIG } from '@/constants/suntrace';
import { CoachMessage } from '@/types/suntrace';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'expo-router';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export default function CoachScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgCountToday, setMsgCountToday] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const [msgs, count] = await Promise.all([
        getCoachMessages(50),
        getCoachMessageCountToday(),
      ]);
      setMessages(msgs);
      setMsgCountToday(count);
      setInitializing(false);
    })();
  }, []);

  const messageLimit = isPro
    ? SUNTRACE_CONFIG.PRO_COACH_MESSAGES_PER_DAY
    : SUNTRACE_CONFIG.FREE_COACH_MESSAGES_PER_DAY;

  async function buildSystemPrompt(): Promise<string> {
    const [profile, stats, sessions] = await Promise.all([
      getProfile(),
      getTodayStats(),
      getSessions(7),
    ]);

    const sessionSummary = sessions
      .map(s => `- ${new Date(s.started_at).toLocaleDateString()}: ${s.duration_minutes.toFixed(0)}min, UV ${s.uv_index_avg.toFixed(1)}, ${s.d_earned_iu}IU`)
      .join('\n');

    return `You are SunCoach, an AI sun health specialist powered by Claude. You help users optimize their vitamin D production through safe, science-based sun exposure.

USER CONTEXT:
- Skin type: Fitzpatrick Type ${profile?.skin_type ?? 3} (${getSkinTypeName(profile?.skin_type ?? 3)})
- Age: ${profile?.age ?? 'unknown'}
- Daily vitamin D target: ${profile?.daily_d_target_iu ?? 1500} IU
- Current streak: ${profile?.streak_count ?? 0} days
- Today's D earned: ${stats?.total_d_earned_iu ?? 0} IU (goal: ${profile?.daily_d_target_iu ?? 1500} IU)
- Today's sessions: ${stats?.session_count ?? 0}

LAST 7 SESSIONS:
${sessionSummary || 'No recent sessions'}

GUIDELINES:
- Reference the user's specific data when giving advice
- Use evidence-based recommendations (Holick research, AAD guidelines)
- Always include medical disclaimer for health claims
- Be encouraging but realistic about burn risks for their skin type
- Suggest optimal session times based on their UV history
- Keep responses concise (2-4 paragraphs max)

⚠️ MEDICAL DISCLAIMER: Always remind users to consult their healthcare provider for medical advice. Sun exposure recommendations are general guidance only.`;
  }

  function getSkinTypeName(type: number): string {
    const names: Record<number, string> = {
      1: 'Very Fair', 2: 'Fair', 3: 'Medium', 4: 'Olive', 5: 'Brown', 6: 'Dark'
    };
    return names[type] ?? 'Medium';
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    // Check message limit
    if (msgCountToday >= messageLimit) {
      if (!isPro) {
        Alert.alert(
          'Daily Limit Reached',
          `Free users get ${SUNTRACE_CONFIG.FREE_COACH_MESSAGES_PER_DAY} AI coach messages per day. Upgrade to Pro for ${SUNTRACE_CONFIG.PRO_COACH_MESSAGES_PER_DAY}/day.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => router.push('/sun-paywall') },
          ]
        );
      } else {
        Alert.alert('Daily Limit', `You've reached ${messageLimit} messages today. Limit resets at midnight.`);
      }
      return;
    }

    setInput('');
    setLoading(true);

    // Save user message to Supabase
    const userMsg = await saveCoachMessage('user', text);
    setMessages(prev => [...prev, userMsg]);
    setMsgCountToday(c => c + 1);

    try {
      // Build system prompt with user context
      const systemPrompt = await buildSystemPrompt();

      // Build message history for Claude
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Call Claude API
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: history,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const assistantText = data.content[0]?.text ?? 'Sorry, I could not generate a response.';

      // Save assistant message
      const assistantMsg = await saveCoachMessage('assistant', assistantText);
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      Alert.alert('Coach Error', err.message || 'Failed to get response from coach');
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={SUNTRACE_COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sun Coach</Text>
        <Text style={styles.headerSub}>
          {msgCountToday}/{messageLimit} messages today
        </Text>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <AlertTriangle size={14} color="#eab308" />
        <Text style={styles.disclaimerText}>
          Not medical advice. Consult your doctor for health decisions.
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => <MessageBubble message={item} />}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☀️</Text>
            <Text style={styles.emptyTitle}>Ask SunCoach anything</Text>
            <Text style={styles.emptySubtitle}>
              Get personalized advice about vitamin D, sun safety, and optimal exposure for your skin type.
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about sun health..."
          placeholderTextColor={SUNTRACE_COLORS.textSecondary}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      {!isUser && (
        <Text style={styles.senderLabel}>☀️ SunCoach</Text>
      )}
      <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
        {message.content}
      </Text>
      <Text style={styles.bubbleTime}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SUNTRACE_COLORS.bgDark },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SUNTRACE_COLORS.bgDark },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary },
  headerSub: { fontSize: 13, color: SUNTRACE_COLORS.textSecondary, marginTop: 2 },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 8, backgroundColor: '#1c1500', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#eab308' },
  messageList: { padding: 20, gap: 12, flexGrow: 1 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 14 },
  userBubble: { backgroundColor: SUNTRACE_COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: SUNTRACE_COLORS.bgCard, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  senderLabel: { fontSize: 11, fontWeight: '700', color: SUNTRACE_COLORS.primary, marginBottom: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  assistantText: { color: SUNTRACE_COLORS.textPrimary },
  bubbleTime: { fontSize: 10, marginTop: 6, opacity: 0.6, color: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: SUNTRACE_COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1E293B' },
  input: { flex: 1, backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: SUNTRACE_COLORS.textPrimary, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: SUNTRACE_COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
