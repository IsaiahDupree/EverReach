import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { trackEvent } from '@/lib/metaPixel';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ever-reach-be.vercel.app';

type Step = 'pain' | 'network' | 'urgency' | 'email';

interface FormData {
  pain_point: string;
  network_size: string;
  urgency: string;
  email: string;
}

const PAIN_OPTIONS = [
  { id: 'forget_followup', label: 'I forget to follow up with people', icon: '🤦' },
  { id: 'who_to_contact', label: "I don't know who to reach out to", icon: '🤔' },
  { id: 'what_to_say', label: "I don't know what to say", icon: '💬' },
  { id: 'scattered_contacts', label: 'My contacts are scattered everywhere', icon: '📱' },
  { id: 'just_curious', label: "Just curious, no real problem", icon: '👀' },
];

const NETWORK_OPTIONS = [
  { id: '0-50', label: '0-50 contacts', description: 'Close friends & family' },
  { id: '50-200', label: '50-200 contacts', description: 'Growing network' },
  { id: '200-1000', label: '200-1000 contacts', description: 'Active networker' },
  { id: '1000+', label: '1000+ contacts', description: 'Power connector' },
];

const URGENCY_OPTIONS = [
  { id: 'this_week', label: 'This week', description: "I need this now" },
  { id: 'this_month', label: 'This month', description: "Soon would be great" },
  { id: 'eventually', label: 'Eventually', description: "Just exploring" },
];

export default function WaitlistPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('pain');
  const [formData, setFormData] = useState<FormData>({
    pain_point: '',
    network_size: '',
    urgency: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    const initSession = async () => {
      const id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(id);
      
      try {
        await fetch(`${BACKEND_URL}/api/v1/funnel/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: id,
            idea_id: 'everreach_waitlist',
            landing_url: typeof window !== 'undefined' ? window.location.href : '',
            referrer: typeof document !== 'undefined' ? document.referrer : '',
          }),
        });
      } catch (e) {
        console.warn('Failed to initialize session:', e);
      }
    };
    
    initSession();
    trackEvent('ViewContent', { content_name: 'Waitlist Page' });
  }, []);

  const calculateIntentScore = (): { score: number; isHighIntent: boolean } => {
    let score = 0;
    
    if (formData.pain_point && formData.pain_point !== 'just_curious') {
      score += 30;
    }
    
    if (formData.network_size === '200-1000') score += 25;
    else if (formData.network_size === '1000+') score += 35;
    else if (formData.network_size === '50-200') score += 15;
    
    if (formData.urgency === 'this_week') score += 35;
    else if (formData.urgency === 'this_month') score += 20;
    
    const isHighIntent = score >= 70;
    return { score, isHighIntent };
  };

  const handleOptionSelect = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    trackEvent('CustomizeProduct', { 
      content_name: field,
      content_type: value,
    });
    
    setTimeout(() => {
      if (step === 'pain') setStep('network');
      else if (step === 'network') setStep('urgency');
      else if (step === 'urgency') setStep('email');
    }, 300);
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { score, isHighIntent } = calculateIntentScore();

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/funnel/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          email: formData.email,
          pain_point: formData.pain_point,
          network_size: formData.network_size,
          urgency: formData.urgency,
          intent_score: score,
          is_high_intent: isHighIntent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      trackEvent('Lead', {
        content_name: 'Waitlist Signup',
        lead_quality: isHighIntent ? 'high' : 'standard',
      });

      if (isHighIntent) {
        trackEvent('LeadQualified', {
          content_name: 'Waitlist Signup - High Intent',
          lead_quality: 'high',
          pain_point: formData.pain_point,
          network_size: formData.network_size,
          urgency: formData.urgency,
        });
      }

      const encodedEmail = encodeURIComponent(formData.email);
      router.replace(isHighIntent ? `/thank-you-qualified?email=${encodedEmail}` : `/thank-you?email=${encodedEmail}`);
    } catch (e) {
      console.error('Submission error:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'network') setStep('pain');
    else if (step === 'urgency') setStep('network');
    else if (step === 'email') setStep('urgency');
    else router.back();
  };

  const getStepNumber = () => {
    switch (step) {
      case 'pain': return 1;
      case 'network': return 2;
      case 'urgency': return 3;
      case 'email': return 4;
    }
  };

  const renderPainStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your biggest challenge with staying in touch?</Text>
      <View style={styles.optionsContainer}>
        {PAIN_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              formData.pain_point === option.id && styles.optionCardSelected,
            ]}
            onPress={() => handleOptionSelect('pain_point', option.id)}
          >
            <Text style={styles.optionIcon}>{option.icon}</Text>
            <Text style={[
              styles.optionLabel,
              formData.pain_point === option.id && styles.optionLabelSelected,
            ]}>
              {option.label}
            </Text>
            {formData.pain_point === option.id && (
              <Check size={20} color="#7C3AED" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderNetworkStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>How many people are in your network?</Text>
      <View style={styles.optionsContainer}>
        {NETWORK_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              formData.network_size === option.id && styles.optionCardSelected,
            ]}
            onPress={() => handleOptionSelect('network_size', option.id)}
          >
            <Text style={[
              styles.optionLabel,
              formData.network_size === option.id && styles.optionLabelSelected,
            ]}>
              {option.label}
            </Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
            {formData.network_size === option.id && (
              <Check size={20} color="#7C3AED" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderUrgencyStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>When do you need a solution?</Text>
      <View style={styles.optionsContainer}>
        {URGENCY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              formData.urgency === option.id && styles.optionCardSelected,
            ]}
            onPress={() => handleOptionSelect('urgency', option.id)}
          >
            <Text style={[
              styles.optionLabel,
              formData.urgency === option.id && styles.optionLabelSelected,
            ]}>
              {option.label}
            </Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
            {formData.urgency === option.id && (
              <Check size={20} color="#7C3AED" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmailStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Where should we send your early access invite?</Text>
      <Text style={styles.stepSubtitle}>
        Be the first to try EverReach when we launch + get our Warmth Score Playbook.
      </Text>
      <TextInput
        style={styles.emailInput}
        placeholder="your@email.com"
        placeholderTextColor="#9CA3AF"
        value={formData.email}
        onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>Get Early Access</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
      <Text style={styles.privacyNote}>
        We respect your privacy. Unsubscribe anytime.
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={['#F9FAFB', '#EDE9FE']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(getStepNumber() / 4) * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>Step {getStepNumber()} of 4</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'pain' && renderPainStep()}
            {step === 'network' && renderNetworkStep()}
            {step === 'urgency' && renderUrgencyStep()}
            {step === 'email' && renderEmailStep()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 8, marginRight: 16 },
  progressContainer: { flex: 1 },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 2 },
  progressText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8, lineHeight: 32 },
  stepSubtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24, lineHeight: 24 },
  optionsContainer: { marginTop: 16 },
  optionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center' },
  optionCardSelected: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  optionIcon: { fontSize: 24, marginRight: 12 },
  optionLabel: { fontSize: 16, fontWeight: '600', color: '#374151', flex: 1 },
  optionLabelSelected: { color: '#7C3AED' },
  optionDescription: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  checkIcon: { marginLeft: 8 },
  emailInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 16 },
  errorText: { color: '#EF4444', fontSize: 14, marginBottom: 12 },
  submitButton: { backgroundColor: '#7C3AED', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginRight: 8 },
  privacyNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
});
