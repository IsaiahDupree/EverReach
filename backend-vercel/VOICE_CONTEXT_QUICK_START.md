# Voice & Tone Context - Quick Start Guide

## 🚀 **How to Implement (Choose Your Path)**

---

## **PATH A: Simple (15 minutes) - RECOMMENDED**

Just add a column to your existing `profiles` table.

### **Step 1: Run Supabase Migration**
```bash
# In Supabase SQL Editor, run:
cat VOICE_CONTEXT_MIGRATION_SIMPLE.sql
```

### **Step 2: Update Backend Validation**
Add to `/lib/validation.ts`:
```typescript
voiceContext: z.string().max(500).optional()
```

### **Step 3: Update Message Craft Endpoint**
In `/app/api/messages/craft/route.ts`, add voice context to prompt:
```typescript
if (voiceContext) {
  prompt += `\n\nVOICE & TONE: ${voiceContext}`;
}
```

### **Done!** ✅
Mobile app already stores voice context locally. Backend now uses it for message generation.

---

## **PATH B: Full (1-2 hours) - For Production**

Create a dedicated preferences table with cloud sync.

### **Step 1: Run Supabase Migration**
```bash
# In Supabase SQL Editor, run:
cat VOICE_CONTEXT_MIGRATION_FULL.sql
```

### **Step 2: Update Backend**

**Validation** (`/lib/validation.ts`):
```typescript
export const craftMessageSchema = z.object({
  // ... existing fields
  voiceContext: z.string().max(500).optional(),
});
```

**Message Craft** (`/app/api/messages/craft/route.ts`):
```typescript
const { voiceContext } = parsed.data;

if (voiceContext) {
  prompt += `\n\nVOICE & TONE INSTRUCTIONS: ${voiceContext}`;
}
```

**Preferences API** (create `/app/api/v1/me/preferences/route.ts`):
```typescript
// GET and PATCH endpoints - see full example in VOICE_CONTEXT_BACKEND_UPDATES.md
```

### **Step 3: Update Mobile App (Optional)**
Add cloud sync to `TemplatesProvider.tsx`:
```typescript
const syncToBackend = async (voiceContext: string) => {
  await apiFetch('/api/v1/me/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ voice_context: voiceContext })
  });
};
```

### **Done!** ✅
Full cloud sync with preferences API.

---

## 🧪 **Testing**

### **Test Database:**
```sql
-- Option A (profiles table)
SELECT user_id, voice_context FROM profiles WHERE voice_context IS NOT NULL;

-- Option B (user_preferences table)
SELECT * FROM user_preferences;
```

### **Test Backend:**
```bash
# Test message generation with voice context
curl -X POST https://your-api.com/api/messages/craft \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Follow up with Sarah",
    "tone": "casual",
    "voiceContext": "Gen Z casual with tech vibes"
  }'
```

---

## 📋 **Quick Checklist**

### **Minimum (Path A):**
- [ ] Run `VOICE_CONTEXT_MIGRATION_SIMPLE.sql` in Supabase
- [ ] Add `voiceContext` to validation schema
- [ ] Update message craft endpoint to use voice context
- [ ] Test with mobile app

### **Full (Path B):**
- [ ] Run `VOICE_CONTEXT_MIGRATION_FULL.sql` in Supabase
- [ ] Add `voiceContext` to validation schema
- [ ] Update message craft endpoint to use voice context
- [ ] Create preferences API endpoints
- [ ] Add cloud sync to mobile app
- [ ] Test end-to-end

---

## 🔄 **Migration Path**

**If you start with Path A, you can upgrade to Path B later:**

1. Keep Path A working (profiles.voice_context)
2. Run Path B migration (create user_preferences)
3. Migrate data:
   ```sql
   INSERT INTO user_preferences (user_id, voice_context)
   SELECT user_id, voice_context FROM profiles
   WHERE voice_context IS NOT NULL
   ON CONFLICT (user_id) DO NOTHING;
   ```
4. Update backend to use user_preferences
5. (Optional) Remove profiles.voice_context column

---

## ⚠️ **Important Notes**

1. **Local Storage Works:** Mobile app stores voice context locally, so backend changes are optional
2. **No Breaking Changes:** Existing functionality continues to work
3. **Backwards Compatible:** Backend gracefully handles missing voiceContext
4. **Rate Limited:** Message craft endpoint has rate limiting (30 req/min)

---

## 🆘 **Need Help?**

- **See full details:** `VOICE_CONTEXT_BACKEND_UPDATES.md`
- **Rollback:** `VOICE_CONTEXT_ROLLBACK.sql`
- **Test data:** See testing section in main docs

---

## 💡 **Recommendation**

**Start with Path A** (simple migration) to get it working quickly. Upgrade to Path B later if you need:
- Cloud sync across devices
- Advanced preferences management
- Better separation of concerns
- Room for future preference expansion

**Most apps don't need Path B immediately!** 🚀
