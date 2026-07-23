const nock = require('nock');
const { analyzeCompanyWebsite } = require('../level1Analyzer');

describe('level1Analyzer', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('Scenario 1: Normal HTML site with all data', () => {
    test('should extract company name, emails, phones, social links, and URLs', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>TechCorp Solutions - Home</title>
          <meta property="og:site_name" content="TechCorp Solutions">
        </head>
        <body>
          <img src="/logo.png" alt="TechCorp Logo">
          <p>Contact us at careers@techcorp.com or info@techcorp.com</p>
          <p>Call us at +1-555-0101 or (555) 555-0102</p>
          <a href="https://linkedin.com/company/techcorp">LinkedIn</a>
          <a href="https://twitter.com/techcorp">Twitter</a>
          <a href="https://facebook.com/techcorp">Facebook</a>
          <a href="https://instagram.com/techcorp">Instagram</a>
          <a href="/careers">Careers</a>
          <a href="/contact-us">Contact Us</a>
          <a href="/about-us">About Us</a>
        </body>
        </html>
      `;

      nock('https://techcorp.com')
        .get('/')
        .reply(200, mockHtml, { 'Content-Type': 'text/html' });

      const result = await analyzeCompanyWebsite('https://techcorp.com');

      expect(result.companyName).toBe('TechCorp Solutions');
      expect(result.emails).toContain('careers@techcorp.com');
      expect(result.emails).toContain('info@techcorp.com');
      expect(result.phones.length).toBeGreaterThan(0);
      expect(result.socialLinks.linkedin).toBe('https://linkedin.com/company/techcorp');
      expect(result.socialLinks.twitter).toBe('https://twitter.com/techcorp');
      expect(result.socialLinks.facebook).toBe('https://facebook.com/techcorp');
      expect(result.socialLinks.instagram).toBe('https://instagram.com/techcorp');
      expect(result.careerUrlCandidates).toContain('https://techcorp.com/careers');
      expect(result.contactUrl).toBe('https://techcorp.com/contact-us');
      expect(result.aboutUrl).toBe('https://techcorp.com/about-us');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Scenario 2: Site with no careers link on homepage', () => {
    test('should fetch About and Contact pages to find career links', async () => {
      const homepageHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>InnovateLabs</title>
        </head>
        <body>
          <p>Contact us at hello@innovatelabs.io</p>
          <a href="/contact">Contact</a>
          <a href="/about">About</a>
        </body>
        </html>
      `;

      const aboutPageHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <h1>About Us</h1>
          <a href="/jobs">Join our team</a>
        </body>
        </html>
      `;

      nock('https://innovatelabs.io')
        .get('/')
        .reply(200, homepageHtml, { 'Content-Type': 'text/html' });

      nock('https://innovatelabs.io')
        .get('/about')
        .reply(200, aboutPageHtml, { 'Content-Type': 'text/html' });

      nock('https://innovatelabs.io')
        .get('/contact')
        .reply(200, '<html><body>Contact page</body></html>', { 'Content-Type': 'text/html' });

      const result = await analyzeCompanyWebsite('https://innovatelabs.io');

      expect(result.companyName).toBe('InnovateLabs');
      expect(result.emails).toContain('hello@innovatelabs.io');
      expect(result.careerUrlCandidates).toContain('https://innovatelabs.io/jobs');
      expect(result.contactUrl).toBe('https://innovatelabs.io/contact');
      expect(result.aboutUrl).toBe('https://innovatelabs.io/about');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Scenario 3: Site that times out', () => {
    test('should handle timeout gracefully and return partial data with errors', async () => {
      nock('https://timeout-site.com')
        .get('/')
        .delay(15000)
        .reply(200, '<html><title>Timeout Site</title></html>');

      const result = await analyzeCompanyWebsite('https://timeout-site.com');

      expect(result.companyName).toBeNull();
      expect(result.emails).toHaveLength(0);
      expect(result.phones).toHaveLength(0);
      expect(result.careerUrlCandidates).toHaveLength(0);
      expect(result.contactUrl).toBeNull();
      expect(result.aboutUrl).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Homepage fetch failed');
    });
  });

  describe('Retry policy', () => {
    test('should retry on network failure with exponential backoff', async () => {
      let attemptCount = 0;
      
      nock('https://flaky-site.com')
        .get('/')
        .times(2)
        .replyWithError('Network error')
        .get('/')
        .reply(200, '<html><title>FlakySite</title></html>', { 'Content-Type': 'text/html' });

      const result = await analyzeCompanyWebsite('https://flaky-site.com');

      expect(result.companyName).toBe('FlakySite');
      expect(result.errors).toHaveLength(0);
    });

    test('should not retry on 404 errors', async () => {
      nock('https://notfound-site.com')
        .get('/')
        .reply(404);

      const result = await analyzeCompanyWebsite('https://notfound-site.com');

      expect(result.companyName).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    test('should filter out false positive emails', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <p>Contact: real@company.com</p>
          <img src="test@example.com.png" alt="logo">
          <img src="image@test.com.jpg" alt="test">
        </body>
        </html>
      `;

      nock('https://test.com')
        .get('/')
        .reply(200, mockHtml, { 'Content-Type': 'text/html' });

      const result = await analyzeCompanyWebsite('https://test.com');

      expect(result.emails).toContain('real@company.com');
      expect(result.emails).not.toContain('test@example.com');
    });

    test('should handle relative URLs correctly', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <a href="/careers">Careers</a>
          <a href="contact">Contact</a>
        </body>
        </html>
      `;

      nock('https://relative.com')
        .get('/')
        .reply(200, mockHtml, { 'Content-Type': 'text/html' });

      const result = await analyzeCompanyWebsite('https://relative.com');

      expect(result.careerUrlCandidates).toContain('https://relative.com/careers');
      expect(result.contactUrl).toBe('https://relative.com/contact');
    });

    test('should use domain name as fallback when company name not found', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Welcome</title>
        </head>
        <body>
          <p>No company info</p>
        </body>
        </html>
      `;

      nock('https://fallback.com')
        .get('/')
        .reply(200, mockHtml, { 'Content-Type': 'text/html' });

      const result = await analyzeCompanyWebsite('https://fallback.com');

      expect(result.companyName).toBe('Fallback');
    });
  });
});
