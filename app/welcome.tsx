import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Users, MessageCircle, Bell, Sparkles, Briefcase, Heart, Handshake } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppAnalytics from '@/lib/analytics';
import { useAuth } from '@/providers/AuthProviderV2';

const { width, height } = Dimensions.get('window');

const WELCOME_SEEN_KEY = '@has_seen_welcome';
const WELCOME_COMPLETED_AT_KEY = '@welcome_completed_at';
const WELCOME_SLIDES_VIEWED_KEY = '@welcome_slides_viewed';
const PREAUTH_FOCUS_KEY = '@preauth_user_focus';

export type UserFocus = 'networking' | 'personal' | 'business' | null;

interface WelcomeSlide {
  id: string;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  color?: string;
  type?: 'info' | 'question';
}

// Focus options for pre-auth question
const focusOptions = [
  {
    id: 'networking',
    label: 'Networking',
    description: 'Build professional connections',
    icon: Briefcase,
    color: '#EDE9FE',
  },
  {
    id: 'personal',
    label: 'Personal',
    description: 'Stay close with friends & family',
    icon: Heart,
    color: '#FCE7F3',
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Maintain client relationships',
    icon: Handshake,
    color: '#DBEAFE',
  },
];

const slides: WelcomeSlide[] = [
  {
    id: '1',
    title: 'Stay Connected',
    subtitle: 'Never lose touch with the people who matter most. EverReach helps you nurture your relationships effortlessly.',
    icon: <Users size={64} color="#7C3AED" />,
    color: '#EDE9FE',
    type: 'info',
  },
  {
    id: '2',
    title: 'Smart Reminders',
    subtitle: 'Get gentle nudges to reach out at the perfect time. Build habits that strengthen your connections.',
    icon: <Bell size={64} color="#7C3AED" />,
    color: '#FEF3C7',
    type: 'info',
  },
  {
    id: '3',
    title: 'AI-Powered Messages',
    subtitle: 'Generate thoughtful, personalized messages in seconds. Never struggle with what to say again.',
    icon: <MessageCircle size={64} color="#7C3AED" />,
    color: '#DBEAFE',
    type: 'info',
  },
  {
    id: 'focus-question',
    title: "What's most important to you?",
    subtitle: "We'll personalize your experience based on your focus.",
    type: 'question',
  },
  {
    id: '5',
    title: 'Your Personal CRM',
    subtitle: 'Keep notes, track interactions, and remember important details about everyone in your network.',
    icon: <Sparkles size={64} color="#7C3AED" />,
    color: '#D1FAE5',
    type: 'info',
  },
];

export async function hasSeenWelcome(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markWelcomeSeen(slidesViewed: number = 4): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [WELCOME_SEEN_KEY, 'true'],
      [WELCOME_COMPLETED_AT_KEY, new Date().toISOString()],
      [WELCOME_SLIDES_VIEWED_KEY, String(slidesViewed)],
    ]);
  } catch (e) {
    console.error('[Welcome] Error marking welcome seen:', e);
  }
}

// Get pre-auth onboarding data for syncing to user profile after sign-up
export async function getPreAuthOnboardingData(): Promise<{
  welcomeCompletedAt: string | null;
  slidesViewed: number | null;
} | null> {
  try {
    const [[, completedAt], [, slidesViewed]] = await AsyncStorage.multiGet([
      WELCOME_COMPLETED_AT_KEY,
      WELCOME_SLIDES_VIEWED_KEY,
    ]);
    
    if (!completedAt) return null;
    
    return {
      welcomeCompletedAt: completedAt,
      slidesViewed: slidesViewed ? parseInt(slidesViewed, 10) : null,
    };
  } catch (e) {
    console.error('[Welcome] Error getting pre-auth data:', e);
    return null;
  }
}

// Clear pre-auth data after it's been synced to the user's account
export async function clearPreAuthOnboardingData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      WELCOME_COMPLETED_AT_KEY,
      WELCOME_SLIDES_VIEWED_KEY,
    ]);
  } catch (e) {
    console.error('[Welcome] Error clearing pre-auth data:', e);
  }
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Track welcome screen viewed (anonymous - no user ID required)
  useEffect(() => {
    AppAnalytics.track('welcome_screen_viewed', {
      is_anonymous: true,
      total_slides: slides.length,
    });
  }, []);

  // Track slide changes
  useEffect(() => {
    if (currentIndex > 0) {
      AppAnalytics.track('welcome_slide_viewed', {
        is_anonymous: true,
        slide_index: currentIndex,
        slide_id: slides[currentIndex]?.id,
        slide_title: slides[currentIndex]?.title,
      });
    }
  }, [currentIndex]);

  // Helper to navigate after welcome completion
  const navigateAfterWelcome = () => {
    if (isAuthenticated) {
      // Already logged in from previous session → go to home
      // The _layout will handle showing onboarding if needed
      console.log('[Welcome] User already authenticated, going to home');
      router.replace('/(tabs)/home');
    } else {
      // Not logged in → go to auth screen
      console.log('[Welcome] User not authenticated, going to auth');
      router.replace('/auth');
    }
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last slide - mark as seen and navigate based on auth status
      const slidesViewed = currentIndex + 1;
      AppAnalytics.track('welcome_completed', {
        is_anonymous: !isAuthenticated,
        method: 'next_button',
        slides_viewed: slidesViewed,
        was_authenticated: isAuthenticated,
      });
      await markWelcomeSeen(slidesViewed);
      navigateAfterWelcome();
    }
  };

  const handleSkip = async () => {
    const slidesViewed = currentIndex + 1;
    AppAnalytics.track('welcome_skipped', {
      is_anonymous: !isAuthenticated,
      skipped_at_slide: currentIndex,
      slides_viewed: slidesViewed,
      was_authenticated: isAuthenticated,
    });
    await markWelcomeSeen(slidesViewed);
    navigateAfterWelcome();
  };

  const [selectedFocus, setSelectedFocus] = useState<UserFocus>(null);

  const handleFocusSelect = async (focus: UserFocus) => {
    setSelectedFocus(focus);
    // Store locally for later sync
    try {
      if (focus) {
        await AsyncStorage.setItem(PREAUTH_FOCUS_KEY, focus);
        AppAnalytics.track('welcome_focus_selected', {
          is_anonymous: true,
          focus,
        });
      }
    } catch (e) {
      console.error('[Welcome] Error saving focus:', e);
    }
  };

  const renderSlide = ({ item }: { item: WelcomeSlide }) => {
    if (item.type === 'question') {
      return (
        <View style={[styles.slide, { width }]}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
          
          <View style={styles.optionsContainer}>
            {focusOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedFocus === option.id;
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => handleFocusSelect(option.id as UserFocus)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                    <Icon size={24} color="#7C3AED" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.slide, { width }]}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          {item.icon}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    );
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[styles.dot, { width: dotWidth, opacity }]}
          />
        );
      })}
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      {renderDots()}

      {/* Next/Get Started button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={20} color="#FFFFFF" style={styles.nextIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    marginHorizontal: 4,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  nextButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextIcon: {
    marginLeft: 8,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#7C3AED',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  optionDescriptionSelected: {
    color: '#4B5563',
  },
});
