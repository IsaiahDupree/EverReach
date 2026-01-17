import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { usePaywall } from '@/providers/PaywallProvider';
import { PaywallRouter } from './paywall/PaywallRouter';
import { trackPaywallEvent } from '@/lib/paywallAnalytics';

interface PaywallGateProps {
  children: React.ReactNode;
  /**
   * Feature area to check access for (from remote config)
   * Examples: 'contact_details', 'voice_notes', 'ai_messages', 'screenshots'
   */
  featureArea?: string;
  /**
   * If true, shows paywall as modal instead of replacing content
   */
  showAsModal?: boolean;
  /**
   * Custom message to show when feature is locked
   */
  lockedMessage?: string;
}

/**
 * PaywallGate - Protects features based on remote paywall configuration
 * 
 * Flow:
 * 1. Checks if user has access based on remote config
 * 2. If no access: Shows paywall (inline or modal)
 * 3. If access granted: Renders children
 * 
 * Usage:
 * ```tsx
 * <PaywallGate featureArea="voice_notes">
 *   <VoiceNoteRecorder />
 * </PaywallGate>
 * ```
 */
export function PaywallGate({ 
  children, 
  featureArea,
  showAsModal = false,
  lockedMessage 
}: PaywallGateProps) {
  const { config, userState, checkPaywall } = usePaywall();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [config, userState, featureArea]);

  const checkAccess = async () => {
    console.log(`\n🔐 [PaywallGate] Checking access for: ${featureArea || 'general'}`);
    
    // If no config loaded yet, wait
    if (!config) {
      console.log('   ⏳ Config not loaded yet, waiting...');
      setHasAccess(null);
      return;
    }

    // Premium users OR active trial users always have access
    if (userState.isPremium || !userState.isTrialExpired) {
      const reason = userState.isPremium ? 'Premium user' : 'Active trial';
      console.log(`   ✅ ${reason} - GRANTED`);
      setHasAccess(true);
      return;
    }

    // If no specific feature area, allow access
    // (centralized navigation in _layout.tsx handles general blocking)
    if (!featureArea) {
      console.log('   ✅ GRANTED (no feature area specified - using centralized navigation)');
      setHasAccess(true);
      return;
    }

    // Check feature-specific permission from remote config (SOURCE OF TRUTH)
    const permission = config.permissions?.find(p => p.feature_area === featureArea);
    
    if (!permission) {
      console.log(`   ⚠️  No permission config for "${featureArea}" - DENYING access by default`);
      setHasAccess(false);
      
      // Track missing permission config
      trackPaywallEvent('impression', {
        source: 'missing_config',
        feature_area: featureArea,
        trigger: 'no_permission_found',
      }).catch(err => console.warn('Failed to track paywall impression:', err));
      
      return;
    }

    const granted = permission.can_access;
    console.log(`   ${granted ? '✅ GRANTED' : '🔒 BLOCKED'} - ${permission.access_level}`);
    console.log(`   Backend says: can_access=${granted}, access_level=${permission.access_level}`);
    setHasAccess(granted);
    
    // Track paywall impression if blocked by config
    if (!granted) {
      trackPaywallEvent('impression', {
        source: 'backend_config',
        feature_area: featureArea,
        trigger: 'permission_denied',
        access_level: permission.access_level,
      }).catch(err => console.warn('Failed to track paywall impression:', err));
    }
  };

  // Loading state
  if (hasAccess === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Access granted
  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied - show as modal
  if (showAsModal) {
    return (
      <>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>Premium Feature</Text>
          <Text style={styles.lockedMessage}>
            {lockedMessage || `This feature requires a premium subscription.`}
          </Text>
          <TouchableOpacity 
            style={styles.lockedButton}
            onPress={() => setShowPaywallModal(true)}
          >
            <Text style={styles.lockedButtonText}>
              Unlock Now
            </Text>
          </TouchableOpacity>
        </View>
        
        <Modal
          visible={showPaywallModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <PaywallRouter
            plans={[]}
            onSelectPlan={(planId) => {
              console.log('[PaywallGate] Plan selected:', planId);
              setShowPaywallModal(false);
            }}
          />
        </Modal>
      </>
    );
  }

  // Access denied - show inline paywall
  return (
    <PaywallRouter
      plans={[]}
      onSelectPlan={(planId) => {
        console.log('[PaywallGate] Plan selected:', planId);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  lockedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  lockedMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  lockedButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  lockedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
