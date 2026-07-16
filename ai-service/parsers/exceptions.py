"""Custom exceptions for parser module."""


class ParserException(Exception):
    """Base exception for all parser errors."""
    pass


class ValidationError(ParserException):
    """Raised when input validation fails."""
    pass


class ExtractionError(ParserException):
    """Raised when data extraction fails."""
    pass


class ConfigurationError(ParserException):
    """Raised when parser configuration is invalid."""
    pass


class TimeoutError(ParserException):
    """Raised when parsing exceeds timeout."""
    pass


class ModelLoadError(ParserException):
    """Raised when ML model fails to load."""
    pass
