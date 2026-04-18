import { Tabs } from "expo-router";
import { Users, Home, Settings, MessageCircle } from "lucide-react-native";
import React from "react";
import { useAppSettings } from "@/providers/AppSettingsProvider";
import { ActivityIndicator, View } from "react-native";
import AuthGate from "@/components/AuthGate";
import { PaywallGate } from "@/components/PaywallGate";
// Trial banner removed - using PaywallGate on individual features instead

// Default theme fallback
const defaultTheme = {
  colors: {
    primary: '#7C3AED',
    surface: '#FFFFFF',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  }
};

export default function TabLayout() {
  const appSettings = useAppSettings();
  
  // Use theme from settings or fallback to default
  const theme = appSettings?.theme || defaultTheme;
  
  return (
    <AuthGate requireAuth>
      <PaywallGate>
        <Tabs
            screenOptions={{
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.textSecondary,
              headerShown: false,
              tabBarStyle: {
                backgroundColor: theme.colors.surface,
                borderTopWidth: 0.5,
                borderTopColor: theme.colors.border,
              },
            }}
          >
            <Tabs.Screen
              name="home"
              options={{
                title: "Dashboard",
                tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="people"
              options={{
                title: "People",
                tabBarIcon: ({ color }) => <Users size={24} color={color} />,
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="chat"
              options={{
                title: "CRM Assistant",
                tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} />,
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: "Settings",
                tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
                headerShown: false,
              }}
            />
          </Tabs>
      </PaywallGate>
    </AuthGate>
  );
}