# Frontend Implementation Guide: Contact Import Selection Feature

## 📋 Overview

This guide provides complete implementation details for the new **Contact Selection** feature that allows users to preview and select which contacts to import from third-party services (Google, Microsoft, etc.).

**Backend Status:** ✅ Fully implemented and deployed  
**Frontend Status:** ⏳ Needs implementation  
**Priority:** 🔴 HIGH - Existing import flow will break without these changes

---

## 🎯 What Changed

### Before (Old Flow)
```
User clicks "Import from Google"
  ↓
OAuth authorization
  ↓
Contacts imported automatically
  ↓
Done ✅
```

### After (New Flow)
```
User clicks "Import from Google"
  ↓
OAuth authorization
  ↓
Contacts fetched and stored in preview table
  ↓
User sees contact selection screen 🆕
  ↓
User selects which contacts to import 🆕
  ↓
Selected contacts imported
  ↓
Done ✅
```

---

## 🚨 Breaking Changes

### Import Job Status Flow Changed

**Old statuses:**
- `new` → `authenticating` → `fetching` → `completed`

**New statuses:**
- `new` → `authenticating` → `contacts_fetched` 🆕 → `user_reviewing` 🆕 → `importing` 🆕 → `completed`

### Critical: Update Status Polling Logic

Your existing import polling logic **MUST** be updated to handle the new `contacts_fetched` status, otherwise imports will appear to hang.

---

## 📡 New API Endpoints

### 1. Preview Contacts Endpoint

**GET** `/api/v1/contacts/import/jobs/{job_id}/preview`

Fetch contacts that were imported for user review.

**Request:**
```typescript
GET /api/v1/contacts/import/jobs/abc-123-def/preview
Authorization: Bearer {token}
```

**Response:**
```typescript
{
  "job": {
    "id": "abc-123-def",
    "provider": "google",
    "status": "contacts_fetched",
    "total_contacts": 45,
    "created_at": "2025-11-03T20:00:00Z"
  },
  "contacts": [
    {
      "id": "preview-contact-1",
      "external_id": "google-123",
      "display_name": "John Doe",
      "given_name": "John",
      "family_name": "Doe",
      "emails": ["john@example.com"],
      "phones": ["+1234567890"],
      "organization": "Acme Corp",
      "job_title": "CEO",
      "notes": "Met at conference",
      "raw_data": { /* original provider data */ }
    },
    // ... more contacts
  ],
  "total": 45,
  "limit": 100,
  "offset": 0
}
```

**Query Parameters:**
- `limit` (optional): Number of contacts to return (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

---

### 2. Confirm Import Endpoint

**POST** `/api/v1/contacts/import/jobs/{job_id}/confirm`

Import selected contacts (or all contacts).

**Request - Import Selected:**
```typescript
POST /api/v1/contacts/import/jobs/abc-123-def/confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "contact_ids": ["preview-contact-1", "preview-contact-5", "preview-contact-12"]
}
```

**Request - Import All:**
```typescript
POST /api/v1/contacts/import/jobs/abc-123-def/confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "import_all": true
}
```

**Response:**
```typescript
{
  "job_id": "abc-123-def",
  "status": "importing",
  "selected_count": 3,
  "message": "Import started for 3 contacts"
}
```

**After confirmation:**
- Job status changes to `importing`
- Backend processes selected contacts
- Job status changes to `completed` when done
- You can poll the job status to track progress

---

## 🎨 Frontend Implementation

### Step 1: Update Import Status Polling

**File:** `app/import-third-party.tsx` (or wherever you handle imports)

**BEFORE:**
```typescript
const pollImportStatus = async (jobId: string) => {
  const response = await fetch(`/api/v1/contacts/import/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  
  if (data.status === 'completed') {
    // Show success
    setImporting(false);
  } else if (data.status === 'failed') {
    // Show error
    setImporting(false);
  }
  // Continue polling...
};
```

**AFTER:**
```typescript
const pollImportStatus = async (jobId: string) => {
  const response = await fetch(`/api/v1/contacts/import/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  
  // 🆕 NEW: Check for contacts_fetched status
  if (data.status === 'contacts_fetched') {
    // Navigate to contact selection screen
    router.push(`/import-contacts-review?job_id=${jobId}`);
    setImporting(false);
    return;
  }
  
  if (data.status === 'completed') {
    // Show success
    setImporting(false);
  } else if (data.status === 'failed') {
    // Show error
    setImporting(false);
  }
  // Continue polling...
};
```

---

### Step 2: Create Contact Selection Screen

**File:** `app/import-contacts-review.tsx` (NEW FILE)

```typescript
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';

interface PreviewContact {
  id: string;
  display_name: string;
  emails: string[];
  phones: string[];
  organization?: string;
  job_title?: string;
}

export default function ImportContactsReview() {
  const router = useRouter();
  const { job_id } = useLocalSearchParams<{ job_id: string }>();
  
  const [contacts, setContacts] = useState<PreviewContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobInfo, setJobInfo] = useState<any>(null);

  // Fetch contacts for review
  useEffect(() => {
    fetchContacts();
  }, [job_id]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(
        `/api/v1/contacts/import/jobs/${job_id}/preview`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Get from your auth context
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch contacts');
      
      const data = await response.json();
      setContacts(data.contacts);
      setJobInfo(data.job);
      
      // Auto-select all by default
      setSelectedIds(new Set(data.contacts.map((c: PreviewContact) => c.id)));
    } catch (error) {
      console.error('Error fetching contacts:', error);
      alert('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  // Toggle individual contact selection
  const toggleContact = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all / Deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.display_name.toLowerCase().includes(query) ||
      contact.emails.some(e => e.toLowerCase().includes(query)) ||
      contact.organization?.toLowerCase().includes(query)
    );
  });

  // Import selected contacts
  const handleImport = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one contact');
      return;
    }

    setImporting(true);
    
    try {
      const response = await fetch(
        `/api/v1/contacts/import/jobs/${job_id}/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contact_ids: Array.from(selectedIds),
          }),
        }
      );

      if (!response.ok) throw new Error('Import failed');

      // Navigate back with success message
      router.push('/contacts?import=success');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  // Skip and import all
  const handleImportAll = async () => {
    setImporting(true);
    
    try {
      const response = await fetch(
        `/api/v1/contacts/import/jobs/${job_id}/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            import_all: true,
          }),
        }
      );

      if (!response.ok) throw new Error('Import failed');

      router.push('/contacts?import=success');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Contacts to Import</Text>
        <Text style={styles.subtitle}>
          {jobInfo?.provider} • {contacts.length} contacts found
        </Text>
      </View>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search contacts..."
      />

      {/* Selection Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleSelectAll}>
          <Text style={styles.controlButton}>
            {selectedIds.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.selectedCount}>
          {selectedIds.size} of {filteredContacts.length} selected
        </Text>
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => toggleContact(item.id)}
          >
            <Checkbox
              checked={selectedIds.has(item.id)}
              onPress={() => toggleContact(item.id)}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.display_name}</Text>
              {item.emails.length > 0 && (
                <Text style={styles.contactEmail}>{item.emails[0]}</Text>
              )}
              {item.organization && (
                <Text style={styles.contactOrg}>
                  {item.job_title ? `${item.job_title} at ` : ''}{item.organization}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Action Buttons */}
      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={handleImportAll}
          disabled={importing}
        >
          Import All ({contacts.length})
        </Button>
        <Button
          onPress={handleImport}
          disabled={importing || selectedIds.size === 0}
        >
          {importing ? 'Importing...' : `Import Selected (${selectedIds.size})`}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  controlButton: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  contactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  contactOrg: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});
```

---

### Step 3: Add Route Configuration

**File:** `app/_layout.tsx`

```typescript
<Stack.Screen 
  name="import-contacts-review" 
  options={{ 
    title: "Select Contacts",
    presentation: 'modal',
  }}
/>
```

---

## 🧪 Testing Checklist

### Backend Testing (Already Done ✅)
- [x] Preview endpoint returns contacts
- [x] Confirm endpoint imports selected contacts
- [x] Job status updates correctly
- [x] Database migrations applied

### Frontend Testing (To Do)
- [ ] Import flow redirects to review screen when `contacts_fetched`
- [ ] Review screen loads contacts from preview endpoint
- [ ] Search/filter works
- [ ] Select/deselect individual contacts works
- [ ] Select all / Deselect all works
- [ ] "Import Selected" button imports chosen contacts
- [ ] "Import All" button imports all contacts
- [ ] Success message shows after import
- [ ] Error handling works (network errors, API errors)
- [ ] Loading states display correctly

---

## 📊 Database Schema Reference

### `import_preview_contacts` Table

```sql
CREATE TABLE import_preview_contacts (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES contact_import_jobs(id),
  external_id TEXT,
  display_name TEXT,
  given_name TEXT,
  family_name TEXT,
  emails JSONB,
  phones JSONB,
  organization TEXT,
  job_title TEXT,
  notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ
);
```

### Import Job Statuses

```typescript
type ImportStatus = 
  | 'new'           // Just created
  | 'authenticating' // OAuth in progress
  | 'contacts_fetched' // 🆕 Contacts ready for review
  | 'user_reviewing'   // 🆕 User is selecting contacts
  | 'importing'        // 🆕 Importing selected contacts
  | 'completed'        // Import finished
  | 'failed';          // Import failed
```

---

## 🎯 User Experience Flow

### Happy Path

1. **User initiates import**
   - Clicks "Import from Google"
   - Status: `new` → `authenticating`

2. **OAuth authorization**
   - User grants permissions
   - Backend fetches contacts
   - Status: `authenticating` → `contacts_fetched`

3. **Contact selection** 🆕
   - Frontend detects `contacts_fetched` status
   - Navigates to review screen
   - User sees all contacts with checkboxes
   - User can search/filter
   - User selects desired contacts
   - Status: `contacts_fetched` → `user_reviewing`

4. **Import confirmation** 🆕
   - User clicks "Import Selected"
   - Backend imports chosen contacts
   - Status: `user_reviewing` → `importing` → `completed`

5. **Success**
   - User sees success message
   - Contacts appear in contact list

---

## 🚀 Deployment Steps

### 1. Backend (Already Deployed ✅)
- [x] Database migration applied
- [x] New endpoints deployed
- [x] Import flow updated

### 2. Frontend (To Deploy)
1. Implement status polling changes
2. Create contact review screen
3. Add route configuration
4. Test locally
5. Deploy to production

---

## 💡 Optional Enhancements

### Phase 2 Features (Future)
- **Duplicate Detection**: Highlight contacts that already exist
- **Bulk Actions**: Tag, categorize before import
- **Contact Merging**: Merge duplicates during import
- **Import History**: Show previous imports
- **Export to CSV**: Download preview contacts

### UI Improvements
- **Contact Avatars**: Show profile pictures if available
- **Sorting**: Sort by name, email, organization
- **Filtering**: Filter by has email, has phone, etc.
- **Pagination**: Load contacts in batches for large imports
- **Preview Details**: Expand to see full contact info

---

## 🐛 Troubleshooting

### Issue: Import appears to hang

**Cause:** Frontend not detecting `contacts_fetched` status

**Fix:** Update polling logic to handle new status (see Step 1)

### Issue: Preview endpoint returns 404

**Cause:** Job ID not found or wrong endpoint

**Fix:** Verify job ID is correct and endpoint URL matches backend

### Issue: No contacts showing in review screen

**Cause:** Contacts not fetched or API error

**Fix:** Check network tab, verify backend logs, ensure OAuth succeeded

### Issue: Import button disabled

**Cause:** No contacts selected

**Fix:** Select at least one contact or use "Import All"

---

## 📚 API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/contacts/import/jobs/{id}/preview` | GET | Fetch contacts for review |
| `/api/v1/contacts/import/jobs/{id}/confirm` | POST | Import selected contacts |
| `/api/v1/contacts/import/jobs/{id}` | GET | Check job status |

---

## ✅ Definition of Done

- [ ] Status polling updated to handle `contacts_fetched`
- [ ] Contact review screen created
- [ ] Search/filter functionality working
- [ ] Select/deselect functionality working
- [ ] Import selected contacts working
- [ ] Import all contacts working
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Success/error messages shown
- [ ] Tested with Google import
- [ ] Tested with Microsoft import
- [ ] Deployed to production

---

**Estimated Implementation Time:** 4-6 hours  
**Priority:** 🔴 HIGH  
**Backend Status:** ✅ Ready  
**Frontend Status:** ⏳ Pending Implementation

---

## 📞 Support

If you encounter issues during implementation:
1. Check backend logs in Vercel
2. Verify database migrations applied
3. Test API endpoints with curl/Postman
4. Review this documentation

**Backend Deployment:** https://ever-reach-be.vercel.app  
**Supabase Project:** utasetfxiqcrnwyfforx
