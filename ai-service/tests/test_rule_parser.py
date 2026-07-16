"""
Comprehensive test suite for rule-based resume parsing pipeline.
Tests all components: text extraction, section splitting, rule parsing, and structured extraction.
"""

import os
import sys
import unittest
from pathlib import Path
from typing import Dict, List, Any
import logging

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from parsers.rule_parser import RuleBasedParser
from parsers.section_splitter import SectionSplitter
from parsers.experience_extractor import ExperienceExtractor
from parsers.education_extractor import EducationExtractor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Sample realistic resume for testing
SAMPLE_RESUME = """
JOHN MICHAEL DOE
Senior Software Engineer
📧 john.doe@email.com | 📱 +1 (555) 123-4567 | 📍 San Francisco, CA
🔗 linkedin.com/in/johndoe | 🐙 github.com/johndoe | 🌐 johndoe.dev

PROFESSIONAL SUMMARY
Experienced Senior Software Engineer with 8+ years of expertise in full-stack development,
cloud architecture, and team leadership. Proven track record of delivering scalable solutions
and mentoring development teams. Passionate about clean code, performance optimization,
and emerging technologies.

WORK EXPERIENCE
Senior Software Engineer
TechCorp Solutions Inc.
San Francisco, CA | January 2020 - Present
• Led development of microservices architecture serving 1M+ users
• Implemented CI/CD pipelines reducing deployment time by 60%
• Mentored team of 5 junior developers through code reviews and pair programming
• Designed and built RESTful APIs using Node.js, Express, and PostgreSQL
• Optimized database queries improving application performance by 40%
• Technologies: React, Node.js, TypeScript, Docker, AWS, Kubernetes, PostgreSQL

Software Engineer
StartupXYZ Technologies
Palo Alto, CA | June 2018 - December 2019
• Developed full-stack web applications using React and Python
• Built real-time data processing pipelines with Apache Kafka
• Collaborated with cross-functional teams in Agile environment
• Implemented automated testing with Jest and pytest
• Stack: JavaScript, Python, Django, React, Redis, AWS

Junior Developer
Digital Innovations Lab
Mountain View, CA | July 2016 - May 2018
• Assisted in development of customer-facing web applications
• Fixed bugs and implemented new features in existing codebase
• Participated in daily stand-ups and sprint planning
• Gained experience with Git, JavaScript, and responsive design
• Tools: HTML, CSS, JavaScript, jQuery, Bootstrap, Git

EDUCATION
Master of Science in Computer Science
Stanford University
Stanford, CA | 2016 - 2018
GPA: 3.8/4.0
Thesis: "Machine Learning Approaches to Code Optimization"

Bachelor of Science in Software Engineering
University of California, Berkeley
Berkeley, CA | 2012 - 2016
GPA: 3.6/4.0
Dean's List: 2014, 2015
Relevant Coursework: Data Structures, Algorithms, Database Systems, Software Engineering

TECHNICAL SKILLS
Programming Languages: Python, JavaScript, TypeScript, Java, C++, Go
Frontend: React, Angular, Vue.js, HTML5, CSS3, SASS, Tailwind CSS
Backend: Node.js, Express, Django, Flask, Spring Boot, .NET Core
Databases: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch
Cloud & DevOps: AWS, Azure, Google Cloud, Docker, Kubernetes, Jenkins, Git
Tools & Technologies: Git, Linux, REST APIs, GraphQL, Microservices, CI/CD

PROJECTS
E-Commerce Platform
• Built full-stack e-commerce platform with React and Node.js
• Implemented payment processing with Stripe API
• Deployed on AWS with auto-scaling capabilities

Machine Learning Blog
• Created blog platform for ML tutorials using Python and Django
• Implemented content management system and user authentication
• Optimized for SEO and mobile responsiveness

CERTIFICATIONS
AWS Certified Solutions Architect - Professional (2021)
Google Cloud Professional Developer (2020)
Certified Kubernetes Administrator (CKA) - 2022
"""


class TestRuleBasedParser(unittest.TestCase):
    """Test suite for rule-based resume parsing pipeline."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test fixtures with all parsers."""
        cls.rule_parser = RuleBasedParser()
        cls.section_splitter = SectionSplitter()
        self.experience_extractor = ExperienceExtractor()
        self.education_extractor = EducationExtractor()
        cls.sample_resume = SAMPLE_RESUME
        
        logger.info("Setting up test suite with all parsers initialized")
    
    def test_email_extraction(self):
        """Test email extraction from resume."""
        email = self.rule_parser.extract_email(self.sample_resume)
        
        self.assertIsNotNone(email, "Email should be extracted")
        self.assertEqual(email, "john.doe@email.com", "Email should match expected value")
        
        logger.info(f"✅ Email extraction test passed: {email}")
    
    def test_phone_extraction(self):
        """Test phone extraction and formatting."""
        phone = self.rule_parser.extract_phone(self.sample_resume)
        
        self.assertIsNotNone(phone, "Phone should be extracted")
        self.assertTrue(phone.startswith('+'), "Phone should be in E.164 format")
        self.assertIn('5551234567', phone, "Phone should contain expected digits")
        
        logger.info(f"✅ Phone extraction test passed: {phone}")
    
    def test_linkedin_extraction(self):
        """Test LinkedIn URL extraction."""
        linkedin = self.rule_parser.extract_linkedin(self.sample_resume)
        
        self.assertIsNotNone(linkedin, "LinkedIn URL should be extracted")
        self.assertIn('linkedin.com/in/johndoe', linkedin, "LinkedIn URL should match expected value")
        
        logger.info(f"✅ LinkedIn extraction test passed: {linkedin}")
    
    def test_github_extraction(self):
        """Test GitHub URL extraction."""
        github = self.rule_parser.extract_github(self.sample_resume)
        
        self.assertIsNotNone(github, "GitHub URL should be extracted")
        self.assertIn('github.com/johndoe', github, "GitHub URL should match expected value")
        
        logger.info(f"✅ GitHub extraction test passed: {github}")
    
    def test_sections_detected(self):
        """Test section detection and splitting."""
        sections = self.section_splitter.split_sections(self.sample_resume)
        
        # Check that major sections are detected
        expected_sections = ['experience', 'education', 'skills']
        for section in expected_sections:
            self.assertIn(section, sections, f"Section '{section}' should be detected")
            self.assertIsNotNone(sections[section], f"Section '{section}' should not be empty")
        
        logger.info(f"✅ Sections detected: {list(sections.keys())}")
    
    def test_work_experience(self):
        """Test work experience extraction."""
        sections = self.section_splitter.split_sections(self.sample_resume)
        experience_text = sections.get('experience', '')
        
        experiences = self.experience_extractor.extract_work_experience(experience_text)
        
        self.assertEqual(len(experiences), 3, "Should extract 3 work experiences")
        
        # Check first experience (Senior Software Engineer)
        first_job = experiences[0]
        self.assertEqual(first_job['job_title'], 'Senior Software Engineer')
        self.assertEqual(first_job['company_name'], 'TechCorp Solutions Inc.')
        self.assertIn('2020', first_job['start_date'])
        self.assertEqual(first_job['end_date'], 'Present')
        
        # Check duration calculation
        self.assertGreater(first_job['duration_months'], 36, "Duration should be > 36 months")
        
        # Check skills extraction
        self.assertIn('React', first_job['skills_mentioned'])
        self.assertIn('Node.js', first_job['skills_mentioned'])
        
        logger.info(f"✅ Work experience extraction: {len(experiences)} jobs found")
    
    def test_education(self):
        """Test education extraction."""
        sections = self.section_splitter.split_sections(self.sample_resume)
        education_text = sections.get('education', '')
        
        education_list = self.education_extractor.extract_education(education_text)
        
        self.assertEqual(len(education_list), 2, "Should extract 2 education entries")
        
        # Check Master's degree
        masters = next((edu for edu in education_list if 'Master' in edu['degree']), None)
        self.assertIsNotNone(masters, "Master's degree should be found")
        self.assertEqual(masters['institution'], 'Stanford University')
        self.assertEqual(masters['end_year'], 2018)
        self.assertIsNotNone(masters['gpa'])
        self.assertTrue(masters['is_highest_degree'])
        
        # Check Bachelor's degree
        bachelors = next((edu for edu in education_list if 'Bachelor' in edu['degree']), None)
        self.assertIsNotNone(bachelors, "Bachelor's degree should be found")
        self.assertEqual(bachelors['institution'], 'University of California, Berkeley')
        self.assertEqual(bachelors['end_year'], 2016)
        
        logger.info(f"✅ Education extraction: {len(education_list)} entries found")
    
    def test_skills(self):
        """Test skills extraction."""
        sections = self.section_splitter.split_sections(self.sample_resume)
        skills_text = sections.get('skills', '')
        
        skills = self.section_splitter.extract_skills_from_section(skills_text)
        
        # Should extract multiple skills
        self.assertGreater(len(skills), 10, "Should extract at least 10 skills")
        
        # Check specific skills are present
        expected_skills = ['python', 'javascript', 'react', 'node.js', 'aws', 'docker']
        for skill in expected_skills:
            self.assertIn(skill, skills, f"Skill '{skill}' should be extracted")
        
        logger.info(f"✅ Skills extraction: {len(skills)} skills found")
    
    def test_total_experience(self):
        """Test total experience calculation."""
        sections = self.section_splitter.split_sections(self.sample_resume)
        experience_text = sections.get('experience', '')
        
        experiences = self.experience_extractor.extract_work_experience(experience_text)
        total_exp = self.experience_extractor.calculate_total_experience(experiences)
        
        # Should calculate approximately 8+ years
        self.assertGreater(total_exp['total_years'], 7.0, "Total experience should be > 7 years")
        self.assertLess(total_exp['total_years'], 10.0, "Total experience should be < 10 years")
        
        # Check metrics
        self.assertIsInstance(total_exp['total_months'], int)
        self.assertIsInstance(total_exp['has_gaps'], bool)
        self.assertIsInstance(total_exp['gap_months'], int)
        
        logger.info(f"✅ Total experience: {total_exp['total_years']} years")
    
    def test_degree_normalization(self):
        """Test degree name normalization."""
        test_cases = [
            ('BS', 'Bachelor of Science'),
            ('M.S.', 'Master of Science'),
            ('Ph.D', 'PhD'),
            ('B.Tech', 'Bachelor of Technology'),
            ('MBA', 'Master of Business Administration')
        ]
        
        for raw_degree, expected in test_cases:
            normalized = self.education_extractor.normalize_degree(raw_degree)
            self.assertEqual(normalized, expected, f"Degree normalization failed for {raw_degree}")
        
        logger.info("✅ Degree normalization test passed")
    
    def test_contact_info_extraction(self):
        """Test comprehensive contact information extraction."""
        contact_info = self.rule_parser.extract_all_contact_info(self.sample_resume)
        
        # Check all contact fields
        self.assertIsNotNone(contact_info['email'])
        self.assertIsNotNone(contact_info['phone'])
        self.assertIsNotNone(contact_info['linkedin'])
        self.assertIsNotNone(contact_info['github'])
        
        # Check website extraction
        self.assertIsInstance(contact_info['websites'], list)
        self.assertTrue(any('johndoe.dev' in site for site in contact_info['websites']))
        
        logger.info("✅ Contact info extraction test passed")


def create_sample_resumes():
    """Create sample resume files for benchmarking."""
    test_dir = Path(__file__).parent / "sample_resumes"
    test_dir.mkdir(exist_ok=True)
    
    # Sample resumes with different formats
    sample_resumes = {
        "resume1.txt": SAMPLE_RESUME,
        
        "resume2.txt": """
        JANE SMITH
        Data Scientist
        Email: jane.smith@company.com
        Phone: (555) 987-6543
        LinkedIn: linkedin.com/in/janesmith
        
        EXPERIENCE
        Senior Data Scientist at DataCorp
        2019 - Present
        • Built machine learning models
        • Used Python, TensorFlow, SQL
        
        Data Analyst at Analytics Inc
        2017 - 2019
        • Analyzed large datasets
        • Created visualizations with Tableau
        
        EDUCATION
        Master of Science in Data Science
        MIT
        2015 - 2017
        
        Bachelor of Science in Statistics
        Harvard University
        2011 - 2015
        
        SKILLS
        Python, R, SQL, TensorFlow, Tableau, Excel
        """,
        
        "resume3.txt": """
        ROBERT JOHNSON
        DevOps Engineer
        Contact: robert.johnson@email.com | +1-555-456-7890
        GitHub: github.com/robertj
        
        PROFESSIONAL EXPERIENCE
        DevOps Engineer
        CloudTech Solutions
        2020 - Present
        • Managed Kubernetes clusters
        • Implemented CI/CD with Jenkins
        • Worked with AWS, Docker, Terraform
        
        System Administrator
        TechCompany
        2018 - 2020
        • Maintained Linux servers
        • Monitored system performance
        
        EDUCATION
        Bachelor of Science in Information Technology
        State University
        2014 - 2018
        
        TECHNICAL SKILLS
        Linux, AWS, Docker, Kubernetes, Jenkins, Ansible, Terraform
        """
    }
    
    for filename, content in sample_resumes.items():
        file_path = test_dir / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content.strip())
    
    return test_dir


def run_benchmark():
    """Run benchmark on sample resumes and calculate accuracy."""
    logger.info("🚀 Running parsing pipeline benchmark...")
    
    # Create sample resumes
    test_dir = create_sample_resumes()
    resume_files = list(test_dir.glob("*.txt"))
    
    # Initialize parsers
    rule_parser = RuleBasedParser()
    section_splitter = SectionSplitter()
    experience_extractor = ExperienceExtractor()
    education_extractor = EducationExtractor()
    
    # Expected fields for accuracy calculation
    expected_fields = [
        'email', 'phone', 'linkedin', 'github',
        'experience_section', 'education_section', 'skills_section',
        'work_experience', 'education_entries', 'skills'
    ]
    
    total_fields = len(expected_fields) * len(resume_files)
    found_fields = 0
    
    results = []
    
    for resume_file in resume_files:
        logger.info(f"📄 Processing {resume_file.name}...")
        
        with open(resume_file, 'r', encoding='utf-8') as f:
            resume_text = f.read()
        
        file_results = {
            'filename': resume_file.name,
            'fields_found': 0,
            'missing_fields': []
        }
        
        # Test contact info extraction
        contact_info = rule_parser.extract_all_contact_info(resume_text)
        if contact_info['email']:
            found_fields += 1
            file_results['fields_found'] += 1
        else:
            file_results['missing_fields'].append('email')
        
        if contact_info['phone']:
            found_fields += 1
            file_results['fields_found'] += 1
        else:
            file_results['missing_fields'].append('phone')
        
        if contact_info['linkedin']:
            found_fields += 1
            file_results['fields_found'] += 1
        else:
            file_results['missing_fields'].append('linkedin')
        
        if contact_info['github']:
            found_fields += 1
            file_results['fields_found'] += 1
        else:
            file_results['missing_fields'].append('github')
        
        # Test section detection
        sections = section_splitter.split_sections(resume_text)
        if 'experience' in sections:
            found_fields += 1
            file_results['fields_found'] += 1
        else:
            file_results['missing_fields'].append('experience_section')
        
        if 'education' in sections:
            found_fields += 1
            file_results['fields_found'] += 1
        else:
            file_results['missing_fields'].append('education_section')
        
        if 'skills' in sections:
            found_fields += 1
            file_results['fields_found'] += 1
        else:
            file_results['missing_fields'].append('skills_section')
        
        # Test experience extraction
        if 'experience' in sections:
            experiences = experience_extractor.extract_work_experience(sections['experience'])
            if experiences:
                found_fields += 1
                file_results['fields_found'] += 1
            else:
                file_results['missing_fields'].append('work_experience')
        
        # Test education extraction
        if 'education' in sections:
            education_list = education_extractor.extract_education(sections['education'])
            if education_list:
                found_fields += 1
                file_results['fields_found'] += 1
            else:
                file_results['missing_fields'].append('education_entries')
        
        # Test skills extraction
        if 'skills' in sections:
            skills = section_splitter.extract_skills_from_section(sections['skills'])
            if skills:
                found_fields += 1
                file_results['fields_found'] += 1
            else:
                file_results['missing_fields'].append('skills')
        
        results.append(file_results)
    
    # Calculate accuracy
    accuracy = (found_fields / total_fields) * 100 if total_fields > 0 else 0
    
    # Print benchmark report
    print("\n" + "="*60)
    print("📊 RULE-BASED PARSING PIPELINE BENCHMARK REPORT")
    print("="*60)
    
    for result in results:
        file_accuracy = (result['fields_found'] / len(expected_fields)) * 100
        print(f"\n📄 {result['filename']}")
        print(f"   Fields Found: {result['fields_found']}/{len(expected_fields)} ({file_accuracy:.1f}%)")
        if result['missing_fields']:
            print(f"   Missing: {', '.join(result['missing_fields'])}")
    
    print(f"\n🎯 OVERALL ACCURACY: {accuracy:.1f}%")
    print(f"   Total Fields Found: {found_fields}/{total_fields}")
    print(f"   Total Resumes Processed: {len(resume_files)}")
    
    if accuracy >= 90:
        print("🏆 EXCELLENT: Rule-based system performing at high accuracy!")
    elif accuracy >= 75:
        print("✅ GOOD: Rule-based system performing well")
    elif accuracy >= 60:
        print("⚠️  FAIR: Rule-based system needs some improvements")
    else:
        print("❌ POOR: Rule-based system needs significant improvements")
    
    print("="*60)
    
    return accuracy


if __name__ == "__main__":
    print("🧪 Running Rule-Based Parser Test Suite")
    print("=" * 50)
    
    # Run unit tests
    unittest.main(argv=[''], exit=False, verbosity=2)
    
    print("\n" + "=" * 50)
    print("📈 Running Benchmark Tests")
    print("=" * 50)
    
    # Run benchmark
    accuracy = run_benchmark()
    
    print(f"\n🎉 Test suite completed!")
    print(f"Final Accuracy Score: {accuracy:.1f}%")
