"""Text cleaning and normalization utilities."""

import re
from typing import Optional


def remove_pdf_artifacts(text: str) -> str:
    """
    Remove common PDF extraction artifacts.
    
    Args:
        text: Input text with potential PDF artifacts
        
    Returns:
        Cleaned text
    """
    if not text:
        return ""
    
    # Remove cid: font encoding artifacts
    text = re.sub(r'\(cid:\d+\)', '', text)
    
    # Normalize runs of 3+ spaces to newlines (multi-column PDF artifacts)
    text = re.sub(r' {3,}', '\n', text)
    
    # Remove zero-width and other invisible characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    
    # Remove form feed characters
    text = text.replace('\f', '\n')
    
    # Remove soft hyphens
    text = text.replace('\u00ad', '')
    
    return text


def normalize_whitespace(text: str) -> str:
    """
    Normalize whitespace in text.
    
    Args:
        text: Input text
        
    Returns:
        Text with normalized whitespace
    """
    if not text:
        return ""
    
    # Normalize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Remove trailing whitespace from each line
    lines = text.split('\n')
    lines = [line.rstrip() for line in lines]
    
    # Remove excessive blank lines (max 2 consecutive)
    cleaned_lines = []
    blank_count = 0
    
    for line in lines:
        if not line.strip():
            blank_count += 1
            if blank_count <= 2:
                cleaned_lines.append(line)
        else:
            blank_count = 0
            cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    
    # Normalize spaces (but preserve intentional indentation)
    text = re.sub(r'[ \t]+', ' ', text)
    
    return text.strip()


def clean_text(text: str) -> str:
    """
    Comprehensive text cleaning.
    
    Args:
        text: Input text
        
    Returns:
        Cleaned text
    """
    if not text:
        return ""
    
    # Apply all cleaning steps
    text = remove_pdf_artifacts(text)
    text = normalize_whitespace(text)
    
    return text


def extract_sentences(text: str, max_sentences: Optional[int] = None) -> list:
    """
    Extract sentences from text.
    
    Args:
        text: Input text
        max_sentences: Maximum number of sentences to return
        
    Returns:
        List of sentences
    """
    if not text:
        return []
    
    # Simple sentence splitting (can be improved with NLTK)
    sentences = re.split(r'[.!?]+\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if max_sentences:
        sentences = sentences[:max_sentences]
    
    return sentences


def truncate_text(text: str, max_length: int = 1000, suffix: str = "...") -> str:
    """
    Truncate text to maximum length.
    
    Args:
        text: Input text
        max_length: Maximum length
        suffix: Suffix to add if truncated
        
    Returns:
        Truncated text
    """
    if not text or len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def remove_urls(text: str) -> str:
    """
    Remove URLs from text.
    
    Args:
        text: Input text
        
    Returns:
        Text with URLs removed
    """
    if not text:
        return ""
    
    # Remove URLs
    text = re.sub(r'https?://[^\s<>"{}|\\^`[\]]+', '', text, flags=re.IGNORECASE)
    
    return text


def remove_emails(text: str) -> str:
    """
    Remove email addresses from text.
    
    Args:
        text: Input text
        
    Returns:
        Text with emails removed
    """
    if not text:
        return ""
    
    # Remove emails
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
    
    return text


def normalize_company_name(company: str) -> str:
    """
    Normalize company name by removing common suffixes.
    
    Args:
        company: Company name
        
    Returns:
        Normalized company name
    """
    if not company:
        return ""
    
    company = company.strip()
    
    # Remove common suffixes
    suffixes = [
        r'\s+Inc\.?$',
        r'\s+LLC\.?$',
        r'\s+Ltd\.?$',
        r'\s+Corporation$',
        r'\s+Corp\.?$',
        r'\s+Company$',
        r'\s+Co\.?$',
        r'\s+Limited$',
        r'\s+Pvt\.?\s+Ltd\.?$',
        r'\s+Private\s+Limited$',
    ]
    
    for suffix in suffixes:
        company = re.sub(suffix, '', company, flags=re.IGNORECASE)
    
    return company.strip()


def extract_initials(name: str) -> str:
    """
    Extract initials from a name.
    
    Args:
        name: Person's name
        
    Returns:
        Initials (e.g., "John Doe" -> "JD")
    """
    if not name:
        return ""
    
    words = name.split()
    initials = ''.join([word[0].upper() for word in words if word and word[0].isalpha()])
    
    return initials
