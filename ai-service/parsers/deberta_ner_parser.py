#!/usr/bin/env python3
"""
DeBERTa NER Parser - Integration with trained Resume NER model
Uses the fine-tuned DeBERTa-v3 model for entity extraction.

Safeguard 4: Import Validation - Verify all required imports at startup
"""

import torch
import sys
import os
import traceback
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Set, Tuple
from collections import defaultdict
import logging
import re

# Safeguard 4: Import Validation - Verify critical imports
_required_imports = {
    'torch': torch,
    'typing.Dict': Dict,
    'typing.List': List,
    'typing.Any': Any,
    'typing.Optional': Optional,
    'typing.Union': Union,
    'typing.Set': Set,
    'typing.Tuple': Tuple,
    'collections.defaultdict': defaultdict,
    'logging': logging,
    're': re,
    'traceback': traceback
}

for name, module in _required_imports.items():
    if module is None:
        raise ImportError(f"Critical import failed: {name}. Cannot start parser.")

# Import configuration
try:
    from config.deberta_config import DEBERTA_MODEL_PATH, REQUIRED_MODEL_FILES, REQUIRED_MODEL_WEIGHTS  # type: ignore
except ImportError:
    # Fallback if config not available - use correct model directory
    DEBERTA_MODEL_PATH = str(Path(__file__).parent.parent / "models" / "resume-ner-deberta")
    REQUIRED_MODEL_FILES = ['config.json', 'tokenizer_config.json', 'tokenizer.json']
    REQUIRED_MODEL_WEIGHTS = ['pytorch_model.bin', 'model.safetensors']

logger = logging.getLogger(__name__)


class DeBERTaNerParser:
    """
    DeBERTa-based NER parser for resume entity extraction.
    Uses a fine-tuned DeBERTa model trained on resume data.
    """
    
    def __init__(self, model_path: str = None):
        """Initialize DeBERTa NER parser with model path."""
        self.model_path = model_path or DEBERTA_MODEL_PATH
        self.model = None
        self.tokenizer = None
        self.id_to_label = {}
        self.label_to_id = {}
        self.is_loaded = False
        self.deberta_available = False
        
        # Import structured parser
        try:
            from .work_experience_structured_parser import StructuredWorkExperienceParser
            self.structured_parser = StructuredWorkExperienceParser()
        except ImportError:
            logger.warning("StructuredWorkExperienceParser not available")
            self.structured_parser = None
        
        self._load_model()
    
    def _check_model_files_exist(self) -> bool:
        """
        Check if all required DeBERTa model files exist.
        
        Required files:
        - config.json
        - pytorch_model.bin OR model.safetensors
        - tokenizer_config.json
        - tokenizer.json
        
        Returns:
            bool: True if all required files exist, False otherwise
        """
        # Startup diagnostics
        logger.info(f"🔍 DeBERTa Model Path Diagnostics:")
        logger.info(f"   Resolved path: {self.model_path}")
        logger.info(f"   Absolute path: {os.path.abspath(self.model_path)}")
        logger.info(f"   Path exists: {os.path.exists(self.model_path)}")
        
        if not os.path.exists(self.model_path):
            logger.info(f"📁 Model directory not found: {self.model_path}")
            return False
        
        # List files in model directory
        try:
            files_in_dir = os.listdir(self.model_path)
            logger.info(f"   Files in directory: {len(files_in_dir)} items")
            for f in files_in_dir[:10]:  # Show first 10 files
                logger.info(f"     - {f}")
            if len(files_in_dir) > 10:
                logger.info(f"     ... and {len(files_in_dir) - 10} more files")
        except Exception as e:
            logger.error(f"   Error listing directory: {e}")
        
        # Check for model weights (at least one required)
        has_model_weights = any(
            os.path.exists(os.path.join(self.model_path, weight_file))
            for weight_file in REQUIRED_MODEL_WEIGHTS
        )
        
        if not has_model_weights:
            logger.warning(f"⚠️  DeBERTa model weights not found. Expected one of: {', '.join(REQUIRED_MODEL_WEIGHTS)}")
            return False
        else:
            for weight_file in REQUIRED_MODEL_WEIGHTS:
                weight_path = os.path.join(self.model_path, weight_file)
                if os.path.exists(weight_path):
                    logger.info(f"   ✅ Found: {weight_file}")
        
        # Check other required files
        missing_files = []
        for file_name in REQUIRED_MODEL_FILES:
            file_path = os.path.join(self.model_path, file_name)
            if not os.path.exists(file_path):
                missing_files.append(file_name)
            else:
                logger.info(f"   ✅ Found: {file_name}")
        
        if missing_files:
            logger.warning(f"⚠️  Required files missing: {', '.join(missing_files)}")
            return False
        
        logger.info(f"✅ All required model files present")
        return True
    
    def _normalize_gpa(self, gpa_text: str) -> Optional[str]:
        """
        Normalize GPA values to standard format.
        
        Examples:
        - 3.84.0 → 3.84/4.0
        - 3.84/4.0 → 3.84/4.0 (already normalized)
        - 3.84 → 3.84 (no scale)
        
        Args:
            gpa_text: Raw GPA text from DeBERTa
            
        Returns:
            Normalized GPA string or None if invalid
        """
        if not gpa_text:
            return None
        
        import re
        
        gpa_text = gpa_text.strip()
        
        # Pattern 1: 3.84.0 → 3.84/4.0 (malformed with extra .0)
        match = re.match(r'^(\d+\.?\d*)\.0$', gpa_text)
        if match:
            gpa_value = match.group(1)
            return f"{gpa_value}/4.0"
        
        # Pattern 2: Already in format X/Y (e.g., 3.84/4.0, 8.5/10)
        if '/' in gpa_text:
            return gpa_text
        
        # Pattern 3: Just a number (e.g., 3.84, 8.5) - return as-is
        match = re.match(r'^(\d+\.?\d*)$', gpa_text)
        if match:
            return gpa_text
        
        # Pattern 4: Percentage (e.g., 85%, 85.5%) - keep as percentage
        match = re.match(r'^(\d+\.?\d*)%$', gpa_text)
        if match:
            return gpa_text
        
        # Return original if no pattern matches
        return gpa_text
    
    def _extract_years_from_text(self, text: str) -> tuple:
        """
        Extract start and end years from text containing date ranges.
        
        Handles patterns like:
        - "2011–2013", "2011-2013", "2011 - 2013"
        - "(2010-2014)", "2010 to 2014"
        - "2013" (single year)
        
        Returns:
            (start_year, end_year) as integers, or (None, None) if not found
        """
        if not text:
            return None, None
        
        import re
        
        # Remove parentheses and common separators
        cleaned = text.replace('(', '').replace(')', '')
        
        # Pattern 1: Year range with dash/en-dash/to (2011–2013, 2011-2013, 2011 - 2013, 2011 to 2013)
        match = re.search(r'(\d{4})\s*(?:[–\-—]|to)\s*(\d{4})', cleaned)
        if match:
            return int(match.group(1)), int(match.group(2))
        
        # Pattern 2: Single year (2013)
        match = re.search(r'(\d{4})', cleaned)
        if match:
            year = int(match.group(1))
            return year, year
        
        return None, None
    
    @staticmethod
    def _preprocess_text(text: str) -> str:
        """
        Pre-process text to normalize format for better model inference.
        Removes format artifacts that confuse the model.

        EXTENDED: Now restricts role extraction to job headers only by removing
        role-like text from responsibilities, environment, technologies, etc.
        """
        import re

        # ── Noise label prefixes to strip from line starts ──────────────────
        # Original 9 prefixes preserved + 13 new additions from audit findings
        prefixes_to_remove = [
            # Original prefixes
            r'^Role:\s*',
            r'^Responsibilities:\s*',
            r'^Environment:\s*',
            r'^Company:\s*',
            r'^Position:\s*',
            r'^Title:\s*',
            r'^Location:\s*',
            r'^Duration:\s*',
            r'^Period:\s*',
            # Extended prefixes (new — from audit Issue 2 & Issue 5)
            r'^Technologies:\s*',
            r'^Technology Stack:\s*',
            r'^Tech Stack:\s*',
            r'^Tools Used:\s*',
            r'^Frameworks:\s*',
            r'^Platforms:\s*',
            r'^Libraries:\s*',
            r'^Cloud Services:\s*',
            r'^Utilities Used:\s*',
            r'^Software Used:\s*',
            r'^Development Tools:\s*',
            r'^Project Description:\s*',
            r'^Duties:\s*',
            # Additional prefixes for role restriction
            r'^Skills Used:\s*',
            r'^Achievements:\s*',
            r'^Key Achievements:\s*',
            r'^Highlights:\s*',
            r'^Key Highlights:\s*',
        ]

        # ── Regex for detecting noise-label-only lines (header sentinel) ─────
        # Matches a line that IS purely a noise label (no value after the colon)
        _NOISE_SENTINEL = re.compile(
            r'^(?:'
            r'technologies|technology stack|tech stack|tools used|frameworks|platforms|'
            r'libraries|cloud services|utilities used|software used|development tools|'
            r'project description|duties|responsibilities|environment|skills used|'
            r'achievements|key achievements|highlights|key highlights'
            r')\s*:?\s*$',
            re.IGNORECASE
        )

        # ── Regex for entity-bearing lines — NEVER skip these ──────────────
        # A line is entity-bearing if it looks like a date, company name, degree, or role
        _DATE_RE = re.compile(
            r'(?i)\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}'
            r'|(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current|now)',
            re.IGNORECASE
        )
        _ENTITY_INDICATOR = re.compile(
            r'(?i)\b(?:engineer|developer|manager|architect|analyst|consultant|specialist|'
            r'lead|senior|junior|director|intern|trainee|'
            r'bachelor|master|phd|diploma|b\.tech|m\.tech|b\.e|m\.e|mba|'
            r'pvt|ltd|inc|corp|llc|technologies|solutions|systems|group|services)\b'
        )

        # ── Action verbs to skip (description lines) ─────────────────────────
        _ACTION_VERB_RE = re.compile(
            r'(?i)^(?:developed|designed|managed|led|responsible|worked|created|'
            r'implemented|architected|built|maintained|collaborated|participated|'
            r'involved|using|integrated|optimized|improved|resolved|tested|'
            r'analyzed|supported|delivered|directed)\b'
        )

        # ── NEW: Role-like phrases to skip from non-header sections ───────────
        # These look like roles but appear in responsibilities/descriptions
        _NON_HEADER_ROLE_PHRASES = re.compile(
            r'(?i)^(?:'
            r'backend development|frontend development|full.?stack development|'
            r'api development|api engineering|microservices|release cycle|'
            r'production support|monitoring|migration time|3 developer|'
            r'development team|engineering team|software development|'
            r'application development|system development|platform development|'
            r'cloud development|data development|test development|'
            r'qa development|devops development|security development|'
            r'mobile development|web development|database development|'
            r'infrastructure development|network development|'
            r'backend engineering|frontend engineering|full.?stack engineering|'
            r'api engineering|microservices engineering|release engineering|'
            r'production engineering|monitoring engineering|migration engineering|'
            r'development engineering|engineering engineering|software engineering|'
            r'application engineering|system engineering|platform engineering|'
            r'cloud engineering|data engineering|test engineering|'
            r'qa engineering|devops engineering|security engineering|'
            r'mobile engineering|web engineering|database engineering|'
            r'infrastructure engineering|network engineering'
            r')$',
            re.IGNORECASE
        )

        lines = text.split('\n')
        cleaned_lines = []
        skip_continuation = False  # True while inside a noise-label block
        in_header_section = True  # True if we're in the header section (first 3 lines)
        header_stop_detected = False  # True when we hit a stop keyword (Responsibilities, Environment, etc.)

        # ── STEP 3: Header Detection Stop Keywords ───────────────────────────
        # These keywords indicate the end of the header section
        header_stop_keywords = [
            'responsibilities', 'responsibility', 'environment', 'technologies', 
            'technology stack', 'tech stack', 'skills used', 'tools used', 
            'frameworks', 'platforms', 'libraries', 'cloud services', 
            'utilities used', 'software used', 'development tools', 
            'project description', 'duties', 'achievements', 'key achievements',
            'highlights', 'key highlights', 'description', 'project',
            'architecture', 'documentation', 'monitoring', 'security',
            'integration', 'design', 'implementation', 'migration',
            'compliance'
        ]

        for line_idx, line in enumerate(lines):
            stripped = line.strip()
            stripped_lower = stripped.lower()

            # ── Blank line resets continuation skip ──────────────────────────
            if not stripped:
                skip_continuation = False
                continue

            # ── STEP 3: Detect header stop keywords ─────────────────────────
            # Once we hit these keywords, only description text follows
            if in_header_section and any(keyword in stripped_lower for keyword in header_stop_keywords):
                header_stop_detected = True
                in_header_section = False
                logger.debug(f"[PREPROCESS] Header stop keyword detected: '{stripped}'")
                continue  # Skip the stop keyword line itself

            # ── Track header section (first 10 lines or until stop keyword) ───────
            if line_idx < 10 and in_header_section and not header_stop_detected:
                # Keep header lines as-is for role extraction
                if not _NOISE_SENTINEL.match(stripped):
                    cleaned_line = line
                    for prefix_pattern in prefixes_to_remove:
                        cleaned_line = re.sub(prefix_pattern, '', cleaned_line, flags=re.IGNORECASE)
                    stripped_cleaned = cleaned_line.strip()
                    if stripped_cleaned:
                        cleaned_lines.append(cleaned_line)
                continue
            else:
                in_header_section = False

            # ── Detect pure noise-label sentinel lines ────────────────────────
            # e.g., a line that reads exactly "Technologies:" or "Tech Stack:"
            if _NOISE_SENTINEL.match(stripped):
                skip_continuation = True
                logger.debug(f"[PREPROCESS] Noise sentinel detected, skipping block: '{stripped}'")
                continue

            # ── STEP 10-11: Responsibilities/Environment only contribute to description ──
            # Everything after these keywords belongs only to description
            # No entity extraction for Company or Role
            if header_stop_detected:
                # After stop keyword, only allow dates and locations (for description context)
                # Reject Company and Role entities
                is_date_or_location = bool(_DATE_RE.search(stripped)) or bool(
                    re.search(r'\b(?:city|state|country|location|remote|hybrid)\b', stripped_lower)
                )
                if not is_date_or_location:
                    logger.debug(f"[PREPROCESS] Skipping description line after stop keyword: '{stripped[:80]}'")
                    continue

            # ── If inside a noise-label continuation block ────────────────────
            # Skip unless line is entity-bearing (date / role / company / degree)
            if skip_continuation:
                is_entity = bool(_DATE_RE.search(stripped)) or bool(_ENTITY_INDICATOR.search(stripped))
                if not is_entity:
                    logger.debug(f"[PREPROCESS] Skipping noise continuation: '{stripped[:80]}'")
                    continue
                else:
                    # Entity line found — exit skip mode and keep line
                    skip_continuation = False

            # ── FIX 5: Skip role-like phrases ONLY from non-header sections ──────
            # These patterns (e.g. "data engineering", "web development") look like
            # roles but appear in responsibilities/descriptions.
            # NEVER apply this filter to header lines (in_header_section is True)
            # because legitimate role titles like "Data Engineering Intern" or
            # "Web Developer" live in the header and must reach DeBERTa.
            if not in_header_section and _NON_HEADER_ROLE_PHRASES.match(stripped):
                logger.debug(f"[PREPROCESS] Skipping non-header role phrase: '{stripped}'")
                continue

            # ── Per-line prefix stripping (inline "Tech Stack: React, Node") ──
            cleaned_line = line
            for prefix_pattern in prefixes_to_remove:
                cleaned_line = re.sub(prefix_pattern, '', cleaned_line, flags=re.IGNORECASE)

            stripped_cleaned = cleaned_line.strip()
            if not stripped_cleaned:
                continue

            # ── Skip bullet points ────────────────────────────────────────────
            if re.match(r'^[•\-\*\+►▸▶→]\s*', stripped_cleaned):
                continue

            # ── Skip long description lines (> 130 chars) ────────────────────
            if len(stripped_cleaned) > 130:
                continue

            # ── Skip action-verb-led lines ────────────────────────────────────
            if _ACTION_VERB_RE.match(stripped_cleaned):
                continue

            cleaned_lines.append(cleaned_line)

        return '\n'.join(cleaned_lines)

    def _recover_pdf_layout(self, text: str) -> str:
        """
        Phase 1.3: PDF Layout Recovery
        
        Normalize multi-column resumes, side-by-side layouts, OCR artifacts,
        table layouts, and broken line wrapping to reconstruct reading order.
        
        Args:
            text: Raw text from PDF OCR
            
        Returns:
            Text with reconstructed reading order
        """
        import re
        
        lines = text.split('\n')
        recovered_lines = []
        
        # Detect and handle multi-column layouts
        # Strategy: If lines are short and numerous, likely multi-column
        avg_line_length = sum(len(line) for line in lines) / len(lines) if lines else 0
        
        # If average line length is very short (< 40 chars), likely multi-column
        if avg_line_length < 40 and len(lines) > 10:
            # Try to merge short lines that belong together
            current_line = ""
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    if current_line:
                        recovered_lines.append(current_line)
                        current_line = ""
                    continue
                
                # If line ends with punctuation or is very short, likely continuation
                if current_line and (stripped[0].islower() or len(stripped) < 20):
                    current_line += " " + stripped
                else:
                    if current_line:
                        recovered_lines.append(current_line)
                    current_line = stripped
            
            if current_line:
                recovered_lines.append(current_line)
        else:
            # Single column, keep as-is
            recovered_lines = lines
        
        # Remove table artifacts (vertical bars, multiple spaces)
        cleaned_lines = []
        for line in recovered_lines:
            # Remove vertical bars and table separators
            cleaned = re.sub(r'\|', ' ', line)
            # Remove multiple consecutive spaces
            cleaned = re.sub(r' {2,}', ' ', cleaned)
            cleaned_lines.append(cleaned)
        
        return '\n'.join(cleaned_lines)

    def _reconstruct_multiline_headers(self, text: str) -> str:
        """
        Phase 1.4: Multi-line Header Reconstruction
        
        Merge company/role split over multiple lines into single lines.
        
        Examples:
            J.P.          Morgan          Chase  →  J.P. Morgan Chase
            Senior        Software        Engineer  →  Senior Software Engineer
        
        Args:
            text: Text with potentially split headers
            
        Returns:
            Text with reconstructed headers
        """
        import re
        
        lines = text.split('\n')
        reconstructed_lines = []
        
        # Patterns that indicate a line might be a continuation of a header
        continuation_patterns = [
            r'^[A-Z]\.$',  # Single letter with period (J.P., A.B., etc.)
            r'^[A-Z][a-z]+$',  # Single capitalized word
            r'^[A-Z]{2,}$',  # All caps acronym
        ]
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            if not line:
                reconstructed_lines.append(line)
                i += 1
                continue
            
            # Check if this line might be a header continuation
            is_continuation = False
            for pattern in continuation_patterns:
                if re.match(pattern, line):
                    is_continuation = True
                    break
            
            # If it's a continuation and previous line exists, merge
            if is_continuation and reconstructed_lines and reconstructed_lines[-1]:
                # Check if previous line is also short (likely header)
                prev_line = reconstructed_lines[-1].strip()
                if len(prev_line) < 50 and not prev_line.endswith('.'):
                    # Merge with previous line
                    reconstructed_lines[-1] = prev_line + " " + line
                    i += 1
                    continue
            
            reconstructed_lines.append(line)
            i += 1
        
        return '\n'.join(reconstructed_lines)

    def _remove_ocr_noise(self, text: str) -> str:
        """
        Phase 1.5: Remove OCR Noise
        
        Remove bullets, tabs, double spaces, hidden unicode characters
        before NER processing.
        
        Args:
            text: Text with OCR noise
            
        Returns:
            Cleaned text
        """
        import re
        
        # Remove common OCR bullet characters
        bullet_chars = ['•', '■', '▪', '○', '★', '*', '-', '►', '▸', '▶', '→']
        cleaned = text
        
        for char in bullet_chars:
            cleaned = cleaned.replace(char, '')
        
        # Remove tabs and replace with single space
        cleaned = cleaned.replace('\t', ' ')
        
        # Remove double spaces
        cleaned = re.sub(r' {2,}', ' ', cleaned)
        
        # Remove hidden unicode characters (non-printable except common ones)
        # Keep: newline, space, common punctuation
        cleaned = re.sub(r'[^\x20-\x7E\n\r\t]', '', cleaned)
        
        # Remove leading/trailing spaces from each line
        lines = cleaned.split('\n')
        cleaned_lines = [line.strip() for line in lines]
        
        # Remove empty lines
        cleaned_lines = [line for line in cleaned_lines if line]
        
        return '\n'.join(cleaned_lines)

    def _extract_description(self, text: str, header_stop_position: int = -1) -> str:
        """
        Phase 9: Description Extraction
        
        Extract everything below Responsibilities/Environment as Description.
        Preserve bullets and paragraphs. Normalize whitespace.
        
        Args:
            text: Full job block text
            header_stop_position: Position where header section ends (if known)
            
        Returns:
            Extracted description text
        """
        import re
        
        lines = text.split('\n')
        description_lines = []
        in_description = False
        
        # Keywords that indicate start of description section
        description_keywords = [
            'responsibilities', 'responsibility', 'duties', 'achievements',
            'highlights', 'key highlights', 'description', 'project description'
        ]
        
        for line in lines:
            stripped = line.strip().lower()
            
            # Check if this line starts a description section
            if any(keyword in stripped for keyword in description_keywords):
                in_description = True
                continue
            
            # If we're in description section, collect lines
            if in_description:
                description_lines.append(line.strip())
        
        # Normalize whitespace
        description = ' '.join(description_lines)
        description = re.sub(r' {2,}', ' ', description)
        
        return description.strip()

    def _extract_environment(self, text: str) -> dict:
        """
        Phase 10: Environment Extraction
        
        Extract and store environment/technologies_used separately.
        Never classify as Company, Client, or Role.
        
        Args:
            text: Full job block text
            
        Returns:
            Dictionary with 'environment' and 'technologies_used' fields
        """
        import re
        
        result = {
            'environment': None,
            'technologies_used': None
        }
        
        # Keywords that indicate environment section
        environment_keywords = [
            'environment', 'technologies', 'technology stack', 'tech stack',
            'tools used', 'frameworks', 'platforms', 'libraries', 'cloud services',
            'software used', 'development tools'
        ]
        
        lines = text.split('\n')
        environment_lines = []
        in_environment = False
        
        for line in lines:
            stripped = line.strip().lower()
            
            # Check if this line starts an environment section
            if any(keyword in stripped for keyword in environment_keywords):
                in_environment = True
                continue
            
            # If we're in environment section, collect lines
            if in_environment:
                environment_lines.append(line.strip())
        
        # Normalize whitespace
        environment_text = ' '.join(environment_lines)
        environment_text = re.sub(r' {2,}', ' ', environment_text)
        
        if environment_text.strip():
            result['environment'] = environment_text.strip()
            result['technologies_used'] = environment_text.strip()
        
        return result

    # ── Record-level splitters ────────────────────────────────────────────────

    def _split_experience_into_records(self, experience_text: str) -> List[str]:
        """
        Split an experience section into individual job records.

        Problem solved here:
        PDF/OCR extraction often joins the Environment list of job N with the
        Client: header of job N+1 on the SAME line, e.g.:
            "...Eclipse IDE. Client: Capital One McLean, VA"
        split_job_blocks() checks for COMPANY_HEADER_RE.match(line) which requires
        the pattern to appear at the START of the line — so it misses the embedded
        Client: and never creates a boundary.

        Fix (applied BEFORE calling split_job_blocks):
        1. Insert a newline before any Client:/Company:/Employer: that appears
           mid-line (i.e., not already at the start of a line).
        2. Call split_job_blocks on the normalized text.
        3. Merge consecutive micro-blocks that belong to the same job
           (a Client: header-only block immediately followed by a Role/Date block).

        Args:
            experience_text: Full experience section text

        Returns:
            List of individual job record strings — one per employer
        """
        import re as _re

        # ── STEP 1: Normalize mid-line Client:/Company:/Employer: occurrences ──
        # Inject a newline so split_job_blocks can detect line-start anchors.
        # Pattern: any Client:/Company:/Employer: that is NOT already at line start.
        # We match it when preceded by a non-newline character.
        normalized = _re.sub(
            r'(?<=[^\n])\s*(Client:|Company:|Employer:|Employer\s+Name:)',
            r'\n\1',
            experience_text,
            flags=_re.IGNORECASE
        )

        logger.info(f"[EXP-SPLIT] Normalization injected "
                    f"{normalized.count(chr(10)) - experience_text.count(chr(10))} extra newlines "
                    f"to isolate embedded Client:/Company: headers")

        try:
            from parsers.experience_extractor import split_job_blocks
            raw_blocks = split_job_blocks(normalized)
        except Exception as e:
            logger.warning(f"[EXP-SPLIT] split_job_blocks failed ({e}), treating as 1 record")
            return [experience_text]

        if not raw_blocks:
            logger.debug("[EXP-SPLIT] split_job_blocks returned 0 records — treating as 1 record")
            return [experience_text]

        # ── STEP 2: Merge fragmented micro-blocks ──────────────────────────────
        # After normalization a single job may produce two blocks:
        #   Block A: "Client: Capital One McLean, VA"         (header only)
        #   Block B: "Sr. Full Stack Java Developer Mar 2019…" (role+content)
        # These must be merged back into one record.
        HEADER_ONLY_RE = _re.compile(
            r'^(?:Client|Company|Employer|Employer\s+Name):\s*.{1,120}$',
            _re.IGNORECASE
        )

        merged: List[str] = []
        i = 0
        while i < len(raw_blocks):
            block = raw_blocks[i].strip()
            # If this block is ONLY a header line (no body content below it)
            # and the next block contains a role/date, merge them.
            if (HEADER_ONLY_RE.match(block) and
                    '\n' not in block and
                    i + 1 < len(raw_blocks)):
                next_block = raw_blocks[i + 1].strip()
                merged.append(block + '\n' + next_block)
                logger.debug(f"[EXP-SPLIT] Merged header block {i+1} with body block {i+2}")
                i += 2
            else:
                merged.append(block)
                i += 1

        logger.info(f"[EXP-SPLIT] split_job_blocks produced {len(raw_blocks)} raw blocks → "
                    f"{len(merged)} merged record(s)")
        for rec_idx, rec in enumerate(merged):
            first_line = rec.strip().split('\n')[0][:100]
            logger.info(f"  Record {rec_idx + 1}: {first_line!r}")

        return [r for r in merged if r.strip()]

    def _split_education_into_records(self, education_text: str) -> List[str]:
        """
        Split an education section into individual education records.

        REUSES existing SectionSplitter.extract_education_blocks() — no duplicate logic.
        Falls back to treating the entire section as one record.

        Args:
            education_text: Full education section text

        Returns:
            List of individual education record strings
        """
        try:
            from parsers.section_splitter import SectionSplitter
            splitter = SectionSplitter()
            blocks = splitter.extract_education_blocks(education_text)
            if blocks:
                # extract_education_blocks returns dicts; convert back to text chunks
                record_texts = []
                for block in blocks:
                    parts = [
                        block.get('degree', ''),
                        block.get('institution', ''),
                        block.get('dates', ''),
                        block.get('details', '')
                    ]
                    record_text = '\n'.join(p for p in parts if p)
                    if record_text.strip():
                        record_texts.append(record_text)
                if record_texts:
                    logger.debug(f"[EDU-SPLIT] extract_education_blocks produced {len(record_texts)} records")
                    return record_texts
            logger.debug("[EDU-SPLIT] No blocks from SectionSplitter — treating as 1 record")
            return [education_text]
        except Exception as e:
            logger.warning(f"[EDU-SPLIT] extract_education_blocks failed ({e}), treating as 1 record")
            return [education_text]

    # ── Token-safe chunking ───────────────────────────────────────────────────

    def _chunk_record_for_deberta(self, record_text: str, max_tokens: int = 400) -> List[str]:
        """
        Split a single record into token-safe chunks if it exceeds max_tokens.

        Splits on sentence/line boundaries — never mid-entity. Uses a rough
        word-count heuristic (1 word ≈ 1.3 tokens) as a fast pre-check before
        invoking the real tokenizer.

        Args:
            record_text: Single job/education record text
            max_tokens:  Safe token budget per chunk (default 400, well under 512)

        Returns:
            List of text chunks — usually just [record_text] for short records
        """
        # Fast heuristic: words * 1.3 ≈ tokens
        estimated_tokens = len(record_text.split()) * 1.3

        if estimated_tokens <= max_tokens:
            return [record_text]  # No chunking needed — common case

        logger.debug(f"[CHUNK] Record estimated {estimated_tokens:.0f} tokens > {max_tokens}, chunking…")

        lines = record_text.split('\n')
        chunks: List[str] = []
        current_lines: List[str] = []
        current_words = 0

        for line in lines:
            line_words = len(line.split())
            if current_words + line_words > max_tokens and current_lines:
                chunks.append('\n'.join(current_lines))
                current_lines = [line]
                current_words = line_words
            else:
                current_lines.append(line)
                current_words += line_words

        if current_lines:
            chunks.append('\n'.join(current_lines))

        logger.debug(f"[CHUNK] Split into {len(chunks)} chunks")
        return chunks

    # ── Single-record DeBERTa inference ──────────────────────────────────────

    def _run_deberta_on_record(self, record_text: str, section_type: str,
                                char_offset: int = 0) -> Dict[str, Any]:
        """
        Run DeBERTa NER on a single job/education record.

        Flow:
          1. _convert_to_natural_language() — existing, unchanged
          2. _preprocess_text() — extended with full noise-label list
          3. _chunk_record_for_deberta() — only if record > 400 tokens
          4. HF ner_pipeline per chunk
          5. Merge chunk predictions back — adjusting start/end by chunk offset

        The char_offset parameter shifts all entity positions so they remain
        correct when multiple per-record entity dicts are later merged into a
        single entity list for DeBERTaExperienceBuilder.

        Args:
            record_text:  Single job or education record text
            section_type: 'experience' or 'education' (for logging)
            char_offset:  Cumulative character offset of this record in the
                          original section text (for correct position merging)

        Returns:
            Entities dict identical in structure to _parse_single_section() output,
            with positions shifted by char_offset.
        """
        if not record_text or not record_text.strip():
            return {}

        logger.debug(f"[{section_type.upper()}-RECORD] Before preprocess ({len(record_text)} chars): "
                     f"{record_text[:100]!r}")

        # Step 1: convert structured formats → natural language
        converted = self._convert_to_natural_language(record_text)

        # Step 2: PDF Layout Recovery (Phase 1.3)
        layout_recovered = self._recover_pdf_layout(converted)

        # Step 3: Multi-line Header Reconstruction (Phase 1.4)
        headers_reconstructed = self._reconstruct_multiline_headers(layout_recovered)

        # Step 4: Remove OCR Noise (Phase 1.5)
        noise_removed = self._remove_ocr_noise(headers_reconstructed)

        # Step 5: extended preprocessing
        preprocessed = self._preprocess_text(noise_removed)

        logger.debug(f"[{section_type.upper()}-RECORD] After preprocess ({len(preprocessed)} chars): "
                     f"{preprocessed[:100]!r}")

        if not preprocessed.strip():
            logger.debug(f"[{section_type.upper()}-RECORD] Nothing left after preprocessing, skipping")
            return {}

        logger.debug(f"[{section_type.upper()}-RECORD] Sending to DeBERTa: {preprocessed[:150]!r}")

        # ── STEP 1: MODEL INPUT DEBUG LOGGING ─────────────────────────────────
        logger.info("=" * 80)
        logger.info("STEP 1: DeBERTa MODEL INPUT ANALYSIS")
        logger.info("=" * 80)
        logger.info(f"Section: {section_type}")
        
        # Calculate metrics
        char_count = len(preprocessed)
        word_count = len(preprocessed.split())
        estimated_tokens = word_count * 1.3
        
        logger.info(f"Character Count: {char_count}")
        logger.info(f"Word Count: {word_count}")
        logger.info(f"Estimated Token Count: {estimated_tokens:.0f}")
        
        # Check 512-token limit
        fits_512 = estimated_tokens <= 512
        logger.info(f"Fits within 512-token limit: {fits_512}")
        
        if not fits_512:
            logger.info(f"⚠️  TRUNCATION WARNING: Record exceeds 512-token limit by {estimated_tokens - 512:.0f} tokens")
            percentage_processed = (512 / estimated_tokens) * 100
            logger.info(f"Percentage of record that would be processed: {percentage_processed:.1f}%")
            logger.info(f"Model can fully see the record: NO")
        else:
            logger.info(f"Percentage of record that would be processed: 100.0%")
            logger.info(f"Model can fully see the record: YES")
        
        # Step 3: chunk if needed
        chunks = self._chunk_record_for_deberta(preprocessed)
        
        splitting_required = len(chunks) > 1
        logger.info(f"Splitting Required: {splitting_required}")
        logger.info(f"Number of Chunks: {len(chunks)}")
        
        if len(chunks) > 1:
            logger.info("-" * 80)
            for chunk_idx, chunk in enumerate(chunks):
                chunk_char_count = len(chunk)
                chunk_word_count = len(chunk.split())
                chunk_estimated_tokens = chunk_word_count * 1.3
                chunk_fits_512 = chunk_estimated_tokens <= 512
                
                logger.info(f"Chunk {chunk_idx + 1}:")
                logger.info(f"  Start Position: {sum(len(c) + 1 for c in chunks[:chunk_idx]) if chunk_idx > 0 else 0}")
                logger.info(f"  End Position: {sum(len(c) + 1 for c in chunks[:chunk_idx + 1]) - 1}")
                logger.info(f"  Character Count: {chunk_char_count}")
                logger.info(f"  Word Count: {chunk_word_count}")
                logger.info(f"  Estimated Token Count: {chunk_estimated_tokens:.0f}")
                logger.info(f"  Fits 512: {chunk_fits_512}")
                logger.info(f"  Text Preview: {chunk[:200]}...")
                logger.info("-" * 80)
        else:
            logger.info("-" * 80)
            logger.info("Full Input Text:")
            logger.info(preprocessed)
            logger.info("-" * 80)
        logger.info("=" * 80)
        # ── END STEP 1 ─────────────────────────────────────────────────────────

        # ── Entity accumulator (same structure as _parse_single_section) ─────
        entities: Dict[str, Any] = {
            'COMPANY': [], 'CLIENT': [], 'ROLE': [], 'LOCATION': [],
            'START_DATE': [], 'END_DATE': [], 'DATE_START': [], 'DATE_END': [],
            'DEGREE': [], 'EDUCATION': [], 'INSTITUTION': [], 'FIELD': [], 'GRADE': [],
            'EDU_YEAR_START': [], 'EDU_YEAR_END': []
        }
        entities_with_positions: List[Dict] = []

        # Offset within the preprocessed text (accumulates across chunks)
        chunk_text_offset = 0

        try:
            from transformers import pipeline as hf_pipeline

            ner_pipeline = hf_pipeline(
                "ner",
                model=self.model,
                tokenizer=self.tokenizer,
                aggregation_strategy="simple",
                device=-1
            )

            for chunk_idx, chunk in enumerate(chunks):
                if not chunk.strip():
                    chunk_text_offset += len(chunk) + 1  # +1 for the newline separator
                    continue

                try:
                    predictions = ner_pipeline(chunk)
                    
                    # ── STEP 2: MODEL OUTPUT DEBUG LOGGING ─────────────────────────────
                    logger.info("=" * 80)
                    logger.info(f"STEP 2: DeBERTa MODEL OUTPUT (Chunk {chunk_idx + 1})")
                    logger.info("=" * 80)
                    logger.info(f"Raw Entities: {len(predictions)}")
                    for pred in predictions:
                        entity_text = chunk[pred['start']:pred['end']].strip()
                        score = pred.get('score', 0.0)
                        logger.info(f"ENTITY:")
                        logger.info(f"  text = \"{entity_text}\"")
                        logger.info(f"  label = {pred['entity_group']}")
                        logger.info(f"  score = {score:.3f}")
                        logger.info(f"  start = {pred['start']}")
                        logger.info(f"  end = {pred['end']}")
                        logger.info("-" * 40)
                    logger.info("=" * 80)
                    # ── END STEP 2 ─────────────────────────────────────────────────────
                except Exception as chunk_err:
                    logger.warning(f"[{section_type.upper()}-RECORD] Chunk {chunk_idx} inference failed: {chunk_err}")
                    chunk_text_offset += len(chunk) + 1
                    continue

                # Aggregate consecutive same-type entities (same logic as _parse_single_section)
                aggregated: List[Dict] = []
                current_ent: Optional[Dict] = None

                for pred in predictions:
                    etype = pred['entity_group']
                    estart = pred['start']
                    eend = pred['end']

                    if current_ent and current_ent['type'] == etype and estart <= current_ent['end'] + 5:
                        current_ent['end'] = eend
                    else:
                        if current_ent:
                            aggregated.append(current_ent)
                        current_ent = {'type': etype, 'start': estart, 'end': eend}

                if current_ent:
                    aggregated.append(current_ent)

                # Convert aggregated predictions → entity dict
                for agg in aggregated:
                    etype = agg['type']
                    estart = agg['start']
                    eend = agg['end']

                    entity_text = chunk[estart:eend].strip()
                    entity_text = entity_text.replace('|', '').strip()

                    # Multi-line entity handling (same as _parse_single_section)
                    if '\n' in entity_text:
                        elines = [l.strip() for l in entity_text.split('\n') if l.strip()]
                        if len(elines) == 1:
                            entity_text = elines[0]
                        elif etype in ['COMPANY', 'INSTITUTION']:
                            combined = ' '.join(elines)
                            entity_text = combined if len(combined) <= 100 else ' '.join(elines[:2])
                        else:
                            entity_text = elines[0]

                    if etype in entities and entity_text:
                        entities[etype].append(entity_text)
                        # Position = char_offset (section) + chunk_text_offset + local pos
                        abs_start = char_offset + chunk_text_offset + estart
                        abs_end = char_offset + chunk_text_offset + eend
                        entities_with_positions.append({
                            'type': etype,
                            'text': entity_text,
                            'start': abs_start,
                            'end': abs_end
                        })

                chunk_text_offset += len(chunk) + 1  # +1 for newline separator between chunks

        except Exception as e:
            # Safeguard 11: Exception Logging with full traceback
            # Safeguard 1: Never silently fallback - return empty dict on exception
            logger.error(f"[{section_type.upper()}-RECORD] Pipeline failed: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            logger.error(f"Input record (first 200 chars): {record_text[:200]}")
            
            # ── STEP 15: FALLBACK AUDIT DEBUG LOGGING ───────────────────────────────
            logger.info("=" * 80)
            logger.info("STEP 15: FALLBACK AUDIT - Exception Occurred")
            logger.info("=" * 80)
            logger.info("FALLBACK: NO")
            logger.info("Reason: Model inference failed")
            logger.info("Exception type: " + type(e).__name__)
            logger.info("Exception message: " + str(e))
            logger.info("Stack trace logged above")
            logger.info("Action: Returning empty entities (no fallback to rule-based)")
            logger.info("=" * 80)
            # ── END STEP 15 ───────────────────────────────────────────────────────────
            
            # Return empty entities, NOT fallback to _parse_single_section
            return {
                'COMPANY': [], 'CLIENT': [], 'ROLE': [], 'LOCATION': [],
                'START_DATE': [], 'END_DATE': [], 'DATE_START': [], 'DATE_END': [],
                'DEGREE': [], 'EDUCATION': [], 'INSTITUTION': [], 'FIELD': [], 'GRADE': [],
                'EDU_YEAR_START': [], 'EDU_YEAR_END': []
            }

        # Attach positions for DeBERTaExperienceBuilder
        entities['_positions'] = entities_with_positions

        # Apply hybrid post-processing (unchanged — reusing existing call)
        try:
            from parsers.hybrid_ner_postprocessor import apply_hybrid_postprocessing
            entities = apply_hybrid_postprocessing(entities, preprocessed)
        except Exception as e:
            logger.warning(f"[{section_type.upper()}-RECORD] Hybrid post-processing failed: {e}")

        entity_counts = {k: len(v) for k, v in entities.items() if v and k != '_positions'}
        logger.debug(f"[{section_type.upper()}-RECORD] NER output: {entity_counts}")

        return entities

    def _load_model(self):
        """
        Safeguard 5: Startup Self Test - Load the trained DeBERTa NER model.
        
        Fails hard if model files don't exist or loading fails.
        No silent fallback to rule-based parsing.
        """
        # Safeguard 5: Check if model files exist - fail hard if not
        if not self._check_model_files_exist():
            error_msg = f"❌ CRITICAL: DeBERTa model files not found at {self.model_path}. Cannot start parser without model."
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        try:
            # Try to load transformers-based model
            from transformers import AutoTokenizer, AutoModelForTokenClassification
            import json
            
            # Load tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path, local_files_only=True)
            self.model = AutoModelForTokenClassification.from_pretrained(self.model_path, local_files_only=True)
            
            # Load label mappings - try multiple sources
            label_path = os.path.join(self.model_path, 'label_mappings.json')
            if os.path.exists(label_path):
                with open(label_path, 'r') as f:
                    mappings = json.load(f)
                    # Handle both naming conventions: id2label/label2id and id_to_label/label_to_id
                    if 'id2label' in mappings:
                        self.id_to_label = {int(k): v for k, v in mappings['id2label'].items()}
                        self.label_to_id = mappings['label2id']
                    elif 'id_to_label' in mappings:
                        self.id_to_label = {int(k): v for k, v in mappings['id_to_label'].items()}
                        self.label_to_id = mappings['label_to_id']
                    else:
                        raise KeyError("Label mappings file missing required keys")
            elif hasattr(self.model.config, 'id2label'):
                # Fallback to model config
                self.id_to_label = self.model.config.id2label
                self.label_to_id = self.model.config.label2id
            else:
                # Last resort: create from model config
                num_labels = self.model.config.num_labels
                self.id_to_label = {i: f"LABEL_{i}" for i in range(num_labels)}
                self.label_to_id = {f"LABEL_{i}": i for i in range(num_labels)}
                logger.warning("⚠️ Using default label mappings - accuracy may be affected")
            
            self.is_loaded = True
            self.deberta_available = True
            logger.info(f"✅ DeBERTa NER model loaded successfully with {len(self.id_to_label)} labels")
            
        except Exception as e:
            # Safeguard 11: Exception Logging with full traceback
            error_msg = f"❌ CRITICAL: Failed to load DeBERTa model: {e}"
            logger.error(error_msg)
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            raise RuntimeError(error_msg) from e
    
    def is_available(self) -> bool:
        """Check if DeBERTa parser is available (model loaded or structured parser available)."""
        return self.is_loaded or self.structured_parser is not None
    
    def parse_text(self, text: str) -> Dict[str, Any]:
        """
        Safeguard 2: Fail Safe Experience Parsing
        Safeguard 3: Fail Safe Education Parsing
        
        Parse resume text using DeBERTa NER model with section-focused approach.
        IMPORTANT: DeBERTa only processes experience and education sections,
        never the full resume text. This prevents token overflow and improves accuracy.
        
        NO SILENT FALLBACK: If DeBERTa fails, returns empty experience/education lists.
        
        Args:
            text: Full resume text
            
        Returns:
            Dictionary with extracted entities from focused sections
        """
        # Safeguard 13: Pipeline Health Check
        if not self.is_loaded or self.model is None:
            error_msg = "❌ CRITICAL: DeBERTa model not loaded. Cannot parse without model."
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        try:
            # CRITICAL: Extract only relevant sections — don't pass full text to DeBERTa
            logger.info("🎯 Extracting focused sections for DeBERTa processing...")
            sections = self.extract_target_sections(text)
            
            # Parse only the extracted sections (not full text)
            exp_entities = {}
            edu_entities = {}
            
            # Parse work experience section
            if sections['work_experience_text']:
                logger.info(f"📊 Parsing work experience section ({len(sections['work_experience_text'])} chars)")
                exp_entities = self._parse_single_section(
                    sections['work_experience_text'], 
                    section_type='experience'
                )
            
            # Parse education section
            if sections['education_text']:
                logger.info(f"🎓 Parsing education section ({len(sections['education_text'])} chars)")
                edu_entities = self._parse_single_section(
                    sections['education_text'], 
                    section_type='education'
                )
            
            # Merge entities from both sections
            all_entities = self._merge_section_entities(exp_entities, edu_entities)
            
            # Safeguard 7: Entity Count Validation
            entity_count = sum(len(v) for v in all_entities.values() if isinstance(v, list))
            logger.info(f"✅ DeBERTa extracted {entity_count} entities from focused sections")
            
            # Safeguard 8: DeBERTa Integrity Check
            # If zero entities, log warning but DO NOT fallback to rule-based
            if entity_count == 0:
                logger.warning("⚠️ DeBERTa found no entities - returning empty results (no fallback)")
                # Return empty entities, not rule-based fallback
                return self._format_results(all_entities)
            
            logger.info(f"✅ DeBERTa extracted {entity_count} entities from focused sections")
            
            # Store original text for position-based grouping
            all_entities['_original_text'] = sections.get('work_experience_text', text)
            
            # Convert to expected format
            result = self._format_results(all_entities)
            
            # Safeguard 18: Final Source Validation before API response
            # Validate that all experiences have source="deberta_ner"
            if 'work_experience' in result:
                for exp in result['work_experience']:
                    if exp.get('source') != 'deberta_ner':
                        logger.error(f"❌ CRITICAL: Final source validation failed. Experience has invalid source: {exp.get('source')}")
                        logger.error(f"Experience record: {exp}")
                        raise ValueError(f"Experience source validation failed. Expected 'deberta_ner', got '{exp.get('source')}'")
            
            # Validate that all education records have source="deberta_ner"
            if 'education' in result:
                for edu in result['education']:
                    if edu.get('source') != 'deberta_ner':
                        logger.error(f"❌ CRITICAL: Final source validation failed. Education has invalid source: {edu.get('source')}")
                        logger.error(f"Education record: {edu}")
                        raise ValueError(f"Education source validation failed. Expected 'deberta_ner', got '{edu.get('source')}'")
            
            return result
            
        except Exception as e:
            # Safeguard 11: Exception Logging with full traceback
            # Safeguard 1: Never silently fallback - return empty results on exception
            logger.error(f"❌ CRITICAL: Error parsing text with DeBERTa: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            logger.error(f"Input text (first 500 chars): {text[:500]}")
            # Return empty results, NOT rule-based fallback
            return {
                'companies': [],
                'job_titles': [],
                'locations': [],
                'clients': [],
                'work_experience': [],
                'education': [],
                'degrees': [],
                'institutions': [],
                'skills': [],
                'certifications': [],
                'projects': [],
                'summary': '',
                'contact': {}
            }
    
    def extract_target_sections(self, text: str) -> Dict[str, str]:
        """
        Extract only Work Experience and Education sections for DeBERTa processing.
        This focused approach prevents token truncation and improves accuracy.
        
        Args:
            text: Full resume text
            
        Returns:
            Dictionary with clean work_experience and education sections
        """
        import re
        
        # Split text into lines for better section detection
        lines = text.split('\n')
        
        sections = {'work_experience_text': '', 'education_text': ''}
        
        # Find section boundaries by detecting headers
        work_start = -1
        work_end = -1
        edu_start = -1
        edu_end = -1
        
        # Common section headers (case-insensitive)
        work_headers = ['work experience', 'employment history', 'professional experience', 
                       'experience', 'career history', 'work history', 'professional background']
        edu_headers = ['education', 'academic background', 'qualifications', 
                      'educational background', 'academic qualifications']
        # ── STEP 12: Projects section must never contribute Experience records ──
        # These headers mark the end of work experience section
        other_headers = ['projects', 'certifications', 'skills', 'technical skills', 
                        'summary', 'objective', 'achievements', 'awards', 'publications',
                        'project experience', 'personal projects', 'academic projects']
        
        # Find work experience section
        for i, line in enumerate(lines):
            line_lower = line.strip().lower()
            
            # Check if this line is a work experience header
            if any(header == line_lower or line_lower.startswith(header) for header in work_headers):
                work_start = i  # Include the header line (structured parser will handle it)
                continue
            
            # Check if this line is an education header (marks end of work experience)
            if work_start != -1 and work_end == -1:
                if any(header == line_lower or line_lower.startswith(header) for header in edu_headers + other_headers):
                    work_end = i
                    break
        
        # If work section found but no end, take rest of document
        if work_start != -1 and work_end == -1:
            work_end = len(lines)
        
        # Extract work experience text
        if work_start != -1 and work_end != -1:
            # Skip the header line (work_start) and extract content only
            work_lines = lines[work_start + 1:work_end]
            sections['work_experience_text'] = '\n'.join(work_lines).strip()
        else:
            # If no section headers found, assume entire text is work experience
            # This handles cases where text is already just the work experience section
            logger.info("No work experience header found, treating entire text as work experience")
            sections['work_experience_text'] = text.strip()
        
        # Find education section
        for i, line in enumerate(lines):
            line_lower = line.strip().lower()
            
            # Check if this line is an education header
            if any(header == line_lower or line_lower.startswith(header) for header in edu_headers):
                edu_start = i  # Include the header line
                continue
            
            # Check if this line is another section header (marks end of education)
            if edu_start != -1 and edu_end == -1:
                if any(header == line_lower or line_lower.startswith(header) for header in other_headers):
                    edu_end = i
                    break
        
        # If education section found but no end, take rest of document
        if edu_start != -1 and edu_end == -1:
            edu_end = len(lines)
        
        # Extract education text
        if edu_start != -1 and edu_end != -1:
            # Skip the header line (edu_start) and extract content only
            edu_lines = lines[edu_start + 1:edu_end]
            sections['education_text'] = '\n'.join(edu_lines).strip()
        
        # Limit to reasonable length (prevent too much text)
        if len(sections['work_experience_text']) > 15000:
            sections['work_experience_text'] = sections['work_experience_text'][:15000]
        
        if len(sections['education_text']) > 5000:
            sections['education_text'] = sections['education_text'][:5000]
        
        logger.info(f"📄 Extracted sections: Work={len(sections['work_experience_text'])} chars, Education={len(sections['education_text'])} chars")
        return sections
    
    def parse_focused_sections(self, sections: Dict[str, str]) -> Dict[str, Any]:
        """
        Safeguard 6: Builder Exception Isolation
        Safeguard 13: Pipeline Health Check
        
        Parse only the extracted sections with DeBERTa for maximum accuracy.

        REFACTORED: Now performs one DeBERTa inference per individual record
        instead of one inference over the entire section. This solves:
          - Problem 1/2: entire-section input (now record-level)
          - Problem 3: token truncation (chunking via _chunk_record_for_deberta)
          - Problem 4: cross-record entity grouping (each record scoped)

        NO SILENT FALLBACK: If DeBERTa fails, returns empty experience/education lists.

        Args:
            sections: Dictionary with work_experience_text and education_text

        Returns:
            Dictionary with extracted entities — identical schema to before
        """
        # Safeguard 13: Pipeline Health Check
        if not self.is_loaded or self.model is None:
            error_msg = "❌ CRITICAL: DeBERTa model not loaded. Cannot parse without model."
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        try:
            all_entities: Dict[str, Any] = {}

            # ── Work Experience: record-level inference ───────────────────────
            if sections['work_experience_text']:
                exp_section = sections['work_experience_text']
                logger.info(f"🤖 Parsing Work Experience with TRAINED DeBERTa model... "
                            f"({len(exp_section)} chars)")

                # Split section into individual job records
                exp_records = self._split_experience_into_records(exp_section)
                logger.info(f"📋 Experience section split into {len(exp_records)} record(s)")

                # ── Track record-level metrics for summary table ───────────────────
                record_metrics = []  # List of dicts with metrics for each record
                # ── End metrics tracking ─────────────────────────────────────────────

                # Run DeBERTa once per record, collecting entities with absolute positions
                merged_exp_entities: Dict[str, Any] = {
                    'COMPANY': [], 'CLIENT': [], 'ROLE': [], 'LOCATION': [],
                    'START_DATE': [], 'END_DATE': [], 'DATE_START': [], 'DATE_END': [],
                    'DEGREE': [], 'EDUCATION': [], 'INSTITUTION': [], 'FIELD': [], 'GRADE': [],
                    'EDU_YEAR_START': [], 'EDU_YEAR_END': [],
                    '_positions': []
                }
                char_offset = 0
                # ── FIX 2: Block boundaries for offset-safe entity scoping ────────────
                # Track where each record actually starts in exp_section.
                # We search forward from the last known position so we never
                # mis-match a repeated substring.
                block_boundaries = []  # List of (start, end) tuples in exp_section coords
                search_from = 0

                for rec_idx, record in enumerate(exp_records):
                    logger.debug(f"[EXP] Record {rec_idx + 1}/{len(exp_records)} "
                                 f"before preprocess: {record[:100]!r}")

                    # ── FIX 2: Resolve true char_offset in exp_section ────────────────
                    # Use the first 60 chars of the record as a search anchor.
                    anchor = record.strip()[:60]
                    found_pos = exp_section.find(anchor, search_from)
                    if found_pos != -1:
                        char_offset = found_pos
                        search_from = found_pos + len(record)
                    else:
                        # Anchor not found (can happen after heavy preprocessing),
                        # fall back to sequential accumulation.
                        search_from = char_offset + len(record) + 1
                    block_start = char_offset
                    block_end = char_offset + len(record)
                    block_boundaries.append((block_start, block_end))
                    logger.debug(
                        f"[EXP] Record {rec_idx + 1}: offset={char_offset} "
                        f"(block {block_start}-{block_end})"
                    )

                    # ── Collect record metrics before processing ───────────────────
                    # Convert and preprocess to get accurate metrics
                    converted = self._convert_to_natural_language(record)
                    layout_recovered = self._recover_pdf_layout(converted)
                    headers_reconstructed = self._reconstruct_multiline_headers(layout_recovered)
                    noise_removed = self._remove_ocr_noise(headers_reconstructed)
                    preprocessed = self._preprocess_text(noise_removed)
                    
                    char_count = len(preprocessed)
                    word_count = len(preprocessed.split())
                    estimated_tokens = word_count * 1.3
                    fits_512 = estimated_tokens <= 512
                    truncated = not fits_512
                    percentage_processed = (512 / estimated_tokens) * 100 if not fits_512 else 100.0
                    model_can_fully_see = fits_512
                    chunks_needed = len(self._chunk_record_for_deberta(preprocessed))
                    splitting_required = chunks_needed > 1
                    
                    record_metrics.append({
                        'record': rec_idx + 1,
                        'characters': char_count,
                        'words': word_count,
                        'estimated_tokens': estimated_tokens,
                        'fits_512': fits_512,
                        'truncated': truncated,
                        'percentage_processed': percentage_processed,
                        'model_can_fully_see': model_can_fully_see,
                        'splitting_required': splitting_required,
                        'chunks_needed': chunks_needed
                    })
                    # ── End metrics collection ───────────────────────────────────────

                    rec_entities = self._run_deberta_on_record(
                        record, 'experience', char_offset=char_offset
                    )

                    # Merge list-type entity fields
                    for key in merged_exp_entities:
                        if key == '_positions':
                            merged_exp_entities['_positions'].extend(
                                rec_entities.get('_positions', [])
                            )
                        elif isinstance(merged_exp_entities[key], list):
                            merged_exp_entities[key].extend(
                                rec_entities.get(key, [])
                            )

                    entity_counts = {k: len(v) for k, v in rec_entities.items()
                                     if isinstance(v, list) and v and k != '_positions'}
                    logger.debug(f"[EXP] Record {rec_idx + 1} grouped JSON: {entity_counts}")

                    # char_offset is already updated correctly above via anchor search

                logger.info(f"📊 Merged DeBERTa exp entities: "
                            f"{len(merged_exp_entities.get('COMPANY', []))} companies, "
                            f"{len(merged_exp_entities.get('ROLE', []))} roles")

                # Build structured experiences
                # ── FIX 4: Pass block boundaries for block-scoped entity clustering ──
                # block_boundaries is a list of (start, end) tuples pointing into
                # exp_section — one entry per split record.
                from parsers.deberta_experience_builder import DeBERTaExperienceBuilder
                builder = DeBERTaExperienceBuilder()
                merged_exp_entities['_block_boundaries'] = block_boundaries
                work_experiences = builder.build_experiences_from_entities(
                    merged_exp_entities,
                    exp_section
                )

                # Safeguard 8: DeBERTa Integrity Check
                # If DeBERTa found no experiences, log warning but DO NOT fallback to rule-based
                if len(work_experiences) == 0:
                    logger.warning("⚠️ DeBERTa found no experiences - returning empty list (no fallback)")
                    # Return empty experiences, NOT extract_experience fallback
                    work_experiences = []

                # Collect lists for compatibility (same as before)
                all_entities['companies'] = [
                    exp['company_name'] for exp in work_experiences if exp.get('company_name')
                ]
                all_entities['locations'] = [
                    exp['location'] for exp in work_experiences if exp.get('location')
                ]
                all_entities['job_titles'] = [
                    exp['job_title'] for exp in work_experiences if exp.get('job_title')
                ]
                all_entities['clients'] = merged_exp_entities.get('CLIENT', [])
                all_entities['work_experience'] = work_experiences

                logger.info(f"✅ DeBERTa model built {len(work_experiences)} work experiences")

                # ── STEP 2: SUMMARY TABLE AND TOTAL SECTION ANALYSIS ───────────────
                logger.info("=" * 80)
                logger.info("STEP 2: DEBERTA MODEL INPUT SUMMARY TABLE")
                logger.info("=" * 80)
                
                if record_metrics:
                    # Print table header
                    logger.info(f"{'Record':<8} {'Chars':<10} {'Words':<10} {'Tokens':<12} {'Fits 512?':<12} {'Truncated?':<12}")
                    logger.info("-" * 80)
                    
                    # Print each record row
                    for metrics in record_metrics:
                        logger.info(f"{metrics['record']:<8} {metrics['characters']:<10} "
                                   f"{metrics['words']:<10} {metrics['estimated_tokens']:<12.0f} "
                                   f"{str(metrics['fits_512']):<12} {str(metrics['truncated']):<12}")
                    
                    logger.info("-" * 80)
                    
                    # Calculate totals
                    total_chars = sum(m['characters'] for m in record_metrics)
                    total_words = sum(m['words'] for m in record_metrics)
                    total_tokens = sum(m['estimated_tokens'] for m in record_metrics)
                    any_truncated = any(m['truncated'] for m in record_metrics)
                    any_splitting = any(m['splitting_required'] for m in record_metrics)
                    
                    logger.info(f"TOTALS:   {total_chars:<10} {total_words:<10} {total_tokens:<12.0f}")
                    logger.info("-" * 80)
                    
                    # Total section analysis
                    logger.info("=" * 80)
                    logger.info("TOTAL EXPERIENCE SECTION ANALYSIS")
                    logger.info("=" * 80)
                    logger.info(f"Total Character Count: {total_chars}")
                    logger.info(f"Total Word Count: {total_words}")
                    logger.info(f"Total Estimated Token Count: {total_tokens:.0f}")
                    logger.info(f"DeBERTa-v3-base Token Limit: 512")
                    
                    if total_tokens <= 512:
                        logger.info(f"✅ Sending the WHOLE section at once would NOT cause truncation")
                        logger.info(f"   The entire experience section fits within the 512-token limit")
                    else:
                        excess_tokens = total_tokens - 512
                        percentage_of_section = (512 / total_tokens) * 100
                        logger.info(f"⚠️  Sending the WHOLE section at once WOULD cause truncation")
                        logger.info(f"   Exceeds 512-token limit by {excess_tokens:.0f} tokens")
                        logger.info(f"   Only {percentage_of_section:.1f}% of the section would be processed")
                        logger.info(f"   Current record-level approach prevents this truncation")
                    
                    logger.info(f"Any records require splitting: {any_splitting}")
                    logger.info(f"Any records would be truncated if sent individually: {any_truncated}")
                    logger.info("=" * 80)
                # ── END STEP 2 ─────────────────────────────────────────────────────

            # ── Education: record-level inference ────────────────────────────
            if sections['education_text']:
                edu_section = sections['education_text']
                logger.info(f"🎓 Parsing Education section with DeBERTa... "
                            f"({len(edu_section)} chars)")

                edu_records = self._split_education_into_records(edu_section)
                logger.info(f"📋 Education section split into {len(edu_records)} record(s)")

                merged_edu_entities: Dict[str, Any] = {
                    'COMPANY': [], 'CLIENT': [], 'ROLE': [], 'LOCATION': [],
                    'START_DATE': [], 'END_DATE': [], 'DATE_START': [], 'DATE_END': [],
                    'DEGREE': [], 'EDUCATION': [], 'INSTITUTION': [], 'FIELD': [], 'GRADE': [],
                    'EDU_YEAR_START': [], 'EDU_YEAR_END': [],
                    '_positions': []
                }
                edu_char_offset = 0

                for rec_idx, record in enumerate(edu_records):
                    logger.debug(f"[EDU] Record {rec_idx + 1}/{len(edu_records)} "
                                 f"before preprocess: {record[:100]!r}")

                    rec_entities = self._run_deberta_on_record(
                        record, 'education', char_offset=edu_char_offset
                    )

                    for key in merged_edu_entities:
                        if key == '_positions':
                            merged_edu_entities['_positions'].extend(
                                rec_entities.get('_positions', [])
                            )
                        elif isinstance(merged_edu_entities[key], list):
                            merged_edu_entities[key].extend(
                                rec_entities.get(key, [])
                            )

                    edu_char_offset += len(record) + 1

                # Merge education entities into all_entities
                # Only update keys not already set by experience parsing
                for key, val in merged_edu_entities.items():
                    if key not in all_entities or not all_entities.get(key):
                        all_entities[key] = val
                    elif isinstance(val, list) and isinstance(all_entities.get(key), list):
                        all_entities[key] = all_entities[key] + val

            # Store original education text for rule-based fallback
            all_entities['_edu_original_text'] = sections.get('education_text', '')

            # ── Final check and format (unchanged) ───────────────────────────
            entity_count = sum(len(v) for v in all_entities.values() if isinstance(v, list))

            # Safeguard 8: DeBERTa Integrity Check
            # If zero entities, log warning but DO NOT fallback to rule-based
            if entity_count == 0:
                logger.warning("⚠️ No entities found in sections - returning empty results (no fallback)")
                return self._format_results(all_entities)

            logger.info(f"✅ Found {entity_count} entities across all records")
            return self._format_results(all_entities)

        except Exception as e:
            # Safeguard 11: Exception Logging with full traceback
            # Safeguard 1: Never silently fallback - return empty results on exception
            logger.error(f"❌ CRITICAL: Error parsing sections: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            # Return empty results, NOT _structured_fallback_sections
            return {
                'companies': [],
                'job_titles': [],
                'locations': [],
                'clients': [],
                'work_experience': [],
                'education': [],
                'degrees': [],
                'institutions': [],
                'skills': [],
                'certifications': [],
                'projects': [],
                'summary': '',
                'contact': {}
            }
    
    def _merge_section_entities(self, exp_entities: Dict, edu_entities: Dict) -> Dict[str, List[str]]:
        """Merge entities from experience and education sections."""
        merged = {}
        
        # Merge all entity types
        all_keys = set(exp_entities.keys()) | set(edu_entities.keys())
        
        for key in all_keys:
            exp_list = exp_entities.get(key, [])
            edu_list = edu_entities.get(key, [])
            
            # Combine and deduplicate
            if isinstance(exp_list, list) and isinstance(edu_list, list):
                merged[key] = exp_list + edu_list
            elif isinstance(exp_list, list):
                merged[key] = exp_list
            elif isinstance(edu_list, list):
                merged[key] = edu_list
            else:
                merged[key] = []
        
        return merged
    
    def _detect_format(self, text: str) -> str:
        """
        Detect if text is in structured format (CSV, pipe-separated, etc.) or natural language.
        
        Returns:
            'csv' - Comma-separated format
            'double_colon' - Double colon separated (::)
            'pipe' - Pipe separated (|) but without @ symbol
            'double_angle' - Double angle bracket separated (>>)
            'natural' - Natural language format (has @ or natural phrasing)
        """
        lines = text.strip().split('\n')
        if not lines:
            return 'natural'
        
        # Sample first few lines
        sample_lines = lines[:3]
        
        # Check for natural language indicators
        natural_indicators = ['@', ' at ', ' in ', ' from ', ' to ']
        has_natural = any(indicator in text.lower() for indicator in natural_indicators)
        
        # Count delimiter occurrences per line
        comma_count = sum(line.count(',') for line in sample_lines) / len(sample_lines)
        double_colon_count = sum(line.count('::') for line in sample_lines) / len(sample_lines)
        pipe_count = sum(line.count('|') for line in sample_lines) / len(sample_lines)
        double_angle_count = sum(line.count('>>') for line in sample_lines) / len(sample_lines)
        
        # Detect format based on delimiter density
        if double_colon_count >= 2:
            return 'double_colon'
        elif double_angle_count >= 2:
            return 'double_angle'
        elif pipe_count >= 2 and not has_natural:
            return 'pipe'
        elif comma_count >= 3 and not has_natural:
            return 'csv'
        else:
            return 'natural'
    
    def _convert_to_natural_language(self, text: str) -> str:
        """
        Convert structured formats (CSV, pipe-separated, etc.) to natural language format
        that the DeBERTa model was trained on.
        
        Model expects: "Job Title @ Company | Location | Start Date - End Date"
        """
        format_type = self._detect_format(text)
        
        if format_type == 'natural':
            return text  # Already in correct format
        
        logger.info(f"📝 Detected {format_type} format, converting to natural language...")
        
        lines = text.strip().split('\n')
        converted_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            converted = self._convert_line_to_natural(line, format_type)
            if converted:
                converted_lines.append(converted)
        
        result = '\n'.join(converted_lines)
        logger.info(f"✅ Converted {len(lines)} lines from {format_type} to natural language")
        logger.info(f"   Preview: {result[:200]}...")
        
        return result
    
    def _convert_line_to_natural(self, line: str, format_type: str) -> str:
        """
        Convert a single line from structured format to natural language.
        
        Common patterns:
        CSV: "Company,Location,Role,StartDate,EndDate"
        Double colon: "Company :: Location :: Role :: StartDate :: EndDate"
        Pipe: "Company | Location | Role | StartDate | EndDate"
        
        Target: "Role @ Company | Location | StartDate - EndDate"
        """
        # Split by delimiter
        if format_type == 'csv':
            parts = [p.strip() for p in line.split(',')]
        elif format_type == 'double_colon':
            parts = [p.strip() for p in line.split('::')]
        elif format_type == 'pipe':
            parts = [p.strip() for p in line.split('|')]
        elif format_type == 'double_angle':
            parts = [p.strip() for p in line.split('>>')]
        else:
            return line
        
        if len(parts) < 3:
            return line  # Not enough parts, return as-is
        
        # Heuristic to identify which part is which
        # Common patterns:
        # 1. Company, Location, Role, StartDate, EndDate
        # 2. Role, Company, Location, StartDate, EndDate
        
        company = None
        role = None
        location = None
        start_date = None
        end_date = None
        
        # Identify parts by keywords and patterns
        for i, part in enumerate(parts):
            part_lower = part.lower()
            
            # Role indicators (contains job keywords)
            role_keywords = ['engineer', 'developer', 'analyst', 'manager', 'architect', 
                           'consultant', 'designer', 'scientist', 'specialist', 'lead',
                           'senior', 'junior', 'principal', 'staff', 'director', 'vp']
            if any(keyword in part_lower for keyword in role_keywords) and not role:
                role = part
                continue
            
            # Date indicators (contains year or month)
            date_keywords = ['january', 'february', 'march', 'april', 'may', 'june',
                           'july', 'august', 'september', 'october', 'november', 'december',
                           'present', 'current', '20', '19']
            if any(keyword in part_lower for keyword in date_keywords):
                if not start_date:
                    start_date = part
                elif not end_date:
                    end_date = part
                continue
            
            # Location indicators (contains state/country or city patterns)
            location_keywords = ['india', 'usa', 'ca', 'ny', 'tx', 'wa', 'bangalore', 
                               'hyderabad', 'chennai', 'mumbai', 'delhi', 'pune',
                               'seattle', 'francisco', 'york', 'austin', 'boston']
            if any(keyword in part_lower for keyword in location_keywords) and not location:
                location = part
                continue
            
            # Company (usually first non-role, non-date, non-location part)
            if not company and not role:
                company = part
        
        # If we still don't have company, use first part
        if not company and len(parts) > 0:
            company = parts[0]
        
        # If we still don't have role, try to find it
        if not role and len(parts) > 2:
            # Check if second or third part looks like a role
            for part in parts[1:3]:
                if part and part != company and part != location:
                    role = part
                    break
        
        # Build natural language format: "Role @ Company | Location | StartDate - EndDate"
        result_parts = []
        
        if role:
            result_parts.append(role)
        
        if company:
            if result_parts:
                result_parts.append('@')
            result_parts.append(company)
        
        if location:
            if result_parts:
                result_parts.append('|')
            result_parts.append(location)
        
        if start_date or end_date:
            if result_parts:
                result_parts.append('|')
            if start_date:
                result_parts.append(start_date)
            if end_date:
                if start_date:
                    result_parts.append('-')
                result_parts.append(end_date)
        
        return ' '.join(result_parts)
    
    def _parse_single_section(self, text: str, section_type: str) -> Dict[str, List[str]]:
        """Parse a single section with DeBERTa using Hugging Face pipeline with aggregation."""
        if not text or not text.strip():
            logger.warning(f"Empty {section_type} section, skipping DeBERTa parsing")
            return {}
        
        # Detect and convert structured formats to natural language
        text = self._convert_to_natural_language(text)
        
        # Pre-process text to normalize format
        text = self._preprocess_text(text)
        
        # Log the input text for debugging
        logger.info(f"🔍 DeBERTa parsing {section_type} section:")
        logger.info(f"   Text length: {len(text)} chars")
        logger.info(f"   Text preview: {text[:300]}...")
        
        # Initialize entities with label names from trained model
        entities_with_positions = []  # List of {type, text, start, end}
        entities = {
            'COMPANY': [], 'CLIENT': [], 'ROLE': [], 'LOCATION': [],
            'START_DATE': [], 'END_DATE': [], 'DATE_START': [], 'DATE_END': [],
            'DEGREE': [], 'EDUCATION': [], 'INSTITUTION': [], 'FIELD': [], 'GRADE': [],
            'EDU_YEAR_START': [], 'EDU_YEAR_END': []
        }
        
        # Use Hugging Face pipeline with aggregation to properly combine multi-token entities
        try:
            from transformers import pipeline
            
            # Create NER pipeline with aggregation strategy
            ner_pipeline = pipeline(
                "ner",
                model=self.model,
                tokenizer=self.tokenizer,
                aggregation_strategy="simple",  # Better for combining full entity text
                device=-1  # CPU
            )
            
            # Run prediction
            predictions = ner_pipeline(text)
            
            # Manually aggregate consecutive entities of the same type
            # (pipeline aggregation doesn't always work perfectly with DeBERTa tokenizer)
            aggregated = []
            current_entity = None
            
            for pred in predictions:
                entity_type = pred['entity_group']
                entity_start = pred['start']
                entity_end = pred['end']
                
                # Increase proximity window to 5 chars to catch space-separated tokens
                if current_entity and current_entity['type'] == entity_type and entity_start <= current_entity['end'] + 5:
                    # Extend current entity
                    current_entity['end'] = entity_end
                else:
                    # Save previous and start new
                    if current_entity:
                        aggregated.append(current_entity)
                    current_entity = {
                        'type': entity_type,
                        'start': entity_start,
                        'end': entity_end
                    }
            
            # Save last entity
            if current_entity:
                aggregated.append(current_entity)
            
            # Convert aggregated predictions to our format
            for agg in aggregated:
                entity_type = agg['type']
                entity_start = agg['start']
                entity_end = agg['end']
                
                # Extract full text from original string using positions
                entity_text = text[entity_start:entity_end].strip()
                
                # Clean common noise characters (pipes, extra spaces)
                entity_text = entity_text.replace('|', '').strip()
                
                # CRITICAL FIX: Clean up entities that span multiple lines
                # If entity contains newline, split and take the longest meaningful part
                if '\n' in entity_text:
                    lines = [line.strip() for line in entity_text.split('\n') if line.strip()]
                    if lines:
                        # Take the first non-empty line (usually the actual entity)
                        # For ROLE: "Full Stack Developer\nGatnix" -> "Full Stack Developer"
                        # For COMPANY: "Gatnix\nTechnologies" -> keep both if short
                        if len(lines) == 1:
                            entity_text = lines[0]
                        elif entity_type in ['COMPANY', 'INSTITUTION']:
                            # For companies/institutions, join lines to preserve full names
                            # e.g., "NIT\nPatna" -> "NIT Patna", "Carnegie Mellon\nUniversity" -> "Carnegie Mellon University"
                            # Join up to 3 lines or 100 chars total to avoid noise
                            if len(lines) <= 3:
                                combined = ' '.join(lines)
                                if len(combined) <= 100:
                                    entity_text = combined
                                else:
                                    # Too long, take first 2 lines
                                    entity_text = ' '.join(lines[:2])
                            else:
                                # More than 3 lines, likely noise - take first line
                                entity_text = lines[0]
                        else:
                            # For other types (ROLE, LOCATION), take first line only
                            entity_text = lines[0]
                
                # Map entity types to our schema
                if entity_type in entities and entity_text:
                    entities[entity_type].append(entity_text)
                    entities_with_positions.append({
                        'type': entity_type,
                        'text': entity_text,
                        'start': entity_start,
                        'end': entity_end
                    })
            
            logger.info(f"✅ Pipeline extracted {len(predictions)} aggregated entities")
            
        except Exception as e:
            logger.warning(f"Pipeline aggregation failed: {e}, falling back to manual extraction")
            
            # Fallback to manual token-by-token extraction
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=2048,
                return_offsets_mapping=True
            )
            offset_mapping = inputs.pop("offset_mapping")[0]
            
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            predictions = torch.argmax(outputs.logits[0], dim=1)
            tokens = self.tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
            
            # Extract entities using offset mapping for accurate text (fallback only)
            current_entity = None
            current_text = ""
            current_label = None
            current_start = None
            
            for idx, (token, pred_id, offset) in enumerate(zip(tokens, predictions, offset_mapping)):
                if token in ['<s>', '</s>', '<pad>', '[CLS]', '[SEP]', '[PAD]']:
                    continue
                
                label = self.id_to_label[pred_id.item()]
                start, end = offset
                
                if start == end:
                    continue
                
                actual_text = text[start:end]
                
                if label.startswith('B-'):
                    if current_entity and current_text and current_start is not None:
                        clean_text = current_text.strip()
                        if clean_text and current_entity in entities:
                            entities[current_entity].append(clean_text)
                            entities_with_positions.append({
                                'type': current_entity,
                                'text': clean_text,
                                'start': current_start,
                                'end': start
                            })
                    
                    current_label = label[2:]
                    current_text = actual_text
                    current_entity = current_label
                    current_start = start
                    
                elif label.startswith('I-') and current_entity and label[2:] == current_label:
                    current_text += actual_text
                    
                else:
                    if current_entity and current_text and current_start is not None:
                        clean_text = current_text.strip()
                        if clean_text and current_entity in entities:
                            entities[current_entity].append(clean_text)
                            entities_with_positions.append({
                                'type': current_entity,
                                'text': clean_text,
                                'start': current_start,
                                'end': start
                            })
                        current_entity = None
                        current_text = ""
                        current_label = None
                        current_start = None
            
            # Save final entity
            if current_entity and current_text and current_start is not None:
                clean_text = current_text.strip()
                if clean_text and current_entity in entities:
                    entities[current_entity].append(clean_text)
                    entities_with_positions.append({
                        'type': current_entity,
                    'text': clean_text,
                    'start': current_start,
                    'end': len(text)  # End at text length
                })
        
        # Log extracted entities (after validation filters)
        entity_summary = {k: len(v) for k, v in entities.items() if v}
        if not entity_summary:
            logger.warning(f"⚠️ DeBERTa extracted ZERO entities from {section_type} after validation filters")
            logger.warning(f"   This could mean: (1) Model didn't detect entities, or (2) Validation filters rejected them")
        else:
            logger.info(f"✅ DeBERTa extracted from {section_type} (before hybrid post-processing): {entity_summary}")
            if entities.get('ROLE'):
                logger.info(f"   Roles extracted: {entities['ROLE']}")
            if entities.get('COMPANY'):
                logger.info(f"   Companies extracted: {entities['COMPANY'][:5]}")  # First 5
            logger.info(f"   Total entities with positions: {len(entities_with_positions)}")
        
        # Store positions for proximity-based grouping (before hybrid processing)
        entities['_positions'] = entities_with_positions
        
        # Apply hybrid post-processing (filters + rule-based person name extraction)
        # This will update _positions if needed
        try:
            from parsers.hybrid_ner_postprocessor import apply_hybrid_postprocessing
            entities = apply_hybrid_postprocessing(entities, text)
            
            # Log after hybrid processing
            entity_summary_after = {k: len(v) for k, v in entities.items() if v and k != '_positions'}
            logger.info(f"✅ After hybrid post-processing: {entity_summary_after}")
            if entities.get('PERSON_NAME'):
                logger.info(f"   Person names added: {entities['PERSON_NAME']}")
        except Exception as e:
            logger.warning(f"⚠️ Hybrid post-processing failed: {e}, using original entities")
        
        return entities
    
    def _is_person_name(self, text: str) -> bool:
        """Check if text looks like a person name."""
        text = text.strip()
        
        # Exclude company suffixes - these indicate it's a company, not a person
        company_suffixes = [
            'corporation', 'corp', 'inc', 'llc', 'ltd', 'limited', 
            'company', 'co', 'group', 'services', 'solutions', 'technologies',
            'systems', 'consulting', 'partners', 'associates', 'holdings',
            'enterprises', 'industries', 'international', 'global', 'worldwide',
            'airlines', 'airways', 'bank', 'financial', 'insurance', 'healthcare'
        ]
        
        text_lower = text.lower()
        if any(suffix in text_lower for suffix in company_suffixes):
            return False  # It's a company, not a person
        
        # Common person name patterns
        patterns = [
            r'^[A-Z][a-z]+ [A-Z][a-z]+$',  # First Last
            r'^[A-Z]\. [A-Z][a-z]+$',       # F. Last
            r'^[A-Z][a-z]+ [A-Z]\.$',       # First L.
        ]
        
        for pattern in patterns:
            if re.match(pattern, text):
                return True
        
        # Check if it's exactly 2 capitalized words (typical person name)
        # But NOT 3+ words (more likely company name)
        words = text.split()
        if len(words) == 2:
            if all(word[0].isupper() and len(word) > 1 for word in words if word):
                # Additional check: person names are usually shorter
                if len(text) < 30:  # Person names rarely exceed 30 chars
                    return True
        
        return False
    
    def _is_skill(self, text: str) -> bool:
        """Check if text is a skill/technology."""
        skill_keywords = [
            'react', 'node', 'python', 'java', 'javascript', 'typescript',
            'angular', 'vue', 'django', 'flask', 'spring', 'aws', 'docker',
            'kubernetes', 'mongodb', 'sql', 'mysql', 'postgresql', 'redis',
            'html', 'css', 'git', 'jenkins', 'ci/cd', 'agile', 'scrum'
        ]
        text_lower = text.lower().strip()
        return any(skill in text_lower for skill in skill_keywords)
    
    def _is_valid_company(self, text: str) -> bool:
        """Validate if text is a legitimate company name."""
        text = text.strip()
        
        # Must be at least 2 characters
        if len(text) < 2:
            return False
        
        # Reject if it's just numbers or single letters
        if len(text) <= 3 and (text.isdigit() or len(text.split()) == 1):
            return False
        
        # Reject common tech/skill names
        tech_keywords = ['react', 'angular', 'vue', 'node', 'python', 'java', 'django', 
                        'flask', 'spring', 'mongodb', 'sql', 'postgresql', 'mysql']
        if text.lower() in tech_keywords:
            return False
        
        # Reject if it looks like an email fragment
        if '@' in text or '.com' in text.lower():
            return False
        
        # Accept if it contains company indicators
        company_indicators = ['ltd', 'pvt', 'inc', 'corp', 'llc', 'technologies', 
                             'solutions', 'systems', 'labs', 'software', 'group']
        if any(indicator in text.lower() for indicator in company_indicators):
            return True
        
        # Accept if it's multiple words (likely a company name)
        if len(text.split()) >= 2:
            return True
        
        return False
    
    def _is_valid_job_title(self, text: str) -> bool:
        """Validate if text is a legitimate job title - LESS STRICT."""
        text = text.strip()
        
        # Must be at least 3 characters
        if len(text) < 3:
            return False
        
        # Reject if it's a person name (from contact section)
        if self._is_person_name(text):
            return False
        
        # Reject ONLY obvious non-titles
        obvious_non_titles = ['responsive', 'scalable', 'modern', 'developed', 'building', 'working']
        if len(text.split()) == 1 and text.lower() in obvious_non_titles:
            return False
        
        # Accept if it contains job title keywords
        job_keywords = ['developer', 'engineer', 'manager', 'architect', 'analyst',
                       'designer', 'consultant', 'specialist', 'lead', 'senior',
                       'junior', 'trainee', 'intern', 'director', 'coordinator',
                       'programmer', 'administrator', 'technician', 'principal']
        if any(keyword in text.lower() for keyword in job_keywords):
            return True
        
        # Accept multi-word titles (likely legitimate)
        if len(text.split()) >= 2:
            return True
        
        # Accept single-word professional titles
        professional_titles = ['ceo', 'cto', 'cfo', 'vp', 'president', 'founder']
        if text.lower() in professional_titles:
            return True
        
        return False
    
    def _is_valid_location(self, text: str) -> bool:
        """Validate if text is a legitimate location."""
        text = text.strip()
        
        # Must be at least 2 characters
        if len(text) < 2:
            return False
        
        # Reject if it's just numbers
        if text.isdigit():
            return False
        
        # Reject tech/skill names
        tech_keywords = ['react', 'angular', 'vue', 'node', 'python', 'java', 'django',
                        'flask', 'spring', 'mongodb', 'sql', 'postgresql', 'mysql',
                        'javascript', 'typescript', 'html', 'css']
        if text.lower() in tech_keywords:
            return False
        
        # Accept if it contains location indicators
        location_indicators = ['india', 'usa', 'uk', 'city', 'bangalore', 'hyderabad',
                              'mumbai', 'delhi', 'chennai', 'pune', 'kolkata']
        if any(indicator in text.lower() for indicator in location_indicators):
            return True
        
        # Accept if it looks like "City, Country" format
        if ',' in text:
            return True
        
        return False
    
    def _is_valid_degree(self, text: str) -> bool:
        """Validate if text is a legitimate degree."""
        text = text.strip()
        
        # Reject if too short (less than 2 characters)
        if len(text) < 2:
            return False
        
        # Reject single punctuation or special characters
        if text in ['(', ')', '[', ']', '{', '}', ',', '.', ':', ';', '-', '_']:
            return False
        
        # Reject common non-degree single words
        invalid_single_words = [
            'certified', 'project', 'fundamentals', 'operational', 'administrative',
            'management', 'training', 'professional', 'business', 'technical',
            'advanced', 'basic', 'intermediate', 'senior', 'junior', 'lead',
            'the', 'and', 'or', 'in', 'at', 'of', 'for', 'with', 'to', 'from'
        ]
        if len(text.split()) == 1 and text.lower() in invalid_single_words:
            return False
        
        # Accept if it contains degree keywords
        degree_keywords = [
            'bachelor', 'master', 'phd', 'doctorate', 'diploma', 'associate',
            'b.tech', 'm.tech', 'b.e', 'm.e', 'b.sc', 'm.sc', 'b.com', 'm.com',
            'b.a', 'm.a', 'mba', 'bba', 'bca', 'mca', 'llb', 'md', 'mbbs',
            'engineering', 'science', 'arts', 'commerce', 'technology',
            'degree', 'certification'
        ]
        text_lower = text.lower()
        if any(keyword in text_lower for keyword in degree_keywords):
            return True
        
        # Accept multi-word degrees (likely legitimate)
        if len(text.split()) >= 2:
            # But reject if it's just adjectives + common words
            common_phrases = ['business process', 'project management', 'risk management']
            if text_lower in common_phrases:
                return False
            return True
        
        return False
    
    def _structured_fallback_sections(self, sections: Dict[str, str]) -> Dict[str, Any]:
        """Enhanced fallback using extract_experience function."""
        result = {}
        
        # Parse work experience with ENHANCED extract_experience function
        if sections['work_experience_text']:
            from parsers.experience_extractor import extract_experience
            
            raw_experiences = extract_experience(sections['work_experience_text'])
            
            # Convert to expected format
            work_experiences = []
            companies = []
            locations = []
            job_titles = []
            
            for exp in raw_experiences:
                formatted_exp = {
                    'job_title': exp.get('title', ''),
                    'company_name': exp.get('company', ''),
                    'location': '',
                    'start_date': exp.get('start_date'),
                    'end_date': exp.get('end_date'),
                    'is_current': exp.get('is_current', False),
                    'clients': [],
                    'description': exp.get('description', '')
                }
                work_experiences.append(formatted_exp)
                
                if exp.get('company'):
                    companies.append(exp['company'])
                if exp.get('title'):
                    job_titles.append(exp['title'])
            
            result['companies'] = companies
            result['locations'] = locations
            result['job_titles'] = job_titles
            result['clients'] = []
            result['work_experience'] = work_experiences
            
            logger.info(f"✅ Fallback extractor found {len(work_experiences)} work experiences")
        
        # Use rule-based for education if no structured parser
        if sections['education_text']:
            combined_text = f"{sections['work_experience_text']}\n{sections['education_text']}"
            fallback = self._rule_based_fallback(combined_text)
            result['education'] = fallback.get('education', [])
            result['degrees'] = fallback.get('degrees', [])
            result['institutions'] = fallback.get('institutions', [])
        
        return result
    
    def _rule_based_fallback_sections(self, sections: Dict[str, str]) -> Dict[str, Any]:
        """Rule-based fallback for extracted sections."""
        combined_text = f"{sections['work_experience_text']}\n{sections['education_text']}"
        return self._rule_based_fallback(combined_text)
    
    def _rule_based_fallback(self, text: str) -> Dict[str, Any]:
        import re
        
        # Simple regex patterns for common entities
        patterns = {
            'companies': [
                r'\b(?:Infosys|TCS|Wipro|Deloitte|Accenture|Capgemini|IBM|Microsoft|Google|Amazon|Facebook|Apple|Oracle|Cisco|Intel|HP|Dell|Dignity Health|Bank of America|Inno Minds)\b',
                r'\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b'  # Capitalized company names
            ],
            'locations': [
                r'\b(?:Hyderabad|Bangalore|Pune|Mumbai|Delhi|Chennai|Kolkata|Bengaluru|San Francisco|New York|Atlanta|Pleasanton|San Francisco|CA|GA)\b',
                r'\b[A-Z][a-z]+,?\s+[A-Z]{2,}\b'  # City, State/Country
            ],
            'job_titles': [
                r'\b(?:Senior|Junior|Lead|Principal|Staff)?\s*(?:Software|Java|Python|Full Stack|Frontend|Backend|Data|Machine Learning|DevOps|Cloud|Security|QA|Test)?\s*(?:Engineer|Developer|Architect|Manager|Consultant|Analyst|Designer|Specialist)\b',
                r'\b(?:IT|Technical|Project|Product)?\s*(?:Manager|Lead|Head|Director|VP|Chief)\b'
            ],
            'degrees': [
                r'\b(?:B\.Tech|M\.Tech|B\.E|M\.E|B\.Sc|M\.Sc|B\.A|M\.A|Ph\.D|MBA|MCA|BCA)\b',
                r'\b(?:Bachelor|Master|Doctorate)s?\s+(?:of\s+)?(?:Engineering|Science|Arts|Business Administration|Computer Application|Philosophy|Technology)\b'
            ],
            'institutions': [
                r'\b(?:JNTU|IIT|NIT|IIIT|BITS|Anna|Mumbai|Delhi|Bangalore|Reddy Institute|Malla Reddy) University\b',
                r'\b[A-Z][a-z]+ (?:University|College|Institute|School of)\b'
            ]
        }
        
        entities = {}
        
        # Filter out common non-company words
        company_exclusions = {'responsibilities', 'developed', 'implemented', 'designed', 'created', 'managed', 'built', 'enhanced', 'optimized', 'maintained', 'supported', 'collaborated', 'utilized', 'applied', 'worked', 'experienced', 'proficient', 'skilled', 'expertise', 'knowledge', 'ability', 'experience', 'years', 'various', 'multiple', 'different', 'several', 'many', 'various', 'including', 'such', 'like', 'etc', 'etc.', 'and', 'or', 'with', 'for', 'in', 'on', 'at', 'by', 'through', 'from', 'to', 'of', 'the', 'a', 'an'}
        
        for entity_type, pattern_list in patterns.items():
            found_entities = set()
            for pattern in pattern_list:
                matches = re.findall(pattern, text, re.IGNORECASE)
                found_entities.update(matches)
            
            # Filter entities
            if entity_type == 'companies':
                filtered_entities = []
                for entity in found_entities:
                    # Skip if entity contains exclusion words
                    if not any(word in entity.lower() for word in company_exclusions):
                        # Skip if entity is too short or contains common words
                        if len(entity.strip()) > 2 and not entity.lower().startswith(('the ', 'a ', 'an ')):
                            filtered_entities.append(entity.strip())
                entities[entity_type] = filtered_entities
            else:
                entities[entity_type] = [e.strip() for e in found_entities if len(e.strip()) > 2]
        
        # Create structured work experience from found entities
        work_experience = []
        companies = entities.get('companies', [])
        locations = entities.get('locations', [])
        job_titles = entities.get('job_titles', [])
        
        for i, company in enumerate(companies[:3]):  # Limit to 3 companies
            exp = {
                'company': company,
                'role': job_titles[i] if i < len(job_titles) else 'Software Engineer',
                'location': locations[i] if i < len(locations) else None,
                'start_date': None,
                'end_date': None,
                'description': '',
                'source': 'rule_based_fallback'
            }
            work_experience.append(exp)
        
        # Create structured education
        education = []
        institutions = entities.get('institutions', [])
        degrees = entities.get('degrees', [])
        
        for i, institution in enumerate(institutions[:2]):  # Limit to 2 institutions
            edu = {
                'institution': institution,
                'degree': degrees[i] if i < len(degrees) else 'Bachelor Degree',
                'field_of_study': 'Computer Science',
                'start_year': None,
                'end_year': None,
                'grade': None,
                'source': 'rule_based_fallback'
            }
            education.append(edu)
        
        return {
            'companies': companies,
            'locations': locations,
            'work_experience': work_experience,
            'education': education,
            'job_titles': job_titles,
            'clients': [],
            'dates': [],
            'degrees': degrees,
            'institutions': institutions,
            'fields_of_study': [],
            'source': 'rule_based_fallback',
            'confidence': {
                'rule_based_confidence': 0.6,
                'entities_found': len(companies) + len(institutions) + len(job_titles)
            }
        }
    
    def _parse_long_resume(self, text: str) -> Dict[str, List[str]]:
        """
        Parse long resume by chunking and merging results.
        
        Args:
            text: Full resume text
            
        Returns:
            Merged entities from all chunks
        """
        # Simple chunking strategy - split by paragraphs
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            # Rough token count (1 token ≈ 1 word)
            current_words = len(current_chunk.split())
            paragraph_words = len(paragraph.split())
            
            if current_words + paragraph_words < 400:  # Safe margin from 512
                current_chunk += paragraph + "\n\n"
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = paragraph + "\n\n"
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        # Process chunks and merge results
        all_entities = defaultdict(list)
        
        for i, chunk in enumerate(chunks):
            try:
                chunk_entities = self.model.predict(chunk)
                
                # Merge entities (avoid duplicates)
                for entity_type, entity_list in chunk_entities.items():
                    for entity in entity_list:
                        if entity not in all_entities[entity_type]:
                            all_entities[entity_type].append(entity)
                            
            except Exception as e:
                logger.warning(f"Error processing chunk {i+1}: {e}")
                continue
        
        return dict(all_entities)
    
    def _format_results(self, entities: Dict[str, List[str]]) -> Dict[str, Any]:
        """
        Format DeBERTa results to match expected API format.
        
        Args:
            entities: Raw entities from DeBERTa model OR structured parser results
            
        Returns:
            Formatted results compatible with existing API
        """
        # CRITICAL: Check if structured parser already provided work_experience
        # Initialize variables to prevent 'not initialized' error
        start_dates = []
        end_dates = []
        
        # Structured parser uses lowercase keys and provides fully structured data
        if 'work_experience' in entities and isinstance(entities['work_experience'], list):
            # Use structured parser results directly and map both key sets for compatibility
            work_experience = []
            for exp in entities['work_experience']:
                company_val = exp.get('company_name', '') or exp.get('company', '')
                role_val = exp.get('job_title', '') or exp.get('role', '')
                client_val = exp.get('client', '') or (exp.get('clients')[0] if exp.get('clients') else '')
                clients_list = exp.get('clients', []) or ([client_val] if client_val else [])
                work_experience.append({
                    'company': company_val,
                    'company_name': company_val,
                    'role': role_val,
                    'job_title': role_val,
                    'location': exp.get('location', ''),
                    'start_date': exp.get('start_date'),
                    'end_date': exp.get('end_date'),
                    'is_current': exp.get('is_current', False),
                    'client': client_val,
                    'clients': clients_list,
                    'description': exp.get('description', ''),
                    'source': exp.get('source', 'deberta_ner')
                })
            companies_list = entities.get('companies', []) or [e.get('company') for e in work_experience if e.get('company')]
            job_titles = entities.get('job_titles', []) or [e.get('role') for e in work_experience if e.get('role')]
            locations_list = entities.get('locations', []) or [e.get('location') for e in work_experience if e.get('location')]
            start_dates = entities.get('dates', [])
            end_dates = []
        else:
            # Extract from DeBERTa NER (uppercase keys)
            # Use DeBERTaExperienceBuilder for proper entity grouping by proximity
            from .deberta_experience_builder import DeBERTaExperienceBuilder
            
            experience_builder = DeBERTaExperienceBuilder()
            
            # Get the original text from entities if available
            text = entities.get('_original_text', '')
            
            # Build experiences using position-based grouping
            structured_experiences = experience_builder.build_experiences_from_entities(entities, text)
            
            # Convert to API format (providing both old and new keys for backend/frontend compatibility)
            work_experience = []
            for exp in structured_experiences:
                company_val = exp.get('company_name', '') or exp.get('company', '')
                role_val = exp.get('job_title', '') or exp.get('role', '')
                client_val = exp.get('client', '') or (exp.get('clients')[0] if exp.get('clients') else '')
                clients_list = exp.get('clients', []) or ([client_val] if client_val else [])
                work_experience.append({
                    'company': company_val,
                    'company_name': company_val,
                    'role': role_val,
                    'job_title': role_val,
                    'location': exp.get('location', ''),
                    'start_date': exp.get('start_date'),
                    'end_date': exp.get('end_date'),
                    'is_current': exp.get('is_current', False),
                    'client': client_val,
                    'clients': clients_list,
                    'description': exp.get('description', ''),
                    'source': 'deberta_ner'
                })
            
            # Extract lists for compatibility
            companies_list = [exp.get('company_name', '') for exp in structured_experiences]
            job_titles = [exp.get('job_title', '') for exp in structured_experiences]
            locations_list = [exp.get('location', '') for exp in structured_experiences]
            start_dates = [exp.get('start_date') for exp in structured_experiences]
            end_dates = [exp.get('end_date') for exp in structured_experiences]
        
        # Extract education - REQUIREMENT 8: Only from DeBERTa entities
        # ── STEP 11: EDUCATION BUILDER DEBUG LOGGING ───────────────────────────────
        logger.info("=" * 80)
        logger.info("STEP 11: EDUCATION BUILDER - Entity Mapping")
        logger.info("=" * 80)
        education = []
        institutions = entities.get('EDUCATION', entities.get('INSTITUTION', []))
        
        # ── FALLBACK: Rule-based Institution Extraction ──
        if not institutions:
            edu_text = entities.get('_edu_original_text', '')
            if edu_text:
                import re
                parts = re.split(r'[,\n|]', edu_text)
                for part in parts:
                    part = part.strip()
                    # Look for institution keywords, including common Indian tech institutes
                    if re.search(r'\b(University|College|Institute|Academy|School|JNTU|IIT|NIT|BITS|IIIT|VIT|SRM|BIT)\b', part, re.IGNORECASE):
                        # Ensure it's not actually the degree
                        if not re.search(r'\b(Bachelor|Master|B\.Tech|M\.Tech|Ph\.D|B\.E|M\.E|B\.Sc|M\.Sc|Degree)\b', part, re.IGNORECASE):
                            institutions.append(part)
        
        degrees = entities.get('DEGREE', [])
        fields = entities.get('FIELD', [])
        edu_start = entities.get('EDU_YEAR_START', [])
        edu_end = entities.get('EDU_YEAR_END', [])
        grades = entities.get('GRADE', [])
        
        logger.info(f"Raw Education Entities:")
        logger.info(f"  INSTITUTION/EDUCATION: {institutions}")
        logger.info(f"  DEGREE: {degrees}")
        logger.info(f"  FIELD: {fields}")
        logger.info(f"  EDU_YEAR_START: {edu_start}")
        logger.info(f"  EDU_YEAR_END: {edu_end}")
        logger.info(f"  GRADE: {grades}")
        logger.info("-" * 80)
        # ── END STEP 11 START ───────────────────────────────────────────────────────
        
        # ── REQUIREMENT 8: EDUCATION RECONSTRUCTION - Only DeBERTa Entities ─────────────
        # Build Education only from: INSTITUTION, DEGREE, FIELD, START_DATE, END_DATE, GPA
        # Never infer: Bachelor of Arts from Bachelor of Technology
        # Never infer institutions
        # Use only DeBERTa entities
        # No regex regeneration
        
        # ── REQUIREMENT 14: EDUCATION LEAKAGE PREVENTION ─────────────────────────────
        # University, College, Bachelor, Master, GPA, Academic Project, Coursework
        # must never become Experience entities
        # This is handled by Safeguard 16 in deberta_experience_builder.py
        
        # Build education entries
        max_edu = max(len(institutions), len(degrees)) if (institutions or degrees) else 0
        
        logger.info(f"Building {max_edu} education entries...")
        logger.info("-" * 80)
        
        if max_edu > 0:
            for i in range(max_edu):
                # ── ISSUE 13: EDUCATION DATE EXTRACTION ─────────────────────────────────
                # Use DeBERTa extracted dates first
                # Do not leave years null when DeBERTa extracted dates
                # If education contains: August 2012, May 2014 → start_year=2012, end_year=2014
                start_year = edu_start[i] if i < len(edu_start) else None
                end_year = edu_end[i] if i < len(edu_end) else None
                
                # If years not extracted by model, try to parse from degree/institution text
                if not start_year and not end_year:
                    # Check degree text for year ranges like "Bachelor of Science (2010-2014)"
                    degree_text = degrees[i] if i < len(degrees) else ''
                    institution_text = institutions[i] if i < len(institutions) else ''
                    
                    # Try to extract years from degree or institution text
                    combined_text = f"{degree_text} {institution_text}"
                    extracted_start, extracted_end = self._extract_years_from_text(combined_text)
                    
                    if extracted_start:
                        start_year = extracted_start
                    if extracted_end:
                        end_year = extracted_end
                
                # ── REQUIREMENT 13: GPA NORMALIZATION ─────────────────────────────────────
                # Normalize: 3.84.0 → 3.84/4.0
                grade_raw = entities.get('GRADE', [None])[i] if i < len(entities.get('GRADE', [])) else None
                grade_normalized = self._normalize_gpa(grade_raw) if grade_raw else None
                
                # ── ISSUE 14: EDUCATION FIELD RECONSTRUCTION ─────────────────────────────
                # Preserve complete field names
                # Examples: Computer Science and Engineering, Information Technology, Information Systems, Electronics and Communication Engineering
                # Do not truncate multi-token fields
                # FIELD entities are already complete from DeBERTa extraction
                edu = {
                    'institution': institutions[i] if i < len(institutions) else '',
                    'degree': degrees[i] if i < len(degrees) else '',
                    'field_of_study': fields[i] if i < len(fields) else None,
                    'start_year': start_year,
                    'end_year': end_year,
                    'grade': grade_normalized,
                    'source': 'deberta_ner'
                }
                # Add if has institution OR degree (not both required)
                if edu['institution'] or edu['degree']:
                    education.append(edu)
                    
                    # ── STEP 11: LOG EDUCATION MAPPING ───────────────────────────────────
                    logger.info(f"Education Entry {i + 1}:")
                    logger.info(f"  INSTITUTION: {edu['institution']}")
                    logger.info(f"  ↓")
                    logger.info(f"  institution: \"{edu['institution']}\"")
                    logger.info(f"  DEGREE: {edu['degree']}")
                    logger.info(f"  ↓")
                    logger.info(f"  degree: \"{edu['degree']}\"")
                    logger.info(f"  FIELD: {edu['field_of_study']}")
                    logger.info(f"  ↓")
                    logger.info(f"  field_of_study: \"{edu['field_of_study']}\"")
                    logger.info(f"  START_YEAR: {edu['start_year']}")
                    logger.info(f"  END_YEAR: {edu['end_year']}")
                    logger.info(f"  GRADE: {edu['grade']}")
                    logger.info("-" * 40)
                    # ── END STEP 11 MAPPING ────────────────────────────────────────────────
        
        logger.info("=" * 80)
        logger.info(f"STEP 11 COMPLETED: {len(education)} education entries built")
        logger.info("=" * 80)
        # ── END STEP 11 ───────────────────────────────────────────────────────────
        
        # Log education extraction for debugging
        if degrees:
            logger.info(f"📚 DeBERTa extracted {len(degrees)} degrees: {degrees}")
        if institutions:
            logger.info(f"🏫 DeBERTa extracted {len(institutions)} institutions: {institutions}")
        if education:
            logger.info(f"✅ DeBERTa built {len(education)} education entries")
        else:
            logger.warning(f"⚠️ DeBERTa built 0 education entries (degrees: {len(degrees)}, institutions: {len(institutions)})")
        
        # Extract other entities
        clients = entities.get('clients', entities.get('CLIENT', []))
        
        # ── STEP 13: FINAL JSON BUILD DEBUG LOGGING ───────────────────────────────
        logger.info("=" * 80)
        logger.info("STEP 13: FINAL JSON BUILD - Experience & Education Objects")
        logger.info("=" * 80)
        logger.info("FINAL EXPERIENCE OBJECTS:")
        for i, exp in enumerate(work_experience):
            logger.info(f"Experience {i + 1}:")
            logger.info(f"  company: {exp.get('company')}")
            logger.info(f"  company_name: {exp.get('company_name')}")
            logger.info(f"  role: {exp.get('role')}")
            logger.info(f"  job_title: {exp.get('job_title')}")
            logger.info(f"  client: {exp.get('client')}")
            logger.info(f"  location: {exp.get('location')}")
            logger.info(f"  start_date: {exp.get('start_date')}")
            logger.info(f"  end_date: {exp.get('end_date')}")
            logger.info(f"  is_current: {exp.get('is_current')}")
            logger.info(f"  description: {exp.get('description')}")
            logger.info(f"  environment: {exp.get('environment')}")
            logger.info(f"  technologies_used: {exp.get('technologies_used')}")
            logger.info(f"  source: {exp.get('source')}")
            logger.info("-" * 40)
        logger.info("FINAL EDUCATION OBJECTS:")
        for i, edu in enumerate(education):
            logger.info(f"Education {i + 1}:")
            logger.info(f"  institution: {edu.get('institution')}")
            logger.info(f"  degree: {edu.get('degree')}")
            logger.info(f"  field_of_study: {edu.get('field_of_study')}")
            logger.info(f"  start_year: {edu.get('start_year')}")
            logger.info(f"  end_year: {edu.get('end_year')}")
            logger.info(f"  grade: {edu.get('grade')}")
            logger.info(f"  source: {edu.get('source')}")
            logger.info("-" * 40)
        logger.info("=" * 80)
        # ── END STEP 13 ───────────────────────────────────────────────────────────
        
        return {
            'companies': companies_list,
            'locations': locations_list,
            'work_experience': work_experience,
            'education': education,
            'job_titles': job_titles,
            'clients': clients,
            'dates': start_dates + end_dates if 'COMPANY' in entities else entities.get('dates', []),
            'degrees': degrees,
            'institutions': institutions,
            'fields_of_study': fields,
            'source': 'deberta_ner' if 'COMPANY' in entities else 'structured_parser',
            'confidence': {
                'deberta_confidence': 0.85,
                'entities_found': len(companies_list) + len(institutions) + len(job_titles)
            }
        }
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            'companies': [],
            'locations': [],
            'work_experience': [],
            'education': [],
            'job_titles': [],
            'clients': [],
            'dates': [],
            'degrees': [],
            'institutions': [],
            'fields_of_study': [],
            'source': 'deberta_ner',
            'confidence': {
                'deberta_confidence': 0.0,
                'entities_found': 0
            }
        }
