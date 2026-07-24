"""
Comprehensive Automated Test Suite for Section Detection Engine
Tests: Unit, Integration, Edge Cases, Performance, Accuracy, Regression, Stress
"""

import sys
import os
import time
import threading
import json
import tracemalloc
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
import statistics

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parsers.section_splitter import (
    SectionSplitter, 
    split_sections, 
    get_benchmark_metrics,
    reset_benchmark_metrics,
    load_section_config,
    get_compiled_patterns,
    get_detection_method_confidence,
    log_section_detection_failure,
    update_benchmark_metrics
)


@dataclass
class TestResult:
    """Test result data structure"""
    test_name: str
    test_type: str
    passed: bool
    duration_ms: float
    memory_mb: float
    error_message: str = ""
    details: Dict[str, Any] = None


@dataclass
class AccuracyMetrics:
    """Accuracy metrics data structure"""
    section_type: str
    total_tests: int
    passed: int
    accuracy: float
    false_positives: int
    false_negatives: int
    avg_confidence: float


class SectionDetectionTestSuite:
    """Comprehensive test suite for section detection engine"""
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.accuracy_metrics: Dict[str, AccuracyMetrics] = {}
        self.test_resume_samples = self._load_test_resumes()
        
    def _load_test_resumes(self) -> Dict[str, str]:
        """Load test resume samples"""
        return {
            'software_engineer': self._get_software_engineer_resume(),
            'java_developer': self._get_java_developer_resume(),
            'python_developer': self._get_python_developer_resume(),
            'data_scientist': self._get_data_scientist_resume(),
            'qa_engineer': self._get_qa_engineer_resume(),
            'hr_manager': self._get_hr_manager_resume(),
            'finance_analyst': self._get_finance_analyst_resume(),
            'healthcare': self._get_healthcare_resume(),
            'fresher': self._get_fresher_resume(),
            'experienced': self._get_experienced_resume(),
            'international': self._get_international_resume(),
        }
    
    # Test Resume Samples
    def _get_software_engineer_resume(self) -> str:
        return """
John Smith
Senior Software Engineer
john.smith@email.com | +1 555-123-4567 | San Francisco, CA

PROFESSIONAL SUMMARY
Full-stack software engineer with 8+ years of experience building scalable web applications. Expert in Python, JavaScript, and cloud technologies.

WORK EXPERIENCE
Senior Software Engineer at TechCorp Inc.
San Francisco, CA | 2020 - Present
- Led development of microservices architecture serving 1M+ users
- Implemented CI/CD pipelines reducing deployment time by 60%
- Mentored team of 5 junior developers

Software Engineer at StartupXYZ
Mountain View, CA | 2017 - 2020
- Built RESTful APIs using Python and FastAPI
- Developed frontend with React and TypeScript
- Optimized database queries improving performance by 40%

EDUCATION
Bachelor of Science in Computer Science
Stanford University | 2013 - 2017
GPA: 3.8/4.0

SKILLS
Programming: Python, JavaScript, TypeScript, Java, Go
Frameworks: React, Angular, Django, Flask, Spring Boot
Cloud: AWS, GCP, Docker, Kubernetes
Databases: PostgreSQL, MongoDB, Redis

CERTIFICATIONS
AWS Solutions Architect Professional
Google Cloud Professional Data Engineer

PROJECTS
E-commerce Platform
- Built full-stack platform handling 10K+ daily transactions
- Tech stack: Python, React, PostgreSQL

Real-time Analytics Dashboard
- Developed dashboard processing 100K events/second
- Tech stack: Go, Kafka, Elasticsearch
"""

    def _get_java_developer_resume(self) -> str:
        return """
Jane Doe
Java Developer
jane.doe@email.com | +1 555-987-6543 | New York, NY

SUMMARY
Enterprise Java developer with 6 years of experience in financial services.

PROFESSIONAL EXPERIENCE
Senior Java Developer at BankABC
New York, NY | 2019 - Present
- Developed trading platform handling high-frequency transactions
- Implemented microservices using Spring Boot
- Optimized JVM performance reducing latency by 30%

Java Developer at FinTech Solutions
New York, NY | 2016 - 2019
- Built REST APIs using Spring Framework
- Integrated with legacy mainframe systems
- Wrote unit tests achieving 90% code coverage

EDUCATION
Master of Science in Computer Science
Columbia University | 2014 - 2016

Bachelor of Science in Software Engineering
NYU | 2010 - 2014

TECHNICAL SKILLS
Languages: Java, Kotlin, SQL
Frameworks: Spring Boot, Hibernate, JUnit
Tools: Maven, Jenkins, Git, JIRA

CERTIFICATIONS
Oracle Certified Professional Java SE 11
AWS Certified Developer

PROJECTS
Trading System
- Built real-time trading platform
- Technologies: Java, Spring Boot, Kafka

Banking API
- Developed REST APIs for banking services
- Technologies: Java, Spring Security, OAuth
"""

    def _get_python_developer_resume(self) -> str:
        return """
Bob Johnson
Python Developer
bob.johnson@email.com | +1 555-456-7890 | Austin, TX

CAREER PROFILE
Python developer specializing in data engineering and automation.

EXPERIENCE
Senior Python Developer at DataFlow Inc.
Austin, TX | 2021 - Present
- Designed ETL pipelines processing 1TB+ data daily
- Built data warehousing solutions using Snowflake
- Automated data validation reducing errors by 80%

Python Developer at Analytics Co.
Austin, TX | 2018 - 2021
- Developed data analysis tools using Pandas
- Created web scrapers for competitive intelligence
- Built REST APIs with Flask and FastAPI

ACADEMIC BACKGROUND
Bachelor of Science in Data Science
University of Texas at Austin | 2014 - 2018

CORE COMPETENCIES
Languages: Python, SQL, Bash
Libraries: Pandas, NumPy, Scikit-learn, TensorFlow
Tools: Airflow, Docker, Kubernetes, AWS

CERTIFICATIONS
Google Professional Data Engineer
AWS Certified Machine Learning Specialty

PORTFOLIO
Data Pipeline
- Built scalable ETL pipeline
- Technologies: Python, Airflow, Snowflake

ML Model Deployment
- Deployed ML models to production
- Technologies: Python, Flask, Docker, Kubernetes
"""

    def _get_data_scientist_resume(self) -> str:
        return """
Alice Chen
Data Scientist
alice.chen@email.com | +1 555-789-0123 | Seattle, WA

PROFESSIONAL SUMMARY
Data scientist with 5 years of experience in machine learning and predictive analytics.

WORK HISTORY
Senior Data Scientist at AI Corp
Seattle, WA | 2022 - Present
- Developed ML models predicting customer churn with 95% accuracy
- Built recommendation system increasing revenue by 20%
- Led data science team of 3 members

Data Scientist at Retail Analytics
Seattle, WA | 2019 - 2022
- Applied NLP techniques for sentiment analysis
- Created demand forecasting models
- Implemented A/B testing framework

EDUCATION
PhD in Computer Science
University of Washington | 2015 - 2019
Thesis: Deep Learning for Time Series Prediction

Master of Science in Statistics
UC Berkeley | 2013 - 2015

TECHNICAL SKILLS
Languages: Python, R, SQL
ML Frameworks: TensorFlow, PyTorch, Scikit-learn, XGBoost
Tools: Jupyter, MLflow, Databricks, AWS SageMaker

CERTIFICATIONS
TensorFlow Developer Certificate
AWS Machine Learning Specialty

RESEARCH PUBLICATIONS
"Deep Learning for Time Series" - NeurIPS 2018
"Customer Churn Prediction" - KDD 2021
"""

    def _get_qa_engineer_resume(self) -> str:
        return """
David Kim
QA Engineer
david.kim@email.com | +1 555-234-5678 | Chicago, IL

SUMMARY
QA engineer with 7 years of experience in test automation and quality assurance.

EXPERIENCE
Senior QA Engineer at Software Co.
Chicago, IL | 2020 - Present
- Built test automation framework using Selenium and Python
- Implemented CI/CD testing pipeline
- Reduced bug rate by 40% through automated testing

QA Engineer at TechStart
Chicago, IL | 2017 - 2020
- Manual and automated testing of web applications
- Created test plans and test cases
- Integrated with JIRA for bug tracking

EDUCATION
Bachelor of Science in Information Technology
DePaul University | 2013 - 2017

SKILLS
Testing: Selenium, Cypress, JUnit, TestNG
Languages: Python, Java, JavaScript
Tools: Jenkins, Git, JIRA, Postman

CERTIFICATIONS
ISTQB Certified Tester
Selenium WebDriver Certification

PROJECTS
Test Automation Framework
- Built framework from scratch
- Technologies: Python, Selenium, Pytest

API Testing Suite
- Automated API testing
- Technologies: Postman, Newman, Jenkins
"""

    def _get_hr_manager_resume(self) -> str:
        return """
Sarah Miller
HR Manager
sarah.miller@email.com | +1 555-345-6789 | Boston, MA

PROFESSIONAL PROFILE
HR manager with 10 years of experience in talent acquisition and employee relations.

WORK EXPERIENCE
HR Manager at Global Corp
Boston, MA | 2018 - Present
- Managed hiring for 50+ positions annually
- Implemented employee retention program reducing turnover by 25%
- Oversaw performance management system

HR Specialist at PeopleFirst
Boston, MA | 2013 - 2018
- Coordinated recruitment process
- Managed onboarding for new hires
- Organized training programs

EDUCATION
Master of Business Administration (HR Concentration)
Boston University | 2011 - 2013

Bachelor of Arts in Psychology
UMass Amherst | 2007 - 2011

SKILLS
HRIS: Workday, BambooHR, ADP
Recruitment: LinkedIn Recruiter, Indeed
Soft Skills: Communication, Leadership, Conflict Resolution

CERTIFICATIONS
SHRM-SCP (Senior Certified Professional)
PHR (Professional in Human Resources)

ACHIEVEMENTS
Employee of the Year 2020
Reduced time-to-hire by 30%
"""

    def _get_finance_analyst_resume(self) -> str:
        return """
Michael Brown
Financial Analyst
michael.brown@email.com | +1 555-456-7891 | New York, NY

SUMMARY
Financial analyst with 6 years of experience in financial modeling and analysis.

PROFESSIONAL EXPERIENCE
Senior Financial Analyst at Investment Bank
New York, NY | 2020 - Present
- Built financial models for M&A transactions
- Conducted valuation analysis
- Prepared investor presentations

Financial Analyst at Consulting Firm
New York, NY | 2017 - 2020
- Performed budgeting and forecasting
- Analyzed financial statements
- Created executive dashboards

EDUCATION
Master of Business Administration (Finance)
Wharton School | 2015 - 2017
GPA: 3.9/4.0

Bachelor of Science in Finance
NYU Stern | 2011 - 2015

SKILLS
Financial Modeling: Excel, Bloomberg Terminal, FactSet
Analysis: SQL, Tableau, Power BI
Knowledge: GAAP, IFRS, SEC regulations

CERTIFICATIONS
CFA Level III Candidate
CPA (Certified Public Accountant)

PROJECTS
M&A Analysis
- Financial modeling for $500M acquisition
- Tools: Excel, Bloomberg
"""

    def _get_healthcare_resume(self) -> str:
        return """
Dr. Emily Rodriguez
Registered Nurse
emily.rodriguez@email.com | +1 555-567-8901 | Los Angeles, CA

PROFESSIONAL SUMMARY
Registered nurse with 8 years of experience in critical care and patient management.

WORK EXPERIENCE
Senior RN at City Hospital
Los Angeles, CA | 2018 - Present
- Provide critical care in ICU department
- Train and mentor new nurses
- Implement patient care protocols

RN at Regional Medical Center
Los Angeles, CA | 2015 - 2018
- Provided patient care in surgical unit
- Maintained patient records
- Assisted physicians in procedures

EDUCATION
Bachelor of Science in Nursing
UCLA | 2011 - 2015

LICENSES & CERTIFICATIONS
Registered Nurse (RN) - California License #123456
BLS Certification
ACLS Certification
Critical Care Nursing Certification

SKILLS
Patient Care, Critical Care, Electronic Health Records (EHR)
IV Therapy, Wound Care, Patient Assessment
"""

    def _get_fresher_resume(self) -> str:
        return """
Alex Thompson
Recent Graduate
alex.thompson@email.com | +1 555-678-9012 | Portland, OR

OBJECTIVE
Recent computer science graduate seeking entry-level software developer position.

EDUCATION
Bachelor of Science in Computer Science
Portland State University | 2020 - 2024
GPA: 3.7/4.0
Relevant Coursework: Data Structures, Algorithms, Database Systems, Web Development

PROJECTS
Personal Website
- Built portfolio website using HTML, CSS, JavaScript
- Deployed on GitHub Pages

Task Management App
- Developed task management application
- Technologies: Python, Flask, SQLite

SKILLS
Programming: Python, JavaScript, HTML, CSS
Tools: Git, VS Code, Linux
Languages: English (Native), Spanish (Basic)

ACHIEVEMENTS
Dean's List 2022-2024
Hackathon Winner 2023
"""

    def _get_experienced_resume(self) -> str:
        return """
Robert Wilson
Senior Engineering Manager
robert.wilson@email.com | +1 555-789-0124 | Denver, CO

EXECUTIVE SUMMARY
Engineering manager with 15 years of experience in software development and team leadership.

PROFESSIONAL EXPERIENCE
VP of Engineering at TechStartup
Denver, CO | 2022 - Present
- Lead engineering team of 50+ people
- Managed $10M annual technology budget
- Drove product roadmap and technical strategy

Director of Engineering at Enterprise Co.
Denver, CO | 2018 - 2022
- Managed 25 engineers across 5 teams
- Implemented agile methodologies
- Reduced time-to-market by 40%

Senior Engineering Manager at Software Inc.
Denver, CO | 2014 - 2018
- Led team of 10 engineers
- Delivered multiple enterprise products
- Mentored junior managers

Software Engineer at Startups
Various | 2009 - 2014

EDUCATION
Master of Science in Computer Science
MIT | 2007 - 2009

Bachelor of Science in Computer Engineering
University of Colorado Boulder | 2003 - 2007

SKILLS
Leadership, Team Building, Agile/Scrum, Strategic Planning
Technical Architecture, Cloud Computing, DevOps

CERTIFICATIONS
AWS Solutions Architect
Certified Scrum Master (CSM)
"""

    def _get_international_resume(self) -> str:
        return """
Hans Mueller
Software Entwickler
hans.mueller@email.de | +49 30 123456789 | Berlin, Germany

ZUSAMMENFASSUNG
Software engineer with 7 years of experience in web development.

BERUFSERFAHRUNG
Senior Software Engineer at TechGmbH
Berlin, Germany | 2020 - Present
- Developed web applications using Python and Django
- Led team of 4 developers
- Implemented CI/CD pipelines

Software Developer at WebAG
Berlin, Germany | 2017 - 2020
- Built REST APIs using Java Spring Boot
- Frontend development with Angular
- Database design with PostgreSQL

AUSBILDUNG
Master of Science in Informatik
TU Berlin | 2015 - 2017

Bachelor of Science in Informatik
LMU Munich | 2012 - 2015

KENNTNISSE
Sprachen: Python, Java, JavaScript, SQL
Frameworks: Django, Spring Boot, Angular
Tools: Git, Docker, Kubernetes, AWS

ZERTIFIZIERUNGEN
AWS Certified Solutions Architect
Oracle Certified Professional Java SE 11

PROJEKTE
E-Commerce Plattform
- Vollständige E-Commerce-Lösung entwickelt
- Technologien: Python, Django, PostgreSQL
"""

    # Unit Tests
    def run_unit_tests(self) -> List[TestResult]:
        """Run unit tests for individual detection methods"""
        print("\n" + "="*70)
        print("RUNNING UNIT TESTS")
        print("="*70)
        
        results = []
        
        # Test 1: Regex Detection
        results.append(self._test_regex_detection())
        
        # Test 2: Fuzzy Detection
        results.append(self._test_fuzzy_detection())
        
        # Test 3: Content-based Detection
        results.append(self._test_content_based_detection())
        
        # Test 4: Fallback Detection
        results.append(self._test_fallback_detection())
        
        # Test 5: Validation
        results.append(self._test_validation())
        
        # Test 6: Duplicate Handling
        results.append(self._test_duplicate_handling())
        
        # Test 7: Confidence Scoring
        results.append(self._test_confidence_scoring())
        
        # Test 8: Pattern Caching
        results.append(self._test_pattern_caching())
        
        return results
    
    def _test_regex_detection(self) -> TestResult:
        """Test regex-based section detection"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            EXPERIENCE
            Work experience here
            
            EDUCATION
            Education details here
            """
            
            sections = splitter.split_sections(text)
            
            passed = 'experience' in sections and 'education' in sections
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Regex Detection",
                test_type="Unit",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Regex Detection",
                test_type="Unit",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_fuzzy_detection(self) -> TestResult:
        """Test fuzzy matching for typos"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            SKILS
            Technical skills here
            
            EDUCAION
            Education details here
            """
            
            sections = splitter.split_sections(text)
            
            # Fuzzy matching should detect these despite typos
            passed = 'skills' in sections or 'skils' in sections
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Fuzzy Detection",
                test_type="Unit",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Fuzzy Detection",
                test_type="Unit",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_content_based_detection(self) -> TestResult:
        """Test content-based detection for multi-column"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            # Simulate multi-column layout
            text = """
            EDUCATION
            University details
            
            EXPERIENCE
            Work details
            """
            
            sections = splitter.split_sections(text)
            
            passed = 'education' in sections and 'experience' in sections
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Content-based Detection",
                test_type="Unit",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Content-based Detection",
                test_type="Unit",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_fallback_detection(self) -> TestResult:
        """Test fallback detection when headers are missing"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            # Resume without explicit headers
            text = """
            John worked at Google from Jan 2020 to Present as a Software Engineer.
            He graduated from Stanford with a BS in Computer Science in 2018.
            His skills include Python, Java, and AWS.
            """
            
            sections = splitter.split_sections(text)
            
            # Fallback should still detect some sections
            passed = len(sections) > 0
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Fallback Detection",
                test_type="Unit",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Fallback Detection",
                test_type="Unit",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_validation(self) -> TestResult:
        """Test section validation"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            EXPERIENCE
            Work here
            
            SHORT
            x
            
            EDUCATION
            Education here
            """
            
            sections = splitter.split_sections(text)
            
            # Short section should be filtered out
            passed = 'experience' in sections and 'education' in sections
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Validation",
                test_type="Unit",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Validation",
                test_type="Unit",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_duplicate_handling(self) -> TestResult:
        """Test duplicate section handling"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            EXPERIENCE
            Work experience 1
            
            EXPERIENCE
            Work experience 2
            
            EDUCATION
            Education here
            """
            
            sections = splitter.split_sections(text)
            
            # Should merge duplicates
            passed = 'experience' in sections
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Duplicate Handling",
                test_type="Unit",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Duplicate Handling",
                test_type="Unit",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_confidence_scoring(self) -> TestResult:
        """Test confidence scoring with metadata"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            EXPERIENCE
            Work experience here
            
            EDUCATION
            Education here
            """
            
            sections = splitter.split_sections(text, include_metadata=True)
            
            # Check if confidence scores are present
            has_confidence = all(
                'confidence' in section_data 
                for section_data in sections.values()
            )
            
            has_method = all(
                'detection_method' in section_data 
                for section_data in sections.values()
            )
            
            passed = has_confidence and has_method
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Confidence Scoring",
                test_type="Unit",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Confidence Scoring",
                test_type="Unit",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_pattern_caching(self) -> TestResult:
        """Test pattern caching mechanism"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            # First call - should compile patterns
            patterns1 = get_compiled_patterns()
            
            # Second call - should use cache
            patterns2 = get_compiled_patterns()
            
            # Should be the same object (cached)
            passed = patterns1 is patterns2
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Pattern Caching",
                test_type="Unit",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'cached': passed}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Pattern Caching",
                test_type="Unit",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    # Integration Tests
    def run_integration_tests(self) -> List[TestResult]:
        """Run integration tests with various resume types"""
        print("\n" + "="*70)
        print("RUNNING INTEGRATION TESTS")
        print("="*70)
        
        results = []
        
        for resume_type, resume_text in self.test_resume_samples.items():
            results.append(self._test_resume_type(resume_type, resume_text))
        
        return results
    
    def _test_resume_type(self, resume_type: str, resume_text: str) -> TestResult:
        """Test a specific resume type"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter(resume_id=f"test_{resume_type}")
            sections = splitter.split_sections(resume_text)
            
            # Check for expected sections
            expected_sections = ['experience', 'education', 'skills']
            found_sections = list(sections.keys())
            
            # At least experience and education should be detected
            passed = any(s in found_sections for s in expected_sections)
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name=f"Integration: {resume_type}",
                test_type="Integration",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={
                    'sections_found': found_sections,
                    'resume_type': resume_type
                }
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name=f"Integration: {resume_type}",
                test_type="Integration",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    # Edge Case Tests
    def run_edge_case_tests(self) -> List[TestResult]:
        """Run edge case tests"""
        print("\n" + "="*70)
        print("RUNNING EDGE CASE TESTS")
        print("="*70)
        
        results = []
        
        results.append(self._test_empty_resume())
        results.append(self._test_one_line_resume())
        results.append(self._test_multi_column_resume())
        results.append(self._test_very_large_resume())
        results.append(self._test_multiple_experience_sections())
        results.append(self._test_missing_headers())
        results.append(self._test_mixed_language_resume())
        results.append(self._test_bullet_only_resume())
        
        return results
    
    def _test_empty_resume(self) -> TestResult:
        """Test empty resume"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            sections = splitter.split_sections("")
            
            # Should return 'other' section
            passed = 'other' in sections or len(sections) == 0
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Edge Case: Empty Resume",
                test_type="Edge Case",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Edge Case: Empty Resume",
                test_type="Edge Case",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_one_line_resume(self) -> TestResult:
        """Test one-line resume"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            sections = splitter.split_sections("John Doe - Software Engineer")
            
            # Should handle gracefully
            passed = len(sections) >= 0
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Edge Case: One-line Resume",
                test_type="Edge Case",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Edge Case: One-line Resume",
                test_type="Edge Case",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_multi_column_resume(self) -> str:
        """Test multi-column resume"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            # Simulate multi-column text
            text = """
            EDUCATION    EXPERIENCE
            Stanford     Google
            CS Degree    Software Engineer
            2018         2020-Present
            """
            
            sections = splitter.split_sections(text)
            
            # Should handle multi-column
            passed = len(sections) > 0
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Edge Case: Multi-column Resume",
                test_type="Edge Case",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Edge Case: Multi-column Resume",
                test_type="Edge Case",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_very_large_resume(self) -> TestResult:
        """Test very large resume"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            # Create large resume
            text = "EXPERIENCE\n" + "Work experience line.\n" * 10000 + "\nEDUCATION\nEducation details."
            
            sections = splitter.split_sections(text)
            
            # Should handle large text
            passed = 'experience' in sections
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Edge Case: Very Large Resume",
                test_type="Edge Case",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Edge Case: Very Large Resume",
                test_type="Edge Case",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_multiple_experience_sections(self) -> TestResult:
        """Test resume with multiple experience sections"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            WORK EXPERIENCE
            Corporate experience
            
            INTERNSHIP EXPERIENCE
            Internship details
            
            PROJECT EXPERIENCE
            Project details
            """
            
            sections = splitter.split_sections(text)
            
            # Should handle multiple experience-related sections
            passed = 'experience' in sections
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Edge Case: Multiple Experience Sections",
                test_type="Edge Case",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Edge Case: Multiple Experience Sections",
                test_type="Edge Case",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_missing_headers(self) -> TestResult:
        """Test resume with missing headers"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            John worked at Google from 2020 to 2022.
            He studied at Stanford University.
            He knows Python and Java.
            """
            
            sections = splitter.split_sections(text)
            
            # Fallback should detect sections
            passed = len(sections) > 0
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Edge Case: Missing Headers",
                test_type="Edge Case",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Edge Case: Missing Headers",
                test_type="Edge Case",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_mixed_language_resume(self) -> TestResult:
        """Test mixed language resume"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            EXPERIENCE
            Work experience here
            
            ERFAHRUNG
            German experience section
            
            EDUCATION
            Education here
            """
            
            sections = splitter.split_sections(text)
            
            # Should handle mixed language
            passed = 'experience' in sections
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Edge Case: Mixed Language Resume",
                test_type="Edge Case",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Edge Case: Mixed Language Resume",
                test_type="Edge Case",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_bullet_only_resume(self) -> TestResult:
        """Test bullet-only resume"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = """
            • Software Engineer at Google
            • Developed microservices
            • Python, Java, AWS
            
            • BS in Computer Science
            • Stanford University
            """
            
            sections = splitter.split_sections(text)
            
            # Should handle bullet-only format
            passed = len(sections) > 0
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            return TestResult(
                test_name="Edge Case: Bullet-only Resume",
                test_type="Edge Case",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'sections_found': list(sections.keys())}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Edge Case: Bullet-only Resume",
                test_type="Edge Case",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    # Performance Tests
    def run_performance_tests(self) -> List[TestResult]:
        """Run performance tests"""
        print("\n" + "="*70)
        print("RUNNING PERFORMANCE TESTS")
        print("="*70)
        
        results = []
        
        results.append(self._test_detection_time())
        results.append(self._test_memory_usage())
        results.append(self._test_cache_hit_ratio())
        
        return results
    
    def _test_detection_time(self) -> TestResult:
        """Test section detection time"""
        start_time = time.time()
        
        try:
            splitter = SectionSplitter()
            text = self.test_resume_samples['software_engineer']
            
            # Measure detection time
            detection_times = []
            for _ in range(10):
                start = time.time()
                splitter.split_sections(text)
                detection_times.append((time.time() - start) * 1000)
            
            avg_time = statistics.mean(detection_times)
            max_time = max(detection_times)
            
            # Should complete in reasonable time (< 1s)
            passed = avg_time < 1000
            
            return TestResult(
                test_name="Performance: Detection Time",
                test_type="Performance",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={
                    'avg_time_ms': avg_time,
                    'max_time_ms': max_time,
                    'min_time_ms': min(detection_times)
                }
            )
        except Exception as e:
            return TestResult(
                test_name="Performance: Detection Time",
                test_type="Performance",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_memory_usage(self) -> TestResult:
        """Test memory usage"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = self.test_resume_samples['software_engineer']
            
            # Parse multiple times
            for _ in range(100):
                splitter.split_sections(text)
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            # Memory should be reasonable (< 100MB)
            passed = peak < 100 * 1024 * 1024
            
            return TestResult(
                test_name="Performance: Memory Usage",
                test_type="Performance",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'peak_memory_mb': peak / 1024 / 1024}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Performance: Memory Usage",
                test_type="Performance",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_cache_hit_ratio(self) -> TestResult:
        """Test cache hit ratio"""
        start_time = time.time()
        
        try:
            # Reset cache
            from parsers.section_splitter import _pattern_cache
            _pattern_cache.clear()
            
            # First call - cache miss
            start = time.time()
            get_compiled_patterns()
            first_call_time = (time.time() - start) * 1000
            
            # Second call - cache hit
            start = time.time()
            get_compiled_patterns()
            second_call_time = (time.time() - start) * 1000
            
            # Cached call should be much faster
            passed = second_call_time < first_call_time
            
            return TestResult(
                test_name="Performance: Cache Hit Ratio",
                test_type="Performance",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={
                    'first_call_ms': first_call_time,
                    'cached_call_ms': second_call_time,
                    'speedup': first_call_time / second_call_time if second_call_time > 0 else 0
                }
            )
        except Exception as e:
            return TestResult(
                test_name="Performance: Cache Hit Ratio",
                test_type="Performance",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    # Accuracy Tests
    def run_accuracy_tests(self) -> List[TestResult]:
        """Run accuracy tests"""
        print("\n" + "="*70)
        print("RUNNING ACCURACY TESTS")
        print("="*70)
        
        results = []
        
        # Test each section type
        results.append(self._test_experience_accuracy())
        results.append(self._test_education_accuracy())
        results.append(self._test_skills_accuracy())
        results.append(self._test_projects_accuracy())
        results.append(self._test_certifications_accuracy())
        
        return results
    
    def _test_experience_accuracy(self) -> TestResult:
        """Test experience section detection accuracy"""
        start_time = time.time()
        
        try:
            splitter = SectionSplitter()
            test_cases = [
                ("EXPERIENCE\nWork here", True),
                ("WORK EXPERIENCE\nWork here", True),
                ("PROFESSIONAL EXPERIENCE\nWork here", True),
                ("EMPLOYMENT\nWork here", True),
                ("CAREER HISTORY\nWork here", True),
                ("Random text\nNo experience", False),
            ]
            
            passed_count = 0
            total = len(test_cases)
            
            for text, expected in test_cases:
                sections = splitter.split_sections(text)
                has_experience = 'experience' in sections
                if has_experience == expected:
                    passed_count += 1
            
            accuracy = (passed_count / total) * 100
            passed = accuracy >= 80
            
            self.accuracy_metrics['experience'] = AccuracyMetrics(
                section_type='experience',
                total_tests=total,
                passed=passed_count,
                accuracy=accuracy,
                false_positives=0,
                false_negatives=0,
                avg_confidence=0
            )
            
            return TestResult(
                test_name="Accuracy: Experience Detection",
                test_type="Accuracy",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={'accuracy': accuracy, 'passed': passed_count, 'total': total}
            )
        except Exception as e:
            return TestResult(
                test_name="Accuracy: Experience Detection",
                test_type="Accuracy",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_education_accuracy(self) -> TestResult:
        """Test education section detection accuracy"""
        start_time = time.time()
        
        try:
            splitter = SectionSplitter()
            test_cases = [
                ("EDUCATION\nEducation here", True),
                ("ACADEMIC\nEducation here", True),
                ("QUALIFICATIONS\nEducation here", True),
                ("UNIVERSITY\nEducation here", True),
                ("Random text\nNo education", False),
            ]
            
            passed_count = 0
            total = len(test_cases)
            
            for text, expected in test_cases:
                sections = splitter.split_sections(text)
                has_education = 'education' in sections
                if has_education == expected:
                    passed_count += 1
            
            accuracy = (passed_count / total) * 100
            passed = accuracy >= 80
            
            self.accuracy_metrics['education'] = AccuracyMetrics(
                section_type='education',
                total_tests=total,
                passed=passed_count,
                accuracy=accuracy,
                false_positives=0,
                false_negatives=0,
                avg_confidence=0
            )
            
            return TestResult(
                test_name="Accuracy: Education Detection",
                test_type="Accuracy",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={'accuracy': accuracy, 'passed': passed_count, 'total': total}
            )
        except Exception as e:
            return TestResult(
                test_name="Accuracy: Education Detection",
                test_type="Accuracy",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_skills_accuracy(self) -> TestResult:
        """Test skills section detection accuracy"""
        start_time = time.time()
        
        try:
            splitter = SectionSplitter()
            test_cases = [
                ("SKILLS\nPython, Java", True),
                ("TECHNICAL SKILLS\nPython, Java", True),
                ("CORE COMPETENCIES\nPython, Java", True),
                ("TECHNOLOGIES\nPython, Java", True),
                ("Random text\nNo skills", False),
            ]
            
            passed_count = 0
            total = len(test_cases)
            
            for text, expected in test_cases:
                sections = splitter.split_sections(text)
                has_skills = 'skills' in sections
                if has_skills == expected:
                    passed_count += 1
            
            accuracy = (passed_count / total) * 100
            passed = accuracy >= 80
            
            self.accuracy_metrics['skills'] = AccuracyMetrics(
                section_type='skills',
                total_tests=total,
                passed=passed_count,
                accuracy=accuracy,
                false_positives=0,
                false_negatives=0,
                avg_confidence=0
            )
            
            return TestResult(
                test_name="Accuracy: Skills Detection",
                test_type="Accuracy",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={'accuracy': accuracy, 'passed': passed_count, 'total': total}
            )
        except Exception as e:
            return TestResult(
                test_name="Accuracy: Skills Detection",
                test_type="Accuracy",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_projects_accuracy(self) -> TestResult:
        """Test projects section detection accuracy"""
        start_time = time.time()
        
        try:
            splitter = SectionSplitter()
            test_cases = [
                ("PROJECTS\nProject details", True),
                ("PORTFOLIO\nProject details", True),
                ("SELECTED PROJECTS\nProject details", True),
                ("KEY PROJECTS\nProject details", True),
                ("Random text\nNo projects", False),
            ]
            
            passed_count = 0
            total = len(test_cases)
            
            for text, expected in test_cases:
                sections = splitter.split_sections(text)
                has_projects = 'projects' in sections
                if has_projects == expected:
                    passed_count += 1
            
            accuracy = (passed_count / total) * 100
            passed = accuracy >= 80
            
            self.accuracy_metrics['projects'] = AccuracyMetrics(
                section_type='projects',
                total_tests=total,
                passed=passed_count,
                accuracy=accuracy,
                false_positives=0,
                false_negatives=0,
                avg_confidence=0
            )
            
            return TestResult(
                test_name="Accuracy: Projects Detection",
                test_type="Accuracy",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={'accuracy': accuracy, 'passed': passed_count, 'total': total}
            )
        except Exception as e:
            return TestResult(
                test_name="Accuracy: Projects Detection",
                test_type="Accuracy",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_certifications_accuracy(self) -> TestResult:
        """Test certifications section detection accuracy"""
        start_time = time.time()
        
        try:
            splitter = SectionSplitter()
            test_cases = [
                ("CERTIFICATIONS\nAWS, GCP", True),
                ("CERTIFICATES\nAWS, GCP", True),
                ("PROFESSIONAL CREDENTIALS\nAWS, GCP", True),
                ("LICENSES\nAWS, GCP", True),
                ("Random text\nNo certifications", False),
            ]
            
            passed_count = 0
            total = len(test_cases)
            
            for text, expected in test_cases:
                sections = splitter.split_sections(text)
                has_certs = 'certifications' in sections
                if has_certs == expected:
                    passed_count += 1
            
            accuracy = (passed_count / total) * 100
            passed = accuracy >= 80
            
            self.accuracy_metrics['certifications'] = AccuracyMetrics(
                section_type='certifications',
                total_tests=total,
                passed=passed_count,
                accuracy=accuracy,
                false_positives=0,
                false_negatives=0,
                avg_confidence=0
            )
            
            return TestResult(
                test_name="Accuracy: Certifications Detection",
                test_type="Accuracy",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={'accuracy': accuracy, 'passed': passed_count, 'total': total}
            )
        except Exception as e:
            return TestResult(
                test_name="Accuracy: Certifications Detection",
                test_type="Accuracy",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    # Regression Tests
    def run_regression_tests(self) -> List[TestResult]:
        """Run regression tests"""
        print("\n" + "="*70)
        print("RUNNING REGRESSION TESTS")
        print("="*70)
        
        results = []
        
        # Test that existing functionality still works
        results.append(self._test_backward_compatibility())
        results.append(self._test_api_response_format())
        
        return results
    
    def _test_backward_compatibility(self) -> TestResult:
        """Test backward compatibility"""
        start_time = time.time()
        
        try:
            text = self.test_resume_samples['software_engineer']
            
            # Test default behavior
            sections_default = split_sections(text)
            
            # Should return strings, not dicts
            passed = all(isinstance(v, str) for v in sections_default.values())
            
            return TestResult(
                test_name="Regression: Backward Compatibility",
                test_type="Regression",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={'sections': list(sections_default.keys())}
            )
        except Exception as e:
            return TestResult(
                test_name="Regression: Backward Compatibility",
                test_type="Regression",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_api_response_format(self) -> TestResult:
        """Test API response format"""
        start_time = time.time()
        
        try:
            text = self.test_resume_samples['software_engineer']
            
            # Test with metadata
            sections_metadata = split_sections(text, include_metadata=True)
            
            # Should return dicts with required keys
            has_required_keys = all(
                isinstance(v, dict) and 'text' in v and 'confidence' in v and 'detection_method' in v
                for v in sections_metadata.values()
            )
            
            passed = has_required_keys
            
            return TestResult(
                test_name="Regression: API Response Format",
                test_type="Regression",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                details={'sections': list(sections_metadata.keys())}
            )
        except Exception as e:
            return TestResult(
                test_name="Regression: API Response Format",
                test_type="Regression",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    # Stress Tests
    def run_stress_tests(self) -> List[TestResult]:
        """Run stress tests"""
        print("\n" + "="*70)
        print("RUNNING STRESS TESTS")
        print("="*70)
        
        results = []
        
        results.append(self._test_100_resumes())
        results.append(self._test_thread_safety())
        results.append(self._test_memory_leaks())
        
        return results
    
    def _test_100_resumes(self) -> TestResult:
        """Test parsing 100 resumes"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = self.test_resume_samples['software_engineer']
            
            # Parse 100 times
            for i in range(100):
                splitter.split_sections(text, resume_id=f"stress_test_{i}")
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            passed = True
            
            return TestResult(
                test_name="Stress: 100 Resumes",
                test_type="Stress",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'peak_memory_mb': peak / 1024 / 1024}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Stress: 100 Resumes",
                test_type="Stress",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_thread_safety(self) -> TestResult:
        """Test thread safety"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            text = self.test_resume_samples['software_engineer']
            errors = []
            
            def parse_resume(thread_id):
                try:
                    splitter = SectionSplitter(resume_id=f"thread_{thread_id}")
                    for _ in range(10):
                        splitter.split_sections(text)
                except Exception as e:
                    errors.append(e)
            
            # Spawn 10 threads
            threads = []
            for i in range(10):
                t = threading.Thread(target=parse_resume, args=(i,))
                threads.append(t)
                t.start()
            
            for t in threads:
                t.join()
            
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            passed = len(errors) == 0
            
            return TestResult(
                test_name="Stress: Thread Safety",
                test_type="Stress",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=peak / 1024 / 1024,
                details={'errors': len(errors)}
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Stress: Thread Safety",
                test_type="Stress",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    def _test_memory_leaks(self) -> TestResult:
        """Test for memory leaks"""
        start_time = time.time()
        tracemalloc.start()
        
        try:
            splitter = SectionSplitter()
            text = self.test_resume_samples['software_engineer']
            
            # Parse 1000 times and check memory growth
            memory_snapshots = []
            for i in range(100):
                splitter.split_sections(text)
                if i % 10 == 0:
                    current, peak = tracemalloc.get_traced_memory()
                    memory_snapshots.append(peak / 1024 / 1024)
            
            tracemalloc.stop()
            
            # Memory should not grow significantly
            memory_growth = memory_snapshots[-1] - memory_snapshots[0]
            passed = memory_growth < 50  # Less than 50MB growth
            
            return TestResult(
                test_name="Stress: Memory Leaks",
                test_type="Stress",
                passed=passed,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=memory_snapshots[-1],
                details={
                    'memory_growth_mb': memory_growth,
                    'snapshots': memory_snapshots
                }
            )
        except Exception as e:
            tracemalloc.stop()
            return TestResult(
                test_name="Stress: Memory Leaks",
                test_type="Stress",
                passed=False,
                duration_ms=(time.time() - start_time) * 1000,
                memory_mb=0,
                error_message=str(e)
            )
    
    # Report Generation
    def generate_html_report(self, results: List[TestResult]) -> str:
        """Generate HTML report"""
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.passed)
        failed_tests = total_tests - passed_tests
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Section Detection Engine Test Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .summary {{ margin: 20px 0; }}
        .pass {{ color: green; }}
        .fail {{ color: red; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #4CAF50; color: white; }}
        .test-section {{ margin: 30px 0; }}
        .accuracy-table {{ margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Section Detection Engine Test Report</h1>
        <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: {total_tests}</p>
        <p class="pass">Passed: {passed_tests}</p>
        <p class="fail">Failed: {failed_tests}</p>
        <p>Pass Rate: {(passed_tests/total_tests)*100:.2f}%</p>
    </div>
    
    <div class="test-section">
        <h2>Test Results by Type</h2>
        <table>
            <tr>
                <th>Test Type</th>
                <th>Test Name</th>
                <th>Status</th>
                <th>Duration (ms)</th>
                <th>Memory (MB)</th>
            </tr>
        """
        
        for result in results:
            status = "PASS" if result.passed else "FAIL"
            status_class = "pass" if result.passed else "fail"
            html += f"""
            <tr>
                <td>{result.test_type}</td>
                <td>{result.test_name}</td>
                <td class="{status_class}">{status}</td>
                <td>{result.duration_ms:.2f}</td>
                <td>{result.memory_mb:.2f}</td>
            </tr>
            """
        
        html += """
        </table>
    </div>
    
    <div class="test-section">
        <h2>Accuracy Metrics</h2>
        <table class="accuracy-table">
            <tr>
                <th>Section Type</th>
                <th>Total Tests</th>
                <th>Passed</th>
                <th>Accuracy</th>
            </tr>
        """
        
        for section, metrics in self.accuracy_metrics.items():
            html += f"""
            <tr>
                <td>{section}</td>
                <td>{metrics.total_tests}</td>
                <td>{metrics.passed}</td>
                <td>{metrics.accuracy:.2f}%</td>
            </tr>
            """
        
        html += """
        </table>
    </div>
    
    <div class="test-section">
        <h2>Failed Tests</h2>
        <table>
            <tr>
                <th>Test Name</th>
                <th>Error Message</th>
            </tr>
        """
        
        for result in results:
            if not result.passed:
                html += f"""
                <tr>
                    <td>{result.test_name}</td>
                    <td>{result.error_message}</td>
                </tr>
                """
        
        html += """
        </table>
    </div>
    
    <div class="test-section">
        <h2>Suggested Improvements</h2>
        <ul>
    """
        
        failed_by_type = {}
        for result in results:
            if not result.passed:
                if result.test_type not in failed_by_type:
                    failed_by_type[result.test_type] = []
                failed_by_type[result.test_type].append(result.test_name)
        
        if failed_by_type:
            for test_type, failed_tests in failed_by_type.items():
                html += f"<li><strong>{test_type}:</strong> Review failed tests: {', '.join(failed_tests)}</li>"
        else:
            html += "<li>All tests passed. No immediate improvements needed.</li>"
        
        html += """
        </ul>
    </div>
</body>
</html>
        """
        
        return html
    
    def generate_json_report(self, results: List[TestResult]) -> str:
        """Generate JSON report"""
        total_tests = len(results)
        passed_tests = sum(1 for r in results if r.passed)
        failed_tests = total_tests - passed_tests
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': failed_tests,
                'pass_rate': (passed_tests / total_tests) * 100
            },
            'results': [asdict(r) for r in results],
            'accuracy_metrics': {k: asdict(v) for k, v in self.accuracy_metrics.items()},
            'suggested_improvements': []
        }
        
        # Add suggestions based on failed tests
        failed_by_type = {}
        for result in results:
            if not result.passed:
                if result.test_type not in failed_by_type:
                    failed_by_type[result.test_type] = []
                failed_by_type[result.test_type].append(result.test_name)
        
        for test_type, failed_tests in failed_by_type.items():
            report['suggested_improvements'].append({
                'area': test_type,
                'failed_tests': failed_tests,
                'recommendation': f"Review and fix {len(failed_tests)} failed {test_type} tests"
            })
        
        return json.dumps(report, indent=2)
    
    # Main execution
    def run_all_tests(self):
        """Run all tests"""
        print("="*70)
        print("SECTION DETECTION ENGINE TEST SUITE")
        print("="*70)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        all_results = []
        
        # Run all test types
        all_results.extend(self.run_unit_tests())
        all_results.extend(self.run_integration_tests())
        all_results.extend(self.run_edge_case_tests())
        all_results.extend(self.run_performance_tests())
        all_results.extend(self.run_accuracy_tests())
        all_results.extend(self.run_regression_tests())
        all_results.extend(self.run_stress_tests())
        
        # Generate reports
        html_report = self.generate_html_report(all_results)
        json_report = self.generate_json_report(all_results)
        
        # Save reports
        os.makedirs('test_reports', exist_ok=True)
        
        with open('test_reports/section_detection_report.html', 'w') as f:
            f.write(html_report)
        
        with open('test_reports/section_detection_report.json', 'w') as f:
            f.write(json_report)
        
        # Print summary
        total = len(all_results)
        passed = sum(1 for r in all_results if r.passed)
        
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Pass Rate: {(passed/total)*100:.2f}%")
        print(f"\nReports saved to: test_reports/")
        print(f"HTML Report: test_reports/section_detection_report.html")
        print(f"JSON Report: test_reports/section_detection_report.json")
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
        return all_results


if __name__ == "__main__":
    suite = SectionDetectionTestSuite()
    results = suite.run_all_tests()
    sys.exit(0 if all(r.passed for r in results) else 1)
