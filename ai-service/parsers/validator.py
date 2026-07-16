"""
Parsed data validator that runs AFTER parsing to catch and fix obvious errors.
Validates and cleans parsed data before returning results.
"""

import re
import datetime
from typing import Optional, Tuple, List, Dict, Any


class ParsedDataValidator:
    """
    Validator that checks and fixes common parsing errors.
    Runs after parsing to ensure data quality before returning results.
    """
    
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    def __init__(self):
        """Initialize the validator."""
        self.current_year = datetime.datetime.now().year
    
    def validate_and_fix(self, data: dict) -> Tuple[dict, List[str]]:
        """
        Main validation and fixing pipeline.
        
        Args:
            data: Parsed data dictionary from parsers
            
        Returns:
            Tuple of (fixed_data, warnings_list)
        """
        warnings = []
        
        # Create a copy to avoid modifying original
        fixed_data = data.copy()
        
        # Apply all validation fixes
        fixed_data = self._fix_name(fixed_data, warnings)
        fixed_data = self._fix_email(fixed_data, warnings)
        fixed_data = self._fix_phone(fixed_data, warnings)
        fixed_data = self._fix_years_experience(fixed_data, warnings)
        fixed_data = self._fix_skills(fixed_data, warnings)
        fixed_data = self._fix_dates(fixed_data, warnings)
        
        # Store warnings in the result for API response metadata
        fixed_data['_validation_warnings'] = warnings
        
        return fixed_data, warnings
    
    def _fix_name(self, data: dict, warnings: List[str]) -> dict:
        """
        Validate and fix name field.
        
        Args:
            data: Data dictionary to validate
            warnings: List to collect warning messages
            
        Returns:
            Data dictionary with fixed name field
        """
        # Handle different data structures
        name = self._get_nested_field(data, ['personal_info', 'name']) or self._get_nested_field(data, ['name'])
        
        if name:
            # If name contains @ it's probably an email that got misclassified
            if '@' in name:
                warnings.append(f"Name field contained email address, cleared: {name}")
                self._set_nested_field(data, ['personal_info', 'name'], None)
                self._set_nested_field(data, ['name'], None)
            
            # If name is longer than 60 chars it's probably a sentence, not a name
            elif len(name) > 60:
                warnings.append(f"Name too long, likely parsing error: {name[:30]}...")
                self._set_nested_field(data, ['personal_info', 'name'], None)
                self._set_nested_field(data, ['name'], None)
            
            # If name contains numbers, it's probably not a real name
            elif any(char.isdigit() for char in name):
                warnings.append(f"Name contains numbers, likely parsing error: {name}")
                self._set_nested_field(data, ['personal_info', 'name'], None)
                self._set_nested_field(data, ['name'], None)
        
        return data
    
    def _fix_email(self, data: dict, warnings: List[str]) -> dict:
        """
        Validate and fix email field.
        
        Args:
            data: Data dictionary to validate
            warnings: List to collect warning messages
            
        Returns:
            Data dictionary with fixed email field
        """
        email = self._get_nested_field(data, ['personal_info', 'email']) or self._get_nested_field(data, ['email'])
        
        if email:
            # Check email format
            if not self.EMAIL_PATTERN.match(email):
                warnings.append(f"Invalid email format, cleared: {email}")
                self._set_nested_field(data, ['personal_info', 'email'], None)
                self._set_nested_field(data, ['email'], None)
            
            # Check for disposable email domains
            elif self._is_disposable_email(email):
                warnings.append(f"Disposable email address detected: {email}")
                # Keep it but warn
        
        return data
    
    def _fix_phone(self, data: dict, warnings: List[str]) -> dict:
        """
        Validate and fix phone field.
        
        Args:
            data: Data dictionary to validate
            warnings: List to collect warning messages
            
        Returns:
            Data dictionary with fixed phone field
        """
        phone = self._get_nested_field(data, ['personal_info', 'phone']) or self._get_nested_field(data, ['phone'])
        
        if phone:
            # Extract digits to validate
            digits = re.sub(r'\D', '', phone)
            
            if len(digits) < 7 or len(digits) > 15:
                warnings.append(f"Phone digit count out of range ({len(digits)}), cleared")
                self._set_nested_field(data, ['personal_info', 'phone'], None)
                self._set_nested_field(data, ['phone'], None)
            
            # Check for obviously fake numbers
            elif len(set(digits)) < 3:  # Too many repeated digits
                warnings.append(f"Phone number appears fake (repeated digits): {phone}")
                self._set_nested_field(data, ['personal_info', 'phone'], None)
                self._set_nested_field(data, ['phone'], None)
        
        return data
    
    def _fix_years_experience(self, data: dict, warnings: List[str]) -> dict:
        """
        Validate and fix years of experience field.
        
        Args:
            data: Data dictionary to validate
            warnings: List to collect warning messages
            
        Returns:
            Data dictionary with fixed years_experience field
        """
        yoe = data.get('years_experience')
        
        if yoe is not None:
            try:
                yoe_float = float(yoe)
                if yoe_float < 0 or yoe_float > 50:
                    warnings.append(f"Years of experience out of range: {yoe}, cleared")
                    data['years_experience'] = None
                elif yoe_float > 30:
                    warnings.append(f"Years of experience seems high: {yoe}")
            except (ValueError, TypeError):
                warnings.append(f"Invalid years of experience format: {yoe}, cleared")
                data['years_experience'] = None
        
        return data
    
    def _fix_skills(self, data: dict, warnings: List[str]) -> dict:
        """
        Validate and fix skills field.
        
        Args:
            data: Data dictionary to validate
            warnings: List to collect warning messages
            
        Returns:
            Data dictionary with fixed skills field
        """
        skills = data.get('skills', [])
        
        if isinstance(skills, list):
            # Remove skills that are single characters or longer than 50 chars
            cleaned = []
            for skill in skills:
                if isinstance(skill, str):
                    skill_clean = skill.strip()
                    if 2 <= len(skill_clean) <= 50:
                        # Remove skills that look like sentences or random text
                        if not self._looks_like_invalid_skill(skill_clean):
                            cleaned.append(skill_clean)
                        else:
                            warnings.append(f"Removed invalid skill entry: {skill_clean[:30]}...")
                    elif skill_clean:
                        warnings.append(f"Removed skill with invalid length: {skill_clean[:20]}...")
            
            if len(cleaned) != len(skills):
                warnings.append(f"Removed {len(skills) - len(cleaned)} invalid skill entries")
            
            # Remove duplicates and sort
            unique_skills = list(dict.fromkeys(cleaned))  # Preserve order
            data['skills'] = unique_skills
        
        return data
    
    def _fix_dates(self, data: dict, warnings: List[str]) -> dict:
        """
        Validate and fix date fields in experience and education.
        
        Args:
            data: Data dictionary to validate
            warnings: List to collect warning messages
            
        Returns:
            Data dictionary with fixed date fields
        """
        # Check experience dates
        for exp in data.get('experience', []):
            if isinstance(exp, dict):
                for date_field in ['start_date', 'end_date']:
                    val = exp.get(date_field, '')
                    if val:
                        val_str = str(val)
                        
                        # Check for future dates
                        if str(self.current_year + 5) in val_str:
                            warnings.append(f"Future date detected in experience: {val}")
                            exp[date_field] = None
                        
                        # Check for very old dates (before 1950)
                        elif '195' in val_str and any(year in val_str for year in ['194', '193', '192', '191', '190']):
                            warnings.append(f"Very old date detected in experience: {val}")
                            exp[date_field] = None
                        
                        # Check for invalid date formats
                        elif self._looks_like_invalid_date(val_str):
                            warnings.append(f"Invalid date format in experience: {val}")
                            exp[date_field] = None
        
        # Check education dates
        for edu in data.get('education', []):
            if isinstance(edu, dict):
                for date_field in ['start_date', 'end_date', 'graduation_date']:
                    val = edu.get(date_field, '')
                    if val and self._looks_like_invalid_date(str(val)):
                        warnings.append(f"Invalid date format in education: {val}")
                        edu[date_field] = None
        
        return data
    
    def _get_nested_field(self, data: dict, path: List[str]) -> Any:
        """
        Get a nested field value from a dictionary.
        
        Args:
            data: Dictionary to search
            path: List of keys to traverse
            
        Returns:
            Value at the nested path or None
        """
        current = data
        for key in path:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current
    
    def _set_nested_field(self, data: dict, path: List[str], value: Any) -> None:
        """
        Set a nested field value in a dictionary.
        
        Args:
            data: Dictionary to modify
            path: List of keys to traverse
            value: Value to set
        """
        current = data
        for key in path[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[path[-1]] = value
    
    def _is_disposable_email(self, email: str) -> bool:
        """
        Check if email is from a disposable email service.
        
        Args:
            email: Email address to check
            
        Returns:
            True if disposable, False otherwise
        """
        disposable_domains = {
            'mailinator.com', 'guerrillamail.com', 'tempmail.com',
            '10minutemail.com', 'throwaway.email', 'fakeinbox.com',
            'temp-mail.org', 'yopmail.com', 'maildrop.cc'
        }
        
        domain = email.split('@')[-1].lower()
        return domain in disposable_domains
    
    def _looks_like_invalid_skill(self, skill: str) -> bool:
        """
        Check if a skill entry looks invalid.
        
        Args:
            skill: Skill string to check
            
        Returns:
            True if looks invalid, False otherwise
        """
        skill_lower = skill.lower()
        
        # Check if it contains too many spaces or looks like a sentence
        if skill_lower.count(' ') > 3:
            return True
        
        # Check if it contains common invalid indicators
        invalid_indicators = [
            'http://', 'https://', 'www.', '.com',
            'email:', 'phone:', 'address:',
            'resume', 'cv', 'curriculum',
            'experience', 'education', 'skills'
        ]
        
        return any(indicator in skill_lower for indicator in invalid_indicators)
    
    def _looks_like_invalid_date(self, date_str: str) -> bool:
        """
        Check if a date string looks invalid.
        
        Args:
            date_str: Date string to check
            
        Returns:
            True if looks invalid, False otherwise
        """
        date_str = date_str.strip()
        
        # Check for obviously invalid patterns
        invalid_patterns = [
            r'^[a-zA-Z]+$',  # Only letters
            r'^\d{1,2}$',    # Only 1-2 digits
        ]
        
        # Don't flag common valid patterns as invalid
        valid_patterns = [
            r'^[a-zA-Z]{3,}\s+\d{4}$',  # Month Year (e.g., "Jan 2020")
            r'^[a-zA-Z]{3,}\s+\d{1,2},\s*\d{4}$',  # Month Day, Year (e.g., "Jan 15, 2020")
            r'^\d{1,2}/\d{1,2}/\d{4}$',  # MM/DD/YYYY
            r'^\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD
            r'^Present$',  # Current employment
        ]
        
        # If it matches a valid pattern, it's not invalid
        if any(re.match(pattern, date_str, re.IGNORECASE) for pattern in valid_patterns):
            return False
        
        # If it matches an invalid pattern, it's invalid
        return any(re.match(pattern, date_str) for pattern in invalid_patterns)
    
    def get_validation_summary(self, data: dict) -> Dict[str, Any]:
        """
        Get a summary of validation results.
        
        Args:
            data: Validated data dictionary
            
        Returns:
            Dictionary with validation summary
        """
        warnings = data.get('_validation_warnings', [])
        
        return {
            'validation_warnings_count': len(warnings),
            'validation_warnings': warnings,
            'data_quality_score': max(0, 100 - (len(warnings) * 5)),  # Simple scoring
            'fields_validated': [
                'name', 'email', 'phone', 'years_experience', 
                'skills', 'experience_dates', 'education_dates'
            ]
        }
