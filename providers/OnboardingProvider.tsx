import { useEffect, useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { KV } from '@/storage/AsyncStorageService';
import { apiGet } from '@/lib/api';

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';
const USER_FOCUS_KEY = '@user_focus';
const REMINDER_FREQUENCY_KEY = '@reminder_frequency';

export type UserFocus = 'networking' | 'personal' | 'business';
export type ReminderFrequency = 'daily' | 'weekly' | 'custom';

type OnboardingState = {
  isCompleted: boolean;
  currentStep: number;
  userFocus: UserFocus | null;
  reminderFrequency: ReminderFrequency | null;
  firstContactId: string | null;
  loading: boolean;
};

type OnboardingActions = {
  completeOnboarding: () => Promise<void>;
  setOnboardingEnabled: (enabled: boolean) => Promise<void>;
  setUserFocus: (focus: UserFocus) => Promise<void>;
  setReminderFrequency: (frequency: ReminderFrequency) => Promise<void>;
  setFirstContact: (contactId: string) => void;
  nextStep: () => void;
  resetOnboarding: () => Promise<void>;
};

type OnboardingContext = OnboardingState & OnboardingActions;

export const [OnboardingProvider, useOnboarding] = createContextHook<OnboardingContext>(() => {
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [userFocus, setUserFocusState] = useState<UserFocus | null>(null);
  const [reminderFrequency, setReminderFrequencyState] = useState<ReminderFrequency | null>(null);
  const [firstContactId, setFirstContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load onboarding state from storage and sync with backend
  useEffect(() => {
    let isMounted = true;
    
    const loadOnboardingState = async () => {
      try {
        console.log('[OnboardingProvider] Loading onboarding state...');
        console.log('[OnboardingProvider] EXPO_PUBLIC_DISABLE_ONBOARDING:', process.env.EXPO_PUBLIC_DISABLE_ONBOARDING);
        
        // Check if onboarding is disabled via environment variable
        const isOnboardingDisabled = process.env.EXPO_PUBLIC_DISABLE_ONBOARDING === 'true';
        if (isOnboardingDisabled) {
          console.log('[OnboardingProvider] Onboarding disabled via environment variable - setting completed to true');
          if (isMounted) {
            setIsCompleted(true);
            setLoading(false);
          }
          return;
        }
        
        // Load local state first (for offline/unauth scenarios)
        const [localCompleted, focus, frequency] = await Promise.all([
          KV.get<boolean>(ONBOARDING_COMPLETED_KEY),
          KV.get<UserFocus>(USER_FOCUS_KEY),
          KV.get<ReminderFrequency>(REMINDER_FREQUENCY_KEY)
        ]);

        // Check if user is authenticated and sync with backend
        // Backend is source of truth for onboarding completion
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session && isMounted) {
            console.log('[OnboardingProvider] User authenticated, checking backend onboarding status...');
            try {
              const backendStatus = await apiGet<{
                completed_initial_onboarding: boolean;
                onboarding_completed_at: string | null;
              }>('/api/v1/me/onboarding-status', { requireAuth: true });
              
              if (backendStatus && isMounted) {
                const backendCompleted = backendStatus.completed_initial_onboarding || false;
                console.log('[OnboardingProvider] Backend onboarding status:', { 
                  backendCompleted, 
                  onboarding_completed_at: backendStatus.onboarding_completed_at 
                });
                
                // Backend is source of truth - sync local state
                if (backendCompleted !== localCompleted) {
                  console.log(`[OnboardingProvider] Syncing local state with backend: ${localCompleted} → ${backendCompleted}`);
                  await KV.set(ONBOARDING_COMPLETED_KEY, backendCompleted);
                  setIsCompleted(backendCompleted);
                } else {
                  setIsCompleted(backendCompleted);
                }
              }
            } catch (backendError) {
              console.warn('[OnboardingProvider] Failed to fetch backend onboarding status, using local state:', backendError);
              // Fall back to local state if backend check fails
              if (localCompleted !== null) {
                setIsCompleted(localCompleted);
              }
            }
          } else {
            // Not authenticated - use local state only
            if (localCompleted !== null) {
              setIsCompleted(localCompleted);
            }
          }
        } catch (authCheckError) {
          console.warn('[OnboardingProvider] Auth check failed, using local state:', authCheckError);
          // Fall back to local state if auth check fails
          if (localCompleted !== null) {
            setIsCompleted(localCompleted);
          }
        }

        if (!isMounted) return;

        // Load user focus
        if (focus && ['networking', 'personal', 'business'].includes(focus)) {
          setUserFocusState(focus);
        }

        // Load reminder frequency
        if (frequency && ['daily', 'weekly', 'custom'].includes(frequency)) {
          setReminderFrequencyState(frequency);
        }
        
        console.log('[OnboardingProvider] Onboarding state loaded:', { 
          localCompleted, 
          focus, 
          frequency 
        });
      } catch (error) {
        console.error('[OnboardingProvider] Error loading onboarding state:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Load onboarding state in background without blocking render
    loadOnboardingState();
    
    // Listen for auth state changes to re-sync onboarding status
    let authListener: any = null;
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        if (supabase) {
          const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            
            // When user signs in, re-check backend onboarding status
            if (event === 'SIGNED_IN' && session) {
              console.log('[OnboardingProvider] User signed in, re-checking backend onboarding status...');
              try {
                const backendStatus = await apiGet<{
                  completed_initial_onboarding: boolean;
                  onboarding_completed_at: string | null;
                }>('/api/v1/me/onboarding-status', { requireAuth: true });
                
                if (backendStatus && isMounted) {
                  const backendCompleted = backendStatus.completed_initial_onboarding || false;
                  console.log('[OnboardingProvider] Backend onboarding status after sign-in:', backendCompleted);
                  
                  // Sync local state with backend (backend is source of truth)
                  await KV.set(ONBOARDING_COMPLETED_KEY, backendCompleted);
                  setIsCompleted(backendCompleted);
                }
              } catch (error) {
                console.warn('[OnboardingProvider] Failed to sync onboarding status after sign-in:', error);
              }
            }
            
            // When user signs out, reset to local state
            if (event === 'SIGNED_OUT') {
              console.log('[OnboardingProvider] User signed out, using local onboarding state');
              const localCompleted = await KV.get<boolean>(ONBOARDING_COMPLETED_KEY);
              if (localCompleted !== null && isMounted) {
                setIsCompleted(localCompleted);
              }
            }
          });
          authListener = data.subscription;
        }
      } catch (error) {
        console.warn('[OnboardingProvider] Failed to set up auth listener:', error);
      }
    })();
    
    return () => {
      isMounted = false;
      authListener?.unsubscribe();
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      setIsCompleted(true);
      await KV.set(ONBOARDING_COMPLETED_KEY, true);
      console.log('[OnboardingProvider] Onboarding completed locally');
      
      // If authenticated, backend should already be updated via the onboarding completion endpoint
      // But we can verify by checking backend status
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Backend should be updated by the onboarding flow, but verify
          const backendStatus = await apiGet<{
            completed_initial_onboarding: boolean;
          }>('/api/v1/me/onboarding-status', { requireAuth: true });
          
          if (backendStatus && !backendStatus.completed_initial_onboarding) {
            console.warn('[OnboardingProvider] Backend onboarding status not updated - may need to complete onboarding via backend endpoint');
          }
        }
      } catch (error) {
        // Non-critical - local state is updated
        console.warn('[OnboardingProvider] Could not verify backend onboarding status:', error);
      }
    } catch (error) {
      console.error('[OnboardingProvider] Error completing onboarding:', error);
    }
  }, []);

  const setOnboardingEnabled = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        setIsCompleted(false);
        await KV.set(ONBOARDING_COMPLETED_KEY, false);
        console.log('[OnboardingProvider] Onboarding enabled (will show at launch)');
      } else {
        setIsCompleted(true);
        await KV.set(ONBOARDING_COMPLETED_KEY, true);
        console.log('[OnboardingProvider] Onboarding disabled (will be skipped)');
      }
    } catch (error) {
      console.error('[OnboardingProvider] Error setting onboarding enabled:', error);
    }
  }, []);

  const setUserFocus = useCallback(async (focus: UserFocus) => {
    if (!focus || !['networking', 'personal', 'business'].includes(focus)) {
      console.error('[OnboardingProvider] Invalid user focus:', focus);
      return;
    }
    
    try {
      setUserFocusState(focus);
      await KV.set(USER_FOCUS_KEY, focus);
      console.log('[OnboardingProvider] User focus set:', focus);
    } catch (error) {
      console.error('[OnboardingProvider] Error setting user focus:', error);
    }
  }, []);

  const setReminderFrequency = useCallback(async (frequency: ReminderFrequency) => {
    if (!frequency || !['daily', 'weekly', 'custom'].includes(frequency)) {
      console.error('[OnboardingProvider] Invalid reminder frequency:', frequency);
      return;
    }
    
    try {
      setReminderFrequencyState(frequency);
      await KV.set(REMINDER_FREQUENCY_KEY, frequency);
      console.log('[OnboardingProvider] Reminder frequency set:', frequency);
    } catch (error) {
      console.error('[OnboardingProvider] Error setting reminder frequency:', error);
    }
  }, []);

  const setFirstContact = useCallback((contactId: string) => {
    setFirstContactId(contactId);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      setIsCompleted(false);
      setCurrentStep(0);
      setUserFocusState(null);
      setReminderFrequencyState(null);
      setFirstContactId(null);
      
      await Promise.all([
        KV.remove(ONBOARDING_COMPLETED_KEY),
        KV.remove(USER_FOCUS_KEY),
        KV.remove(REMINDER_FREQUENCY_KEY)
      ]);
      
      console.log('[OnboardingProvider] Onboarding reset');
    } catch (error) {
      console.error('[OnboardingProvider] Error resetting onboarding:', error);
    }
  }, []);

  return useMemo(() => ({
    isCompleted,
    currentStep,
    userFocus,
    reminderFrequency,
    firstContactId,
    loading,
    completeOnboarding,
    setOnboardingEnabled,
    setUserFocus,
    setReminderFrequency,
    setFirstContact,
    nextStep,
    resetOnboarding
  }), [
    isCompleted,
    currentStep,
    userFocus,
    reminderFrequency,
    firstContactId,
    loading,
    completeOnboarding,
    setOnboardingEnabled,
    setUserFocus,
    setReminderFrequency,
    setFirstContact,
    nextStep,
    resetOnboarding
  ]);
});