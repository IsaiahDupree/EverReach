# Cross-Feature E2E Test Plan

Comprehensive end-to-end tests that verify complete workflows across multiple backend features.

## 🎯 **Test Philosophy**

Cross-feature E2E tests verify that:
1. **Data flows correctly** between features
2. **Side effects** trigger as expected
3. **State changes** propagate properly
4. **Integrations** work together
5. **Real-world workflows** complete successfully

---

## 📋 **Priority 1: Critical User Workflows**

### 1. **Contact Lifecycle E2E**
**Flow**: Create Contact → Log Interaction → Check Warmth → Get Recommendations

**Tests**:
```
✅ Create new contact via API
✅ Verify contact appears in database
✅ Log email interaction for contact
✅ Verify warmth score calculated
✅ Verify warmth band assigned (hot/warm/cooling/cold)
✅ Get daily recommendations includes contact
✅ Check interaction appears in contact history
```

**Endpoints Tested**:
- `POST /api/contacts`
- `POST /api/interactions`
- `GET /api/contacts/[id]` (verify warmth updated)
- `GET /api/recommendations/daily`

**Dependencies**:
- Supabase (database)
- Warmth calculation system
- Recommendation engine

---

### 2. **Campaign Automation E2E**
**Flow**: Create Segment → Create Campaign → Trigger Delivery → Verify Send → Log Interaction

**Tests**:
```
✅ Create contact segment (cold contacts)
✅ Create email campaign targeting segment
✅ Trigger campaign via cron endpoint
✅ Verify email queued in outbox
✅ Verify email sent via Resend
✅ Log interaction for sent email
✅ Verify warmth updated after send
```

**Endpoints Tested**:
- `POST /api/segments` (future)
- `POST /api/campaigns` (future)
- `GET /api/cron/run-campaigns`
- `GET /api/cron/send-email`
- `POST /api/interactions`

**Dependencies**:
- Campaign system
- Resend (email delivery)
- Warmth system
- Interaction logging

---

### 3. **AI Agent → Action E2E**
**Flow**: AI Analysis → Generate Message → Queue Approval → Send → Update Warmth

**Tests**:
```
✅ Analyze contact via AI agent
✅ Get AI recommendations for re-engagement
✅ Generate personalized message with AI
✅ Queue message in outbox (requires approval)
✅ Approve message
✅ Send message via campaign worker
✅ Log interaction
✅ Recompute warmth score
✅ Verify recommendation list updated
```

**Endpoints Tested**:
- `POST /api/v1/agent/analyze/contact`
- `POST /api/v1/agent/compose/smart`
- `POST /api/outbox` (future)
- `POST /api/outbox/[id]/approve` (future)
- `GET /api/cron/send-email`
- `POST /api/interactions`
- `POST /api/warmth/recompute` (future)

**Dependencies**:
- AI agent
- OpenAI API
- Approval workflow
- Campaign delivery
- Warmth system

---

### 4. **Tracking → Analytics → Recommendations E2E**
**Flow**: Track Events → Aggregate Analytics → Generate Recommendations → Track Paywall

**Tests**:
```
✅ Track user events (contact viewed, message sent)
✅ Identify user with properties
✅ Trigger analytics rollup
✅ Verify paywall analytics updated
✅ Get impact summary
✅ Get usage summary
✅ Get plan recommendation
✅ Verify recommendations reflect usage
```

**Endpoints Tested**:
- `POST /api/tracking/events`
- `POST /api/tracking/identify`
- `GET /api/cron/paywall-rollup`
- `GET /api/me/impact-summary`
- `GET /api/me/usage-summary`
- `GET /api/me/plan-recommendation`

**Dependencies**:
- Event tracking
- Analytics aggregation
- Recommendation engine

---

### 5. **Screenshot → Contact → AI Analysis E2E**
**Flow**: Upload Screenshot → Extract Contact → Create Contact → AI Analysis → Suggest Action

**Tests**:
```
✅ Get presigned upload URL
✅ Upload screenshot to storage
✅ Commit upload
✅ Analyze screenshot via AI
✅ Extract contact information
✅ Create contact from extraction
✅ Verify contact in database
✅ Run AI analysis on new contact
✅ Get re-engagement suggestions
```

**Endpoints Tested**:
- `POST /api/uploads/sign`
- `POST /api/files/commit`
- `POST /api/v1/agent/analyze/screenshot`
- `POST /api/contacts`
- `POST /api/v1/agent/analyze/contact`

**Dependencies**:
- File upload (Supabase Storage)
- AI vision (OpenAI)
- Contact creation
- AI agent

---

## 📋 **Priority 2: Advanced Workflows**

### 6. **Webhook → Campaign → Interaction E2E**
**Flow**: Warmth Alert → Webhook Fired → Campaign Triggered → Email Sent

**Tests**:
```
✅ Create webhook subscription (warmth.below_threshold)
✅ Create contact with high warmth
✅ Log no interactions for 30 days
✅ Trigger warmth check cron
✅ Verify warmth drops below threshold
✅ Verify webhook fired
✅ Verify campaign triggered
✅ Verify email sent
✅ Verify interaction logged
```

**Endpoints Tested**:
- `POST /api/webhooks` (future)
- `POST /api/contacts`
- `GET /api/cron/check-warmth-alerts`
- `GET /api/cron/run-campaigns`
- `GET /api/cron/send-email`
- `POST /api/interactions`

**Dependencies**:
- Webhook system
- Warmth alerts
- Campaign automation
- Email delivery

---

### 7. **Multi-Channel Campaign E2E**
**Flow**: Segment → Email + SMS Campaign → Track Delivery → Measure Impact

**Tests**:
```
✅ Create segment (VIP contacts, cold)
✅ Create multi-channel campaign (email + SMS)
✅ Trigger campaign
✅ Verify email queued and sent
✅ Verify SMS queued and sent
✅ Log interactions for both channels
✅ Verify warmth updated for both
✅ Check paywall analytics updated
```

**Endpoints Tested**:
- `POST /api/segments` (future)
- `POST /api/campaigns` (future)
- `GET /api/cron/run-campaigns`
- `GET /api/cron/send-email`
- `GET /api/cron/send-sms`
- `POST /api/interactions`
- `GET /api/me/impact-summary`

**Dependencies**:
- Segmentation
- Campaign system
- Resend + Twilio
- Analytics

---

### 8. **AI Chat → Context Bundle → Action E2E**
**Flow**: Chat with AI → Fetch Context → Generate Response → Take Action

**Tests**:
```
✅ Create conversation
✅ Send message to AI about a contact
✅ Verify AI fetches context bundle
✅ Verify AI has warmth/interaction data
✅ AI suggests re-engagement action
✅ Execute suggested action (send message)
✅ Verify action logged
✅ Continue conversation
```

**Endpoints Tested**:
- `POST /api/v1/agent/conversation`
- `POST /api/v1/agent/chat`
- `GET /api/v1/contacts/[id]/context-bundle` (future - Public API)
- `POST /api/v1/agent/compose/smart`
- `POST /api/interactions`

**Dependencies**:
- AI agent
- Context bundle
- OpenAI API
- Action execution

---

### 9. **Developer Notifications → Activity Tracking E2E**
**Flow**: User Activity → Event Tracking → Digest Aggregation → Email Notification

**Tests**:
```
✅ Track multiple user events
✅ Create dev notification subscription
✅ Trigger activity digest cron
✅ Verify digest email sent
✅ Verify digest contains correct stats
✅ Verify event counts accurate
✅ Check email HTML rendering
```

**Endpoints Tested**:
- `POST /api/tracking/events`
- `POST /api/admin/dev-notifications`
- `GET /api/admin/dev-notifications`
- `GET /api/cron/dev-activity-digest`

**Dependencies**:
- Event tracking
- Developer notifications
- Email delivery

---

### 10. **Lead Scoring → Recommendations → AI Chat E2E**
**Flow**: Score Leads → Generate Recs → Chat with AI → Get Prioritized Actions

**Tests**:
```
✅ Create multiple contacts with varied warmth
✅ Log interactions for some contacts
✅ Trigger lead scoring cron
✅ Verify lead scores calculated
✅ Trigger daily recommendations cron
✅ Get recommendations via API
✅ Chat with AI about recommendations
✅ AI suggests prioritized actions
✅ Execute top recommendation
```

**Endpoints Tested**:
- `POST /api/contacts` (multiple)
- `POST /api/interactions` (multiple)
- `GET /api/cron/score-leads`
- `GET /api/cron/daily-recs`
- `GET /api/recommendations/daily`
- `POST /api/v1/agent/chat`

**Dependencies**:
- Lead scoring
- Recommendation engine
- AI agent

---

## 📋 **Priority 3: Edge Cases & Error Handling**

### 11. **Failure Recovery E2E**
**Tests**:
```
✅ Campaign fails to send → Verify retry logic
✅ Webhook delivery fails → Verify retry + backoff
✅ AI API fails → Verify graceful degradation
✅ Email service down → Verify queuing
✅ SMS service down → Verify queuing
✅ Database timeout → Verify transaction rollback
```

---

### 12. **Rate Limiting & Throttling E2E**
**Tests**:
```
✅ Exceed API rate limit → Verify 429 response
✅ Exceed campaign send limit → Verify throttling
✅ Concurrent requests → Verify proper handling
✅ Retry-After header → Verify correct value
```

---

### 13. **Data Consistency E2E**
**Tests**:
```
✅ Create contact → Delete contact → Verify interactions cleaned up
✅ Send message → Verify all tables updated (outbox, interactions, warmth)
✅ Warmth recalculation → Verify consistent across queries
✅ Segment membership → Verify updates on contact change
```

---

## 🛠️ **Implementation Checklist**

### **Phase 1: Foundation** (Week 1)
- [ ] Contact Lifecycle E2E
- [ ] Tracking → Analytics E2E
- [ ] AI Agent → Action E2E

### **Phase 2: Campaigns** (Week 2)
- [ ] Campaign Automation E2E
- [ ] Multi-Channel Campaign E2E
- [ ] Webhook → Campaign E2E

### **Phase 3: Advanced** (Week 3)
- [ ] Screenshot → Contact E2E
- [ ] AI Chat → Context E2E
- [ ] Developer Notifications E2E
- [ ] Lead Scoring E2E

### **Phase 4: Reliability** (Week 4)
- [ ] Failure Recovery E2E
- [ ] Rate Limiting E2E
- [ ] Data Consistency E2E

---

## 📁 **Test File Structure**

```
test/e2e/
├── workflows/
│   ├── contact-lifecycle.mjs
│   ├── campaign-automation.mjs
│   ├── ai-agent-action.mjs
│   ├── tracking-analytics.mjs
│   ├── screenshot-contact.mjs
│   ├── webhook-campaign.mjs
│   ├── multi-channel.mjs
│   ├── ai-chat-context.mjs
│   ├── dev-notifications.mjs
│   └── lead-scoring.mjs
├── reliability/
│   ├── failure-recovery.mjs
│   ├── rate-limiting.mjs
│   └── data-consistency.mjs
├── _shared-e2e.mjs
├── run-e2e-tests.mjs
└── E2E_TEST_RESULTS.md
```

---

## 🎯 **Success Criteria**

Each E2E test must:
1. ✅ Create real data in database
2. ✅ Verify data propagation across features
3. ✅ Test actual API integrations (no mocks)
4. ✅ Clean up test data after completion
5. ✅ Generate detailed test reports
6. ✅ Complete in < 30 seconds
7. ✅ Be idempotent (can run multiple times)
8. ✅ Handle timeouts gracefully

---

## 📊 **Reporting**

Each E2E test generates:
- Markdown report with step-by-step results
- JSON summary with timing metrics
- Screenshots (if visual components tested)
- Error logs (if failures occur)
- Data cleanup verification

---

## 🚀 **Next Steps**

1. **Implement Phase 1** (3 critical workflows)
2. **Set up E2E test runner** (parallel execution)
3. **Configure test database** (separate from prod)
4. **Add cleanup utilities** (prevent data pollution)
5. **Create CI/CD integration** (run on deploy)

---

**Total E2E Tests Planned**: 13 workflows, ~150+ test assertions  
**Estimated Coverage**: 85%+ of critical user paths  
**Run Time**: ~5-10 minutes for full suite
