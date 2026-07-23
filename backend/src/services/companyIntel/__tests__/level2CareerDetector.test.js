const nock = require('nock');
const {
  detectCareerPage,
  searchSite,
  validateCandidates,
  tryCommonPaths,
  checkNegativeCache,
  cacheNegativeResult,
} = require('../level2CareerDetector');

describe('level2CareerDetector', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('validateCandidates', () => {
    test('should validate candidates and return sorted results', async () => {
      const validHtml = `
        <html>
        <body>
          <h1>We are hiring!</h1>
          <p>Check out our open job positions and apply today.</p>
          <p>Careers at our company.</p>
        </body>
        </html>
      `;

      nock('https://techcorp.com')
        .head('/careers')
        .reply(405); // Method not allowed, fallback to GET

      nock('https://techcorp.com')
        .get('/careers')
        .reply(200, validHtml);

      nock('https://techcorp.com')
        .head('/jobs')
        .reply(405);

      nock('https://techcorp.com')
        .get('/jobs')
        .reply(200, validHtml);

      const results = await validateCandidates([
        'https://techcorp.com/careers',
        'https://techcorp.com/jobs',
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].url).toBeDefined();
      expect(results[0].keywordDensity).toBeGreaterThan(0);
      expect(results[0].urlConfidence).toBeGreaterThan(0);
      expect(results[0].totalScore).toBeGreaterThan(0);
    });

    test('should filter out non-200 responses', async () => {
      nock('https://techcorp.com')
        .head('/invalid')
        .reply(404);

      nock('https://techcorp.com')
        .get('/invalid')
        .reply(404);

      const results = await validateCandidates(['https://techcorp.com/invalid']);

      expect(results).toHaveLength(0);
    });
  });

  describe('tryCommonPaths', () => {
    test('should find career page at common path', async () => {
      const jobHtml = `
        <html>
        <body>
          <h1>Job Openings</h1>
          <p>We are hiring for multiple positions.</p>
        </body>
        </html>
      `;

      nock('https://example.com')
        .head('/careers')
        .reply(404);

      nock('https://example.com')
        .get('/careers')
        .reply(200, jobHtml);

      const result = await tryCommonPaths('example.com');

      expect(result).toBe('https://example.com/careers');
    });

    test('should return null if no common path works', async () => {
      nock('https://example.com')
        .head('/careers')
        .reply(404);

      nock('https://example.com')
        .get('/careers')
        .reply(404);

      nock('https://example.com')
        .head('/jobs')
        .reply(404);

      nock('https://example.com')
        .get('/jobs')
        .reply(404);

      const result = await tryCommonPaths('example.com');

      expect(result).toBeNull();
    });
  });

  describe('checkNegativeCache', () => {
    test('should return false when no redis client provided', async () => {
      const result = await checkNegativeCache('example.com', null);
      expect(result).toBe(false);
    });

    test('should return false when redis get fails', async () => {
      const mockRedis = {
        get: jest.fn().mockRejectedValue(new Error('Redis error')),
      };

      const result = await checkNegativeCache('example.com', mockRedis);
      expect(result).toBe(false);
    });
  });

  describe('cacheNegativeResult', () => {
    test('should not cache when no redis client provided', async () => {
      await expect(cacheNegativeResult('example.com', null)).resolves.not.toThrow();
    });

    test('should not throw when redis setex fails', async () => {
      const mockRedis = {
        setex: jest.fn().mockRejectedValue(new Error('Redis error')),
      };

      await expect(cacheNegativeResult('example.com', mockRedis)).resolves.not.toThrow();
    });
  });

  describe('detectCareerPage - integration', () => {
    test('should find career page from level1 candidates', async () => {
      const jobHtml = `
        <html>
        <body>
          <h1>Careers</h1>
          <p>We are hiring for multiple job positions.</p>
          <p>Apply now for open roles.</p>
        </body>
        </html>
      `;

      const level1Result = {
        careerUrlCandidates: ['https://techcorp.com/careers'],
      };

      nock('https://techcorp.com')
        .head('/careers')
        .reply(200);

      const result = await detectCareerPage('https://techcorp.com', level1Result);

      expect(result.careerPageFound).toBe(true);
      expect(result.careerUrl).toBe('https://techcorp.com/careers');
      expect(result.method).toBe('homepage_link');
      expect(['high', 'medium', 'low']).toContain(result.confidence);
    });

    test('should fall back to common paths if no candidates validate', async () => {
      const jobHtml = `
        <html>
        <body>
          <h1>Job Openings</h1>
          <p>We are hiring.</p>
        </body>
        </html>
      `;

      const level1Result = {
        careerUrlCandidates: ['https://techcorp.com/invalid-career'],
      };

      nock('https://techcorp.com')
        .head('/invalid-career')
        .reply(404);

      nock('https://techcorp.com')
        .head('/careers')
        .reply(404);

      nock('https://techcorp.com')
        .get('/careers')
        .reply(200, jobHtml);

      const result = await detectCareerPage('https://techcorp.com', level1Result);

      expect(result.careerPageFound).toBe(true);
      expect(result.careerUrl).toBe('https://techcorp.com/careers');
      expect(result.method).toBe('common_path');
      expect(result.confidence).toBe('medium');
    });

    test('should use search fallback if common paths fail', async () => {
      const level1Result = {
        careerUrlCandidates: [],
      };

      const mockSearchProvider = jest.fn().mockResolvedValue(['https://techcorp.com/work-here']);

      const jobHtml = `
        <html>
        <body>
          <h1>Jobs</h1>
          <p>Apply today.</p>
        </body>
        </html>
      `;

      nock('https://techcorp.com')
        .head('/careers')
        .reply(404);

      nock('https://techcorp.com')
        .get('/careers')
        .reply(404);

      nock('https://techcorp.com')
        .head('/jobs')
        .reply(404);

      nock('https://techcorp.com')
        .get('/jobs')
        .reply(404);

      nock('https://techcorp.com')
        .head('/work-here')
        .reply(404);

      nock('https://techcorp.com')
        .get('/work-here')
        .reply(200, jobHtml);

      const result = await detectCareerPage('https://techcorp.com', level1Result, {
        searchProvider: mockSearchProvider,
      });

      expect(result.careerPageFound).toBe(true);
      expect(result.careerUrl).toBe('https://techcorp.com/work-here');
      expect(result.method).toBe('search_fallback');
      expect(result.confidence).toBe('low');
      expect(mockSearchProvider).toHaveBeenCalledWith('techcorp.com', 'careers OR jobs OR openings');
    });

    test('should return not_found if all methods fail', async () => {
      const level1Result = {
        careerUrlCandidates: [],
      };

      const mockSearchProvider = jest.fn().mockResolvedValue([]);

      nock('https://techcorp.com')
        .head('/careers')
        .reply(404);

      nock('https://techcorp.com')
        .get('/careers')
        .reply(404);

      nock('https://techcorp.com')
        .head('/jobs')
        .reply(404);

      nock('https://techcorp.com')
        .get('/jobs')
        .reply(404);

      const result = await detectCareerPage('https://techcorp.com', level1Result, {
        searchProvider: mockSearchProvider,
      });

      expect(result.careerPageFound).toBe(false);
      expect(result.careerUrl).toBeNull();
      expect(result.method).toBe('not_found');
      expect(result.confidence).toBe('low');
    });

    test('should respect negative cache', async () => {
      const level1Result = {
        careerUrlCandidates: [],
      };

      const mockRedis = {
        get: jest.fn().mockResolvedValue('1'),
        setex: jest.fn(),
      };

      const result = await detectCareerPage('https://techcorp.com', level1Result, {
        redisClient: mockRedis,
      });

      expect(result.careerPageFound).toBe(false);
      expect(result.method).toBe('not_found');
      expect(mockRedis.get).toHaveBeenCalledWith('career-negcache:techcorp.com');
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    test('should cache negative result', async () => {
      const level1Result = {
        careerUrlCandidates: [],
      };

      const mockSearchProvider = jest.fn().mockResolvedValue([]);

      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn(),
      };

      nock('https://techcorp.com')
        .head('/careers')
        .reply(404);

      nock('https://techcorp.com')
        .get('/careers')
        .reply(404);

      const result = await detectCareerPage('https://techcorp.com', level1Result, {
        redisClient: mockRedis,
        searchProvider: mockSearchProvider,
      });

      expect(result.careerPageFound).toBe(false);
      expect(result.method).toBe('not_found');
      expect(mockRedis.setex).toHaveBeenCalledWith('career-negcache:techcorp.com', 604800, '1');
    });
  });

  describe('searchSite stub', () => {
    test('should return empty array (stub implementation)', async () => {
      const result = await searchSite('example.com', 'careers');
      expect(result).toEqual([]);
    });
  });
});
