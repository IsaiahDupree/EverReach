import { options, ok } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

// Warmth mode decay constants
export const WARMTH_MODES = {
  slow: {
    mode: "slow",
    lambda: 0.040132,
    halfLifeDays: 17.3,
    daysToReachout: 29.9,
    description: "~30 days between touches",
  },
  medium: {
    mode: "medium",
    lambda: 0.085998,
    halfLifeDays: 8.1,
    daysToReachout: 13.9,
    description: "~14 days between touches",
  },
  fast: {
    mode: "fast",
    lambda: 0.171996,
    halfLifeDays: 4.0,
    daysToReachout: 7.0,
    description: "~7 days between touches",
  },
  test: {
    mode: "test",
    lambda: 2.407946,
    halfLifeDays: 0.7,
    daysToReachout: 0.5,
    description: "~12 hours (testing only)",
  },
} as const;

export type WarmthMode = keyof typeof WARMTH_MODES;

// GET /api/v1/warmth/modes
export async function GET(req: Request) {
  return ok(
    {
      modes: Object.values(WARMTH_MODES),
      default: "medium",
    },
    req
  );
}
