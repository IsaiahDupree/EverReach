import { useEffect, useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { KV } from '@/storage/AsyncStorageService';

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

  // Load onboarding state from storage
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
        
        const [completed, focus, frequency] = await Promise.all([
          KV.get<boolean>(ONBOARDING_COMPLETED_KEY),
          KV.get<UserFocus>(USER_FOCUS_KEY),
          KV.get<ReminderFrequency>(REMINDER_FREQUENCY_KEY)
        ]);

        if (!isMounted) return;

        // Check if onboarding is completed
        if (completed !== null) {
          setIsCompleted(completed);
        }

        // Load user focus
        if (focus && ['networking', 'personal', 'business'].includes(focus)) {
          setUserFocusState(focus);
        }

        // Load reminder frequency
        if (frequency && ['daily', 'weekly', 'custom'].includes(frequency)) {
          setReminderFrequencyState(frequency);
        }
        
        console.log('[OnboardingProvider] Onboarding state loaded:', { 
          completed, 
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
    
    return () => {
      isMounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      setIsCompleted(true);
      await KV.set(ONBOARDING_COMPLETED_KEY, true);
      console.log('[OnboardingProvider] Onboarding completed');
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