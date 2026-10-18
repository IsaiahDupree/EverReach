import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { backendBase } from '@/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Send, XCircle, Server, ShieldCheck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Stack } from 'expo-router';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AgentResponse {
  message: string;
  conversation_id?: string;
  metadata?: {
    model?: string;
    tokens_used?: number;
    response_time?: number;
  };
}

export default function AgentChatTestScreen() {
  const insets = useSafeAreaInsets();
  const { theme, cloudModeEnabled } = useAppSettings();
  const [message, setMessage] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pinging, setPinging] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<{ 
    reachable: boolean; 
    status?: number; 
    message?: string; 
    responseTime?: number; 
    baseUrl: string; 
    hasAuth: boolean 
  }>({ 
    reachable: false, 
    baseUrl: backendBase(), 
    hasAuth: false 
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  const onPingBackend = useCallback(async () => {
    setPinging(true);
    try {
      const start = Date.now();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const res = await fetch(`${backendBase()}/api/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const rt = Date.now() - start;
      let msg: string | undefined = undefined;
      try {
        const json = await res.json();
        msg = typeof json?.message === 'string' ? json.message : JSON.stringify(json);
      } catch {
        msg = 'Non-JSON response';
      }
      setBackendStatus({ 
        reachable: res.ok, 
        status: res.status, 
        message: msg, 
        responseTime: rt, 
        baseUrl: backendBase(), 
        hasAuth: Boolean(token) 
      });
    } catch (e: any) {
      setBackendStatus({ 
        reachable: false, 
        status: undefined, 
        message: String(e?.message ?? e), 
        responseTime: 0, 
        baseUrl: backendBase(), 
        hasAuth: false 
      });
    } finally {
      setPinging(false);
    }
  }, []);

  const onSendMessage = useCallback(async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!cloudModeEnabled) {
      setError('Cloud mode is disabled. Enable it in settings to use the agent chat API.');
      return;
    }

    setSending(true);
    setError(null);

    const userMessage: Message = {
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    try {
      console.log('[Agent Chat] Sending message:', userMessage.content);
      console.log('[Agent Chat] Conversation ID:', conversationId);
      console.log('[Agent Chat] Endpoint:', `${backendBase()}/api/v1/agent/chat`);

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available. Please sign in.');
      }

      const requestBody = {
        message: userMessage.content,
        ...(conversationId ? { conversation_id: conversationId } : {}),
        context: {
          use_tools: true,
          max_tokens: 500,
        },
      };

      console.log('[Agent Chat] Request body:', JSON.stringify(requestBody, null, 2));

      const startTime = Date.now();
      const response = await fetch(`${backendBase()}/api/v1/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;
      console.log('[Agent Chat] Response status:', response.status);
      console.log('[Agent Chat] Response time:', responseTime + 'ms');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Agent Chat] Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data2: AgentResponse = await response.json();
      console.log('[Agent Chat] Response data:', data2);

      if (data2.conversation_id && !conversationId) {
        setConversationId(data2.conversation_id);
        console.log('[Agent Chat] New conversation ID:', data2.conversation_id);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data2.message,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error('[Agent Chat] Error:', e);
      setError(String(e?.message ?? e));
      
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${e?.message ?? 'Failed to send message'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  }, [message, conversationId, cloudModeEnabled]);

  const onClearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    console.log('[Agent Chat] Chat cleared');
  }, []);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Agent Chat Test',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
        }} 
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={[styles.container, { paddingTop: insets.top }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <MessageSquare size={24} color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Agent Chat API Test</Text>
          </View>

          <View style={[styles.statusCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <View style={styles.statusRow}>
              <Server size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Base URL</Text>
              <Text selectable style={[styles.statusValue, { color: theme.colors.text }]}>{backendStatus.baseUrl}</Text>
            </View>
            <View style={styles.statusRow}>
              <ShieldCheck size={16} color={backendStatus.hasAuth ? theme.colors.success : theme.colors.error} />
              <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Auth</Text>
              <Text style={[styles.statusValue, { color: backendStatus.hasAuth ? theme.colors.success : theme.colors.error }]}>
                {backendStatus.hasAuth ? 'Token present' : 'No token'}
              </Text>
            </View>
            <View style={styles.statusFooter}>
              <View style={[styles.statusPill, { backgroundColor: backendStatus.reachable ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                <Text style={[styles.statusPillText, { color: backendStatus.reachable ? theme.colors.success : theme.colors.error }]}>
                  {backendStatus.reachable ? `Reachable ${backendStatus.status ?? ''}` : 'Unreachable'}
                </Text>
              </View>
              {typeof backendStatus.responseTime === 'number' && backendStatus.responseTime > 0 && (
                <Text style={[styles.responseTime, { color: theme.colors.textSecondary }]}>{backendStatus.responseTime}ms</Text>
              )}
            </View>
            <TouchableOpacity 
              testID="ping-backend" 
              style={[styles.pingBtn, { backgroundColor: theme.colors.primary }]} 
              onPress={onPingBackend} 
              disabled={pinging}
            >
              {pinging ? <ActivityIndicator color="#fff" /> : (
                <View style={styles.btnContent}>
                  <Server size={16} color="#fff" />
                  <Text style={styles.btnText}>Ping Backend</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {!cloudModeEnabled && (
            <View style={[styles.banner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}>
              <View style={styles.bannerRow}>
                <XCircle size={18} color={theme.colors.error} />
                <Text style={[styles.bannerText, { color: theme.colors.textSecondary }]}>
                  Cloud mode is disabled. Enable it in settings to use the agent chat API.
                </Text>
              </View>
            </View>
          )}

          {conversationId && (
            <View style={[styles.conversationInfo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.conversationLabel, { color: theme.colors.textSecondary }]}>Conversation ID:</Text>
              <Text selectable style={[styles.conversationId, { color: theme.colors.text }]}>{conversationId}</Text>
            </View>
          )}

          <ScrollView 
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <MessageSquare size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No messages yet. Send a message to start chatting with the agent.
                </Text>
              </View>
            ) : (
              messages.map((msg, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.messageCard,
                    msg.role === 'user' 
                      ? { backgroundColor: theme.colors.primary, alignSelf: 'flex-end' }
                      : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, alignSelf: 'flex-start' }
                  ]}
                >
                  <Text style={[
                    styles.messageRole,
                    { color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }
                  ]}>
                    {msg.role === 'user' ? 'You' : 'Agent'}
                  </Text>
                  <Text style={[
                    styles.messageContent,
                    { color: msg.role === 'user' ? '#fff' : theme.colors.text }
                  ]}>
                    {msg.content}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}>
              <XCircle size={16} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              testID="message-input"
              placeholder="Type your message..."
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                testID="clear-chat" 
                style={[styles.clearBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} 
                onPress={onClearChat}
                disabled={sending || messages.length === 0}
              >
                <Text style={[styles.clearBtnText, { color: theme.colors.text }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                testID="send-message" 
                style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]} 
                onPress={onSendMessage} 
                disabled={sending || !message.trim() || !cloudModeEnabled}
              >
                {sending ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnContent}>
                    <Send size={16} color="#fff" />
                    <Text style={styles.btnText}>Send</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  content: { 
    flex: 1,
    padding: 16, 
    gap: 12 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 8 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700' as const
  },
  statusCard: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12, 
    gap: 8 
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  statusLabel: { 
    fontSize: 12, 
    fontWeight: '600' as const
  },
  statusValue: { 
    fontSize: 12, 
    flexShrink: 1 
  },
  statusFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  statusPill: { 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    borderRadius: 999 
  },
  statusPillText: { 
    fontSize: 12, 
    fontWeight: '700' as const
  },
  responseTime: { 
    fontSize: 12, 
    marginLeft: 'auto' as const
  },
  pingBtn: { 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center' as const
  },
  btnContent: { 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center' as const
  },
  btnText: { 
    color: '#fff', 
    fontWeight: '700' as const
  },
  banner: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12 
  },
  bannerRow: { 
    flexDirection: 'row', 
    alignItems: 'center' as const, 
    gap: 8 
  },
  bannerText: { 
    fontSize: 12, 
    flex: 1 
  },
  conversationInfo: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12, 
    gap: 4 
  },
  conversationLabel: { 
    fontSize: 11, 
    fontWeight: '600' as const
  },
  conversationId: { 
    fontSize: 11, 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' 
  },
  messagesContainer: { 
    flex: 1,
    borderRadius: 12,
  },
  messagesContent: { 
    gap: 12,
    paddingVertical: 8,
  },
  emptyState: { 
    flex: 1,
    alignItems: 'center' as const, 
    justifyContent: 'center' as const, 
    gap: 12,
    paddingVertical: 48,
  },
  emptyText: { 
    fontSize: 14, 
    textAlign: 'center' as const,
    maxWidth: 280,
  },
  messageCard: { 
    borderRadius: 12, 
    padding: 12, 
    gap: 4,
    maxWidth: '80%',
    borderWidth: 1,
  },
  messageRole: { 
    fontSize: 11, 
    fontWeight: '600' as const
  },
  messageContent: { 
    fontSize: 14, 
    lineHeight: 20 
  },
  errorBox: { 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center' as const, 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 10 
  },
  errorText: { 
    fontSize: 12, 
    flex: 1 
  },
  inputContainer: { 
    gap: 8 
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 12, 
    minHeight: 80, 
    textAlignVertical: 'top' as const
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 12 
  },
  clearBtn: { 
    flex: 1,
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  clearBtnText: { 
    fontWeight: '600' as const
  },
  sendBtn: { 
    flex: 2,
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center' as const
  },
});
