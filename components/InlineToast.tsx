import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View, TouchableOpacity } from 'react-native';

export type InlineToastProps = {
  type?: 'info' | 'success' | 'error';
  message: string;
  visible: boolean;
  onClose?: () => void;
  durationMs?: number;
};

export default function InlineToast({
  type = 'info',
  message,
  visible,
  onClose,
  durationMs = 4000,
}: InlineToastProps) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -60,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => finished && onClose?.());
      }, durationMs);

      return () => clearTimeout(t);
    }
  }, [visible, durationMs, onClose, opacity, translateY]);

  if (!visible) return null;

  const bg = type === 'error' ? '#FEE2E2' : type === 'success' ? '#DCFCE7' : '#E5E7EB';
  const border = type === 'error' ? '#FCA5A5' : type === 'success' ? '#86EFAC' : '#D1D5DB';
  const color = type === 'error' ? '#B91C1C' : type === 'success' ? '#065F46' : '#374151';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 24,
        left: 16,
        right: 16,
        transform: [{ translateY }],
        opacity,
        zIndex: 1000,
      }}
    >
      <View
        style={{
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color, fontSize: 14, flex: 1 }}>{message}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={{ marginLeft: 8, padding: 6 }}>
            <Text style={{ color, fontWeight: '700' }}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
