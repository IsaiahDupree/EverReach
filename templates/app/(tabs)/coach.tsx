/**
 * SunTrace - AI Coach Tab Screen
 *
 * This is the tab version of /app/coach.tsx, adapted so it can
 * live in the (tabs) layout. All logic is identical; the header
 * uses the same safe-area padding as the other tab screens.
 *
 * Features:
 * - Chat UI with user/assistant bubbles
 * - Medical disclaimer banner
 * - Pro-gated (free users see upgrade CTA)
 * - Calls Supabase Edge Function coach-chat
 * - Daily message counter (20 free / 100 pro)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sun,
  Send,
  Lock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import {
  getCoachMessages,
  sendCoachMessage,
  getTodayCoachMessageCount,
} from '@/services/api';
import { APP_CONFIG } from '@/constants/config';
import type { CoachMessage } from '@/types/models';

// ============================================
// NOTE: useSubscription is not yet in this template.
// Default to false so UI shows Pro gate for all users
// until the hook is wired in.
// ============================================
function useSubscription() {
  return { isPro: false };
}

// ============================================
// Message bubble
// ============================================
function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[bubbleStyles.row, isUser && bubbleStyles.rowUser]}>
      {!isUser && (
        <View style={bubbleStyles.avatar}>
          <Sun size={14} color="#F97316" />
        </View>
      )}
      <View
        style={[
          bubbleStyles.bubble,
          isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAssistant,
        ]}
      >
        <Text
          style={[
            bubbleStyles.text,
            isUser ? bubbleStyles.textUser : bubbleStyles.textAssistant,
          ]}
        >
          {message.content}
        </Text>
        <Text style={bubbleStyles.time}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  rowUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: '#F97316',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15, lineHeight: 21 },
  textUser: { color: 'white' },
  textAssistant: { color: '#F1F5F9' },
  time: { fontSize: 10, color: 'rgba(255,255,255,0.4)', alignSelf: 'flex-end' },
});

// ============================================
// Typing indicator
// ============================================
function TypingIndicator() {
  return (
    <View style={typingStyles.row}>
      <View style={typingStyles.avatar}>
        <Sun size={14} color="#F97316" />
      </View>
      <View style={typingStyles.bubble}>
        <ActivityIndicator size="small" color="#F97316" />
        <Text style={typingStyles.text}>Thinking...</Text>
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  text: { fontSize: 14, color: '#64748B' },
});

// ============================================
// Pro gate
// ============================================
function ProGateMessage({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={gateStyles.container}>
      <View style={gateStyles.card}>
        <Lock size={32} color="#F97316" />
        <Text style={gateStyles.title}>AI Coach is Pro</Text>
        <Text style={gateStyles.subtitle}>
          Get personalized Vitamin D advice, safe sun exposure recommendations,
          and answers to all your sunlight questions.
        </Text>
        <TouchableOpacity style={gateStyles.btn} onPress={onUpgrade} activeOpacity={0.85}>
          <Sun size={16} color="white" />
          <Text style={gateStyles.btnText}>Upgrade to Pro</Text>
          <ChevronRight size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const gateStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F9731633',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#F1F5F9' },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});

// ============================================
// Daily limit banner
// ============================================
function LimitBanner({
  used,
  limit,
  onUpgrade,
}: {
  used: number;
  limit: number;
  onUpgrade: () => void;
}) {
  const remaining = limit - used;
  if (remaining > 5) return null;

  return (
    <TouchableOpacity style={limitStyles.banner} onPress={onUpgrade} activeOpacity={0.85}>
      <AlertTriangle size={14} color="#EAB308" />
      <Text style={limitStyles.text}>
        {remaining > 0
          ? `${remaining} messages left today`
          : 'Daily limit reached — upgrade for more'}
      </Text>
      {remaining === 0 && <Text style={limitStyles.link}>Upgrade</Text>}
    </TouchableOpacity>
  );
}

const limitStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAB30811',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  text: { flex: 1, fontSize: 12, color: '#EAB308' },
  link: { fontSize: 12, color: '#F97316', fontWeight: '600' },
});

// ============================================
// Suggestion prompts
// ============================================
const SUGGESTIONS = [
  'How much Vitamin D do I need?',
  "What's the best time to get sun today?",
  'Is my UV exposure safe for my skin type?',
  'How do I maximize Vitamin D in 20 minutes?',
];

// ============================================
// Main Screen
// ============================================
export default function CoachTabScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<CoachMessage[]>({
    queryKey: ['coach-messages'],
    queryFn: getCoachMessages,
    enabled: isPro,
  });

  const { data: todayCount = 0 } = useQuery<number>({
    queryKey: ['coach-count'],
    queryFn: getTodayCoachMessageCount,
    enabled: isPro,
  });

  const limit = isPro
    ? APP_CONFIG.SUBSCRIPTION.PRO_TIER_LIMITS.coach_messages_per_day
    : APP_CONFIG.SUBSCRIPTION.FREE_TIER_LIMITS.coach_messages_per_day;

  const isAtLimit = todayCount >= limit;

  const sendMutation = useMutation({
    mutationFn: sendCoachMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-messages'] });
      queryClient.invalidateQueries({ queryKey: ['coach-count'] });
      setInputText('');
    },
    onError: () => {
      Alert.alert('Error', 'Could not send message. Please try again.');
    },
  });

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isAtLimit || sendMutation.isPending) return;
    sendMutation.mutate(text);
  }, [inputText, isAtLimit, sendMutation]);

  const handleSuggestion = useCallback(
    (text: string) => {
      if (isAtLimit) return;
      sendMutation.mutate(text);
    },
    [isAtLimit, sendMutation]
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleUpgrade = () => router.push('/paywall');

  if (!isPro) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.coachAvatar}>
              <Sun size={18} color="#F97316" />
            </View>
            <Text style={styles.title}>AI Coach</Text>
          </View>
        </View>
        <ProGateMessage onUpgrade={handleUpgrade} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.coachAvatar}>
            <Sun size={18} color="#F97316" />
          </View>
          <View>
            <Text style={styles.title}>AI Coach</Text>
            <Text style={styles.subtitle}>Powered by SunTrace AI</Text>
          </View>
        </View>
        <Text style={styles.countText}>
          {todayCount}/{limit}
        </Text>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <AlertTriangle size={12} color="#64748B" />
        <Text style={styles.disclaimerText}>
          Not medical advice. Always consult a healthcare provider for medical decisions.
        </Text>
      </View>

      {/* Limit banner */}
      <LimitBanner used={todayCount} limit={limit} onUpgrade={handleUpgrade} />

      {/* Messages */}
      {messagesLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#F97316" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sun size={40} color="#334155" />
              <Text style={styles.emptyTitle}>Ask your Sun Coach</Text>
              <Text style={styles.emptySubtitle}>
                Get personalized advice about UV exposure, Vitamin D, and healthy sun habits.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestion(s)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          onContentSizeChange={() => {
            if (messages.length > 0) listRef.current?.scrollToEnd({ animated: false });
          }}
        />
      )}

      {/* Typing indicator */}
      {sendMutation.isPending && <TypingIndicator />}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={isAtLimit ? 'Daily limit reached' : 'Ask about sun exposure...'}
          placeholderTextColor="#475569"
          multiline
          maxLength={500}
          editable={!isAtLimit && !sendMutation.isPending}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!inputText.trim() || isAtLimit || sendMutation.isPending) &&
              styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isAtLimit || sendMutation.isPending}
          activeOpacity={0.8}
        >
          <Send size={18} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#F1F5F9' },
  subtitle: { fontSize: 11, color: '#64748B' },
  countText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  disclaimerText: { fontSize: 11, color: '#475569', flex: 1, lineHeight: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { paddingTop: 16, paddingBottom: 8 },
  emptyState: { padding: 32, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestions: { gap: 8, width: '100%', marginTop: 8 },
  suggestionChip: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  suggestionText: { fontSize: 13, color: '#94A3B8' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#F1F5F9',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
  },
});
