"""Mixins for common parser functionality."""

import re
import logging
from typing import Optional, List, Dict, Any


class ValidationMixin:
    """Mixin providing common validation methods."""
    
    EMAIL_PATTERN = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    PHONE_PATTERN = re.compile(
        r'^\+?[\d\s\-\(\)]{10,}$'
    )
    
    URL_PATTERN = re.compile(
        r'^https?://[^\s<>"{}|\\^`[\]]+$',
        re.IGNORECASE
    )
    
    NAME_PATTERN = re.compile(
        r'^[A-Za-z\s\-\.\']{2,50}$'
    )
    
    @staticmethod
    def is_valid_email(email: Optional[str]) -> bool:
        """Validate email address."""
        if not email:
            return False
        return bool(ValidationMixin.EMAIL_PATTERN.match(email.strip()))
    
    @staticmethod
    def is_valid_phone(phone: Optional[str]) -> bool:
        """Validate phone number."""
        if not phone:
            return False
        return bool(ValidationMixin.PHONE_PATTERN.match(phone.strip()))
    
    @staticmethod
    def is_valid_url(url: Optional[str]) -> bool:
        """Validate URL."""
        if not url:
            return False
        return bool(ValidationMixin.URL_PATTERN.match(url.strip()))
    
    @staticmethod
    def is_valid_name(name: Optional[str]) -> bool:
        """Validate person name."""
        if not name:
            return False
        
        name = name.strip()
        
        # Check pattern
        if not ValidationMixin.NAME_PATTERN.match(name):
            return False
        
        # Must have at least 2 words
        words = name.split()
        if len(words) < 2:
            return False
        
        # Each word must start with capital letter
        if not all(word[0].isupper() for word in words if word):
            return False
        
        # Exclude common non-names
        exclude_keywords = [
            'resume', 'cv', 'curriculum', 'vitae',
            'senior', 'junior', 'lead', 'manager', 'director',
            'engineer', 'developer', 'designer', 'analyst'
        ]
        
        name_lower = name.lower()
        if any(keyword in name_lower for keyword in exclude_keywords):
            return False
        
        return True
    
    @staticmethod
    def is_valid_year(year: Optional[int], min_year: int = 1980, max_year: int = 2030) -> bool:
        """Validate year is in reasonable range."""
        if year is None:
            return False
        return min_year <= year <= max_year
    
    @staticmethod
    def sanitize_text(text: Optional[str]) -> str:
        """Sanitize text by removing unwanted characters."""
        if not text:
            return ""
        
        # Remove null bytes and control characters
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        
        # Remove PDF artifacts
        text = re.sub(r'\(cid:\d+\)', '', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()


class LoggingMixin:
    """Mixin providing structured logging capabilities."""
    
    def __init__(self):
        """Initialize logger."""
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def log_debug(self, message: str, **kwargs):
        """Log debug message with context."""
        self.logger.debug(message, extra=kwargs)
    
    def log_info(self, message: str, **kwargs):
        """Log info message with context."""
        self.logger.info(message, extra=kwargs)
    
    def log_warning(self, message: str, **kwargs):
        """Log warning message with context."""
        self.logger.warning(message, extra=kwargs)
    
    def log_error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error message with context."""
        extra = kwargs.copy()
        if error:
            extra['error_type'] = type(error).__name__
            extra['error_message'] = str(error)
        
        self.logger.error(message, extra=extra, exc_info=error is not None)
    
    def log_metric(self, metric_name: str, value: float, **tags):
        """Log metric for monitoring."""
        self.logger.info(
            f"METRIC: {metric_name}",
            extra={'metric': metric_name, 'value': value, 'tags': tags}
        )
