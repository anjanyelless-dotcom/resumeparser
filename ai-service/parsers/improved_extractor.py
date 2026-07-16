"""
Improved extraction logic to boost parsing accuracy from 65% to 80-85%.
Focuses on better validation, filtering, and entity extraction.
"""

import re
import logging
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)


class ImprovedExtractor:
    """Enhanced extraction logic with better validation and filtering."""
    
    # Common resume section headers to exclude from name extraction
    SECTION_HEADERS = {
        'professional summary', 'executive summary', 'summary', 'objective', 'career objective',
        'work experience', 'experience', 'employment history', 'education',
        'skills', 'technical skills', 'skills summary', 'core competencies', 'certifications', 'projects',
        'achievements', 'awards', 'publications', 'references',
        'contact', 'contact information', 'personal information',
        'profile', 'about me', 'languages', 'interests', 'hobbies',
        'resume', 'curriculum vitae', 'cv', 'qualifications',
        'professional experience', 'career summary', 'background'
    }
    
    # Common non-personal URL patterns to exclude
    EXCLUDE_URL_PATTERNS = [
        r'asp\.net', r'ml\.net', r'akka\.net', r'next\.js', r'mermaid\.js',
        r'enterprise-solutions\.net', r'withinthemicrosoft\.net',
        r'identityserver\d+', r'azureadb2c', r'backstage\.io',
        r'pci-dss', r'gdpr', r'hipaa', r'kubernetes', r'docker',
        r'\.netstack', r'\.netgarbage', r'\.netci/cd'
    ]
    
    @staticmethod
    def improve_name_extraction(raw_name: Optional[str], text: str) -> Optional[str]:
        """
        Improve name extraction by filtering out section headers and validating format.
        
        Args:
            raw_name: Initially extracted name
            text: Full resume text
            
        Returns:
            Validated and improved name or None
        """
        if not raw_name:
            # Try to extract name from first few lines
            lines = text.split('\n')[:10]
            for line in lines:
                line = line.strip()
                # Look for lines with 2-4 words, all capitalized or title case
                words = line.split()
                if 2 <= len(words) <= 4:
                    # Check if it looks like a name (not a section header)
                    if line.lower() not in ImprovedExtractor.SECTION_HEADERS:
                        # Check if it's mostly letters
                        if sum(c.isalpha() or c.isspace() for c in line) / max(len(line), 1) > 0.8:
                            return line
            return None
        
        # Validate the extracted name
        name_lower = raw_name.lower().strip()
        
        # Filter out section headers
        if name_lower in ImprovedExtractor.SECTION_HEADERS:
            logger.warning(f"Filtered out section header as name: {raw_name}")
            # Try to find actual name from text
            return ImprovedExtractor.improve_name_extraction(None, text)
        
        # Filter out names that are too long (likely not a person's name)
        if len(raw_name.split()) > 5:
            logger.warning(f"Name too long, likely not a person: {raw_name}")
            return None
        
        # Filter out names with special characters (except hyphens and apostrophes)
        if re.search(r'[^a-zA-Z\s\-\']', raw_name):
            logger.warning(f"Name contains invalid characters: {raw_name}")
            return None
        
        return raw_name.strip()
    
    @staticmethod
    def filter_websites(websites: List[str]) -> List[str]:
        """
        Filter out non-personal websites and invalid URLs.
        
        Args:
            websites: List of extracted URLs
            
        Returns:
            Filtered list of personal websites only
        """
        if not websites:
            return []
        
        filtered = []
        for url in websites:
            url_lower = url.lower()
            
            # Skip if it matches excluded patterns
            if any(re.search(pattern, url_lower) for pattern in ImprovedExtractor.EXCLUDE_URL_PATTERNS):
                continue
            
            # Skip if it's too short (likely incomplete)
            if len(url) < 10:
                continue
            
            # Skip if it doesn't have a valid TLD
            if not re.search(r'\.(com|net|org|io|dev|me|co|us|uk|ca)(/|$)', url_lower):
                continue
            
            # Skip if it looks like a code snippet or technical term
            if any(tech in url_lower for tech in ['plinq', 'oltp', 'grpc', 'kafka', 'redis']):
                continue
            
            # Only keep URLs that look like personal websites
            # (portfolio sites, personal domains, etc.)
            if any(indicator in url_lower for indicator in ['portfolio', 'blog', 'personal', 'resume']):
                filtered.append(url)
            elif re.match(r'https?://[a-z]+\.[a-z]+\.(com|net|org|io|dev|me)/?$', url_lower):
                # Simple personal domain pattern
                filtered.append(url)
        
        return filtered[:3]  # Limit to 3 most relevant websites
    
    @staticmethod
    def extract_companies_from_experience(work_experience: List[Dict[str, Any]]) -> List[str]:
        """
        Extract company names from work experience entries.
        
        Args:
            work_experience: List of work experience dictionaries
            
        Returns:
            List of unique company names
        """
        companies = []
        for exp in work_experience:
            company = exp.get('company_name', '').strip()
            if company and len(company) > 2:
                # Filter out locations and dates that got misclassified as companies
                if not re.match(r'^[A-Z]{2}$', company):  # Not a state code
                    if not re.search(r'^\d{4}$|^(Present|Current)$', company):  # Not a year or "Present"
                        if company not in companies:
                            companies.append(company)
        return companies
    
    @staticmethod
    def improve_work_experience(work_exp: List[Dict[str, Any]], text: str) -> List[Dict[str, Any]]:
        """
        Improve work experience extraction by validating and fixing common issues.
        
        Args:
            work_exp: Initially extracted work experience
            text: Full resume text
            
        Returns:
            Improved work experience list
        """
        improved = []
        
        for exp in work_exp:
            # Validate job title
            job_title = exp.get('job_title', '').strip()
            if not job_title or len(job_title) < 3:
                continue
            
            # Filter out locations misclassified as job titles
            if re.match(r'^[A-Z][a-z]+,?\s*[A-Z]{2}$', job_title):
                logger.warning(f"Filtered out location as job title: {job_title}")
                continue
            
            # Filter out dates misclassified as job titles
            if re.search(r'^\d{4}$|^(Present|Current)$', job_title):
                continue
            
            # Validate company name
            company = exp.get('company_name', '').strip()
            if company and len(company) >= 3:
                # Filter out state codes
                if re.match(r'^[A-Z]{2}$', company):
                    exp['company_name'] = ''
                # Filter out years
                elif re.search(r'^\d{4}$', company):
                    exp['company_name'] = ''
            
            # Validate location
            location = exp.get('location', '').strip()
            if location:
                # Keep only if it looks like a valid location
                if not re.search(r'[A-Z][a-z]+.*[A-Z]{2}|[A-Z][a-z]+,\s*[A-Z][a-z]+', location):
                    exp['location'] = None
            
            improved.append(exp)
        
        return improved
    
    @staticmethod
    def calculate_improved_confidence(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate improved confidence scores based on data quality.
        
        Args:
            data: Parsed resume data
            
        Returns:
            Updated confidence dictionary
        """
        field_scores = {}
        
        # Name confidence
        name = data.get('name', '')
        if name and name.lower() not in ImprovedExtractor.SECTION_HEADERS:
            if 2 <= len(name.split()) <= 4:
                field_scores['name'] = 0.95
            else:
                field_scores['name'] = 0.7
        else:
            field_scores['name'] = 0.3
        
        # Email confidence
        email = data.get('email', '')
        if email and '@' in email and '.' in email:
            field_scores['email'] = 1.0
        else:
            field_scores['email'] = 0.0
        
        # Phone confidence
        phone = data.get('phone', '')
        if phone and len(re.findall(r'\d', phone)) >= 10:
            field_scores['phone'] = 1.0
        else:
            field_scores['phone'] = 0.0
        
        # Skills confidence
        skills = data.get('skills', [])
        if len(skills) >= 10:
            field_scores['skills'] = 1.0
        elif len(skills) >= 5:
            field_scores['skills'] = 0.8
        elif len(skills) > 0:
            field_scores['skills'] = 0.5
        else:
            field_scores['skills'] = 0.0
        
        # Experience confidence
        work_exp = data.get('work_experience', [])
        valid_exp = [exp for exp in work_exp if exp.get('company_name') and exp.get('job_title')]
        if len(valid_exp) >= 3:
            field_scores['experience'] = 0.9
        elif len(valid_exp) >= 2:
            field_scores['experience'] = 0.7
        elif len(valid_exp) >= 1:
            field_scores['experience'] = 0.5
        else:
            field_scores['experience'] = 0.2
        
        # Education confidence
        education = data.get('education', [])
        if len(education) >= 1:
            field_scores['education'] = 0.8
        else:
            field_scores['education'] = 0.0
        
        # Calculate overall confidence
        weights = {
            'name': 0.2,
            'email': 0.15,
            'phone': 0.1,
            'skills': 0.25,
            'experience': 0.2,
            'education': 0.1
        }
        
        overall = sum(field_scores.get(field, 0) * weight for field, weight in weights.items())
        
        # Determine quality level
        if overall >= 0.8:
            quality_level = 'excellent'
        elif overall >= 0.65:
            quality_level = 'good'
        elif overall >= 0.5:
            quality_level = 'fair'
        else:
            quality_level = 'poor'
        
        return {
            'overall': round(overall, 2),
            'fields': field_scores,
            'quality_level': quality_level,
            'field_weights': weights
        }
