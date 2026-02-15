/**
 * EverReach Onboarding Flow V2
 * See: /ONBOARDING_V2_SPEC.md
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Heart, Users } from 'lucide-react-native';
// useAppSettings import removed - using hardcoded THEME instead
import { useAuth } from '@/providers/AuthProviderV2';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { supabase } from '@/lib/supabase';
import { ONBOARDING_QUESTIONS, OnboardingQuestion } from '@/constants/onboarding-v2-questions';

// Superwall - use expo-superwall (the Expo wrapper)
import { usePlacement, useUser } from 'expo-superwall';

import { markWelcomeSeen } from './welcome';

// Theme matching the V1 onboarding styling
const THEME = {
  primary: '#7C3AED',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
};

type OnboardingPath = 'paid' | 'free';
type ScreenID = 'S1' | 'S2' | 'A1' | 'COMPLETE' | `Q${number}`;

export default function OnboardingV2Screen() {
  const insets = useSafeAreaInsets();
  // Use hardcoded THEME for consistent purple styling
  const theme = THEME;
  const { user } = useAuth();
  const { completeOnboarding, isCompleted: onboardingCompleted } = useOnboarding();
  const { restorePurchases, refreshEntitlements, isPaid } = useSubscription();
  const analytics = useAnalytics('OnboardingV2');

  const [currentScreen, setCurrentScreen] = useState<ScreenID>('S1');
  const [path, setPath] = useState<OnboardingPath | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [questions, setQuestions] = useState<OnboardingQuestion[]>(ONBOARDING_QUESTIONS); // Fallback to hardcoded
  const [questionsLoading, setQuestionsLoading] = useState(true);
  
  // Dev skip for onboarding
  const SKIP_ONBOARDING = process.env.EXPO_PUBLIC_SKIP_ONBOARDING === 'true';
  
  // Load questions from Supabase on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        console.log('[OnboardingV2] 📥 Loading questions from Supabase...');
        const { data, error } = await supabase
          .from('onboarding_questions')
          .select('*')
          .eq('version', 2)
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('[OnboardingV2] ❌ Error loading questions:', error);
          // Fallback to hardcoded questions
          setQuestions(ONBOARDING_QUESTIONS);
          setQuestionsLoading(false);
          return;
        }
        
        if (data && data.length > 0) {
          console.log(`[OnboardingV2] ✅ Loaded ${data.length} questions from Supabase`);
          // Transform Supabase data to match OnboardingQuestion interface
          const transformedQuestions: OnboardingQuestion[] = data.map((q, index) => ({
            id: `Q${index + 1}`,
            key: q.question_key,
            question: q.question_text,
            type: q.question_type as 'text' | 'single_choice',
            placeholder: q.placeholder || undefined,
            header: q.header || undefined,
            explainer: q.explainer || undefined,
            options: q.options ? (q.options as Array<{ value: string; label: string }>) : undefined,
            required: q.required,
          }));
          setQuestions(transformedQuestions);
        } else {
          console.warn('[OnboardingV2] ⚠️ No questions found in Supabase, using hardcoded fallback');
          setQuestions(ONBOARDING_QUESTIONS);
        }
      } catch (e) {
        console.error('[OnboardingV2] ❌ Exception loading questions:', e);
        setQuestions(ONBOARDING_QUESTIONS);
      } finally {
        setQuestionsLoading(false);
      }
    };
    
    loadQuestions();
  }, []);
  
  // Superwall hooks - need both useUser (for status) and usePlacement (for triggering)
  const { setSubscriptionStatus: setSuperwallStatus } = useUser();
  
  // Superwall placement hook
  console.log('[OnboardingV2] 🔧 Setting up usePlacement hook');
  const { registerPlacement, state: paywallState } = usePlacement({
    onError: (error) => {
      // Silently handle errors - don't log to console to avoid error overlays
      // console.error('[OnboardingV2] ❌ onError callback fired!');
      // console.error('[OnboardingV2] Error:', error);
      // console.error('[OnboardingV2] Error type:', typeof error);
      handleContinueFree();
    },
    onPresent: (info) => {
      console.log('[OnboardingV2] ✅ onPresent callback fired!');
      console.log('[OnboardingV2] Paywall presented:', info);
      analytics.track('paywall_viewed');
    },
    onDismiss: async (info, result) => {
      console.log('[OnboardingV2] 🚪 onDismiss callback fired!');
      console.log('[OnboardingV2] Dismiss info:', info);
      console.log('[OnboardingV2] Result:', result);
      console.log('[OnboardingV2] Result type:', result?.type);
      console.log('[OnboardingV2] Close reason:', info?.closeReason);
      
      // Check for purchase: result.type OR closeReason === 'systemLogic' (Superwall uses this for purchases)
      const isPurchased = result?.type === 'purchased' || result?.type === 'restored' || info?.closeReason === 'systemLogic';
      
      if (isPurchased) {
        console.log('[OnboardingV2] ✅ Purchase/Restore completed!');
        analytics.track('paywall_purchased', { placement: 'intro_paywall' });
        
        try {
          // CRITICAL: Refresh subscription state from backend (force sync)
          // This ensures entitlements are saved the same way as main_pay_wall
          console.log('[OnboardingV2] 🔄 Refreshing entitlements after purchase...');
          
          // Poll for updated status (webhook latency handling)
          // RevenueCat webhooks can take a few seconds to reach the backend
          const success = await restorePurchases();
          
          console.log('[OnboardingV2] Restore result:', success);
          
          if (!success) {
            // Fallback to simple refresh if restore fails
            console.log('[OnboardingV2] Restore failed, trying refreshEntitlements...');
            await refreshEntitlements();
          }
          
          // Re-fetch entitlements to check if user is now paid
          await refreshEntitlements();
          
          // Wait a moment for state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('[OnboardingV2] ✅ Entitlements refreshed - continuing onboarding');
          setPath('paid');
          setCurrentScreen('A1');
        } catch (error) {
          console.error('[OnboardingV2] ❌ Failed to refresh entitlements:', error);
          // Still continue with onboarding even if refresh fails
          // The backend webhook will eventually sync the subscription
        setPath('paid');
        setCurrentScreen('A1');
        }
      } else {
        console.log('[OnboardingV2] User dismissed without purchase');
        handleContinueFree();
      }
    },
  });
  console.log('[OnboardingV2] 🔧 usePlacement hook setup complete');
  
  // Log Superwall placement status
  React.useEffect(() => {
    console.log('[OnboardingV2] ✅ expo-superwall usePlacement hook available');
    console.log('[OnboardingV2] Placement state:', paywallState.status);
  }, [paywallState.status]);
  
  React.useEffect(() => {
    if (SKIP_ONBOARDING) {
      console.log('[OnboardingV2] Skipping onboarding (dev mode)');
      router.replace('/(tabs)/home' as any);
    }
  }, [SKIP_ONBOARDING]);
  
  // Auto-skip onboarding for returning users who have already completed it
  React.useEffect(() => {
    if (user && onboardingCompleted) {
      console.log('[OnboardingV2] ✅ Returning user detected - skipping to main app', { isPaid });
      analytics.track('onboarding_skipped', { reason: 'returning_user', is_paid: isPaid });
      router.replace('/(tabs)/home' as any);
    }
  }, [user, onboardingCompleted, isPaid]);
  
  // Save progress locally
  const saveProgress = async (updates: Partial<any>) => {
    try {
      const current = await AsyncStorage.getItem('onboarding_v2_progress');
      const parsed = current ? JSON.parse(current) : {};
      const updated = { ...parsed, ...updates };
      await AsyncStorage.setItem('onboarding_v2_progress', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save progress', e);
    }
  };

  // Restore progress on mount
  React.useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem('onboarding_v2_progress');
        console.log('[OnboardingV2] 📦 Restoring progress:', saved ? 'found' : 'none', 'user:', !!user);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('[OnboardingV2] 📦 Parsed progress:', JSON.stringify(parsed));
          
          if (parsed.path) setPath(parsed.path);
          if (parsed.responses) setResponses(parsed.responses);
          
          // If we just came back from auth (user exists) and we were on A1, move to next step
          if (user && (parsed.currentScreen === 'A1' || parsed.currentScreen === 'S1')) {
             console.log('[OnboardingV2] ✅ User authenticated, resuming from A1');
             // Resume logic based on path
             if (parsed.path === 'paid') {
               setCurrentScreen('Q1');
               setQIndex(0);
             } else if (parsed.path === 'free') {
               // Free path: Q1..Q16 -> A1 -> [Auth] -> Q17 (index 16)
               if (parsed.qIndex >= 15) {
                 setCurrentScreen('Q17');
                 setQIndex(16);
               } else {
                 setCurrentScreen('Q1');
                 setQIndex(0);
               }
             }
          } else if (user && parsed.currentScreen) {
            // Authenticated user: restore to any saved screen
            console.log('[OnboardingV2] ✅ Authenticated, restoring to:', parsed.currentScreen, 'qIndex:', parsed.qIndex);
            if (parsed.qIndex !== undefined) setQIndex(parsed.qIndex);
            setCurrentScreen(parsed.currentScreen);
          } else if (!user && parsed.currentScreen) {
            // NOT authenticated: only restore to pre-auth screens (S1, S2, Q1-Q16, A1)
            const preAuthScreens = ['S1', 'S2', 'A1'];
            const isPreAuthQuestion = parsed.qIndex !== undefined && parsed.qIndex <= 15;
            
            if (preAuthScreens.includes(parsed.currentScreen) || (parsed.currentScreen.startsWith('Q') && isPreAuthQuestion)) {
              console.log('[OnboardingV2] ⚠️ No auth, restoring to pre-auth screen:', parsed.currentScreen);
              if (parsed.qIndex !== undefined) setQIndex(parsed.qIndex);
              setCurrentScreen(parsed.currentScreen);
            } else {
              // User somehow got to post-auth screen without auth - redirect to A1 (email)
              console.log('[OnboardingV2] ⚠️ No auth but saved screen requires auth - redirecting to A1');
              setCurrentScreen('A1');
              if (parsed.qIndex !== undefined && parsed.qIndex >= 15) {
                setQIndex(15); // Keep at Q16 index so they can continue after auth
              }
            }
          }
        }
      } catch (e) {
        console.error('[OnboardingV2] Failed to restore progress', e);
      }
    };
    restore();
  }, [user]);

  const handleContinueFree = () => {
    console.log('[OnboardingV2] 🆓 Continue for Free selected');
    analytics.track('paywall_dismissed');
    setPath('free');
    setCurrentScreen('Q1');
    setQIndex(0);
    saveProgress({ path: 'free', currentScreen: 'Q1', qIndex: 0 });
    console.log('[OnboardingV2] Navigating to Q1 (free path)');
  };

  const handleStartTrial = async () => {
    console.log('[OnboardingV2] 🚀 Start Free Trial tapped');
    analytics.track('paywall_triggered', { placement: 'intro_paywall', path });
    
    try {
      // CRITICAL: Set subscription status BEFORE calling registerPlacement
      // Superwall requires this to determine if paywall should show
      console.log('[OnboardingV2] Setting Superwall subscription status...');
      await setSuperwallStatus({
        status: 'INACTIVE', // User is not subscribed, so show paywall
      });
      console.log('[OnboardingV2] ✅ Subscription status set to INACTIVE');
      
      // Small delay to ensure status is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now trigger the paywall
      console.log('[OnboardingV2] ✅ Triggering intro_paywall placement');
      await registerPlacement({
        placement: 'intro_paywall',
        feature() {
          console.log('[OnboardingV2] User has access - feature unlocked!');
          setPath('paid');
          setCurrentScreen('A1');
          saveProgress({ path: 'paid', currentScreen: 'A1' });
        },
      });
      console.log('[OnboardingV2] ✅ registerPlacement called');
    } catch (error: any) {
      console.error('[OnboardingV2] ❌ Paywall error:', error);
      // Fallback: continue with free path
      handleContinueFree();
    }
  };

  const handleEmailContinue = async () => {
    if (!email?.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email.');
      return;
    }
    
    // Mark welcome as seen since we are moving to auth
    await markWelcomeSeen();
    
    // Navigate to auth screen with email pre-filled
    analytics.track('email_captured', { email, path });
    saveProgress({ email, currentScreen: 'A1' }); // Save state before leaving
    router.push(`/auth?email=${encodeURIComponent(email)}&isSignUp=true&returnTo=/onboarding-v2` as any);
  };

  const handleNextQuestion = () => {
    const q = questions[qIndex];
    if (!q) {
      console.error(`[OnboardingV2] ❌ Question at index ${qIndex} not found`);
      return;
    }
    if (q.required && !responses[q.key]) {
      Alert.alert('Please answer to continue');
      return;
    }

    // Q16 free path -> email (check if we have at least 16 questions)
    if (qIndex === 15 && path === 'free' && questions.length > 15) {
      setCurrentScreen('A1');
      saveProgress({ currentScreen: 'A1', responses, qIndex });
      return;
    }

    // Q17 handling (was Q18 after removing Q12, now Q17 after removing Q15)
    if (qIndex === 16) {
      if (responses.first_person_flag === 'yes') {
        // Go to Q18
        setQIndex(17);
        setCurrentScreen('Q18');
      } else {
        // Skip Q18, go to Q19
        setQIndex(18);
        setCurrentScreen('Q19');
      }
      return;
    }

    // Last question - go to completion screen
    if (qIndex === questions.length - 1) {
      setCurrentScreen('COMPLETE');
      saveProgress({ currentScreen: 'COMPLETE', qIndex, responses });
      return;
    }

    // Continue to next question
    const nextQIndex = qIndex + 1;
    const nextScreen = `Q${nextQIndex + 1}` as ScreenID; // Q ids are 1-based
    setQIndex(nextQIndex);
    setCurrentScreen(nextScreen);
    saveProgress({ currentScreen: nextScreen, qIndex: nextQIndex, responses });
  };

  const finishOnboarding = async () => {
    console.log('[OnboardingV2] 🏁 Finishing onboarding, user:', !!user);
    
    // Guard: Must be authenticated to complete
    if (!user) {
      console.warn('[OnboardingV2] ⚠️ No user at finish - redirecting to A1');
      Alert.alert(
        'Sign In Required',
        'Please sign in to complete onboarding.',
        [{ text: 'OK', onPress: () => setCurrentScreen('A1') }]
      );
      return;
    }
    
    try {
      await saveResponses();
      
      // Save user's first name to profiles table
      if (responses.profile_first_name) {
        console.log('[OnboardingV2] 💾 Saving first name to profile:', responses.profile_first_name);
        
        // First, check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (existingProfile) {
          // Profile exists - update it
          console.log('[OnboardingV2] Profile exists, updating first_name...');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ first_name: responses.profile_first_name })
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error('[OnboardingV2] ❌ Failed to update profile first name:', updateError);
            // Try saving as display_name as fallback
            const { error: displayNameError } = await supabase
              .from('profiles')
              .update({ display_name: responses.profile_first_name })
              .eq('user_id', user.id);
            
            if (displayNameError) {
              console.error('[OnboardingV2] ❌ Failed to save display_name:', displayNameError);
            } else {
              console.log('[OnboardingV2] ✅ Profile display_name saved successfully (fallback)');
            }
          } else {
            console.log('[OnboardingV2] ✅ Profile first name updated successfully');
            
            // Verify the save worked
            const { data: verifyProfile } = await supabase
              .from('profiles')
              .select('first_name')
              .eq('user_id', user.id)
              .single();
            
            if (verifyProfile?.first_name === responses.profile_first_name) {
              console.log('[OnboardingV2] ✅ Verified: first_name saved correctly');
            } else {
              console.warn('[OnboardingV2] ⚠️ Warning: first_name verification failed. Saved:', verifyProfile?.first_name, 'Expected:', responses.profile_first_name);
            }
          }
        } else {
          // Profile doesn't exist - insert it
          console.log('[OnboardingV2] Profile does not exist, creating with first_name...');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              first_name: responses.profile_first_name,
            });
          
          if (insertError) {
            console.error('[OnboardingV2] ❌ Failed to insert profile with first name:', insertError);
            // Try without first_name (let trigger handle it)
            const { error: insertFallbackError } = await supabase
              .from('profiles')
              .insert({
                user_id: user.id,
                display_name: responses.profile_first_name,
              });
            
            if (insertFallbackError) {
              console.error('[OnboardingV2] ❌ Failed to insert profile with display_name:', insertFallbackError);
            } else {
              console.log('[OnboardingV2] ✅ Profile created with display_name (fallback)');
            }
          } else {
            console.log('[OnboardingV2] ✅ Profile created with first_name successfully');
          }
        }
      }
      
      // Create first contact if specified
      if (responses.first_person_name) {
        console.log('[OnboardingV2] 📝 Creating first contact:', responses.first_person_name);
        await supabase.from('contacts').insert({
          user_id: user.id,
          display_name: responses.first_person_name,
          warmth: 30,
          amplitude: 0,
          warmth_band: 'cool',
          warmth_last_updated_at: new Date().toISOString(),
        });
      }
      
      // Mark onboarding as completed in profiles table
      console.log('[OnboardingV2] ✅ Marking onboarding as completed in profiles table');
      const { error: onboardingCompleteError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (onboardingCompleteError) {
        console.error('[OnboardingV2] ❌ Failed to mark onboarding as completed:', onboardingCompleteError);
        // Non-critical error - continue with completion
      } else {
        console.log('[OnboardingV2] ✅ Onboarding completion timestamp saved to profiles');
      }
      
      // Clear progress from AsyncStorage since we're done
      await AsyncStorage.removeItem('onboarding_v2_progress');
      
      await completeOnboarding(); // Mark as complete in context
      console.log('[OnboardingV2] ✅ Onboarding completed!');
      router.replace('/(tabs)/home' as any);
    } catch (e) {
      console.error('[OnboardingV2] ❌ Error finishing onboarding:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const saveResponses = async () => {
    if (!user) {
      console.warn('[OnboardingV2] ⚠️ Cannot save responses: no user');
      return;
    }
    
    try {
      console.log('[OnboardingV2] 💾 Saving all onboarding responses...');
      console.log('[OnboardingV2] Responses to save:', Object.keys(responses).length, 'answers');
      
      // Save all responses to onboarding_responses_v2 table
      // The spread operator ensures ALL responses are saved
      const { error } = await supabase.from('onboarding_responses_v2').insert({
      user_id: user.id,
      version: 2,
      path,
        ...responses, // This spreads all response keys/values
      completed_at: new Date().toISOString(),
    });
      
      if (error) {
        console.error('[OnboardingV2] ❌ Error saving responses:', error);
        throw error;
      }
      
      console.log('[OnboardingV2] ✅ All responses saved successfully');
    } catch (e) {
      console.error('[OnboardingV2] ❌ Exception saving responses:', e);
      throw e;
    }
  };

  const renderScreen = () => {
    if (currentScreen === 'S1') {
      return (
        <View style={styles.screen}>
          <View style={styles.logoContainer}>
             <Image
               source={require('@/assets/images/icon.png')}
               style={{ width: 80, height: 80, borderRadius: 20 }}
               resizeMode="contain"
             />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            Welcome to EverReach
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            We help you remember to check in with the people who matter.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary }]}
            onPress={() => setCurrentScreen('S2')}
          >
            <Text style={styles.btnText}>Get Started</Text>
            <ArrowRight size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    }

    if (currentScreen === 'S2') {
      return (
        <View style={styles.screen}>
          <Text style={[styles.title, { color: theme.text }]}>
            Keep important people from slipping away
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            • See who to reach out to today{'\n'}
            • Get gentle nudges over time{'\n'}
            • Save notes about what's going on in their life
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary }]}
            onPress={handleStartTrial}
          >
            <Text style={styles.btnText}>Start Free Trial</Text>
            <ArrowRight size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    }

    if (currentScreen === 'A1') {
      return (
        <View style={styles.screen}>
          <Text style={[styles.title, { color: theme.text }]}>
            What's your email address?
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary }]}
            onPress={handleEmailContinue}
          >
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentScreen === 'COMPLETE') {
      const userName = responses.profile_first_name || 'there';
      return (
        <View style={[styles.screen, { alignItems: 'center', paddingTop: 40 }]}>
          {/* Celebration Icon */}
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.primary + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <Sparkles size={48} color={theme.primary} />
          </View>
          
          <Text style={[styles.title, { color: theme.text, textAlign: 'center', marginBottom: 12 }]}>
            You're all set, {userName}! 🎉
          </Text>
          
          <Text style={[styles.body, { color: theme.textSecondary, textAlign: 'center', marginBottom: 32 }]}>
            EverReach is ready to help you stay connected with the people who matter most.
          </Text>
          
          {/* Feature highlights */}
          <View style={{ width: '100%', gap: 16, marginBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.success + '20', justifyContent: 'center', alignItems: 'center' }}>
                <CheckCircle2 size={24} color={theme.success} />
              </View>
              <Text style={{ color: theme.text, fontSize: 16, flex: 1 }}>
                Daily nudges to reach out
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
                <Users size={24} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, fontSize: 16, flex: 1 }}>
                Keep track of everyone important
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F43F5E20', justifyContent: 'center', alignItems: 'center' }}>
                <Heart size={24} color="#F43F5E" />
              </View>
              <Text style={{ color: theme.text, fontSize: 16, flex: 1 }}>
                Strengthen your relationships
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary, width: '100%' }]}
            onPress={finishOnboarding}
          >
            <Text style={styles.btnText}>Let's Go!</Text>
            <ArrowRight size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      );
    }

    if (currentScreen.startsWith('Q')) {
      // Show loading state while questions are being loaded
      if (questionsLoading) {
        return (
          <View style={styles.screen}>
            <Text style={[styles.title, { color: theme.text }]}>Loading...</Text>
          </View>
        );
      }
      
      const q = questions[qIndex];
      if (!q) {
        console.error(`[OnboardingV2] ❌ Question at index ${qIndex} not found`);
        return (
          <View style={styles.screen}>
            <Text style={[styles.title, { color: theme.text }]}>Question not found</Text>
          </View>
        );
      }
      
      return (
        <View style={styles.screen}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {qIndex + 1} / {questions.length}
          </Text>
          {q.explainer && (
            <Text style={[styles.explainer, { color: theme.textSecondary }]}>
              {q.explainer}
            </Text>
          )}
          <Text style={[styles.questionText, { color: theme.text }]}>{q.question}</Text>
          
          {q.type === 'text' ? (
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              placeholder={q.placeholder}
              value={responses[q.key] || ''}
              onChangeText={(v) => setResponses({ ...responses, [q.key]: v })}
            />
          ) : (
            q.options?.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.option,
                  {
                    backgroundColor: responses[q.key] === opt.value ? theme.primary + '20' : theme.surface,
                    borderColor: responses[q.key] === opt.value ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setResponses({ ...responses, [q.key]: opt.value })}
              >
                <Text style={{ color: responses[q.key] === opt.value ? theme.primary : theme.text }}>
                  {opt.label}
                </Text>
                {responses[q.key] === opt.value && <CheckCircle2 size={20} color={theme.primary} />}
              </TouchableOpacity>
            ))
          )}
          
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary }]}
            onPress={handleNextQuestion}
          >
            <Text style={styles.btnText}>Next</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}>
        {renderScreen()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { gap: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  btnSecondary: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  btnSecondaryText: { fontSize: 16, fontWeight: '600' },
  input: { padding: 16, borderRadius: 12, fontSize: 16 },
  progressText: { fontSize: 14 },
  explainer: { fontSize: 14, fontStyle: 'italic' },
  questionText: { fontSize: 20, fontWeight: '600' },
  option: { padding: 16, borderRadius: 12, borderWidth: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
