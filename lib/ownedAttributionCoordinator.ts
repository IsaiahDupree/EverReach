import { persistFirstTouchAttribution } from '@/lib/contentAttribution';
import { redeemPendingInstallAttribution } from '@/lib/installAttributionHandoff';
import { initializeMarketingFunnel } from '@/lib/marketingFunnel';
import { persistOwnedInstallOutcome } from '@/lib/ownedInstallOutcome';

export type OwnedAttributionStageName =
  | 'initialize'
  | 'recover_install_journey'
  | 'persist_first_touch'
  | 'persist_install_outcome';

export type OwnedAttributionStageResult = {
  status: 'fulfilled' | 'rejected';
  error?: string;
};

export type OwnedAttributionFlushResult = {
  userId: string;
  ok: boolean;
  stages: Record<OwnedAttributionStageName, OwnedAttributionStageResult>;
};

let serializedFlush: Promise<unknown> = Promise.resolve();
const activeByUser: Record<string, Promise<OwnedAttributionFlushResult> | undefined> = {};

async function runStage(action: () => Promise<unknown>): Promise<OwnedAttributionStageResult> {
  try {
    await action();
    return { status: 'fulfilled' };
  } catch (error) {
    return {
      status: 'rejected',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runOwnedAttributionFlush(
  userId: string,
): Promise<OwnedAttributionFlushResult> {
  const stages: Record<OwnedAttributionStageName, OwnedAttributionStageResult> = {
    initialize: await runStage(() => initializeMarketingFunnel()),
    recover_install_journey: await runStage(() => redeemPendingInstallAttribution(userId)),
    persist_first_touch: await runStage(() => persistFirstTouchAttribution(userId)),
    persist_install_outcome: await runStage(() => persistOwnedInstallOutcome(userId)),
  };
  return {
    userId,
    ok: Object.values(stages).every((stage) => stage.status === 'fulfilled'),
    stages,
  };
}

export function flushOwnedAttribution(
  authenticatedUserId: string,
): Promise<OwnedAttributionFlushResult> {
  const userId = authenticatedUserId.trim();
  if (!userId) return Promise.reject(new Error('A real authenticated user ID is required'));
  const active = activeByUser[userId];
  if (active) return active;
  const previous = serializedFlush;
  const job = (async () => {
    try {
      await previous;
    } catch {
      // A prior identity failure cannot suppress this identity's audit.
    }
    return runOwnedAttributionFlush(userId);
  })();
  serializedFlush = job;
  activeByUser[userId] = job;
  void job.finally(() => {
    if (activeByUser[userId] === job) delete activeByUser[userId];
  });
  return job;
}
