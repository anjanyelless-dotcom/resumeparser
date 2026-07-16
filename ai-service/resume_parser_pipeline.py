#!/usr/bin/env python3
"""
Production-Ready Resume Parsing Pipeline
Handles smart section extraction, chunking fallback, and entity extraction
"""

import re
import json
import logging
from typing import List, Dict, Tuple, Optional
from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch

# Import the stronger section splitter
from parsers.section_splitter import SectionSplitter
from parsers.section_validator import SectionValidator
from parsers.text_extractor import TextExtractor

# Configure logging
logger = logging.getLogger(__name__)


class SectionExtractor:
    """Extract EXPERIENCE and EDUCATION sections from resume text"""
    
    # EXPERIENCE_KEYWORDS = [
    #     "experience", "work history", "employment", "professional experience",
    #     "work experience", "career history", "professional background"
    # ]

    EXPERIENCE_KEYWORDS = [
    # Core / generic
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "career",

    # History & background
    "employment history",
    "work history",
    "career history",
    "professional history",
    "job history",
    "past experience",
    "previous experience",
    "prior experience",

    # Summary & overview
    "career overview",
    "professional background",
    "work background",
    "experience summary",
    "career summary",
    "professional summary",
    "background",
    "about me",
    "profile",
    "professional profile",
    "career profile",
    "executive summary",
    "personal statement",
    "career statement",
    "overview",
    "introduction",
    "professional introduction",

    # Scoped / qualified
    "project experience",
    "relevant experience",
    "industry experience",
    "technical experience",
    "leadership experience",
    "internship experience",
    "volunteer experience",
    "freelance experience",
    "consulting experience",
    "research experience",
    "teaching experience",
    "clinical experience",
    "field experience",
    "hands-on experience",
    "practical experience",
    "on-the-job experience",
    "remote experience",
    "international experience",
    "cross-functional experience",
    "startup experience",
    "corporate experience",
    "agency experience",
    "military experience",
    "government experience",
    "nonprofit experience",
    "academic experience",
    "administrative experience",
    "operations experience",
    "sales experience",
    "management experience",
    "training experience",

    # Roles & positions
    "positions held",
    "roles",
    "jobs held",
    "appointments",
    "assignments",
    "engagements",
    "current role",
    "previous roles",
    "past roles",
    "current position",
    "previous positions",
    "past positions",
    "job titles",
    "titles held",

    # Accomplishments-focused
    "achievements",
    "accomplishments",
    "key contributions",
    "notable projects",
    "highlights",
    "career highlights",
    "professional achievements",
    "key achievements",
    "major accomplishments",
    "impact",
    "professional impact",
    "results",
    "key results",
    "contributions",

    # Internship / entry-level
    "internships",
    "co-op experience",
    "apprenticeship",
    "trainee experience",
    "graduate experience",
    "placement",
    "industrial placement",
    "work placement",
    "practicum",
    "externship",

    # Contract / freelance
    "contract work",
    "contract experience",
    "freelance work",
    "self-employed",
    "independent contractor",
    "gig experience",
    "part-time experience",
    "full-time experience",
    "casual work",

    # Portfolio / project-based
    "portfolio",
    "projects",
    "key projects",
    "selected projects",
    "notable work",
    "case studies",
    "work samples",
    "client work",
    "client experience",

    # Sector-specific
    "clinical rotations",
    "residency",
    "fellowship",
    "postdoctoral experience",
    "lab experience",
    "fieldwork",
    "practitioner experience",
    "industry background",
    "sector experience",
    "domain experience",
    "subject matter expertise",
    "area of expertise",
    "areas of expertise",
    "core competencies",
    "competencies",
    "specializations",
    "specialization",
]
    
    # EDUCATION_KEYWORDS = [
    #     "education", "academic", "qualification", "academic background",
    #     "educational background", "academic qualification"
    # ]

    EDUCATION_KEYWORDS = [
    # Core / generic
    "education",
    "academic",
    "academics",
    "qualification",
    "qualifications",
    "education and training",
    "education & training",

    # Background / history
    "academic background",
    "educational background",
    "academic qualification",
    "academic qualifications",
    "educational qualifications",
    "educational history",
    "academic history",
    "learning background",

    # Degrees & credentials
    "degrees",
    "degree",
    "diploma",
    "diplomas",
    "certificate",
    "certificates",
    "certification",
    "certifications",
    "credential",
    "credentials",
    "licensure",
    "license",
    "licenses",
    "accreditation",

    # Institutions
    "universities attended",
    "colleges attended",
    "institutions attended",
    "schools attended",
    "academic institutions",
    "alma mater",

    # Formal section headers
    "educational qualifications",
    "academic record",
    "academic credentials",
    "academic achievements",
    "educational achievements",
    "scholastic background",
    "scholastic record",
    "scholastic achievements",
    "learning history",

    # Summary / overview
    "education summary",
    "academic summary",
    "educational overview",
    "academic overview",
    "education profile",
    "academic profile",

    # Training & development
    "training",
    "training and development",
    "professional development",
    "professional training",
    "continuing education",
    "continuing professional development",
    "cpd",
    "further education",
    "further training",
    "additional training",
    "online training",
    "workshops",
    "seminars",
    "bootcamp",
    "bootcamps",
    "courses",
    "coursework",
    "online courses",
    "e-learning",

    # Scoped / specialized
    "technical education",
    "vocational education",
    "vocational training",
    "vocational qualifications",
    "technical training",
    "trade education",
    "trade certification",
    "professional education",
    "postgraduate education",
    "undergraduate education",
    "graduate education",
    "doctoral education",
    "postdoctoral training",
    "medical education",
    "legal education",

    # Specific degree types
    "bachelor",
    "bachelors",
    "bachelor's degree",
    "master",
    "masters",
    "master's degree",
    "doctorate",
    "doctoral degree",
    "phd",
    "mba",
    "associate degree",
    "undergraduate degree",
    "postgraduate degree",
    "honors degree",
    "advanced degree",
    "higher education",
    "higher national diploma",
    "hnd",
    "hnc",
    "foundation degree",
    "gnvq",
    "nvq",

    # Achievements within education
    "academic honors",
    "academic awards",
    "scholarships",
    "fellowships",
    "distinctions",
    "honors",
    "dean's list",
    "graduation",
    "graduated",
    "major",
    "minor",
    "concentration",
    "thesis",
    "dissertation",
    "research",
    "capstone",
    "final year project",

    # International / regional variants
    "matric",
    "matriculation",
    "secondary education",
    "primary education",
    "high school",
    "secondary school",
    "sixth form",
    "a levels",
    "o levels",
    "gcses",
    "leaving certificate",
    "baccalaureate",
    "international baccalaureate",
    "ib diploma",
    "12th grade",
    "10th grade",
    "ssc",
    "hsc",
    "cbse",
    "icse",
]
    
    @staticmethod
    def extract_sections(text: str) -> Dict[str, str]:
        """
        Extract EXPERIENCE and EDUCATION sections from resume text
        
        Args:
            text: Full resume text
            
        Returns:
            Dict with 'experience' and 'education' sections
        """
        # Try the stronger SectionSplitter first
        try:
            splitter = SectionSplitter()
            all_sections = splitter.split_sections(text)
            
            # Log sections before validation
            logger.info(f"📋 Sections before validation: {list(all_sections.keys())}")
            
            # Validate and correct sections using SectionValidator
            try:
                validator = SectionValidator()
                corrected_sections, _ = validator.validate_and_correct(all_sections)
                
                # Log sections after validation
                logger.info(f"✅ Sections after validation: {list(corrected_sections.keys())}")
                
                # Log any changes
                added_sections = set(corrected_sections.keys()) - set(all_sections.keys())
                removed_sections = set(all_sections.keys()) - set(corrected_sections.keys())
                
                if added_sections:
                    logger.info(f"➕ Added sections: {list(added_sections)}")
                if removed_sections:
                    logger.info(f"➖ Removed sections: {list(removed_sections)}")
                
                # Use corrected sections
                all_sections = corrected_sections
                
            except Exception as e:
                logger.warning(f"⚠️ SectionValidator failed: {e}, using uncorrected sections")
            
            # Extract only experience and education sections for backward compatibility
            sections = {
                'experience': all_sections.get('experience', ''),
                'education': all_sections.get('education', '')
            }
            
            # Check if we got valid results (at least one non-empty section)
            valid_sections = sum(1 for v in sections.values() if v.strip())
            
            if valid_sections >= 1:
                # SectionSplitter succeeded
                return sections
            else:
                # SectionSplitter returned empty results, trigger fallback
                logger.warning("⚠️ SectionSplitter returned empty sections, falling back to keyword-based detection")
                
        except Exception as e:
            logger.warning(f"⚠️ SectionSplitter failed with error: {e}, falling back to keyword-based detection")
        
        # FALLBACK: Original keyword-based detection
        logger.info("Using fallback keyword-based section detection")
        
        lines = text.split('\n')
        sections = {'experience': '', 'education': ''}
        current_section = None
        section_content = []
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if this line is a section header
            is_experience = any(keyword in line_lower for keyword in SectionExtractor.EXPERIENCE_KEYWORDS)
            is_education = any(keyword in line_lower for keyword in SectionExtractor.EDUCATION_KEYWORDS)
            
            # Detect section headers (usually short lines with keywords)
            if len(line_lower) < 50:
                if is_experience:
                    if current_section and section_content:
                        sections[current_section] = '\n'.join(section_content)
                    current_section = 'experience'
                    section_content = []
                    continue
                elif is_education:
                    if current_section and section_content:
                        sections[current_section] = '\n'.join(section_content)
                    current_section = 'education'
                    section_content = []
                    continue
            
            # Add content to current section
            if current_section and line.strip():
                section_content.append(line)
        
        # Save last section
        if current_section and section_content:
            sections[current_section] = '\n'.join(section_content)
        
        return sections


class TextChunker:
    """Chunk text with overlap for model processing"""
    
    def __init__(self, tokenizer, chunk_size: int = 450, overlap: int = 50):
        """
        Initialize chunker
        
        Args:
            tokenizer: HuggingFace tokenizer
            chunk_size: Maximum tokens per chunk
            overlap: Overlapping tokens between chunks
        """
        self.tokenizer = tokenizer
        self.chunk_size = chunk_size
        self.overlap = overlap
    
    @staticmethod
    def preprocess_text(text: str) -> str:
        """
        Pre-process text to normalize format for better model inference
        
        Args:
            text: Raw text
            
        Returns:
            Normalized text
        """
        import re
        
        # Convert "Client XYZ" to "Company: XYZ" format
        text = re.sub(r'\bClient\s+', 'Company: ', text, flags=re.IGNORECASE)
        
        # Normalize "Role" and "Duration" keywords
        text = re.sub(r'\bRole\s+', 'Role: ', text, flags=re.IGNORECASE)
        text = re.sub(r'\bDuration\s+', 'Duration: ', text, flags=re.IGNORECASE)
        
        return text
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Chunk text into overlapping segments
        
        Args:
            text: Text to chunk
            
        Returns:
            List of text chunks
        """
        # Tokenize full text
        tokens = self.tokenizer.encode(text, add_special_tokens=False)
        
        chunks = []
        start = 0
        
        while start < len(tokens):
            # Get chunk
            end = min(start + self.chunk_size, len(tokens))
            chunk_tokens = tokens[start:end]
            
            # Decode chunk
            chunk_text = self.tokenizer.decode(chunk_tokens, skip_special_tokens=True)
            chunks.append(chunk_text)
            
            # Move to next chunk with overlap
            if end >= len(tokens):
                break
            start = end - self.overlap
        
        return chunks
    
    @staticmethod
    def filter_relevant_chunks(chunks: List[str]) -> List[str]:
        """
        Filter chunks that contain experience or education keywords
        
        Args:
            chunks: List of text chunks
            
        Returns:
            Filtered chunks containing relevant keywords
        """
        relevant_keywords = [
            # Experience keywords
            'worked', 'developer', 'engineer', 'role', 'company', 'position',
            'responsibilities', 'duration', 'present', 'current',
            # Education keywords
            'bachelor', 'master', 'degree', 'university', 'college', 'institute',
            'b.tech', 'm.tech', 'btech', 'mtech', 'graduation', 'phd'
        ]
        
        filtered = []
        for chunk in chunks:
            chunk_lower = chunk.lower()
            if any(keyword in chunk_lower for keyword in relevant_keywords):
                filtered.append(chunk)
        
        return filtered


class ModelInference:
    """Wrapper for DeBERTa model inference"""
    
    def __init__(self, model_path: str):
        """
        Initialize model
        
        Args:
            model_path: Path to trained model
        """
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForTokenClassification.from_pretrained(model_path)
        self.model.eval()
        
        # Load label mappings
        with open(f"{model_path}/label_mappings.json", 'r') as f:
            label_mappings = json.load(f)
        self.id2label = {int(k): v for k, v in label_mappings['id2label'].items()}
    
    def extract_entities(self, text: str) -> List[Dict[str, str]]:
        """
        Extract entities from text
        
        Args:
            text: Text to process
            
        Returns:
            List of entities with text, label, and confidence
        """
        # Pre-process text to normalize format
        text = TextChunker.preprocess_text(text)
        
        # Tokenize
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            return_offsets_mapping=True
        )
        offset_mapping = inputs.pop("offset_mapping")[0]
        
        # Predict
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        predictions = torch.argmax(outputs.logits, dim=2)[0]
        tokens = self.tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
        
        # Extract entities
        entities = []
        current_entity = None
        current_text = ""
        current_label = None
        
        for idx, (token, pred_id, offset) in enumerate(zip(tokens, predictions, offset_mapping)):
            if token in ['<s>', '</s>', '<pad>']:
                continue
            
            label = self.id2label[pred_id.item()]
            start, end = offset
            
            if start == end:
                continue
            
            actual_text = text[start:end]
            
            if label.startswith('B-'):
                # Save previous entity
                if current_entity:
                    entities.append({
                        'text': current_text.strip(),
                        'label': current_label
                    })
                
                # Start new entity
                current_label = label[2:]
                current_text = actual_text
                current_entity = True
                
            elif label.startswith('I-') and current_entity and label[2:] == current_label:
                # Continue entity
                current_text += actual_text
                
            else:
                # End entity
                if current_entity:
                    entities.append({
                        'text': current_text.strip(),
                        'label': current_label
                    })
                    current_entity = None
                    current_text = ""
                    current_label = None
        
        # Add last entity
        if current_entity:
            entities.append({
                'text': current_text.strip(),
                'label': current_label
            })
        
        return entities


class PostProcessor:
    """Post-process extracted entities"""
    
    # Common person name patterns
    PERSON_NAME_PATTERNS = [
        r'^[A-Z][a-z]+ [A-Z][a-z]+$',  # First Last
        r'^[A-Z]\. [A-Z][a-z]+$',       # F. Last
        r'^[A-Z][a-z]+ [A-Z]\.$',       # First L.
    ]
    
    # Common skills/technologies to remove from DEGREE
    SKILL_KEYWORDS = [
        'react', 'node', 'python', 'java', 'javascript', 'typescript',
        'angular', 'vue', 'django', 'flask', 'spring', 'aws', 'docker',
        'kubernetes', 'mongodb', 'sql', 'mysql', 'postgresql', 'redis',
        'html', 'css', 'git', 'jenkins', 'ci/cd', 'agile', 'scrum'
    ]
    
    @staticmethod
    def is_person_name(text: str) -> bool:
        """Check if text looks like a person name"""
        text = text.strip()
        
        # Exclude company suffixes
        company_suffixes = [
            'corporation', 'corp', 'inc', 'llc', 'ltd', 'limited', 
            'company', 'co', 'group', 'services', 'solutions', 'technologies',
            'systems', 'consulting', 'partners', 'associates', 'holdings',
            'enterprises', 'industries', 'international', 'global', 'worldwide',
            'airlines', 'airways', 'bank', 'financial', 'insurance', 'healthcare'
        ]
        
        text_lower = text.lower()
        if any(suffix in text_lower for suffix in company_suffixes):
            return False  # It's a company, not a person
        
        # Check patterns
        for pattern in PostProcessor.PERSON_NAME_PATTERNS:
            if re.match(pattern, text):
                return True
        
        # Check if it's exactly 2 capitalized words (typical person name)
        # But NOT 3+ words (more likely company name)
        words = text.split()
        if len(words) == 2:
            if all(word[0].isupper() and len(word) > 1 for word in words):
                # Additional check: person names are usually shorter
                if len(text) < 30:  # Person names rarely exceed 30 chars
                    return True
        
        return False
    
    @staticmethod
    def is_skill(text: str) -> bool:
        """Check if text is a skill/technology"""
        text_lower = text.lower().strip()
        return any(skill in text_lower for skill in PostProcessor.SKILL_KEYWORDS)
    
    @staticmethod
    def clean_entities(entities: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Clean entities by removing person names from COMPANY and skills from DEGREE
        
        Args:
            entities: List of extracted entities
            
        Returns:
            Cleaned entities
        """
        cleaned = []
        
        for entity in entities:
            label = entity['label']
            text = entity['text']
            
            # Remove person names from COMPANY
            if label == 'COMPANY' and PostProcessor.is_person_name(text):
                continue
            
            # Remove skills from DEGREE
            if label == 'DEGREE' and PostProcessor.is_skill(text):
                continue
            
            cleaned.append(entity)
        
        return cleaned


class ResumeParser:
    """Main resume parsing pipeline"""
    
    def __init__(self, model_path: str):
        """
        Initialize parser
        
        Args:
            model_path: Path to trained model
        """
        self.model = ModelInference(model_path)
        self.chunker = TextChunker(self.model.tokenizer, chunk_size=450, overlap=50)
    
    def parse(self, resume_text: str, file_path: Optional[str] = None) -> Dict:
        """
        Parse resume and extract structured data following strict pipeline order.
        
        Pipeline Flow:
        1. TextExtractor: Extract plain text + font metadata
        2. SectionSplitter: Split sections using text + font metadata
        3. SectionValidator: Validate and correct sections
        4. DeBERTa: Extract entities from experience/education only
        5. Collect: Gather remaining sections for display
        6. Return: Structured dictionary with all data
        
        Args:
            resume_text: Full resume text (plain text or file path)
            file_path: Optional file path for font metadata extraction
            
        Returns:
            Structured dictionary with:
            - experience: List of experience entries with entities
            - education: List of education entries with entities
            - sections: All detected sections (skills, summary, etc.)
            - metadata: Extraction metadata
        """
        import time
        start_time = time.time()
        
        logger.info("="*80)
        logger.info("🚀 STARTING RESUME PARSING PIPELINE")
        logger.info("="*80)
        
        # STEP 1: Extract text and font metadata
        logger.info("\n📄 STEP 1: Text Extraction")
        logger.info("-"*80)
        
        text = resume_text
        font_metadata = {}
        baseline_font_size = 11.0
        extraction_method = "direct_text"
        actual_extraction_tool = None
        
        if file_path:
            try:
                extractor = TextExtractor()
                
                # Determine file type and extraction method
                file_ext = file_path.lower().split('.')[-1]
                
                if file_ext == 'pdf':
                    # Try to determine which PDF method was used
                    result = extractor.extract_from_pdf(file_path)
                    actual_extraction_tool = result.get('method_used', 'unknown')
                    text = result['text']
                    
                    # Get font metadata separately
                    try:
                        text, font_metadata = extractor.extract_with_font_metadata(file_path)
                        baseline_font_size = extractor.calculate_baseline_font_size(font_metadata)
                    except:
                        pass
                    
                    logger.info(f"✅ PDF extraction method: {actual_extraction_tool}")
                    
                elif file_ext == 'docx':
                    text, font_metadata = extractor.extract_with_font_metadata(file_path)
                    baseline_font_size = extractor.calculate_baseline_font_size(font_metadata)
                    actual_extraction_tool = "python-docx"
                    logger.info(f"✅ DOCX extraction method: {actual_extraction_tool}")
                    
                else:
                    text, font_metadata = extractor.extract_with_font_metadata(file_path)
                    baseline_font_size = extractor.calculate_baseline_font_size(font_metadata)
                    actual_extraction_tool = "direct"
                    logger.info(f"✅ Text extraction method: {actual_extraction_tool}")
                
                extraction_method = "file_extraction"
                logger.info(f"✅ Extracted text: {len(text)} chars")
                logger.info(f"✅ Font metadata entries: {len(font_metadata)}")
                logger.info(f"✅ Baseline font size: {baseline_font_size}")
                
            except Exception as e:
                logger.warning(f"⚠️ File extraction failed: {e}, using direct text")
                text = resume_text
                actual_extraction_tool = "fallback_direct_text"
        else:
            logger.info("ℹ️ No file path provided, using direct text input")
            actual_extraction_tool = "direct_text"
        
        # STEP 2: Split sections with font metadata
        logger.info("\n📋 STEP 2: Section Splitting")
        logger.info("-"*80)
        
        try:
            splitter = SectionSplitter()
            all_sections = splitter.split_sections(text, font_metadata, baseline_font_size)
            logger.info(f"✅ Detected {len(all_sections)} sections: {list(all_sections.keys())}")
        except Exception as e:
            logger.error(f"❌ Section splitting failed: {e}")
            all_sections = {'other': text}
        
        # STEP 3: Validate and correct sections
        logger.info("\n✅ STEP 3: Section Validation & Correction")
        logger.info("-"*80)
        
        sections_before_validation = len(all_sections)
        sections_before_keys = set(all_sections.keys())
        
        try:
            validator = SectionValidator()
            corrected_sections, _ = validator.validate_and_correct(all_sections)
            
            sections_after_validation = len(corrected_sections)
            sections_after_keys = set(corrected_sections.keys())
            
            # Track changes
            added_sections = sections_after_keys - sections_before_keys
            removed_sections = sections_before_keys - sections_after_keys
            sections_corrected = sections_before_validation - sections_after_validation + len(added_sections)
            
            logger.info(f"✅ Sections before validation: {sections_before_validation}")
            logger.info(f"✅ Sections after validation: {sections_after_validation}")
            logger.info(f"✅ Sections corrected by validator: {sections_corrected}")
            
            if added_sections:
                logger.info(f"   ➕ Added sections: {list(added_sections)}")
            if removed_sections:
                logger.info(f"   ➖ Removed sections: {list(removed_sections)}")
            
            logger.info(f"✅ Final sections: {list(corrected_sections.keys())}")
            
        except Exception as e:
            logger.warning(f"⚠️ Section validation failed: {e}, using uncorrected sections")
            corrected_sections = all_sections
            sections_corrected = 0
        
        # ============================================================
        # CONSOLE PREVIEW: Print detailed section information
        # ============================================================
        print("=" * 60)
        print("RESUME SECTION PREVIEW")
        print("=" * 60)
        print(f"File: {file_path if file_path else 'Direct text input'}")
        print(f"Extraction method: {actual_extraction_tool or 'direct_text'}")
        print(f"Raw text characters: {len(text)}")
        print()
        print(f"SECTIONS DETECTED: {len(corrected_sections)}")
        print("-" * 40)
        
        for section_name, section_text in corrected_sections.items():
            print(f"{section_name.upper()}:")
            print(f"Character count: {len(section_text)}")
            
            if not section_text or not section_text.strip():
                print("[EMPTY]")
            else:
                # Print preview (first 300 characters)
                preview_text = section_text[:300]
                if len(section_text) > 300:
                    preview_text += "..."
                print(f"Preview: {preview_text}")
            print("-" * 40)
        
        print("=" * 60)
        # ============================================================
        
        # STEP 4: Extract entities from experience and education ONLY
        logger.info("\n🤖 STEP 4: Entity Extraction (DeBERTa)")
        logger.info("-"*80)
        
        experience_text = corrected_sections.get('experience', '').strip()
        education_text = corrected_sections.get('education', '').strip()
        
        all_entities = []
        
        # Log which sections are being passed to DeBERTa
        sections_passed_to_deberta = []
        if experience_text:
            sections_passed_to_deberta.append('experience')
        if education_text and education_text != experience_text:
            sections_passed_to_deberta.append('education')
        
        logger.info(f"📤 Sections passed to DeBERTa: {sections_passed_to_deberta if sections_passed_to_deberta else ['none - using fallback']}")
        
        # Fallback to chunking if sections not found
        if not experience_text and not education_text:
            logger.warning("⚠️ No experience/education sections found, using chunking fallback")
            chunks = self.chunker.chunk_text(text)
            relevant_chunks = TextChunker.filter_relevant_chunks(chunks)
            combined_text = '\n'.join(relevant_chunks)
            experience_text = combined_text
            education_text = combined_text
            logger.info(f"   📦 Created {len(chunks)} chunks, {len(relevant_chunks)} relevant")
        
        if experience_text:
            logger.info(f"   🔍 Extracting from EXPERIENCE ({len(experience_text)} chars)...")
            exp_entities = self.model.extract_entities(experience_text)
            all_entities.extend(exp_entities)
            logger.info(f"   ✅ Found {len(exp_entities)} raw entities in experience")
        
        if education_text and education_text != experience_text:
            logger.info(f"   🔍 Extracting from EDUCATION ({len(education_text)} chars)...")
            edu_entities = self.model.extract_entities(education_text)
            all_entities.extend(edu_entities)
            logger.info(f"   ✅ Found {len(edu_entities)} raw entities in education")
        
        # Post-process entities
        entities_before_cleaning = len(all_entities)
        cleaned_entities = PostProcessor.clean_entities(all_entities)
        entities_removed = entities_before_cleaning - len(cleaned_entities)
        
        logger.info(f"✅ Total entities before cleaning: {entities_before_cleaning}")
        logger.info(f"✅ Total entities after cleaning: {len(cleaned_entities)}")
        if entities_removed > 0:
            logger.info(f"   🧹 Removed {entities_removed} invalid entities")
        
        # STEP 5: Extract basic info and collect sections
        logger.info("\n📦 STEP 5: Extracting Basic Info & Collecting Sections")
        logger.info("-"*80)
        
        # Extract basic info (name, email, phone) from text
        basic_info = self._extract_basic_info(text)
        logger.info(f"   • Name: {basic_info.get('name', 'Not found')}")
        logger.info(f"   • Email: {basic_info.get('email', 'Not found')}")
        logger.info(f"   • Phone: {basic_info.get('phone', 'Not found')}")
        
        # STEP 6: Structure and return complete output
        logger.info("\n📊 STEP 6: Structuring Output")
        logger.info("-"*80)
        
        # Structure experience and education with entities (DeBERTa output)
        parsed_entities = self._structure_output(cleaned_entities)
        
        # Build complete output dictionary with exact keys
        output = {
            'basic_info': {
                'name': basic_info.get('name', ''),
                'email': basic_info.get('email', ''),
                'phone': basic_info.get('phone', '')
            },
            'experience': corrected_sections.get('experience', ''),
            'education': corrected_sections.get('education', ''),
            'skills': corrected_sections.get('skills', ''),
            'summary': corrected_sections.get('summary', ''),
            'certifications': corrected_sections.get('certifications', ''),
            'projects': corrected_sections.get('projects', ''),
            'parsed': {
                'experience': parsed_entities.get('experience', []),
                'education': parsed_entities.get('education', [])
            }
        }
        
        logger.info(f"✅ Basic info extracted: {bool(basic_info.get('name'))}")
        logger.info(f"✅ Experience section: {len(output['experience'])} chars")
        logger.info(f"✅ Education section: {len(output['education'])} chars")
        logger.info(f"✅ Skills section: {len(output['skills'])} chars")
        logger.info(f"✅ Summary section: {len(output['summary'])} chars")
        logger.info(f"✅ Certifications section: {len(output['certifications'])} chars")
        logger.info(f"✅ Projects section: {len(output['projects'])} chars")
        logger.info(f"✅ Parsed entities: {len(parsed_entities.get('experience', []))} exp, {len(parsed_entities.get('education', []))} edu")
        
        # Calculate total processing time
        end_time = time.time()
        processing_time_ms = (end_time - start_time) * 1000
        
        logger.info("\n" + "="*80)
        logger.info("✅ PARSING COMPLETE")
        logger.info("="*80)
        
        # Comprehensive summary log
        logger.info("\n📊 PIPELINE SUMMARY:")
        logger.info(f"   🔧 Text extraction method: {actual_extraction_tool or 'direct_text'}")
        logger.info(f"   📋 Sections detected after splitting: {sections_before_validation}")
        logger.info(f"   ✅ Sections corrected by validator: {sections_corrected}")
        logger.info(f"   📤 Sections passed to DeBERTa: {sections_passed_to_deberta if sections_passed_to_deberta else ['none']}")
        logger.info(f"   ⏱️  Total processing time: {processing_time_ms:.2f} ms")
        logger.info("="*80)
        
        return output
    
    def _extract_basic_info(self, text: str) -> Dict[str, str]:
        """
        Extract basic information (name, email, phone) from resume text.
        
        Args:
            text: Full resume text
            
        Returns:
            Dictionary with 'name', 'email', 'phone' keys
        """
        basic_info = {
            'name': '',
            'email': '',
            'phone': ''
        }
        
        lines = text.split('\n')
        
        # Extract email using regex
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for line in lines[:10]:  # Check first 10 lines
            email_match = re.search(email_pattern, line)
            if email_match:
                basic_info['email'] = email_match.group(0)
                break
        
        # Extract phone using regex (various formats)
        phone_patterns = [
            r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # +1 (555) 123-4567
            r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # (555) 123-4567
            r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # 555-123-4567
            r'\+?\d{10,15}'  # +15551234567
        ]
        
        for line in lines[:10]:  # Check first 10 lines
            for pattern in phone_patterns:
                phone_match = re.search(pattern, line)
                if phone_match:
                    basic_info['phone'] = phone_match.group(0)
                    break
            if basic_info['phone']:
                break
        
        # Extract name (heuristic: first non-empty line that's not email/phone)
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            if not line:
                continue
            
            # Skip if line contains email or phone
            if basic_info['email'] and basic_info['email'] in line:
                continue
            if basic_info['phone'] and basic_info['phone'] in line:
                continue
            
            # Skip common header keywords
            skip_keywords = ['resume', 'cv', 'curriculum vitae', 'profile', 'contact']
            if any(keyword in line.lower() for keyword in skip_keywords):
                continue
            
            # Check if line looks like a name (2-4 words, mostly alphabetic)
            words = line.split()
            if 2 <= len(words) <= 4:
                # Check if mostly alphabetic
                alpha_ratio = sum(c.isalpha() or c.isspace() for c in line) / len(line) if line else 0
                if alpha_ratio > 0.7:
                    basic_info['name'] = line
                    break
        
        return basic_info
    
    def _structure_output(self, entities: List[Dict[str, str]]) -> Dict:
        """
        Structure entities into experience and education format
        
        Args:
            entities: List of cleaned entities
            
        Returns:
            Structured output
        """
        # Group entities by type
        companies = [e['text'] for e in entities if e['label'] == 'COMPANY']
        roles = [e['text'] for e in entities if e['label'] == 'ROLE']
        locations = [e['text'] for e in entities if e['label'] == 'LOCATION']
        start_dates = [e['text'] for e in entities if e['label'] == 'START_DATE']
        end_dates = [e['text'] for e in entities if e['label'] == 'END_DATE']
        degrees = [e['text'] for e in entities if e['label'] == 'DEGREE']
        institutions = [e['text'] for e in entities if e['label'] == 'EDUCATION']
        
        # Build experience entries
        experience = []
        max_exp = max(len(companies), len(roles))
        
        for i in range(max_exp):
            exp_entry = {
                'company': companies[i] if i < len(companies) else '',
                'role': roles[i] if i < len(roles) else '',
                'start_date': start_dates[i] if i < len(start_dates) else '',
                'end_date': end_dates[i] if i < len(end_dates) else '',
                'location': locations[i] if i < len(locations) else ''
            }
            
            # Only add if has meaningful data
            if exp_entry['company'] or exp_entry['role']:
                experience.append(exp_entry)
        
        # Build education entries
        education = []
        max_edu = max(len(degrees), len(institutions))
        
        # Track used start/end dates for experience
        exp_dates_used = max_exp
        
        for i in range(max_edu):
            edu_entry = {
                'degree': degrees[i] if i < len(degrees) else '',
                'institution': institutions[i] if i < len(institutions) else '',
                'start_date': start_dates[exp_dates_used + i] if (exp_dates_used + i) < len(start_dates) else '',
                'end_date': end_dates[exp_dates_used + i] if (exp_dates_used + i) < len(end_dates) else ''
            }
            
            # Only add if has meaningful data
            if edu_entry['degree'] or edu_entry['institution']:
                education.append(edu_entry)
        
        return {
            'experience': experience,
            'education': education
        }


# FastAPI compatible function
def parse_resume(resume_text: str, model_path: Optional[str] = None, file_path: Optional[str] = None) -> Dict:
    """
    Parse resume text and extract structured information
    
    Args:
        resume_text: Full resume text (plain text from PDF/DOC)
        model_path: Path to trained model
        file_path: Optional file path for font metadata extraction
        
    Returns:
        Structured resume data with exact keys:
        {
            'basic_info': {
                'name': str,
                'email': str,
                'phone': str
            },
            'experience': str,  # Experience section text or empty string
            'education': str,   # Education section text or empty string
            'skills': str,      # Skills section text or empty string
            'summary': str,     # Summary section text or empty string
            'certifications': str,  # Certifications section text or empty string
            'projects': str,    # Projects section text or empty string
            'parsed': {
                'experience': List[Dict],  # DeBERTa extracted entities
                'education': List[Dict]    # DeBERTa extracted entities
            }
        }
    """
    import os
    if model_path is None:
        if os.path.exists("ai-service/models/resume-ner-deberta/config.json"):
            model_path = "ai-service/models/resume-ner-deberta"
        elif os.path.exists("models/resume-ner-deberta/config.json"):
            model_path = "models/resume-ner-deberta"
        else:
            model_path = "./models/resume-ner-deberta"
            
    parser = ResumeParser(model_path)
    return parser.parse(resume_text, file_path)


if __name__ == "__main__":
    # Example usage
    sample_resume = """
    Anjan Yelle
    
    WORK EXPERIENCE:
    Software Developer
    Lalataksha Consulting Services Pvt Ltd
    Jan 2023 - Present
    Bangalore, India
    - Developed web applications using React.js and Node.js
    
    Software Developer
    Gatnix Technologies Pvt Ltd
    Jun 2021 - Dec 2022
    Hyderabad, India
    - Worked on mobile applications
    
    EDUCATION:
    Bachelor of Technology in Computer Science
    JNTU Hyderabad
    2016 - 2020
    """
    
    result = parse_resume(sample_resume)
    print(json.dumps(result, indent=2))
