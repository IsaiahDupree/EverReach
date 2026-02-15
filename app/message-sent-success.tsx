import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, TrendingUp, Flame } from 'lucide-react-native';
import { useAppSettings, type Theme } from '@/providers/AppSettingsProvider';
import { usePeople } from '@/providers/PeopleProvider';
import { useWarmth } from '@/providers/WarmthProvider';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function MessageSentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    personId: string;
    personName: string;
  }>();
  
  const { theme } = useAppSettings();
  const { people, refreshPeople } = usePeople();
  const { refreshSingle } = useWarmth();
  
  // Analytics tracking
  useAnalytics('MessageSentSuccess', {
    screenProperties: {
      person_id: params.personId,
    },
  });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const warmthScaleAnim = useRef(new Animated.Value(0)).current;
  const warmthSlideAnim = useRef(new Animated.Value(30)).current;
  const scoreCountAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  const person = people.find(p => p.id === params.personId);
  const personName = params.personName || person?.fullName || 'Contact';
  const oldWarmthRef = useRef<number>(person?.warmth ?? 30);
  
  const [newWarmth, setNewWarmth] = useState<number>(oldWarmthRef.current);
  const [warmthIncrease, setWarmthIncrease] = useState<number>(0);
  const [displayScore, setDisplayScore] = useState<number>(oldWarmthRef.current);

  // Fetch real warmth from backend and compute actual delta
  useEffect(() => {
    if (!params.personId) return;
    console.log('[MessageSentSuccess] Fetching real warmth for contact:', params.personId);
    refreshSingle(params.personId, { force: true, source: 'message-sent' })
      .then((data) => {
        const realScore = data?.score ?? oldWarmthRef.current;
        const delta = Math.max(0, realScore - oldWarmthRef.current);
        console.log('[MessageSentSuccess] Real warmth:', realScore, 'old:', oldWarmthRef.current, 'delta:', delta);
        setNewWarmth(realScore);
        setWarmthIncrease(delta);
      })
      .catch(err => {
        console.error('[MessageSentSuccess] Failed to refresh warmth:', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.personId]);

  useEffect(() => {
    console.log('[MessageSentSuccess] Screen mounted, starting animations');
    console.log('[MessageSentSuccess] Old warmth:', oldWarmthRef.current, 'New warmth:', newWarmth);
    
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(warmthScaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(warmthSlideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scoreCountAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    const scoreListener = scoreCountAnim.addListener(({ value }) => {
      const currentScore = Math.round(oldWarmthRef.current + (newWarmth - oldWarmthRef.current) * value);
      setDisplayScore(currentScore);
    });

    const timer = setTimeout(() => {
      console.log('[MessageSentSuccess] Auto-dismissing, navigating to home tab');
      router.replace('/(tabs)/home');
      (async () => {
        try {
          await refreshPeople();
          console.log('[MessageSentSuccess] People list refreshed successfully');
        } catch (error) {
          console.error('[MessageSentSuccess] Failed to refresh people:', error);
        }
      })();
    }, 2000);

    return () => {
      clearTimeout(timer);
      scoreCountAnim.removeListener(scoreListener);
    };
  }, [fadeAnim, scaleAnim, warmthScaleAnim, warmthSlideAnim, scoreCountAnim, newWarmth, refreshPeople, router]);

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Stack.Screen />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <CheckCircle size={80} color="#10B981" strokeWidth={2} />
        </View>

        <Text style={styles.title}>Message Marked as Sent!</Text>
        
        <View style={styles.messageContainer}>
          <Text style={styles.message}>
            Your message to <Text style={styles.personName}>{personName}</Text> has been saved.
          </Text>
        </View>

        <Animated.View 
          style={[
            styles.warmthContainer,
            {
              transform: [
                { scale: warmthScaleAnim },
                { translateY: warmthSlideAnim },
              ],
            },
          ]}
        >
          <View style={styles.warmthIconContainer}>
            <Flame size={32} color="#F59E0B" fill="#FEF3C7" />
          </View>
          
          <View style={styles.warmthContent}>
            <Text style={styles.warmthLabel}>Warmth Score</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>{displayScore}</Text>
              {warmthIncrease > 0 && (
                <>
                  <TrendingUp size={20} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.increaseText}>+{warmthIncrease}</Text>
                </>
              )}
            </View>
            <Text style={styles.warmthSubtext}>
              {warmthIncrease > 0
                ? `${personName} is getting warmer!`
                : `Keep reaching out to ${personName}!`}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  messageContainer: {
    marginBottom: 32,
  },
  message: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  personName: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  warmthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FEF3C7',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  warmthIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warmthContent: {
    flex: 1,
  },
  warmthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#92400E',
  },
  increaseText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  warmthSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
});
