# Local-Only Mode Implementation

This document describes the hybrid local-only mode implementation for the EverReach app.

## Overview

The app now runs in **Local-Only MVP mode** where all data is stored locally on the device using AsyncStorage, with all Supabase/cloud functionality feature-flagged OFF. This provides a complete offline experience while keeping the cloud infrastructure ready for future activation.

## ✅ FIXED: Message Generation Now Works!

The message generation has been updated to work seamlessly in local-only mode:

- **Backend Integration**: tRPC routes now support local-only mode with feature flags
- **Client-Side Fallback**: Message results screen automatically uses local generation when `FLAGS.LOCAL_ONLY = true`
- **Template-Based Generation**: Intelligent templates with context substitution
- **No Network Calls**: Everything works offline with no API dependencies

## Key Features

### ✅ What's Working in Local-Only Mode

- **Complete offline functionality** - No network requests to external APIs
- **Local data storage** - All people, messages, voice notes stored in AsyncStorage
- **Template-based message generation** - Smart templates instead of AI API calls
- **Local authentication** - Device-scoped "local user" for consistent UX
- **Data export/import** - JSON backup functionality for data portability
- **Full app functionality** - All CRM features work without cloud dependency

### 🤖 Message Generation in Local Mode

- **Template system** - Pre-written message templates for different goals (check-in, congratulate, etc.)
- **Context substitution** - Automatically fills in contact names, interests, and recent notes
- **Tone adjustment** - Modifies language based on selected tone (casual, professional, warm, direct)
- **Smart variants** - Generates 3 different versions of each message
- **No AI API calls** - Everything processed locally for privacy and speed

### 🔧 Architecture

#### Feature Flag System
```typescript
// constants/flags.ts
export const FLAGS = {
  LOCAL_ONLY: true, // Controls entire local-only mode
};
```

#### Storage Layer
- **StorageService interface** - Abstraction for different storage backends
- **AsyncStorageService** - Current implementation using React Native AsyncStorage
- **Repository pattern** - PeopleRepo, MessagesRepo, VoiceNotesRepo for data access

#### Authentication
- **LocalAuth** - Creates device-scoped user with persistent ID
- **AuthProvider** - Handles both local and cloud auth modes seamlessly

#### Data Management
- **Backup/Export** - Export all data to JSON file with sharing
- **Storage Statistics** - View data usage by category
- **Import functionality** - Restore from backup files

## File Structure

```
├── constants/flags.ts              # Feature flags
├── storage/
│   ├── StorageService.ts          # Storage interface
│   ├── AsyncStorageService.ts     # AsyncStorage implementation
│   └── types.ts                   # Data type definitions
├── repos/
│   ├── PeopleRepo.ts             # People data access
│   ├── MessagesRepo.ts           # Messages data access
│   └── VoiceNotesRepo.ts         # Voice notes data access
├── auth/LocalAuth.ts             # Local authentication
├── tools/backup.ts               # Export/import functionality
└── lib/supabase.ts              # Supabase client (null in local mode)
```

## Visual Indicators

- **Home screen** - Green "Local-Only Mode Active" banner
- **Settings screen** - Clear mode indicator and data management options
- **App version** - Shows "(Local-Only)" suffix

## Data Storage Prefixes

- `people/` - Contact information
- `messages/` - Generated messages
- `voicenotes/` - Voice recordings and transcriptions
- `settings/` - App preferences and custom goals
- `auth/` - Local user information

## Migration Path to Cloud

When ready to enable cloud sync:

1. **Flip the flag**: Set `LOCAL_ONLY: false` in constants/flags.ts
2. **Enable Supabase**: Real client will be used instead of null
3. **Add sync engine**: Implement change-log based sync
4. **Data migration**: Upload local data to cloud on first cloud sign-in

## Benefits

- **Zero network dependency** - Works completely offline
- **Data privacy** - All data stays on device
- **Fast performance** - No network latency
- **Simple deployment** - No backend setup required
- **Future-ready** - Easy migration to cloud when needed

## Usage

The app works exactly the same as before, but with these differences:

- No sign-in required (uses local user)
- No cloud sync (data stays local)
- Export/import available for data portability
- Green indicators show local-only status

All CRM functionality including contacts, voice notes, message generation, and relationship tracking works identically to the cloud version.