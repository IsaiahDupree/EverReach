/**
 * Developer Subscription Override Screen
 * 
 * Allows developers to force specific subscription states for testing.
 * Only works in development mode and requires dev role on backend.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useEntitlements } from '@/providers/EntitlementsProviderV3';
import {
  SubscriptionStatus,
  STATUS_LABELS,
  EntitlementKey,
  DevSubOverride,
} from '@/lib/types/subscription';

const AVAILABLE_STATUSES: SubscriptionStatus[] = [
  'NO_SUBSCRIPTION',
  'TRIAL_ACTIVE',
  'TRIAL_EXPIRED',
  'ACTIVE',
  'ACTIVE_CANCELED',
  'GRACE',
  'PAUSED',
  'EXPIRED',
  'LIFETIME',
];

export default function DevSubscriptionOverrideScreen() {
  const { entitlements, loading, devOverride, setDevOverride } = useEntitlements();

  const [enabled, setEnabled] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [pro, setPro] = useState(true);
  const [teams, setTeams] = useState(false);
  const [lifetime, setLifetime] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [graceEnds, setGraceEnds] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (devOverride) {
      setEnabled(devOverride.mode === 'force');
      setSelectedStatus(devOverride.status || 'ACTIVE');
      const ents = devOverride.entitlements || [];
      setPro(ents.includes('pro'));
      setTeams(ents.includes('teams'));
      setLifetime(ents.includes('lifetime'));
      setTrialEndsAt(devOverride.trial_ends_at || '');
      setPeriodEnd(devOverride.current_period_end || '');
      setGraceEnds(devOverride.grace_ends_at || '');
      setNotes(devOverride.notes || '');
    }
  }, [devOverride]);

  function getSelectedEntitlements(): EntitlementKey[] {
    const ents: EntitlementKey[] = [];
    if (pro) ents.push('pro');
    if (teams) ents.push('teams');
    if (lifetime) ents.push('lifetime');
    return ents;
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (!enabled) {
        await setDevOverride(null);
        Alert.alert('Success', 'Override cleared. Using live subscription state.');
      } else {
        const override: DevSubOverride = {
          mode: 'force',
          status: selectedStatus,
          entitlements: getSelectedEntitlements(),
          trial_ends_at: trialEndsAt || null,
          current_period_end: periodEnd || null,
          grace_ends_at: graceEnds || null,
          notes: notes || 'Set from Dev UI',
        };
        await setDevOverride(override);
        Alert.alert('Success', 'Override applied successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to apply override');
    } finally {
      setSaving(false);
    }
  }

  function fillPreset(preset: 'trial' | 'active' | 'grace' | 'expired') {
    const now = new Date();
    switch (preset) {
      case 'trial':
        setSelectedStatus('TRIAL_ACTIVE');
        setTrialEndsAt(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());
        setPeriodEnd('');
        setGraceEnds('');
        setPro(true);
        setTeams(false);
        setLifetime(false);
        break;
      case 'active':
        setSelectedStatus('ACTIVE');
        setTrialEndsAt('');
        setPeriodEnd(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString());
        setGraceEnds('');
        setPro(true);
        setTeams(false);
        setLifetime(false);
        break;
      case 'grace':
        setSelectedStatus('GRACE');
        setTrialEndsAt('');
        setPeriodEnd(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString());
        setGraceEnds(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString());
        setPro(true);
        setTeams(false);
        setLifetime(false);
        break;
      case 'expired':
        setSelectedStatus('EXPIRED');
        setTrialEndsAt(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString());
        setPeriodEnd(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString());
        setGraceEnds('');
        setPro(false);
        setTeams(false);
        setLifetime(false);
        break;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Subscription Override',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <AlertCircle size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            Dev only. Disabled in production. Requires dev role.
          </Text>
        </View>

        {/* Current Live State */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Live State</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>{entitlements?.status || 'Loading...'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Entitlements:</Text>
            <Text style={styles.infoValue}>
              {entitlements?.entitlements.join(', ') || 'none'}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Active:</Text>
            <Text style={styles.infoValue}>{String(entitlements?.active)}</Text>
          </View>
        </View>

        {/* Enable Override */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>Enable Override</Text>
            <Switch value={enabled} onValueChange={setEnabled} />
          </View>
        </View>

        {enabled && (
          <>
            {/* Quick Presets */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Presets</Text>
              <View style={styles.presetButtons}>
                <TouchableOpacity style={styles.presetButton} onPress={() => fillPreset('trial')}>
                  <Text style={styles.presetButtonText}>Trial Active</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetButton} onPress={() => fillPreset('active')}>
                  <Text style={styles.presetButtonText}>Active Sub</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetButton} onPress={() => fillPreset('grace')}>
                  <Text style={styles.presetButtonText}>Grace Period</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetButton} onPress={() => fillPreset('expired')}>
                  <Text style={styles.presetButtonText}>Expired</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Forced Status</Text>
              <View style={styles.statusGrid}>
                {AVAILABLE_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      selectedStatus === status && styles.statusChipSelected,
                    ]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        selectedStatus === status && styles.statusChipTextSelected,
                      ]}
                    >
                      {STATUS_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Entitlements */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Entitlements</Text>
              <View style={styles.entitlementsRow}>
                <TouchableOpacity style={styles.checkbox} onPress={() => setPro(!pro)}>
                  <Text style={styles.checkboxText}>{pro ? '☑' : '☐'} Pro</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkbox} onPress={() => setTeams(!teams)}>
                  <Text style={styles.checkboxText}>{teams ? '☑' : '☐'} Teams</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkbox} onPress={() => setLifetime(!lifetime)}>
                  <Text style={styles.checkboxText}>{lifetime ? '☑' : '☐'} Lifetime</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dates (ISO 8601)</Text>

              <Text style={styles.inputLabel}>trial_ends_at</Text>
              <TextInput
                style={styles.input}
                value={trialEndsAt}
                onChangeText={setTrialEndsAt}
                placeholder="2025-11-09T15:00:00Z"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>current_period_end</Text>
              <TextInput
                style={styles.input}
                value={periodEnd}
                onChangeText={setPeriodEnd}
                placeholder="2025-12-02T15:00:00Z"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>grace_ends_at</Text>
              <TextInput
                style={styles.input}
                value={graceEnds}
                onChangeText={setGraceEnds}
                placeholder="2025-11-12T15:00:00Z"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : enabled ? 'Apply Override' : 'Clear Override'}
          </Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  statusChipSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#DBEAFE',
  },
  statusChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusChipTextSelected: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  entitlementsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  checkbox: {
    paddingVertical: 8,
  },
  checkboxText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  spacer: {
    height: 40,
  },
});
