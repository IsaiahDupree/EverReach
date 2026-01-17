import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, Alert, Switch } from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePaywall } from '@/providers/PaywallProvider';
import type { Provider } from '@/hooks/useLivePaywall';

export default function PaywallDebugScreen() {
  const {
    remoteConfig,
    remoteProvider,
    paywallId,
    remoteConfigLoading,
    remoteConfigError,
    refreshRemoteConfig,
    isSimulationEnabled,
    simulatedState,
    toggleSimulation,
    updateSimulatedState,
  } = usePaywall();

  const [devOverride, setDevOverride] = useState<Provider | null>(null);

  useEffect(() => {
    loadDevOverride();
  }, []);

  const loadDevOverride = async () => {
    try {
      const override = await AsyncStorage.getItem('dev:paywallProvider');
      if (override === 'custom' || override === 'revenuecat' || override === 'superwall') {
        setDevOverride(override as Provider);
      }
    } catch (error) {
      console.error('[PaywallDebug] Error loading override:', error);
    }
  };

  const setOverride = async (provider: Provider | null) => {
    try {
      if (provider) {
        await AsyncStorage.setItem('dev:paywallProvider', provider);
        setDevOverride(provider);
        Alert.alert(
          'Override Set',
          `Paywall provider override set to: ${provider}\n\nRestart the app or refresh to see changes.`,
          [
            { text: 'OK' },
            { text: 'Refresh Now', onPress: () => refreshRemoteConfig() }
          ]
        );
      } else {
        await AsyncStorage.removeItem('dev:paywallProvider');
        setDevOverride(null);
        Alert.alert('Override Cleared', 'Using backend configuration', [
          { text: 'OK' },
          { text: 'Refresh Now', onPress: () => refreshRemoteConfig() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set override');
    }
  };

  const clearOverride = () => {
    Alert.alert(
      'Clear Override',
      'Remove the dev override and use backend configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setOverride(null) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Paywall Debug',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Simulation Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Simulation Mode</Text>
          <Text style={styles.sectionDescription}>
            Manually override user subscription state for testing.
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Enable Simulation</Text>
              <Switch
                value={isSimulationEnabled}
                onValueChange={toggleSimulation}
              />
            </View>

            {isSimulationEnabled && (
              <>
                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Is Premium</Text>
                  <Switch
                    value={simulatedState.isPremium}
                    onValueChange={(val) => updateSimulatedState({ isPremium: val })}
                  />
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Trial Expired</Text>
                  <Switch
                    value={simulatedState.isTrialExpired}
                    onValueChange={(val) => updateSimulatedState({ isTrialExpired: val })}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Remote Config Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remote Configuration</Text>

          {remoteConfigLoading ? (
            <View style={styles.card}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : remoteConfigError ? (
            <View style={[styles.card, styles.errorCard]}>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorText}>{remoteConfigError}</Text>
            </View>
          ) : remoteConfig ? (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Platform:</Text>
                <Text style={styles.value}>{remoteConfig.platform}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Provider:</Text>
                <Text style={[styles.value, styles.providerValue]}>{remoteConfig.provider}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Paywall ID:</Text>
                <Text style={styles.value}>{remoteConfig.paywall_id}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Updated:</Text>
                <Text style={styles.value}>
                  {new Date(remoteConfig.updated_at).toLocaleString()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.noDataText}>No remote config loaded</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => refreshRemoteConfig()}
          >
            <RefreshCw size={16} color="#3B82F6" />
            <Text style={styles.refreshButtonText}>Refresh Config</Text>
          </TouchableOpacity>
        </View>

        {/* Dev Override */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dev Override</Text>
          <Text style={styles.sectionDescription}>
            {Platform.OS === 'web'
              ? 'Use ?paywallProvider=custom|revenuecat|superwall in URL'
              : 'Set a provider override for testing (persists until cleared)'}
          </Text>

          {Platform.OS !== 'web' && (
            <>
              {devOverride && (
                <View style={[styles.card, styles.overrideCard]}>
                  <Text style={styles.overrideLabel}>Active Override:</Text>
                  <Text style={styles.overrideValue}>{devOverride}</Text>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearOverride}
                  >
                    <Text style={styles.clearButtonText}>Clear Override</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[
                    styles.providerButton,
                    devOverride === 'custom' && styles.providerButtonActive,
                  ]}
                  onPress={() => setOverride('custom')}
                >
                  <Text
                    style={[
                      styles.providerButtonText,
                      devOverride === 'custom' && styles.providerButtonTextActive,
                    ]}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.providerButton,
                    devOverride === 'revenuecat' && styles.providerButtonActive,
                  ]}
                  onPress={() => setOverride('revenuecat')}
                >
                  <Text
                    style={[
                      styles.providerButtonText,
                      devOverride === 'revenuecat' && styles.providerButtonTextActive,
                    ]}
                  >
                    RevenueCat
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.providerButton,
                    devOverride === 'superwall' && styles.providerButtonActive,
                  ]}
                  onPress={() => setOverride('superwall')}
                >
                  <Text
                    style={[
                      styles.providerButtonText,
                      devOverride === 'superwall' && styles.providerButtonTextActive,
                    ]}
                  >
                    Superwall
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {Platform.OS === 'web' && (
            <View style={styles.card}>
              <Text style={styles.webInstructionText}>
                Add query parameter to URL:
              </Text>
              <Text style={styles.webExampleText}>
                ?paywallProvider=custom
              </Text>
              <Text style={styles.webExampleText}>
                ?paywallProvider=revenuecat
              </Text>
              <Text style={styles.webExampleText}>
                ?paywallProvider=superwall
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.card}>
            <Text style={styles.infoText}>
              • Simulation Mode allows testing paywall logic without real purchases
            </Text>
            <Text style={styles.infoText}>
              • Remote config is fetched from backend on app launch
            </Text>
            <Text style={styles.infoText}>
              • Cached for 5 minutes to reduce network calls
            </Text>
            <Text style={styles.infoText}>
              • Auto-refreshes when app returns to foreground
            </Text>
            <Text style={styles.infoText}>
              • Falls back to custom provider on error
            </Text>
            <Text style={styles.infoText}>
              • Dev overrides take precedence over backend config
            </Text>
          </View>
        </View>
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  overrideCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  providerValue: {
    textTransform: 'capitalize',
    color: '#3B82F6',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  overrideLabel: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  overrideValue: {
    fontSize: 18,
    color: '#1E3A8A',
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: '#DC2626',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  providerButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  providerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  providerButtonTextActive: {
    color: '#FFFFFF',
  },
  webInstructionText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  webExampleText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
});
