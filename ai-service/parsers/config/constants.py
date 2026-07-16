"""Constants and thresholds for parsers."""

from typing import Dict


class ParserConstants:
    """Centralized constants for all parsers."""
    
    # ─── Date Validation ─────────────────────────────────────────────────────
    MIN_VALID_YEAR = 1980
    MAX_VALID_YEAR = 2030
    EPOCH_YEAR = 1970
    
    # ─── Confidence Scoring ──────────────────────────────────────────────────
    FIELD_WEIGHTS: Dict[str, float] = {
        'email': 0.15,
        'phone': 0.10,
        'name': 0.20,
        'skills': 0.25,
        'experience': 0.20,
        'education': 0.10
    }
    
    MIN_CONFIDENCE_THRESHOLD = 0.5
    HIGH_CONFIDENCE_THRESHOLD = 0.85
    
    # Quality thresholds
    QUALITY_EXCELLENT = 0.85
    QUALITY_GOOD = 0.70
    QUALITY_FAIR = 0.60
    QUALITY_POOR = 0.40
    
    # ─── Skill Extraction ────────────────────────────────────────────────────
    MIN_SKILL_LENGTH = 2
    MAX_SKILL_LENGTH = 50
    MAX_SKILLS_PER_RESUME = 100
    FUZZY_MATCH_THRESHOLD = 0.85
    
    # ─── Text Processing ─────────────────────────────────────────────────────
    MAX_TEXT_LENGTH = 1_000_000  # 1MB
    MAX_SUMMARY_LENGTH = 1000
    MAX_DESCRIPTION_LENGTH = 5000
    
    # ─── Name Validation ─────────────────────────────────────────────────────
    MIN_NAME_LENGTH = 2
    MAX_NAME_LENGTH = 50
    MIN_NAME_WORDS = 2
    MAX_NAME_WORDS = 4
    
    # ─── Experience Validation ───────────────────────────────────────────────
    MIN_JOB_TITLE_LENGTH = 3
    MAX_JOB_TITLE_LENGTH = 100
    MIN_COMPANY_NAME_LENGTH = 2
    MAX_COMPANY_NAME_LENGTH = 100
    MIN_EXPERIENCE_MONTHS = 0
    MAX_EXPERIENCE_MONTHS = 600  # 50 years
    
    # ─── Education Validation ────────────────────────────────────────────────
    MIN_DEGREE_LENGTH = 2
    MAX_DEGREE_LENGTH = 100
    MIN_INSTITUTION_LENGTH = 3
    MAX_INSTITUTION_LENGTH = 200
    MIN_GPA = 0.0
    MAX_GPA_4_SCALE = 4.0
    MAX_GPA_10_SCALE = 10.0
    
    # ─── Section Detection ───────────────────────────────────────────────────
    SECTION_KEYWORDS = {
        'experience': [
            'experience', 'work history', 'employment', 'professional experience',
            'work experience', 'career history', 'employment history'
        ],
        'education': [
            'education', 'academic', 'qualification', 'academic background',
            'educational background', 'academic qualifications'
        ],
        'skills': [
            'skills', 'technical skills', 'core competencies', 'expertise',
            'technologies', 'proficiencies', 'technical expertise'
        ],
        'summary': [
            'summary', 'profile', 'objective', 'about', 'professional summary',
            'career objective', 'personal statement', 'overview'
        ],
        'projects': [
            'projects', 'key projects', 'notable projects', 'project experience'
        ],
        'certifications': [
            'certifications', 'certificates', 'licenses', 'professional certifications'
        ],
        'awards': [
            'awards', 'honors', 'achievements', 'recognition', 'accomplishments'
        ],
        'publications': [
            'publications', 'papers', 'research', 'articles'
        ]
    }
    
    # ─── NER Model Configuration ─────────────────────────────────────────────
    NER_MODEL_NAME = 'dslim/bert-base-NER'
    NER_SKILL_MODEL_NAME = 'Nucha/Nucha_ITSkillNER_BERT'
    NER_CONFIDENCE_THRESHOLD = 0.7
    
    # ─── Performance Limits ──────────────────────────────────────────────────
    PARSE_TIMEOUT_SECONDS = 30
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 1
    
    # ─── Logging ─────────────────────────────────────────────────────────────
    DEFAULT_LOG_LEVEL = 'INFO'
    DEBUG_LOG_LEVEL = 'DEBUG'
    
    # ─── File Processing ─────────────────────────────────────────────────────
    SUPPORTED_FILE_TYPES = ['pdf', 'docx', 'doc', 'txt']
    MAX_FILE_SIZE_MB = 10
    
    # ─── Normalization ───────────────────────────────────────────────────────
    COMPANY_SUFFIXES = [
        'Inc.', 'LLC', 'Ltd.', 'Corporation', 'Corp.', 'Company', 'Co.',
        'Limited', 'Pvt. Ltd.', 'Private Limited', 'LLP', 'LP'
    ]
    
    # ─── Critical Fields ─────────────────────────────────────────────────────
    CRITICAL_FIELDS = ['email', 'name', 'skills']
    RECOMMENDED_FIELDS = ['phone', 'experience', 'education']
    OPTIONAL_FIELDS = ['linkedin', 'github', 'website', 'summary', 'projects']
