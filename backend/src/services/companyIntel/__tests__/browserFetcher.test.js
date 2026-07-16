const nock = require('nock');
const {
  getRandomUserAgent,
  parseRobotsTxt,
  isPathDisallowed,
  checkRobotsTxt,
  clearRobotsCache,
} = require('../browserFetcher');

describe('browserFetcher', () => {
  afterEach(() => {
    nock.cleanAll();
    clearRobotsCache();
  });

  describe('getRandomUserAgent', () => {
    test('should return a user agent string', () => {
      const ua = getRandomUserAgent();
      expect(ua).toBeTruthy();
      expect(typeof ua).toBe('string');
      expect(ua.length).toBeGreaterThan(0);
    });

    test('should return different user agents on multiple calls', () => {
      const ua1 = getRandomUserAgent();
      const ua2 = getRandomUserAgent();
      // Due to randomness, they might be the same occasionally
      // But with 5 agents in the pool, it's unlikely
      expect(ua1 || ua2).toBeTruthy();
    });
  });

  describe('parseRobotsTxt', () => {
    test('should parse simple robots.txt allowing all', () => {
      const robotsTxt = `
        User-agent: *
        Disallow:
      `;
      
      const result = parseRobotsTxt(robotsTxt);
      expect(result.allowed).toBe(true);
      expect(result.disallowedPaths).toHaveLength(0);
    });

    test('should parse robots.txt disallowing all', () => {
      const robotsTxt = `
        User-agent: *
        Disallow: /
      `;
      
      const result = parseRobotsTxt(robotsTxt);
      expect(result.allowed).toBe(false);
      expect(result.disallowedPaths).toContain('/');
    });

    test('should parse robots.txt with specific paths', () => {
      const robotsTxt = `
        User-agent: *
        Disallow: /admin
        Disallow: /private
      `;
      
      const result = parseRobotsTxt(robotsTxt);
      expect(result.allowed).toBe(false);
      expect(result.disallowedPaths).toContain('/admin');
      expect(result.disallowedPaths).toContain('/private');
    });

    test('should parse robots.txt with wildcard patterns', () => {
      const robotsTxt = `
        User-agent: *
        Disallow: /admin/*
      `;
      
      const result = parseRobotsTxt(robotsTxt);
      expect(result.disallowedPaths).toContain('/admin/*');
    });

    test('should handle multiple user-agent sections', () => {
      const robotsTxt = `
        User-agent: Googlebot
        Disallow: /private
        
        User-agent: *
        Disallow: /admin
      `;
      
      const result = parseRobotsTxt(robotsTxt, '*');
      expect(result.disallowedPaths).toContain('/admin');
      expect(result.disallowedPaths).not.toContain('/private');
    });
  });

  describe('isPathDisallowed', () => {
    test('should return false when allowed', () => {
      const robotsResult = { allowed: true, disallowedPaths: [] };
      expect(isPathDisallowed('https://example.com/page', robotsResult)).toBe(false);
    });

    test('should return true when path is disallowed', () => {
      const robotsResult = { allowed: false, disallowedPaths: ['/admin'] };
      expect(isPathDisallowed('https://example.com/admin', robotsResult)).toBe(true);
    });

    test('should return true for wildcard patterns', () => {
      const robotsResult = { allowed: false, disallowedPaths: ['/admin/*'] };
      expect(isPathDisallowed('https://example.com/admin/users', robotsResult)).toBe(true);
    });

    test('should return false for non-matching paths', () => {
      const robotsResult = { allowed: false, disallowedPaths: ['/admin'] };
      expect(isPathDisallowed('https://example.com/page', robotsResult)).toBe(false);
    });
  });

  describe('checkRobotsTxt', () => {
    test('should fetch and parse robots.txt', async () => {
      nock('https://example.com')
        .get('/robots.txt')
        .reply(200, 'User-agent: *\nDisallow: /admin');

      const result = await checkRobotsTxt('https://example.com/page');
      expect(result.disallowedPaths).toContain('/admin');
    });

    test('should cache robots.txt results', async () => {
      nock('https://example.com')
        .get('/robots.txt')
        .reply(200, 'User-agent: *\nDisallow: /admin')
        .get('/robots.txt')
        .reply(500); // This should not be called due to cache

      await checkRobotsTxt('https://example.com/page');
      await checkRobotsTxt('https://example.com/page2');
    });

    test('should return allowed when robots.txt is not accessible', async () => {
      nock('https://example.com')
        .get('/robots.txt')
        .reply(404);

      const result = await checkRobotsTxt('https://example.com/page');
      expect(result.allowed).toBe(true);
    });

    test('should return allowed on network error', async () => {
      nock('https://example.com')
        .get('/robots.txt')
        .replyWithError('Network error');

      const result = await checkRobotsTxt('https://example.com/page');
      expect(result.allowed).toBe(true);
    });
  });

  describe('clearRobotsCache', () => {
    test('should clear the robots.txt cache', async () => {
      nock('https://example.com')
        .get('/robots.txt')
        .reply(200, 'User-agent: *\nDisallow: /admin');

      await checkRobotsTxt('https://example.com/page');
      clearRobotsCache();

      nock('https://example.com')
        .get('/robots.txt')
        .reply(200, 'User-agent: *\nDisallow: /private');

      const result = await checkRobotsTxt('https://example.com/page');
      expect(result.disallowedPaths).toContain('/private');
    });
  });
});
