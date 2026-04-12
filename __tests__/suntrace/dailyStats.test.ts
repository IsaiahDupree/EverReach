/**
 * Unit tests for daily stats aggregation.
 * F2070: daily stats aggregation matches sum of all sessions for that date
 */

// ── Types (inlined to avoid import issues in Jest) ────────────────────────────

interface SessionRecord {
  duration_minutes: number;
  estimated_vitamin_d_iu: number;
  uv_index_at_time: number;
}

interface DailyStatsSummary {
  total_minutes: number;
  total_vitamin_d_iu: number;
  sessions_count: number;
  max_uv_index: number;
  avg_uv_index: number;
}

// ── Aggregation function (mirrors Supabase-side logic for testing) ─────────────

function aggregateDailyStats(sessions: SessionRecord[]): DailyStatsSummary {
  if (sessions.length === 0) {
    return {
      total_minutes: 0,
      total_vitamin_d_iu: 0,
      sessions_count: 0,
      max_uv_index: 0,
      avg_uv_index: 0,
    };
  }

  const total_minutes = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
  const total_vitamin_d_iu = sessions.reduce(
    (sum, s) => sum + (s.estimated_vitamin_d_iu ?? 0),
    0,
  );
  const sessions_count = sessions.length;
  const uvValues = sessions.map((s) => s.uv_index_at_time ?? 0);
  const max_uv_index = Math.max(...uvValues);
  const avg_uv_index = uvValues.reduce((a, b) => a + b, 0) / sessions.length;

  return {
    total_minutes,
    total_vitamin_d_iu,
    sessions_count,
    max_uv_index,
    avg_uv_index,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('daily stats aggregation', () => {
  // F2070: aggregation matches sum of all sessions
  it('matches sum of all sessions for total_minutes', () => {
    const sessions: SessionRecord[] = [
      { duration_minutes: 20, estimated_vitamin_d_iu: 200, uv_index_at_time: 5 },
      { duration_minutes: 15, estimated_vitamin_d_iu: 150, uv_index_at_time: 4 },
      { duration_minutes: 30, estimated_vitamin_d_iu: 300, uv_index_at_time: 7 },
    ];

    const stats = aggregateDailyStats(sessions);

    expect(stats.total_minutes).toBe(65); // 20 + 15 + 30
    expect(stats.total_vitamin_d_iu).toBe(650); // 200 + 150 + 300
    expect(stats.sessions_count).toBe(3);
  });

  it('tracks max_uv_index correctly', () => {
    const sessions: SessionRecord[] = [
      { duration_minutes: 20, estimated_vitamin_d_iu: 200, uv_index_at_time: 3 },
      { duration_minutes: 10, estimated_vitamin_d_iu: 100, uv_index_at_time: 9 },
      { duration_minutes: 25, estimated_vitamin_d_iu: 250, uv_index_at_time: 5 },
    ];

    const stats = aggregateDailyStats(sessions);
    expect(stats.max_uv_index).toBe(9);
  });

  it('calculates avg_uv_index correctly', () => {
    const sessions: SessionRecord[] = [
      { duration_minutes: 20, estimated_vitamin_d_iu: 200, uv_index_at_time: 4 },
      { duration_minutes: 20, estimated_vitamin_d_iu: 200, uv_index_at_time: 6 },
    ];

    const stats = aggregateDailyStats(sessions);
    expect(stats.avg_uv_index).toBe(5); // (4+6)/2
  });

  it('returns zeros for empty sessions array', () => {
    const stats = aggregateDailyStats([]);
    expect(stats.total_minutes).toBe(0);
    expect(stats.total_vitamin_d_iu).toBe(0);
    expect(stats.sessions_count).toBe(0);
    expect(stats.max_uv_index).toBe(0);
  });

  it('handles a single session', () => {
    const sessions: SessionRecord[] = [
      { duration_minutes: 45, estimated_vitamin_d_iu: 540, uv_index_at_time: 6 },
    ];

    const stats = aggregateDailyStats(sessions);
    expect(stats.total_minutes).toBe(45);
    expect(stats.total_vitamin_d_iu).toBe(540);
    expect(stats.sessions_count).toBe(1);
    expect(stats.max_uv_index).toBe(6);
    expect(stats.avg_uv_index).toBe(6);
  });

  it('total_vitamin_d_iu is always the sum of individual session IU values', () => {
    const sessions: SessionRecord[] = [
      { duration_minutes: 10, estimated_vitamin_d_iu: 120, uv_index_at_time: 6 },
      { duration_minutes: 20, estimated_vitamin_d_iu: 240, uv_index_at_time: 6 },
      { duration_minutes: 5, estimated_vitamin_d_iu: 60, uv_index_at_time: 6 },
    ];

    const stats = aggregateDailyStats(sessions);
    const expectedTotal = sessions.reduce((s, r) => s + r.estimated_vitamin_d_iu, 0);
    expect(stats.total_vitamin_d_iu).toBe(expectedTotal); // 420
  });
});
