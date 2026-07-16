"""
Structured Work Experience Parser
Properly parses work experience sections with company, role, location, dates, and clients.
"""

import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import dateparser

logger = logging.getLogger(__name__)


class StructuredWorkExperienceParser:
    """Parse work experience with proper structure recognition."""
    
    def __init__(self):
        self.month_patterns = r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
        self.year_pattern = r'(?:19|20)\d{2}'
    
    def _parse_narrative_format(self, work_text: str) -> List[Dict[str, Any]]:
        """
        Parse narrative format work experience.
        
        Format: "Currently working with Company (since Date) as Job Title."
                "Previously associated with Company (Date - Date) as Job Title."
        
        Returns:
            List of experiences or empty list if not narrative format
        """
        experiences = []
        
        # Patterns for narrative format
        patterns = [
            # "Currently working with Company (since Date) as Job Title"
            r'(?:currently\s+working\s+with|working\s+with)\s+([^(]+)\s*\((?:since\s+)?([^)]+)\)\s+as\s+(?:a\s+)?([^.]+)',
            # "Previously associated with Company (Date - Date) as Job Title"
            r'(?:previously\s+associated\s+with|associated\s+with)\s+([^(]+)\s*\(([^)]+)\)\s+as\s+(?:a\s+)?([^.]+)',
            # "Started career at Company (Date - Date) as Job Title"
            r'(?:started\s+career\s+at|began\s+at)\s+([^(]+)\s*\(([^)]+)\)\s+as\s+(?:a\s+)?([^.]+)',
        ]
        
        # Split by sentences that start with company indicators
        # Look for patterns like "Currently working", "Previously associated", "Started career"
        split_pattern = r'(?=(?:Currently|Previously|Started)\s+(?:working|associated|career))'
        paragraphs = re.split(split_pattern, work_text, flags=re.IGNORECASE)
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # Try each pattern
            matched = False
            for pattern in patterns:
                match = re.search(pattern, paragraph, re.IGNORECASE)
                if match:
                    company = match.group(1).strip()
                    date_str = match.group(2).strip()
                    job_title = match.group(3).strip()
                    
                    # Parse dates
                    start_date, end_date, is_current = self._parse_date_range(date_str)
                    
                    # Extract clients from remaining text
                    clients = self._extract_clients_from_narrative(paragraph)
                    
                    experience = {
                        'job_title': job_title,
                        'company_name': company,
                        'location': None,
                        'start_date': start_date,
                        'end_date': end_date,
                        'is_current': is_current,
                        'clients': clients
                    }
                    
                    experiences.append(experience)
                    matched = True
                    break
            
            # If no pattern matched, this might not be narrative format
            if not matched and len(experiences) == 0:
                return []
        
        return experiences
    
    def _extract_clients_from_narrative(self, paragraph: str) -> List[Dict[str, Any]]:
        """Extract client blocks from narrative paragraph."""
        clients = []
        
        # Look for client patterns - extract just the client name
        client_patterns = [
            (r'(?:for\s+client)\s+([A-Z][A-Za-z\s&]+?)(?:\n|$)', 'for_client'),
            (r'(?:client:|assigned\s+projects?:)\s*(?:for\s+client\s+)?([A-Z][A-Za-z\s&]+?)(?:\n|$)', 'client_colon'),
            (r'(?:project\s+handled\s+for)\s+([A-Z][A-Za-z\s&]+?)(?:\n|$)', 'project_for'),
            (r'(?:engaged\s+with)\s+([A-Z][A-Za-z\s&]+?)(?:\n|$)', 'engaged'),
            (r'(?:worked\s+(?:on\s+module\s+)?for|worked\s+with)\s+([A-Z][A-Za-z\s&]+?)(?:\n|$)', 'worked'),
        ]
        
        lines = paragraph.split('\n')
        current_client = None
        descriptions = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this is a client line
            is_client_line = False
            for pattern, pattern_type in client_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    # Save previous client if exists
                    if current_client:
                        clients.append({
                            'client_name': current_client,
                            'descriptions': descriptions
                        })
                    
                    # Extract clean client name
                    client_name = match.group(1).strip()
                    # Remove trailing punctuation
                    client_name = re.sub(r'[:\.,;]+$', '', client_name)
                    current_client = client_name
                    descriptions = []
                    is_client_line = True
                    break
            
            # If not a client line and we have a current client, it's a description
            if not is_client_line and current_client:
                # Clean bullet points
                clean_line = re.sub(r'^[•\-\*\+►▸▶→]\s*', '', line).strip()
                if clean_line and len(clean_line) > 10:
                    descriptions.append(clean_line)
        
        # Save last client
        if current_client:
            clients.append({
                'client_name': current_client,
                'descriptions': descriptions
            })
        
        return clients
        
    def _parse_label_value_format(self, work_text: str) -> List[Dict[str, Any]]:
        """Parse label-value format (Company:, Role:, Location:, Date:)."""
        experiences = []
        lines = work_text.split('\n')
        
        current_exp = None
        current_client = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for labeled fields (handle "Work Experience: Company:" on same line)
            if 'company:' in line.lower():
                # Save previous experience
                if current_exp and current_exp.get('company_name'):
                    if current_client:
                        current_exp['clients'].append(current_client)
                        current_client = None
                    experiences.append(current_exp)
                
                # Extract company name (handle "Work Experience: Company: Wipro" format)
                company_match = re.search(r'company:\s*(.+)', line, re.IGNORECASE)
                company_name = company_match.group(1).strip() if company_match else ''
                
                # Start new experience
                current_exp = {
                    'job_title': '',
                    'company_name': company_name,
                    'location': '',
                    'start_date': None,
                    'end_date': None,
                    'is_current': False,
                    'clients': []
                }
            elif line.lower().startswith('client:') and current_exp:
                # Save previous client
                if current_client:
                    current_exp['clients'].append(current_client)
                
                # Start new client
                current_client = {
                    'client_name': self._clean_label_value(line, 'Client'),
                    'descriptions': []
                }
            elif line.lower().startswith('role:') and current_exp:
                current_exp['job_title'] = self._clean_label_value(line, 'Role')
            elif line.lower().startswith('location:') and current_exp:
                current_exp['location'] = self._clean_label_value(line, 'Location')
            elif line.lower().startswith('date:') and current_exp:
                date_str = self._clean_label_value(line, 'Date')
                dates = self._parse_date_range(date_str)
                current_exp['start_date'] = dates.get('start_date')
                current_exp['end_date'] = dates.get('end_date')
                current_exp['is_current'] = dates.get('is_current', False)
            elif line.startswith(('•', '-', '*', '+', '►', '▸', '▶', '→')) and current_client:
                # Description for current client
                clean_line = re.sub(r'^[•\-\*\+►▸▶→]\s*', '', line).strip()
                if clean_line:
                    current_client['descriptions'].append(clean_line)
        
        # Save last experience
        if current_exp and current_exp.get('company_name'):
            if current_client:
                current_exp['clients'].append(current_client)
            experiences.append(current_exp)
        
        return experiences
    
    def parse_work_section(self, work_text: str) -> List[Dict[str, Any]]:
        """
        Parse work experience section into structured entries.
        
        Supports three formats:
        1. Label-value format (PDF forms):
           Company: Wipro
           Client: ICICI Bank
           Role: Full Stack Developer
           Location: Hyderabad
           Date: Aug 2022 - Present
        
        2. Structured format:
           Job Title
           Company, Location
           Start Date – End Date
           Client: Client Name
           Description lines...
        
        3. Narrative format:
           Currently working with Company (since Date) as Job Title.
           
        Args:
            work_text: Work experience section text
            
        Returns:
            List of structured work experience dictionaries
        """
        if not work_text or not work_text.strip():
            return []
        
        # Check if this is label-value format (has "Company:", "Role:", etc.)
        if re.search(r'(?:Company|Role|Location|Date)\s*:', work_text, re.IGNORECASE):
            label_value_experiences = self._parse_label_value_format(work_text)
            if label_value_experiences:
                logger.info(f"📊 Parsed {len(label_value_experiences)} work experiences (label-value format)")
                return label_value_experiences
        
        # Try narrative format
        narrative_experiences = self._parse_narrative_format(work_text)
        if narrative_experiences:
            logger.info(f"📊 Parsed {len(narrative_experiences)} work experiences (narrative format)")
            return narrative_experiences
        
        # Fall back to structured format
        experiences = []
        lines = work_text.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines
            if not line:
                i += 1
                continue
            
            # Skip section headers
            if line.upper() == line and len(line.split()) <= 4:
                i += 1
                continue
            
            # Check if this looks like a job title OR company name followed by job title
            next_line = lines[i + 1].strip() if i + 1 < len(lines) else ''
            
            # Check if next line has job title + date combined
            next_line_has_title_and_date = False
            if next_line and self._is_date_line(next_line):
                for keyword in ['developer', 'engineer', 'architect', 'manager', 'lead', 'senior', 
                               'analyst', 'consultant', 'designer', 'specialist', 'administrator']:
                    if keyword in next_line.lower():
                        next_line_has_title_and_date = True
                        break
            
            is_experience_start = (
                self._is_job_title_line(line) or  # Job title first
                (next_line and self._is_job_title_line(next_line)) or  # Company first, job title second
                next_line_has_title_and_date  # Company first, job title+date second
            )
            
            if is_experience_start:
                experience = self._parse_experience_block(lines, i)
                if experience:
                    experiences.append(experience)
                    i = experience.get('_next_index', i + 1)
                else:
                    i += 1
            else:
                i += 1
        
        logger.info(f"📊 Parsed {len(experiences)} work experiences (structured format)")
        return experiences
    
    def _is_job_title_line(self, line: str) -> bool:
        """Check if a line looks like a job title."""
        # Skip if it's a bullet point
        if re.match(r'^[•\-\*\+►▸▶→]\s*', line):
            return False
        
        # Skip if it starts with "Client:"
        if line.lower().startswith('client:'):
            return False
        
        # Skip if it's just a date
        if re.match(rf'^{self.month_patterns}\s+{self.year_pattern}', line, re.IGNORECASE):
            return False
        
        # Skip if it contains date range
        if re.search(r'(?:–|—|-|to)\s*(?:present|current)', line, re.IGNORECASE):
            return False
        
        # Skip if line is too long (likely a description, not a title)
        if len(line) > 100:
            return False
        
        # Skip if line contains action verbs (likely a description)
        action_verbs = [
            'developed', 'built', 'created', 'implemented', 'designed', 'managed',
            'worked', 'fixed', 'improved', 'integrated', 'assisted', 'maintained'
        ]
        line_lower = line.lower()
        if any(line_lower.startswith(verb) for verb in action_verbs):
            return False
        
        # Common job title patterns (must be at start or have title keywords)
        job_keywords = [
            'developer', 'engineer', 'architect', 'manager', 'lead', 'senior', 'junior',
            'analyst', 'consultant', 'designer', 'specialist', 'administrator', 'coordinator',
            'director', 'associate', 'intern', 'trainee', 'full stack', 'software', 'web'
        ]
        
        # Check if line contains job title keywords
        has_job_keyword = any(keyword in line_lower for keyword in job_keywords)
        
        # Check if line looks like a title (capitalized, short, no verbs at start)
        looks_like_title = (
            line[0].isupper() and  # Starts with capital
            len(line.split()) <= 6 and  # Not too many words
            not any(char in line for char in ['.', '!', '?'])  # No sentence punctuation
        )
        
        return has_job_keyword and looks_like_title
    
    def _clean_label_value(self, text: str, label: str) -> str:
        """Remove label prefix from text (e.g., 'Role: Developer' -> 'Developer')."""
        if not text:
            return text
        
        # Remove label prefix if present
        pattern = rf'^{label}\s*:\s*'
        cleaned = re.sub(pattern, '', text, flags=re.IGNORECASE).strip()
        return cleaned
    
    def _parse_experience_block(self, lines: List[str], start_idx: int) -> Optional[Dict[str, Any]]:
        """Parse a single work experience block starting from job title OR company name."""
        if start_idx >= len(lines):
            return None
        
        experience = {
            'job_title': '',
            'company_name': '',
            'location': '',
            'start_date': None,
            'end_date': None,
            'is_current': False,
            'clients': [],
            '_next_index': start_idx + 1
        }
        
        # CRITICAL: Detect if this is company-first or job-title-first format
        first_line = lines[start_idx].strip()
        second_line = lines[start_idx + 1].strip() if start_idx + 1 < len(lines) else ''
        
        # Check if second line has job title + date combined (e.g., "Engineer Dec 2022 - Current")
        second_line_has_title_and_date = False
        if second_line and self._is_date_line(second_line):
            # Check if line also contains job keywords before the date
            for keyword in ['developer', 'engineer', 'architect', 'manager', 'lead', 'senior', 
                           'analyst', 'consultant', 'designer', 'specialist', 'administrator']:
                if keyword in second_line.lower():
                    second_line_has_title_and_date = True
                    break
        
        # Check if first line is a company name (no job keywords) and second line is a job title
        is_company_first = (
            not self._is_job_title_line(first_line) and  # First line is NOT a job title
            (second_line and (self._is_job_title_line(second_line) or second_line_has_title_and_date))  # Second line IS a job title or has title+date
        )
        
        if is_company_first:
            # Format: Company, Job Title, Date
            # Line 1: Company
            company_line = self._clean_label_value(first_line, 'Company')
            if ',' in company_line:
                parts = company_line.split(',', 1)
                experience['company_name'] = parts[0].strip()
                experience['location'] = self._clean_label_value(parts[1].strip(), 'Location')
            else:
                experience['company_name'] = company_line
            
            # Line 2: Job Title (may have date on same line)
            idx = start_idx + 1
            if idx < len(lines):
                job_title_line = lines[idx].strip()
                
                # Check if this line has both job title and date
                if second_line_has_title_and_date:
                    # Split job title from date
                    # Pattern: "Job Title Month Year - Month Year" or "Job Title Month Year - Current"
                    date_match = re.search(rf'({self.month_patterns}\s+{self.year_pattern}.*)', job_title_line, re.IGNORECASE)
                    if date_match:
                        # Extract job title (everything before the date)
                        job_title = job_title_line[:date_match.start()].strip()
                        experience['job_title'] = self._clean_label_value(job_title, 'Role')
                        
                        # Extract and parse date
                        date_str = date_match.group(1).strip()
                        dates = self._parse_date_range(date_str)
                        experience['start_date'] = dates.get('start_date')
                        experience['end_date'] = dates.get('end_date')
                        experience['is_current'] = dates.get('is_current', False)
                    else:
                        experience['job_title'] = self._clean_label_value(job_title_line, 'Role')
                else:
                    experience['job_title'] = self._clean_label_value(job_title_line, 'Role')
                idx += 1
        else:
            # Format: Job Title, Company, Date (original format)
            # Line 1: Job Title (clean "Role:" prefix if present)
            job_title_line = first_line
            experience['job_title'] = self._clean_label_value(job_title_line, 'Role')
            idx = start_idx + 1
            
            # Line 2: Company, Location (clean "Company:" and "Location:" prefixes)
            if idx < len(lines):
                company_line = lines[idx].strip()
                if company_line and not self._is_date_line(company_line) and not company_line.lower().startswith('client:'):
                    # Clean "Company:" prefix
                    company_line = self._clean_label_value(company_line, 'Company')
                    
                    # Parse "Company, Location" or "Company"
                    if ',' in company_line:
                        parts = company_line.split(',', 1)
                        experience['company_name'] = parts[0].strip()
                        experience['location'] = self._clean_label_value(parts[1].strip(), 'Location')
                    else:
                        experience['company_name'] = company_line
                    idx += 1
        
        # Line 3: Date range (clean "Date:" prefix if present)
        if idx < len(lines):
            date_line = lines[idx].strip()
            date_line = self._clean_label_value(date_line, 'Date')
            if self._is_date_line(date_line):
                dates = self._parse_date_range(date_line)
                experience['start_date'] = dates.get('start_date')
                experience['end_date'] = dates.get('end_date')
                experience['is_current'] = dates.get('is_current', False)
                idx += 1
        
        # Remaining lines: Parse client blocks with their descriptions
        current_client = None
        while idx < len(lines):
            line = lines[idx].strip()
            
            # Stop if we hit another experience (job title OR company followed by job title)
            if line and self._is_job_title_line(line):
                break
            
            # Also stop if this looks like a company name followed by a job title (next experience)
            next_line = lines[idx + 1].strip() if idx + 1 < len(lines) else ''
            
            # Check if next line has job title + date combined
            next_has_title_date = False
            if next_line and self._is_date_line(next_line):
                for keyword in ['developer', 'engineer', 'architect', 'manager', 'lead', 'senior']:
                    if keyword in next_line.lower():
                        next_has_title_date = True
                        break
            
            if line and next_line and not self._is_job_title_line(line):
                # This line is NOT a job title but next line IS (or has title+date) - likely company name starting new experience
                if self._is_job_title_line(next_line) or next_has_title_date:
                    break
            
            # Check for client line
            if line.lower().startswith('client:'):
                # Save previous client if exists
                if current_client:
                    experience['clients'].append(current_client)
                
                # Start new client
                client_name = line[7:].strip()  # Remove "Client:"
                current_client = {
                    'client_name': client_name,
                    'descriptions': []
                }
            elif line and current_client:
                # Add description to current client
                # Remove bullet points and clean
                clean_line = re.sub(r'^[•\-\*\+►▸▶→]\s*', '', line).strip()
                if clean_line:
                    current_client['descriptions'].append(clean_line)
            
            idx += 1
        
        # Save last client if exists
        if current_client:
            experience['clients'].append(current_client)
        
        experience['_next_index'] = idx
        
        # Only return if we have at least a job title and company
        if experience['job_title'] and experience['company_name']:
            return experience
        
        return None
    
    def _is_date_line(self, line: str) -> bool:
        """Check if a line contains a date range."""
        # Check for month year patterns
        if re.search(rf'{self.month_patterns}\s+{self.year_pattern}', line, re.IGNORECASE):
            return True
        
        # Check for year-only ranges
        if re.search(rf'{self.year_pattern}\s*(?:–|—|-|to)\s*(?:{self.year_pattern}|present|current)', line, re.IGNORECASE):
            return True
        
        return False
    
    def _parse_date_range(self, date_line: str) -> Dict[str, Any]:
        """Parse start and end dates from a date range line."""
        result = {
            'start_date': None,
            'end_date': None,
            'is_current': False
        }
        
        # Check if currently working
        if re.search(r'present|current', date_line, re.IGNORECASE):
            result['is_current'] = True
        
        # Split by common separators (dashes, 'to', or multiple spaces before Present/Current)
        # Handle formats like "Dec 2022 - Current", "Dec 2022 to Current", "Dec 2022  Current"
        parts = re.split(r'(?:–|—|-|to|\s{2,})\s*', date_line, maxsplit=1)
        
        if len(parts) >= 1:
            # Parse start date
            start_str = parts[0].strip()
            start_date = dateparser.parse(start_str, settings={'PREFER_DAY_OF_MONTH': 'first'})
            if start_date:
                result['start_date'] = start_date.strftime('%Y-%m-%d')
        
        if len(parts) >= 2 and not result['is_current']:
            # Parse end date
            end_str = parts[1].strip()
            if not re.search(r'present|current', end_str, re.IGNORECASE):
                end_date = dateparser.parse(end_str, settings={'PREFER_DAY_OF_MONTH': 'last'})
                if end_date:
                    result['end_date'] = end_date.strftime('%Y-%m-%d')
        
        return result
