/**
 * Enhanced Bottom Tab Bar with Active State Indicators
 * 
 * Features:
 * - Active tab icon lights up (brighter color)
 * - Active tab icon scales up (1.2x)
 * - Smooth animations
 * - Badge support for notifications
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  Home,
  Users,
  MessageCircle,
  Settings,
  Sparkles,
} from 'lucide-react-native';

interface TabItem {
  id: string;
  label: string;
  icon: any;
  route: string;
  badge?: number;
}

const tabs: TabItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    route: '/',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Users,
    route: '/contacts',
  },
  {
    id: 'compose',
    label: 'Compose',
    icon: Sparkles,
    route: '/goal-picker',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageCircle,
    route: '/messages',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    route: '/settings',
  },
];

interface BottomTabBarProps {
  activeColor?: string;
  inactiveColor?: string;
  backgroundColor?: string;
}

export default function BottomTabBar({
  activeColor = '#3B82F6',
  inactiveColor = '#9CA3AF',
  backgroundColor = '#FFFFFF',
}: BottomTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine active tab
  const getActiveTab = () => {
    for (const tab of tabs) {
      if (pathname === tab.route || pathname.startsWith(tab.route + '/')) {
        return tab.id;
      }
    }
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tab: TabItem) => {
    router.push(tab.route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={isActive}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            onPress={() => handleTabPress(tab)}
          />
        );
      })}
    </View>
  );
}

interface TabButtonProps {
  tab: TabItem;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}

function TabButton({
  tab,
  isActive,
  activeColor,
  inactiveColor,
  onPress,
}: TabButtonProps) {
  const scaleAnim = React.useRef(new Animated.Value(isActive ? 1.2 : 1)).current;
  const opacityAnim = React.useRef(new Animated.Value(isActive ? 1 : 0.6)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.2 : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const Icon = tab.icon;
  const color = isActive ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`tab-${tab.id}`}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Icon size={24} color={color} />
        {tab.badge && tab.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </Text>
          </View>
        )}
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          {
            color,
            opacity: opacityAnim,
            fontWeight: isActive ? '600' : '400',
          },
        ]}
      >
        {tab.label}
      </Animated.Text>
      {isActive && <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -12 }],
    width: 24,
    height: 3,
    borderRadius: 2,
  },
});
