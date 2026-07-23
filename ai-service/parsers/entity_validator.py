#!/usr/bin/env python3
"""
Entity Validator - Validates extracted companies and job titles against CSV databases.

This module provides hybrid validation combining:
1. Rule-based filtering (remove obvious errors)
2. Exact matching against CSV databases
3. Fuzzy matching for typos and variations
4. Confidence scoring for uncertain matches

Architecture:
Resume → DeBERTa NER → Entity Validator → Validated Output
"""

import os
import csv
import logging
from typing import Dict, List, Any, Tuple, Optional
from pathlib import Path
import re

logger = logging.getLogger(__name__)


class EntityValidator:
    """
    Validates extracted entities (companies, roles, clients) against reference databases.
    
    Uses a multi-stage validation pipeline:
    1. Rule-based filters (remove tech keywords, fragments, punctuation)
    2. Exact matching against CSV databases
    3. Fuzzy matching for close matches (Levenshtein distance)
    4. Confidence scoring
    """
    
    def __init__(self, companies_csv: str = None, roles_csv: str = None):
        """
        Initialize validator with CSV databases.
        
        Args:
            companies_csv: Path to global_companies.csv
            roles_csv: Path to it_job_roles.csv
        """
        self.logger = logging.getLogger(__name__)
        
        # Default paths
        base_dir = Path(__file__).parent.parent
        self.companies_csv = companies_csv or str(base_dir / "global_companies.csv")
        self.roles_csv = roles_csv or str(base_dir / "it_job_roles.csv")
        
        # Load databases
        self.valid_companies = set()
        self.valid_roles = set()
        self.company_variations = {}  # Normalized → Original
        self.role_variations = {}
        
        # Education validation
        self.valid_universities = set()
        self.valid_degrees = set()
        self.university_variations = {}
        self.degree_variations = {}
        
        self._load_databases()
        self._load_education_databases()
        self._load_tech_skills()
        
        # Technology keywords that should NEVER be companies or clients (fallback if file not found)
        self.tech_keywords = {
            # Cloud & Infrastructure
            'aws', 'aws cloud', 'azure', 'gcp', 'google cloud', 'cloud', 'docker', 
            'kubernetes', 'k8s', 'aws glue', 'aws lambda', 'ec2', 's3',
            # Databases
            'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'cassandra', 
            'dynamodb', 'snowflake', 'oracle', 'oracle and mysql', 'sql server',
            'bigquery', 'redshift', 'sap bw',
            # Programming Languages
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go', 
            'rust', 'scala', 'php', 'swift', 'kotlin', 'r',
            # Frameworks & Libraries
            'react', 'angular', 'vue', 'node', 'nodejs', 'express', 'django', 'flask', 
            'spring', 'spring boot', 'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy',
            # Data Tools
            'tableau', 'power bi', 'looker', 'dbt', 'airflow', 'kafka', 'spark', 
            'hadoop', 'databricks', 'informatica', 'ssis', 'ssrs',
            # DevOps & Tools
            'jenkins', 'gitlab', 'github', 'jira', 'confluence', 'terraform', 'ansible',
            'git', 'ci/cd', 'cicd', 'junit', 'mockito',
            # Generic terms
            'api', 'rest', 'graphql', 'microservices', 'agile', 'scrum', 'ml', 'ai',
            'etl', 'elt', 'pipeline', 'workflow', 'automation', 'gateways', 'payment gateways'
        }
        
        # Activity keywords that should NEVER be job titles
        self.activity_keywords = {
            'developed', 'designed', 'implemented', 'created', 'built', 'enhanced',
            'optimized', 'maintained', 'supported', 'collaborated', 'worked',
            'unit test cases', 'test cases', 'testing', 'debugging', 'deployment',
            'integration', 'configuration', 'installation', 'setup', 'migration'
        }
    
    def _load_databases(self):
        """Load company and role databases from CSV files."""
        # Load companies
        if os.path.exists(self.companies_csv):
            try:
                with open(self.companies_csv, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        # CSV structure: company_name, canonical_name, country, industry, aliases
                        company = row.get('company_name', '')
                        canonical = row.get('canonical_name', '')
                        aliases = row.get('aliases', '')
                        
                        # Add company name
                        if company:
                            self.valid_companies.add(company.strip())
                            normalized = self._normalize_text(company)
                            self.company_variations[normalized] = company.strip()
                        
                        # Add canonical name if different
                        if canonical and canonical != company:
                            self.valid_companies.add(canonical.strip())
                            normalized = self._normalize_text(canonical)
                            self.company_variations[normalized] = canonical.strip()
                        
                        # Add aliases (pipe-separated)
                        if aliases:
                            for alias in aliases.split('|'):
                                alias = alias.strip()
                                if alias:
                                    self.valid_companies.add(alias)
                                    normalized = self._normalize_text(alias)
                                    self.company_variations[normalized] = alias
                
                self.logger.info(f"✅ Loaded {len(self.valid_companies)} companies from CSV")
            except Exception as e:
                self.logger.error(f"Failed to load companies CSV: {e}")
        else:
            self.logger.warning(f"Companies CSV not found: {self.companies_csv}")
        
        # Load roles
        if os.path.exists(self.roles_csv):
            try:
                with open(self.roles_csv, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        # CSV structure: role_title, canonical_title, seniority, domain, aliases
                        role = row.get('role_title', '')
                        canonical = row.get('canonical_title', '')
                        aliases = row.get('aliases', '')
                        
                        # Add role title
                        if role:
                            self.valid_roles.add(role.strip())
                            normalized = self._normalize_text(role)
                            self.role_variations[normalized] = role.strip()
                        
                        # Add canonical title if different
                        if canonical and canonical != role:
                            self.valid_roles.add(canonical.strip())
                            normalized = self._normalize_text(canonical)
                            self.role_variations[normalized] = canonical.strip()
                        
                        # Add aliases (pipe-separated)
                        if aliases:
                            for alias in aliases.split('|'):
                                alias = alias.strip()
                                if alias:
                                    self.valid_roles.add(alias)
                                    normalized = self._normalize_text(alias)
                                    self.role_variations[normalized] = alias
                
                self.logger.info(f"✅ Loaded {len(self.valid_roles)} job roles from CSV")
            except Exception as e:
                self.logger.error(f"Failed to load roles CSV: {e}")
        else:
            self.logger.warning(f"Roles CSV not found: {self.roles_csv}")
    
    def _load_education_databases(self):
        """Load university and degree databases from Python files."""
        # Load universities
        universities_file = os.path.join(os.path.dirname(self.companies_csv), 'universities.py')
        if os.path.exists(universities_file):
            try:
                import importlib.util
                spec = importlib.util.spec_from_file_location("universities", universities_file)
                universities_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(universities_module)
                
                if hasattr(universities_module, 'COMPREHENSIVE_UNIVERSITIES'):
                    universities = universities_module.COMPREHENSIVE_UNIVERSITIES
                    for uni in universities:
                        self.valid_universities.add(uni.strip())
                        normalized = self._normalize_text(uni)
                        self.university_variations[normalized] = uni.strip()
                    
                    self.logger.info(f"✅ Loaded {len(self.valid_universities)} universities")
            except Exception as e:
                self.logger.error(f"Failed to load universities: {e}")
        else:
            self.logger.warning(f"Universities file not found: {universities_file}")
        
        # Load degrees
        degrees_file = os.path.join(os.path.dirname(self.companies_csv), 'education_details.py')
        if os.path.exists(degrees_file):
            try:
                import importlib.util
                spec = importlib.util.spec_from_file_location("education_details", degrees_file)
                degrees_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(degrees_module)
                
                if hasattr(degrees_module, 'education_details'):
                    degrees = degrees_module.education_details
                    for degree in degrees:
                        self.valid_degrees.add(degree.strip())
                        normalized = self._normalize_text(degree)
                        self.degree_variations[normalized] = degree.strip()
                    
                    self.logger.info(f"✅ Loaded {len(self.valid_degrees)} degree types")
            except Exception as e:
                self.logger.error(f"Failed to load degrees: {e}")
        else:
            self.logger.warning(f"Degrees file not found: {degrees_file}")
    
    def _load_tech_skills(self):
        """Load tech skills from skills_tech_non_tech.py file."""
        skills_file = os.path.join(os.path.dirname(self.companies_csv), 'skills_tech_non_tech (2).py')
        if os.path.exists(skills_file):
            try:
                import importlib.util
                spec = importlib.util.spec_from_file_location("skills_tech_non_tech", skills_file)
                skills_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(skills_module)
                
                if hasattr(skills_module, 'skills_tech_non_tech'):
                    skills = skills_module.skills_tech_non_tech
                    # Convert all to lowercase for case-insensitive matching
                    self.tech_keywords = {skill.lower().strip() for skill in skills}
                    
                    self.logger.info(f"✅ Loaded {len(self.tech_keywords)} tech skills from file")
                else:
                    self.logger.warning("skills_tech_non_tech variable not found in file, using fallback")
            except Exception as e:
                self.logger.error(f"Failed to load tech skills: {e}, using fallback")
        else:
            self.logger.warning(f"Tech skills file not found: {skills_file}, using fallback")
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for fuzzy matching (lowercase, remove punctuation)."""
        if not text:
            return ""
        # Lowercase, remove extra spaces, remove punctuation
        normalized = text.lower().strip()
        normalized = re.sub(r'[^\w\s]', '', normalized)  # Remove punctuation
        normalized = re.sub(r'\s+', ' ', normalized)  # Normalize spaces
        return normalized
    
    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings."""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def _fuzzy_match(self, text: str, candidates: dict, threshold: float = 0.85) -> Tuple[Optional[str], float]:
        """
        Find best fuzzy match from candidates.
        
        Args:
            text: Text to match
            candidates: Dict of {normalized: original} candidates
            threshold: Minimum similarity score (0-1)
            
        Returns:
            (matched_text, confidence_score) or (None, 0.0)
        """
        if not text or not candidates:
            return None, 0.0
        
        normalized_text = self._normalize_text(text)
        best_match = None
        best_score = 0.0
        
        for normalized_candidate, original_candidate in candidates.items():
            # Calculate similarity (1 - normalized_distance)
            distance = self._levenshtein_distance(normalized_text, normalized_candidate)
            max_len = max(len(normalized_text), len(normalized_candidate))
            similarity = 1.0 - (distance / max_len) if max_len > 0 else 0.0
            
            if similarity > best_score:
                best_score = similarity
                best_match = original_candidate
        
        if best_score >= threshold:
            return best_match, best_score
        
        return None, 0.0
    
    def validate_company(self, company: str) -> Tuple[bool, str, float, str]:
        """
        Validate a company name.
        
        Returns:
            (is_valid, corrected_name, confidence, reason)
        """
        if not company or not company.strip():
            return False, "", 0.0, "empty"
        
        company = company.strip()
        
        # Rule 1: Check if it's a technology keyword
        if self._normalize_text(company) in self.tech_keywords:
            self.logger.debug(f"❌ Rejected company (tech keyword): '{company}'")
            return False, "", 0.0, "tech_keyword"
        
        # Rule 2: Check if it's too short or just punctuation
        if len(company) < 2 or company in ['(', ')', '[', ']', ',', '.', '-', '_']:
            return False, "", 0.0, "invalid_format"
        
        # Rule 3: Check if it's a fragment (lowercase single word)
        if len(company.split()) == 1 and company.islower() and len(company) < 5:
            return False, "", 0.0, "fragment"
        
        # Validation Stage 1: Exact match
        if company in self.valid_companies:
            return True, company, 1.0, "exact_match"
        
        # Validation Stage 2: Fuzzy match
        if self.company_variations:
            matched, confidence = self._fuzzy_match(company, self.company_variations, threshold=0.85)
            if matched:
                self.logger.info(f"🔧 Fuzzy matched company: '{company}' → '{matched}' (confidence: {confidence:.2f})")
                return True, matched, confidence, "fuzzy_match"
        
        # Validation Stage 3: Heuristic validation (if no CSV database)
        # Accept if it looks like a company (has company indicators)
        company_indicators = ['ltd', 'llc', 'inc', 'corp', 'pvt', 'limited', 'technologies', 
                             'solutions', 'systems', 'services', 'consulting', 'group']
        if any(indicator in company.lower() for indicator in company_indicators):
            return True, company, 0.7, "heuristic_match"
        
        # Accept multi-word capitalized names (likely companies)
        if len(company.split()) >= 2 and company[0].isupper():
            return True, company, 0.6, "multi_word_capitalized"
        
        # Accept single-word capitalized names (likely companies, e.g., Gatnix)
        if len(company.split()) == 1 and company[0].isupper() and len(company) >= 2:
            return True, company, 0.6, "single_word_capitalized"
        
        # Reject
        self.logger.debug(f"❌ Rejected company (no match): '{company}'")
        return False, "", 0.0, "no_match"
    
    def validate_role(self, role: str) -> Tuple[bool, str, float, str]:
        """
        Validate a job title/role.
        
        Returns:
            (is_valid, corrected_name, confidence, reason)
        """
        if not role or not role.strip():
            return False, "", 0.0, "empty"
        
        role = role.strip()
        
        # Rule 1: Check if it's an activity keyword
        if self._normalize_text(role) in self.activity_keywords:
            self.logger.debug(f"❌ Rejected role (activity): '{role}'")
            return False, "", 0.0, "activity_keyword"
        
        # Rule 2: Check if it's too short or just punctuation
        if len(role) < 2 or role in ['(', ')', '[', ']', ',', '.', '-', '_', 'S', 'Data']:
            return False, "", 0.0, "invalid_format"
        
        # Rule 3: Check if it's a technology keyword
        if self._normalize_text(role) in self.tech_keywords:
            return False, "", 0.0, "tech_keyword"
        
        # Validation Stage 1: Exact match
        if role in self.valid_roles:
            return True, role, 1.0, "exact_match"
        
        # Validation Stage 2: Fuzzy match
        if self.role_variations:
            matched, confidence = self._fuzzy_match(role, self.role_variations, threshold=0.80)
            if matched:
                self.logger.info(f"🔧 Fuzzy matched role: '{role}' → '{matched}' (confidence: {confidence:.2f})")
                return True, matched, confidence, "fuzzy_match"
        
        # Validation Stage 3: Heuristic validation
        # Accept if it contains job title keywords
        job_keywords = ['developer', 'engineer', 'manager', 'architect', 'analyst',
                       'designer', 'consultant', 'specialist', 'lead', 'senior',
                       'junior', 'director', 'coordinator', 'administrator',
                       'intern', 'trainee', 'programmer', 'technician', 'principal',
                       'vp', 'president', 'ceo', 'cto', 'founder', 'head', 'chief',
                       'officer', 'leader', 'executive', 'associate', 'assistant', 'expert']
        if any(keyword in role.lower() for keyword in job_keywords):
            return True, role, 0.7, "heuristic_match"
        
        # Accept multi-word capitalized titles (likely legitimate)
        if len(role.split()) >= 2 and role[0].isupper():
            return True, role, 0.6, "multi_word_capitalized"
        
        # Reject
        self.logger.debug(f"❌ Rejected role (no match): '{role}'")
        return False, "", 0.0, "no_match"
    
    def validate_client(self, client: str) -> Tuple[bool, str, float, str]:
        """
        Validate a client name (similar to company validation).
        
        Returns:
            (is_valid, corrected_name, confidence, reason)
        """
        if not client or not client.strip():
            return False, "", 0.0, "empty"
        
        client = client.strip()
        
        # Rule 1: Check if it's a technology keyword (common error)
        if self._normalize_text(client) in self.tech_keywords:
            self.logger.debug(f"❌ Rejected client (tech keyword): '{client}'")
            return False, "", 0.0, "tech_keyword"
        
        # Rule 2: Check if it's corrupted (contains parentheses fragments)
        if client.startswith('(') or client.endswith(')') or client in ['(', ')']:
            return False, "", 0.0, "corrupted"
        
        # Use company validation logic for clients
        return self.validate_company(client)
    
    def validate_work_experience(self, experience: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], Dict[str, Any]]:
        """
        Validate a complete work experience entry.
        
        Args:
            experience: Work experience dictionary
            
        Returns:
            (is_valid, corrected_experience, validation_metadata)
        """
        validated_exp = experience.copy()
        metadata = {
            'company_validation': {},
            'role_validation': {},
            'client_validation': {},
            'overall_confidence': 0.0,
            'issues': []
        }
        
        # Validate company
        company = experience.get('company_name', experience.get('company', ''))
        is_valid_company, corrected_company, company_conf, company_reason = self.validate_company(company)
        
        metadata['company_validation'] = {
            'original': company,
            'corrected': corrected_company,
            'confidence': company_conf,
            'reason': company_reason,
            'is_valid': is_valid_company
        }
        
        if is_valid_company:
            validated_exp['company_name'] = corrected_company
            validated_exp['company'] = corrected_company
        else:
            metadata['issues'].append(f"Invalid company: '{company}' ({company_reason})")
        
        # Validate role
        role = experience.get('job_title', experience.get('role', ''))
        is_valid_role, corrected_role, role_conf, role_reason = self.validate_role(role)
        
        metadata['role_validation'] = {
            'original': role,
            'corrected': corrected_role,
            'confidence': role_conf,
            'reason': role_reason,
            'is_valid': is_valid_role
        }
        
        if is_valid_role:
            validated_exp['job_title'] = corrected_role
            validated_exp['role'] = corrected_role
        else:
            metadata['issues'].append(f"Invalid role: '{role}' ({role_reason})")
        
        # Validate client
        client = experience.get('client', '')
        if client:
            is_valid_client, corrected_client, client_conf, client_reason = self.validate_client(client)
            
            metadata['client_validation'] = {
                'original': client,
                'corrected': corrected_client,
                'confidence': client_conf,
                'reason': client_reason,
                'is_valid': is_valid_client
            }
            
            if is_valid_client:
                validated_exp['client'] = corrected_client
                validated_exp['clients'] = [corrected_client]
            else:
                # Remove invalid client
                validated_exp['client'] = ''
                validated_exp['clients'] = []
                metadata['issues'].append(f"Invalid client: '{client}' ({client_reason})")
        
        # Calculate overall confidence
        confidences = [company_conf, role_conf]
        metadata['overall_confidence'] = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Determine if experience is valid (both company and role must be valid)
        is_valid = is_valid_company and is_valid_role
        
        return is_valid, validated_exp, metadata
    
    def filter_work_experiences(self, experiences: List[Dict[str, Any]], 
                                min_confidence: float = 0.6) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Filter and validate a list of work experiences.
        
        Args:
            experiences: List of work experience dictionaries
            min_confidence: Minimum confidence threshold to keep experience
            
        Returns:
            (valid_experiences, rejected_experiences_with_metadata)
        """
        valid_experiences = []
        rejected_experiences = []
        
        for exp in experiences:
            is_valid, validated_exp, metadata = self.validate_work_experience(exp)
            
            if is_valid and metadata['overall_confidence'] >= min_confidence:
                # Add validation metadata to experience
                validated_exp['validation'] = metadata
                valid_experiences.append(validated_exp)
                self.logger.info(f"✅ Valid experience: {validated_exp.get('job_title')} at {validated_exp.get('company_name')} (confidence: {metadata['overall_confidence']:.2f})")
            else:
                rejected_exp = {
                    'experience': exp,
                    'validation': metadata,
                    'reason': 'low_confidence' if metadata['overall_confidence'] < min_confidence else 'invalid_entities'
                }
                rejected_experiences.append(rejected_exp)
                self.logger.warning(f"❌ Rejected experience: {exp.get('job_title')} at {exp.get('company_name')} - {metadata.get('issues', [])}")
        
        self.logger.info(f"📊 Validation summary: {len(valid_experiences)} valid, {len(rejected_experiences)} rejected")
        
        return valid_experiences, rejected_experiences
    
    def validate_education(self, education: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], Dict[str, Any]]:
        """
        Validate and clean an education entry.
        
        Args:
            education: Education dictionary
            
        Returns:
            (is_valid, corrected_education, validation_metadata)
        """
        validated_edu = education.copy()
        metadata = {
            'institution_validation': {},
            'degree_validation': {},
            'issues': [],
            'corrections': []
        }
        
        # Validate and clean institution
        institution = (education.get('institution') or '').strip()
        if institution:
            # Check if it's a valid university
            normalized_inst = self._normalize_text(institution)
            
            # Exact match
            if normalized_inst in self.university_variations:
                corrected = self.university_variations[normalized_inst]
                validated_edu['institution'] = corrected
                metadata['institution_validation'] = {
                    'original': institution,
                    'corrected': corrected,
                    'is_valid': True,
                    'reason': 'exact_match'
                }
            # Fuzzy match
            elif self.university_variations:
                matched, confidence = self._fuzzy_match(institution, self.university_variations, threshold=0.80)
                if matched:
                    validated_edu['institution'] = matched
                    metadata['institution_validation'] = {
                        'original': institution,
                        'corrected': matched,
                        'is_valid': True,
                        'reason': 'fuzzy_match',
                        'confidence': confidence
                    }
                    metadata['corrections'].append(f"Institution: '{institution}' → '{matched}'")
        
        # Validate and clean degree
        degree = (education.get('degree') or '').strip()
        if degree:
            # Clean corrupted parentheses: "Bachelor of Technology (B.Tech" → "Bachelor of Technology"
            if '(' in degree and ')' not in degree:
                cleaned_degree = degree.split('(')[0].strip()
                validated_edu['degree'] = cleaned_degree
                metadata['corrections'].append(f"Degree: removed incomplete parenthesis '{degree}' → '{cleaned_degree}'")
                degree = cleaned_degree
            
            # Validate against degree database
            normalized_degree = self._normalize_text(degree)
            if normalized_degree in self.degree_variations:
                corrected = self.degree_variations[normalized_degree]
                validated_edu['degree'] = corrected
                metadata['degree_validation'] = {
                    'original': degree,
                    'corrected': corrected,
                    'is_valid': True,
                    'reason': 'exact_match'
                }
            elif self.degree_variations:
                matched, confidence = self._fuzzy_match(degree, self.degree_variations, threshold=0.80)
                if matched:
                    validated_edu['degree'] = matched
                    metadata['degree_validation'] = {
                        'original': degree,
                        'corrected': matched,
                        'is_valid': True,
                        'reason': 'fuzzy_match',
                        'confidence': confidence
                    }
                    metadata['corrections'].append(f"Degree: '{degree}' → '{matched}'")
        
        # Clean field of study
        field = (education.get('field_of_study') or '').strip()
        if field:
            # Remove single punctuation
            if field in ['(', ')', '[', ']', ',', '.']:
                validated_edu['field_of_study'] = None
                metadata['corrections'].append(f"Field: removed punctuation '{field}'")
            # Fix truncated fields: "Computer" → "Computer Science" (heuristic)
            elif field.lower() == 'computer':
                validated_edu['field_of_study'] = 'Computer Science'
                metadata['corrections'].append(f"Field: expanded '{field}' → 'Computer Science'")
        
        # Clean grade
        grade = (education.get('grade') or '').strip()
        if grade:
            # Fix corrupted GPA: "3.854.0" → "3.85/4.0" (only if no slash is present)
            if grade.count('.') > 1 and '/' not in grade:
                # Pattern: "3.854.0" → extract "3.85" and "4.0"
                parts = grade.split('.')
                if len(parts) >= 3:
                    gpa = f"{parts[0]}.{parts[1]}"
                    scale = f"{parts[2]}.{parts[3]}" if len(parts) > 3 else "4.0"
                    cleaned_grade = f"{gpa}/{scale}"
                    validated_edu['grade'] = cleaned_grade
                    metadata['corrections'].append(f"Grade: fixed format '{grade}' → '{cleaned_grade}'")
        
        # Determine if education is valid (has at least degree or institution)
        is_valid = bool(validated_edu.get('degree') or validated_edu.get('institution'))
        
        return is_valid, validated_edu, metadata
    
    def filter_education_entries(self, education_list: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Filter and validate a list of education entries.
        
        Args:
            education_list: List of education dictionaries
            
        Returns:
            (valid_education, rejected_education_with_metadata)
        """
        valid_education = []
        rejected_education = []
        
        for edu in education_list:
            is_valid, validated_edu, metadata = self.validate_education(edu)
            
            if is_valid:
                validated_edu['validation'] = metadata
                valid_education.append(validated_edu)
                
                if metadata.get('corrections'):
                    self.logger.info(f"✅ Validated education: {validated_edu.get('degree')} at {validated_edu.get('institution')}")
                    for correction in metadata['corrections']:
                        self.logger.info(f"   🔧 {correction}")
            else:
                rejected_edu = {
                    'education': edu,
                    'validation': metadata,
                    'reason': 'missing_degree_and_institution'
                }
                rejected_education.append(rejected_edu)
                self.logger.warning(f"❌ Rejected education: {metadata.get('issues', ['Invalid entry'])}")
        
        self.logger.info(f"📊 Education validation: {len(valid_education)} valid, {len(rejected_education)} rejected")
        
        return valid_education, rejected_education


# Singleton instance
_validator_instance = None

def get_validator() -> EntityValidator:
    """Get singleton validator instance."""
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = EntityValidator()
    return _validator_instance
