"""
License and Certification Patterns for Resume Parsing

This module defines regex patterns for extracting professional licenses and certifications
from resume text across various domains (Healthcare, Finance, HR, Engineering, Legal).

Note on false-positive risks:
- Short abbreviations like "PA", "CA" can match state abbreviations or common words
- Context guards are added for high-risk patterns to reduce false positives
- Some patterns require nearby context words (licensed, certified, etc.) for safety
"""

import re

LICENSE_PATTERNS = {
    # Healthcare Licenses and Certifications
    "RN": r"\bR\.?N\.?\b",
    "LPN": r"\bL\.?P\.?N\.?\b",
    "NP": r"\bN\.?P\.?\b",
    "PA": r"\bP\.?A\.?\b",  # HIGH RISK: Can match "PA" state or "Personal Assistant"
    "MD": r"\bM\.?D\.?\b",
    "DO": r"\bD\.?O\.?\b",
    "BLS": r"\bBLS\b",
    "ACLS": r"\bACLS\b",
    "PALS": r"\bPALS\b",
    "CCRN": r"\bCCRN\b",
    "CNA": r"\bC\.?N\.?A\.?\b",
    "CPR": r"\bCPR\b",
    "NRP": r"\bNRP\b",
    "RN-BC": r"\bRN-BC\b",
    "CEN": r"\bCEN\b",
    "CIC": r"\bCIC\b",
    "CMC": r"\bCMC\b",
    "CNOR": r"\bCNOR\b",
    "CPAN": r"\bCPAN\b",
    "CRNA": r"\bCRNA\b",
    "CRRN": r"\bCRRN\b",
    "FNP": r"\bF\.?N\.?P\.?\b",
    "NCLEX": r"\bNCLEX\b",
    "USMLE": r"\bUSMLE\b",
    "COMLEX": r"\bCOMLEX\b",
    
    # Finance Certifications
    "CPA": r"\bC\.?P\.?A\.?\b",
    "CFA": r"\bCFA\b",
    "CA": r"\bC\.?A\.?\b",  # HIGH RISK: Can match "CA" state abbreviation or "California"
    "ACCA": r"\bACCA\b",
    "CMA": r"\bCMA\b",
    "CIMA": r"\bCIMA\b",
    "FRM": r"\bFRM\b",
    "CAIA": r"\bCAIA\b",
    "CIA": r"\bCIA\b",
    "CFP": r"\bCFP\b",
    "CISA": r"\bCISA\b",
    "CISM": r"\bCISM\b",
    "SOX": r"\bSOX\b",
    
    # HR Certifications
    "SHRM-CP": r"\bSHRM-CP\b",
    "SHRM-SCP": r"\bSHRM-SCP\b",
    "PHR": r"\bPHR\b",
    "SPHR": r"\bSPHR\b",
    "aPHR": r"\baPHR\b",
    "HRCI": r"\bHRCI\b",
    
    # Engineering and Project Management Certifications
    "PE": r"\bP\.?E\.?\b",  # MEDIUM RISK: Can match "PE" in other contexts
    "PMP": r"\bPMP\b",
    "PMI-ACP": r"\bPMI-ACP\b",
    "PgMP": r"\bPgMP\b",
    "CAPM": r"\bCAPM\b",
    "Six Sigma": r"\bSix Sigma\b",
    "Lean Six Sigma": r"\bLean Six Sigma\b",
    "Black Belt": r"\bBlack Belt\b",
    "Green Belt": r"\bGreen Belt\b",
    "Scrum Master": r"\bScrum Master\b",
    "CSM": r"\bCSM\b",
    "PSM": r"\bPSM\b",
    "PMP-ACP": r"\bPMP-ACP\b",
    
    # Legal Certifications
    "Esq": r"\bEsq\.?\b",
    "J.D.": r"\bJ\.?D\.?\b",
    "JD": r"\bJD\b",
    "Bar Admission": r"\bBar Admission\b",
    "Bar Exam": r"\bBar Exam\b",
    "LL.M": r"\bLL\.?M\.?\b",
    "LLM": r"\bLLM\b",
    "Juris Doctor": r"\bJuris Doctor\b",
}

# Context words that increase confidence for high-risk patterns
CONTEXT_KEYWORDS = {
    "licensed", "certified", "certification", "license", "holder",
    "credential", "accredited", "qualified", "registered", "board"
}

# High-risk patterns that require context validation
HIGH_RISK_PATTERNS = {"PA", "CA", "PE", "RN", "NP", "MD", "DO"}


def extract_licenses(text: str) -> list:
    """
    Extract licenses and certifications from resume text using regex patterns.
    
    Args:
        text: Resume text to search for licenses/certifications
        
    Returns:
        List of matched license/certification names (deduplicated)
    """
    found_licenses = []
    text_lower = text.lower()
    
    for license_name, pattern in LICENSE_PATTERNS.items():
        try:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # For high-risk patterns, check for context keywords
                if license_name in HIGH_RISK_PATTERNS:
                    # Extract surrounding text (50 chars before and after)
                    start = max(0, match.start() - 50)
                    end = min(len(text), match.end() + 50)
                    context = text[start:end].lower()
                    
                    # Check if context keywords are present
                    has_context = any(keyword in context for keyword in CONTEXT_KEYWORDS)
                    
                    # Additional guard: avoid state abbreviation patterns
                    # (e.g., "New York, PA" or "Los Angeles, CA")
                    if license_name in {"PA", "CA"}:
                        # Check if it's preceded by a comma (likely state)
                        if match.start() > 0 and text[match.start()-1] == ',':
                            continue
                        # Check if followed by a comma (likely state)
                        if match.end() < len(text) and text[match.end()] == ',':
                            continue
                    
                    # Only include if context is present for high-risk patterns
                    if not has_context:
                        continue
                
                found_licenses.append(license_name)
        except re.error:
            # Skip invalid patterns
            continue
    
    # Deduplicate while preserving order
    seen = set()
    result = []
    for license_name in found_licenses:
        if license_name not in seen:
            seen.add(license_name)
            result.append(license_name)
    
    return result


if __name__ == "__main__":
    # Test the extraction
    test_texts = [
        "Registered Nurse with BLS and ACLS certification.",
        "CPA certified accountant with CFA designation.",
        "Licensed Professional Engineer (PE) in California.",
        "Attorney at law, Esq., J.D. from Harvard Law.",
    ]
    
    for text in test_texts:
        print(f"Text: {text}")
        print(f"Extracted: {extract_licenses(text)}")
        print()
