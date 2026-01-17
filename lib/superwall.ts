/**
 * Superwall Helpers
 * 
 * Re-exports expo-superwall hooks for convenience.
 * Superwall is now initialized automatically via SuperwallProvider in _layout.tsx
 * 
 * Usage:
 * import { usePlacement, useUser } from '@/lib/superwall';
 */

export {
  usePlacement,
  useUser,
  useSuperwallEvents,
} from 'expo-superwall';

// Legacy functions kept for backwards compatibility but will log warnings
export async function initializeSuperwall(): Promise<boolean> {
  console.warn('[Superwall] initializeSuperwall() is deprecated. Superwall is now initialized automatically via SuperwallProvider.');
  return true;
}

export async function presentPaywall(identifier: string = 'default'): Promise<boolean> {
  console.warn('[Superwall] presentPaywall() is deprecated. Use usePlacement() hook instead.');
  return false;
}

export async function dismissPaywall(): Promise<boolean> {
  console.warn('[Superwall] dismissPaywall() is deprecated. Dismissal is handled automatically.');
  return false;
}
