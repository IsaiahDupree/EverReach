/**
 * Skeleton Loading Components
 * Placeholder components shown while data is loading
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Theme } from '@/providers/AppSettingsProvider';

interface SkeletonProps {
  theme: Theme;
}

// Pulsing animation for skeleton loaders
const usePulse = () => {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return opacity;
};

export function SkeletonHealthCard({ theme }: SkeletonProps) {
  const opacity = usePulse();

  return (
    <View style={[styles.healthCard, { backgroundColor: theme.colors.surface }]}>
      <Animated.View
        style={[
          styles.skeletonCircle,
          { backgroundColor: theme.colors.border, opacity },
        ]}
      />
      <Animated.View
        style={[
          styles.skeletonText,
          { backgroundColor: theme.colors.border, opacity, width: 30, height: 12, marginTop: 8 },
        ]}
      />
      <Animated.View
        style={[
          styles.skeletonText,
          { backgroundColor: theme.colors.border, opacity, width: 20, height: 16, marginTop: 4 },
        ]}
      />
    </View>
  );
}

export function SkeletonInteractionCard({ theme }: SkeletonProps) {
  const opacity = usePulse();

  return (
    <View style={[styles.interactionCard, { backgroundColor: theme.colors.surface }]}>
      <Animated.View
        style={[
          styles.skeletonAvatar,
          { backgroundColor: theme.colors.border, opacity },
        ]}
      />
      <View style={styles.interactionContent}>
        <Animated.View
          style={[
            styles.skeletonText,
            { backgroundColor: theme.colors.border, opacity, width: '60%', height: 16 },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonText,
            { backgroundColor: theme.colors.border, opacity, width: '80%', height: 14, marginTop: 6 },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonText,
            { backgroundColor: theme.colors.border, opacity, width: '40%', height: 12, marginTop: 6 },
          ]}
        />
      </View>
    </View>
  );
}

export function SkeletonDashboard({ theme }: SkeletonProps) {
  return (
    <View style={styles.container}>
      {/* Health Cards */}
      <View style={styles.section}>
        <View style={styles.healthGrid}>
          <SkeletonHealthCard theme={theme} />
          <SkeletonHealthCard theme={theme} />
          <SkeletonHealthCard theme={theme} />
          <SkeletonHealthCard theme={theme} />
        </View>
      </View>

      {/* Interaction Cards */}
      <View style={styles.section}>
        <SkeletonInteractionCard theme={theme} />
        <SkeletonInteractionCard theme={theme} />
        <SkeletonInteractionCard theme={theme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  healthGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  healthCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  skeletonCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skeletonText: {
    borderRadius: 4,
  },
  interactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  interactionContent: {
    flex: 1,
  },
});
