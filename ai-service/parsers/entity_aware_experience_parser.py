"""
Entity-aware experience parser that uses BERT NER labels correctly.
Maps ORG → company, TITLE → job_title, LOC → location based on entity labels.
"""

import re
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from dateparser import parse as dateparse

logger = logging.getLogger(__name__)


class EntityAwareExperienceParser:
    """
    Experience parser that correctly uses BERT NER entity labels.
    Maps entities based on their labels, not positional assumptions.
    """
    
    def __init__(self, ner_parser=None):
        """
        Initialize with optional NER parser.
        
        Args:
            ner_parser: AINamedEntityParser instance for entity extraction
        """
        self.ner_parser = ner_parser
        self.logger = logging.getLogger(__name__)
    
    def parse_experience_with_entities(self, experience_text: str) -> List[Dict]:
        """
        Parse work experience using entity labels from BERT NER.
        
        Args:
            experience_text: Text from work experience section
            
        Returns:
            List of structured work experience dictionaries
        """
        if not experience_text or not self.ner_parser:
            return []
        
        try:
            # Split into job blocks (by date ranges or double newlines)
            job_blocks = self._split_into_job_blocks(experience_text)
            self.logger.info(f"Split experience into {len(job_blocks)} job blocks")
            
            experiences = []
            for idx, block in enumerate(job_blocks):
                exp = self._parse_single_job_with_entities(block)
                if exp:
                    self.logger.info(f"Parsed job {idx+1}: {exp.get('job_title', 'N/A')} at {exp.get('company_name', 'N/A')}")
                    experiences.append(exp)
            
            return experiences
            
        except Exception as e:
            self.logger.error(f"Error in entity-aware experience parsing: {e}", exc_info=True)
            return []
    
    def _split_into_job_blocks(self, text: str) -> List[str]:
        """
        Split experience text into individual job blocks.
        Detects job boundaries using multiple strategies.
        """
        if not text or len(text.strip()) < 30:
            return []
        
        # Strategy 1: Split by common job boundary patterns
        # Patterns like "Client:", "Role:", "Duration:", "Company:"
        job_boundary_patterns = [
            r'\n\s*Client:\s*',
            r'\n\s*Role:\s*',
            r'\n\s*Company:\s*',
            r'\n\s*Position:\s*',
            r'\n\s*Organization:\s*',
            r'\n\s*Employer:\s*'
        ]
        
        # Find all job boundary matches
        boundary_matches = []
        for pattern in job_boundary_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                boundary_matches.append(match.start())
        
        # Sort boundaries
        boundary_matches = sorted(set(boundary_matches))
        
        # If we found multiple boundaries, split by them
        if len(boundary_matches) >= 2:
            blocks = []
            for i in range(len(boundary_matches)):
                start = boundary_matches[i]
                end = boundary_matches[i + 1] if i + 1 < len(boundary_matches) else len(text)
                block = text[start:end].strip()
                if len(block) > 30:  # Lowered minimum
                    blocks.append(block)
            
            # Add first block if it exists before first boundary
            if boundary_matches[0] > 0:
                first_block = text[:boundary_matches[0]].strip()
                if len(first_block) > 30:
                    blocks.insert(0, first_block)
            
            if blocks:
                self.logger.info(f"Split into {len(blocks)} blocks using job boundary patterns")
                return blocks
        
        # Strategy 2: Split by date ranges (strong indicator of job boundaries)
        date_pattern = r'(?:Duration:|Period:)?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present|Current|Now)|\d{4}\s*[-–—]\s*(?:\d{4}|Present|Current|Now)'
        
        date_matches = list(re.finditer(date_pattern, text, re.IGNORECASE))
        
        if len(date_matches) >= 2:
            blocks = []
            for i in range(len(date_matches)):
                # Find block boundaries
                if i == 0:
                    start = 0
                else:
                    start = date_matches[i-1].end()
                
                if i < len(date_matches) - 1:
                    end = date_matches[i+1].start()
                else:
                    end = len(text)
                
                block = text[start:end].strip()
                if len(block) > 30:  # Lowered minimum
                    blocks.append(block)
            
            if blocks:
                self.logger.info(f"Split into {len(blocks)} blocks using date patterns")
                return blocks
        
        # Strategy 3: Split by company name patterns (look for lines with Inc, LLC, Corp, etc.)
        company_pattern = r'\n([A-Z][A-Za-z\s&]+(?:Inc|LLC|Ltd|Corp|Company|Group|Technologies|Solutions)\.?)\s*\n'
        company_matches = list(re.finditer(company_pattern, text))
        
        if len(company_matches) >= 2:
            blocks = []
            for i in range(len(company_matches)):
                if i == 0:
                    start = 0
                else:
                    start = company_matches[i-1].end()
                
                if i < len(company_matches) - 1:
                    end = company_matches[i+1].start()
                else:
                    end = len(text)
                
                block = text[start:end].strip()
                if len(block) > 30:
                    blocks.append(block)
            
            if blocks:
                self.logger.info(f"Split into {len(blocks)} blocks using company name patterns")
                return blocks
        
        # Strategy 4: Split by double newlines
        blocks = re.split(r'\n\s*\n+', text)
        blocks = [b.strip() for b in blocks if b.strip() and len(b.strip()) > 30]
        
        if len(blocks) >= 2:
            self.logger.info(f"Split into {len(blocks)} blocks using double newlines")
            return blocks
        
        # Strategy 5: If all else fails, treat entire text as one block
        if text.strip():
            self.logger.warning(f"Could not split text, treating as single job block")
            return [text.strip()]
        
        return []
    
    def _parse_single_job_with_entities(self, block: str) -> Optional[Dict]:
        """
        Parse a single job block using BERT NER entity labels.
        
        This is the KEY method that fixes the mapping issue.
        Instead of positional extraction, we use entity labels:
        - ORG label → company_name
        - LOC label → location
        - Pattern matching → job_title (since BERT doesn't have TITLE label)
        """
        try:
            # Extract entities from this block using BERT NER
            entities = self.ner_parser.extract_entities(block)
            
            # Initialize experience dict
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
            
            # ✅ CORRECT MAPPING: Use entity labels
            
            # 1. Extract company from "Client:" pattern first (highest priority)
            client_pattern = r'Client:\s*(.+?)(?:,|\n|$)'
            client_match = re.search(client_pattern, block, re.IGNORECASE)
            if client_match:
                company = client_match.group(1).strip()
                # Clean company name
                company = company.split(',')[0].strip()  # Remove location if present
                if len(company) > 2 and not self._looks_like_location(company):
                    experience['company_name'] = company
                    self.logger.debug(f"Extracted company from Client: {company}")
            
            # 2. If no Client: found, extract from ORG entities
            if not experience['company_name']:
                orgs = entities.get('organizations', [])
                if orgs:
                    # Get highest confidence ORG entity
                    company = max(orgs, key=lambda x: x['score'])['value']
                    # Validate it's not a location
                    if not self._looks_like_location(company):
                        experience['company_name'] = company
                        self.logger.debug(f"Extracted company from ORG entity: {company}")
            
            # 2. Extract location from LOC entities
            locs = entities.get('locations', [])
            if locs:
                # Get highest confidence LOC entity
                location = max(locs, key=lambda x: x['score'])['value']
                # Validate it looks like a location
                if self._looks_like_location(location):
                    experience['location'] = location
                    self.logger.debug(f"Extracted location from LOC entity: {location}")
            
            # 3. Extract job title using pattern matching
            # (BERT NER doesn't have a TITLE label, so we use patterns)
            job_title = self._extract_job_title_from_text(block, experience['company_name'])
            if job_title:
                experience['job_title'] = job_title
                self.logger.debug(f"Extracted job title: {job_title}")
            
            # 4. Extract dates
            start_date, end_date = self._extract_dates(block)
            experience['start_date'] = start_date
            experience['end_date'] = end_date
            experience['duration_months'] = self._calculate_duration(start_date, end_date)
            
            # 5. Extract description
            experience['description'] = self._extract_description(block, job_title, experience['company_name'])
            
            # Validate we have minimum required fields (at least company OR title)
            if not experience['job_title'] and not experience['company_name']:
                self.logger.warning(f"Incomplete experience entry: both title and company are empty")
                return None
            
            # If we have company but no title, try harder to find title
            if experience['company_name'] and not experience['job_title']:
                self.logger.warning(f"Job has company '{experience['company_name']}' but no title - accepting anyway")
            
            # If we have title but no company, accept it
            if experience['job_title'] and not experience['company_name']:
                self.logger.warning(f"Job has title '{experience['job_title']}' but no company - accepting anyway")
            
            return experience
            
        except Exception as e:
            self.logger.error(f"Error parsing job block: {e}")
            return None
    
    def _looks_like_location(self, text: str) -> bool:
        """Check if text looks like a location."""
        if not text:
            return False
        
        # Common location patterns
        location_patterns = [
            r'^[A-Z][a-z]+,\s*[A-Z]{2}$',  # "Austin, TX"
            r'^[A-Z][a-z]+,\s*[A-Z][a-z]+$',  # "San Francisco, California"
            r'^\w+,\s*\w+$',  # Generic "City, State/Country"
        ]
        
        for pattern in location_patterns:
            if re.match(pattern, text):
                return True
        
        # Check for common location keywords
        location_keywords = ['city', 'state', 'country', 'remote', 'hybrid']
        if any(kw in text.lower() for kw in location_keywords):
            return True
        
        # Check if it's a known state code
        us_states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']
        if text in us_states:
            return True
        
        return False
    
    def _extract_job_title_from_text(self, block: str, company_name: Optional[str]) -> str:
        """
        Extract job title using pattern matching.
        Handles 'Role:' prefix and excludes company name and location.
        """
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        
        # Pattern 1: Look for "Role: Job Title" format
        role_pattern = r'Role:\s*(.+?)(?:\n|$)'
        match = re.search(role_pattern, block, re.IGNORECASE)
        if match:
            title = match.group(1).strip()
            # Clean the title
            title = self._clean_job_title(title)
            if title:
                self.logger.debug(f"Extracted job title from Role: {title}")
                return title
        
        # Pattern 2: Look for "Position: Job Title" format
        position_pattern = r'Position:\s*(.+?)(?:\n|$)'
        match = re.search(position_pattern, block, re.IGNORECASE)
        if match:
            title = match.group(1).strip()
            title = self._clean_job_title(title)
            if title:
                self.logger.debug(f"Extracted job title from Position: {title}")
                return title
        
        # Pattern 3: Search for title keywords in lines
        title_keywords = [
            'engineer', 'developer', 'architect', 'manager', 'director', 
            'analyst', 'specialist', 'consultant', 'lead', 'senior', 
            'junior', 'principal', 'staff', 'associate', 'coordinator',
            'designer', 'scientist', 'researcher', 'officer', 'executive',
            'administrator', 'technician', 'supervisor'
        ]
        
        for line in lines[:5]:  # Check first 5 lines
            # Skip if it's the company name
            if company_name and company_name in line:
                continue
            
            # Skip if it has dates
            if re.search(r'\d{4}', line):
                continue
            
            # Skip bullet points
            if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                continue
            
            # Skip if it starts with common non-title prefixes
            if re.match(r'^(Duration|Client|Company|Location|Environment):', line, re.IGNORECASE):
                continue
            
            # Check if line contains title keywords
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in title_keywords):
                title = self._clean_job_title(line)
                if title:
                    self.logger.debug(f"Extracted job title from keyword match: {title}")
                    return title
        
        return ''
    
    def _clean_job_title(self, title: str) -> str:
        """Clean and validate job title."""
        if not title:
            return ''
        
        # Remove "Role:" prefix if present
        title = re.sub(r'^Role:\s*', '', title, flags=re.IGNORECASE)
        title = re.sub(r'^Position:\s*', '', title, flags=re.IGNORECASE)
        
        # Remove anything after | or ,
        title = title.split('|')[0].strip()
        title = title.split(',')[0].strip()
        
        # Remove dates
        title = re.sub(r'\d{4}.*', '', title).strip()
        
        # Remove trailing punctuation
        title = title.rstrip(':-,.|').strip()
        
        # Validate length (reasonable job title length)
        if 2 <= len(title.split()) <= 10 and 5 <= len(title) <= 100:
            return title
        
        return ''
    
    def _extract_dates(self, block: str) -> Tuple[str, str]:
        """
        Extract start and end dates from block.
        Handles multiple formats including 'Duration:' prefix.
        """
        # Pattern 1: "Duration: Month Year - Month Year" or "Duration: Month Year – Present"
        duration_pattern = r'Duration:\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*[-–—]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present|Current|Now)'
        match = re.search(duration_pattern, block, re.IGNORECASE)
        if match:
            start_date = match.group(1).strip()
            end_date = match.group(2).strip()
            self.logger.debug(f"Extracted dates from Duration: {start_date} - {end_date}")
            return start_date, end_date
        
        # Pattern 2: "Month Year - Month Year" or "Month Year - Present" (without Duration:)
        date_pattern = r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*[-–—]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present|Current|Now)'
        match = re.search(date_pattern, block, re.IGNORECASE)
        if match:
            start_date = match.group(1).strip()
            end_date = match.group(2).strip()
            self.logger.debug(f"Extracted dates: {start_date} - {end_date}")
            return start_date, end_date
        
        # Pattern 3: Year-only pattern "2020 - 2023" or "2020 - Present"
        year_pattern = r'(\d{4})\s*[-–—]\s*(\d{4}|Present|Current|Now)'
        match = re.search(year_pattern, block, re.IGNORECASE)
        if match:
            start_date = match.group(1).strip()
            end_date = match.group(2).strip()
            self.logger.debug(f"Extracted year dates: {start_date} - {end_date}")
            return start_date, end_date
        
        self.logger.warning("No dates found in block")
        return '', ''
    
    def _calculate_duration(self, start_date: str, end_date: str) -> int:
        """Calculate duration in months between start and end dates."""
        if not start_date:
            return 0
        
        try:
            start = dateparse(start_date)
            if not start:
                return 0
            
            if end_date and end_date.lower() not in ['present', 'current', 'now']:
                end = dateparse(end_date)
            else:
                end = datetime.now()
            
            if not end:
                return 0
            
            # Calculate months
            months = (end.year - start.year) * 12 + (end.month - start.month)
            return max(0, months)
            
        except Exception as e:
            self.logger.error(f"Error calculating duration: {e}")
            return 0
    
    def _extract_description(self, block: str, job_title: Optional[str], company_name: Optional[str]) -> str:
        """Extract job description, excluding title, company, and dates."""
        if not block:
            return ''
        
        lines = block.split('\n')
        description_lines = []
        
        for line in lines:
            line = line.strip()
            # Skip empty lines
            if not line:
                continue
            # Skip lines with job title or company (with null checks)
            if job_title and job_title in line:
                continue
            if company_name and company_name in line:
                continue
            # Skip lines with only dates
            if re.match(r'^[\w\s]*\d{4}[\w\s]*[-–—][\w\s]*\d{4}[\w\s]*$', line):
                continue
            
            # Add to description
            description_lines.append(line)
        
        return ' '.join(description_lines[:10])  # Limit to first 10 lines
