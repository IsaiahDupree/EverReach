# Authentication Guide

## Supabase Auth Complete Implementation

This guide covers implementing user authentication with email/password, OAuth, and magic links.

---

## Auth Methods Supported

| Method | Platform | Use Case |
|--------|----------|----------|
| Email/Password | All | Traditional signup |
| Magic Link | All | Passwordless login |
| Google OAuth | All | Social login |
| Apple OAuth | iOS, Web | Required for iOS apps with social login |

---

## Setup

### Initialize Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

---

## Email/Password Auth

### Sign Up

```typescript
// services/auth.ts
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  
  return data;
}
```

### Sign In

```typescript
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  
  return data;
}
```

### Sign Out

```typescript
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

### Password Reset

```typescript
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'yourapp://reset-password',
  });

  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}
```

---

## Magic Link Auth

```typescript
export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'yourapp://auth/callback',
    },
  });

  if (error) throw error;
}
```

---

## OAuth (Google & Apple)

### Google OAuth

```typescript
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

export async function signInWithGoogle() {
  const redirectTo = makeRedirectUri();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo
  );

  if (result.type === 'success') {
    const url = new URL(result.url);
    const access_token = url.searchParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token');

    if (access_token && refresh_token) {
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
    }
  }
}
```

### Apple OAuth

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

export async function signInWithApple() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
    });

    if (error) throw error;
    return data;
  } catch (e: any) {
    if (e.code === 'ERR_REQUEST_CANCELED') {
      // User canceled
      return null;
    }
    throw e;
  }
}
```

---

## Auth Context & Hook

```typescript
// providers/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    loading,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email: string, password: string, fullName: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Protected Routes (Expo Router)

```typescript
// app/_layout.tsx
import { useAuth } from '@/providers/AuthProvider';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not signed in, redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Signed in, redirect to home
      router.replace('/');
    }
  }, [user, loading, segments]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <Stack />
    </AuthProvider>
  );
}
```

---

## Login Screen Example

```tsx
// app/(auth)/login.tsx
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { Link } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation handled by auth listener
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 p-6 justify-center">
      <Text className="text-3xl font-bold text-center mb-8">
        Welcome Back
      </Text>

      <TextInput
        className="border border-gray-300 rounded-lg p-4 mb-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        className="border border-gray-300 rounded-lg p-4 mb-6"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-blue-500 rounded-lg p-4 mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <Link href="/register" asChild>
        <TouchableOpacity>
          <Text className="text-blue-500 text-center">
            Don't have an account? Sign Up
          </Text>
        </TouchableOpacity>
      </Link>

      <Link href="/forgot-password" asChild>
        <TouchableOpacity className="mt-4">
          <Text className="text-gray-500 text-center">
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
```

---

## Security Best Practices

1. **Always use HTTPS** - Supabase enforces this
2. **Validate email** - Enable email confirmation
3. **Strong passwords** - Enforce minimum requirements
4. **Rate limiting** - Supabase has built-in protection
5. **Secure token storage** - Use SecureStore/Keychain on mobile

---

## Next Steps

- [Payments →](06-PAYMENTS.md)
- [Deployment →](07-DEPLOYMENT.md)
