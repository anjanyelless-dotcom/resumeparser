#!/usr/bin/env python3
"""
Build ground-truth dataset for parser evaluation.

Takes 200 diverse resumes (pdf, docx, doc, image, txt, rtf), runs the parser,
and outputs a side-by-side comparison JSON for manual labeling.

Output schema per resume:
{
    'file': 'resume_001.pdf',
    'format': 'pdf',
    'parsed': { <full parser output> },
    'ground_truth': { <manually filled> },
    'scores': {}  # filled by eval script
}

Usage:
    python scripts/build_ground_truth.py [--resumes-dir PATH] [--output PATH] [--limit N]
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from dataclasses import asdict
from datetime import date
from pathlib import Path
from typing import Any

# Add backend to path for imports
_BACKEND = Path(__file__).resolve().parents[1] / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.services.parser.certification_parser import CertificationParser
from app.services.parser.contact_extractor import ContactExtractor
from app.services.parser.education_parser import EducationParser
from app.services.parser.extract_text import extract_text
from app.services.parser.section_boundary_extractor import extract_certifications
from app.services.parser.section_parser import SectionParser
from app.services.parser.skill_extractor import SkillExtractor
from app.services.parser.work_experience_parser import WorkExperienceParser

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Target distribution for 200-sample dataset
TARGET_DISTRIBUTION = {
    "pdf": 40,  # simple 1-col, 2-col, table-based, scanned image
    "docx": 40,  # plain, with tables, with textboxes, with headers
    "doc": 20,  # legacy Word format
    "image": 20,  # PNG/JPG: scanned, printed, handwritten notes
    "txt_rtf": 40,  # exported plain text, complex RTF
    "mixed": 40,  # multilingual, gaps, academic CVs, contractor, executive bios
}

EXT_TO_FORMAT: dict[str, str] = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "doc",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".txt": "txt_rtf",
    ".rtf": "txt_rtf",
}


def _format_date_ym(d: date | None) -> str | None:
    if not d:
        return None
    return d.strftime("%Y-%m")


def _parse_resume(file_path: Path) -> dict[str, Any]:
    """Run deterministic parser on a resume file."""
    extracted = extract_text(file_path)
    raw_text = extracted.text

    section_parser = SectionParser(use_spacy=False)
    sections = section_parser.parse(raw_text)

    contact_extractor = ContactExtractor()
    contact = contact_extractor.extract_all(raw_text)

    experience_text = raw_text
    exp_section = sections.get("experience")
    if exp_section is not None and getattr(exp_section, "content", ""):
        experience_text = exp_section.content

    work_parser = WorkExperienceParser()
    jobs = work_parser.parse_experience_section(experience_text)

    education_text = raw_text
    edu_section = sections.get("education")
    if edu_section is not None and getattr(edu_section, "content", ""):
        education_text = edu_section.content
    education_entries = EducationParser().parse(education_text)

    cert_text = ""
    boundary = extract_certifications(raw_text)
    if getattr(boundary, "section_found", False) and getattr(boundary, "content", ""):
        cert_text = boundary.content
    else:
        cert_section = sections.get("certifications")
        if cert_section is not None and getattr(cert_section, "content", ""):
            cert_text = cert_section.content
    certifications = CertificationParser().parse(cert_text) if cert_text.strip() else []

    skills_text = ""
    skills_conf = None
    skills_section = sections.get("skills")
    if skills_section is not None and getattr(skills_section, "content", ""):
        skills_text = skills_section.content
        try:
            skills_conf = float(getattr(skills_section, "confidence", 0.0) or 0.0)
        except (TypeError, ValueError):
            skills_conf = None

    skill_extractor = SkillExtractor(use_spacy=False)
    skill_matches = skill_extractor.extract_all(
        skills_text,
        jobs,
        skills_section_confidence=skills_conf,
        raw_text=raw_text,
    )

    def _first_email() -> str | None:
        return contact.emails[0].email if contact.emails else None

    def _first_phone() -> str | None:
        return contact.phones[0].phone if contact.phones else None

    linkedin = None
    try:
        linkedin = contact.urls.linkedin.url if contact.urls and contact.urls.linkedin else None
    except Exception:
        linkedin = None

    location = None
    try:
        parts = [
            getattr(contact.location, "city", None),
            getattr(contact.location, "state", None),
            getattr(contact.location, "country", None),
        ]
        parts = [p for p in parts if isinstance(p, str) and p.strip()]
        location = ", ".join(parts) if parts else None
    except Exception:
        location = None

    return {
        "sections": {
            key: {
                "content": getattr(value, "content", ""),
                "confidence": getattr(value, "confidence", 0.0),
            }
            for key, value in sections.items()
        },
        "contact": {
            "full_name": getattr(contact.name, "name", None),
            "email": _first_email(),
            "phone": _first_phone(),
            "linkedin_url": linkedin,
            "location": location,
        },
        "work_history": [
            {
                "company_name": j.company,
                "client_name": j.client,
                "job_title": j.title,
                "start_date": _format_date_ym(j.start_date),
                "end_date": _format_date_ym(j.end_date),
                "is_current": bool(j.is_current),
                "location": j.location,
                "bullets": list(j.bullets or []),
                "description": j.description,
                "confidence": j.confidence,
            }
            for j in jobs
        ],
        "education": [
            {
                "institution": e.institution,
                "degree": e.degree,
                "field_of_study": e.field_of_study,
                "start_date": _format_date_ym(e.start_date),
                "end_date": _format_date_ym(e.end_date),
                "in_progress": bool(e.in_progress),
                "confidence": e.confidence,
            }
            for e in education_entries
        ],
        "certifications": [
            {
                "name": c.name,
                "issuing_organization": c.issuing_organization,
                "issue_date": _format_date_ym(c.issue_date),
                "expiry_date": _format_date_ym(c.expiry_date),
                "credential_id": c.credential_id,
                "credential_url": getattr(c, "credential_url", None),
                "confidence": c.confidence,
            }
            for c in certifications
        ],
        "skills": [asdict(m) for m in skill_matches],
        "raw_text_debug": {
            "method": extracted.method,
            "used_ocr": extracted.used_ocr,
            "ocr_confidence": getattr(extracted, "ocr_confidence", None),
        },
    }


def load_resume_samples(
    resumes_dir: Path,
    *,
    limit: int = 200,
    target_distribution: dict[str, int] | None = None,
) -> list[tuple[Path, str]]:
    """
    Load resume files from resumes/ directory, respecting target distribution.

    Directory structure (any of):
    - Flat: resumes/*.pdf, resumes/*.docx, etc.
    - By format: resumes/pdf/, resumes/docx/, resumes/images/, etc.
    - By type: resumes/simple_1col/, resumes/2col/, resumes/scanned/, etc.

    Returns list of (file_path, format) tuples.
    """
    target = target_distribution or TARGET_DISTRIBUTION
    if not resumes_dir.exists():
        logger.warning("Resumes directory %s does not exist", resumes_dir)
        return []

    # Collect all resume files with format
    all_files: list[tuple[Path, str]] = []
    mixed_names = {"mixed", "edge_cases", "edge", "multilingual", "academic", "contractor", "executive"}
    for path in resumes_dir.rglob("*"):
        if not path.is_file():
            continue
        ext = path.suffix.lower()
        # Check if in mixed/edge-case subfolder
        try:
            rel = path.relative_to(resumes_dir)
            parts = rel.parts[:-1]  # exclude filename
            if any(p.lower() in mixed_names for p in parts):
                fmt = "mixed"
            else:
                fmt = EXT_TO_FORMAT.get(ext)
        except ValueError:
            fmt = EXT_TO_FORMAT.get(ext)
        if fmt:
            all_files.append((path, fmt))

    if not all_files:
        logger.warning("No resume files found in %s", resumes_dir)
        return []

    # Group by format
    by_format: dict[str, list[Path]] = {}
    for path, fmt in all_files:
        by_format.setdefault(fmt, []).append(path)

    # Sample according to target distribution
    result: list[tuple[Path, str]] = []
    for fmt, target_count in target.items():
        available = by_format.get(fmt, [])
        n = min(target_count, len(available))
        if n > 0:
            # Take first n (deterministic); could shuffle with seed for variety
            for path in sorted(available)[:n]:
                result.append((path, fmt))

    # If we have fewer than limit, add remaining from any format
    if len(result) < limit:
        used = {p for p, _ in result}
        remaining = [(p, f) for p, f in all_files if p not in used]
        for path, fmt in sorted(remaining, key=lambda x: (x[1], str(x[0])))[: limit - len(result)]:
            result.append((path, fmt))

    return result[:limit]


def build_ground_truth(
    resumes_dir: Path,
    output_path: Path,
    *,
    limit: int = 200,
) -> None:
    """Parse resumes and write ground-truth JSON for manual labeling."""
    samples = load_resume_samples(resumes_dir, limit=limit)
    if not samples:
        logger.error("No samples to process. Place resume files in %s", resumes_dir)
        return

    logger.info("Processing %d resumes from %s", len(samples), resumes_dir)
    records: list[dict[str, Any]] = []

    for i, (file_path, fmt) in enumerate(samples):
        try:
            rel_path = file_path.relative_to(resumes_dir)
        except ValueError:
            rel_path = Path(file_path.name)
        logger.info("[%d/%d] %s (%s)", i + 1, len(samples), rel_path, fmt)

        try:
            parsed = _parse_resume(file_path)
        except Exception as exc:
            logger.warning("Parse failed for %s: %s", file_path, exc)
            parsed = {"error": str(exc), "raw_text_debug": {}}

        records.append({
            "file": str(rel_path),
            "format": fmt,
            "parsed": parsed,
            "ground_truth": {},  # To be filled manually
            "scores": {},  # Filled by eval script
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    logger.info("Wrote %d records to %s", len(records), output_path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build ground-truth dataset for parser evaluation",
    )
    parser.add_argument(
        "--resumes-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "resumes",
        help="Directory containing resume files (default: project/resumes)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "ground_truth.json",
        help="Output JSON path (default: project/data/ground_truth.json)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=200,
        help="Max number of resumes to process (default: 200)",
    )
    args = parser.parse_args()

    build_ground_truth(args.resumes_dir, args.output, limit=args.limit)


if __name__ == "__main__":
    main()
