import { Worker, Job } from 'bullmq';
import { redisConfigOptions } from './config';
import { getClient } from '../database/db';
// @ts-ignore
import { analyzeCompanyWebsite } from '../services/companyIntel/level1Analyzer';
// @ts-ignore
import { detectCareerPage } from '../services/companyIntel/level2CareerDetector';
// @ts-ignore
import { detectATSProvider } from '../services/companyIntel/level3AtsDetector';
// @ts-ignore
import { extractJobs } from '../services/companyIntel/extractJobsDispatcher';
// @ts-ignore
import { analyzeCompanyWithAI } from '../services/companyIntel/level4AiAnalyzer';
// @ts-ignore
import { calculateHiringScore } from '../services/companyIntel/level5HiringScore';

console.log('🚀 Initializing BullMQ Worker for company-scrape queue...');
console.log(`📡 Redis config: ${redisConfigOptions}`);

async function processLevel1(companyId: string, scrapeJobId: string) {
  const client = await getClient();
  try {
    const companyResult = await client.query('SELECT website FROM companies WHERE id = $1', [companyId]);
    if (companyResult.rows.length === 0) throw new Error('Company not found');
    const website = companyResult.rows[0].website;
    
    console.log(`  → Level 1: Fetching ${website}`);
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Level 1 timeout after 60 seconds')), 60000)
    );
    
    const result = await Promise.race([
      analyzeCompanyWebsite(website),
      timeoutPromise
    ]) as any;
    
    console.log(`  → Level 1 result:`, JSON.stringify({
      companyName: result.companyName,
      emailsCount: result.emails?.length || 0,
      phonesCount: result.phones?.length || 0,
      careerCandidatesCount: result.careerUrlCandidates?.length || 0,
      linkedin: result.socialLinks?.linkedin,
      errors: result.errors
    }, null, 2));
    
    await client.query(`UPDATE companies SET career_url = $1, linkedin_url = $2 WHERE id = $3`, [result.careerUrlCandidates[0] || null, result.socialLinks?.linkedin || null, companyId]);
    
    for (const email of result.emails || []) {
      await client.query(`INSERT INTO company_contacts (company_id, email, contact_type) VALUES ($1, $2, 'general') ON CONFLICT DO NOTHING`, [companyId, email]);
    }
    for (const phone of result.phones || []) {
      await client.query(`INSERT INTO company_contacts (company_id, phone, contact_type) VALUES ($1, $2, 'general') ON CONFLICT DO NOTHING`, [companyId, phone]);
    }
    
    await updateScrapeJob(scrapeJobId, { level_reached: 1 });
    if (result.errors && result.errors.length > 0) {
      console.log(`  ⚠ Level 1 completed with errors`);
      return { success: true, hasWarnings: true, error: result.errors.join(', '), data: result };
    }
    console.log(`  ✓ Level 1 completed`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`  ✗ Level 1 failed:`, error.message);
    await updateScrapeJob(scrapeJobId, { error_message: `Level 1: ${error.message}` });
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

async function processLevel2(companyId: string, scrapeJobId: string, level1Result: any) {
  const client = await getClient();
  try {
    const companyResult = await client.query('SELECT website FROM companies WHERE id = $1', [companyId]);
    const website = companyResult.rows[0].website;
    console.log(`  → Level 2: Detecting career page`);
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Level 2 timeout after 30 seconds')), 30000)
    );
    
    const result = await Promise.race([
      detectCareerPage(website, level1Result?.data, {}),
      timeoutPromise
    ]) as any;
    
    console.log(`  → Level 2 result:`, JSON.stringify(result, null, 2));
    if (result.careerUrl) {
      await client.query(`UPDATE companies SET career_url = $1 WHERE id = $2`, [result.careerUrl, companyId]);
    }
    await updateScrapeJob(scrapeJobId, { level_reached: 2 });
    console.log(`  ✓ Level 2 completed`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`  ✗ Level 2 failed:`, error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

async function processLevel3(companyId: string, scrapeJobId: string, level1Result: any, level2Result: any) {
  const client = await getClient();
  try {
    const companyResult = await client.query('SELECT career_url FROM companies WHERE id = $1', [companyId]);
    const careerUrl = companyResult.rows[0].career_url;
    if (!careerUrl) {
      console.log(`  ⚠ Level 3: No career URL, skipping`);
      await updateScrapeJob(scrapeJobId, { level_reached: 3 });
      return { success: true, skipped: true, data: { atsProvider: null, jobs: [] } };
    }
    console.log(`  → Level 3: Detecting ATS from ${careerUrl}`);
    
    // Add timeout protection for career page fetch
    let careerPageHtml = '';
    try {
      const axios = require('axios');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Career page fetch timeout after 15 seconds')), 15000)
      );
      const fetchPromise = axios.get(careerUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      const response = await Promise.race([fetchPromise, timeoutPromise]) as any;
      careerPageHtml = response.data;
    } catch (error) {
      console.log(`  ⚠ Level 3: Failed to fetch career page HTML, proceeding without it`);
    }
    
    const atsResult = await detectATSProvider(careerUrl, careerPageHtml);
    console.log(`  → ATS provider:`, atsResult);
    
    const jobsResult = await extractJobs(careerUrl, atsResult.provider);
    console.log(`  → Jobs extracted: ${jobsResult.jobs?.length || 0}`);
    
    if (atsResult.provider) {
      await client.query(`UPDATE companies SET ats_provider = $1 WHERE id = $2`, [atsResult.provider, companyId]);
    }
    for (const job of jobsResult.jobs || []) {
      await client.query(`INSERT INTO company_jobs (company_id, title, location, experience_level, job_url, posted_date) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (company_id, job_url) DO UPDATE SET title = EXCLUDED.title, location = EXCLUDED.location, last_seen_at = NOW()`, [companyId, job.title, job.location, job.experienceLevel, job.url, job.postedDate]);
    }
    await updateScrapeJob(scrapeJobId, { level_reached: 3 });
    console.log(`  ✓ Level 3 completed`);
    return { success: true, data: { atsProvider: atsResult.provider, jobs: jobsResult.jobs } };
  } catch (error: any) {
    console.error(`  ✗ Level 3 failed:`, error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

async function processLevel4(companyId: string, scrapeJobId: string, level1Result: any, level3Result: any) {
  const client = await getClient();
  try {
    console.log(`  → Level 4: AI analysis`);
    
    // Gather company data from previous levels
    const companyData = {
      companyId,
      companyName: level1Result?.data?.companyName,
      aboutText: level1Result?.data?.aboutText || null,
      emails: level1Result?.data?.emails || [],
      jobs: level3Result?.data?.jobs || [],
      socialLinks: level1Result?.data?.socialLinks || {},
      industry_hint: null,
      teamPageText: null,
    };
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Level 4 timeout after 90 seconds')), 90000)
    );
    
    const result = await Promise.race([
      analyzeCompanyWithAI(companyData),
      timeoutPromise
    ]) as any;
    
    console.log(`  → Level 4 result:`, JSON.stringify(result, null, 2));
    
    // Note: persistAIResults is called inside analyzeCompanyWithAI, so we don't need to update here
    await updateScrapeJob(scrapeJobId, { level_reached: 4 });
    console.log(`  ✓ Level 4 completed`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`  ✗ Level 4 failed:`, error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

async function processLevel5(companyId: string, scrapeJobId: string) {
  const client = await getClient();
  try {
    console.log(`  → Level 5: Calculating hiring score`);
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Level 5 timeout after 30 seconds')), 30000)
    );
    
    const result = await Promise.race([
      calculateHiringScore(companyId),
      timeoutPromise
    ]) as any;
    
    console.log(`  → Level 5 result:`, JSON.stringify({ score: result.score, label: result.label, breakdown: result.breakdown }, null, 2));
    await updateScrapeJob(scrapeJobId, { level_reached: 5 });
    console.log(`  ✓ Level 5 completed`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`  ✗ Level 5 failed:`, error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

async function updateScrapeJob(scrapeJobId: string, updates: any) {
  const client = await getClient();
  try {
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    const query = `UPDATE scrape_jobs SET ${setClause}, started_at = CASE WHEN started_at IS NULL THEN NOW() ELSE started_at END, completed_at = CASE WHEN $1::text IN ('success', 'failed', 'partial') THEN NOW() ELSE completed_at END WHERE id = $1`;
    await client.query(query, [scrapeJobId, ...values]);
  } catch (error: any) {
    console.error('Failed to update scrape job:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function updateCompanyLastScraped(companyId: string) {
  const client = await getClient();
  try {
    await client.query(`UPDATE companies SET last_scraped_at = NOW() WHERE id = $1`, [companyId]);
  } catch (error: any) {
    console.error('Failed to update company last_scraped_at:', error.message);
  } finally {
    client.release();
  }
}

export const companyScrapeWorker = new Worker(
  'company-scrape',
  async (job: Job) => {
    const { companyId } = job.data;
    console.log(`🔄 Worker received job for company ${companyId}, BullMQ job ID: ${job.id}`);
    
    const client = await getClient();
    let scrapeJobId: string;
    try {
      const result = await client.query(`SELECT id FROM scrape_jobs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`, [companyId]);
      if (result.rows.length === 0) throw new Error(`No scrape job found for company ${companyId}`);
      scrapeJobId = result.rows[0].id;
      console.log(`✓ Found scrape job record: ${scrapeJobId}`);
    } catch (error: any) {
      console.error('Error fetching scrape job:', error.message);
      throw error;
    } finally {
      client.release();
    }
    
    await updateScrapeJob(scrapeJobId, { status: 'running', level_reached: 1 });
    
    const results: any = { level1: null, level2: null, level3: null, level4: null, level5: null };
    let hasErrors = false;
    let errorMessages: string[] = [];
    
    try {
      results.level1 = await processLevel1(companyId, scrapeJobId);
      if (!results.level1.success) { hasErrors = true; errorMessages.push(results.level1.error); }
      results.level2 = await processLevel2(companyId, scrapeJobId, results.level1);
      if (!results.level2.success) { hasErrors = true; errorMessages.push(results.level2.error); }
      results.level3 = await processLevel3(companyId, scrapeJobId, results.level1, results.level2);
      if (!results.level3.success) { hasErrors = true; errorMessages.push(results.level3.error); }
      results.level4 = await processLevel4(companyId, scrapeJobId, results.level1, results.level3);
      if (!results.level4.success) { hasErrors = true; errorMessages.push(results.level4.error); }
      results.level5 = await processLevel5(companyId, scrapeJobId);
      if (!results.level5.success) { hasErrors = true; errorMessages.push(results.level5.error); }
      
      const finalStatus = hasErrors ? 'partial' : 'success';
      await updateScrapeJob(scrapeJobId, { status: finalStatus, level_reached: 5, error_message: errorMessages.length > 0 ? errorMessages.join(' | ') : null });
      await updateCompanyLastScraped(companyId);
      console.log(`✅ Scrape completed with status: ${finalStatus}`);
      return { success: true, status: finalStatus };
    } catch (error: any) {
      console.error(`❌ Scrape failed for company ${companyId}:`, error.message);
      await updateScrapeJob(scrapeJobId, { status: 'failed', level_reached: 1, error_message: `Fatal error: ${error.message}` });
      throw error;
    }
  },
  {
    connection: redisConfigOptions as any,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  }
);

companyScrapeWorker.on('completed', (job: Job) => console.log(`✅ Job ${job.id} completed successfully`));
companyScrapeWorker.on('failed', (job: Job | undefined, err: Error) => console.error(`❌ Job ${job?.id} failed:`, err.message));
companyScrapeWorker.on('error', (err: Error) => console.error('🔴 Worker error:', err));
companyScrapeWorker.on('ready', () => console.log('✅ Worker is ready and listening for jobs on queue: company-scrape'));
console.log('Worker started successfully');

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await companyScrapeWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await companyScrapeWorker.close();
  process.exit(0);
});

export default companyScrapeWorker;
