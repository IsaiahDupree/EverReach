# External Integration Roadmap

Strategic plan for integrating heavy-hitter apps that automate relationship management and message distribution with human-in-the-loop features.

## 🎯 Integration Philosophy

**Automate the repetitive, involve humans for the sensitive.**

- **Automated**: Warmth scoring, trigger detection, message drafting, scheduling
- **Human-in-the-Loop**: Final approval for bulk sends, sensitive messages, new campaigns
- **Safety First**: Consent tracking, unsubscribe management, deliverability monitoring

---

## 📊 Priority Matrix

| Integration | Impact | Effort | Priority | When |
|-------------|--------|--------|----------|------|
| **Resend** | High | Low | 🔴 **Critical** | Week 1 |
| **Slack** | High | Low | 🔴 **Critical** | Week 1 |
| **Klaviyo** | High | Medium | 🟠 **High** | Week 2 |
| **Twilio SMS** | High | Medium | 🟠 **High** | Week 3 |
| **WhatsApp Cloud** | High | Medium | 🟠 **High** | Week 3 |
| **Flodesk** | Medium | Low | 🟡 **Medium** | Week 6 |
| **Instagram Messaging** | Medium | High | 🟡 **Medium** | Week 7 |
| **Google Calendar** | Medium | Medium | 🟡 **Medium** | Week 6 |
| **Mailchimp** | Medium | Medium | 🟢 **Low** | Week 8 |
| **Clearbit** | Low | Low | 🟢 **Low** | Week 9 |

---

## 🚀 Phase 1: Foundation (Weeks 1-4)

### Week 1: Transactional Email + Approvals

**Resend Integration** 🔴
- **Why First**: Simplest API, 2 req/s clear limit, reliable for transactional
- **Use Cases**:
  - Password resets
  - Magic link sign-ins
  - Receipt emails
  - System notifications
- **API Capabilities**:
  - REST API with clear rate limits (2 req/s)
  - Webhook support (delivery, bounce, complaint)
  - Template support
  - Batch sending
- **Limitations**:
  - 2 req/s hard limit (requires queuing)
  - Primarily transactional (not full marketing automation)
- **Implementation**:
  ```typescript
  // Create Resend provider
  // lib/integrations/providers/resend-provider.ts
  
  async function sendEmail(job: OutboxJob) {
    const resend = new Resend(apiKey);
    
    const result = await resend.emails.send({
      from: job.payload.from,
      to: job.payload.to,
      subject: job.payload.subject,
      html: job.payload.html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    
    return { success: true, response: result };
  }
  ```

**Slack Integration** 🔴
- **Why Critical**: Human approval for bulk/sensitive sends
- **Use Cases**:
  - Approve bulk campaign before sending
  - Review AI-generated messages
  - Alert on high-risk sends (low warmth contacts)
  - Daily digest of pending approvals
- **API Capabilities**:
  - Interactive Block Kit (buttons, modals)
  - Webhooks for button clicks
  - Bot OAuth scopes
  - Rate limits: ~20 rpm for most methods
- **Limitations**:
  - Tier-based rate limits
  - OAuth setup required
- **Implementation**:
  ```typescript
  // Send approval request
  async function requestApproval(job: OutboxJob) {
    await slack.chat.postMessage({
      channel: '#approvals',
      text: 'New campaign needs approval',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Campaign*: ${job.payload.campaign_name}\n*Recipients*: ${job.payload.recipient_count}\n*Risk Score*: ${job.payload.risk_score}/10`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: job.payload.preview,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Approve ✅' },
              style: 'primary',
              value: job.id,
              action_id: 'approve',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Deny ❌' },
              style: 'danger',
              value: job.id,
              action_id: 'deny',
            },
          ],
        },
      ],
    });
  }
  ```

---

### Week 2: Marketing Email Automation

**Klaviyo Integration** 🟠
- **Why**: Industry-leading email marketing with powerful automation
- **Use Cases**:
  - Warmth-based drip campaigns
  - Re-engagement sequences (contacts going cold)
  - Event-triggered campaigns (interaction milestones)
  - Segmentation based on CRM data
- **API Capabilities**:
  - Rich profile/event APIs
  - Flow automation (trigger-based)
  - Segmentation
  - A/B testing
  - SMS support
  - Webhooks for delivery events
- **Limitations**:
  - Rate limits in response headers (must check)
  - API versioning (use revision: 2024-07-15)
  - Some features require paid plans
- **Key Flows to Build**:
  1. **Cold Contact Revival** (Warmth < 25):
     - Day 1: Value-focused email ("Thought this might help")
     - Day 7: Case study or resource
     - Day 14: Soft check-in
  2. **New Contact Onboarding** (Status = 'new'):
     - Day 0: Welcome + set expectations
     - Day 3: Share your story
     - Day 7: Offer value/resource
  3. **Active Nurture** (Status = 'active', Warmth > 50):
     - Monthly check-ins
     - Relevant content shares
     - Event invitations
- **Implementation**:
  ```typescript
  // Sync contact to Klaviyo
  async function syncContact(contact: Contact) {
    await klaviyo.profiles.createOrUpdate({
      data: {
        type: 'profile',
        attributes: {
          email: contact.email,
          properties: {
            warmth_score: contact.warmth_score,
            pipeline: contact.pipeline_stage,
            last_interaction: contact.last_interaction_at,
          },
        },
      },
    });
  }
  
  // Trigger flow based on warmth
  async function triggerWarmthFlow(contactId: string) {
    const contact = await getContact(contactId);
    
    if (contact.warmth_score < 25) {
      await klaviyo.events.create({
        data: {
          type: 'event',
          attributes: {
            profile: { email: contact.email },
            metric: { name: 'Contact Went Cold' },
            properties: {
              warmth_score: contact.warmth_score,
              pipeline: contact.pipeline_stage,
            },
          },
        },
      });
    }
  }
  ```

**Alternative: Flodesk** 🟡
- **Why Consider**: Beautiful templates, simpler than Klaviyo, flat pricing
- **API Capabilities**:
  - Public API + webhooks (recently launched)
  - Lists, subscribers, forms, checkout
  - Template management
- **Limitations**:
  - Less automation than Klaviyo
  - Newer API (fewer features)
- **Use Case**: If you prioritize design over complex automation

---

### Week 3: SMS + WhatsApp

**Twilio SMS Integration** 🟠
- **Why**: Reliable SMS for quick 1:1 nudges
- **Use Cases**:
  - Time-sensitive reminders
  - Quick check-ins (short messages)
  - Appointment confirmations
  - Two-way conversations
- **API Capabilities**:
  - SMS/MMS sending
  - Programmable voice
  - Webhooks for delivery, replies
  - Short codes & long codes
- **Limitations**:
  - **US A2P 10DLC registration REQUIRED**
  - Throughput depends on brand trust score (not flat RPS)
  - Carrier fees per message
  - Must handle opt-ins/opt-outs
- **Critical: A2P 10DLC Setup**:
  1. Register business (Brand)
  2. Register campaign use case
  3. Get trust score (0-100)
  4. Higher score = higher throughput
  5. Low volume: ~1 msg/s
  6. High volume: ~100+ msg/s
- **Implementation**:
  ```typescript
  // Send SMS with opt-out compliance
  async function sendSMS(contact: Contact, message: string) {
    // Check consent
    const hasConsent = await checkConsent(contact.id, 'sms');
    if (!hasConsent) {
      throw new Error('No SMS consent');
    }
    
    // Add opt-out message if marketing
    const fullMessage = message + '\n\nReply STOP to unsubscribe';
    
    const result = await twilio.messages.create({
      body: fullMessage,
      to: contact.phone,
      from: twilioNumber,
      statusCallback: `${baseUrl}/api/webhooks/twilio`,
    });
    
    return result;
  }
  
  // Handle incoming SMS (replies, opt-outs)
  async function handleIncomingSMS(webhook: any) {
    const { From, Body } = webhook;
    
    // Check for STOP/UNSTOP keywords
    if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(Body.toUpperCase())) {
      await unsubscribe(From, 'sms', 'User replied STOP');
    }
    
    // Log as interaction
    await createInteraction({
      contact_id: findContactByPhone(From),
      kind: 'sms',
      direction: 'in',
      content: Body,
    });
  }
  ```

**WhatsApp Cloud API Integration** 🟠
- **Why**: High engagement channel, rich media support
- **Use Cases**:
  - Important updates (higher open rates than email)
  - Rich media (images, documents, videos)
  - Interactive buttons
  - Customer service conversations
- **API Capabilities**:
  - Template messages (pre-approved)
  - Session messages (24-hour window after user initiates)
  - Rich media support
  - Interactive buttons/lists
  - Webhooks for delivery, read receipts, replies
- **Limitations**:
  - **Template approval required** for marketing
  - **Message tiers**: Start at 1K daily unique users, must earn higher tiers
  - **Portfolio-based limits** (Oct 2025) across all numbers
  - **Per-recipient pacing**: 1 msg per 6 seconds to same user
  - **Default throughput**: ~80 msg/s per number (can auto-upgrade to 1000)
- **Message Tiers (Daily Unique Recipients)**:
  - Tier 1: 1,000 (initial)
  - Tier 2: 10,000 (after quality period)
  - Tier 3: 100,000
  - Unlimited (based on quality)
- **Template Management**:
  ```typescript
  // Create template (requires Meta approval)
  const template = {
    name: 'warmth_check_in',
    language: 'en',
    category: 'MARKETING', // or UTILITY, AUTHENTICATION
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, it\'s been a while! {{2}}. Would love to catch up.',
        example: {
          body_text: [['John', 'Saw your recent LinkedIn post']],
        },
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Sure!' },
          { type: 'QUICK_REPLY', text: 'Maybe later' },
        ],
      },
    ],
  };
  
  // Send template message
  async function sendWhatsAppTemplate(contact: Contact, params: string[]) {
    await whatsapp.messages.create({
      messaging_product: 'whatsapp',
      to: contact.whatsapp_number,
      type: 'template',
      template: {
        name: 'warmth_check_in',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: params.map(p => ({ type: 'text', text: p })),
          },
        ],
      },
    });
  }
  ```

---

### Week 4: Testing & Refinement

- **End-to-end testing**: Email → SMS → WhatsApp flows
- **Load testing**: 1000+ contacts in outbox
- **Approval flow testing**: Slack interactive buttons
- **Monitoring**: Set up alerts for failures, rate limits
- **Documentation**: Internal runbooks for common issues

---

## 🎨 Phase 2: Social + Calendar (Weeks 5-8)

### Week 5: Instagram DM Automation

**Instagram Messaging API** 🟡
- **Why**: Reach contacts where they engage most
- **Use Cases**:
  - DM automation for followers
  - Reply to story mentions
  - Welcome new followers
  - Limited promotional outreach
- **API Capabilities**:
  - Send/receive messages
  - Story mentions webhook
  - Rich media (images, videos)
  - Instagram Professional account required
- **Limitations**:
  - **300 calls/s per professional account** (messaging)
  - **100 posts/day via API** (publishing)
  - Must follow Meta's 24-hour messaging window policy for some message types
  - Webhooks required (no polling)
- **Implementation**: Similar to WhatsApp but more restrictive

### Week 6: Calendar-Driven Nudges

**Google Calendar Integration** 🟡
- **Why**: Auto-trigger follow-ups after meetings
- **Use Cases**:
  - Post-meeting thank you (automated)
  - Pre-meeting prep reminder
  - Missed call follow-up
  - Schedule-based check-ins
- **API Capabilities**:
  - Watch channels (push notifications)
  - Read calendar events
  - Create/update events
  - Standard API quotas
- **Automation Flow**:
  ```typescript
  // Watch for calendar events
  async function setupCalendarWatch(userId: string) {
    const watch = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: crypto.randomUUID(),
        type: 'web_hook',
        address: `${baseUrl}/api/webhooks/google-calendar`,
        expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    
    // Store watch channel
    await storeChannelId(userId, watch.data.id, watch.data.resourceId);
  }
  
  // Handle calendar webhook
  async function handleCalendarChange(webhook: any) {
    const events = await fetchRecentEvents();
    
    for (const event of events) {
      if (event.status === 'confirmed' && eventJustEnded(event)) {
        // Find contact from attendees
        const contact = await findContactByEmail(event.attendees[0].email);
        
        if (contact) {
          // Queue follow-up message (with approval)
          await queueOutboxJob({
            provider: 'klaviyo',
            job_type: 'send_email',
            contact_id: contact.id,
            requires_approval: true,
            payload: {
              template: 'post_meeting_followup',
              variables: {
                meeting_title: event.summary,
                meeting_date: event.start.dateTime,
              },
            },
          });
        }
      }
    }
  }
  ```

**Microsoft Graph (Outlook Calendar)** 🟡
- Similar capabilities
- Throttling considerations (honor Retry-After)
- Exchange Online limits (~30 emails/min for sending)

---

## 🌟 Phase 3: Enrichment + Advanced (Weeks 9-12)

### Week 9: Contact Enrichment

**Clearbit / People Data Labs / FullContact** 🟢
- **Why**: Auto-improve contact profiles
- **Use Cases**:
  - Fill missing data (company, title, social)
  - Enhance warmth scoring (mutual connections)
  - Better segmentation
- **Capabilities**:
  - Email → full profile
  - Company data
  - Social profiles
  - Role/seniority
- **Limitations**:
  - Rate limits vary by provider
  - Cost per enrichment
  - GDPR/privacy considerations
- **Implementation**:
  ```typescript
  // Enrich on contact creation
  async function enrichContact(contactId: string) {
    const contact = await getContact(contactId);
    
    const enrichment = await clearbit.Enrichment.find({
      email: contact.email,
      stream: true,
    });
    
    if (enrichment) {
      await updateContact(contactId, {
        metadata: {
          ...contact.metadata,
          company: enrichment.company?.name,
          title: enrichment.title,
          seniority: enrichment.seniority,
          linkedin: enrichment.linkedin?.handle,
        },
      });
    }
  }
  ```

### Week 10: Mailchimp (Alternative/Backup)

**Mailchimp Integration** 🟢
- **Why**: Ubiquitous, many users already have accounts
- **Use Cases**:
  - Import existing Mailchimp lists
  - Sync segments
  - Leverage existing campaigns
- **Capabilities**:
  - Marketing API (audiences, campaigns, automations)
  - Transactional API (Mandrill)
  - Templates
  - Segmentation
- **Limitations**:
  - Rate limits apply (per-key throughput)
  - Complex pricing
  - Overlaps with Klaviyo (choose one)

### Week 11-12: Advanced Features

- **Audience Sync** (Meta Custom Audiences, Google Ads)
- **Multi-channel Sequences** (Email → wait 3 days → SMS → wait 1 week → WhatsApp)
- **A/B Testing Framework** (test subject lines, send times, channels)
- **Advanced Reporting** (attribution, ROI per channel)

---

## 🔐 Compliance Checklist (Every Integration)

Before launching ANY integration:
- [ ] **Consent tracking** implemented for channel
- [ ] **Unsubscribe link** in all marketing messages
- [ ] **One-click unsubscribe** header (email)
- [ ] **Opt-out keywords** handled (SMS/WhatsApp: STOP, UNSUBSCRIBE)
- [ ] **SPF/DKIM/DMARC** configured (email)
- [ ] **Rate limits** respected (queuing in place)
- [ ] **PII protection** (audit logs don't leak data)
- [ ] **Approval gates** for bulk sends
- [ ] **Error monitoring** (Sentry/similar)
- [ ] **Deliverability monitoring** (bounce/spam rates)

---

## 📊 Success Metrics

Track these for each integration:
- **Delivery Rate**: % of messages successfully delivered
- **Open Rate**: % opened (email)
- **Response Rate**: % replied (SMS/WhatsApp/IG)
- **Unsubscribe Rate**: < 0.5% target
- **Spam Rate**: < 0.3% target
- **Cost per Send**: Monitor spend
- **Warmth Score Impact**: Does automated outreach improve warmth?
- **Approval Turnaround**: Time from queue → approval → send

---

## 🎯 Recommended First Sprint (Week 1)

**Day 1-2: Infrastructure**
- Run `integration-infrastructure.sql` migration
- Set up webhook gateway route
- Start outbox worker cron

**Day 3-4: Resend**
- Create Resend account
- Configure SPF/DKIM/DMARC
- Build Resend provider module
- Test: Send password reset email

**Day 5: Slack**
- Create Slack app
- Install to workspace
- Build approval flow
- Test: Send approval request, click button

**Result**: By end of Week 1, you can:
- Send transactional emails reliably
- Request human approval via Slack
- Have foundation for any other integration

---

## 🔗 References

- [Resend Docs](https://resend.com/docs)
- [Klaviyo API](https://developers.klaviyo.com/)
- [Twilio Docs](https://www.twilio.com/docs)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Slack API](https://api.slack.com/)
- [Instagram Messaging](https://developers.facebook.com/docs/messenger-platform)
- [Flodesk API](https://developers.flodesk.com/)

---

**Start with Resend + Slack this week. Then add Klaviyo. Then SMS/WhatsApp. Build incrementally!**

Last Updated: 2025-10-09
