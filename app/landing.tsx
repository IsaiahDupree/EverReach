import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initializeSession, trackFunnelEvent } from '@/lib/funnelTracking';
import { initMetaPixel, trackPageView } from '@/lib/metaPixel';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    emoji: '🔥',
    title: 'Warmth Scores',
    description: 'Know who needs attention before relationships go cold',
  },
  {
    emoji: '🤖',
    title: 'AI-Powered Suggestions',
    description: 'Get personalized outreach recommendations',
  },
  {
    emoji: '📱',
    title: 'Smart Reminders',
    description: 'Never miss an important follow-up again',
  },
  {
    emoji: '📊',
    title: 'Relationship Analytics',
    description: 'Understand your network at a glance',
  },
];

const TESTIMONIALS = [
  {
    quote: "Finally, a CRM that actually helps me stay in touch with people.",
    author: "Sarah K.",
    role: "Startup Founder",
  },
  {
    quote: "The warmth scores are genius. I know exactly who to reach out to.",
    author: "Michael R.",
    role: "Sales Director",
  },
];

export default function LandingScreen() {
  const router = useRouter();

  useEffect(() => {
    initMetaPixel();
    initializeSession({ idea_id: 'everreach_waitlist', funnel_id: 'everreach_waitlist_v01' });
    trackPageView();
    trackFunnelEvent('LandingPageView');
  }, []);

  const handleCTA = () => {
    trackFunnelEvent('LandingCTAClick');
    router.push('/waitlist');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>EverReach</Text>
          <TouchableOpacity onPress={() => router.push('/auth')}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✨ AI-Powered Personal CRM</Text>
          </View>
          
          <Text style={styles.heroTitle}>
            Never let a{'\n'}relationship{'\n'}go cold
          </Text>
          
          <Text style={styles.heroSubtitle}>
            EverReach uses AI to help you nurture your most important relationships. 
            Know who to reach out to, what to say, and when.
          </Text>

          <TouchableOpacity style={styles.ctaButton} onPress={handleCTA}>
            <Text style={styles.ctaButtonText}>Get Early Access →</Text>
          </TouchableOpacity>

          <Text style={styles.ctaSubtext}>
            Join 500+ professionals on the waitlist
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>How it works</Text>
          
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Social Proof Section */}
        <View style={styles.socialProofSection}>
          <Text style={styles.sectionTitle}>What people are saying</Text>
          
          <View style={styles.testimonialContainer}>
            {TESTIMONIALS.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <Text style={styles.testimonialQuote}>"{testimonial.quote}"</Text>
                <View style={styles.testimonialAuthor}>
                  <Text style={styles.testimonialName}>{testimonial.author}</Text>
                  <Text style={styles.testimonialRole}>{testimonial.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaSectionTitle}>Ready to transform your network?</Text>
          <Text style={styles.ctaSectionSubtitle}>
            Join the waitlist and be the first to know when we launch.
          </Text>
          
          <TouchableOpacity style={styles.ctaButton} onPress={handleCTA}>
            <Text style={styles.ctaButtonText}>Get Early Access →</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 EverReach. All rights reserved.</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  signInText: {
    color: '#999',
    fontSize: 16,
  },
  heroSection: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  badgeText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 56,
    marginBottom: 20,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  ctaButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 12,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  ctaSubtext: {
    color: '#666',
    fontSize: 14,
  },
  featuresSection: {
    padding: 24,
    paddingTop: 60,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  featureCard: {
    width: width > 600 ? '48%' : '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  featureEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 15,
    color: '#999',
    lineHeight: 22,
  },
  socialProofSection: {
    padding: 24,
    paddingTop: 60,
  },
  testimonialContainer: {
    gap: 16,
  },
  testimonialCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  testimonialQuote: {
    fontSize: 18,
    color: '#fff',
    fontStyle: 'italic',
    lineHeight: 28,
    marginBottom: 16,
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  testimonialRole: {
    fontSize: 14,
    color: '#666',
  },
  ctaSection: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: '#111',
    marginTop: 40,
  },
  ctaSectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSectionSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  footerLink: {
    color: '#999',
    fontSize: 14,
  },
});
