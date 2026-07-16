"""
Resume Text Formatter

This module provides functionality to clean and structure raw resume text
extracted from PDFs or other sources before NER processing.

The formatter uses LLM to:
- Preserve original text order
- Separate sections clearly
- Maintain proper spacing
- Keep bullet points aligned
- Ensure no text is jumbled or mixed
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ResumeTextFormatter:
    """
    Formats raw resume text into clean, structured, human-readable format.
    
    This is a preprocessing step before NER extraction to ensure the text
    is properly structured for accurate entity extraction.
    """
    
    def __init__(self, llm_client=None):
        """
        Initialize the formatter.
        
        Args:
            llm_client: Optional LLM client for formatting. If None, uses rule-based formatting.
        """
        self.llm_client = llm_client
    
    def format_resume_text(self, raw_text: str) -> str:
        """
        Format raw resume text into clean, structured format.
        
        Args:
            raw_text: Raw extracted resume text (from PDF OCR, etc.)
            
        Returns:
            Clean, structured resume text
        """
        if not raw_text or not raw_text.strip():
            logger.warning("Empty resume text provided to formatter")
            return ""
        
        if self.llm_client:
            return self._format_with_llm(raw_text)
        else:
            return self._format_with_rules(raw_text)
    
    def _format_with_llm(self, raw_text: str) -> str:
        """
        Format resume text using LLM.
        
        Args:
            raw_text: Raw resume text
            
        Returns:
            Formatted resume text
        """
        system_prompt = self._get_formatting_system_prompt()
        user_prompt = self._get_formatting_user_prompt(raw_text)
        
        try:
            response = self.llm_client.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=4000
            )
            
            formatted_text = response.get("content", "").strip()
            
            if not formatted_text:
                logger.warning("LLM returned empty formatted text, falling back to original")
                return raw_text
            
            return formatted_text
            
        except Exception as e:
            logger.error(f"Error formatting resume with LLM: {e}", exc_info=True)
            return raw_text
    
    def _format_with_rules(self, raw_text: str) -> str:
        """
        Format resume text using rule-based approach.
        
        This is a fallback when LLM is not available.
        
        Args:
            raw_text: Raw resume text
            
        Returns:
            Formatted resume text
        """
        lines = raw_text.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Preserve section headings (all caps or title case with common keywords)
            if self._is_section_heading(line):
                if formatted_lines:
                    formatted_lines.append('')  # Add blank line before section
                formatted_lines.append(line)
                formatted_lines.append('')  # Add blank line after section
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
    
    def _is_section_heading(self, line: str) -> bool:
        """
        Check if a line is likely a section heading.
        
        Args:
            line: Text line to check
            
        Returns:
            True if line appears to be a section heading
        """
        section_keywords = [
            'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT',
            'EDUCATION', 'ACADEMIC BACKGROUND', 'QUALIFICATIONS',
            'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES',
            'PROJECTS', 'KEY PROJECTS',
            'CERTIFICATIONS', 'CERTIFICATES', 'LICENSES',
            'SUMMARY', 'PROFESSIONAL SUMMARY', 'PROFILE',
            'CONTACT', 'PERSONAL INFORMATION',
            'AWARDS', 'ACHIEVEMENTS', 'HONORS',
            'PUBLICATIONS', 'RESEARCH'
        ]
        
        line_upper = line.upper().strip()
        
        # Check if entire line is uppercase and matches keywords
        if line.isupper() and any(keyword in line_upper for keyword in section_keywords):
            return True
        
        # Check if line exactly matches a keyword
        if line_upper in section_keywords:
            return True
        
        return False
    
    def _get_formatting_system_prompt(self) -> str:
        """
        Get the system prompt for LLM-based formatting.
        
        Returns:
            System prompt string
        """
        return """You are a resume text formatter.

Your job is to process extracted resume text and return it in a clean, structured, and human-readable format.

IMPORTANT RULES:

1. Do NOT jumble or mix text.
2. Preserve the original order exactly as in the resume.
3. Keep headings clearly separated (like EXPERIENCE, EDUCATION, SKILLS, PROJECTS).
4. Maintain proper spacing between sections.
5. Keep bullet points under their correct sections.
6. Do NOT merge multiple sections into one.
7. Do NOT rewrite or summarize content.
8. Do NOT remove any important information.
9. If headings are missing, infer and group content logically into sections.
10. Ensure each section starts on a new line.

OUTPUT FORMAT:

* Clean structured resume text
* Proper section headings
* Bullet points properly aligned
* No broken sentences
* No mixed lines

GOAL:
Make the resume look like how a human reads it, not like raw extracted OCR text.

This structured output will be used for further processing to extract:

* Work Experience
* Education
* Skills
* Contact Information

So structure must be clear and accurate."""
    
    def _get_formatting_user_prompt(self, raw_text: str) -> str:
        """
        Get the user prompt for LLM-based formatting.
        
        Args:
            raw_text: Raw resume text to format
            
        Returns:
            User prompt string
        """
        return f"""Please format the following resume text into a clean, structured format.

Follow all the rules provided in the system prompt.

Raw Resume Text:
```
{raw_text}
```

Return ONLY the formatted resume text. Do not add any explanations or comments."""


def format_resume_text(raw_text: str, llm_client=None) -> str:
    """
    Convenience function to format resume text.
    
    Args:
        raw_text: Raw resume text to format
        llm_client: Optional LLM client for formatting
        
    Returns:
        Formatted resume text
    """
    formatter = ResumeTextFormatter(llm_client=llm_client)
    return formatter.format_resume_text(raw_text)
