const { detectATSProvider } = require('../level3AtsDetector');

describe('level3AtsDetector', () => {
  describe('detectATSProvider', () => {
    test('should detect Greenhouse from URL', () => {
      const result = detectATSProvider('https://boards.greenhouse.io/techcorp/jobs', '');
      
      expect(result.provider).toBe('greenhouse');
      expect(result.confidence).toBe('high');
      expect(result.detectedUrl).toBe('https://boards.greenhouse.io/techcorp/jobs');
    });

    test('should detect Lever from URL', () => {
      const result = detectATSProvider('https://jobs.lever.co/techcorp', '');
      
      expect(result.provider).toBe('lever');
      expect(result.confidence).toBe('high');
    });

    test('should detect Workday from URL', () => {
      const result = detectATSProvider('https://myworkdayjobs.com/techcorp', '');
      
      expect(result.provider).toBe('workday');
      expect(result.confidence).toBe('high');
    });

    test('should detect Ashby from URL', () => {
      const result = detectATSProvider('https://jobs.ashbyhq.com/techcorp', '');
      
      expect(result.provider).toBe('ashby');
      expect(result.confidence).toBe('high');
    });

    test('should detect SmartRecruiters from URL', () => {
      const result = detectATSProvider('https://careers.smartrecruiters.com/techcorp', '');
      
      expect(result.provider).toBe('smartrecruiters');
      expect(result.confidence).toBe('high');
    });

    test('should detect BambooHR from URL', () => {
      const result = detectATSProvider('https://bamboohr.com/jobs/techcorp', '');
      
      expect(result.provider).toBe('bamboohr');
      expect(result.confidence).toBe('high');
    });

    test('should detect Greenhouse from HTML script', () => {
      const html = `
        <html>
        <script src="https://boards.greenhouse.io/embed.js"></script>
        </html>
      `;
      
      const result = detectATSProvider('https://techcorp.com/careers', html);
      
      expect(result.provider).toBe('greenhouse');
      expect(result.confidence).toBe('medium');
    });

    test('should detect Greenhouse from grnhse_app div', () => {
      const html = `
        <html>
        <div id="grnhse_app"></div>
        </html>
      `;
      
      const result = detectATSProvider('https://techcorp.com/careers', html);
      
      expect(result.provider).toBe('greenhouse');
      expect(result.confidence).toBe('medium');
    });

    test('should detect Lever from HTML class', () => {
      const html = `
        <html>
        <div class="lever-jobs"></div>
        </html>
      `;
      
      const result = detectATSProvider('https://techcorp.com/careers', html);
      
      expect(result.provider).toBe('lever');
      expect(result.confidence).toBe('medium');
    });

    test('should detect Ashby from HTML', () => {
      const html = `
        <html>
        <div class="ashby-job-posting"></div>
        </html>
      `;
      
      const result = detectATSProvider('https://techcorp.com/careers', html);
      
      expect(result.provider).toBe('ashby');
      expect(result.confidence).toBe('medium');
    });

    test('should detect embedded Greenhouse iframe', () => {
      const html = `
        <html>
        <iframe src="https://boards.greenhouse.io/techcorp/embed"></iframe>
        </html>
      `;
      
      const result = detectATSProvider('https://techcorp.com/careers', html);
      
      expect(result.provider).toBe('greenhouse');
      expect(result.confidence).toBe('medium');
      expect(result.detectedUrl).toBe('https://boards.greenhouse.io/techcorp/embed');
    });

    test('should return unknown for unrecognised provider', () => {
      const html = `
        <html>
        <body>
          <h1>Careers</h1>
        </body>
        </html>
      `;
      
      const result = detectATSProvider('https://techcorp.com/careers', html);
      
      expect(result.provider).toBe('unknown');
      expect(result.confidence).toBe('low');
    });

    test('should detect fetch calls in scripts', () => {
      const html = `
        <html>
        <script>
          fetch('https://boards.greenhouse.io/v1/jobs');
        </script>
        </html>
      `;
      
      const result = detectATSProvider('https://techcorp.com/careers', html);
      
      expect(result.provider).toBe('greenhouse');
      expect(result.confidence).toBe('low');
    });
  });
});
