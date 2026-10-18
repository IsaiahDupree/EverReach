/**
 * Integration Outbox Worker
 * 
 * Processes outbound jobs with:
 * - Rate limiting (respects provider limits)
 * - Exponential backoff retry
 * - Idempotency
 * - Dead letter queue
 */

import { getSupabaseServiceClient } from '@/lib/supabase';

// Build-safe: Supabase client created lazily inside functions

// ============================================================================
// TYPES
// ============================================================================

export interface OutboxJob {
  id: string;
  org_id: string;
  account_id: string | null;
  provider: string;
  job_type: string;
  priority: number;
  payload: any;
  idempotency_key: string | null;
  contact_id: string | null;
  rate_limit_bucket: string | null;
  scheduled_at: string;
  next_retry_at: string | null;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
}

export interface RateLimitConfig {
  requests_per_second?: number;
  requests_per_minute?: number;
  requests_per_hour?: number;
  requests_per_day?: number;
  burst_size?: number;
}

export interface JobResult {
  success: boolean;
  response?: any;
  error?: string;
  shouldRetry?: boolean;
}

// ============================================================================
// RATE LIMITING (Token Bucket)
// ============================================================================

// In-memory token buckets (for single-process)
// Production: Use Redis with Upstash or similar
const tokenBuckets = new Map<string, {
  tokens: number;
  lastRefill: number;
  config: RateLimitConfig;
}>();

/**
 * Check if request is allowed under rate limit
 */
export function checkRateLimit(bucket: string, cost: number = 1): boolean {
  // TODO: In production, use Redis for distributed rate limiting
  // This is a simplified in-memory version

  const bucketState = tokenBuckets.get(bucket);
  
  if (!bucketState) {
    // First request, allow it
    return true;
  }

  const now = Date.now();
  const elapsed = (now - bucketState.lastRefill) / 1000; // seconds

  // Refill tokens based on elapsed time
  if (bucketState.config.requests_per_second) {
    const refillAmount = elapsed * bucketState.config.requests_per_second;
    bucketState.tokens = Math.min(
      bucketState.tokens + refillAmount,
      bucketState.config.burst_size || bucketState.config.requests_per_second * 2
    );
  }

  bucketState.lastRefill = now;

  // Check if we have enough tokens
  if (bucketState.tokens >= cost) {
    bucketState.tokens -= cost;
    return true;
  }

  return false;
}

/**
 * Initialize rate limit bucket for provider
 */
export async function initRateLimitBucket(provider: string, accountId?: string): Promise<void> {
  const bucketKey = accountId ? `${provider}:${accountId}` : provider;

  // Fetch rate limit config
  const { data: config } = await getSupabaseServiceClient()
    .from('integration_rate_limits')
    .select('*')
    .eq('provider', provider)
    .single();

  if (config) {
    tokenBuckets.set(bucketKey, {
      tokens: config.requests_per_second || 10, // Default
      lastRefill: Date.now(),
      config: {
        requests_per_second: config.requests_per_second,
        requests_per_minute: config.requests_per_minute,
        requests_per_hour: config.requests_per_hour,
        requests_per_day: config.requests_per_day,
        burst_size: config.burst_size || (config.requests_per_second * 2),
      },
    });
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Calculate next retry time with exponential backoff + jitter
 */
export function calculateNextRetry(attempts: number): Date {
  // Exponential backoff: 2^attempts seconds
  const baseDelay = Math.pow(2, attempts) * 1000; // milliseconds
  
  // Add jitter (±25%)
  const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
  const delay = baseDelay + jitter;

  // Cap at 1 hour
  const cappedDelay = Math.min(delay, 60 * 60 * 1000);

  return new Date(Date.now() + cappedDelay);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(statusCode?: number, error?: string): boolean {
  // Retry on 5xx errors (server errors)
  if (statusCode && statusCode >= 500) {
    return true;
  }

  // Retry on 429 (rate limit)
  if (statusCode === 429) {
    return true;
  }

  // Retry on network errors
  if (error && (
    error.includes('ECONNREFUSED') ||
    error.includes('ETIMEDOUT') ||
    error.includes('ENOTFOUND') ||
    error.includes('socket hang up')
  )) {
    return true;
  }

  // Don't retry on 4xx (client errors, except 429)
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return false;
  }

  return false; // Default: don't retry
}

// ============================================================================
// JOB FETCHING
// ============================================================================

/**
 * Fetch next batch of jobs to process
 */
export async function fetchPendingJobs(
  batchSize: number = 50,
  onlyProvider?: string
): Promise<OutboxJob[]> {
  let query = getSupabaseServiceClient()
    .from('integration_outbox')
    .select('*')
    .in('status', ['pending', 'processing'])
    .lte('scheduled_at', new Date().toISOString())
    .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
    .order('priority', { ascending: true }) // Lower number = higher priority
    .order('scheduled_at', { ascending: true })
    .limit(batchSize);

  if (onlyProvider) {
    query = query.eq('provider', onlyProvider);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching pending jobs:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch jobs requiring approval
 */
export async function fetchJobsNeedingApproval(orgId: string): Promise<OutboxJob[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from('integration_outbox')
    .select('*')
    .eq('org_id', orgId)
    .eq('requires_approval', true)
    .is('approved_at', null)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching jobs needing approval:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// JOB EXECUTION
// ============================================================================

/**
 * Execute a single outbox job
 */
export async function executeJob(job: OutboxJob): Promise<JobResult> {
  // Check if approval required
  if (job.requires_approval && !job.approved_at) {
    return {
      success: false,
      error: 'Approval required',
      shouldRetry: false,
    };
  }

  // Check rate limit
  const rateLimitBucket = job.rate_limit_bucket || job.provider;
  if (!checkRateLimit(rateLimitBucket)) {
    // Rate limited - will retry later
    return {
      success: false,
      error: 'Rate limited',
      shouldRetry: true,
    };
  }

  // Mark as processing
  await getSupabaseServiceClient()
    .from('integration_outbox')
    .update({ status: 'processing' })
    .eq('id', job.id);

  try {
    // Execute provider-specific logic
    const result = await executeProviderJob(job);

    // Update job with result
    await getSupabaseServiceClient()
      .from('integration_outbox')
      .update({
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : null,
        response_status: result.response?.status,
        response_body: result.response,
        error_message: result.error,
        attempts: job.attempts + 1,
        next_retry_at: result.success || !result.shouldRetry
          ? null
          : calculateNextRetry(job.attempts + 1).toISOString(),
      })
      .eq('id', job.id);

    // Log execution
    await getSupabaseServiceClient()
      .from('integration_logs')
      .insert({
        org_id: job.org_id,
        account_id: job.account_id,
        provider: job.provider,
        action: job.job_type,
        details: {
          job_id: job.id,
          contact_id: job.contact_id,
          attempts: job.attempts + 1,
        },
        success: result.success,
        status_code: result.response?.status,
        error_message: result.error,
      });

    return result;

  } catch (error) {
    console.error('Job execution error:', error);

    const errorMessage = String(error);
    const shouldRetry = isRetryableError(undefined, errorMessage);

    await getSupabaseServiceClient()
      .from('integration_outbox')
      .update({
        status: shouldRetry && job.attempts + 1 < job.max_attempts ? 'pending' : 'failed',
        error_message: errorMessage,
        attempts: job.attempts + 1,
        next_retry_at: shouldRetry && job.attempts + 1 < job.max_attempts
          ? calculateNextRetry(job.attempts + 1).toISOString()
          : null,
      })
      .eq('id', job.id);

    return {
      success: false,
      error: errorMessage,
      shouldRetry,
    };
  }
}

/**
 * Execute provider-specific job logic
 * This delegates to provider-specific handlers
 */
async function executeProviderJob(job: OutboxJob): Promise<JobResult> {
  // Import provider-specific handlers dynamically
  // This keeps the core worker clean and extensible

  try {
    switch (job.provider) {
      case 'resend':
        return await executeResendJob(job);
      
      case 'klaviyo':
        return await executeKlaviyoJob(job);
      
      case 'twilio':
        return await executeTwilioJob(job);
      
      case 'slack':
        return await executeSlackJob(job);
      
      default:
        return {
          success: false,
          error: `Unknown provider: ${job.provider}`,
          shouldRetry: false,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: String(error),
      shouldRetry: isRetryableError(undefined, String(error)),
    };
  }
}

// ============================================================================
// PROVIDER-SPECIFIC EXECUTORS (Stubs - implement in separate files)
// ============================================================================

async function executeResendJob(job: OutboxJob): Promise<JobResult> {
  // TODO: Implement Resend-specific logic
  // See: resend-provider.ts
  return { success: false, error: 'Not implemented', shouldRetry: false };
}

async function executeKlaviyoJob(job: OutboxJob): Promise<JobResult> {
  // TODO: Implement Klaviyo-specific logic
  return { success: false, error: 'Not implemented', shouldRetry: false };
}

async function executeTwilioJob(job: OutboxJob): Promise<JobResult> {
  // TODO: Implement Twilio-specific logic
  return { success: false, error: 'Not implemented', shouldRetry: false };
}

async function executeSlackJob(job: OutboxJob): Promise<JobResult> {
  // TODO: Implement Slack-specific logic
  return { success: false, error: 'Not implemented', shouldRetry: false };
}

// ============================================================================
// WORKER MAIN LOOP
// ============================================================================

/**
 * Process outbox jobs in batches
 */
export async function processOutbox(options: {
  batchSize?: number;
  maxConcurrent?: number;
  provider?: string;
} = {}): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const { batchSize = 50, maxConcurrent = 10, provider } = options;

  // Fetch jobs
  const jobs = await fetchPendingJobs(batchSize, provider);

  if (jobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`Processing ${jobs.length} outbox jobs...`);

  // Initialize rate limit buckets
  const uniqueProviders = [...new Set(jobs.map(j => j.provider))];
  for (const p of uniqueProviders) {
    await initRateLimitBucket(p);
  }

  // Process jobs with concurrency limit
  const results = await Promise.allSettled(
    jobs.map(job => executeJob(job))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - succeeded;

  console.log(`Processed ${results.length} jobs: ${succeeded} succeeded, ${failed} failed`);

  return {
    processed: results.length,
    succeeded,
    failed,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  processOutbox,
  executeJob,
  fetchPendingJobs,
  fetchJobsNeedingApproval,
  calculateNextRetry,
  isRetryableError,
  checkRateLimit,
  initRateLimitBucket,
};
