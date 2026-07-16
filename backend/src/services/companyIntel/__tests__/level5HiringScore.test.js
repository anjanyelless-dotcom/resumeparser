// Mock the database module
jest.mock('../../../database/db', () => ({
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  }),
}));

const {
  calculateCareerPageScore,
  calculateHrEmailScore,
  calculateOpenJobsScore,
  calculateLinkedinScore,
  calculateRecentJobsScore,
  getHiringLabel,
  SCORE_CONFIG,
} = require('../level5HiringScore');

describe('level5HiringScore', () => {
  describe('calculateCareerPageScore', () => {
    test('should return max points when career page exists', () => {
      const companyData = { careerUrl: 'https://company.com/careers' };
      const score = calculateCareerPageScore(companyData);
      
      expect(score).toBe(SCORE_CONFIG.careerPage.maxPoints);
    });

    test('should return 0 when no career page', () => {
      const companyData = { careerUrl: null };
      const score = calculateCareerPageScore(companyData);
      
      expect(score).toBe(0);
    });
  });

  describe('calculateHrEmailScore', () => {
    test('should return max points when HR email found', () => {
      const companyData = {
        contacts: [
          { email: 'hr@company.com', type: 'hr' },
        ],
      };
      const score = calculateHrEmailScore(companyData);
      
      expect(score).toBe(SCORE_CONFIG.hrEmail.maxPoints);
    });

    test('should return max points when careers email found', () => {
      const companyData = {
        contacts: [
          { email: 'careers@company.com', type: 'general' },
        ],
      };
      const score = calculateHrEmailScore(companyData);
      
      expect(score).toBe(SCORE_CONFIG.hrEmail.maxPoints);
    });

    test('should return max points when talent email found', () => {
      const companyData = {
        contacts: [
          { email: 'talent@company.com', type: 'general' },
        ],
      };
      const score = calculateHrEmailScore(companyData);
      
      expect(score).toBe(SCORE_CONFIG.hrEmail.maxPoints);
    });

    test('should return 0 when no HR email', () => {
      const companyData = {
        contacts: [
          { email: 'info@company.com', type: 'general' },
        ],
      };
      const score = calculateHrEmailScore(companyData);
      
      expect(score).toBe(0);
    });

    test('should return 0 when no contacts', () => {
      const companyData = { contacts: [] };
      const score = calculateHrEmailScore(companyData);
      
      expect(score).toBe(0);
    });
  });

  describe('calculateOpenJobsScore', () => {
    test('should return 0 for no jobs', () => {
      const companyData = { jobs: [] };
      const score = calculateOpenJobsScore(companyData);
      
      expect(score).toBe(0);
    });

    test('should return 10 for 1-2 jobs', () => {
      const companyData = { jobs: [{ title: 'Job 1' }] };
      const score = calculateOpenJobsScore(companyData);
      
      expect(score).toBe(10);
    });

    test('should return 10 for 2 jobs', () => {
      const companyData = { jobs: [{ title: 'Job 1' }, { title: 'Job 2' }] };
      const score = calculateOpenJobsScore(companyData);
      
      expect(score).toBe(10);
    });

    test('should return 18 for 3-5 jobs', () => {
      const companyData = { jobs: [{ title: 'Job 1' }, { title: 'Job 2' }, { title: 'Job 3' }] };
      const score = calculateOpenJobsScore(companyData);
      
      expect(score).toBe(18);
    });

    test('should return 18 for 5 jobs', () => {
      const companyData = { jobs: Array(5).fill({ title: 'Job' }) };
      const score = calculateOpenJobsScore(companyData);
      
      expect(score).toBe(18);
    });

    test('should return 25 for 6+ jobs', () => {
      const companyData = { jobs: Array(6).fill({ title: 'Job' }) };
      const score = calculateOpenJobsScore(companyData);
      
      expect(score).toBe(SCORE_CONFIG.openJobs.maxPoints);
    });
  });

  describe('calculateLinkedinScore', () => {
    test('should return max points when LinkedIn URL exists', () => {
      const companyData = { linkedinUrl: 'https://linkedin.com/company/example' };
      const score = calculateLinkedinScore(companyData);
      
      expect(score).toBe(SCORE_CONFIG.linkedin.maxPoints);
    });

    test('should return 0 when no LinkedIn URL', () => {
      const companyData = { linkedinUrl: null };
      const score = calculateLinkedinScore(companyData);
      
      expect(score).toBe(0);
    });
  });

  describe('calculateRecentJobsScore', () => {
    test('should return 0 for no jobs', () => {
      const companyData = { jobs: [] };
      const score = calculateRecentJobsScore(companyData);
      
      expect(score).toBe(0);
    });

    test('should return max points when all jobs are recent', () => {
      const today = new Date();
      const companyData = {
        jobs: [
          { posted_date: today.toISOString() },
          { posted_date: today.toISOString() },
          { posted_date: today.toISOString() },
        ],
      };
      const score = calculateRecentJobsScore(companyData);
      
      expect(score).toBe(SCORE_CONFIG.recentJobs.maxPoints);
    });

    test('should return 0 when no jobs are recent', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      const companyData = {
        jobs: [
          { posted_date: oldDate.toISOString() },
          { posted_date: oldDate.toISOString() },
        ],
      };
      const score = calculateRecentJobsScore(companyData);
      
      expect(score).toBe(0);
    });

    test('should scale based on percentage of recent jobs', () => {
      const today = new Date();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      const companyData = {
        jobs: [
          { posted_date: today.toISOString() },
          { posted_date: oldDate.toISOString() },
        ],
      };
      const score = calculateRecentJobsScore(companyData);
      
      // 50% recent = 50% of max points
      expect(score).toBe(Math.round(SCORE_CONFIG.recentJobs.maxPoints * 0.5));
    });

    test('should handle missing posted_date', () => {
      const companyData = {
        jobs: [
          { posted_date: null },
          { posted_date: null },
        ],
      };
      const score = calculateRecentJobsScore(companyData);
      
      expect(score).toBe(0);
    });
  });

  describe('getHiringLabel', () => {
    test('should return "Actively Hiring" for 80-100', () => {
      expect(getHiringLabel(80)).toBe('Actively Hiring');
      expect(getHiringLabel(100)).toBe('Actively Hiring');
    });

    test('should return "Hiring" for 50-79', () => {
      expect(getHiringLabel(50)).toBe('Hiring');
      expect(getHiringLabel(75)).toBe('Hiring');
    });

    test('should return "Occasionally Hiring" for 25-49', () => {
      expect(getHiringLabel(25)).toBe('Occasionally Hiring');
      expect(getHiringLabel(40)).toBe('Occasionally Hiring');
    });

    test('should return "Not Currently Hiring" for 0-24', () => {
      expect(getHiringLabel(0)).toBe('Not Currently Hiring');
      expect(getHiringLabel(20)).toBe('Not Currently Hiring');
    });
  });

  describe('SCORE_CONFIG', () => {
    test('should have correct max points', () => {
      expect(SCORE_CONFIG.careerPage.maxPoints).toBe(20);
      expect(SCORE_CONFIG.hrEmail.maxPoints).toBe(20);
      expect(SCORE_CONFIG.openJobs.maxPoints).toBe(25);
      expect(SCORE_CONFIG.linkedin.maxPoints).toBe(10);
      expect(SCORE_CONFIG.recentJobs.maxPoints).toBe(25);
    });
  });
});
