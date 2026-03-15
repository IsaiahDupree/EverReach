/**
 * APP-KIT: Root Layout
 * 
 * This is the main entry point for your app.
 * ✅ KEEP: Navigation structure, auth provider, theme provider
 * 🔧 CUSTOMIZE: App name, theme colors, fonts
 */
import { Stack } from 'expo-router';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { DevModeOverlay } from '@/components/dev/DevModeOverlay';
import { APP_CONFIG } from '@/constants/config';

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          {/* APP-KIT: Dev mode overlay shows customization hints */}
          {APP_CONFIG.DEV_MODE && <DevModeOverlay />}
          
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
