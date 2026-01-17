# 🖼️ AI Image Analysis E2E Test Plan

**Date**: October 25, 2025  
**Backend**: `https://ever-reach-be.vercel.app`  
**Frontend**: `https://www.everreach.app`

---

## 📋 **Complete E2E Workflow**

### **User Journey:**
Screenshot/Image → AI Analysis (GPT-4 Vision) → Extract Contact Info → Create Contact → AI Insights → Smart Messaging

---

## 🔌 **All API Endpoints Required**

### **1. Upload & Storage Endpoints**

#### **POST `/uploads/sign`**
Get presigned URL for file upload
```json
Request:
{
  "filename": "screenshot-test.png",
  "content_type": "image/png",
  "size": 102400
}

Response:
{
  "upload_url": "https://storage.../...",
  "file_id": "uuid-...",
  "expires_at": "2025-10-25T..."
}
```

#### **POST `/uploads/{file_id}/commit`**
Commit upload after file is uploaded
```json
Response:
{
  "success": true,
  "file_url": "https://...",
  "file_id": "uuid-..."
}
```

---

### **2. AI Vision & Analysis Endpoints**

#### **POST `/v1/agent/analyze/screenshot`**
Analyze screenshot with GPT-4 Vision
```json
Request:
{
  "image_url": "https://everreach.app/uploads/...",
  "extract_type": "contact_info",
  "instructions": "Extract contact details from business card"
}

Response:
{
  "extracted_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "company": "Acme Corp",
    "title": "CEO",
    "linkedin": "linkedin.com/in/johndoe"
  },
  "confidence": 0.95,
  "raw_analysis": "This appears to be a business card..."
}
```

#### **GET `/v1/agent/analyze/contact?contact_id={id}`**
Run AI analysis on contact profile
```json
Response:
{
  "contact_id": "uuid-...",
  "health_score": 85,
  "engagement_level": "high",
  "recommendations": [
    {
      "action": "follow_up",
      "priority": "high",
      "reason": "No contact in 30 days"
    }
  ],
  "insights": {
    "relationship_stage": "active",
    "communication_frequency": "weekly",
    "last_interaction": "2025-10-20"
  }
}
```

---

### **3. Contact Management Endpoints**

#### **POST `/api/contacts`**
Create contact from extracted data
```json
Request:
{
  "name": "John Doe",
  "emails": ["john@example.com"],
  "phones": ["+1-555-0123"],
  "company": "Acme Corp",
  "tags": ["ai_extracted", "screenshot_import"],
  "notes": "Created from screenshot analysis"
}

Response:
{
  "contact": {
    "id": "uuid-...",
    "name": "John Doe",
    "emails": [...],
    "created_at": "2025-10-25T..."
  }
}
```

#### **GET `/api/contacts/{id}`**
Retrieve contact details
```json
Response:
{
  "contact": {
    "id": "uuid-...",
    "name": "John Doe",
    "emails": [...],
    "tags": [...],
    "interactions_count": 0
  }
}
```

#### **DELETE `/api/contacts/{id}`**
Delete test contact (cleanup)

---

### **4. AI Context & Intelligence Endpoints**

#### **GET `/v1/contacts/{id}/context-bundle`**
Get AI context for LLM prompts
```json
Response:
{
  "contact": {
    "name": "John Doe",
    "relationship_history": [...],
    "recent_interactions": [...]
  },
  "context": {
    "prompt_skeleton": "When messaging John...",
    "talking_points": ["recent project", "industry trends"],
    "communication_style": "professional"
  },
  "meta": {
    "token_estimate": 450,
    "last_updated": "2025-10-25T..."
  }
}
```

#### **POST `/v1/agent/compose/smart`**
Generate AI-powered personalized message
```json
Request:
{
  "contact_id": "uuid-...",
  "goal": "re-engage",
  "tone": "professional",
  "context": "following up after conference"
}

Response:
{
  "message": "Hi John, it was great connecting at...",
  "subject": "Following up from TechConf 2025",
  "tone": "professional",
  "confidence": 0.92,
  "reasoning": "Used recent conference context..."
}
```

---

## 🖼️ **Test Scenarios with Real Screenshots**

### **Scenario 1: Business Card Analysis**
- **Input**: Photo of business card
- **Extract**: Name, email, phone, company, title
- **Create**: New contact with extracted info
- **Analyze**: Generate relationship insights
- **Compose**: Draft introduction email

### **Scenario 2: LinkedIn Profile Screenshot**
- **Input**: Screenshot of LinkedIn profile
- **Extract**: Professional details, skills, experience
- **Create**: Enriched contact profile
- **Analyze**: Career trajectory, shared connections
- **Compose**: Networking message

### **Scenario 3: Email Signature**
- **Input**: Screenshot of email with signature
- **Extract**: Contact details from signature block
- **Create**: Contact with communication preferences
- **Analyze**: Previous communication patterns
- **Compose**: Follow-up email

### **Scenario 4: Conference Badge**
- **Input**: Photo of event badge
- **Extract**: Name, company, event context
- **Create**: Event-tagged contact
- **Analyze**: Event networking opportunities
- **Compose**: Post-event follow-up

---

## 🧪 **Test Execution Plan**

### **Step 1: Prepare Test Images**
```bash
# Create test images directory
mkdir -p test/fixtures/screenshots

# Add sample images:
# - business-card.png
# - linkedin-profile.png
# - email-signature.png
# - conference-badge.png
```

### **Step 2: Run E2E Test**
```bash
# Run with actual screenshots
pwsh -ExecutionPolicy Bypass -File run-marketing-tests.ps1

# Or run specific screenshot test
node test/agent/e2e-screenshot-analysis.mjs
```

### **Step 3: Verify All Endpoints**
- ✅ Upload flow (sign → upload → commit)
- ✅ AI vision analysis (GPT-4 Vision)
- ✅ Contact extraction accuracy
- ✅ Contact creation with tags
- ✅ AI relationship analysis
- ✅ Context bundle generation
- ✅ Smart message composition
- ✅ Database verification
- ✅ Cleanup (delete test data)

---

## 📊 **Expected Results**

### **Success Criteria:**
- ✅ 100% endpoint availability
- ✅ < 3s average response time per endpoint
- ✅ 90%+ extraction accuracy for business cards
- ✅ AI message generation in < 5s
- ✅ Context bundle < 1000 tokens
- ✅ All test data cleaned up

### **Metrics to Track:**
- Upload success rate
- Vision API accuracy
- Contact creation rate
- AI analysis latency
- Message quality score
- End-to-end completion time

---

## 🚀 **Ready to Run**

**Command:**
```bash
node test/agent/e2e-screenshot-analysis.mjs
```

**What It Tests:**
1. ✅ File upload with presigned URLs
2. ✅ GPT-4 Vision screenshot analysis
3. ✅ Contact info extraction
4. ✅ Contact CRUD operations
5. ✅ AI-powered relationship analysis
6. ✅ Context-aware message generation
7. ✅ Database verification
8. ✅ Cleanup processes

**Total Endpoints**: 10  
**Expected Coverage**: 100%

---

## 🔧 **Troubleshooting**

### **If Vision API Fails:**
- Check OpenAI API key in environment
- Verify image URL is publicly accessible
- Ensure image format is supported (PNG, JPG, WebP)
- Check token limits (max 100k tokens per request)

### **If Upload Fails:**
- Verify S3/storage bucket permissions
- Check presigned URL expiration
- Ensure file size within limits
- Validate content-type headers

### **If AI Analysis Fails:**
- Check contact exists in database
- Verify sufficient interaction data
- Ensure LLM API keys are valid
- Check rate limits

---

**Status**: Ready to execute ✅  
**Backend**: Deployed and configured  
**Endpoints**: All documented  
**Test Data**: Prepared
