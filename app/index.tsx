import { useEffect } from 'react';
import { useRouter, useLocalSearchParams, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for the root layout to be mounted
    if (!rootNavigationState) {
      console.log('[Index] Waiting for rootNavigationState...');
      return;
    }

    console.log('[Index] rootNavigationState ready, navigating...');

    const timeout = setTimeout(() => {
      // Check if there's a code parameter (from Supabase email links)
      if (params.code) {
        const type = params.type as string;
        console.log('[Index] Auth code detected, type:', type);

        // Password reset uses type=recovery
        if (type === 'recovery') {
          console.log('[Index] Password reset code, redirecting to reset-password...');
          router.replace(`/auth/reset-password?code=${params.code}` as any);
          return;
        }

        // Email confirmation uses type=signup or type=email or type=invite
        if (type === 'signup' || type === 'email' || type === 'invite') {
          console.log('[Index] Email confirmation code, redirecting to callback...');
          router.replace(`/auth/callback?code=${params.code}&type=${type}` as any);
          return;
        }

        // Unknown type - try callback handler
        console.log('[Index] Unknown type, redirecting to callback...');
        router.replace(`/auth/callback?code=${params.code}` as any);
        return;
      }

      // Check if there's an error from OAuth
      if (params.error) {
        console.log('[Index] Auth error detected:', params.error);
        router.replace('/auth' as any);
        return;
      }

      // Default: redirect to home
      console.log('[Index] No params, redirecting to /home');
      router.replace('/home' as any);
    }, 100); // Small delay to ensure navigation is ready

    return () => clearTimeout(timeout);
  }, [params, rootNavigationState]);

  // Show loading while redirecting
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}