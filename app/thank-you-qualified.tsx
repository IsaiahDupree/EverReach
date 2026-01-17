import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { trackEvent } from '@/lib/metaPixel';
import { Star, Share2, Sparkles } from 'lucide-react-native';

export default function ThankYouQualifiedPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const capturedEmail = (params.email as string) || '';

  useEffect(() => {
    trackEvent('LeadQualified', {
      content_name: 'Waitlist Signup - High Intent',
      lead_quality: 'high',
    });
  }, []);

  const handleShare = async () => {
    try {
      trackEvent('Share', { content_name: 'Waitlist - High Intent' });
      await Share.share({
        message: "I just got priority access to EverReach - an AI that helps you never forget to follow up with people. Check it out: https://www.everreach.app",
        url: 'https://www.everreach.app',
      });
    } catch (e) {
      console.log('Share cancelled');
    }
  };

  return (
    <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.starBadge}>
              <Star size={40} color="#FBBF24" fill="#FBBF24" />
            </View>
            <Sparkles size={24} color="#FBBF24" style={styles.sparkle1} />
            <Sparkles size={16} color="#FBBF24" style={styles.sparkle2} />
          </View>
          
          <Text style={styles.badge}>🏆 PRIORITY ACCESS</Text>
          
          <Text style={styles.title}>You're at the front of the line!</Text>
          
          <Text style={styles.subtitle}>
            Based on your answers, you're exactly who EverReach was built for. 
            You'll be among the first to get access.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Priority Perks</Text>
            <View style={styles.perkItem}>
              <Text style={styles.perkIcon}>🚀</Text>
              <Text style={styles.perkText}>First access when we launch</Text>
            </View>
            <View style={styles.perkItem}>
              <Text style={styles.perkIcon}>📘</Text>
              <Text style={styles.perkText}>Free Warmth Score Playbook (coming to your inbox)</Text>
            </View>
            <View style={styles.perkItem}>
              <Text style={styles.perkIcon}>💬</Text>
              <Text style={styles.perkText}>Direct line to our founding team</Text>
            </View>
            <View style={styles.perkItem}>
              <Text style={styles.perkIcon}>🎁</Text>
              <Text style={styles.perkText}>Extended trial when you join</Text>
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
              <Text style={styles.shareButtonText}>Share & help a friend</Text>
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
  iconContainer: { position: 'relative', marginBottom: 24 },
  starBadge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
  sparkle1: { position: 'absolute', top: -8, right: -8 },
  sparkle2: { position: 'absolute', bottom: 0, left: -12 },
  badge: { fontSize: 14, fontWeight: '700', color: '#FBBF24', letterSpacing: 1, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', marginBottom: 32, lineHeight: 24, maxWidth: 320 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, marginBottom: 32 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  perkItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  perkIcon: { fontSize: 20, marginRight: 12 },
  perkText: { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 20 },
  actions: { width: '100%', maxWidth: 400 },
  primaryButton: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  primaryButtonText: { color: '#7C3AED', fontSize: 16, fontWeight: '600' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 },
  shareButtonText: { color: '#7C3AED', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  landingButton: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  landingButtonText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 },
});
