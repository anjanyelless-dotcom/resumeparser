from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
# Trigger reload
from pydantic import BaseModel, field_validator, model_validator
import logging
import time
import os
import torch
from typing import Optional, Dict, Any, List
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from parsers.master_parser import MasterParser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Debug: Check if API keys are loaded
logger.info("=" * 80)
logger.info("ENVIRONMENT VARIABLES CHECK:")
logger.info(f"GEMINI_API_KEY: {'SET' if os.getenv('GEMINI_API_KEY') else 'NOT SET'}")
logger.info(f"ANTHROPIC_API_KEY: {'SET' if os.getenv('ANTHROPIC_API_KEY') else 'NOT SET'}")
logger.info(f"OPENAI_API_KEY: {'SET' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")
logger.info(f"DEEPSEEK_API_KEY: {'SET' if os.getenv('DEEPSEEK_API_KEY') else 'NOT SET'}")
logger.info("=" * 80)

# Initialize FastAPI app
app = FastAPI(
    title='Resume Parser AI',
    description='AI-powered resume parsing and text extraction service',
    version='1.0.0',
    docs_url='/docs',
    redoc_url='/redoc'
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3001',  # Node.js backend
        'http://localhost:3000',  # React frontend
        'http://localhost:5173',  # Vite dev server
        'https://lakshya-llm-resume-parser-ated.vercel.app'
    ],
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['*']
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code} - {process_time:.4f}s")
    
    return response

# Global master parser instance (will be initialized at startup)
master_parser: Optional[MasterParser] = None

# Cached lightweight parser instances (initialized once at startup)
_cached_text_extractor: Optional[Any] = None
_cached_section_splitter: Optional[Any] = None
_cached_section_validator: Optional[Any] = None
_cached_deberta_parser: Optional[Any] = None

# Import matching engine
try:
    from matching.matching_engine import MatchingEngine
    MATCHING_ENGINE_AVAILABLE = True
except ImportError as e:
    MATCHING_ENGINE_AVAILABLE = False
    logger.warning(f"Matching engine not available: {e}")

# Initialize matching engine if available
matching_engine = None
if MATCHING_ENGINE_AVAILABLE:
    try:
        matching_engine = MatchingEngine()
        logger.info("Matching engine initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize matching engine: {e}")
        MATCHING_ENGINE_AVAILABLE = False

# Global metrics tracking
parse_metrics = {
    'total_parses': 0,
    'total_parse_time_ms': 0.0,
    'total_confidence_score': 0.0,
    'successful_parses': 0,
    'failed_parses': 0,
    'error_counts': defaultdict(int)
}

# Pydantic Models
class ParseRequest(BaseModel):
    file_path: str
    candidate_id: str
    llm_provider: Optional[str] = None
    force_ocr: Optional[bool] = False

class ParseTextRequest(BaseModel):
    text: str
    candidate_id: str

class BatchParseRequest(BaseModel):
    files: List[Dict[str, str]]  # List of {file_path, candidate_id}

class BenchmarkRequest(BaseModel):
    text: str

class ParseResponse(BaseModel):
    candidate_id: str
    status: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    websites: List[str] = []
    skills: List[str] = []
    work_experience: List[Dict[str, Any]] = []
    work_history: List[Dict[str, Any]] = []  # Backend compatibility field
    education: List[Dict[str, Any]] = []
    job_titles: List[str] = []
    companies: List[str] = []
    locations: List[str] = []
    confidence: Dict[str, Any] = {}
    needs_review: bool = False
    quality_level: str = "medium"
    processing_metrics: Dict[str, Any] = {}
    summary: Optional[str] = None
    years_of_experience: Optional[float] = None
    dates: List[str] = []
    source_info: Optional[Dict[str, Any]] = None
    text_info: Optional[Dict[str, Any]] = None
    extraction_quality: Optional[Dict[str, Any]] = None
    model_results: Optional[Dict[str, Any]] = None
    raw_text: Optional[str] = None
    raw_resume_text: Optional[str] = None
    domain: Optional[Dict[str, Any]] = None
    licenses: List[str] = []
    # Validators to ensure None values are converted to empty lists
    @field_validator('websites', 'skills', 'work_experience', 'work_history', 'education', 'job_titles', 'companies', 'locations', 'dates', mode='before')
    @classmethod
    def empty_list_for_none(cls, v):
        return [] if v is None else v
    
    @field_validator('confidence', 'processing_metrics', mode='before')
    @classmethod
    def empty_dict_for_none(cls, v):
        return {} if v is None else v
    
    @model_validator(mode='before')
    @classmethod
    def map_work_experience_to_work_history(cls, data):
        """Map work_experience to work_history for backend compatibility"""
        if isinstance(data, dict):
            # If work_history is not provided but work_experience is, map it
            if 'work_history' not in data and 'work_experience' in data:
                data['work_history'] = data['work_experience']
            # If work_experience is not provided but work_history is, map it
            elif 'work_experience' not in data and 'work_history' in data:
                data['work_experience'] = data['work_history']
        return data

class BatchParseResponse(BaseModel):
    status: str
    total_files: int
    successful_parses: int
    failed_parses: int
    results: List[ParseResponse]
    errors: List[Dict[str, str]]

class MetricsResponse(BaseModel):
    total_parses_count: int
    average_parse_time_ms: float
    average_confidence_score: float
    successful_parse_rate: float
    model_name: str
    model_type: str
    supported_entities: List[str]
    device: str
    cache_size: str
    parser_health: Dict[str, Any]
    error_breakdown: Dict[str, int]

class BenchmarkResponse(BaseModel):
    status: str
    processing_time: float
    timing_breakdown: Dict[str, float]
    parsed_data: Dict[str, Any]
    confidence_scores: Dict[str, Any]

class MatchRequest(BaseModel):
    candidate_data: Dict[str, Any]
    job_data: Dict[str, Any]

class MatchBatchRequest(BaseModel):
    candidates_data: List[Dict[str, Any]]
    job_data: Dict[str, Any]

class MatchBatchResponse(BaseModel):
    results: List[Dict[str, Any]]

class MatchResponse(BaseModel):
    overall_score: float
    skill_score: float
    experience_score: float
    education_score: float
    matching_skills: List[str]
    missing_skills: List[str]
    extra_skills: List[str]
    experience_gap_years: float
    recommendation: str
    reason: str

class HealthResponse(BaseModel):
    status: str
    version: str
    extractor_available: bool
    supported_formats: list

class WelcomeResponse(BaseModel):
    message: str
    service: str
    version: str
    endpoints: dict

class ParseSectionsRequest(BaseModel):
    experience_text: Optional[str] = None
    education_text: Optional[str] = None
    skills_text: Optional[str] = None
    summary_text: Optional[str] = None
    certifications_text: Optional[str] = None
    projects_text: Optional[str] = None
    contact_text: Optional[str] = None
    raw_text: Optional[str] = None  # Full resume text for fallback name extraction

class ParseSectionsResponse(BaseModel):
    status: str
    work_experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    skills: List[str] = []
    summary: Optional[str] = None
    certifications: List[str] = []
    projects: List[str] = []
    contact: Optional[Dict[str, Any]] = None
    processing_time_ms: float
    message: str

# Error Response Model
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[str] = None

class SectionPreviewResponse(BaseModel):
    filename: str
    extraction_method: str
    raw_text_length: int
    raw_text: str
    total_sections: int
    sections: Dict[str, Dict[str, Any]]  # {section_name: {text: str, char_count: int}}
    detected_sections: List[str]  # List of section names with non-empty text
    missing_sections: List[str]  # List of standard sections not detected
    validation_metadata: Dict[str, Any]  # Validation information (spacy_available, validation_ran, corrections, warnings)
    processing_time_ms: Optional[float] = None

# Routes
@app.get("/", response_model=WelcomeResponse)
async def root():
    """Root endpoint with welcome message and available endpoints."""
    return WelcomeResponse(
        message="Welcome to Resume Parser AI Service",
        service="Resume Parser AI",
        version="1.0.0",
        endpoints={
            "parse": "POST /parse - Parse resume file using MasterParser",
            "parse_text": "POST /parse-text - Parse raw text using MasterParser",
            "parse_batch": "POST /parse-batch - Parse multiple resume files",
            "preview_sections": "POST /preview-sections - Preview sections without DeBERTa (file upload)",
            "benchmark": "POST /benchmark - Benchmark parsing performance",
            "metrics": "GET /metrics - Get parsing metrics and system health",
            "health": "GET /health - Service health check",
            "docs": "GET /docs - API documentation",
            "redoc": "GET /redoc - Alternative documentation"
        }
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    if not master_parser:
        return HealthResponse(
            status="unhealthy",
            version="1.0.0",
            extractor_available=False,
            supported_formats=[]
        )
    
    # Get parser health from master parser
    parser_health = master_parser.get_parser_health()
    overall_healthy = parser_health['overall']['status'] == 'healthy'
    
    # Get supported formats
    try:
        supported_formats = master_parser.get_supported_file_types()
    except Exception:
        supported_formats = []
    
    return HealthResponse(
        status="healthy" if overall_healthy else "degraded",
        version="1.0.0",
        extractor_available=parser_health.get('text_extractor', {}).get('available', False),
        supported_formats=supported_formats
    )

@app.post("/parse", response_model=ParseResponse)
async def parse_resume(request: ParseRequest):
    """
    Parse resume file using MasterParser.
    
    Args:
        request: ParseRequest containing file_path and candidate_id
    
    Returns:
        ParseResponse with comprehensive parsed data from MasterParser
    """
    if not master_parser:
        raise HTTPException(
            status_code=503,
            detail="Parsing service is not available"
        )
    
    start_time = time.time()
    
    try:
        # Validate file exists
        if not os.path.exists(request.file_path):
            parse_metrics['failed_parses'] += 1
            parse_metrics['error_counts']['file_not_found'] += 1
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {request.file_path}"
            )
        
        # Validate file is supported
        supported_formats = master_parser.get_supported_file_types()
        file_ext = os.path.splitext(request.file_path)[1].lower()
        if file_ext not in supported_formats:
            parse_metrics['failed_parses'] += 1
            parse_metrics['error_counts']['unsupported_format'] += 1
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file_ext}. Supported formats: {supported_formats}"
            )
        
        logger.info("=" * 80)
        logger.info(f"📄 PARSE REQUEST RECEIVED")
        logger.info(f"File: {request.file_path}")
        logger.info(f"Candidate ID: {request.candidate_id}")
        logger.info(f"LLM Provider: '{request.llm_provider}' (type: {type(request.llm_provider).__name__})")
        logger.info(f"LLM Provider is truthy: {bool(request.llm_provider)}")
        logger.info(f"LLM Provider == 'gemini-2.0-flash-lite': {request.llm_provider == 'gemini-2.0-flash-lite'}")
        logger.info("=" * 80)
        
        # Parse using MasterParser
        result = master_parser.parse_file(
            request.file_path, 
            request.candidate_id, 
            request.llm_provider, 
            force_ocr=request.force_ocr or False
        )
        
        # TODO: Workaround - domain/license extraction added here as a workaround
        # The master_parser._run_rule_parsing method was not being called in the active code path,
        # so domain and licenses were not being extracted. Root cause not yet identified (2026-07-08).
        # This workaround extracts domain and licenses directly in the endpoint.
        # See master_parser.py lines 1087-1120 for the unreachable domain/license extraction code.
        
        # Add domain and license extraction if not present
        if 'domain' not in result or not result['domain']:
            if master_parser.rule_parser and hasattr(master_parser.rule_parser, 'detect_domain'):
                skills = result.get('skills', [])
                if skills:
                    domain_info = master_parser.rule_parser.detect_domain(skills)
                    result['domain'] = domain_info
                    logger.info(f"Added domain detection: {domain_info['primary_domain']} (confidence: {domain_info['confidence']:.2f})")
        
        if 'licenses' not in result or not result['licenses']:
            if master_parser.rule_parser and hasattr(master_parser.rule_parser, 'extract_licenses'):
                # Extract text from file for license extraction
                try:
                    if master_parser.text_extractor:
                        extraction_result = master_parser.text_extractor.extract(request.file_path)
                        text = extraction_result.get('text', '')
                        if text:
                            licenses = master_parser.rule_parser.extract_licenses(text)
                            result['licenses'] = licenses
                            if licenses:
                                logger.info(f"Added license extraction: {licenses}")
                except Exception as e:
                    logger.warning(f"Failed to extract licenses: {e}")
        
        # Update metrics
        parse_time = (time.time() - start_time) * 1000
        parse_metrics['total_parses'] += 1
        parse_metrics['total_parse_time_ms'] += parse_time
        parse_metrics['successful_parses'] += 1
        
        if result['status'] == 'success':
            confidence_score = result.get('confidence', {}).get('overall', 0.0)
            parse_metrics['total_confidence_score'] += confidence_score
        
        logger.info(f"Successfully parsed resume for candidate: {request.candidate_id} in {parse_time:.1f}ms")
        
        # ── STEP 14: API RESPONSE DEBUG LOGGING ───────────────────────────────────
        logger.info("=" * 80)
        logger.info("STEP 14: API RESPONSE - Final JSON Returned to UI")
        logger.info("=" * 80)
        import json
        logger.info("FINAL JSON RESPONSE:")
        logger.info(json.dumps(result, indent=2, default=str))
        logger.info("=" * 80)
        # ── END STEP 14 ───────────────────────────────────────────────────────────
        
        return ParseResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        parse_metrics['failed_parses'] += 1
        parse_metrics['error_counts']['parsing_error'] += 1
        logger.error(f"Error parsing file {request.file_path}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse file: {str(e)}"
        )

@app.post("/parse-text", response_model=ParseResponse)
async def parse_text_direct(request: ParseTextRequest):
    """
    Parse raw text directly using MasterParser.
    
    Args:
        request: ParseTextRequest containing text and candidate_id
    
    Returns:
        ParseResponse with comprehensive parsed data from MasterParser
    """
    if not master_parser:
        raise HTTPException(
            status_code=503,
            detail="Parsing service is not available"
        )
    
    # Validate text length
    if len(request.text.strip()) < 50:
        parse_metrics['failed_parses'] += 1
        parse_metrics['error_counts']['text_too_short'] += 1
        raise HTTPException(
            status_code=400,
            detail="Resume text too short. Minimum 50 characters required."
        )
    
    start_time = time.time()
    
    try:
        logger.info(f"Parsing text for candidate: {request.candidate_id}")
        
        # Parse using MasterParser
        result = master_parser.parse_text(request.text, request.candidate_id)
        
        # Update metrics
        parse_time = (time.time() - start_time) * 1000
        parse_metrics['total_parses'] += 1
        parse_metrics['total_parse_time_ms'] += parse_time
        parse_metrics['successful_parses'] += 1
        
        if result['status'] == 'success':
            confidence_score = result.get('confidence', {}).get('overall', 0.0)
            parse_metrics['total_confidence_score'] += confidence_score
        
        logger.info(f"Successfully parsed text for candidate: {request.candidate_id} in {parse_time:.1f}ms")
        
        # ── STEP 14: API RESPONSE DEBUG LOGGING ───────────────────────────────────
        logger.info("=" * 80)
        logger.info("STEP 14: API RESPONSE - Final JSON Returned to UI")
        logger.info("=" * 80)
        import json
        logger.info("FINAL JSON RESPONSE:")
        logger.info(json.dumps(result, indent=2, default=str))
        logger.info("=" * 80)
        # ── END STEP 14 ───────────────────────────────────────────────────────────
        
        return ParseResponse(**result)
        
    except Exception as e:
        parse_metrics['failed_parses'] += 1
        parse_metrics['error_counts']['text_parsing_error'] += 1
        logger.error(f"Error parsing text for candidate {request.candidate_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse text: {str(e)}"
        )

@app.post("/parse-batch", response_model=BatchParseResponse)
async def parse_batch(request: BatchParseRequest):
    """
    Parse multiple resume files in batch with controlled concurrency.
    
    Args:
        request: BatchParseRequest containing list of {file_path, candidate_id}
    
    Returns:
        BatchParseResponse with results for all files
    """
    if not master_parser:
        raise HTTPException(
            status_code=503,
            detail="Parsing service is not available"
        )
    
    # Validate batch size
    max_batch = int(os.getenv('PARSE_BATCH_MAX', '100'))
    batch_concurrency = int(os.getenv('PARSE_BATCH_CONCURRENCY', '4'))
    
    if len(request.files) > max_batch:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size too large. Maximum {max_batch} files allowed per batch."
        )
    
    if len(request.files) == 0:
        raise HTTPException(
            status_code=400,
            detail="Batch cannot be empty. Please provide at least one file."
        )
    
    import time
    import asyncio
    
    batch_start = time.time()
    logger.info(f"Starting batch parse of {len(request.files)} files (concurrency={batch_concurrency})")
    
    async def parse_one(file_info: dict) -> dict:
        file_path = file_info.get('file_path')
        candidate_id = file_info.get('candidate_id')
        step_start = time.time()
        
        if not file_path or not candidate_id:
            return {
                'status': 'error',
                'file_path': file_path or 'unknown',
                'candidate_id': candidate_id or 'unknown',
                'error': 'Missing file_path or candidate_id',
                'duration_ms': 0
            }
        
        try:
            # Offload CPU-bound parse to thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,  # default executor
                master_parser.parse_file,
                file_path,
                candidate_id
            )
            result['duration_ms'] = (time.time() - step_start) * 1000
            return result
        except Exception as e:
            return {
                'status': 'error',
                'file_path': file_path,
                'candidate_id': candidate_id,
                'error': str(e),
                'duration_ms': (time.time() - step_start) * 1000
            }
    
    # Process in chunks to control concurrency
    all_results = []
    for i in range(0, len(request.files), batch_concurrency):
        chunk = request.files[i:i + batch_concurrency]
        chunk_results = await asyncio.gather(*[parse_one(f) for f in chunk])
        all_results.extend(chunk_results)
    
    results = []
    errors = []
    successful_parses = 0
    
    for result in all_results:
        if result.get('status') == 'error':
            errors.append({
                'file_path': result.get('file_path', 'unknown'),
                'candidate_id': result.get('candidate_id', 'unknown'),
                'error': result.get('error', 'Unknown parsing error')
            })
            parse_metrics['failed_parses'] += 1
            parse_metrics['error_counts']['batch_file_error'] += 1
            continue
        
        results.append(ParseResponse(**result))
        
        if result['status'] == 'success':
            successful_parses += 1
            parse_metrics['total_parses'] += 1
            parse_metrics['successful_parses'] += 1
            confidence_score = result.get('confidence', {}).get('overall', 0.0)
            parse_metrics['total_confidence_score'] += confidence_score
        else:
            errors.append({
                'file_path': result.get('file_path', 'unknown'),
                'candidate_id': result.get('candidate_id', 'unknown'),
                'error': result.get('error', 'Unknown parsing error')
            })
            parse_metrics['failed_parses'] += 1
            parse_metrics['error_counts']['batch_parse_error'] += 1
    
    failed_parses = len(request.files) - successful_parses
    batch_time_ms = (time.time() - batch_start) * 1000
    
    logger.info(
        f"Batch parse completed in {batch_time_ms:.1f}ms: "
        f"{successful_parses}/{len(request.files)} successful, "
        f"avg per file: {batch_time_ms / max(len(request.files), 1):.1f}ms"
    )
    
    return BatchParseResponse(
        status="completed",
        total_files=len(request.files),
        successful_parses=successful_parses,
        failed_parses=failed_parses,
        results=results,
        errors=errors
    )

@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """
    Get parsing metrics and system health information.
    
    Returns:
        MetricsResponse with comprehensive metrics and health data
    """
    try:
        # Calculate averages
        total_parses = parse_metrics['total_parses']
        avg_parse_time = parse_metrics['total_parse_time_ms'] / total_parses if total_parses > 0 else 0.0
        avg_confidence = parse_metrics['total_confidence_score'] / total_parses if total_parses > 0 else 0.0
        success_rate = parse_metrics['successful_parses'] / total_parses if total_parses > 0 else 0.0
        
        # Get model and device info from AI parser
        if master_parser and hasattr(master_parser, 'ai_parser') and master_parser.ai_parser:
            model_info = master_parser.ai_parser.get_model_info()
            model_name = model_info.get('model_name', 'Unknown')
            model_type = model_info.get('model_type', 'Unknown')
            supported_entities = model_info.get('supported_entities', [])
            device = "GPU" if torch.cuda.is_available() else "CPU"
        else:
            model_name = "Unknown"
            model_type = "Unknown"
            supported_entities = []
            device = "CPU"
        
        # Get parser health
        parser_health = master_parser.get_parser_health() if master_parser else {}
        
        # Get pipeline metrics from last parse
        pipeline_metrics = master_parser.get_pipeline_metrics() if master_parser else {}
        
        return MetricsResponse(
            total_parses_count=total_parses,
            average_parse_time_ms=round(avg_parse_time, 2),
            average_confidence_score=round(avg_confidence, 3),
            successful_parse_rate=round(success_rate, 3),
            model_name=model_name,
            model_type=model_type,
            supported_entities=supported_entities,
            device=device,
            cache_size="Unknown",  # Could be enhanced to check model cache
            parser_health=parser_health,
            error_breakdown=dict(parse_metrics['error_counts'])
        )
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get metrics: {str(e)}"
        )

@app.post("/benchmark", response_model=BenchmarkResponse)
async def benchmark_parsing(request: BenchmarkRequest):
    """
    Benchmark the full parsing pipeline with timing metrics.
    
    Args:
        request: BenchmarkRequest containing text to parse
    
    Returns:
        BenchmarkResponse with timing breakdown and parsed data
    """
    if not master_parser:
        raise HTTPException(
            status_code=503,
            detail="Parsing service is not available"
        )
    
    # Validate text length
    if len(request.text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Resume text too short. Minimum 50 characters required."
        )
    
    try:
        logger.info("Running parsing pipeline benchmark...")
        
        # Parse using MasterParser
        result = master_parser.parse_text(request.text, "benchmark_candidate")
        
        # Get detailed timing metrics
        pipeline_metrics = master_parser.get_pipeline_metrics()
        
        # Convert to expected format
        timing_breakdown = {}
        for step, time_ms in pipeline_metrics.items():
            if step != 'percentages' and step != 'performance_analysis':
                timing_breakdown[step.replace('_ms', '')] = time_ms / 1000  # Convert to seconds
        
        logger.info(f"Benchmark completed in {pipeline_metrics.get('total_ms', 0):.1f}ms")
        
        return BenchmarkResponse(
            status="success",
            processing_time=pipeline_metrics.get('total_ms', 0) / 1000,  # Convert to seconds
            timing_breakdown=timing_breakdown,
            parsed_data=result,
            confidence_scores=result.get('confidence', {})
        )
        
    except Exception as e:
        logger.error(f"Error during benchmark: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Benchmark failed: {str(e)}"
        )

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent error response format."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="HTTP_ERROR",
            message=exc.detail,
            details=f"Status code: {exc.status_code}"
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with consistent error response format."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="INTERNAL_ERROR",
            message="An unexpected error occurred",
            details=str(exc)
        ).dict()
    )

@app.get("/debug/quality-analyzer")
async def debug_quality_analyzer():
    """Debug endpoint to check TextQualityAnalyzer status."""
    if not master_parser:
        return {"error": "MasterParser not initialized"}
    
    return {
        "has_quality_analyzer": hasattr(master_parser, 'quality_analyzer'),
        "quality_analyzer_is_none": master_parser.quality_analyzer is None if hasattr(master_parser, 'quality_analyzer') else True,
        "quality_analyzer_type": str(type(master_parser.quality_analyzer)) if hasattr(master_parser, 'quality_analyzer') and master_parser.quality_analyzer else None
    }

@app.post("/match", response_model=MatchResponse)
async def match_candidate_to_job(request: MatchRequest):
    """
    Match a candidate to a job using the semantic matching engine.
    
    Args:
        request: MatchRequest containing candidate_data and job_data
        
    Returns:
        MatchResponse with detailed scoring and recommendations
    """
    if not MATCHING_ENGINE_AVAILABLE or not matching_engine:
        raise HTTPException(
            status_code=503,
            detail="Matching engine not available"
        )
    
    try:
        logger.info(f"Matching candidate to job")
        
        # Extract candidate and job data
        candidate_data = request.candidate_data
        job_data = request.job_data
        
        # Validate required fields
        if not candidate_data or not job_data:
            raise HTTPException(
                status_code=400,
                detail="Both candidate_data and job_data are required"
            )
        
        # Perform matching using the matching engine
        match_result = matching_engine.calculate_match_score(candidate_data, job_data)
        
        logger.info(f"Matching completed: {match_result['recommendation']} ({match_result['overall_score']})")
        
        return MatchResponse(**match_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in matching: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Matching failed: {str(e)}"
        )

@app.post("/match-batch", response_model=MatchBatchResponse)
async def match_candidates_batch(request: MatchBatchRequest):
    """
    Match a batch of candidates to a job description.
    """
    if not MATCHING_ENGINE_AVAILABLE or not matching_engine:
        raise HTTPException(
            status_code=503,
            detail="Matching engine not available"
        )
    
    try:
        logger.info(f"Matching batch of {len(request.candidates_data)} candidates to job")
        results = matching_engine.calculate_match_score_batch(
            request.candidates_data, request.job_data
        )
        return MatchBatchResponse(results=results)
    except Exception as e:
        logger.error(f"Error in batch matching: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch matching failed: {str(e)}"
        )

@app.post("/parse-sections", response_model=ParseSectionsResponse)
async def parse_sections(request: ParseSectionsRequest):
    """
    Parse extracted sections (experience and education) into structured data using DeBERTa NER model.
    
    Takes raw text from experience and education sections and returns:
    - Structured work experience entries (job title, company, dates, responsibilities)
    - Structured education entries (degree, institution, dates)
    
    This endpoint uses the trained DeBERTa model (31 labels, 97.34% F1 score) for accurate entity extraction.
    This is the second step after /preview-sections.
    """
    import time
    from parsers.deberta_ner_parser import DeBERTaNerParser
    from parsers.experience_extractor import ExperienceExtractor
    from parsers.education_extractor import EducationExtractor
    
    start_time = time.time()
    
    try:
        work_experience = []
        education = []
        skills = []
        summary = None
        certifications = []
        projects = []
        contact = {
            'name': None,
            'email': None,
            'phone': None,
            'linkedin': None,
            'github': None
        }
        
        # ── Helper: clean job title suffix from raw extracted name ─────────────
        def _clean_name(raw: str | None) -> str | None:
            """Strip common job-title suffixes that get concatenated with names."""
            if not raw:
                return None
            raw = raw.strip()
            # Remove anything after a | or newline
            for sep in ['|', '\n', '\r']:
                if sep in raw:
                    raw = raw[:raw.index(sep)].strip()
            # Typical title keywords; anything from here onwards is stripped
            _TITLE_TOKENS = [
                'senior', 'junior', 'lead', 'principal', 'staff', 'associate',
                'engineer', 'developer', 'developer,', 'architect', 'manager',
                'analyst', 'consultant', 'director', 'vp', 'head', 'chief',
                'intern', 'fresher', 'graduate', 'specialist', 'scientist',
            ]
            words = raw.split()
            clean_words = []
            for w in words:
                if w.lower() in _TITLE_TOKENS:
                    break
                clean_words.append(w)
            name_candidate = ' '.join(clean_words).strip(' ,;:')
            # Must be 2+ words and all alphabetic (allow hyphens/apostrophes)
            if name_candidate and len(name_candidate.split()) >= 1:
                # Convert ALL-CAPS names to Title Case
                if name_candidate.isupper() or name_candidate.istitle():
                    name_candidate = name_candidate.title()
                return name_candidate if name_candidate else None
            return None

        # ── Priority 0: Extract name from raw_text header lines ────────────────
        # Most resumes begin with: "Full Name\n" or "FULL NAME  Job Title"
        # This runs before the section-based fallback to get the best signal.
        if not contact.get('name') and request.raw_text:
            try:
                _header = request.raw_text.strip()
                _first_lines = [l.strip() for l in _header.split('\n') if l.strip()][:4]
                for _line in _first_lines:
                    # Skip lines that look like contact info
                    _ll = _line.lower()
                    if any(x in _ll for x in ['@', 'http', 'www', 'phone:', 'email:', 'linkedin', 'github', 'address:', '+1', '+91']):
                        continue
                    if any(c.isdigit() for c in _line):
                        continue
                    _words = _line.split()
                    if len(_words) < 2 or len(_words) > 8:
                        continue
                    # Check first word looks like a proper-noun (title-case or ALL-CAPS)
                    if not (_words[0][0].isupper()):
                        continue
                    _cleaned = _clean_name(_line)
                    if _cleaned and len(_cleaned.split()) >= 2:
                        contact['name'] = _cleaned
                        logger.info(f"Extracted name from raw_text header: {contact['name']}")
                        break
            except Exception as _e:
                logger.warning(f"Header name extraction failed: {_e}")

        # 0. Parse contact details from explicit contact section
        if request.contact_text and request.contact_text.strip():
            try:
                from parsers.rule_parser import RuleBasedParser
                rule_parser = RuleBasedParser()
                contact['email'] = rule_parser.extract_email(request.contact_text)
                contact['phone'] = rule_parser.extract_phone(request.contact_text)
                contact['linkedin'] = rule_parser.extract_linkedin(request.contact_text)
                try:
                    contact['github'] = rule_parser.extract_github(request.contact_text)
                except:
                    pass
                
                # Guess candidate name from first few lines of contact text
                if not contact.get('name'):
                    lines = [l.strip() for l in request.contact_text.split('\n') if l.strip()]
                    for line in lines[:3]:
                        line_lower = line.lower()
                        if (len(line) < 50 and 
                            '@' not in line and 
                            not any(char.isdigit() for char in line) and 
                            not any(label in line_lower for label in ['linkedin', 'github', 'http', 'www', 'address', 'email', 'phone', 'contact'])):
                            _n = _clean_name(line)
                            if _n:
                                contact['name'] = _n
                                break
            except Exception as e:
                logger.warning(f"Failed to extract contact details: {e}")

        # Fallback/enhancement: If name, email, or phone is missing, try to extract them from all available section texts
        # Combine all non-empty sections
        all_texts = []
        for text_field in [request.contact_text, request.summary_text, request.experience_text, 
                           request.education_text, request.skills_text, request.certifications_text, request.projects_text]:
            if text_field and text_field.strip():
                all_texts.append(text_field.strip())
        
        combined_all_text = "\n\n".join(all_texts)
        
        # Also include raw_text for better name extraction (catches header text that may not be in any section)
        raw_text_for_name = request.raw_text or combined_all_text

        # ── Priority: always try raw_text header for email/phone first ─────────
        # The email and phone almost always appear in the document header (first ~5 lines)
        # which may not be part of any extracted section.
        if request.raw_text:
            try:
                from parsers.rule_parser import RuleBasedParser
                _rp = RuleBasedParser()
                # Only search first 500 chars (the header) for email/phone
                _header_text = request.raw_text[:800]
                if not contact.get('email'):
                    contact['email'] = _rp.extract_email(_header_text)
                if not contact.get('phone'):
                    contact['phone'] = _rp.extract_phone(_header_text)
                if not contact.get('linkedin'):
                    contact['linkedin'] = _rp.extract_linkedin(_header_text)
                if not contact.get('github'):
                    try:
                        contact['github'] = _rp.extract_github(_header_text)
                    except:
                        pass
            except Exception as _e:
                logger.warning(f"raw_text header email/phone extraction failed: {_e}")

        if combined_all_text:
            try:
                from parsers.rule_parser import RuleBasedParser
                rule_parser = RuleBasedParser()
                if not contact.get('email'):
                    contact['email'] = rule_parser.extract_email(combined_all_text)
                if not contact.get('phone'):
                    contact['phone'] = rule_parser.extract_phone(combined_all_text)
                if not contact.get('linkedin'):
                    contact['linkedin'] = rule_parser.extract_linkedin(combined_all_text)
                if not contact.get('github'):
                    try:
                        contact['github'] = rule_parser.extract_github(combined_all_text)
                    except:
                        pass
                if not contact.get('name'):
                    # Try raw_text first (full document) then combined sections
                    raw_name = rule_parser.extract_name(raw_text_for_name) or rule_parser.extract_name(combined_all_text)
                    contact['name'] = _clean_name(raw_name)
            except Exception as e:
                logger.warning(f"Failed to extract contact details from combined text fallback: {e}")
        elif raw_text_for_name:
            # Edge case: no section texts but raw_text is available
            try:
                from parsers.rule_parser import RuleBasedParser
                rule_parser = RuleBasedParser()
                if not contact.get('name'):
                    contact['name'] = _clean_name(rule_parser.extract_name(raw_text_for_name))
                if not contact.get('email'):
                    contact['email'] = rule_parser.extract_email(raw_text_for_name)
                if not contact.get('phone'):
                    contact['phone'] = rule_parser.extract_phone(raw_text_for_name)
            except Exception as e:
                logger.warning(f"Failed to extract contact from raw_text: {e}")
        
        # 1. Parse skills
        if request.skills_text and request.skills_text.strip():
            try:
                from parsers.rule_parser import RuleBasedParser
                rule_parser = RuleBasedParser()
                skills = rule_parser.extract_skills(request.skills_text)
            except Exception as e:
                logger.warning(f"Failed to extract skills: {e}")

        # 2. Parse summary
        if request.summary_text and request.summary_text.strip():
            summary = request.summary_text.strip()

        # 3. Parse certifications
        if request.certifications_text and request.certifications_text.strip():
            certifications = [line.strip().lstrip('-*•').strip() for line in request.certifications_text.split('\n') if line.strip()]

        # 4. Parse projects
        if request.projects_text and request.projects_text.strip():
            projects = [p.strip() for p in request.projects_text.split('\n\n') if p.strip()]
        
        # Try to use DeBERTa model first (use cached instance to avoid reload)
        try:
            global _cached_deberta_parser
            deberta_parser = _cached_deberta_parser or DeBERTaNerParser()
            if deberta_parser.is_loaded and deberta_parser.deberta_available:
                logger.info("Using DeBERTa NER model for parsing sections")
                
                # ── FOCUSED SECTION PARSING (per-record, no data loss) ────────────────
                # Pass sections directly — avoids combine→re-split round-trip that
                # caused header_stop_detected to fire after job 1 and silently drop jobs 2-N.
                # parse_focused_sections():
                #   1. Calls _split_experience_into_records()  → one block per Client: header
                #   2. Calls _run_deberta_on_record() × N      → one DeBERTa pass per job
                #   3. Merges positions → experience builder   → N separate experience objects
                # Input keys confirmed: 'work_experience_text', 'education_text'
                # Output structure:  identical to parse_text() — both call _format_results()
                # ──────────────────────────────────────────────────────────────────────
                sections_for_deberta = {
                    'work_experience_text': request.experience_text.strip()
                        if request.experience_text and request.experience_text.strip() else '',
                    'education_text': request.education_text.strip()
                        if request.education_text and request.education_text.strip() else ''
                }

                logger.info("=" * 70)
                logger.info("DEBERTA PIPELINE: parse_focused_sections() — per-record mode")
                logger.info("=" * 70)
                logger.info(f"  work_experience_text : {len(sections_for_deberta['work_experience_text'])} chars")
                logger.info(f"  education_text       : {len(sections_for_deberta['education_text'])} chars")

                # Pre-flight: show how many job records will reach DeBERTa
                if sections_for_deberta['work_experience_text']:
                    try:
                        from parsers.experience_extractor import split_job_blocks
                        _preview_records = split_job_blocks(sections_for_deberta['work_experience_text'])
                        logger.info(f"  Job records found by split_job_blocks : {len(_preview_records)}")
                        for _ri, _rec in enumerate(_preview_records):
                            _first_line = _rec.strip().split('\n')[0][:120] if _rec.strip() else '(empty)'
                            logger.info(f"    Record {_ri + 1}: {_first_line!r}")
                    except Exception as _preview_err:
                        logger.warning(f"  [PREFLIGHT] split_job_blocks preview failed: {_preview_err}")
                logger.info("=" * 70)

                if sections_for_deberta['work_experience_text'] or sections_for_deberta['education_text']:
                    try:
                        # PRIMARY: per-record pipeline — each job gets its own DeBERTa pass
                        parsed_result = deberta_parser.parse_focused_sections(sections_for_deberta)
                        logger.info(
                            f"✅ parse_focused_sections returned "
                            f"{len(parsed_result.get('work_experience', []))} experience(s), "
                            f"{len(parsed_result.get('education', []))} education entry/entries"
                        )
                    except Exception as _pfs_err:
                        # FALLBACK: revert to old single-blob parse_text() if focused path throws
                        logger.error(f"⚠️  parse_focused_sections failed ({_pfs_err}) — falling back to parse_text()")
                        combined_text = ""
                        if sections_for_deberta['work_experience_text']:
                            combined_text += "WORK EXPERIENCE\n" + sections_for_deberta['work_experience_text'] + "\n\n"
                        if sections_for_deberta['education_text']:
                            combined_text += "EDUCATION\n" + sections_for_deberta['education_text']
                        parsed_result = deberta_parser.parse_text(combined_text)
                        logger.info(
                            f"✅ parse_text fallback returned "
                            f"{len(parsed_result.get('work_experience', []))} experience(s)"
                        )
                else:
                    parsed_result = {}

                # Extract work experience and education from DeBERTa results
                if 'work_experience' in parsed_result:
                    work_experience = parsed_result['work_experience']
                if 'education' in parsed_result:
                    education = parsed_result['education']

                logger.info(f"DeBERTa extracted {len(work_experience)} experiences (before validation), {len(education)} education entries")

                # VALIDATION: Filter out invalid companies, roles, and clients
                try:
                    from parsers.entity_validator import get_validator
                    validator = get_validator()

                    # Validate and filter work experiences
                    valid_experiences, rejected_experiences = validator.filter_work_experiences(
                        work_experience,
                        min_confidence=0.6
                    )

                    work_experience = valid_experiences

                    if rejected_experiences:
                        logger.warning(f"🚫 Rejected {len(rejected_experiences)} invalid experiences:")
                        for rej in rejected_experiences:
                            logger.warning(f"   - {rej['experience'].get('job_title')} at {rej['experience'].get('company_name')}: {rej['validation'].get('issues', [])}")

                    logger.info(f"✅ After validation: {len(work_experience)} valid experiences")

                    # Validate and clean education entries
                    valid_education, rejected_education = validator.filter_education_entries(education)
                    education = valid_education

                    if rejected_education:
                        logger.warning(f"🚫 Rejected {len(rejected_education)} invalid education entries")

                    logger.info(f"✅ After validation: {len(education)} valid education entries")

                    # TRIGGER FALLBACK IF NO EXPERIENCES LEFT
                    if len(work_experience) == 0 and request.experience_text and request.experience_text.strip():
                        raise ValueError("DeBERTa validation rejected all experiences - falling back to regex")

                except Exception as e:
                    logger.warning(f"Validation failed: {e}, using unvalidated results or triggering fallback")
                    if "falling back to regex" in str(e):
                        raise e

                # Post-process skills: extract extra skills from job titles/descriptions and raw text
                try:
                    from parsers.rule_parser import RuleBasedParser
                    rule_parser = RuleBasedParser()
                    extra_skills = []
                    for exp in work_experience:
                        title = exp.get('job_title') or exp.get('title')
                        if title:
                            title_skills = rule_parser.extract_skills(title)
                            if title_skills:
                                extra_skills.extend(title_skills)
                        desc = exp.get('description')
                        if desc:
                            desc_skills = rule_parser.extract_skills(desc[:500])
                            if desc_skills:
                                extra_skills.extend(desc_skills)

                    if request.experience_text and request.experience_text.strip():
                        raw_exp_skills = rule_parser.extract_skills(request.experience_text)
                        if raw_exp_skills:
                            extra_skills.extend(raw_exp_skills)

                    if request.projects_text and request.projects_text.strip():
                        raw_proj_skills = rule_parser.extract_skills(request.projects_text)
                        if raw_proj_skills:
                            extra_skills.extend(raw_proj_skills)

                    if request.summary_text and request.summary_text.strip():
                        raw_sum_skills = rule_parser.extract_skills(request.summary_text)
                        if raw_sum_skills:
                            extra_skills.extend(raw_sum_skills)

                    if extra_skills:
                        skills = list(dict.fromkeys(skills + extra_skills))
                except Exception as skill_err:
                    logger.warning(f"Failed to post-process skills from experience in parse-sections: {skill_err}")

                processing_time_ms = (time.time() - start_time) * 1000

                return ParseSectionsResponse(
                    status="success",
                    work_experience=work_experience,
                    education=education,
                    skills=skills,
                    summary=summary,
                    certifications=certifications,
                    projects=projects,
                    contact=contact,
                    processing_time_ms=processing_time_ms,
                    message=f"Successfully parsed with DeBERTa: {len(work_experience)} experience entries, {len(education)} education entries, and {len(skills)} skills"
                )
            else:
                logger.info("DeBERTa model not available, falling back to regex extractors")
        except Exception as e:
            logger.warning(f"DeBERTa parsing failed: {e}, falling back to regex extractors")
        
        # Fallback to regex-based extractors
        logger.info("Using regex-based extractors")
        
        # Parse experience section if provided
        if request.experience_text and request.experience_text.strip():
            logger.info(f"Parsing experience section: {len(request.experience_text)} chars")
            
            exp_text = request.experience_text.strip()
            
            # Helper function to split by job boundaries (company names + locations)
            def chunk_by_jobs(text: str, max_words: int = 400) -> list:
                """
                Split text by job entries (company name + location patterns).
                Each chunk contains 1-2 complete job entries to stay under token limit.
                """
                import re
                
                # Pattern to detect job boundaries: Company Name City, STATE or just company lines
                # Examples: "Visa Foster City,CA", "Dignity Health San Francisco, CA"
                job_boundary_pattern = r'\n(?=[A-Z][A-Za-z\s&]+(?:,\s*[A-Z]{2}|[A-Z][a-z]+,\s*[A-Z]{2})\s*\n)'
                
                # Split by job boundaries
                job_blocks = re.split(job_boundary_pattern, text)
                job_blocks = [block.strip() for block in job_blocks if block.strip()]
                
                logger.info(f"Detected {len(job_blocks)} job blocks")
                
                # Group jobs into chunks of max_words
                chunks = []
                current_chunk = []
                current_word_count = 0
                
                for job_block in job_blocks:
                    job_words = job_block.split()
                    job_word_count = len(job_words)
                    
                    # If this single job exceeds max_words, split it by paragraphs
                    if job_word_count > max_words:
                        # Save current chunk if any
                        if current_chunk:
                            chunks.append('\n\n'.join(current_chunk))
                            current_chunk = []
                            current_word_count = 0
                        
                        # Split large job by paragraphs
                        paragraphs = job_block.split('\n\n')
                        temp_chunk = []
                        temp_count = 0
                        
                        for para in paragraphs:
                            para_count = len(para.split())
                            if temp_count + para_count > max_words and temp_chunk:
                                chunks.append('\n\n'.join(temp_chunk))
                                temp_chunk = [para]
                                temp_count = para_count
                            else:
                                temp_chunk.append(para)
                                temp_count += para_count
                        
                        if temp_chunk:
                            chunks.append('\n\n'.join(temp_chunk))
                    
                    # If adding this job exceeds limit, save current chunk
                    elif current_word_count + job_word_count > max_words and current_chunk:
                        chunks.append('\n\n'.join(current_chunk))
                        current_chunk = [job_block]
                        current_word_count = job_word_count
                    else:
                        current_chunk.append(job_block)
                        current_word_count += job_word_count
                
                # Add remaining jobs
                if current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                
                return chunks
            
            # Check if text needs chunking (>2000 chars)
            if len(exp_text) > 2000:
                logger.info("Long experience text detected, using date-boundary chunking")
                
                # Use split_job_blocks from experience_extractor.py (uses DATE_LINE_PATTERN)
                # This is more reliable than company-location pattern matching
                from parsers.experience_extractor import split_job_blocks as date_split_blocks
                date_blocks = date_split_blocks(exp_text)
                logger.info(f"Detected {len(date_blocks)} job blocks via date boundaries")
                
                if len(date_blocks) <= 1:
                    # Date-based splitting failed - try company-location pattern as fallback
                    fallback_chunks = chunk_by_jobs(exp_text, max_words=400)
                    logger.info(f"Date splitting found {len(date_blocks)} blocks, trying company-location fallback: {len(fallback_chunks)} chunks")
                    chunks = fallback_chunks if len(fallback_chunks) > 1 else [exp_text]
                else:
                    # Group date blocks into word-limit chunks
                    max_words = 400
                    chunks = []
                    current_chunk = []
                    current_count = 0
                    for block in date_blocks:
                        block_words = len(block.split())
                        if current_count + block_words > max_words and current_chunk:
                            chunks.append('\n\n'.join(current_chunk))
                            current_chunk = [block]
                            current_count = block_words
                        else:
                            current_chunk.append(block)
                            current_count += block_words
                    if current_chunk:
                        chunks.append('\n\n'.join(current_chunk))
                
                logger.info(f"Final chunk count: {len(chunks)}")
                
                # Process each chunk sequentially
                all_experiences = []
                exp_extractor = ExperienceExtractor()
                
                for idx, chunk in enumerate(chunks):
                    logger.info(f"Processing chunk {idx+1}/{len(chunks)}: {len(chunk)} chars, ~{len(chunk.split())} words")
                    try:
                        chunk_result = exp_extractor.extract_work_experience(chunk)
                        chunk_experiences = chunk_result.get('work_experience', []) if isinstance(chunk_result, dict) else []
                        all_experiences.extend(chunk_experiences)
                        logger.info(f"Chunk {idx+1} extracted {len(chunk_experiences)} experiences")
                    except Exception as e:
                        logger.error(f"Error processing chunk {idx+1}: {e}")
                        continue
                
                work_experience = all_experiences
                logger.info(f"Total extracted {len(work_experience)} work experience entries from {len(chunks)} chunks")
                
                # Fallback: if chunking returned 0 experiences, try parsing full text directly
                if len(work_experience) == 0:
                    logger.warning("Chunked extraction returned 0 experiences - attempting full-text parse as fallback")
                    try:
                        exp_extractor = ExperienceExtractor()
                        full_result = exp_extractor.extract_work_experience(exp_text)
                        work_experience = full_result.get('work_experience', []) if isinstance(full_result, dict) else []
                        logger.info(f"Full-text fallback extracted {len(work_experience)} experiences")
                    except Exception as e:
                        logger.error(f"Full-text fallback also failed: {e}")
            else:
                # Normal processing for shorter text
                exp_extractor = ExperienceExtractor()
                exp_result = exp_extractor.extract_work_experience(exp_text)
                work_experience = exp_result.get('work_experience', []) if isinstance(exp_result, dict) else []
                logger.info(f"Extracted {len(work_experience)} work experience entries")
        
        # Parse education section if provided
        if request.education_text and request.education_text.strip():
            logger.info(f"Parsing education section: {len(request.education_text)} chars")
            edu_extractor = EducationExtractor()
            edu_result = edu_extractor.extract_education(request.education_text)
            # EducationExtractor returns a list directly, not a dict
            education = edu_result if isinstance(edu_result, list) else []
            logger.info(f"Extracted {len(education)} education entries")
        
        # Post-process skills: extract extra skills from job titles/descriptions and raw text
        try:
            from parsers.rule_parser import RuleBasedParser
            rule_parser = RuleBasedParser()
            extra_skills = []
            for exp in work_experience:
                title = exp.get('job_title') or exp.get('title')
                if title:
                    title_skills = rule_parser.extract_skills(title)
                    if title_skills:
                        extra_skills.extend(title_skills)
                desc = exp.get('description')
                if desc:
                    desc_skills = rule_parser.extract_skills(desc[:500])
                    if desc_skills:
                        extra_skills.extend(desc_skills)
            
            if request.experience_text and request.experience_text.strip():
                raw_exp_skills = rule_parser.extract_skills(request.experience_text)
                if raw_exp_skills:
                    extra_skills.extend(raw_exp_skills)
                    
            if request.projects_text and request.projects_text.strip():
                raw_proj_skills = rule_parser.extract_skills(request.projects_text)
                if raw_proj_skills:
                    extra_skills.extend(raw_proj_skills)
                    
            if request.summary_text and request.summary_text.strip():
                raw_sum_skills = rule_parser.extract_skills(request.summary_text)
                if raw_sum_skills:
                    extra_skills.extend(raw_sum_skills)
                    
            if extra_skills:
                skills = list(dict.fromkeys(skills + extra_skills))
        except Exception as skill_err:
            logger.warning(f"Failed to post-process skills from experience in parse-sections: {skill_err}")

        processing_time_ms = (time.time() - start_time) * 1000
        
        return ParseSectionsResponse(
            status="success",
            work_experience=work_experience,
            education=education,
            skills=skills,
            summary=summary,
            certifications=certifications,
            projects=projects,
            contact=contact,
            processing_time_ms=processing_time_ms,
            message=f"Successfully parsed {len(work_experience)} experience entries, {len(education)} education entries, and {len(skills)} skills"
        )
        
    except Exception as e:
        logger.error(f"Error parsing sections: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse sections: {str(e)}"
        )

@app.post("/preview-sections", response_model=SectionPreviewResponse)
async def preview_sections(file: UploadFile = File(...), force_ocr: bool = Form(False), is_image: bool = Form(False)):
    """
    Preview resume sections without running DeBERTa entity extraction.
    
    This endpoint runs only:
    1. Text extraction (from PDF/DOCX/TXT/IMAGE)
    2. Section splitting (using regex + font metadata)
    3. Section validation (using spaCy NLP)
    
    It does NOT run DeBERTa or entity extraction.
    
    Returns detailed section information for debugging and preview purposes.
    """
    import tempfile
    import shutil
    import time
    from parsers.text_extractor import TextExtractor
    from parsers.section_splitter import SectionSplitter
    from parsers.section_validator import SectionValidator
    
    temp_file_path = None
    start_time = time.time()
    timing = {}
    
    try:
        # Save uploaded file to temporary location
        step_start = time.time()
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name
        timing['file_upload_ms'] = (time.time() - step_start) * 1000
        
        logger.info(f"Processing file for section preview: {file.filename} (force_ocr={force_ocr}, is_image={is_image})")
        
        # STEP 1: Text Extraction (use cached extractor if available)
        step_start = time.time()
        global _cached_text_extractor
        extractor = _cached_text_extractor or TextExtractor()
        file_ext = file.filename.lower().split('.')[-1]
        
        extraction_method = "unknown"
        text = ""
        font_metadata = {}
        baseline_font_size = 11.0
        
        if file_ext == 'pdf':
            result = extractor.extract_from_pdf(temp_file_path, force_ocr=force_ocr)
            extraction_method = result.get('method_used', 'unknown')
            text = result['text']
            
            # Get font metadata
            if not force_ocr:
                try:
                    text, font_metadata = extractor.extract_with_font_metadata(temp_file_path)
                    baseline_font_size = extractor.calculate_baseline_font_size(font_metadata)
                except:
                    pass
        elif file_ext in ['docx', 'doc']:
            text = extractor.extract_from_docx(temp_file_path)
            extraction_method = "python-docx"
        elif file_ext == 'txt':
            text = extractor.extract_from_txt(temp_file_path)
            extraction_method = "direct"
        elif file_ext in ['jpg', 'jpeg', 'png', 'webp']:
            # Image OCR extraction
            result = extractor.extract_from_image(temp_file_path)
            extraction_method = result.get('method_used', 'unknown')
            text = result['text']
            ocr_confidence = result.get('ocr_confidence')
            if ocr_confidence is not None:
                logger.info(f"🖼️  Image OCR completed: {extraction_method}, conf: {ocr_confidence:.1f}%")
            else:
                logger.info(f"🖼️  Image OCR completed: {extraction_method}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
        
        timing['text_extraction_ms'] = (time.time() - step_start) * 1000
        logger.info(f"Text extracted: {len(text)} chars using {extraction_method} in {timing['text_extraction_ms']:.1f}ms")
        
        # STEP 2: Section Splitting (use cached splitter if available)
        step_start = time.time()
        global _cached_section_splitter
        splitter = _cached_section_splitter or SectionSplitter()
        all_sections = splitter.split_sections(text, font_metadata, baseline_font_size)
        timing['section_splitting_ms'] = (time.time() - step_start) * 1000
        logger.info(f"Sections detected: {len(all_sections)} in {timing['section_splitting_ms']:.1f}ms")
        
        # STEP 3: Section Validation (use cached validator if available)
        step_start = time.time()
        validation_metadata = {
            'spacy_available': False,
            'validation_ran': False,
            'sections_corrected': [],
            'sections_split': [],
            'sections_resolved': [],
            'warnings': [],
            'summary': {},
            'validation_ms': 0
        }
        
        try:
            global _cached_section_validator
            validator = _cached_section_validator or SectionValidator()
            corrected_sections, validation_metadata = validator.validate_and_correct(all_sections)
            timing['section_validation_ms'] = (time.time() - step_start) * 1000
            logger.info(f"Sections after validation: {len(corrected_sections)} in {timing['section_validation_ms']:.1f}ms")
        except ImportError as e:
            logger.warning(f"spaCy not available: {e}, skipping validation")
            corrected_sections = all_sections
            validation_metadata['spacy_available'] = False
            validation_metadata['warnings'].append('spaCy not available - validation skipped')
        except Exception as e:
            logger.warning(f"Section validation failed: {e}, using uncorrected sections")
            corrected_sections = all_sections
            validation_metadata['spacy_available'] = True
            validation_metadata['validation_ran'] = False
            validation_metadata['warnings'].append(f'Validation failed: {str(e)}')
        
        # Build response
        step_start = time.time()
        standard_sections = ['summary', 'experience', 'education', 'skills', 'certifications', 'projects', 'contact']
        
        sections_dict = {}
        detected_sections = []
        
        for section_name, section_text in corrected_sections.items():
            sections_dict[section_name] = {
                'text': section_text,
                'char_count': len(section_text)
            }
            
            if section_text.strip():
                detected_sections.append(section_name)
        
        # Find missing standard sections
        missing_sections = [s for s in standard_sections if s not in detected_sections]
        timing['response_build_ms'] = (time.time() - step_start) * 1000
        
        response = SectionPreviewResponse(
            filename=file.filename,
            extraction_method=extraction_method,
            raw_text_length=len(text),
            raw_text=text,
            total_sections=len(corrected_sections),
            sections=sections_dict,
            detected_sections=detected_sections,
            missing_sections=missing_sections,
            validation_metadata=validation_metadata,
            processing_time_ms=(time.time() - start_time) * 1000
        )
        
        logger.info(f"Section preview complete for {file.filename}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error in section preview: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Section preview failed: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except:
                pass

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Application startup event - initialize MasterParser."""
    global master_parser
    
    logger.info("Resume Parser AI Service starting up...")
    logger.info(f"FastAPI version: {app.version}")
    
    try:
        # Load MasterParser (which initializes all sub-parsers)
        logger.info("Loading MasterParser...")
        master_parser = MasterParser()
        logger.info("✅ MasterParser loaded successfully")

        # Pre-load lightweight parsers so each request doesn't re-initialize them
        global _cached_text_extractor, _cached_section_splitter, _cached_section_validator, _cached_deberta_parser
        logger.info("Pre-loading section and extraction parsers...")
        from parsers.text_extractor import TextExtractor
        from parsers.section_splitter import SectionSplitter
        from parsers.section_validator import SectionValidator
        from parsers.deberta_ner_parser import DeBERTaNerParser
        _cached_text_extractor = TextExtractor()
        _cached_section_splitter = SectionSplitter()
        try:
            _cached_section_validator = SectionValidator()
        except Exception as e:
            logger.warning(f"SectionValidator not available: {e}")
            _cached_section_validator = None
        try:
            _cached_deberta_parser = DeBERTaNerParser()
        except Exception as e:
            logger.warning(f"DeBERTaNerParser not available: {e}")
            _cached_deberta_parser = None
        logger.info("✅ Lightweight parsers pre-loaded")
        
        logger.info("🎉 All models loaded — service ready!")
        
        # Log supported file formats
        supported_formats = master_parser.get_supported_file_types()
        logger.info(f"Supported file formats: {supported_formats}")
        
        # Log parser health
        health = master_parser.get_parser_health()
        logger.info(f"Parser health: {health['overall']['status']} ({health['overall']['available_parsers']}/{health['overall']['total_parsers']} parsers available)")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize MasterParser: {e}")
        # Continue with available models
        logger.warning("Service starting with degraded functionality")

@app.post("/extract-skills")
async def extract_skills(request: Request):
    """
    Extract all skills from resume text using 18,300+ skills taxonomy.
    
    Request body:
    {
        "text": "Full resume text here..."
    }
    
    Response:
    {
        "status": "success",
        "total_skills": 25,
        "skills": ["Python", "AWS", "Docker", ...],
        "skills_by_domain": {
            "Programming Languages and Language Internals": ["Python", "Java"],
            "Cloud Computing Platforms": ["AWS", "Azure"],
            ...
        },
        "processing_time_ms": 45.2
    }
    """
    try:
        start_time = time.time()
        
        # Parse request body
        body = await request.json()
        text = body.get('text', '')
        
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text is required")
        
        # Extract skills using rule parser
        if not master_parser:
            raise HTTPException(status_code=503, detail="Parser not initialized")
        
        rule_parser = master_parser.rule_parser
        skills = rule_parser.extract_skills(text)
        
        # Categorize skills by domain
        skills_by_domain = {}
        for skill in skills:
            skill_lower = skill.lower().strip()
            domain = rule_parser.skill_to_domain.get(skill_lower, "Other")
            
            if domain not in skills_by_domain:
                skills_by_domain[domain] = []
            skills_by_domain[domain].append(skill)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        return {
            "status": "success",
            "total_skills": len(skills),
            "skills": skills,
            "skills_by_domain": skills_by_domain,
            "processing_time_ms": processing_time_ms
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting skills: {e}")
        raise HTTPException(status_code=500, detail=f"Skill extraction failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    logger.info("Resume Parser AI Service shutting down...")

# Run the app
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
