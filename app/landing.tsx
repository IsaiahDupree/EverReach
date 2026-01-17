import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { trackPageView, trackEvent } from '@/lib/metaPixel';

// Logo assets
const LogoNoBg = require('@/assets/branding/logo-no-bg.png');
const LogoFinal = require('@/assets/branding/logo-final-1024.png');

// Stripe Payment Links - Replace with your actual Stripe payment links
const STRIPE_LINKS = {
  monthly: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_LINK || 'https://buy.stripe.com/test_xxx', // $15/month
  yearly: process.env.EXPO_PUBLIC_STRIPE_YEARLY_LINK || 'https://buy.stripe.com/test_yyy',   // $150/year (save 17%)
};

export default function LandingPage() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // Track page view on mount
  useEffect(() => {
    trackPageView('/landing');
    trackEvent('ViewContent', {
      content_name: 'Landing Page',
      content_category: 'Marketing',
    });
  }, []);

  // Scroll to How It Works section
  const scrollToHowItWorks = () => {
    // On web, use smooth scroll
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const element = document.getElementById('how-it-works');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleStripeCheckout = async (plan: 'monthly' | 'yearly') => {
    // Track the checkout event
    trackEvent('StartTrial', {
      content_name: plan === 'monthly' ? 'Monthly Plan' : 'Yearly Plan',
      value: plan === 'monthly' ? 15 : 150,
      currency: 'USD',
    });
    
    // Redirect to auth page - subscription handled in-app after sign up
    const authUrl = 'https://www.everreach.app/auth';
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      await Linking.openURL(authUrl);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={LogoNoBg} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.logoText}>EverReach</Text>
        </View>
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => {
            // Use window.location for full page navigation to avoid race condition with _layout.tsx
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.href = '/auth';
            } else {
              router.push('/auth');
            }
          }}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <Image source={LogoFinal} style={styles.heroLogo} resizeMode="contain" />
        <Text style={styles.heroTitle}>
          Never Let A Relationship{'\n'}Go Cold Again
        </Text>
        <Text style={styles.heroSubtitle}>
          EverReach tells you who to reach out to, writes the message, and reminds you when it's time.
        </Text>
        <Text style={styles.heroOutcome}>
          Pick one person → get a message → follow up in under 2 minutes.
        </Text>
        <View style={styles.heroButtons}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.location.href = '/auth?isSignUp=true';
              } else {
                router.push('/auth?isSignUp=true');
              }
            }}
          >
            <Text style={styles.primaryButtonText}>Start Free Trial (Web) →</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={scrollToHowItWorks}
          >
            <Text style={styles.secondaryButtonText}>See How It Works</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.heroMicrocopy}>No credit card required • Web is live • Mobile rolling out next</Text>
        <TouchableOpacity 
          style={styles.waitlistLink}
          onPress={() => router.push('/waitlist')}
        >
          <Text style={styles.waitlistLinkText}>Prefer mobile? Get priority invite →</Text>
        </TouchableOpacity>
      </View>

      {/* Problem Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>THE PROBLEM</Text>
        <Text style={styles.sectionTitle}>
          The Hidden Cost of Forgotten Connections
        </Text>
        <Text style={styles.sectionText}>
          You have hundreds of valuable relationships, but life gets busy. Important contacts 
          slip through the cracks. Opportunities fade. Networks go cold.
        </Text>
        <View style={styles.problemList}>
          <View style={styles.problemItem}>
            <Text style={styles.problemIcon}>💸</Text>
            <Text style={styles.problemText}>Lost business opportunities worth thousands</Text>
          </View>
          <View style={styles.problemItem}>
            <Text style={styles.problemIcon}>🕸️</Text>
            <Text style={styles.problemText}>Weakened professional networks</Text>
          </View>
          <View style={styles.problemItem}>
            <Text style={styles.problemIcon}>😰</Text>
            <Text style={styles.problemText}>Constant anxiety about who you're forgetting</Text>
          </View>
        </View>
      </View>

      {/* How It Works Section */}
      <View style={styles.howItWorksSection} nativeID="how-it-works">
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <Text style={styles.sectionTitle}>
          Three Simple Steps to Better Relationships
        </Text>
        
        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Add Your First Person</Text>
            <Text style={styles.stepDescription}>
              Start with one contact — import more later if you want. Add from Google, your phone, 
              or snap a business card. Our AI categorizes and enriches each contact automatically.
            </Text>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Let AI Monitor Your Relationships</Text>
            <Text style={styles.stepDescription}>
              Set it and forget it. EverReach tracks every interaction automatically. As time 
              passes, our Warmth Score shows exactly who needs your attention.
            </Text>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>Reach Out With Confidence</Text>
            <Text style={styles.stepDescription}>
              AI-powered outreach at your fingertips. Tap "Compose" and watch our AI generate 
              the perfect message based on your relationship history. Edit, approve, send.
            </Text>
          </View>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionLabel}>THE SOLUTION</Text>
        <Text style={styles.sectionTitle}>
          Meet Your AI Relationship Assistant
        </Text>
        
        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🌡️</Text>
            <Text style={styles.featureTitle}>Warmth Score Intelligence</Text>
            <Text style={styles.featureDescription}>
              Never guess who to reach out to. Your relationships are alive — they warm up 
              with interaction and cool down with neglect. Our AI tracks it all.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🤖</Text>
            <Text style={styles.featureTitle}>AI Message Composer</Text>
            <Text style={styles.featureDescription}>
              Say the right thing, every time. Our AI analyzes your entire relationship 
              history and generates perfectly tailored messages for any occasion.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📸</Text>
            <Text style={styles.featureTitle}>Screenshot Intelligence</Text>
            <Text style={styles.featureDescription}>
              Turn business cards into contacts instantly. Snap a photo and our GPT-4 
              Vision AI extracts every detail automatically.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🎤</Text>
            <Text style={styles.featureTitle}>Voice Notes</Text>
            <Text style={styles.featureDescription}>
              Capture thoughts on the go. Record voice notes after meetings and our AI 
              transcribes and organizes them automatically.
            </Text>
          </View>
        </View>
      </View>

      {/* Pricing Section */}
      <View style={styles.pricingSection}>
        <Text style={styles.sectionLabel}>PRICING</Text>
        <Text style={styles.sectionTitle}>Simple, Transparent Pricing</Text>
        <Text style={styles.pricingSubtitle}>
          Start free. Upgrade when you're ready.
        </Text>

        <View style={styles.pricingGrid}>
          {/* Monthly Plan - Most Popular */}
          <View style={[styles.pricingCard, styles.pricingCardFeatured]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
            </View>
            <Text style={[styles.pricingName, styles.pricingNameFeatured]}>Monthly</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.pricingAmount, styles.pricingAmountFeatured]}>$15</Text>
              <Text style={[styles.pricingPeriod, styles.pricingPeriodFeatured]}>/month</Text>
            </View>
            <View style={styles.pricingFeatures}>
              <Text style={[styles.pricingFeature, styles.pricingFeatureFeatured]}>✓ Unlimited contacts</Text>
              <Text style={[styles.pricingFeature, styles.pricingFeatureFeatured]}>✓ Full Warmth Score system</Text>
              <Text style={[styles.pricingFeature, styles.pricingFeatureFeatured]}>✓ AI message generation</Text>
              <Text style={[styles.pricingFeature, styles.pricingFeatureFeatured]}>✓ Screenshot intelligence</Text>
              <Text style={[styles.pricingFeature, styles.pricingFeatureFeatured]}>✓ Voice notes</Text>
            </View>
            <TouchableOpacity 
              style={[styles.pricingButton, styles.pricingButtonFeatured]}
              onPress={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  window.location.href = '/auth?isSignUp=true&plan=monthly';
                } else {
                  router.push('/auth?isSignUp=true&plan=monthly');
                }
              }}
            >
              <Text style={[styles.pricingButtonText, styles.pricingButtonTextFeatured]}>Start My Journey</Text>
            </TouchableOpacity>
          </View>

          {/* Yearly Plan - Best Value */}
          <View style={styles.pricingCard}>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE 17%</Text>
            </View>
            <Text style={styles.pricingName}>Yearly</Text>
            <View style={styles.priceRow}>
              <Text style={styles.pricingAmount}>$150</Text>
              <Text style={styles.pricingPeriod}>/year</Text>
            </View>
            <Text style={styles.yearlySavings}>That's just $12.50/month!</Text>
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ Everything in Monthly</Text>
              <Text style={styles.pricingFeature}>✓ Priority support</Text>
              <Text style={styles.pricingFeature}>✓ Early access to new features</Text>
              <Text style={styles.pricingFeature}>✓ Best value</Text>
            </View>
            <TouchableOpacity 
              style={styles.pricingButton}
              onPress={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  window.location.href = '/auth?isSignUp=true&plan=yearly';
                } else {
                  router.push('/auth?isSignUp=true&plan=yearly');
                }
              }}
            >
              <Text style={styles.pricingButtonText}>
                Subscribe Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>
          Stop Letting Valuable Relationships Slip Away
        </Text>
        <Text style={styles.ctaDescription}>
          Start with one person today — EverReach handles the rest.
        </Text>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.href = '/auth?isSignUp=true';
            } else {
              router.push('/auth?isSignUp=true');
            }
          }}
        >
          <Text style={styles.ctaButtonText}>Start Free Trial (Web) →</Text>
        </TouchableOpacity>
        <Text style={styles.ctaNote}>
          14-day free trial • Cancel anytime • No credit card required
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLogoContainer}>
          <Image source={LogoNoBg} style={styles.footerLogoImage} resizeMode="contain" />
          <Text style={styles.footerLogoText}>EverReach</Text>
        </View>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:support@everreach.app')}>
            <Text style={styles.footerLink}>Contact</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerCopyright}>
          © 2025 EverReach. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 40,
    height: 40,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signInButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Hero
  hero: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
  },
  heroLogo: {
    width: 120,
    height: 120,
    marginBottom: 32,
    borderRadius: 24,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 56,
    marginBottom: 24,
  },
  heroSubtitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 30,
    maxWidth: 600,
    marginBottom: 40,
  },
  heroButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  heroOutcome: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  heroMicrocopy: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  waitlistLink: {
    marginBottom: 12,
  },
  waitlistLinkText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // Sections
  section: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#111118',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 2,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 600,
    marginBottom: 40,
  },
  // Problem List
  problemList: {
    gap: 16,
  },
  problemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 350,
  },
  problemIcon: {
    fontSize: 24,
  },
  problemText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  // How It Works
  howItWorksSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 48,
    maxWidth: 1200,
  },
  stepCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 20,
    padding: 32,
    width: 320,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    alignItems: 'center',
  },
  stepNumber: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepNumberText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepConnector: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(124, 58, 237, 0.5)',
  },
  // Features
  featuresSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#111118',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 40,
    maxWidth: 1000,
  },
  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 32,
    width: 280,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 24,
  },
  // Pricing
  pricingSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#111118',
  },
  pricingSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 48,
  },
  pricingCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 32,
    width: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pricingCardFeatured: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
    position: 'relative',
  },
  saveBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pricingName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  pricingNameFeatured: {
    color: 'rgba(255,255,255,0.9)',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  pricingAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pricingAmountFeatured: {
    color: '#FFFFFF',
  },
  pricingPeriod: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 4,
  },
  pricingPeriodFeatured: {
    color: 'rgba(255,255,255,0.8)',
  },
  yearlySavings: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
  },
  pricingFeatures: {
    marginBottom: 24,
    gap: 12,
  },
  pricingFeature: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  pricingFeatureFeatured: {
    color: 'rgba(255,255,255,0.95)',
  },
  pricingButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pricingButtonFeatured: {
    backgroundColor: '#FFFFFF',
  },
  pricingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pricingButtonTextFeatured: {
    color: '#7C3AED',
  },
  // CTA
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 100,
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 600,
  },
  ctaDescription: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 500,
  },
  ctaButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 14,
    marginBottom: 20,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  ctaNote: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0A0A0F',
  },
  footerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  footerLogoImage: {
    width: 32,
    height: 32,
  },
  footerLogoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 20,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  footerCopyright: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
});
