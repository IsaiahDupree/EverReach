/**
 * Feature Gate Component
 * Blocks access to premium features and shows upgrade prompts
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Lock, Sparkles, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/providers/SubscriptionProvider';

interface FeatureGateProps {
  feature: 'voice_notes' | 'ai_messages' | 'screenshots' | 'unlimited_contacts' | 'advanced_analytics';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

const FEATURE_CONFIG = {
  voice_notes: {
    name: 'Voice Notes',
    description: 'Record and transcribe voice notes for your contacts',
    requiredPlan: 'pro',
  },
  ai_messages: {
    name: 'AI Messages',
    description: 'Generate personalized messages with AI',
    requiredPlan: 'pro',
  },
  screenshots: {
    name: 'Screenshot Analysis',
    description: 'Analyze screenshots and convert them to contacts',
    requiredPlan: 'pro',
  },
  unlimited_contacts: {
    name: 'Unlimited Contacts',
    description: 'Add unlimited contacts to your CRM',
    requiredPlan: 'pro',
  },
  advanced_analytics: {
    name: 'Advanced Analytics',
    description: 'Access detailed warmth trends and insights',
    requiredPlan: 'pro',
  },
};

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const router = useRouter();
  const { isPaid, billingSubscription } = useSubscription();
  const [showModal, setShowModal] = React.useState(false);

  const config = FEATURE_CONFIG[feature];
  const currentPlan = billingSubscription?.subscription?.plan || 'free';
  const hasAccess = isPaid || currentPlan !== 'free';

  // Allow access if user has paid subscription
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback && !showUpgradePrompt) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt
  return (
    <>
      <View style={styles.gatedContent}>
        {fallback || (
          <View style={styles.lockedState}>
            <Lock size={32} color="#9ca3af" />
            <Text style={styles.lockedText}>This feature requires a premium plan</Text>
          </View>
        )}
        
        {showUpgradePrompt && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => setShowModal(true)}
          >
            <Sparkles size={16} color="#ffffff" />
            <Text style={styles.upgradeButtonText}>Upgrade to Unlock</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Upgrade Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <X size={24} color="#6b7280" />
            </TouchableOpacity>

            <View style={styles.modalIcon}>
              <Sparkles size={32} color="#2563eb" />
            </View>

            <Text style={styles.modalTitle}>Upgrade to {config.requiredPlan === 'pro' ? 'Core' : 'Team'}</Text>
            <Text style={styles.modalDescription}>{config.description}</Text>

            <View style={styles.benefitsList}>
              <BenefitItem text="Unlimited contacts" />
              <BenefitItem text="Voice notes & transcription" />
              <BenefitItem text="Screenshot analysis" />
              <BenefitItem text="Advanced warmth analytics" />
              <BenefitItem text="Priority support" />
            </View>

            <TouchableOpacity
              style={styles.upgradeModalButton}
              onPress={() => {
                setShowModal(false);
                router.push('/settings/billing');
              }}
            >
              <Text style={styles.upgradeModalButtonText}>View Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkMark}>✓</Text>
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

// Hook for programmatic feature checking
export function useFeatureAccess(feature: keyof typeof FEATURE_CONFIG) {
  const { isPaid, billingSubscription } = useSubscription();
  const currentPlan = billingSubscription?.subscription?.plan || 'free';
  const hasAccess = isPaid || currentPlan !== 'free';

  return {
    hasAccess,
    showUpgradePrompt: () => {
      // This would need to be implemented with a global modal context
      console.log('Show upgrade prompt for:', feature);
    },
  };
}

const styles = StyleSheet.create({
  gatedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedState: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockedText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 15,
    color: '#374151',
  },
  upgradeModalButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
  },
});
