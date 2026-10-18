# Interaction Views - Implementation Guide

**Feature**: Recent Interactions & Interaction Detail Pages  
**Endpoints**: `/api/v1/contacts/:id/interactions`  
**Status**: ✅ Available in backend branch

---

## 📋 Overview

Comprehensive interaction tracking with:
- Recent Interactions Widget (last 5 touchpoints)
- Interaction Detail Page (full context)
- History Timeline (chronological view)
- Notes & Insights tabs
- Warmth Score Integration

---

## 🔌 API Endpoints

### 1. Get Recent Interactions

```typescript
GET /api/v1/contacts/:contactId/interactions?limit=5&sort=desc
```

**Query Parameters:**
- `limit` (optional): Default 20, max 50
- `sort` (optional): `asc` or `desc`
- `kind` (optional): Filter by type
- `since` (optional): ISO date

**Response:**
```json
{
  "interactions": [{
    "id": "uuid",
    "kind": "email",
    "channel": "email",
    "direction": "inbound",
    "subject": "Email",
    "summary": "Updated test interaction",
    "occurred_at": "2025-10-12T14:30:00Z",
    "relative_time": "Yesterday"
  }],
  "total": 1,
  "has_more": false
}
```

---

### 2. Get Single Interaction

```typescript
GET /api/v1/contacts/:contactId/interactions/:interactionId
```

**Response:**
```json
{
  "id": "1443abd7",
  "contact_id": "uuid",
  "kind": "email",
  "subject": "Interaction Test",
  "content": "Full content...",
  "sentiment": "neutral",
  "occurred_at": "2025-10-13T10:00:00Z",
  "warmth_impact": {
    "before_score": 0,
    "after_score": 0,
    "delta": 0
  }
}
```

---

### 3. Get Interaction History

```typescript
GET /api/v1/contacts/:contactId/interactions?limit=50
```

Returns timeline of all interactions.

---

### 4. Get Interaction Notes

```typescript
GET /api/v1/contacts/:contactId/notes?interaction_id=:interactionId
```

---

### 5. Get Contact Insights

```typescript
GET /api/v1/contacts/:contactId/insights
```

**Response:**
```json
{
  "warmth": {
    "current_score": 0,
    "band": "cold",
    "trend": "declining",
    "days_since_last_touch": 30
  },
  "communication_patterns": {
    "preferred_channel": "email",
    "response_rate": 0.6,
    "avg_response_time_hours": 24
  },
  "recommendations": [
    "🔥 Urgent: No contact in 30 days",
    "📧 Send follow-up email"
  ]
}
```

---

## 💻 Frontend Components

### RecentInteractions Component

```typescript
import { useRecentInteractions } from '@/hooks/useRecentInteractions';

export function RecentInteractions({ contactId }: { contactId: string }) {
  const { interactions, total } = useRecentInteractions(contactId);

  return (
    <Card>
      <CardHeader className="flex-row justify-between">
        <h3>Recent Interactions</h3>
        <Link href={`/contacts/${contactId}/interactions`}>
          View All ({total})
        </Link>
      </CardHeader>
      <CardContent>
        {interactions.map(interaction => (
          <InteractionItem key={interaction.id} {...interaction} />
        ))}
      </CardContent>
    </Card>
  );
}
```

---

### InteractionDetailPage

```typescript
export default function InteractionDetailPage({ params }) {
  const { interaction } = useInteractionDetail(params.contactId, params.interactionId);
  const { contact } = useContact(params.contactId);

  return (
    <div>
      <Header>
        <Avatar>{contact?.display_name?.[0]}</Avatar>
        <h1>{interaction?.subject}</h1>
        <WarmthBadge score={contact?.warmth} band={contact?.warmth_band} />
      </Header>

      <Tabs>
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history">
          <InteractionHistory contactId={params.contactId} />
        </TabsContent>
        {/* ... */}
      </Tabs>
    </div>
  );
}
```

---

### InteractionHistory Timeline

```typescript
export function InteractionHistory({ contactId }) {
  const { interactions } = useRecentInteractions(contactId, 50);

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      
      {interactions.map(interaction => (
        <div key={interaction.id} className="relative pl-12">
          <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary" />
          <div className="bg-accent p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{interaction.occurred_at || 'Unknown date'}</span>
            </div>
            <p className="font-medium">{interaction.kind}</p>
            <p className="text-sm text-muted-foreground">{interaction.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### WarmthBadge

```typescript
export function WarmthBadge({ score, band }) {
  const config = {
    hot: { color: 'bg-red-500', label: 'HOT', emoji: '🔥' },
    warm: { color: 'bg-orange-500', label: 'WARM', emoji: '☀️' },
    cooling: { color: 'bg-yellow-500', label: 'COOLING', emoji: '🌤️' },
    cold: { color: 'bg-blue-500', label: 'COLD', emoji: '❄️' }
  };

  const { color, label, emoji } = config[band];

  return (
    <Badge className={`${color} text-white`}>
      {emoji} {label} • Score: {score}
    </Badge>
  );
}
```

---

### ContactInsights

```typescript
export function ContactInsights({ contactId }) {
  const { insights } = useContactInsights(contactId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><h3>AI Summary</h3></CardHeader>
        <CardContent><p>{insights?.ai_summary}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><h3>Recommendations</h3></CardHeader>
        <CardContent>
          {insights?.recommendations?.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3>Communication Patterns</h3></CardHeader>
        <CardContent>
          <div>Preferred: {insights?.communication_patterns?.preferred_channel}</div>
          <div>Response Rate: {insights?.communication_patterns?.response_rate * 100}%</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🪝 React Hooks

### useRecentInteractions

```typescript
export function useRecentInteractions(contactId: string, limit = 5) {
  const { data, error, mutate } = useSWR(
    contactId ? `/api/v1/contacts/${contactId}/interactions?limit=${limit}` : null
  );

  return {
    interactions: data?.interactions || [],
    total: data?.total || 0,
    isLoading: !error && !data,
    refresh: mutate
  };
}
```

### useInteractionDetail

```typescript
export function useInteractionDetail(contactId: string, interactionId: string) {
  const { data } = useSWR(
    contactId && interactionId 
      ? `/api/v1/contacts/${contactId}/interactions/${interactionId}`
      : null
  );

  return { interaction: data };
}
```

### useContactInsights

```typescript
export function useContactInsights(contactId: string) {
  const { data } = useSWR(`/api/v1/contacts/${contactId}/insights`);
  return { insights: data };
}
```

---

## 📊 Data Models

### Interaction

```typescript
interface Interaction {
  id: string;
  contact_id: string;
  kind: 'email' | 'call' | 'meeting' | 'sms';
  channel: string;
  direction: 'inbound' | 'outbound';
  subject?: string;
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  occurred_at: string | null;
  metadata: Record<string, any>;
  warmth_impact?: { before_score: number; after_score: number; delta: number };
  created_at: string;
}
```

### ContactInsights

```typescript
interface ContactInsights {
  warmth: {
    current_score: number;
    band: 'hot' | 'warm' | 'cooling' | 'cold';
    trend: string;
    days_since_last_touch: number;
  };
  communication_patterns: {
    preferred_channel: string;
    response_rate: number;
    avg_response_time_hours: number;
  };
  recommendations: string[];
  ai_summary: string;
}
```

---

## 🎨 UI Best Practices

### Handle Unknown Dates

```typescript
const displayDate = interaction.occurred_at 
  ? format(new Date(interaction.occurred_at), 'MMM d, yyyy')
  : 'Unknown date';
```

### Relative Time Display

```typescript
import { formatDistanceToNow } from 'date-fns';

const relativeTime = interaction.occurred_at
  ? formatDistanceToNow(new Date(interaction.occurred_at), { addSuffix: true })
  : 'Unknown date';
```

### Channel Icons

```typescript
function getChannelIcon(channel: string) {
  const icons = {
    email: '📧', phone: '📞', meeting: '🤝', sms: '💬', dm: '💬'
  };
  return icons[channel] || '📝';
}
```

---

## ✅ Summary

### Endpoints Available

| Feature | Endpoint | Status |
|---------|----------|--------|
| Recent Interactions | `GET /api/v1/contacts/:id/interactions?limit=5` | ✅ |
| Interaction Detail | `GET /api/v1/contacts/:id/interactions/:interactionId` | ✅ |
| History Timeline | `GET /api/v1/contacts/:id/interactions` | ✅ |
| Notes | `GET /api/v1/contacts/:id/notes` | ✅ |
| Insights | `GET /api/v1/contacts/:id/insights` | ✅ |
| Warmth | `GET /api/v1/contacts/:id` | ✅ |

### Components to Build

- ✅ RecentInteractions (widget)
- ✅ InteractionDetailPage (full page)
- ✅ InteractionHistory (timeline)
- ✅ WarmthBadge (indicator)
- ✅ ContactInsights (analytics)

**Status**: Backend ready - build frontend components! 🚀

---

**Last Updated**: October 13, 2025  
**Backend Branch**: feat/backend-vercel-only-clean
