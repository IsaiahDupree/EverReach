export type RouteStatus = 'prod' | 'legacy' | 'tabs' | 'dev';

export interface PageMeta {
  path: string;
  title: string;
  status: RouteStatus;
  file: string; // relative to app/
  owner?: string;
  notes?: string;
}

// Canonical and legacy route registry (mobile-first)
export const PAGES: PageMeta[] = [
  // Tabs
  { path: '/(tabs)/home', title: 'Home', status: 'tabs', file: '(tabs)/home.tsx' },
  { path: '/(tabs)/people', title: 'People', status: 'tabs', file: '(tabs)/people.tsx' },
  { path: '/(tabs)/chat', title: 'Chat', status: 'tabs', file: '(tabs)/chat.tsx' },

  // Canonical screens
  { path: '/contact/[id]', title: 'Contact Detail', status: 'prod', file: 'contact/[id].tsx' },
  { path: '/contact-context/[id]', title: 'Contact Context', status: 'prod', file: 'contact-context/[id].tsx' },
  { path: '/contact-notes/[id]', title: 'Contact Notes', status: 'prod', file: 'contact-notes/[id].tsx' },
  { path: '/voice-note', title: 'Voice Note', status: 'prod', file: 'voice-note.tsx' },
  { path: '/screenshot-analysis', title: 'Screenshot Analysis', status: 'prod', file: 'screenshot-analysis.tsx' },
  { path: '/goal-picker', title: 'Pick Goal', status: 'prod', file: 'goal-picker.tsx' },
  { path: '/message-results', title: 'Message Results', status: 'prod', file: 'message-results.tsx' },
  { path: '/message-sent-success', title: 'Message Sent', status: 'prod', file: 'message-sent-success.tsx' },
  { path: '/personal-notes', title: 'Personal Notes', status: 'prod', file: 'personal-notes.tsx' },
  { path: '/personal-profile', title: 'Personal Profile', status: 'prod', file: 'personal-profile.tsx' },
  { path: '/notifications', title: 'Notifications', status: 'prod', file: 'notifications.tsx' },
  { path: '/subscription-plans', title: 'Subscription Plans', status: 'prod', file: 'subscription-plans.tsx' },
  { path: '/feature-request', title: 'Feature Request', status: 'prod', file: 'feature-request.tsx' },

  // Settings & privacy
  { path: '/(tabs)/settings', title: 'Settings', status: 'tabs', file: '(tabs)/settings.tsx' },
  { path: '/privacy-settings', title: 'Privacy Settings', status: 'prod', file: 'privacy-settings.tsx' },
  { path: '/privacy-policy', title: 'Privacy Policy', status: 'prod', file: 'privacy-policy.tsx' },
  { path: '/terms-of-service', title: 'Terms of Service', status: 'prod', file: 'terms-of-service.tsx' },

  // Legacy (archived)
  { path: '/legacy/contact/[id]-old', title: 'Contact Detail (Old)', status: 'legacy', file: 'legacy/contact/[id]-old.tsx', notes: 'Archived - do not edit' },
  { path: '/legacy/contact/[id]-enhanced', title: 'Contact Detail (Enhanced)', status: 'legacy', file: 'legacy/contact/[id]-enhanced.tsx', notes: 'Archived - do not edit' },

  // Dev/Test utilities (subset)
  { path: '/openai-test', title: 'OpenAI Test', status: 'dev', file: 'openai-test.tsx' },
  { path: '/supabase-test', title: 'Supabase Test', status: 'dev', file: 'supabase-test.tsx' },
  { path: '/api-test-suite', title: 'API Test Suite', status: 'dev', file: 'api-test-suite.tsx' },
  { path: '/warmth-alerts-test', title: 'Warmth Alerts Test', status: 'dev', file: 'warmth-alerts-test.tsx' },
  { path: '/contact-import-test', title: 'Contact Import Test', status: 'dev', file: 'contact-import-test.tsx' },
  { path: '/contact-save-test', title: 'Contact Save Test', status: 'dev', file: 'contact-save-test.tsx' },
  { path: '/contacts-load-test', title: 'Contacts Load Test', status: 'dev', file: 'contacts-load-test.tsx' },
  { path: '/avatar-upload-test', title: 'Avatar Upload Test', status: 'dev', file: 'avatar-upload-test.tsx' },
];

export function findPageByPath(path: string): PageMeta | undefined {
  return PAGES.find(p => p.path === path);
}

export function listByStatus(status: RouteStatus): PageMeta[] {
  return PAGES.filter(p => p.status === status);
}
