import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { outboxHandlers } from './services/outbox/handlers';
import { dispatchOnce } from './services/outbox/outbox';
import { reconcileOnce } from './services/payment/reconciler';
import { expireSubscriptions } from './services/subscriptionService';

// Background worker, run as its own process (`node dist/worker.js`):
//   - delivers outbox events (waitlist promotions, payment e-mails)
//   - reconciles VNPay orders whose IPN never arrived
//   - expires memberships past their end date
// Every query it runs uses FOR UPDATE SKIP LOCKED or an idempotent UPDATE, so more than one
// worker can run at the same time without double-processing.

let stopping = false;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function outboxLoop() {
  while (!stopping) {
    try {
      const { claimed } = await dispatchOnce(outboxHandlers);
      // A full batch means there is probably more waiting: go again without sleeping.
      if (claimed < 20) await sleep(env.worker.pollIntervalMs);
    } catch (err) {
      logger.error('Outbox loop error', { type: 'WORKER', error: err instanceof Error ? err.message : String(err) });
      await sleep(env.worker.pollIntervalMs * 5);
    }
  }
}

async function maintenanceLoop() {
  while (!stopping) {
    try {
      await reconcileOnce();
      const expired = await expireSubscriptions();
      if (expired > 0) logger.info('Expired subscriptions', { type: 'WORKER', count: expired });
    } catch (err) {
      logger.error('Maintenance loop error', { type: 'WORKER', error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(env.worker.reconcileIntervalMs);
  }
}

async function main() {
  logger.info('Worker started', { type: 'STARTUP' });
  const loops = Promise.all([outboxLoop(), maintenanceLoop()]);

  const stop = (signal: string) => {
    logger.info('Worker stopping after the current batch', { type: 'SHUTDOWN', signal });
    stopping = true;
    setTimeout(() => process.exit(1), 30_000).unref();
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));

  await loops;
  await prisma.$disconnect();
  logger.info('Worker stopped', { type: 'SHUTDOWN' });
}

void main();
