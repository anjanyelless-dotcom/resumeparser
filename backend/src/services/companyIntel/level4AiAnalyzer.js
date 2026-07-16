const OpenAI = require('openai');
const { getClient } = require('../../database/db');

/**
 * Analyze company data using AI
 * @param {Object} companyData - Merged output from Levels 1-3
 * @returns {Promise<Object>} - AI analysis result
 */
async function analyzeCompanyWithAI(companyData) {
  const { companyName, aboutText, emails, jobs, socialLinks, industry_hint } = companyData;
  
  console.log('[Level 4] Starting AI analysis for company:', companyName);
  console.log('[Level 4] Input data:', JSON.stringify({
    companyName,
    hasAboutText: !!aboutText,
    emailCount: emails?.length || 0,
    jobCount: jobs?.length || 0,
    hasLinkedIn: !!socialLinks?.linkedin,
    industryHint: industry_hint,
  }, null, 2));
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const model = 'gpt-4o-mini';
  
  const prompt = buildPrompt(companyData);
  
  try {
    const result = await callAIWithRetry(client, model, prompt);
    
    console.log('[Level 4] AI raw response:', JSON.stringify(result, null, 2));
    console.log('[Level 4] Parsed AI result:', JSON.stringify({
      industry: result.industry,
      companySizeEstimate: result.companySizeEstimate,
      hiringStatus: result.hiringStatus,
      keyRoleThemes: result.keyRoleThemes,
    }, null, 2));
    
    // Persist to database if companyId is provided
    if (companyData.companyId) {
      await persistAIResults(companyData.companyId, result);
    }
    
    return result;
  } catch (error) {
    console.error('[Level 4] AI analysis failed:', error.message);
    return null;
  }
}

/**
 * Build the prompt for AI analysis
 * @param {Object} companyData - Company data from Levels 1-3
 * @returns {string} - Prompt string
 */
function buildPrompt(companyData) {
  const { companyName, aboutText, emails, jobs, socialLinks, industry_hint, teamPageText } = companyData;
  
  const jobCount = jobs ? jobs.length : 0;
  const jobTitles = jobs ? jobs.map(j => j.title).slice(0, 10).join(', ') : 'none';
  const linkedinUrl = socialLinks?.linkedin || 'none';
  
  return `Analyze the following company data and return structured insights.

COMPANY NAME: ${companyName || 'Unknown'}

ABOUT TEXT:
${aboutText || 'No about text available'}

${teamPageText ? `TEAM/LEADERSHIP PAGE TEXT:
${teamPageText}` : ''}

INDUSTRY HINT:
${industry_hint || 'No industry hint provided'}

LINKEDIN COMPANY PAGE: ${linkedinUrl}

EMAILS FOUND: ${emails ? emails.length : 0}
${emails ? emails.slice(0, 5).join(', ') : ''}

OPEN JOBS: ${jobCount}
${jobTitles ? `JOB TITLES: ${jobTitles}` : ''}

TASK: Extract the following information based on the data above. Be conservative but do NOT return "unknown" without attempting an estimate based on available evidence.

REQUIRED OUTPUT FORMAT (JSON only, no markdown):
{
  "industry": "specific industry (e.g., 'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Consulting', etc.) or 'unknown' only if truly no clues",
  "companySizeEstimate": "1-10" | "11-50" | "51-200" | "201-500" | "500+" or "unknown",
  "hiringStatus": "not_hiring" | "hiring" | "actively_hiring",
  "keyRoleThemes": ["theme1", "theme2", ...],
  "summary": "2-3 sentence recruiter-facing summary of the company"
}

GUIDELINES:
1. companySizeEstimate: Base your estimate on ALL available evidence:
   - Explicit mentions in about text (e.g., "team of 50+ engineers", "200 employees")
   - Number of open jobs (more jobs generally = larger company)
   - Breadth of services/product lines described
   - Any numeric team size mentions
   - Presence of multiple office locations
   - If LinkedIn URL is available, infer from company profile if mentioned
   MAPPING:
   - 1-10 jobs or "small team"/"startup" mentioned → "1-10"
   - 11-50 jobs or "growing team" mentioned → "11-50"
   - 51-200 jobs or "medium-sized" mentioned → "51-200"
   - 201-500 jobs or "large company" mentioned → "201-500"
   - 500+ jobs or "enterprise"/"global" mentioned → "500+"
   - Only return "unknown" if there is truly ZERO relevant text or clues

2. hiringStatus: Based ONLY on job count (this will be overridden by Level 5):
   - 0 jobs → "not_hiring"
   - 1-5 jobs → "hiring"
   - 6+ jobs → "actively_hiring"
   NOTE: Level 5 will set the final hiring_status based on actual job count

3. keyRoleThemes: Extract 3-5 themes from job titles (e.g., "backend engineering", "frontend", "data science", "sales", "marketing")

4. summary: Write for recruiters - mention industry, size estimate, and key hiring themes

5. industry: Use industry_hint if provided, otherwise infer from:
   - Company name and domain
   - About text and services described
   - Job titles and roles
   - Only return "unknown" if truly no clues exist

Return ONLY valid JSON. No markdown fences, no explanations, no extra text.`;
}

/**
 * Call AI with retry logic for JSON parsing failures
 * @param {OpenAI} client - OpenAI client
 * @param {string} model - Model name
 * @param {string} prompt - Prompt string
 * @param {number} retryCount - Current retry count
 * @returns {Promise<Object>} - Parsed JSON result
 */
async function callAIWithRetry(client, model, prompt, retryCount = 0) {
  const maxRetries = 1;
  
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: retryCount > 0 
            ? 'You are an expert company analyst. Return ONLY valid JSON. No markdown fences, no explanations, no extra text.'
            : 'You are an expert company analyst. Extract structured data and return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }
    
    // Defensive JSON parsing
    const parsed = parseJSONDefensively(content);
    return parsed;
    
  } catch (error) {
    if (retryCount < maxRetries) {
      console.log(`Retrying AI call (attempt ${retryCount + 1}/${maxRetries + 1})`);
      return callAIWithRetry(client, model, prompt, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Parse JSON defensively with fallback
 * @param {string} content - Content to parse
 * @returns {Object} - Parsed JSON or default object
 */
function parseJSONDefensively(content) {
  try {
    // Remove markdown code fences if present
    let cleaned = content.trim();
    
    // Remove ```json and ``` markers
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    
    // Try parsing
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON parsing failed, trying alternative methods');
    
    // Try extracting JSON from content
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback failed
    }
    
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * Persist AI results to database
 * @param {string} companyId - Company UUID
 * @param {Object} result - AI analysis result
 */
async function persistAIResults(companyId, result) {
  const client = await getClient();
  
  try {
    const values = [
      result.industry || null,
      result.companySizeEstimate || null,
      result.hiringStatus || null,
      companyId,
    ];
    
    console.log('[Level 4] Persisting AI results to database:', JSON.stringify({
      companyId,
      industry: values[0],
      companySizeEstimate: values[1],
      hiringStatus: values[2],
    }, null, 2));
    
    const query = `
      UPDATE companies
      SET 
        industry = COALESCE($1, industry),
        company_size = COALESCE($2, company_size),
        hiring_status = COALESCE($3, hiring_status),
        updated_at = NOW()
      WHERE id = $4
    `;
    
    const updateResult = await client.query(query, values);
    console.log('[Level 4] Database update result:', updateResult.rowCount, 'rows affected');
  } catch (error) {
    console.error('[Level 4] Failed to persist AI results:', error.message);
    // Don't throw - we don't want to fail the whole operation if DB update fails
  } finally {
    client.release();
  }
}

module.exports = {
  analyzeCompanyWithAI,
  buildPrompt,
  parseJSONDefensively,
  persistAIResults,
};
