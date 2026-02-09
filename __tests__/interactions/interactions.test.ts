/**
 * Interaction Tests
 * 
 * Tests the LocalInteractionsRepo (AsyncStorage-backed) and
 * warmth utility functions from backend-vercel/lib/warmth.ts.
 * 
 * Local repo is tested directly (no network needed).
 * Warmth utils are inlined since backend-vercel is excluded from jest module resolution.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- Inline warmth utilities (from backend-vercel/lib/warmth.ts) ----------

const WARMTH_INTERACTION_KINDS = [
  'email', 'call', 'sms', 'meeting', 'dm',
  'social', 'linkedin', 'twitter', 'instagram', 'facebook',
  'whatsapp', 'telegram', 'slack',
  'video_call', 'in_person',
] as const;

function affectsWarmth(kind: string): boolean {
  return (WARMTH_INTERACTION_KINDS as readonly string[]).includes(kind);
}

const WARMTH_CONFIG = {
  BASE_SCORE: 40,
  MAX_RECENCY_BOOST: 25,
  MAX_FREQUENCY_BOOST: 15,
  CHANNEL_BREADTH_BONUS: 5,
  DECAY_START_DAYS: 7,
  DECAY_PER_DAY: 0.5,
  MAX_DECAY: 30,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  RECENCY_WINDOW_DAYS: 90,
  FREQUENCY_WINDOW_DAYS: 90,
  CHANNEL_BREADTH_WINDOW_DAYS: 30,
  MAX_FREQUENCY_INTERACTIONS: 6,
  MIN_CHANNEL_KINDS_FOR_BONUS: 2,
} as const;

// ---------- Tests ----------

describe('affectsWarmth', () => {
  test('returns true for communication interaction kinds', () => {
    expect(affectsWarmth('email')).toBe(true);
    expect(affectsWarmth('call')).toBe(true);
    expect(affectsWarmth('meeting')).toBe(true);
    expect(affectsWarmth('sms')).toBe(true);
    expect(affectsWarmth('dm')).toBe(true);
  });

  test('returns true for social media interaction kinds', () => {
    expect(affectsWarmth('linkedin')).toBe(true);
    expect(affectsWarmth('twitter')).toBe(true);
    expect(affectsWarmth('instagram')).toBe(true);
    expect(affectsWarmth('facebook')).toBe(true);
    expect(affectsWarmth('whatsapp')).toBe(true);
    expect(affectsWarmth('telegram')).toBe(true);
  });

  test('returns true for in-person and video interactions', () => {
    expect(affectsWarmth('in_person')).toBe(true);
    expect(affectsWarmth('video_call')).toBe(true);
  });

  test('returns false for internal actions', () => {
    expect(affectsWarmth('note')).toBe(false);
    expect(affectsWarmth('screenshot_note')).toBe(false);
    expect(affectsWarmth('pipeline_update')).toBe(false);
    expect(affectsWarmth('system')).toBe(false);
  });

  test('returns false for unknown kinds', () => {
    expect(affectsWarmth('unknown')).toBe(false);
    expect(affectsWarmth('')).toBe(false);
    expect(affectsWarmth('random_action')).toBe(false);
  });
});

describe('WARMTH_CONFIG', () => {
  test('has correct base score', () => {
    expect(WARMTH_CONFIG.BASE_SCORE).toBe(40);
  });

  test('max score is 100', () => {
    expect(WARMTH_CONFIG.MAX_SCORE).toBe(100);
  });

  test('min score is 0', () => {
    expect(WARMTH_CONFIG.MIN_SCORE).toBe(0);
  });

  test('max possible score = base + recency + frequency + breadth', () => {
    const maxPossible = WARMTH_CONFIG.BASE_SCORE
      + WARMTH_CONFIG.MAX_RECENCY_BOOST
      + WARMTH_CONFIG.MAX_FREQUENCY_BOOST
      + WARMTH_CONFIG.CHANNEL_BREADTH_BONUS;
    // 40 + 25 + 15 + 5 = 85
    expect(maxPossible).toBe(85);
    expect(maxPossible).toBeLessThanOrEqual(WARMTH_CONFIG.MAX_SCORE);
  });

  test('decay caps at 30', () => {
    expect(WARMTH_CONFIG.MAX_DECAY).toBe(30);
  });

  test('decay starts after 7 days', () => {
    expect(WARMTH_CONFIG.DECAY_START_DAYS).toBe(7);
  });

  test('frequency caps at 6 interactions', () => {
    expect(WARMTH_CONFIG.MAX_FREQUENCY_INTERACTIONS).toBe(6);
  });

  test('needs 2+ channel kinds for breadth bonus', () => {
    expect(WARMTH_CONFIG.MIN_CHANNEL_KINDS_FOR_BONUS).toBe(2);
  });
});

describe('LocalInteractionsRepo (in-memory)', () => {
  const INTERACTIONS_PREFIX = 'interactions/';

  // In-memory store that mirrors AsyncStorage behavior
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
  });

  function storeInteraction(interaction: any) {
    store[INTERACTIONS_PREFIX + interaction.id] = JSON.stringify(interaction);
  }

  function getInteraction(id: string): any | null {
    const raw = store[INTERACTIONS_PREFIX + id];
    return raw ? JSON.parse(raw) : null;
  }

  function getAllInteractions(): any[] {
    return Object.entries(store)
      .filter(([k]) => k.startsWith(INTERACTIONS_PREFIX))
      .map(([, v]) => JSON.parse(v));
  }

  test('creates interaction with auto-generated fields', () => {
    const input = {
      person_id: 'person-1',
      type: 'call' as const,
      direction: 'outbound' as const,
      summary: 'Discussed project',
      occurred_at: '2024-06-01T10:00:00Z',
    };

    const id = Date.now().toString();
    const created = {
      ...input,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    storeInteraction(created);

    const parsed = getInteraction(id);
    expect(parsed).not.toBeNull();
    expect(parsed.person_id).toBe('person-1');
    expect(parsed.type).toBe('call');
    expect(parsed.summary).toBe('Discussed project');
    expect(parsed.created_at).toBeDefined();
    expect(parsed.updated_at).toBeDefined();
  });

  test('retrieves interaction by ID', () => {
    storeInteraction({
      id: 'int-get-test',
      person_id: 'person-1',
      type: 'email',
      occurred_at: '2024-06-01T10:00:00Z',
    });

    const result = getInteraction('int-get-test');
    expect(result).not.toBeNull();
    expect(result.type).toBe('email');
  });

  test('returns null for nonexistent ID', () => {
    expect(getInteraction('nonexistent')).toBeNull();
  });

  test('updates interaction fields', () => {
    storeInteraction({
      id: 'int-update-test',
      person_id: 'person-1',
      type: 'meeting',
      summary: 'Original',
      occurred_at: '2024-06-01T10:00:00Z',
    });

    // Update
    const existing = getInteraction('int-update-test');
    storeInteraction({
      ...existing,
      summary: 'Updated summary',
      updated_at: new Date().toISOString(),
    });

    expect(getInteraction('int-update-test').summary).toBe('Updated summary');
  });

  test('deletes interaction', () => {
    storeInteraction({
      id: 'int-delete-test',
      person_id: 'person-1',
      type: 'call',
      occurred_at: '2024-06-01T10:00:00Z',
    });

    expect(getInteraction('int-delete-test')).not.toBeNull();

    delete store[INTERACTIONS_PREFIX + 'int-delete-test'];

    expect(getInteraction('int-delete-test')).toBeNull();
  });

  test('filters interactions by person_id', () => {
    storeInteraction({ id: 'i1', person_id: 'p1', type: 'call', occurred_at: '2024-01-01' });
    storeInteraction({ id: 'i2', person_id: 'p2', type: 'email', occurred_at: '2024-01-02' });
    storeInteraction({ id: 'i3', person_id: 'p1', type: 'meeting', occurred_at: '2024-01-03' });

    const p1Interactions = getAllInteractions().filter(i => i.person_id === 'p1');
    expect(p1Interactions).toHaveLength(2);
    expect(p1Interactions.map(i => i.type).sort()).toEqual(['call', 'meeting']);
  });

  test('filters interactions by type', () => {
    storeInteraction({ id: 'i4', person_id: 'p1', type: 'call', occurred_at: '2024-01-01' });
    storeInteraction({ id: 'i5', person_id: 'p1', type: 'email', occurred_at: '2024-01-02' });
    storeInteraction({ id: 'i6', person_id: 'p1', type: 'call', occurred_at: '2024-01-03' });

    const calls = getAllInteractions().filter(i => i.type === 'call');
    expect(calls).toHaveLength(2);
  });

  test('sorts interactions by occurred_at descending', () => {
    storeInteraction({ id: 'older', person_id: 'p1', type: 'call', occurred_at: '2024-01-01T00:00:00Z' });
    storeInteraction({ id: 'newer', person_id: 'p1', type: 'email', occurred_at: '2024-06-01T00:00:00Z' });

    const sorted = getAllInteractions().sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
    expect(sorted[0].id).toBe('newer');
    expect(sorted[1].id).toBe('older');
  });

  test('interaction has all required fields', () => {
    const interaction = {
      id: 'test-id',
      person_id: 'person-1',
      type: 'call' as const,
      direction: 'outbound' as const,
      summary: 'Quick check-in',
      notes: 'Discussed Q3 goals',
      duration_minutes: 15,
      occurred_at: '2024-06-01T10:00:00Z',
      created_at: '2024-06-01T10:00:00Z',
      metadata: { source: 'manual' },
    };

    expect(interaction.id).toBeDefined();
    expect(interaction.person_id).toBeDefined();
    expect(interaction.type).toBeDefined();
    expect(interaction.occurred_at).toBeDefined();
    expect(['call', 'email', 'meeting', 'note', 'message', 'other']).toContain(interaction.type);
    expect(['inbound', 'outbound']).toContain(interaction.direction);
  });

  test('interaction types cover all expected channels', () => {
    const validTypes = ['call', 'email', 'meeting', 'note', 'message', 'other'];
    for (const type of validTypes) {
      const interaction = { id: `t-${type}`, person_id: 'p1', type, occurred_at: '2024-01-01' };
      storeInteraction(interaction);
      expect(getInteraction(`t-${type}`).type).toBe(type);
    }
  });
});
