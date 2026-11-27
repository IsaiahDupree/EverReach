import { Stack } from 'expo-router';
import { useAppSettings } from '@/providers/AppSettingsProvider';

/**
 * Admin Section Layout
 * All admin/management screens
 */
export default function AdminLayout() {
  const { theme } = useAppSettings();
  const colors = theme.colors;

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="billing"
        options={{
          title: 'Billing & Subscription',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="organization"
        options={{
          title: 'Organization Settings',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="team"
        options={{
          title: 'Team Management',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="data"
        options={{
          title: 'Data Management',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="features"
        options={{
          title: 'Feature Access',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'App Settings',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="debug"
        options={{
          title: 'Debug & Support',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
