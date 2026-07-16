#!/usr/bin/env python3
"""
Centralized logging configuration for resume parsing pipeline
Provides structured JSON logging with request ID tracking
"""

import logging
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
import traceback

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        
        # Add request ID if available
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        
        # Add extra fields
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }
        
        return json.dumps(log_data, default=str)


class RequestLogger:
    """Logger with request ID context"""
    
    def __init__(self, logger: logging.Logger, request_id: str):
        self.logger = logger
        self.request_id = request_id
    
    def _log(self, level: int, message: str, extra_data: Optional[Dict[str, Any]] = None):
        """Internal logging method with request ID"""
        extra = {'request_id': self.request_id}
        if extra_data:
            extra['extra_data'] = extra_data
        self.logger.log(level, message, extra=extra)
    
    def debug(self, message: str, **kwargs):
        self._log(logging.DEBUG, message, kwargs)
    
    def info(self, message: str, **kwargs):
        self._log(logging.INFO, message, kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log(logging.WARNING, message, kwargs)
    
    def error(self, message: str, **kwargs):
        self._log(logging.ERROR, message, kwargs)
    
    def exception(self, message: str, **kwargs):
        """Log exception with stack trace"""
        extra = {'request_id': self.request_id}
        if kwargs:
            extra['extra_data'] = kwargs
        self.logger.exception(message, extra=extra)


def setup_logging(log_file: str = 'logs/resume_parser.log', level: int = logging.DEBUG) -> logging.Logger:
    """
    Set up centralized logging configuration
    
    Args:
        log_file: Path to log file
        level: Logging level
    
    Returns:
        Configured logger
    """
    # Create logs directory if it doesn't exist
    log_path = Path(log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Create logger
    logger = logging.getLogger('resume_parser')
    logger.setLevel(level)
    logger.handlers.clear()
    
    # JSON formatter for file
    json_formatter = JSONFormatter()
    
    # File handler with JSON format
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(level)
    file_handler.setFormatter(json_formatter)
    logger.addHandler(file_handler)
    
    # Console handler with readable format
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    return logger


def get_request_logger(request_id: Optional[str] = None) -> RequestLogger:
    """
    Get a logger with request ID context
    
    Args:
        request_id: Optional request ID, generates one if not provided
    
    Returns:
        RequestLogger instance
    """
    if request_id is None:
        request_id = str(uuid.uuid4())
    
    logger = logging.getLogger('resume_parser')
    return RequestLogger(logger, request_id)


def generate_request_id() -> str:
    """Generate a unique request ID"""
    return str(uuid.uuid4())


# Initialize default logger
default_logger = setup_logging()
