"""
LLM-based full resume parser with strict cleaning and normalization.
Uses various LLM providers to extract complete structured resume data.
"""

import os
import json
import logging
import time
import re
from typing import Dict, Optional, Tuple, Any
from datetime import datetime

logger = logging.getLogger(__name__)


def parse_resume_with_llm(resume_text: str, llm_provider: str) -> Optional[Dict[str, Any]]:
    """
    Parse complete resume using specified LLM provider with strict cleaning rules.
    
    Args:
        resume_text: Full resume text
        llm_provider: LLM provider ID (gemini-2.0-flash-lite, deepseek-v3, etc.)
        
    Returns:
        Complete parsed resume data with cleaned and normalized fields
    """
    
    logger.info(f"🤖 FULL LLM PARSING - Provider: {llm_provider}")
    logger.info(f"📝 Resume text length: {len(resume_text)} chars")
    
    system_prompt = """You are an expert AI Resume Parser with advanced text understanding capabilities.

Your ONLY job is to extract structured data from resume text and return VALID JSON.

CRITICAL RULES:
1. Output ONLY JSON - no markdown, no explanation, no extra text
2. Follow the exact schema provided
3. NEVER put locations, dates, or "Present" in job_title field
4. ALWAYS extract the actual job role/position as job_title
5. ALWAYS extract the company/organization name as company_name
6. If company name appears in the text, extract it - NEVER leave it empty
7. Clean and normalize all data intelligently"""

    user_prompt = f"""WORK EXPERIENCE PARSING RULES (CRITICAL):

⚠️ COMMON PATTERNS TO FIX:

Pattern 1: "Company Name – Job Title"
Example: "JPMorgan Chase – Cloud Solutions Engineer"
→ job_title: "Cloud Solutions Engineer"
→ company_name: "JPMorgan Chase"

Pattern 2: "Job Title at Company Name"
Example: "Senior Data Engineer at DataWorks Inc."
→ job_title: "Senior Data Engineer"
→ company_name: "DataWorks Inc."

Pattern 3: "Company Name: dates (Location: City, State) Role: Job Title"
Example: "Morgan Stanley: 2022-09 - Current (Location: New York, NY) Role: Senior Data Engineer"
→ job_title: "Senior Data Engineer" (extract from "Role:")
→ company_name: "Morgan Stanley" (extract company before colon)
→ start_date: "2022-09-01"
→ end_date: null, is_current: true

Pattern 4: "Company Name Role: Job Title"
Example: "Humana Role: Data Analyst"
→ job_title: "Data Analyst" (extract from "Role:")
→ company_name: "Humana" (extract company before "Role:")

Pattern 5: Company name appears AFTER job description
Example: Text shows "Cloud Solutions Engineer" followed by company "JPMorgan Chase"
→ job_title: "Cloud Solutions Engineer"
→ company_name: "JPMorgan Chase"

Pattern 6: Location mixed with job title
Example: "Present Dallas, TX" or "Chicago, IL"
→ These are LOCATIONS, NOT job titles
→ Find the actual job title in the text (e.g., "Cloud Infrastructure Engineer")
→ Extract company name from surrounding text

⚠️ CRITICAL - NEVER DO THIS:
❌ job_title: "Morgan Stanley: - Current (Location: New York, NY)"
❌ job_title: "Duration: Present"
❌ job_title: "Duration:"
❌ job_title: "Present Dallas, TX" 
❌ job_title: "Chicago, IL"
❌ job_title: "2020-04-01"
❌ job_title: "2021-03 - Present"
❌ company_name: "Role: Senior Data Engineer"
❌ company_name: "" (empty)

✅ CRITICAL - ALWAYS DO THIS:
✓ job_title: "Senior Data Engineer" (ONLY the actual job role/position)
✓ company_name: "Morgan Stanley" (ONLY the company name)
✓ If you see "Duration:", that is NOT a job title - find the actual role in the text
✓ If you see a date or location, that is NOT a job title - find the actual role
✓ Look for keywords: "Role:", "Position:", "Title:", "Engineer", "Manager", "Analyst", "Developer"
✓ Extract company from text even if not in standard format

🔍 STEP-BY-STEP PARSING FOR WORK EXPERIENCE:
1. Find the company name (usually appears first, before dates/locations)
2. Find the actual job role (look for "Role:", or professional titles like "Engineer", "Manager", etc.)
3. IGNORE any text that says "Duration:", dates, locations, or "Present"
4. Extract the job description (the detailed text about responsibilities)
5. Parse dates separately - do NOT include them in job_title or company_name

---

DATE PARSING RULES:

* "Present" or "Current" → end_date: null, is_current: true
* Convert all dates to YYYY-MM-DD format
* If only year available → use YYYY-01-01
* If month/year → use YYYY-MM-01

---

CLEANING RULES:

* Remove invalid values: "Present", "Graduated:", "Top University Graduated:", city names from job titles
* Remove duplicate skills
* Normalize skills: "Amazon Redshift" → "Redshift", "AWS S3" → "S3"
* Clean descriptions into readable sentences
* Extract company name from description if not in header

---

JSON SCHEMA TO RETURN:

{{
  "name": "",
  "email": "",
  "phone": "",
  "linkedin": "",
  "github": "",
  "websites": [],
  "skills": [],
  "work_experience": [
    {{
      "job_title": "ACTUAL JOB ROLE - NOT LOCATION OR DATE",
      "company_name": "COMPANY/ORGANIZATION NAME - NEVER EMPTY",
      "description": "Clean, readable description",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "is_current": false
    }}
  ],
  "education": [
    {{
      "degree": "Degree name (not 'Graduated:')",
      "field_of_study": "Major/field",
      "institution": "University/school name",
      "start_year": 2020,
      "end_year": 2024,
      "gpa": 3.8,
      "is_highest_degree": false
    }}
  ],
  "summary": "Professional summary if available",
  "years_of_experience": 0
}}

---

IMPORTANT:
* Calculate years_of_experience from work history
* Maintain chronological order (latest first)
* Extract ALL work experiences, education, and skills
* Be intelligent about parsing - understand context

---

RESUME TEXT TO PARSE:

{resume_text}

---

RETURN ONLY JSON.
NO EXTRA TEXT."""

    # Retry with exponential backoff
    max_retries = 3
    for attempt in range(max_retries):
        try:
            if llm_provider in ["gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-2.0-flash-exp"]:
                result, error = _call_gemini(system_prompt, user_prompt)
            elif llm_provider == "deepseek-v3":
                result, error = _call_deepseek(system_prompt, user_prompt)
            elif llm_provider == "claude-haiku-4-5":
                result, error = _call_claude(system_prompt, user_prompt)
            elif llm_provider == "gpt-4o-mini":
                result, error = _call_openai(system_prompt, user_prompt)
            else:
                logger.error(f"Unknown LLM provider: {llm_provider}")
                return None
            
            # Check if call was successful
            if result is not None:
                # Post-process and validate
                result = _post_process_result(result)
                logger.info(f"✅ Full LLM parsing successful")
                logger.info(f"   - Name: {result.get('name', 'N/A')}")
                logger.info(f"   - Email: {result.get('email', 'N/A')}")
                logger.info(f"   - Skills: {len(result.get('skills', []))}")
                logger.info(f"   - Work Experience: {len(result.get('work_experience', []))}")
                logger.info(f"   - Education: {len(result.get('education', []))}")
                return result
            
            # Handle rate limit errors with exponential backoff
            if error and "429" in str(error):
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 5  # 5s, 10s, 20s
                    logger.warning(f"Rate limit hit, waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Rate limit exceeded after {max_retries} attempts: {error}")
                    return None
            
            # For other errors, log and return None
            logger.error(f"LLM call failed (attempt {attempt + 1}/{max_retries}): {error}")
            if attempt < max_retries - 1:
                time.sleep(2)  # Brief pause before retry
            else:
                return None
                
        except Exception as e:
            logger.error(f"❌ Full LLM parsing failed (attempt {attempt + 1}/{max_retries}): {e}")
            import traceback
            logger.error(traceback.format_exc())
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                return None
    
    return None


def _post_process_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Post-process LLM result to ensure data quality and consistency.
    """
    # Remove duplicates from skills
    if 'skills' in result and isinstance(result['skills'], list):
        result['skills'] = list(dict.fromkeys(result['skills']))  # Preserve order, remove duplicates
    
    # Validate and clean work experience
    if 'work_experience' in result and isinstance(result['work_experience'], list):
        cleaned_experience = []
        for exp in result['work_experience']:
            # Skip invalid entries
            if not exp.get('job_title') and not exp.get('company_name'):
                continue
            
            # Remove invalid values
            if exp.get('job_title') in ['Present', 'Graduated:', None, '']:
                exp['job_title'] = None
            if exp.get('company_name') in ['Present', 'Graduated:', None, '']:
                exp['company_name'] = None
            
            # Ensure is_current is boolean
            if 'is_current' in exp:
                exp['is_current'] = bool(exp['is_current'])
            
            cleaned_experience.append(exp)
        
        result['work_experience'] = cleaned_experience
    
    # Validate and clean education
    if 'education' in result and isinstance(result['education'], list):
        cleaned_education = []
        for edu in result['education']:
            # Skip invalid entries
            if not edu.get('degree') and not edu.get('institution'):
                continue
            
            # Remove invalid values from degree
            if edu.get('degree') in ['Graduated:', 'Top University Graduated:', None, '']:
                edu['degree'] = None
            
            # Ensure is_highest_degree is boolean
            if 'is_highest_degree' in edu:
                edu['is_highest_degree'] = bool(edu['is_highest_degree'])
            
            cleaned_education.append(edu)
        
        result['education'] = cleaned_education
    
    # Calculate years of experience if not provided or invalid
    if not result.get('years_of_experience') or result.get('years_of_experience') == 0:
        result['years_of_experience'] = _calculate_years_of_experience(result.get('work_experience', []))
    
    return result


def _calculate_years_of_experience(work_experience: list) -> float:
    """
    Calculate total years of experience from work history.
    Finds the earliest start_date and calculates years from that to today.
    """
    if not work_experience:
        return 0.0
    
    from datetime import datetime, date
    
    earliest_start = None
    today = date.today()
    
    for exp in work_experience:
        start_date = exp.get('start_date')
        end_date = exp.get('end_date')
        is_current = exp.get('is_current', False)
        
        if not start_date:
            continue
        
        # Parse start_date
        try:
            if isinstance(start_date, str):
                # Try YYYY-MM-DD format
                if '-' in start_date:
                    parts = start_date.split('-')
                    if len(parts) >= 1:
                        year = int(parts[0])
                        month = int(parts[1]) if len(parts) >= 2 else 1
                        day = int(parts[2]) if len(parts) >= 3 else 1
                        start = date(year, month, day)
                else:
                    # Try just year
                    year = int(start_date)
                    start = date(year, 1, 1)
            else:
                continue
            
            # Track earliest start date
            if earliest_start is None or start < earliest_start:
                earliest_start = start
                
        except (ValueError, TypeError):
            continue
    
    if earliest_start is None:
        return 0.0
    
    # Calculate years from earliest start to today
    days_diff = (today - earliest_start).days
    years = round(days_diff / 365.25, 1)
    
    return max(0.0, years)


def _call_gemini(system_prompt: str, user_prompt: str) -> Tuple[Optional[Dict], Optional[str]]:
    """Call Gemini API for full resume parsing. Returns (result, error)."""
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            error_msg = "GEMINI_API_KEY not found in environment"
            logger.error(f"❌ {error_msg}")
            return None, error_msg
        
        logger.info(f"🔑 Gemini API key found")
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-lite",
            generation_config={
                "response_mime_type": "application/json"
            }
        )
        
        logger.info("📡 Calling Gemini API for full resume parsing...")
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        response = model.generate_content(full_prompt)
        
        # Validate response
        if not response or not hasattr(response, 'text') or not response.text:
            error_msg = "Empty or invalid response from Gemini"
            logger.error(error_msg)
            return None, error_msg
        
        logger.info(f"📥 Gemini response received ({len(response.text)} chars)")
        result = json.loads(response.text)
        
        return result, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse Gemini JSON response: {e}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"Gemini API error: {e}"
        logger.error(error_msg)
        return None, error_msg


def _call_deepseek(system_prompt: str, user_prompt: str) -> Tuple[Optional[Dict], Optional[str]]:
    """Call DeepSeek API for full resume parsing. Returns (result, error)."""
    try:
        from openai import OpenAI
        
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            error_msg = "DEEPSEEK_API_KEY not set"
            logger.error(f"❌ {error_msg}")
            return None, error_msg
        
        logger.info(f"🔑 DeepSeek API key found")
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        
        logger.info("📡 Calling DeepSeek API for full resume parsing...")
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            error_msg = "Empty response from DeepSeek"
            logger.error(error_msg)
            return None, error_msg
        
        logger.info(f"📥 DeepSeek response received ({len(content)} chars)")
        result = json.loads(content)
        
        return result, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse DeepSeek JSON response: {e}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"DeepSeek API error: {e}"
        logger.error(error_msg)
        return None, error_msg


def _call_claude(system_prompt: str, user_prompt: str) -> Tuple[Optional[Dict], Optional[str]]:
    """Call Claude API for full resume parsing. Returns (result, error)."""
    try:
        from anthropic import Anthropic
        
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            error_msg = "ANTHROPIC_API_KEY not set"
            logger.error(f"❌ {error_msg}")
            return None, error_msg
        
        logger.info(f"🔑 Claude API key found")
        client = Anthropic(api_key=api_key)
        
        logger.info("📡 Calling Claude API for full resume parsing...")
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        
        content = response.content[0].text
        if not content:
            error_msg = "Empty response from Claude"
            logger.error(error_msg)
            return None, error_msg
        
        # Claude might wrap in markdown code blocks
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
        
        logger.info(f"📥 Claude response received ({len(content)} chars)")
        result = json.loads(content)
        
        return result, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse Claude JSON response: {e}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"Claude API error: {e}"
        logger.error(error_msg)
        return None, error_msg


def _call_openai(system_prompt: str, user_prompt: str) -> Tuple[Optional[Dict], Optional[str]]:
    """Call OpenAI API for full resume parsing. Returns (result, error)."""
    try:
        from openai import OpenAI
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            error_msg = "OPENAI_API_KEY not set"
            logger.error(f"❌ {error_msg}")
            return None, error_msg
        
        logger.info(f"🔑 OpenAI API key found")
        client = OpenAI(api_key=api_key)
        
        logger.info("📡 Calling OpenAI API for full resume parsing...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            error_msg = "Empty response from OpenAI"
            logger.error(error_msg)
            return None, error_msg
        
        logger.info(f"📥 OpenAI response received ({len(content)} chars)")
        result = json.loads(content)
        
        return result, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse OpenAI JSON response: {e}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"OpenAI API error: {e}"
        logger.error(error_msg)
        return None, error_msg
