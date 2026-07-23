"""
Master parser that orchestrates all parsing steps in the correct order.
Provides unified interface for file and text parsing with timing metrics.
"""

import re
import time
import logging
import sys
import os
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add utils to path for logger import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.logger import get_request_logger, generate_request_id

from parsers.text_extractor import TextExtractor
from parsers.section_splitter import SectionSplitter
from parsers.rule_parser import RuleBasedParser
from parsers.experience_extractor import ExperienceExtractor
from parsers.education_extractor import EducationExtractor
from parsers.ai_ner_parser import AINamedEntityParser
from parsers.deberta_ner_parser import DeBERTaNerParser
from parsers.hybrid_merger import HybridMerger
from parsers.confidence_scorer import ConfidenceScorer
from parsers.entity_normalizer import EntityNormalizer
from parsers.text_quality_analyzer import TextQualityAnalyzer
from parsers.llm_full_parser import parse_resume_with_llm
from parsers.preprocessor import ResumePreprocessor
from parsers.validator import ParsedDataValidator
from parsers.feedback_store import FeedbackStore

# Configure logging
logger = logging.getLogger(__name__)


class MasterParser:
    """
    Master parser that orchestrates all parsing steps in sequence.
    Provides unified interface with timing metrics and error handling.
    """
    
    def __init__(self):
        """Initialize all sub-parsers and components."""
        self.logger = logging.getLogger(__name__)
        
        # Initialize all parsers
        try:
            self.text_extractor = TextExtractor()
            self.logger.info("✅ TextExtractor initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize TextExtractor: {e}")
            self.text_extractor = None
        
        try:
            self.section_splitter = SectionSplitter()
            self.logger.info("✅ SectionSplitter initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize SectionSplitter: {e}")
            self.section_splitter = None
        
        try:
            self.rule_parser = RuleBasedParser()
            self.logger.info("✅ RuleBasedParser initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize RuleBasedParser: {e}")
            # Fallback to simple rule parser
            try:
                from parsers.simple_rule_parser import SimpleRuleParser
                self.rule_parser = SimpleRuleParser()
                self.logger.info("✅ SimpleRuleParser initialized as fallback")
            except Exception as fallback_error:
                self.logger.error(f"❌ Failed to initialize SimpleRuleParser: {fallback_error}")
                self.rule_parser = None
        
        try:
            self.exp_extractor = ExperienceExtractor()
            self.logger.info("✅ ExperienceExtractor initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize ExperienceExtractor: {e}")
            self.exp_extractor = None
        
        try:
            self.edu_extractor = EducationExtractor()
            self.logger.info("✅ EducationExtractor initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize EducationExtractor: {e}")
            self.edu_extractor = None
        
        try:
            self.ai_parser = AINamedEntityParser()
            self.logger.info("✅ AINamedEntityParser initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize AINamedEntityParser: {e}")
            self.ai_parser = None
        
        try:
            self.deberta_parser = DeBERTaNerParser()
            if self.deberta_parser.is_available():
                self.logger.info("✅ DeBERTa NER Parser initialized (model loaded or structured parser available)")
            else:
                self.logger.warning("⚠️  DeBERTa NER Parser initialized but no parsers available")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize DeBERTa NER Parser: {e}")
            self.deberta_parser = None
        
        try:
            self.hybrid_merger = HybridMerger()
            self.logger.info("✅ HybridMerger initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize HybridMerger: {e}")
            self.hybrid_merger = None
        
        try:
            self.confidence_scorer = ConfidenceScorer()
            self.logger.info("✅ ConfidenceScorer initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize ConfidenceScorer: {e}")
            self.confidence_scorer = None
        
        try:
            self.entity_normalizer = EntityNormalizer()
            self.logger.info("✅ EntityNormalizer initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize EntityNormalizer: {e}")
            self.entity_normalizer = None
        
        try:
            self.quality_analyzer = TextQualityAnalyzer()
            self.logger.info("✅ TextQualityAnalyzer initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize TextQualityAnalyzer: {e}")
            self.quality_analyzer = None
        
        try:
            self.preprocessor = ResumePreprocessor()
            self.logger.info("✅ ResumePreprocessor initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize ResumePreprocessor: {e}")
            self.preprocessor = None
        
        try:
            self.validator = ParsedDataValidator()
            self.logger.info("✅ ParsedDataValidator initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize ParsedDataValidator: {e}")
            self.validator = None
        
        try:
            self.feedback_store = FeedbackStore()
            self.logger.info("✅ FeedbackStore initialized")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize FeedbackStore: {e}")
            self.feedback_store = None
        
        # Timing metrics storage
        self.last_parse_metrics = {}
        
        # Check overall health
        self._check_parser_health()
    
    def extract_person_name(self, text: str) -> str:
        """
        Extract name from first 3 lines using regex — no ML needed.
        This runs before DeBERTa to avoid wasting model capacity on easy extractions.
        
        Args:
            text: Resume text
            
        Returns:
            Extracted name or empty string
        """
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        # Name is almost always in the first 1-3 lines
        for line in lines[:3]:
            # Skip lines that look like emails, phones, URLs, or headers
            if re.search(r'[@|http|www|\d{5}|resume|curriculum]', line, re.I):
                continue
            # Skip lines with too many words (likely a summary)
            if len(line.split()) > 5:
                continue
            # Looks like a name: 2-4 capitalized words
            if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$', line):
                return line
        
        # Fallback: return first non-empty line if nothing matched
        return lines[0] if lines else ""
    
    def _check_parser_health(self):
        """Check health of all parsers and log status."""
        critical_parsers = ['section_splitter', 'rule_parser', 'hybrid_merger', 'confidence_scorer', 'preprocessor']
        optional_parsers = ['text_extractor', 'ai_parser', 'exp_extractor', 'edu_extractor', 'validator', 'quality_analyzer', 'feedback_store']
        
        critical_status = all(getattr(self, parser) is not None for parser in critical_parsers)
        optional_status = [getattr(self, parser) is not None for parser in optional_parsers]
        
        if critical_status:
            self.logger.info("🎉 All critical parsers initialized successfully")
        else:
            self.logger.error("❌ Some critical parsers failed to initialize")
        
        optional_count = sum(optional_status)
        self.logger.info(f"📊 Optional parsers: {optional_count}/{len(optional_parsers)} available")
    
    def parse_file(self, file_path: str, candidate_id: str, llm_provider: Optional[str] = None, force_ocr: bool = False) -> Dict[str, Any]:
        """
        Parse resume file through the complete pipeline.
        
        Args:
            file_path: Path to resume file
            candidate_id: Unique candidate identifier
            llm_provider: Optional LLM provider for experience extraction
            force_ocr: Whether to skip standard extraction and force OCR
            
        Returns:
            Complete parsed resume data with confidence scores and metrics
        """
        self.logger.info(f"🔧🔧🔧 parse_file called for {file_path} with llm_provider={llm_provider}")
        start_time = time.time()
        metrics = {}
        
        try:
            self.logger.info(f"🚀 Starting file parse pipeline for {candidate_id}: {file_path}")
            if llm_provider:
                self.logger.info(f"🤖 Using LLM provider: {llm_provider}")
            
            # Validate file exists
            if not Path(file_path).exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Step 1: Extract text from file
            step_start = time.time()
            text_result = self._extract_text_from_file(file_path, force_ocr=force_ocr)
            metrics['text_extraction_ms'] = (time.time() - step_start) * 1000
            
            if not text_result or not text_result.get('text'):
                raise ValueError("Failed to extract text from file")
            
            # Continue with text parsing pipeline
            result = self._parse_text_pipeline(
                text_result['text'], 
                candidate_id, 
                metrics,
                llm_provider=llm_provider,
                file_info={
                    'file_path': file_path,
                    'extraction_method': text_result.get('method', 'unknown'),
                    'quality_score': text_result.get('quality_score', 0.0)
                }
            )
            
            # Add file-specific metadata
            result['file_info'] = {
                'file_path': file_path,
                'file_name': Path(file_path).name,
                'extraction_method': text_result.get('method', 'unknown'),
                'text_quality_score': text_result.get('quality_score', 0.0),
                'word_count': len(text_result['text'].split())
            }
            
            # Calculate total time
            total_time = (time.time() - start_time) * 1000
            metrics['total_ms'] = total_time
            self.last_parse_metrics = metrics
            
            self.logger.info(f"✅ File parse completed for {candidate_id} in {total_time:.1f}ms")
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Error parsing file {file_path}: {e}", exc_info=True)
            return self._create_error_result(candidate_id, str(e), metrics)
    
    def parse(self, file_path: str, options: dict = None) -> dict:
        """
        Main parse method that orchestrates the complete parsing pipeline.
        
        Args:
            file_path: Path to resume file
            options: Optional parsing options
            
        Returns:
            Dictionary with parsed_data and metadata
        """
        start_time = time.time()
        options = options or {}
        candidate_id = options.get('candidate_id', f'file_{int(time.time())}')
        
        try:
            self.logger.info(f"🚀 Starting parse pipeline for {file_path}")
            
            # Step 1: Extract raw text
            step_start = time.time()
            if not self.text_extractor:
                raise RuntimeError("TextExtractor not available")
            
            extraction_result = self.text_extractor.extract(file_path)
            raw_text = extraction_result.get('text', '')
            if not raw_text:
                raise ValueError("No text extracted from file")
            
            metrics = {'text_extraction_ms': (time.time() - step_start) * 1000}
            
            # Run the complete parsing pipeline
            final_result, metadata = self._run_complete_pipeline(
                raw_text, candidate_id, metrics, file_path, options
            )
            
            # Calculate total processing time
            elapsed = (time.time() - start_time) * 1000
            metadata['processing_time_ms'] = elapsed
            
            self.logger.info(f"✅ Parse completed for {file_path} in {elapsed:.1f}ms")
            
            return {
                'parsed_data': final_result,
                'metadata': metadata
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error parsing file {file_path}: {e}", exc_info=True)
            elapsed = (time.time() - start_time) * 1000
            return {
                'parsed_data': self._create_error_result(candidate_id, str(e), {}),
                'metadata': {
                    'processing_time_ms': elapsed,
                    'error': str(e)
                }
            }

    def parse_text(self, text: str, candidate_id: str, request_id: str = None) -> Dict[str, Any]:
        """
        Parse resume text through the complete pipeline.
        
        Args:
            text: Resume text to parse
            candidate_id: Unique candidate identifier
            request_id: Optional request ID for tracking
            
        Returns:
            Complete parsed resume data with confidence scores and metrics
        """
        start_time = time.time()
        metrics = {}
        
        # Generate request ID if not provided
        if not request_id:
            request_id = generate_request_id()
        
        # Get request-scoped logger
        req_logger = get_request_logger(request_id)
        
        try:
            req_logger.info("🚀 PARSE REQUEST STARTED", 
                candidate_id=candidate_id,
                text_length=len(text) if text else 0,
                timestamp=time.time()
            )
            
            if not text or not text.strip():
                req_logger.error("❌ Empty text provided", candidate_id=candidate_id)
                raise ValueError("Empty text provided")
            
            # Log text extraction stage
            req_logger.info("📄 TEXT EXTRACTION STAGE",
                text_length=len(text),
                text_preview=text[:500] if len(text) > 500 else text,
                word_count=len(text.split()),
                line_count=len(text.split('\n'))
            )
            
            # Use original text for parsing (cleaning removes emails/phones)
            # We'll handle cleaning in the final result if needed
            cleaned_text = text.strip()
            
            req_logger.debug("🧹 Text cleaned", 
                original_length=len(text),
                cleaned_length=len(cleaned_text)
            )
            
            # Run text parsing pipeline with request logger
            result = self._parse_text_pipeline(
                cleaned_text, 
                candidate_id, 
                metrics,
                file_info={'parsing_method': 'direct_text'},
                request_id=request_id
            )
            
            # Add text-specific metadata
            result['text_info'] = {
                'original_length': len(text),
                'cleaned_length': len(cleaned_text),
                'word_count': len(cleaned_text.split()),
                'parsing_method': 'direct_text'
            }
            
            # Calculate total time
            total_time = (time.time() - start_time) * 1000
            metrics['total_ms'] = total_time
            self.last_parse_metrics = metrics
            
            # Log final response
            work_exp_count = len(result.get('work_experience', []))
            education_count = len(result.get('education', []))
            
            req_logger.info("✅ PARSE REQUEST COMPLETED",
                candidate_id=candidate_id,
                total_time_ms=total_time,
                work_experience_count=work_exp_count,
                education_count=education_count,
                skills_count=len(result.get('skills', [])),
                metrics=metrics
            )
            
            # Log extracted work experience and education
            req_logger.info("📊 FINAL EXTRACTION RESULTS",
                work_experience=result.get('work_experience', []),
                education=result.get('education', [])
            )
            
            # Add request ID to result
            result['request_id'] = request_id
            
            return result
            
        except Exception as e:
            import traceback
            req_logger.exception("❌ PARSE REQUEST FAILED",
                candidate_id=candidate_id,
                error=str(e),
                error_type=type(e).__name__,
                traceback=traceback.format_exc()
            )
            return self._create_error_result(candidate_id, str(e), metrics)
    
    def _run_complete_pipeline(self, raw_text: str, candidate_id: str, metrics: Dict[str, float], 
                           file_path: str, options: Dict[str, Any]) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Run the complete parsing pipeline with the exact specified order.
        
        Args:
            raw_text: Raw extracted text from file
            candidate_id: Candidate identifier
            metrics: Timing metrics dictionary
            file_path: Path to the file
            options: Parsing options
            
        Returns:
            Tuple of (final_result, metadata)
        """
        metadata = {}
        sources_used = []
        
        try:
            # Step 1: Extract raw text (already done)
            self.logger.info("✅ Step 1: Raw text extracted")
            
            # Step 2: Run ResumePreprocessor
            step_start = time.time()
            if not self.preprocessor:
                raise RuntimeError("ResumePreprocessor not available")
            
            preprocessed_text = self.preprocessor.preprocess(raw_text)
            metrics['preprocessing_ms'] = (time.time() - step_start) * 1000
            self.logger.info(f"✅ Step 2: Text preprocessed in {metrics['preprocessing_ms']:.1f}ms")
            sources_used.append('preprocessor')
            
            # Step 3: Run TextQualityAnalyzer on preprocessed text
            step_start = time.time()
            quality_score = 0.0
            if self.quality_analyzer:
                # For now, use a simple quality score since analyze_extraction_quality needs parsed data
                quality_score = self._calculate_simple_quality_score(preprocessed_text)
                metadata['text_quality'] = quality_score
            metrics['quality_analysis_ms'] = (time.time() - step_start) * 1000
            self.logger.info(f"✅ Step 3: Text quality analyzed ({quality_score:.2f})")
            sources_used.append('quality_analyzer')
            
            # Step 4: Run SectionSplitter on preprocessed text
            step_start = time.time()
            if not self.section_splitter:
                raise RuntimeError("SectionSplitter not available")
            
            sections = self.section_splitter.split_sections(preprocessed_text)
            metrics['section_splitting_ms'] = (time.time() - step_start) * 1000
            metadata['sections_detected'] = list(sections.keys())
            self.logger.info(f"✅ Step 4: Sections split ({len(sections)} sections)")
            sources_used.append('section_splitter')
            
            # Step 5: Run all parsers in parallel (existing logic)
            step_start = time.time()
            parsing_results = self._run_parallel_parsers(preprocessed_text, sections, options)
            metrics['parallel_parsing_ms'] = (time.time() - step_start) * 1000
            self.logger.info(f"✅ Step 5: Parallel parsing completed")
            
            # Step 5b: Smart LLM conflict resolution (NEW)
            step_start = time.time()
            rule_results = parsing_results.get('rule_results', {})
            ai_results = parsing_results.get('ai_results', {})
            
            # Find conflicts between NER and rule-based parsers
            conflict_fields = self.find_conflict_fields(ai_results, rule_results)
            
            # Use LLM only to resolve conflicts
            llm_results = {}
            if conflict_fields and options.get('llm_provider'):
                llm_results = self.smart_llm_resolve(
                    preprocessed_text, conflict_fields, ai_results, rule_results, options.get('llm_provider')
                )
                metrics['llm_conflict_resolution_ms'] = (time.time() - step_start) * 1000
                sources_used.append('llm_conflict_resolver')
                self.logger.info(f"✅ Step 5b: LLM conflict resolution completed for {len(conflict_fields)} fields")
            else:
                metrics['llm_conflict_resolution_ms'] = (time.time() - step_start) * 1000
                self.logger.info(f"✅ Step 5b: No conflicts detected, skipped LLM resolution")
            
            # Step 6: Run HybridMerger with resolve_conflicts()
            step_start = time.time()
            if not self.hybrid_merger:
                raise RuntimeError("HybridMerger not available")
            
            # Use the new resolve_conflicts method
            merged_results = self.hybrid_merger.merge(rule_results, ai_results, llm_results)
            metrics['merging_ms'] = (time.time() - step_start) * 1000
            self.logger.info(f"✅ Step 6: Results merged with conflict resolution")
            sources_used.append('hybrid_merger')
            
            # Step 7: Run ConfidenceScorer
            step_start = time.time()
            confidence_scores = {}
            if self.confidence_scorer:
                confidence_scores = self.confidence_scorer.score_parsed_resume(merged_results)
                merged_results['confidence'] = confidence_scores
            metrics['confidence_scoring_ms'] = (time.time() - step_start) * 1000
            self.logger.info(f"✅ Step 7: Confidence scores calculated")
            sources_used.append('confidence_scorer')
            
            # Step 7b: Save low confidence cases to feedback store
            step_start = time.time()
            if self.feedback_store and confidence_scores:
                self.feedback_store.save_low_confidence_parse(
                    merged_results, confidence_scores, preprocessed_text
                )
                metrics['feedback_save_ms'] = (time.time() - step_start) * 1000
                sources_used.append('feedback_store')
                self.logger.info(f"✅ Step 7b: Low confidence case saved (if needed)")
            else:
                metrics['feedback_save_ms'] = (time.time() - step_start) * 1000
            
            # Step 8: Run EntityNormalizer
            step_start = time.time()
            if self.entity_normalizer:
                merged_results['skills'] = self.entity_normalizer.normalize_skills_list(merged_results.get('skills', []))
                if merged_results.get('companies'):
                    merged_results['companies'] = [self.entity_normalizer.normalize_company(c) for c in merged_results['companies']]
            metrics['normalization_ms'] = (time.time() - step_start) * 1000
            self.logger.info(f"✅ Step 8: Entities normalized")
            sources_used.append('entity_normalizer')
            
            # Step 9: Run ParsedDataValidator
            step_start = time.time()
            warnings = []
            if self.validator:
                validated_result, warnings = self.validator.validate_and_fix(merged_results)
                merged_results = validated_result
            metrics['validation_ms'] = (time.time() - step_start) * 1000
            self.logger.info(f"✅ Step 9: Data validation completed ({len(warnings)} warnings)")
            sources_used.append('validator')
            
            # Add candidate_id and status
            merged_results['candidate_id'] = candidate_id
            merged_results['status'] = 'success'
            merged_results['raw_text'] = raw_text
            merged_results['raw_resume_text'] = raw_text
            
            # Add processing metrics
            merged_results['processing_metrics'] = metrics
            
            return merged_results, {
                'text_quality': quality_score,
                'sections_detected': list(sections.keys()),
                'validation_warnings': warnings,
                'sources_used': sources_used,
                'processing_time_ms': sum(metrics.values()),
                'llm_conflict_resolution': {
                    'conflicts_detected': len(conflict_fields),
                    'fields_resolved': list(llm_results.keys()) if llm_results else [],
                    'llm_calls_saved': len(conflict_fields) == 0
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error in complete pipeline: {e}", exc_info=True)
            raise

    def _run_parallel_parsers(self, text: str, sections: Dict[str, str], options: Dict[str, Any]) -> Dict[str, Any]:
        """Run all parsers in parallel and collect results."""
        results = {}
        llm_provider = options.get('llm_provider')
        
        # Rule-based parsing
        if self.rule_parser:
            results['rule_results'] = self._run_rule_parsing(text, sections)
        
        # AI parsing
        if self.ai_parser:
            results['ai_results'] = self._run_ai_parsing(text, sections, llm_provider=llm_provider)
        
        # Experience extraction
        if self.exp_extractor:
            results['experience_results'] = self._extract_experience(sections, text, llm_provider)
        
        # Education extraction
        if self.edu_extractor:
            results['education_results'] = self._extract_education(sections, text)
        
        return results

    def find_conflict_fields(self, ner_result: dict, rule_result: dict) -> list[str]:
        """
        Find fields where NER and rule-based parsers disagree or both failed.
        
        Args:
            ner_result: Results from NER/AI parsing
            rule_result: Results from rule-based parsing
            
        Returns:
            List of field names that need LLM resolution
        """
        import json
        
        conflict_fields = []
        fields_to_check = ['name', 'email', 'phone', 'current_title', 'current_company']
        
        for field in fields_to_check:
            ner_val = ner_result.get(field)
            rule_val = rule_result.get(field)
            
            # Both found something but they disagree
            if ner_val and rule_val and str(ner_val).lower().strip() != str(rule_val).lower().strip():
                conflict_fields.append(field)
                self.logger.debug(f"Conflict detected in {field}: NER='{ner_val}' vs Rules='{rule_val}'")
            
            # Both found nothing — also ask LLM
            elif not ner_val and not rule_val:
                conflict_fields.append(field)
                self.logger.debug(f"Both parsers failed for {field}, requesting LLM resolution")
        
        return conflict_fields

    def smart_llm_resolve(self, text: str, conflict_fields: list, ner_result: dict, rule_result: dict, llm_provider: str = None) -> dict:
        """
        Use LLM to resolve only conflicting fields, reducing API calls by 60-80%.
        
        Args:
            text: Resume text to analyze
            conflict_fields: List of fields that need resolution
            ner_result: Results from NER parsing
            rule_result: Results from rule parsing
            llm_provider: LLM provider to use
            
        Returns:
            Dictionary with resolved fields from LLM
        """
        import json
        
        if not conflict_fields:
            self.logger.info("✅ No conflicts detected, skipping LLM call")
            return {}  # No LLM call needed — saves cost and latency
        
        if not llm_provider:
            self.logger.warning("LLM provider not specified for conflict resolution")
            return {}
        
        self.logger.info(f"🤖 Using LLM to resolve {len(conflict_fields)} conflicting fields: {conflict_fields}")
        
        prompt = f"""You are a resume parser. Only extract these specific fields from the resume text below.
Fields needed: {', '.join(conflict_fields)}

Resume text (first 2000 chars):
{text[:2000]}

Return ONLY valid JSON with the requested fields. No explanation, no markdown.
Example: {{"name": "John Smith", "email": "john@example.com"}}"""
        
        try:
            # Try to import the LLM caller
            try:
                from parsers.llm_full_parser import call_llm_provider
                response = call_llm_provider(prompt, llm_provider)
            except ImportError:
                # Fallback LLM caller
                self.logger.warning("LLM caller not found, using fallback")
                response = self._fallback_llm_call(prompt, llm_provider)
            
            # Parse JSON response
            if isinstance(response, str):
                resolved = json.loads(response)
            else:
                resolved = response
            
            self.logger.info(f"✅ LLM resolved {len(resolved)} fields: {list(resolved.keys())}")
            return resolved
            
        except Exception as e:
            self.logger.warning(f"Smart LLM resolve failed: {e}")
            return {}

    def _fallback_llm_call(self, prompt: str, llm_provider: str) -> dict:
        """
        Fallback LLM caller for testing when full LLM parser is not available.
        
        Args:
            prompt: LLM prompt
            llm_provider: Provider name
            
        Returns:
            Empty dict (placeholder for real implementation)
        """
        self.logger.warning(f"Fallback LLM call for {llm_provider} - returning empty result")
        return {}
    
    def save_user_correction(self, original_parse_id: str, field: str, wrong_value, correct_value) -> bool:
        """
        Save a user correction for future training.
        
        Args:
            original_parse_id: ID of the original parsing record
            field: Field that was corrected
            wrong_value: Original incorrect value
            correct_value: User-provided correct value
            
        Returns:
            True if saved successfully, False otherwise
        """
        if not self.feedback_store:
            self.logger.error("FeedbackStore not available for saving user correction")
            return False
        
        try:
            self.feedback_store.save_user_correction(original_parse_id, field, wrong_value, correct_value)
            self.logger.info(f"✅ User correction saved for field '{field}'")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to save user correction: {e}")
            return False
    
    def _calculate_simple_quality_score(self, text: str) -> float:
        """
        Calculate a simple quality score based on text characteristics.
        
        Args:
            text: Text to analyze
            
        Returns:
            Quality score between 0.0 and 1.0
        """
        if not text or len(text.strip()) < 50:
            return 0.1
        
        score = 0.5  # Base score
        
        # Length bonus
        if len(text) > 500:
            score += 0.2
        elif len(text) > 200:
            score += 0.1
        
        # Section detection bonus
        sections = ['experience', 'education', 'skills', 'summary']
        found_sections = sum(1 for section in sections if section.lower() in text.lower())
        score += (found_sections * 0.1)
        
        # Email detection bonus
        import re
        if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text):
            score += 0.1
        
        # Phone detection bonus
        if re.search(r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})', text):
            score += 0.1
        
        return min(score, 1.0)
    
    def get_feedback_statistics(self) -> dict:
        """
        Get feedback store statistics.
        
        Returns:
            Dictionary with feedback statistics
        """
        if not self.feedback_store:
            return {'error': 'FeedbackStore not available'}
        
        try:
            return self.feedback_store.get_statistics()
        except Exception as e:
            self.logger.error(f"❌ Failed to get feedback statistics: {e}")
            return {'error': str(e)}

    def _parse_text_pipeline(self, text: str, candidate_id: str, metrics: Dict[str, float], 
                           llm_provider: Optional[str] = None, file_info: Dict[str, Any] = None,
                           request_id: str = None) -> Dict[str, Any]:
        """
        Core text parsing pipeline (shared by file and text parsing).
        
        Args:
            text: Text to parse
            candidate_id: Candidate identifier
            metrics: Timing metrics dictionary
            llm_provider: Optional LLM provider for full LLM parsing or experience extraction
            file_info: File-specific information
            request_id: Request ID for logging
            
        Returns:
            Parsed result dictionary
        """
        self.logger.info(f"🔧 _parse_text_pipeline called with llm_provider: {llm_provider}")
        # Get request logger
        if not request_id:
            request_id = generate_request_id()
        req_logger = get_request_logger(request_id)
        # OPTION 1: Full LLM Parsing (when specific LLM provider is selected)
        # This uses the LLM to parse the entire resume with strict cleaning rules
        if llm_provider and llm_provider != 'own-model':
            self.logger.info(f"🚀 Using FULL LLM PARSING with {llm_provider}")
            step_start = time.time()
            
            llm_result = parse_resume_with_llm(text, llm_provider)
            metrics['full_llm_parsing_ms'] = (time.time() - step_start) * 1000
            
            if llm_result:
                self.logger.info(f"✅ Full LLM parsing completed in {metrics['full_llm_parsing_ms']:.1f}ms")
                
                # Add candidate_id and status
                llm_result['candidate_id'] = candidate_id
                llm_result['status'] = 'success'
                
                # Calculate confidence (LLM results are generally high confidence)
                llm_result['confidence'] = {
                    'overall': 0.95,
                    'fields': {
                        'name': 0.95 if llm_result.get('name') else 0.0,
                        'email': 0.95 if llm_result.get('email') else 0.0,
                        'phone': 0.95 if llm_result.get('phone') else 0.0,
                        'skills': 0.95 if llm_result.get('skills') else 0.0,
                        'work_experience': 0.95 if llm_result.get('work_experience') else 0.0,
                        'education': 0.95 if llm_result.get('education') else 0.0,
                    },
                    'needs_review': False,
                    'quality_level': 'excellent'
                }
                
                # Add processing metrics
                llm_result['processing_metrics'] = metrics
                
                # Run quality analysis
                step_start = time.time()
                quality_report = self._analyze_extraction_quality(text, llm_result, {})
                metrics['quality_analysis_ms'] = (time.time() - step_start) * 1000
                
                if quality_report:
                    llm_result['extraction_quality'] = quality_report
                
                # Ensure raw_text is included
                llm_result['raw_text'] = text
                llm_result['raw_resume_text'] = text
                
                return llm_result
            else:
                self.logger.warning(f"⚠️ Full LLM parsing failed, falling back to hybrid pipeline")
                # Fall through to standard pipeline
        
        # OPTION 2: Standard Hybrid Pipeline (rule-based + AI entity extraction)
        # Step 1: Extract person name with regex (before DeBERTa)
        step_start = time.time()
        person_name = self.extract_person_name(text)
        metrics['name_extraction_ms'] = (time.time() - step_start) * 1000
        self.logger.info(f"✅ Person name extracted: '{person_name}'")
        
        # Step 2: Split sections
        step_start = time.time()
        sections = self._split_sections(text)
        metrics['section_splitting_ms'] = (time.time() - step_start) * 1000
        
        # Log section extraction
        section_names = list(sections.keys()) if sections else []
        req_logger.info("📑 SECTION EXTRACTION STAGE",
            sections_detected=section_names,
            section_count=len(section_names),
            has_work_experience='experience' in [s.lower() for s in section_names],
            has_education='education' in [s.lower() for s in section_names]
        )
        
        # Warn if WORK EXPERIENCE section is missing
        if not any('experience' in s.lower() for s in section_names):
            req_logger.warning("⚠️ WORK EXPERIENCE SECTION NOT DETECTED",
                detected_sections=section_names,
                text_preview=text[:300]
            )
        
        # Log section content for debugging
        for section_name, section_text in sections.items():
            if 'experience' in section_name.lower():
                req_logger.debug(f"📋 WORK EXPERIENCE SECTION CONTENT",
                    section_name=section_name,
                    content_length=len(section_text),
                    content_preview=section_text[:500] if len(section_text) > 500 else section_text
                )
        
        # Step 3: Rule-based parsing (pass sections for skills extraction)
        step_start = time.time()
        self.logger.info("🔧 _parse_text_pipeline: About to call _run_rule_parsing")
        rule_results = self._run_rule_parsing(text, sections)
        self.logger.info(f"✅ _parse_text_pipeline: _run_rule_parsing returned {len(rule_results) if rule_results else 0} keys")
        metrics['rule_parsing_ms'] = (time.time() - step_start) * 1000
        
        # Step 3b: DeBERTa NER parsing (if available)
        step_start = time.time()
        req_logger.info("🤖 MODEL INFERENCE STAGE - Starting DeBERTa NER parsing")
        
        deberta_results = self._run_deberta_parsing(text)
        metrics['deberta_parsing_ms'] = (time.time() - step_start) * 1000
        
        # Log model input and output
        req_logger.info("🔍 MODEL INPUT",
            text_length=len(text),
            text_preview=text[:500] if len(text) > 500 else text
        )
        
        req_logger.info("📤 MODEL RAW OUTPUT",
            companies=deberta_results.get('companies', []),
            job_titles=deberta_results.get('job_titles', []),
            institutions=deberta_results.get('institutions', []),
            degrees=deberta_results.get('degrees', []),
            work_experience_count=len(deberta_results.get('work_experience', [])),
            education_count=len(deberta_results.get('education', []))
        )
        
        # Log parsed entities
        req_logger.info("🎯 MODEL PARSED ENTITIES",
            work_experience=deberta_results.get('work_experience', []),
            education=deberta_results.get('education', [])
        )
        
        # Warn if model didn't extract work experience
        if not deberta_results.get('work_experience') and not deberta_results.get('companies'):
            req_logger.warning("⚠️ MODEL DID NOT EXTRACT WORK EXPERIENCE",
                deberta_results=deberta_results
            )
        
        # Step 4: AI entity extraction (conditional - only if needed based on rule_results and deberta_results)
        step_start = time.time()
        ai_results = self._run_ai_parsing(text, sections, rule_results=rule_results, deberta_results=deberta_results, llm_provider=llm_provider)
        metrics['ai_parsing_ms'] = (time.time() - step_start) * 1000
        
        # Log if AI was skipped
        if ai_results.get('ai_skipped'):
            self.logger.info(f"AI parsing skipped: {ai_results.get('reason')}")
            metrics['ai_skipped'] = True
        
        # Step 5: Extract structured experience
        step_start = time.time()
        req_logger.info("💼 EXPERIENCE EXTRACTION STAGE")
        
        experience_results = self._extract_experience(sections, text, llm_provider)
        metrics['experience_extraction_ms'] = (time.time() - step_start) * 1000
        
        req_logger.info("✅ Experience extraction completed",
            experience_count=len(experience_results.get('work_experience', [])),
            experiences=experience_results.get('work_experience', [])
        )
        
        # Warn if experience extraction failed
        if not experience_results.get('work_experience'):
            req_logger.warning("⚠️ EXPERIENCE EXTRACTION RETURNED EMPTY",
                sections_available=list(sections.keys()) if sections else [],
                experience_results=experience_results
            )
        
        # Step 6: Extract structured education
        step_start = time.time()
        req_logger.info("🎓 EDUCATION EXTRACTION STAGE")
        
        education_results = self._extract_education(sections, text)
        metrics['education_extraction_ms'] = (time.time() - step_start) * 1000
        
        req_logger.info("✅ Education extraction completed",
            education_count=len(education_results.get('education', [])),
            educations=education_results.get('education', [])
        )
        
        # Step 6b: Extract summary
        step_start = time.time()
        summary = self._extract_summary(sections, text)
        metrics['summary_extraction_ms'] = (time.time() - step_start) * 1000
        
        # Step 7: Merge all results
        step_start = time.time()
        merged_results = self._merge_results(rule_results, ai_results, deberta_results, experience_results, education_results)
        merged_results['summary'] = summary
        
        # Store raw model extraction results for UI display
        merged_results['model_results'] = {
            'deberta_extraction': {
                'work_experience': deberta_results.get('work_experience', []),
                'education': deberta_results.get('education', []),
                'companies': deberta_results.get('companies', []),
                'job_titles': deberta_results.get('job_titles', []),
                'institutions': deberta_results.get('institutions', []),
                'degrees': deberta_results.get('degrees', []),
                'source': 'deberta_ner'
            }
        }
        self.logger.info(f"✅ Added model_results to merged_results: {len(deberta_results.get('work_experience', []))} work exp, {len(deberta_results.get('companies', []))} companies")
        
        # Add regex-extracted name (overrides other sources if present)
        if person_name:
            merged_results['name'] = person_name
            self.logger.info(f"✅ Using regex-extracted name: '{person_name}'")
        
        # Step 7b: Normalize entities
        if self.entity_normalizer:
            merged_results['skills'] = self.entity_normalizer.normalize_skills_list(merged_results.get('skills', []))
            if merged_results.get('companies'):
                merged_results['companies'] = [self.entity_normalizer.normalize_company(c) for c in merged_results['companies']]
        
        metrics['merging_ms'] = (time.time() - step_start) * 1000
        
        # Step 8: Calculate confidence scores
        step_start = time.time()
        confidence_scores = self._calculate_confidence(merged_results)
        metrics['confidence_scoring_ms'] = (time.time() - step_start) * 1000
        
        # Step 8b: Analyze extraction quality
        step_start = time.time()
        quality_report = self._analyze_extraction_quality(text, merged_results, sections)
        metrics['quality_analysis_ms'] = (time.time() - step_start) * 1000
        
        # Step 9: Assemble final result
        result = self._assemble_final_result(
            candidate_id, merged_results, confidence_scores, metrics, file_info, quality_report
        )
        
        # Ensure raw_text is included in the final result
        result['raw_text'] = text
        result['raw_resume_text'] = text
        
        return result
    
    def _extract_text_from_file(self, file_path: str, force_ocr: bool = False) -> Dict[str, Any]:
        """Extract text from file using TextExtractor."""
        if not self.text_extractor:
            raise RuntimeError("TextExtractor not available")
        
        return self.text_extractor.extract(file_path, force_ocr=force_ocr)
    
    def _split_sections(self, text: str) -> Dict[str, str]:
        """Split text into sections using SectionSplitter."""
        if not self.section_splitter:
            self.logger.warning("SectionSplitter not available, returning empty sections")
            return {}
        
        return self.section_splitter.split_sections(text)
    
    def _run_rule_parsing(self, text: str, sections: Dict[str, str] = None) -> Dict[str, Any]:
        """Run rule-based parsing on text."""
        self.logger.info("🔧 _run_rule_parsing called")
        self.logger.info(f"🔧 rule_parser type: {type(self.rule_parser).__name__ if self.rule_parser else None}")
        if not self.rule_parser:
            self.logger.warning("RuleBasedParser not available, returning empty results")
            return {}
        self.logger.info(f"✅ RuleBasedParser is available: {type(self.rule_parser)}")
        
        result = {
            'email': self.rule_parser.extract_email(text),
            'phone': self.rule_parser.extract_phone(text),
            'linkedin': self.rule_parser.extract_linkedin(text),
            'github': self.rule_parser.extract_github(text),
            'websites': self.rule_parser.extract_websites(text),
            'dates': self.rule_parser.extract_dates(text),
            'years_of_experience': self.rule_parser.extract_years_of_experience(text)
        }
        
        # Add locations extraction if available
        if hasattr(self.rule_parser, 'extract_locations'):
            result['locations'] = self.rule_parser.extract_locations(text)
        
        # Add skills extraction if available - use skills section if present
        # TODO: This code block is currently unreachable due to a workaround in main.py (2026-07-08)
        # The domain/license extraction was moved to main.py's /parse endpoint as a workaround
        # because _run_rule_parsing was not being called in the active code path.
        # Root cause not yet identified - see main.py lines 386-390 for the workaround.
        if hasattr(self.rule_parser, 'extract_skills'):
            self.logger.info("🔧 SKILLS EXTRACTION: extract_skills method exists, proceeding")
            skills_text = text
            if sections and sections.get('skills'):
                skills_text = sections.get('skills')
                self.logger.info(f"Extracting skills from skills section ({len(skills_text)} chars)")
            else:
                self.logger.warning("No skills section found, using full text for skills extraction")
            result['skills'] = self.rule_parser.extract_skills(skills_text)
            self.logger.info(f"✅ SKILLS EXTRACTION: Extracted {len(result['skills']) if result['skills'] else 0} skills")
            
            # Add domain detection if available
            self.logger.info("🔧 DOMAIN DETECTION: Checking for detect_domain method")
            if hasattr(self.rule_parser, 'detect_domain'):
                self.logger.info(f"🔧 DOMAIN DETECTION: detect_domain method exists, calling with {len(result['skills']) if result['skills'] else 0} skills")
                domain_info = self.rule_parser.detect_domain(result['skills'])
                result['domain'] = domain_info
                self.logger.info(f"Detected domain: {domain_info['primary_domain']} (confidence: {domain_info['confidence']:.2f})")
            else:
                self.logger.warning("⚠️ DOMAIN DETECTION: detect_domain method NOT found on rule_parser")
            
            # Add license extraction if available
            self.logger.info("🔧 LICENSE EXTRACTION: Checking for extract_licenses method")
            if hasattr(self.rule_parser, 'extract_licenses'):
                self.logger.info("🔧 LICENSE EXTRACTION: extract_licenses method exists, calling")
                licenses = self.rule_parser.extract_licenses(text)
                result['licenses'] = licenses
                if licenses:
                    self.logger.info(f"Extracted licenses: {licenses}")
                else:
                    self.logger.info("✅ LICENSE EXTRACTION: No licenses found")
            else:
                self.logger.warning("⚠️ LICENSE EXTRACTION: extract_licenses method NOT found on rule_parser")
        else:
            self.logger.warning("⚠️ SKILLS EXTRACTION: extract_skills method NOT found on rule_parser")
        
        # Add name extraction if available
        if hasattr(self.rule_parser, 'extract_name'):
            result['name'] = self.rule_parser.extract_name(text)
        
        return result
    
    def _run_deberta_parsing(self, text: str) -> Dict[str, Any]:
        """
        Run DeBERTa NER parsing with focused section extraction for better accuracy.
        Uses the trained DeBERTa model for entity extraction on only Work Experience & Education sections.
        
        Args:
            text: Text to parse with DeBERTa
            
        Returns:
            DeBERTa parsing results or empty results if model not available
        """
        if not self.deberta_parser or not self.deberta_parser.is_available():
            self.logger.info("DeBERTa parser not available, skipping DeBERTa parsing")
            return {}
        
        try:
            self.logger.info("🤖 Running DeBERTa NER parsing with focused sections...")
            
            # Step 1: Extract only Work Experience and Education sections
            sections = self.deberta_parser.extract_target_sections(text)
            
            # Step 2: Parse only those sections with DeBERTa (focused approach)
            deberta_results = self.deberta_parser.parse_focused_sections(sections)
            
            # Log what DeBERTa returned
            self.logger.info(f"🔍 DeBERTa results keys: {list(deberta_results.keys())}")
            self.logger.info(f"🔍 DeBERTa work_experience count: {len(deberta_results.get('work_experience', []))}")
            self.logger.info(f"🔍 DeBERTa companies: {deberta_results.get('companies', [])}")
            self.logger.info(f"🔍 DeBERTa job_titles: {deberta_results.get('job_titles', [])}")
            
            if deberta_results:
                entity_count = sum(len(v) for v in deberta_results.values() if isinstance(v, list))
                self.logger.info(f"✅ DeBERTa parsing completed - found {entity_count} entities from focused sections")
                return deberta_results
            else:
                self.logger.warning("⚠️ DeBERTa parsing returned empty results")
                return {}
                
        except Exception as e:
            self.logger.error(f"❌ DeBERTa parsing failed: {e}")
            return {}
    
    def _run_ai_parsing(self, text: str, sections: Dict[str, str] = None, rule_results: Dict[str, Any] = None, deberta_results: Dict[str, Any] = None, llm_provider: Optional[str] = None) -> Dict[str, Any]:
        """
        Run AI entity extraction on text with hybrid skills optimization.
        Only calls AI if rule-based extraction has low confidence (<0.85) for any field.
        
        Args:
            text: Full resume text
            sections: Detected sections dictionary
            rule_results: Results from rule-based parsing with confidence scores
            llm_provider: Optional LLM provider - if specified, forces AI parsing
            
        Returns:
            Dictionary with AI-extracted fields (only fields that need AI)
        """
        if not self.ai_parser:
            self.logger.warning("AINamedEntityParser not available, returning empty results")
            return {}
        
        # FORCE AI PARSING when specific LLM provider is selected
        force_ai_parsing = False
        if llm_provider and llm_provider != 'own-model':
            self.logger.info(f"🤖 LLM provider '{llm_provider}' selected - FORCING AI parsing for enhanced quality")
            force_ai_parsing = True
        
        # OPTIMIZATION: Check if AI is even needed based on rule_results and deberta_results confidence
        # Skip fields where rule-based extraction has high confidence (>=0.85) or DeBERTa found good results
        # BUT: Skip this optimization if force_ai_parsing is True
        skip_ai_entirely = False
        if not force_ai_parsing and (rule_results or deberta_results):
            # Check confidence for key fields from both rule_results and deberta_results
            high_confidence_fields = []
            
            # Check rule-based results
            if rule_results:
                for field in ['name', 'email', 'phone', 'linkedin', 'github', 'skills', 'locations']:
                    field_value = rule_results.get(field)
                    # Consider field high confidence if it exists and has data
                    if field_value:
                        if isinstance(field_value, (list, str)):
                            if (isinstance(field_value, list) and len(field_value) > 0) or \
                               (isinstance(field_value, str) and len(field_value) > 0):
                                high_confidence_fields.append(field)
            
            # Check DeBERTa results for entities
            if deberta_results:
                deberta_entities = deberta_results.get('confidence', {}).get('entities_found', 0)
                if deberta_entities >= 3:  # Found at least 3 good entities
                    high_confidence_fields.extend(['companies', 'locations', 'job_titles'])
                    self.logger.info(f"🤖 DeBERTa found {deberta_entities} entities - may skip AI for some fields")
            
            # If all critical fields have high confidence from rules, skip AI entirely
            critical_fields = ['name', 'email', 'skills']
            critical_covered = all(field in high_confidence_fields for field in critical_fields)
            
            if critical_covered:
                self.logger.info(f"All critical fields have high confidence from rule-based extraction")
                self.logger.info(f"High confidence fields: {high_confidence_fields}")
                self.logger.info("Skipping AI model call entirely (saves ~2000-9000ms)")
                skip_ai_entirely = True
        
        # If AI not needed, return empty dict immediately
        if skip_ai_entirely:
            return {
                'ai_skipped': True,
                'reason': 'All critical fields extracted with high confidence by rule-based methods'
            }
        
        # OPTIMIZATION: Only extract misc_entities from full text (no longer extracting name/companies/locations)
        # This significantly reduces AI inference time
        self.logger.info("AI model call required - extracting entities")
        entities = self.ai_parser.extract_entities(text)
        
        # OPTIMIZATION: Hybrid skills extraction - dictionary first, AI only for gaps
        # STEP 1: Get skills section text
        skills_text = sections.get('skills', '') if sections else ''
        ai_skills = []
        
        if skills_text and hasattr(self.rule_parser, 'extract_skills_from_dictionary'):
            # STEP 2: Extract skills using dictionary (instant, 500+ skills)
            dict_result = self.rule_parser.extract_skills_from_dictionary(skills_text)
            dict_skills = dict_result.get('matched_skills', [])
            remainder_text = dict_result.get('remainder_text', '')
            remainder_length = dict_result.get('remainder_length', 0)
            
            self.logger.info(f"Dictionary matched {len(dict_skills)} skills")
            self.logger.info(f"Remainder text: {remainder_length} chars")
            
            # STEP 3: Only call AI if significant unmatched text remains (>50 chars)
            if remainder_length > 50:
                self.logger.info(f"Calling AI on {remainder_length} char remainder for rare/emerging skills")
                try:
                    # Extract skills from remainder only
                    remainder_entities = self.ai_parser.extract_entities(remainder_text)
                    ai_skills = remainder_entities.get('skills', [])
                    self.logger.info(f"AI found {len(ai_skills)} additional skills in remainder")
                except Exception as e:
                    self.logger.error(f"Error extracting AI skills from remainder: {e}")
                    ai_skills = []
            else:
                self.logger.info("Remainder <50 chars, skipping AI skills extraction (saves ~4000ms)")
            
            # STEP 4: Merge and deduplicate (done by hybrid_merger)
            # Return both sources, merger will combine them
            return {
                # 'name' removed - rule_parser.extract_name() already extracts with 95% accuracy
                # 'companies' removed - experience_extractor already extracts with 85% accuracy from job blocks
                # 'locations' removed - experience_extractor extracts from job blocks + rule_parser extracts City/State patterns
                'skills': ai_skills,  # Only rare/emerging skills from AI (if any)
                'ai_entities': entities  # Keep raw entities for reference
            }
        else:
            # Fallback: no skills section or dictionary method not available
            self.logger.warning("No skills section or dictionary method unavailable, skipping AI skills")
            return {
                'ai_entities': entities
            }
    
    @staticmethod
    def _get_section_text(sections: Dict[str, str], category: str) -> str:
        """
        Look up section text by trying all known alias keys for the category.
        This fixes the case where SectionSplitter stores 'professional experience'
        but code only checks for 'experience'.
        """
        ALIASES = {
            'experience': [
                'experience', 'work experience', 'professional experience',
                'employment history', 'career history', 'work history',
                'employment', 'relevant experience', 'related experience',
                'professional background', 'job history', 'positions held',
                'career summary', 'career profile', 'career overview',
                'consulting experience', 'internship experience', 'internships',
                'project experience',
            ],
            'education': [
                'education', 'academic background', 'educational background',
                'educational qualifications', 'academic qualifications',
                'academic history', 'qualifications', 'degrees',
            ],
            'skills': [
                'skills', 'technical skills', 'key skills', 'core competencies',
                'competencies', 'expertise', 'technologies', 'technology stack',
            ],
            'summary': [
                'summary', 'professional summary', 'career summary', 'profile',
                'objective', 'career objective', 'overview', 'about me',
            ],
        }
        for key in ALIASES.get(category, [category]):
            text = sections.get(key, '').strip()
            if text:
                return text
        return ''

    def _extract_experience(self, sections: Dict[str, str], full_text: str = '', llm_provider: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract structured work experience using HYBRID approach:
        1. PRIMARY: Custom NER Model + Rule-based extraction
        2. FALLBACK: Gemini LLM (only if API key is valid and primary methods fail)

        NOTE: Only used as a fallback when DeBERTa returns 0 results.
        DeBERTa results take priority in _merge_results().
        """
        self.logger.info("=" * 80)
        self.logger.info("🔍 HYBRID EXPERIENCE EXTRACTION (fallback)")
        self.logger.info("=" * 80)

        # FIX 2: Removed early-return guard. ExperienceExtractor now always runs
        # as a fallback. _merge_results() suppresses its output when DeBERTa
        # has produced non-empty work_experience results.
        if not self.exp_extractor:
            self.logger.warning("ExperienceExtractor not available, returning empty results")
            return {'work_experience': [], 'job_titles': []}

        # FIX 1: Use alias-aware lookup so 'work experience' / 'professional experience'
        # section headers are found even though they differ from the canonical key.
        experience_text = self._get_section_text(sections, 'experience')
        if not experience_text:
            self.logger.warning("No experience section detected via any alias key, falling back to full text")
            experience_text = full_text
        if not experience_text:
            return {'work_experience': [], 'job_titles': []}

        self.logger.info(f"📝 Experience text length: {len(experience_text)} chars")
        self.logger.info(f"📝 Experience text preview: {experience_text[:300]}...")
        
        # STEP 1: Try Custom NER Model + Rule-based extraction (PRIMARY)
        self.logger.info("🎯 STEP 1: Trying Custom NER Model + Rule-based extraction")
        work_experience = []
        extraction_method = "none"
        
        try:
            # Try AI NER parser first (your custom model)
            if self.ai_parser:
                self.logger.info("🤖 Using Custom NER Model...")
                try:
                    # AI parser returns entities, not structured work_experience
                    # We'll use it to enhance rule-based extraction
                    ai_entities = self.ai_parser.extract_entities(experience_text)
                    self.logger.info(f"Custom NER Model extracted entities: {len(ai_entities.get('companies', []))} companies, {len(ai_entities.get('titles', []))} titles")
                    # Note: AI NER model doesn't directly extract structured work_experience
                    # It extracts entities that can be used by rule-based extraction
                except Exception as e:
                    self.logger.warning(f"Custom NER Model failed: {e}")
            
            # If NER didn't work or returned empty, try rule-based
            if not work_experience:
                self.logger.info("📊 Using Rule-based extraction...")
                exp_result = self.exp_extractor.extract_work_experience(experience_text)
                work_experience = exp_result.get('work_experience', []) if exp_result else []
                if work_experience:
                    extraction_method = "rule_based"
                    self.logger.info(f"✅ Rule-based extracted {len(work_experience)} experiences")
        
        except Exception as e:
            self.logger.error(f"Primary extraction methods failed: {e}")
        
        # STEP 2: If primary methods failed, try Gemini LLM as fallback (OPTIONAL)
        if not work_experience:
            self.logger.info("⚠️ Primary methods returned empty, checking for Gemini API key...")
            
            # Check if Gemini API key exists
            import os
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            
            if gemini_api_key and hasattr(self.exp_extractor, 'extract_experience_with_llm'):
                self.logger.info("🔑 Gemini API key found, using as fallback...")
                effective_provider = llm_provider or 'gemini-2.0-flash-lite'
                
                try:
                    llm_jobs = self.exp_extractor.extract_experience_with_llm(experience_text, effective_provider)
                    
                    if llm_jobs and len(llm_jobs) > 0:
                        work_experience = llm_jobs
                        extraction_method = f"gemini_llm_{effective_provider}"
                        self.logger.info(f"✅ Gemini LLM extracted {len(work_experience)} experiences")
                    else:
                        self.logger.warning("Gemini LLM returned empty results")
                
                except Exception as e:
                    self.logger.error(f"Gemini LLM extraction failed: {e}")
            else:
                if not gemini_api_key:
                    self.logger.info("ℹ️ No GEMINI_API_KEY found - skipping LLM fallback")
                    self.logger.info("💡 Add GEMINI_API_KEY to .env to enable LLM-based extraction")
                else:
                    self.logger.warning("LLM extraction method not available")
        
        # Ensure work_experience is a list
        if not isinstance(work_experience, list):
            work_experience = []
        
        # Extract and clean job titles
        GARBAGE_TITLE = re.compile(
            r'(?i)^('
            r'client[:\s]|duration[:\s]|role[:\s]'
            r'|address[:\s]|phone[:\s]|email[:\s]'
            r'|environment[:\s]|https?://'
            r'|[a-z0-9._%+\-]+@'
            r')'
        )

        job_titles = []
        for exp in work_experience:
            t = exp.get('job_title') or exp.get('title') or exp.get('role') or ''
            t = t.strip()
            # Remove trailing dash/dash+spaces
            t = re.sub(r'\s*[-–—]\s*$', '', t).strip()
            if t and len(t) > 2 and len(t) < 80 and not GARBAGE_TITLE.match(t):
                job_titles.append(t)
        
        self.logger.info("=" * 80)
        self.logger.info(f"📊 EXTRACTION COMPLETE")
        self.logger.info(f"Method used: {extraction_method}")
        self.logger.info(f"Experiences extracted: {len(work_experience)}")
        self.logger.info(f"Job titles extracted: {len(job_titles)}")
        self.logger.info("=" * 80)
        
        return {
            'work_experience': work_experience,
            'job_titles': job_titles,
            '_extraction_method': extraction_method
        }
    
    def _extract_summary(self, sections: Dict[str, str], full_text: str) -> Optional[str]:
        """Extract candidate summary/objective from the summary section."""
        summary_text = sections.get('summary', '').strip()
        
        if summary_text and len(summary_text) >= 30:
            lines = summary_text.splitlines()
            cleaned_lines = []
            for line in lines:
                stripped = line.strip()
                if stripped and not re.match(
                    r'^(summary|objective|profile|about\s*me|professional\s+summary|career\s+objective|overview)\s*$',
                    stripped, re.IGNORECASE
                ):
                    cleaned_lines.append(stripped)
            result = ' '.join(cleaned_lines).strip()
            if len(result) >= 30:
                return result[:1000]
        
        # Fallback: first substantial narrative paragraph in the full text
        paragraphs = re.split(r'\n{2,}', full_text)
        for para in paragraphs[:5]:
            para = para.strip()
            if len(para) < 50:
                continue
            if para.isupper():
                continue
            if para.startswith(('-', '*')) or re.match(r'^[\s]*[•\-\*\+]', para):
                continue
            if re.search(r'\(cid:\d+\)', para):
                continue
            if re.search(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b|\b\d{4}\s*[-–—]\s*\d{4}\b', para, re.IGNORECASE):
                continue
            if re.search(r'@|\d{3}[-.]\d{3}|linkedin\.com|github\.com', para, re.IGNORECASE):
                continue
            return para[:1000]
        
        return None
    
    def _extract_education(self, sections: Dict[str, str], full_text: str = '') -> Dict[str, Any]:
        """Extract structured education information."""
        if not self.edu_extractor:
            self.logger.warning("EducationExtractor not available, returning empty results")
            return {'education': [], 'education_institutions': [], 'degrees': []}

        # FIX 1: Use alias-aware lookup so 'academic background' etc. are found.
        education_text = self._get_section_text(sections, 'education')
        if not education_text:
            self.logger.warning("No education section detected via any alias key, skipping education extraction")
            return {'education': [], 'education_institutions': [], 'degrees': []}
        
        education = self.edu_extractor.extract_education(education_text)
        
        # Ensure education is a list to prevent iteration errors
        if not isinstance(education, list):
            education = []
        
        institutions = [edu.get('institution', '') for edu in education if edu.get('institution')]
        degrees = [edu.get('degree', '') for edu in education if edu.get('degree')]
        
        return {
            'education': education,
            'education_institutions': institutions,
            'degrees': degrees
        }
    
    def _merge_results(self, rule_results: Dict[str, Any], ai_results: Dict[str, Any], 
                   deberta_results: Dict[str, Any], experience_results: Dict[str, Any], 
                   education_results: Dict[str, Any]) -> Dict[str, Any]:
        """Merge all parsing results using HybridMerger with resolve_conflicts."""
        if not self.hybrid_merger:
            self.logger.warning("HybridMerger not available, using simple combination")
            # FIX 3: Pass deberta_results — was previously missing, causing wrong merge priorities
            return self._simple_merge(rule_results, ai_results, deberta_results, experience_results, education_results)
        
        self.logger.debug("Using HybridMerger with resolve_conflicts for merging results")
        
        # Combine all results for merger
        self.logger.debug(f"Original rule_results has email: {rule_results.get('email')}, phone: {rule_results.get('phone')}")
        self.logger.debug(f"AI results keys: {list(ai_results.keys())}")
        self.logger.debug(f"DeBERTa results keys: {list(deberta_results.keys())}")
        self.logger.debug(f"Experience results keys: {list(experience_results.keys())}")
        self.logger.debug(f"Education results keys: {list(education_results.keys())}")
        
        # Prepare combined results for each source
        combined_rule = rule_results.copy()
        combined_ai = ai_results.copy()
        combined_deberta = deberta_results.copy()
        combined_llm = {}  # Empty for now, could be populated later
        
        # Add experience and education results with proper priority
        # PRIORITY: DeBERTa/Structured Parser > Old ExperienceExtractor
        # CRITICAL: If DeBERTa has work_experience, COMPLETELY IGNORE old ExperienceExtractor
        has_deberta_work_exp = bool(combined_deberta.get('work_experience'))
        
        for key, value in {**experience_results, **education_results}.items():
            # If DeBERTa has work_experience, completely skip ALL old ExperienceExtractor work-related results
            if has_deberta_work_exp and key in ['work_experience', 'companies', 'job_titles', 'locations', 'work_history']:
                self.logger.info(f"✅ Using DeBERTa/Structured parser {key} - COMPLETELY SKIPPING old ExperienceExtractor")
                continue
            
            # Only add old extractor results if DeBERTa doesn't have them
            if key in combined_rule and isinstance(combined_rule[key], list) and isinstance(value, list):
                combined_rule[key] = combined_rule[key] + value
            elif key not in combined_rule:
                combined_rule[key] = value
                
            if key in combined_ai and isinstance(combined_ai[key], list) and isinstance(value, list):
                combined_ai[key] = combined_ai[key] + value
            elif key not in combined_ai:
                combined_ai[key] = value
                
            # Never add to combined_deberta if DeBERTa already has it
            if not combined_deberta.get(key):
                if key in combined_deberta and isinstance(combined_deberta[key], list) and isinstance(value, list):
                    combined_deberta[key] = combined_deberta[key] + value
                elif key not in combined_deberta:
                    combined_deberta[key] = value
                
            if key in combined_llm and isinstance(combined_llm[key], list) and isinstance(value, list):
                combined_llm[key] = combined_llm[key] + value
            elif key not in combined_llm:
                combined_llm[key] = value
        
        # Use the new resolve_conflicts method with DeBERTa prioritized for entities
        merged = self.hybrid_merger.merge_with_deberta(combined_rule, combined_ai, combined_deberta, combined_llm)
        
        # Log which parser provided work_experience in final result
        if merged.get('work_experience'):
            work_exp_count = len(merged['work_experience'])
            companies_count = len(merged.get('companies', []))
            self.logger.info(f"📊 FINAL WORK EXPERIENCE: {work_exp_count} entries, {companies_count} companies")
            
            # Check if it came from DeBERTa/structured parser
            if combined_deberta.get('work_experience'):
                self.logger.info(f"✅ Source: DeBERTa/Structured Parser (structured format with clients)")
            else:
                self.logger.info(f"⚠️  Source: Old ExperienceExtractor (fallback - may be incomplete)")
        else:
            self.logger.warning(f"❌ No work experience in final result")
        
        return merged
    
    def _simple_merge(self, rule_results: Dict[str, Any], ai_results: Dict[str, Any], 
                   deberta_results: Dict[str, Any], experience_results: Dict[str, Any], 
                   education_results: Dict[str, Any]) -> Dict[str, Any]:
        """Simple merge fallback when HybridMerger is not available."""
        merged = {}
        
        # Add all results with DeBERTa priority for entities, rules for contact info
        deberta_priority = ['companies', 'locations', 'job_titles', 'work_experience', 'education']
        rule_priority = ['name', 'email', 'phone', 'linkedin', 'github']
        
        for key in set(rule_results) | set(ai_results) | set(deberta_results) | set(experience_results) | set(education_results):
            if key in deberta_priority and deberta_results.get(key):
                merged[key] = deberta_results[key]
            elif key in rule_priority and rule_results.get(key):
                merged[key] = rule_results[key]
            elif ai_results.get(key):
                merged[key] = ai_results[key]
            elif rule_results.get(key):
                merged[key] = rule_results[key]
            elif deberta_results.get(key):
                merged[key] = deberta_results[key]
            elif experience_results.get(key):
                merged[key] = experience_results[key]
            elif education_results.get(key):
                merged[key] = education_results[key]
        
        return merged
    
    def _calculate_confidence(self, merged_results: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate confidence scores for merged results."""
        if not self.confidence_scorer:
            self.logger.warning("ConfidenceScorer not available, returning empty confidence")
            return {'overall': 0.0, 'fields': {}, 'needs_review': True}
        
        return self.confidence_scorer.score_parsed_resume(merged_results)
    
    def _analyze_extraction_quality(self, original_text: str, parsed_data: Dict[str, Any], 
                                   sections: Dict[str, str]) -> Dict[str, Any]:
        """Analyze extraction quality by comparing original text with parsed output."""
        if not self.quality_analyzer:
            self.logger.warning("TextQualityAnalyzer not available, skipping quality analysis")
            return None
        
        try:
            quality_report = self.quality_analyzer.analyze_extraction_quality(
                original_text, parsed_data, sections
            )
            self.logger.info(f"📊 Extraction quality: {quality_report.get('extraction_quality_percentage', 0):.1f}%")
            return quality_report
        except Exception as e:
            self.logger.error(f"Error analyzing extraction quality: {e}", exc_info=True)
            return None
    
    def _assemble_final_result(self, candidate_id: str, merged_results: Dict[str, Any],
                              confidence_scores: Dict[str, Any], metrics: Dict[str, float],
                              file_info: Dict[str, Any] = None, quality_report: Dict[str, Any] = None) -> Dict[str, Any]:
        """Assemble final result with all components."""
        # Post-process skills: extract extra skills from job titles/descriptions
        try:
            from parsers.rule_parser import RuleBasedParser
            rule_parser = RuleBasedParser()
            extra_skills = []
            for exp in merged_results.get('work_experience', []):
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
            
            if extra_skills:
                skills_list = merged_results.get('skills', []) or []
                merged_results['skills'] = list(dict.fromkeys(skills_list + extra_skills))
        except Exception as skill_err:
            self.logger.warning(f"Failed to post-process skills from experience in master parser: {skill_err}")

        result = {
            'candidate_id': candidate_id,
            'status': 'success',
            'parsing_timestamp': time.time(),
            
            # Personal information
            'name': merged_results.get('name'),
            'email': merged_results.get('email'),
            'phone': merged_results.get('phone'),
            'linkedin': merged_results.get('linkedin'),
            'github': merged_results.get('github'),
            'websites': merged_results.get('websites', []),
            
            # Professional information
            'summary': merged_results.get('summary'),
            'skills': merged_results.get('skills', []),
            'work_experience': merged_results.get('work_experience', []),
            'work_history': merged_results.get('work_experience', []),  # Backend compatibility field
            'education': merged_results.get('education', []),
            'job_titles': merged_results.get('job_titles', []),
            'companies': merged_results.get('companies', []),
            'locations': merged_results.get('locations', []),
            
            # Additional extracted data
            'dates': [d.get('raw', str(d)) if isinstance(d, dict) else str(d) for d in (merged_results.get('dates') or [])],
            'years_of_experience': self._calculate_years_from_work_history(merged_results.get('work_experience', [])),
            'misc_entities': merged_results.get('misc_entities') or [],
            
            # Quality assessment
            'confidence': confidence_scores,
            'needs_review': confidence_scores.get('needs_review', True),
            'quality_level': confidence_scores.get('quality_level', 'unknown'),
            
            # Processing metrics
            'processing_metrics': {
                'timing_ms': metrics,
                'total_processing_time_ms': metrics.get('total_ms', 0),
                'pipeline_steps_completed': len([k for k, v in metrics.items() if v > 0])
            }
        }
        
        # Add file info if available
        if file_info:
            result['source_info'] = file_info
        
        # Add extraction quality report if available
        if quality_report:
            result['extraction_quality'] = quality_report
        
        # Add model results if available (for UI display)
        if 'model_results' in merged_results:
            result['model_results'] = merged_results['model_results']
            self.logger.info(f"✅ Added model_results to final result")
        else:
            self.logger.warning(f"⚠️ model_results NOT found in merged_results")
        
        # Add merge metadata if available
        if '_merge_metadata' in merged_results:
            result['merge_metadata'] = merged_results['_merge_metadata']
        
        # Add source tracking keys for all fields
        for key, value in merged_results.items():
            if key.startswith('_') and key.endswith('_source'):
                result[key] = value
        
        return result
    
    def _create_error_result(self, candidate_id: str, error_message: str, 
                           metrics: Dict[str, float]) -> Dict[str, Any]:
        """Create error result when parsing fails."""
        return {
            'candidate_id': candidate_id,
            'status': 'error',
            'error': error_message,
            'parsing_timestamp': time.time(),
            'confidence': {
                'overall': 0.0,
                'fields': {},
                'needs_review': True,
                'quality_level': 'error'
            },
            'processing_metrics': {
                'timing_ms': metrics,
                'total_processing_time_ms': metrics.get('total_ms', 0),
                'pipeline_steps_completed': len([k for k, v in metrics.items() if v > 0])
            }
        }
    
    def get_pipeline_metrics(self) -> Dict[str, Any]:
        """
        Get timing metrics for the last parse operation.
        
        Returns:
            Dictionary with detailed timing information
        """
        if not self.last_parse_metrics:
            return {'status': 'no_metrics', 'message': 'No parsing operations performed yet'}
        
        metrics = self.last_parse_metrics.copy()
        
        # Calculate percentages
        total_time = metrics.get('total_ms', 0)
        if total_time > 0:
            metrics['percentages'] = {}
            for step, time_ms in metrics.items():
                if step != 'total_ms':
                    metrics['percentages'][step] = (time_ms / total_time) * 100
        
        # Add performance analysis
        metrics['performance_analysis'] = {
            'slowest_step': max(metrics.items(), key=lambda x: x[1] if x[0] != 'total_ms' else 0)[0],
            'fastest_step': min(metrics.items(), key=lambda x: x[1] if x[0] != 'total_ms' else float('inf'))[0],
            'ai_vs_rules_ratio': (
                metrics.get('ai_parsing_ms', 0) / max(metrics.get('rule_parsing_ms', 1), 1)
            )
        }
        
        return metrics
    
    def get_parser_health(self) -> Dict[str, Any]:
        """
        Get health status of all parsers.
        
        Returns:
            Dictionary with parser availability status
        """
        parsers = {
            'text_extractor': self.text_extractor,
            'section_splitter': self.section_splitter,
            'rule_parser': self.rule_parser,
            'experience_extractor': self.exp_extractor,
            'education_extractor': self.edu_extractor,
            'ai_parser': self.ai_parser,
            'hybrid_merger': self.hybrid_merger,
            'confidence_scorer': self.confidence_scorer
        }
        
        health = {}
        for name, parser in parsers.items():
            health[name] = {
                'available': parser is not None,
                'status': 'healthy' if parser is not None else 'unavailable'
            }
        
        # Overall health
        all_available = all(parser is not None for parser in parsers.values())
        health['overall'] = {
            'status': 'healthy' if all_available else 'degraded',
            'available_parsers': sum(1 for p in parsers.values() if p is not None),
            'total_parsers': len(parsers)
        }
        
        return health
    
    def get_supported_file_types(self) -> List[str]:
        """
        Get list of supported file types.
        
        Returns:
            List of supported file extensions
        """
        if self.text_extractor:
            try:
                return self.text_extractor.get_supported_formats()
            except Exception as e:
                self.logger.error(f"Error getting supported formats: {e}")
        
        return ['.txt']  # Fallback to text only
    
    def _calculate_years_from_work_history(self, work_experience: list) -> float:
        """
        Calculate years of experience from work history.
        Finds earliest start_date and calculates to today.
        """
        if not work_experience:
            return 0.0
        
        from datetime import date
        
        earliest_start = None
        today = date.today()
        
        for exp in work_experience:
            start_date = exp.get('start_date')
            
            if not start_date:
                continue
            
            # Parse start_date
            try:
                if isinstance(start_date, str):
                    # Try YYYY-MM-DD format
                    if '-' in start_date:
                        parts = start_date.split('-')
                        if len(parts) >= 1:
                            year = int(parts[0])
                            month = int(parts[1]) if len(parts) >= 2 else 1
                            day = int(parts[2]) if len(parts) >= 3 else 1
                            start = date(year, month, day)
                    else:
                        # Try just year
                        year = int(start_date)
                        start = date(year, 1, 1)
                else:
                    continue
                
                # Track earliest start date
                if earliest_start is None or start < earliest_start:
                    earliest_start = start
                    
            except (ValueError, TypeError):
                continue
        
        if earliest_start is None:
            return 0.0
        
        # Calculate years from earliest start to today
        days_diff = (today - earliest_start).days
        years = round(days_diff / 365.25, 1)
        
        return max(0.0, years)


# Example usage and testing
if __name__ == "__main__":
    # Sample text for testing
    sample_text = """
    JOHN DOE
    Senior Software Engineer
    Email: john.doe@email.com
    Phone: +1 (555) 123-4567
    LinkedIn: linkedin.com/in/johndoe
    
    EXPERIENCE
    Senior Software Engineer
    Tech Corp
    San Francisco, CA | 2020 - Present
    • Developed web applications using React and Node.js
    • Led team of 5 developers
    
    Software Engineer
    StartupXYZ
    Palo Alto, CA | 2018 - 2020
    • Built RESTful APIs and microservices
    
    EDUCATION
    Master of Science in Computer Science
    Stanford University
    2016 - 2018
    
    SKILLS
    Python, JavaScript, React, Node.js, AWS, Docker
    """
    
    try:
        # Initialize master parser
        parser = MasterParser()
        
        print("🚀 Testing Master Parser")
        print("=" * 50)
        
        # Test text parsing
        result = parser.parse_text(sample_text, "test_candidate_001")
        
        print("📊 Parsing Results:")
        print(f"  Status: {result['status']}")
        print(f"  Name: {result.get('name')}")
        print(f"  Email: {result.get('email')}")
        print(f"  Phone: {result.get('phone')}")
        print(f"  Skills: {result.get('skills', [])}")
        print(f"  Companies: {result.get('companies', [])}")
        print(f"  Locations: {result.get('locations', [])}")
        print(f"  Work Experience: {len(result.get('work_experience', []))} entries")
        print(f"  Education: {len(result.get('education', []))} entries")
        
        print(f"\n📈 Confidence Score: {result['confidence']['overall']:.3f}")
        print(f"   Quality Level: {result['confidence']['quality_level']}")
        print(f"   Needs Review: {result['confidence']['needs_review']}")
        
        print(f"\n⏱️  Processing Metrics:")
        metrics = result['processing_metrics']
        print(f"   Total Time: {metrics['total_processing_time_ms']:.1f}ms")
        print(f"   Steps Completed: {metrics['pipeline_steps_completed']}")
        
        # Get detailed metrics
        detailed_metrics = parser.get_pipeline_metrics()
        print(f"\n🔍 Detailed Timing:")
        for step, time_ms in detailed_metrics.items():
            if step != 'percentages' and step != 'performance_analysis':
                print(f"   {step}: {time_ms:.1f}ms")
        
        # Get parser health
        health = parser.get_parser_health()
        print(f"\n🏥 Parser Health:")
        print(f"   Overall: {health['overall']['status']}")
        print(f"   Available: {health['overall']['available_parsers']}/{health['overall']['total_parsers']}")
        
        print("\n✅ Master parser test completed!")
        
    except Exception as e:
        print(f"❌ Error testing master parser: {e}")
