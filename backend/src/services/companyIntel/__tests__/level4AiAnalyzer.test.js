// Mock the database module
jest.mock('../../../database/db', () => ({
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  }),
}));

const {
  buildPrompt,
  parseJSONDefensively,
  persistAIResults,
} = require('../level4AiAnalyzer');

describe('level4AiAnalyzer', () => {
  describe('buildPrompt', () => {
    test('should build prompt with all company data', () => {
      const companyData = {
        companyName: 'TechCorp Inc',
        aboutText: 'We are a leading technology company...',
        emails: ['hr@techcorp.com', 'careers@techcorp.com'],
        jobs: [
          { title: 'Senior Engineer' },
          { title: 'Product Manager' },
          { title: 'Sales Representative' },
        ],
        socialLinks: { linkedin: 'https://linkedin.com/company/techcorp' },
        industry_hint: 'Technology',
      };

      const prompt = buildPrompt(companyData);

      expect(prompt).toContain('TechCorp Inc');
      expect(prompt).toContain('We are a leading technology company');
      expect(prompt).toContain('hr@techcorp.com');
      expect(prompt).toContain('OPEN JOBS: 3');
      expect(prompt).toContain('Senior Engineer');
      expect(prompt).toContain('Technology');
    });

    test('should handle missing data gracefully', () => {
      const companyData = {
        companyName: 'UnknownCorp',
      };

      const prompt = buildPrompt(companyData);

      expect(prompt).toContain('UnknownCorp');
      expect(prompt).toContain('No about text available');
      expect(prompt).toContain('No industry hint provided');
      expect(prompt).toContain('OPEN JOBS: 0');
    });
  });

  describe('parseJSONDefensively', () => {
    test('should parse valid JSON', () => {
      const json = '{"industry": "Technology", "companySizeEstimate": "11-50"}';
      const result = parseJSONDefensively(json);

      expect(result.industry).toBe('Technology');
      expect(result.companySizeEstimate).toBe('11-50');
    });

    test('should strip markdown code fences', () => {
      const json = '```json\n{"industry": "Technology"}\n```';
      const result = parseJSONDefensively(json);

      expect(result.industry).toBe('Technology');
    });

    test('should strip markdown without json identifier', () => {
      const json = '```\n{"industry": "Technology"}\n```';
      const result = parseJSONDefensively(json);

      expect(result.industry).toBe('Technology');
    });

    test('should extract JSON from mixed content', () => {
      const content = 'Here is the result: {"industry": "Technology"} and some text';
      const result = parseJSONDefensively(content);

      expect(result.industry).toBe('Technology');
    });

    test('should throw on invalid JSON', () => {
      const invalid = 'not valid json at all';
      
      expect(() => {
        parseJSONDefensively(invalid);
      }).toThrow();
    });

    test('should throw when no JSON found in content', () => {
      const content = 'This is just plain text with no json';
      
      expect(() => {
        parseJSONDefensively(content);
      }).toThrow();
    });
  });

  describe('persistAIResults', () => {
    test('should not throw when database fails', async () => {
      const result = {
        industry: 'Technology',
        companySizeEstimate: '11-50',
        hiringStatus: 'hiring',
      };

      // This should not throw even without a valid database connection
      await expect(persistAIResults('invalid-uuid', result)).resolves.not.toThrow();
    });
  });
});
