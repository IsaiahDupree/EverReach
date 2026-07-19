import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionContextType {
  isPaid: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  entitlements: Record<string, any>;
  refreshEntitlements: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  currentPlan?: string;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [entitlements, setEntitlements] = useState<Record<string, any>>({});
  const [currentPlan, setCurrentPlan] = useState<string>();

  const refreshEntitlements = useCallback(async () => {
    try {
      setIsLoading(true);
      // Try to get subscription status from storage
      const storedStatus = await AsyncStorage.getItem('subscription_status');
      if (storedStatus) {
        const status = JSON.parse(storedStatus);
        setIsPaid(status.isPaid);
        setEntitlements(status.entitlements || {});
        setCurrentPlan(status.currentPlan);
      } else {
        // Default: user is not paid
        setIsPaid(false);
        setEntitlements({});
      }
    } catch (error) {
      console.error('[SubscriptionProvider] Error refreshing entitlements:', error);
      setIsPaid(false);
      setEntitlements({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      setIsRestoring(true);
      // In a real app, this would call RevenueCat's restorePurchases
      // For now, we'll check AsyncStorage
      const storedStatus = await AsyncStorage.getItem('subscription_status');
      if (storedStatus) {
        const status = JSON.parse(storedStatus);
        setIsPaid(status.isPaid);
        setEntitlements(status.entitlements || {});
      }
    } catch (error) {
      console.error('[SubscriptionProvider] Error restoring purchases:', error);
    } finally {
      setIsRestoring(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    refreshEntitlements();
  }, [refreshEntitlements]);

  const value: SubscriptionContextType = {
    isPaid,
    isLoading,
    isRestoring,
    entitlements,
    refreshEntitlements,
    restorePurchases,
    currentPlan,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Return a default context for testing
    return {
      isPaid: false,
      isLoading: false,
      isRestoring: false,
      entitlements: {},
      refreshEntitlements: async () => {},
      restorePurchases: async () => {},
    };
  }
  return context;
}
