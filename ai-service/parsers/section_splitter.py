"""
Resume section detector and splitter for parsing resume structure.
Identifies and splits resume into logical sections like experience, education, skills, etc.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)


import re



SECTION_PATTERNS = {
    'experience': re.compile(
        r'(?i)^\s*('

        # Standard English
        r'work experience|professional experience|employment history|'
        r'employment|career history|experience|work history|'
        r'relevant experience|related experience|applicable experience|'
        r'professional background|job history|positions? held|'

        # Roles / responsibilities phrasing
        r'roles? & responsibilities|roles? and responsibilities|'
        r'key responsibilities|responsibilities|duties|'

        # Career / summary hybrids
        r'career summary|career profile|career overview|'
        r'professional overview|work overview|'

        # Internships (students / fresh grads)
        r'internship experience|internships?|'
        r'industrial training|industrial attachment|'

        # Project-based (engineers, freelancers)
        r'project experience|projects? & experience|'
        r'relevant projects?|selected projects?|notable projects?|'
        r'consulting experience|freelance experience|'
        r'contract experience|client experience|'

        # Academic / research roles
        r'research experience|teaching experience|'
        r'academic experience|clinical experience|'

        # Military / government
        r'military experience|service history|'
        r'government experience|public sector experience|'

        # Spaced variants (some parsers add extra whitespace)
        r'work\s+experience|professional\s+experience|'
        r'career\s+history|employment\s+history'
        r')',
        re.MULTILINE
    ),

    'education': re.compile(
        r'(?i)^\s*('

        # Standard
        r'education|academic background|academic history|'
        r'educational background|educational qualifications|'
        r'academic qualifications|qualifications|'
        r'educational credentials|academic credentials|'

        # Degree-focused
        r'degrees?|academic degrees?|university degrees?|'

        # Training / courses
        r'training|courses?|coursework|continuing education|'
        r'professional development|professional training|'

        # Certifications combined with education
        r'certifications? & education|education & certifications?|'
        r'education and training|training and education|'
        r'education and certifications?|certifications? and education|'

        # Schooling (less formal / international)
        r'schooling|academic record|school background|'
        r'university|universities|college|'

        # Spaced variants
        r'academic\s+background|educational\s+qualifications|'
        r'academic\s+qualifications'
        r')',
        re.MULTILINE
    ),

    'skills': re.compile(
        r'(?i)^\s*('

        # Generic
        r'skills?|key skills?|core skills?|'
        r'relevant skills?|transferable skills?|'

        # Technical focus
        r'technical skills?|technical expertise|technical proficiencies|'
        r'technical stack|technology skills?|'
        r'engineering skills?|it skills?|'

        # Competency language (HR / management)
        r'core competencies|competencies|key competencies|'
        r'areas of expertise|areas of competency|'

        # Tools / technologies
        r'tools? & technologies|tools? and technologies|'
        r'technologies|technology stack|tech stack|stack|'
        r'tools?|platforms?|software|'

        # Languages (developer resumes)
        r'programming languages?|languages & frameworks|'
        r'languages and frameworks|languages & tools|'
        r'languages and tools|languages|frameworks|'

        # Domain-specific expertise
        r'domain expertise|industry expertise|'
        r'functional skills?|soft skills?|'
        r'interpersonal skills?|communication skills?|'

        # Proficiency tables
        r'proficiencies|proficiency|expertise|capabilities|'

        # Skill category headers (Backend Development, Frontend Development, etc.)
        r'backend development|frontend development|front.?end development|'
        r'full.?stack development|cloud & devops|cloud and devops|devops|'
        r'tools? & practices|tools? and practices|development tools?|'

        # Spaced variants
        r'technical\s+skills?|core\s+competencies|key\s+skills?'
        r')',
        re.MULTILINE
    ),

    'summary': re.compile(
        r'(?i)^\s*('

        # Standard
        r'summary|professional summary|career summary|'
        r'executive summary|brief summary|'

        # Profile language
        r'profile|professional profile|career profile|'
        r'personal profile|personal statement|'

        # About / intro language
        r'about me|about|introduction|bio|biography|'

        # Objective (older US style)
        r'objective|career objective|professional objective|'
        r'job objective|work objective|'

        # Overview
        r'overview|career overview|professional overview|'
        r'background|background summary|'

        # Highlights / snapshot
        r'highlights?|career highlights?|professional highlights?|'
        r'snapshot|at a glance|'

        # Value proposition (modern LinkedIn style)
        r'value proposition|mission statement'
        r')(?:\s*\([^)]*\))?',  # Allow optional parenthetical suffix like (JD-Matched)
        re.MULTILINE
    ),

    'certifications': re.compile(
        r'(?i)^\s*('

        # Certifications / licenses
        r'certifications?|professional certifications?|'
        r'certificates?|professional certificates?|'
        r'licenses?|licences?|professional licenses?|'
        r'accreditations?|credentials?|qualifications?|'

        # Courses / training completions
        r'courses?|online courses?|completed courses?|'
        r'workshops?|bootcamps?|boot camps?|'
        r'training certifications?|professional training|'

        # Awards / recognition
        r'awards?|honors?|honours?|'
        r'accomplishments?|recognition|'
        r'achievements?|notable achievements?|key achievements?|'

        # Publications / research output
        r'publications?|papers?|research papers?|'
        r'patents?|inventions?|'

        # Volunteer / extra-curricular
        r'volunteer experience|volunteering|community service|'
        r'extra.?curricular|activities|leadership activities|'

        # Professional memberships
        r'memberships?|affiliations?|professional affiliations?|'
        r'professional memberships?'
        r')',
        re.MULTILINE
    ),

    'projects': re.compile(
        r'(?i)^\s*('

        # Standard projects
        r'projects?|key projects?|notable projects?|'
        r'selected projects?|major projects?|'
        r'personal projects?|side projects?|'

        # Project experience
        r'project experience|project work|'
        r'project highlights?|project portfolio|'
        r'portfolio|work portfolio|'

        # Academic / research projects
        r'academic projects?|research projects?|'
        r'capstone projects?|thesis projects?|'

        # Open source / community
        r'open source|open source projects?|'
        r'open source contributions?|github projects?|'

        # Client / consulting work
        r'client projects?|consulting projects?|'
        r'freelance projects?|contract projects?'
        r')',
        re.MULTILINE
    ),

    # NEW — catches contact/header blocks some parsers miss
    'contact': re.compile(
        r'(?i)^\s*('
        r'contact|contact information|contact details|'
        r'personal information|personal details|'
        r'personal data|contact me|get in touch|'
        r'details|information'
        r')',
        re.MULTILINE
    ),

    # NEW — languages section (common in EU / international resumes)
    'languages': re.compile(
        r'(?i)^\s*('
        r'languages?|language skills?|'
        r'spoken languages?|language proficiency|'
        r'foreign languages?|linguistic skills?'
        r')',
        re.MULTILINE
    ),

    # NEW — references section
    'references': re.compile(
        r'(?i)^\s*('
        r'references?|referees?|'
        r'professional references?|'
        r'references available|references available on request'
        r')',
        re.MULTILINE
    ),
}


def split_sections(text: str) -> dict:
    sections = {
        'header': '',
        'summary': '',
        'experience': '',
        'education': '',
        'skills': '',
        'certifications': '',
        'other': '',
    }

    found = []
    for section_name, pattern in SECTION_PATTERNS.items():
        for match in pattern.finditer(text):
            found.append((match.start(), match.end(), section_name))

    found.sort(key=lambda x: x[0])

    if not found:
        sections['experience'] = text
        return sections

    sections['header'] = text[:found[0][0]].strip()

    for i, (start, end, name) in enumerate(found):
        next_start = found[i + 1][0] if i + 1 < len(found) else len(text)
        sections[name] = text[end:next_start].strip()

    return sections


class SectionSplitter:
    """
    Advanced resume / CV section detector and splitter.
    Supports worldwide naming conventions:
    English (US, UK, AU, CA, NZ, ZA, IN, SG, PH, NG, GH, KE, MY, BD, PK, LK, NP),
    European-English, Middle-East-English, East-Asian-English,
    Latin-American-English, and every major industry vertical.
    ~2000+ keyword variants across 25 section types.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Pre-compile patterns for better performance
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for section detection."""
        
        # Pattern for section headers (ALL CAPS or with special formatting)
        self.section_header_pattern = re.compile(
            r'^\s*([A-Z][A-Z\s]{2,}|[A-Za-z][A-Za-z\s&/-]{3,})\s*[:\-=_]*\s*$',
            re.MULTILINE
        )
        
        # Pattern for dates in experience sections
        self.date_pattern = re.compile(
            r'\b(?:\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4}|\d{4})\b',
            re.IGNORECASE
        )
        
        # Pattern for company indicators
        self.company_pattern = re.compile(
            r'(?:at|@)\s+([A-Za-z0-9\s&.,\-]+)|^([A-Za-z0-9\s&.,\-]{3,})\s*[\|\-•]',
            re.MULTILINE
        )
        
        # Pattern for bullet points and descriptions
        self.bullet_pattern = re.compile(
            r'^[\s]*[•\-\*\+]\s*(.+)$',
            re.MULTILINE
        )
    
    def _clean_pdf_artifacts(self, text: str) -> str:
        """Remove common PDF extraction artifacts that break section detection."""
        # Remove cid: font encoding artifacts
        text = re.sub(r'\(cid:\d+\)', '', text)
        
        # Normalize bullet points to standard format
        text = re.sub(r'[●○■□▪▫•‣⁃◦⦾⦿]', '•', text)
        
        # Normalize runs of 3+ spaces to newlines (multi-column PDF artifacts)
        text = re.sub(r' {3,}', '\n', text)
        
        # Remove zero-width and other invisible characters
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        
        # Normalize multiple consecutive newlines to max 2
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Remove trailing/leading whitespace from each line while preserving structure
        lines = text.split('\n')
        lines = [line.rstrip() for line in lines]
        text = '\n'.join(lines)
        
        return text

    def _preprocess_inline_headers(self, text: str) -> str:
        """
        Preprocess text to split inline section headers that are merged with content.
        Handles cases like "SUMMARY: content... SKILLS: content..." by properly separating them.
        
        Args:
            text: Raw resume text with potential inline headers
            
        Returns:
            Text with properly separated section headers
        """
        if not text:
            return text
        
        # Common section headers to look for - comprehensive list
        section_headers = [
            'PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE',
            'TECHNICAL SKILLS', 'SKILLS', 'EXPERTISE', 'COMPETENCIES',
            'PROFESSIONAL EXPERIENCE', 'EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT',
            'EDUCATION', 'ACADEMIC', 'QUALIFICATIONS',
            'CERTIFICATIONS', 'CERTIFICATION', 'CREDENTIALS',
            'PROJECTS', 'KEY PROJECTS',
            'CONTACT', 'CONTACT INFORMATION'
        ]
        
        # Create regex pattern for inline headers
        escaped_headers = [re.escape(header) for header in section_headers]
        inline_pattern = re.compile(
            r'(' + '|'.join(escaped_headers) + r')\s*:\s*',
            re.IGNORECASE
        )
        
        # Process each line to split inline headers
        lines = text.split('\n')
        processed_lines = []
        
        for line in lines:
            # Find all inline headers in this line
            headers_found = list(inline_pattern.finditer(line))
            
            if len(headers_found) > 1:
                # Multiple headers in one line - split them properly
                last_end = 0
                
                for match in headers_found:
                    # Add content before the header
                    if match.start() > last_end:
                        before_content = line[last_end:match.start()].strip()
                        if before_content:
                            processed_lines.append(before_content)
                    
                    # Add the header as a separate line
                    header = match.group(1)
                    processed_lines.append(f"{header}:")
                    
                    last_end = match.end()
                
                # Add remaining content after last header
                if last_end < len(line):
                    remaining_content = line[last_end:].strip()
                    if remaining_content:
                        processed_lines.append(remaining_content)
            
            elif len(headers_found) == 1:
                # Single header in line
                match = headers_found[0]
                if match.start() == 0:
                    # Header at start - make it standalone
                    header = match.group(1)
                    processed_lines.append(f"{header}:")
                    
                    # Add remaining content
                    remaining_content = line[match.end():].strip()
                    if remaining_content:
                        processed_lines.append(remaining_content)
                else:
                    # Header in middle - split at the header
                    before_content = line[:match.start()].strip()
                    header = match.group(1)
                    remaining_content = line[match.end():].strip()
                    
                    if before_content:
                        processed_lines.append(before_content)
                    processed_lines.append(f"{header}:")
                    if remaining_content:
                        processed_lines.append(remaining_content)
            else:
                # No headers - regular line
                processed_lines.append(line)
        
        # Join back and clean up multiple newlines
        result = '\n'.join(processed_lines)
        result = re.sub(r'\n{3,}', '\n\n', result)
        
        return result.strip()

    def split_sections(self, text: str, font_metadata: Dict[str, Dict] = None, baseline_font_size: float = 11.0) -> Dict[str, str]:
        """
        Detect section headers and split text into named sections.
        
        Args:
            text: Resume text to split into sections
            font_metadata: Optional font metadata dictionary for font-based scoring
            baseline_font_size: Baseline font size for the document (default 11.0)
            
        Returns:
            Dictionary with section names as keys and section text as values
        """
        try:
            text = self._clean_pdf_artifacts(text)
            
            # Enhanced preprocessing for malformed raw text with inline headers
            text = self._preprocess_inline_headers(text)
            
            # Normalize section headers that are on the same line as content
            # e.g. "...some text. Skills" becomes "...some text.\nSkills"
            # Handle both single and multiple spaces
            text = re.sub(r'(?<=[a-z.!?])\s+([A-Z][a-zA-Z\s]{3,20})\s*\n', r'\n\1\n', text)
            
            # Pre-process: Split Title Case headers (e.g., "Work Experience", "Technical Skills")
            # that appear after sentence endings
            text = re.sub(r'([a-z.!?])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*\n', r'\1\n\2\n', text)
            
            # Pre-process: Split ALL CAPS headers that are merged with content
            # e.g. "some text. PROFESSIONAL EXPERIENCE" -> "some text.\nPROFESSIONAL EXPERIENCE"
            # Match: lowercase/punctuation + space + 2+ ALL CAPS words
            text = re.sub(r'([a-z.!?])\s+([A-Z]{2,}(?:\s+[A-Z]{2,})+)\s*$', r'\1\n\2', text, flags=re.MULTILINE)
            text = re.sub(r'([a-z.!?])\s+([A-Z]{2,}(?:\s+[A-Z]{2,})+)(?=\s)', r'\1\n\2', text)
            
            sections = {}
            current_section = 'contact'
            current_content = []
            
            lines = text.split('\n')
            
            for i, line in enumerate(lines):
                stripped_line = line.strip()
                
                # Get prev and next lines for heuristic scoring context
                prev_line = lines[i - 1] if i > 0 else ''
                next_line = lines[i + 1] if i < len(lines) - 1 else ''
                
                # Check if this line is a section header (with optional font metadata)
                section_name = self.detect_section_header(stripped_line, prev_line, next_line, 
                                                         font_metadata, baseline_font_size)
                
                if section_name:
                    # Save previous section content
                    if current_content:
                        content_text = '\n'.join(current_content).strip()
                        # If section already exists, append with separator
                        if current_section in sections:
                            sections[current_section] += '\n\n' + content_text
                        else:
                            sections[current_section] = content_text
                    
                    # Start new section
                    current_section = section_name
                    current_content = []
                    self.logger.debug(f"Found section header: {section_name}")
                    
                else:
                    # Add line to current section content
                    if stripped_line or current_content:  # Preserve empty lines within sections
                        current_content.append(line)
            
            # Save the last section
            if current_content:
                content_text = '\n'.join(current_content).strip()
                if current_section in sections:
                    sections[current_section] += '\n\n' + content_text
                else:
                    sections[current_section] = content_text
            
            # If we only have the default contact section, rename it to 'other' to ensure compatibility
            if len(sections) == 1 and 'contact' in sections:
                sections['other'] = sections.pop('contact')
            
            # Log section detection results
            self.logger.info(f"Split resume into {len(sections)} sections: {list(sections.keys())}")
            
            # Post-process: Fix scrambled sections from multi-column PDFs
            sections = self._fix_scrambled_sections(text, sections)
            
            return sections
            
        except Exception as e:
            self.logger.error(f"Error splitting sections: {e}")
            return {'other': text}
    
    def _fix_scrambled_sections(self, original_text: str, sections: Dict[str, str]) -> Dict[str, str]:
        """
        Fix scrambled sections caused by multi-column PDF layouts.
        Detects when section headers appear in wrong order and reassigns content.
        
        Args:
            original_text: The original extracted text
            sections: Dictionary of detected sections
            
        Returns:
            Fixed sections dictionary
        """
        try:
            # Find positions of key section headers in original text
            header_positions = {}
            
            # Check for common section headers (order matters - check most specific first)
            header_patterns = {
                'summary': ['PROFESSIONAL SUMMARY', 'Professional Summary', 'SUMMARY', 'Summary'],
                'experience': ['PROFESSIONAL EXPERIENCE', 'Professional Experience', 'WORK EXPERIENCE', 'Work Experience', 'EXPERIENCE', 'Experience'],
                'skills': ['TECHNICAL SKILLS', 'Technical Skills', 'SOFT SKILLS', 'Soft Skills', 'SKILLS', 'Skills'],
                'education': ['EDUCATION', 'Education'],
                'projects': ['PROJECTS', 'Projects'],
                'certifications': ['CERTIFICATIONS', 'Certifications', 'CERTIFICATION', 'Certification']
            }
            
            for section_name, patterns in header_patterns.items():
                for pattern in patterns:
                    idx = original_text.find(pattern)
                    if idx != -1:
                        header_positions[section_name] = idx
                        self.logger.debug(f"Found header '{pattern}' for section '{section_name}' at position {idx}")
                        break
            
            self.logger.info(f"Detected {len(header_positions)} headers in original text: {list(header_positions.keys())}")
            
            # If we found headers in scrambled order, try to fix content assignment
            if len(header_positions) >= 3:
                # Check if headers are out of logical order
                # Expected order: summary < skills < experience < projects < education < certifications
                expected_order = ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']
                
                # Get detected sections in position order
                sorted_sections = sorted(header_positions.items(), key=lambda x: x[1])
                
                # Check if headers are too close together (multi-column layout issue)
                # If headers are within 100 chars of each other, it's likely a layout problem
                has_layout_issue = False
                for i in range(len(sorted_sections) - 1):
                    distance = sorted_sections[i + 1][1] - sorted_sections[i][1]
                    if distance < 100:
                        has_layout_issue = True
                        self.logger.warning(f"Headers '{sorted_sections[i][0]}' and '{sorted_sections[i+1][0]}' are only {distance} chars apart - likely multi-column layout issue")
                        break
                
                # If we detect a layout issue, don't use the scrambled fix
                if has_layout_issue:
                    self.logger.info("Skipping scrambled section fix due to multi-column layout detection")
                    return sections
                
                # Extract content between headers
                fixed_sections = {}
                for i, (section_name, start_pos) in enumerate(sorted_sections):
                    # Find end position (next header or end of text)
                    if i < len(sorted_sections) - 1:
                        end_pos = sorted_sections[i + 1][1]
                    else:
                        end_pos = len(original_text)
                    
                    # Extract content between this header and next
                    section_text = original_text[start_pos:end_pos].strip()
                    
                    # Remove the header itself from the content
                    for pattern in header_patterns.get(section_name, []):
                        if section_text.startswith(pattern):
                            section_text = section_text[len(pattern):].strip()
                            break
                    
                    self.logger.debug(f"Section '{section_name}': extracted {len(section_text)} chars (pos {start_pos}-{end_pos})")
                    
                    if section_text:
                        fixed_sections[section_name] = section_text
                    else:
                        self.logger.warning(f"Section '{section_name}' has no content after header removal")
                
                # Preserve 'other' section if it exists
                if 'other' in sections and sections['other']:
                    fixed_sections['other'] = sections['other']
                
                self.logger.info(f"Fixed scrambled sections: {list(fixed_sections.keys())}")
                return fixed_sections
            
            # No scrambling detected, return original sections
            return sections
            
        except Exception as e:
            self.logger.error(f"Error fixing scrambled sections: {e}")
            return sections
    
    def calculate_heuristic_score(self, line: str, prev_line: str = '', next_line: str = '') -> int:
        """
        Calculate a heuristic score (0-10) for how likely a line is a section header.
        
        Args:
            line: The line to score
            prev_line: The previous line (for context)
            next_line: The next line (for context)
            
        Returns:
            Score from 0 to 10
        """
        score = 0
        line_lower = line.lower()
        
        # PENALTY: Likely job title or company name indicators
        # These should NOT be treated as section headers
        job_title_indicators = [
            'engineer', 'developer', 'manager', 'analyst', 'consultant',
            'designer', 'architect', 'specialist', 'coordinator', 'director',
            'lead', 'senior', 'junior', 'associate', 'principal', 'staff',
            'intern', 'trainee', 'assistant', 'administrator', 'officer'
        ]
        
        company_indicators = [
            'inc', 'llc', 'ltd', 'corp', 'corporation', 'company', 'co.',
            'solutions', 'systems', 'technologies', 'tech', 'services',
            'group', 'partners', 'consulting', 'labs', 'studio'
        ]
        
        degree_indicators = [
            'bachelor', 'master', 'doctorate', 'phd', 'mba', 'degree',
            'science', 'arts', 'engineering', 'technology', 'b.tech',
            'm.tech', 'b.sc', 'm.sc', 'associate degree'
        ]
        
        university_indicators = [
            'university', 'college', 'institute', 'school of', 'academy',
            'mit', 'stanford', 'harvard', 'berkeley', 'oxford', 'cambridge'
        ]
        
        # If line contains job title or company indicators, heavily penalize
        if any(indicator in line_lower for indicator in job_title_indicators):
            score -= 5  # Heavy penalty for job titles
        
        if any(indicator in line_lower for indicator in company_indicators):
            score -= 5  # Heavy penalty for company names
        
        if any(indicator in line_lower for indicator in degree_indicators):
            score -= 5  # Heavy penalty for degree names
        
        if any(indicator in line_lower for indicator in university_indicators):
            score -= 5  # Heavy penalty for university names
        
        # PENALTY: Lines longer than 50 chars are likely content, not headers
        if len(line) > 50:
            score -= 3
        
        # Criterion 1: Line length under 40 characters → +2 points
        if len(line) < 40:
            score += 2
        
        # Criterion 2: Case format
        # All uppercase → +3 points
        # Title case → +2 points
        # Sentence case → +1 point
        if line.isupper():
            score += 3
        elif line.istitle():
            score += 2
        elif line and line[0].isupper():
            # Sentence case: first character uppercase
            score += 1
        
        # Criterion 3: No commas, periods, or semicolons → +2 points
        # Allow trailing colon
        line_without_trailing_colon = line.rstrip(':')
        if not any(char in line_without_trailing_colon for char in [',', '.', ';']):
            score += 2
        
        # Criterion 4: No digits → +1 point
        if not any(char.isdigit() for char in line):
            score += 1
        
        # Criterion 5: Empty neighbor lines
        # Both prev and next are empty → +2 points
        # Only one neighbor is empty → +1 point
        prev_empty = prev_line.strip() == ''
        next_empty = next_line.strip() == ''
        
        if prev_empty and next_empty:
            score += 2
        elif prev_empty or next_empty:
            score += 1
        
        # Ensure score doesn't go below 0
        return max(0, score)
    
    def calculate_font_score(self, line_text: str, font_metadata: Dict[str, Dict], baseline_font_size: float) -> int:
        """
        Calculate a font-based score (0-9) for how likely a line is a section header.
        Uses font metadata to assess visual prominence.
        
        Args:
            line_text: The line text to score
            font_metadata: Dictionary with line text as keys and font metadata as values
            baseline_font_size: The baseline (body text) font size for this document
            
        Returns:
            Score from 0 to 9
        """
        # If no metadata for this line, return 0
        if not font_metadata or line_text not in font_metadata:
            return 0
        
        metadata = font_metadata[line_text]
        score = 0
        
        # Criterion 1: Font size compared to baseline
        font_size = metadata.get('font_size', baseline_font_size)
        size_diff = font_size - baseline_font_size
        
        if size_diff > 3.0:
            score += 3  # Significantly larger font
        elif size_diff > 1.5:
            score += 2  # Moderately larger font
        
        # Criterion 2: Bold font → +3 points
        if metadata.get('is_bold', False):
            score += 3
        
        # Criterion 3: Left alignment (x position within 10 pixels of leftmost)
        # First, find the leftmost x position in the document
        x_position = metadata.get('x_position', 0)
        if font_metadata:
            leftmost_x = min(m.get('x_position', float('inf')) for m in font_metadata.values())
            if abs(x_position - leftmost_x) <= 10:
                score += 1
        
        # Criterion 4: Vertical gap above line
        # Calculate average line spacing in document
        vertical_gaps = [m.get('vertical_gap', 0) for m in font_metadata.values() if m.get('vertical_gap', 0) > 0]
        if vertical_gaps:
            avg_line_spacing = sum(vertical_gaps) / len(vertical_gaps)
            current_gap = metadata.get('vertical_gap', 0)
            
            # If gap is more than 1.5x average, add 2 points
            if current_gap > avg_line_spacing * 1.5:
                score += 2
        
        return score
    
    def _match_unknown_section_partial(self, header_text: str) -> str:
        """
        Attempt to match an unknown section header to a known section via partial matching.
        
        Args:
            header_text: The unknown header text
            
        Returns:
            Matched section name or custom section key
        """
        # Normalize the header text
        normalized_header = header_text.lower().strip()
        header_words = normalized_header.split()
        
        # Get the KEYWORD_MAP from _match_section_keywords
        # We'll reconstruct it here for partial matching
        KEYWORD_MAP = {
            'experience': [
                'experience', 'work', 'employment', 'career', 'job', 'professional',
                'positions', 'roles', 'history', 'background', 'internship',
                'freelance', 'contract', 'consulting', 'volunteer'
            ],
            'education': [
                'education', 'academic', 'qualification', 'degree', 'university',
                'college', 'school', 'training', 'certification', 'studies'
            ],
            'skills': [
                'skills', 'competencies', 'expertise', 'technologies', 'tools',
                'proficiencies', 'capabilities', 'technical', 'programming'
            ],
            'summary': [
                'summary', 'profile', 'objective', 'about', 'overview',
                'introduction', 'statement', 'highlights'
            ],
            'certifications': [
                'certifications', 'certificates', 'licenses', 'accreditations',
                'credentials', 'awards', 'achievements', 'honors'
            ],
            'projects': [
                'projects', 'portfolio', 'work samples', 'publications',
                'research', 'contributions'
            ],
            'contact': [
                'contact', 'personal', 'information', 'details', 'address',
                'phone', 'email'
            ],
        }
        
        # Try partial matching: check if any word in header partially matches any keyword
        for section_name, keywords in KEYWORD_MAP.items():
            for header_word in header_words:
                # Skip very short words (< 3 chars)
                if len(header_word) < 3:
                    continue
                    
                for keyword in keywords:
                    # Check if header word is in keyword or keyword is in header word
                    if header_word in keyword or keyword in header_word:
                        self.logger.info(f"🔍 Partial match: '{header_text}' → section: {section_name} (matched '{header_word}' with '{keyword}')")
                        return section_name
        
        # No partial match found - DO NOT create custom section
        # Return None to keep content in current section and prevent data fragmentation
        # This ensures dates, company names, and job titles stay within Experience section
        self.logger.debug(f"⚠️ No section match for: '{header_text}' - treating as content, not header")
        return None
    
    def detect_section_header(self, line: str, prev_line: str = '', next_line: str = '', 
                             font_metadata: Dict[str, Dict] = None, baseline_font_size: float = 11.0) -> Optional[str]:
        """
        Check if a line is a section header and return the section name.
        
        Args:
            line: Line to check for section header
            prev_line: Previous line for heuristic scoring context
            next_line: Next line for heuristic scoring context
            font_metadata: Optional font metadata dictionary for font-based scoring
            baseline_font_size: Baseline font size for the document (default 11.0)
            
        Returns:
            Matched section name, 'unknown_section', 'possible_section', or None
        """
        try:
            if not line or len(line.strip()) < 3:
                return None
            
            # HEADER NORMALIZATION - Handle whitespace and case variations
            # Handles: "EDUCATION ", "Education", " EDUCATION", "EDUCATION\n"
            clean_line = line.strip()  # Remove leading/trailing whitespace
            normalized = clean_line.lower()  # Normalize to lowercase for matching
            
            # STRICT HEADER DETECTION - Only detect actual section headers, not content
            
            # Exclude lines with colons followed by content (these are labels, not headers)
            # e.g., "Programming: Python, Java" or "Skills: AWS, Docker"
            if ':' in clean_line:
                parts = clean_line.split(':', 1)
                after_colon = parts[1].strip()
                # Only skip if there is real content after the colon (more than 10 chars)
                # Short content like "Experience:" or "Skills: " should still be detected
                if len(after_colon) > 10:
                    return None
            
            # ENHANCED KEYWORD MATCHING - Try exact matches first for better accuracy
            # Strategy 1: Exact header matching for common resume headers
            exact_headers = {
                'PROFESSIONAL SUMMARY': 'summary',
                'SUMMARY': 'summary', 
                'TECHNICAL SKILLS': 'skills',
                'SKILLS': 'skills',
                'PROFESSIONAL EXPERIENCE': 'experience',
                'EXPERIENCE': 'experience',
                'EDUCATION': 'education',
                'CERTIFICATIONS': 'certifications',
                'KEY PROJECTS': 'projects',
                'PROJECTS': 'projects',
                'CONTACT': 'contact',
                'CONTACT INFORMATION': 'contact',
                'CONTACT DETAILS': 'contact',
                'PERSONAL INFORMATION': 'contact',
                'PERSONAL DETAILS': 'contact'
            }
            
            clean_upper = clean_line.upper().strip(':')
            if clean_upper in exact_headers:
                self.logger.info(f"Exact header match: '{clean_line}' -> section: {exact_headers[clean_upper]}")
                return exact_headers[clean_upper]
            
            # Strategy 2: Check normalized version against keywords (handles all case variations)
            # This works for: "EDUCATION", "Education", "education", "EdUcAtIoN"
            if len(clean_line.split()) <= 10:  # Reasonable header length
                result = self._match_section_keywords(normalized)
                if result:
                    # Verify it looks like a header (not a sentence)
                    # Headers are typically short and don't have common sentence words
                    sentence_indicators = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'have', 'has', 'had']
                    if not any(word in normalized.split() for word in sentence_indicators):
                        self.logger.info(f"Detected header: '{clean_line}' -> section: {result}")
                        return result
            
            # Strategy 3: Title Case headers (short only)
            if clean_line.istitle() and len(clean_line.split()) <= 5:
                result = self._match_section_keywords(normalized)
                if result:
                    self.logger.info(f"✅ Detected title case header: '{clean_line}' → section: {result}")
                    return result
            
            # STRICT FILTERING - Prevent job titles, companies, and dates from being headers
            # Check for date patterns (e.g., "Jan 2020 - Present", "2019-2023")
            date_pattern = re.compile(r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december|\d{4})\b', re.IGNORECASE)
            if date_pattern.search(clean_line):
                self.logger.debug(f"❌ Contains date - not a section header: '{clean_line}'")
                return None
            
            # Check for common job title indicators
            job_indicators = ['engineer', 'developer', 'manager', 'analyst', 'consultant', 'designer', 
                            'architect', 'specialist', 'director', 'lead', 'senior', 'junior', 'intern']
            if any(indicator in normalized for indicator in job_indicators):
                self.logger.debug(f"❌ Contains job title indicator - not a section header: '{clean_line}'")
                return None
            
            # Check for company indicators
            company_indicators = ['inc', 'llc', 'ltd', 'corp', 'pvt', 'limited', 'company', 'technologies', 'solutions', 'systems']
            if any(indicator in normalized for indicator in company_indicators):
                self.logger.debug(f"❌ Contains company indicator - not a section header: '{clean_line}'")
                return None
            
            # KEYWORD MATCHING FAILED - Use heuristic scoring as fallback
            heuristic_score = self.calculate_heuristic_score(clean_line, prev_line, next_line)
            
            # Require minimum 2 words for heuristic-based section headers
            # This prevents single words like "Networking", "Kafka" from being treated as headers
            word_count = len(clean_line.split())
            if word_count < 2:
                self.logger.debug(f"❌ Single word - not a section header: '{clean_line}'")
                return None
            
            # Score ≥ 7: Very likely heading with unknown section name
            # Try partial matching to assign to nearest section
            if heuristic_score >= 7:
                self.logger.info(f"✅ Detected unknown section header (score={heuristic_score}): '{clean_line}'")
                matched_section = self._match_unknown_section_partial(clean_line)
                return matched_section
            
            # Score 3-4: Possible heading, needs font layer confirmation
            elif heuristic_score >= 3:
                # Check if font metadata is available for this line
                if font_metadata and clean_line in font_metadata:
                    font_score = self.calculate_font_score(clean_line, font_metadata, baseline_font_size)
                    
                    # Font score ≥ 3: Upgrade to confirmed heading
                    if font_score >= 3:
                        self.logger.info(f"✅ Upgraded to confirmed header (heuristic={heuristic_score}, font={font_score}): '{clean_line}'")
                        matched_section = self._match_unknown_section_partial(clean_line)
                        return matched_section
                    
                    # Font score < 2: Downgrade to content
                    elif font_score < 2:
                        self.logger.info(f"❌ Downgraded to content (heuristic={heuristic_score}, font={font_score}): '{clean_line}'")
                        return None
                    
                    # Font score 2: Treat as content, not header
                    else:
                        self.logger.debug(f"⚠️ Low font score (heuristic={heuristic_score}, font={font_score}): '{clean_line}' - treating as content")
                        return None
                else:
                    # No font metadata available - treat as content to prevent fragmentation
                    self.logger.debug(f"⚠️ Ambiguous header (score={heuristic_score}, no font data): '{clean_line}' - treating as content")
                    return None
            
            # Score < 3: Treat as content, not a header
            else:
                self.logger.debug(f"❌ Not a header (score={heuristic_score}): '{clean_line}'")
                return None
            
        except Exception as e:
            self.logger.error(f"Error detecting section header: {e}")
            return None
    
    def detect_section_header_semantic(self, line: str) -> str | None:
        """
        Fallback: when no keyword matches, use sentence similarity
        to classify the heading against section prototypes.
        """
        try:
            from sentence_transformers import SentenceTransformer, util
            import torch

            # Lazy load — only instantiate once
            if not hasattr(self, '_semantic_model'):
                self._semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
                self._section_prototypes = {
                    'experience':            'Work experience employment career history jobs positions',
                    'education':             'Education academic degree university college school qualifications',
                    'skills':                'Technical skills tools technologies competencies expertise abilities',
                    'summary':               'Professional summary objective profile about me introduction overview',
                    'projects':              'Projects portfolio personal work open source contributions capstone',
                    'certifications':        'Certifications licenses training courses certificates credentials',
                    'awards':                'Awards honors achievements recognition distinctions scholarships prizes',
                    'publications':          'Publications papers articles books patents research outputs',
                    'presentations':         'Presentations talks conferences keynotes speaking engagements',
                    'research':              'Research laboratory experiments investigations scholarly work',
                    'volunteering':          'Volunteering community service extracurricular activities',
                    'languages':             'Languages spoken foreign bilingual multilingual proficiency',
                    'interests':             'Hobbies interests personal activities passions leisure',
                    'references':            'References referees contact available upon request',
                    'contact':               'Contact personal information address phone email details',
                    'affiliations':          'Affiliations memberships organizations professional societies',
                    'patents':               'Patents inventions intellectual property trademarks',
                    'teaching':              'Teaching mentoring tutoring coaching lecturing courses taught',
                    'grants':                'Grants funding fellowships research funding awarded',
                    'professional_development': 'Professional development CPD continuing education learning',
                    'leadership':            'Leadership management team management executive roles',
                    'additional':            'Additional information miscellaneous other details',
                    'objective':             'Career objective goals aims mission aspirations seeking',
                    'portfolio':             'Portfolio work samples creative works showreel gallery',
                    'military':              'Military service armed forces national service defense',
                }
                self._prototype_embeddings = {
                    k: self._semantic_model.encode(v, convert_to_tensor=True)
                    for k, v in self._section_prototypes.items()
                }

            line_embedding = self._semantic_model.encode(line, convert_to_tensor=True)
            best_section = None
            best_score = 0.0

            for section_name, proto_emb in self._prototype_embeddings.items():
                score = float(util.cos_sim(line_embedding, proto_emb))
                if score > best_score:
                    best_score = score
                    best_section = section_name

            # Only use semantic match if confidence is high enough
            if best_score > 0.55:
                return best_section

            return None

        except Exception:
            return None
    
    def _match_section_keywords(self, text: str) -> Optional[str]:
        # Strip whitespace first
        clean_text = text.strip()
        
        # Remove special characters from start and end:
        # - dashes, underscores, equal signs, asterisks, hash symbols
        # - bullet points (•, -, *, +), square brackets, colons
        # Pattern: strip these chars from both ends
        clean_text = re.sub(r'^[\-_=*#•\[\]\:\s]+', '', clean_text)
        clean_text = re.sub(r'[\-_=*#•\[\]\:\s]+$', '', clean_text)
        
        # Normalize multiple spaces into single space
        clean_text = re.sub(r'\s+', ' ', clean_text)

        KEYWORD_MAP = {
            'experience': [
                # Core
                'experience', 'work experience', 'professional experience',
                'employment', 'employment history', 'work history', 'career history',
                'job history', 'professional history', 'employment record',

                # Background & profile
                'professional background', 'work background', 'work profile',
                'career profile', 'career experience', 'job experience',

                # Summary & overview
                'experience summary', 'career summary', 'professional journey',
                'career overview', 'professional overview',

                # Roles
                'roles & responsibilities', 'roles and responsibilities',
                'positions held', 'position held', 'previous positions',
                'past positions', 'current position', 'previous roles',
                'past roles', 'current role', 'job titles', 'titles held',
                'appointments', 'assignments', 'engagements',

                # Scoped
                'relevant experience', 'industry experience', 'technical experience',
                'leadership experience', 'management experience', 'project experience',
                'projects experience', 'research experience', 'teaching experience',
                'clinical experience', 'field experience', 'consulting experience',
                'freelance experience', 'volunteer experience', 'internship experience',
                'academic experience', 'military experience', 'government experience',
                'nonprofit experience', 'startup experience', 'agency experience',
                'corporate experience', 'remote experience', 'international experience',
                'cross-functional experience', 'administrative experience',
                'operations experience', 'sales experience', 'training experience',

                # Temporal qualifiers
                'previous experience', 'prior experience', 'past experience',
                'previous employment', 'prior employment', 'former employment',

                # Internship / entry-level
                'internship', 'internships', 'co-op', 'co-op experience',
                'apprenticeship', 'trainee experience', 'placement',
                'industrial placement', 'work placement', 'practicum', 'externship',

                # Contract / freelance
                'freelance work', 'contract work', 'contract experience',
                'self-employed', 'independent contractor', 'part-time experience',
                'full-time experience', 'gig experience',

                # Accomplishments-framed
                'achievements', 'accomplishments', 'key contributions',
                'contributions', 'career highlights', 'professional achievements',
                'key achievements', 'major accomplishments', 'impact',
                'professional impact', 'results', 'key results',

                # Misc
                'work', 'professional journey', 'career', 'career path',
                'career progression', 'career development', 'career trajectory',
            ],

            'education': [
                # Core
                'education', 'academic', 'academics', 'qualification', 'qualifications',
                'education and training', 'education & training',

                # Background & history
                'educational background', 'academic background', 'educational history',
                'academic history', 'academic record', 'scholastic background',
                'scholastic record', 'learning background', 'learning history',

                # Credentials
                'academic qualification', 'academic qualifications',
                'educational qualifications', 'academic credentials',
                'credentials', 'credential', 'degree', 'degrees',
                'diploma', 'diplomas', 'certificate', 'certificates',
                'certification', 'certifications', 'licensure', 'accreditation',

                # Institutions
                'universities attended', 'colleges attended',
                'institutions attended', 'schools attended',
                'academic institutions', 'alma mater',

                # Summary / overview
                'education summary', 'educational summary', 'academic summary', 
                'educational overview', 'academic overview', 'education profile', 
                'academic profile', 'academic achievements', 'educational achievements',
                'scholastic achievements', 'educational details',

                # Training & development
                'training', 'training and development', 'professional development',
                'professional training', 'continuing education',
                'continuing professional development', 'cpd',
                'further education', 'further training', 'additional training',
                'online training', 'workshops', 'seminars', 'bootcamp', 'bootcamps',
                'courses', 'coursework', 'online courses', 'e-learning',

                # Scoped
                'technical education', 'vocational education', 'vocational training',
                'vocational qualifications', 'technical training', 'trade education',
                'trade certification', 'postgraduate education',
                'undergraduate education', 'graduate education', 'doctoral education',
                'postdoctoral training', 'medical education', 'legal education',
                'university education', 'college education', 'studies', 'academic experience',

                # Degree types
                'bachelor', 'bachelors', "bachelor's degree", 'master', 'masters',
                "master's degree", 'doctorate', 'doctoral degree', 'phd', 'mba',
                'associate degree', 'undergraduate degree', 'postgraduate degree',
                'honors degree', 'advanced degree', 'higher education',
                'higher national diploma', 'hnd', 'hnc', 'foundation degree',
                'gnvq', 'nvq',

                # Achievements within education
                'academic honors', 'academic awards', 'scholarships', 'fellowships',
                'distinctions', 'honors', "dean's list", 'major', 'minor',
                'concentration', 'thesis', 'dissertation', 'capstone',
                'final year project',

                # International / regional
                'schooling', 'matric', 'matriculation', 'secondary education',
                'high school', 'secondary school', 'sixth form', 'a levels',
                'o levels', 'gcses', 'leaving certificate', 'baccalaureate',
                'international baccalaureate', 'ib diploma',
                '12th grade', '10th grade', 'ssc', 'hsc', 'cbse', 'icse',
            ],

            'skills': [
                # Core
                'skills', 'skill', 'key skills', 'core skills', 'main skills',
                'relevant skills', 'transferable skills', 'soft skills', 'hard skills',
                'professional skills', 'interpersonal skills', 'communication skills', 
                'analytical skills', 'organizational skills', 'leadership skills', 
                'problem-solving skills', 'strengths',

                # Technical
                'technical skills', 'technical expertise', 'technical proficiencies',
                'technical knowledge', 'technical abilities', 'technical competencies',
                'it skills', 'computer skills', 'digital skills', 'programming skills',
                'software skills', 'hardware skills',

                # Competencies
                'core competencies', 'competencies', 'competency', 'key competencies',
                'professional competencies', 'functional competencies',
                'proficiencies', 'proficiency', 'abilities', 'capability',
                'capabilities', 'expertise', 'areas of expertise',
                'subject matter expertise', 'domain expertise',

                # Tools & technologies
                'technologies', 'tools', 'tools & technologies',
                'tools and technologies', 'software', 'software proficiency',
                'software knowledge', 'platforms', 'frameworks',
                'languages & frameworks', 'languages and frameworks',
                'programming languages', 'scripting languages',
                'stack', 'tech stack', 'technical stack', 'technology stack',
                'infrastructure', 'devops tools', 'cloud platforms',

                # Specializations
                'specializations', 'specialization', 'specialties', 'specialty',
                'areas of specialization', 'areas of focus',

                # Other
                'methodologies', 'practices', 'approaches', 'knowledge',
                'knowledge base', 'skill set', 'skillset',
            ],

            'summary': [
                # Core
                'summary', 'professional summary', 'career summary',
                'experience summary', 'skills summary',

                # Profile
                'profile', 'professional profile', 'career profile',
                'personal profile', 'candidate profile', 'brief profile',

                # About
                'about me', 'about', 'who i am', 'bio', 'biography',
                'personal bio', 'professional bio',

                # Objective
                'objective', 'career objective', 'professional objective',
                'job objective', 'work objective', 'goals', 'career goals',
                'professional goals',

                # Overview & introduction
                'overview', 'career overview', 'professional overview',
                'introduction', 'professional introduction',
                'executive summary', 'personal statement', 'career statement',
                'mission statement', 'value proposition', 'background summary',

                # Snapshot
                'snapshot', 'career snapshot', 'professional snapshot',
                'at a glance', 'highlights', 'career highlights',
                'key highlights', 'top skills', 'core strengths', 'strengths',
            ],

            'certifications': [
                # Core
                'certifications', 'certification', 'certificates', 'certificate',
                'certified', 'certified in', 'accreditations', 'accreditation',
                'licenses', 'license', 'licensure', 'professional licenses',
                'professional certifications', 'certification programs', 'certificate programs',
                'training certifications', 'online certifications', 'awarded certifications',
                'completed certifications', 'certification summary', 'license and certifications',

                # Professional development
                'professional development', 'continuing education',
                'continuing professional development', 'cpd',
                'professional training', 'additional training',
                'online courses', 'courses', 'coursework', 'bootcamp',
                'workshops', 'seminars', 'conferences attended',

                # Achievements & awards
                'achievements', 'accomplishments', 'awards', 'honors',
                'academic awards', 'professional awards', 'industry awards',
                'recognition', 'accolades', 'distinctions',
                'scholarships', 'fellowships', 'grants',

                # Badges & credentials
                'badges', 'digital badges', 'micro-credentials',
                'credentials', 'professional credentials',
                'industry certifications', 'technical certifications',
                'vendor certifications', 'it certifications',

                # Specific well-known certs
                'aws certified', 'google certified', 'microsoft certified',
                'pmp', 'cissp', 'cpa', 'cfa', 'six sigma', 'itil',
                'prince2', 'scrum master', 'agile certified',
            ],

            'projects': [
                # Core
                'projects', 'project', 'my projects', 'all projects',
                'project work', 'project experience', 'project highlights', 'project list',

                # Scoped
                'personal projects', 'key projects', 'notable projects',
                'selected projects', 'featured projects', 'recent projects',
                'relevant projects', 'major projects', 'side projects',
                'academic projects', 'research projects', 'client projects',
                'freelance projects', 'open source projects', 'open-source projects',
                'collaborative projects', 'group projects', 'team projects',
                'independent projects', 'professional projects',

                # Portfolio & work samples
                'portfolio', 'work portfolio', 'design portfolio',
                'creative portfolio', 'project portfolio',
                'work samples', 'sample work', 'case studies', 'case study',
                'notable work', 'client work', 'selected work',

                # Technical
                'builds', 'applications built', 'apps built',
                'software projects', 'engineering projects',
                'technical projects', 'development projects',
                'github projects', 'contributions',

                # Research / academic
                'publications', 'papers', 'research papers', 'research work',
                'thesis', 'dissertation', 'capstone', 'capstone project',
                'final year project', 'independent study',
            ],

            'languages': [
                # Core
                'languages', 'language', 'spoken languages', 'written languages',
                'language skills', 'language proficiency', 'language abilities',
                'language competencies', 'linguistic skills', 'linguistics',

                # Scoped
                'foreign languages', 'second languages', 'additional languages',
                'native language', 'mother tongue', 'first language',
                'bilingual', 'multilingual', 'fluency', 'language fluency',
                'language knowledge', 'known languages',

                # Proficiency levels (standalone headers)
                'native', 'fluent', 'proficient', 'conversational',
                'elementary proficiency', 'working proficiency',
                'professional proficiency', 'full professional proficiency',
            ],

            'volunteering': [
                # Core
                'volunteering', 'volunteer work', 'volunteer experience',
                'voluntary work', 'voluntary experience', 'volunteerism',

                # Scoped
                'community service', 'community involvement', 'community work',
                'community engagement', 'social work', 'charity work',
                'nonprofit work', 'ngo work', 'civic engagement',
                'extracurricular activities', 'extracurriculars',
                'activities', 'social activities', 'club memberships',
                'memberships', 'affiliations', 'professional affiliations',
                'professional memberships', 'associations', 'organizations',
            ],

            'references': [
                # Core
                'references', 'reference', 'referees', 'referee',

                # Variants
                'professional references', 'character references',
                'personal references', 'academic references',
                'references available', 'references upon request',
                'available upon request', 'references available on request',
                'contact references', 'testimonials', 'recommendations',
                'linkedin recommendations',
            ],

            'contact': [
                'contact', 'contact information', 'contact details',
                'personal information', 'personal details', 'personal data',
                'contact me', 'get in touch', 'address', 'address details',
                'personal profile details', 'applicant details', 'candidate details'
            ],
        }

        clean_lower = clean_text.lower().strip()

        # Special case: prioritize 'certifications' over 'education'
        # Since education keywords include 'certification', we need to check certifications first
        if clean_lower in ['certifications', 'certification', 'certificates', 'certificate']:
            return 'certifications'

        for section_name, keywords in KEYWORD_MAP.items():
            for keyword in keywords:
                if clean_lower == keyword:
                    return section_name
                if clean_lower.startswith(keyword) and len(clean_lower) <= len(keyword) + 5:
                    return section_name

        return None
    
    def extract_experience_blocks(self, experience_text: str) -> List[Dict[str, str]]:
        """
        Split experience section into individual job blocks.
        
        Args:
            experience_text: Text from the experience section
            
        Returns:
            List of job experience dictionaries
        """
        try:
            if not experience_text or not experience_text.strip():
                return []
            
            jobs = []
            
            # Split by common job separators
            job_blocks = self._split_into_job_blocks(experience_text)
            
            for block in job_blocks:
                job_info = self._parse_job_block(block)
                if job_info:
                    jobs.append(job_info)
            
            self.logger.info(f"Extracted {len(jobs)} job blocks from experience section")
            return jobs
            
        except Exception as e:
            self.logger.error(f"Error extracting experience blocks: {e}")
            return []
    
    def _split_into_job_blocks(self, text: str) -> List[str]:
        """
        Split experience text into individual job blocks.
        
        Args:
            text: Experience section text
            
        Returns:
            List of job blocks
        """
        # Common patterns that indicate new job entries....
        job_separators = [
            r'\n\s*[A-Z][a-z]+\s+\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})',  # Date ranges
            r'\n\s*[A-Z][A-Za-z\s&.,\-]{3,}\s*\n',  # Company names
            r'\n\s*[\w\s]+(?:Engineer|Developer|Manager|Director|Analyst|Specialist|Consultant)',  # Job titles
        ]
        
        # Create combined pattern
        combined_pattern = '|'.join(job_separators)
        
        # Split by the pattern, keeping the separators
        parts = re.split(combined_pattern, text, flags=re.MULTILINE)
        
        # Filter out empty parts and trim
        job_blocks = [part.strip() for part in parts if part.strip()]
        
        return job_blocks
    
    def _parse_job_block(self, block: str) -> Optional[Dict[str, str]]:
        """
        Parse a single job block into structured information.
        
        Args:
            block: Job block text
            
        Returns:
            Dictionary with job information
        """
        try:
            lines = block.split('\n')
            lines = [line.strip() for line in lines if line.strip()]
            
            if not lines:
                return None
            
            job_info = {
                'title': '',
                'company': '',
                'dates': '',
                'description': ''
            }
            
            # Extract job title (usually first line)
            if lines:
                job_info['title'] = lines[0]
            
            # Extract dates and company from remaining lines
            description_lines = []
            
            for i, line in enumerate(lines[1:], 1):
                # Check for dates
                if self.date_pattern.search(line) and not job_info['dates']:
                    job_info['dates'] = line
                    continue
                
                # Check for company (usually contains "at" or is in all caps)
                if ('at' in line.lower() or line.isupper()) and not job_info['company']:
                    # Clean up company name
                    company = re.sub(r'^(?:at|@)\s*', '', line, flags=re.IGNORECASE)
                    company = re.sub(r'[\|\-•].*$', '', company).strip()
                    if company:
                        job_info['company'] = company
                        continue
                
                # Add to description
                description_lines.append(line)
            
            # Combine description lines
            job_info['description'] = '\n'.join(description_lines)
            
            # If no company found, try to extract from title line
            if not job_info['company'] and job_info['title']:
                company_match = re.search(r'(?:at|@)\s+([A-Za-z0-9\s&.,\-]+)', job_info['title'], re.IGNORECASE)
                if company_match:
                    job_info['company'] = company_match.group(1).strip()
                    # Remove company from title
                    job_info['title'] = re.sub(r'\s*(?:at|@)\s+[A-Za-z0-9\s&.,\-]+', '', job_info['title'], flags=re.IGNORECASE).strip()
            
            return job_info if job_info['title'] else None
            
        except Exception as e:
            self.logger.error(f"Error parsing job block: {e}")
            return None
    
    def extract_education_blocks(self, education_text: str) -> List[Dict[str, str]]:
        """
        Split education section into individual education blocks.
        
        Args:
            education_text: Text from the education section
            
        Returns:
            List of education dictionaries
        """
        try:
            if not education_text or not education_text.strip():
                return []
            
            education_items = []
            
            # Split by common education separators
            edu_blocks = re.split(r'\n(?=[A-Z][a-zA-Z\s]+(?:University|College|Institute|School))', education_text)
            
            for block in edu_blocks:
                edu_info = self._parse_education_block(block)
                if edu_info:
                    education_items.append(edu_info)
            
            self.logger.info(f"Extracted {len(education_items)} education blocks")
            return education_items
            
        except Exception as e:
            self.logger.error(f"Error extracting education blocks: {e}")
            return []
    
    def _parse_education_block(self, block: str) -> Optional[Dict[str, str]]:
        """
        Parse a single education block into structured information.
        
        Args:
            block: Education block text
            
        Returns:
            Dictionary with education information
        """
        try:
            lines = [line.strip() for line in block.split('\n') if line.strip()]
            
            if not lines:
                return None
            
            edu_info = {
                'degree': '',
                'institution': '',
                'dates': '',
                'details': ''
            }
            
            # Extract institution (usually contains University, College, etc.)
            for line in lines:
                if any(keyword in line.lower() for keyword in ['university', 'college', 'institute', 'school']):
                    edu_info['institution'] = line
                    break
            
            # Extract degree (usually first line or contains degree keywords)
            degree_keywords = ['bachelor', 'master', 'phd', 'doctor', 'associate', 'diploma', 'certificate']
            for line in lines:
                if any(keyword in line.lower() for keyword in degree_keywords):
                    edu_info['degree'] = line
                    break
            
            # Extract dates
            for line in lines:
                if self.date_pattern.search(line):
                    edu_info['dates'] = line
                    break
            
            # Remaining lines go to details
            details = [line for line in lines if line not in [
                edu_info['degree'], edu_info['institution'], edu_info['dates']
            ]]
            edu_info['details'] = '\n'.join(details)
            
            return edu_info if edu_info['institution'] or edu_info['degree'] else None
            
        except Exception as e:
            self.logger.error(f"Error parsing education block: {e}")
            return None
    
    def extract_skills_from_section(self, skills_text: str) -> List[str]:
        """
        Extract individual skills from skills section.
        
        Args:
            skills_text: Text from the skills section
            
        Returns:
            List of individual skills
        """
        try:
            if not skills_text:
                return []
            
            skills = []
            
            # Split by common separators
            skill_parts = re.split(r'[,;•\n]', skills_text)
            
            for part in skill_parts:
                skill = part.strip()
                
                # Remove common prefixes
                skill = re.sub(r'^(?:•|\-|\*|\+)\s*', '', skill)
                skill = re.sub(r'^(?:skills?|technologies?|tools?|competencies?):\s*', '', skill, flags=re.IGNORECASE)
                
                # Clean up and filter
                if skill and len(skill) > 1 and len(skill) < 50:
                    skills.append(skill)
            
            # Remove duplicates and sort
            unique_skills = sorted(list(set(skill.lower() for skill in skills)))
            
            self.logger.info(f"Extracted {len(unique_skills)} skills from skills section")
            return unique_skills
            
        except Exception as e:
            self.logger.error(f"Error extracting skills from section: {e}")
            return []
    
    def get_section_statistics(self, sections: Dict[str, str]) -> Dict[str, int]:
        """
        Get statistics about the parsed sections.
        
        Args:
            sections: Dictionary of sections
            
        Returns:
            Dictionary with section statistics
        """
        try:
            stats = {}
            
            for section_name, section_text in sections.items():
                if section_text:
                    word_count = len(section_text.split())
                    char_count = len(section_text)
                    line_count = len(section_text.split('\n'))
                    
                    stats[section_name] = {
                        'word_count': word_count,
                        'char_count': char_count,
                        'line_count': line_count
                    }
                else:
                    stats[section_name] = {
                        'word_count': 0,
                        'char_count': 0,
                        'line_count': 0
                    }
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Error calculating section statistics: {e}")
            return {}


# Example usage and testing
if __name__ == "__main__":
    # Sample resume text for testing
    sample_resume = """
    John Doe
    Software Engineer
    
    SUMMARY
    Experienced software engineer with 5+ years of experience in full-stack development.
    
    EXPERIENCE
    Senior Software Engineer at Tech Corp
    Jan 2020 - Present
    • Developed scalable web applications using React and Node.js
    • Led a team of 3 junior developers
    • Improved application performance by 40%
    
    Software Developer at StartupXYZ
    Jun 2018 - Dec 2019
    • Built RESTful APIs and microservices
    • Worked with Agile methodology
    
    EDUCATION
    Bachelor of Science in Computer Science
    University of Technology
    2014 - 2018
    
    SKILLS
    • JavaScript, Python, Java
    • React, Node.js, Express
    • MongoDB, PostgreSQL
    • Docker, AWS, Git
    """
    
    splitter = SectionSplitter()
    
    # Test section splitting
    sections = splitter.split_sections(sample_resume)
    print("Sections found:", list(sections.keys()))
    
    # Test experience extraction
    if 'experience' in sections:
        experience_blocks = splitter.extract_experience_blocks(sections['experience'])
        print(f"\nExperience blocks ({len(experience_blocks)}):")
        for i, job in enumerate(experience_blocks, 1):
            print(f"{i}. {job['title']} at {job['company']}")
    
    # Test education extraction
    if 'education' in sections:
        education_blocks = splitter.extract_education_blocks(sections['education'])
        print(f"\nEducation blocks ({len(education_blocks)}):")
        for i, edu in enumerate(education_blocks, 1):
            print(f"{i}. {edu['degree']} from {edu['institution']}")
    
    # Test skills extraction
    if 'skills' in sections:
        skills = splitter.extract_skills_from_section(sections['skills'])
        print(f"\nSkills ({len(skills)}): {', '.join(skills)}")
    
    # Test section statistics
    stats = splitter.get_section_statistics(sections)
    print(f"\nSection statistics:")
    for section, stat in stats.items():
        print(f"{section}: {stat['word_count']} words, {stat['line_count']} lines")
