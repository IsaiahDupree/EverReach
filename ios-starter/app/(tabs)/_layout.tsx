/**
 * Tab Navigation Layout
 * Feature: IOS-NAV-002
 *
 * Bottom tab navigation component with Home, Search, and Settings tabs.
 *
 * Acceptance Criteria:
 * - Tabs render correctly
 * - Icons display properly
 * - Active state works (focused state changes icon color)
 *
 * Tab Structure:
 * - Home (index) - main list view
 * - Search - search functionality
 * - Settings - user settings and profile
 *
 * @module app/(tabs)/_layout
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/**
 * Icon names mapping for each tab
 * Uses Ionicons from @expo/vector-icons
 */
const TAB_ICONS = {
  index: {
    focused: 'home' as const,
    unfocused: 'home-outline' as const,
  },
  search: {
    focused: 'search' as const,
    unfocused: 'search-outline' as const,
  },
  settings: {
    focused: 'settings' as const,
    unfocused: 'settings-outline' as const,
  },
};

/**
 * Tab colors for different states
 */
const TAB_COLORS = {
  active: '#007AFF',   // iOS blue
  inactive: '#8E8E93', // iOS gray
};

/**
 * TabLayout Component
 *
 * Creates a bottom tab navigator with three main screens:
 * - Home/Index: Main list of items
 * - Search: Search functionality
 * - Settings: User settings and preferences
 *
 * Each tab has:
 * - A unique icon (filled when active, outline when inactive)
 * - Color changes based on focused state
 * - Descriptive title
 *
 * @example
 * ```tsx
 * // This layout is automatically used by Expo Router for the (tabs) group
 * // Individual screens are defined in:
 * // - app/(tabs)/index.tsx (Home)
 * // - app/(tabs)/search.tsx (Search)
 * // - app/(tabs)/settings.tsx (Settings)
 * ```
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_COLORS.active,
        tabBarInactiveTintColor: TAB_COLORS.inactive,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? TAB_ICONS.index.focused : TAB_ICONS.index.unfocused}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? TAB_ICONS.search.focused : TAB_ICONS.search.unfocused}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? TAB_ICONS.settings.focused : TAB_ICONS.settings.unfocused}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
