"""
LLM-based experience extractor for resume parsing.
Uses various LLM providers (Gemini, DeepSeek, Claude, GPT) to extract structured work experience.
"""

import os
import json
import logging
import time
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


def extract_experience_with_llm(experience_text: str, llm_provider: str) -> List[Dict]:
    """
    Extract work experience using specified LLM provider.
    
    Args:
        experience_text: Text from the experience section
        llm_provider: LLM provider ID (gemini-2.0-flash-lite, deepseek-v3, claude-haiku-4-5, gpt-4o-mini)
        
    Returns:
        List of experience objects with company, role, dates, location, summary
    """
    
    logger.info(f"🤖 LLM EXTRACTION CALLED - Provider: {llm_provider}")
    logger.info(f"📝 Experience text length: {len(experience_text)} chars")
    logger.info(f"📝 Experience text preview: {experience_text[:200]}...")
    
    system_prompt = "You are an expert resume parser. Your only job is to extract work experience data from resume text and return it as valid JSON. You never add explanation, markdown, or any text outside the JSON array. You handle all resume formats. You never hallucinate data. If a field is missing, return null."
    
    user_prompt = f"""Extract all work experiences from the resume section below. Return ONLY a valid JSON array. No explanation. No markdown. No extra text. Each object must have: company (string or null), role (string or null), start_date (string or null), end_date (string or null), is_current (boolean), location (string or null), summary (2-3 sentence summary string or null). Rules: multiple roles at same company = separate objects. Missing dates = null. Year only like 2019-2022 is fine as-is. summary must be condensed version of bullet points not copy-paste. Never invent missing data. Resume experience section: {experience_text}"""
    
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
                return []
            
            # Check if call was successful
            if result is not None:
                # Save to training data
                _save_training_data(experience_text, result)
                logger.info(f"✅ LLM extraction successful - Extracted {len(result)} experiences")
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
                    return []
            
            # For other errors, log and return empty
            logger.error(f"LLM call failed (attempt {attempt + 1}/{max_retries}): {error}")
            if attempt < max_retries - 1:
                time.sleep(2)  # Brief pause before retry
            else:
                return []
                
        except Exception as e:
            logger.error(f"❌ LLM extraction failed (attempt {attempt + 1}/{max_retries}): {e}")
            import traceback
            logger.error(traceback.format_exc())
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                return []
    
    return []


def _call_gemini(system_prompt: str, user_prompt: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
    """Call Gemini API. Returns (result, error)."""
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            error_msg = "GEMINI_API_KEY not found in environment"
            logger.error(f"❌ {error_msg}")
            return None, error_msg
        
        logger.info(f"🔑 Gemini API key found: {api_key[:10]}...")
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-lite",
            generation_config={
                "response_mime_type": "application/json"
            }
        )
        
        logger.info("📡 Calling Gemini API...")
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        response = model.generate_content(full_prompt)
        
        # Validate response
        if not response or not hasattr(response, 'text') or not response.text:
            error_msg = "Empty or invalid response from Gemini"
            logger.error(error_msg)
            return None, error_msg
        
        logger.info(f"📥 Gemini response received: {response.text[:200]}...")
        result = json.loads(response.text)
        
        if not isinstance(result, list):
            logger.warning("Gemini returned non-list, wrapping in list")
            result = [result] if result else []
        
        return result, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse Gemini JSON response: {e}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"Gemini API error: {e}"
        logger.error(error_msg)
        return None, error_msg


def _call_deepseek(system_prompt: str, user_prompt: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
    """Call DeepSeek API. Returns (result, error)."""
    try:
        from openai import OpenAI
        
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            error_msg = "DEEPSEEK_API_KEY not set"
            logger.error(f"❌ {error_msg}")
            return None, error_msg
        
        logger.info(f"🔑 DeepSeek API key found: {api_key[:10]}...")
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        
        logger.info("📡 Calling DeepSeek API...")
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
        
        logger.info(f"📥 DeepSeek response received: {content[:200]}...")
        result = json.loads(content)
        
        # DeepSeek might wrap in an object with "experiences" key
        if isinstance(result, dict) and "experiences" in result:
            result = result["experiences"]
        elif isinstance(result, dict) and len(result) == 1:
            result = list(result.values())[0]
        
        if not isinstance(result, list):
            result = [result] if result else []
        
        return result, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse DeepSeek JSON response: {e}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"DeepSeek API error: {e}"
        logger.error(error_msg)
        return None, error_msg


def _call_claude(system_prompt: str, user_prompt: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
    """Call Claude API. Returns (result, error)."""
    try:
        from anthropic import Anthropic
        
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            error_msg = "ANTHROPIC_API_KEY not set"
            logger.error(f"❌ {error_msg}")
            return None, error_msg
        
        logger.info(f"🔑 Claude API key found: {api_key[:10]}...")
        client = Anthropic(api_key=api_key)
        
        logger.info("📡 Calling Claude API...")
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
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
        
        logger.info(f"📥 Claude response received: {content[:200]}...")
        result = json.loads(content)
        
        if not isinstance(result, list):
            result = [result] if result else []
        
        return result, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse Claude JSON response: {e}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"Claude API error: {e}"
        logger.error(error_msg)
        return None, error_msg


def _call_openai(system_prompt: str, user_prompt: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
    """Call OpenAI API. Returns (result, error)."""
    try:
        from openai import OpenAI
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            error_msg = "OPENAI_API_KEY not set"
            logger.error(f"❌ {error_msg}")
            return None, error_msg
        
        logger.info(f"🔑 OpenAI API key found: {api_key[:10]}...")
        client = OpenAI(api_key=api_key)
        
        logger.info("📡 Calling OpenAI API...")
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
        
        logger.info(f"📥 OpenAI response received: {content[:200]}...")
        result = json.loads(content)
        
        # OpenAI might wrap in an object with "experiences" key
        if isinstance(result, dict) and "experiences" in result:
            result = result["experiences"]
        elif isinstance(result, dict) and len(result) == 1:
            result = list(result.values())[0]
        
        if not isinstance(result, list):
            result = [result] if result else []
        
        return result, None
        
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse OpenAI JSON response: {e}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"OpenAI API error: {e}"
        logger.error(error_msg)
        return None, error_msg


def _save_training_data(input_text: str, output_data: List[Dict]) -> None:
    """Save input/output pair to training_data.jsonl for future fine-tuning."""
    try:
        from pathlib import Path
        
        # Get ai-service root directory
        current_file = Path(__file__)
        ai_service_root = current_file.parent.parent
        training_file = ai_service_root / "training_data.jsonl"
        
        training_entry = {
            "input": input_text,
            "output": output_data
        }
        
        # Append to file
        with open(training_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(training_entry) + "\n")
        
        logger.info(f"Saved training data to {training_file}")
        
    except Exception as e:
        logger.warning(f"Failed to save training data: {e}")
