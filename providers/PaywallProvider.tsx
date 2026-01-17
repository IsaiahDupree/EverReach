import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import { useSubscription } from './SubscriptionProvider';
import { paywallConfigService, PaywallConfig } from '@/lib/paywallConfig';
import { usePaywallConfig } from '@/hooks/usePaywallConfig';
import { useLivePaywall, type LivePaywallConfig, type Provider } from '@/hooks/useLivePaywall';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paywall implementation types
export type PaywallImplementation = 'custom' | 'revenuecat' | 'superwall';

interface SimulatedUserState {
  isPremium: boolean;
  isTrialExpired: boolean;
}

interface PaywallContextType {
  // Config & State
  config: PaywallConfig | null;
  implementation: PaywallImplementation;
  shouldShowPaywall: boolean;
  isLoading: boolean;

  // Remote Paywall Config (from backend)
  remoteConfig: LivePaywallConfig | null;
  remoteProvider: Provider | null;
  paywallId: string | null;
  remoteConfigLoading: boolean;
  remoteConfigError: string | null;

  // User State
  userState: {
    isPremium: boolean;
    isTrialExpired: boolean;
    trialEndDate: Date | null;
    installDate: Date;
  };

  // Simulation Mode
  isSimulationEnabled: boolean;
  simulatedState: SimulatedUserState;
  toggleSimulation: (enabled: boolean) => Promise<void>;
  updateSimulatedState: (state: Partial<SimulatedUserState>) => Promise<void>;

  // Actions
  checkPaywall: () => Promise<boolean>;
  setImplementation: (impl: PaywallImplementation) => Promise<void>;
  refreshConfig: () => Promise<void>;
  refreshRemoteConfig: () => void;
}

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const { isPaid, isTrialExpired, trialEndsAt } = useSubscription();
  const { config, loading: configLoading, refreshConfig: refreshConfigHook } = usePaywallConfig();
  const { config: remoteConfig, loading: remoteConfigLoading, error: remoteConfigError, refetch: refreshRemoteConfig } = useLivePaywall();

  const [implementation, setImplementationState] = useState<PaywallImplementation>('custom');
  const [shouldShowPaywall, setShouldShowPaywall] = useState(false);
  const [installDate, setInstallDate] = useState<Date>(new Date());

  // Simulation State
  const [isSimulationEnabled, setIsSimulationEnabled] = useState(false);
  const [simulatedState, setSimulatedState] = useState<SimulatedUserState>({
    isPremium: false,
    isTrialExpired: true,
  });

  // Load implementation preference and simulation settings
  useEffect(() => {
    loadImplementation();
    loadInstallDate();
    loadSimulationSettings();
  }, []);

  // Sync implementation with backend remoteConfig
  useEffect(() => {
    if (remoteConfig?.provider && !remoteConfigLoading) {
      const backendProvider = remoteConfig.provider;
      console.log(`\n🔄 [PaywallProvider] Backend config loaded: ${backendProvider}`);

      // Auto-sync if different from local
      if (implementation !== backendProvider) {
        console.log(`   Syncing implementation: ${implementation} → ${backendProvider}`);
        setImplementationState(backendProvider);
        AsyncStorage.setItem('@paywall_implementation', backendProvider).catch(err =>
          console.error('Failed to save implementation:', err)
        );
      } else {
        console.log(`   Already synced with backend: ${backendProvider}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  }, [remoteConfig, remoteConfigLoading]);

  const loadImplementation = async () => {
    try {
      const stored = await AsyncStorage.getItem('@paywall_implementation');
      if (stored && ['custom', 'revenuecat', 'superwall'].includes(stored)) {
        setImplementationState(stored as PaywallImplementation);
        console.log(`\n💳 [PaywallProvider] Implementation loaded: ${stored}`);
      } else {
        // Auto-detect based on platform
        const auto = Platform.OS === 'web' ? 'custom' : 'revenuecat';
        setImplementationState(auto);
        console.log(`\n💳 [PaywallProvider] Auto-detected implementation: ${auto} (${Platform.OS})`);
      }
    } catch (error) {
      console.error('[PaywallProvider] Error loading implementation:', error);
    }
  };

  const loadInstallDate = async () => {
    try {
      const stored = await AsyncStorage.getItem('@install_date');
      if (stored) {
        setInstallDate(new Date(stored));
      } else {
        // First install
        const now = new Date();
        await AsyncStorage.setItem('@install_date', now.toISOString());
        setInstallDate(now);
        console.log('[PaywallProvider] First install detected:', now.toISOString());
      }
    } catch (error) {
      console.error('[PaywallProvider] Error loading install date:', error);
    }
  };

  const loadSimulationSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('@paywall_simulation_enabled');
      const state = await AsyncStorage.getItem('@paywall_simulation_state');

      if (enabled === 'true') setIsSimulationEnabled(true);
      if (state) setSimulatedState(JSON.parse(state));
    } catch (error) {
      console.error('[PaywallProvider] Error loading simulation settings:', error);
    }
  };

  const toggleSimulation = async (enabled: boolean) => {
    setIsSimulationEnabled(enabled);
    await AsyncStorage.setItem('@paywall_simulation_enabled', String(enabled));
    console.log(`[PaywallProvider] Simulation mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  };

  const updateSimulatedState = async (state: Partial<SimulatedUserState>) => {
    const newState = { ...simulatedState, ...state };
    setSimulatedState(newState);
    await AsyncStorage.setItem('@paywall_simulation_state', JSON.stringify(newState));
    console.log('[PaywallProvider] Simulated state updated:', newState);
  };

  // User state object - Uses simulated values if enabled
  const userState = useMemo(() => {
    if (isSimulationEnabled) {
      return {
        isPremium: simulatedState.isPremium,
        isTrialExpired: simulatedState.isTrialExpired,
        trialEndDate: trialEndsAt ? new Date(trialEndsAt) : null, // Keep real date for now
        installDate,
      };
    }
    return {
      isPremium: isPaid,
      isTrialExpired,
      trialEndDate: trialEndsAt ? new Date(trialEndsAt) : null,
      installDate,
    };
  }, [isPaid, isTrialExpired, trialEndsAt, installDate, isSimulationEnabled, simulatedState]);

  // Check if paywall should show
  const checkPaywall = async (): Promise<boolean> => {
    console.log('\n🎯 [PaywallProvider] CHECKING PAYWALL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (isSimulationEnabled) {
      console.log('⚠️  SIMULATION MODE ACTIVE');
    }

    console.log('User State used for check:');
    console.log(`   isPaid: ${userState.isPremium}`);
    console.log(`   isTrialExpired: ${userState.isTrialExpired}`);
    console.log(`   trialEndsAt: ${userState.trialEndDate || 'N/A'}`);
    console.log(`   installDate: ${installDate.toISOString()}`);
    console.log('\nImplementation:');
    console.log(`   Type: ${implementation}`);
    console.log(`   Platform: ${Platform.OS}`);

    if (!config) {
      console.log('\n⚠️  No config loaded yet');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return false;
    }

    // Call the evaluation logic with logging
    const shouldShow = paywallConfigService.shouldShowPaywall(config, userState);
    setShouldShowPaywall(shouldShow);

    console.log(`\n📱 [PaywallProvider] Implementation: ${implementation}`);
    console.log(`   Will use: ${implementation === 'custom' ? 'Custom Paywall' : implementation === 'revenuecat' ? 'RevenueCat' : 'Superwall'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return shouldShow;
  };

  // Update when user state or config changes
  useEffect(() => {
    if (config && !configLoading) {
      checkPaywall();
    }
  }, [config, userState, configLoading]); // userState now includes simulation dependencies

  const setImplementation = async (impl: PaywallImplementation) => {
    console.log(`\n💳 [PaywallProvider] Changing implementation: ${implementation} → ${impl}`);

    try {
      await AsyncStorage.setItem('@paywall_implementation', impl);
      setImplementationState(impl);

      console.log('✅ [PaywallProvider] Implementation changed successfully');
      console.log(`   New implementation: ${impl}`);

      if (impl === 'revenuecat') {
        console.log('   📦 Will use RevenueCat paywalls');
      } else if (impl === 'superwall') {
        console.log('   🎨 Will use Superwall paywalls');
      } else {
        console.log('   🎨 Will use custom Stripe paywall');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error) {
      console.error('❌ [PaywallProvider] Error changing implementation:', error);
    }
  };

  const refreshConfig = async () => {
    await refreshConfigHook();
    await checkPaywall();
  };

  const value: PaywallContextType = {
    config,
    implementation,
    shouldShowPaywall,
    isLoading: configLoading,
    remoteConfig,
    remoteProvider: remoteConfig?.provider || null,
    paywallId: remoteConfig?.paywall_id || null,
    remoteConfigLoading,
    remoteConfigError,
    userState,
    isSimulationEnabled,
    simulatedState,
    toggleSimulation,
    updateSimulatedState,
    checkPaywall,
    setImplementation,
    refreshConfig,
    refreshRemoteConfig,
  };

  return (
    <PaywallContext.Provider value={value}>
      {children}
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const context = useContext(PaywallContext);
  if (context === undefined) {
    throw new Error('usePaywall must be used within a PaywallProvider');
  }
  return context;
}
