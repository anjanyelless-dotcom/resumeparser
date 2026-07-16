const { chromium } = require('playwright');
const axios = require('axios');

// User-agent rotation pool
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Browser instance management
let browser = null;
let browserRef = 0;

// Concurrency management
const MAX_CONCURRENCY = parseInt(process.env.PLAYWRIGHT_CONCURRENCY || '3', 10);
const activePages = new Set();
const waitQueue = [];

// Robots.txt cache per domain
const robotsCache = new Map();

/**
 * Get or create browser instance
 * @returns {Promise<Browser>}
 */
async function getBrowser() {
  if (browser) {
    browserRef++;
    return browser;
  }

  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });
  browserRef = 1;
  return browser;
}

/**
 * Close browser instance when no longer needed
 */
async function closeBrowser() {
  if (browserRef > 0) {
    browserRef--;
  }
  
  if (browserRef === 0 && browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Get random user agent from pool
 * @returns {string}
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Parse robots.txt content
 * @param {string} content - robots.txt content
 * @param {string} userAgent - User agent to check (default: *)
 * @returns {Object} - { allowed: boolean, disallowedPaths: string[] }
 */
function parseRobotsTxt(content, userAgent = '*') {
  const lines = content.split('\n');
  let currentUserAgent = '*';
  const disallowedPaths = [];
  let isRelevantSection = false;

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    
    if (trimmed.startsWith('user-agent:')) {
      const ua = trimmed.substring('user-agent:'.length).trim();
      currentUserAgent = ua;
      isRelevantSection = (ua === '*' || ua === userAgent.toLowerCase());
    } else if (isRelevantSection && trimmed.startsWith('disallow:')) {
      const path = trimmed.substring('disallow:'.length).trim();
      if (path) {
        disallowedPaths.push(path);
      }
    }
  }

  return {
    allowed: disallowedPaths.length === 0,
    disallowedPaths,
  };
}

/**
 * Check robots.txt for a domain
 * @param {string} url - URL to check
 * @returns {Promise<Object>} - { allowed: boolean, disallowedPaths: string[] }
 */
async function checkRobotsTxt(url) {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    const cacheKey = urlObj.host;

    // Check cache
    if (robotsCache.has(cacheKey)) {
      return robotsCache.get(cacheKey);
    }

    const response = await axios.get(robotsUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': getRandomUserAgent(),
      },
    });

    const result = parseRobotsTxt(response.data);
    robotsCache.set(cacheKey, result);
    return result;
  } catch (error) {
    // If robots.txt is not accessible, allow scraping (fail open)
    return { allowed: true, disallowedPaths: [] };
  }
}

/**
 * Check if a path is disallowed by robots.txt
 * @param {string} url - URL to check
 * @param {Object} robotsResult - Result from checkRobotsTxt
 * @returns {boolean}
 */
function isPathDisallowed(url, robotsResult) {
  if (robotsResult.allowed) return false;
  
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  
  return robotsResult.disallowedPaths.some(disallowedPath => {
    if (disallowedPath === '/') return true;
    if (disallowedPath.endsWith('*')) {
      const prefix = disallowedPath.slice(0, -1);
      return path.startsWith(prefix);
    }
    return path.startsWith(disallowedPath);
  });
}

/**
 * Acquire concurrency slot
 * @returns {Promise<Function>} - Release function
 */
async function acquireSlot() {
  if (activePages.size < MAX_CONCURRENCY) {
    const release = () => activePages.delete(release);
    activePages.add(release);
    return release;
  }

  // Wait for a slot to become available
  return new Promise((resolve) => {
    waitQueue.push(resolve);
  });
}

/**
 * Release concurrency slot
 * @param {Function} release - Release function
 */
function releaseSlot(release) {
  if (activePages.has(release)) {
    activePages.delete(release);
  }
  
  // Process queue
  if (waitQueue.length > 0) {
    const nextResolve = waitQueue.shift();
    const newRelease = () => activePages.delete(newRelease);
    activePages.add(newRelease);
    nextResolve(newRelease);
  }
}

/**
 * Render a page with Playwright
 * @param {string} url - URL to render
 * @param {Object} options - Options
 * @param {string} options.waitForSelector - CSS selector to wait for
 * @param {number} options.timeout - Timeout in milliseconds (default: 15000)
 * @param {boolean} options.checkRobots - Check robots.txt (default: true)
 * @returns {Promise<string>} - Rendered HTML
 */
async function renderPage(url, options = {}) {
  const {
    waitForSelector = null,
    timeout = 15000,
    checkRobots = true,
  } = options;

  // Check robots.txt if enabled
  if (checkRobots) {
    const robotsResult = await checkRobotsTxt(url);
    if (isPathDisallowed(url, robotsResult)) {
      console.warn(`URL disallowed by robots.txt: ${url}`);
      return null;
    }
  }

  const release = await acquireSlot();
  let page = null;

  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1366, height: 768 },
    });

    // Anti-detection: set navigator.webdriver to undefined
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    page = await context.newPage();

    // Block heavy resources
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot,mp4,mp3,avi,mov}', (route) => {
      route.abort();
    });

    // Navigate to page
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout,
    });

    // Wait for specific selector if provided
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 5000 });
      } catch {
        // Selector not found, continue anyway
      }
    }

    // Get rendered HTML
    const html = await page.content();

    await context.close();
    return html;
  } catch (error) {
    console.error(`Error rendering page ${url}:`, error.message);
    throw error;
  } finally {
    if (page) {
      await page.context().close();
    }
    releaseSlot(release);
  }
}

/**
 * Clear robots.txt cache
 */
function clearRobotsCache() {
  robotsCache.clear();
}

module.exports = {
  getBrowser,
  closeBrowser,
  renderPage,
  getRandomUserAgent,
  parseRobotsTxt,
  checkRobotsTxt,
  isPathDisallowed,
  clearRobotsCache,
};
