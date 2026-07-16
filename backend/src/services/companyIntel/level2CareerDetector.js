const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Stub for site-restricted search API
 * This should be replaced with actual implementation (Google Custom Search, Bing, etc.)
 * @param {string} domain - Domain to search
 * @param {string} query - Search query
 * @returns {Promise<string[]>} - Array of career page URLs
 */
async function searchSite(domain, query) {
  // TODO: Wire up to Google Custom Search or Bing API
  // Return empty array for now
  return [];
}

/**
 * Fetch page with HEAD request first, fallback to GET
 * @param {string} url - URL to fetch
 * @returns {Promise<{status: number, html: string|null}>}
 */
async function fetchPage(url) {
  try {
    // Try HEAD request first
    const headResponse = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (headResponse.status === 200) {
      return { status: 200, html: null };
    }
  } catch (error) {
    // HEAD failed, try GET
  }

  try {
    const getResponse = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    return { status: getResponse.status, html: getResponse.data };
  } catch (error) {
    return { status: error.response?.status || 0, html: null };
  }
}

/**
 * Check if page contains job-related keywords
 * @param {string} html - HTML content
 * @returns {number} - Keyword density score
 */
function calculateJobKeywordDensity(html) {
  if (!html) return 0;

  const jobKeywords = ['job', 'position', 'apply', 'role', 'hiring', 'career', 'vacancy', 'opening', 'employment'];
  const $ = cheerio.load(html);
  const bodyText = $('body').text().toLowerCase();
  
  let keywordCount = 0;
  for (const keyword of jobKeywords) {
    const regex = new RegExp(keyword, 'gi');
    const matches = bodyText.match(regex);
    if (matches) {
      keywordCount += matches.length;
    }
  }

  // Normalize by text length (keywords per 1000 characters)
  const textLength = bodyText.length;
  if (textLength === 0) return 0;
  
  return (keywordCount / textLength) * 1000;
}

/**
 * Calculate URL pattern confidence score
 * @param {string} url - URL to score
 * @returns {number} - Confidence score (0-100)
 */
function calculateUrlConfidence(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // High confidence: exact career paths
    if (pathname === '/careers' || pathname === '/careers/' || pathname === '/jobs' || pathname === '/jobs/') {
      return 100;
    }

    // High confidence: about/careers or company/careers
    if (pathname.includes('/careers') || pathname.includes('/jobs')) {
      return 80;
    }

    // Medium confidence: join-us, work-with-us
    if (pathname.includes('/join') || pathname.includes('/work-with-us')) {
      return 70;
    }

    // Low confidence: career keyword in query or fragment
    if (url.toLowerCase().includes('career') || url.toLowerCase().includes('job')) {
      return 50;
    }

    return 30;
  } catch {
    return 0;
  }
}

/**
 * Validate career page candidates
 * @param {string[]} candidates - Array of candidate URLs
 * @returns {Promise<Array<{url: string, keywordDensity: number, urlConfidence: number, totalScore: number}>>}
 */
async function validateCandidates(candidates) {
  const results = [];

  for (const url of candidates) {
    const { status, html } = await fetchPage(url);

    if (status === 200) {
      const keywordDensity = calculateJobKeywordDensity(html);
      const urlConfidence = calculateUrlConfidence(url);
      
      // Combined score: keyword density (weighted 60%) + URL confidence (weighted 40%)
      const totalScore = (keywordDensity * 0.6) + (urlConfidence * 0.4);

      results.push({
        url,
        keywordDensity,
        urlConfidence,
        totalScore,
      });
    }
  }

  // Sort by total score descending
  return results.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Try common career paths
 * @param {string} domain - Base domain
 * @returns {Promise<string|null>} - Valid career URL or null
 */
async function tryCommonPaths(domain) {
  const commonPaths = [
    '/careers',
    '/jobs',
    '/careers/',
    '/jobs/',
    '/about/careers',
    '/company/careers',
    '/join-us',
    '/work-with-us',
  ];

  for (const path of commonPaths) {
    const url = `https://${domain}${path}`;
    const { status, html } = await fetchPage(url);

    if (status === 200) {
      const keywordDensity = calculateJobKeywordDensity(html);
      if (keywordDensity > 0) {
        return url;
      }
    }
  }

  return null;
}

/**
 * Check cache for negative result
 * @param {string} domain - Domain to check
 * @param {Object} redisClient - Redis client (optional)
 * @returns {Promise<boolean>} - True if cached negative result exists
 */
async function checkNegativeCache(domain, redisClient) {
  if (!redisClient) return false;

  try {
    const key = `career-negcache:${domain}`;
    const cached = await redisClient.get(key);
    return cached !== null;
  } catch {
    return false;
  }
}

/**
 * Cache negative result
 * @param {string} domain - Domain to cache
 * @param {Object} redisClient - Redis client (optional)
 * @param {number} ttl - Time to live in seconds (default: 7 days)
 */
async function cacheNegativeResult(domain, redisClient, ttl = 604800) {
  if (!redisClient) return;

  try {
    const key = `career-negcache:${domain}`;
    await redisClient.setex(key, ttl, '1');
  } catch {
    // Cache error, ignore
  }
}

/**
 * Detect career page for a company
 * @param {string} companyUrl - Company website URL
 * @param {Object} level1Result - Result from Level 1 analyzer
 * @param {Object} options - Options
 * @param {Object} options.redisClient - Redis client for caching (optional)
 * @param {Function} options.searchProvider - Custom search provider (optional)
 * @returns {Promise<Object>}
 */
async function detectCareerPage(companyUrl, level1Result, options = {}) {
  const { redisClient, searchProvider = searchSite } = options;

  // Extract domain from URL
  let domain;
  try {
    const urlObj = new URL(companyUrl);
    domain = urlObj.hostname;
  } catch {
    return {
      careerPageFound: false,
      careerUrl: null,
      confidence: 'low',
      method: 'not_found',
    };
  }

  // Check negative cache
  const isCachedNegative = await checkNegativeCache(domain, redisClient);
  if (isCachedNegative) {
    return {
      careerPageFound: false,
      careerUrl: null,
      confidence: 'low',
      method: 'not_found',
    };
  }

  // Step 1: Validate existing candidates from Level 1
  if (level1Result.careerUrlCandidates && level1Result.careerUrlCandidates.length > 0) {
    const validated = await validateCandidates(level1Result.careerUrlCandidates);

    if (validated.length > 0) {
      const bestMatch = validated[0];
      let confidence = 'low';
      if (bestMatch.totalScore > 50) confidence = 'high';
      else if (bestMatch.totalScore > 25) confidence = 'medium';

      return {
        careerPageFound: true,
        careerUrl: bestMatch.url,
        confidence,
        method: 'homepage_link',
      };
    }
  }

  // Step 2: Try common paths
  const commonPathResult = await tryCommonPaths(domain);
  if (commonPathResult) {
    return {
      careerPageFound: true,
      careerUrl: commonPathResult,
      confidence: 'medium',
      method: 'common_path',
    };
  }

  // Step 3: Search fallback
  try {
    const searchResults = await searchProvider(domain, 'careers OR jobs OR openings');
    
    if (searchResults && searchResults.length > 0) {
      // Validate first search result
      const validated = await validateCandidates(searchResults.slice(0, 3));
      
      if (validated.length > 0) {
        return {
          careerPageFound: true,
          careerUrl: validated[0].url,
          confidence: 'low',
          method: 'search_fallback',
        };
      }
    }
  } catch (error) {
    // Search failed, continue to negative result
  }

  // Step 4: Cache negative result
  await cacheNegativeResult(domain, redisClient);

  return {
    careerPageFound: false,
    careerUrl: null,
    confidence: 'low',
    method: 'not_found',
  };
}

module.exports = {
  detectCareerPage,
  searchSite,
  validateCandidates,
  tryCommonPaths,
  checkNegativeCache,
  cacheNegativeResult,
};
