# Personal Profile Page - Requirements & Enhancement Plan

**Status**: Partially Implemented  
**Priority**: Medium  
**Last Updated**: October 26, 2025

---

## Current Implementation

The `/app/personal-profile.tsx` currently provides:

- ✅ Profile picture upload UI (image picker)
- ✅ First/Last name fields
- ✅ About me bio section (1000 character limit)
- ✅ Link to personal notes
- ✅ Save functionality (upsert to `user_profiles` table)
- ✅ Loading & saving states
- ✅ Analytics tracking (`profile_saved`, `profile_image_selected`)
- ✅ Theme integration

---

## Required Backend Endpoints

### 1. Profile Management

```
GET  /api/v1/me/profile
```
- **Purpose**: Retrieve current user's profile data
- **Response**: Full profile object with all fields
- **Auth**: Required
- **Status**: Partially via `/api/v1/me`

```
PATCH /api/v1/me/profile
```
- **Purpose**: Update user profile fields
- **Body**: Partial profile object
- **Response**: Updated profile
- **Auth**: Required
- **Status**: ❌ Not yet implemented

```
POST /api/v1/me/profile/avatar
```
- **Purpose**: Upload profile avatar to storage bucket
- **Body**: `multipart/form-data` with image file
- **Response**: `{ avatar_url: string }`
- **Auth**: Required
- **Status**: ❌ Not yet implemented
- **Implementation Notes**:
  - Upload to Supabase Storage bucket `avatars`
  - Path format: `{user_id}/avatar-{timestamp}.jpg`
  - Return public URL
  - Update `user_profiles.profile_image_url`

### 2. Account Management

```
POST /api/v1/me/change-password
```
- **Purpose**: Change user password
- **Body**: `{ current_password: string, new_password: string }`
- **Response**: `{ success: boolean }`
- **Auth**: Required
- **Status**: ❌ Not yet implemented

```
GET /api/v1/me/export-data
```
- **Purpose**: Export all user data (GDPR compliance)
- **Response**: ZIP file with JSON exports
- **Auth**: Required
- **Status**: ❌ Not yet implemented

```
DELETE /api/v1/me/account
```
- **Purpose**: Delete user account and all associated data
- **Body**: `{ confirm_password: string }`
- **Response**: `{ success: boolean }`
- **Auth**: Required
- **Status**: ❌ Not yet implemented

### 3. Activity Summary

```
GET /api/v1/me/activity-summary
```
- **Purpose**: Get user's activity statistics
- **Response**:
```json
{
  "contacts_count": 142,
  "notes_count": 89,
  "messages_sent": 234,
  "voice_notes_count": 45,
  "member_since": "2024-01-15T10:30:00Z",
  "last_activity": "2025-10-26T12:00:00Z"
}
```
- **Auth**: Required
- **Status**: ❌ Not yet implemented

---

## Database Schema Requirements

### Existing Table: `user_profiles`

Current fields (assumed):
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `first_name` (text)
- `last_name` (text)
- `about` (text)
- `profile_image_url` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Required Schema Updates

```sql
-- Add new columns to user_profiles table
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private'));

-- Ensure RLS policies exist
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" 
  ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
```

### Supabase Storage Bucket

```sql
-- Create avatars bucket (via Supabase Dashboard or API)
-- Bucket name: avatars
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
```

Bucket policies:
```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
```

---

## Frontend Enhancements

### 1. Missing Profile Fields

Add to `profileData` state:

```typescript
interface ProfileData {
  // Existing
  firstName: string;
  lastName: string;
  about: string;
  profileImageUrl: string;
  
  // Add these
  email: string;              // Read-only from auth
  phoneNumber?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  timezone?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  website?: string;
  
  // Preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  
  // Privacy
  profileVisibility: 'public' | 'private';
}
```

### 2. UI Sections to Add

#### A. Contact Information Section
```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Contact Information</Text>
  
  <View style={styles.field}>
    <Text style={styles.label}>Email</Text>
    <TextInput
      style={[styles.input, styles.inputDisabled]}
      value={user?.email}
      editable={false}
      testID="profileEmail"
    />
    <Text style={styles.hint}>Email cannot be changed</Text>
  </View>
  
  <View style={styles.field}>
    <Text style={styles.label}>Phone Number</Text>
    <TextInput
      style={styles.input}
      value={profileData.phoneNumber}
      onChangeText={(text) => setProfileData({...profileData, phoneNumber: text})}
      placeholder="+1 (555) 123-4567"
      keyboardType="phone-pad"
      testID="profilePhoneNumber"
    />
  </View>
  
  <View style={styles.field}>
    <Text style={styles.label}>Location</Text>
    <TextInput
      style={styles.input}
      value={profileData.location}
      onChangeText={(text) => setProfileData({...profileData, location: text})}
      placeholder="San Francisco, CA"
      testID="profileLocation"
    />
  </View>
</View>
```

#### B. Professional Details Section
```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Professional Details</Text>
  
  <View style={styles.field}>
    <Text style={styles.label}>Job Title</Text>
    <TextInput
      style={styles.input}
      value={profileData.jobTitle}
      onChangeText={(text) => setProfileData({...profileData, jobTitle: text})}
      placeholder="Product Manager"
      testID="profileJobTitle"
    />
  </View>
  
  <View style={styles.field}>
    <Text style={styles.label}>Company</Text>
    <TextInput
      style={styles.input}
      value={profileData.company}
      onChangeText={(text) => setProfileData({...profileData, company: text})}
      placeholder="Acme Inc."
      testID="profileCompany"
    />
  </View>
</View>
```

#### C. Social Links Section
```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Social Links</Text>
  
  <View style={styles.field}>
    <Text style={styles.label}>LinkedIn</Text>
    <TextInput
      style={styles.input}
      value={profileData.linkedinUrl}
      onChangeText={(text) => setProfileData({...profileData, linkedinUrl: text})}
      placeholder="https://linkedin.com/in/username"
      keyboardType="url"
      autoCapitalize="none"
      testID="profileLinkedIn"
    />
  </View>
  
  <View style={styles.field}>
    <Text style={styles.label}>Twitter</Text>
    <TextInput
      style={styles.input}
      value={profileData.twitterHandle}
      onChangeText={(text) => setProfileData({...profileData, twitterHandle: text})}
      placeholder="@username"
      autoCapitalize="none"
      testID="profileTwitter"
    />
  </View>
  
  <View style={styles.field}>
    <Text style={styles.label}>Website</Text>
    <TextInput
      style={styles.input}
      value={profileData.website}
      onChangeText={(text) => setProfileData({...profileData, website: text})}
      placeholder="https://example.com"
      keyboardType="url"
      autoCapitalize="none"
      testID="profileWebsite"
    />
  </View>
</View>
```

#### D. Notification Preferences Section
```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Notifications</Text>
  <Text style={styles.sectionSubtitle}>
    Choose how you want to be notified
  </Text>
  
  <View style={styles.switchRow}>
    <View style={styles.switchLabel}>
      <Text style={styles.label}>Email Notifications</Text>
      <Text style={styles.hint}>Receive updates via email</Text>
    </View>
    <Switch
      value={profileData.emailNotifications}
      onValueChange={(v) => setProfileData({...profileData, emailNotifications: v})}
      testID="toggleEmailNotifications"
    />
  </View>
  
  <View style={styles.switchRow}>
    <View style={styles.switchLabel}>
      <Text style={styles.label}>Push Notifications</Text>
      <Text style={styles.hint}>Receive push notifications on this device</Text>
    </View>
    <Switch
      value={profileData.pushNotifications}
      onValueChange={(v) => setProfileData({...profileData, pushNotifications: v})}
      testID="togglePushNotifications"
    />
  </View>
  
  <View style={styles.switchRow}>
    <View style={styles.switchLabel}>
      <Text style={styles.label}>Weekly Digest</Text>
      <Text style={styles.hint}>Get a weekly summary of your activity</Text>
    </View>
    <Switch
      value={profileData.weeklyDigest}
      onValueChange={(v) => setProfileData({...profileData, weeklyDigest: v})}
      testID="toggleWeeklyDigest"
    />
  </View>
</View>
```

#### E. Account Actions Section
```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Account</Text>
  
  <TouchableOpacity
    style={styles.actionButton}
    onPress={handleChangePassword}
    testID="changePasswordButton"
  >
    <Lock size={20} color={theme.colors.text} />
    <Text style={styles.actionButtonText}>Change Password</Text>
    <ChevronRight size={20} color={theme.colors.textSecondary} />
  </TouchableOpacity>
  
  <TouchableOpacity
    style={styles.actionButton}
    onPress={handleExportData}
    testID="exportDataButton"
  >
    <Download size={20} color={theme.colors.text} />
    <Text style={styles.actionButtonText}>Export My Data</Text>
    <ChevronRight size={20} color={theme.colors.textSecondary} />
  </TouchableOpacity>
  
  <TouchableOpacity
    style={[styles.actionButton, styles.dangerButton]}
    onPress={handleDeleteAccount}
    testID="deleteAccountButton"
  >
    <AlertCircle size={20} color="#EF4444" />
    <Text style={[styles.actionButtonText, styles.dangerText]}>Delete Account</Text>
    <ChevronRight size={20} color="#EF4444" />
  </TouchableOpacity>
</View>
```

### 3. Avatar Upload Implementation

Replace the TODO in `handlePickImage`:

```typescript
const handlePickImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      // Upload to storage
      const publicUrl = await uploadAvatar(imageUri);
      
      if (publicUrl) {
        setProfileData({ ...profileData, profileImageUrl: publicUrl });
        screenAnalytics.track('profile_image_uploaded', { source: 'library' });
      }
    }
  } catch (error) {
    console.error('[PersonalProfile] Error picking image:', error);
    Alert.alert('Error', 'Failed to upload image');
  }
};

const uploadAvatar = async (imageUri: string): Promise<string | null> => {
  try {
    if (!user) throw new Error('User not authenticated');
    
    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Upload to Supabase Storage
    const fileName = `${user.id}/avatar-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('[PersonalProfile] Upload error:', error);
    return null;
  }
};
```

### 4. Validation

```typescript
const validateProfile = (): string[] => {
  const errors: string[] = [];
  
  if (!profileData.firstName?.trim()) {
    errors.push('First name is required');
  }
  
  if (!profileData.lastName?.trim()) {
    errors.push('Last name is required');
  }
  
  if (profileData.about && profileData.about.length > 1000) {
    errors.push('About section is too long (max 1000 characters)');
  }
  
  if (profileData.phoneNumber && !isValidPhoneNumber(profileData.phoneNumber)) {
    errors.push('Invalid phone number format');
  }
  
  if (profileData.linkedinUrl && !isValidUrl(profileData.linkedinUrl)) {
    errors.push('Invalid LinkedIn URL');
  }
  
  if (profileData.website && !isValidUrl(profileData.website)) {
    errors.push('Invalid website URL');
  }
  
  if (profileData.twitterHandle && !profileData.twitterHandle.startsWith('@')) {
    errors.push('Twitter handle must start with @');
  }
  
  return errors;
};

const handleSaveProfile = async () => {
  const errors = validateProfile();
  
  if (errors.length > 0) {
    Alert.alert('Validation Error', errors.join('\n'));
    return;
  }
  
  // ... existing save logic
};
```

### 5. Profile Completeness Indicator (Optional Enhancement)

```typescript
const calculateCompleteness = (): number => {
  const fields = [
    profileData.firstName,
    profileData.lastName,
    profileData.about,
    profileData.profileImageUrl,
    profileData.phoneNumber,
    profileData.jobTitle,
    profileData.company,
    profileData.location,
  ];
  
  const filledFields = fields.filter(f => f && f.toString().trim().length > 0).length;
  return Math.round((filledFields / fields.length) * 100);
};

// Add to UI (at top of profile)
<View style={styles.completenessCard}>
  <Text style={styles.completenessLabel}>Profile Completeness</Text>
  <View style={styles.progressBarContainer}>
    <View style={[styles.progressBar, { width: `${calculateCompleteness()}%` }]} />
  </View>
  <Text style={styles.completenessPercent}>{calculateCompleteness()}% complete</Text>
</View>
```

### 6. Activity Summary (Optional Enhancement)

```typescript
const [activityStats, setActivityStats] = useState({
  contactsCount: 0,
  notesCount: 0,
  messagesSent: 0,
  memberSince: '',
});

useEffect(() => {
  loadActivitySummary();
}, [user]);

const loadActivitySummary = async () => {
  try {
    const response = await apiFetch('/api/v1/me/activity-summary', {
      requireAuth: true,
    });
    
    if (response.ok) {
      const data = await response.json();
      setActivityStats(data);
    }
  } catch (error) {
    console.error('[PersonalProfile] Failed to load activity:', error);
  }
};

// Add to UI
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Your Activity</Text>
  
  <View style={styles.statsGrid}>
    <StatCard label="Contacts" value={activityStats.contactsCount} />
    <StatCard label="Notes" value={activityStats.notesCount} />
    <StatCard label="Messages" value={activityStats.messagesSent} />
    <StatCard label="Member Since" value={formatDate(activityStats.memberSince)} />
  </View>
</View>
```

---

## Testing Requirements

### Unit Tests

- [ ] Profile data validation functions
- [ ] Avatar upload helper
- [ ] Form state management
- [ ] URL/email validation helpers

### E2E Tests (Playwright/Puppeteer)

```typescript
test('User can update profile information', async () => {
  // Navigate to profile
  await page.goto('/personal-profile');
  
  // Fill in fields
  await page.fill('[data-testid="profileFirstName"]', 'John');
  await page.fill('[data-testid="profileLastName"]', 'Doe');
  await page.fill('[data-testid="profileJobTitle"]', 'Product Manager');
  
  // Save
  await page.click('[data-testid="saveProfileButton"]');
  
  // Verify success
  await expect(page.locator('text=Profile saved successfully')).toBeVisible();
});

test('User can upload profile picture', async () => {
  await page.goto('/personal-profile');
  
  // Upload avatar
  const fileInput = await page.locator('[data-testid="uploadAvatarButton"]');
  await fileInput.setInputFiles('./test-fixtures/avatar.jpg');
  
  // Save
  await page.click('[data-testid="saveProfileButton"]');
  
  // Verify image uploaded
  const avatar = await page.locator('[data-testid="profileAvatar"]');
  await expect(avatar).toHaveAttribute('src', /avatars/);
});

test('Validation errors are shown for invalid data', async () => {
  await page.goto('/personal-profile');
  
  // Clear required field
  await page.fill('[data-testid="profileFirstName"]', '');
  
  // Try to save
  await page.click('[data-testid="saveProfileButton"]');
  
  // Verify error
  await expect(page.locator('text=First name is required')).toBeVisible();
});
```

### Network Audit Coverage

Add to `scripts/network-audit.mjs`:

```javascript
// Profile flow
try {
  await page.goto(`${BASE}/personal-profile`, { waitUntil: 'networkidle' });
  
  // Fill form
  await page.fill('[data-testid="profileFirstName"]', 'Audit');
  await page.fill('[data-testid="profileLastName"]', 'User');
  await page.fill('[data-testid="profileJobTitle"]', 'Engineer');
  
  // Toggle notifications
  await page.click('[data-testid="toggleEmailNotifications"]');
  
  // Save
  await page.click('[data-testid="saveProfileButton"]');
  await page.waitForTimeout(1500);
  
  const evProfile = await readAudit(page, { errorsOnly: false });
  snapshots.push({ route: '/personal-profile :: save', events: evProfile });
} catch {}
```

Expected endpoints to be captured:
- `GET /api/v1/me/profile`
- `PATCH /api/v1/me/profile`
- `GET /api/v1/me/activity-summary` (if implemented)

---

## Implementation Priority

### Phase 1: Core Profile (High Priority)
- [ ] Implement `PATCH /api/v1/me/profile` backend endpoint
- [ ] Add phone number, job title, company fields to UI
- [ ] Add validation for all fields
- [ ] Add testIDs for E2E testing
- [ ] Implement actual avatar upload to Supabase Storage
- [ ] Add database schema updates

### Phase 2: Notifications & Preferences (Medium Priority)
- [ ] Add notification toggle UI
- [ ] Add email/push notification preferences to backend
- [ ] Implement notification settings save

### Phase 3: Social & Advanced (Low Priority)
- [ ] Add social links section (LinkedIn, Twitter, Website)
- [ ] Add profile completeness indicator
- [ ] Add activity summary stats
- [ ] Implement `GET /api/v1/me/activity-summary`

### Phase 4: Account Management (Low Priority)
- [ ] Implement change password flow
- [ ] Add export data functionality (`GET /api/v1/me/export-data`)
- [ ] Add delete account flow (`DELETE /api/v1/me/account`)

---

## Related Files

- `/app/personal-profile.tsx` - Main profile screen
- `/lib/navigation.ts` - Navigation helpers
- `/providers/AuthProviderV2.tsx` - Auth context
- `/lib/supabase.ts` - Supabase client
- Backend: `backend-vercel/app/api/v1/me/` - User endpoints

---

## Notes

- Consider splitting profile into multiple tabs if it gets too long
- Implement progressive disclosure for advanced settings
- Add haptic feedback for toggle switches (iOS)
- Consider adding profile preview/public view mode
- Add "unsaved changes" warning if user navigates away
