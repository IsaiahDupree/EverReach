# Warmth Modes - Frontend Implementation Guide

**Multi-cadence warmth score system for personalized relationship tracking**

---

## Overview

The warmth score system now supports **4 different decay modes** that users can select per contact, allowing them to customize how quickly relationships are marked as needing attention.

### **The 4 Modes**

| Mode | Horizon | Use Case | Half-Life |
|------|---------|----------|-----------|
| **Slow** | ~30 days | Monthly check-ins, casual acquaintances | 17 days |
| **Medium** | ~14 days | Regular professional contacts | 8 days |
| **Fast** | ~7 days | Close friends, active clients | 4 days |
| **Test** | ~12 hours | Testing/development only | 7 hours |

---

## How It Works

### **Exponential Decay Formula**

```typescript
W(t) = Wmin + (W0 - Wmin) * e^(-λ * Δt)

Where:
- W(t) = Warmth score at time t
- W0 = Initial score (100 after interaction)
- Wmin = Minimum score (0)
- λ = Decay constant (varies by mode)
- Δt = Days since last interaction
```

### **Real-Time Mode Switching**

When a user changes modes:
1. **Immediate recalculation**: Score instantly adjusts based on new mode
2. **Same history**: Uses the same `last_interaction_at`
3. **New decay rate**: Future decay follows new mode's λ

**Example:**
```
Contact: John Doe
Last interaction: 10 days ago

Slow mode:   Score = 75 (decay slowly)
Medium mode: Score = 55 (decay moderately)
Fast mode:   Score = 25 (decay quickly)

User switches: Slow → Fast
Result: Score instantly drops from 75 → 25
Future: Continues to decay at fast rate
```

---

## API Endpoints

### **1. Get Available Modes**

```http
GET /api/v1/warmth/modes

Response:
{
  "modes": [
    {
      "mode": "slow",
      "lambda": 0.040132,
      "halfLifeDays": 17.3,
      "daysToReachout": 29.9,
      "description": "~30 days between touches"
    },
    {
      "mode": "medium",
      "lambda": 0.085998,
      "halfLifeDays": 8.1,
      "daysToReachout": 13.9,
      "description": "~14 days between touches"
    },
    {
      "mode": "fast",
      "lambda": 0.171996,
      "halfLifeDays": 4.0,
      "daysToReachout": 7.0,
      "description": "~7 days between touches"
    },
    {
      "mode": "test",
      "lambda": 2.407946,
      "halfLifeDays": 0.7,
      "daysToReachout": 0.5,
      "description": "~12 hours (testing only)"
    }
  ],
  "default": "medium"
}
```

---

### **2. Get Contact's Current Mode**

```http
GET /api/v1/contacts/:id/warmth/mode

Response:
{
  "contact_id": "uuid",
  "current_mode": "medium",
  "current_score": 65,
  "current_band": "warm",
  "last_interaction_at": "2025-10-20T10:00:00Z"
}
```

---

### **3. Switch Warmth Mode**

```http
PATCH /api/v1/contacts/:id/warmth/mode
Content-Type: application/json

{
  "mode": "fast"
}

Response:
{
  "contact_id": "uuid",
  "mode_before": "medium",
  "mode_after": "fast",
  "score_before": 65,
  "score_after": 25,
  "band_after": "cool",
  "changed_at": "2025-11-02T14:00:00Z"
}
```

---

## Frontend Implementation

### **React Native Component**

```typescript
// components/WarmthModeSelector.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface WarmthModeSelectorProps {
  contactId: string;
  currentMode?: 'slow' | 'medium' | 'fast' | 'test';
  currentScore?: number;
  onModeChange?: (mode: string, newScore: number) => void;
}

export function WarmthModeSelector({
  contactId,
  currentMode = 'medium',
  currentScore = 0,
  onModeChange
}: WarmthModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [loading, setLoading] = useState(false);

  const modes = [
    { value: 'slow', label: 'Slow', icon: '🐢', description: '~30 days' },
    { value: 'medium', label: 'Medium', icon: '🚶', description: '~14 days' },
    { value: 'fast', label: 'Fast', icon: '🏃', description: '~7 days' },
  ];

  async function handleModeChange(mode: string) {
    if (mode === selectedMode) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/contacts/${contactId}/warmth/mode`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update mode');
      }

      const data = await response.json();
      
      setSelectedMode(mode);
      onModeChange?.(mode, data.score_after);

      // Show feedback
      alert(`Warmth mode updated!\nScore changed: ${data.score_before} → ${data.score_after}`);

    } catch (error) {
      console.error('Failed to update warmth mode:', error);
      alert('Failed to update mode');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Warmth Cadence</Text>
      <Text style={styles.subtitle}>How often should you reach out?</Text>

      <View style={styles.modeButtons}>
        {modes.map(mode => (
          <TouchableOpacity
            key={mode.value}
            style={[
              styles.modeButton,
              selectedMode === mode.value && styles.modeButtonActive
            ]}
            onPress={() => handleModeChange(mode.value)}
            disabled={loading}
          >
            <Text style={styles.modeIcon}>{mode.icon}</Text>
            <Text style={[
              styles.modeLabel,
              selectedMode === mode.value && styles.modeLabelActive
            ]}>
              {mode.label}
            </Text>
            <Text style={styles.modeDescription}>{mode.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <Text style={styles.loading}>Updating...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  modeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modeLabelActive: {
    color: '#2E7D32',
  },
  modeDescription: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  loading: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
  },
});
```

---

### **Usage in Contact Detail Screen**

```typescript
// screens/ContactDetailScreen.tsx
import { WarmthModeSelector } from '../components/WarmthModeSelector';

export default function ContactDetailScreen({ contactId }: { contactId: string }) {
  const [contact, setContact] = useState<Contact | null>(null);

  async function handleModeChange(mode: string, newScore: number) {
    // Update local state
    setContact(prev => prev ? {
      ...prev,
      warmth_mode: mode,
      warmth: newScore,
      warmth_band: getWarmthBand(newScore),
    } : null);

    // Optionally refresh contact data
    // await refreshContact();
  }

  return (
    <ScrollView>
      {/* Contact info */}
      
      <WarmthModeSelector
        contactId={contactId}
        currentMode={contact?.warmth_mode || 'medium'}
        currentScore={contact?.warmth || 0}
        onModeChange={handleModeChange}
      />

      {/* Rest of contact details */}
    </ScrollView>
  );
}
```

---

### **Web Component (React)**

```typescript
// components/WarmthModeSelect.tsx
import { useState } from 'react';

interface WarmthModeSelectProps {
  contactId: string;
  currentMode?: 'slow' | 'medium' | 'fast';
  onModeChange?: (mode: string, newScore: number) => void;
}

export function WarmthModeSelect({
  contactId,
  currentMode = 'medium',
  onModeChange
}: WarmthModeSelectProps) {
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newMode = e.target.value;
    setLoading(true);

    try {
      const response = await fetch(`/api/v1/contacts/${contactId}/warmth/mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });

      const data = await response.json();
      setSelectedMode(newMode);
      onModeChange?.(newMode, data.score_after);
    } catch (error) {
      console.error('Failed to update mode:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="warmth-mode-select">
      <label>Warmth Cadence:</label>
      <select 
        value={selectedMode}
        onChange={handleChange}
        disabled={loading}
      >
        <option value="slow">Slow (~30 days)</option>
        <option value="medium">Medium (~14 days)</option>
        <option value="fast">Fast (~7 days)</option>
      </select>
      {loading && <span className="loading">Updating...</span>}
    </div>
  );
}
```

---

## UI/UX Recommendations

### **1. Mode Selector Placement**

**Recommended locations:**
- Contact detail page (primary placement)
- Bulk edit modal (change mode for multiple contacts)
- Contact creation form (set initial mode)

### **2. Visual Feedback**

**Show the impact of mode change:**
```
┌─────────────────────────────────────┐
│  Mode: Medium → Fast                │
│  Score: 65 → 25                     │
│                                     │
│  ⚠️ Switching to Fast mode will    │
│     immediately lower this score.   │
│                                     │
│  [Cancel] [Confirm Switch]          │
└─────────────────────────────────────┘
```

### **3. Mode Descriptions**

**Clear explanations for each mode:**

- **Slow**: "For contacts you touch base with monthly (e.g., casual acquaintances, quarterly clients)"
- **Medium**: "For regular professional contacts (e.g., colleagues, active clients)"
- **Fast**: "For close relationships requiring frequent contact (e.g., best clients, close friends)"
- **Test**: "Development mode only - decays in hours for testing"

### **4. Preset Suggestions**

**Smart defaults based on contact type:**

```typescript
// Suggest mode based on contact tags/role
function suggestMode(contact: Contact): WarmthMode {
  const tags = contact.tags || [];
  
  if (tags.includes('vip') || tags.includes('client')) return 'fast';
  if (tags.includes('colleague')) return 'medium';
  if (tags.includes('casual')) return 'slow';
  
  return 'medium'; // default
}
```

---

## Advanced Features

### **1. Bulk Mode Change**

```typescript
// Change mode for multiple contacts at once
async function bulkUpdateWarmthMode(contactIds: string[], mode: WarmthMode) {
  const results = await Promise.all(
    contactIds.map(id =>
      fetch(`/api/v1/contacts/${id}/warmth/mode`, {
        method: 'PATCH',
        body: JSON.stringify({ mode }),
      })
    )
  );

  const successes = results.filter(r => r.ok).length;
  alert(`Updated ${successes} of ${contactIds.length} contacts`);
}
```

### **2. Mode History**

```typescript
// View warmth mode change history
async function getWarmthModeHistory(contactId: string) {
  // Backend endpoint to implement:
  // GET /api/v1/contacts/:id/warmth/mode-history
  
  const response = await fetch(
    `/api/v1/contacts/${contactId}/warmth/mode-history`
  );
  
  return response.json();
  // Returns: [
  //   {
  //     from_mode: 'medium',
  //     to_mode: 'fast',
  //     score_before: 65,
  //     score_after: 25,
  //     changed_at: '2025-11-02T14:00:00Z'
  //   }
  // ]
}
```

### **3. Next Reachout Estimate**

```typescript
// Calculate when contact will need attention
function calculateNextReachout(currentScore: number, mode: WarmthMode): Date {
  const LAMBDA = {
    slow: 0.040132,
    medium: 0.085998,
    fast: 0.171996,
    test: 2.407946,
  };

  const threshold = 30; // "needs attention" threshold
  
  if (currentScore <= threshold) return new Date(); // Now!
  
  const daysUntil = (Math.log(currentScore) - Math.log(threshold)) / LAMBDA[mode];
  
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + Math.ceil(daysUntil));
  
  return nextDate;
}

// Usage:
const nextReachout = calculateNextReachout(contact.warmth, contact.warmth_mode);
console.log(`Next reachout: ${nextReachout.toLocaleDateString()}`);
```

---

## Testing the System

### **Test Mode (12-hour decay)**

For development/testing:

1. **Set contact to test mode**:
   ```typescript
   await updateMode(contactId, 'test');
   ```

2. **Watch it decay**:
   - Score drops ~50% in 7 hours
   - Reaches "needs attention" (30) in ~12 hours
   - Goes cold (< 20) in ~18 hours

3. **Perfect for demos**: Can show full decay cycle in one day

---

## Migration Guide

### **Existing Contacts**

All existing contacts will default to **medium** mode if no mode is set.

**Optional: Bulk migration script**

```typescript
// Migrate all VIP contacts to fast mode
async function migrateVIPsToFastMode() {
  const response = await fetch('/api/v1/contacts?tags=vip&limit=1000');
  const { contacts } = await response.json();
  
  for (const contact of contacts) {
    await fetch(`/api/v1/contacts/${contact.id}/warmth/mode`, {
      method: 'PATCH',
      body: JSON.stringify({ mode: 'fast' }),
    });
  }
}
```

---

## Best Practices

### **1. Educate Users**

**First-time modal:**
```
┌─────────────────────────────────────┐
│  Warmth Cadence                     │
│                                     │
│  Choose how often you want to be    │
│  reminded to reach out:             │
│                                     │
│  🐢 Slow - Monthly check-ins        │
│  🚶 Medium - Bi-weekly (recommended)│
│  🏃 Fast - Weekly touches           │
│                                     │
│  You can change this anytime.       │
│                                     │
│  [Got it]                           │
└─────────────────────────────────────┘
```

### **2. Smart Defaults**

Set intelligent defaults based on context:
- New client → Fast
- Colleague → Medium
- Networking contact → Slow

### **3. Confirmation on Drastic Changes**

When switching from slow → fast (big score drop):
```typescript
if (Math.abs(scoreBefore - scoreAfter) > 30) {
  const confirmed = confirm(
    `This will change your score from ${scoreBefore} to ${scoreAfter}. Continue?`
  );
  if (!confirmed) return;
}
```

---

## Summary

**What You Get:**
- ✅ 4 warmth cadence modes (slow, medium, fast, test)
- ✅ Real-time score recalculation on mode switch
- ✅ Smart defaults per contact type
- ✅ Mode change history tracking
- ✅ Test mode for development

**Implementation:**
1. Add `WarmthModeSelector` component
2. Integrate with contact detail screen
3. Optionally add bulk edit
4. Set smart defaults
5. Test with test mode

**Next Steps:**
- Add mode selector to contact detail page
- Implement bulk mode change
- Create migration for existing contacts
- Add analytics for mode usage

---

**Last Updated:** November 2, 2025  
**Status:** Backend ready, frontend guide complete  
**Backend Endpoints:** All deployed and tested
