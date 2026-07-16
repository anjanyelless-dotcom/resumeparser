"""Base classes and interfaces for all parsers."""

from .parser_base import BaseParser, ParserConfig
from .parser_result import ParserResult, ContactInfo, WorkExperience, Education
from .mixins import ValidationMixin, LoggingMixin

__all__ = [
    'BaseParser',
    'ParserConfig',
    'ParserResult',
    'ContactInfo',
    'WorkExperience',
    'Education',
    'ValidationMixin',
    'LoggingMixin',
]
