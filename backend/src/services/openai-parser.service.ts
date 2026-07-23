import OpenAI from "openai";

interface WorkExperience {
  company: string;
  company_name: string;
  role: string;
  job_title: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  client: string | null;
  clients: string[];
  description: string;
}

interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: number | null;
  end_year: number | null;
  grade: string | null;
}

interface OpenAIParseResult {
  work_history: WorkExperience[];
  education: Education[];
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  processing_time_ms?: number;
}

export class OpenAIParserService {
  private client: OpenAI;
  private model: string = "gpt-4o-mini";

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }
    this.client = new OpenAI({ apiKey, timeout: 60000 });
  }

  /**
   * Parse resume sections using OpenAI GPT-4o-mini
   */
  async parseResumeSections(
    experienceText: string,
    educationText: string
  ): Promise<OpenAIParseResult> {
    const startTime = Date.now();

    try {
      console.log("🤖 Starting OpenAI parsing...");
      console.log(`📝 Experience text length: ${experienceText?.length || 0} chars`);
      console.log(`🎓 Education text length: ${educationText?.length || 0} chars`);

      const prompt = this.buildPrompt(experienceText, educationText);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert resume parser. Extract structured data from resume sections and return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const processingTime = Date.now() - startTime;

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      console.log("📊 OpenAI response received");
      console.log(`⏱️  Processing time: ${processingTime}ms`);
      console.log(`🎯 Token usage: ${JSON.stringify(completion.usage)}`);

      const parsed = JSON.parse(content);

      return {
        work_history: this.normalizeWorkExperience(parsed.work_history || []),
        education: this.normalizeEducation(parsed.education || []),
        token_usage: completion.usage
          ? {
              prompt_tokens: completion.usage.prompt_tokens,
              completion_tokens: completion.usage.completion_tokens,
              total_tokens: completion.usage.total_tokens,
            }
          : undefined,
        processing_time_ms: processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error("❌ OpenAI parsing failed:", error.message);
      console.error(`⏱️  Failed after: ${processingTime}ms`);
      throw error;
    }
  }

  /**
   * Build the prompt for OpenAI
   */
  private buildPrompt(experienceText: string, educationText: string): string {
    return `You are an expert resume parser. Analyze the provided experience and education sections.

CRITICAL RULES FOR WORK EXPERIENCE:

1. COMPANY DETECTION:
   - The actual employer company is usually mentioned at the start of each job entry
   - Example: "Full Stack Developer at Lalataksha Consulting Services Pvt. Ltd." → company is "Lalataksha Consulting Services Pvt. Ltd."
   - Do NOT include project names, platform names, or system names as the company

2. ROLE/JOB TITLE:
   - Extract the actual job title (e.g., "Full Stack Developer", "Frontend Developer", "Junior Frontend Developer")
   - Fix incomplete titles: "Stack Developer" → "Full Stack Developer"
   - Do NOT extract just "Junior" or partial titles

3. CLIENT DETECTION:
   - Client is ONLY mentioned if explicitly stated (e.g., "Client: ABC Corp" or "for XYZ Company")
   - Do NOT treat these as clients:
     * Project names (e.g., "Gatnix CRM", "OxyLoans", "AskOxy.ai")
     * Platform types (e.g., "Platform", "Application", "System", "Portal")
     * Technology names
   - If no explicit client is mentioned, return null

4. PROJECT vs COMPANY:
   - Projects are work done AT a company, not the company itself
   - Example: "Gatnix CRM – Enterprise Recruitment Management Platform" is a PROJECT, not the company
   - The company is "Lalataksha Consulting Services Pvt. Ltd."

5. DATES:
   - Normalize to YYYY-MM format (e.g., "Nov 2024" → "2024-11")
   - "Present", "Current", "Now" → end_date is null and is_current is true

6. DESCRIPTION:
   - Combine all responsibilities and achievements into the description field

WORK EXPERIENCE OUTPUT FORMAT:
{
  "company": "Actual employer company name",
  "company_name": "Same as company",
  "role": "Job title",
  "job_title": "Same as role",
  "location": "City, Country",
  "start_date": "YYYY-MM",
  "end_date": "YYYY-MM or null if current",
  "is_current": true/false,
  "client": null (unless explicitly mentioned),
  "clients": [],
  "description": "Combined responsibilities and achievements"
}

EDUCATION RULES:

1. Extract institution name (university/college)
2. Extract degree (e.g., "Bachelor of Engineering", "B.E.", "BS")
3. Extract field of study (e.g., "Computer Science")
4. Extract years as integers
5. Extract GPA/grade if mentioned
6. Return null for missing values

EDUCATION OUTPUT FORMAT:
{
  "institution": "University/College name",
  "degree": "Degree name",
  "field_of_study": "Field of study",
  "start_year": integer or null,
  "end_year": integer or null,
  "grade": "GPA or grade or null"
}

EXPERIENCE SECTION:
${experienceText || "No experience section provided"}

EDUCATION SECTION:
${educationText || "No education section provided"}

Return ONLY valid JSON with this exact structure:
{
  "work_history": [...],
  "education": [...]
}

No markdown, no explanations, no extra text.`;
  }

  /**
   * Normalize work experience to match DeBERTa parser schema
   */
  private normalizeWorkExperience(experiences: any[]): WorkExperience[] {
    return experiences.map((exp) => ({
      company: exp.company || exp.company_name || "",
      company_name: exp.company_name || exp.company || "",
      role: exp.role || exp.job_title || "",
      job_title: exp.job_title || exp.role || "",
      location: exp.location || "",
      start_date: exp.start_date || "",
      end_date: exp.end_date || "",
      is_current: exp.is_current || false,
      client: exp.client || null,
      clients: Array.isArray(exp.clients) ? exp.clients : [],
      description: exp.description || "",
    }));
  }

  /**
   * Normalize education to match DeBERTa parser schema
   */
  private normalizeEducation(educations: any[]): Education[] {
    return educations.map((edu) => ({
      institution: edu.institution || "",
      degree: edu.degree || "",
      field_of_study: edu.field_of_study || "",
      start_year: edu.start_year ? parseInt(String(edu.start_year)) : null,
      end_year: edu.end_year ? parseInt(String(edu.end_year)) : null,
      grade: edu.grade || null,
    }));
  }
}
