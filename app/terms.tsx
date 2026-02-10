import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Legacy /terms route — redirects to /terms-of-service (canonical).
 * The updated Terms of Service screen includes Meta/ATT disclosure.
 * Web traffic is handled by a Vercel 301 redirect in vercel.json.
 */
export default function TermsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/terms-of-service');
  }, []);

  return <View />;
}
