#!/usr/bin/env python3
"""
Test Multi-Domain Skill and Role Extraction

This script tests the unified skills and roles integration by:
1. Instantiating RuleBasedParser and EntityValidator
2. Testing Healthcare, Finance, and IT resume samples
3. Verifying multi-domain skill extraction works
4. Verifying IT extraction still works (regression test)
"""

import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from parsers.rule_parser import RuleBasedParser
from parsers.entity_validator import EntityValidator

# Test samples
SAMPLES = {
    "Healthcare": """Registered Nurse with 5 years experience in ICU. BLS certified, ACLS certified. 
Skilled in patient assessment, critical care, medication administration, and IV therapy. 
BSN degree from state university.""",

    "Finance": """Chartered Accountant with 6 years experience in financial auditing and taxation. 
Expert in IFRS, GAAP, financial statement analysis, and financial modeling using Excel. 
CPA certified.""",

    "IT": """Senior Software Engineer with 5 years experience in React, Node.js, Python, and AWS. 
Built scalable microservices using Docker and Kubernetes."""
}

# Expected results
EXPECTED_SKILLS = {
    "Healthcare": ["BLS", "ACLS", "patient assessment", "critical care", "medication administration", "IV therapy"],
    "Finance": ["IFRS", "GAAP", "financial statement analysis", "financial modeling", "Excel"],
    "IT": ["React", "Node.js", "Python", "AWS", "Docker", "Kubernetes"]
}

EXPECTED_ROLES = {
    "Healthcare": "Registered Nurse",
    "Finance": "Chartered Accountant",
    "IT": "Senior Software Engineer"
}


def test_skill_extraction(parser, sample_name, sample_text):
    """Test skill extraction for a sample."""
    print(f"\n{'='*80}")
    print(f"TESTING: {sample_name}")
    print(f"{'='*80}")
    print(f"Sample Text:\n{sample_text}")
    print(f"\n{'-'*80}")
    
    # Extract skills
    skills = parser.extract_skills(sample_text)
    
    print(f"\nExtracted Skills ({len(skills)} total):")
    for i, skill in enumerate(skills, 1):
        # Get domain for this skill
        domain = parser.skill_to_domain.get(skill.lower(), "Unknown")
        print(f"  {i}. {skill} → Domain: {domain}")
    
    # Detect domain
    domain_info = parser.detect_domain(skills)
    print(f"\nDomain Detection:")
    print(f"  Primary Domain: {domain_info['primary_domain']}")
    print(f"  Confidence: {domain_info['confidence']:.2f}")
    print(f"  Skill Domain: {domain_info['skill_domain']}")
    print(f"  Role Domain: {domain_info['role_domain']}")
    if 'domain_counts' in domain_info:
        print(f"  Domain Counts: {domain_info['domain_counts']}")
    
    # Extract licenses
    licenses = parser.extract_licenses(sample_text)
    print(f"\nLicense Extraction:")
    print(f"  Extracted: {licenses}")
    
    return skills


def test_role_validation(validator, sample_name, sample_text, expected_role):
    """Test role validation for a sample."""
    print(f"\n{'-'*80}")
    print(f"Role Validation Test:")
    print(f"{'-'*80}")
    
    # Try to validate the expected role
    if expected_role:
        result = validator.validate_role(expected_role)
        print(f"Expected Role: '{expected_role}'")
        print(f"Validation Result: {result}")
        
        # Check if role exists in valid_roles
        exists = expected_role in validator.valid_roles
        print(f"Role exists in database: {exists}")
        
        return result
    else:
        print("No expected role to test")
        return None


def main():
    """Main test execution."""
    print("\n" + "="*80)
    print("MULTI-DOMAIN SKILL AND ROLE EXTRACTION TEST")
    print("="*80)
    
    # Initialize parsers
    print("\nInitializing parsers...")
    try:
        rule_parser = RuleBasedParser()
        print("✅ RuleBasedParser initialized")
    except Exception as e:
        print(f"❌ Failed to initialize RuleBasedParser: {e}")
        return
    
    try:
        entity_validator = EntityValidator()
        print("✅ EntityValidator initialized")
    except Exception as e:
        print(f"❌ Failed to initialize EntityValidator: {e}")
        return
    
    # Print loaded counts
    print(f"\nLoaded Skills Count: {len(rule_parser.SKILL_TAXONOMY)}")
    print(f"Loaded Roles Count: {len(entity_validator.valid_roles)}")
    print(f"Skill Domains: {set(rule_parser.skill_to_domain.values())}")
    
    # Run tests
    results = {}
    for sample_name, sample_text in SAMPLES.items():
        skills = test_skill_extraction(rule_parser, sample_name, sample_text)
        role_result = test_role_validation(entity_validator, sample_name, sample_text, EXPECTED_ROLES[sample_name])
        
        results[sample_name] = {
            'skills': skills,
            'role_result': role_result
        }
    
    # Print summary
    print(f"\n{'='*80}")
    print("TEST SUMMARY")
    print(f"{'='*80}")
    
    # Test 1: Healthcare skills extraction
    healthcare_skills = results['Healthcare']['skills']
    healthcare_relevant_skills = [s for s in healthcare_skills if any(exp.lower() in s.lower() or s.lower() in exp.lower() for exp in EXPECTED_SKILLS['Healthcare'])]
    healthcare_pass = len(healthcare_relevant_skills) >= 3
    print(f"\nHealthcare Skills Test:")
    print(f"  Expected: 3+ relevant skills")
    print(f"  Found: {len(healthcare_relevant_skills)} relevant skills: {healthcare_relevant_skills}")
    print(f"  Status: {'✅ PASS' if healthcare_pass else '❌ FAIL'}")
    
    # Test 2: Finance skills extraction
    finance_skills = results['Finance']['skills']
    finance_relevant_skills = [s for s in finance_skills if any(exp.lower() in s.lower() or s.lower() in exp.lower() for exp in EXPECTED_SKILLS['Finance'])]
    finance_pass = len(finance_relevant_skills) >= 3
    print(f"\nFinance Skills Test:")
    print(f"  Expected: 3+ relevant skills")
    print(f"  Found: {len(finance_relevant_skills)} relevant skills: {finance_relevant_skills}")
    print(f"  Status: {'✅ PASS' if finance_pass else '❌ FAIL'}")
    
    # Test 3: IT skills extraction (regression test)
    it_skills = results['IT']['skills']
    it_expected_found = [s for s in EXPECTED_SKILLS['IT'] if s in it_skills]
    it_pass = len(it_expected_found) >= 5  # At least 5 of 6 expected skills
    print(f"\nIT Skills Regression Test:")
    print(f"  Expected: React, Node.js, Python, AWS, Docker, Kubernetes")
    print(f"  Found: {it_skills}")
    print(f"  Matched: {len(it_expected_found)}/6 expected skills: {it_expected_found}")
    print(f"  Status: {'✅ PASS' if it_pass else '❌ FAIL'}")
    
    # Overall result
    all_pass = healthcare_pass and finance_pass and it_pass
    print(f"\n{'='*80}")
    print(f"OVERALL RESULT: {'✅ ALL TESTS PASSED' if all_pass else '❌ SOME TESTS FAILED'}")
    print(f"{'='*80}")
    
    return all_pass


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
