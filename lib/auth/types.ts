import type { Session, User } from '@supabase/supabase-js';
import type { LocalUser } from '@/auth/LocalAuth';

export type AuthState = 
  | 'loading'
  | 'unauthenticated'
  | 'authenticated'
  | 'password_recovery'
  | 'onboarding';

export type AuthError = {
  code: string;
  message: string;
  details?: any;
};

export type AuthContext = {
  session: Session | null;
  user: User | LocalUser | null;
  authState: AuthState;
  loading: boolean;
  error: AuthError | null;
  orgId: string | null;
  
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean }>;
  updatePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  
  enterPasswordRecovery: () => void;
  clearPasswordRecovery: () => void;
  clearError: () => void;
};

export type AuthEvent = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'MFA_CHALLENGE_VERIFIED';
