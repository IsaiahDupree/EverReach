# App Store Review Notes - EverReach Core Subscription

**Products:**
- Core Monthly: `com.everreach.core.monthly` - $14.99/month
- Core Annual: `com.everreach.core.yearly` - $152.99/year ($12.75/month)

---

## Test Accounts
- `appreviewer@everreach.app` / `AppReview2024!`
- `review-test@everreach.app` / `ReviewTest123!`
- Or create new account (email, Google, Apple)

## Subscription
- 7-day free trial for new users
- StoreKit 2 + RevenueCat
- Restore: Settings → Subscription → "Restore Purchases"

---

## Core Features ($14.99/month)

### 1. Voice Notes & Transcription
**Test:** Contact page → Microphone icon → Record note → Auto-transcribed via OpenAI Whisper  
**Paywall:** Free users blocked

### 2. Screenshot-to-Reply Analysis
**Test:** Home → Screenshot button → Upload image → AI generates reply with tone/channel selection  
**Processing:** 5-10 seconds via GPT-4 Vision + OCR  
**Paywall:** Completely locked for free users

### 3. AI Message Generation
**Test:** Contact → "Craft Message" → Select goal (networking/business/personal) → Choose channel (SMS/Email/DM) + tone  
**Goals:** Reconnect, schedule meeting, follow up, birthday wishes, etc.  
**Paywall:** Free users see upgrade prompt

### 4. CRM Assistant Chat
**Test:** Chat tab → Ask "Who did I meet last week?" or "Show contacts needing attention"  
**Features:** Natural language queries, contact insights, trending queries  
**Paywall:** Chat tab locked for free users

### 5. Warmth Score
**Display:** Color-coded badges on contacts (Hot/Warm/Cool/Cold)  
**Algorithm:** Based on interaction frequency + recency  
**Test:** View any contact, filter by warmth in People tab

### 6. Advanced Search & Tags
**Test:** People tab → Search bar → Query by name/company/tags  
**Tags:** Auto-extracted from voice notes and manual notes by AI  
**Paywall:** Advanced filtering requires Core

### 7. Import/Export Contacts
**Test:** Settings → Data Management → Import (CSV/Google) or Export (CSV/JSON)  
**Paywall:** Core-only feature

### 8. Unified Message History
**Display:** Contact page → "Recent Interactions" timeline  
**Tracks:** SMS, calls, emails, meetings, notes, voice notes, screenshots

### 9. Message Templates
**Test:** Settings → Message Templates → Customize email/SMS/DM templates + voice preferences  
**Paywall:** Customization locked for free users

### 10. Analytics Dashboard
**Display:** Home tab → Metrics cards (total contacts, weekly interactions, warmth distribution)  
**Action:** Tap metrics to drill down

---

## Testing Checklist
✅ Create account → See 7-day trial  
✅ Subscribe via sandbox  
✅ Record voice note → Verify transcription  
✅ Upload screenshot → Generate reply  
✅ Craft AI message with goal  
✅ Ask CRM Assistant query  
✅ View warmth scores + filters  
✅ Search by tags  
✅ Import CSV contacts  
✅ View interaction timeline  
✅ Customize templates  
✅ Check analytics  
✅ Cancel → Verify access until period end  
✅ Restore on reinstall

---

## Permissions (Contextual)
Contacts (import/display) • Microphone (voice notes) • Photos (screenshots) • Notifications (alerts)

---

## Privacy
Supabase storage (PostgreSQL + RLS) • HTTPS/TLS encryption • OpenAI API (no data retention) • https://everreach.app/privacy

---

## Known Behaviors
Sync: 60s across devices • Transcription: 2-5s • Screenshot: 5-15s • Max recording: 5min • Max image: 10MB • Offline: Contacts work, AI needs internet

---

## Support

**Developer:** `isaiah@everreach.app`

**Emails:**
- `info@everreach.app` - Main support
- `support@everreach.app` - General support
- `noreply@mail.everreach.app` - Transactional
- `help@mail.everreach.app` - Help/assistance
- `review@everreach.app` - App Review

**Links:** https://everreach.app/support • https://everreach.app/demo

---

**Last Updated:** November 23, 2024  
**Version:** 1.0.0
