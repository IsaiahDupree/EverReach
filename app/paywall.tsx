import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { 
  Zap, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Bell, 
  Sparkles,
  Brain,
  Heart,
  Target,
  Shield,
  X
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Feature {
  id: string;
  icon: any;
  title: string;
  description: string;
  iconColor: string;
}

const features: Feature[] = [
  {
    id: 'voice-notes',
    icon: MessageCircle,
    title: 'Voice Notes',
    description: 'Capture context instantly with AI-powered voice memos',
    iconColor: '#10B981',
  },
  {
    id: 'warmth-tracking',
    icon: Heart,
    title: 'Warmth Score',
    description: 'Never let relationships go cold with intelligent tracking',
    iconColor: '#EF4444',
  },
  {
    id: 'ai-compose',
    icon: Brain,
    title: 'AI Message Composer',
    description: 'Craft perfect messages for every relationship context',
    iconColor: '#8B5CF6',
  },
  {
    id: 'smart-reminders',
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Get notified before relationships fade away',
    iconColor: '#F59E0B',
  },
  {
    id: 'relationship-insights',
    icon: TrendingUp,
    title: 'Relationship Insights',
    description: 'Understand patterns and strengthen your network',
    iconColor: '#3B82F6',
  },
  {
    id: 'goal-tracking',
    icon: Target,
    title: 'Goal-Based Outreach',
    description: 'Set and achieve relationship goals automatically',
    iconColor: '#06B6D4',
  },
  {
    id: 'unified-history',
    icon: Sparkles,
    title: 'Unified Message History',
    description: 'See all conversations across channels in one place',
    iconColor: '#EC4899',
  },
  {
    id: 'privacy-first',
    icon: Shield,
    title: 'Privacy First',
    description: 'Your relationships stay private and secure',
    iconColor: '#6366F1',
  },
];

export default function PaywallScreen() {
  const { upgradeToPaid, trialDaysRemaining } = useSubscription();
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<Video>(null);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await upgradeToPaid('stripe');
      router.back();
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Close Button */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleClose}
          testID="paywall-close-button"
        >
          <X size={24} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Zap size={48} color="#FBBF24" />
          </View>
          <Text style={styles.title}>EverReach+</Text>
          <Text style={styles.subtitle}>
            Transform the way you build relationships
          </Text>
          <Text style={styles.memberText}>
            Join thousands building stronger connections
          </Text>
        </View>

        {/* Video Showcase */}
        <View style={styles.videoSection} testID="paywall-video-container">
          <View style={styles.videoPlaceholder}>
            {/* Placeholder for actual video */}
            <View style={styles.videoPreview}>
              <Sparkles size={64} color="#8B5CF6" />
              <Text style={styles.videoLabel}>Product Demo</Text>
              <Text style={styles.videoSubtitle}>
                See how EverReach helps you never forget a connection
              </Text>
            </View>
            {/* 
            Uncomment when video is ready:
            <Video
              ref={videoRef}
              source={{ uri: 'https://your-video-url.mp4' }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
            */}
          </View>
        </View>

        {/* Transformation Message */}
        <View style={styles.transformSection}>
          <Text style={styles.transformTitle}>Never Forget. Stay Connected. Deepen Relationships.</Text>
          <Text style={styles.transformDescription}>
            EverReach turns your casual contacts into meaningful relationships with AI-powered warmth tracking, smart reminders, and effortless outreach.
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <View key={feature.id} style={styles.featureCard} testID={`feature-${feature.id}`}>
                <View style={[styles.featureIcon, { backgroundColor: `${feature.iconColor}15` }]}>
                  <Icon size={24} color={feature.iconColor} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Trial Info */}
        {trialDaysRemaining > 0 && (
          <View style={styles.trialBanner}>
            <Text style={styles.trialText}>
              🎉 {trialDaysRemaining} days left in your free trial
            </Text>
          </View>
        )}

        {/* Pricing */}
        <View style={styles.pricingSection}>
          <Text style={styles.priceLabel}>Starting at</Text>
          <Text style={styles.priceAmount}>$15/month</Text>
          <Text style={styles.priceDescription}>
            7-day free trial • Cancel anytime • No commitment
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
          onPress={handleContinue}
          disabled={loading}
          testID="paywall-cta-button"
        >
          <Text style={styles.ctaText}>
            {loading ? 'Processing...' : 'Start Free Trial'}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your relationships matter. Invest in them.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  memberText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  videoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  videoPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  videoSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  transformSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  transformTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  transformDescription: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  trialBanner: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FBBF2420',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBBF2440',
  },
  trialText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FBBF24',
    textAlign: 'center',
  },
  pricingSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  ctaButton: {
    marginHorizontal: 20,
    backgroundColor: '#FBBF24',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
