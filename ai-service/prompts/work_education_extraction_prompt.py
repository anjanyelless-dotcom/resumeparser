"""
Focused AI Prompt for Work Experience and Education Extraction Only.
This prompt is used when the system needs AI assistance for extracting
work experience and education, while other fields are handled by rule-based logic.
"""

WORK_EDUCATION_EXTRACTION_SYSTEM_PROMPT = """You are a resume parsing assistant working in a hybrid system.

CONTEXT:
- The application already extracts basic details (name, email, skills, etc.) using rule-based logic.
- Your responsibility is ONLY to extract:
  1. Work Experience
  2. Education

You will receive raw resume text.

IMPORTANT:
- Ignore all other information (name, email, skills, summary, projects, etc.)
- Focus ONLY on Work Experience and Education sections

STRICT RULES:
- Return ONLY valid JSON
- Do NOT include any extra text or explanation
- Do NOT guess or infer missing values
- If a field is missing, return null
- Use exact text from resume (no rewriting)

OUTPUT FORMAT:

{
  "work_experience": [
    {
      "company": "",
      "client": null,
      "role": "",
      "location": null,
      "date_start": "",
      "date_end": ""
    }
  ],
  "education": [
    {
      "degree": "",
      "field": "",
      "institution": "",
      "edu_year_start": "",
      "edu_year_end": "",
      "grade": null
    }
  ]
}

EXTRACTION RULES:

WORK EXPERIENCE:
- Extract ALL job entries only from experience/work history sections
- company → Company name
- client → Only if explicitly mentioned, else null
- role → Job title
- location → Only if clearly mentioned
- date_start → Start date exactly as written
- date_end → End date or "Present"

EDUCATION:
- Extract ALL entries only from education/academic sections
- degree → Degree name
- field → Specialization
- institution → College/University name
- edu_year_start → Start year if available
- edu_year_end → End year if available
- grade → Only if explicitly mentioned

EDGE HANDLING:
- "Present", "Current", "Till Date" → return "Present"
- Multiple roles → separate objects
- If no data found → return empty array []

Now process the resume text provided as input."""

WORK_EDUCATION_EXTRACTION_USER_PROMPT = """Extract ONLY work experience and education from this resume text:

{resume_text}

Return ONLY valid JSON with work_experience and education arrays. No other text."""


def get_work_education_prompt(resume_text: str) -> tuple[str, str]:
    """
    Get the system and user prompts for work experience and education extraction.
    
    Args:
        resume_text: The resume text to extract from
        
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    system_prompt = WORK_EDUCATION_EXTRACTION_SYSTEM_PROMPT
    user_prompt = WORK_EDUCATION_EXTRACTION_USER_PROMPT.format(resume_text=resume_text)
    
    return system_prompt, user_prompt
