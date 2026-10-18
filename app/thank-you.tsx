import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { trackEvent } from '@/lib/metaPixel';
import { CheckCircle, Share2 } from 'lucide-react-native';

export default function ThankYouPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const capturedEmail = (params.email as string) || '';

  useEffect(() => {
    trackEvent('Lead', {
      content_name: 'Waitlist Signup Complete',
      lead_quality: 'standard',
    });
  }, []);

  const handleShare = async () => {
    try {
      trackEvent('Share', { content_name: 'Waitlist' });
      await Share.share({
        message: "I just signed up for early access to EverReach - an AI that helps you never forget to follow up with people. Check it out: https://www.everreach.app",
        url: 'https://www.everreach.app',
      });
    } catch (e) {
      console.log('Share cancelled');
    }
  };

  return (
    <LinearGradient colors={['#F9FAFB', '#EDE9FE']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <CheckCircle size={80} color="#10B981" />
          </View>
          
          <Text style={styles.title}>You're on the list! 🎉</Text>
          
          <Text style={styles.subtitle}>
            We'll send you an invite as soon as EverReach is ready for you.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What happens next?</Text>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Watch your inbox for your early access invite</Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Import your contacts (2 min setup)</Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Start building warmer relationships</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push(`/auth?isSignUp=true&email=${encodeURIComponent(capturedEmail)}&returnTo=/home`)}
            >
              <Text style={styles.primaryButtonText}>Continue on Web (Start Trial) →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={20} color="#7C3AED" />
              <Text style={styles.shareButtonText}>Share with a friend</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.landingButton}
              onPress={() => router.replace('/landing' as any)}
            >
              <Text style={styles.landingButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  iconContainer: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 24, maxWidth: 300 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EDE9FE', color: '#7C3AED', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 24, marginRight: 12 },
  stepText: { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 20 },
  actions: { width: '100%', maxWidth: 400 },
  primaryButton: { backgroundColor: '#7C3AED', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#7C3AED', borderRadius: 12, padding: 16, marginBottom: 12 },
  shareButtonText: { color: '#7C3AED', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  landingButton: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  landingButtonText: { color: '#6B7280', fontSize: 14 },
});
