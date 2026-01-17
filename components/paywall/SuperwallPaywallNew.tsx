/**
 * SuperwallPaywallNew - Modern Superwall Integration using expo-superwall hooks
 * 
 * This component uses the official Expo Superwall SDK with React hooks API.
 * Much simpler and more reliable than the legacy React Native package.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Button, Alert } from 'react-native';
import { usePlacement, useUser, useSuperwallEvents } from 'expo-superwall';
import { useSubscription } from '@/providers/SubscriptionProvider';
import analytics from '@/lib/analytics';

interface SuperwallPaywallNewProps {
  placementId?: string;
  autoShow?: boolean; // If false, requires manual trigger - prevents auto-show on mount
  forceShow?: boolean; // If true, bypasses subscription check (for testing)
  onDismiss?: () => void;
  onPurchaseComplete?: () => void;
}

export default function SuperwallPaywallNew({
  placementId = 'main_pay_wall', // Default placement name from Superwall dashboard
  autoShow = false, // Don't auto-show - only show when user triggers gated content
  forceShow = false, // Force show for testing, bypasses subscription check
  onDismiss,
  onPurchaseComplete
}: SuperwallPaywallNewProps) {
  const [isTimeout, setIsTimeout] = React.useState(false);
  const [subscriptionStatusSet, setSubscriptionStatusSet] = React.useState(false);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Store timeout timer ref
  
  // Single-flight guard: Prevent multiple concurrent paywall shows
  const isShowingRef = useRef(false);
  const hasShownRef = useRef(false); // Track if we've shown the paywall on this mount
  const abortControllerRef = useRef<AbortController | null>(null);
  const { user, subscriptionStatus, identify, setSubscriptionStatus: setSuperwallStatus } = useUser();
  const { isPaid, subscriptionStatus: appSubscriptionStatus } = useSubscription();
  
  // Log component mount with placement info
  React.useEffect(() => {
    console.log(`[SuperwallPaywallNew] 🎯 Component mounted for placement: ${placementId}`);
    console.log('[SuperwallPaywallNew] Config:', { placementId, autoShow, forceShow });
  }, []);
  
  // Listen to Superwall events
  useSuperwallEvents({
    onLog: (log) => {
      console.log('[Superwall]', log);
    },
  });

  // Register placement to show paywall
  const { registerPlacement, state } = usePlacement({
    onError: (err) => {
      const errorMsg = typeof err === 'string' ? err : (err as any).message || String(err);
      console.error('🚨 [CRITICAL SUPERWALL ERROR] 🚨', err);
      
      // Show alert for critical errors
      Alert.alert(
        '🚨 Superwall Error',
        `Critical error in paywall system:\n\n${errorMsg}\n\nPlacement: ${placementId}`,
        [{ text: 'Dismiss', style: 'destructive' }]
      );
      
      analytics.track('superwall_error', {
        error: errorMsg,
        placement: placementId,
        severity: 'critical',
      });
    },
    onPresent: (info) => {
      console.log(`[SuperwallPaywallNew:${placementId}] ✅ Paywall presented`);
      console.log(`[SuperwallPaywallNew:${placementId}] Info:`, info);
      analytics.track('superwall_paywall_displayed', {
        placement: placementId,
        info,
      });
    },
    onDismiss: (info, result) => {
      console.log(`[SuperwallPaywallNew:${placementId}] 🚪 Paywall dismissed`);
      console.log(`[SuperwallPaywallNew:${placementId}] Info:`, info);
      console.log(`[SuperwallPaywallNew:${placementId}] Result:`, result);
      console.log(`[SuperwallPaywallNew:${placementId}] 🔍 Result type:`, result?.type);
      console.log(`[SuperwallPaywallNew:${placementId}] 🔍 Full result:`, JSON.stringify(result, null, 2));
      
      // Reset the showing flag so paywall can be triggered again
      isShowingRef.current = false;
      
      analytics.track('superwall_paywall_dismissed', {
        placement: placementId,
        result: result?.type,
        resultDetails: result,
      });

      if (result?.type === 'purchased') {
        console.log(`[SuperwallPaywallNew:${placementId}] ✅ Purchase completed!`);
        analytics.track('superwall_purchase_success', {
          placement: placementId,
        });
        onPurchaseComplete?.();
      } else if (result?.type === 'restored') {
        console.log(`[SuperwallPaywallNew:${placementId}] ✅ Restore completed!`);
        onPurchaseComplete?.();
      } else {
        console.log(`[SuperwallPaywallNew:${placementId}] ❌ No purchase detected - result type:`, result?.type);
        onDismiss?.();
      }
    },
  });

  // Set subscription status before showing paywall (REQUIRED by Superwall)
  useEffect(() => {
    const initSubscriptionStatus = async () => {
      try {
        console.log(`[SuperwallPaywallNew:${placementId}] Setting subscription status:`, {
          isPaid,
          appStatus: appSubscriptionStatus,
          forceShow,
        });
        
        if (forceShow) {
          await setSuperwallStatus({
            status: 'INACTIVE',
          });
          console.log(`[SuperwallPaywallNew:${placementId}] ✅ Set status: INACTIVE (forceShow enabled for testing)`);
        } else if (isPaid && appSubscriptionStatus === 'active') {
          await setSuperwallStatus({
            status: 'ACTIVE',
            entitlements: [{
              id: 'com_everreach_core_monthly',
              type: 'SERVICE_LEVEL' as const 
            }],
          });
          console.log(`[SuperwallPaywallNew:${placementId}] ✅ Set status: ACTIVE (user is subscribed)`);
        } else {
          await setSuperwallStatus({
            status: 'INACTIVE',
          });
          console.log(`[SuperwallPaywallNew:${placementId}] ✅ Set status: INACTIVE`, forceShow ? '(forceShow enabled for testing)' : '(user not subscribed)');
        }
        
        console.log(`[SuperwallPaywallNew:${placementId}] ✅ Subscription status set successfully`);
        setSubscriptionStatusSet(true); // Mark as ready AFTER status is set
      } catch (error) {
        console.error(`[SuperwallPaywallNew:${placementId}] ❌ Failed to set subscription status:`, error);
        // Still mark as ready to prevent infinite loading
        setSubscriptionStatusSet(true);
      }
    };
    
    initSubscriptionStatus();
  }, [isPaid, appSubscriptionStatus, forceShow]);

  // Show paywall automatically AFTER subscription status is set (only if autoShow=true)
  useEffect(() => {
    // Don't auto-show unless explicitly enabled
    if (!autoShow) {
      console.log(`[SuperwallPaywallNew:${placementId}] autoShow=false, waiting for manual trigger`);
      return;
    }
    
    // Don't show if we've already shown the paywall on this mount
    if (hasShownRef.current) {
      console.log(`[SuperwallPaywallNew:${placementId}] Paywall already shown on this mount, skipping`);
      return;
    }
    
    // Don't show paywall until subscription status is set with Superwall
    if (!subscriptionStatusSet) {
      console.log(`[SuperwallPaywallNew:${placementId}] Waiting for subscription status to be set with Superwall...`);
      return;
    }
    
    console.log(`[SuperwallPaywallNew:${placementId}] ✅ Subscription status ready! Auto-showing paywall (once per mount)`);
    console.log(`[SuperwallPaywallNew:${placementId}] Placement ID:`, placementId);
    console.log(`[SuperwallPaywallNew:${placementId}] Current state:`, state);
    
    // Mark as shown
    hasShownRef.current = true;
    
    // Small delay to ensure Superwall SDK has processed the status
    const timer = setTimeout(() => {
      showPaywall();
    }, 500);
    
    // Timeout after 10 seconds if still loading
    timeoutTimerRef.current = setTimeout(() => {
      console.warn(`[SuperwallPaywallNew:${placementId}] ⚠️ Paywall loading timeout after 10 seconds`);
      setIsTimeout(true);
    }, 10000);
    
    return () => {
      clearTimeout(timer);
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
      abortControllerRef.current?.abort();
      isShowingRef.current = false;
    };
  }, [subscriptionStatusSet, autoShow, state]);
  
  // Log state changes
  useEffect(() => {
    console.log(`[SuperwallPaywallNew:${placementId}] State changed:`, state);
  }, [state]);

  // Clear timeout when paywall successfully presents
  useEffect(() => {
    if (state && 'status' in state && state.status === 'presented') {
      if (timeoutTimerRef.current) {
        console.log(`[SuperwallPaywallNew:${placementId}] ✅ Paywall presented - clearing timeout`);
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
        setIsTimeout(false); // Reset timeout state if it was set
      }
    }
  }, [state]);

  // Handle error state - moved outside conditional to fix React Hooks rule
  useEffect(() => {
    if (state && 'status' in state && state.status === 'error') {
      const errorState = state as any;
      const errorMsg = errorState.error || 'Unknown error';
      
      Alert.alert(
        '🚨 Superwall Failed',
        `Paywall failed to load!\n\nError: ${errorMsg}\nPlacement: ${placementId}`,
        [
          { text: 'Try Again', onPress: showPaywall, style: 'default' },
          { text: 'Dismiss', onPress: onDismiss, style: 'cancel' }
        ]
      );
    }
  }, [state]); // Re-run when state changes

  const showPaywall = async () => {
    // Single-flight: Prevent multiple concurrent shows
    if (isShowingRef.current) {
      console.log(`[SuperwallPaywallNew:${placementId}] ⚠️ Paywall already showing, ignoring duplicate call`);
      return;
    }
    
    console.log(`[SuperwallPaywallNew:${placementId}] 🚀 showPaywall() called`);
    console.log(`[SuperwallPaywallNew:${placementId}] Placement ID:`, placementId);
    console.log(`[SuperwallPaywallNew:${placementId}] Current state:`, state.status);
    
    isShowingRef.current = true;
    abortControllerRef.current = new AbortController();
    
    try {
      console.log(`[SuperwallPaywallNew:${placementId}] ✅ Starting registerPlacement`);
      
      await registerPlacement({
        placement: placementId,
        feature() {
          // This is called if user has access (already subscribed)
          console.log(`[SuperwallPaywallNew:${placementId}] 🎉 User has access - feature unlocked!`);
          onPurchaseComplete?.();
        },
      });
      
      console.log(`[SuperwallPaywallNew:${placementId}] ✅ registerPlacement completed`);
    } catch (error: any) {
      console.error(`[SuperwallPaywallNew:${placementId}] ❌ Failed to show paywall:`, error);
      console.error(`[SuperwallPaywallNew:${placementId}] Error details:`, {
        message: error.message,
        stack: error.stack,
        error
      });
    } finally {
      isShowingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // Error state - CRITICAL ERROR
  if (state && 'status' in state && state.status === 'error') {
    const errorState = state as any;
    const errorMsg = errorState.error || 'Unknown error';
    
    return (
      <View style={[styles.container, { backgroundColor: '#FEE2E2' }]}>
        <Text style={[styles.errorTitle, { fontSize: 24, color: '#DC2626' }]}>
          🚨 CRITICAL: Paywall Failed
        </Text>
        <Text style={[styles.errorText, { fontSize: 16, fontWeight: '600', color: '#DC2626' }]}>
          {errorMsg}
        </Text>
        <View style={{
          backgroundColor: '#DC2626',
          padding: 16,
          borderRadius: 8,
          marginVertical: 20,
        }}>
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>
            ⚠️ REVENUE AT RISK ⚠️
          </Text>
          <Text style={{ color: '#FFF', fontSize: 13, marginTop: 8 }}>
            Users cannot upgrade! Fix immediately.
          </Text>
        </View>
        <Text style={styles.helpText}>
          Required fixes:
          {'\n'}• Configure paywall in Superwall dashboard
          {'\n'}• Publish the paywall (not draft)
          {'\n'}• Verify placement: "{placementId}"
          {'\n'}• Check API key matches environment
        </Text>
        <View style={styles.buttonContainer}>
          <Button title="🔄 Retry Now" onPress={showPaywall} color="#DC2626" />
          <Button title="Dismiss" onPress={onDismiss} color="#666" />
        </View>
      </View>
    );
  }

  // Timeout state - CRITICAL ERROR
  if (isTimeout) {
    return (
      <View style={[styles.container, { backgroundColor: '#FEE2E2' }]}>
        <Text style={[styles.errorTitle, { fontSize: 24, color: '#DC2626' }]}>
          🚨 CRITICAL: Superwall Timeout
        </Text>
        <Text style={[styles.errorText, { fontSize: 16, fontWeight: '600' }]}>
          Paywall system is not responding!
        </Text>
        <View style={{
          backgroundColor: '#DC2626',
          padding: 16,
          borderRadius: 8,
          marginVertical: 20,
        }}>
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>
            ⚠️ ACTION REQUIRED ⚠️
          </Text>
          <Text style={{ color: '#FFF', fontSize: 13, marginTop: 8 }}>
            Your app depends on Superwall working.
            {'\n'}This error will block users from upgrading!
          </Text>
        </View>
        <Text style={styles.helpText}>
          Possible causes:
          {'\n'}• No paywall configured for placement "{placementId}"
          {'\n'}• Paywall is in draft mode (not published)
          {'\n'}• Network connectivity issues
          {'\n'}• Superwall SDK not initialized properly
          {'\n'}• Wrong API key or environment mismatch
        </Text>
        <View style={styles.buttonContainer}>
          <Button title="🔄 Try Again" onPress={() => { setIsTimeout(false); showPaywall(); }} color="#DC2626" />
          <Button title="Dismiss" onPress={onDismiss} color="#666" />
        </View>
      </View>
    );
  }

  // Idle/Loading state (before paywall shown)
  if (!state || ('status' in state && state.status === 'idle')) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {!subscriptionStatusSet 
            ? 'Setting up subscription data...' 
            : 'Loading Superwall paywall...'}
        </Text>
        <Text style={styles.subText}>Placement: {placementId}</Text>
        <Text style={[styles.subText, { marginTop: 8, fontSize: 12, color: '#9CA3AF' }]}>
          {!subscriptionStatusSet 
            ? '⏳ Syncing with Superwall...' 
            : `State: ${JSON.stringify(state?.status || 'initializing')}`}
        </Text>
      </View>
    );
  }

  // Success state (paywall shown or dismissed)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Superwall Paywall</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Placement ID:</Text>
        <Text style={styles.infoValue}>{placementId}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>User ID:</Text>
        <Text style={styles.infoValue}>{user?.appUserId || 'Not identified'}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Subscription Status:</Text>
        <Text style={styles.infoValue}>
          {subscriptionStatus?.status || 'INACTIVE'}
        </Text>
      </View>

      {state && (
        <View style={styles.stateCard}>
          <Text style={styles.infoLabel}>Last Result:</Text>
          <Text style={styles.infoValue}>{JSON.stringify(state, null, 2)}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button title="Show Paywall Again" onPress={showPaywall} />
        <Button title="Dismiss" onPress={onDismiss} color="#666" />
      </View>

      <Text style={styles.noteText}>
        💡 Note: Paywall may have already been presented and dismissed.
        Check console logs for details.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1F2937',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  infoCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  stateCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  noteText: {
    marginTop: 20,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
