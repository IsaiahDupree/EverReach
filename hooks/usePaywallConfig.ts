import { useState, useEffect, useRef } from 'react';
import { paywallConfigService, PaywallConfig } from '@/lib/paywallConfig';

export function usePaywallConfig() {
  const [config, setConfig] = useState<PaywallConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousConfig = useRef<PaywallConfig | null>(null);

  useEffect(() => {
    console.log('\n🎣 [usePaywallConfig] Hook mounted - Loading config...');
    loadConfig();
  }, []);

  // Detect config changes
  useEffect(() => {
    if (!config || !previousConfig.current) {
      previousConfig.current = config;
      return;
    }

    // Compare with previous config
    const prev = previousConfig.current;
    const curr = config;

    if (prev.strategy.id !== curr.strategy.id) {
      console.log('\n🔄 [usePaywallConfig] CONFIG CHANGED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Strategy: ${prev.strategy.name} → ${curr.strategy.name}`);
      console.log(`   Mode: ${prev.strategy.mode} → ${curr.strategy.mode}`);
      console.log(`   Can Skip: ${prev.strategy.can_skip} → ${curr.strategy.can_skip}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else if (prev.presentation.id !== curr.presentation.id) {
      console.log('\n🎨 [usePaywallConfig] PRESENTATION CHANGED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Variant: ${prev.presentation.variant} → ${curr.presentation.variant}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else if (prev.trial.id !== curr.trial.id) {
      console.log('\n⏱️  [usePaywallConfig] TRIAL CHANGED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Duration: ${prev.trial.duration_days} → ${curr.trial.duration_days} days`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    previousConfig.current = config;
  }, [config]);

  const loadConfig = async () => {
    try {
      console.log('📥 [usePaywallConfig] Loading config...');
      setLoading(true);
      setError(null);
      const cfg = await paywallConfigService.getConfig();
      setConfig(cfg);
      console.log('✅ [usePaywallConfig] Config loaded successfully\n');
    } catch (err) {
      console.error('\n❌ [usePaywallConfig] Load error:', err);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const refreshConfig = async () => {
    try {
      console.log('\n🔄 [usePaywallConfig] FORCE REFRESH requested');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      setLoading(true);
      setError(null);
      const cfg = await paywallConfigService.refreshConfig();
      setConfig(cfg);
      console.log('✅ [usePaywallConfig] Refresh complete\n');
    } catch (err) {
      console.error('\n❌ [usePaywallConfig] Refresh error:', err);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    config,
    loading,
    error,
    refreshConfig,
  };
}
