const { parseJobs: parseGreenhouseJobs } = require('./parsers/greenhouseParser');
const { parseJobs: parseLeverJobs } = require('./parsers/leverParser');
const { parseJobs: parseGenericHtmlJobs } = require('./parsers/genericHtmlParser');

/**
 * Dispatch job extraction to the appropriate parser based on ATS provider
 * @param {string} companyId - Company UUID
 * @param {Object} atsResult - Result from ATS detection
 * @returns {Promise<Array>} - Array of parsed job objects
 */
async function extractJobs(companyId, atsResult) {
  const { provider, detectedUrl } = atsResult;
  
  switch (provider) {
    case 'greenhouse':
      return await parseGreenhouseJobs(companyId, detectedUrl);
    
    case 'lever':
      return await parseLeverJobs(companyId, detectedUrl);
    
    case 'workday':
    case 'ashby':
    case 'smartrecruiters':
    case 'bamboohr':
    case 'unknown':
    default:
      // These providers require HTML parsing with Playwright
      return await parseGenericHtmlJobs(companyId, detectedUrl, provider);
  }
}

module.exports = { extractJobs };
