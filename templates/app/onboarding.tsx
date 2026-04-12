/**
 * SunTrace - Onboarding Screen
 *
 * 5-step flow:
 * 1. Welcome with spinning sun animation
 * 2. Skin type picker (Fitzpatrick I-VI)
 * 3. Age input
 * 4. Location permission
 * 5. Notification opt-in
 *
 * Saves profile to Supabase on completion.
 * Uses AsyncStorage to track completion.
 */
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sun, ChevronRight, MapPin, Bell, Check } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createProfile } from '@/services/api';
import type { FitzpatrickSkinType, CreateProfileInput } from '@/types/models';

const TOTAL_STEPS = 5;
const ONBOARDING_KEY = 'suntrace_onboarding_complete';

// ============================================
// Skin type data
// ============================================
const SKIN_TYPES: Array<{
  type: FitzpatrickSkinType;
  label: string;
  description: string;
  color: string;
  burnTendency: string;
}> = [
  {
    type: 1,
    label: 'Type I',
    description: 'Very Fair',
    color: '#FDE8D8',
    burnTendency: 'Always burns, never tans',
  },
  {
    type: 2,
    label: 'Type II',
    description: 'Fair',
    color: '#FDDBB4',
    burnTendency: 'Burns easily, tans minimally',
  },
  {
    type: 3,
    label: 'Type III',
    description: 'Medium',
    color: '#E8B897',
    burnTendency: 'Sometimes burns, tans uniformly',
  },
  {
    type: 4,
    label: 'Type IV',
    description: 'Olive',
    color: '#C68642',
    burnTendency: 'Burns minimally, always tans well',
  },
  {
    type: 5,
    label: 'Type V',
    description: 'Brown',
    color: '#8D5524',
    burnTendency: 'Rarely burns, tans profusely',
  },
  {
    type: 6,
    label: 'Type VI',
    description: 'Dark',
    color: '#4A2912',
    burnTendency: 'Never burns, deeply pigmented',
  },
];

// ============================================
// Progress indicator
// ============================================
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View style={progressStyles.container}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            progressStyles.dot,
            i < current ? progressStyles.dotComplete : i === current ? progressStyles.dotActive : progressStyles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 32 },
  dot: { height: 4, borderRadius: 2 },
  dotComplete: { width: 20, backgroundColor: '#22C55E' },
  dotActive: { width: 28, backgroundColor: '#F97316' },
  dotInactive: { width: 20, backgroundColor: '#1E293B' },
});

// ============================================
// Step 1: Welcome
// ============================================
function WelcomeStep({ onNext }: { onNext: () => void }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={stepStyles.center}>
      <Animated.View style={[stepStyles.sunWrapper, { transform: [{ rotate: spin }] }]}>
        <Sun size={100} color="#F97316" />
      </Animated.View>
      <Text style={stepStyles.title}>Welcome to SunTrace</Text>
      <Text style={stepStyles.subtitle}>
        Your personalized sunlight coach. Track UV exposure, build healthy habits, and optimize your Vitamin D.
      </Text>
      <TouchableOpacity style={stepStyles.btn} onPress={onNext} activeOpacity={0.85}>
        <Text style={stepStyles.btnText}>Get Started</Text>
        <ChevronRight size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// Step 2: Skin Type Picker
// ============================================
function SkinTypeStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: FitzpatrickSkinType | null;
  onSelect: (t: FitzpatrickSkinType) => void;
  onNext: () => void;
}) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>What's your skin type?</Text>
      <Text style={stepStyles.subtitle}>
        This helps us calculate safe sun exposure and Vitamin D synthesis accurately.
      </Text>
      <View style={skinStyles.grid}>
        {SKIN_TYPES.map((st) => (
          <TouchableOpacity
            key={st.type}
            style={[
              skinStyles.swatch,
              { backgroundColor: st.color },
              selected === st.type && skinStyles.swatchSelected,
            ]}
            onPress={() => onSelect(st.type)}
            activeOpacity={0.8}
          >
            {selected === st.type && (
              <View style={skinStyles.checkmark}>
                <Check size={12} color="white" />
              </View>
            )}
            <Text style={skinStyles.swatchLabel}>{st.label}</Text>
            <Text style={skinStyles.swatchDesc}>{st.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selected && (
        <View style={skinStyles.infoBox}>
          <Text style={skinStyles.infoText}>
            {SKIN_TYPES.find((s) => s.type === selected)?.burnTendency}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[stepStyles.btn, !selected && stepStyles.btnDisabled]}
        onPress={onNext}
        disabled={!selected}
        activeOpacity={0.85}
      >
        <Text style={stepStyles.btnText}>Continue</Text>
        <ChevronRight size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const skinStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginVertical: 20,
  },
  swatch: {
    width: '29%',
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: 'flex-end',
    padding: 10,
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  swatchSelected: {
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F97316',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(0,0,0,0.7)' },
  swatchDesc: { fontSize: 10, color: 'rgba(0,0,0,0.55)' },
  infoBox: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    width: '100%',
  },
  infoText: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});

// ============================================
// Step 3: Age Input
// ============================================
function AgeStep({
  age,
  onChangeAge,
  onNext,
}: {
  age: string;
  onChangeAge: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={stepStyles.container}
    >
      <Text style={stepStyles.title}>How old are you?</Text>
      <Text style={stepStyles.subtitle}>
        Age affects Vitamin D synthesis. This helps us personalize your daily recommendations.
      </Text>
      <TextInput
        style={ageStyles.input}
        value={age}
        onChangeText={(v) => onChangeAge(v.replace(/[^0-9]/g, ''))}
        placeholder="Enter your age"
        placeholderTextColor="#475569"
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="done"
      />
      <TouchableOpacity
        style={stepStyles.btn}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={stepStyles.btnText}>
          {age ? 'Continue' : 'Skip'}
        </Text>
        <ChevronRight size={18} color="white" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const ageStyles = StyleSheet.create({
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    width: '100%',
    marginVertical: 24,
    borderWidth: 2,
    borderColor: '#334155',
  },
});

// ============================================
// Step 4: Location Permission
// ============================================
function LocationStep({
  granted,
  onRequest,
  onNext,
}: {
  granted: boolean;
  onRequest: () => void;
  onNext: () => void;
}) {
  return (
    <View style={stepStyles.center}>
      <View style={iconStyles.circle}>
        <MapPin size={44} color="#F97316" />
      </View>
      <Text style={stepStyles.title}>Enable Location</Text>
      <Text style={stepStyles.subtitle}>
        SunTrace uses your location to pull real-time UV data and find the best sun spots near you.
        Your location is never shared.
      </Text>
      {!granted ? (
        <TouchableOpacity style={stepStyles.btn} onPress={onRequest} activeOpacity={0.85}>
          <MapPin size={18} color="white" />
          <Text style={stepStyles.btnText}>Allow Location</Text>
        </TouchableOpacity>
      ) : (
        <View style={stepStyles.grantedBanner}>
          <Check size={16} color="#22C55E" />
          <Text style={stepStyles.grantedText}>Location enabled!</Text>
        </View>
      )}
      <TouchableOpacity style={stepStyles.skipBtn} onPress={onNext}>
        <Text style={stepStyles.skipText}>{granted ? 'Continue' : 'Skip for now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// Step 5: Notifications
// ============================================
function NotificationsStep({
  granted,
  onRequest,
  onFinish,
}: {
  granted: boolean;
  onRequest: () => void;
  onFinish: () => void;
}) {
  return (
    <View style={stepStyles.center}>
      <View style={iconStyles.circle}>
        <Bell size={44} color="#F97316" />
      </View>
      <Text style={stepStyles.title}>Daily Reminders</Text>
      <Text style={stepStyles.subtitle}>
        Get notified when UV conditions are perfect for your daily Vitamin D dose. We'll remind you at the best time based on your location.
      </Text>
      {!granted ? (
        <TouchableOpacity style={stepStyles.btn} onPress={onRequest} activeOpacity={0.85}>
          <Bell size={18} color="white" />
          <Text style={stepStyles.btnText}>Enable Notifications</Text>
        </TouchableOpacity>
      ) : (
        <View style={stepStyles.grantedBanner}>
          <Check size={16} color="#22C55E" />
          <Text style={stepStyles.grantedText}>Notifications enabled!</Text>
        </View>
      )}
      <TouchableOpacity
        style={[stepStyles.btn, stepStyles.finishBtn]}
        onPress={onFinish}
        activeOpacity={0.85}
      >
        <Sun size={18} color="white" />
        <Text style={stepStyles.btnText}>Start Using SunTrace</Text>
      </TouchableOpacity>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  circle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F9731611',
    borderWidth: 2,
    borderColor: '#F9731633',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
});

const stepStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  sunWrapper: { marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 20,
    width: '100%',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: { backgroundColor: '#334155', shadowOpacity: 0 },
  btnText: { fontSize: 16, fontWeight: '700', color: 'white' },
  finishBtn: { backgroundColor: '#22C55E', shadowColor: '#22C55E', marginTop: 12 },
  skipBtn: { marginTop: 12, padding: 8 },
  skipText: { fontSize: 14, color: '#64748B' },
  grantedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22C55E11',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  grantedText: { fontSize: 14, color: '#22C55E', fontWeight: '600' },
});

// ============================================
// Main Onboarding Screen
// ============================================
export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [skinType, setSkinType] = useState<FitzpatrickSkinType | null>(null);
  const [age, setAge] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const createProfileMutation = useMutation({
    mutationFn: createProfile,
    onSuccess: async () => {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.replace('/(tabs)/home');
    },
    onError: (err) => {
      Alert.alert('Error', 'Could not save your profile. Please try again.');
      console.error('Profile creation error:', err);
    },
  });

  const handleLocationRequest = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationGranted(true);
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocationCoords({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch {
        // coords optional
      }
    }
  };

  const handleNotifRequest = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifGranted(status === 'granted');
  };

  const handleFinish = async () => {
    if (!skinType) {
      setStep(1);
      return;
    }

    const input: CreateProfileInput = {
      skin_type: skinType,
      age: age ? parseInt(age, 10) : undefined,
      location_enabled: locationGranted,
      notifications_enabled: notifGranted,
    };

    createProfileMutation.mutate(input);
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));

  const stepContent = [
    <WelcomeStep key="welcome" onNext={next} />,
    <SkinTypeStep
      key="skin"
      selected={skinType}
      onSelect={setSkinType}
      onNext={next}
    />,
    <AgeStep key="age" age={age} onChangeAge={setAge} onNext={next} />,
    <LocationStep
      key="location"
      granted={locationGranted}
      onRequest={handleLocationRequest}
      onNext={next}
    />,
    <NotificationsStep
      key="notifs"
      granted={notifGranted}
      onRequest={handleNotifRequest}
      onFinish={handleFinish}
    />,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.progressArea}>
        <StepProgress current={step} total={TOTAL_STEPS} />
      </View>

      <View style={styles.stepContent}>{stepContent[step]}</View>

      {createProfileMutation.isPending && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.savingText}>Setting up your profile...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  progressArea: { paddingTop: 8, paddingBottom: 4 },
  stepContent: { flex: 1 },
  savingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(15,23,42,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  savingText: { fontSize: 15, color: '#94A3B8' },
});
