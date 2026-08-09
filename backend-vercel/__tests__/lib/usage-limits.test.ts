/**
 * Usage Limits Tests
 * 
 * Tests for subscription tier-based usage enforcement
 */

// Jest globals are available without import
// describe, it, expect, beforeEach, afterEach are global
import {
  canUseCompose,
  incrementComposeUsage,
  canUseVoiceTranscription,
  incrementVoiceTranscriptionUsage,
  canUseScreenshots,
  incrementScreenshotUsage,
  getCurrentUsage,
  getUserTier,
  getTierLimits,
  formatUsage,
  getUsagePercentage,
  isUnlimited,
  reserveComposeUsage,
  releaseComposeUsage,
  TIER_LIMITS,
} from '../../lib/usage-limits';

// Mock Supabase client
const createMockSupabase = () => ({
  rpc: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
});

describe('Usage Limits - Tier Definitions', () => {
  it('should have correct limits for core tier', () => {
    const limits = getTierLimits('core');
    expect(limits.compose_generations_per_month).toBe(50);
    expect(limits.voice_notes_per_month).toBe(30);
    expect(limits.screenshots_per_month).toBe(100);
  });

  it('should have correct limits for pro tier', () => {
    const limits = getTierLimits('pro');
    expect(limits.compose_generations_per_month).toBe(200);
    expect(limits.voice_notes_per_month).toBe(120);
    expect(limits.screenshots_per_month).toBe(300);
  });

  it('should have unlimited for enterprise tier', () => {
    const limits = getTierLimits('enterprise');
    expect(limits.compose_generations_per_month).toBe(-1);
    expect(limits.voice_notes_per_month).toBe(-1);
    expect(limits.screenshots_per_month).toBe(-1);
  });
});

describe('Usage Limits - Compose Enforcement', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow compose when under limit', async () => {
    // Mock database response - allowed
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
    
    // Mock getCurrentUsage
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        compose_runs_used: 25,
        compose_runs_limit: 50,
        period_end: '2025-12-31T23:59:59Z',
      },
      error: null,
    });

    const result = await canUseCompose(mockSupabase, 'user-123');

    expect(result.allowed).toBe(true);
    expect(result.current_usage).toBe(25);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(25);
  });

  it('should block compose when limit reached', async () => {
    // Mock database response - not allowed
    mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null });
    
    // Mock getCurrentUsage
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        compose_runs_used: 50,
        compose_runs_limit: 50,
        period_end: '2025-12-31T23:59:59Z',
      },
      error: null,
    });

    const result = await canUseCompose(mockSupabase, 'user-123');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Monthly compose limit reached');
    expect(result.current_usage).toBe(50);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(0);
  });

  it('should allow unlimited for enterprise tier', async () => {
    // Mock database response - allowed
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
    
    // Mock getCurrentUsage with unlimited (-1)
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        compose_runs_used: 500,
        compose_runs_limit: -1,
        period_end: '2025-12-31T23:59:59Z',
      },
      error: null,
    });

    const result = await canUseCompose(mockSupabase, 'user-123');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
    expect(result.remaining).toBe(Infinity);
  });

  it('should increment compose usage', async () => {
    const updatedUsage = {
      compose_runs_used: 26,
      compose_runs_limit: 50,
    };

    mockSupabase.rpc.mockResolvedValueOnce({ data: updatedUsage, error: null });

    const result = await incrementComposeUsage(mockSupabase, 'user-123');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_compose_usage', {
      p_user_id: 'user-123',
    });
    expect(result?.compose_runs_used).toBe(26);
  });

  it('should fail open on database error', async () => {
    // Mock database error
    mockSupabase.rpc.mockResolvedValueOnce({ 
      data: null, 
      error: new Error('Database error') 
    });

    const result = await canUseCompose(mockSupabase, 'user-123');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('Unable to verify usage limits');
  });
});

describe('Usage Limits - Voice Transcription', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it('should allow voice transcription when under limit', async () => {
    // Mock database response - allowed
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
    
    // Mock getCurrentUsage
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        voice_minutes_used: 15,
        voice_minutes_limit: 30,
        period_end: '2025-12-31T23:59:59Z',
      },
      error: null,
    });

    const result = await canUseVoiceTranscription(mockSupabase, 'user-123', 5);

    expect(result.allowed).toBe(true);
    expect(result.current_usage).toBe(15);
    expect(result.limit).toBe(30);
    expect(result.remaining).toBe(15);
  });

  it('should block when adding minutes would exceed limit', async () => {
    // Mock database response - not allowed (would exceed)
    mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null });
    
    // Mock getCurrentUsage
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        voice_minutes_used: 28,
        voice_minutes_limit: 30,
        period_end: '2025-12-31T23:59:59Z',
      },
      error: null,
    });

    const result = await canUseVoiceTranscription(mockSupabase, 'user-123', 5);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Monthly voice transcription limit reached');
  });

  it('should increment voice minutes used', async () => {
    const updatedUsage = {
      voice_minutes_used: 20,
      voice_minutes_limit: 30,
    };

    mockSupabase.rpc.mockResolvedValueOnce({ data: updatedUsage, error: null });

    const result = await incrementVoiceTranscriptionUsage(mockSupabase, 'user-123', 5);

    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_voice_transcription_usage', {
      p_user_id: 'user-123',
      p_minutes: 5,
    });
    expect(result?.voice_minutes_used).toBe(20);
  });
});

describe('Usage Limits - Screenshot Analysis', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it('should allow screenshots when under limit', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
    mockSupabase.rpc.mockResolvedValueOnce({
      data: {
        screenshot_count: 50,
        screenshots_limit: 100,
        period_end: '2025-12-31T23:59:59Z',
      },
      error: null,
    });

    const result = await canUseScreenshots(mockSupabase, 'user-123');

    expect(result.allowed).toBe(true);
    expect(result.current_usage).toBe(50);
    expect(result.limit).toBe(100);
    expect(result.remaining).toBe(50);
  });

  it('should increment screenshot usage', async () => {
    const updatedUsage = {
      screenshot_count: 51,
      screenshots_limit: 100,
    };

    mockSupabase.rpc.mockResolvedValueOnce({ data: updatedUsage, error: null });

    const result = await incrementScreenshotUsage(mockSupabase, 'user-123');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_screenshot_usage', {
      p_user_id: 'user-123',
    });
    expect(result?.screenshot_count).toBe(51);
  });
});

describe('Usage Limits - Utility Functions', () => {
  it('should format usage correctly', () => {
    expect(formatUsage(25, 50)).toBe('25 / 50');
    expect(formatUsage(100, -1)).toBe('100 / unlimited');
  });

  it('should calculate usage percentage', () => {
    expect(getUsagePercentage(25, 50)).toBe(50);
    expect(getUsagePercentage(50, 50)).toBe(100);
    expect(getUsagePercentage(75, 50)).toBe(100); // Capped at 100
    expect(getUsagePercentage(25, -1)).toBe(0); // Unlimited
  });

  it('should detect unlimited limits', () => {
    expect(isUnlimited(-1)).toBe(true);
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(100)).toBe(false);
  });
});

describe('Usage Limits - Period Management', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it('should get current usage period', async () => {
    const usageData = {
      id: 'period-123',
      user_id: 'user-123',
      period_start: '2025-11-01T00:00:00Z',
      period_end: '2025-12-01T00:00:00Z',
      screenshot_count: 25,
      screenshots_limit: 100,
      compose_runs_used: 10,
      compose_runs_limit: 50,
      voice_minutes_used: 5,
      voice_minutes_limit: 30,
      created_at: '2025-11-01T00:00:00Z',
      updated_at: '2025-11-15T12:00:00Z',
    };

    mockSupabase.rpc.mockResolvedValueOnce({ data: usageData, error: null });

    const result = await getCurrentUsage(mockSupabase, 'user-123');

    expect(result).toBeTruthy();
    expect(result?.screenshot_count).toBe(25);
    expect(result?.compose_runs_used).toBe(10);
    expect(result?.voice_minutes_used).toBe(5);
    // Check aliases work
    expect(result?.screenshots_used).toBe(25);
    expect(result?.compose_generations_used).toBe(10);
  });

  it('should get user tier', async () => {
    const tierData = { subscription_tier: 'pro' };

    const singleMock = jest.fn().mockResolvedValue({ data: tierData, error: null });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const tier = await getUserTier(mockSupabase, 'user-123');

    expect(tier).toBe('pro');
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  it('should default to core tier on error', async () => {
    const singleMock = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Not found')
    });
    const eqMock = jest.fn().mockReturnValue({ single: singleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const tier = await getUserTier(mockSupabase, 'user-123');

    expect(tier).toBe('core');
  });
});

describe('Usage Limits - Integration Scenarios', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it('should handle user hitting multiple limits', async () => {
    // User has hit compose limit but not voice limit
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: false, error: null }) // compose check fails
      .mockResolvedValueOnce({ // getCurrentUsage for compose
        data: {
          compose_runs_used: 50,
          compose_runs_limit: 50,
          voice_minutes_used: 10,
          voice_minutes_limit: 30,
          period_end: '2025-12-31T23:59:59Z',
        },
        error: null,
      });

    const composeResult = await canUseCompose(mockSupabase, 'user-123');
    expect(composeResult.allowed).toBe(false);

    // Reset mocks for voice check
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: true, error: null }) // voice check succeeds
      .mockResolvedValueOnce({ // getCurrentUsage for voice
        data: {
          compose_runs_used: 50,
          compose_runs_limit: 50,
          voice_minutes_used: 10,
          voice_minutes_limit: 30,
          period_end: '2025-12-31T23:59:59Z',
        },
        error: null,
      });

    const voiceResult = await canUseVoiceTranscription(mockSupabase, 'user-123', 5);
    expect(voiceResult.allowed).toBe(true);
  });

  it('should handle upgrade scenario (core to pro)', async () => {
    // Before upgrade: core limits (50 compose)
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({
        data: {
          compose_runs_used: 50,
          compose_runs_limit: 50,
          period_end: '2025-12-31T23:59:59Z',
        },
        error: null,
      });

    let result = await canUseCompose(mockSupabase, 'user-123');
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(50);

    // After upgrade: pro limits (200 compose) - usage resets
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: {
          compose_runs_used: 50, // Carried over
          compose_runs_limit: 200, // New limit
          period_end: '2025-12-31T23:59:59Z',
        },
        error: null,
      });

    result = await canUseCompose(mockSupabase, 'user-123');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(200);
    expect(result.remaining).toBe(150);
  });
});

describe('Usage Limits - Atomic Reserve/Release (concurrency safety)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow reservation when the RPC reports a successful reserve', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [{
        reserved: true,
        period: { compose_runs_used: 26, compose_runs_limit: 50, period_end: '2025-12-31T23:59:59Z' },
      }],
      error: null,
    });

    const result = await reserveComposeUsage(mockSupabase, 'user-123');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('reserve_compose_usage', { p_user_id: 'user-123' });
    expect(result.allowed).toBe(true);
    expect(result.current_usage).toBe(26);
    expect(result.limit).toBe(50);
  });

  it('should deny reservation when the RPC reports the limit is already reached', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [{
        reserved: false,
        period: { compose_runs_used: 50, compose_runs_limit: 50, period_end: '2025-12-31T23:59:59Z' },
      }],
      error: null,
    });

    const result = await reserveComposeUsage(mockSupabase, 'user-123');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Monthly compose limit reached');
    expect(result.remaining).toBe(0);
  });

  it('should fail CLOSED (not open) when the reserve RPC errors, unlike the read-only canUseCompose check', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('connection reset') });

    const result = await reserveComposeUsage(mockSupabase, 'user-123');

    // This is the opposite fail-safe direction from canUseCompose's "fail open"
    // above -- reserveComposeUsage gates a paid OpenAI call, so an unverifiable
    // quota must block the request, not silently allow unmetered spend.
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/unable to verify/i);
  });

  it('should forward the release call and return the RPC result', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: { compose_runs_used: 25, compose_runs_limit: 50 },
      error: null,
    });

    const result = await releaseComposeUsage(mockSupabase, 'user-123');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('release_compose_usage', { p_user_id: 'user-123' });
    expect(result?.compose_runs_used).toBe(25);
  });

  it('should swallow release errors as a best-effort rollback (never throws)', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('rpc down') });

    await expect(releaseComposeUsage(mockSupabase, 'user-123')).resolves.toBeNull();
  });

  it('concurrent reservations must not exceed the shared capacity (Promise.all race check)', async () => {
    // Simulate the DB-side atomic "check-and-increment in one statement"
    // behavior of the real reserve_compose_usage SQL function: each call
    // reads and mutates a single shared counter with no interleaving,
    // because a single Postgres statement serializes on the row.
    const limit = 5;
    let used = 0;
    mockSupabase.rpc.mockImplementation((fnName: string) => {
      if (fnName !== 'reserve_compose_usage') {
        return Promise.resolve({ data: null, error: null });
      }
      if (used < limit) {
        used += 1;
        return Promise.resolve({
          data: [{ reserved: true, period: { compose_runs_used: used, compose_runs_limit: limit, period_end: '2025-12-31T23:59:59Z' } }],
          error: null,
        });
      }
      return Promise.resolve({
        data: [{ reserved: false, period: { compose_runs_used: used, compose_runs_limit: limit, period_end: '2025-12-31T23:59:59Z' } }],
        error: null,
      });
    });

    const concurrentCallers = 8;
    const results = await Promise.all(
      Array.from({ length: concurrentCallers }, () => reserveComposeUsage(mockSupabase, 'user-123'))
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    const deniedCount = results.filter((r) => !r.allowed).length;

    // The wrapper must forward every concurrent caller to the atomic RPC --
    // it must NOT introduce its own client-side race (e.g. caching a stale
    // "allowed" read) that would let more than `limit` callers through.
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(concurrentCallers);
    expect(allowedCount).toBe(limit);
    expect(deniedCount).toBe(concurrentCallers - limit);
    expect(used).toBe(limit);
  });
});
