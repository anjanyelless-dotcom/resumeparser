#!/usr/bin/env python3
"""
Accuracy evaluation script for resume parser.

Computes field-level precision/recall/F1 and outputs a summary table.
Breaks down metrics by format (pdf/docx/doc/ocr).

Usage:
    python scripts/eval_accuracy.py --dataset data/ground_truth.json --output reports/accuracy_20250101.json
    python scripts/eval_accuracy.py --dataset data/ground_truth/ --output reports/accuracy_$(date +%Y%m%d).json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Add backend for phonenumbers/dateparser
_BACKEND = Path(__file__).resolve().parents[1] / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

try:
    import phonenumbers
    import dateparser
except ImportError:
    phonenumbers = None  # type: ignore
    dateparser = None  # type: ignore


def _collapse_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_string(value: Any) -> str:
    if value is None:
        return ""
    return _collapse_spaces(str(value)).lower()


def normalize_date(value: Any) -> str:
    if value is None:
        return ""
    raw = str(value).strip()
    if not raw:
        return ""
    if re.fullmatch(r"\d{4}-\d{2}", raw):
        return raw
    if dateparser:
        dt = dateparser.parse(raw)
        if dt:
            return dt.strftime("%Y-%m")
    return normalize_string(raw)


def normalize_phone(value: Any) -> str:
    if value is None:
        return ""
    raw = str(value).strip()
    if not raw:
        return ""
    if phonenumbers:
        try:
            region = None if raw.startswith("+") else "US"
            num = phonenumbers.parse(raw, region)
            if phonenumbers.is_valid_number(num):
                return phonenumbers.format_number(num, phonenumbers.PhoneNumberFormat.E164)
        except Exception:
            pass
    return re.sub(r"\D+", "", raw)


def normalize_skill(value: Any) -> str:
    if isinstance(value, dict):
        raw = value.get("normalized_name") or value.get("name") or ""
    else:
        raw = value
    return normalize_string(raw)


def field_f1(predicted: set[str], ground_truth: set[str]) -> dict[str, float]:
    """Compute precision, recall, F1 for set-based metrics."""
    tp = len(predicted & ground_truth)
    fp = len(predicted - ground_truth)
    fn = len(ground_truth - predicted)
    p = tp / (tp + fp) if tp + fp > 0 else 0.0
    r = tp / (tp + fn) if tp + fn > 0 else 0.0
    f1 = 2 * p * r / (p + r) if p + r > 0 else 0.0
    return {"precision": p, "recall": r, "f1": f1}


def _get_contact_value(payload: dict[str, Any], field: str) -> str:
    """Extract contact field from parsed or ground_truth payload."""
    contact = payload.get("contact")
    if not isinstance(contact, dict):
        return ""
    if field == "full_name":
        name = contact.get("name")
        if isinstance(name, dict):
            return str(name.get("name") or "")
        return str(contact.get("full_name") or "")
    if field == "email":
        emails = contact.get("emails")
        if isinstance(emails, list) and emails:
            first = emails[0]
            return str(first.get("email") if isinstance(first, dict) else first)
        return str(contact.get("email") or "")
    if field == "phone":
        phones = contact.get("phones")
        if isinstance(phones, list) and phones:
            first = phones[0]
            return str(first.get("phone") if isinstance(first, dict) else first)
        return str(contact.get("phone") or "")
    if field == "location":
        loc = contact.get("location")
        if isinstance(loc, dict):
            parts = [loc.get("city"), loc.get("state"), loc.get("country")]
            return ", ".join(str(p) for p in parts if p)
        return str(contact.get("location") or "")
    return ""


def _contact_match(pred: dict, truth: dict) -> dict[str, dict[str, float]]:
    """Contact: email (exact), phone (normalized), name match."""
    results: dict[str, dict[str, float]] = {}
    for field in ["email", "phone", "full_name"]:
        pv = _get_contact_value(pred, field)
        tv = _get_contact_value(truth, field)
        if field == "email":
            match = normalize_string(pv) == normalize_string(tv)
        elif field == "phone":
            match = normalize_phone(pv) == normalize_phone(tv) or (not pv and not tv)
        else:
            match = normalize_string(pv) == normalize_string(tv)
        p = r = f1 = 1.0 if match else 0.0
        results[f"contact_{field}"] = {"precision": p, "recall": r, "f1": f1}
    return results


def _get_work_jobs(p: dict) -> list[dict]:
    """Extract work history from work_history or work_experience."""
    for key in ("work_history", "work_experience"):
        raw = p.get(key)
        if isinstance(raw, list):
            return [j for j in raw if isinstance(j, dict)]
    return []


def _work_match(pred: dict, truth: dict) -> dict[str, dict[str, float]]:
    """Experience: jobs matched (company+date range), title match."""
    truth_jobs = _get_work_jobs(truth)
    pred_jobs = _get_work_jobs(pred)

    def _job_key(j: dict) -> str:
        company = normalize_string(j.get("company_name") or j.get("company"))
        start = normalize_date(j.get("start_date"))
        end = normalize_date(j.get("end_date"))
        return f"{company}|{start}|{end}"

    truth_keys = {_job_key(j) for j in truth_jobs if _job_key(j) != "||"}
    pred_keys = {_job_key(j) for j in pred_jobs if _job_key(j) != "||"}
    job_match = field_f1(pred_keys, truth_keys)

    truth_titles = {
        normalize_string(j.get("job_title") or j.get("title"))
        for j in truth_jobs
        if normalize_string(j.get("job_title") or j.get("title"))
    }
    pred_titles = {
        normalize_string(j.get("job_title") or j.get("title"))
        for j in pred_jobs
        if normalize_string(j.get("job_title") or j.get("title"))
    }
    title_match = field_f1(pred_titles, truth_titles)

    return {
        "work_company": job_match,
        "work_title": title_match,
    }


def _education_match(pred: dict, truth: dict) -> dict[str, dict[str, float]]:
    """Education: degrees matched (institution+degree type)."""
    truth_edu = [e for e in (truth.get("education") or []) if isinstance(e, dict)]
    pred_edu = [e for e in (pred.get("education") or []) if isinstance(e, dict)]

    def _edu_key(e: dict) -> str:
        inst = normalize_string(e.get("institution"))
        degree = normalize_string(e.get("degree"))
        return f"{inst}|{degree}"

    truth_keys = {_edu_key(e) for e in truth_edu if _edu_key(e) != "|"}
    pred_keys = {_edu_key(e) for e in pred_edu if _edu_key(e) != "|"}
    return {"education": field_f1(pred_keys, truth_keys)}


def _skills_match(pred: dict, truth: dict) -> dict[str, dict[str, float]]:
    """Skills: set intersection/union vs ground truth."""
    def _skills_set(p: dict) -> set[str]:
        raw = p.get("skills")
        if not isinstance(raw, list):
            return set()
        out: set[str] = set()
        for item in raw:
            if isinstance(item, dict):
                s = normalize_skill(item.get("normalized_name") or item.get("name"))
            else:
                s = normalize_skill(item)
            if s:
                out.add(s)
        return out

    pred_s = _skills_set(pred)
    truth_s = _skills_set(truth)
    return {"skills": field_f1(pred_s, truth_s)}


def _sections_match(pred: dict, truth: dict) -> dict[str, dict[str, float]]:
    """Sections detected: F1 vs ground truth section list."""
    def _section_keys(p: dict) -> set[str]:
        sections = p.get("sections")
        if not isinstance(sections, dict):
            return set()
        return {k for k, v in sections.items() if isinstance(v, dict) and str(v.get("content") or "").strip()}

    pred_s = _section_keys(pred)
    truth_s = _section_keys(truth)
    return {"sections_detected": field_f1(pred_s, truth_s)}


def compute_record_metrics(pred: dict, truth: dict) -> dict[str, dict[str, float]]:
    """Compute all field-level metrics for one record."""
    metrics: dict[str, dict[str, float]] = {}
    metrics.update(_contact_match(pred, truth))
    metrics.update(_work_match(pred, truth))
    metrics.update(_education_match(pred, truth))
    metrics.update(_skills_match(pred, truth))
    metrics.update(_sections_match(pred, truth))
    return metrics


def _contact_tp_fp_fn(pred: dict, truth: dict) -> dict[str, tuple[int, int, int]]:
    """Contact fields: binary match per field -> (tp, fp, fn)."""
    out: dict[str, tuple[int, int, int]] = {}
    for field in ["email", "phone", "full_name"]:
        pv = _get_contact_value(pred, field)
        tv = _get_contact_value(truth, field)
        if field == "phone":
            match = normalize_phone(pv) == normalize_phone(tv) or (not pv.strip() and not tv.strip())
        else:
            match = normalize_string(pv) == normalize_string(tv)
        tp = 1 if match else 0
        fp = 1 if (pv.strip() and not match) else 0
        fn = 1 if (tv.strip() and not match) else 0
        out[f"contact_{field}"] = (tp, fp, fn)
    return out


def _work_tp_fp_fn(pred: dict, truth: dict) -> dict[str, tuple[int, int, int]]:
    """Work: company+date keys and titles as sets."""
    truth_jobs = _get_work_jobs(truth)
    pred_jobs = _get_work_jobs(pred)

    def _job_key(j: dict) -> str:
        company = normalize_string(j.get("company_name") or j.get("company"))
        start = normalize_date(j.get("start_date"))
        end = normalize_date(j.get("end_date"))
        return f"{company}|{start}|{end}"

    truth_keys = {_job_key(j) for j in truth_jobs if _job_key(j) != "||"}
    pred_keys = {_job_key(j) for j in pred_jobs if _job_key(j) != "||"}
    job_f1 = field_f1(pred_keys, truth_keys)
    tp_j = len(pred_keys & truth_keys)
    fp_j = len(pred_keys - truth_keys)
    fn_j = len(truth_keys - pred_keys)

    truth_titles = {
        normalize_string(j.get("job_title") or j.get("title"))
        for j in truth_jobs
        if normalize_string(j.get("job_title") or j.get("title"))
    }
    pred_titles = {
        normalize_string(j.get("job_title") or j.get("title"))
        for j in pred_jobs
        if normalize_string(j.get("job_title") or j.get("title"))
    }
    tp_t = len(pred_titles & truth_titles)
    fp_t = len(pred_titles - truth_titles)
    fn_t = len(truth_titles - pred_titles)

    return {
        "work_company": (tp_j, fp_j, fn_j),
        "work_title": (tp_t, fp_t, fn_t),
    }


def _education_tp_fp_fn(pred: dict, truth: dict) -> dict[str, tuple[int, int, int]]:
    """Education: institution+degree keys."""
    truth_edu = [e for e in (truth.get("education") or []) if isinstance(e, dict)]
    pred_edu = [e for e in (pred.get("education") or []) if isinstance(e, dict)]

    def _edu_key(e: dict) -> str:
        return f"{normalize_string(e.get('institution'))}|{normalize_string(e.get('degree'))}"

    truth_s = {_edu_key(e) for e in truth_edu if _edu_key(e) != "|"}
    pred_s = {_edu_key(e) for e in pred_edu if _edu_key(e) != "|"}
    tp = len(pred_s & truth_s)
    fp = len(pred_s - truth_s)
    fn = len(truth_s - pred_s)
    return {"education": (tp, fp, fn)}


def _skills_tp_fp_fn(pred: dict, truth: dict) -> dict[str, tuple[int, int, int]]:
    """Skills: set intersection."""
    def _skills_set(p: dict) -> set[str]:
        raw = p.get("skills") or []
        if not isinstance(raw, list):
            return set()
        out: set[str] = set()
        for item in raw:
            s = normalize_skill(item)
            if s:
                out.add(s)
        return out

    pred_s = _skills_set(pred)
    truth_s = _skills_set(truth)
    tp = len(pred_s & truth_s)
    fp = len(pred_s - truth_s)
    fn = len(truth_s - pred_s)
    return {"skills": (tp, fp, fn)}


def _sections_tp_fp_fn(pred: dict, truth: dict) -> dict[str, tuple[int, int, int]]:
    """Sections: keys with non-empty content."""
    def _section_keys(p: dict) -> set[str]:
        s = p.get("sections") or {}
        return {k for k, v in (s.items() if isinstance(s, dict) else []) if str((v or {}).get("content") or "").strip()}

    pred_s = _section_keys(pred)
    truth_s = _section_keys(truth)
    tp = len(pred_s & truth_s)
    fp = len(pred_s - truth_s)
    fn = len(truth_s - pred_s)
    return {"sections_detected": (tp, fp, fn)}


def aggregate_metrics(
    records: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, float]], dict[str, dict[str, dict[str, float]]]]:
    """Aggregate metrics across records and by format."""
    field_totals: dict[str, tuple[int, int, int]] = {}
    by_format: dict[str, list[dict[str, dict[str, float]]]] = {}

    TARGETS: dict[str, float] = {
        "contact_email": 0.95,
        "contact_phone": 0.90,
        "contact_full_name": 0.95,
        "work_company": 0.85,
        "work_title": 0.82,
        "education": 0.85,
        "skills": 0.80,
        "sections_detected": 0.85,
    }

    for rec in records:
        pred = rec.get("parsed") or {}
        truth = rec.get("ground_truth") or {}
        if not truth or "error" in pred:
            continue

        fmt = rec.get("format") or "unknown"
        if fmt in ("png", "jpg", "jpeg"):
            fmt = "ocr"
        by_format.setdefault(fmt, [])

        metrics = compute_record_metrics(pred, truth)
        by_format[fmt].append(metrics)

        # Accumulate tp, fp, fn for set-based fields
        for field, (tp, fp, fn) in {
            **_contact_tp_fp_fn(pred, truth),
            **_work_tp_fp_fn(pred, truth),
            **_education_tp_fp_fn(pred, truth),
            **_skills_tp_fp_fn(pred, truth),
            **_sections_tp_fp_fn(pred, truth),
        }.items():
            prev = field_totals.get(field, (0, 0, 0))
            field_totals[field] = (prev[0] + tp, prev[1] + fp, prev[2] + fn)

    overall: dict[str, dict[str, float]] = {}
    for field, (tp, fp, fn) in field_totals.items():
        p = tp / (tp + fp) if tp + fp > 0 else 0.0
        r = tp / (tp + fn) if tp + fn > 0 else 0.0
        f1 = 2 * p * r / (p + r) if p + r > 0 else 0.0
        overall[field] = {
            "precision": round(p, 4),
            "recall": round(r, 4),
            "f1": round(f1, 4),
            "target": TARGETS.get(field, 0.0),
        }

    format_agg: dict[str, dict[str, dict[str, float]]] = {}
    for fmt, rec_metrics in by_format.items():
        format_agg[fmt] = {}
        for field in overall:
            vals = [m.get(field, {}) for m in rec_metrics if field in m]
            if not vals:
                format_agg[fmt][field] = {"precision": 0.0, "recall": 0.0, "f1": 0.0}
                continue
            p_avg = sum(v.get("precision", 0) for v in vals) / len(vals)
            r_avg = sum(v.get("recall", 0) for v in vals) / len(vals)
            f1_avg = sum(v.get("f1", 0) for v in vals) / len(vals)
            format_agg[fmt][field] = {
                "precision": round(p_avg, 4),
                "recall": round(r_avg, 4),
                "f1": round(f1_avg, 4),
            }

    return overall, format_agg


def load_dataset(path: Path) -> list[dict[str, Any]]:
    """Load ground truth dataset from file or directory."""
    records: list[dict[str, Any]] = []
    if path.is_file():
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            records = data
        else:
            records = [data]
    elif path.is_dir():
        for f in sorted(path.glob("*.json")):
            data = json.loads(f.read_text(encoding="utf-8"))
            if isinstance(data, list):
                records.extend(data)
            else:
                records.append(data)
    return records


def print_summary_table(overall: dict[str, dict[str, float]]) -> None:
    """Print summary table."""
    print("Field               | Precision | Recall | F1    | Target")
    print("-" * 58)
    for field, m in sorted(overall.items()):
        p = m.get("precision", 0)
        r = m.get("recall", 0)
        f1 = m.get("f1", 0)
        t = m.get("target", 0)
        print(f"{field:18} | {p:9.2f} | {r:6.2f} | {f1:5.2f} | {t:.2f}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Evaluate parser accuracy against ground truth",
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "ground_truth.json",
        help="Path to ground truth JSON file or directory with JSON files",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output JSON report path (default: reports/accuracy_YYYYMMDD.json)",
    )
    args = parser.parse_args()

    records = load_dataset(args.dataset)
    if not records:
        print(
            "No records found in dataset. "
            "Use --dataset data/ground_truth.json (from build_ground_truth.py) or --dataset data/eval_test.json for a demo.",
            file=sys.stderr,
        )
        sys.exit(1)

    with_truth = sum(1 for r in records if r.get("ground_truth"))
    if with_truth == 0:
        print(
            "No records with ground_truth filled. Either:\n"
            "  1. Edit data/ground_truth.json and fill the 'ground_truth' object for each record (same shape as 'parsed'), or\n"
            "  2. Run with --dataset data/eval_test.json to try the script with sample data.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Evaluating {with_truth} records with ground truth (of {len(records)} total)")

    overall, by_format = aggregate_metrics(records)

    print("\n=== Overall Summary ===")
    print_summary_table(overall)

    if by_format:
        print("\n=== By Format ===")
        for fmt, metrics in sorted(by_format.items()):
            print(f"\n--- {fmt} ---")
            for field, m in sorted(metrics.items()):
                print(f"  {field}: P={m['precision']:.2f} R={m['recall']:.2f} F1={m['f1']:.2f}")

    report = {
        "timestamp": datetime.now().isoformat(),
        "dataset": str(args.dataset),
        "total_records": len(records),
        "records_with_ground_truth": with_truth,
        "overall": overall,
        "by_format": by_format,
    }

    out_path = args.output or (
        Path(__file__).resolve().parents[1] / "reports" / f"accuracy_{datetime.now().strftime('%Y%m%d')}.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\nReport written to {out_path}")


if __name__ == "__main__":
    main()
