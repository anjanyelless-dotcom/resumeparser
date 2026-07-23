const axios = require('axios');
const { getClient } = require('../../../database/db');

/**
 * Extract board slug from Greenhouse URL
 * @param {string} boardUrlOrSlug - Full URL or slug
 * @returns {string} - Board slug
 */
function extractSlug(boardUrlOrSlug) {
  // If it's already a slug (no dots or slashes), return as-is
  if (!boardUrlOrSlug.includes('.') && !boardUrlOrSlug.includes('/')) {
    return boardUrlOrSlug;
  }
  
  try {
    const url = new URL(boardUrlOrSlug);
    // Extract slug from boards.greenhouse.io/v1/boards/{slug}/jobs
    const match = url.pathname.match(/boards\/([^\/]+)/);
    if (match) {
      return match[1];
    }
    // Try extracting from subdomain: companyname.greenhouse.io
    const hostnameMatch = url.hostname.match(/^([^\.]+)\.greenhouse\.io$/);
    if (hostnameMatch) {
      return hostnameMatch[1];
    }
  } catch {
    // If URL parsing fails, assume it's a slug
  }
  
  return boardUrlOrSlug;
}

/**
 * Parse jobs from Greenhouse board
 * @param {string} companyId - Company UUID
 * @param {string} boardUrlOrSlug - Greenhouse board URL or slug
 * @returns {Promise<Array>} - Array of job objects
 */
async function parseJobs(companyId, boardUrlOrSlug) {
  const slug = extractSlug(boardUrlOrSlug);
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  
  try {
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const jobs = response.data.jobs || [];
    const parsedJobs = [];
    const seenJobUrls = new Set();
    
    for (const job of jobs) {
      const jobUrl = job.absolute_url || job.url;
      
      if (!jobUrl || seenJobUrls.has(jobUrl)) continue;
      seenJobUrls.add(jobUrl);
      
      // Extract location
      const location = job.location?.name || job.location_name || null;
      
      // Extract experience level from metadata or title
      let experienceLevel = null;
      const titleLower = (job.title || '').toLowerCase();
      if (titleLower.includes('senior') || titleLower.includes('sr.')) {
        experienceLevel = 'Senior';
      } else if (titleLower.includes('lead') || titleLower.includes('manager')) {
        experienceLevel = 'Mid';
      } else if (titleLower.includes('junior') || titleLower.includes('jr.') || titleLower.includes('intern')) {
        experienceLevel = 'Junior';
      } else if (titleLower.includes('internship')) {
        experienceLevel = 'Internship';
      }
      
      // Parse posted date
      let postedDate = null;
      if (job.updated_at) {
        postedDate = new Date(job.updated_at);
      } else if (job.created_at) {
        postedDate = new Date(job.created_at);
      }
      
      parsedJobs.push({
        title: job.title || null,
        location,
        experienceLevel,
        jobUrl,
        postedDate,
      });
    }
    
    // Upsert to database
    await upsertJobs(companyId, parsedJobs);
    
    // Soft-delete jobs not seen in this run
    await softDeleteExpiredJobs(companyId, seenJobUrls);
    
    return parsedJobs;
    
  } catch (error) {
    console.error(`Error parsing Greenhouse jobs for ${slug}:`, error.message);
    throw error;
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
    // Mark jobs not seen in this run as inactive
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

module.exports = { parseJobs, extractSlug, upsertJobs, softDeleteExpiredJobs };
