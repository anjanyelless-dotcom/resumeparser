#!/usr/bin/env python3
"""
Verify the exact JSON structure returned by the parser for domain and licenses.
"""

import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from parsers.rule_parser import RuleBasedParser

# Healthcare sample
healthcare_sample = """Registered Nurse with 5 years experience in ICU. BLS certified, ACLS certified. 
Skilled in patient assessment, critical care, medication administration, and IV therapy. 
BSN degree from state university."""

# Initialize parser
parser = RuleBasedParser()

# Extract skills
skills = parser.extract_skills(healthcare_sample)

# Detect domain
domain_info = parser.detect_domain(skills)

# Extract licenses
licenses = parser.extract_licenses(healthcare_sample)

# Print the exact JSON structure
print("="*80)
print("EXACT JSON STRUCTURE RETURNED BY PARSER")
print("="*80)
print("\nDomain Info (result['domain']):")
print(json.dumps(domain_info, indent=2))

print("\nLicenses (result['licenses']):")
print(json.dumps(licenses, indent=2))

print("\n\nFull structure as would be in AI response:")
full_structure = {
    "skills": skills,
    "domain": domain_info,
    "licenses": licenses
}
print(json.dumps(full_structure, indent=2))
