"""
Section Validator Module

This module provides validation for section boundaries in resume parsing
using spaCy NLP models to ensure semantic coherence and proper section detection.
"""

import logging
from typing import Optional, Dict, List

try:
    import spacy
    from spacy.language import Language
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    Language = None

logger = logging.getLogger(__name__)


class SectionValidator:
    """
    Validates section boundaries in resume text using NLP-based analysis.
    
    Uses spaCy's en_core_web_sm model to perform linguistic analysis on
    section headers and content to validate proper section detection.
    """
    
    def __init__(self):
        """
        Initialize the SectionValidator with spaCy model.
        
        Raises:
            ImportError: If spaCy is not installed
            OSError: If the en_core_web_sm model is not found
        """
        if not SPACY_AVAILABLE:
            raise ImportError(
                "spaCy is required for section validation. "
                "Please install it using: pip install spacy>=3.7.0"
            )
        
        try:
            # Load the English language model
            self.nlp: Language = spacy.load('en_core_web_sm')
            logger.info("Successfully loaded spaCy model: en_core_web_sm")
            
        except OSError as e:
            error_message = (
                "spaCy model 'en_core_web_sm' not found. "
                "Please download it using:\n"
                "  python3 -m spacy download en_core_web_sm\n"
                "Or install directly with pip:\n"
                "  pip3 install https://github.com/explosion/spacy-models/releases/download/"
                "en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
            )
            logger.error(error_message)
            raise OSError(error_message) from e
        
        except Exception as e:
            logger.error(f"Unexpected error loading spaCy model: {e}")
            raise
    
    def validate_section_header(self, text: str) -> bool:
        """
        Validate if a given text is likely a section header.
        
        Args:
            text: Text to validate as a potential section header
            
        Returns:
            True if the text appears to be a valid section header, False otherwise
        """
        if not text or not text.strip():
            return False
        
        # Process text with spaCy
        doc = self.nlp(text.strip())
        
        # Basic validation: headers are typically short
        if len(doc) > 10:  # More than 10 tokens is likely content
            return False
        
        return True
    
    def validate_section_boundary(self, header: str, content: str) -> bool:
        """
        Validate if a header and its content form a coherent section boundary.
        
        Args:
            header: The section header text
            content: The section content text
            
        Returns:
            True if the boundary is valid, False otherwise
        """
        if not header or not content:
            return False
        
        # Process both header and content
        header_doc = self.nlp(header.strip())
        content_doc = self.nlp(content.strip()[:500])  # Limit content to first 500 chars
        
        # Validate that header is significantly shorter than content
        if len(header_doc) >= len(content_doc):
            return False
        
        return True
    
    def get_entity_profile(self, text: str) -> dict:
        """
        Analyze a block of text and return entity type counts.
        
        Counts named entities recognized by spaCy (ORG, DATE, GPE, PERSON, CARDINAL)
        and custom degree patterns (bachelor, master, phd, etc.).
        
        Args:
            text: Block of text to analyze
            
        Returns:
            Dictionary with entity types as keys and counts as values:
            {
                'ORG': int,        # Organizations
                'DATE': int,       # Dates
                'GPE': int,        # Geopolitical entities (countries, cities)
                'PERSON': int,     # Person names
                'CARDINAL': int,   # Cardinal numbers
                'DEGREE': int      # Degree patterns (bachelor, master, phd, etc.)
            }
        """
        if not text or not text.strip():
            return {
                'ORG': 0,
                'DATE': 0,
                'GPE': 0,
                'PERSON': 0,
                'CARDINAL': 0,
                'DEGREE': 0
            }
        
        # Process text with spaCy
        doc = self.nlp(text.strip())
        
        # Initialize entity counts
        entity_counts = {
            'ORG': 0,
            'DATE': 0,
            'GPE': 0,
            'PERSON': 0,
            'CARDINAL': 0,
            'DEGREE': 0
        }
        
        # Count named entities
        for ent in doc.ents:
            if ent.label_ in entity_counts:
                entity_counts[ent.label_] += 1
        
        # Count degree patterns
        degree_patterns = [
            'bachelor', 'master', 'phd', 'doctorate', 'diploma',
            'bs', 'ms', 'mba', 'be', 'btech', 'mtech',
            'b.s', 'm.s', 'b.e', 'm.tech', 'b.tech',
            'bachelors', 'masters', 'doctoral'
        ]
        
        text_lower = text.lower()
        for pattern in degree_patterns:
            # Count occurrences of each degree pattern
            entity_counts['DEGREE'] += text_lower.count(pattern)
        
        return entity_counts
    
    def get_expected_fingerprint(self, section_name: str) -> dict:
        """
        Get the expected entity profile fingerprint for a given section type.
        
        Returns threshold dictionaries that define what entity counts are expected
        for different resume section types. This helps validate if content matches
        the declared section type.
        
        Args:
            section_name: Name of the section (e.g., 'experience', 'education', 'skills')
            
        Returns:
            Dictionary with expected thresholds for entity types and other metrics:
            {
                'ORG': {'min': int, 'max': int},
                'DATE': {'min': int, 'max': int},
                'GPE': {'min': int, 'max': int},
                'PERSON': {'min': int, 'max': int},
                'CARDINAL': {'min': int, 'max': int},
                'DEGREE': {'min': int, 'max': int},
                'sentence_count': {'min': int, 'max': int},
                'word_list_density': {'min': float, 'max': float}  # Ratio of commas to words
            }
        """
        # Normalize section name
        section_lower = section_name.lower().strip()
        
        # Define fingerprints for each section type
        fingerprints = {
            'experience': {
                'ORG': {'min': 1, 'max': 999},           # High: companies
                'DATE': {'min': 1, 'max': 999},          # High: employment dates
                'GPE': {'min': 0, 'max': 999},           # Moderate: locations
                'PERSON': {'min': 0, 'max': 2},          # Low: rarely person names
                'CARDINAL': {'min': 0, 'max': 999},      # Moderate: team sizes, metrics
                'DEGREE': {'min': 0, 'max': 0},          # Low: no degrees
                'sentence_count': {'min': 3, 'max': 999},
                'word_list_density': {'min': 0.0, 'max': 0.1}  # Low: prose, not lists
            },
            'education': {
                'ORG': {'min': 1, 'max': 10},           # Low to moderate: universities
                'DATE': {'min': 1, 'max': 10},          # Low to moderate: graduation dates
                'GPE': {'min': 0, 'max': 5},            # Low: university locations
                'PERSON': {'min': 0, 'max': 2},          # Very low: rarely person names
                'CARDINAL': {'min': 0, 'max': 10},      # Low: GPAs, years
                'DEGREE': {'min': 1, 'max': 10},        # Moderate: degree names
                'sentence_count': {'min': 1, 'max': 20},
                'word_list_density': {'min': 0.0, 'max': 0.2}
            },
            'skills': {
                'ORG': {'min': 0, 'max': 15},            # Moderate: technology names, cloud platforms
                'DATE': {'min': 0, 'max': 2},            # Low: maybe version dates, but rare
                'GPE': {'min': 0, 'max': 5},             # Low: sometimes location mentions
                'PERSON': {'min': 0, 'max': 0},          # Low: no person names
                'CARDINAL': {'min': 0, 'max': 10},       # Moderate: version numbers, counts
                'DEGREE': {'min': 0, 'max': 0},          # Low: no degrees
                'sentence_count': {'min': 0, 'max': 10},  # Low to moderate: can have descriptive text
                'word_list_density': {'min': 0.1, 'max': 1.0}  # Flexible: can be lists or descriptive
            },
            'summary': {
                'ORG': {'min': 0, 'max': 3},             # Low: few specific organizations
                'DATE': {'min': 0, 'max': 2},            # Low: few specific dates
                'GPE': {'min': 0, 'max': 2},             # Low: few specific locations
                'PERSON': {'min': 0, 'max': 0},          # Low: no person names
                'CARDINAL': {'min': 0, 'max': 999},      # Moderate: years of experience
                'DEGREE': {'min': 0, 'max': 1},          # Low: maybe mention degree
                'sentence_count': {'min': 2, 'max': 999},  # High: multiple sentences
                'word_list_density': {'min': 0.0, 'max': 0.1}  # Low: prose, not lists
            },
            'projects': {
                'ORG': {'min': 0, 'max': 999},           # Moderate: companies, technologies
                'DATE': {'min': 0, 'max': 999},          # Moderate: project dates
                'GPE': {'min': 0, 'max': 5},             # Low: few locations
                'PERSON': {'min': 0, 'max': 2},          # Low: rarely person names
                'CARDINAL': {'min': 0, 'max': 999},      # Moderate: metrics, team sizes
                'DEGREE': {'min': 0, 'max': 0},          # Low: no degrees
                'sentence_count': {'min': 2, 'max': 999},
                'word_list_density': {'min': 0.0, 'max': 0.2}
            },
            'certifications': {
                'ORG': {'min': 1, 'max': 999},           # High: certifying organizations
                'DATE': {'min': 0, 'max': 999},          # Moderate: certification dates
                'GPE': {'min': 0, 'max': 2},             # Low: few locations
                'PERSON': {'min': 0, 'max': 0},          # Low: no person names
                'CARDINAL': {'min': 0, 'max': 999},      # Low: maybe cert numbers
                'DEGREE': {'min': 0, 'max': 0},          # Low: certifications, not degrees
                'sentence_count': {'min': 1, 'max': 999},
                'word_list_density': {'min': 0.0, 'max': 0.3}
            },
        }
        
        # Check for common variations of section names
        section_mappings = {
            'work experience': 'experience',
            'professional experience': 'experience',
            'employment': 'experience',
            'work history': 'experience',
            'academic background': 'education',
            'qualifications': 'education',
            'technical skills': 'skills',
            'core competencies': 'skills',
            'expertise': 'skills',
            'professional summary': 'summary',
            'profile': 'summary',
            'objective': 'summary',
            'about': 'summary',
            'portfolio': 'projects',
            'achievements': 'projects',
        }
        
        # Map section name to standard name
        mapped_section = section_mappings.get(section_lower, section_lower)
        
        # Return fingerprint or default
        if mapped_section in fingerprints:
            return fingerprints[mapped_section]
        
        # Default fingerprint for unknown sections
        return {
            'ORG': {'min': 0, 'max': 999},
            'DATE': {'min': 0, 'max': 999},
            'GPE': {'min': 0, 'max': 999},
            'PERSON': {'min': 0, 'max': 999},
            'CARDINAL': {'min': 0, 'max': 999},
            'DEGREE': {'min': 0, 'max': 999},
            'sentence_count': {'min': 0, 'max': 999},
            'word_list_density': {'min': 0.0, 'max': 1.0}
        }
    
    def detect_section_bleeding(self, section_name: str, text: str) -> Optional[int]:
        """
        Detect if content from different sections is bleeding into this section.
        
        Splits the content into two halves and compares their entity profiles.
        If the profiles are significantly different (suggesting content from
        different section types), returns the approximate line number where
        the split should occur.
        
        Args:
            section_name: Name of the section being analyzed
            text: Text content of the section
            
        Returns:
            Line number where section bleeding occurs, or None if no bleeding detected
        """
        if not text or not text.strip():
            return None
        
        lines = text.split('\n')
        
        # Need at least 4 lines to meaningfully split
        if len(lines) < 4:
            return None
        
        # Split into two halves
        midpoint = len(lines) // 2
        first_half = '\n'.join(lines[:midpoint])
        second_half = '\n'.join(lines[midpoint:])
        
        # Get entity profiles for each half
        first_profile = self.get_entity_profile(first_half)
        second_profile = self.get_entity_profile(second_half)
        
        # Check for significant differences indicating section bleeding
        bleeding_detected = False
        split_line = midpoint
        
        # Criterion 1: Degree patterns appear in only one half
        # (Suggests education section bleeding into/from another section)
        # Require at least 2 degree patterns to avoid false positives
        first_has_degrees = first_profile['DEGREE'] >= 2
        second_has_degrees = second_profile['DEGREE'] >= 2
        
        if first_has_degrees != second_has_degrees:
            # Degrees only in one half - likely bleeding
            if second_has_degrees and not first_has_degrees:
                # Education content starts in second half
                bleeding_detected = True
                logger.info(f"Section bleeding detected: DEGREE patterns only in second half "
                          f"({second_profile['DEGREE']} degrees)")
            elif first_has_degrees and not second_has_degrees:
                # Education content ends in first half
                bleeding_detected = True
                logger.info(f"Section bleeding detected: DEGREE patterns only in first half "
                          f"({first_profile['DEGREE']} degrees)")
        
        # Criterion 2: ORG entity count differs significantly
        # (Suggests experience/education section bleeding)
        # Require at least 3 total ORGs and >85% imbalance to avoid false positives
        total_orgs = first_profile['ORG'] + second_profile['ORG']
        if total_orgs >= 3:
            first_org_ratio = first_profile['ORG'] / total_orgs if total_orgs > 0 else 0
            second_org_ratio = second_profile['ORG'] / total_orgs if total_orgs > 0 else 0
            
            # If one half has >85% of ORGs, it's unbalanced
            if first_org_ratio > 0.85 or second_org_ratio > 0.85:
                bleeding_detected = True
                logger.info(f"Section bleeding detected: ORG distribution unbalanced "
                          f"({first_profile['ORG']} vs {second_profile['ORG']})")
        
        # Criterion 3: DATE patterns differ significantly
        # (Suggests chronological sections bleeding)
        # Require at least 3 total DATEs and >85% imbalance
        total_dates = first_profile['DATE'] + second_profile['DATE']
        if total_dates >= 3:
            first_date_ratio = first_profile['DATE'] / total_dates if total_dates > 0 else 0
            second_date_ratio = second_profile['DATE'] / total_dates if total_dates > 0 else 0
            
            # If one half has >85% of DATEs, it's unbalanced
            if first_date_ratio > 0.85 or second_date_ratio > 0.85:
                bleeding_detected = True
                logger.info(f"Section bleeding detected: DATE distribution unbalanced "
                          f"({first_profile['DATE']} vs {second_profile['DATE']})")
        
        # Criterion 4: Check against expected fingerprint for this section
        expected = self.get_expected_fingerprint(section_name)
        
        # Check if second half violates expected fingerprint more than first half
        # Require at least 3 violations to avoid false positives
        first_violations = self._count_fingerprint_violations(first_profile, expected)
        second_violations = self._count_fingerprint_violations(second_profile, expected)
        
        if second_violations > first_violations and second_violations >= 3:
            # Second half doesn't match expected section type
            bleeding_detected = True
            logger.info(f"Section bleeding detected: Second half has {second_violations} "
                      f"fingerprint violations vs {first_violations} in first half")
        
        if bleeding_detected:
            return split_line
        
        return None
    
    def _count_fingerprint_violations(self, profile: dict, expected: dict) -> int:
        """
        Count how many entity types violate the expected fingerprint thresholds.
        
        Args:
            profile: Actual entity profile
            expected: Expected fingerprint thresholds
            
        Returns:
            Number of violations
        """
        violations = 0
        
        for entity_type in ['ORG', 'DATE', 'GPE', 'PERSON', 'CARDINAL', 'DEGREE']:
            actual = profile.get(entity_type, 0)
            min_expected = expected[entity_type]['min']
            max_expected = expected[entity_type]['max']
            
            if actual < min_expected or actual > max_expected:
                violations += 1
        
        return violations
    
    def resolve_unknown_section(self, text: str) -> str:
        """
        Resolve an unknown section label by analyzing content and matching against
        known section fingerprints.
        
        Extracts entity profile from the text and compares it against expected
        fingerprints for all known section types. Returns the section name that
        best matches the content based on fewest fingerprint violations.
        
        Args:
            text: Text content of the unknown section
            
        Returns:
            Section name that best matches the content, or 'other' if no clear match
        """
        if not text or not text.strip():
            return 'other'
        
        # Get entity profile of the content
        profile = self.get_entity_profile(text)
        
        # Known section types to check
        section_types = [
            'experience',
            'education',
            'skills',
            'summary',
            'projects',
            'certifications'
        ]
        
        # Calculate violations for each section type
        section_scores = {}
        
        for section_type in section_types:
            expected = self.get_expected_fingerprint(section_type)
            violations = self._count_fingerprint_violations(profile, expected)
            section_scores[section_type] = violations
            
            logger.debug(f"Section '{section_type}': {violations} violations")
        
        # Use strong indicators first to resolve ambiguity
        # Education: Strong indicator is DEGREE >= 2 AND reasonable content length
        # Also require low ORG count to avoid misclassifying experience sections
        if (profile['DEGREE'] >= 2 and 
            profile['ORG'] <= 10 and 
            len(text) < 2000):  # Education sections are typically not this long
            logger.info(f"Resolved to 'education' based on DEGREE patterns ({profile['DEGREE']})")
            return 'education'
        else:
            logger.debug(f"Education conditions not met: DEGREE={profile['DEGREE']}, ORG={profile['ORG']}, length={len(text)}")
        
        # Experience: Strong indicator is ORG >= 1 AND DATE >= 1
        if profile['ORG'] >= 1 and profile['DATE'] >= 1 and profile['DEGREE'] == 0:
            logger.info(f"Resolved to 'experience' based on ORG+DATE ({profile['ORG']}, {profile['DATE']})")
            return 'experience'
        
        # Skills: Strong indicators for technical skills
        total_entities = sum([profile['ORG'], profile['DATE'], profile['GPE'], profile['PERSON'], profile['DEGREE']])
        
        # Check for technical skills indicators
        # 1. Moderate ORG count (technologies, platforms) but no DEGREE or DATE
        # 2. Low entity count overall (traditional skills)
        if (profile['DEGREE'] == 0 and profile['DATE'] <= 1 and 
            ((profile['ORG'] >= 2 and profile['ORG'] <= 15) or total_entities <= 5)):
            logger.info(f"Resolved to 'skills' based on technical indicators (ORG: {profile['ORG']}, total: {total_entities})")
            return 'skills'
        
        # Find section with fewest violations
        best_match = min(section_scores, key=section_scores.get)
        min_violations = section_scores[best_match]
        
        # Get all sections with minimum violations
        sections_with_min = [s for s, v in section_scores.items() if v == min_violations]
        
        # If multiple sections tie, use entity-based heuristics to break tie
        if len(sections_with_min) > 1:
            logger.debug(f"Tie between {len(sections_with_min)} sections: {sections_with_min}")
            
            # Prefer education if DEGREE > 0 AND content is reasonable length
            if ('education' in sections_with_min and profile['DEGREE'] > 0 and 
                profile['ORG'] <= 10 and len(text) < 2000):
                best_match = 'education'
            # Prefer experience if ORG > 0 and DATE > 0
            elif 'experience' in sections_with_min and profile['ORG'] > 0 and profile['DATE'] > 0:
                best_match = 'experience'
            # Prefer certifications if ORG > 2 (many certifying orgs)
            elif 'certifications' in sections_with_min and profile['ORG'] > 2:
                best_match = 'certifications'
            # Otherwise keep first match or return 'other' if too ambiguous
            elif len(sections_with_min) > 3:
                logger.info(f"Too ambiguous: {len(sections_with_min)} sections match")
                return 'other'
        
        # If too many violations, return 'other'
        if min_violations >= 4:
            logger.info(f"No clear match: best match '{best_match}' has {min_violations} violations")
            return 'other'
        
        logger.info(f"Resolved unknown section to '{best_match}' ({min_violations} violations)")
        logger.debug(f"Entity profile: {profile}")
        
        return best_match
    
    def validate_and_correct(self, sections: Dict[str, str]) -> tuple[Dict[str, str], Dict[str, any]]:
        """
        Main validation and correction method for resume sections.
        
        TEMPORARILY DISABLED - Section splitter improvements are working correctly.
        Validation was overriding the enhanced section splitter results.
        
        Args:
            sections: Dictionary of section names to content text
                     e.g., {'experience': '...', 'education': '...'}
        
        Returns:
            Tuple of (corrected_sections, validation_metadata) where:
            - corrected_sections: Dictionary with validated and properly labeled sections
            - validation_metadata: Dictionary with validation information
        """
        logger.info(f"Section validation temporarily disabled - returning sections as-is")
        
        # Return sections as-is without validation to preserve enhanced splitter results
        validation_metadata = {
            'spacy_available': True,
            'validation_ran': False,
            'sections_corrected': [],
            'sections_split': [],
            'sections_resolved': [],
            'warnings': ['Section validation temporarily disabled to preserve enhanced splitter results'],
            'summary': {
                'input_sections': len(sections),
                'output_sections': len(sections),
                'total_corrections': 0,
                'total_splits': 0,
                'total_resolutions': 0
            }
        }
        
        # Clean up sections but don't modify their content
        final_sections = {k: v.strip() for k, v in sections.items() if v and v.strip()}
        
        return final_sections, validation_metadata
