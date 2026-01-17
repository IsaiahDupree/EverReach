# Feature Requests API

AI-powered feature request system with automatic clustering, voting, and roadmap management.

**Base Endpoint**: `/v1/feature-requests`, `/v1/feature-buckets`

---

## Overview

The feature request system provides:
- **AI clustering** - Automatically groups similar requests
- **Voting & prioritization** - Community-driven roadmap
- **Momentum tracking** - Identify trending features
- **Gamification** - Badges and streaks for contributors
- **Public changelog** - Transparent feature shipping

---

## Submit Feature Request

Create a new feature request.

```http
POST /v1/feature-requests
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ Yes | Brief description |
| `description` | string | No | Detailed explanation |
| `use_case` | string | No | How you'd use it |

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/feature-requests',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Bulk email composer',
      description: 'Allow sending personalized emails to multiple contacts at once',
      use_case: 'Monthly newsletter to all customers'
    })
  }
);

const { request } = await response.json();
```

### Response

```json
{
  "request": {
    "id": "req_abc123",
    "title": "Bulk email composer",
    "description": "Allow sending personalized emails...",
    "status": "pending_review",
    "votes": 1,
    "created_at": "2025-01-15T10:00:00Z",
    "bucket_id": null,
    "submitted_by": "user_xyz"
  }
}
```

---

## AI Clustering

After submission, a background job:
1. Generates embedding for the request
2. Finds similar requests (cosine similarity > 0.78)
3. Creates or assigns to a feature bucket
4. AI generates bucket title and summary

```typescript
// Automatic clustering happens via cron:
// POST /api/cron/process-embeddings (runs every 5 minutes)
```

---

## Vote for Feature

Vote for a feature request or bucket.

```http
POST /v1/feature-requests/:id/vote
```

### Example

```typescript
await fetch(`/v1/feature-requests/${requestId}/vote`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwt}` }
});
```

### Remove Vote

```http
DELETE /v1/feature-requests/:id/vote
```

---

## List Feature Buckets

Get clustered feature requests sorted by priority.

```http
GET /v1/feature-buckets
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sort` | string | hot, top, new (default: hot) |
| `status` | string | open, in_progress, shipped, wont_do |
| `limit` | integer | Max results (default: 20) |

### Sorting

- **hot**: Weighted by recent votes (momentum)
- **top**: Most votes all-time
- **new**: Recently created

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/feature-buckets?sort=hot&limit=10',
  {
    headers: { 'Authorization': `Bearer ${jwt}` }
  }
);

const { buckets } = await response.json();
```

### Response

```json
{
  "buckets": [
    {
      "id": "bucket_abc123",
      "title": "Email & Messaging Improvements",
      "summary": "Bulk email composer, templates, scheduling, and personalization features",
      "status": "open",
      "total_votes": 156,
      "request_count": 12,
      "momentum": {
        "votes_this_week": 18,
        "votes_this_month": 45,
        "trend": "rising"
      },
      "created_at": "2025-01-10T10:00:00Z",
      "updated_at": "2025-01-15T14:00:00Z",
      "top_requests": [
        {
          "id": "req_xyz",
          "title": "Bulk email composer",
          "votes": 45
        },
        {
          "id": "req_123",
          "title": "Email templates",
          "votes": 38
        }
      ]
    }
  ],
  "total": 24
}
```

---

## Get Bucket Details

```http
GET /v1/feature-buckets/:id
```

### Response

```json
{
  "bucket": {
    "id": "bucket_abc123",
    "title": "Email & Messaging Improvements",
    "summary": "Bulk email composer, templates...",
    "status": "in_progress",
    "total_votes": 156,
    "request_count": 12,
    "requests": [
      {
        "id": "req_xyz",
        "title": "Bulk email composer",
        "votes": 45,
        "created_at": "2025-01-10T10:00:00Z",
        "submitted_by": "user_abc"
      }
    ],
    "recent_activity": [
      {
        "type": "vote",
        "user_id": "user_123",
        "timestamp": "2025-01-15T14:30:00Z"
      },
      {
        "type": "status_change",
        "old_status": "open",
        "new_status": "in_progress",
        "timestamp": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

## Update Bucket Status (Admin)

```http
PATCH /v1/feature-buckets/:id
Content-Type: application/json
```

### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | open, in_progress, shipped, wont_do |
| `notes` | string | Admin notes |

### Example

```typescript
await fetch(`/v1/feature-buckets/${bucketId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${adminJWT}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'in_progress',
    notes: 'Starting development in Q1 2025'
  })
});
```

---

## Changelog

```http
GET /v1/changelog
```

### Response

```json
{
  "entries": [
    {
      "id": "changelog_abc",
      "bucket_id": "bucket_xyz",
      "title": "Email & Messaging Improvements",
      "description": "Shipped bulk email composer with templates",
      "shipped_at": "2025-01-20T00:00:00Z",
      "votes": 156
    }
  ]
}
```

---

## Gamification

### User Stats

```typescript
// Tracked automatically in feature_user_stats table
{
  "user_id": "user_abc",
  "total_votes": 42,
  "total_submissions": 8,
  "badges": ["first_vote", "streak_5", "early_supporter"],
  "vote_streak_days": 5,
  "longest_streak": 12
}
```

### Badges

| Badge | Criteria |
|-------|----------|
| `first_vote` | Cast first vote |
| `streak_5` | Vote 5 days in a row |
| `streak_30` | Vote 30 days in a row |
| `early_supporter` | Vote on request that later gets 50+ votes |
| `top_contributor` | Submit 10+ requests |

---

## Common Patterns

### 1. Feature Request Board

```typescript
function FeatureRequestBoard() {
  const [sort, setSort] = useState<'hot' | 'top' | 'new'>('hot');
  
  const { data } = useQuery(['buckets', sort], () =>
    fetch(`/v1/feature-buckets?sort=${sort}`).then(r => r.json())
  );
  
  return (
    <div>
      <div className="tabs">
        <button onClick={() => setSort('hot')}>🔥 Hot</button>
        <button onClick={() => setSort('top')}>⬆️ Top</button>
        <button onClick={() => setSort('new')}>✨ New</button>
      </div>
      
      {data?.buckets.map(bucket => (
        <BucketCard
          key={bucket.id}
          bucket={bucket}
          onVote={() => vote(bucket.id)}
        />
      ))}
    </div>
  );
}
```

### 2. Voting Component

```typescript
function VoteButton({ requestId, hasVoted, voteCount }) {
  const vote = useMutation({
    mutationFn: () =>
      fetch(`/v1/feature-requests/${requestId}/vote`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['buckets']);
    }
  });
  
  return (
    <button
      onClick={() => vote.mutate()}
      className={hasVoted ? 'voted' : ''}
    >
      ▲ {voteCount}
    </button>
  );
}
```

### 3. Momentum Indicator

```typescript
function MomentumChip({ momentum }) {
  if (momentum.votes_this_week > 10) {
    return <span className="badge hot">🔥 +{momentum.votes_this_week} this week</span>;
  }
  if (momentum.trend === 'rising') {
    return <span className="badge rising">📈 Rising</span>;
  }
  return null;
}
```

---

## AI Embedding Process

### 1. Submission

```typescript
// User submits request
POST /v1/feature-requests
{
  "title": "Dark mode",
  "description": "Add dark theme option"
}
```

### 2. Background Processing

```typescript
// Cron job (every 5 minutes)
POST /api/cron/process-embeddings

// For each pending request:
// 1. Generate embedding using OpenAI
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: `${title}\n${description}`
});

// 2. Find similar requests (cosine similarity)
const similar = await findNearestBucket(embedding, org_id, 0.78);

// 3. Assign to bucket or create new one
if (similar) {
  await assignToBucket(request_id, similar.bucket_id);
} else {
  const bucket = await createBucket(org_id);
  await assignToBucket(request_id, bucket.id);
  
  // 4. AI generates bucket title and summary
  const { title, summary } = await generateBucketMeta(bucket);
  await updateBucket(bucket.id, { title, summary });
}
```

---

## Best Practices

### 1. Encourage Descriptive Submissions

```typescript
<form>
  <input placeholder="Brief title (e.g., 'Dark mode')" />
  <textarea placeholder="What problem does this solve? How would you use it?" />
  <input placeholder="Example: 'I work late and bright screens hurt my eyes'" />
</form>
```

### 2. Show Voting Impact

```typescript
// Show user their voting power
<p>You and {bucket.total_votes - 1} others want this</p>

// Show progress toward goal
<ProgressBar
  current={bucket.total_votes}
  goal={100}
  label={`${bucket.total_votes}/100 votes`}
/>
```

### 3. Highlight Momentum

```typescript
// Show trending features prominently
const trending = buckets.filter(b =>
  b.momentum.votes_this_week > 10
);

<section>
  <h2>🔥 Trending This Week</h2>
  {trending.map(b => <BucketCard {...b} />)}
</section>
```

---

## Next Steps

- [User Settings](./22-user-settings.md) - Manage feature preferences
- [Authentication](./01-authentication.md) - Required for voting
