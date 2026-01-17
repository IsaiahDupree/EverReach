import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function LandingPage() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Never Let A Relationship Go Cold Again</Text>
        <Text style={styles.heroSubtitle}>
          AI-powered relationship intelligence that tells you exactly who to reach out to, what to say, and when to say it.
        </Text>
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.primaryButtonText}>Start Building Stronger Relationships</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.secondaryButtonText}>See How It Works</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Features</Text>
        
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🌡️</Text>
          <Text style={styles.featureTitle}>Warmth Score Intelligence</Text>
          <Text style={styles.featureDescription}>
            Never guess who to reach out to. Your relationships are alive — they warm up with interaction and cool down with neglect.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🤖</Text>
          <Text style={styles.featureTitle}>AI Message Composer</Text>
          <Text style={styles.featureDescription}>
            Say the right thing, every time. Our AI analyzes your entire relationship history and generates perfectly tailored messages.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📸</Text>
          <Text style={styles.featureTitle}>Screenshot Intelligence</Text>
          <Text style={styles.featureDescription}>
            Turn business cards into contacts instantly. Snap a photo and our GPT-4 Vision AI extracts every detail.
          </Text>
        </View>
      </View>

      {/* Pricing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simple, Transparent Pricing</Text>
        
        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>Professional</Text>
          <Text style={styles.pricingPrice}>$19/month</Text>
          <Text style={styles.pricingDescription}>Most Popular</Text>
          <View style={styles.pricingFeatures}>
            <Text style={styles.pricingFeature}>• Unlimited contacts</Text>
            <Text style={styles.pricingFeature}>• Full Warmth Score system</Text>
            <Text style={styles.pricingFeature}>• Unlimited AI message generation</Text>
            <Text style={styles.pricingFeature}>• Screenshot analysis (50/mo)</Text>
            <Text style={styles.pricingFeature}>• Voice note processing (100/mo)</Text>
          </View>
          <TouchableOpacity 
            style={styles.pricingButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.pricingButtonText}>Start 14-Day Free Trial</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Stop Letting Valuable Relationships Slip Away</Text>
        <Text style={styles.ctaDescription}>
          Join thousands of professionals who have transformed how they maintain relationships.
        </Text>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/auth')}
        >
          <Text style={styles.ctaButtonText}>Get Started Free</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  hero: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1F2937',
  },
  heroSubtitle: {
    fontSize: 20,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 40,
    lineHeight: 28,
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginVertical: 60,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 40,
    color: '#1F2937',
  },
  featureCard: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1F2937',
  },
  featureDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  pricingCard: {
    backgroundColor: '#F9FAFB',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
  },
  pricingTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1F2937',
  },
  pricingPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 8,
  },
  pricingDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  pricingFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  pricingFeature: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 24,
  },
  pricingButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  pricingButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  ctaSection: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 40,
    marginTop: 40,
  },
  ctaTitle: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1F2937',
  },
  ctaDescription: {
    fontSize: 18,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 28,
  },
  ctaButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});

