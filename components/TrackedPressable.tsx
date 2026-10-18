// components/TrackedPressable.tsx
// Drop-in Pressable that emits consistent analytics events

import React, { useEffect } from 'react';
import { Pressable, PressableProps } from 'react-native';
import { usePathname } from 'expo-router';
import Analytics from '@/lib/analytics';

export type TrackedPressableProps = PressableProps & {
  idHint: string;                 // REQUIRED stable id (e.g., "cta_start_trial")
  label?: string;                 // accessibility + analytics
  event?: string;                 // default: "ui_press"
  eventProps?: Record<string, any>;
};

export function TrackedPressable({
  idHint,
  label,
  event = 'ui_press',
  eventProps,
  onPress,
  ...rest
}: TrackedPressableProps) {
  const route = usePathname();

  useEffect(() => {
    if (!idHint) {
      const msg = 'TrackedPressable requires idHint for coverage.';
      if (__DEV__) console.warn(msg);
    }
  }, [idHint]);

  const handlePress = (e: any) => {
    Analytics.track(event, { element_id: idHint, label, route, ...eventProps });
    onPress?.(e);
  };

  return <Pressable accessibilityLabel={label} onPress={handlePress} {...rest} />;
}
