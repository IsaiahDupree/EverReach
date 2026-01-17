import { useEffect } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; type?: string; error?: string; error_description?: string }>();

  // Shared auth processing function
  const processAuth = async (code: string | null, type: string | null, error: string | null, errorDescription: string | null) => {
    try {
      if (error) {
        console.error('❌ Auth error:', error, errorDescription);
        router.replace('/');
        return;
      }
      
      // Handle password recovery - redirect to reset-password page with code
      if (type === 'recovery') {
        console.log('🔐 Password recovery detected, redirecting to reset password page');
        router.replace(`/auth/reset-password?code=${code}` as any);
        return;
      }
      
      // PKCE flow: exchange the authorization code for a session
      if (code) {
        console.log('🔐 Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('❌ Code exchange error:', exchangeError);
          router.replace('/');
          return;
        } else {
          console.log('✅ Successfully authenticated! Session expires:', 
            data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown'
          );
          // Small delay to let auth state propagate, then navigate to home
          await new Promise(resolve => setTimeout(resolve, 300));
          router.replace('/(tabs)/home');
          return;
        }
      }
      
      // Fallback
      router.replace('/');
    } catch (error) {
      console.error('❌ Auth processing error:', error);
      router.replace('/');
    }
  };

  useEffect(() => {
    // Handle URL parameters from Expo Router (web navigation)
    const handleUrlParams = async () => {
      if (params.code || params.error) {
        console.log('🔗 Auth callback params:', { code: params.code?.substring(0, 20), type: params.type, error: params.error });
        await processAuth(params.code as string, params.type as string, params.error as string, params.error_description as string);
      }
    };
    
    handleUrlParams();
  }, [params]);

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        console.log('🔗 Auth callback URL:', url);
        const urlObj = new URL(url);
        
        // Check if this is a password recovery link
        const type = urlObj.searchParams.get('type');
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        const errorDescription = urlObj.searchParams.get('error_description');
        
        // Use shared processAuth function
        await processAuth(code, type, error, errorDescription);
      } catch (error) {
        console.error('❌ Auth callback error:', error);
      }
      
      // Fallback: Navigate back to the main app
      router.replace('/');
    };

    // Handle the initial URL if the app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Listen for incoming deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription?.remove();
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#7C3AED" style={{ marginBottom: 16 }} />
      <Text style={{ fontSize: 16, color: '#6B7280' }}>Completing authentication...</Text>
    </SafeAreaView>
  );
}