# Multi-Provider Auth Architecture

## 🎯 **Goal**
Support multiple auth providers cleanly:
- ✅ Email/Password (Supabase)
- ✅ Google OAuth
- ✅ Apple Sign In (iOS only)
- ✅ Easy to add more (Facebook, Twitter, etc.)

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────┐
│          AuthProvider (v2)                  │
│  - Manages auth state                       │
│  - Provides auth methods                    │
│  - Single source of truth                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        Auth Strategy Pattern                │
│  - signInWithEmail()                        │
│  - signInWithGoogle()                       │
│  - signInWithApple()                        │
│  - signInWithFacebook() [future]            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      Supabase Auth API                      │
│  - Handles all provider auth                │
│  - Session management                       │
│  - Token refresh                            │
└─────────────────────────────────────────────┘
```

## 📱 **Current Implementation**

### **AuthProvider.v2.tsx** (Already supports multiple providers!)

```typescript
const {
  // Email/Password
  signInWithEmail,
  
  // OAuth Providers
  signInWithGoogle,
  signInWithApple,
  
  // Shared
  signOut,
  session,
  user,
  loading,
  isAuthenticated,
} = useAuth();
```

### **What's Already Built:**

✅ **Google OAuth**: Full PKCE flow with WebBrowser
✅ **Apple Sign In**: Native iOS + OAuth fallback
✅ **Email/Password**: Supabase auth
✅ **Session Persistence**: Automatic via Supabase
✅ **Token Refresh**: Automatic
✅ **Sign Out**: Clears all providers

## 🎨 **Sign-In UI Architecture**

### **Option 1: Smart Sign-In Screen** (Recommended)

Create a flexible sign-in screen that shows/hides providers based on:
- Platform (Apple only on iOS)
- Environment (disable OAuth in local mode)
- Configuration (enable/disable providers)

```typescript
// components/AuthProviderButtons.tsx
interface AuthProvider {
  id: string;
  name: string;
  icon: string;
  handler: () => Promise<void>;
  enabled: boolean;
  platforms?: ('ios' | 'android' | 'web')[];
}

const providers: AuthProvider[] = [
  {
    id: 'google',
    name: 'Google',
    icon: '🔍',
    handler: signInWithGoogle,
    enabled: !FLAGS.LOCAL_ONLY,
    platforms: ['ios', 'android', 'web'],
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: '🍎',
    handler: signInWithApple,
    enabled: !FLAGS.LOCAL_ONLY,
    platforms: ['ios'], // iOS only
  },
  {
    id: 'email',
    name: 'Email',
    icon: '📧',
    handler: () => setShowEmailForm(true),
    enabled: true,
    platforms: ['ios', 'android', 'web'],
  },
];
```

### **Option 2: Tabs for Auth Types**

```
┌─────────────────────────────────┐
│  [ Social ]  [ Email ]          │
├─────────────────────────────────┤
│  🔍 Continue with Google        │
│  🍎 Continue with Apple         │
│  📘 Continue with Facebook      │
└─────────────────────────────────┘
```

### **Option 3: Progressive Disclosure**

```
Start with social → fallback to email
┌─────────────────────────────────┐
│  Quick Sign In:                 │
│  🔍 Google                      │
│  🍎 Apple                       │
│                                 │
│  ─── or ───                     │
│                                 │
│  [Use Email Instead]            │
└─────────────────────────────────┘
```

## 🔧 **Implementation Strategy**

### **Phase 1: Create Reusable Auth Button Component**

```typescript
// components/AuthProviderButton.tsx
interface Props {
  provider: 'google' | 'apple' | 'facebook' | 'twitter';
  onPress: () => Promise<void>;
  disabled?: boolean;
}

export function AuthProviderButton({ provider, onPress, disabled }: Props) {
  const config = PROVIDER_CONFIG[provider];
  
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: config.color }]}
      onPress={onPress}
      disabled={disabled}
    >
      <config.Icon size={24} />
      <Text style={styles.text}>Continue with {config.name}</Text>
    </TouchableOpacity>
  );
}
```

### **Phase 2: Update Sign-In Screen**

Add provider buttons to `app/sign-in.tsx`:

```typescript
<View style={styles.providersContainer}>
  <AuthProviderButton 
    provider="google" 
    onPress={signInWithGoogle}
  />
  
  {Platform.OS === 'ios' && (
    <AuthProviderButton 
      provider="apple" 
      onPress={signInWithApple}
    />
  )}
  
  <View style={styles.divider}>
    <Text>or</Text>
  </View>
  
  <EmailPasswordForm onSubmit={signInWithEmail} />
</View>
```

### **Phase 3: Add New Providers (Easy!)**

To add Facebook:

1. **Add method to AuthProvider.v2.tsx:**
```typescript
const signInWithFacebook = useCallback(async () => {
  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: redirectUri }
  });
  
  if (error) throw error;
  
  const result = await WebBrowser.openAuthSessionAsync(
    data.url!,
    redirectUri
  );
  
  // Handle result...
}, []);

// Export it
return {
  // ...existing
  signInWithFacebook, // ← Add here
};
```

2. **Add button to UI:**
```typescript
<AuthProviderButton 
  provider="facebook" 
  onPress={signInWithFacebook}
/>
```

That's it! 🎉

## 📋 **Provider Configuration**

Create a central config for all providers:

```typescript
// constants/authProviders.ts
export const AUTH_PROVIDERS = {
  google: {
    id: 'google',
    name: 'Google',
    icon: 'google', // lucide-react-native icon
    color: '#4285F4',
    platforms: ['ios', 'android', 'web'],
    enabled: !FLAGS.LOCAL_ONLY,
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    icon: 'apple',
    color: '#000000',
    platforms: ['ios'],
    enabled: !FLAGS.LOCAL_ONLY && Platform.OS === 'ios',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    platforms: ['ios', 'android', 'web'],
    enabled: false, // Not implemented yet
  },
  email: {
    id: 'email',
    name: 'Email',
    icon: 'mail',
    color: '#6B7280',
    platforms: ['ios', 'android', 'web'],
    enabled: true,
  },
} as const;
```

## 🎯 **Benefits of This Architecture**

1. **Single Source of Truth**: AuthProvider handles all auth
2. **Easy to Extend**: Add new provider = 1 method + 1 button
3. **Platform Aware**: Automatically shows/hides based on platform
4. **Flexible UI**: Sign-in screen can be customized
5. **Type Safe**: TypeScript ensures correctness
6. **Testable**: Each provider is isolated
7. **Maintainable**: All auth logic in one place

## 🚀 **Next Steps**

1. Create `components/AuthProviderButton.tsx`
2. Create `constants/authProviders.ts`
3. Update `app/sign-in.tsx` to use provider buttons
4. Test all providers
5. Add more providers as needed

## 📝 **Provider Support Matrix**

| Provider | Mobile | Web | Status | Notes |
|----------|--------|-----|--------|-------|
| Email/Password | ✅ | ✅ | Done | Supabase auth |
| Google | ✅ | ✅ | Done | OAuth PKCE |
| Apple | ✅ | ❌ | Done | iOS native + OAuth |
| Facebook | 🔜 | 🔜 | Planned | Easy to add |
| Twitter | 🔜 | 🔜 | Planned | Easy to add |
| GitHub | 🔜 | 🔜 | Planned | Easy to add |

## 🔐 **Security Considerations**

✅ All OAuth uses PKCE (Proof Key for Code Exchange)
✅ Tokens stored securely in AsyncStorage (encrypted by OS)
✅ Sessions auto-expire and refresh
✅ Sign-out clears all tokens
✅ No credentials stored in app
✅ Supabase handles all auth backend

## 📱 **UX Best Practices**

1. **Show most popular first**: Google, Apple, Email
2. **Platform-specific**: Apple only on iOS
3. **Clear CTAs**: "Continue with..." not "Sign in with..."
4. **Loading states**: Show spinner during auth
5. **Error handling**: Clear error messages
6. **Accessibility**: Proper labels and hints
7. **Consistent styling**: Match app theme

---

## 💡 **Key Insight**

**The architecture is already built!** 🎉

Your AuthProvider.v2 already supports multiple providers. We just need to:
1. Create nice UI components for provider buttons
2. Update sign-in screen to show all options
3. Add provider configuration

The hard part (session management, OAuth flows, persistence) is done!
