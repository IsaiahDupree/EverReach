import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Clipboard,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Key,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Terminal,
  Book,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { apiFetch } from '@/lib/api';
import { go } from '@/lib/navigation';
import Constants from 'expo-constants';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string; // evr_live_ or evr_test_
  scopes: string[];
  environment: 'test' | 'live';
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export default function DeveloperSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  // Check if developer settings are enabled
  const SHOW_DEV_SETTINGS = Constants.expoConfig?.extra?.EXPO_PUBLIC_SHOW_DEV_SETTINGS === 'true';

  useEffect(() => {
    if (SHOW_DEV_SETTINGS) {
      loadApiKeys();
    }
  }, [SHOW_DEV_SETTINGS]);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/v1/developer/keys', { requireAuth: true });
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error('[Developer] Error loading keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setRevealedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const handleRevokeKey = (keyId: string, keyName: string) => {
    Alert.alert(
      'Revoke API Key',
      `Are you sure you want to revoke "${keyName}"? This cannot be undone and will immediately break any integrations using this key.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiFetch(`/api/v1/developer/keys/${keyId}`, {
                method: 'DELETE',
                requireAuth: true,
              });
              if (response.ok) {
                Alert.alert('Success', 'API key revoked successfully');
                loadApiKeys();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke API key');
            }
          },
        },
      ]
    );
  };

  // If dev settings are disabled, show locked screen
  if (!SHOW_DEV_SETTINGS) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Developer Settings',
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTitleStyle: { color: theme.colors.text },
            headerLeft: () => (
              <TouchableOpacity onPress={() => go.back()} style={{ marginLeft: 16 }}>
                <ChevronLeft size={24} color={theme.colors.text} />
              </TouchableOpacity>
            ),
          }}
        />

        <View style={styles.disabledContainer}>
          <Lock size={64} color={theme.colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={[styles.disabledTitle, { color: theme.colors.text }]}>
            Developer Settings Disabled
          </Text>
          <Text style={[styles.disabledDescription, { color: theme.colors.textSecondary }]}>
            This page is only available in development mode.
          </Text>
          <View style={[styles.disabledBox, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.disabledBoxText, { color: theme.colors.textSecondary }]}>
              To enable this page, set:
            </Text>
            <Text style={[styles.disabledCode, { color: theme.colors.primary }]}>
              EXPO_PUBLIC_SHOW_DEV_SETTINGS=true
            </Text>
            <Text style={[styles.disabledBoxText, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              in your .env file and rebuild the app.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.disabledButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => go.back()}
          >
            <Text style={[styles.disabledButtonText, { color: theme.colors.primary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Developer Settings',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text },
          headerLeft: () => (
            <TouchableOpacity onPress={() => go.back()} style={{ marginLeft: 16 }}>
              <ChevronLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Terminal size={32} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            EverReach Public API
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Build powerful integrations and AI agents
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => Alert.alert('API Docs', 'Full API documentation coming soon! Check PUBLIC_API_DEVELOPER_GUIDE.md for now.')}
          >
            <View style={styles.actionIcon}>
              <Book size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                API Documentation
              </Text>
              <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                Complete API reference and guides
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => Alert.alert('API Playground', 'Interactive API testing playground coming soon!')}
          >
            <View style={styles.actionIcon}>
              <Terminal size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                API Playground
              </Text>
              <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                Test endpoints interactively
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => Alert.alert('Usage Analytics', 'API usage dashboard coming soon!')}
          >
            <View style={styles.actionIcon}>
              <BarChart3 size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                Usage & Analytics
              </Text>
              <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                Monitor API usage and rate limits
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* API Keys Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>API Keys</Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>New Key</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : apiKeys.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
              <Key size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No API keys yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Create your first API key to start building
              </Text>
            </View>
          ) : (
            apiKeys.map(key => (
              <View
                key={key.id}
                style={[styles.keyCard, { backgroundColor: theme.colors.surface }]}
              >
                <View style={styles.keyHeader}>
                  <View style={styles.keyTitleRow}>
                    <Text style={[styles.keyName, { color: theme.colors.text }]}>
                      {key.name}
                    </Text>
                    <View
                      style={[
                        styles.envBadge,
                        {
                          backgroundColor:
                            key.environment === 'live'
                              ? theme.colors.success + '20'
                              : theme.colors.warning + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.envBadgeText,
                          {
                            color:
                              key.environment === 'live'
                                ? theme.colors.success
                                : theme.colors.warning,
                          },
                        ]}
                      >
                        {key.environment === 'live' ? 'Live' : 'Test'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.keyCreated, { color: theme.colors.textTertiary }]}>
                    Created {new Date(key.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={[styles.keyValue, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.keyPrefix, { color: theme.colors.textSecondary }]}>
                    {key.prefix}
                  </Text>
                  <Text style={[styles.keySecret, { color: theme.colors.text }]} numberOfLines={1}>
                    {revealedKeys.has(key.id) ? key.key : '••••••••••••••••••••••••••••••••'}
                  </Text>
                </View>

                <View style={styles.keyActions}>
                  <TouchableOpacity
                    style={styles.keyAction}
                    onPress={() => toggleKeyVisibility(key.id)}
                  >
                    {revealedKeys.has(key.id) ? (
                      <EyeOff size={18} color={theme.colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={theme.colors.textSecondary} />
                    )}
                    <Text style={[styles.keyActionText, { color: theme.colors.textSecondary }]}>
                      {revealedKeys.has(key.id) ? 'Hide' : 'Reveal'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.keyAction}
                    onPress={() => copyToClipboard(key.key, 'API key')}
                  >
                    <Copy size={18} color={theme.colors.textSecondary} />
                    <Text style={[styles.keyActionText, { color: theme.colors.textSecondary }]}>
                      Copy
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.keyAction}
                    onPress={() => handleRevokeKey(key.id, key.name)}
                  >
                    <Trash2 size={18} color={theme.colors.error} />
                    <Text style={[styles.keyActionText, { color: theme.colors.error }]}>
                      Revoke
                    </Text>
                  </TouchableOpacity>
                </View>

                {key.scopes && key.scopes.length > 0 && (
                  <View style={styles.scopes}>
                    <Text style={[styles.scopesLabel, { color: theme.colors.textSecondary }]}>
                      Scopes:
                    </Text>
                    <View style={styles.scopesList}>
                      {key.scopes.slice(0, 3).map(scope => (
                        <View
                          key={scope}
                          style={[styles.scopeBadge, { backgroundColor: theme.colors.backgroundTertiary }]}
                        >
                          <Text style={[styles.scopeBadgeText, { color: theme.colors.textSecondary }]}>
                            {scope}
                          </Text>
                        </View>
                      ))}
                      {key.scopes.length > 3 && (
                        <Text style={[styles.scopesMore, { color: theme.colors.textTertiary }]}>
                          +{key.scopes.length - 3} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Security Notice */}
        <View style={[styles.notice, { backgroundColor: theme.colors.warning + '10' }]}>
          <AlertCircle size={20} color={theme.colors.warning} />
          <Text style={[styles.noticeText, { color: theme.colors.warning }]}>
            Never share your API keys or commit them to version control. Store them securely in environment variables.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyState: {
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  keyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  keyHeader: {
    marginBottom: 12,
  },
  keyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  keyName: {
    fontSize: 16,
    fontWeight: '600',
  },
  envBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  envBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  keyCreated: {
    fontSize: 12,
  },
  keyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  keyPrefix: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  keySecret: {
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
  },
  keyActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  keyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keyActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scopes: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  scopesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  scopesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scopeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  scopeBadgeText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  scopesMore: {
    fontSize: 11,
    padding: 4,
  },
  notice: {
    flexDirection: 'row',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  // Disabled state styles
  disabledContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  disabledTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  disabledDescription: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  disabledBox: {
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  disabledBoxText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  disabledCode: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginTop: 12,
    textAlign: 'center',
  },
  disabledButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  disabledButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
