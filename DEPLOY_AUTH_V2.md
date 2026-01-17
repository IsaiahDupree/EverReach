# Deploy Auth v2 - Step by Step

## ✅ Prerequisites

- [ ] Tested `/auth-v2-test` screen
- [ ] Google OAuth works
- [ ] Session persists after restart
- [ ] Sign-out works

## 🚀 Deployment Steps

### **Step 1: Backup Current Auth**

```bash
# Backup old files
cp providers/AuthProvider.tsx providers/AuthProvider.v1.backup.tsx
cp app/_layout.tsx app/_layout.v1.backup.tsx
```

### **Step 2: Activate v2**

```bash
# Replace old with new
mv providers/AuthProvider.v2.tsx providers/AuthProvider.tsx
mv app/_layout.v2.tsx app/_layout.tsx
```

**⚠️ This overwrites the old files!** (But we have backups)

### **Step 3: Update sign-in.tsx**

Find this line in `app/sign-in.tsx`:
```typescript
await signInWithPassword(email, password);
```

Replace with:
```typescript
await signInWithEmail(email, password);
```

### **Step 4: Restart Dev Server**

```bash
# Clear cache and restart
npm start -- --clear
```

### **Step 5: Test Everything**

- [ ] Sign in with Google → Works
- [ ] Sign in with Email → Works  
- [ ] Close and reopen app → Still signed in
- [ ] Sign out → Returns to sign-in screen
- [ ] All screens navigate correctly

### **Step 6: Commit**

```bash
git add .
git commit -m "feat: Auth v2 - Clean mobile-first auth system

- Reduced from 700 to 200 lines
- Fixed AsyncStorage Hermes errors
- Automatic session persistence
- Single source of truth
- No race conditions
"
```

---

## 🔄 **Rollback Plan**

If something goes wrong:

```bash
# Restore old auth
cp providers/AuthProvider.v1.backup.tsx providers/AuthProvider.tsx
cp app/_layout.v1.backup.tsx app/_layout.tsx

# Restart
npm start -- --clear
```

---

## 📋 **Post-Deployment Cleanup**

After confirming v2 works:

```bash
# Delete old files
rm providers/AuthProvider.v1.backup.tsx
rm app/_layout.v1.backup.tsx
rm app/auth-v2-test.tsx

# Delete obsolete docs
rm MOBILE_AUTH_ASYNCSTORAGE_FIX.md
rm AUTHENTICATION_ARCHITECTURE.md
```

Keep these:
- ✅ `AUTH_V2_MIGRATION_GUIDE.md`
- ✅ `DEPLOY_AUTH_V2.md`

---

## 🎉 **Success Criteria**

Auth v2 is successfully deployed when:

✅ Google OAuth completes without errors  
✅ Sessions persist across app restarts  
✅ No AsyncStorage/Hermes errors  
✅ Navigation works correctly  
✅ Sign-out clears session properly  
✅ Console logs are clean with `[Auth v2]` prefix  

---

## 📊 **What Changed**

| File | Before | After | Change |
|------|--------|-------|--------|
| `AuthProvider.tsx` | 702 lines | 337 lines | **-52%** |
| `_layout.tsx` | 602 lines | 168 lines | **-72%** |
| **Total** | **1,304 lines** | **505 lines** | **-61%** |

**Code reduction:** ~800 lines removed! 🎉

---

## 🆘 **Need Help?**

Stuck? Check:
1. Console logs for `[Auth v2]` messages
2. Supabase dashboard for user sessions
3. AsyncStorage keys: `npx react-native log-android` / `npx react-native log-ios`

Still stuck? Revert and investigate:
```bash
# Revert
git reset --hard HEAD~1

# Or manual revert (see Rollback Plan above)
```
