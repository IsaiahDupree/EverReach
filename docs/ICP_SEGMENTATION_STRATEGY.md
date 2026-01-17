# ICP Segmentation Strategy - Contact Detail Page

## The 3 Primary ICPs

### 1. 🏢 **Business (Sales/CRM Focus)**
**Who**: Salespeople, consultants, freelancers, agencies, entrepreneurs
**Goal**: Close deals, manage pipeline, track revenue opportunities
**Pain**: Forgetting to follow up, losing deals to poor relationship management

### 2. 👥 **Personal (Life Relationships)**
**Who**: People managing friendships, family, mentors, personal network
**Goal**: Stay connected, maintain meaningful relationships, be a good friend
**Pain**: Losing touch with important people, forgetting birthdays/events

### 3. 🌐 **Networking (Career Growth)**
**Who**: Job seekers, career switchers, ambitious professionals, conference-goers
**Goal**: Expand professional network, find opportunities, build influence
**Pain**: Meeting people but never following up, wasted networking events

---

## How Contact Detail Page Changes by ICP

### Current Generic Design Problem
The current page shows:
- "Pipeline Theme: Networking, Personal, Business"
- "Status: New/Added, Initial Contact, Engaged Conversation"
- Warmth score (generic)

**Issue**: These terms don't resonate equally with all ICPs. "Pipeline" is sales jargon that confuses personal users.

---

## Iteration 3 (Action-Focused) Adapted by ICP

### 🏢 Business Version

```
┌─────────────────────────────────────────────┐
│  ← Back          Jennifer Martinez     ⋮    │
├─────────────────────────────────────────────┤
│         [JM]                                │
│    Jennifer Martinez                        │
│   Creative Design Studio                    │
│                                             │
│   💼 PROSPECT  •  Deal Value: $50-75k      │
│   🔴 COLD 28/100  ⚠️ At Risk               │
│   Last touchpoint: 45 days ago              │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  💰 Deal Intelligence                       │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 1. Send Follow-up Email 📧             │ │
│  │                                       │ │
│  │   "Hi Jennifer, following up on our   │ │
│  │    proposal. Any questions on..."     │ │
│  │                                       │ │
│  │   [✏️ Edit & Send]  [✨ Regenerate]    │ │
│  │   Suggested subject: "Re: Design..."  │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 2. Schedule Discovery Call 📞          │ │
│  │                                       │ │
│  │   Close probability: 65%              │ │
│  │   Avg deal cycle: 30 days             │ │
│  │   Similar clients: 3 closed           │ │
│  │                                       │ │
│  │   [📅 Book Meeting]  [⏭️  Snooze]      │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 3. Move to Next Stage 🚀               │ │
│  │                                       │ │
│  │   Current: Initial Contact            │ │
│  │   Suggested: Qualified Lead           │ │
│  │   Why: Budget confirmed, needs match  │ │
│  │                                       │ │
│  │   [➡️  Move]  [✏️  Edit Stage]         │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  💡 More Revenue Opportunities             │
│  • Upsell: Website redesign (+$25k)        │
│  • Cross-sell: Branding package            │
│  • Referral: Ask for 2 introductions       │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Deal Metrics                            │
│                                             │
│  Pipeline stage: Initial Contact           │
│  Deal size: $50-75k                         │
│  Close date: Q1 2026                        │
│  Win probability: 65%                       │
│  Days in stage: 45 (⚠️ stalled)            │
│                                             │
│  [View Pipeline ▸]                          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🎯 Sales Actions                           │
│                                             │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ 📧 Email    │ 📞 Call     │ 📝 Note   │ │
│  └─────────────┴─────────────┴───────────┘ │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ 📄 Proposal │ 📅 Meeting  │ 💰 Quote  │ │
│  └─────────────┴─────────────┴───────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  📌 Deal Context                            │
│  "Budget: $50-75k. Timeline: Q1 2026.       │
│   Decision maker confirmed. Needs:          │
│   portfolio, case studies, timeline"        │
│                                             │
└─────────────────────────────────────────────┘
```

**Key Differences**:
- ✅ **Revenue-focused** - Deal value, win probability, upsell opportunities
- ✅ **Sales terminology** - "Prospect", "Pipeline stage", "Close probability"
- ✅ **Business metrics** - Days in stage, deal cycle time
- ✅ **Action items** - Proposal, Quote, Meeting booking
- ✅ **AI suggestions** - Revenue maximization (upsell, cross-sell, referrals)

**Endpoints Used**:
```typescript
GET /v1/contacts/:id/state - Pipeline state & deal value
GET /v1/analysis/:id/revenue - Revenue predictions
GET /v1/analysis/:id/similar-deals - Comparable wins
POST /v1/compose?context=sales - Sales-focused messaging
```

---

### 👥 Personal Version

```
┌─────────────────────────────────────────────┐
│  ← Back          Jennifer Martinez     ⋮    │
├─────────────────────────────────────────────┤
│         [JM]                                │
│    Jennifer Martinez                        │
│   Old College Friend                        │
│                                             │
│   💙 GOOD FRIEND  •  Known 8 years         │
│   ⚠️ Haven't connected in 45 days          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  💭 Reconnection Ideas                      │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 1. Send Catch-up Message 💬            │ │
│  │                                       │ │
│  │   "Hey Jen! Hope you're doing well.   │ │
│  │    Been thinking about you. Want to   │ │
│  │    grab coffee soon?"                  │ │
│  │                                       │ │
│  │   [✏️ Edit & Send]  [✨ Regenerate]    │ │
│  │   Best channel: Text message          │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 2. Suggest Coffee Meetup ☕            │ │
│  │                                       │ │
│  │   Last met: 45 days ago               │ │
│  │   Usual spot: Cafe Luna               │ │
│  │   Jen's free: Weekends, Tue evenings  │ │
│  │                                       │ │
│  │   [📅 Suggest Times]  [⏭️  Later]      │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 3. Send Birthday Card 🎂               │ │
│  │                                       │ │
│  │   Birthday: November 15 (21 days!)    │ │
│  │   Reminder set: November 10           │ │
│  │   Gift idea: Art supplies             │ │
│  │                                       │ │
│  │   [🎁 Shop Now]  [📝 Set Reminder]    │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  💡 More Ways to Connect                   │
│  • Share article about design trends       │
│  • Introduce her to Alex (also designer)   │
│  • Invite to game night next Friday        │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Friendship Stats                        │
│                                             │
│  Friendship length: 8 years                 │
│  Connection strength: Good Friend 💙        │
│  Last interaction: 45 days ago              │
│  Usual frequency: Every 2-3 weeks           │
│  Favorite topics: Design, travel, food      │
│                                             │
│  [View Memories ▸]                          │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🎯 Quick Connect                           │
│                                             │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ 💬 Text     │ 📞 Call     │ 📝 Note   │ │
│  └─────────────┴─────────────┴───────────┘ │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ ☕ Meetup   │ 🎁 Gift     │ 📷 Share  │ │
│  └─────────────┴─────────────┴───────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  📌 Remember This                           │
│  "Loves hiking. New puppy (Charlie).        │
│   Vegetarian. Birthday Nov 15.              │
│   Considering career switch to UX"          │
│                                             │
└─────────────────────────────────────────────┘
```

**Key Differences**:
- ✅ **Relationship-focused** - Friendship length, connection strength
- ✅ **Personal terminology** - "Good Friend", "Catch-up", "Memories"
- ✅ **Life events** - Birthday reminders, gift ideas
- ✅ **Action items** - Coffee meetup, gift shopping, sharing
- ✅ **AI suggestions** - Reconnection ideas, conversation starters
- ✅ **Emotional tone** - Warm, friendly, caring

**Endpoints Used**:
```typescript
GET /v1/contacts/:id/events - Birthdays, anniversaries
GET /v1/analysis/:id/interests - Topics, hobbies, preferences
POST /v1/compose?context=personal&tone=casual
GET /v1/contacts/:id/memories - Shared experiences
```

---

### 🌐 Networking Version

```
┌─────────────────────────────────────────────┐
│  ← Back          Jennifer Martinez     ⋮    │
├─────────────────────────────────────────────┤
│         [JM]                                │
│    Jennifer Martinez                        │
│   Creative Design Studio • Senior Designer  │
│                                             │
│   🌟 STRONG CONNECTION  •  Met at UX Conf  │
│   ⚠️ Follow-up overdue (45 days)           │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🚀 Networking Opportunities                │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 1. Request Introduction 🤝             │ │
│  │                                       │ │
│  │   "Hi Jennifer, enjoyed meeting you    │ │
│  │    at UX Conf. Would you be open to   │ │
│  │    introducing me to your colleague   │ │
│  │    Sarah (VP of Design)?"             │ │
│  │                                       │ │
│  │   [✏️ Edit & Send]  [✨ Regenerate]    │ │
│  │   Potential intro: Sarah Chen (VP)    │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 2. Share Portfolio Update 📊           │ │
│  │                                       │ │
│  │   You mentioned: "Send portfolio"     │ │
│  │   Suggested: Case study + LinkedIn    │ │
│  │   Best time: Tuesday morning          │ │
│  │                                       │ │
│  │   [📤 Share Now]  [⏭️  Schedule]       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 3. Invite to Industry Event 🎟️         │ │
│  │                                       │ │
│  │   Upcoming: Design Week NYC           │ │
│  │   When: Nov 10-12                     │ │
│  │   Why: Her interests match perfectly  │ │
│  │                                       │ │
│  │   [✉️ Send Invite]  [⏭️  Skip]         │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  💡 More Network Moves                     │
│  • Endorse on LinkedIn (5 skills)          │
│  • Share her recent article                │
│  • Connect her with Mike (mutual interest) │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Network Value                           │
│                                             │
│  Connection strength: Strong 🌟             │
│  Mutual connections: 12                     │
│  Industry influence: High                   │
│  Potential intros: 3 valuable               │
│  Career alignment: UX Design                │
│                                             │
│  [View Network Map ▸]                       │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🎯 Networking Actions                      │
│                                             │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ 💬 Message  │ 🤝 Intro    │ 📝 Note   │ │
│  └─────────────┴─────────────┴───────────┘ │
│  ┌─────────────┬─────────────┬───────────┐ │
│  │ ☕ Coffee   │ 📊 Share    │ 🎟️ Event  │ │
│  └─────────────┴─────────────┴───────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  📌 Key Context                             │
│  "Senior Designer at top agency. Expertise: │
│   UI/UX, branding. Interested in freelance │
│   opportunities. Can intro to VP of Design" │
│                                             │
└─────────────────────────────────────────────┘
```

**Key Differences**:
- ✅ **Opportunity-focused** - Introductions, career moves, mutual value
- ✅ **Professional terminology** - "Connection strength", "Network value", "Industry influence"
- ✅ **Career metrics** - Mutual connections, intro potential
- ✅ **Action items** - LinkedIn endorsement, event invites, portfolio sharing
- ✅ **AI suggestions** - Strategic networking moves, intro requests
- ✅ **Professional tone** - Respectful, value-oriented

**Endpoints Used**:
```typescript
GET /v1/analysis/:id/network - Mutual connections, intro opportunities
GET /v1/analysis/:id/influence - Industry influence score
POST /v1/compose?context=professional&purpose=intro_request
GET /v1/contacts/:id/shared-connections - Mutual network
```

---

## ICP Detection & Onboarding

### Smart Detection Based on User Behavior

```typescript
// Analyze user's contacts and interactions to auto-detect ICP
function detectUserICP(user) {
  const contacts = user.contacts;
  
  // Business indicators
  const hasDealValues = contacts.some(c => c.deal_value);
  const usesPipeline = contacts.some(c => c.pipeline_stage);
  const tracksRevenue = user.interactions.some(i => i.metadata?.revenue);
  
  // Personal indicators
  const hasBirthdays = contacts.some(c => c.birthday);
  const hasFamily = contacts.some(c => c.tags?.includes('family'));
  const casualTone = user.messages.some(m => m.tone === 'casual');
  
  // Networking indicators
  const hasLinkedIn = contacts.some(c => c.linkedin_url);
  const tracksIntros = user.interactions.some(i => i.kind === 'introduction');
  const attendsEvents = contacts.some(c => c.source?.includes('conference'));
  
  // Score each ICP
  const scores = {
    business: hasDealValues * 3 + usesPipeline * 2 + tracksRevenue * 2,
    personal: hasBirthdays * 2 + hasFamily * 3 + casualTone * 1,
    networking: hasLinkedIn * 2 + tracksIntros * 3 + attendsEvents * 2,
  };
  
  // Return primary ICP
  return Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );
}
```

### Onboarding Flow

```
┌─────────────────────────────────────────────┐
│         Welcome to EverReach! 👋            │
│                                             │
│  What best describes how you'll use this?   │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  🏢 Business & Sales                   │ │
│  │  Close deals, manage pipeline,         │ │
│  │  track revenue                          │ │
│  │                                         │ │
│  │  [Select]                               │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  👥 Personal Relationships             │ │
│  │  Stay connected with friends,          │ │
│  │  family, mentors                        │ │
│  │                                         │ │
│  │  [Select]                               │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  🌐 Professional Networking            │ │
│  │  Grow career network, find             │ │
│  │  opportunities                          │ │
│  │                                         │ │
│  │  [Select]                               │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [I use it for multiple purposes]          │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Ad Positioning by ICP

### 🏢 Business/Sales Ads

**Tagline**: "Never lose a deal to poor follow-up"

**Messaging**:
- "Close 30% more deals with AI-powered relationship management"
- "Your sales CRM + AI copilot = more revenue"
- "Stop forgetting to follow up. Let AI remind you."
- "Turn cold leads into closed deals"

**Ad Platforms**:
- LinkedIn (B2B targeting)
- Product Hunt
- Sales newsletters (SaaStr, Sales Hacker)
- G2, Capterra

**Landing Page Focus**:
- Pipeline management
- Revenue tracking
- Win rate optimization
- Deal intelligence

**Pricing Anchor**: **$29/mo** (positioned against Salesforce $75/mo)

---

### 👥 Personal Relationships Ads

**Tagline**: "Be a better friend, effortlessly"

**Messaging**:
- "Never forget a birthday or anniversary again"
- "The app that helps you stay connected with the people who matter"
- "Like a personal assistant for your friendships"
- "Life gets busy. Your relationships don't have to suffer."

**Ad Platforms**:
- Instagram/Facebook (personal use)
- Reddit (r/productivity, r/selfimprovement)
- Lifestyle blogs
- Podcasts (Tim Ferriss, productivity focused)

**Landing Page Focus**:
- Birthday reminders
- Stay-in-touch alerts
- Relationship health
- Meaningful connections

**Pricing Anchor**: **$9/mo** (positioned as "coffee per month" value)

---

### 🌐 Networking/Career Ads

**Tagline**: "Turn networking into career growth"

**Messaging**:
- "Stop wasting networking events. Actually follow up."
- "Your network is your net worth. Manage it like one."
- "Land your dream job through better relationship management"
- "Go from meeting people to making meaningful connections"

**Ad Platforms**:
- LinkedIn (career-focused)
- Twitter/X (professional)
- Career newsletters (The Hustle, Morning Brew)
- Conference sponsorships

**Landing Page Focus**:
- Introduction tracking
- Network mapping
- Career opportunities
- Professional growth

**Pricing Anchor**: **$19/mo** (positioned as "career investment")

---

## Multi-ICP Strategy (Recommended)

### Tiered Approach

```typescript
// User settings
interface UserProfile {
  primary_use_case: 'business' | 'personal' | 'networking';
  contact_tags: {
    business: string[];   // 'client', 'prospect', 'partner'
    personal: string[];   // 'friend', 'family', 'mentor'
    networking: string[]; // 'connection', 'intro', 'colleague'
  };
}

// Adapt UI per contact
function getContactViewMode(contact, userProfile) {
  // If contact has tags, use those
  if (contact.tags.some(t => userProfile.contact_tags.business.includes(t))) {
    return 'business';
  }
  if (contact.tags.some(t => userProfile.contact_tags.personal.includes(t))) {
    return 'personal';
  }
  if (contact.tags.some(t => userProfile.contact_tags.networking.includes(t))) {
    return 'networking';
  }
  
  // Fallback to user's primary use case
  return userProfile.primary_use_case;
}
```

### Mixed Mode Example

```
Contact: Jennifer Martinez
Tags: ['client', 'friend']

Shows BOTH:
- Business context (deal value, pipeline)
- Personal context (birthday, shared interests)

UI adapts to show relevant sections only.
```

---

## Implementation Recommendations

### Phase 1: Single ICP (Choose One)
Start with **Business/Sales** (highest willingness to pay, clearest ROI)

### Phase 2: Add Toggle
Let users switch modes:
```
Settings → Default View → Business | Personal | Networking
```

### Phase 3: Per-Contact Intelligence
Automatically detect contact type and adapt UI:
```typescript
// Smart detection
if (contact.deal_value) show('business_mode');
if (contact.birthday) show('personal_mode');
if (contact.met_at?.includes('conference')) show('networking_mode');
```

### Phase 4: Hybrid Mode
Show all relevant data regardless of mode, but prioritize based on ICP.

---

## Summary

**The same contact detail page can serve 3 completely different ICPs by**:
1. ✅ Changing terminology (Deal vs Friend vs Connection)
2. ✅ Prioritizing different metrics (Revenue vs Friendship vs Network value)
3. ✅ Surfacing different actions (Quote vs Gift vs Intro)
4. ✅ Adjusting AI tone (Professional vs Casual vs Strategic)
5. ✅ Using different endpoints (Pipeline vs Events vs Network)

**Recommendation**: 
- **Start with Business ICP** (best monetization)
- **Add mode toggle in Settings**
- **Eventually auto-detect per contact** (hybrid approach)

This maximizes market size while maintaining clear positioning for each segment! 🎯
