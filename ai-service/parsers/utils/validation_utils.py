"""Validation utilities for common data types."""

import re
from typing import Optional


# Compiled regex patterns for validation
EMAIL_PATTERN = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)

PHONE_PATTERNS = [
    re.compile(r'^\+91[-\s]?(\d{5})[-\s]?(\d{5})$'),  # +91 87904 33333
    re.compile(r'^\+\d{1,3}[-\s]?\d{10,}$'),  # International format
    re.compile(r'^(\d{3})[-\s]?(\d{3})[-\s]?(\d{4})$'),  # 879-043-3333
    re.compile(r'^(\d{10})$'),  # 8790433333
]

URL_PATTERN = re.compile(
    r'^https?://[^\s<>"{}|\\^`[\]]+$',
    re.IGNORECASE
)

LINKEDIN_PATTERN = re.compile(
    r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+/?',
    re.IGNORECASE
)

GITHUB_PATTERN = re.compile(
    r'(?:https?://)?(?:www\.)?github\.com/[\w\-]+/?',
    re.IGNORECASE
)


def validate_email(email: Optional[str]) -> bool:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid email format
    """
    if not email or not isinstance(email, str):
        return False
    
    email = email.strip()
    
    # Check pattern
    if not EMAIL_PATTERN.match(email):
        return False
    
    # Additional checks
    if email.count('@') != 1:
        return False
    
    local, domain = email.split('@')
    
    # Local part checks
    if not local or len(local) > 64:
        return False
    
    # Domain checks
    if not domain or len(domain) > 255:
        return False
    
    if domain.startswith('.') or domain.endswith('.'):
        return False
    
    if '..' in domain:
        return False
    
    return True


def validate_phone(phone: Optional[str]) -> bool:
    """
    Validate phone number format.
    
    Args:
        phone: Phone number to validate
        
    Returns:
        True if valid phone format
    """
    if not phone or not isinstance(phone, str):
        return False
    
    phone = phone.strip()
    
    # Try each pattern
    for pattern in PHONE_PATTERNS:
        if pattern.match(phone):
            return True
    
    return False


def validate_url(url: Optional[str]) -> bool:
    """
    Validate URL format.
    
    Args:
        url: URL to validate
        
    Returns:
        True if valid URL format
    """
    if not url or not isinstance(url, str):
        return False
    
    url = url.strip()
    
    return bool(URL_PATTERN.match(url))


def validate_linkedin(linkedin: Optional[str]) -> bool:
    """
    Validate LinkedIn profile URL.
    
    Args:
        linkedin: LinkedIn URL to validate
        
    Returns:
        True if valid LinkedIn URL
    """
    if not linkedin or not isinstance(linkedin, str):
        return False
    
    return bool(LINKEDIN_PATTERN.match(linkedin.strip()))


def validate_github(github: Optional[str]) -> bool:
    """
    Validate GitHub profile URL.
    
    Args:
        github: GitHub URL to validate
        
    Returns:
        True if valid GitHub URL
    """
    if not github or not isinstance(github, str):
        return False
    
    return bool(GITHUB_PATTERN.match(github.strip()))


def normalize_phone(phone: str) -> str:
    """
    Normalize phone number to standard format.
    
    Args:
        phone: Phone number to normalize
        
    Returns:
        Normalized phone number
    """
    if not phone:
        return ""
    
    # Remove all non-digit characters except +
    normalized = re.sub(r'[^\d+]', '', phone)
    
    return normalized


def normalize_url(url: str) -> str:
    """
    Normalize URL by ensuring it has a scheme.
    
    Args:
        url: URL to normalize
        
    Returns:
        Normalized URL
    """
    if not url:
        return ""
    
    url = url.strip()
    
    # Add https:// if no scheme
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    return url


def extract_domain(email_or_url: str) -> Optional[str]:
    """
    Extract domain from email or URL.
    
    Args:
        email_or_url: Email address or URL
        
    Returns:
        Domain name or None
    """
    if not email_or_url:
        return None
    
    # Check if email
    if '@' in email_or_url:
        parts = email_or_url.split('@')
        if len(parts) == 2:
            return parts[1].strip().lower()
    
    # Check if URL
    url_match = re.search(r'(?:https?://)?(?:www\.)?([^/]+)', email_or_url)
    if url_match:
        return url_match.group(1).strip().lower()
    
    return None


def is_disposable_email(email: str) -> bool:
    """
    Check if email is from a disposable email provider.
    
    Args:
        email: Email address
        
    Returns:
        True if disposable email
    """
    if not email:
        return False
    
    domain = extract_domain(email)
    
    if not domain:
        return False
    
    # Common disposable email domains
    disposable_domains = {
        'tempmail.com', 'guerrillamail.com', '10minutemail.com',
        'mailinator.com', 'throwaway.email', 'temp-mail.org',
        'yopmail.com', 'maildrop.cc', 'sharklasers.com'
    }
    
    return domain in disposable_domains


def is_professional_email(email: str) -> bool:
    """
    Check if email appears to be a professional/work email.
    
    Args:
        email: Email address
        
    Returns:
        True if appears to be professional email
    """
    if not email:
        return False
    
    domain = extract_domain(email)
    
    if not domain:
        return False
    
    # Common personal email providers
    personal_domains = {
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'live.com', 'aol.com', 'icloud.com', 'protonmail.com',
        'mail.com', 'zoho.com', 'yandex.com', 'gmx.com'
    }
    
    # If not in personal domains list, likely professional
    return domain not in personal_domains
