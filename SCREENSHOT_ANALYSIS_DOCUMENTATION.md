# 📸 Screenshot Analysis AI Agent - Complete Documentation

## Overview

The Screenshot Analysis AI Agent uses GPT-4 Vision to analyze message screenshots and extract:
- **OCR Text** - All visible text in the image
- **Message Goals** - Inferred purpose and intent
- **Variables** - Names, companies, topics, events, dates
- **Sentiment & Urgency** - Emotional tone and time sensitivity
- **Template Suggestions** - Recommended response types

This enables users to upload screenshots of messages (emails, DMs, SMS, LinkedIn) and get AI-powered composition assistance.

---

## 🏗️ Architecture

### Core Components

#### 1. **lib/screenshot-agent.ts** - AI Vision Processing
- GPT-4 Vision integration
- OCR text extraction
- Goal type inference with confidence scoring
- Variable extraction (names, topics, companies, dates, projects)
- Sentiment & urgency analysis
- Batch processing support

#### 2. **app/api/v1/agent/analyze/screenshot/route.ts** - API Endpoint
- Rate limiting (20 requests/minute)
- Request validation
- Database persistence (optional)
- Error handling

#### 3. **Database Schema** - screenshot_analyses table
- Stores analysis results
- Links to contacts & message goals
- Tracks confidence, sentiment, urgency
- Processing metadata (tokens, latency, model)

---

## 📡 API Reference

### POST /v1/agent/analyze/screenshot

Analyzes a screenshot using GPT-4 Vision.

**Authentication:** Required (Bearer token)

**Rate Limit:** 20 requests per minute per user

**Request:**
```json
{
  "image_url": "https://example.com/screenshot.png",
  "image_base64": "base64-encoded-image-data",  // Alternative to image_url
  "contact_id": "uuid",                          // Optional: link to contact
  "channel": "email",                            // Optional: email|sms|dm|linkedin
  "context": "Additional context for analysis",  // Optional: max 500 chars
  "save_to_database": true                       // Optional: default true
}
```

**Response:**
```json
{
  "analysis_id": "uuid",  // null if save_to_database=false
  "ocr_text": "Hi John,\n\nI wanted to follow up on our conversation...",
  "inferred_goal": {
    "type": "follow_up",
    "description": "Following up on a previous conversation about collaboration",
    "confidence": 0.92
  },
  "variables": {
    "recipient_name": "John",
    "sender_name": "Jane",
    "company": "Acme Corp",
    "topic": "collaboration opportunity",
    "date_mentioned": "next week"
  },
  "sentiment": "positive",
  "urgency": "medium",
  "suggested_template_type": "follow_up",
  "key_phrases": [
    "looking forward",
    "exciting opportunity",
    "let's schedule"
  ],
  "processing_metadata": {
    "model": "gpt-4o",
    "tokens_used": 1245,
    "latency_ms": 3200
  }
}
```

---

## 🎯 Goal Types

The AI infers one of these goal types:

| Type | Description | Example |
|------|-------------|---------|
| `networking` | Building/maintaining relationships | "Great meeting you at the conference!" |
| `follow_up` | Following up on previous conversation | "Just checking in on the proposal" |
| `introduction` | Making initial connection | "I'd love to connect and learn more" |
| `thank_you` | Expressing gratitude | "Thanks for your time yesterday" |
| `meeting_request` | Requesting/scheduling a meeting | "Are you free next Tuesday?" |
| `check_in` | Casual touch-base | "How have you been?" |
| `collaboration` | Proposing partnership | "I think we could work together on..." |
| `support` | Asking for/offering help | "Could you help me with..." |
| `personal` | Personal conversation | "How's the family?" |
| `business` | Business transaction | "Regarding the invoice..." |
| `other` | Doesn't fit above categories | - |

---

## 🔧 Usage Examples

### Example 1: Basic Screenshot Analysis

```javascript
const response = await fetch('https://ever-reach-be.vercel.app/api/v1/agent/analyze/screenshot', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image_url: 'https://example.com/email-screenshot.png',
    channel: 'email'
  })
});

const result = await response.json();
console.log('Goal:', result.inferred_goal.type);
console.log('Confidence:', result.inferred_goal.confidence);
console.log('Variables:', result.variables);
```

### Example 2: With Contact Context

```javascript
const result = await fetch('/api/v1/agent/analyze/screenshot', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image_url: 'https://example.com/dm-screenshot.png',
    contact_id: 'contact-uuid',
    channel: 'dm',
    context: 'Follow-up after TechConf 2024 meeting'
  })
});
```

### Example 3: Base64 Image Upload

```javascript
const result = await fetch('/api/v1/agent/analyze/screenshot', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image_base64: base64ImageString,
    channel: 'linkedin',
    save_to_database: false  // Don't persist
  })
});
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all agent tests (includes screenshot analysis)
node test/agent/run-all.mjs

# Run only screenshot tests
node test/agent/agent-screenshot-analysis.mjs
```

### Test Coverage

The test suite (`test/agent/agent-screenshot-analysis.mjs`) includes:

- ✅ Basic screenshot analysis
- ✅ Goal type inference (networking, follow-up, etc.)
- ✅ Variable extraction
- ✅ Sentiment & urgency detection
- ✅ Template suggestions
- ✅ Key phrase extraction
- ✅ Database persistence
- ✅ Contact context integration
- ✅ Additional user context
- ✅ Performance tracking
- ✅ Error handling
- ✅ Channel-specific analysis (email, LinkedIn, SMS)

---

## 📊 Database Schema

### screenshot_analyses Table

```sql
CREATE TABLE screenshot_analyses (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    contact_id UUID,
    file_url TEXT,
    status TEXT DEFAULT 'pending',
    ocr_text TEXT,
    inferred_goal_id UUID,
    inferred_goal_text TEXT,
    variables JSONB DEFAULT '{}',
    confidence NUMERIC(3,2),
    sentiment TEXT,
    urgency TEXT,
    suggested_template_type TEXT,
    key_phrases TEXT[],
    processing_metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `owner_user_id` - Query user's analyses
- `contact_id` - Find analyses for specific contact
- `status` - Filter by processing status
- `created_at` - Sort by recency

**RLS Policies:**
- Users can only see/edit their own analyses
- All operations scoped by `auth.uid()`

---

## 🚀 Integration Guide

### Frontend Integration

#### 1. Add to Message Composer

```tsx
import { analyzeScreenshot } from '@/lib/agent-api';

function MessageComposer() {
  const [screenshot, setScreenshot] = useState(null);
  
  async function handleScreenshotUpload(file) {
    // Convert to base64
    const base64 = await fileToBase64(file);
    
    // Analyze
    const analysis = await analyzeScreenshot({
      image_base64: base64,
      contact_id: currentContact?.id,
      channel: 'email'
    });
    
    // Pre-fill message fields
    setGoalType(analysis.inferred_goal.type);
    setVariables(analysis.variables);
    setTone(analysis.sentiment === 'positive' ? 'warm' : 'professional');
  }
  
  return (
    <View>
      <Button onPress={() => pickImage()}>
        📸 Analyze Screenshot
      </Button>
    </View>
  );
}
```

#### 2. Add to Voice Notes Screen

```tsx
function VoiceNoteDetail({ note }) {
  async function analyzeRelatedScreenshot() {
    const analysis = await analyzeScreenshot({
      image_url: note.screenshot_url,
      context: note.transcript
    });
    
    // Show extracted contacts and actions
    console.log('Extracted:', analysis.variables);
    console.log('Goal:', analysis.inferred_goal.description);
  }
  
  return <Button onPress={analyzeRelatedScreenshot}>Analyze Screenshot</Button>;
}
```

#### 3. Add to Contact Detail

```tsx
function ContactDetail({ contactId }) {
  async function analyzeMessageScreenshot(imageUrl) {
    const analysis = await analyzeScreenshot({
      image_url: imageUrl,
      contact_id: contactId,
      channel: 'email'
    });
    
    // Update contact context
    if (analysis.variables.topic) {
      addContactNote(`Discussing: ${analysis.variables.topic}`);
    }
  }
}
```

---

## 🎨 UI/UX Recommendations

### Screenshot Upload Flow

1. **Upload Button**: "📸 Analyze Message Screenshot"
2. **Loading State**: "🤖 Analyzing with AI..." (3-5 seconds)
3. **Results Display**:
   - Goal type with confidence badge
   - Extracted variables (names, topics, dates)
   - Sentiment indicator
   - Suggested template button
4. **Actions**:
   - "Use This Goal"
   - "Copy Variables"
   - "View Full Text"

### Example UI Component

```tsx
<View style={styles.analysisCard}>
  <Text style={styles.title}>📸 Screenshot Analysis</Text>
  
  <View style={styles.goalBadge}>
    <Text>{result.inferred_goal.type}</Text>
    <Text>{(result.inferred_goal.confidence * 100).toFixed(0)}%</Text>
  </View>
  
  <Text style={styles.description}>
    {result.inferred_goal.description}
  </Text>
  
  {result.variables.recipient_name && (
    <Text>To: {result.variables.recipient_name}</Text>
  )}
  
  {result.variables.topic && (
    <Text>Topic: {result.variables.topic}</Text>
  )}
  
  <Button onPress={() => useGoal(result)}>
    Use This Goal ✨
  </Button>
</View>
```

---

## ⚡ Performance & Costs

### Processing Time
- **Average**: 3-5 seconds per screenshot
- **Factors**: Image size, text density, model availability

### Token Usage
- **Average**: 800-1500 tokens per analysis
- **Cost**: ~$0.02-$0.04 per screenshot (GPT-4 Vision pricing)

### Optimization Tips
1. Resize images to max 2000px width before upload
2. Use JPEG instead of PNG for smaller files
3. Batch analyze multiple screenshots when possible
4. Cache results in database (save_to_database: true)

---

## 🔒 Security & Privacy

### Data Handling
- ✅ Images processed via HTTPS
- ✅ No images stored by OpenAI (per API terms)
- ✅ Analysis results saved with RLS policies
- ✅ User data isolated per account

### Best Practices
1. **Don't send sensitive data**: Avoid screenshots with passwords, SSNs, etc.
2. **Use contact_id when available**: Improves analysis accuracy
3. **Delete old analyses**: Clean up after 90 days
4. **Rate limit respect**: Stay within 20 requests/min

---

## 🐛 Troubleshooting

### Common Issues

#### "Invalid image URL"
- Ensure URL is publicly accessible
- Check URL returns 200 status
- Verify image format (PNG, JPEG, GIF, WebP supported)

#### "Low confidence score (<0.5)"
- Image might be blurry or low resolution
- Text might be too small or obscured
- Try adding `context` parameter with additional info

#### "No variables extracted"
- Screenshot might not contain names/topics
- Try different channel type (email vs dm)
- Check if text is visible in OCR

#### "Rate limited"
- Wait for `retryAfter` seconds
- Batch multiple screenshots if possible
- Contact support to increase limit

---

## 📚 Related Features

- **[Voice Note Processing](/api/v1/agent/voice-note/process)** - Extract contacts & actions from audio
- **[Smart Compose](/api/v1/agent/compose/smart)** - AI message generation
- **[Contact Analysis](/api/v1/agent/analyze/contact)** - Relationship intelligence
- **[Message Goals API](/api/v1/message-goals)** - Pre-defined goal templates

---

## 🔮 Future Enhancements

- [ ] Multi-image analysis (email threads)
- [ ] Real-time streaming results
- [ ] Custom goal type training
- [ ] Screenshot comparison (before/after)
- [ ] Integration with calendar apps
- [ ] Handwriting recognition
- [ ] Multi-language support
- [ ] Screenshot editing before analysis

---

## 🤝 Support

### Issues
- Check Vercel logs for errors
- Verify OPENAI_API_KEY is configured
- Ensure screenshot_analyses table exists
- Test with sample images first

### Need Help?
- Review test suite: `test/agent/agent-screenshot-analysis.mjs`
- Check agent system docs: `AGENT_SYSTEM_DOCUMENTATION.md`
- Verify database migrations ran successfully

---

**Built with GPT-4 Vision** 🚀
