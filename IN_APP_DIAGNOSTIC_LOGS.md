# In-App Diagnostic Logs Viewer

## 🎯 Overview

A complete diagnostic logging system that captures and displays import errors **directly in the app UI**, eliminating the need to check Metro bundler console logs.

---

## ✨ What's New

### **Before This Feature**:
- ❌ Import fails with generic "Import failed" message
- ❌ Must check Metro bundler console to see what happened
- ❌ Hard to debug issues on physical devices
- ❌ Can't share diagnostic info easily
- ❌ Users can't self-diagnose problems

### **After This Feature**:
- ✅ Tap any failed import to see **detailed diagnostic logs**
- ✅ Color-coded log levels (INFO/WARN/ERROR)
- ✅ See exact import flow with timestamps
- ✅ Works on physical devices (no console needed)
- ✅ Easy to screenshot and share for bug reports
- ✅ Users can understand what went wrong

---

## 🏗️ Architecture

### 1. **Diagnostic Logger** (`helpers/diagnosticLogger.ts`)

Core logging system that captures logs during import:

```typescript
// Start capturing logs
startDiagnosticCapture();

// Log different levels
logInfo('Starting contact picker');
logWarn('Contact missing email');
logError('Failed to map contact', { name: 'John Doe' });

// Stop and get all logs
const logs = stopDiagnosticCapture();
```

**Features**:
- Captures `info`, `warn`, and `error` levels
- Stores timestamp, message, and optional data
- Still outputs to console (dual output)
- Controlled capture (start/stop)
- Non-invasive (no global console override)

### 2. **Import History Integration**

Logs are saved with each import history entry:

```typescript
type ImportHistoryEntry = {
  id: string;
  date: number;
  imported: number;
  total: number;
  status: 'success' | 'error';
  error?: string;
  diagnosticLogs?: DiagnosticLog[];  // ← NEW
};

type DiagnosticLog = {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
};
```

### 3. **UI Display in Modal**

When you tap a history entry, the modal shows:

#### **Diagnostic Logs Section** (if logs exist):
```
┌─────────────────────────────────────────┐
│ DIAGNOSTIC LOGS                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ INFO          2:45:32 PM            │ │
│ │ Starting contact picker             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ INFO          2:45:33 PM            │ │
│ │ Contact picked, mapping...          │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ WARN          2:45:33 PM            │ │
│ │ Contact has name but NO email/phone │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ERROR         2:45:33 PM            │ │
│ │ Failed to map contact               │ │
│ │ {"name": "John Doe"}                │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🎨 Visual Design

### **Log Level Colors**:

| Level | Background | Border | Text |
|-------|-----------|--------|------|
| **INFO** | Light Blue (`#EFF6FF`) | Blue (`#3B82F6`) | Blue (`#2563EB`) |
| **WARN** | Light Yellow (`#FFFBEB`) | Orange (`#F59E0B`) | Dark Orange (`#D97706`) |
| **ERROR** | Light Red (`#FEF2F2`) | Red (`#DC2626`) | Dark Red (`#DC2626`) |

### **Log Entry Structure**:
```
┌──────────────────────────────────────┐
│ [LEVEL]              [TIME]          │  ← Header
│ Message text here...                 │  ← Message
│ { "data": "value" }                  │  ← Data (if present)
└──────────────────────────────────────┘
```

- **Left border**: 3px colored stripe for quick scanning
- **Monospace font**: For data/JSON display
- **Compact layout**: Efficient use of space
- **Scrollable**: Handles many log entries

---

## 🔧 Implementation Details

### **Import Flow Integration**:

```typescript
const handlePickOne = async () => {
  // 1. Start capturing
  startDiagnosticCapture();
  
  try {
    // 2. Perform import (logs are captured)
    const res = await pickOneNativeContact(people, addPerson);
    
    // 3. Stop and get logs
    const diagnosticLogs = stopDiagnosticCapture();
    
    // 4. Save with history
    const entry: ImportHistoryEntry = {
      // ... other fields
      diagnosticLogs: diagnosticLogs.length > 0 ? diagnosticLogs : undefined,
    };
    await saveImportHistory(entry);
    
  } catch (error) {
    // Also capture on errors
    const diagnosticLogs = stopDiagnosticCapture();
    // Save error entry with logs
  }
};
```

### **Logger Usage in nativePicker.ts**:

```typescript
// Before
console.log('[pickOneNativeContact] Starting contact picker');
console.error('[pickOneNativeContact] Failed to map contact');

// After
logInfo('Starting contact picker');
logError('Failed to map contact - contact may be missing required fields');
```

**Benefits**:
- More descriptive messages
- Structured data capture
- UI-friendly formatting
- Contextual information

---

## 📊 What Gets Logged

### **Successful Import Flow**:
```
INFO: Starting contact picker
INFO: Contact picked, mapping...
INFO: Adding contact to CRM (name: "John Doe")
INFO: Contact added successfully (name: "John Doe")
```

### **Failed Import (Missing Fields)**:
```
INFO: Starting contact picker
INFO: Contact picked, mapping...
ERROR: Failed to map contact - contact may be missing required fields
```

### **Failed Import (Permission)**:
```
INFO: Starting contact picker
WARN: Permission denied
```

### **Failed Import (Duplicate)**:
```
INFO: Starting contact picker
INFO: Contact picked, mapping...
INFO: Duplicate contact detected (name: "John Doe")
```

### **Unexpected Error**:
```
INFO: Starting contact picker
INFO: Contact picked, mapping...
INFO: Adding contact to CRM
ERROR: Unexpected error during import
  { "error": "Network request failed" }
```

---

## 🧪 Testing the Feature

### **Test 1: View Logs for Failed Import**

1. Import a contact that will fail (only name, no email/phone)
2. Import fails with alert message
3. **Tap the failed import** in history
4. Modal opens → scroll to **"Diagnostic Logs"** section
5. **Expected**: See colored log entries showing:
   ```
   INFO: Starting contact picker
   INFO: Contact picked, mapping...
   ERROR: Failed to map contact...
   ```
6. **Check**:
   - ✅ Logs are color-coded
   - ✅ Timestamps are shown
   - ✅ Messages are readable
   - ✅ Can scroll through logs

### **Test 2: View Logs for Successful Import**

1. Import a contact with email/phone
2. Import succeeds
3. **Tap the successful import** in history
4. **Expected**: See logs showing:
   ```
   INFO: Starting contact picker
   INFO: Contact picked, mapping...
   INFO: Adding contact to CRM
   INFO: Contact added successfully
   ```

### **Test 3: No Logs Available**

1. View an old import (from before this feature)
2. **Expected**: No "Diagnostic Logs" section
3. Falls back to "For Developers" hint section

---

## 💡 User Benefits

### **For End Users**:
1. **Self-Diagnosis**: Understand why import failed without technical knowledge
2. **Clear Guidance**: See step-by-step what happened
3. **Visual Feedback**: Color-coded severity (red = problem, yellow = warning)
4. **No Console**: Works perfectly on physical devices
5. **Better Support**: Can screenshot logs for bug reports

### **For Developers**:
1. **Faster Debugging**: See exact failure point
2. **Structured Data**: JSON data display for complex objects
3. **Timeline View**: Timestamp shows when each step occurred
4. **Production Debugging**: Works in released builds
5. **User Reports**: Users can share visual logs easily

---

## 🔍 Debugging Workflow

### **Old Workflow** (Before):
```
1. User: "Import failed"
2. Developer: "Can you check the console?"
3. User: "What console?"
4. Developer: "Install debugging tools..."
5. User: "This is too complicated"
❌ Problem not solved
```

### **New Workflow** (After):
```
1. User: "Import failed"
2. Developer: "Tap the failed import, scroll to logs, screenshot"
3. User: [Sends screenshot]
4. Developer: "I see - contact missing phone number"
5. User: "Oh, I'll try a different contact!"
✅ Problem solved
```

---

## 📱 Real-World Example

### **Screenshot of Failed Import Modal**:

```
╔═══════════════════════════════════════╗
║ Import Details                    [X] ║
╠═══════════════════════════════════════╣
║                                       ║
║ STATUS                                ║
║ ┌───────────────────────────────────┐ ║
║ │ ❌ Failed                         │ ║
║ └───────────────────────────────────┘ ║
║                                       ║
║ SUMMARY                               ║
║ Total Contacts:      1                ║
║ Imported:           0                 ║
║ Skipped/Failed:     1                 ║
║ Import Time:        2:45 PM           ║
║                                       ║
║ ERROR DETAILS                         ║
║ Contact missing phone/email           ║
║                                       ║
║ DIAGNOSTIC INFORMATION                ║
║ ⚠️ This import failed. Common causes: ║
║ • Contact missing email or phone      ║
║ • iOS Limited Access restrictions     ║
║ ...                                   ║
║                                       ║
║ DIAGNOSTIC LOGS                       ║
║ ┌───────────────────────────────────┐ ║
║ │ 🔵 INFO      2:45:32 PM           │ ║
║ │ Starting contact picker           │ ║
║ └───────────────────────────────────┘ ║
║ ┌───────────────────────────────────┐ ║
║ │ 🔵 INFO      2:45:33 PM           │ ║
║ │ Contact picked, mapping...        │ ║
║ └───────────────────────────────────┘ ║
║ ┌───────────────────────────────────┐ ║
║ │ 🔴 ERROR     2:45:33 PM           │ ║
║ │ Failed to map contact - contact   │ ║
║ │ may be missing required fields    │ ║
║ └───────────────────────────────────┘ ║
╚═══════════════════════════════════════╝
```

---

## 🚀 Future Enhancements

### **Potential Improvements**:

1. **Export Logs**:
   - Button to copy logs to clipboard
   - Share via email/messaging
   - Export as JSON for technical support

2. **Log Filtering**:
   - Show only ERRORS
   - Show only WARN + ERROR
   - Search within logs

3. **Enhanced Data Display**:
   - Expandable/collapsible JSON
   - Syntax highlighting
   - Pretty-print formatting

4. **Performance Metrics**:
   - Log execution time for each step
   - Show duration between logs
   - Identify performance bottlenecks

5. **Remote Logging** (Optional):
   - Send critical errors to backend
   - Anonymous error tracking
   - Aggregate common failure patterns

6. **Log History**:
   - Keep logs for multiple sessions
   - View logs across all imports
   - Trend analysis

---

## 📝 API Reference

### **Diagnostic Logger API**:

```typescript
// Start capturing
startDiagnosticCapture(): void

// Stop and get logs
stopDiagnosticCapture(): DiagnosticLog[]

// Clear logs
clearDiagnosticLogs(): void

// Add custom log
addDiagnosticLog(level: 'info' | 'warn' | 'error', message: string, data?: any): void

// Convenience methods
logInfo(message: string, data?: any): void
logWarn(message: string, data?: any): void
logError(message: string, data?: any): void

// Check if capturing
isCapturingLogs(): boolean

// Get current logs without stopping
getCurrentLogs(): DiagnosticLog[]
```

### **Log Data Structure**:

```typescript
type DiagnosticLog = {
  timestamp: number;        // Unix timestamp
  level: 'info' | 'warn' | 'error';
  message: string;          // Human-readable message
  data?: any;               // Optional structured data
};
```

---

## 🎓 Best Practices

### **When to Use Diagnostic Logger**:

✅ **DO use for**:
- User-facing operations (import, export)
- Error conditions users need to understand
- Critical flow points
- Data validation failures
- Permission issues

❌ **DON'T use for**:
- Internal library debugging
- High-frequency loops
- Sensitive user data (passwords, tokens)
- Performance-critical code paths

### **Writing Good Log Messages**:

✅ **Good**:
```typescript
logError('Failed to map contact - contact may be missing required fields');
logInfo('Contact added successfully', { name: person.fullName });
```

❌ **Bad**:
```typescript
logError('Error'); // Too generic
logInfo('Processing...', { person }); // Too much data
```

---

## 📚 Related Documentation

- `CLICKABLE_HISTORY_FEATURE.md` - Clickable history with modal
- `CONTACT_IMPORT_FIX.md` - Contact import bug fixes
- `CONTACT_IMPORT_DIAGNOSTICS.md` - Diagnostic guide and troubleshooting

---

**Last Updated**: 2025-09-30  
**Commit**: `32a37d9`  
**Status**: ✅ Implemented and Deployed  
**Feature**: In-App Diagnostic Logs Viewer
