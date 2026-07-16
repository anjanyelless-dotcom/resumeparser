"""Centralized regex patterns for all parsers."""

import re
from typing import List, Pattern


class RegexPatterns:
    """Centralized repository of compiled regex patterns."""
    
    # ─── Contact Information ─────────────────────────────────────────────────
    
    EMAIL: Pattern = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    )
    
    PHONE_PATTERNS: List[Pattern] = [
        re.compile(r'\+91[-\s]?(\d{5})[-\s]?(\d{5})'),  # +91 87904 33333
        re.compile(r'\+\d{1,3}[-\s]?\d{10,}'),  # International
        re.compile(r'(\d{3})[-\s]?(\d{3})[-\s]?(\d{4})'),  # 879-043-3333
        re.compile(r'\b(\d{10})\b'),  # 8790433333
    ]
    
    LINKEDIN: Pattern = re.compile(
        r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+/?',
        re.IGNORECASE
    )
    
    GITHUB: Pattern = re.compile(
        r'(?:https?://)?(?:www\.)?github\.com/[\w\-]+/?',
        re.IGNORECASE
    )
    
    WEBSITE: Pattern = re.compile(
        r'https?://[^\s<>"{}|\\^`[\]]+',
        re.IGNORECASE
    )
    
    # ─── Date Patterns ───────────────────────────────────────────────────────
    
    DATE_RANGE_MONTH_YEAR: Pattern = re.compile(
        r'(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\bPresent\b|\bCurrent\b|\bNow\b)',
        re.IGNORECASE
    )
    
    DATE_RANGE_YEAR: Pattern = re.compile(
        r'(\d{4})\s*[-–—]\s*(\d{4}|\bPresent\b|\bCurrent\b|\bNow\b)',
        re.IGNORECASE
    )
    
    SINGLE_DATE: Pattern = re.compile(
        r'\b(\w+\s+\d{4}|\d{4})\b',
        re.IGNORECASE
    )
    
    MONTH_YEAR: Pattern = re.compile(
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b',
        re.IGNORECASE
    )
    
    YEAR_4DIGIT: Pattern = re.compile(r'\b(19\d{2}|20\d{2})\b')
    
    # ─── Name Patterns ───────────────────────────────────────────────────────
    
    NAME_BASIC: Pattern = re.compile(r'^[A-Za-z\s\-\.\']{2,50}$')
    
    NAME_EXCLUDE_KEYWORDS: List[str] = [
        'resume', 'cv', 'curriculum', 'vitae',
        'senior', 'junior', 'lead', 'manager', 'director',
        'engineer', 'developer', 'designer', 'analyst',
        'professional', 'experience', 'education', 'skills'
    ]
    
    # ─── Section Headers ─────────────────────────────────────────────────────
    
    SECTION_HEADER_CAPS: Pattern = re.compile(
        r'^[A-Z][A-Z\s]{3,}$'
    )
    
    SECTION_HEADER_UNDERLINE: Pattern = re.compile(
        r'^[A-Za-z\s]+\n[=\-_]{3,}$',
        re.MULTILINE
    )
    
    # ─── Experience Patterns ─────────────────────────────────────────────────
    
    JOB_TITLE_PATTERNS: List[Pattern] = [
        re.compile(r'^([A-Z][A-Za-z\s&,\-]+(?:Engineer|Developer|Manager|Director|Lead|Analyst|Designer|Architect|Specialist|Consultant|Coordinator))'),
        re.compile(r'^(Senior|Junior|Lead|Principal|Staff|Associate)\s+[A-Z][A-Za-z\s]+'),
    ]
    
    COMPANY_PATTERNS: List[Pattern] = [
        re.compile(r'(?:at|@)\s+([A-Za-z0-9\s&.,\-]+)', re.MULTILINE),
        re.compile(r'^([A-Za-z0-9\s&.,\-]{3,})\s*[\|\-•]', re.MULTILINE),
    ]
    
    BULLET_POINT: Pattern = re.compile(
        r'^[\s]*[•\-\*\+]\s*(.+)$',
        re.MULTILINE
    )
    
    # ─── Education Patterns ──────────────────────────────────────────────────
    
    DEGREE_PATTERNS: List[Pattern] = [
        re.compile(r'\b(Ph\.?D\.?|Doctorate|Doctoral)\b', re.IGNORECASE),
        re.compile(r'\b(Master|M\.?S\.?|M\.?A\.?|MBA|MCA|M\.?Tech)\b', re.IGNORECASE),
        re.compile(r'\b(Bachelor|B\.?S\.?|B\.?A\.?|B\.?E\.?|B\.?Tech|BCA)\b', re.IGNORECASE),
        re.compile(r'\b(Associate|Diploma|A\.?S\.?)\b', re.IGNORECASE),
    ]
    
    GPA_PATTERN: Pattern = re.compile(
        r'\b(?:GPA|CGPA)[:\s]*(\d+\.?\d*)\s*(?:/\s*(\d+\.?\d*))?\b',
        re.IGNORECASE
    )
    
    # ─── Skills Patterns ─────────────────────────────────────────────────────
    
    YEARS_OF_EXPERIENCE: Pattern = re.compile(
        r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)',
        re.IGNORECASE
    )
    
    # ─── Location Patterns ───────────────────────────────────────────────────
    
    LOCATION_PATTERN: Pattern = re.compile(
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b'  # City, State
    )
    
    # ─── PDF Artifacts ───────────────────────────────────────────────────────
    
    CID_ARTIFACT: Pattern = re.compile(r'\(cid:\d+\)')
    
    WIDE_WHITESPACE: Pattern = re.compile(r' {3,}')
    
    CONTROL_CHARS: Pattern = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')
    
    # ─── Utility Methods ─────────────────────────────────────────────────────
    
    @staticmethod
    def clean_pdf_artifacts(text: str) -> str:
        """Remove PDF extraction artifacts from text."""
        text = RegexPatterns.CID_ARTIFACT.sub('', text)
        text = RegexPatterns.WIDE_WHITESPACE.sub('\n', text)
        text = RegexPatterns.CONTROL_CHARS.sub('', text)
        return text
    
    @staticmethod
    def extract_all_emails(text: str) -> List[str]:
        """Extract all email addresses from text."""
        return RegexPatterns.EMAIL.findall(text)
    
    @staticmethod
    def extract_all_phones(text: str) -> List[str]:
        """Extract all phone numbers from text."""
        phones = []
        for pattern in RegexPatterns.PHONE_PATTERNS:
            matches = pattern.findall(text)
            for match in matches:
                if isinstance(match, tuple):
                    phones.append(''.join(match))
                else:
                    phones.append(match)
        return phones
    
    @staticmethod
    def extract_linkedin(text: str) -> str:
        """Extract LinkedIn URL from text."""
        match = RegexPatterns.LINKEDIN.search(text)
        if match:
            url = match.group(0)
            if not url.startswith('http'):
                url = 'https://' + url
            return url
        return None
    
    @staticmethod
    def extract_github(text: str) -> str:
        """Extract GitHub URL from text."""
        match = RegexPatterns.GITHUB.search(text)
        if match:
            url = match.group(0)
            if not url.startswith('http'):
                url = 'https://' + url
            return url
        return None
