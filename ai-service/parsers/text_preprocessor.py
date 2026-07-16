"""
Text preprocessor to fix PDF extraction quality issues.
Handles line breaks, OCR artifacts, and text normalization.
"""

import re
import logging

logger = logging.getLogger(__name__)


class TextPreprocessor:
    """
    Preprocessor to clean and normalize text extracted from PDFs.
    Fixes common issues like broken line breaks, OCR artifacts, and formatting.
    """
    
    @staticmethod
    def preprocess_resume_text(text: str) -> str:
        """
        Preprocess resume text to fix extraction quality issues.
        
        Args:
            text: Raw extracted text from PDF/DOCX
            
        Returns:
            Cleaned and normalized text
        """
        if not text:
            return ""
        
        # Step 1: Fix broken line breaks (e.g., "San\nFrancisco" -> "San Francisco")
        text = TextPreprocessor._fix_broken_line_breaks(text)
        
        # Step 2: Fix hyphenated words at line breaks
        text = TextPreprocessor._fix_hyphenated_words(text)
        
        # Step 3: Normalize whitespace
        text = TextPreprocessor._normalize_whitespace(text)
        
        # Step 4: Fix common OCR errors
        text = TextPreprocessor._fix_ocr_errors(text)
        
        # Step 5: Fix location formatting
        text = TextPreprocessor._fix_location_formatting(text)
        
        return text.strip()
    
    @staticmethod
    def _fix_broken_line_breaks(text: str) -> str:
        """
        Fix line breaks that split words or phrases incorrectly.
        
        Examples:
        - "San\nFrancisco" -> "San Francisco"
        - "Twitter San\nFrancisco, CA" -> "Twitter San Francisco, CA"
        """
        # Pattern: lowercase letter followed by newline and lowercase letter
        # This could be a word split OR separate words - preserve space to be safe
        text = re.sub(r'([a-z])\n([a-z])', r'\1 \2', text)
        
        # Pattern: word followed by newline and capitalized word (likely location/name)
        # e.g., "San\nFrancisco" or "New\nYork"
        text = re.sub(r'([A-Z][a-z]+)\n([A-Z][a-z]+)', r'\1 \2', text)
        
        # Pattern: company name split across lines
        # e.g., "Google\nInc" -> "Google Inc"
        text = re.sub(r'([A-Z][a-z]+)\n(Inc|LLC|Ltd|Corp|Company)', r'\1 \2', text)
        
        return text
    
    @staticmethod
    def _fix_hyphenated_words(text: str) -> str:
        """
        Fix words hyphenated at line breaks.
        
        Example: "develop-\nment" -> "development"
        """
        # Remove hyphen at end of line followed by newline
        text = re.sub(r'-\n', '', text)
        
        return text
    
    @staticmethod
    def _normalize_whitespace(text: str) -> str:
        """
        Normalize whitespace while preserving paragraph structure.
        """
        # Replace multiple spaces with single space
        text = re.sub(r'[ \t]+', ' ', text)
        
        # Replace more than 2 newlines with exactly 2 (paragraph break)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Remove spaces at start/end of lines
        lines = text.split('\n')
        lines = [line.strip() for line in lines]
        text = '\n'.join(lines)
        
        return text
    
    @staticmethod
    def _fix_ocr_errors(text: str) -> str:
        """
        Fix common OCR errors and artifacts.
        """
        # Fix common OCR character substitutions
        ocr_fixes = {
            '0': 'O',  # Zero to letter O in words
            'l': 'I',  # lowercase L to uppercase I in acronyms
            '|': 'I',  # pipe to I
        }
        
        # Apply fixes only in specific contexts to avoid breaking numbers
        # Fix "0" -> "O" in words (not in numbers)
        text = re.sub(r'\b([A-Z]+)0([A-Z]+)\b', r'\1O\2', text)
        
        # Remove common OCR artifacts
        text = re.sub(r'[•●○■□▪▫]', '•', text)  # Normalize bullet points
        
        return text
    
    @staticmethod
    def _fix_location_formatting(text: str) -> str:
        """
        Fix location formatting issues.
        
        Examples:
        - "San\nFrancisco, CA" -> "San Francisco, CA"
        - "New\nYork, NY" -> "New York, NY"
        """
        # Pattern: City name split across lines before state code
        # e.g., "San\nFrancisco, CA" or "New\nYork, NY"
        text = re.sub(
            r'([A-Z][a-z]+)\n([A-Z][a-z]+),\s*([A-Z]{2})',
            r'\1 \2, \3',
            text
        )
        
        # Pattern: Company/Location split before city
        # e.g., "Twitter San\nFrancisco" -> "Twitter San Francisco"
        text = re.sub(
            r'([A-Z][a-z]+)\s+([A-Z][a-z]+)\n([A-Z][a-z]+)',
            r'\1 \2 \3',
            text
        )
        
        return text
    
    @staticmethod
    def fix_name_extraction(name: str) -> str:
        """
        Fix name extraction issues.
        
        Args:
            name: Extracted name (might be incomplete)
            
        Returns:
            Fixed name
        """
        if not name:
            return ""
        
        # Remove common prefixes that shouldn't be in names
        prefixes_to_remove = [
            'RESUME', 'CV', 'CURRICULUM VITAE', 'PROFILE',
            'CONTACT', 'PERSONAL', 'INFORMATION'
        ]
        
        for prefix in prefixes_to_remove:
            if name.upper().startswith(prefix):
                name = name[len(prefix):].strip()
        
        # If name is all caps, convert to title case
        if name.isupper() and len(name) > 3:
            name = name.title()
        
        return name.strip()
    
    @staticmethod
    def fix_degree_extraction(degree: str) -> str:
        """
        Fix degree extraction issues (e.g., "Bha" -> "Bachelor")
        
        Args:
            degree: Extracted degree (might be cut off)
            
        Returns:
            Fixed degree
        """
        if not degree:
            return ""
        
        # Common degree abbreviations and their full forms
        degree_mappings = {
            'bha': 'Bachelor',
            'ba': 'Bachelor of Arts',
            'bs': 'Bachelor of Science',
            'bsc': 'Bachelor of Science',
            'be': 'Bachelor of Engineering',
            'btech': 'Bachelor of Technology',
            'ma': 'Master of Arts',
            'ms': 'Master of Science',
            'msc': 'Master of Science',
            'me': 'Master of Engineering',
            'mtech': 'Master of Technology',
            'mba': 'Master of Business Administration',
            'phd': 'Doctor of Philosophy',
            'md': 'Doctor of Medicine',
        }
        
        degree_lower = degree.lower().strip()
        
        # Check if it's a partial match
        for abbr, full in degree_mappings.items():
            if degree_lower.startswith(abbr):
                return full
        
        return degree.strip()
