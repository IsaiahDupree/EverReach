# Frontend Contact Import Implementation Guide

**Simple guide for implementing Google & Microsoft contact imports in your React Native app**

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Implementation Steps](#implementation-steps)
3. [UI Components](#ui-components)
4. [Error Handling](#error-handling)
5. [Best Practices](#best-practices)

---

## Quick Start

### What You're Building

A contact import flow where users can:
1. Click "Import from Google" or "Import from Microsoft"
2. Authenticate with OAuth (opens browser)
3. Return to app and see progress
4. View imported contacts

---

## Architecture Overview

```
Your App                           Backend                     Google/Microsoft
   │                                  │                              │
   │──── 1. POST /import/google/start ──→                            │
   │                                  │                              │
   │←──── authorization_url ──────────│                              │
   │                                  │                              │
   │──── 2. Open browser ─────────────┼──────→ OAuth Login ─────────→
   │                                  │                              │
   │                                  │←────── Auth Code ────────────│
   │                                  │                              │
   │                                  │──── 3. Exchange for token ───→
   │                                  │                              │
   │                                  │←──── Access token ───────────│
   │                                  │                              │
   │                                  │──── 4. Fetch contacts ───────→
   │                                  │                              │
   │                                  │←──── Contact data ───────────│
   │                                  │                              │
   │──── 5. Poll /status/{jobId} ────→│                              │
   │                                  │                              │
   │←──── progress: 50% ──────────────│                              │
   │                                  │                              │
   │──── 6. Poll /status/{jobId} ────→│                              │
   │                                  │                              │
   │←──── status: completed ──────────│                              │
```

---

## Implementation Steps

### Step 1: Create Import Hook

Create `hooks/useContactImport.ts`:

```typescript
import { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

type ImportProvider = 'google' | 'microsoft';

type ImportStatus = {
  id: string;
  provider: ImportProvider;
  status: 'pending' | 'authenticating' | 'fetching' | 'processing' | 'completed' | 'failed';
  total_contacts: number;
  processed_contacts: number;
  imported_contacts: number;
  skipped_contacts: number;
  failed_contacts: number;
  progress_percent: number;
  error_message?: string;
};

export function useContactImport() {
  const { token } = useAuth();
  const [importing, setImporting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Start import
  async function startImport(provider: ImportProvider) {
    try {
      setImporting(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/v1/contacts/import/${provider}/start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const data = await response.json();
      setCurrentJobId(data.job_id);

      // Open OAuth page in browser
      const canOpen = await Linking.canOpenURL(data.authorization_url);
      if (canOpen) {
        await Linking.openURL(data.authorization_url);
      } else {
        throw new Error('Cannot open browser');
      }

      // Start polling status
      startPolling(data.job_id);

    } catch (err: any) {
      setError(err.message);
      setImporting(false);
    }
  }

  // Step 2: Poll status
  async function checkStatus(jobId: string) {
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/contacts/import/status/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      setStatus(data);

      // Stop polling if completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        setImporting(false);
        return false; // Stop polling
      }

      return true; // Continue polling
    } catch (err: any) {
      setError(err.message);
      setImporting(false);
      return false;
    }
  }

  // Step 3: Start polling loop
  function startPolling(jobId: string) {
    const interval = setInterval(async () => {
      const shouldContinue = await checkStatus(jobId);
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup on unmount
    return () => clearInterval(interval);
  }

  // Cancel import
  function cancelImport() {
    setImporting(false);
    setCurrentJobId(null);
    setStatus(null);
    setError(null);
  }

  return {
    startImport,
    cancelImport,
    importing,
    status,
    error,
    currentJobId,
  };
}
```

---

### Step 2: Create Import UI Component

Create `components/ContactImportButton.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useContactImport } from '@/hooks/useContactImport';

type Provider = 'google' | 'microsoft';

interface ContactImportButtonProps {
  provider: Provider;
  onComplete?: (imported: number) => void;
}

export function ContactImportButton({ provider, onComplete }: ContactImportButtonProps) {
  const { startImport, importing, status, error } = useContactImport();

  const providerConfig = {
    google: {
      name: 'Google',
      color: '#4285F4',
      icon: '📧', // Replace with actual icon
    },
    microsoft: {
      name: 'Microsoft',
      color: '#00A4EF',
      icon: '📮', // Replace with actual icon
    },
  };

  const config = providerConfig[provider];

  React.useEffect(() => {
    if (status?.status === 'completed' && onComplete) {
      onComplete(status.imported_contacts);
    }
  }, [status?.status]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: config.color }]}
        onPress={() => startImport(provider)}
        disabled={importing}
      >
        {importing ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Text style={styles.icon}>{config.icon}</Text>
            <Text style={styles.buttonText}>Import from {config.name}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Progress indicator */}
      {importing && status && (
        <View style={styles.progress}>
          <Text style={styles.progressText}>
            {status.status === 'authenticating' && 'Waiting for authentication...'}
            {status.status === 'fetching' && 'Fetching contacts...'}
            {status.status === 'processing' && `Processing... ${Math.round(status.progress_percent)}%`}
          </Text>
          
          {status.status === 'processing' && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${status.progress_percent}%` }
                ]} 
              />
            </View>
          )}

          <Text style={styles.progressDetails}>
            {status.processed_contacts} / {status.total_contacts} contacts
          </Text>
        </View>
      )}

      {/* Completion message */}
      {status?.status === 'completed' && (
        <View style={styles.success}>
          <Text style={styles.successText}>✓ Import complete!</Text>
          <Text style={styles.successDetails}>
            Imported: {status.imported_contacts} | 
            Skipped: {status.skipped_contacts} | 
            Failed: {status.failed_contacts}
          </Text>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  success: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  successDetails: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 4,
  },
  error: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
  },
});
```

---

### Step 3: Add to Settings/Import Page

Create `app/import-contacts.tsx`:

```typescript
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ContactImportButton } from '@/components/ContactImportButton';
import { useRouter } from 'expo-router';

export default function ImportContactsPage() {
  const router = useRouter();

  function handleImportComplete(imported: number) {
    // Show success message or navigate
    alert(`Successfully imported ${imported} contacts!`);
    
    // Optionally navigate to contacts list
    // router.push('/(tabs)/people');
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Import Contacts</Text>
        <Text style={styles.subtitle}>
          Connect your accounts to import existing contacts
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Import from Email Providers</Text>
        
        <ContactImportButton 
          provider="google" 
          onComplete={handleImportComplete}
        />
        
        <ContactImportButton 
          provider="microsoft" 
          onComplete={handleImportComplete}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>What gets imported?</Text>
        <Text style={styles.infoText}>
          • Contact names and email addresses{'\n'}
          • Phone numbers (if available){'\n'}
          • Company/organization info{'\n'}
          • Notes (if available)
        </Text>
        
        <Text style={styles.infoTitle}>Privacy & Security</Text>
        <Text style={styles.infoText}>
          • We only request read-only access{'\n'}
          • Your account credentials are never stored{'\n'}
          • Duplicate contacts are automatically skipped{'\n'}
          • You can revoke access anytime
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  info: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
```

---

## Error Handling

### Common Errors & Solutions

#### 1. **"Cannot open browser"**
```typescript
if (!await Linking.canOpenURL(authUrl)) {
  Alert.alert(
    'Browser Required',
    'Please enable browser access in settings to continue'
  );
}
```

#### 2. **"Import failed: access_denied"**
```typescript
// User cancelled or denied permissions
if (error.includes('access_denied')) {
  Alert.alert(
    'Permission Denied',
    'You need to grant access to import contacts'
  );
}
```

#### 3. **"Import stuck in 'fetching'"**
```typescript
// Add timeout to polling
const TIMEOUT = 5 * 60 * 1000; // 5 minutes
const startTime = Date.now();

async function checkStatus(jobId: string) {
  if (Date.now() - startTime > TIMEOUT) {
    setError('Import timed out. Please try again.');
    return false;
  }
  // ... rest of status check
}
```

---

## Best Practices

### 1. **Handle Deep Links**

If your app supports deep linking, handle the OAuth callback:

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);
      
      if (path === 'import/callback') {
        // OAuth callback handled, show status page
        router.push(`/import-status?jobId=${queryParams.job_id}`);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);
}
```

### 2. **Save Import History**

```typescript
// After successful import
await AsyncStorage.setItem('lastImport', JSON.stringify({
  provider,
  date: new Date().toISOString(),
  imported: status.imported_contacts,
}));
```

### 3. **Show Import History**

```typescript
const [importHistory, setImportHistory] = useState([]);

async function loadHistory() {
  const response = await fetch(
    `${API_BASE}/api/v1/contacts/import/list`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  setImportHistory(data.jobs);
}

// Display history
{importHistory.map(job => (
  <View key={job.id}>
    <Text>{job.provider} - {job.imported_contacts} contacts</Text>
    <Text>{new Date(job.created_at).toLocaleDateString()}</Text>
  </View>
))}
```

### 4. **Prevent Duplicate Imports**

```typescript
const [hasRecentImport, setHasRecentImport] = useState(false);

async function checkRecentImport(provider: string) {
  const response = await fetch(
    `${API_BASE}/api/v1/contacts/import/list?provider=${provider}&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const { jobs } = await response.json();
  
  if (jobs.length > 0) {
    const lastImport = new Date(jobs[0].completed_at);
    const hoursSince = (Date.now() - lastImport.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < 24) {
      setHasRecentImport(true);
      Alert.alert(
        'Recent Import Found',
        `You imported from ${provider} ${Math.round(hoursSince)} hours ago. Import again?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import Anyway', onPress: () => startImport(provider) }
        ]
      );
      return false;
    }
  }
  
  return true;
}
```

### 5. **Handle App Backgrounding**

```typescript
import { AppState } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active' && importing && currentJobId) {
      // App came back to foreground, check status
      checkStatus(currentJobId);
    }
  });

  return () => subscription.remove();
}, [importing, currentJobId]);
```

---

## Testing Checklist

### Before Production

- [ ] Test Google import flow
- [ ] Test Microsoft import flow  
- [ ] Test with 0 contacts
- [ ] Test with 1000+ contacts
- [ ] Test user cancels OAuth
- [ ] Test user denies permissions
- [ ] Test app backgrounding during import
- [ ] Test network failure during import
- [ ] Test duplicate imports
- [ ] Test import history display

### Edge Cases

- [ ] What if user has no email?
- [ ] What if provider is down?
- [ ] What if token expires during import?
- [ ] What if user logs out during import?

---

## API Reference

### **Start Import**
```http
POST /api/v1/contacts/import/{provider}/start
Authorization: Bearer {token}

Response:
{
  "job_id": "uuid",
  "authorization_url": "https://...",
  "provider": "google"
}
```

### **Check Status**
```http
GET /api/v1/contacts/import/status/{jobId}
Authorization: Bearer {token}

Response:
{
  "id": "uuid",
  "status": "processing",
  "progress_percent": 75.5,
  "total_contacts": 500,
  "processed_contacts": 377,
  "imported_contacts": 350,
  "skipped_contacts": 20,
  "failed_contacts": 7
}
```

### **List History**
```http
GET /api/v1/contacts/import/list?limit=10
Authorization: Bearer {token}

Response:
{
  "jobs": [
    {
      "id": "uuid",
      "provider": "google",
      "status": "completed",
      "imported_contacts": 450,
      "created_at": "2025-11-02T10:00:00Z"
    }
  ],
  "total": 5
}
```

---

## Quick Reference

### Import Flow (3 Steps)

1. **Start Import**
   ```typescript
   const { job_id, authorization_url } = await startImport('google');
   await Linking.openURL(authorization_url);
   ```

2. **Poll Status**
   ```typescript
   setInterval(() => {
     const status = await checkStatus(job_id);
     if (status.status === 'completed') clearInterval();
   }, 2000);
   ```

3. **Show Result**
   ```typescript
   alert(`Imported ${status.imported_contacts} contacts!`);
   ```

### Provider Configs

| Provider | OAuth URL | Scopes |
|----------|-----------|--------|
| **Google** | `https://accounts.google.com/o/oauth2/v2/auth` | `contacts.readonly`, `userinfo.email` |
| **Microsoft** | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` | `Contacts.Read`, `User.Read` |

---

## Troubleshooting

### Issue: Browser doesn't open

**Solution:**
```typescript
// Check if URL can be opened first
const canOpen = await Linking.canOpenURL(authUrl);
if (!canOpen) {
  Alert.alert('Error', 'Cannot open browser. Please check settings.');
}
```

### Issue: Polling continues after completion

**Solution:**
```typescript
// Store interval ref and clear it
const intervalRef = useRef<NodeJS.Timeout>();

function startPolling(jobId: string) {
  intervalRef.current = setInterval(async () => {
    const shouldContinue = await checkStatus(jobId);
    if (!shouldContinue && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, 2000);
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, []);
```

---

## Related Documentation

- [Complete Backend API Guide](./CONTACT_IMPORT_SYSTEM.md)
- [OAuth Setup Details](./SETUP_OAUTH.md)
- [API Endpoints Reference](./API_ENDPOINTS.md)

---

**Last Updated:** November 2, 2025  
**Backend Status:** ✅ Deployed & Ready  
**Backend URL:** https://ever-reach-be.vercel.app
