import { Queue, Job } from 'bullmq';
import { queueConfig } from './config';

/**
 * Company Scrape Queue
 * Handles jobs for scraping company data from career pages
 */
export const companyScrapeQueue = new Queue('company-scrape', queueConfig);

/**
 * Add a company scrape job to the queue
 * @param companyId - UUID of the company to scrape
 * @param options - Optional job options
 */
export const addCompanyScrapeJob = async (
  companyId: string,
  options?: {
    priority?: number;
    delay?: number;
    attempts?: number;
  }
) => {
  return await companyScrapeQueue.add(
    'scrape-company',
    { companyId },
    {
      priority: options?.priority || 5,
      delay: options?.delay || 0,
      attempts: options?.attempts || 3,
    }
  );
};

/**
 * Add multiple company scrape jobs to the queue
 * @param companyIds - Array of company UUIDs to scrape
 */
export const addBulkCompanyScrapeJobs = async (companyIds: string[]) => {
  const jobs = companyIds.map((companyId) => ({
    name: 'scrape-company',
    data: { companyId },
    opts: { priority: 5 },
  }));

  return await companyScrapeQueue.addBulk(jobs);
};

export default companyScrapeQueue;
