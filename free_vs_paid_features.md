# EverReach: Free vs. Paid Features & API Overview

This document outlines the feature distribution across different subscription tiers and provides an overview of the backend API structure.

## Subscription Tiers

The application currently defines the following subscription tiers:

### 1. Free / Trial
- **Status**: Users start with a "Free Trial" or fall back to a "Free Plan" upon expiration.
- **Access**: Limited. Most advanced features are gated.
- **Trial**: New users typically get a trial period (e.g., 7 days) where they have access to paid features.

### 2. EverReach Core ($15/month)
Targeted at professionals getting started with relationship management.
**Included Features:**
- ✅ Voice notes
- ✅ Screenshot-to-reply
- ✅ Goal-based responses (networking/business/personal)
- ✅ Warmth score
- ✅ Search & tags
- ✅ Import/export
- ✅ Unified message history
- ✅ Basic analytics
- ✅ Email support

### 3. EverReach Pro ($35/month)
Targeted at power users and small teams.
**Included Features:**
- ✅ **Everything in Core**
- ✅ Advanced AI insights
- ✅ Relationship analytics
- ✅ Custom response templates
- ✅ Priority support
- ✅ API access
- ✅ Team collaboration (up to 5 members)
- ✅ Advanced reporting

### 4. EverReach Enterprise (Custom Pricing)
Targeted at large organizations.
**Included Features:**
- ✅ **Everything in Pro**
- ✅ Unlimited team members
- ✅ Custom integrations
- ✅ White-label options
- ✅ Dedicated account manager
- ✅ Custom SLA
- ✅ On-premise deployment
- ✅ Advanced security features
- ✅ Custom training & reporting

---

## Gated Features (Technical Implementation)

The application uses a `PaywallGate` component to restrict access to specific feature areas. The following features are explicitly gated in the codebase:

### 1. AI Messaging & Generation (`ai_messages`)
- **Gated Areas**:
  - **Message Results**: Generating AI drafts for emails, SMS, and DMs.
  - **Goal Picker**: Selecting goals for AI message generation.
  - **CRM Assistant (Chat)**: The conversational AI assistant for querying contact info and insights.
  - **Message Templates**: Creating and managing custom message templates.
- **Requirement**: Likely requires **Core** or **Pro** plan (Templates specifically listed under Pro).

### 2. Voice Notes (`voice_notes`)
- **Gated Areas**:
  - **Voice Note Recorder**: Recording and transcribing voice notes for contacts or personal context.
- **Requirement**: **Core** plan or higher.

### 3. Screenshot Analysis (`screenshot_analysis`)
- **Gated Areas**:
  - **Screenshot Analysis Screen**: Uploading and analyzing screenshots to extract text and generate replies.
- **Requirement**: **Core** plan or higher.

### 4. Contact Insights (Implied)
- **Gated Areas**:
  - **Contact Context**: AI analysis of relationship health and suggestions (referenced in `contact-context/[id].tsx`).
- **Requirement**: **Pro** plan (listed as "Advanced AI insights" and "Relationship analytics").

---

## API Endpoints (v1)

The backend exposes the following REST endpoints under `/api/v1`:

### Core Resources
- `/billing`: Subscription and payment management.
- `/contacts`: CRUD operations for contacts.
- `/files`: File upload and management.
- `/me`: User profile and account information.
- `/messages`: Message history and management.
- `/uploads`: General upload handling.
- `/webhooks`: External integration hooks.

### Feature-Specific Resources
- `/analysis`: AI analysis endpoints.
- `/compose`: AI message composition.
- `/cron`: Scheduled tasks.
- `/goals`: Goal management for AI generation.
- `/interactions`: Interaction history (calls, meetings, etc.).
- `/pipelines`: Sales/relationship pipeline management.
- `/recommendations`: AI recommendations.
- `/screenshots`: Screenshot processing.
- `/telemetry`: App usage tracking.
- `/templates`: Message template management.
- `/trending`: Trending topics/queries.
- `/voice-notes`: Voice note storage and transcription.
- `/warmth`: Warmth score calculation.

### System
- `/health`: System health checks.
- `/version`: API version info.
