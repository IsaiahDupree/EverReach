# Troubleshooting Guide

## Common Issues and Solutions

This guide covers the most common problems you'll encounter and how to fix them.

---

## Build & Development Issues

### "Module not found" Error

**Problem:** Import statements fail to resolve modules.

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json  # or bun.lockb
npm install  # or bun install

# Clear Metro cache
npx expo start --clear

# Reset watchman (Mac)
watchman watch-del-all
```

### "Unable to resolve module" in Expo

**Problem:** Metro bundler can't find a module.

**Solutions:**
1. Check if package is installed: `npm list <package-name>`
2. Restart Metro: `npx expo start --clear`
3. Check tsconfig.json paths are correct
4. For native modules, run `npx expo prebuild --clean`

### iOS Build Fails

**Problem:** Xcode build errors.

**Solutions:**
```bash
# Clean iOS build
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..

# Or full reset
npx expo prebuild --clean --platform ios
```

### Android Build Fails

**Problem:** Gradle build errors.

**Solutions:**
```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Or full reset
npx expo prebuild --clean --platform android
```

---

## Authentication Issues

### "Invalid login credentials"

**Causes:**
1. User doesn't exist
2. Wrong password
3. Email not confirmed

**Debug:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
console.log('Auth error:', error);  // Check error.message
```

**Fix:** Check Supabase Dashboard → Authentication → Users

### OAuth Redirect Not Working

**Problem:** Google/Apple login redirects to wrong URL.

**Fix:**
1. Check `app.json` scheme matches redirect:
   ```json
   {
     "expo": {
       "scheme": "yourapp"
     }
   }
   ```
2. Add redirect URL in Supabase Dashboard → Auth → URL Configuration
3. For development: `yourapp://auth/callback`
4. For production: `https://yourapp.com/auth/callback`

### Session Not Persisting

**Problem:** User gets logged out on app restart.

**Fix:** Ensure AsyncStorage is configured:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

---

## Database Issues

### "Row Level Security policy violation"

**Problem:** Query returns empty or fails with RLS error.

**Causes:**
1. User not authenticated
2. RLS policy doesn't allow the action
3. Querying another user's data

**Debug:**
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'your_table';
```

**Fix:**
```sql
-- Example: Allow users to read own data
CREATE POLICY "Users can read own data"
ON public.items FOR SELECT
USING (auth.uid() = user_id);
```

### Foreign Key Constraint Error

**Problem:** Insert/delete fails due to FK constraint.

**Fix:** Ensure referenced record exists, or use CASCADE:
```sql
ALTER TABLE public.items
DROP CONSTRAINT items_user_id_fkey,
ADD CONSTRAINT items_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;
```

### Migration Fails

**Problem:** `supabase db push` fails.

**Solutions:**
1. Check SQL syntax in migration file
2. Review error message for constraint violations
3. Run migrations manually in SQL Editor to debug
4. Reset if needed: `supabase db reset` (⚠️ deletes data)

---

## Payment Issues

### Stripe Checkout Not Opening

**Problem:** `redirectToCheckout` fails silently.

**Debug:**
```typescript
const stripe = await loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log('Stripe loaded:', !!stripe);

const { error } = await stripe.redirectToCheckout({ sessionId });
console.log('Checkout error:', error);
```

**Common causes:**
1. Wrong publishable key (test vs live)
2. Session ID invalid or expired
3. Missing success/cancel URLs

### RevenueCat "Product not found"

**Problem:** Products don't load on mobile.

**Checklist:**
- [ ] Products created in App Store Connect / Google Play
- [ ] Products approved (can take hours)
- [ ] Products mapped in RevenueCat dashboard
- [ ] Correct API key (iOS vs Android)
- [ ] Sandbox user signed in (iOS)

### Webhook Not Firing

**Problem:** Subscription updates not reaching your backend.

**Debug:**
1. Check Stripe Dashboard → Webhooks → Recent events
2. Verify webhook URL is correct and public
3. Check webhook secret matches env var
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## Deployment Issues

### Vercel Build Fails

**Problem:** Build error on Vercel.

**Common fixes:**
1. Check Node version matches local: Add `.nvmrc` or `engines` in package.json
2. Ensure all env vars are set in Vercel Dashboard
3. Check build logs for specific error

### EAS Build Fails

**Problem:** `eas build` fails.

**Debug:**
```bash
# View detailed logs
eas build --platform ios --profile production --verbose

# Check credentials
eas credentials
```

**Common causes:**
1. Invalid Apple credentials
2. Missing provisioning profile
3. Bundle ID mismatch

### App Rejected by App Store

**Common rejection reasons:**
1. **Payments:** Using Stripe instead of IAP for digital goods
2. **Login:** Requiring login without Apple Sign In option
3. **Incomplete:** Placeholder content or broken features
4. **Metadata:** Screenshots don't match app
5. **Privacy:** Missing privacy policy or purpose strings

---

## Performance Issues

### App Feels Slow

**Quick wins:**
1. Use `FlatList` instead of `ScrollView` for lists
2. Add `keyExtractor` to FlatLists
3. Wrap expensive components in `React.memo`
4. Use `useCallback` for functions passed to children
5. Lazy load screens with `React.lazy`

### Memory Leaks

**Symptoms:** App slows down over time, crashes.

**Fix:** Clean up subscriptions:
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, handleChange)
    .subscribe();

  return () => {
    subscription.unsubscribe();  // ← Clean up!
  };
}, []);
```

### Large Bundle Size

**Debug:**
```bash
# Analyze bundle
npx expo export --platform web
npx source-map-explorer dist/**/*.js
```

**Reduce size:**
1. Use dynamic imports for large features
2. Remove unused dependencies
3. Use tree-shaking compatible imports

---

## Quick Debug Commands

```bash
# Clear everything and restart
rm -rf node_modules .expo dist
npm install
npx expo start --clear

# Check environment
npx expo-env-info

# Verify Supabase connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Still Stuck?

1. Check [Expo Docs](https://docs.expo.dev/)
2. Check [Supabase Docs](https://supabase.com/docs)
3. Search [GitHub Issues](https://github.com/expo/expo/issues)
4. Ask in [Discord Community](#)
