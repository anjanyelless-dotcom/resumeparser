"""
Advanced work experience extractor for resume parsing.
Extracts structured work experience with dates, duration, and skills analysis.
"""

import re
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date
import dateparser
from dateparser import parse as dateparse
import calendar

# Configure logging
logger = logging.getLogger(__name__)


def is_valid_job_title(text: str) -> bool:
    """
    Validate if a string is a legitimate job title.
    
    Returns False if:
    - Too short (< 3 chars) or too long (> 80 chars)
    - Only contains symbols, dates, or noise words
    - Is a common garbage value like "Present", "Current", dates
    - Starts with bullet characters
    - Contains education/certification keywords
    - Is a standalone skill or tech name (e.g., Python, React, Docker) without a role indicator
    """
    if not text or not isinstance(text, str):
        return False
    
    text = text.strip()
    
    # Length check
    if len(text) < 3 or len(text) > 80:
        return False
    
    # Check if it's only symbols, dashes, or whitespace
    if re.match(r'^[\s\-–—•\*\+►▸▶→]+$', text):
        return False
    
    # Check if it starts with bullet character
    if re.match(r'^[•\-\*\+►▸▶→]\s*', text):
        return False
    
    # Exact matches for common garbage values
    garbage_exact = {
        'present', 'current', 'now', 'till date', 'to date',
        '–', '—', '-', '–present', '—present', '-present',
        'graduated', 'graduation'
    }
    if text.lower() in garbage_exact:
        return False
    
    # Check if it's just a year or date
    if re.match(r'^(?:19|20)\d{2}$', text):
        return False
    
    # Check if it's a date-like string
    if re.match(r'^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}$', text, re.IGNORECASE):
        return False
    
    # Check for education/certification keywords
    education_keywords = [
        'university', 'college', 'institute', 'school',
        'bachelor', 'master', 'phd', 'doctorate', 'degree',
        'b.s.', 'm.s.', 'b.a.', 'm.a.', 'b.tech', 'm.tech',
        'certification', 'certifications', 'certificate',
        'education', 'academic', 'graduated'
    ]
    text_lower = text.lower()
    for keyword in education_keywords:
        if keyword in text_lower:
            return False
    
    # Check for section headers (both with and without colons)
    section_headers = [
        'environment:', 'technologies:', 'tech stack:',
        'skills:', 'tools:', 'responsibilities:',
        'achievements:', 'projects:', 'summary:',
        'work experience', 'professional experience', 'employment history',
        'education', 'academic background', 'qualifications',
        'certifications', 'awards', 'publications',
        'references', 'hobbies', 'interests'
    ]
    for header in section_headers:
        if text_lower.startswith(header) or text_lower == header.rstrip(':'):
            return False
    
    # Reject if it's ONLY a section header (all caps)
    if text.isupper() and len(text.split()) <= 3:
        common_sections = ['SKILLS', 'EDUCATION', 'EXPERIENCE', 'WORK EXPERIENCE', 
                          'SUMMARY', 'PROFILE', 'PROJECTS', 'CERTIFICATIONS',
                          'REFERENCES', 'AWARDS', 'PUBLICATIONS']
        if text in common_sections:
            return False
    
    # Must contain at least one alphabetic word (not just numbers/symbols)
    words = re.findall(r'\b[a-zA-Z0-9#\+\.\-]{2,}\b', text)
    if not words:
        return False
        
    # Check if the title is actually just a skill name or technology
    known_skills = {
        'python', 'java', 'c++', 'javascript', 'typescript', 'react', 'angular', 
        'vue', 'node.js', 'nodejs', 'docker', 'kubernetes', 'k8s', 'aws', 'azure', 
        'gcp', 'sql', 'nosql', 'mongodb', 'postgresql', 'git', 'html', 'css', 
        'redux', 'graphql', 'rest api', 'microservices', 'ci/cd', 'jenkins', 
        'linux', 'windows', 'agile', 'scrum', 'jira', 'maven', 'gradle', 'hadoop', 
        'spark', 'scala', 'kotlin', 'swift', 'flutter', 'react native', 'php', 
        'laravel', 'django', 'flask', 'spring', 'springboot', 'spring boot', 
        'hibernate', 'oracle', 'mysql', 'redis', 'elasticsearch', 'kafka', 
        'rabbitmq', 'terraform', 'ansible', 's3', 'ec2', 'lambda', 'dynamodb',
        'cloudwatch', 'events', 'api', 'rest', 'soap', 'server', 'database',
        'system', 'cloud', 'machine learning', 'ml', 'ai', 'artificial intelligence',
        'deep learning', 'dl', 'nlp', 'cv', 'computer vision', 'data analytics',
        'data science', 'big data', 'data warehousing', 'etl', 'pipeline', 'pipelines'
    }
    
    role_indicators = {
        'developer', 'engineer', 'architect', 'consultant', 'analyst', 'specialist', 
        'scientist', 'researcher', 'designer', 'manager', 'lead', 'administrator', 
        'admin', 'officer', 'intern', 'trainee', 'coordinator', 'representative', 
        'associate', 'programmer', 'tester', 'expert', 'head', 'director', 'vp', 
        'founder', 'co-founder', 'executive', 'leader', 'instructor', 'teacher',
        'master', 'owner', 'writer', 'recruiter', 'accountant', 'bookkeeper', 
        'helper', 'assistant', 'agent', 'officer'
    }
    
    clean_text = re.sub(r'[\s,/\\|\-_#]+', ' ', text_lower).strip()
    
    # If the clean text is exactly one of the known skills, reject it
    if clean_text in known_skills or text_lower in known_skills:
        return False
        
    # Check if it consists of multiple skill-like words and has no role indicator
    words_list = clean_text.split()
    if len(words_list) <= 3:
        # Check if any word is a role indicator
        has_role_indicator = any(word in role_indicators for word in words_list)
        if not has_role_indicator:
            # If it's short and has no role indicator, and consists of known skills/buzzwords, reject
            # e.g., "python django", "react redux node.js"
            all_skills = all(word in known_skills or re.match(r'^(?:v\d+|\d+\.?\d*)$', word) for word in words_list)
            if all_skills or len(words_list) == 1:
                return False
                
    return True


class ExperienceExtractor:
    """
    Advanced work experience extractor with comprehensive parsing capabilities.
    Extracts structured work history with duration calculation and skills analysis.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Pre-compiled patterns for better performance
        self._compile_patterns()
        
        # Load skill taxonomy
        self.skill_taxonomy = self._load_skill_taxonomy()
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for experience extraction."""
        
        # Date patterns
        self.date_range_pattern = re.compile(
            r'(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\bPresent\b|\bCurrent\b|\bNow\b)',
            re.IGNORECASE
        )
        
        self.year_range_pattern = re.compile(
            r'(\d{4})\s*[-–—]\s*(\d{4}|\bPresent\b|\bCurrent\b|\bNow\b)',
            re.IGNORECASE
        )
        
        self.single_date_pattern = re.compile(
            r'\b(\w+\s+\d{4}|\d{4})\b',
            re.IGNORECASE
        )
        
        # Job title patterns
        self.job_title_patterns = [
            r'(?:Senior|Junior|Lead|Principal|Staff|Chief|Head|VP|Director|Manager|Associate|Assistant)?\s*'
            r'(?:Software|Web|Mobile|Front[-\s]?end|Back[-\s]?end|Full[-\s]?stack|Data|Machine\sLearning|AI|DevOps|Cloud|Security|QA|Test)?\s*'
            r'(?:Engineer|Developer|Architect|Consultant|Analyst|Specialist|Scientist|Researcher|Designer|Product\sManager|Project\sManager)',
            
            r'(?:Senior|Junior|Lead|Principal|Staff|Chief|Head|VP|Director|Manager)?\s*'
            r'(?:Marketing|Sales|Business|Financial|Human\sResource|Operations|Customer|Technical)?\s*'
            r'(?:Manager|Director|VP|Specialist|Analyst|Consultant|Coordinator|Representative|Associate)',
            
            r'(?:Chief|Head|VP|Director|Lead|Senior|Principal|Staff)?\s*'
            r'(?:Executive|Operating|Technical|Financial|Marketing|Sales|Product)?\s*'
            r'(?:Officer|Specialist|Manager|Director)'
        ]
        
        # Company patterns
        self.company_patterns = [
            r'(?:at|@)\s+([A-Za-z0-9\s&.,\-\'\"]+(?:Inc|LLC|Ltd|Corp|Company|Group|Technologies|Solutions)?)(?:\s|\n|$)',
            r'^([A-Za-z0-9\s&.,\-\'\"]+(?:Inc|LLC|Ltd|Corp|Company|Group|Technologies|Solutions)?)\s*[\|\-•]',
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Ltd|Corp|Company|Group|Technologies|Solutions))?)'
        ]
        
        # Location patterns
        self.location_pattern = re.compile(
            r'([A-Za-z\s]+,\s*[A-Z]{2}|[A-Za-z\s]+,\s*[A-Za-z]+|[A-Za-z\s]+,\s*[A-Za-z\s]+)',
            re.IGNORECASE
        )
        
        # Skills indicators in descriptions
        self.skill_indicators = [
            r'(?:developed|built|created|implemented|designed|architected|used|worked\s+with|experienced\s+in)\s+([A-Za-z0-9\s+#\-\.]+)',
            r'(?:proficient\s+in|skilled\s+in|expertise\s+in|knowledge\s+of)\s+([A-Za-z0-9\s+#\-\.]+)',
            r'(?:languages?:|technologies?:|tools?:|frameworks?:)\s*([A-Za-z0-9\s,#\-\.]+)'
        ]
    
    def extract_work_experience(self, experience_section_text: str) -> Dict:
        """Use the new standalone extract_experience function."""
        try:
            if not experience_section_text or not experience_section_text.strip():
                self.logger.warning("Experience section text is empty")
                return {'work_experience': [], 'inline_skills': []}
            
            # Use new extraction function
            experiences = extract_experience(experience_section_text)
            
            # Map field names to match expected format
            # New format: title, company, description, start_date, end_date, is_current
            # Expected format: job_title, company_name, description, start_date, end_date, is_current
            mapped_experiences = []
            for exp in experiences:
                mapped_exp = {
                    'job_title': exp.get('title', ''),
                    'company_name': exp.get('company', ''),
                    'description': exp.get('description', ''),
                    'start_date': exp.get('start_date'),
                    'end_date': exp.get('end_date'),
                    'is_current': exp.get('is_current', False)
                }
                mapped_experiences.append(mapped_exp)
            
            # Extract inline skills from work experience descriptions
            inline_skills = self.extract_inline_skills(mapped_experiences, self.skill_taxonomy)
            
            self.logger.info(f"Successfully extracted {len(mapped_experiences)} work experiences and {len(inline_skills)} inline skills")
            
            return {
                'work_experience': mapped_experiences,
                'inline_skills': inline_skills
            }
            
        except Exception as e:
            self.logger.error(f"Error extracting work experience: {e}", exc_info=True)
            return {'work_experience': [], 'inline_skills': []}
    
    def _load_skill_taxonomy(self) -> list:
        """Load skill taxonomy from data file."""
        try:
            import json
            from pathlib import Path
            
            taxonomy_path = Path(__file__).parent.parent / 'data' / 'skills_taxonomy.json'
            if taxonomy_path.exists():
                with open(taxonomy_path, 'r') as f:
                    return json.load(f)
            else:
                self.logger.warning("Skill taxonomy file not found, using built-in fallback list")
                return ['Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes']
        except Exception as e:
            self.logger.error(f"Error loading skill taxonomy: {e}")
            return []
    
    def extract_inline_skills(self, experiences: list, skill_taxonomy: list) -> list:
        """Extract skills mentioned in experience descriptions."""
        skills = []
        for exp in experiences:
            description = exp.get('description', '')
            if description:
                for skill in skill_taxonomy:
                    if skill.lower() in description.lower():
                        skills.append(skill)
        return list(set(skills))
    
    def extract_experience_with_llm(self, experience_text: str, llm_provider: str) -> list:
        """Call LLM extractor and map output to expected format."""
        try:
            from parsers.llm_experience_extractor import extract_experience_with_llm as llm_extract
            llm_results = llm_extract(experience_text, llm_provider)
            
            if not llm_results:
                return []
            
            mapped = []
            for job in llm_results:
                title = (job.get('role') or job.get('title') or job.get('job_title') or '').strip()
                company = (job.get('company') or job.get('company_name') or '').strip()
                
                # Skip garbage entries
                if not title and not company:
                    continue
                if len(title) > 100:
                    continue
                    
                mapped.append({
                    'job_title': title,
                    'company_name': company,
                    'start_date': job.get('start_date'),
                    'end_date': job.get('end_date'),
                    'is_current': job.get('is_current', False),
                    'description': job.get('summary') or job.get('description') or '',
                    'location': job.get('location') or '',
                    'skills_mentioned': []
                })
            
            return mapped
            
        except Exception as e:
            self.logger.error(f"LLM experience extraction failed: {e}")
            return []
    
    def extract_work_experience_old(self, experience_section_text: str) -> Dict:
        """
        Extract structured work experience from experience section text.
        
        Args:
            experience_section_text: Text from the experience section
            
        Returns:
            Dictionary with work_experience list and inline_skills list
        """
        try:
            if not experience_section_text or not experience_section_text.strip():
                self.logger.warning("Experience section text is empty")
                return {'work_experience': [], 'inline_skills': []}
            
            self.logger.info(f"Processing experience section with {len(experience_section_text)} characters")
            
            # Split into individual job blocks
            job_blocks = self._split_into_job_blocks(experience_section_text)
            self.logger.info(f"Split into {len(job_blocks)} job blocks")
            
            experiences = []
            
            for idx, block in enumerate(job_blocks):
                self.logger.debug(f"Processing job block {idx + 1}/{len(job_blocks)}: {block[:100]}...")
                experience = self._parse_job_experience(block)
                if experience:
                    self.logger.info(f"Extracted job: {experience.get('job_title', 'Unknown')} at {experience.get('company_name', 'Unknown')}")
                    experiences.append(experience)
                else:
                    self.logger.warning(f"Failed to extract experience from block {idx + 1}")
            
            # Sort by start date (most recent first)
            from datetime import datetime
            def get_sort_key(exp):
                date = self._parse_date(exp.get('start_date', ''))
                if date:
                    return date
                return datetime.min.date()  # Use minimum date if None
            
            experiences.sort(key=get_sort_key, reverse=True)
            
            # Extract inline skills from work experience descriptions
            inline_skills = self.extract_inline_skills(experiences, self.skill_taxonomy)
            
            self.logger.info(f"Successfully extracted {len(experiences)} work experiences and {len(inline_skills)} inline skills")
            
            return {
                'work_experience': experiences,
                'inline_skills': inline_skills
            }
            
        except Exception as e:
            self.logger.error(f"Error extracting work experience: {e}", exc_info=True)
            return {'work_experience': [], 'inline_skills': []}
    
# New standalone functions for experience extraction
DATE_LINE_PATTERN = re.compile(
    r'(?i)'
    r'(?:'
    # Month name + year: "Jan 2022", "January 2022", "Sep 2022"
    r'(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
    r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|'
    r'dec(?:ember)?)'
    r'\.?\s*(?:19|20)\d{2}'
    # Year-Month format: "2022-09", "2022/09"
    r'|(?:19|20)\d{2}[\-\/](0[1-9]|1[0-2])'
    # Year ranges: "2020-2023", "2020 - 2023", "2020 to 2023", "2020 2023"
    r'|(?:19|20)\d{2}\s*(?:[-–—]|to)?\s*(?:19|20)\d{2}'
    # Year to Present: "2020-Present", "2020 - Current", "2020 Present"
    r'|(?:19|20)\d{2}\s*(?:[-–—]|to)?\s*(?:present|current|now|till date|to date)'
    # Month/Year format: "01/2022", "12-2022"
    r'|\d{1,2}[\/\-](?:19|20)\d{2}'
    # Quarter format: "Q1 2022"
    r'|Q[1-4]\s*(?:19|20)\d{2}'
    # Month name ranges with dash: "Jan 2020 - Dec 2022", "September 2020 - Present"
    r'|(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
    r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|'
    r'dec(?:ember)?)'
    r'\.?\s*(?:19|20)\d{2}\s*[-–—]\s*'
    r'(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
    r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|'
    r'dec(?:ember)?)\.?\s*(?:19|20)\d{2}|present|current|now)'
    # Month name ranges with 'to': "February 2021 to Present", "March 2018 to January 2021"
    r'|(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
    r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|'
    r'dec(?:ember)?)'
    r'\.?\s*(?:19|20)\d{2}\s+to\s+'
    r'(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
    r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|'
    r'dec(?:ember)?)\.?\s*(?:19|20)\d{2}|present|current|now)'
    r')'
)

def parse_date_safe(date_str: str):
    if not date_str:
        return None
    cleaned = date_str.strip().lower()
    if cleaned in ('present', 'current', 'now', 'till date', 'to date'):
        return None
    try:
        result = dateparser.parse(date_str, settings={'PREFER_DAY_OF_MONTH': 'first'})
        return result.date() if result else None
    except Exception:
        return None

def extract_date_range(text: str) -> dict:
    # Use finditer to get match objects instead of tuples
    date_matches = list(DATE_LINE_PATTERN.finditer(text))
    dates = [match.group(0) for match in date_matches]
    
    is_current = bool(re.search(
        r'(?i)(present|current|now|till date|to date)', text
    ))
    start_date = None
    end_date = None
    
    if dates:
        # Check if the first match itself is a range that contains both start and end dates
        first_date_str = dates[0]
        # Common range separators
        separators = [' - ', ' – ', ' — ', ' to ', '-', '–', '—']
        found_sep = None
        for sep in separators:
            if sep in first_date_str.lower():
                found_sep = sep
                break
                
        # If no standard separator, check if it's space-separated like "2019 Present"
        if not found_sep and any(p in first_date_str.lower() for p in ['present', 'current', 'now', 'till date', 'to date']):
            # Look for a space before the 'present' word
            parts = re.split(r'(?i)\s+(present|current|now|till\s+date|to\s+date)', first_date_str)
            if len(parts) >= 2:
                start_str = parts[0].strip()
                is_end_current = True
                start_date = parse_date_safe(start_str)
                end_date = None
                is_current = True
                found_sep = 'space_fallback'
                
        if found_sep and found_sep != 'space_fallback':
            parts = first_date_str.split(found_sep)
            if len(parts) >= 2:
                start_str = parts[0].strip()
                end_str = parts[1].strip()
                is_end_current = any(p in end_str.lower() for p in ['present', 'current', 'now', 'till date', 'to date'])
                start_date = parse_date_safe(start_str)
                if is_end_current:
                    end_date = None
                    is_current = True
                else:
                    end_date = parse_date_safe(end_str)
        
        # If we couldn't parse it as a range-in-one-string, fallback to standard logic
        if not start_date:
            if ' to ' in text.lower():
                parts = re.split(r'\s+to\s+', text, flags=re.IGNORECASE)
                if len(parts) >= 2:
                    start_date = parse_date_safe(parts[0].strip())
                    if not is_current:
                        end_date = parse_date_safe(parts[1].strip())
                else:
                    start_date = parse_date_safe(dates[0]) if len(dates) >= 1 else None
            else:
                start_date = parse_date_safe(dates[0]) if len(dates) >= 1 else None
                if is_current:
                    end_date = None
                else:
                    end_date = parse_date_safe(dates[1]) if len(dates) >= 2 else None
    
    return {
        'start_date': start_date.isoformat() if start_date else None,
        'end_date': end_date.isoformat() if end_date else None,
        'is_current': is_current,
    }

def split_job_blocks(experience_text: str) -> list:
    """
    Split experience section into independent job blocks.

    Handles multiple resume formats:
    - Company -> Role -> Dates
    - Role -> Company -> Dates
    - Client -> Role (Client: format)
    - Company | Role | Location | Dates  (pipe-separated)
    - Internship format
    - Multi-line company headers
    - Multi-column resumes / mixed layouts

    Each employment record becomes one independent block.
    Never sends multiple jobs together to DeBERTa.

    5-Signal Hybrid Splitter:
      Signal 1 - Explicit header labels  (Client:, Company:, Employer:, ...)
      Signal 2 - Pipe-separated one-liner (Company | Role | Location | Dates)
      Signal 3 - Standalone date range line NOT already present in current block
      Signal 4 - Two or more consecutive blank lines (guaranteed boundary)
      Signal 5 - Short capitalized role-keyword / company-suffix header line
                  that follows a block which already has role/date content
    """
    if not experience_text:
        return []

    lines = experience_text.split('\n')
    blocks = []
    current_block = []

    # ── Signal 1: Explicit header labels ──────────────────────────────────────
    COMPANY_HEADER_RE = re.compile(
        r'^(?:Company|Client|Employer|Organization|Employer\s+Name|'
        r'Worked\s+For|Vendor|Consulting\s+Company|Duration|Period|'
        r'Project|Assignment)\s*[:\-]\s*',
        re.IGNORECASE
    )

    # ── Role keywords for Signal 5  ────────────────────────────────────────────
    ROLE_KEYWORDS = [
        'engineer', 'developer', 'manager', 'architect', 'analyst',
        'consultant', 'designer', 'specialist', 'lead', 'senior',
        'junior', 'director', 'associate', 'intern', 'trainee',
        'coordinator', 'administrator', 'officer', 'assistant', 'programmer',
        'scientist', 'researcher', 'strategist', 'writer', 'editor',
        'recruiter', 'instructor', 'teacher', 'accountant', 'executive',
    ]

    # ── Company suffix keywords ───────────────────────────────────────────────
    COMPANY_SUFFIXES = [
        'inc', 'llc', 'ltd', 'corp', 'corporation', 'pvt', 'private',
        'technologies', 'solutions', 'systems', 'services', 'consulting',
        'group', 'labs', 'software', 'tech', 'global', 'digital',
        'enterprises', 'ventures', 'partners', 'associates', 'co.',
    ]

    NOISE_PREFIXES = [
        'responsibilities', 'responsibility', 'environment:', 'technologies:',
        'tech stack:', 'tools used:', 'achievements:', 'highlights:',
        'key achievements:', 'description:', 'duties:', 'summary:',
        'http', 'www', '@',
    ]

    def _is_bullet_line(s):
        return bool(re.match(r'^[•\-\*\+►▸▶→]\s*', s))

    def _is_noise_header(s):
        lo = s.lower()
        return any(lo.startswith(p) for p in NOISE_PREFIXES)

    def _has_role_kw(s):
        lo = s.lower()
        return any(kw in lo for kw in ROLE_KEYWORDS)

    def _has_company_sfx(s):
        lo = s.lower()
        return any(kw in lo for kw in COMPANY_SUFFIXES)

    def _is_short_cap_line(s):
        stripped = s.strip()
        return (
            1 < len(stripped) < 100
            and bool(stripped)
            and stripped[0].isupper()
            and not _is_bullet_line(stripped)
            and not _is_noise_header(stripped)
        )

    def _is_pipe_line(s):
        """True if the line is a self-contained pipe-delimited job record."""
        if '|' not in s:
            return False
        parts = [p.strip() for p in s.split('|') if p.strip()]
        if len(parts) < 2:
            return False
        return bool(DATE_LINE_PATTERN.search(s)) or any(_has_role_kw(p) for p in parts)

    def _save_block():
        if current_block:
            text = '\n'.join(current_block).strip()
            if len(text) > 10:
                blocks.append(text)

    consecutive_blanks = 0

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # ── Signal 4: Two or more blank lines = hard boundary ─────────────────
        if not line:
            consecutive_blanks += 1
            if consecutive_blanks >= 2 and current_block:
                _save_block()
                current_block = []
                consecutive_blanks = 0
            else:
                current_block.append('')
            i += 1
            continue
        else:
            consecutive_blanks = 0

        is_new_job = False

        # ── Signal 2: Pipe-separated self-contained one-liner ─────────────────
        if _is_pipe_line(line):
            if current_block:
                _save_block()
                current_block = []
            # Pipe lines are self-contained; append and continue
            current_block.append(line)
            _save_block()
            current_block = []
            i += 1
            continue

        # ── Signal 1: Explicit header label (Client:, Company:, …) ───────────
        if COMPANY_HEADER_RE.match(line):
            is_new_job = True

        # ── Signal 3: Standalone date line not yet in current block ───────────
        elif DATE_LINE_PATTERN.search(line) and not _is_bullet_line(line):
            block_has_date = any(
                DATE_LINE_PATTERN.search(l)
                for l in current_block if l.strip()
            )
            if not block_has_date and current_block:
                is_new_job = True

        # ── Signal 5a: Short capitalized role-keyword header ──────────────────
        elif _is_short_cap_line(line) and _has_role_kw(line) and not _is_noise_header(line):
            block_has_content = any(
                _has_role_kw(l) or bool(DATE_LINE_PATTERN.search(l))
                for l in current_block if l.strip()
            )
            if block_has_content:
                is_new_job = True

        # ── Signal 5b: Short capitalized company-suffix header ────────────────
        elif _is_short_cap_line(line) and _has_company_sfx(line) and not _is_noise_header(line):
            next_line = lines[i + 1].strip() if (i + 1) < len(lines) else ''
            if _has_role_kw(next_line) or DATE_LINE_PATTERN.search(next_line):
                if any(l.strip() for l in current_block):
                    is_new_job = True

        # ── Flush current block and start new one if boundary found ───────────
        if is_new_job and current_block:
            _save_block()
            current_block = [line]
        else:
            current_block.append(line)

        i += 1

    # ── CRITICAL: Always save the last block (never drop it) ──────────────────
    _save_block()

    result = [b for b in blocks if len(b.strip()) > 10]

    # ── Diagnostic log ────────────────────────────────────────────────────────
    raw_date_count = len(list(DATE_LINE_PATTERN.finditer(experience_text)))
    logger.info(
        f"[SPLIT-JOB-BLOCKS] lines={len(lines)} | blocks={len(result)} | "
        f"date_patterns_in_raw_text={raw_date_count}"
    )
    for idx, blk in enumerate(result):
        first_line = blk.strip().split('\n')[0][:120]
        logger.info(f"  Block {idx + 1}: {first_line!r}")

    return result


def extract_experience(experience_text: str) -> list:
    """
    Handles 3 real-world resume formats:
    Format 1 — Client: Company, City  +  Role: Title  +  Duration: dates
    Format 2 — Title – dates (next line = Company City)
    Format 3 — Standard: Title at Company / Jan 2020 – Present
    """
    if not experience_text:
        return []

    # No real years = fresher, skip entirely
    if not re.search(r'\b(?:19|20)\d{2}\b', experience_text):
        return []

    NOISE_LINE = re.compile(
        r'(?i)^('
        r'address[:\s]|phone[:\s]|email[:\s]|linkedin[:\s]|github[:\s]'
        r'|https?://|[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}'
        r'|\+\d[\d\s\-]{7,}'
        r'|environment[:\s]|technologies[:\s]|tech stack[:\s]'
        r'|professional\s+experience|work\s+experience|employment\s+history'
        r'|experience|career\s+history|work\s+history'
        r')'
    )

    CLIENT_RE   = re.compile(r'(?i)^client\s*[:\-]\s*(.+)')
    ROLE_RE     = re.compile(r'(?i)^role\s*[:\-]\s*(.+)')
    DURATION_RE = re.compile(r'(?i)^duration\s*[:\-]\s*(.+)')
    BULLET_RE   = re.compile(r'^[•\-\*\+►▸▶→]\s*')

    # Split text into lines for multi-pass processing
    lines = [l.rstrip() for l in experience_text.split('\n')]

    results = []
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        # ── FORMAT 0: Pipe-separated format ────────────────────────────
        # "Senior Data Engineer | Morgan Stanley | Sep 2022 - Present"
        if '|' in line and DATE_LINE_PATTERN.search(line):
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 2:
                # Extract dates from the line
                date_info = extract_date_range(line)
                
                # First part is usually title, second is company
                title = parts[0]
                company = parts[1] if len(parts) > 1 else ''
                
                # Remove dates from title and company if present
                title = DATE_LINE_PATTERN.sub('', title).strip()
                company = DATE_LINE_PATTERN.sub('', company).strip()
                
                # Validate job title
                if title and is_valid_job_title(title) and (company or date_info['start_date']):
                    results.append({
                        'title': title,
                        'company': company,
                        'description': '',
                        'start_date': date_info['start_date'],
                        'end_date': date_info['end_date'],
                        'is_current': date_info['is_current'],
                    })
                i += 1
                continue

        # ── FORMAT 1: Client / Role / Duration blocks ──────────────────
        client_m = CLIENT_RE.match(line)
        if client_m:
            company_raw = client_m.group(1).strip()
            # Extract location if present: "State Farm                    Location: Bloomington, IL"
            # Split by multiple spaces or "Location:" keyword
            location_match = re.search(r'(?:Location:\s*|,\s*)([A-Za-z\s]+,\s*[A-Z]{2})\s*$', company_raw)
            if location_match:
                company = company_raw[:location_match.start()].strip()
            else:
                # strip city: "Home Depot Atlanta, GA" → "Home Depot"
                company = re.split(r'\s{2,}', company_raw)[0].strip()
            
            # consume Role and Duration lines that follow
            title, start_date, end_date, is_current = '', None, None, False
            j = i + 1
            
            while j < len(lines) and j < i + 10:
                nxt = lines[j].strip()
                
                # Stop if we hit another Client: line or Responsibilities section
                if CLIENT_RE.match(nxt) or nxt.lower().startswith('responsibilities'):
                    break
                
                role_m = ROLE_RE.match(nxt)
                dur_m  = DURATION_RE.match(nxt)
                
                if role_m:
                    # Extract title and dates from Role line
                    role_text = role_m.group(1).strip()
                    # Check if dates are on same line: "SR. BIG DATA ENGINEER    October 2022 – Current"
                    date_info = extract_date_range(role_text)
                    if date_info['start_date']:
                        # Remove dates from title
                        title = DATE_LINE_PATTERN.sub('', role_text).strip()
                        title = re.sub(r'\s*[-–—]\s*$', '', title).strip()
                        start_date = date_info['start_date']
                        end_date = date_info['end_date']
                        is_current = date_info['is_current']
                    else:
                        title = re.sub(r'\s*[-–—]\s*$', '', role_text).strip()
                elif dur_m:
                    date_info = extract_date_range(dur_m.group(1))
                    if date_info['start_date']:
                        start_date = date_info['start_date']
                        end_date   = date_info['end_date']
                        is_current = date_info['is_current']
                elif nxt and not NOISE_LINE.match(nxt):
                    # Could be inline "Role: X" without keyword or dates on separate line
                    if not title and DATE_LINE_PATTERN.search(nxt):
                        # This line has dates, might be title + dates
                        date_info = extract_date_range(nxt)
                        if date_info['start_date']:
                            title = DATE_LINE_PATTERN.sub('', nxt).strip()
                            title = re.sub(r'\s*[-–—]\s*$', '', title).strip()
                            start_date = date_info['start_date']
                            end_date = date_info['end_date']
                            is_current = date_info['is_current']
                j += 1

            # Validate job title before adding
            if company and title and is_valid_job_title(title):
                results.append({
                    'title':      title,
                    'company':    company,
                    'description': '',
                    'start_date': start_date,
                    'end_date':   end_date,
                    'is_current': is_current,
                })
                i = j
            else:
                i += 1
            continue

        # ── FORMAT 2: Title, Company, Dates (Standard format) ───────────
        # Format: Title (line 1), Company (line 2), Dates (line 3), Description (line 4+)
        # Example:
        #   Software Developer
        #   Lalataksha Consulting Services Pvt Ltd
        #   Jan 2024 – Present
        #   Developed and maintained web applications...
        if (i + 2 < len(lines) and 
            is_valid_job_title(line) and 
            not DATE_LINE_PATTERN.search(line) and
            not NOISE_LINE.match(line) and
            not BULLET_RE.match(line) and
            len(line) < 80):
            
            # Look ahead to see if this matches the format
            next_line = lines[i + 1].strip()
            
            # Check if line 3 contains dates
            date_line_idx = None
            date_info = None
            
            # Look for dates in the next 2-4 lines
            for j in range(i + 1, min(i + 5, len(lines))):
                future_line = lines[j].strip()
                if DATE_LINE_PATTERN.search(future_line):
                    date_info = extract_date_range(future_line)
                    if date_info['start_date']:
                        date_line_idx = j
                        break
            
            # If we found dates within 2-4 lines, this is likely the format
            if date_line_idx and next_line and not NOISE_LINE.match(next_line):
                title = line.strip()
                company = next_line.strip()
                
                # CRITICAL: Validate that we haven't swapped title and company
                # Company names often have: Ltd, Pvt, Inc, Corp, Technologies, Solutions, Services
                company_indicators = ['ltd', 'pvt', 'inc', 'corp', 'llc', 'technologies', 
                                     'solutions', 'services', 'systems', 'consulting', 'group']
                
                # Job title indicators
                title_indicators = ['engineer', 'developer', 'manager', 'director', 'analyst',
                                   'specialist', 'consultant', 'architect', 'lead', 'senior',
                                   'junior', 'associate', 'coordinator', 'designer', 'programmer']
                
                title_lower = title.lower()
                company_lower = company.lower()
                
                # Check if title has company indicators (means they're swapped)
                title_has_company_indicator = any(ind in title_lower for ind in company_indicators)
                company_has_title_indicator = any(ind in company_lower for ind in title_indicators)
                
                # If title looks like a company and company looks like a title, swap them
                if title_has_company_indicator and company_has_title_indicator:
                    title, company = company, title
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"⚠️ SWAPPED title and company: Title='{title}', Company='{company}'")
                
                # Additional validation: Reject if company is empty or looks invalid
                if not company or len(company) < 2:
                    i += 1
                    continue
                
                # Reject if title is actually a section header
                if title.isupper() and title in ['SKILLS', 'EDUCATION', 'EXPERIENCE', 'SUMMARY', 
                                                  'PROJECTS', 'CERTIFICATIONS', 'REFERENCES']:
                    i += 1
                    continue
                
                # Debug logging
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"📋 FORMAT 2 Match - Title: '{title}', Company: '{company}', Date line idx: {date_line_idx}")
                
                # Collect description lines after the date line
                description_lines = []
                for k in range(date_line_idx + 1, min(date_line_idx + 10, len(lines))):
                    desc_line = lines[k].strip()
                    
                    # Stop at section headers (EDUCATION, SKILLS, etc.)
                    if desc_line.isupper() and desc_line in ['SKILLS', 'EDUCATION', 'EXPERIENCE', 
                                                              'SUMMARY', 'PROJECTS', 'CERTIFICATIONS']:
                        logger.info(f"  ⏹️ Stopping at section header: '{desc_line}'")
                        break
                    
                    # Stop at next job (another title-like line followed by company)
                    if (k + 2 < len(lines) and 
                        is_valid_job_title(desc_line) and 
                        not BULLET_RE.match(desc_line) and
                        not DATE_LINE_PATTERN.search(desc_line)):
                        logger.info(f"  ⏹️ Stopping at line {k}: '{desc_line}' (looks like next job title)")
                        break
                    
                    if desc_line and not NOISE_LINE.match(desc_line):
                        description_lines.append(desc_line)
                
                description = '\n'.join(description_lines)
                
                # DON'T remove company suffixes - keep the full company name
                # Only remove location if it's clearly separated by comma
                # Example: "TechNova Solutions Pvt Ltd, Hyderabad" -> "TechNova Solutions Pvt Ltd"
                if ',' in company:
                    parts = company.split(',')
                    # Check if last part looks like a location (city name)
                    last_part = parts[-1].strip()
                    # Common location patterns: single word, or "City, State"
                    if len(last_part.split()) <= 2 and not any(ind in last_part.lower() for ind in company_indicators):
                        # Last part is likely a location, remove it
                        company = ','.join(parts[:-1]).strip()
                
                logger.info(f"  ✅ Extracted - Title: '{title}', Company: '{company}', Desc lines: {len(description_lines)}")
                
                results.append({
                    'title': title,
                    'company': company,
                    'description': description,
                    'start_date': date_info['start_date'],
                    'end_date': date_info['end_date'],
                    'is_current': date_info['is_current'],
                })
                
                # Skip ahead past this block
                i = date_line_idx + len(description_lines) + 1
                continue

        # ── FORMAT 3: Date-boundary split ──────────────────────────
        if DATE_LINE_PATTERN.search(line):
            block_lines = [line]
            i += 1
            while i < len(lines):
                nxt = lines[i].strip()
                # Stop when we hit the next date boundary or a Client: line
                if (DATE_LINE_PATTERN.search(nxt) or CLIENT_RE.match(nxt)) and len(block_lines) > 1:
                    break
                block_lines.append(lines[i])
                i += 1

            block = '\n'.join(block_lines)
            dates = extract_date_range(block)
            clean = DATE_LINE_PATTERN.sub('', block).strip()
            clines = [l.strip() for l in clean.split('\n') if l.strip()]

            # Remove bullet lines from top
            while clines and BULLET_RE.match(clines[0]):
                clines.pop(0)

            if not clines:
                continue

            raw_title = clines[0]
            title = re.sub(r'\s*[-–—]\s*$', '', raw_title).strip()
            
            company = ''
            
            # Extract Company from Title if it uses @ or ' at '
            if '@' in title:
                parts = title.split('@', 1)
                title = parts[0].strip()
                company = parts[1].strip()
            elif ' at ' in title.lower():
                # Case insensitive split on ' at '
                parts = re.split(r'(?i)\s+at\s+', title, 1)
                if len(parts) > 1:
                    title = parts[0].strip()
                    company = parts[1].strip()

            # Skip noise titles
            if NOISE_LINE.match(title) or len(title) > 100:
                continue

            # company = next non-noise line after title, if we didn't extract it already
            if not company:
                for cl in clines[1:3]:
                    if not NOISE_LINE.match(cl) and not DATE_LINE_PATTERN.search(cl) \
                       and not BULLET_RE.match(cl) and len(cl) < 80:
                        company = re.sub(r'\s*[-–—]\s*$', '', cl).strip()
                        break

            desc_lines = clines[2:] if not company or company in clines[1:3] else clines[1:]
            description = '\n'.join(desc_lines)

            # Validate job title before adding
            if title and is_valid_job_title(title):
                results.append({
                    'title':       title,
                    'company':     company,
                    'description': description,
                    'start_date':  dates['start_date'],
                    'end_date':    dates['end_date'],
                    'is_current':  dates['is_current'],
                })
            continue

        i += 1

    return results


class ExperienceExtractorOld:
    """Old implementation - kept for reference."""
    
    def _load_skill_taxonomy(self) -> list:
        """Load skill taxonomy from data file."""
        try:
            import json
            from pathlib import Path
            
            taxonomy_path = Path(__file__).parent.parent / 'data' / 'skills_taxonomy.json'
            if taxonomy_path.exists():
                with open(taxonomy_path, 'r') as f:
                    return json.load(f)
            else:
                # Fallback to built-in skill taxonomy if file doesn't exist
                self.logger.warning("Skill taxonomy file not found, using built-in fallback list")
                return self._get_fallback_skill_taxonomy()
        except Exception as e:
            self.logger.error(f"Error loading skill taxonomy: {e}")
            return self._get_fallback_skill_taxonomy()
    
    def _get_fallback_skill_taxonomy(self) -> list:
        """Get a comprehensive fallback skill taxonomy."""
        return [
            'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Kotlin', 'Swift',
            'React', 'React.js', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Nuxt.js', 'Svelte', 'Ember',
            'Node.js', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'NestJS',
            'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'Tailwind CSS', 'Bootstrap', 'Material UI', 'Styled Components',
            'Redux', 'Redux Toolkit', 'Redux Thunk', 'Redux Saga', 'Zustand', 'MobX', 'React Query', 'Context API', 'Recoil',
            'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite', 'DynamoDB', 'Cassandra',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD', 'Jenkins', 'GitHub Actions',
            'Git', 'GitHub', 'GitLab', 'Bitbucket', 'REST', 'RESTful', 'GraphQL', 'WebSocket', 'gRPC', 'Microservices',
            'Jest', 'Pytest', 'Cypress', 'Selenium', 'React Testing Library', 'Mocha', 'Chai', 'JUnit',
            'Webpack', 'Vite', 'Babel', 'ESLint', 'Prettier', 'npm', 'yarn', 'pnpm',
            'Linux', 'Bash', 'PowerShell', 'Figma', 'Storybook', 'Postman', 'Firebase', 'Supabase',
            'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'NLP', 'Computer Vision',
            'Jira', 'Confluence', 'Agile', 'Scrum', 'Kanban', 'Recharts', 'D3.js', 'Chart.js',
            'Vercel', 'Netlify', 'Heroku', 'DigitalOcean', 'Nginx', 'Apache',
            'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Keras', 'OpenCV', 'NLTK', 'spaCy',
            'Hadoop', 'Spark', 'Airflow', 'Kafka', 'RabbitMQ', 'Tableau', 'Power BI', 'Excel',
            'React Native', 'Flutter', 'Android', 'iOS', 'Unity', 'OpenGL', 'Swagger', 'OAuth', 'JWT', 'SAML', 'LDAP',
            'Hibernate', '.NET', 'ASP.NET', 'Entity Framework', 'LINQ', 'Xamarin', 'Blazor',
            'Elasticsearch', 'Logstash', 'Kibana', 'Prometheus', 'Grafana', 'Consul', 'Vault',
            'Terraform', 'Packer', 'Vagrant', 'Chef', 'Puppet', 'SaltStack', 'Ansible Tower',
            'Kubernetes', 'Helm', 'Istio', 'Linkerd', 'Prometheus Operator', 'ArgoCD', 'Flux',
            'AWS Lambda', 'AWS EC2', 'AWS S3', 'AWS RDS', 'AWS DynamoDB', 'AWS CloudFormation',
            'Azure Functions', 'Azure App Service', 'Azure Cosmos DB', 'Azure DevOps',
            'Google Cloud Functions', 'Google App Engine', 'Google Cloud Storage', 'BigQuery',
            'REST API', 'SOAP API', 'GraphQL API', 'gRPC', 'WebSocket', 'WebRTC',
            'Microservices', 'Serverless', 'Event-Driven Architecture', 'CQRS', 'Event Sourcing',
            'Domain-Driven Design', 'Test-Driven Development', 'Behavior-Driven Development',
            'Continuous Integration', 'Continuous Deployment', 'Continuous Delivery',
            'DevOps', 'DevSecOps', 'Site Reliability Engineering', 'Chaos Engineering',
            'Agile', 'Scrum', 'Kanban', 'Lean', 'XP', 'SAFe', 'LeSS', 'Scrum@Scale',
            'Product Management', 'Project Management', 'Program Management', 'Portfolio Management',
            'Business Analysis', 'System Analysis', 'Technical Analysis', 'Data Analysis',
            'UI Design', 'UX Design', 'Product Design', 'Service Design', 'Design Thinking',
            'Adobe Creative Suite', 'Sketch', 'Figma', 'InVision', 'Zeplin', 'Marvel',
            'Marketing', 'Content Marketing', 'Social Media Marketing', 'Email Marketing',
            'SEO', 'SEM', 'PPC', 'Google Analytics', 'Google Ads', 'Facebook Ads',
            'Sales', 'Business Development', 'Customer Success', 'Account Management',
            'Leadership', 'Management', 'Team Management', 'Strategic Planning',
            'Communication', 'Public Speaking', 'Presentation Skills', 'Negotiation',
            'Problem Solving', 'Critical Thinking', 'Analytical Skills', 'Research',
            'Writing', 'Technical Writing', 'Documentation', 'Copywriting',
            'Teaching', 'Mentoring', 'Coaching', 'Training', 'Knowledge Sharing',
             'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
        'Kotlin', 'Swift', 'Scala', 'Perl', 'Haskell', 'Elixir', 'Erlang', 'Clojure', 'F#', 'R',
        'MATLAB', 'Julia', 'Lua', 'Dart', 'Groovy', 'Objective-C', 'Assembly', 'COBOL', 'Fortran',
        'Ada', 'Prolog', 'Lisp', 'Scheme', 'Racket', 'OCaml', 'Crystal', 'Nim', 'Zig', 'V',
        'Solidity', 'Vyper', 'Move', 'Cairo', 'Ink!', 'Cadence', 'Clarity', 'Michelson',
        'VHDL', 'Verilog', 'SystemVerilog', 'HDL', 'FPGA Programming', 'PLC Programming',
        'ActionScript', 'CoffeeScript', 'LiveScript', 'PureScript', 'ReasonML', 'Elm',
        'Tcl', 'AWK', 'Sed', 'D', 'Modula-2', 'Pascal', 'Delphi', 'Visual Basic', 'VBScript',
        'PowerShell', 'Bash', 'Zsh', 'Fish', 'Ksh', 'Csh', 'Batch Scripting',
        'HCL', 'Jsonnet', 'Dhall', 'Nix', 'Pkl',

        # ─── Frontend Frameworks & Libraries ───
        'React', 'React.js', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Nuxt.js', 'Svelte', 'SvelteKit',
        'Ember', 'Backbone.js', 'Mithril', 'Preact', 'Inferno', 'Solid.js', 'Qwik', 'Astro',
        'Remix', 'Gatsby', 'Gridsome', 'Eleventy', 'Hugo', 'Jekyll', 'Hexo', 'VuePress',
        'Alpine.js', 'Stimulus', 'Hotwire', 'HTMX', 'Lit', 'Stencil', 'Web Components',
        'Ionic', 'Capacitor', 'Cordova', 'PhoneGap', 'Electron', 'Tauri', 'NW.js',

        # ─── Backend Frameworks ───
        'Node.js', 'Express', 'Express.js', 'Fastify', 'Koa', 'Hapi', 'NestJS', 'AdonisJS',
        'FastAPI', 'Django', 'Flask', 'Pyramid', 'Tornado', 'Sanic', 'Starlette', 'Litestar',
        'Spring Boot', 'Spring MVC', 'Spring Cloud', 'Spring Security', 'Spring Data', 'Micronaut',
        'Quarkus', 'Vert.x', 'Dropwizard', 'Play Framework', 'Ktor',
        'Laravel', 'Symfony', 'CodeIgniter', 'Yii', 'CakePHP', 'Slim', 'Lumen', 'Phalcon',
        'Ruby on Rails', 'Sinatra', 'Hanami', 'Padrino',
        'ASP.NET', 'ASP.NET Core', 'Blazor', 'Minimal API', 'MAUI',
        'Gin', 'Echo', 'Fiber', 'Chi', 'Gorilla Mux', 'Buffalo',
        'Actix', 'Axum', 'Rocket', 'Warp', 'Tide',
        'Phoenix', 'Plug', 'Absinthe', 'Ash Framework',
        'Hono', 'Elysia', 'Bun', 'Deno',

        # ─── CSS & Styling ───
        'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'Less', 'Stylus',
        'Tailwind CSS', 'Bootstrap', 'Material UI', 'MUI', 'Styled Components',
        'Chakra UI', 'Ant Design', 'Semantic UI', 'Bulma', 'Foundation', 'UIKit',
        'Radix UI', 'shadcn/ui', 'Headless UI', 'DaisyUI', 'Flowbite',
        'Emotion', 'CSS Modules', 'CSS-in-JS', 'Stitches', 'Vanilla Extract',
        'Mantine', 'NextUI', 'PrimeReact', 'PrimeNG', 'PrimeVue', 'Vuetify',
        'Quasar', 'Element UI', 'Element Plus', 'Naive UI', 'Arco Design',
        'TDesign', 'Windi CSS', 'UnoCSS', 'Open Props',
        'Web Animations API', 'GSAP', 'Framer Motion', 'Motion One', 'Anime.js', 'Three.js',
        'Lottie', 'Rive', 'Spline', 'Babylon.js', 'PlayCanvas',

        # ─── State Management ───
        'Redux', 'Redux Toolkit', 'Redux Thunk', 'Redux Saga', 'Redux Observable',
        'Zustand', 'MobX', 'Jotai', 'Recoil', 'Valtio', 'XState', 'Nanostores',
        'React Query', 'TanStack Query', 'SWR', 'Apollo Client', 'Relay',
        'Context API', 'NgRx', 'Akita', 'NGXS', 'Vuex', 'Pinia',
        'Legend State', 'Effector', 'Storeon', 'Nano Stores',

        # ─── Databases – Relational ───
        'SQL', 'MySQL', 'PostgreSQL', 'SQLite', 'MariaDB', 'Oracle Database',
        'Microsoft SQL Server', 'IBM DB2', 'Sybase', 'Teradata', 'Greenplum',
        'CockroachDB', 'YugabyteDB', 'TiDB', 'PlanetScale', 'Neon', 'Supabase',
        'Vercel Postgres', 'SingleStore', 'Citus', 'TimescaleDB',

        # ─── Databases – NoSQL ───
        'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'HBase',
        'CouchDB', 'CouchBase', 'Firebase Firestore', 'Firebase Realtime Database',
        'Neo4j', 'ArangoDB', 'OrientDB', 'JanusGraph', 'Amazon Neptune',
        'InfluxDB', 'Prometheus', 'Victoria Metrics', 'QuestDB', 'Druid',
        'Riak', 'Aerospike', 'ScyllaDB', 'Apache Ignite',
        'Fauna', 'Upstash', 'PocketBase', 'RethinkDB', 'RavenDB',
        'Realm', 'ObjectBox', 'Ditto', 'WatermelonDB', 'LevelDB', 'RocksDB',

        # ─── Search & Vector Databases ───
        'Elasticsearch', 'OpenSearch', 'Solr', 'Algolia', 'Typesense', 'Meilisearch',
        'Pinecone', 'Weaviate', 'Qdrant', 'Milvus', 'Chroma', 'FAISS', 'Annoy',
        'pgvector', 'Redis Vector', 'Vespa', 'Marqo',

        # ─── ORMs & Query Builders ───
        'Hibernate', 'JPA', 'MyBatis', 'JOOQ', 'Flyway', 'Liquibase',
        'SQLAlchemy', 'Tortoise ORM', 'Peewee', 'PonyORM', 'Django ORM',
        'Prisma', 'Drizzle ORM', 'Knex.js', 'Objection.js', 'MikroORM', 'TypeORM', 'Sequelize',
        'Active Record', 'Ecto', 'Diesel', 'SeaORM', 'GORM', 'Ent',
        'Mongoose', 'Typegoose', 'Entity Framework', 'Dapper', 'NHibernate',

        # ─── Cloud Platforms ───
        'AWS', 'Azure', 'GCP', 'Google Cloud', 'Oracle Cloud', 'IBM Cloud',
        'Alibaba Cloud', 'Tencent Cloud', 'Huawei Cloud', 'DigitalOcean',
        'Linode', 'Vultr', 'Hetzner', 'OVH', 'Scaleway',
        'Cloudflare', 'Fastly', 'Akamai', 'Vercel', 'Netlify', 'Render',
        'Railway', 'Fly.io', 'Heroku', 'Back4App', 'Supabase', 'PlanetScale',
        'Neon', 'Turso', 'Upstash', 'Deno Deploy', 'Bun Deploy',

        # ─── AWS Services ───
        'AWS Lambda', 'AWS EC2', 'AWS S3', 'AWS RDS', 'AWS DynamoDB',
        'AWS CloudFormation', 'AWS CDK', 'AWS SAM', 'AWS ECS', 'AWS EKS',
        'AWS Fargate', 'AWS Batch', 'AWS SQS', 'AWS SNS', 'AWS EventBridge',
        'AWS API Gateway', 'AWS AppSync', 'AWS Cognito', 'AWS IAM', 'AWS KMS',
        'AWS Secrets Manager', 'AWS Parameter Store', 'AWS Systems Manager',
        'AWS CloudWatch', 'AWS X-Ray', 'AWS CloudTrail', 'AWS Config',
        'AWS Route53', 'AWS CloudFront', 'AWS WAF', 'AWS Shield',
        'AWS Elastic Beanstalk', 'AWS Lightsail', 'AWS Amplify',
        'AWS Glue', 'AWS Athena', 'AWS EMR', 'AWS Redshift', 'AWS Kinesis',
        'AWS Step Functions', 'AWS AppFlow', 'AWS DataSync', 'AWS Transfer Family',
        'AWS SageMaker', 'AWS Rekognition', 'AWS Comprehend', 'AWS Textract',
        'AWS Polly', 'AWS Transcribe', 'AWS Translate', 'AWS Lex',

        # ─── Azure Services ───
        'Azure Functions', 'Azure App Service', 'Azure Cosmos DB', 'Azure DevOps',
        'Azure Blob Storage', 'Azure SQL Database', 'Azure Service Bus',
        'Azure Event Hub', 'Azure Event Grid', 'Azure Logic Apps',
        'Azure API Management', 'Azure Active Directory', 'Azure AD B2C',
        'Azure Key Vault', 'Azure Monitor', 'Azure Application Insights',
        'Azure Kubernetes Service', 'Azure Container Instances', 'Azure Container Apps',
        'Azure Static Web Apps', 'Azure CDN', 'Azure Front Door',
        'Azure Machine Learning', 'Azure Cognitive Services', 'Azure OpenAI Service',
        'Azure Databricks', 'Azure Synapse Analytics', 'Azure Data Factory',
        'Azure Stream Analytics', 'Azure HDInsight',

        # ─── GCP Services ───
        'Google Cloud Functions', 'Google App Engine', 'Google Cloud Storage', 'BigQuery',
        'Google Cloud Run', 'Google Kubernetes Engine', 'Google Cloud SQL',
        'Google Cloud Spanner', 'Google Cloud Bigtable', 'Google Cloud Firestore',
        'Google Cloud Pub/Sub', 'Google Cloud Tasks', 'Google Cloud Scheduler',
        'Google Cloud IAM', 'Google Cloud KMS', 'Google Cloud Armor',
        'Google Cloud CDN', 'Google Cloud Load Balancing',
        'Vertex AI', 'Google Cloud Vision API', 'Google Natural Language API',
        'Google Cloud Speech-to-Text', 'Google Cloud Text-to-Speech',
        'Google Cloud Translation', 'Google Dialogflow', 'Google Cloud Dataflow',
        'Google Cloud Dataproc', 'Google Cloud Composer', 'Looker',

        # ─── DevOps & Infrastructure ───
        'Docker', 'Docker Compose', 'Docker Swarm', 'Podman', 'Buildah',
        'Kubernetes', 'Helm', 'Kustomize', 'Istio', 'Linkerd', 'Envoy',
        'ArgoCD', 'Flux', 'Spinnaker', 'Harness', 'Tekton',
        'Terraform', 'Pulumi', 'AWS CDK', 'Crossplane', 'OpenTofu',
        'Ansible', 'Chef', 'Puppet', 'SaltStack', 'CFEngine',
        'Vagrant', 'Packer', 'Consul', 'Vault', 'Nomad',
        'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Travis CI',
        'Bamboo', 'TeamCity', 'Azure Pipelines', 'Bitbucket Pipelines',
        'Drone CI', 'Buildkite', 'Concourse CI', 'Woodpecker CI',
        'Nginx', 'Apache', 'Caddy', 'HAProxy', 'Traefik', 'Kong',
        'CI/CD', 'GitOps', 'Infrastructure as Code', 'Site Reliability Engineering',
        'Platform Engineering', 'FinOps', 'CloudOps', 'AIOps',
        'Prometheus', 'Grafana', 'Alertmanager', 'Loki', 'Tempo', 'Jaeger',
        'Zipkin', 'OpenTelemetry', 'Datadog', 'New Relic', 'Dynatrace',
        'Splunk', 'Elastic Stack', 'ELK Stack', 'EFK Stack',
        'PagerDuty', 'Opsgenie', 'VictorOps', 'StatusPage',
        'Chaos Engineering', 'Chaos Monkey', 'LitmusChaos', 'Gremlin',

        # ─── Version Control & Collaboration ───
        'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Azure Repos', 'AWS CodeCommit',
        'Mercurial', 'SVN', 'Perforce', 'Plastic SCM', 'Fossil',
        'GitHub Copilot', 'GitLab Duo', 'Tabnine', 'Cursor', 'Codeium',
        'Code Review', 'Pull Requests', 'Merge Requests', 'Branch Strategy',
        'Git Flow', 'GitHub Flow', 'Trunk Based Development',

        # ─── API Development ───
        'REST', 'RESTful', 'GraphQL', 'WebSocket', 'gRPC', 'tRPC', 'JSON-RPC',
        'SOAP', 'OData', 'AsyncAPI', 'OpenAPI', 'Swagger', 'Postman', 'Insomnia',
        'API Gateway', 'API Design', 'API Documentation', 'API Testing',
        'API Security', 'OAuth', 'OAuth2', 'JWT', 'SAML', 'OIDC', 'LDAP',
        'API Versioning', 'Rate Limiting', 'Throttling', 'API Monetization',
        'Webhooks', 'Server-Sent Events', 'Long Polling', 'WebRTC',

        # ─── Messaging & Event Streaming ───
        'Kafka', 'Apache Kafka', 'RabbitMQ', 'ActiveMQ', 'NATS', 'NATS JetStream',
        'Redis Pub/Sub', 'Redis Streams', 'AWS SQS', 'AWS SNS', 'AWS Kinesis',
        'Azure Service Bus', 'Azure Event Hub', 'Google Cloud Pub/Sub',
        'Pulsar', 'ZeroMQ', 'MQTT', 'AMQP', 'Stomp',
        'Kafka Streams', 'KSQL', 'Flink', 'Spark Streaming',

        # ─── Testing ───
        'Jest', 'Vitest', 'Mocha', 'Chai', 'Jasmine', 'AVA', 'Tape',
        'Pytest', 'Unittest', 'Nose2', 'Hypothesis', 'Locust',
        'JUnit', 'TestNG', 'Mockito', 'PowerMock', 'AssertJ', 'Hamcrest',
        'NUnit', 'xUnit', 'MSTest', 'SpecFlow', 'FluentAssertions',
        'RSpec', 'Minitest', 'Capybara', 'FactoryBot',
        'Cypress', 'Playwright', 'Selenium', 'WebdriverIO', 'Puppeteer',
        'TestCafe', 'Nightwatch', 'Appium', 'Detox', 'Espresso', 'XCTest',
        'React Testing Library', 'Enzyme', 'Vue Test Utils', 'Angular Testing',
        'Storybook', 'Chromatic', 'Percy', 'BackstopJS', 'Loki',
        'k6', 'JMeter', 'Gatling', 'Artillery', 'Vegeta',
        'SonarQube', 'ESLint', 'Prettier', 'Checkstyle', 'PMD', 'SpotBugs',
        'Codecov', 'Coveralls', 'Istanbul', 'NYC',
        'Test-Driven Development', 'Behavior-Driven Development', 'Acceptance Test-Driven Development',
        'Mutation Testing', 'Property-Based Testing', 'Contract Testing', 'Pact',

        # ─── Build Tools & Package Managers ───
        'Webpack', 'Vite', 'Rollup', 'Parcel', 'esbuild', 'Turbopack', 'Rspack',
        'Babel', 'SWC', 'TypeScript Compiler', 'Flow',
        'npm', 'yarn', 'pnpm', 'Bun', 'Deno',
        'Maven', 'Gradle', 'Ant', 'SBT', 'Mill', 'Bazel',
        'Make', 'CMake', 'Meson', 'Ninja', 'Buck', 'Pants',
        'Cargo', 'Mix', 'Rebar3', 'Poetry', 'PDM', 'Hatch', 'uv',
        'pip', 'conda', 'pipenv', 'virtualenv',
        'NuGet', 'Paket', 'Composer', 'Bundler', 'CocoaPods', 'SPM',
        'Turborepo', 'Nx', 'Lerna', 'Rush', 'Moon',

        # ─── Security ───
        'Application Security', 'Web Application Security', 'API Security',
        'OAuth', 'OAuth2', 'JWT', 'SAML', 'OIDC', 'Kerberos', 'LDAP', 'Active Directory',
        'SSL', 'TLS', 'mTLS', 'PKI', 'Certificates', 'Let\'s Encrypt',
        'OWASP', 'Penetration Testing', 'Vulnerability Assessment', 'Security Auditing',
        'SAST', 'DAST', 'IAST', 'RASP', 'SCA',
        'Snyk', 'Checkmarx', 'Veracode', 'Fortify', 'SonarQube',
        'Nmap', 'Metasploit', 'Burp Suite', 'OWASP ZAP', 'Wireshark',
        'Nessus', 'Qualys', 'Rapid7', 'Tenable',
        'Zero Trust', 'Zero Trust Architecture', 'Privileged Access Management',
        'Identity and Access Management', 'IAM', 'PAM', 'SIEM', 'SOC',
        'Incident Response', 'Threat Modeling', 'Risk Assessment',
        'Cryptography', 'Encryption', 'Hashing', 'Digital Signatures',
        'Key Management', 'Hardware Security Module', 'HSM',
        'DevSecOps', 'Shift Left Security', 'Supply Chain Security',
        'SBOM', 'Compliance', 'GDPR', 'HIPAA', 'PCI DSS', 'SOC 2', 'ISO 27001',
        'Firewall', 'IDS', 'IPS', 'WAF', 'DDoS Protection',
        'Reverse Engineering', 'Malware Analysis', 'Forensics', 'OSINT',
        'Bug Bounty', 'Red Team', 'Blue Team', 'Purple Team', 'CTF',

        # ─── Machine Learning & AI ───
        'Machine Learning', 'Deep Learning', 'Neural Networks', 'AI', 'Artificial Intelligence',
        'TensorFlow', 'PyTorch', 'Keras', 'JAX', 'MXNet', 'Paddle Paddle',
        'Scikit-learn', 'XGBoost', 'LightGBM', 'CatBoost', 'H2O', 'AutoML',
        'NLP', 'Natural Language Processing', 'Computer Vision', 'Speech Recognition',
        'Object Detection', 'Image Segmentation', 'Image Classification',
        'YOLO', 'Detectron2', 'MMDetection', 'Torchvision',
        'Hugging Face', 'Transformers', 'BERT', 'GPT', 'T5', 'RoBERTa',
        'LLM', 'Large Language Models', 'Foundation Models', 'Multimodal AI',
        'LangChain', 'LlamaIndex', 'Semantic Kernel', 'AutoGen', 'CrewAI',
        'OpenAI API', 'Anthropic API', 'Gemini API', 'Cohere API', 'Mistral AI',
        'LLM Fine-Tuning', 'RLHF', 'LoRA', 'QLoRA', 'PEFT', 'DPO',
        'RAG', 'Retrieval-Augmented Generation', 'Agentic AI', 'AI Agents',
        'Prompt Engineering', 'Few-Shot Learning', 'Zero-Shot Learning',
        'Transfer Learning', 'Federated Learning', 'Continual Learning',
        'Reinforcement Learning', 'Q-Learning', 'PPO', 'SAC', 'DDPG',
        'Stable Baselines', 'OpenAI Gym', 'Ray RLlib',
        'Generative AI', 'Diffusion Models', 'GANs', 'VAEs',
        'Stable Diffusion', 'Midjourney API', 'DALL-E', 'ControlNet',
        'MLflow', 'Weights & Biases', 'DVC', 'ClearML', 'Comet ML',
        'Kubeflow', 'MLOps', 'LLMOps', 'Model Monitoring', 'Model Serving',
        'BentoML', 'Seldon', 'KServe', 'TorchServe', 'TFServing', 'Triton',
        'Feature Engineering', 'Feature Store', 'Feast', 'Tecton', 'Hopsworks',
        'Data Preprocessing', 'Data Augmentation', 'Imbalanced Learning',
        'Dimensionality Reduction', 'PCA', 't-SNE', 'UMAP',
        'Clustering', 'Classification', 'Regression', 'Anomaly Detection',
        'Time Series Analysis', 'Forecasting', 'Prophet', 'ARIMA',
        'Recommendation Systems', 'Collaborative Filtering', 'Matrix Factorization',
        'Graph Neural Networks', 'GNN', 'Knowledge Graphs',
        'Explainable AI', 'XAI', 'SHAP', 'LIME', 'Captum',
        'AI Ethics', 'Responsible AI', 'Fairness in AI', 'Bias Detection',
        'Synthetic Data', 'Data Labeling', 'Annotation', 'Label Studio', 'CVAT',
        'OpenCV', 'PIL', 'Pillow', 'scikit-image', 'Albumentations',
        'NLTK', 'spaCy', 'Gensim', 'FastText', 'Sentence Transformers',
        'Speech Recognition', 'Whisper', 'TTS', 'Text-to-Speech',
        'Audio Processing', 'Librosa', 'torchaudio', 'SoundFile',
        'Simulation', 'Digital Twin', 'Isaac Sim', 'Mujoco',

        # ─── Data Engineering & Analytics ───
        'Data Engineering', 'Data Pipelines', 'ETL', 'ELT', 'Data Warehousing',
        'Pandas', 'NumPy', 'Polars', 'Dask', 'Vaex', 'Modin',
        'Matplotlib', 'Seaborn', 'Plotly', 'Bokeh', 'Altair', 'Vega',
        'Tableau', 'Power BI', 'Looker', 'Metabase', 'Superset', 'Redash',
        'Apache Spark', 'Apache Flink', 'Apache Beam', 'Apache Storm',
        'Hadoop', 'HDFS', 'MapReduce', 'Hive', 'HBase', 'Pig', 'Sqoop',
        'Airflow', 'Prefect', 'Dagster', 'Mage', 'Kedro', 'Luigi',
        'dbt', 'Great Expectations', 'Soda', 'Monte Carlo', 'Atlan',
        'Redshift', 'Snowflake', 'BigQuery', 'Databricks', 'Synapse',
        'Delta Lake', 'Apache Iceberg', 'Apache Hudi', 'Apache Parquet',
        'Apache ORC', 'Apache Avro', 'Apache Arrow',
        'Kafka', 'Kinesis', 'Flink', 'Spark Streaming', 'Storm',
        'Data Governance', 'Data Catalog', 'Data Lineage', 'Data Quality',
        'DataOps', 'Analytics Engineering', 'Data Mesh', 'Data Lakehouse',
        'Excel', 'Google Sheets', 'Jupyter Notebook', 'JupyterLab', 'Zeppelin',
        'R Studio', 'KNIME', 'RapidMiner', 'SAS', 'SPSS', 'Stata',
        'Data Modeling', 'Star Schema', 'Snowflake Schema', 'Data Vault',
        'Business Intelligence', 'OLAP', 'OLTP', 'Data Lake', 'Data Lakehouse',

        # ─── Mobile Development ───
        'React Native', 'Flutter', 'Expo', 'NativeScript', 'Xamarin',
        'Android', 'iOS', 'Swift', 'SwiftUI', 'UIKit', 'Objective-C',
        'Kotlin', 'Jetpack Compose', 'Android SDK', 'Android NDK',
        'Cross-Platform Development', 'Hybrid App Development',
        'Mobile App Architecture', 'MVVM', 'MVI', 'MVP', 'MVC',
        'Core Data', 'Core Location', 'ARKit', 'RealityKit', 'SceneKit',
        'Metal', 'SpriteKit', 'GameplayKit', 'Core ML', 'Create ML',
        'Jetpack', 'Room', 'Hilt', 'WorkManager', 'Navigation Component',
        'Firebase', 'OneSignal', 'Braze', 'Amplitude', 'Mixpanel',
        'App Store', 'Google Play', 'TestFlight', 'Fastlane',
        'Mobile Security', 'Certificate Pinning', 'Obfuscation',
        'App Performance', 'ANR', 'Crash Reporting', 'App Analytics',
        'Push Notifications', 'Deep Linking', 'Universal Links',
        'Mobile Payments', 'Apple Pay', 'Google Pay', 'In-App Purchases',
        'Augmented Reality', 'ARCore', 'ARKit', 'Mixed Reality', 'VR Development',

        # ─── Game Development ───
        'Unity', 'Unreal Engine', 'Godot', 'CryEngine', 'GameMaker',
        'C# (Unity)', 'C++ (Unreal)', 'GDScript', 'Lua (Gaming)',
        'OpenGL', 'DirectX', 'Vulkan', 'Metal', 'WebGL', 'WebGPU',
        'Pygame', 'Arcade', 'Raylib', 'SDL', 'SFML', 'LÖVE',
        'Phaser', 'PixiJS', 'BabylonJS', 'PlayCanvas', 'Three.js',
        'Game Design', 'Level Design', 'Game Mechanics', 'Game Economy',
        'Game AI', 'Pathfinding', 'Behavior Trees', 'State Machines',
        'Physics Engines', 'Box2D', 'Bullet Physics', 'Havok', 'NVIDIA PhysX',
        'Animation', 'Rigging', 'Skinning', 'Shader Programming', 'HLSL', 'GLSL',
        'Multiplayer', 'Netcode', 'Game Server', 'ENet', 'Mirror', 'Photon',
        'Steam API', 'Epic Online Services', 'Xbox Live', 'PlayStation Network',
        'Localization', 'Monetization', 'In-App Purchases', 'Ads Integration',
        'Performance Optimization', 'Profiling', 'GPU Optimization',
        'VR Development', 'AR Development', 'XR Development',
        'Blender', 'Maya', '3ds Max', 'Cinema 4D', 'ZBrush', 'Substance Painter',

        # ─── Embedded & Systems ───
        'Embedded Systems', 'RTOS', 'FreeRTOS', 'Zephyr', 'VxWorks', 'QNX',
        'Arduino', 'Raspberry Pi', 'ESP32', 'STM32', 'PIC', 'AVR',
        'C (Embedded)', 'C++ (Embedded)', 'Rust (Embedded)', 'Assembly',
        'UART', 'SPI', 'I2C', 'CAN', 'Modbus', 'Profibus',
        'FPGA', 'VHDL', 'Verilog', 'Xilinx', 'Intel FPGA', 'Lattice',
        'Bare Metal Programming', 'Device Drivers', 'BSP', 'HAL',
        'IoT', 'Internet of Things', 'Edge Computing', 'Fog Computing',
        'MQTT', 'CoAP', 'Zigbee', 'Z-Wave', 'LoRa', 'LoRaWAN', 'Thread',
        'Matter', 'Bluetooth', 'BLE', 'WiFi', 'NFC', 'RFID',
        'Automotive', 'AUTOSAR', 'CAN Bus', 'LIN', 'FlexRay', 'Ethernet AVB',
        'ADAS', 'Functional Safety', 'ISO 26262', 'MISRA C',
        'Industrial IoT', 'SCADA', 'PLC', 'HMI', 'OPC UA',
        'Linux Kernel', 'Linux Device Drivers', 'Yocto', 'Buildroot',
        'Bootloader', 'U-Boot', 'GRUB', 'UEFI', 'BIOS',
        'Memory Management', 'DMA', 'Interrupt Handling', 'Real-Time Systems',

        # ─── Blockchain & Web3 ───
        'Blockchain', 'Web3', 'DeFi', 'NFT', 'DAO', 'DApp', 'Smart Contracts',
        'Solidity', 'Vyper', 'Move', 'Cairo', 'Ink!', 'Rust (Solana)',
        'Ethereum', 'Solana', 'Polygon', 'Avalanche', 'BNB Chain', 'Arbitrum',
        'Optimism', 'Base', 'zkSync', 'StarkNet', 'TON', 'Near', 'Cosmos',
        'Bitcoin', 'Lightning Network', 'Taproot', 'Script',
        'Hardhat', 'Foundry', 'Truffle', 'Brownie', 'Anchor', 'Scaffold-ETH',
        'OpenZeppelin', 'Chainlink', 'The Graph', 'IPFS', 'Arweave', 'Ceramic',
        'ethers.js', 'web3.js', 'viem', 'wagmi', 'RainbowKit', 'ConnectKit',
        'MetaMask', 'WalletConnect', 'Safe', 'Account Abstraction', 'ERC-4337',
        'ERC-20', 'ERC-721', 'ERC-1155', 'ERC-4626', 'EIP-1559',
        'AMM', 'Uniswap', 'Curve', 'Balancer', 'Aave', 'Compound', 'MakerDAO',
        'Layer 2', 'Rollups', 'Optimistic Rollups', 'ZK Rollups', 'State Channels',
        'Consensus Algorithms', 'PoW', 'PoS', 'DPoS', 'BFT', 'Tendermint',
        'Tokenomics', 'Staking', 'Yield Farming', 'Liquidity Mining',
        'Cryptography', 'ZK Proofs', 'zk-SNARKs', 'zk-STARKs', 'MPC', 'TSS',
        'Blockchain Analytics', 'On-Chain Analysis', 'MEV', 'Flash Loans',

        # ─── Architecture & Design Patterns ───
        'Microservices', 'Serverless', 'Event-Driven Architecture',
        'CQRS', 'Event Sourcing', 'Saga Pattern', 'Outbox Pattern',
        'Domain-Driven Design', 'DDD', 'Hexagonal Architecture', 'Clean Architecture',
        'Onion Architecture', 'SOLID Principles', 'Design Patterns', 'GoF Patterns',
        'Monolithic Architecture', 'SOA', 'Service Mesh', 'BFF Pattern',
        'API Gateway Pattern', 'Strangler Fig Pattern', 'Anti-Corruption Layer',
        'Reactive Systems', 'Actor Model', 'CSP', 'Reactive Streams',
        'Repository Pattern', 'Factory Pattern', 'Observer Pattern', 'Strategy Pattern',
        'MVC', 'MVVM', 'MVP', 'MVI', 'Flux', 'Redux Pattern',
        'Database Sharding', 'Read Replicas', 'CQRS', 'Polyglot Persistence',
        'Distributed Systems', 'CAP Theorem', 'Eventual Consistency',
        'Load Balancing', 'Circuit Breaker', 'Bulkhead', 'Retry Pattern',
        'Rate Limiting', 'Throttling', 'Backpressure',
        'High Availability', 'Fault Tolerance', 'Disaster Recovery',
        'Blue-Green Deployment', 'Canary Deployment', 'Feature Flags',
        'Twelve-Factor App', 'Cloud Native', 'Edge Computing',
        'Modular Monolith', 'Micro-Frontend', 'Module Federation',

        # ─── Software Development Methodologies ───
        'Agile', 'Scrum', 'Kanban', 'Lean', 'XP', 'SAFe', 'LeSS', 'Scrum@Scale',
        'Waterfall', 'Spiral', 'RAD', 'Prototyping', 'Incremental Development',
        'Test-Driven Development', 'Behavior-Driven Development', 'Domain-Driven Design',
        'Continuous Integration', 'Continuous Deployment', 'Continuous Delivery',
        'DevOps', 'DevSecOps', 'DataOps', 'MLOps', 'FinOps', 'GitOps',
        'Pair Programming', 'Mob Programming', 'Code Review', 'Refactoring',
        'Technical Debt Management', 'Legacy System Modernization',
        'Trunk Based Development', 'Feature Branch Workflow', 'Release Management',
        'Sprint Planning', 'Backlog Grooming', 'Retrospectives', 'Daily Standup',
        'Sprint Review', 'Velocity', 'Story Points', 'Burn Down Chart',
        'Velocity Chart', 'Cumulative Flow Diagram', 'Cycle Time', 'Lead Time',

        # ─── Project & Product Management ───
        'Product Management', 'Project Management', 'Program Management', 'Portfolio Management',
        'Product Strategy', 'Product Roadmap', 'Product Vision', 'Product Discovery',
        'Product-Led Growth', 'Growth Hacking', 'OKRs', 'KPIs', 'Metrics',
        'A/B Testing', 'Experimentation', 'Feature Prioritization', 'MVP',
        'Product Analytics', 'Cohort Analysis', 'Funnel Analysis', 'Retention',
        'User Research', 'User Interviews', 'Surveys', 'Usability Testing',
        'Competitive Analysis', 'Market Research', 'Go-to-Market Strategy',
        'Roadmapping', 'Story Mapping', 'Impact Mapping', 'Job-to-be-Done',
        'Stakeholder Management', 'Executive Communication', 'Product Metrics',
        'Jira', 'Confluence', 'Asana', 'Trello', 'Monday.com', 'Notion',
        'Linear', 'Height', 'Shortcut', 'ClickUp', 'Basecamp',
        'Figma', 'FigJam', 'Miro', 'Mural', 'Lucidchart', 'Whimsical',
        'PMP', 'PRINCE2', 'PMI', 'Six Sigma', 'ITIL', 'COBIT',
        'Risk Management', 'Change Management', 'Crisis Management',
        'Budget Management', 'Resource Planning', 'Capacity Planning',
        'Vendor Management', 'Contract Management', 'SLA Management',

        # ─── UI/UX Design ───
        'UI Design', 'UX Design', 'Product Design', 'Service Design', 'Design Thinking',
        'Interaction Design', 'Visual Design', 'Information Architecture', 'Content Design',
        'User Research', 'Usability Testing', 'A/B Testing', 'Eye Tracking',
        'Wireframing', 'Prototyping', 'Mockups', 'User Flows', 'Customer Journey Maps',
        'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Zeplin', 'Marvel', 'Axure',
        'Framer', 'Webflow', 'Wix', 'Squarespace', 'Readymag',
        'Adobe Creative Suite', 'Photoshop', 'Illustrator', 'After Effects',
        'InDesign', 'Lightroom', 'Premiere Pro', 'Audition', 'Animate',
        'Affinity Designer', 'Affinity Photo', 'Affinity Publisher',
        'Canva', 'Penpot', 'Lunacy', 'Origami Studio',
        'Design Systems', 'Storybook', 'Chromatic', 'Zeroheight', 'Supernova',
        'Accessibility', 'WCAG', 'ADA Compliance', 'ARIA', 'Screen Readers',
        'Color Theory', 'Typography', 'Grid Systems', 'Responsive Design',
        'Mobile-First Design', 'Dark Mode', 'Micro-interactions',
        'Motion Design', 'Animation', 'Lottie', 'Rive', 'Principle',
        'Brand Design', 'Brand Identity', 'Logo Design', 'Graphic Design',
        'Icon Design', 'Illustration', 'Infographic Design', 'Data Visualization',
        '3D Design', 'Blender', 'Cinema 4D', 'KeyShot', 'Rhino', 'Fusion 360',
        'User Psychology', 'Cognitive Biases', 'Persuasion Design', 'Gamification',
        'Heuristic Evaluation', 'Contextual Inquiry', 'Card Sorting',
        'Tree Testing', 'First Click Testing', 'Preference Testing',

        # ─── Marketing & Growth ───
        'Digital Marketing', 'Content Marketing', 'Social Media Marketing', 'Email Marketing',
        'Influencer Marketing', 'Affiliate Marketing', 'Performance Marketing',
        'SEO', 'Technical SEO', 'On-Page SEO', 'Off-Page SEO', 'Local SEO',
        'SEM', 'PPC', 'Google Ads', 'Facebook Ads', 'Instagram Ads', 'LinkedIn Ads',
        'Twitter Ads', 'TikTok Ads', 'Pinterest Ads', 'Programmatic Advertising',
        'Google Analytics', 'Google Analytics 4', 'Google Tag Manager',
        'Google Search Console', 'Bing Webmaster Tools', 'Google Merchant Center',
        'HubSpot', 'Marketo', 'Pardot', 'Salesforce Marketing Cloud', 'Braze',
        'Mailchimp', 'Klaviyo', 'SendGrid', 'Iterable', 'Customer.io',
        'SEMrush', 'Ahrefs', 'Moz', 'Majestic', 'Screaming Frog',
        'Hotjar', 'FullStory', 'Heap', 'Amplitude', 'Mixpanel',
        'Segment', 'mParticle', 'Rudderstack', 'Snowplow',
        'Conversion Rate Optimization', 'CRO', 'Landing Page Optimization',
        'A/B Testing', 'Multivariate Testing', 'Optimizely', 'VWO', 'LaunchDarkly',
        'Growth Hacking', 'Viral Marketing', 'Referral Programs', 'Product-Led Growth',
        'Copywriting', 'Content Strategy', 'Content Creation', 'Blogging',
        'Video Marketing', 'Podcast Marketing', 'Webinar Marketing',
        'Social Media Management', 'Community Management', 'Community Building',
        'Brand Management', 'Brand Strategy', 'Corporate Communications',
        'Public Relations', 'Media Relations', 'Crisis Communications',
        'Event Marketing', 'Trade Show Marketing', 'Field Marketing',
        'Customer Acquisition', 'Customer Retention', 'Churn Reduction',
        'Lifecycle Marketing', 'CRM', 'Salesforce', 'HubSpot CRM', 'Pipedrive',

        # ─── Sales & Business Development ───
        'Sales', 'B2B Sales', 'B2C Sales', 'SaaS Sales', 'Enterprise Sales',
        'Inside Sales', 'Outside Sales', 'Field Sales', 'Channel Sales',
        'Business Development', 'Partnerships', 'Strategic Alliances',
        'Account Management', 'Key Account Management', 'Customer Success',
        'Sales Development', 'SDR', 'BDR', 'AE', 'Account Executive',
        'Lead Generation', 'Prospecting', 'Cold Calling', 'Cold Emailing',
        'Pipeline Management', 'Sales Forecasting', 'Revenue Operations',
        'Sales Enablement', 'Sales Training', 'Sales Coaching',
        'CRM', 'Salesforce', 'HubSpot', 'Pipedrive', 'ZoomInfo', 'Apollo',
        'Outreach', 'Salesloft', 'Gong', 'Chorus', 'Clari',
        'Contract Negotiation', 'Procurement', 'RFP', 'RFQ', 'SOW',
        'Revenue Recognition', 'Deal Structuring', 'Pricing Strategy',
        'Customer Onboarding', 'Upselling', 'Cross-Selling', 'Expansion Revenue',
        'NPS', 'CSAT', 'Customer Health Score', 'QBR',

        # ─── Finance & Accounting ───
        'Financial Analysis', 'Financial Modeling', 'Valuation', 'DCF Analysis',
        'Financial Reporting', 'Financial Planning', 'Budgeting', 'Forecasting',
        'Accounting', 'Bookkeeping', 'GAAP', 'IFRS', 'Audit', 'Tax',
        'Payroll', 'Accounts Payable', 'Accounts Receivable', 'General Ledger',
        'Cost Accounting', 'Management Accounting', 'Fund Accounting',
        'Investment Analysis', 'Portfolio Management', 'Risk Management',
        'Treasury Management', 'Cash Flow Management', 'Working Capital',
        'QuickBooks', 'Xero', 'NetSuite', 'SAP FI', 'Oracle Financials',
        'Excel', 'Google Sheets', 'Power BI', 'Tableau', 'Bloomberg', 'Refinitiv',
        'FP&A', 'CFO', 'Controllership', 'Internal Audit', 'External Audit',
        'IPO', 'M&A', 'Due Diligence', 'LBO', 'Private Equity', 'Venture Capital',
        'CFA', 'CPA', 'ACCA', 'CA', 'CMA', 'FRM',

        # ─── HR & People Operations ───
        'Human Resources', 'HR Management', 'People Operations', 'Talent Management',
        'Recruiting', 'Talent Acquisition', 'Sourcing', 'Employer Branding',
        'Onboarding', 'Offboarding', 'Employee Experience', 'Engagement',
        'Performance Management', 'Goal Setting', 'OKRs', 'Performance Reviews',
        'Learning & Development', 'Training', 'E-Learning', 'LMS',
        'Compensation & Benefits', 'Total Rewards', 'Equity', 'Stock Options',
        'HRIS', 'Workday', 'SAP HR', 'BambooHR', 'ADP', 'Paychex',
        'Greenhouse', 'Lever', 'Workable', 'SmartRecruiters', 'Jobvite',
        'LinkedIn Recruiter', 'Indeed', 'Glassdoor',
        'Diversity & Inclusion', 'DEI', 'DEIB', 'Culture Building',
        'Employee Relations', 'Labor Relations', 'Employment Law', 'HR Compliance',
        'Workforce Planning', 'Succession Planning', 'Organizational Design',
        'Change Management', 'Culture Transformation', 'Leadership Development',
        'Coaching', 'Mentoring', 'Team Building', 'Conflict Resolution',

        # ─── Leadership & Management ───
        'Leadership', 'Executive Leadership', 'Management', 'Team Management',
        'Engineering Management', 'Product Management', 'People Management',
        'Strategic Planning', 'Operational Excellence', 'Business Strategy',
        'Vision Setting', 'Mission Alignment', 'Culture Building',
        'Decision Making', 'Problem Solving', 'Critical Thinking', 'Systems Thinking',
        'Stakeholder Management', 'Executive Communication', 'Board Reporting',
        'Organizational Leadership', 'Cross-Functional Leadership', 'Influence',
        'Servant Leadership', 'Situational Leadership', 'Transformational Leadership',
        'Emotional Intelligence', 'EQ', 'Self-Awareness', 'Empathy',
        'Conflict Resolution', 'Negotiation', 'Facilitation', 'Mediation',
        'Coaching', 'Mentoring', 'Feedback', 'Performance Management',
        'Delegation', 'Prioritization', 'Time Management', 'Productivity',
        'Meeting Facilitation', 'Workshop Facilitation', 'Retrospectives',
        'Budget Management', 'P&L Management', 'Resource Allocation',

        # ─── Communication & Soft Skills ───
        'Communication', 'Public Speaking', 'Presentation Skills', 'Storytelling',
        'Technical Writing', 'Business Writing', 'Copywriting', 'Editing', 'Proofreading',
        'Documentation', 'API Documentation', 'User Guides', 'Release Notes',
        'Proposal Writing', 'Report Writing', 'Grant Writing', 'White Papers',
        'Active Listening', 'Feedback', 'Constructive Criticism', 'Assertiveness',
        'Interpersonal Skills', 'Relationship Building', 'Networking',
        'Cross-Cultural Communication', 'Remote Communication', 'Async Communication',
        'Slack', 'Microsoft Teams', 'Zoom', 'Google Meet', 'Loom',
        'Notion', 'Confluence', 'Coda', 'Obsidian', 'Roam Research',
        'Research Skills', 'Data Analysis', 'Problem Solving', 'Analytical Thinking',
        'Creativity', 'Innovation', 'Design Thinking', 'Systems Thinking',
        'Attention to Detail', 'Organization', 'Planning', 'Execution',
        'Adaptability', 'Resilience', 'Growth Mindset', 'Continuous Learning',
        'Collaboration', 'Teamwork', 'Team Player', 'Cross-Functional Collaboration',
        'Customer Focus', 'User Empathy', 'Customer Obsession',
        'Ownership', 'Accountability', 'Initiative', 'Proactiveness',
        'Curiosity', 'Intellectual Humility', 'Openness to Feedback',

        # ─── Education & Teaching ───
        'Teaching', 'Instruction', 'Curriculum Development', 'Course Design',
        'E-Learning Development', 'Instructional Design', 'LMS Administration',
        'Moodle', 'Canvas', 'Blackboard', 'Google Classroom', 'Kahoot', 'Quizlet',
        'Mentoring', 'Coaching', 'Tutoring', 'Academic Advising',
        'Classroom Management', 'Student Assessment', 'Grading',
        'STEM Education', 'Coding Education', 'Bootcamp Instruction',
        'Workshop Facilitation', 'Webinar Hosting', 'Online Teaching',
        'Bloom\'s Taxonomy', 'Constructivism', 'Flipped Classroom',

        # ─── Legal & Compliance ───
        'Contract Law', 'Corporate Law', 'Intellectual Property', 'Patent Law',
        'Trademark', 'Copyright', 'Trade Secret', 'Licensing',
        'Employment Law', 'Labor Law', 'GDPR', 'CCPA', 'HIPAA', 'PCI DSS',
        'SOC 2', 'ISO 27001', 'ISO 9001', 'ISO 14001', 'CMMI',
        'Regulatory Compliance', 'Risk & Compliance', 'GRC', 'AML', 'KYC',
        'Privacy Law', 'Data Protection', 'Data Governance',
        'Legal Research', 'Contract Drafting', 'Contract Negotiation',
        'Litigation Support', 'Legal Operations', 'CLM',

        # ─── Operations & Supply Chain ───
        'Operations Management', 'Supply Chain Management', 'Logistics',
        'Inventory Management', 'Demand Forecasting', 'Procurement',
        'Vendor Management', 'Supplier Relations', 'Sourcing', 'Category Management',
        'Warehouse Management', 'Distribution', 'Last-Mile Delivery',
        'ERP', 'SAP', 'Oracle ERP', 'NetSuite', 'Microsoft Dynamics',
        'Lean Manufacturing', 'Six Sigma', 'Kaizen', 'Kanban', '5S', 'TPM',
        'Quality Management', 'QA', 'QC', 'ISO 9001', 'FMEA', 'SPC',
        'Process Improvement', 'Business Process Management', 'BPM',
        'Robotic Process Automation', 'RPA', 'UiPath', 'Automation Anywhere', 'Blue Prism',

        # ─── Healthcare & Life Sciences ───
        'Healthcare IT', 'EHR', 'EMR', 'HL7', 'FHIR', 'DICOM',
        'Health Informatics', 'Clinical Data Management', 'Pharmacovigilance',
        'Clinical Trials', 'GCP', 'GLP', 'GMP', 'FDA Regulations', 'CE Marking',
        'Medical Devices', 'IVD', 'SaMD', 'ISO 13485', 'IEC 62304',
        'Genomics', 'Bioinformatics', 'NGS', 'CRISPR', 'Drug Discovery',
        'Pathology', 'Radiology', 'Telemedicine', 'Digital Health',
        'HIPAA', 'Healthcare Compliance', 'Patient Data Privacy',

        # ─── Science & Research ───
        'Research Design', 'Scientific Writing', 'Literature Review', 'Meta-Analysis',
        'Quantitative Research', 'Qualitative Research', 'Mixed Methods',
        'Statistical Analysis', 'Biostatistics', 'Econometrics', 'Psychometrics',
        'SPSS', 'SAS', 'R', 'Stata', 'MATLAB', 'Python (Research)',
        'Lab Techniques', 'PCR', 'ELISA', 'Western Blot', 'Cell Culture',
        'Flow Cytometry', 'Microscopy', 'Spectroscopy', 'Chromatography',
        'Physics', 'Chemistry', 'Biology', 'Neuroscience', 'Psychology',
        'Environmental Science', 'Climate Science', 'Geology', 'Astronomy',
        'Grant Writing', 'Ethics Approval', 'IRB', 'Peer Review',

        # ─── Customer Support ───
        'Customer Support', 'Technical Support', 'Customer Service',
        'Help Desk', 'ITSM', 'ServiceNow', 'Zendesk', 'Freshdesk',
        'Intercom', 'Drift', 'Front', 'Kustomer', 'Gladly',
        'JIRA Service Management', 'Confluence', 'Knowledge Base Management',
        'Ticketing Systems', 'SLA Management', 'Escalation Management',
        'Customer Onboarding', 'Customer Training', 'Customer Education',
        'Technical Account Management', 'Solutions Engineering',
        'Pre-Sales', 'Post-Sales', 'Professional Services',

        # ─── Languages ───
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
        'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Russian',
        'Polish', 'Czech', 'Hungarian', 'Romanian', 'Turkish', 'Greek',
        'Arabic', 'Hebrew', 'Farsi', 'Urdu', 'Hindi', 'Bengali', 'Tamil',
        'Telugu', 'Kannada', 'Marathi', 'Gujarati', 'Punjabi', 'Malayalam',
        'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Japanese', 'Korean',
        'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Tagalog',
        'Swahili', 'Zulu', 'Afrikaans',
        'Translation', 'Localization', 'Interpretation',

        # ─── Miscellaneous Technical ───
        'Linux', 'Ubuntu', 'Debian', 'CentOS', 'RHEL', 'Fedora', 'Arch Linux',
        'macOS', 'Windows Server', 'Active Directory', 'Group Policy',
        'Networking', 'TCP/IP', 'DNS', 'DHCP', 'HTTP', 'HTTPS', 'FTP', 'SSH',
        'VPN', 'SD-WAN', 'BGP', 'OSPF', 'Cisco', 'Juniper', 'Palo Alto',
        'Network Security', 'Firewall Management', 'Zero Trust Network',
        'Virtual Machines', 'VMware', 'VirtualBox', 'Hyper-V', 'KVM',
        'Storage', 'SAN', 'NAS', 'NFS', 'iSCSI', 'Ceph', 'GlusterFS',
        'Backup & Recovery', 'BCP', 'DR', 'RTO', 'RPO',
        'Monitoring', 'Observability', 'Logging', 'Tracing', 'Metrics',
        'Performance Tuning', 'Query Optimization', 'Profiling', 'Benchmarking',
        'Technical Documentation', 'System Design', 'Technical Architecture',
        'Whiteboarding', 'System Design Interviews', 'Coding Interviews',

        # ─── Emerging Technologies ───
        'Quantum Computing', 'Quantum Algorithms', 'Qiskit', 'Cirq', 'Q#',
        'Edge AI', 'TinyML', 'ONNX', 'OpenVINO', 'TensorRT', 'NVIDIA Jetson',
        'Digital Twin', 'Simulation', 'Metaverse', 'Extended Reality', 'XR',
        'Virtual Reality', 'VR', 'Augmented Reality', 'AR', 'Mixed Reality', 'MR',
        'Spatial Computing', 'Apple Vision Pro', 'Meta Quest', 'HoloLens',
        '5G', '6G', 'Edge Computing', 'Fog Computing', 'MEC',
        'Autonomous Systems', 'Robotics', 'ROS', 'ROS2', 'SLAM', 'Autonomous Driving',
        'Drone Development', 'UAV', 'UAS', 'FPV',
        'Synthetic Biology', 'Biotech', 'Nanotech', 'Advanced Materials',
        'Space Tech', 'Satellite Systems', 'CubeSat', 'LoRa', 'SDR',
        'Neuromorphic Computing', 'Photonic Computing', 'DNA Computing',
        ]
    
    def extract_inline_skills(self, work_experience: list, skill_taxonomy: list) -> list:
        """
        Scan all work experience descriptions for skills mentioned inline.
        Example: "Built REST APIs using FastAPI and PostgreSQL" -> ["FastAPI", "PostgreSQL"]
        """
        found_skills = set()
        skill_lower_map = {s.lower(): s for s in skill_taxonomy}

        for job in work_experience:
            description = job.get('description', '')
            if not description:
                continue

            desc_lower = description.lower()

            # Check each skill in taxonomy against the description text
            for skill_lower, skill_original in skill_lower_map.items():
                # Use word-boundary matching to avoid partial matches
                # e.g. "Java" should not match "JavaScript"
                pattern = r'\b' + re.escape(skill_lower) + r'\b'
                if re.search(pattern, desc_lower):
                    found_skills.add(skill_original)

        return sorted(list(found_skills))
    
    def _parse_job_experience(self, block: str) -> Optional[Dict]:
        """
        Parse a single job block into structured experience data.
        
        Args:
            block: Job block text
            
        Returns:
            Dictionary with structured job information
        """
        try:
            lines = [line.strip() for line in block.split('\n') if line.strip()]
            if not lines:
                return None
            
            experience = {
                'job_title': '',
                'company_name': '',
                'start_date': '',
                'end_date': '',
                'duration_months': 0,
                'location': None,
                'description': '',
                'skills_mentioned': []
            }
            
            # Extract job title (usually first line with title keywords)
            experience['job_title'] = self._extract_job_title(lines)
            
            # Extract company name
            experience['company_name'] = self._extract_company_name(block, experience['job_title'])
            
            # Extract dates
            start_date, end_date = self._extract_dates(block)
            experience['start_date'] = start_date
            experience['end_date'] = end_date
            
            # Calculate duration
            experience['duration_months'] = self._calculate_duration_months(start_date, end_date)
            
            # Extract location
            experience['location'] = self._extract_location(block)
            
            # Extract description
            experience['description'] = self._extract_description(block, experience['job_title'], experience['company_name'])
            
            # Extract skills from description
            experience['skills_mentioned'] = self._extract_skills_from_description(experience['description'])
            
            return experience if experience['job_title'] else None
            
        except Exception as e:
            self.logger.error(f"Error parsing job experience: {e}")
            return None
    
    def _clean_job_title(self, title: str) -> str:
        """Clean up extracted job title by removing company, location, and date info."""
        if not title:
            return title
        
        # Split on ' | ' first and take the left part
        if ' | ' in title:
            title = title.split(' | ')[0]
        
        # Then split on ',' and take the first part
        if ',' in title:
            title = title.split(',')[0]
        
        # Strip whitespace
        title = title.strip()
        
        # Remove location names and dates using regex patterns
        title = re.sub(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*', '', title).strip()
        title = re.sub(r'\b\d{4}\b.*', '', title).strip()
        title = title.rstrip(',-|').strip()
        
        # If the result is longer than 60 characters, it's probably not a clean title
        if len(title) > 60:
            return ''
        
        return title
    
    def _extract_job_title(self, lines: List[str]) -> str:
        """Extract job title from lines."""
        if not lines:
            return ''
        
        # Strategy 1: Look for line with pipe separator (common format: Title | Company | Date)
        for line in lines[:5]:  # Check first 5 lines only
            line = line.strip()
            if '|' in line:
                # Extract part before first pipe
                parts = line.split('|')
                potential_title = parts[0].strip()
                # Clean and validate
                cleaned_title = self._clean_job_title(potential_title)
                if cleaned_title and len(cleaned_title.split()) <= 6:
                    return cleaned_title
        
        # Strategy 2: Look for lines matching job title patterns
        for line in lines[:5]:
            line = line.strip()
            # Skip bullet points and very long lines
            if line.startswith('•') or line.startswith('-') or len(line.split()) > 10:
                continue
            
            # Check for patterns
            for pattern in self.job_title_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    cleaned_title = self._clean_job_title(line)
                    if cleaned_title and len(cleaned_title.split()) <= 6:
                        return cleaned_title
        
        # Strategy 3: Look for title-like lines (short, no dates, capitalized)
        for line in lines[:5]:
            line = line.strip()
            # Skip if has dates
            if re.search(r'\d{4}', line):
                continue
            # Skip if has company suffixes
            if any(suffix in line.lower() for suffix in ['inc', 'llc', 'ltd', 'corp', 'company', 'pvt', 'technologies', 'solutions']):
                continue
            # Skip bullet points
            if line.startswith('•') or line.startswith('-'):
                continue
            # Check if it's short and looks like a title
            if 2 <= len(line.split()) <= 6:
                # Check if it has title-like keywords
                title_keywords = ['engineer', 'developer', 'manager', 'director', 'analyst', 'specialist', 'consultant', 'architect', 'lead', 'senior', 'junior', 'associate', 'coordinator']
                if any(keyword in line.lower() for keyword in title_keywords):
                    cleaned_title = self._clean_job_title(line)
                    if cleaned_title:
                        return cleaned_title
        
        # Fallback: try first non-empty line
        for line in lines[:3]:
            line = line.strip()
            if line and not line.startswith('•') and not line.startswith('-'):
                cleaned_title = self._clean_job_title(line)
                if cleaned_title and 2 <= len(cleaned_title.split()) <= 8:
                    return cleaned_title
        
        return ''
    
    def _extract_company_name(self, block: str, job_title: str) -> str:
        """Extract company name from block."""
        lines = block.split('\n')
        
        # List of common city names to strip from company names
        common_cities = [
            'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
            'Remote', 'India', 'USA', 'New York', 'San Francisco', 'London'
        ]
        
        # Pattern to match: Company Name, City | Month Year - Month Year OR Company Name | Month Year - Month Year
        line_pattern = re.compile(
            r'^(.+?)(?:,\s*([A-Za-z\s]+))?\s*\|\s*(\w+\s+\d{4})\s*[-–—]\s*(\w+(?:\s+\d{4})?)',
            re.IGNORECASE
        )
        
        # First pass: handle multi-line format (company on one line, location/date on next)
        for i, line in enumerate(lines):
            line = line.strip()
            if job_title in line or not line:
                continue
            
            # Check if this looks like a company name (no dates, no bullet points)
            if not re.search(r'\d{4}', line) and not line.startswith('•') and not line.startswith('-'):
                # Check if the next line has the date pattern
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if '|' in next_line and re.search(r'\w+\s+\d{4}', next_line):
                        # This line is likely the company name
                        company = line
                        # Remove trailing city names
                        for city in common_cities:
                            if company.endswith(f' {city}'):
                                company = company[:-len(f' {city}')].strip()
                        if len(company) > 2:
                            return company
        
        # Second pass: look for lines with the pattern
        for line in lines:
            line = line.strip()
            if job_title in line:
                continue
                
            # Try the specific pattern first
            match = line_pattern.match(line)
            if match:
                company = match.group(1).strip()
                # Remove trailing city names
                for city in common_cities:
                    if company.endswith(f' {city}'):
                        company = company[:-len(f' {city}')].strip()
                if len(company) > 2:
                    return company
            
            # Fallback: take everything before the first '|' and before the last ','
            if '|' in line:
                before_pipe = line.split('|')[0].strip()
                if ',' in before_pipe:
                    parts = before_pipe.split(',')
                    # Take everything except the last part (which is likely the city)
                    company = ','.join(parts[:-1]).strip()
                else:
                    company = before_pipe
                
                # Remove trailing city names
                for city in common_cities:
                    if company.endswith(f' {city}'):
                        company = company[:-len(f' {city}')].strip()
                
                if len(company) > 2:
                    return company
        
        # Fallback to original patterns
        block_without_title = block.replace(job_title, '', 1)
        
        for pattern in self.company_patterns:
            matches = re.findall(pattern, block_without_title, re.IGNORECASE)
            if matches:
                company = matches[0].strip()
                # Clean up company name
                company = re.sub(r'[\|\-•].*$', '', company).strip()
                # Remove trailing city names
                for city in common_cities:
                    if company.endswith(f' {city}'):
                        company = company[:-len(f' {city}')].strip()
                
                # Validate: company name should be single line and reasonable length
                if '\n' not in company and 2 < len(company) < 100:
                    return company
        
        # Final fallback: try to extract from first few non-title lines
        lines = block.split('\n')
        for i, line in enumerate(lines[:5]):  # Check first 5 lines only
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Skip job title line
            if job_title and job_title in line:
                continue
            
            # Skip lines with bullet points or descriptions
            if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                continue
            
            # Skip lines that are too long (likely descriptions)
            if len(line) > 100:
                continue
            
            # Skip lines with common action verbs (these are descriptions, not company names)
            action_verbs = [
                'built', 'developed', 'created', 'managed', 'led', 'designed', 
                'implemented', 'responsible', 'worked', 'wrote', 'integrated',
                'deployed', 'maintained', 'established', 'coordinated', 'executed',
                'delivered', 'achieved', 'improved', 'optimized', 'reduced',
                'increased', 'collaborated', 'supported', 'assisted', 'conducted'
            ]
            # Check if line starts with an action verb
            line_lower = line.lower()
            if any(line_lower.startswith(verb) for verb in action_verbs):
                continue
            
            # Skip lines with dates
            if re.search(r'\d{4}', line):
                continue
            
            # Company names usually have certain indicators
            company_indicators = ['inc', 'corp', 'ltd', 'llc', 'company', 'technologies', 'systems', 'solutions', 'services', 'group']
            has_indicator = any(indicator in line_lower for indicator in company_indicators)
            
            # If line has company indicator and reasonable length, likely a company
            if has_indicator and 2 < len(line) < 100:
                company = re.sub(r'[\|\-•].*$', '', line).strip()
                if company:
                    return company
            
            # If no indicator found, check if line looks like a proper noun (Title Case)
            # and doesn't contain common description words
            words = line.split()
            if len(words) <= 6:  # Company names are usually short
                # Check if most words are capitalized (proper noun pattern)
                capitalized_words = sum(1 for w in words if w and w[0].isupper())
                if capitalized_words >= len(words) * 0.5:  # At least 50% capitalized
                    # Additional check: not a sentence (no common sentence words)
                    sentence_words = ['the', 'a', 'an', 'for', 'to', 'in', 'on', 'at', 'by', 'with']
                    if not any(word.lower() in sentence_words for word in words):
                        company = re.sub(r'[\|\-•].*$', '', line).strip()
                        if company and len(company) > 2:
                            return company
        
        return ''
    
    def _extract_dates(self, block: str) -> Tuple[str, str]:
        """Extract start and end dates from block."""
        # Try year range pattern
        matches = re.findall(self.year_range_pattern, block)
        if matches:
            start_date, end_date = matches[0]
            return self._normalize_date(start_date), self._normalize_date(end_date)
        
        # Look for pattern like "Nov 2024 - Present"
        month_year_range = re.findall(r'(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\bPresent\b|\bCurrent\b)', block, re.IGNORECASE)
        if month_year_range:
            start_date, end_date = month_year_range[0]
            return self._normalize_date(start_date), self._normalize_date(end_date)
        
        # Try individual dates
        dates = re.findall(self.single_date_pattern, block)
        if len(dates) >= 2:
            return self._normalize_date(dates[0]), self._normalize_date(dates[1])
        elif dates:
            return self._normalize_date(dates[0]), 'Present'
        
        return '', ''
    
    def _normalize_date(self, date_str: str) -> str:
        """Normalize date string to standard format."""
        if not date_str or date_str.lower() in ['present', 'current', 'now']:
            return 'Present'
        
        try:
            parsed_date = dateparse(date_str)
            if parsed_date and parsed_date.year >= 1980:
                return parsed_date.strftime('%B %Y')
        except:
            pass
        
        return date_str.strip()
    
    def _calculate_duration_months(self, start_date: str, end_date: str) -> int:
        """Calculate duration in months between start and end dates."""
        if not start_date:
            return 0
        
        try:
            start = self._parse_date(start_date)
            end = self._parse_date(end_date) if end_date.lower() != 'present' else date.today()
            
            if start and end:
                months = (end.year - start.year) * 12 + (end.month - start.month)
                return max(0, months)
        except Exception as e:
            self.logger.error(f"Error calculating duration: {e}")
            pass
        
        return 0
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse date string into date object."""
        if not date_str or date_str.lower() in ['present', 'current', 'now']:
            return None
        
        try:
            parsed_date = dateparse(date_str)
            if parsed_date and parsed_date.year >= 1980:
                return parsed_date.date()
        except:
            pass
        
        return None
    
    def _extract_location(self, block: str) -> Optional[str]:
        """Extract location from block."""
        matches = re.findall(self.location_pattern, block)
        if matches:
            # Return the most likely location (usually after company/dates)
            return matches[-1].strip()
        return None
    
    def _extract_description(self, block: str, job_title: str, company_name: str) -> str:
        """Extract job description from block."""
        # Remove job title, company, dates, and location from block
        description = block
        
        # Remove job title
        if job_title:
            description = description.replace(job_title, '', 1)
        
        # Remove company name
        if company_name:
            description = description.replace(company_name, '', 1)
        
        # Remove dates
        description = re.sub(r'\b\w+\s+\d{4}\s*[-–—]\s*(\w+\s+\d{4}|\bPresent\b|\bCurrent\b|\bNow\b)', '', description)
        description = re.sub(r'\b\d{4}\s*[-–—]\s*(\d{4}|\bPresent\b|\bCurrent\b|\bNow\b)', '', description)
        
        # Remove location patterns
        description = re.sub(self.location_pattern, '', description)
        
        # Clean up bullet points and formatting
        lines = [line.strip() for line in description.split('\n') if line.strip()]
        
        # Filter out lines that are likely titles/dates/locations
        description_lines = []
        for line in lines:
            # Skip if it looks like a title, company, or date
            if (len(line) < 10 or 
                re.search(r'(?:Engineer|Developer|Manager|Director|Analyst|Specialist|Consultant)', line, re.IGNORECASE) or
                re.search(r'\b\d{4}\b', line) or
                re.search(r'\bPresent\b|\bCurrent\b', line, re.IGNORECASE)):
                continue
            description_lines.append(line)
        
        return '\n'.join(description_lines)
    
    def _extract_skills_from_description(self, description: str) -> List[str]:
        """Extract skills mentioned in job description."""
        skills = set()
        
        # Common technology skills to look for
        tech_skills = [
            'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift',
            'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
            'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind', 'jQuery',
            'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
            'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'Linux',
            'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch', 'Scikit-learn',
            'Agile', 'Scrum', 'DevOps', 'CI/CD', 'REST API', 'GraphQL', 'Microservices',
             'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
        'Kotlin', 'Swift', 'Scala', 'Perl', 'Haskell', 'Elixir', 'Erlang', 'Clojure', 'F#', 'R',
        'MATLAB', 'Julia', 'Lua', 'Dart', 'Groovy', 'Objective-C', 'Assembly', 'COBOL', 'Fortran',
        'Ada', 'Prolog', 'Lisp', 'Scheme', 'Racket', 'OCaml', 'Crystal', 'Nim', 'Zig', 'V',
        'Solidity', 'Vyper', 'Move', 'Cairo', 'Ink!', 'Cadence', 'Clarity', 'Michelson',
        'VHDL', 'Verilog', 'SystemVerilog', 'HDL', 'FPGA Programming', 'PLC Programming',
        'ActionScript', 'CoffeeScript', 'LiveScript', 'PureScript', 'ReasonML', 'Elm',
        'Tcl', 'AWK', 'Sed', 'D', 'Modula-2', 'Pascal', 'Delphi', 'Visual Basic', 'VBScript',
        'PowerShell', 'Bash', 'Zsh', 'Fish', 'Ksh', 'Csh', 'Batch Scripting',
        'HCL', 'Jsonnet', 'Dhall', 'Nix', 'Pkl',

        # ─── Frontend Frameworks & Libraries ───
        'React', 'React.js', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Nuxt.js', 'Svelte', 'SvelteKit',
        'Ember', 'Backbone.js', 'Mithril', 'Preact', 'Inferno', 'Solid.js', 'Qwik', 'Astro',
        'Remix', 'Gatsby', 'Gridsome', 'Eleventy', 'Hugo', 'Jekyll', 'Hexo', 'VuePress',
        'Alpine.js', 'Stimulus', 'Hotwire', 'HTMX', 'Lit', 'Stencil', 'Web Components',
        'Ionic', 'Capacitor', 'Cordova', 'PhoneGap', 'Electron', 'Tauri', 'NW.js',

        # ─── Backend Frameworks ───
        'Node.js', 'Express', 'Express.js', 'Fastify', 'Koa', 'Hapi', 'NestJS', 'AdonisJS',
        'FastAPI', 'Django', 'Flask', 'Pyramid', 'Tornado', 'Sanic', 'Starlette', 'Litestar',
        'Spring Boot', 'Spring MVC', 'Spring Cloud', 'Spring Security', 'Spring Data', 'Micronaut',
        'Quarkus', 'Vert.x', 'Dropwizard', 'Play Framework', 'Ktor',
        'Laravel', 'Symfony', 'CodeIgniter', 'Yii', 'CakePHP', 'Slim', 'Lumen', 'Phalcon',
        'Ruby on Rails', 'Sinatra', 'Hanami', 'Padrino',
        'ASP.NET', 'ASP.NET Core', 'Blazor', 'Minimal API', 'MAUI',
        'Gin', 'Echo', 'Fiber', 'Chi', 'Gorilla Mux', 'Buffalo',
        'Actix', 'Axum', 'Rocket', 'Warp', 'Tide',
        'Phoenix', 'Plug', 'Absinthe', 'Ash Framework',
        'Hono', 'Elysia', 'Bun', 'Deno',

        # ─── CSS & Styling ───
        'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'Less', 'Stylus',
        'Tailwind CSS', 'Bootstrap', 'Material UI', 'MUI', 'Styled Components',
        'Chakra UI', 'Ant Design', 'Semantic UI', 'Bulma', 'Foundation', 'UIKit',
        'Radix UI', 'shadcn/ui', 'Headless UI', 'DaisyUI', 'Flowbite',
        'Emotion', 'CSS Modules', 'CSS-in-JS', 'Stitches', 'Vanilla Extract',
        'Mantine', 'NextUI', 'PrimeReact', 'PrimeNG', 'PrimeVue', 'Vuetify',
        'Quasar', 'Element UI', 'Element Plus', 'Naive UI', 'Arco Design',
        'TDesign', 'Windi CSS', 'UnoCSS', 'Open Props',
        'Web Animations API', 'GSAP', 'Framer Motion', 'Motion One', 'Anime.js', 'Three.js',
        'Lottie', 'Rive', 'Spline', 'Babylon.js', 'PlayCanvas',

        # ─── State Management ───
        'Redux', 'Redux Toolkit', 'Redux Thunk', 'Redux Saga', 'Redux Observable',
        'Zustand', 'MobX', 'Jotai', 'Recoil', 'Valtio', 'XState', 'Nanostores',
        'React Query', 'TanStack Query', 'SWR', 'Apollo Client', 'Relay',
        'Context API', 'NgRx', 'Akita', 'NGXS', 'Vuex', 'Pinia',
        'Legend State', 'Effector', 'Storeon', 'Nano Stores',

        # ─── Databases – Relational ───
        'SQL', 'MySQL', 'PostgreSQL', 'SQLite', 'MariaDB', 'Oracle Database',
        'Microsoft SQL Server', 'IBM DB2', 'Sybase', 'Teradata', 'Greenplum',
        'CockroachDB', 'YugabyteDB', 'TiDB', 'PlanetScale', 'Neon', 'Supabase',
        'Vercel Postgres', 'SingleStore', 'Citus', 'TimescaleDB',

        # ─── Databases – NoSQL ───
        'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'HBase',
        'CouchDB', 'CouchBase', 'Firebase Firestore', 'Firebase Realtime Database',
        'Neo4j', 'ArangoDB', 'OrientDB', 'JanusGraph', 'Amazon Neptune',
        'InfluxDB', 'Prometheus', 'Victoria Metrics', 'QuestDB', 'Druid',
        'Riak', 'Aerospike', 'ScyllaDB', 'Apache Ignite',
        'Fauna', 'Upstash', 'PocketBase', 'RethinkDB', 'RavenDB',
        'Realm', 'ObjectBox', 'Ditto', 'WatermelonDB', 'LevelDB', 'RocksDB',

        # ─── Search & Vector Databases ───
        'Elasticsearch', 'OpenSearch', 'Solr', 'Algolia', 'Typesense', 'Meilisearch',
        'Pinecone', 'Weaviate', 'Qdrant', 'Milvus', 'Chroma', 'FAISS', 'Annoy',
        'pgvector', 'Redis Vector', 'Vespa', 'Marqo',

        # ─── ORMs & Query Builders ───
        'Hibernate', 'JPA', 'MyBatis', 'JOOQ', 'Flyway', 'Liquibase',
        'SQLAlchemy', 'Tortoise ORM', 'Peewee', 'PonyORM', 'Django ORM',
        'Prisma', 'Drizzle ORM', 'Knex.js', 'Objection.js', 'MikroORM', 'TypeORM', 'Sequelize',
        'Active Record', 'Ecto', 'Diesel', 'SeaORM', 'GORM', 'Ent',
        'Mongoose', 'Typegoose', 'Entity Framework', 'Dapper', 'NHibernate',

        # ─── Cloud Platforms ───
        'AWS', 'Azure', 'GCP', 'Google Cloud', 'Oracle Cloud', 'IBM Cloud',
        'Alibaba Cloud', 'Tencent Cloud', 'Huawei Cloud', 'DigitalOcean',
        'Linode', 'Vultr', 'Hetzner', 'OVH', 'Scaleway',
        'Cloudflare', 'Fastly', 'Akamai', 'Vercel', 'Netlify', 'Render',
        'Railway', 'Fly.io', 'Heroku', 'Back4App', 'Supabase', 'PlanetScale',
        'Neon', 'Turso', 'Upstash', 'Deno Deploy', 'Bun Deploy',

        # ─── AWS Services ───
        'AWS Lambda', 'AWS EC2', 'AWS S3', 'AWS RDS', 'AWS DynamoDB',
        'AWS CloudFormation', 'AWS CDK', 'AWS SAM', 'AWS ECS', 'AWS EKS',
        'AWS Fargate', 'AWS Batch', 'AWS SQS', 'AWS SNS', 'AWS EventBridge',
        'AWS API Gateway', 'AWS AppSync', 'AWS Cognito', 'AWS IAM', 'AWS KMS',
        'AWS Secrets Manager', 'AWS Parameter Store', 'AWS Systems Manager',
        'AWS CloudWatch', 'AWS X-Ray', 'AWS CloudTrail', 'AWS Config',
        'AWS Route53', 'AWS CloudFront', 'AWS WAF', 'AWS Shield',
        'AWS Elastic Beanstalk', 'AWS Lightsail', 'AWS Amplify',
        'AWS Glue', 'AWS Athena', 'AWS EMR', 'AWS Redshift', 'AWS Kinesis',
        'AWS Step Functions', 'AWS AppFlow', 'AWS DataSync', 'AWS Transfer Family',
        'AWS SageMaker', 'AWS Rekognition', 'AWS Comprehend', 'AWS Textract',
        'AWS Polly', 'AWS Transcribe', 'AWS Translate', 'AWS Lex',

        # ─── Azure Services ───
        'Azure Functions', 'Azure App Service', 'Azure Cosmos DB', 'Azure DevOps',
        'Azure Blob Storage', 'Azure SQL Database', 'Azure Service Bus',
        'Azure Event Hub', 'Azure Event Grid', 'Azure Logic Apps',
        'Azure API Management', 'Azure Active Directory', 'Azure AD B2C',
        'Azure Key Vault', 'Azure Monitor', 'Azure Application Insights',
        'Azure Kubernetes Service', 'Azure Container Instances', 'Azure Container Apps',
        'Azure Static Web Apps', 'Azure CDN', 'Azure Front Door',
        'Azure Machine Learning', 'Azure Cognitive Services', 'Azure OpenAI Service',
        'Azure Databricks', 'Azure Synapse Analytics', 'Azure Data Factory',
        'Azure Stream Analytics', 'Azure HDInsight',

        # ─── GCP Services ───
        'Google Cloud Functions', 'Google App Engine', 'Google Cloud Storage', 'BigQuery',
        'Google Cloud Run', 'Google Kubernetes Engine', 'Google Cloud SQL',
        'Google Cloud Spanner', 'Google Cloud Bigtable', 'Google Cloud Firestore',
        'Google Cloud Pub/Sub', 'Google Cloud Tasks', 'Google Cloud Scheduler',
        'Google Cloud IAM', 'Google Cloud KMS', 'Google Cloud Armor',
        'Google Cloud CDN', 'Google Cloud Load Balancing',
        'Vertex AI', 'Google Cloud Vision API', 'Google Natural Language API',
        'Google Cloud Speech-to-Text', 'Google Cloud Text-to-Speech',
        'Google Cloud Translation', 'Google Dialogflow', 'Google Cloud Dataflow',
        'Google Cloud Dataproc', 'Google Cloud Composer', 'Looker',

        # ─── DevOps & Infrastructure ───
        'Docker', 'Docker Compose', 'Docker Swarm', 'Podman', 'Buildah',
        'Kubernetes', 'Helm', 'Kustomize', 'Istio', 'Linkerd', 'Envoy',
        'ArgoCD', 'Flux', 'Spinnaker', 'Harness', 'Tekton',
        'Terraform', 'Pulumi', 'AWS CDK', 'Crossplane', 'OpenTofu',
        'Ansible', 'Chef', 'Puppet', 'SaltStack', 'CFEngine',
        'Vagrant', 'Packer', 'Consul', 'Vault', 'Nomad',
        'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Travis CI',
        'Bamboo', 'TeamCity', 'Azure Pipelines', 'Bitbucket Pipelines',
        'Drone CI', 'Buildkite', 'Concourse CI', 'Woodpecker CI',
        'Nginx', 'Apache', 'Caddy', 'HAProxy', 'Traefik', 'Kong',
        'CI/CD', 'GitOps', 'Infrastructure as Code', 'Site Reliability Engineering',
        'Platform Engineering', 'FinOps', 'CloudOps', 'AIOps',
        'Prometheus', 'Grafana', 'Alertmanager', 'Loki', 'Tempo', 'Jaeger',
        'Zipkin', 'OpenTelemetry', 'Datadog', 'New Relic', 'Dynatrace',
        'Splunk', 'Elastic Stack', 'ELK Stack', 'EFK Stack',
        'PagerDuty', 'Opsgenie', 'VictorOps', 'StatusPage',
        'Chaos Engineering', 'Chaos Monkey', 'LitmusChaos', 'Gremlin',

        # ─── Version Control & Collaboration ───
        'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Azure Repos', 'AWS CodeCommit',
        'Mercurial', 'SVN', 'Perforce', 'Plastic SCM', 'Fossil',
        'GitHub Copilot', 'GitLab Duo', 'Tabnine', 'Cursor', 'Codeium',
        'Code Review', 'Pull Requests', 'Merge Requests', 'Branch Strategy',
        'Git Flow', 'GitHub Flow', 'Trunk Based Development',

        # ─── API Development ───
        'REST', 'RESTful', 'GraphQL', 'WebSocket', 'gRPC', 'tRPC', 'JSON-RPC',
        'SOAP', 'OData', 'AsyncAPI', 'OpenAPI', 'Swagger', 'Postman', 'Insomnia',
        'API Gateway', 'API Design', 'API Documentation', 'API Testing',
        'API Security', 'OAuth', 'OAuth2', 'JWT', 'SAML', 'OIDC', 'LDAP',
        'API Versioning', 'Rate Limiting', 'Throttling', 'API Monetization',
        'Webhooks', 'Server-Sent Events', 'Long Polling', 'WebRTC',

        # ─── Messaging & Event Streaming ───
        'Kafka', 'Apache Kafka', 'RabbitMQ', 'ActiveMQ', 'NATS', 'NATS JetStream',
        'Redis Pub/Sub', 'Redis Streams', 'AWS SQS', 'AWS SNS', 'AWS Kinesis',
        'Azure Service Bus', 'Azure Event Hub', 'Google Cloud Pub/Sub',
        'Pulsar', 'ZeroMQ', 'MQTT', 'AMQP', 'Stomp',
        'Kafka Streams', 'KSQL', 'Flink', 'Spark Streaming',

        # ─── Testing ───
        'Jest', 'Vitest', 'Mocha', 'Chai', 'Jasmine', 'AVA', 'Tape',
        'Pytest', 'Unittest', 'Nose2', 'Hypothesis', 'Locust',
        'JUnit', 'TestNG', 'Mockito', 'PowerMock', 'AssertJ', 'Hamcrest',
        'NUnit', 'xUnit', 'MSTest', 'SpecFlow', 'FluentAssertions',
        'RSpec', 'Minitest', 'Capybara', 'FactoryBot',
        'Cypress', 'Playwright', 'Selenium', 'WebdriverIO', 'Puppeteer',
        'TestCafe', 'Nightwatch', 'Appium', 'Detox', 'Espresso', 'XCTest',
        'React Testing Library', 'Enzyme', 'Vue Test Utils', 'Angular Testing',
        'Storybook', 'Chromatic', 'Percy', 'BackstopJS', 'Loki',
        'k6', 'JMeter', 'Gatling', 'Artillery', 'Vegeta',
        'SonarQube', 'ESLint', 'Prettier', 'Checkstyle', 'PMD', 'SpotBugs',
        'Codecov', 'Coveralls', 'Istanbul', 'NYC',
        'Test-Driven Development', 'Behavior-Driven Development', 'Acceptance Test-Driven Development',
        'Mutation Testing', 'Property-Based Testing', 'Contract Testing', 'Pact',

        # ─── Build Tools & Package Managers ───
        'Webpack', 'Vite', 'Rollup', 'Parcel', 'esbuild', 'Turbopack', 'Rspack',
        'Babel', 'SWC', 'TypeScript Compiler', 'Flow',
        'npm', 'yarn', 'pnpm', 'Bun', 'Deno',
        'Maven', 'Gradle', 'Ant', 'SBT', 'Mill', 'Bazel',
        'Make', 'CMake', 'Meson', 'Ninja', 'Buck', 'Pants',
        'Cargo', 'Mix', 'Rebar3', 'Poetry', 'PDM', 'Hatch', 'uv',
        'pip', 'conda', 'pipenv', 'virtualenv',
        'NuGet', 'Paket', 'Composer', 'Bundler', 'CocoaPods', 'SPM',
        'Turborepo', 'Nx', 'Lerna', 'Rush', 'Moon',

        # ─── Security ───
        'Application Security', 'Web Application Security', 'API Security',
        'OAuth', 'OAuth2', 'JWT', 'SAML', 'OIDC', 'Kerberos', 'LDAP', 'Active Directory',
        'SSL', 'TLS', 'mTLS', 'PKI', 'Certificates', 'Let\'s Encrypt',
        'OWASP', 'Penetration Testing', 'Vulnerability Assessment', 'Security Auditing',
        'SAST', 'DAST', 'IAST', 'RASP', 'SCA',
        'Snyk', 'Checkmarx', 'Veracode', 'Fortify', 'SonarQube',
        'Nmap', 'Metasploit', 'Burp Suite', 'OWASP ZAP', 'Wireshark',
        'Nessus', 'Qualys', 'Rapid7', 'Tenable',
        'Zero Trust', 'Zero Trust Architecture', 'Privileged Access Management',
        'Identity and Access Management', 'IAM', 'PAM', 'SIEM', 'SOC',
        'Incident Response', 'Threat Modeling', 'Risk Assessment',
        'Cryptography', 'Encryption', 'Hashing', 'Digital Signatures',
        'Key Management', 'Hardware Security Module', 'HSM',
        'DevSecOps', 'Shift Left Security', 'Supply Chain Security',
        'SBOM', 'Compliance', 'GDPR', 'HIPAA', 'PCI DSS', 'SOC 2', 'ISO 27001',
        'Firewall', 'IDS', 'IPS', 'WAF', 'DDoS Protection',
        'Reverse Engineering', 'Malware Analysis', 'Forensics', 'OSINT',
        'Bug Bounty', 'Red Team', 'Blue Team', 'Purple Team', 'CTF',

        # ─── Machine Learning & AI ───
        'Machine Learning', 'Deep Learning', 'Neural Networks', 'AI', 'Artificial Intelligence',
        'TensorFlow', 'PyTorch', 'Keras', 'JAX', 'MXNet', 'Paddle Paddle',
        'Scikit-learn', 'XGBoost', 'LightGBM', 'CatBoost', 'H2O', 'AutoML',
        'NLP', 'Natural Language Processing', 'Computer Vision', 'Speech Recognition',
        'Object Detection', 'Image Segmentation', 'Image Classification',
        'YOLO', 'Detectron2', 'MMDetection', 'Torchvision',
        'Hugging Face', 'Transformers', 'BERT', 'GPT', 'T5', 'RoBERTa',
        'LLM', 'Large Language Models', 'Foundation Models', 'Multimodal AI',
        'LangChain', 'LlamaIndex', 'Semantic Kernel', 'AutoGen', 'CrewAI',
        'OpenAI API', 'Anthropic API', 'Gemini API', 'Cohere API', 'Mistral AI',
        'LLM Fine-Tuning', 'RLHF', 'LoRA', 'QLoRA', 'PEFT', 'DPO',
        'RAG', 'Retrieval-Augmented Generation', 'Agentic AI', 'AI Agents',
        'Prompt Engineering', 'Few-Shot Learning', 'Zero-Shot Learning',
        'Transfer Learning', 'Federated Learning', 'Continual Learning',
        'Reinforcement Learning', 'Q-Learning', 'PPO', 'SAC', 'DDPG',
        'Stable Baselines', 'OpenAI Gym', 'Ray RLlib',
        'Generative AI', 'Diffusion Models', 'GANs', 'VAEs',
        'Stable Diffusion', 'Midjourney API', 'DALL-E', 'ControlNet',
        'MLflow', 'Weights & Biases', 'DVC', 'ClearML', 'Comet ML',
        'Kubeflow', 'MLOps', 'LLMOps', 'Model Monitoring', 'Model Serving',
        'BentoML', 'Seldon', 'KServe', 'TorchServe', 'TFServing', 'Triton',
        'Feature Engineering', 'Feature Store', 'Feast', 'Tecton', 'Hopsworks',
        'Data Preprocessing', 'Data Augmentation', 'Imbalanced Learning',
        'Dimensionality Reduction', 'PCA', 't-SNE', 'UMAP',
        'Clustering', 'Classification', 'Regression', 'Anomaly Detection',
        'Time Series Analysis', 'Forecasting', 'Prophet', 'ARIMA',
        'Recommendation Systems', 'Collaborative Filtering', 'Matrix Factorization',
        'Graph Neural Networks', 'GNN', 'Knowledge Graphs',
        'Explainable AI', 'XAI', 'SHAP', 'LIME', 'Captum',
        'AI Ethics', 'Responsible AI', 'Fairness in AI', 'Bias Detection',
        'Synthetic Data', 'Data Labeling', 'Annotation', 'Label Studio', 'CVAT',
        'OpenCV', 'PIL', 'Pillow', 'scikit-image', 'Albumentations',
        'NLTK', 'spaCy', 'Gensim', 'FastText', 'Sentence Transformers',
        'Speech Recognition', 'Whisper', 'TTS', 'Text-to-Speech',
        'Audio Processing', 'Librosa', 'torchaudio', 'SoundFile',
        'Simulation', 'Digital Twin', 'Isaac Sim', 'Mujoco',

        # ─── Data Engineering & Analytics ───
        'Data Engineering', 'Data Pipelines', 'ETL', 'ELT', 'Data Warehousing',
        'Pandas', 'NumPy', 'Polars', 'Dask', 'Vaex', 'Modin',
        'Matplotlib', 'Seaborn', 'Plotly', 'Bokeh', 'Altair', 'Vega',
        'Tableau', 'Power BI', 'Looker', 'Metabase', 'Superset', 'Redash',
        'Apache Spark', 'Apache Flink', 'Apache Beam', 'Apache Storm',
        'Hadoop', 'HDFS', 'MapReduce', 'Hive', 'HBase', 'Pig', 'Sqoop',
        'Airflow', 'Prefect', 'Dagster', 'Mage', 'Kedro', 'Luigi',
        'dbt', 'Great Expectations', 'Soda', 'Monte Carlo', 'Atlan',
        'Redshift', 'Snowflake', 'BigQuery', 'Databricks', 'Synapse',
        'Delta Lake', 'Apache Iceberg', 'Apache Hudi', 'Apache Parquet',
        'Apache ORC', 'Apache Avro', 'Apache Arrow',
        'Kafka', 'Kinesis', 'Flink', 'Spark Streaming', 'Storm',
        'Data Governance', 'Data Catalog', 'Data Lineage', 'Data Quality',
        'DataOps', 'Analytics Engineering', 'Data Mesh', 'Data Lakehouse',
        'Excel', 'Google Sheets', 'Jupyter Notebook', 'JupyterLab', 'Zeppelin',
        'R Studio', 'KNIME', 'RapidMiner', 'SAS', 'SPSS', 'Stata',
        'Data Modeling', 'Star Schema', 'Snowflake Schema', 'Data Vault',
        'Business Intelligence', 'OLAP', 'OLTP', 'Data Lake', 'Data Lakehouse',

        # ─── Mobile Development ───
        'React Native', 'Flutter', 'Expo', 'NativeScript', 'Xamarin',
        'Android', 'iOS', 'Swift', 'SwiftUI', 'UIKit', 'Objective-C',
        'Kotlin', 'Jetpack Compose', 'Android SDK', 'Android NDK',
        'Cross-Platform Development', 'Hybrid App Development',
        'Mobile App Architecture', 'MVVM', 'MVI', 'MVP', 'MVC',
        'Core Data', 'Core Location', 'ARKit', 'RealityKit', 'SceneKit',
        'Metal', 'SpriteKit', 'GameplayKit', 'Core ML', 'Create ML',
        'Jetpack', 'Room', 'Hilt', 'WorkManager', 'Navigation Component',
        'Firebase', 'OneSignal', 'Braze', 'Amplitude', 'Mixpanel',
        'App Store', 'Google Play', 'TestFlight', 'Fastlane',
        'Mobile Security', 'Certificate Pinning', 'Obfuscation',
        'App Performance', 'ANR', 'Crash Reporting', 'App Analytics',
        'Push Notifications', 'Deep Linking', 'Universal Links',
        'Mobile Payments', 'Apple Pay', 'Google Pay', 'In-App Purchases',
        'Augmented Reality', 'ARCore', 'ARKit', 'Mixed Reality', 'VR Development',

        # ─── Game Development ───
        'Unity', 'Unreal Engine', 'Godot', 'CryEngine', 'GameMaker',
        'C# (Unity)', 'C++ (Unreal)', 'GDScript', 'Lua (Gaming)',
        'OpenGL', 'DirectX', 'Vulkan', 'Metal', 'WebGL', 'WebGPU',
        'Pygame', 'Arcade', 'Raylib', 'SDL', 'SFML', 'LÖVE',
        'Phaser', 'PixiJS', 'BabylonJS', 'PlayCanvas', 'Three.js',
        'Game Design', 'Level Design', 'Game Mechanics', 'Game Economy',
        'Game AI', 'Pathfinding', 'Behavior Trees', 'State Machines',
        'Physics Engines', 'Box2D', 'Bullet Physics', 'Havok', 'NVIDIA PhysX',
        'Animation', 'Rigging', 'Skinning', 'Shader Programming', 'HLSL', 'GLSL',
        'Multiplayer', 'Netcode', 'Game Server', 'ENet', 'Mirror', 'Photon',
        'Steam API', 'Epic Online Services', 'Xbox Live', 'PlayStation Network',
        'Localization', 'Monetization', 'In-App Purchases', 'Ads Integration',
        'Performance Optimization', 'Profiling', 'GPU Optimization',
        'VR Development', 'AR Development', 'XR Development',
        'Blender', 'Maya', '3ds Max', 'Cinema 4D', 'ZBrush', 'Substance Painter',

        # ─── Embedded & Systems ───
        'Embedded Systems', 'RTOS', 'FreeRTOS', 'Zephyr', 'VxWorks', 'QNX',
        'Arduino', 'Raspberry Pi', 'ESP32', 'STM32', 'PIC', 'AVR',
        'C (Embedded)', 'C++ (Embedded)', 'Rust (Embedded)', 'Assembly',
        'UART', 'SPI', 'I2C', 'CAN', 'Modbus', 'Profibus',
        'FPGA', 'VHDL', 'Verilog', 'Xilinx', 'Intel FPGA', 'Lattice',
        'Bare Metal Programming', 'Device Drivers', 'BSP', 'HAL',
        'IoT', 'Internet of Things', 'Edge Computing', 'Fog Computing',
        'MQTT', 'CoAP', 'Zigbee', 'Z-Wave', 'LoRa', 'LoRaWAN', 'Thread',
        'Matter', 'Bluetooth', 'BLE', 'WiFi', 'NFC', 'RFID',
        'Automotive', 'AUTOSAR', 'CAN Bus', 'LIN', 'FlexRay', 'Ethernet AVB',
        'ADAS', 'Functional Safety', 'ISO 26262', 'MISRA C',
        'Industrial IoT', 'SCADA', 'PLC', 'HMI', 'OPC UA',
        'Linux Kernel', 'Linux Device Drivers', 'Yocto', 'Buildroot',
        'Bootloader', 'U-Boot', 'GRUB', 'UEFI', 'BIOS',
        'Memory Management', 'DMA', 'Interrupt Handling', 'Real-Time Systems',

        # ─── Blockchain & Web3 ───
        'Blockchain', 'Web3', 'DeFi', 'NFT', 'DAO', 'DApp', 'Smart Contracts',
        'Solidity', 'Vyper', 'Move', 'Cairo', 'Ink!', 'Rust (Solana)',
        'Ethereum', 'Solana', 'Polygon', 'Avalanche', 'BNB Chain', 'Arbitrum',
        'Optimism', 'Base', 'zkSync', 'StarkNet', 'TON', 'Near', 'Cosmos',
        'Bitcoin', 'Lightning Network', 'Taproot', 'Script',
        'Hardhat', 'Foundry', 'Truffle', 'Brownie', 'Anchor', 'Scaffold-ETH',
        'OpenZeppelin', 'Chainlink', 'The Graph', 'IPFS', 'Arweave', 'Ceramic',
        'ethers.js', 'web3.js', 'viem', 'wagmi', 'RainbowKit', 'ConnectKit',
        'MetaMask', 'WalletConnect', 'Safe', 'Account Abstraction', 'ERC-4337',
        'ERC-20', 'ERC-721', 'ERC-1155', 'ERC-4626', 'EIP-1559',
        'AMM', 'Uniswap', 'Curve', 'Balancer', 'Aave', 'Compound', 'MakerDAO',
        'Layer 2', 'Rollups', 'Optimistic Rollups', 'ZK Rollups', 'State Channels',
        'Consensus Algorithms', 'PoW', 'PoS', 'DPoS', 'BFT', 'Tendermint',
        'Tokenomics', 'Staking', 'Yield Farming', 'Liquidity Mining',
        'Cryptography', 'ZK Proofs', 'zk-SNARKs', 'zk-STARKs', 'MPC', 'TSS',
        'Blockchain Analytics', 'On-Chain Analysis', 'MEV', 'Flash Loans',

        # ─── Architecture & Design Patterns ───
        'Microservices', 'Serverless', 'Event-Driven Architecture',
        'CQRS', 'Event Sourcing', 'Saga Pattern', 'Outbox Pattern',
        'Domain-Driven Design', 'DDD', 'Hexagonal Architecture', 'Clean Architecture',
        'Onion Architecture', 'SOLID Principles', 'Design Patterns', 'GoF Patterns',
        'Monolithic Architecture', 'SOA', 'Service Mesh', 'BFF Pattern',
        'API Gateway Pattern', 'Strangler Fig Pattern', 'Anti-Corruption Layer',
        'Reactive Systems', 'Actor Model', 'CSP', 'Reactive Streams',
        'Repository Pattern', 'Factory Pattern', 'Observer Pattern', 'Strategy Pattern',
        'MVC', 'MVVM', 'MVP', 'MVI', 'Flux', 'Redux Pattern',
        'Database Sharding', 'Read Replicas', 'CQRS', 'Polyglot Persistence',
        'Distributed Systems', 'CAP Theorem', 'Eventual Consistency',
        'Load Balancing', 'Circuit Breaker', 'Bulkhead', 'Retry Pattern',
        'Rate Limiting', 'Throttling', 'Backpressure',
        'High Availability', 'Fault Tolerance', 'Disaster Recovery',
        'Blue-Green Deployment', 'Canary Deployment', 'Feature Flags',
        'Twelve-Factor App', 'Cloud Native', 'Edge Computing',
        'Modular Monolith', 'Micro-Frontend', 'Module Federation',

        # ─── Software Development Methodologies ───
        'Agile', 'Scrum', 'Kanban', 'Lean', 'XP', 'SAFe', 'LeSS', 'Scrum@Scale',
        'Waterfall', 'Spiral', 'RAD', 'Prototyping', 'Incremental Development',
        'Test-Driven Development', 'Behavior-Driven Development', 'Domain-Driven Design',
        'Continuous Integration', 'Continuous Deployment', 'Continuous Delivery',
        'DevOps', 'DevSecOps', 'DataOps', 'MLOps', 'FinOps', 'GitOps',
        'Pair Programming', 'Mob Programming', 'Code Review', 'Refactoring',
        'Technical Debt Management', 'Legacy System Modernization',
        'Trunk Based Development', 'Feature Branch Workflow', 'Release Management',
        'Sprint Planning', 'Backlog Grooming', 'Retrospectives', 'Daily Standup',
        'Sprint Review', 'Velocity', 'Story Points', 'Burn Down Chart',
        'Velocity Chart', 'Cumulative Flow Diagram', 'Cycle Time', 'Lead Time',

        # ─── Project & Product Management ───
        'Product Management', 'Project Management', 'Program Management', 'Portfolio Management',
        'Product Strategy', 'Product Roadmap', 'Product Vision', 'Product Discovery',
        'Product-Led Growth', 'Growth Hacking', 'OKRs', 'KPIs', 'Metrics',
        'A/B Testing', 'Experimentation', 'Feature Prioritization', 'MVP',
        'Product Analytics', 'Cohort Analysis', 'Funnel Analysis', 'Retention',
        'User Research', 'User Interviews', 'Surveys', 'Usability Testing',
        'Competitive Analysis', 'Market Research', 'Go-to-Market Strategy',
        'Roadmapping', 'Story Mapping', 'Impact Mapping', 'Job-to-be-Done',
        'Stakeholder Management', 'Executive Communication', 'Product Metrics',
        'Jira', 'Confluence', 'Asana', 'Trello', 'Monday.com', 'Notion',
        'Linear', 'Height', 'Shortcut', 'ClickUp', 'Basecamp',
        'Figma', 'FigJam', 'Miro', 'Mural', 'Lucidchart', 'Whimsical',
        'PMP', 'PRINCE2', 'PMI', 'Six Sigma', 'ITIL', 'COBIT',
        'Risk Management', 'Change Management', 'Crisis Management',
        'Budget Management', 'Resource Planning', 'Capacity Planning',
        'Vendor Management', 'Contract Management', 'SLA Management',

        # ─── UI/UX Design ───
        'UI Design', 'UX Design', 'Product Design', 'Service Design', 'Design Thinking',
        'Interaction Design', 'Visual Design', 'Information Architecture', 'Content Design',
        'User Research', 'Usability Testing', 'A/B Testing', 'Eye Tracking',
        'Wireframing', 'Prototyping', 'Mockups', 'User Flows', 'Customer Journey Maps',
        'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Zeplin', 'Marvel', 'Axure',
        'Framer', 'Webflow', 'Wix', 'Squarespace', 'Readymag',
        'Adobe Creative Suite', 'Photoshop', 'Illustrator', 'After Effects',
        'InDesign', 'Lightroom', 'Premiere Pro', 'Audition', 'Animate',
        'Affinity Designer', 'Affinity Photo', 'Affinity Publisher',
        'Canva', 'Penpot', 'Lunacy', 'Origami Studio',
        'Design Systems', 'Storybook', 'Chromatic', 'Zeroheight', 'Supernova',
        'Accessibility', 'WCAG', 'ADA Compliance', 'ARIA', 'Screen Readers',
        'Color Theory', 'Typography', 'Grid Systems', 'Responsive Design',
        'Mobile-First Design', 'Dark Mode', 'Micro-interactions',
        'Motion Design', 'Animation', 'Lottie', 'Rive', 'Principle',
        'Brand Design', 'Brand Identity', 'Logo Design', 'Graphic Design',
        'Icon Design', 'Illustration', 'Infographic Design', 'Data Visualization',
        '3D Design', 'Blender', 'Cinema 4D', 'KeyShot', 'Rhino', 'Fusion 360',
        'User Psychology', 'Cognitive Biases', 'Persuasion Design', 'Gamification',
        'Heuristic Evaluation', 'Contextual Inquiry', 'Card Sorting',
        'Tree Testing', 'First Click Testing', 'Preference Testing',

        # ─── Marketing & Growth ───
        'Digital Marketing', 'Content Marketing', 'Social Media Marketing', 'Email Marketing',
        'Influencer Marketing', 'Affiliate Marketing', 'Performance Marketing',
        'SEO', 'Technical SEO', 'On-Page SEO', 'Off-Page SEO', 'Local SEO',
        'SEM', 'PPC', 'Google Ads', 'Facebook Ads', 'Instagram Ads', 'LinkedIn Ads',
        'Twitter Ads', 'TikTok Ads', 'Pinterest Ads', 'Programmatic Advertising',
        'Google Analytics', 'Google Analytics 4', 'Google Tag Manager',
        'Google Search Console', 'Bing Webmaster Tools', 'Google Merchant Center',
        'HubSpot', 'Marketo', 'Pardot', 'Salesforce Marketing Cloud', 'Braze',
        'Mailchimp', 'Klaviyo', 'SendGrid', 'Iterable', 'Customer.io',
        'SEMrush', 'Ahrefs', 'Moz', 'Majestic', 'Screaming Frog',
        'Hotjar', 'FullStory', 'Heap', 'Amplitude', 'Mixpanel',
        'Segment', 'mParticle', 'Rudderstack', 'Snowplow',
        'Conversion Rate Optimization', 'CRO', 'Landing Page Optimization',
        'A/B Testing', 'Multivariate Testing', 'Optimizely', 'VWO', 'LaunchDarkly',
        'Growth Hacking', 'Viral Marketing', 'Referral Programs', 'Product-Led Growth',
        'Copywriting', 'Content Strategy', 'Content Creation', 'Blogging',
        'Video Marketing', 'Podcast Marketing', 'Webinar Marketing',
        'Social Media Management', 'Community Management', 'Community Building',
        'Brand Management', 'Brand Strategy', 'Corporate Communications',
        'Public Relations', 'Media Relations', 'Crisis Communications',
        'Event Marketing', 'Trade Show Marketing', 'Field Marketing',
        'Customer Acquisition', 'Customer Retention', 'Churn Reduction',
        'Lifecycle Marketing', 'CRM', 'Salesforce', 'HubSpot CRM', 'Pipedrive',

        # ─── Sales & Business Development ───
        'Sales', 'B2B Sales', 'B2C Sales', 'SaaS Sales', 'Enterprise Sales',
        'Inside Sales', 'Outside Sales', 'Field Sales', 'Channel Sales',
        'Business Development', 'Partnerships', 'Strategic Alliances',
        'Account Management', 'Key Account Management', 'Customer Success',
        'Sales Development', 'SDR', 'BDR', 'AE', 'Account Executive',
        'Lead Generation', 'Prospecting', 'Cold Calling', 'Cold Emailing',
        'Pipeline Management', 'Sales Forecasting', 'Revenue Operations',
        'Sales Enablement', 'Sales Training', 'Sales Coaching',
        'CRM', 'Salesforce', 'HubSpot', 'Pipedrive', 'ZoomInfo', 'Apollo',
        'Outreach', 'Salesloft', 'Gong', 'Chorus', 'Clari',
        'Contract Negotiation', 'Procurement', 'RFP', 'RFQ', 'SOW',
        'Revenue Recognition', 'Deal Structuring', 'Pricing Strategy',
        'Customer Onboarding', 'Upselling', 'Cross-Selling', 'Expansion Revenue',
        'NPS', 'CSAT', 'Customer Health Score', 'QBR',

        # ─── Finance & Accounting ───
        'Financial Analysis', 'Financial Modeling', 'Valuation', 'DCF Analysis',
        'Financial Reporting', 'Financial Planning', 'Budgeting', 'Forecasting',
        'Accounting', 'Bookkeeping', 'GAAP', 'IFRS', 'Audit', 'Tax',
        'Payroll', 'Accounts Payable', 'Accounts Receivable', 'General Ledger',
        'Cost Accounting', 'Management Accounting', 'Fund Accounting',
        'Investment Analysis', 'Portfolio Management', 'Risk Management',
        'Treasury Management', 'Cash Flow Management', 'Working Capital',
        'QuickBooks', 'Xero', 'NetSuite', 'SAP FI', 'Oracle Financials',
        'Excel', 'Google Sheets', 'Power BI', 'Tableau', 'Bloomberg', 'Refinitiv',
        'FP&A', 'CFO', 'Controllership', 'Internal Audit', 'External Audit',
        'IPO', 'M&A', 'Due Diligence', 'LBO', 'Private Equity', 'Venture Capital',
        'CFA', 'CPA', 'ACCA', 'CA', 'CMA', 'FRM',

        # ─── HR & People Operations ───
        'Human Resources', 'HR Management', 'People Operations', 'Talent Management',
        'Recruiting', 'Talent Acquisition', 'Sourcing', 'Employer Branding',
        'Onboarding', 'Offboarding', 'Employee Experience', 'Engagement',
        'Performance Management', 'Goal Setting', 'OKRs', 'Performance Reviews',
        'Learning & Development', 'Training', 'E-Learning', 'LMS',
        'Compensation & Benefits', 'Total Rewards', 'Equity', 'Stock Options',
        'HRIS', 'Workday', 'SAP HR', 'BambooHR', 'ADP', 'Paychex',
        'Greenhouse', 'Lever', 'Workable', 'SmartRecruiters', 'Jobvite',
        'LinkedIn Recruiter', 'Indeed', 'Glassdoor',
        'Diversity & Inclusion', 'DEI', 'DEIB', 'Culture Building',
        'Employee Relations', 'Labor Relations', 'Employment Law', 'HR Compliance',
        'Workforce Planning', 'Succession Planning', 'Organizational Design',
        'Change Management', 'Culture Transformation', 'Leadership Development',
        'Coaching', 'Mentoring', 'Team Building', 'Conflict Resolution',

        # ─── Leadership & Management ───
        'Leadership', 'Executive Leadership', 'Management', 'Team Management',
        'Engineering Management', 'Product Management', 'People Management',
        'Strategic Planning', 'Operational Excellence', 'Business Strategy',
        'Vision Setting', 'Mission Alignment', 'Culture Building',
        'Decision Making', 'Problem Solving', 'Critical Thinking', 'Systems Thinking',
        'Stakeholder Management', 'Executive Communication', 'Board Reporting',
        'Organizational Leadership', 'Cross-Functional Leadership', 'Influence',
        'Servant Leadership', 'Situational Leadership', 'Transformational Leadership',
        'Emotional Intelligence', 'EQ', 'Self-Awareness', 'Empathy',
        'Conflict Resolution', 'Negotiation', 'Facilitation', 'Mediation',
        'Coaching', 'Mentoring', 'Feedback', 'Performance Management',
        'Delegation', 'Prioritization', 'Time Management', 'Productivity',
        'Meeting Facilitation', 'Workshop Facilitation', 'Retrospectives',
        'Budget Management', 'P&L Management', 'Resource Allocation',

        # ─── Communication & Soft Skills ───
        'Communication', 'Public Speaking', 'Presentation Skills', 'Storytelling',
        'Technical Writing', 'Business Writing', 'Copywriting', 'Editing', 'Proofreading',
        'Documentation', 'API Documentation', 'User Guides', 'Release Notes',
        'Proposal Writing', 'Report Writing', 'Grant Writing', 'White Papers',
        'Active Listening', 'Feedback', 'Constructive Criticism', 'Assertiveness',
        'Interpersonal Skills', 'Relationship Building', 'Networking',
        'Cross-Cultural Communication', 'Remote Communication', 'Async Communication',
        'Slack', 'Microsoft Teams', 'Zoom', 'Google Meet', 'Loom',
        'Notion', 'Confluence', 'Coda', 'Obsidian', 'Roam Research',
        'Research Skills', 'Data Analysis', 'Problem Solving', 'Analytical Thinking',
        'Creativity', 'Innovation', 'Design Thinking', 'Systems Thinking',
        'Attention to Detail', 'Organization', 'Planning', 'Execution',
        'Adaptability', 'Resilience', 'Growth Mindset', 'Continuous Learning',
        'Collaboration', 'Teamwork', 'Team Player', 'Cross-Functional Collaboration',
        'Customer Focus', 'User Empathy', 'Customer Obsession',
        'Ownership', 'Accountability', 'Initiative', 'Proactiveness',
        'Curiosity', 'Intellectual Humility', 'Openness to Feedback',

        # ─── Education & Teaching ───
        'Teaching', 'Instruction', 'Curriculum Development', 'Course Design',
        'E-Learning Development', 'Instructional Design', 'LMS Administration',
        'Moodle', 'Canvas', 'Blackboard', 'Google Classroom', 'Kahoot', 'Quizlet',
        'Mentoring', 'Coaching', 'Tutoring', 'Academic Advising',
        'Classroom Management', 'Student Assessment', 'Grading',
        'STEM Education', 'Coding Education', 'Bootcamp Instruction',
        'Workshop Facilitation', 'Webinar Hosting', 'Online Teaching',
        'Bloom\'s Taxonomy', 'Constructivism', 'Flipped Classroom',

        # ─── Legal & Compliance ───
        'Contract Law', 'Corporate Law', 'Intellectual Property', 'Patent Law',
        'Trademark', 'Copyright', 'Trade Secret', 'Licensing',
        'Employment Law', 'Labor Law', 'GDPR', 'CCPA', 'HIPAA', 'PCI DSS',
        'SOC 2', 'ISO 27001', 'ISO 9001', 'ISO 14001', 'CMMI',
        'Regulatory Compliance', 'Risk & Compliance', 'GRC', 'AML', 'KYC',
        'Privacy Law', 'Data Protection', 'Data Governance',
        'Legal Research', 'Contract Drafting', 'Contract Negotiation',
        'Litigation Support', 'Legal Operations', 'CLM',

        # ─── Operations & Supply Chain ───
        'Operations Management', 'Supply Chain Management', 'Logistics',
        'Inventory Management', 'Demand Forecasting', 'Procurement',
        'Vendor Management', 'Supplier Relations', 'Sourcing', 'Category Management',
        'Warehouse Management', 'Distribution', 'Last-Mile Delivery',
        'ERP', 'SAP', 'Oracle ERP', 'NetSuite', 'Microsoft Dynamics',
        'Lean Manufacturing', 'Six Sigma', 'Kaizen', 'Kanban', '5S', 'TPM',
        'Quality Management', 'QA', 'QC', 'ISO 9001', 'FMEA', 'SPC',
        'Process Improvement', 'Business Process Management', 'BPM',
        'Robotic Process Automation', 'RPA', 'UiPath', 'Automation Anywhere', 'Blue Prism',

        # ─── Healthcare & Life Sciences ───
        'Healthcare IT', 'EHR', 'EMR', 'HL7', 'FHIR', 'DICOM',
        'Health Informatics', 'Clinical Data Management', 'Pharmacovigilance',
        'Clinical Trials', 'GCP', 'GLP', 'GMP', 'FDA Regulations', 'CE Marking',
        'Medical Devices', 'IVD', 'SaMD', 'ISO 13485', 'IEC 62304',
        'Genomics', 'Bioinformatics', 'NGS', 'CRISPR', 'Drug Discovery',
        'Pathology', 'Radiology', 'Telemedicine', 'Digital Health',
        'HIPAA', 'Healthcare Compliance', 'Patient Data Privacy',

        # ─── Science & Research ───
        'Research Design', 'Scientific Writing', 'Literature Review', 'Meta-Analysis',
        'Quantitative Research', 'Qualitative Research', 'Mixed Methods',
        'Statistical Analysis', 'Biostatistics', 'Econometrics', 'Psychometrics',
        'SPSS', 'SAS', 'R', 'Stata', 'MATLAB', 'Python (Research)',
        'Lab Techniques', 'PCR', 'ELISA', 'Western Blot', 'Cell Culture',
        'Flow Cytometry', 'Microscopy', 'Spectroscopy', 'Chromatography',
        'Physics', 'Chemistry', 'Biology', 'Neuroscience', 'Psychology',
        'Environmental Science', 'Climate Science', 'Geology', 'Astronomy',
        'Grant Writing', 'Ethics Approval', 'IRB', 'Peer Review',

        # ─── Customer Support ───
        'Customer Support', 'Technical Support', 'Customer Service',
        'Help Desk', 'ITSM', 'ServiceNow', 'Zendesk', 'Freshdesk',
        'Intercom', 'Drift', 'Front', 'Kustomer', 'Gladly',
        'JIRA Service Management', 'Confluence', 'Knowledge Base Management',
        'Ticketing Systems', 'SLA Management', 'Escalation Management',
        'Customer Onboarding', 'Customer Training', 'Customer Education',
        'Technical Account Management', 'Solutions Engineering',
        'Pre-Sales', 'Post-Sales', 'Professional Services',

        # ─── Languages ───
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
        'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Russian',
        'Polish', 'Czech', 'Hungarian', 'Romanian', 'Turkish', 'Greek',
        'Arabic', 'Hebrew', 'Farsi', 'Urdu', 'Hindi', 'Bengali', 'Tamil',
        'Telugu', 'Kannada', 'Marathi', 'Gujarati', 'Punjabi', 'Malayalam',
        'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Japanese', 'Korean',
        'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Tagalog',
        'Swahili', 'Zulu', 'Afrikaans',
        'Translation', 'Localization', 'Interpretation',

        # ─── Miscellaneous Technical ───
        'Linux', 'Ubuntu', 'Debian', 'CentOS', 'RHEL', 'Fedora', 'Arch Linux',
        'macOS', 'Windows Server', 'Active Directory', 'Group Policy',
        'Networking', 'TCP/IP', 'DNS', 'DHCP', 'HTTP', 'HTTPS', 'FTP', 'SSH',
        'VPN', 'SD-WAN', 'BGP', 'OSPF', 'Cisco', 'Juniper', 'Palo Alto',
        'Network Security', 'Firewall Management', 'Zero Trust Network',
        'Virtual Machines', 'VMware', 'VirtualBox', 'Hyper-V', 'KVM',
        'Storage', 'SAN', 'NAS', 'NFS', 'iSCSI', 'Ceph', 'GlusterFS',
        'Backup & Recovery', 'BCP', 'DR', 'RTO', 'RPO',
        'Monitoring', 'Observability', 'Logging', 'Tracing', 'Metrics',
        'Performance Tuning', 'Query Optimization', 'Profiling', 'Benchmarking',
        'Technical Documentation', 'System Design', 'Technical Architecture',
        'Whiteboarding', 'System Design Interviews', 'Coding Interviews',

        # ─── Emerging Technologies ───
        'Quantum Computing', 'Quantum Algorithms', 'Qiskit', 'Cirq', 'Q#',
        'Edge AI', 'TinyML', 'ONNX', 'OpenVINO', 'TensorRT', 'NVIDIA Jetson',
        'Digital Twin', 'Simulation', 'Metaverse', 'Extended Reality', 'XR',
        'Virtual Reality', 'VR', 'Augmented Reality', 'AR', 'Mixed Reality', 'MR',
        'Spatial Computing', 'Apple Vision Pro', 'Meta Quest', 'HoloLens',
        '5G', '6G', 'Edge Computing', 'Fog Computing', 'MEC',
        'Autonomous Systems', 'Robotics', 'ROS', 'ROS2', 'SLAM', 'Autonomous Driving',
        'Drone Development', 'UAV', 'UAS', 'FPV',
        'Synthetic Biology', 'Biotech', 'Nanotech', 'Advanced Materials',
        'Space Tech', 'Satellite Systems', 'CubeSat', 'LoRa', 'SDR',
        'Neuromorphic Computing', 'Photonic Computing', 'DNA Computing',
        ]
        
        # Check for skill mentions
        for skill in tech_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', description, re.IGNORECASE):
                skills.add(skill)
        
        return sorted(list(skills))
    
    def calculate_total_experience(self, work_history: List[Dict]) -> Dict:
        """
        Calculate total experience metrics from work history.
        
        Args:
            work_history: List of work experience dictionaries
            
        Returns:
            Dictionary with total experience metrics
        """
        try:
            total_months = 0
            all_periods = []
            
            for job in work_history:
                duration = job.get('duration_months', 0)
                if duration > 0:
                    total_months += duration
                    
                    # Add period for gap analysis
                    start_date = self._parse_date(job.get('start_date', ''))
                    end_date = self._parse_date(job.get('end_date', ''))
                    if start_date:
                        if not end_date or job.get('end_date', '').lower() in ['present', 'current']:
                            end_date = date.today()
                        all_periods.append((start_date, end_date))
            
            # Calculate gaps
            gap_months = 0
            has_gaps = False
            
            if len(all_periods) > 1:
                # Sort periods by start date
                all_periods.sort(key=lambda x: x[0])
                
                for i in range(1, len(all_periods)):
                    prev_end = all_periods[i-1][1]
                    curr_start = all_periods[i][0]
                    
                    if curr_start > prev_end:
                        gap = (curr_start.year - prev_end.year) * 12 + (curr_start.month - prev_end.month)
                        if gap > 1:  # Allow 1 month gap
                            gap_months += gap
                            has_gaps = True
            
            total_years = round(total_months / 12, 1)
            
            result = {
                'total_months': total_months,
                'total_years': total_years,
                'has_gaps': has_gaps,
                'gap_months': gap_months
            }
            
            self.logger.info(f"Calculated total experience: {total_years} years, gaps: {has_gaps}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error calculating total experience: {e}")
            return {
                'total_months': 0,
                'total_years': 0.0,
                'has_gaps': False,
                'gap_months': 0
            }
    
    def extract_experience_with_llm(self, experience_text: str, llm_provider: str) -> List[Dict]:
        """
        Extract work experience using LLM provider.
        
        Args:
            experience_text: Text from the experience section
            llm_provider: LLM provider ID
            
        Returns:
            List of experience objects
        """
        from parsers.llm_experience_extractor import extract_experience_with_llm
        
        try:
            self.logger.info(f"Extracting experience with LLM: {llm_provider}")
            experiences = extract_experience_with_llm(experience_text, llm_provider)
            
            # Normalize field names to match existing schema
            normalized = []
            for exp in experiences:
                normalized_exp = {
                    'company_name': exp.get('company'),
                    'job_title': exp.get('role'),
                    'start_date': exp.get('start_date'),
                    'end_date': exp.get('end_date'),
                    'is_current': exp.get('is_current', False),
                    'location': exp.get('location'),
                    'description': exp.get('summary'),
                    'skills_mentioned': []
                }
                normalized.append(normalized_exp)
            
            self.logger.info(f"LLM extracted {len(normalized)} experiences")
            return normalized
            
        except Exception as e:
            self.logger.error(f"LLM extraction failed: {e}")
            return []


# Example usage and testing
if __name__ == "__main__":
    # Sample experience text for testing
    sample_experience = """
    Senior Software Engineer at Tech Corp
    January 2020 - Present
    San Francisco, CA
    • Developed scalable web applications using React and Node.js
    • Led a team of 3 junior developers
    • Improved application performance by 40%
    • Worked with AWS, Docker, and Kubernetes
    
    Software Developer at StartupXYZ
    June 2018 - December 2019
    • Built RESTful APIs and microservices
    • Used Python, Django, and PostgreSQL
    • Implemented CI/CD pipelines with Jenkins
    """
    
    extractor = ExperienceExtractor()
    
    # Test experience extraction
    experiences = extractor.extract_work_experience(sample_experience)
    print(f"Extracted {len(experiences)} experiences:")
    
    for i, exp in enumerate(experiences, 1):
        print(f"\n{i}. {exp['job_title']} at {exp['company_name']}")
        print(f"   Dates: {exp['start_date']} - {exp['end_date']}")
        print(f"   Duration: {exp['duration_months']} months")
        print(f"   Location: {exp['location']}")
        print(f"   Skills: {', '.join(exp['skills_mentioned'])}")
    
    # Test total experience calculation
    total_exp = extractor.calculate_total_experience(experiences)
    print(f"\nTotal Experience: {total_exp['total_years']} years")
    print(f"Has gaps: {total_exp['has_gaps']}")
    print(f"Gap months: {total_exp['gap_months']}")
