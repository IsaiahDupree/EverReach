/**
 * Activation Tracking Hook
 * 
 * Automatically tracks key activation milestones:
 * - first_contact: User created their first contact
 * - contacts_10_plus: User has 10+ contacts
 * - first_outreach: User sent their first message
 * - profile_completed: User completed their profile
 */

import { useEffect } from 'react';
import { trackActivation, hasActivated } from '@/lib/marketingFunnel';

export interface ActivationCheckConfig {
  contactCount?: number;
  hasFirstOutreach?: boolean;
  profileCompleted?: boolean;
}

/**
 * Hook to track activation milestones based on user state
 */
export function useActivationTracking(config: ActivationCheckConfig) {
  useEffect(() => {
    const checkActivations = async () => {
      // Check for first contact
      if (config.contactCount && config.contactCount >= 1) {
        const alreadyActivated = await hasActivated('first_contact');
        if (!alreadyActivated) {
          await trackActivation('first_contact', {
            contact_count: config.contactCount,
          });
        }
      }

      // Check for 10+ contacts
      if (config.contactCount && config.contactCount >= 10) {
        const alreadyActivated = await hasActivated('contacts_10_plus');
        if (!alreadyActivated) {
          await trackActivation('contacts_10_plus', {
            contact_count: config.contactCount,
          });
        }
      }

      // Check for first outreach
      if (config.hasFirstOutreach) {
        const alreadyActivated = await hasActivated('first_outreach');
        if (!alreadyActivated) {
          await trackActivation('first_outreach');
        }
      }

      // Check for profile completed
      if (config.profileCompleted) {
        const alreadyActivated = await hasActivated('profile_completed');
        if (!alreadyActivated) {
          await trackActivation('profile_completed');
        }
      }
    };

    checkActivations().catch((error) => {
      console.error('[useActivationTracking] Error checking activations:', error);
    });
  }, [config.contactCount, config.hasFirstOutreach, config.profileCompleted]);
}

/**
 * Convenience function to track activation manually
 */
export async function trackManualActivation(
  type: 'first_contact' | 'contacts_10_plus' | 'first_outreach' | 'profile_completed',
  metadata?: Record<string, any>
): Promise<void> {
  await trackActivation(type, metadata);
}
