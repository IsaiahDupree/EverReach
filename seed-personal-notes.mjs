/**
 * Seed Personal Notes - Real-World Use Cases
 * 
 * This script creates sample personal notes showcasing different use cases:
 * - Daily reflections
 * - Meeting notes
 * - Goal tracking
 * - Ideas & brainstorming
 * - Reminders
 * - Project planning
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample notes showcasing different use cases
const sampleNotes = [
  {
    title: "Weekly Team Sync - Q1 Planning",
    content: `**Meeting Date:** Jan 15, 2025
**Attendees:** Sarah, Mike, Jessica

**Key Decisions:**
- Launch new feature by end of Q1
- Focus on mobile-first approach
- Weekly check-ins every Monday 10am

**Action Items:**
- [ ] Sarah: Design mockups by Friday
- [ ] Mike: Technical architecture doc
- [ ] Me: Update project timeline

**Follow-up:** Schedule 1:1 with Sarah to discuss design direction`,
    category: "work",
  },
  {
    title: "Product Ideas - Voice Note Features",
    content: `**Brainstorm Session:** Jan 12, 2025

💡 **Ideas:**
1. **AI-Powered Transcription**
   - Real-time transcription during recording
   - Automatic summarization
   - Extract action items

2. **Voice Search**
   - Search through all voice notes by content
   - Filter by speaker/date/topic

3. **Smart Reminders**
   - Set reminders based on note content
   - "Follow up with John next week" → auto-reminder

4. **Collaboration**
   - Share voice notes with team
   - Add comments/reactions
   - Create shared voice journals

**Next Steps:** Validate with 5 beta users`,
    category: "ideas",
  },
  {
    title: "2025 Goals & Milestones",
    content: `## Professional Goals

**Q1 2025:**
✅ Ship mobile app v2.0
🔄 Reach 1,000 active users
⏳ Secure Series A funding

**Q2 2025:**
- Launch enterprise features
- Hire 3 engineers
- Expand to EU market

## Personal Goals

**Health & Fitness:**
- Run a half marathon (April)
- Meditate 10 min daily
- Cook 3x per week

**Learning:**
- Complete AI/ML course
- Read 12 books this year
- Learn Spanish basics

**Relationships:**
- Weekly date nights
- Monthly family dinners
- Reconnect with old friends`,
    category: "personal",
  },
  {
    title: "Customer Feedback - John's Call",
    content: `**Customer:** John Smith, ABC Corp
**Date:** Jan 10, 2025
**Duration:** 45 minutes

**Feedback:**
- ✅ Loves the voice notes feature
- ✅ Dashboard is intuitive
- ⚠️ Wants better mobile experience
- ⚠️ Needs export to PDF
- ⚠️ Integration with Salesforce

**Quote:** "This saves me 5 hours per week!"

**Pain Points:**
- Slow loading on mobile data
- Can't access offline
- Missing bulk actions

**Opportunities:**
- Enterprise plan ($500/mo)
- Referral to 3 other companies
- Case study participant

**Action Items:**
- Send mobile beta invite
- Share roadmap for integrations
- Schedule demo with VP of Sales`,
    category: "work",
  },
  {
    title: "Daily Reflection - Jan 14, 2025",
    content: `**Today's Wins:**
- Closed deal with TechCorp ($50k ARR)
- Great 1:1 with Sarah - she's ready for promotion
- Finally fixed the performance bug

**Challenges:**
- Meeting ran over, missed gym
- Lots of context switching today
- Need to delegate more

**Gratitude:**
- Amazing team support during demo
- Positive user feedback
- Coffee chat with mentor

**Tomorrow's Focus:**
1. Product roadmap planning
2. Review hiring pipeline
3. Finish Q1 OKRs

**Energy Level:** 7/10
**Mood:** Productive & optimistic`,
    category: "personal",
  },
  {
    title: "Marketing Campaign Ideas - Q1",
    content: `## Campaign: "Never Drop the Ball"

**Target Audience:**
- Sales professionals
- Consultants
- Relationship managers
- Age: 28-45
- Tech-savvy

**Channels:**
- LinkedIn Ads ($5k budget)
- Product Hunt launch
- Content marketing (blog + SEO)
- Email drip campaign

**Content Ideas:**
- "5 Ways to Remember Every Client Detail"
- "The CRM for People Who Hate CRMs"
- Customer success stories (video)
- Free tools: Relationship Health Checker

**Metrics:**
- 500 sign-ups
- 15% trial → paid conversion
- $20k MRR from campaign

**Timeline:**
- Week 1: Creative assets
- Week 2: Landing page
- Week 3: Ad launch
- Week 4: Optimize & scale`,
    category: "work",
  },
  {
    title: "Book Notes - Atomic Habits",
    content: `**Author:** James Clear
**Rating:** ⭐⭐⭐⭐⭐

**Key Takeaways:**

1. **Identity-Based Habits**
   - Don't focus on goals, focus on identity
   - "I'm a runner" > "I want to run a marathon"
   
2. **The 4 Laws:**
   - Make it obvious
   - Make it attractive
   - Make it easy
   - Make it satisfying

3. **1% Better Every Day**
   - Small improvements compound
   - Focus on systems, not goals
   - Environment shapes behavior

**Applications for EverReach:**
- Make contact updates automatic
- Gamify relationship building
- Daily reminders = habit formation
- Show progress visually

**Personal Applications:**
- Put gym clothes by bed (make it obvious)
- 2-minute rule for meditation
- Track habits in app
- Weekly review routine`,
    category: "learning",
  },
  {
    title: "Weekend Project - Home Automation",
    content: `**Goal:** Smart home setup on a budget

**Shopping List:**
- [ ] Smart bulbs (x6) - $60
- [ ] Smart plugs (x4) - $40
- [ ] Door sensors (x3) - $35
- [ ] Motion sensor - $25
**Total:** ~$160

**Automation Ideas:**
1. Morning routine
   - Lights on at 7am
   - Coffee maker starts
   - Weather + calendar on speaker

2. Work mode
   - Office lights warm white
   - Block distractions
   - Focus music playlist

3. Evening wind-down
   - Dim lights at 9pm
   - TV timer
   - Bedroom cool temp

4. Security
   - Alert if door opens when away
   - Motion-activated lights
   - Camera recordings

**Resources:**
- Home Assistant (open source)
- Reddit r/homeautomation
- YouTube tutorials`,
    category: "personal",
  },
  {
    title: "Feature Request Tracking",
    content: `## High Priority

**1. Offline Mode** (12 votes)
- Allow app usage without internet
- Sync when connection restored
- Cache recent data locally

**2. Calendar Integration** (9 votes)
- Sync with Google/Outlook
- Show meetings in timeline
- Auto-create contact interactions

**3. Email Integration** (8 votes)
- Connect Gmail/Outlook
- Track email conversations
- Auto-log interactions

## Medium Priority

**4. Tags & Categories** (6 votes)
- Custom tags for contacts
- Smart filters
- Color coding

**5. Bulk Actions** (5 votes)
- Mass update contacts
- Batch delete
- Export selected

**6. Dark Mode** (4 votes)
- OLED-friendly
- Automatic switching
- Custom themes

## Backlog
- Slack integration
- Chrome extension
- Desktop app
- WhatsApp integration`,
    category: "work",
  },
  {
    title: "Travel Plans - Tokyo Trip",
    content: `**Dates:** March 15-25, 2025
**Travelers:** Me + Alex

## Pre-Trip Checklist
- [x] Book flights (JAL)
- [x] Reserve hotels
- [ ] Get JR Rail Pass
- [ ] Travel insurance
- [ ] Notify bank
- [ ] Download offline maps

## Itinerary

**Day 1-3: Tokyo**
- Shibuya crossing
- TeamLab Borderless
- Tsukiji fish market
- Robot Restaurant

**Day 4-5: Hakone**
- Mt. Fuji view
- Onsen hot springs
- Lake Ashi boat ride

**Day 6-8: Kyoto**
- Fushimi Inari shrine
- Arashiyama bamboo forest
- Geisha district
- Tea ceremony

**Day 9-10: Osaka**
- Street food tour
- Osaka castle
- Dotonbori nightlife

## Budget
- Flights: $1,200
- Hotels: $1,500
- Food: $800
- Activities: $500
- Shopping: $300
**Total:** ~$4,300

## Food Must-Try
- Authentic ramen
- Sushi omakase
- Okonomiyaki
- Takoyaki
- Matcha everything`,
    category: "personal",
  }
];

async function seedPersonalNotes() {
  try {
    console.log('🌱 Starting personal notes seed...\n');

    // Get the test user from auth.users
    const testEmail = process.env.TEST_EMAIL || 'isaiahdupree33@gmail.com';
    
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('❌ Failed to list users:', userError);
      process.exit(1);
    }

    const user = users.find(u => u.email === testEmail);

    if (!user) {
      console.error('❌ User not found:', testEmail);
      console.log('Available users:', users.map(u => u.email).join(', '));
      process.exit(1);
    }

    console.log(`✅ Found user: ${testEmail}`);
    console.log(`   User ID: ${user.id}\n`);

    // Insert notes into persona_notes table
    console.log(`📝 Creating ${sampleNotes.length} personal notes...\n`);

    for (let i = 0; i < sampleNotes.length; i++) {
      const note = sampleNotes[i];
      
      const { data, error} = await supabase
        .from('persona_notes')
        .insert({
          user_id: user.id,
          type: 'text',
          title: note.title,
          body_text: note.content,
          created_at: new Date(Date.now() - (sampleNotes.length - i) * 24 * 60 * 60 * 1000).toISOString(), // Spread across past days
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to create note: ${note.title}`);
        console.error('   Error:', error.message);
      } else {
        console.log(`✅ Created: ${note.title}`);
        console.log(`   Category: ${note.category}`);
        console.log(`   Length: ${note.content.length} chars\n`);
      }
    }

    console.log('\n🎉 Personal notes seed complete!');
    console.log(`📊 Total notes created: ${sampleNotes.length}`);
    console.log('\n📱 Open the app and navigate to Settings → Personal Notes to see them!');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedPersonalNotes();
