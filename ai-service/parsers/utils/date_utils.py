"""Date parsing and validation utilities with epoch guards."""

import re
from typing import Optional, Tuple
from datetime import datetime, date
from dateparser import parse as dateparse


# Date validation constants
MIN_VALID_YEAR = 1980
MAX_VALID_YEAR = 2030
EPOCH_YEAR = 1970


def is_valid_year(year: int, min_year: int = MIN_VALID_YEAR, max_year: int = MAX_VALID_YEAR) -> bool:
    """
    Check if year is in valid range.
    
    Args:
        year: Year to validate
        min_year: Minimum valid year
        max_year: Maximum valid year
        
    Returns:
        True if year is valid
    """
    return min_year <= year <= max_year


def parse_date_safe(date_str: str, min_year: int = MIN_VALID_YEAR) -> Optional[datetime]:
    """
    Parse date string with epoch guard.
    
    Args:
        date_str: Date string to parse
        min_year: Minimum valid year (default: 1980)
        
    Returns:
        Parsed datetime or None if invalid/unparseable
    """
    if not date_str or not isinstance(date_str, str):
        return None
    
    # Handle "Present", "Current", etc.
    if date_str.strip().lower() in ['present', 'current', 'now', 'ongoing']:
        return None
    
    try:
        parsed = dateparse(date_str)
        
        # Guard against epoch dates and invalid years
        if parsed and parsed.year >= min_year:
            return parsed
        
        return None
        
    except Exception:
        return None


def normalize_date_string(date_str: str, format: str = '%B %Y') -> str:
    """
    Normalize date string to standard format.
    
    Args:
        date_str: Date string to normalize
        format: Output format (default: "Month Year")
        
    Returns:
        Normalized date string or original if parsing fails
    """
    if not date_str:
        return ""
    
    # Handle special cases
    if date_str.strip().lower() in ['present', 'current', 'now', 'ongoing']:
        return 'Present'
    
    parsed = parse_date_safe(date_str)
    
    if parsed:
        try:
            return parsed.strftime(format)
        except Exception:
            pass
    
    # Return original if parsing failed
    return date_str.strip()


def validate_date_range(start_date: Optional[str], end_date: Optional[str]) -> bool:
    """
    Validate that start date is before end date.
    
    Args:
        start_date: Start date string
        end_date: End date string
        
    Returns:
        True if range is valid
    """
    if not start_date:
        return False
    
    # If end date is "Present", range is valid
    if end_date and end_date.strip().lower() in ['present', 'current', 'now', 'ongoing']:
        return True
    
    start = parse_date_safe(start_date)
    end = parse_date_safe(end_date) if end_date else datetime.now()
    
    if not start:
        return False
    
    if not end:
        return True  # If end is not parseable but start is, assume valid
    
    return start <= end


def calculate_duration_months(start_date: str, end_date: Optional[str] = None) -> int:
    """
    Calculate duration in months between two dates.
    
    Args:
        start_date: Start date string
        end_date: End date string (defaults to current date if None or "Present")
        
    Returns:
        Duration in months (0 if calculation fails)
    """
    if not start_date:
        return 0
    
    start = parse_date_safe(start_date)
    
    if not start:
        return 0
    
    # Handle "Present" or missing end date
    if not end_date or end_date.strip().lower() in ['present', 'current', 'now', 'ongoing']:
        end = datetime.now()
    else:
        end = parse_date_safe(end_date)
        if not end:
            end = datetime.now()
    
    try:
        months = (end.year - start.year) * 12 + (end.month - start.month)
        return max(0, months)  # Ensure non-negative
    except Exception:
        return 0


def extract_year_from_string(text: str) -> Optional[int]:
    """
    Extract 4-digit year from string.
    
    Args:
        text: Text containing year
        
    Returns:
        Extracted year or None
    """
    if not text:
        return None
    
    # Look for 4-digit year
    match = re.search(r'\b(19\d{2}|20\d{2})\b', text)
    
    if match:
        year = int(match.group(1))
        if is_valid_year(year):
            return year
    
    return None


def parse_date_range(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Parse date range from text (e.g., "Jan 2020 - Dec 2022").
    
    Args:
        text: Text containing date range
        
    Returns:
        Tuple of (start_date, end_date) as strings
    """
    if not text:
        return None, None
    
    # Pattern for date ranges
    range_pattern = re.compile(
        r'(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\bPresent\b|\bCurrent\b|\bNow\b)',
        re.IGNORECASE
    )
    
    match = range_pattern.search(text)
    
    if match:
        start_str = match.group(1)
        end_str = match.group(2)
        
        start_normalized = normalize_date_string(start_str)
        end_normalized = normalize_date_string(end_str)
        
        return start_normalized, end_normalized
    
    # Try year range pattern
    year_range_pattern = re.compile(
        r'(\d{4})\s*[-–—]\s*(\d{4}|\bPresent\b|\bCurrent\b|\bNow\b)',
        re.IGNORECASE
    )
    
    match = year_range_pattern.search(text)
    
    if match:
        start_year = match.group(1)
        end_year = match.group(2)
        
        return start_year, end_year if end_year.isdigit() else 'Present'
    
    return None, None


def format_date_for_display(date_str: Optional[str]) -> str:
    """
    Format date for user-friendly display.
    
    Args:
        date_str: Date string
        
    Returns:
        Formatted date string
    """
    if not date_str:
        return ""
    
    if date_str.strip().lower() in ['present', 'current', 'now', 'ongoing']:
        return "Present"
    
    parsed = parse_date_safe(date_str)
    
    if parsed:
        return parsed.strftime('%B %Y')
    
    return date_str
