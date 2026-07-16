"""Base parser class and configuration for all parsers."""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging
from dataclasses import dataclass

from .parser_result import ParserResult


@dataclass
class ParserConfig:
    """Configuration for parsers."""
    
    # Logging
    log_level: str = "INFO"
    debug_mode: bool = False
    
    # Performance
    max_text_length: int = 1_000_000  # 1MB max
    timeout_seconds: int = 30
    
    # Accuracy thresholds
    min_confidence_threshold: float = 0.5
    fuzzy_match_threshold: float = 0.85
    
    # Date parsing
    min_year: int = 1980
    max_year: int = 2030
    
    # Skill extraction
    min_skill_length: int = 2
    max_skills: int = 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'log_level': self.log_level,
            'debug_mode': self.debug_mode,
            'max_text_length': self.max_text_length,
            'timeout_seconds': self.timeout_seconds,
            'min_confidence_threshold': self.min_confidence_threshold,
            'fuzzy_match_threshold': self.fuzzy_match_threshold,
            'min_year': self.min_year,
            'max_year': self.max_year,
            'min_skill_length': self.min_skill_length,
            'max_skills': self.max_skills,
        }


class BaseParser(ABC):
    """
    Abstract base class for all parsers.
    
    Provides:
    - Standardized interface
    - Common validation logic
    - Logging infrastructure
    - Error handling
    - Configuration management
    """
    
    def __init__(self, config: Optional[ParserConfig] = None):
        """
        Initialize the parser.
        
        Args:
            config: Parser configuration. Uses defaults if not provided.
        """
        self.config = config or ParserConfig()
        self.logger = self._setup_logger()
        self._initialize()
    
    def _setup_logger(self) -> logging.Logger:
        """Set up logger with configured level."""
        logger = logging.getLogger(self.__class__.__name__)
        logger.setLevel(getattr(logging, self.config.log_level))
        return logger
    
    def _initialize(self):
        """
        Initialize parser-specific resources.
        Override in subclasses to load models, compile patterns, etc.
        """
        pass
    
    @abstractmethod
    def parse(self, text: str, **kwargs) -> ParserResult:
        """
        Parse text and extract structured information.
        
        Args:
            text: Input text to parse
            **kwargs: Additional parser-specific arguments
            
        Returns:
            ParserResult with extracted information
            
        Raises:
            ValidationError: If input is invalid
            ExtractionError: If parsing fails
        """
        pass
    
    def validate_input(self, text: str) -> bool:
        """
        Validate input text before parsing.
        
        Args:
            text: Input text to validate
            
        Returns:
            True if valid, False otherwise
            
        Raises:
            ValidationError: If validation fails
        """
        if not text:
            raise ValueError("Input text cannot be empty")
        
        if not isinstance(text, str):
            raise TypeError(f"Input must be string, got {type(text)}")
        
        if len(text) > self.config.max_text_length:
            raise ValueError(
                f"Input text too long: {len(text)} > {self.config.max_text_length}"
            )
        
        return True
    
    def sanitize_input(self, text: str) -> str:
        """
        Sanitize input text before parsing.
        
        Args:
            text: Input text to sanitize
            
        Returns:
            Sanitized text
        """
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Normalize line endings
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove excessive whitespace
        lines = text.split('\n')
        lines = [line.rstrip() for line in lines]
        text = '\n'.join(lines)
        
        return text.strip()
    
    def log_parse_start(self, text_length: int, **kwargs):
        """Log parsing start."""
        self.logger.info(
            f"Starting parse with {self.__class__.__name__}",
            extra={'text_length': text_length, **kwargs}
        )
    
    def log_parse_end(self, result: ParserResult, duration_ms: float):
        """Log parsing completion."""
        self.logger.info(
            f"Parse completed in {duration_ms:.2f}ms",
            extra={
                'duration_ms': duration_ms,
                'fields_extracted': len([k for k, v in result.to_dict().items() if v]),
                'confidence': result.confidence_scores.get('overall', 0.0),
            }
        )
    
    def log_error(self, error: Exception, context: Dict[str, Any] = None):
        """Log parsing error."""
        self.logger.error(
            f"Parse failed: {str(error)}",
            extra={'error_type': type(error).__name__, 'context': context or {}},
            exc_info=self.config.debug_mode
        )
