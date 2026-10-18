import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trackFunnelEvent } from '@/lib/funnelTracking';
import { trackCompleteRegistration, trackLead, trackViewContent } from '@/lib/metaPixel';

export default function ThankYouScreen() {
  const router = useRouter();
  const { qi } = useLocalSearchParams<{ qi?: string }>();
  const isHighIntent = qi === '1';
  const [hasTracked, setHasTracked] = useState(false);

  useEffect(() => {
    if (hasTracked) return;
    
    // Track CompleteRegistration event
    const eventId = trackCompleteRegistration({
      content_name: 'waitlist_complete',
      status: 'registered',
    });

    trackFunnelEvent('CompleteRegistration', { event_id: eventId });

    // If high intent, also fire Lead event with value
    if (isHighIntent) {
      const leadEventId = trackLead({
        content_name: 'high_intent_lead',
        value: 10, // Assign value to high-intent leads
      });
      trackFunnelEvent('HighIntentLead', { event_id: leadEventId, value: 10 });
    }

    setHasTracked(true);
  }, [isHighIntent, hasTracked]);

  const handleGetPlaybook = () => {
    const eventId = trackViewContent({
      content_name: 'warmth_score_playbook',
      content_category: 'resource',
    });
    trackFunnelEvent('ViewContent', { 
      content_name: 'warmth_score_playbook',
      event_id: eventId,
    });
    
    // Open playbook URL or show modal
    Linking.openURL('https://www.everreach.app/playbook');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: "I just joined the EverReach waitlist! It's an AI-powered personal CRM that helps you stay in touch with your network. Join me: https://www.everreach.app/waitlist",
        url: 'https://www.everreach.app/waitlist',
      });
      trackFunnelEvent('ShareWaitlist');
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎉</Text>
        </View>

        <Text style={styles.title}>You're on the list!</Text>
        
        <Text style={styles.subtitle}>
          {isHighIntent
            ? "You're a priority! We'll reach out soon with early access."
            : "We'll let you know when EverReach is ready for you."}
        </Text>

        {isHighIntent && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>⚡ Priority Access</Text>
          </View>
        )}

        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>While you wait...</Text>

          <TouchableOpacity style={styles.playbookButton} onPress={handleGetPlaybook}>
            <Text style={styles.playbookButtonEmoji}>📘</Text>
            <View style={styles.playbookButtonContent}>
              <Text style={styles.playbookButtonTitle}>Get the Warmth Score Playbook</Text>
              <Text style={styles.playbookButtonSubtitle}>
                Learn how to nurture your most important relationships
              </Text>
            </View>
            <Text style={styles.playbookButtonArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>📤 Share with friends</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.socialProof}>
          <Text style={styles.socialProofText}>
            Join 500+ professionals already on the waitlist
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.backButtonText}>← Back to home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  priorityBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
    marginBottom: 32,
  },
  priorityText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  nextStepsContainer: {
    width: '100%',
    marginTop: 16,
  },
  nextStepsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  playbookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  playbookButtonEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  playbookButtonContent: {
    flex: 1,
  },
  playbookButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  playbookButtonSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  playbookButtonArrow: {
    fontSize: 20,
    color: '#666',
  },
  shareButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  socialProof: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#222',
    width: '100%',
    alignItems: 'center',
  },
  socialProofText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    padding: 12,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
