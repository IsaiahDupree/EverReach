import { useSubscription } from '@/providers/SubscriptionProvider';
import { usePlacement } from 'expo-superwall';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Simple hook for gating content behind a paywall.
 * 
 * Usage:
 *   // Auto-show paywall on mount if user is gated
 *   usePaywallGate(); 
 *   
 *   // Or manually control when to show
 *   const { isGated, showPaywall } = usePaywallGate({ autoShow: false });
 */
export function usePaywallGate(options: { autoShow?: boolean } = { autoShow: true }) {
  const { isPaid } = useSubscription();
  const router = useRouter();
  const hasShownRef = useRef(false);
  
  const { registerPlacement } = usePlacement({
    onDismiss: () => {
      // User dismissed paywall without purchasing - go back
      router.back();
    },
  });

  const showPaywall = async () => {
    if (hasShownRef.current) return; // Prevent duplicate shows
    hasShownRef.current = true;
    
    await registerPlacement({
      placement: 'main_pay_wall',
      feature: () => {
        // User has access - do nothing, let them continue
      },
    });
  };

  // Auto-show paywall if user is gated and autoShow is enabled
  useEffect(() => {
    if (options.autoShow && !isPaid && !hasShownRef.current) {
      showPaywall();
    }
  }, [isPaid, options.autoShow]);

  return {
    isGated: !isPaid,
    showPaywall,
  };
}
