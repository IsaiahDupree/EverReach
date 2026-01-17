import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initializeSession, storeWaitlistSignup, trackFunnelEvent } from '@/lib/funnelTracking';
import { initMetaPixel, trackLead } from '@/lib/metaPixel';

type Step = 'pain' | 'network' | 'urgency' | 'email';

interface FormData {
  pain_point: string;
  network_size: string;
  urgency: string;
  email: string;
}

const PAIN_OPTIONS = [
  { id: 'forget_followup', label: "I forget to follow up with people", emoji: '😅' },
  { id: 'dont_know_who', label: "I don't know who to reach out to", emoji: '🤔' },
  { id: 'dont_know_what_to_say', label: "I don't know what to say", emoji: '💭' },
  { id: 'scattered_contacts', label: 'My contacts are scattered everywhere', emoji: '📱' },
  { id: 'just_curious', label: 'Just curious', emoji: '👀' },
];

const NETWORK_OPTIONS = [
  { id: '0-50', label: '0-50 contacts', emoji: '👤' },
  { id: '50-200', label: '50-200 contacts', emoji: '👥' },
  { id: '200-1000', label: '200-1,000 contacts', emoji: '🌐' },
  { id: '1000+', label: '1,000+ contacts', emoji: '🚀' },
];

const URGENCY_OPTIONS = [
  { id: 'this_week', label: 'This week', emoji: '⚡' },
  { id: 'this_month', label: 'This month', emoji: '📅' },
  { id: 'eventually', label: 'Eventually', emoji: '🌱' },
];

export default function WaitlistScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('pain');
  const [formData, setFormData] = useState<FormData>({
    pain_point: '',
    network_size: '',
    urgency: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initMetaPixel();
    initializeSession({ idea_id: 'everreach_waitlist', funnel_id: 'everreach_waitlist_v01' });
    trackFunnelEvent('WaitlistPageView');
  }, []);

  const handleOptionSelect = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    trackFunnelEvent(`WaitlistStep_${field}`, { value });
    
    // Auto-advance to next step
    setTimeout(() => {
      if (field === 'pain_point') setStep('network');
      else if (field === 'network_size') setStep('urgency');
      else if (field === 'urgency') setStep('email');
    }, 300);
  };

  const handleSubmit = async () => {
    if (!formData.email) {
      setError('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate event_id for deduplication
      const eventId = trackLead({
        content_name: 'waitlist_signup',
        value: 0,
      });

      const result = await storeWaitlistSignup({
        email: formData.email,
        pain_point: formData.pain_point,
        network_size: formData.network_size,
        urgency: formData.urgency,
        event_id: eventId || undefined,
      });

      if (result.success) {
        trackFunnelEvent('WaitlistSubmit', {
          is_high_intent: result.is_high_intent,
          intent_score: result.intent_score,
        });

        // Redirect to thank you page
        if (result.is_high_intent) {
          router.replace('/thank-you?qi=1');
        } else {
          router.replace('/thank-you');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Waitlist submit error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['pain', 'network', 'urgency', 'email'];
    const currentIndex = steps.indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, index) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              index <= currentIndex && styles.stepDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderPainStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your biggest challenge with staying in touch?</Text>
      <View style={styles.optionsContainer}>
        {PAIN_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionButton,
              formData.pain_point === option.id && styles.optionButtonSelected,
            ]}
            onPress={() => handleOptionSelect('pain_point', option.id)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.optionText,
              formData.pain_point === option.id && styles.optionTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderNetworkStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How many people are in your network?</Text>
      <View style={styles.optionsContainer}>
        {NETWORK_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionButton,
              formData.network_size === option.id && styles.optionButtonSelected,
            ]}
            onPress={() => handleOptionSelect('network_size', option.id)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.optionText,
              formData.network_size === option.id && styles.optionTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderUrgencyStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>When do you want to start improving your relationships?</Text>
      <View style={styles.optionsContainer}>
        {URGENCY_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionButton,
              formData.urgency === option.id && styles.optionButtonSelected,
            ]}
            onPress={() => handleOptionSelect('urgency', option.id)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.optionText,
              formData.urgency === option.id && styles.optionTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmailStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>You're almost in! 🎉</Text>
      <Text style={styles.stepSubtitle}>
        Enter your email to join the waitlist and get early access.
      </Text>
      
      <TextInput
        style={styles.emailInput}
        placeholder="your@email.com"
        placeholderTextColor="#999"
        value={formData.email}
        onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Get Early Access →</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.privacyText}>
        We'll never spam you. Unsubscribe anytime.
      </Text>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'pain':
        return renderPainStep();
      case 'network':
        return renderNetworkStep();
      case 'urgency':
        return renderUrgencyStep();
      case 'email':
        return renderEmailStep();
    }
  };

  const canGoBack = step !== 'pain';

  const handleBack = () => {
    const steps: Step[] = ['pain', 'network', 'urgency', 'email'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            {canGoBack && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.logo}>EverReach</Text>
          </View>

          {renderStepIndicator()}
          {renderCurrentStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  stepDotActive: {
    backgroundColor: '#6366f1',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
  },
  optionButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  optionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  emailInput: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
  },
  submitButton: {
    width: '100%',
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  privacyText: {
    color: '#666',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});
