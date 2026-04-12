/**
 * SunTrace - Tab Entry Point
 *
 * Redirects to /home if profile exists, or /onboarding if new user.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/services/api';

export default function TabIndex() {
  const router = useRouter();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    retry: 1,
  });

  useEffect(() => {
    if (isLoading) return;

    if (isError || profile === null) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [profile, isLoading, isError, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#F97316" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});
