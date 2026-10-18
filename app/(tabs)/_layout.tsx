import { Tabs } from "expo-router";
import { Sun, Cloud, BookOpen, MapPin, MessageCircle, User } from "lucide-react-native";
import React from "react";
import AuthGate from "@/components/AuthGate";

const SUNTRACE_COLORS = {
  primary: '#F59E0B',
  textSecondary: '#94A3B8',
  surface: '#1E293B',
  border: '#334155',
};

export default function SunTraceTabLayout() {
  return (
    <AuthGate requireAuth>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: SUNTRACE_COLORS.primary,
          tabBarInactiveTintColor: SUNTRACE_COLORS.textSecondary,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0F172A',
            borderTopWidth: 0.5,
            borderTopColor: SUNTRACE_COLORS.border,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="sun-home"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Sun size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="forecast"
          options={{
            title: "Forecast",
            tabBarIcon: ({ color }) => <Cloud size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="logbook"
          options={{
            title: "Logbook",
            tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sun-map"
          options={{
            title: "Map",
            tabBarIcon: ({ color }) => <MapPin size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="coach"
          options={{
            title: "Coach",
            tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <User size={22} color={color} />,
          }}
        />
        {/* Hide old EverReach tabs */}
        <Tabs.Screen name="home" options={{ href: null }} />
        <Tabs.Screen name="people" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>
    </AuthGate>
  );
}
