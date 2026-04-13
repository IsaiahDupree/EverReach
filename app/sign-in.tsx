import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProviderV2';

/**
 * Sign-in route that redirects to /auth
 * This provides a friendly URL for users: /sign-in
 */
export default function SignInRedirect() {
  const router = useRouter();
  const { session, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      // Already signed in (or local-only mode), go to home
      router.replace('/(tabs)/home');
    } else {
      // Not signed in, go to auth page
      router.replace('/auth');
    }
  }, [isAuthenticated, loading]);

  // Show loading spinner while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
