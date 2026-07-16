"""
Section-Based Resume Formatter

This module provides advanced section-wise formatting of resume text.
It identifies, separates, and structures resume sections intelligently.

Key Features:
- Identifies all major resume sections
- Groups content under correct sections
- Maintains chronological order within sections
- Handles multi-page resumes
- Preserves all information
"""

import re
import logging
from typing import Dict, List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ResumeSection:
    """Represents a resume section with its content."""
    name: str
    content: List[str]
    start_line: int
    end_line: int


class SectionBasedFormatter:
    """
    Advanced formatter that structures resume text section-wise.
    
    This formatter:
    1. Identifies all sections in the resume
    2. Groups content under appropriate sections
    3. Formats each section properly
    4. Maintains original order and information
    """
    
    # Common section headings and their variations
    SECTION_PATTERNS = {
        'CONTACT': [
            r'^CONTACT\s*(INFORMATION)?$',
            r'^PERSONAL\s*INFORMATION$',
            r'^PERSONAL\s*DETAILS$',
        ],
        'SUMMARY': [
            r'^(PROFESSIONAL\s*)?SUMMARY$',
            r'^PROFILE$',
            r'^OBJECTIVE$',
            r'^CAREER\s*OBJECTIVE$',
            r'^PROFESSIONAL\s*PROFILE$',
        ],
        'EXPERIENCE': [
            r'^(WORK\s*)?EXPERIENCE$',
            r'^PROFESSIONAL\s*EXPERIENCE$',
            r'^EMPLOYMENT(\s*HISTORY)?$',
            r'^WORK\s*HISTORY$',
            r'^CAREER\s*HISTORY$',
        ],
        'EDUCATION': [
            r'^EDUCATION$',
            r'^ACADEMIC\s*(BACKGROUND|QUALIFICATIONS)?$',
            r'^EDUCATIONAL\s*BACKGROUND$',
        ],
        'SKILLS': [
            r'^(TECHNICAL\s*)?SKILLS$',
            r'^CORE\s*COMPETENCIES$',
            r'^TECHNICAL\s*COMPETENCIES$',
            r'^EXPERTISE$',
            r'^AREAS\s*OF\s*EXPERTISE$',
        ],
        'PROJECTS': [
            r'^PROJECTS?$',
            r'^KEY\s*PROJECTS$',
            r'^NOTABLE\s*PROJECTS$',
        ],
        'CERTIFICATIONS': [
            r'^CERTIFICATIONS?$',
            r'^CERTIFICATES?$',
            r'^LICENSES?$',
            r'^PROFESSIONAL\s*CERTIFICATIONS$',
        ],
        'ACHIEVEMENTS': [
            r'^ACHIEVEMENTS?$',
            r'^AWARDS?$',
            r'^HONORS?$',
            r'^RECOGNITION$',
        ],
        'PUBLICATIONS': [
            r'^PUBLICATIONS?$',
            r'^RESEARCH$',
            r'^PAPERS?$',
        ],
        'LANGUAGES': [
            r'^LANGUAGES?$',
        ],
        'INTERESTS': [
            r'^INTERESTS?$',
            r'^HOBBIES$',
        ],
    }
    
    def __init__(self):
        """Initialize the section-based formatter."""
        self.sections: List[ResumeSection] = []
    
    def format_resume(self, raw_text: str) -> str:
        """
        Format resume text in a section-wise manner.
        
        Args:
            raw_text: Raw resume text
            
        Returns:
            Section-wise formatted resume text
        """
        if not raw_text or not raw_text.strip():
            return ""
        
        # Step 1: Identify sections
        self.sections = self._identify_sections(raw_text)
        
        # Step 2: Format each section
        formatted_sections = []
        for section in self.sections:
            formatted_section = self._format_section(section)
            formatted_sections.append(formatted_section)
        
        # Step 3: Combine sections with proper spacing
        return '\n\n'.join(formatted_sections)
    
    def _identify_sections(self, text: str) -> List[ResumeSection]:
        """
        Identify all sections in the resume using line-based detection.
        This prevents cutting text mid-sentence.
        
        Args:
            text: Resume text
            
        Returns:
            List of identified sections
        """
        # Use ONLY line-by-line detection to preserve complete content
        return self._identify_sections_by_lines(text)
    
    def _is_likely_section_header(self, line: str) -> bool:
        """
        Check if a line is likely a section header based on formatting.
        Section headers are typically:
        - All caps or Title Case
        - Short (< 50 chars)
        - Not containing detailed info like dates, emails, etc.
        
        Args:
            line: Line to check
            
        Returns:
            True if likely a section header
        """
        if not line or len(line) > 50:
            return False
        
        # Skip lines with dates, emails, phone numbers, URLs
        if re.search(r'\d{4}|@|http|\+\d+|\d{2}/\d{2}', line):
            return False
        
        # Check if mostly uppercase or title case
        words = line.split()
        if not words:
            return False
        
        # All caps or mostly caps
        caps_words = sum(1 for w in words if w.isupper() or w[0].isupper())
        return caps_words >= len(words) * 0.7
    
    def _identify_sections_by_lines(self, text: str) -> List[ResumeSection]:
        """
        Identify sections line by line - PRESERVES COMPLETE CONTENT.
        This method ensures no text is cut mid-sentence.
        
        Args:
            text: Resume text
            
        Returns:
            List of sections with complete content
        """
        lines = text.split('\n')
        sections = []
        current_section = None
        current_content = []
        current_start = 0
        
        # First pass: detect name/contact at the top
        name_lines = []
        contact_lines = []
        content_start = 0
        
        for i, line in enumerate(lines[:10]):  # Check first 10 lines for name/contact
            line_stripped = line.strip()
            if not line_stripped:
                continue
            
            # Check for email, phone, location (contact info)
            if re.search(r'@|\+\d+|\d{10}|linkedin|github|Location:', line_stripped, re.IGNORECASE):
                contact_lines.append(line_stripped)
                content_start = i + 1
            # First non-contact line is likely the name
            elif not name_lines and not re.search(r'SUMMARY|EXPERIENCE|EDUCATION|SKILLS|PROFILE', line_stripped, re.IGNORECASE):
                name_lines.append(line_stripped)
                content_start = i + 1
            else:
                break
        
        # Add NAME section if found
        if name_lines:
            sections.append(ResumeSection(
                name='NAME',
                content=name_lines,
                start_line=0,
                end_line=0
            ))
        
        # Add CONTACT section if found
        if contact_lines:
            sections.append(ResumeSection(
                name='CONTACT',
                content=contact_lines,
                start_line=0,
                end_line=0
            ))
        
        # Process remaining lines for sections
        for i in range(content_start, len(lines)):
            line_stripped = lines[i].strip()
            
            # Skip empty lines
            if not line_stripped:
                continue
            
            # Check if this line is a section heading
            section_name = self._detect_section_heading(line_stripped)
            
            if section_name:
                # Save previous section if exists
                if current_section and current_content:
                    sections.append(ResumeSection(
                        name=current_section,
                        content=current_content,
                        start_line=current_start,
                        end_line=i - 1
                    ))
                
                # Start new section
                current_section = section_name
                current_content = []
                current_start = i
            else:
                # Add line to current section (COMPLETE LINE, not cut)
                if current_section:
                    current_content.append(line_stripped)
                elif not sections:  # No section yet, add to CONTENT
                    if not current_section:
                        current_section = 'CONTENT'
                        current_content = []
                    current_content.append(line_stripped)
        
        # Add last section
        if current_section and current_content:
            sections.append(ResumeSection(
                name=current_section,
                content=current_content,
                start_line=current_start,
                end_line=len(lines) - 1
            ))
        
        # If no sections detected, treat entire text as CONTENT
        if not sections:
            sections.append(ResumeSection(
                name='CONTENT',
                content=[line.strip() for line in lines if line.strip()],
                start_line=0,
                end_line=len(lines) - 1
            ))
        
        return sections
    
    def _detect_section_heading(self, line: str) -> str:
        """
        Detect if a line is a section heading.
        
        Args:
            line: Text line to check
            
        Returns:
            Section name if detected, None otherwise
        """
        line_upper = line.upper().strip()
        
        for section_name, patterns in self.SECTION_PATTERNS.items():
            for pattern in patterns:
                if re.match(pattern, line_upper):
                    return section_name
        
        return None
    
    def _format_section(self, section: ResumeSection) -> str:
        """
        Format a single section.
        
        Args:
            section: ResumeSection to format
            
        Returns:
            Formatted section text
        """
        if not section.content:
            return f"{section.name}\n(No content)"
        
        # Format section heading
        formatted = [f"{section.name}"]
        formatted.append("-" * len(section.name))
        formatted.append("")
        
        # Format section content
        for line in section.content:
            formatted.append(line)
        
        return '\n'.join(formatted)
    
    def get_section_summary(self) -> Dict[str, int]:
        """
        Get summary of detected sections.
        
        Returns:
            Dictionary mapping section names to line counts
        """
        return {
            section.name: len(section.content)
            for section in self.sections
        }


def format_resume_sectionwise(raw_text: str) -> str:
    """
    Convenience function to format resume text section-wise.
    
    Args:
        raw_text: Raw resume text
        
    Returns:
        Section-wise formatted resume text
    """
    formatter = SectionBasedFormatter()
    return formatter.format_resume(raw_text)


def get_resume_sections(raw_text: str) -> Dict[str, str]:
    """
    Extract resume sections as a dictionary.
    
    Args:
        raw_text: Raw resume text
        
    Returns:
        Dictionary mapping section names to their content
    """
    formatter = SectionBasedFormatter()
    formatter.format_resume(raw_text)  # This populates sections
    
    return {
        section.name: '\n'.join(section.content)
        for section in formatter.sections
    }
