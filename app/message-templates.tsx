import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTemplates } from '@/providers/TemplatesProvider';
import { MessageChannel, TEMPLATE_VARIABLES } from '@/types/templates';
import { ChevronLeft, Info } from 'lucide-react-native';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';
import { PaywallGate } from '@/components/PaywallGate';

export default function MessageTemplatesScreen() {
  const { templates, isLoading, updateTemplate, updateVoiceContext, toggleEnabled, resetToDefaults } = useTemplates();
  const [activeTab, setActiveTab] = useState<MessageChannel>('email');
  const insets = useSafeAreaInsets();
  const [variablesCollapsed, setVariablesCollapsed] = useState(Platform.OS !== 'web');
  
  // Voice context editing state
  const [voiceContextDraft, setVoiceContextDraft] = useState(templates.voiceContext || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('MessageTemplates');

  // Update draft when templates change
  React.useEffect(() => {
    setVoiceContextDraft(templates.voiceContext || '');
    setHasUnsavedChanges(false);
  }, [templates.voiceContext]);

  const handleSaveVoiceContext = async () => {
    try {
      setIsSaving(true);
      await updateVoiceContext(voiceContextDraft);
      setHasUnsavedChanges(false);
      
      screenAnalytics.track('voice_context_saved', {
        hasContent: !!voiceContextDraft,
        length: voiceContextDraft?.length || 0,
        wordCount: voiceContextDraft?.split(/\s+/).filter(w => w).length || 0,
      });
      
      Alert.alert('Success', 'Voice & tone preferences saved!');
    } catch (error) {
      analytics.errors.occurred(error as Error, 'MessageTemplates');
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelVoiceContext = () => {
    setVoiceContextDraft(templates.voiceContext || '');
    setHasUnsavedChanges(false);
    
    screenAnalytics.track('voice_context_cancelled', {
      hadChanges: hasUnsavedChanges,
    });
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Templates',
      'Are you sure you want to reset all templates to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetToDefaults();
              
              // Track template reset
              screenAnalytics.track('templates_reset', {
                previouslyEnabled: templates.enabled,
              });
              
              Alert.alert('Success', 'Templates reset to defaults');
            } catch (error) {
              analytics.errors.occurred(error as Error, 'MessageTemplates');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Message Templates',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ChevronLeft size={24} color="#000000" />
              </TouchableOpacity>
            ),
          }}
        />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </SafeAreaView>
    );
  }

  return (
    <PaywallGate featureArea="ai_messages">
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Message Templates',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronLeft size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.enableSection}>
          <View style={styles.enableHeader}>
            <Text style={styles.enableTitle}>Enable Templates</Text>
            <Switch
              value={templates.enabled}
              onValueChange={(value) => {
                screenAnalytics.track('templates_toggled', {
                  enabled: value,
                });
                toggleEnabled();
              }}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.enableDescription}>
            Use your saved templates to shape how messages are drafted.
          </Text>
        </View>

        <View style={styles.voiceContextSection}>
          <Text style={styles.sectionTitle}>Voice & Tone</Text>
          <Text style={styles.sectionDescription}>
            Describe how you'd like your messages to sound. This helps AI stay close to your natural style.
          </Text>
          <CrossPlatformTextInput
            style={[styles.input, styles.voiceContextInput]}
            value={voiceContextDraft}
            onChangeText={(text) => {
              setVoiceContextDraft(text);
              setHasUnsavedChanges(text !== (templates.voiceContext || ''));
            }}
            placeholder='Example: "Casual and friendly" or "Direct and professional, keep it short"'
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={4}
          />
          <Text style={styles.voiceHint}>
            You can mention things like formality, pace, and overall vibe.
          </Text>
          
          <View style={styles.voiceContextActions}>
            {hasUnsavedChanges && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelVoiceContext}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.saveButton, 
                (!hasUnsavedChanges || isSaving) && styles.saveButtonDisabled
              ]}
              onPress={handleSaveVoiceContext}
              disabled={!hasUnsavedChanges || isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'email' && styles.activeTab]}
            onPress={() => {
              screenAnalytics.track('template_tab_changed', {
                tab: 'email',
                previousTab: activeTab,
              });
              setActiveTab('email');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'email' && styles.activeTabText]}>
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sms' && styles.activeTab]}
            onPress={() => {
              screenAnalytics.track('template_tab_changed', {
                tab: 'sms',
                previousTab: activeTab,
              });
              setActiveTab('sms');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'sms' && styles.activeTabText]}>SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'dm' && styles.activeTab]}
            onPress={() => {
              screenAnalytics.track('template_tab_changed', {
                tab: 'dm',
                previousTab: activeTab,
              });
              setActiveTab('dm');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'dm' && styles.activeTabText]}>DM</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'email' && (
          <View style={styles.templateSection}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Subject Line</Text>
              <CrossPlatformTextInput
                style={styles.input}
                value={templates.email.subjectLine}
                onChangeText={(text) => updateTemplate('email', { subjectLine: text })}
                onBlur={() => {
                  screenAnalytics.track('template_edited', {
                    channel: 'email',
                    field: 'subject',
                    length: templates.email.subjectLine.length,
                  });
                }}
                placeholder="Enter subject line template"
                placeholderTextColor="#8E8E93"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Body</Text>
              <CrossPlatformTextInput
                style={[styles.input, styles.multilineInput]}
                value={templates.email.body}
                onChangeText={(text) => updateTemplate('email', { body: text })}
                placeholder="Enter email body template"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={6}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Closing</Text>
              <CrossPlatformTextInput
                style={[styles.input, styles.multilineInput]}
                value={templates.email.closing}
                onChangeText={(text) => updateTemplate('email', { closing: text })}
                placeholder="Enter closing template"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        )}

        {activeTab === 'sms' && (
          <View style={styles.templateSection}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Message</Text>
              <CrossPlatformTextInput
                style={[styles.input, styles.multilineInput]}
                value={templates.sms.body}
                onChangeText={(text) => updateTemplate('sms', { body: text })}
                placeholder="Enter SMS template"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        )}

        {activeTab === 'dm' && (
          <View style={styles.templateSection}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Message</Text>
              <CrossPlatformTextInput
                style={[styles.input, styles.multilineInput]}
                value={templates.dm.body}
                onChangeText={(text) => updateTemplate('dm', { body: text })}
                placeholder="Enter DM template"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        )}

        <View style={styles.variablesSection}>
          <View style={styles.variablesHeader}>
            <Info size={16} color="#8E8E93" />
            <Text style={styles.variablesTitle}>Available Variables</Text>
            <TouchableOpacity onPress={() => setVariablesCollapsed((v) => !v)} style={{ marginLeft: 'auto' }}>
              <Text style={{ color: '#007AFF', fontWeight: '600' }}>{variablesCollapsed ? 'Show' : 'Hide'}</Text>
            </TouchableOpacity>
          </View>
          {!variablesCollapsed && TEMPLATE_VARIABLES.map((variable) => (
            <View key={variable.key} style={styles.variableRow}>
              <Text style={styles.variableKey}>{variable.key}</Text>
              <Text style={styles.variableDescription}>{variable.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    </PaywallGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#8E8E93',
  },
  enableSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  enableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  enableTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#000000',
  },
  enableDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  voiceContextSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  voiceContextInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  voiceHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
    lineHeight: 18,
  },
  voiceContextActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    backgroundColor: '#B0D4FF',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  templateSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  variablesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  variablesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  variablesTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#000000',
  },
  variableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  variableKey: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#007AFF',
    fontWeight: '500' as const,
  },
  variableDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  buttonContainer: {
    marginBottom: 32,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
