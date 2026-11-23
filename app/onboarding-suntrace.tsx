import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Sun, MapPin, Bell, ChevronRight, ChevronLeft, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { upsertProfile } from '@/services/suntraceApi';
import { SKIN_TYPE_DATA } from '@/services/uvCalculations';
import { FitzpatrickType } from '@/types/suntrace';
import { SUNTRACE_COLORS } from '@/constants/suntrace';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  'welcome',
  'skin_type',
  'age',
  'location',
  'notifications',
] as const;

type Step = typeof STEPS[number];

export default function SunTraceOnboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [skinType, setSkinType] = useState<FitzpatrickType>(3);
  const [age, setAge] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = STEPS.length;
  const step = STEPS[currentStep];

  function animateToNext(direction: 'forward' | 'back') {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction === 'forward' ? -50 : 50,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function goNext() {
    if (currentStep < totalSteps - 1) {
      animateToNext('forward');
      setCurrentStep(s => s + 1);
    } else {
      completeOnboarding();
    }
  }

  function goBack() {
    if (currentStep > 0) {
      animateToNext('back');
      setCurrentStep(s => s - 1);
    }
  }

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(status === 'granted');
  }

  async function requestNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifGranted(status === 'granted');
  }

  async function completeOnboarding() {
    setLoading(true);
    try {
      const ageNum = parseInt(age, 10) || 30;
      await upsertProfile({
        skin_type: skinType,
        age: ageNum,
        notifications_enabled: notifGranted,
        location_enabled: locationGranted,
      });
      // Mark onboarding complete
      await supabase
        .from('sun_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '');

      router.replace('/(tabs)/sun-home');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Skip button */}
      {currentStep < totalSteps - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={completeOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.View
        style={[styles.content, { transform: [{ translateX: slideAnim }] }]}
      >
        {step === 'welcome' && <WelcomeStep />}
        {step === 'skin_type' && (
          <SkinTypeStep selected={skinType} onSelect={setSkinType} />
        )}
        {step === 'age' && <AgeStep value={age} onChange={setAge} />}
        {step === 'location' && (
          <LocationStep granted={locationGranted} onRequest={requestLocation} />
        )}
        {step === 'notifications' && (
          <NotificationsStep granted={notifGranted} onRequest={requestNotifications} />
        )}
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navRow}>
        {currentStep > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <ChevronLeft size={20} color={SUNTRACE_COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={loading}
        >
          <Text style={styles.nextBtnText}>
            {currentStep === totalSteps - 1 ? "Let's Go!" : 'Continue'}
          </Text>
          {currentStep < totalSteps - 1 && (
            <ChevronRight size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// Step Components
// ============================================

function WelcomeStep() {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.sunIconContainer}>
        <Sun size={80} color={SUNTRACE_COLORS.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.stepTitle}>Welcome to SunTrace</Text>
      <Text style={styles.stepSubtitle}>
        Your personal sunlight coach. Track UV exposure, build vitamin D, and
        develop healthy sun habits.
      </Text>
      <View style={styles.featureList}>
        {[
          '☀️  Real-time UV tracking',
          '💊  Vitamin D goal calculator',
          '🔥  Daily streaks & badges',
          '🤖  AI sun health coach',
        ].map((f, i) => (
          <Text key={i} style={styles.featureItem}>
            {f}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SkinTypeStep({
  selected,
  onSelect,
}: {
  selected: FitzpatrickType;
  onSelect: (t: FitzpatrickType) => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your skin type?</Text>
      <Text style={styles.stepSubtitle}>
        The Fitzpatrick scale helps us calculate your personal vitamin D target
        and burn risk.
      </Text>
      <View style={styles.skinGrid}>
        {([1, 2, 3, 4, 5, 6] as FitzpatrickType[]).map(type => {
          const info = SKIN_TYPE_DATA[type];
          const isSelected = selected === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.skinCard,
                isSelected && styles.skinCardSelected,
              ]}
              onPress={() => onSelect(type)}
            >
              <View
                style={[
                  styles.skinSwatch,
                  { backgroundColor: info.colorHex },
                ]}
              />
              <Text style={styles.skinTypeName}>Type {type}</Text>
              <Text style={styles.skinTypeDesc} numberOfLines={2}>
                {info.description.split('.')[0]}
              </Text>
              {isSelected && (
                <View style={styles.skinCheckmark}>
                  <Check size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function AgeStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How old are you?</Text>
      <Text style={styles.stepSubtitle}>
        Age affects vitamin D production. We use this to personalize your daily
        target.
      </Text>
      <TextInput
        style={styles.ageInput}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="Enter your age"
        placeholderTextColor={SUNTRACE_COLORS.textSecondary}
        maxLength={3}
      />
      <Text style={styles.ageNote}>
        Over 50? Your daily target will be adjusted since D production decreases
        with age.
      </Text>
    </View>
  );
}

function LocationStep({
  granted,
  onRequest,
}: {
  granted: boolean;
  onRequest: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.permIcon}>
        <MapPin size={60} color={SUNTRACE_COLORS.secondary} />
      </View>
      <Text style={styles.stepTitle}>Enable Location</Text>
      <Text style={styles.stepSubtitle}>
        SunTrace uses your location to fetch real-time UV forecasts and nearby
        sun spots. We never share your location.
      </Text>
      {granted ? (
        <View style={styles.grantedBanner}>
          <Check size={20} color={SUNTRACE_COLORS.accent} />
          <Text style={styles.grantedText}>Location enabled!</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.permButton} onPress={onRequest}>
          <MapPin size={20} color="#fff" />
          <Text style={styles.permButtonText}>Enable Location</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.skipNote}>
        You can enable this later in Settings.
      </Text>
    </View>
  );
}

function NotificationsStep({
  granted,
  onRequest,
}: {
  granted: boolean;
  onRequest: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.permIcon}>
        <Bell size={60} color={SUNTRACE_COLORS.primary} />
      </View>
      <Text style={styles.stepTitle}>Daily Sun Reminders</Text>
      <Text style={styles.stepSubtitle}>
        Get notified when UV is at the ideal level for vitamin D. We'll alert
        you when your best window opens each day.
      </Text>
      {granted ? (
        <View style={styles.grantedBanner}>
          <Check size={20} color={SUNTRACE_COLORS.accent} />
          <Text style={styles.grantedText}>Notifications enabled!</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.permButton} onPress={onRequest}>
          <Bell size={20} color="#fff" />
          <Text style={styles.permButtonText}>Enable Notifications</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.skipNote}>
        You can adjust notification settings anytime.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUNTRACE_COLORS.bgDark,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },
  progressDotActive: {
    backgroundColor: SUNTRACE_COLORS.primary,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: SUNTRACE_COLORS.textSecondary,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunIconContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 15,
    color: SUNTRACE_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 12,
  },
  featureItem: {
    fontSize: 16,
    color: SUNTRACE_COLORS.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 10,
    overflow: 'hidden',
  },
  skinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  skinCard: {
    width: (SCREEN_WIDTH - 72) / 3,
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  skinCardSelected: {
    borderColor: SUNTRACE_COLORS.primary,
  },
  skinSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skinTypeName: {
    fontSize: 12,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 4,
  },
  skinTypeDesc: {
    fontSize: 10,
    color: SUNTRACE_COLORS.textSecondary,
    textAlign: 'center',
  },
  skinCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: SUNTRACE_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageInput: {
    fontSize: 48,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: SUNTRACE_COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 24,
    minWidth: 120,
    marginBottom: 16,
  },
  ageNote: {
    fontSize: 13,
    color: SUNTRACE_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  permIcon: {
    marginBottom: 24,
  },
  permButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SUNTRACE_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 16,
  },
  permButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  grantedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#052e16',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  grantedText: {
    color: SUNTRACE_COLORS.accent,
    fontWeight: '600',
    fontSize: 16,
  },
  skipNote: {
    fontSize: 13,
    color: SUNTRACE_COLORS.textSecondary,
    textAlign: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SUNTRACE_COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SUNTRACE_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
