/**
 * Superwall Web Stub
 *
 * expo-superwall is native-only. This provides no-op exports for web.
 */

export function usePlacement() {
  return { trigger: () => {}, isActive: false };
}

export function useUser() {
  return { userId: null };
}

export function useSuperwallEvents() {
  return [];
}

export async function initializeSuperwall(): Promise<boolean> {
  console.log('[Superwall] Not available on web');
  return false;
}

export async function presentPaywall(_identifier: string = 'default'): Promise<boolean> {
  return false;
}

export async function dismissPaywall(): Promise<boolean> {
  return false;
}
