/**
 * Company Intelligence Queues Module
 * 
 * This module provides BullMQ queue and worker setup for company intelligence operations.
 * 
 * Usage:
 * 
 * To add a scrape job:
 * import { addCompanyScrapeJob } from './queues';
 * await addCompanyScrapeJob(companyId);
 * 
 * To start the worker:
 * import { companyScrapeWorker } from './queues';
 * // Worker will auto-start on import
 */

export { redisConfigOptions, queueConfig } from './config';
export { 
  companyScrapeQueue, 
  addCompanyScrapeJob, 
  addBulkCompanyScrapeJobs 
} from './company-scrape.queue';
export { companyScrapeWorker } from './company-scrape.worker';
