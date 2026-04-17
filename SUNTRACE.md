# SunTrace — Analytics Tracing Tool

Complete analytics tracing infrastructure for ACTP. Wire event capture, attribution, and reporting with Supabase integration.

## Overview

SunTrace provides a comprehensive analytics platform for tracking user events, attributing conversions to marketing channels, and generating detailed reports.

### Key Features

**Phase 1: Event Capture**
- Client-side SDK for event capturing
- Event validation and schema enforcement
- Event batching for efficient transmission
- User identification and session tracking
- Event deduplication
- Time-series data handling

**Phase 2: Attribution**
- First-touch attribution
- Last-touch attribution
- Multi-touch attribution (linear, time-decay, position-based)
- Attribution model configuration
- Batch and real-time calculations

**Phase 3: Analytics & Reporting**
- Event aggregation to metrics
- Real-time analytics streaming
- Historical data queries
- Report generation with exports
- Custom report definitions

**Phase 4: Dashboard UI**
- Analytics dashboard with key metrics
- Real-time metrics with WebSocket streaming
- Report viewer with charts
- Reusable chart and table components
- Data filtering and date range selection
- Export controls

**Phase 5: Infrastructure**
- Supabase PostgreSQL integration
- Row-Level Security (RLS) policies
- Environment configuration
- Structured logging
- Error handling and custom error types
- Rate limiting
- API authentication (JWT)
- Data retention policies
- GDPR compliance features
- Monitoring and health checks
- GitHub Actions CI/CD
- Production deployment

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file:

```env
# Supabase
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# Optional: Event Capture Config
REACT_APP_EVENT_BATCH_SIZE=50
REACT_APP_EVENT_BATCH_WAIT_MS=5000
REACT_APP_SESSION_TIMEOUT_MS=1800000

# Optional: Attribution
REACT_APP_ATTRIBUTION_WINDOW_DAYS=30
REACT_APP_DEFAULT_ATTRIBUTION_MODEL=last_touch

# Optional: Features
REACT_APP_ENABLE_REALTIME_ANALYTICS=false
REACT_APP_ENABLE_GDPR=true
REACT_APP_ENABLE_PRIVACY_MODE=false
```

### Database Setup

Apply migrations to your Supabase database:

```bash
# Run migrations using Supabase CLI or manually execute SQL files in migrations/
psql -d your_db -f migrations/001_create_events_table.sql
psql -d your_db -f migrations/002_rls_policies.sql
```

### Usage

#### Basic Event Capture

```typescript
import { getEventCapture } from '@suntrace/sdk';

const capture = getEventCapture();
await capture.initialize();

// Capture an event
await capture.captureEvent({
  event: 'page_view',
  url: window.location.href,
  pageTitle: document.title,
});

// Identify a user
await capture.identifyUser('user_123');

// Flush any pending events
await capture.flush();
```

#### Query Analytics

```typescript
import { queryAnalytics } from '@suntrace/api/analytics';

const result = await queryAnalytics({
  metric: 'event_count',
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
  endTime: Date.now(),
  granularity: 'day',
});
```

#### Attribution Models

```typescript
import { attributeConversion } from '@suntrace/attribution/models';

const attribution = attributeConversion(touches, 'last_touch', 100);
console.log(attribution.touches); // Credit distribution
```

## API Endpoints

- `POST /api/events` - Ingest events
- `GET /api/health` - Health check
- `GET /api/analytics` - Query analytics
- `GET /api/attribution` - Query attribution data
- `POST /api/reports` - Generate reports
- `GET /api/reports/:id` - Retrieve report

## Architecture

### Database Schema

**events table**: Stores raw analytics events with indexes for efficient querying
**event_metrics table**: Stores pre-aggregated metrics for dashboard performance

### Event Processing Flow

1. Client → Event Capture SDK
2. Local validation & batching
3. Send to `/api/events`
4. Server stores in Supabase
5. Real-time streaming to dashboards
6. Batch aggregation for metrics
7. Attribution calculation
8. Report generation

### Security

- Row-Level Security (RLS) for multi-tenant data isolation
- JWT authentication for API endpoints
- Rate limiting per IP/user
- Input validation and sanitization
- Error messages don't leak sensitive data

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# API tests
npm run test:api

# Performance tests
npm run test:perf

# Security tests
npm run test:security
```

## Monitoring

Health check endpoint returns service status:

```bash
curl https://your-domain/api/health
```

Response includes database connectivity, cache status, and uptime metrics.

## GDPR & Privacy

- Data export endpoint for subject access requests
- Data deletion endpoint for right-to-be-forgotten
- User PII masking and anonymization
- Configurable data retention (default 90 days)
- Audit trails for compliance

## Deployment

### Vercel

```bash
# Deploy to production
npm run deploy:prod

# Deploy preview
npm run deploy:preview
```

### Environment Variables (Production)

Set these in your deployment platform:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_*` (Vercel uses this prefix)

## Contributing

1. Create a feature branch
2. Implement tests
3. Submit PR
4. Merge to main

## License

Proprietary - ACTP Analytics
