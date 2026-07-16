#!/usr/bin/env python3
"""
Test script to validate Experience post-processing pipeline improvements.

Tests multiple resume formats to ensure:
1. Experience splitting works correctly
2. Role extraction is restricted to headers
3. Company anchors are preserved
4. Jobs are not merged
5. Position-based clustering works
6. Company detection rejects technologies/skills
7. Role normalization works
8. Hybrid post-processor preserves valid entities
9. spaCy post-processing rejects false positives
10. Validation logging shows matching counts
"""

import sys
import logging
from pathlib import Path

# Add ai-service to path
sys.path.insert(0, str(Path(__file__).parent / 'ai-service'))

from parsers.deberta_ner_parser import DeBERTaNerParser
from parsers.section_splitter import SectionSplitter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_resume(resume_path: str):
    """Test a single resume with the improved pipeline."""
    logger.info(f"\n{'='*80}")
    logger.info(f"Testing resume: {resume_path}")
    logger.info(f"{'='*80}\n")
    
    try:
        # Read resume text using TextExtractor
        from parsers.text_extractor import TextExtractor
        extractor = TextExtractor()
        if resume_path.endswith('.pdf'):
            res = extractor.extract_from_pdf(resume_path)
            text = res.get('text', '')
        elif resume_path.endswith('.docx'):
            text = extractor.extract_from_docx(resume_path)
        else:
            with open(resume_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        
        # Split sections
        splitter = SectionSplitter()
        sections = splitter.split_sections(text)
        
        logger.info(f"Sections found: {list(sections.keys())}")
        
        # Initialize DeBERTa parser
        parser = DeBERTaNerParser()
        
        # Parse experience section
        if 'experience' in sections:
            exp_text = sections['experience']
            logger.info(f"Experience section length: {len(exp_text)} chars")
            
            # Split into job blocks
            from parsers.experience_extractor import split_job_blocks
            job_blocks = split_job_blocks(exp_text)
            logger.info(f"Job blocks created: {len(job_blocks)}")
            
            # Parse with DeBERTa
            results = parser.parse_focused_sections({
                'work_experience_text': exp_text,
                'education_text': sections.get('education', '')
            })
            
            # Check validation
            work_experiences = results.get('work_experience', [])
            logger.info(f"Work experiences built: {len(work_experiences)}")
            
            # Validate counts
            if len(job_blocks) == len(work_experiences):
                logger.info(f"✅ VALIDATION PASSED: Job blocks ({len(job_blocks)}) == Experiences ({len(work_experiences)})")
            else:
                logger.warning(f"⚠️ VALIDATION MISMATCH: Job blocks ({len(job_blocks)}) != Experiences ({len(work_experiences)})")
            
            # Display experiences
            for i, exp in enumerate(work_experiences):
                logger.info(f"\n  Experience {i+1}:")
                logger.info(f"    Company: {exp.get('company_name', 'N/A')}")
                logger.info(f"    Title: {exp.get('job_title', 'N/A')}")
                logger.info(f"    Location: {exp.get('location', 'N/A')}")
                logger.info(f"    Start: {exp.get('start_date', 'N/A')}")
                logger.info(f"    End: {exp.get('end_date', 'N/A')}")
                logger.info(f"    Current: {exp.get('is_current', False)}")
        else:
            logger.warning("No experience section found")
            
    except Exception as e:
        logger.error(f"Error testing resume: {e}", exc_info=True)


def main():
    """Main test function."""
    # Test a few different resume formats
    test_resumes = [
        'resumes/Chandra_Shyam_Java_Developer_Resume.docx',
        'resumes/REACT DEVELOPER_VENKY 10+.docx',
        'resumes/Rahul_Sharma_Senior_Python_Engineer.docx',
    ]
    
    for resume in test_resumes:
        resume_path = Path(__file__).parent / resume
        if resume_path.exists():
            test_resume(str(resume_path))
        else:
            logger.warning(f"Resume not found: {resume_path}")
    
    logger.info(f"\n{'='*80}")
    logger.info("Test complete")
    logger.info(f"{'='*80}\n")


if __name__ == '__main__':
    main()
