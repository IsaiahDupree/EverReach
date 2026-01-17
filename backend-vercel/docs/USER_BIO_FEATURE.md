# User Bio Feature Documentation

**Add bio/description to user profile for personalized AI message generation**

**Status**: ✅ Ready for Deployment  
**Created**: November 7, 2025

---

## 📋 Overview

Users can now add a bio/description to their profile that provides context to the AI when generating messages. This helps personalize outreach based on the user's background, expertise, or current situation.

---

## 🎯 Features

**Profile Management:**
- ✅ Add/edit bio via `PATCH /v1/me`
- ✅ View bio via `GET /v1/me`
- ✅ Remove bio by setting to `null`

**AI Integration:**
- ✅ Bio automatically included in AI message composition
- ✅ Optional - only used if bio exists
- ✅ Helps personalize tone and content

---

## 📡 API Endpoints

### Get User Profile (with Bio)

```http
GET /api/v1/me
Authorization: Bearer {token}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "users/abc123/profile/avatar.png",
    "bio": "Founder @ Tech Startup. Building AI tools for creators.",
    "preferences": {}
  }
}
```

### Update User Bio

```http
PATCH /api/v1/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "bio": "Founder @ Tech Startup. Building AI tools for creators."
}
```

### Remove Bio

```http
PATCH /api/v1/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "bio": null
}
```

---

## 🤖 AI Message Generation Integration

When a user has a bio, it's automatically included in the AI context for message composition:

**Example Context (with bio):**
```
Contact: Jane Smith
Channel: email
Goal Type: business
Tone: professional
Warmth: 72/100 (warm)
Company: Acme Inc

About You: Founder @ Tech Startup. Building AI tools for creators.

Recent Interactions:
- 2025-11-01: Discussed partnership opportunities...
```

**Benefits:**
- More personalized message content
- AI understands user's background/expertise
- Better alignment with user's professional identity
- Context-aware suggestions

---

## 💾 Database Schema

```sql
-- profiles table
ALTER TABLE profiles 
ADD COLUMN bio TEXT;

-- Index for searching bios (optional, for future features)
CREATE INDEX idx_profiles_bio 
ON profiles USING gin(to_tsvector('english', bio)) 
WHERE bio IS NOT NULL;
```

**Field Details:**
- **Type**: TEXT (unlimited length)
- **Nullable**: Yes (optional field)
- **Default**: NULL
- **Indexed**: Full-text search (for future feature discovery)

---

## 🚀 Deployment

### Step 1: Apply Migration

```sql
-- Copy/paste migrations/add_user_bio.sql into Supabase SQL Editor
-- Execute the migration
```

### Step 2: Deploy Backend

Already included in the current deployment:
- ✅ `app/api/v1/me/route.ts` - Updated with bio field
- ✅ `app/api/v1/agent/compose/smart/route.ts` - Bio integration
- ✅ `migrations/add_user_bio.sql` - Database migration

### Step 3: Test

```bash
# 1. Update bio
curl -X PATCH "https://ever-reach-be.vercel.app/api/v1/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio": "Founder @ Tech Startup. Building AI tools for creators."}'

# 2. Verify bio saved
curl "https://ever-reach-be.vercel.app/api/v1/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.bio'

# 3. Generate message (bio will be included in context)
curl -X POST "https://ever-reach-be.vercel.app/api/v1/agent/compose/smart" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "contact_uuid",
    "goal_type": "business",
    "goal_description": "Request intro to investor",
    "channel": "email",
    "tone": "professional"
  }'
```

---

## 💡 Use Cases

**1. Professional Identity**
```
Bio: "Product Manager @ Google. Former founder of 2 startups."
→ AI mentions relevant experience in networking messages
```

**2. Current Focus**
```
Bio: "Currently raising Series A for AI startup. Looking for intros to VCs."
→ AI frames messages around fundraising goals
```

**3. Personal Brand**
```
Bio: "Creator sharing insights on remote work and productivity."
→ AI aligns tone with creator persona
```

**4. Expertise Area**
```
Bio: "Full-stack developer specializing in React and Node.js."
→ AI emphasizes technical background in outreach
```

---

## 📝 Best Practices

**Bio Writing Tips:**
1. **Keep it concise** (1-2 sentences)
2. **Focus on current status** (what you're doing now)
3. **Include relevant expertise** (helps AI understand your background)
4. **Mention goals** (if relevant for message context)

**Good Bio Examples:**
- ✅ "Founder @ Acme Inc. Building tools for remote teams."
- ✅ "Product designer with 10 years at FAANG. Now freelancing."
- ✅ "Angel investor focused on B2B SaaS. Former VP Sales @ BigCo."

**Avoid:**
- ❌ Long life story (keep it brief)
- ❌ Too personal (focus on professional context)
- ❌ Outdated info (update regularly)

---

## 🔄 Frontend Integration

### React/Next.js Example

```typescript
// hooks/useProfile.ts
export function useProfile() {
  const { data, mutate } = useSWR('/api/v1/me', fetcher);

  const updateBio = async (bio: string | null) => {
    await fetch('/api/v1/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    });
    mutate(); // Revalidate
  };

  return {
    profile: data?.user,
    updateBio,
  };
}

// components/ProfileBioForm.tsx
export function ProfileBioForm() {
  const { profile, updateBio } = useProfile();
  const [bio, setBio] = useState(profile?.bio || '');

  return (
    <div>
      <label>About You</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="e.g., Founder @ Tech Startup. Building AI tools for creators."
        maxLength={500}
      />
      <button onClick={() => updateBio(bio)}>
        Save
      </button>
    </div>
  );
}
```

### React Native Example

```typescript
// screens/EditProfileScreen.tsx
export function EditProfileScreen() {
  const [bio, setBio] = useState('');

  const saveBio = async () => {
    const response = await fetch(`${API_BASE}/api/v1/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bio }),
    });
    
    if (response.ok) {
      Alert.alert('Success', 'Bio updated!');
    }
  };

  return (
    <View>
      <Text>About You</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="e.g., Founder @ Tech Startup..."
        multiline
        maxLength={500}
      />
      <Button title="Save" onPress={saveBio} />
    </View>
  );
}
```

---

## 🧪 Testing

### Test Bio in Message Generation

1. Set a bio via API or frontend
2. Generate a message for a contact
3. Check the AI-generated content reflects your bio context

**Example:**
```bash
# User bio: "Founder @ AI Startup. Raising Series A."
# Contact: Investor
# Goal: Request meeting

# Expected message should mention:
- Your startup/founder status
- Relevant to fundraising context
- Professional tone matching bio
```

---

## 📊 Analytics (Future)

**Potential Metrics:**
- % of users with bio vs without
- Message success rate (bio vs no bio)
- Bio length correlation with message quality
- Most common bio themes

---

## 🔗 Related Documentation

- [Profile Pictures Guide](./PROFILE_PICTURES_GUIDE.md)
- [AI Compose Endpoint](./AI_FEATURES_TEST_PLAN.md)
- [User Goals System](./USER_GOALS_SYSTEM.md)

---

**Last Updated**: November 7, 2025  
**Status**: ✅ Production Ready
