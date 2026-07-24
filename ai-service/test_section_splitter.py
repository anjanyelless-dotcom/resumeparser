"""
Test script to verify backward compatibility of section_splitter improvements.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from parsers.section_splitter import split_sections, SectionSplitter, get_benchmark_metrics, reset_benchmark_metrics

# Test resume text
test_resume = """
John Doe
john.doe@email.com
+1 234 567 8900

PROFESSIONAL SUMMARY
Experienced software engineer with expertise in Python, Java, and cloud technologies.

WORK EXPERIENCE
Software Engineer at ABC Corp
2020 - Present
- Developed microservices using Python and FastAPI
- Managed AWS infrastructure

EDUCATION
Bachelor of Science in Computer Science
University of XYZ
2016 - 2020

SKILLS
Python, Java, JavaScript, AWS, Docker, Kubernetes

CERTIFICATIONS
AWS Certified Solutions Architect
Google Cloud Professional
"""

def test_backward_compatibility():
    """Test that the default API response format is preserved."""
    print("Testing backward compatibility...")
    
    # Test 1: Default behavior (include_metadata=False)
    print("\nTest 1: Default behavior (include_metadata=False)")
    sections = split_sections(test_resume)
    print(f"Sections found: {list(sections.keys())}")
    
    # Verify sections are strings, not dicts
    for section_name, section_text in sections.items():
        if isinstance(section_text, dict):
            print(f"ERROR: Section '{section_name}' is a dict instead of string!")
            return False
        else:
            print(f"  ✓ Section '{section_name}' is a string ({len(section_text)} chars)")
    
    # Test 2: With metadata (include_metadata=True)
    print("\nTest 2: With metadata (include_metadata=True)")
    sections_with_metadata = split_sections(test_resume, include_metadata=True)
    print(f"Sections found: {list(sections_with_metadata.keys())}")
    
    # Verify sections are dicts with metadata
    for section_name, section_data in sections_with_metadata.items():
        if not isinstance(section_data, dict):
            print(f"ERROR: Section '{section_name}' is not a dict!")
            return False
        else:
            print(f"  ✓ Section '{section_name}' is a dict with keys: {list(section_data.keys())}")
            if 'text' not in section_data or 'confidence' not in section_data or 'detection_method' not in section_data:
                print(f"ERROR: Section '{section_name}' missing required metadata keys!")
                return False
    
    # Test 3: SectionSplitter class with default behavior
    print("\nTest 3: SectionSplitter class with default behavior")
    splitter = SectionSplitter(resume_id="test_resume_001")
    sections_class = splitter.split_sections(test_resume)
    print(f"Sections found: {list(sections_class.keys())}")
    
    for section_name, section_text in sections_class.items():
        if isinstance(section_text, dict):
            print(f"ERROR: Section '{section_name}' is a dict instead of string!")
            return False
        else:
            print(f"  ✓ Section '{section_name}' is a string ({len(section_text)} chars)")
    
    # Test 4: SectionSplitter class with metadata
    print("\nTest 4: SectionSplitter class with metadata")
    sections_class_metadata = splitter.split_sections(test_resume, include_metadata=True)
    print(f"Sections found: {list(sections_class_metadata.keys())}")
    
    for section_name, section_data in sections_class_metadata.items():
        if not isinstance(section_data, dict):
            print(f"ERROR: Section '{section_name}' is not a dict!")
            return False
        else:
            print(f"  ✓ Section '{section_name}' is a dict with keys: {list(section_data.keys())}")
    
    # Test 5: Check benchmark metrics
    print("\nTest 5: Benchmark metrics")
    metrics = get_benchmark_metrics()
    print(f"Metrics: {metrics}")
    
    # Test 6: Reset metrics
    print("\nTest 6: Reset metrics")
    reset_benchmark_metrics()
    metrics_after_reset = get_benchmark_metrics()
    print(f"Metrics after reset: {metrics_after_reset}")
    
    print("\n✅ All backward compatibility tests passed!")
    return True

if __name__ == "__main__":
    success = test_backward_compatibility()
    sys.exit(0 if success else 1)
