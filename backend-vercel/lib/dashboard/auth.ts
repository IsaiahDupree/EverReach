/**
 * Dashboard Authentication Utilities
 */

export function getSupabaseToken(): string {
  if (typeof window === 'undefined') return '';
  
  // Check for dashboard auth token first
  const dashboardToken = localStorage.getItem('dashboard-auth-token');
  if (dashboardToken) {
    return dashboardToken;
  }
  
  // Try multiple possible Supabase token locations
  const projectRef = 'utasetfxiqcrnwyfforx';
  
  // Method 1: Check new Supabase format (sb-<project>-auth-token)
  const newFormat = localStorage.getItem(`sb-${projectRef}-auth-token`);
  if (newFormat) {
    try {
      const parsed = JSON.parse(newFormat);
      return parsed.access_token || parsed.token || '';
    } catch {
      return newFormat;
    }
  }
  
  // Method 2: Check if there's a session object
  const sessionKey = `sb-${projectRef}-auth-session`;
  const session = localStorage.getItem(sessionKey);
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return parsed.access_token || parsed.token || '';
    } catch {
      // ignore parse errors
    }
  }
  
  // Method 3: Fallback - check all localStorage keys for auth data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('supabase') && key.includes('auth')) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (parsed.access_token) return parsed.access_token;
          if (parsed.token) return parsed.token;
        } catch {
          // ignore parse errors
        }
      }
    }
  }
  
  return '';
}

export function checkDashboardAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('dashboard-auth-token');
}
