import { router } from 'expo-router';
import { Platform } from 'react-native';

export type ContextTab = 'details' | 'interactions' | 'notes' | 'activity' | 'insights';
export type Channel = 'sms' | 'email' | 'dm';

export const go = {
  back(defaultTo?: string) {
    try {
      const can = typeof (router as any)?.canGoBack === 'function' ? (router as any).canGoBack() : false;
      if (can) {
        router.back();
        return;
      }
    } catch { }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
      } catch { }
    }
    router.replace((defaultTo || '/(tabs)/home') as any);
  },
  to(path: string) {
    router.push(path as any);
  },
  replaceTo(path: string) {
    router.replace(path as any);
  },
  home() {
    router.push('/');
  },
  people(filter?: string) {
    if (filter) {
      router.push(`/(tabs)/people?filter=${encodeURIComponent(filter)}` as any);
    } else {
      router.push('/(tabs)/people');
    }
  },
  contact(id: string) {
    router.push(`/contact/${id}`);
  },
  context(id: string, opts?: { tab?: ContextTab }) {
    const suffix = opts?.tab ? `?tab=${opts.tab}` : '';
    router.push(`/contact-context/${id}${suffix}`);
  },
  voiceNote(personId: string, personName?: string) {
    const name = personName ? `&personName=${encodeURIComponent(personName)}` : '';
    router.push(`/voice-note?personId=${personId}${name}`);
  },
  screenshotAnalysis(personId?: string) {
    if (personId) {
      router.push(`/screenshot-analysis?personId=${personId}` as any);
    } else {
      router.push('/screenshot-analysis');
    }
  },
  goalPicker(personId: string, channel: Channel = 'sms') {
    router.push(`/goal-picker?personId=${personId}&channel=${channel}`);
  },
  chatWithPrompt(prompt: string) {
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}` as any);
  },
  chat() {
    router.push('/(tabs)/chat');
  },
  chatWithInitialQuery(initialQuery: string) {
    const q = encodeURIComponent(initialQuery);
    router.push(`/(tabs)/chat?initialQuery=${q}`);
  },
  contactNotes(id: string) {
    router.push(`/contact-notes/${id}`);
  },
  subscriptionPlans() {
    router.push('/subscription-plans');
  },
  personalProfile() {
    router.push('/personal-profile');
  },
  addContact() {
    router.push('/add-contact');
  },
  personalNotes() {
    router.push('/personal-notes');
  },
  warmthSettings() {
    router.push('/warmth-settings');
  },
  notifications() {
    router.push('/notifications');
  },
  importContacts() {
    router.push('/import-contacts');
  },
  modeSettings() {
    router.push('/mode-settings');
  },
  featureRequest() {
    router.push('/feature-request');
  },
  messageTemplates() {
    router.push('/message-templates');
  },
  contactHistory(id: string) {
    router.push(`/contact-history/${id}`);
  },
  healthStatus() {
    router.push('/health-status');
  },
};

/**
 * Safely navigate back or to a fallback route if no history exists
 * Prevents "GO_BACK action not handled" errors
 */
export function safeGoBack(router: any, fallbackRoute: string = '/(tabs)/home') {
  try {
    // Check if we can go back by checking navigation state
    if (router.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      // No history, navigate to fallback
      router.replace(fallbackRoute);
    }
  } catch (error) {
    // If back() fails, navigate to fallback
    console.warn('[Navigation] Failed to go back, navigating to fallback:', error);
    router.replace(fallbackRoute);
  }
}
