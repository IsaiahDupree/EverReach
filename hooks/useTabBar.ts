import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';

/**
 * useTabBar - Utility hook to show/hide the bottom tab bar on specific screens
 * 
 * Usage in any screen:
 * ```tsx
 * import { useTabBar } from '@/hooks/useTabBar';
 * 
 * export default function MyScreen() {
 *   useTabBar({ visible: false }); // Hide tab bar on this screen
 *   
 *   return <View>...</View>;
 * }
 * ```
 */
export function useTabBar({ visible = true }: { visible?: boolean } = {}) {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: visible
        ? undefined // Show tab bar (use default style)
        : { display: 'none' }, // Hide tab bar
    });

    // Cleanup: restore tab bar when leaving screen
    return () => {
      navigation.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation, visible]);
}

/**
 * Helper to hide tab bar
 */
export function useHideTabBar() {
  useTabBar({ visible: false });
}

/**
 * Helper to show tab bar
 */
export function useShowTabBar() {
  useTabBar({ visible: true });
}
