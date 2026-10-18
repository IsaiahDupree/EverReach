# Screenshot Analysis API

Extract contact information and context from screenshots using AI vision.

**Base Endpoint**: `/v1/agent/screenshot`

---

## Overview

Screenshot analysis helps you:
- **Extract contact info** - Pull names, emails, phones from images
- **Business card OCR** - Digitize business cards instantly
- **LinkedIn/social profiles** - Extract profile data
- **Email screenshots** - Capture conversation context
- **Meeting notes** - Extract attendees and action items

---

## Analyze Screenshot

Process a screenshot with GPT-4 Vision to extract structured data.

```http
POST /v1/agent/screenshot/analyze
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image_url` | string | ✅ Yes | Public URL to image |
| `image_base64` | string | Alternative | Base64-encoded image |
| `context` | string | No | Hint about image content |

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/agent/screenshot/analyze',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image_url: 'https://example.com/business-card.jpg',
      context: 'business_card'
    })
  }
);

const result = await response.json();
```

### Response

```json
{
  "analysis": {
    "type": "business_card",
    "confidence": 0.92,
    "contacts": [
      {
        "name": "Sarah Chen",
        "title": "VP of Engineering",
        "company": "Acme Inc",
        "email": "sarah.chen@acme.com",
        "phone": "+1 (555) 123-4567",
        "linkedin": "linkedin.com/in/sarachen",
        "location": "San Francisco, CA",
        "confidence": 0.95
      }
    ],
    "text_content": "Full OCR text extracted...",
    "suggested_action": "create_contact",
    "notes": "Business card from conference"
  },
  "usage": {
    "model": "gpt-4-vision-preview",
    "tokens": 850
  }
}
```

---

## Screenshot Types

### 1. Business Card

```typescript
{
  "type": "business_card",
  "contacts": [{
    "name": "John Doe",
    "title": "CEO",
    "company": "TechCorp",
    "email": "john@techcorp.com",
    "phone": "+1-555-0100",
    "website": "techcorp.com"
  }]
}
```

### 2. LinkedIn Profile

```typescript
{
  "type": "linkedin_profile",
  "contacts": [{
    "name": "Jane Smith",
    "title": "Product Manager at Google",
    "location": "Mountain View, CA",
    "linkedin": "linkedin.com/in/janesmith",
    "connections": 500,
    "about": "Passionate about building great products..."
  }]
}
```

### 3. Email Thread

```typescript
{
  "type": "email",
  "contacts": [{
    "name": "Mike Johnson",
    "email": "mike@example.com"
  }],
  "subject": "Re: Partnership Discussion",
  "date": "2025-01-15",
  "summary": "Mike confirmed interest in partnership...",
  "action_items": [
    "Schedule follow-up call next week"
  ]
}
```

### 4. Meeting Notes / Whiteboard

```typescript
{
  "type": "meeting_notes",
  "contacts": [
    { "name": "Alice", "role": "attendee" },
    { "name": "Bob", "role": "attendee" }
  ],
  "topics": ["Q1 planning", "Budget review"],
  "action_items": [
    "Alice: Send proposal by Friday",
    "Bob: Review budget spreadsheet"
  ]
}
```

---

## Common Patterns

### 1. Business Card Capture (Mobile)

```typescript
import { Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

async function captureBusinessCard() {
  // Take photo
  const photo = await cameraRef.takePictureAsync();
  
  // Resize for faster upload
  const resized = await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ resize: { width: 1000 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  // Upload to storage
  const imageUrl = await uploadImage(resized.uri);
  
  // Analyze with AI
  const { analysis } = await fetch('/v1/agent/screenshot/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image_url: imageUrl,
      context: 'business_card'
    })
  }).then(r => r.json());
  
  // Create contact from extracted data
  if (analysis.contacts.length > 0) {
    const contact = analysis.contacts[0];
    await createContact({
      display_name: contact.name,
      emails: [contact.email],
      phones: [contact.phone],
      company: contact.company,
      title: contact.title
    });
  }
}
```

### 2. LinkedIn Profile Import

```typescript
async function importLinkedInProfile(screenshotUrl: string) {
  const { analysis } = await fetch('/v1/agent/screenshot/analyze', {
    method: 'POST',
    body: JSON.stringify({
      image_url: screenshotUrl,
      context: 'linkedin_profile'
    })
  }).then(r => r.json());
  
  if (analysis.type === 'linkedin_profile') {
    const profile = analysis.contacts[0];
    
    // Create or update contact
    await createContact({
      display_name: profile.name,
      title: profile.title,
      company: profile.company,
      linkedin_url: profile.linkedin,
      location: profile.location,
      notes: profile.about
    });
  }
}
```

### 3. Email Screenshot Context

```typescript
async function saveEmailContext(screenshotUrl: string) {
  const { analysis } = await fetch('/v1/agent/screenshot/analyze', {
    method: 'POST',
    body: JSON.stringify({
      image_url: screenshotUrl,
      context: 'email'
    })
  }).then(r => r.json());
  
  // Create interaction from email
  if (analysis.type === 'email') {
    await createInteraction({
      contact_id: findContactByEmail(analysis.contacts[0].email),
      kind: 'email',
      content: analysis.summary,
      occurred_at: analysis.date
    });
  }
}
```

---

## Base64 Image Support

For client-side images without uploading:

```typescript
// Convert image to base64
const base64 = await fileToBase64(imageFile);

const { analysis } = await fetch('/v1/agent/screenshot/analyze', {
  method: 'POST',
  body: JSON.stringify({
    image_base64: base64,
    context: 'business_card'
  })
}).then(r => r.json());
```

---

## React Component Example

```typescript
import { useState } from 'react';

export function BusinessCardScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleImageUpload = async (file: File) => {
    const base64 = await fileToBase64(file);
    setImage(base64);
    setLoading(true);
    
    try {
      const result = await fetch('/v1/agent/screenshot/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_base64: base64,
          context: 'business_card'
        })
      }).then(r => r.json());
      
      setAnalysis(result.analysis);
    } finally {
      setLoading(false);
    }
  };
  
  const createContactFromCard = async () => {
    const contact = analysis.contacts[0];
    await fetch('/v1/contacts', {
      method: 'POST',
      body: JSON.stringify({
        display_name: contact.name,
        emails: [contact.email],
        phones: [contact.phone],
        company: contact.company,
        title: contact.title
      })
    });
  };
  
  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={e => handleImageUpload(e.target.files[0])}
      />
      
      {loading && <p>Analyzing...</p>}
      
      {analysis && (
        <div>
          <h3>Detected Contact</h3>
          <p>{analysis.contacts[0].name}</p>
          <p>{analysis.contacts[0].title} at {analysis.contacts[0].company}</p>
          <p>{analysis.contacts[0].email}</p>
          <button onClick={createContactFromCard}>Add to Contacts</button>
        </div>
      )}
    </div>
  );
}
```

---

## Context Hints

Provide context for better accuracy:

| Context | Use Case | Expected Output |
|---------|----------|----------------|
| `business_card` | Business cards | Name, title, company, contact info |
| `linkedin_profile` | LinkedIn screenshots | Profile data, experience, connections |
| `email` | Email screenshots | Sender, subject, summary, action items |
| `meeting_notes` | Whiteboard/notes photos | Attendees, topics, action items |
| `contact_list` | Contact list screenshots | Multiple contacts |
| `signature` | Email signatures | Contact info from signature block |

---

## Best Practices

### 1. Image Quality

```typescript
// Ensure good image quality
const options = {
  quality: 0.8,           // High quality
  maxWidth: 2000,         // Large enough for OCR
  format: 'jpeg'
};
```

### 2. Review Before Creating

```typescript
// Always show extracted data for user review
const { analysis } = await analyzeScreenshot(imageUrl);

showReviewModal({
  extractedData: analysis.contacts[0],
  onConfirm: (editedData) => {
    createContact(editedData);
  }
});
```

### 3. Handle Low Confidence

```typescript
if (analysis.confidence < 0.7) {
  showWarning('Low confidence extraction. Please review carefully.');
}
```

---

## Performance

- **Processing time**: 3-8 seconds
- **Token usage**: 800-1500 tokens
- **Cost per image**: ~$0.01-0.02
- **Max image size**: 20MB
- **Supported formats**: JPEG, PNG, WebP

---

## Error Handling

```typescript
try {
  const { analysis } = await analyzeScreenshot(imageUrl);
} catch (error) {
  if (error.message.includes('image_url')) {
    // Image not accessible
    console.error('Please upload image to accessible URL');
  } else if (error.message.includes('tokens')) {
    // Image too large/complex
    console.error('Image too large, please resize');
  }
}
```

---

## Next Steps

- [Agent Chat](./15-agent-chat.md) - Ask about screenshot content
- [Voice Notes](./16-voice-notes.md) - Combine with voice context
- [Contacts](./02-contacts.md) - Create contacts from screenshots
