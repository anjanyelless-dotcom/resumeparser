#!/usr/bin/env python3
"""
Test full pipeline with real HR resume and insert into database.
"""

import sys
import json
import uuid
import psycopg2
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from parsers.rule_parser import RuleBasedParser
import pymupdf

# Database connection
DB_URL = "postgresql://postgres:postgres@localhost:5432/resume_parser"

# Extract text from HR resume
pdf_path = "/Users/anjanyelle/Desktop/untitled folder 3/lakshya_resume_parsers/ai-service/training/data/resumes/Meredith Sinclair Executive HR Resume.pdf"
doc = pymupdf.open(pdf_path)
text = ""
for page in doc:
    text += page.get_text()

print("="*80)
print("EXTRACTING TEXT FROM HR RESUME")
print("="*80)
print(text[:1000])
print("\n...")

# Initialize parser
parser = RuleBasedParser()

# Extract skills
skills = parser.extract_skills(text)

# Detect domain
domain_info = parser.detect_domain(skills)

# Extract licenses
licenses = parser.extract_licenses(text)

print("\n" + "="*80)
print("PARSING RESULTS")
print("="*80)
print(f"\nSkills: {len(skills)} total")
print(f"Domain: {domain_info['primary_domain']}")
print(f"Domain Confidence: {domain_info['confidence']:.2f}")
print(f"Licenses: {licenses}")

# Insert into database
print("\n" + "="*80)
print("INSERTING INTO DATABASE")
print("="*80)

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    candidate_id = str(uuid.uuid4())
    
    cur.execute("""
        INSERT INTO candidates (id, full_name, email, status, review_status, domain, domain_confidence, licenses, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    """, (
        candidate_id,
        "Meredith Sinclair",
        "m.sinclair.exec@talent-nexus.org",
        'success',
        'pending',
        domain_info['primary_domain'],
        domain_info['confidence'],
        json.dumps(licenses)
    ))
    
    conn.commit()
    print(f"✅ Inserted candidate {candidate_id}")
    
    # Query to verify
    cur.execute("""
        SELECT id, full_name, email, domain, domain_confidence, licenses 
        FROM candidates WHERE id = %s
    """, (candidate_id,))
    
    result = cur.fetchone()
    print("\n" + "="*80)
    print("DATABASE VERIFICATION")
    print("="*80)
    print(f"ID: {result[0]}")
    print(f"Name: {result[1]}")
    print(f"Email: {result[2]}")
    print(f"Domain: {result[3]}")
    print(f"Domain Confidence: {result[4]}")
    print(f"Licenses: {result[5]}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Database error: {e}")
    sys.exit(1)
