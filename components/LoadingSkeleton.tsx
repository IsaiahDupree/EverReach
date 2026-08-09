import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  marginBottom?: number;
  backgroundColor?: string;
  shimmerColor?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  marginBottom = 12,
  backgroundColor = '#E8E8E8',
  shimmerColor = '#F2F2F2',
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const animatedStyle = {
    backgroundColor: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [backgroundColor, shimmerColor],
    }),
  };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        animatedStyle,
        { marginBottom },
      ]}
    />
  );
};

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.item}>
          <View style={styles.row}>
            <Skeleton width={48} height={48} borderRadius={24} marginBottom={0} />
            <View style={styles.content}>
              <Skeleton width="60%" height={16} marginBottom={8} />
              <Skeleton width="80%" height={12} marginBottom={0} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton width="100%" height={120} borderRadius={12} marginBottom={12} />
          <Skeleton width="70%" height={16} marginBottom={8} />
          <Skeleton width="50%" height={12} marginBottom={0} />
        </View>
      ))}
    </View>
  );
}

export default Skeleton;

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E8E8E8',
  },
  container: {
    padding: 16,
    gap: 12,
  },
  item: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  card: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
});
