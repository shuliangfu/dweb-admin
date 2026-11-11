/**
 * CS claim mutex via @dreamer/queue (concurrency 1).
 * Serializes claim attempts in this api process so two admins clicking the same
 * session cannot both pass the unclaimed check before write.
 * Atomic DB claim (findOneAndUpdate) remains the source of truth.
 * marker: CS_CLAIM_QUEUE_MUTEX_20261107
 */
import {
  MemoryQueueAdapter,
  QueueManager,
  type Job,
} from "@dreamer/queue";
import {
  claimCsSessionAtomic,
  type ClaimCsResult,
} from "@common/service/cs.ts";

type ClaimJobData = {
  requestId: string;
  sessionId: string;
  adminId: string;
  adminName: string;
};

const pending = new Map<
  string,
  {
    resolve: (r: ClaimCsResult) => void;
    reject: (e: unknown) => void;
  }
>();

let _ready: Promise<void> | null = null;
let _queue: ReturnType<QueueManager["createQueue"]> | null = null;

function ensureClaimQueue(): Promise<void> {
  if (_ready) return _ready;
  _ready = Promise.resolve().then(() => {
    // In-process mutex is enough for single api listen (8813). Atomic Mongo
    // claim still protects cross-process races if api is scaled later.
    const adapter = new MemoryQueueAdapter();
    const manager = new QueueManager({ adapter, autoRecover: false });
    const q = manager.createQueue("cs-claim", {
      concurrency: 1,
      retry: 0,
      timeout: 15_000,
    });
    q.process(async (job: Job) => {
      const d = job.data as ClaimJobData;
      const waiters = pending.get(d.requestId);
      try {
        const result = await claimCsSessionAtomic(d.sessionId, {
          id: d.adminId,
          name: d.adminName,
        });
        waiters?.resolve(result);
      } catch (e) {
        waiters?.reject(e);
      } finally {
        pending.delete(d.requestId);
      }
    });
    _queue = q;
  });
  return _ready;
}

/**
 * Enqueue a claim; resolves with the same result shape as claimCsSessionAtomic.
 */
export async function claimCsSessionQueued(
  sessionId: string,
  admin: { id: string; name: string },
): Promise<ClaimCsResult> {
  await ensureClaimQueue();
  const q = _queue;
  if (!q) {
    return claimCsSessionAtomic(sessionId, admin);
  }
  const requestId =
    `claim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const resultPromise = new Promise<ClaimCsResult>((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
  });
  await q.add("claim", {
    requestId,
    sessionId,
    adminId: admin.id,
    adminName: admin.name,
  } satisfies ClaimJobData);
  return await resultPromise;
}
