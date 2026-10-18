# Contact Extensions API

Additional contact features: files, channels, notes, and preferences.

**Base Endpoints**: `/v1/contacts/:id/files`, `/v1/contacts/:id/channels`, `/v1/contacts/:id/notes`, `/v1/contacts/:id/preferences`

---

## Contact Files & Avatars

Upload and manage files associated with contacts (avatars, documents, attachments).

### Upload File

```http
POST /v1/contacts/:id/files
Content-Type: multipart/form-data
```

### Example

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'avatar'); // avatar, document, attachment

const response = await fetch(`/v1/contacts/${contactId}/files`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`
  },
  body: formData
});

const { file_url, file_id } = await response.json();
```

### List Files

```http
GET /v1/contacts/:id/files
```

### Response

```json
{
  "files": [
    {
      "id": "file_abc123",
      "type": "avatar",
      "url": "https://storage.example.com/avatars/abc.jpg",
      "filename": "profile.jpg",
      "size_bytes": 245678,
      "uploaded_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

## Communication Channels

Track specific contact channels (email addresses, phone numbers, social profiles).

### Add Channel

```http
POST /v1/contacts/:id/channels
Content-Type: application/json
```

### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | email, phone, linkedin, twitter, etc. |
| `value` | string | Channel identifier |
| `label` | string | Custom label (e.g., "Work", "Personal") |
| `is_primary` | boolean | Primary channel for this type |

### Example

```typescript
await fetch(`/v1/contacts/${contactId}/channels`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'email',
    value: 'sarah.chen@work.com',
    label: 'Work Email',
    is_primary: true
  })
});
```

### List Channels

```http
GET /v1/contacts/:id/channels
```

### Response

```json
{
  "channels": [
    {
      "id": "channel_abc",
      "type": "email",
      "value": "sarah@example.com",
      "label": "Personal",
      "is_primary": true,
      "verified": false,
      "added_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": "channel_xyz",
      "type": "phone",
      "value": "+1-555-0100",
      "label": "Mobile",
      "is_primary": true,
      "verified": true
    }
  ]
}
```

### Update Channel

```http
PATCH /v1/contacts/:id/channels/:channelId
```

### Delete Channel

```http
DELETE /v1/contacts/:id/channels/:channelId
```

---

## Contact Notes

Private notes about a contact (different from voice notes/persona notes).

### Add Note

```http
POST /v1/contacts/:id/notes
Content-Type: application/json
```

### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Note text |
| `type` | string | general, meeting, call, research |

### Example

```typescript
await fetch(`/v1/contacts/${contactId}/notes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Prefers technical discussions. Interested in AI/ML features.',
    type: 'research'
  })
});
```

### List Notes

```http
GET /v1/contacts/:id/notes
```

### Response

```json
{
  "notes": [
    {
      "id": "note_abc",
      "content": "Prefers technical discussions...",
      "type": "research",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

## Contact Preferences

Track communication preferences and settings.

### Get Preferences

```http
GET /v1/contacts/:id/preferences
```

### Response

```json
{
  "preferences": {
    "preferred_channel": "email",
    "quiet_hours": {
      "start": "22:00",
      "end": "08:00",
      "timezone": "America/Los_Angeles"
    },
    "communication_frequency": "weekly",
    "topics_of_interest": ["AI", "automation", "productivity"],
    "do_not_contact": false,
    "email_format": "html",
    "language": "en"
  }
}
```

### Update Preferences

```http
PATCH /v1/contacts/:id/preferences
Content-Type: application/json
```

### Example

```typescript
await fetch(`/v1/contacts/${contactId}/preferences`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    preferred_channel: 'sms',
    quiet_hours: {
      start: '20:00',
      end: '09:00',
      timezone: 'America/New_York'
    },
    topics_of_interest: ['SaaS', 'enterprise software']
  })
});
```

---

## Common Patterns

### 1. Complete Contact Profile

```typescript
async function getCompleteProfile(contactId: string) {
  const [contact, files, channels, notes, preferences] = await Promise.all([
    fetch(`/v1/contacts/${contactId}`).then(r => r.json()),
    fetch(`/v1/contacts/${contactId}/files`).then(r => r.json()),
    fetch(`/v1/contacts/${contactId}/channels`).then(r => r.json()),
    fetch(`/v1/contacts/${contactId}/notes`).then(r => r.json()),
    fetch(`/v1/contacts/${contactId}/preferences`).then(r => r.json())
  ]);
  
  return {
    ...contact.contact,
    files: files.files,
    channels: channels.channels,
    notes: notes.notes,
    preferences: preferences.preferences
  };
}
```

### 2. Multi-Channel Contact

```typescript
// Add all known contact methods
const channels = [
  { type: 'email', value: 'john@work.com', label: 'Work', is_primary: true },
  { type: 'email', value: 'john@personal.com', label: 'Personal', is_primary: false },
  { type: 'phone', value: '+1-555-0100', label: 'Mobile', is_primary: true },
  { type: 'linkedin', value: 'linkedin.com/in/johndoe', is_primary: true }
];

for (const channel of channels) {
  await fetch(`/v1/contacts/${contactId}/channels`, {
    method: 'POST',
    body: JSON.stringify(channel)
  });
}
```

### 3. Respect Quiet Hours

```typescript
function canContactNow(preferences: ContactPreferences): boolean {
  if (!preferences.quiet_hours) return true;
  
  const now = moment().tz(preferences.quiet_hours.timezone);
  const hour = now.format('HH:mm');
  
  const start = preferences.quiet_hours.start;
  const end = preferences.quiet_hours.end;
  
  // Check if current time is in quiet hours
  if (start < end) {
    return hour < start || hour >= end;
  } else {
    // Quiet hours span midnight
    return hour >= end && hour < start;
  }
}

// Before sending
if (!canContactNow(contact.preferences)) {
  console.log('Contact is in quiet hours, schedule for later');
  scheduleForLater();
}
```

---

## UI Examples

### Avatar Upload

```typescript
function AvatarUpload({ contactId }) {
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'avatar');
    
    const response = await fetch(`/v1/contacts/${contactId}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${jwt}` },
      body: formData
    });
    
    const { file_url } = await response.json();
    console.log('Avatar uploaded:', file_url);
  };
  
  return (
    <input
      type="file"
      accept="image/*"
      onChange={e => handleUpload(e.target.files[0])}
    />
  );
}
```

### Channel Manager

```typescript
function ChannelList({ contactId }) {
  const { data } = useQuery(['channels', contactId], () =>
    fetch(`/v1/contacts/${contactId}/channels`).then(r => r.json())
  );
  
  return (
    <div>
      {data?.channels.map(channel => (
        <div key={channel.id} className="channel-item">
          <span className="type">{channel.type}</span>
          <span className="value">{channel.value}</span>
          {channel.is_primary && <span className="badge">Primary</span>}
        </div>
      ))}
    </div>
  );
}
```

---

## Best Practices

### 1. Set Primary Channels

```typescript
// Always have one primary channel per type
await fetch(`/v1/contacts/${contactId}/channels`, {
  method: 'POST',
  body: JSON.stringify({
    type: 'email',
    value: 'primary@example.com',
    is_primary: true  // Ensure primary is set
  })
});
```

### 2. Organize Notes by Type

```typescript
const noteTypes = {
  meeting: 'Meeting notes',
  call: 'Call notes',
  research: 'Research & background',
  general: 'General observations'
};

// Filter notes by type
const meetingNotes = notes.filter(n => n.type === 'meeting');
```

### 3. Validate Contact Methods

```typescript
async function validateEmail(email: string): Promise<boolean> {
  // Basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function validatePhone(phone: string): Promise<boolean> {
  // Use libphonenumber or similar
  return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\D/g, ''));
}
```

---

## Next Steps

- [Contacts](./02-contacts.md) - Main contact API
- [Custom Fields](./18-custom-fields.md) - Extend with custom data
- [Interactions](./03-interactions.md) - Log communications
