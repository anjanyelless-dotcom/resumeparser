const axios = require('axios');
const cheerio = require('cheerio');
const { CompanyScraper } = require('./playwrightScraper');

/**
 * Fetch HTML with retry policy and error handling
 * @param {string} url - URL to fetch
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<{html: string, error: string|null}>}
 */
async function fetchWithRetry(url, maxRetries = 2) {
  const errors = [];
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Level 1] Fetching ${url} (attempt ${attempt + 1}/${maxRetries + 1})`);
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      console.log(`[Level 1] HTTP ${response.status} - ${response.statusText} (${response.data.length} bytes)`);
      return { html: response.data, error: null, statusCode: response.status };
    } catch (error) {
      console.log(`[Level 1] Fetch failed (attempt ${attempt + 1}): ${error.message}`);
      errors.push(error.message);
      
      // Don't retry on 404 or client errors
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        console.log(`[Level 1] Client error ${error.response.status}, not retrying`);
        return { html: null, error: error.message, statusCode: error.response.status };
      }
      
      // Exponential backoff for network failures
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Level 1] Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.log(`[Level 1] All retries exhausted, returning error`);
  return { html: null, error: errors.join('; '), statusCode: null };
}

/**
 * Extract company name from HTML
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {string} url - Original URL for fallback
 * @returns {string|null}
 */
function extractCompanyName($, url) {
  // Try og:site_name first
  const ogSiteName = $('meta[property="og:site_name"]').attr('content');
  if (ogSiteName) return ogSiteName.trim();
  
  // Try title tag
  const title = $('title').text();
  if (title) {
    // Remove common suffixes and standalone words
    const cleanTitle = title
      .replace(/\s*[-|]\s*(Home|Welcome|Official Website|Homepage)$/i, '')
      .replace(/^(Home|Welcome)$/i, '')
      .trim();
    if (cleanTitle) return cleanTitle;
  }
  
  // Try logo alt text
  const logoAlt = $('img[alt*="logo" i], img[src*="logo" i]').first().attr('alt');
  if (logoAlt) {
    const cleanLogoAlt = logoAlt.replace(/logo/i, '').trim();
    if (cleanLogoAlt) return cleanLogoAlt;
  }
  
  // Fallback to domain name
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return null;
  }
}

/**
 * Extract email addresses from HTML
 * @param {string} html - Raw HTML
 * @returns {string[]}
 */
function extractEmails(html) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  
  // Dedupe and filter false positives
  const uniqueEmails = new Set();
  const falsePositivePatterns = [
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.svg$/,
    /\.ico$/,
    /\.css$/,
    /\.js$/,
    /@example\.com$/,
    /@test\.com$/,
    /@yourdomain\.com$/,
  ];
  
  for (const email of matches) {
    const lowerEmail = email.toLowerCase();
    const isFalsePositive = falsePositivePatterns.some(pattern => pattern.test(lowerEmail));
    if (!isFalsePositive) {
      uniqueEmails.add(email);
    }
  }
  
  return Array.from(uniqueEmails);
}

/**
 * Extract phone numbers from HTML
 * @param {string} html - Raw HTML
 * @returns {string[]}
 */
function extractPhones(html) {
  // Match various phone number formats
  const phonePatterns = [
    /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, // US format
    /\+?[0-9]{1,3}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/g, // International
  ];
  
  const phones = new Set();
  
  for (const pattern of phonePatterns) {
    const matches = html.match(pattern) || [];
    for (const phone of matches) {
      // Normalize phone number
      const normalized = phone.replace(/[\s\-\.\(\)]/g, '');
      // Filter out obvious false positives (too short or too long)
      if (normalized.length >= 10 && normalized.length <= 15) {
        phones.add(phone);
      }
    }
  }
  
  return Array.from(phones);
}

/**
 * Extract LinkedIn company page URL specifically
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {string} baseUrl - Base URL for resolving relative links
 * @param {string} companyName - Company name for search fallback
 * @returns {Promise<{url: string|null, method: string}>}
 */
async function extractLinkedInCompanyUrl($, baseUrl, companyName) {
  // Pattern for company pages: linkedin.com/company/{slug} or linkedin.com/school/{slug}
  const companyPattern = /linkedin\.com\/(?:company|school)\/[^\/\?]+/i;
  const personalPattern = /linkedin\.com\/in\//i;
  
  let foundUrl = null;
  let method = null;
  
  // Priority 1: Check common locations first (footer, header/nav, social elements)
  const prioritySelectors = [
    'footer a[href]',
    'header a[href]',
    'nav a[href]',
    '[class*="social"] a[href]',
    '[id*="social"] a[href]',
    '.social-links a[href]',
    '.footer-social a[href]',
  ];
  
  for (const selector of prioritySelectors) {
    $(selector).each((_, element) => {
      if (foundUrl) return; // Already found
      
      const href = $(element).attr('href');
      if (!href) return;
      
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        
        // Must match company/school pattern, NOT personal profile
        if (companyPattern.test(absoluteUrl) && !personalPattern.test(absoluteUrl)) {
          foundUrl = absoluteUrl;
          method = 'priority_location';
        }
      } catch {
        // Invalid URL, skip
      }
    });
    
    if (foundUrl) break;
  }
  
  // Priority 2: Check all links on page for company pattern
  if (!foundUrl) {
    $('a[href]').each((_, element) => {
      if (foundUrl) return;
      
      const href = $(element).attr('href');
      if (!href) return;
      
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        
        if (companyPattern.test(absoluteUrl) && !personalPattern.test(absoluteUrl)) {
          foundUrl = absoluteUrl;
          method = 'homepage';
        }
      } catch {
        // Invalid URL, skip
      }
    });
  }
  
  console.log(`[Level 1] LinkedIn URL method: ${method}, URL: ${foundUrl || 'not found'}`);
  
  return { url: foundUrl, method };
}

/**
 * Search for LinkedIn company page via Google
 * @param {string} companyName - Company name to search for
 * @returns {Promise<string|null>}
 */
async function searchLinkedInCompanyPage(companyName) {
  if (!companyName) {
    console.log('[Level 1] No company name provided for LinkedIn search fallback');
    return null;
  }
  
  try {
    console.log(`[Level 1] Searching LinkedIn for company: ${companyName}`);
    const searchQuery = `site:linkedin.com/company "${companyName}"`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    const response = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Look for LinkedIn company URLs in search results
    const companyPattern = /linkedin\.com\/company\/[^\/\?]+/i;
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && companyPattern.test(href)) {
        const match = href.match(companyPattern);
        if (match) {
          console.log(`[Level 1] Found LinkedIn via search: ${match[0]}`);
          return match[0];
        }
      }
    });
    
    console.log('[Level 1] No LinkedIn company page found via search');
    return null;
  } catch (error) {
    console.log(`[Level 1] LinkedIn search failed: ${error.message}`);
    return null;
  }
}

/**
 * Extract social media links
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {string} baseUrl - Base URL for resolving relative links
 * @param {string} companyName - Company name for LinkedIn search fallback
 * @returns {Promise<Object>}
 */
async function extractSocialLinks($, baseUrl, companyName) {
  const socialLinks = {
    linkedin: null,
    linkedinMethod: null,
    twitter: null,
    facebook: null,
    instagram: null,
  };
  
  const socialDomains = {
    twitter: ['twitter.com', 'x.com'],
    facebook: ['facebook.com', 'fb.com'],
    instagram: ['instagram.com'],
  };
  
  // Extract LinkedIn with specific logic
  const linkedinResult = await extractLinkedInCompanyUrl($, baseUrl, companyName);
  socialLinks.linkedin = linkedinResult.url;
  socialLinks.linkedinMethod = linkedinResult.method;
  
  // Extract other social links normally
  for (const [platform, domains] of Object.entries(socialDomains)) {
    $(`a[href*="${domains[0]}"], a[href*="${domains[1] || ''}"]`).each((_, element) => {
      const href = $(element).attr('href');
      if (!href || socialLinks[platform]) return;
      
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        
        if (domains.some(domain => absoluteUrl.toLowerCase().includes(domain))) {
          socialLinks[platform] = absoluteUrl;
        }
      } catch {
        // Invalid URL, skip
      }
    });
  }
  
  return socialLinks;
}

/**
 * Extract links matching specific keywords
 * Prioritizes href path over anchor text to avoid false positives
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {string} baseUrl - Base URL for resolving relative links
 * @param {string[]} keywords - Keywords to match in href or anchor text
 * @returns {string[]}
 */
function extractLinksByKeywords($, baseUrl, keywords) {
  const links = new Set();
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const socialDomains = ['linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 'fb.com', 'instagram.com'];
  
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim().toLowerCase();
    
    if (!href) return;
    
    const hrefLower = href.toLowerCase();
    
    // Skip social media links entirely
    const isSocialLink = socialDomains.some(domain => hrefLower.includes(domain));
    if (isSocialLink) return;
    
    // Check if keyword is in href path (not domain) or anchor text
    let matchesKeyword = false;
    
    // Check href path (ignore domain)
    try {
      const urlObj = new URL(href, baseUrl);
      const path = urlObj.pathname.toLowerCase();
      matchesKeyword = lowerKeywords.some(keyword => path.includes(keyword));
    } catch {
      // If URL parsing fails, check the full href
      matchesKeyword = lowerKeywords.some(keyword => hrefLower.includes(keyword));
    }
    
    // If not found in href, check anchor text as fallback
    if (!matchesKeyword) {
      matchesKeyword = lowerKeywords.some(keyword => text.includes(keyword));
    }
    
    if (matchesKeyword) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        links.add(absoluteUrl);
      } catch {
        // Invalid URL, skip
      }
    }
  });
  
  return Array.from(links);
}

/**
 * Extract specific URLs (career, contact, about)
 * Prioritizes exact keyword matches to avoid picking up social links
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @param {string} baseUrl - Base URL for resolving relative links
 * @returns {Object}
 */
function extractSpecificUrls($, baseUrl) {
  const careerKeywords = ['careers', 'jobs', 'join-us', 'work-with-us', 'join-our-team', "we're-hiring", 'vacancies', 'openings'];
  const contactKeywords = ['contact', 'contact-us', 'get-in-touch'];
  const aboutKeywords = ['about', 'about-us', 'company'];
  
  return {
    careerUrlCandidates: extractLinksByKeywords($, baseUrl, careerKeywords),
    contactUrl: extractLinksByKeywords($, baseUrl, contactKeywords)[0] || null,
    aboutUrl: extractLinksByKeywords($, baseUrl, aboutKeywords)[0] || null,
  };
}

/**
 * Fallback function using axios when Playwright fails
 * @param {string} url - Company website URL
 * @returns {Promise<Object>}
 */
async function analyzeCompanyWebsiteFallback(url) {
  console.log(`[Level 1] Using axios fallback for ${url}`);
  const result = {
    companyName: null,
    emails: [],
    phones: [],
    socialLinks: {
      linkedin: null,
      linkedinMethod: null,
      twitter: null,
      facebook: null,
      instagram: null,
    },
    careerUrlCandidates: [],
    contactUrl: null,
    aboutUrl: null,
    fetchedFrom: url,
    errors: [],
  };
  
  try {
    // Fetch homepage
    const { html, error, statusCode } = await fetchWithRetry(url);
    
    if (error) {
      result.errors.push(`Homepage fetch failed: ${error}`);
      console.log(`[Level 1] Homepage fetch failed: ${error}`);
      return result;
    }
    
    if (!html) {
      result.errors.push('Homepage fetch returned no HTML');
      console.log(`[Level 1] Homepage fetch returned no HTML`);
      return result;
    }
    
    const $ = cheerio.load(html);
    
    // Extract data from homepage
    result.companyName = extractCompanyName($, url);
    result.emails = extractEmails(html);
    result.phones = extractPhones(html);
    result.socialLinks = await extractSocialLinks($, url, result.companyName);
    
    const urls = extractSpecificUrls($, url);
    result.careerUrlCandidates = urls.careerUrlCandidates;
    result.contactUrl = urls.contactUrl;
    result.aboutUrl = urls.aboutUrl;
    
    console.log(`[Level 1] Fallback extraction completed`);
    return result;
    
  } catch (error) {
    result.errors.push(`Fallback extraction failed: ${error.message}`);
    console.log(`[Level 1] Fallback extraction failed: ${error.message}`);
    return result;
  }
}

/**
 * Main entry point for company website analysis
 * Uses Playwright for comprehensive extraction with JavaScript rendering
 * @param {string} url - Company website URL
 * @returns {Promise<Object>}
 */
async function analyzeCompanyWebsite(url) {
  console.log(`[Level 1] Starting analysis for ${url}`);
  
  try {
    // Use new Playwright-based scraper for comprehensive extraction
    const scraper = new CompanyScraper();
    const result = await scraper.scrapeCompany(url);
    
    // Convert to the expected format for backward compatibility
    const legacyFormat = {
      companyName: result.companyInfo.name,
      emails: result.emails,
      phones: result.phones,
      socialLinks: {
        linkedin: result.socialProfiles.linkedin,
        linkedinMethod: result.socialProfiles.linkedin ? 'playwright_extraction' : null,
        twitter: result.socialProfiles.twitter,
        facebook: result.socialProfiles.facebook,
        instagram: result.socialProfiles.instagram,
      },
      careerUrlCandidates: result.careers.url ? [result.careers.url] : [],
      contactUrl: null, // Will be extracted from discovered pages
      aboutUrl: null, // Will be extracted from discovered pages
      aboutText: result.description,
      contacts: result.contacts,
      companyInfo: result.companyInfo,
      careers: result.careers,
      fetchedFrom: url,
      errors: result.errors
    };
    
    console.log(`[Level 1] Playwright extraction completed:`, JSON.stringify({
      companyName: legacyFormat.companyName,
      emailsCount: legacyFormat.emails.length,
      phonesCount: legacyFormat.phones.length,
      contactsCount: legacyFormat.contacts.length,
      linkedin: legacyFormat.socialLinks.linkedin,
      careerUrlCandidatesCount: legacyFormat.careerUrlCandidates.length,
      errors: legacyFormat.errors
    }, null, 2));
    
    return legacyFormat;
    
  } catch (error) {
    console.error(`[Level 1] Playwright extraction failed, falling back to axios: ${error.message}`);
    
    // Fallback to original axios-based extraction
    return await analyzeCompanyWebsiteFallback(url);
  }
}

module.exports = { analyzeCompanyWebsite };
