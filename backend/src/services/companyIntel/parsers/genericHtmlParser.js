const { chromium } = require('playwright');
const { getClient } = require('../../../database/db');

/**
 * Provider-specific selectors and wait strategies
 */
const providerConfig = {
  workday: {
    waitSelector: '[data-automation-id="jobResults"]',
    jobContainer: 'li',
    titleSelector: 'a[data-automation-id="jobTitle"]',
    linkSelector: 'a[data-automation-id="jobTitle"]',
    locationSelector: '[data-automation-id="locations"]',
  },
  ashby: {
    waitSelector: 'div[class*="ashby-job-posting-brief-list"]',
    jobContainer: 'a',
    titleSelector: 'h2, h3, .title',
    linkSelector: 'a',
    locationSelector: '.location, [class*="location"]',
  },
  smartrecruiters: {
    waitSelector: '.job',
    jobContainer: '.job',
    titleSelector: 'h3, .title, [class*="title"]',
    linkSelector: 'a',
    locationSelector: '.location, [class*="location"]',
  },
  unknown: {
    waitSelector: 'body',
    jobContainer: null,
    titleSelector: 'h2, h3, h4',
    linkSelector: 'a',
    locationSelector: '.location, [class*="location"], .city, [class*="city"]',
  },
};

/**
 * Extract experience level from title
 * @param {string} title - Job title
 * @returns {string|null}
 */
function extractExperienceLevel(title) {
  const titleLower = (title || '').toLowerCase();
  
  if (titleLower.includes('senior') || titleLower.includes('sr.')) {
    return 'Senior';
  }
  if (titleLower.includes('lead') || titleLower.includes('manager') || titleLower.includes('principal')) {
    return 'Mid';
  }
  if (titleLower.includes('junior') || titleLower.includes('jr.') || titleLower.includes('associate')) {
    return 'Junior';
  }
  if (titleLower.includes('intern') || titleLower.includes('internship')) {
    return 'Internship';
  }
  
  return null;
}

/**
 * Parse jobs from generic HTML page using Playwright
 * @param {string} companyId - Company UUID
 * @param {string} boardUrl - Career page URL
 * @param {string} provider - ATS provider for selector hints
 * @returns {Promise<Array>} - Array of job objects
 */
async function parseJobs(companyId, boardUrl, provider = 'unknown') {
  let browser = null;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    const page = await context.newPage();
    
    // Navigate to page
    await page.goto(boardUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    
    // Get provider-specific config
    const config = providerConfig[provider] || providerConfig.unknown;
    
    // Wait for job container to load
    if (config.waitSelector) {
      try {
        await page.waitForSelector(config.waitSelector, { timeout: 10000 });
      } catch {
        // Selector not found, continue anyway
      }
    }
    
    // Extract job listings
    const jobs = await page.evaluate((config) => {
      const jobListings = [];
      
      let jobElements;
      if (config.jobContainer) {
        jobElements = Array.from(document.querySelectorAll(config.jobContainer));
      } else {
        // Fallback: find repeated sibling elements that look like job cards
        jobElements = Array.from(document.querySelectorAll('a[href*="job"], a[href*="position"], a[href*="role"]'));
      }
      
      const seenUrls = new Set();
      
      for (const element of jobElements) {
        // Find title
        let titleElement = element.querySelector(config.titleSelector);
        if (!titleElement) {
          titleElement = element;
        }
        const title = titleElement?.textContent?.trim();
        
        // Find link
        let linkElement = element.querySelector(config.linkSelector);
        if (!linkElement && element.tagName === 'A') {
          linkElement = element;
        }
        const jobUrl = linkElement?.href;
        
        // Find location
        let locationElement = element.querySelector(config.locationSelector);
        const location = locationElement?.textContent?.trim();
        
        if (title && jobUrl && !seenUrls.has(jobUrl)) {
          seenUrls.add(jobUrl);
          jobListings.push({
            title,
            location,
            jobUrl,
          });
        }
      }
      
      return jobListings;
    }, config);
    
    // Process extracted jobs
    const parsedJobs = [];
    const seenJobUrls = new Set();
    
    for (const job of jobs) {
      if (!job.jobUrl || seenJobUrls.has(job.jobUrl)) continue;
      seenJobUrls.add(job.jobUrl);
      
      parsedJobs.push({
        title: job.title,
        location: job.location,
        experienceLevel: extractExperienceLevel(job.title),
        jobUrl: job.jobUrl,
        postedDate: null, // Can't reliably extract from HTML without scraping individual pages
      });
    }
    
    // Upsert to database
    await upsertJobs(companyId, parsedJobs);
    
    // Soft-delete jobs not seen in this run
    await softDeleteExpiredJobs(companyId, seenJobUrls);
    
    return parsedJobs;
    
  } catch (error) {
    console.error(`Error parsing HTML jobs for ${boardUrl}:`, error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Upsert jobs to database
 * @param {string} companyId - Company UUID
 * @param {Array} jobs - Array of job objects
 */
async function upsertJobs(companyId, jobs) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    for (const job of jobs) {
      const query = `
        INSERT INTO company_jobs (company_id, title, location, experience_level, job_url, posted_date, is_active, first_seen_at, last_seen_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
        ON CONFLICT (company_id, job_url)
        DO UPDATE SET
          title = EXCLUDED.title,
          location = EXCLUDED.location,
          experience_level = EXCLUDED.experience_level,
          posted_date = EXCLUDED.posted_date,
          is_active = true,
          last_seen_at = NOW()
      `;
      
      await client.query(query, [
        companyId,
        job.title,
        job.location,
        job.experienceLevel,
        job.jobUrl,
        job.postedDate,
      ]);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Soft-delete jobs not seen in this run
 * @param {string} companyId - Company UUID
 * @param {Set} seenJobUrls - Set of job URLs seen in this run
 */
async function softDeleteExpiredJobs(companyId, seenJobUrls) {
  const client = await getClient();
  
  try {
    const query = `
      UPDATE company_jobs
      SET is_active = false
      WHERE company_id = $1
        AND is_active = true
        AND job_url != ALL($2)
    `;
    
    await client.query(query, [companyId, Array.from(seenJobUrls)]);
  } finally {
    client.release();
  }
}

module.exports = { parseJobs, extractExperienceLevel, upsertJobs, softDeleteExpiredJobs };
