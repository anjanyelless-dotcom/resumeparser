const { chromium } = require('playwright');
const cheerio = require('cheerio');

/**
 * Production-ready Playwright-based Company Intelligence Scraper
 * Handles JavaScript rendering, Cloudflare bypass, and comprehensive data extraction
 */

class CompanyScraper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.maxPages = 8; // Maximum pages to crawl per company
    this.timeout = 30000; // 30 seconds per page
    this.baseUrl = null; // Store base URL for domain validation
    this.baseDomain = null; // Store base domain for validation
  }

  async initialize() {
    console.log('[Playwright] Initializing browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
    
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    
    // Set default timeout
    this.context.setDefaultTimeout(this.timeout);
    
    console.log('[Playwright] Browser initialized successfully');
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    console.log('[Playwright] Browser closed');
  }

  async scrapeCompany(url) {
    console.log('[SCAN START] Starting scrape for', url);
    
    // Store base URL and domain for validation
    this.baseUrl = url;
    try {
      this.baseDomain = new URL(url).hostname;
    } catch (error) {
      console.error('[SCAN FAILED] Invalid base URL:', url);
      return {
        companyInfo: {},
        contacts: [],
        emails: [],
        phones: [],
        socialProfiles: { linkedin: null, facebook: null, twitter: null, instagram: null, youtube: null, github: null, whatsapp: null },
        careers: {},
        atsProvider: {},
        hiringInfo: {},
        errors: [`Invalid base URL: ${url}`]
      };
    }
    
    const result = {
      companyInfo: {},
      contacts: [],
      emails: [],
      phones: [],
      socialProfiles: {
        linkedin: null,
        facebook: null,
        twitter: null,
        instagram: null,
        youtube: null,
        github: null,
        whatsapp: null
      },
      careers: {},
      atsProvider: {},
      hiringInfo: {},
      errors: []
    };

    try {
      await this.initialize();
      
      // Step 1: Crawl homepage
      console.log('[Playwright] Step 1: Crawling homepage');
      const homepageData = await this.scrapePage(url);
      this.mergeResults(result, homepageData);
      
      // Step 2: Discover and crawl important pages
      console.log('[Playwright] Step 2: Discovering additional pages');
      const pagesToCrawl = this.discoverPages(url, homepageData);
      console.log(`[Playwright] Found ${pagesToCrawl.length} pages to crawl: ${pagesToCrawl.map(p => p.url).join(', ')}`);
      
      // Step 3: Crawl discovered pages
      for (const page of pagesToCrawl.slice(0, this.maxPages - 1)) {
        console.log(`[Playwright] Crawling ${page.type}: ${page.url}`);
        try {
          const pageData = await this.scrapePage(page.url);
          this.mergeResults(result, pageData);
        } catch (error) {
          console.error(`[Playwright] Failed to crawl ${page.url}: ${error.message}`);
          result.errors.push(`Failed to crawl ${page.url}: ${error.message}`);
        }
      }
      
      // Step 4: Extract company description and metadata
      console.log('[Playwright] Step 4: Extracting company metadata');
      this.extractCompanyMetadata(result);
      
      // Step 5: Deduplicate and clean results
      console.log('[Playwright] Step 5: Cleaning and deduplicating results');
      this.cleanResults(result);
      
      console.log('[Playwright] Scrape completed successfully');
      console.log('[SCAN COMPLETE] Scan completed successfully for', url);
      console.log('[SCAN COMPLETE] Results:', JSON.stringify({
        companyName: result.companyInfo.name,
        emailsCount: result.emails.length,
        phonesCount: result.phones.length,
        contactsCount: result.contacts.length,
        socialProfiles: Object.keys(result.socialProfiles).filter(k => result.socialProfiles[k]).length,
        careersUrl: result.careers.url,
        errorsCount: result.errors.length
      }, null, 2));
      
    } catch (error) {
      console.error('[Playwright] Scrape failed:', error.message);
      console.error('[SCAN FAILED] Scan failed for', url, '-', error.message);
      result.errors.push(`Scrape failed: ${error.message}`);
    } finally {
      await this.close();
    }
    
    return result;
  }

  async scrapePage(url) {
    // URL validation before page.goto()
    if (!url || typeof url !== "string") {
      console.error('[SCAN FAILED] Invalid URL provided to scrapePage:', url);
      throw new Error(`Invalid URL: ${url}`);
    }
    
    // Domain validation - only crawl same domain
    try {
      const urlDomain = new URL(url).hostname;
      if (urlDomain !== this.baseDomain) {
        console.log(`[PAGE SKIPPED] External domain detected: ${urlDomain} vs ${this.baseDomain}`);
        return {
          companyInfo: {},
          contacts: [],
          emails: [],
          phones: [],
          socialProfiles: {},
          careers: {},
          description: ''
        };
      }
    } catch (error) {
      console.error('[SCAN FAILED] URL parsing error:', error.message);
      throw new Error(`URL parsing error: ${error.message}`);
    }
    
    console.log(`[PAGE FOUND] Crawling: ${url}`);
    const page = await this.context.newPage();
    
    try {
      // Navigate to page with wait for network idle
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.timeout 
      });
      
      // Wait a bit more for JavaScript to execute
      await page.waitForTimeout(2000);
      
      // Get page content
      const html = await page.content();
      const $ = cheerio.load(html);
      
      console.log(`[PAGE CRAWLED] Successfully crawled: ${url}`);
      
      // Extract data from this page
      const pageData = {
        companyInfo: this.extractCompanyInfo($, url),
        contacts: this.extractContacts($),
        emails: this.extractEmails(html),
        phones: this.extractPhones(html),
        socialProfiles: this.extractSocialProfiles($, url),
        careers: this.extractCareersInfo($, url),
        description: this.extractDescription($)
      };
      
      await page.close();
      return pageData;
      
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  extractCompanyInfo($, url) {
    const info = {
      name: null,
      website: url,
      industry: null,
      companySize: null,
      foundedYear: null,
      headquarters: null
    };
    
    // Extract company name
    info.name = $('meta[property="og:site_name"]').attr('content') ||
                $('meta[name="application-name"]').attr('content') ||
                $('title').text().split('|')[0].split('-')[0].trim();
    
    // Extract industry from meta tags
    info.industry = $('meta[property="og:industry"]').attr('content') ||
                    $('meta[name="industry"]').attr('content') ||
                    this.extractFromText($, ['industry', 'sector', 'domain']);
    
    // Extract company size
    info.companySize = this.extractFromText($, ['employees', 'team size', 'company size', 'people']);
    
    // Extract founded year
    const foundedMatch = $('body').text().match(/founded\s*(?:in\s*)?(\d{4})/i) ||
                          $('body').text().match(/established\s*(?:in\s*)?(\d{4})/i);
    if (foundedMatch) {
      info.foundedYear = foundedMatch[1];
    }
    
    // Extract headquarters
    info.headquarters = this.extractFromText($, ['headquarters', 'hq', 'head office']);
    
    return info;
  }

  extractContacts($) {
    console.log('[CONTACT EXTRACTION] Starting contact person extraction');
    const contacts = [];
    
    // Enhanced team/leadership selectors
    const teamSelectors = [
      '.team-member',
      '.team-card',
      '.person-card',
      '.leadership-card',
      '.executive-card',
      '[class*="team"] [class*="member"]',
      '[class*="leadership"] [class*="member"]',
      '.about-team .member',
      '.leadership .person',
      '.management .person',
      '.executive .person'
    ];
    
    // HR/Recruitment specific selectors
    const hrSelectors = [
      '.hr-team .member',
      '.recruitment .person',
      '.talent .person',
      '[class*="hr"] [class*="member"]',
      '[class*="recruit"] [class*="member"]'
    ];
    
    // CEO/Founder specific selectors
    const leadershipSelectors = [
      '.ceo',
      '.founder',
      '.director',
      '.management .ceo',
      '.about .founder',
      '[class*="ceo"]',
      '[class*="founder"]'
    ];
    
    const allSelectors = [...teamSelectors, ...hrSelectors, ...leadershipSelectors];
    
    for (const selector of allSelectors) {
      $(selector).each((_, element) => {
        const $el = $(element);
        const name = $el.find('h3, h4, h5, .name, .person-name, .full-name').text().trim();
        const title = $el.find('.title, .role, .position, .job-title, .designation').text().trim();
        const email = $el.find('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') ||
                     $el.text().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
        const phone = $el.find('a[href^="tel:"]').attr('href')?.replace('tel:', '') ||
                     $el.text().match(this.validatePhoneNumber.bind(this));
        
        if (name && (title || email || phone)) {
          contacts.push({ 
            name, 
            title: title || 'Unknown', 
            email: email || null,
            phone: phone || null
          });
          console.log('[CONTACT FOUND]', name, title);
        }
      });
    }
    
    console.log('[CONTACT EXTRACTION] Found', contacts.length, 'contacts');
    return contacts;
  }

  extractEmails(html) {
    console.log('[EMAIL EXTRACTION] Starting email extraction');
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = html.match(emailRegex) || [];
    
    // Filter false positives
    const falsePositivePatterns = [
      /\.png$/, /\.jpg$/, /\.jpeg$/, /\.gif$/, /\.svg$/, /\.ico$/,
      /\.css$/, /\.js$/, /\.json$/,
      /@example\.com$/, /@test\.com$/, /@yourdomain\.com$/,
      /@sentry\.io$/, /@cloudflare\.com$/, /@google\.com$/,
      /@facebook\.com$/, /@twitter\.com$/, /@instagram\.com$/
    ];
    
    const uniqueEmails = new Set();
    for (const email of matches) {
      const isFalsePositive = falsePositivePatterns.some(pattern => pattern.test(email.toLowerCase()));
      if (!isFalsePositive) {
        uniqueEmails.add(email.toLowerCase());
        console.log('[EMAIL FOUND]', email.toLowerCase());
      }
    }
    
    console.log('[EMAIL EXTRACTION] Found', uniqueEmails.size, 'valid emails');
    return Array.from(uniqueEmails);
  }

  extractPhones(html) {
    console.log('[PHONE EXTRACTION] Starting phone extraction');
    const phones = new Set();
    
    // Strict phone patterns for valid business numbers
    const phonePatterns = [
      // India format: +91 XXXXX XXXXX or 10 digits starting with 6-9
      /\+91[-\s]?[6-9][0-9]{9}/g,
      /[6-9][0-9]{9}/g,
      // US format: +1 XXX XXX XXXX or (XXX) XXX-XXXX
      /\+1[-\s]?\(?[0-9]{3}\)?[-\s]?[0-9]{3}[-\s]?[0-9]{4}/g,
      /\(?[0-9]{3}\)?[-\s]?[0-9]{3}[-\s]?[0-9]{4}/g,
      // International: +XX XXX XXX XXXX (more strict)
      /\+[1-9][0-9]{0,2}[-\s]?[0-9]{3}[-\s]?[0-9]{3}[-\s]?[0-9]{4}/g,
      // tel: links
      /tel:[^"'\s]+/gi
    ];
    
    for (const pattern of phonePatterns) {
      const matches = html.match(pattern) || [];
      for (const phone of matches) {
        // Clean up phone number
        let cleaned = phone.replace(/tel:/gi, '').replace(/[\s\-\.\(\)]/g, '');
        
        // Strict validation
        const isValid = this.validatePhoneNumber(cleaned);
        if (isValid) {
          phones.add(cleaned);
          console.log('[PHONE FOUND]', cleaned);
        }
      }
    }
    
    console.log('[PHONE EXTRACTION] Found', phones.size, 'valid phone numbers');
    return Array.from(phones);
  }

  validatePhoneNumber(phone) {
    // Remove any non-digit characters except + at start
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Must be 10-15 digits
    if (cleaned.length < 10 || cleaned.length > 15) return false;
    
    // Must contain only digits and optional + at start
    if (!/^\+?[0-9]+$/.test(cleaned)) return false;
    
    // India format validation: starts with 6-9 for 10-digit numbers
    if (cleaned.length === 10) {
      if (!/^[6-9]/.test(cleaned)) return false;
    }
    
    // India format validation: starts with +91 for 12-digit numbers
    if (cleaned.length === 12) {
      if (!/^\+91[6-9]/.test(cleaned)) return false;
    }
    
    // US format validation: starts with +1 for 11-12 digit numbers
    if (cleaned.length === 11 || cleaned.length === 12) {
      if (!/^\+1/.test(cleaned)) return false;
    }
    
    // Reject obviously invalid patterns
    const invalidPatterns = [
      /^000+/,
      /^111+/,
      /^222+/,
      /^333+/,
      /^444+/,
      /^555+/,
      /^666+/,
      /^777+/,
      /^888+/,
      /^999+/
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(cleaned)) return false;
    }
    
    return true;
  }

  extractSocialProfiles($, baseUrl) {
    console.log('[SOCIAL EXTRACTION] Starting social profile extraction');
    const profiles = {
      linkedin: null,
      facebook: null,
      twitter: null,
      instagram: null,
      youtube: null,
      github: null,
      whatsapp: null
    };
    
    const socialSelectors = {
      linkedin: ['a[href*="linkedin.com/company"]', 'a[href*="linkedin.com/school"]', 'a[href*="linkedin.com/in"]', 'a[href*="linkedin.com"]'],
      facebook: ['a[href*="facebook.com"]', 'a[href*="fb.com"]'],
      twitter: ['a[href*="twitter.com"]', 'a[href*="x.com"]'],
      instagram: ['a[href*="instagram.com"]'],
      youtube: ['a[href*="youtube.com"]'],
      github: ['a[href*="github.com"]'],
      whatsapp: ['a[href*="wa.me"]', 'a[href*="api.whatsapp.com"]', 'a[href*="whatsapp.com"]']
    };
    
    for (const [platform, selectors] of Object.entries(socialSelectors)) {
      for (const selector of selectors) {
        const href = $(selector).first().attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, baseUrl).href;
            profiles[platform] = absoluteUrl;
            console.log(`[${platform.toUpperCase()} FOUND]`, absoluteUrl);
            break;
          } catch {
            // Invalid URL, skip
          }
        }
      }
    }
    
    return profiles;
  }

  extractCareersInfo($, baseUrl) {
    const careers = {
      url: null,
      openPositions: 0,
      hiringStatus: 'unknown',
      atsProvider: null
    };
    
    // Find career page URLs
    const careerKeywords = ['careers', 'jobs', 'join-us', 'work-with-us', 'join-our-team', "we're-hiring", 'vacancies', 'openings'];
    
    for (const keyword of careerKeywords) {
      const href = $(`a[href*="${keyword}"]`).first().attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          const urlDomain = new URL(absoluteUrl).hostname;
          
          // Domain validation - only accept same domain
          if (urlDomain === this.baseDomain) {
            careers.url = absoluteUrl;
            console.log('[CAREER PAGE FOUND]', absoluteUrl);
            break;
          } else {
            console.log(`[CAREER PAGE SKIPPED] External domain: ${urlDomain}`);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
    
    // Try to find job count
    const jobCountText = $('body').text().match(/(\d+)\s*(?:job|position|opening|vacancy)/i);
    if (jobCountText) {
      careers.openPositions = parseInt(jobCountText[1]);
    }
    
    // Detect hiring status
    const hiringText = $('body').text().toLowerCase();
    if (hiringText.includes('we are hiring') || hiringText.includes('now hiring') || hiringText.includes('join our team')) {
      careers.hiringStatus = 'actively_hiring';
    } else if (hiringText.includes('careers') || hiringText.includes('jobs')) {
      careers.hiringStatus = 'hiring';
    } else {
      careers.hiringStatus = 'not_hiring';
    }
    
    return careers;
  }

  extractDescription($) {
    // Try multiple sources for company description
    const description = 
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[property="og:title"]').attr('content') ||
      $('.about-us, .about, .company-description, .description').first().text().trim() ||
      '';
    
    return description.substring(0, 500); // Limit to 500 characters
  }

  discoverPages(baseUrl, homepageData) {
    console.log('[PAGE DISCOVERY] Starting page discovery');
    const pages = [];
    const $ = cheerio.load(homepageData.html || '');
    
    const pageTypes = [
      { keywords: ['about', 'about-us', 'company', 'our-story'], type: 'about' },
      { keywords: ['contact', 'contact-us', 'get-in-touch'], type: 'contact' },
      { keywords: ['careers', 'jobs', 'join-us', 'work-with-us'], type: 'careers' },
      { keywords: ['team', 'leadership', 'management', 'executives'], type: 'team' }
    ];
    
    for (const pageType of pageTypes) {
      for (const keyword of pageType.keywords) {
        const href = $(`a[href*="${keyword}"]`).first().attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, baseUrl).href;
            const urlDomain = new URL(absoluteUrl).hostname;
            
            // Domain validation - only add pages from same domain
            if (urlDomain !== this.baseDomain) {
              console.log(`[PAGE SKIPPED] External domain in discovery: ${urlDomain} vs ${this.baseDomain}`);
              continue;
            }
            
            if (!pages.find(p => p.url === absoluteUrl)) {
              pages.push({ url: absoluteUrl, type: pageType.type });
              console.log(`[PAGE FOUND] ${pageType.type}: ${absoluteUrl}`);
            }
            break; // Only take first match for each type
          } catch (error) {
            console.log(`[PAGE DISCOVERY] Invalid URL: ${href} - ${error.message}`);
          }
        }
      }
    }
    
    console.log('[PAGE DISCOVERY] Found', pages.length, 'pages to crawl');
    return pages;
  }

  extractFromText($, keywords) {
    const bodyText = $('body').text();
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\\s]*([^,.\\n]{10,100})`, 'i');
      const match = bodyText.match(regex);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  mergeResults(result, pageData) {
    // Merge company info (prefer non-null values)
    if (pageData.companyInfo) {
      for (const key of Object.keys(pageData.companyInfo)) {
        if (pageData.companyInfo[key] && !result.companyInfo[key]) {
          result.companyInfo[key] = pageData.companyInfo[key];
        }
      }
    }
    
    // Merge contacts (deduplicate by name)
    if (pageData.contacts) {
      for (const contact of pageData.contacts) {
        if (!result.contacts.find(c => c.name === contact.name)) {
          result.contacts.push(contact);
        }
      }
    }
    
    // Merge emails (deduplicate)
    if (pageData.emails) {
      for (const email of pageData.emails) {
        if (!result.emails.includes(email)) {
          result.emails.push(email);
        }
      }
    }
    
    // Merge phones (deduplicate)
    if (pageData.phones) {
      for (const phone of pageData.phones) {
        if (!result.phones.includes(phone)) {
          result.phones.push(phone);
        }
      }
    }
    
    // Merge social profiles (prefer non-null values)
    if (pageData.socialProfiles) {
      for (const key of Object.keys(pageData.socialProfiles)) {
        if (pageData.socialProfiles[key] && !result.socialProfiles[key]) {
          result.socialProfiles[key] = pageData.socialProfiles[key];
        }
      }
    }
    
    // Merge careers info (prefer non-null values)
    if (pageData.careers) {
      for (const key of Object.keys(pageData.careers)) {
        if (pageData.careers[key] && !result.careers[key]) {
          result.careers[key] = pageData.careers[key];
        }
      }
    }
    
    // Merge description
    if (pageData.description && pageData.description.length > (result.description || '').length) {
      result.description = pageData.description;
    }
  }

  extractCompanyMetadata(result) {
    // Additional metadata extraction logic
    if (result.companyInfo.name) {
      result.companyInfo.name = result.companyInfo.name.trim();
    }
    
    // Classify company size
    if (result.companyInfo.companySize) {
      const sizeText = result.companyInfo.companySize.toLowerCase();
      if (sizeText.includes('1-10') || sizeText.includes('1-50')) {
        result.companyInfo.sizeCategory = 'small';
      } else if (sizeText.includes('50-200') || sizeText.includes('200-500')) {
        result.companyInfo.sizeCategory = 'medium';
      } else if (sizeText.includes('500+') || sizeText.includes('1000+')) {
        result.companyInfo.sizeCategory = 'large';
      }
    }
  }

  cleanResults(result) {
    // Remove duplicates
    result.emails = [...new Set(result.emails)];
    result.phones = [...new Set(result.phones)];
    
    // Remove invalid emails
    result.emails = result.emails.filter(email => {
      return email.includes('@') && email.includes('.') && email.length > 5;
    });
    
    // Remove invalid phones
    result.phones = result.phones.filter(phone => {
      return phone.length >= 10 && /^\+?[0-9]+$/.test(phone.replace(/[\s\-\.\(\)]/g, ''));
    });
    
    // Limit contacts
    if (result.contacts.length > 50) {
      result.contacts = result.contacts.slice(0, 50);
    }
  }
}

module.exports = { CompanyScraper };
