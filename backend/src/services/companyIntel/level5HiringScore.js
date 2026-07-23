const { getClient } = require('../../database/db');

/**
 * Configurable scoring weights
 */
const SCORE_CONFIG = {
  careerPage: { maxPoints: 20, weight: 1.0 },
  hrEmail: { maxPoints: 20, weight: 1.0 },
  openJobs: { maxPoints: 25, weight: 1.0 },
  linkedin: { maxPoints: 10, weight: 1.0 },
  recentJobs: { maxPoints: 25, weight: 1.0 },
};

/**
 * Calculate hiring score for a company
 * @param {string} companyId - Company UUID
 * @returns {Promise<Object>} - Score result with breakdown
 */
async function calculateHiringScore(companyId) {
  console.log(`[Level 5] Starting hiring score calculation for company ${companyId}`);
  
  // Fetch company data
  const companyData = await fetchCompanyData(companyId);
  
  if (!companyData) {
    throw new Error(`Company not found: ${companyId}`);
  }
  
  console.log(`[Level 5] Company data fetched:`, JSON.stringify({
    name: companyData.name,
    careerUrl: companyData.careerUrl,
    linkedinUrl: companyData.linkedinUrl,
    contactsCount: companyData.contacts?.length || 0,
    jobsCount: companyData.jobs?.length || 0
  }, null, 2));
  
  // Calculate each component
  const careerPageScore = calculateCareerPageScore(companyData);
  const hrEmailScore = calculateHrEmailScore(companyData);
  const openJobsScore = calculateOpenJobsScore(companyData);
  const linkedinScore = calculateLinkedinScore(companyData);
  const recentJobsScore = calculateRecentJobsScore(companyData);
  
  const totalScore = careerPageScore + hrEmailScore + openJobsScore + linkedinScore + recentJobsScore;
  const label = getHiringLabel(totalScore);
  
  const breakdown = {
    careerPage: careerPageScore,
    hrEmail: hrEmailScore,
    openJobs: openJobsScore,
    linkedin: linkedinScore,
    recentJobs: recentJobsScore,
  };
  
  console.log(`[Level 5] Score breakdown:`, JSON.stringify({
    totalScore,
    label,
    breakdown
  }, null, 2));
  
  // Persist score to database (hiring_status based on job count, not score label)
  const jobCount = companyData.jobs?.length || 0;
  await persistHiringScore(companyId, totalScore, label, jobCount);
  console.log(`[Level 5] Score persisted to database`);
  
  return {
    score: totalScore,
    label,
    breakdown,
  };
}

/**
 * Fetch company data from database
 * @param {string} companyId - Company UUID
 * @returns {Promise<Object|null>} - Company data
 */
async function fetchCompanyData(companyId) {
  const client = await getClient();
  
  try {
    // Fetch company basic info
    const companyQuery = `
      SELECT id, name, career_url, linkedin_url
      FROM companies
      WHERE id = $1
    `;
    const companyResult = await client.query(companyQuery, [companyId]);
    
    if (companyResult.rows.length === 0) {
      return null;
    }
    
    const company = companyResult.rows[0];
    
    // Fetch contacts
    const contactsQuery = `
      SELECT email, type
      FROM company_contacts
      WHERE company_id = $1
    `;
    const contactsResult = await client.query(contactsQuery, [companyId]);
    const contacts = contactsResult.rows;
    
    // Fetch active jobs
    const jobsQuery = `
      SELECT title, posted_date
      FROM company_jobs
      WHERE company_id = $1 AND is_active = true
    `;
    const jobsResult = await client.query(jobsQuery, [companyId]);
    const jobs = jobsResult.rows;
    
    return {
      companyId: company.id,
      name: company.name,
      careerUrl: company.career_url,
      linkedinUrl: company.linkedin_url,
      contacts,
      jobs,
    };
  } finally {
    client.release();
  }
}

/**
 * Calculate career page score
 * @param {Object} companyData - Company data
 * @returns {number} - Score (0 or 20)
 */
function calculateCareerPageScore(companyData) {
  const hasCareerPage = !!companyData.careerUrl;
  return hasCareerPage ? SCORE_CONFIG.careerPage.maxPoints : 0;
}

/**
 * Calculate HR/careers email score
 * @param {Object} companyData - Company data
 * @returns {number} - Score (0 or 20)
 */
function calculateHrEmailScore(companyData) {
  const hrEmail = companyData.contacts?.find(c => 
    c.type === 'hr' || 
    c.type === 'careers' || 
    c.email?.toLowerCase().includes('hr') ||
    c.email?.toLowerCase().includes('careers') ||
    c.email?.toLowerCase().includes('talent') ||
    c.email?.toLowerCase().includes('recruit')
  );
  
  return hrEmail ? SCORE_CONFIG.hrEmail.maxPoints : 0;
}

/**
 * Calculate open jobs score
 * @param {Object} companyData - Company data
 * @returns {number} - Score (0, 10, 18, or 25)
 */
function calculateOpenJobsScore(companyData) {
  const jobCount = companyData.jobs?.length || 0;
  
  if (jobCount === 0) return 0;
  if (jobCount <= 2) return 10;
  if (jobCount <= 5) return 18;
  return SCORE_CONFIG.openJobs.maxPoints;
}

/**
 * Calculate LinkedIn score
 * @param {Object} companyData - Company data
 * @returns {number} - Score (0 or 10)
 */
function calculateLinkedinScore(companyData) {
  const hasLinkedin = !!companyData.linkedinUrl;
  return hasLinkedin ? SCORE_CONFIG.linkedin.maxPoints : 0;
}

/**
 * Calculate recent jobs score
 * @param {Object} companyData - Company data
 * @returns {number} - Score (0-25 based on % of jobs posted in last 30 days)
 */
function calculateRecentJobsScore(companyData) {
  const jobs = companyData.jobs || [];
  
  if (jobs.length === 0) return 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentJobsCount = jobs.filter(job => {
    if (!job.posted_date) return false;
    const postedDate = new Date(job.posted_date);
    return postedDate >= thirtyDaysAgo;
  }).length;
  
  const recentPercentage = recentJobsCount / jobs.length;
  
  // Scale: 0% = 0pts, 100% = 25pts
  return Math.round(recentPercentage * SCORE_CONFIG.recentJobs.maxPoints);
}

/**
 * Get hiring status based on job count
 * @param {number} jobCount - Number of active jobs
 * @returns {string} - Hiring status
 */
function getHiringStatus(jobCount) {
  if (jobCount === 0) return 'not_hiring';
  if (jobCount <= 5) return 'hiring';
  return 'actively_hiring';
}

/**
 * Get hiring label based on score
 * @param {number} score - Total score
 * @returns {string} - Hiring label
 */
function getHiringLabel(score) {
  if (score >= 80) return 'Actively Hiring';
  if (score >= 50) return 'Hiring';
  if (score >= 25) return 'Occasionally Hiring';
  return 'Not Currently Hiring';
}

/**
 * Persist hiring score to database
 * @param {string} companyId - Company UUID
 * @param {number} score - Total score
 * @param {string} label - Hiring label
 * @param {number} jobCount - Number of active jobs
 */
async function persistHiringScore(companyId, score, label, jobCount) {
  const client = await getClient();
  
  try {
    const hiringStatus = getHiringStatus(jobCount);
    
    console.log(`[Level 5] Persisting hiring data:`, JSON.stringify({
      companyId,
      score,
      label,
      jobCount,
      hiringStatus,
    }, null, 2));
    
    const query = `
      UPDATE companies
      SET 
        hiring_score = $1,
        hiring_status = $2,
        updated_at = NOW()
      WHERE id = $3
    `;
    
    await client.query(query, [score, hiringStatus, companyId]);
    console.log(`[Level 5] Hiring status set to: ${hiringStatus} (based on ${jobCount} jobs)`);
  } catch (error) {
    console.error('[Level 5] Failed to persist hiring score:', error.message);
    // Don't throw - we don't want to fail the whole operation if DB update fails
  } finally {
    client.release();
  }
}

module.exports = {
  calculateHiringScore,
  calculateCareerPageScore,
  calculateHrEmailScore,
  calculateOpenJobsScore,
  calculateLinkedinScore,
  calculateRecentJobsScore,
  getHiringLabel,
  getHiringStatus,
  SCORE_CONFIG,
};
  
