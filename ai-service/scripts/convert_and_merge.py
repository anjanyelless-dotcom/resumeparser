#!/usr/bin/env python3
"""
Convert and Merge Multi-Domain Skills and Roles

This script:
1. Parses ALL_CATG_SKILLS.txt and ALL_CAT_ROLES.txt (Python dict syntax)
2. Merges skills with existing worldwide_clean_18300_it_skills_domain_wise.json
3. Merges roles with existing it_job_roles.csv
4. Creates unified_skills.json and unified_roles.csv
5. Prints summary table of counts before/after merge
"""

import ast
import csv
import json
import os
from pathlib import Path
from typing import Dict, List, Set

# File paths
BASE_DIR = Path(__file__).parent.parent
ALL_CAT_ROLES_PATH = BASE_DIR / "ALL_CAT_ROLES.txt"
ALL_CAT_SKILLS_PATH = BASE_DIR / "ALL_CATG_SKILLS.txt"
EXISTING_SKILLS_PATH = BASE_DIR / "worldwide_clean_18300_it_skills_domain_wise.json"
EXISTING_ROLES_PATH = BASE_DIR / "it_job_roles.csv"
OUTPUT_SKILLS_PATH = BASE_DIR / "unified_skills.json"
OUTPUT_ROLES_PATH = BASE_DIR / "unified_roles.csv"

# Domain mappings
DOMAIN_MAPPING = {
    "HEALTHCARE_ROLES": "Healthcare",
    "FINANCE_ROLES": "Finance",
    "HR_ROLES": "HR",
    "ENGINEERING_NON_IT_ROLES": "Engineering",
    "EDUCATION_ROLES": "Education",
    "SALES_ROLES": "Sales",
    "LEGAL_ROLES": "Legal",
}

SKILL_DOMAIN_MAPPING = {
    "HEALTHCARE_SKILLS": "Healthcare",
    "FINANCE_SKILLS": "Finance",
    "HR_SKILLS": "HR",
    "EDUCATION_SKILLS": "Education",
    "SALES_SKILLS": "Sales",
    "LEGAL_SKILLS": "Legal",
    # Note: ENGINEERING_NON_IT_SKILLS is missing from skills file
}

# Seniority keywords for inference
SENIORITY_KEYWORDS = {
    "Intern": "Intern",
    "Junior": "Junior",
    "Associate": "Associate",
    "Mid-level": "Mid-level",
    "Senior": "Senior",
    "Lead": "Lead",
    "Principal": "Principal",
    "Staff": "Staff",
    "Chief": "Chief",
    "Director": "Director",
    "VP": "VP",
    "Vice President": "VP",
    "Head": "Head",
    "Manager": "Manager",
}


def safe_parse_python_dict(file_path: Path) -> Dict[str, Set[str]]:
    """
    Safely parse a Python dictionary file using ast.literal_eval.
    
    Args:
        file_path: Path to the Python dict file
        
    Returns:
        Dictionary mapping variable names to sets of strings
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse the Python code safely
    try:
        parsed = ast.parse(content)
        result = {}
        
        for node in ast.walk(parsed):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        var_name = target.id
                        if isinstance(node.value, ast.Set):
                            # Extract set elements
                            elements = []
                            for elt in node.value.elts:
                                if isinstance(elt, ast.Constant):
                                    elements.append(elt.value)
                            result[var_name] = set(elements)
        
        return result
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return {}


def dedupe_case_insensitive(items: List[str]) -> List[str]:
    """
    Deduplicate list case-insensitively while preserving original case of first occurrence.
    
    Args:
        items: List of strings
        
    Returns:
        Deduplicated list
    """
    seen = set()
    result = []
    for item in items:
        lower = item.lower()
        if lower not in seen:
            seen.add(lower)
            result.append(item)
    return result


def infer_seniority(role_title: str) -> str:
    """
    Infer seniority from role title based on keywords.
    
    Args:
        role_title: Role title string
        
    Returns:
        Seniority level or empty string
    """
    for keyword, seniority in SENIORITY_KEYWORDS.items():
        if keyword.lower() in role_title.lower():
            return seniority
    return ""


def merge_skills():
    """
    Merge skills from ALL_CATG_SKILLS.txt with existing IT skills taxonomy.
    """
    print("=" * 80)
    print("MERGING SKILLS")
    print("=" * 80)
    
    # Parse new multi-domain skills
    new_skills_dict = safe_parse_python_dict(ALL_CAT_SKILLS_PATH)
    
    # Load existing IT skills
    with open(EXISTING_SKILLS_PATH, 'r', encoding='utf-8') as f:
        existing_skills_data = json.load(f)
    
    # Build unified skills structure
    unified_domains = {}
    
    # Keep existing IT domains exactly as they are
    if "domains" in existing_skills_data:
        for domain, skills in existing_skills_data["domains"].items():
            unified_domains[domain] = skills
    
    # Add new domains from multi-domain skills
    for py_var_name, domain_name in SKILL_DOMAIN_MAPPING.items():
        if py_var_name in new_skills_dict:
            skills_list = list(new_skills_dict[py_var_name])
            skills_list = dedupe_case_insensitive(skills_list)
            skills_list.sort()
            unified_domains[domain_name] = skills_list
            print(f"  {domain_name}: {len(new_skills_dict[py_var_name])} → {len(skills_list)} (deduped)")
        else:
            print(f"  {domain_name}: NOT FOUND in source file")
    
    # Count IT skills
    it_skill_count = sum(len(skills) for skills in existing_skills_data.get("domains", {}).values())
    
    # Write unified skills
    unified_skills = {
        "domains": unified_domains
    }
    
    with open(OUTPUT_SKILLS_PATH, 'w', encoding='utf-8') as f:
        json.dump(unified_skills, f, indent=2)
    
    print(f"\n✅ Unified skills written to: {OUTPUT_SKILLS_PATH}")
    
    # Return counts for summary
    counts = {
        "IT": {"before": it_skill_count, "after": it_skill_count},
    }
    for py_var_name, domain_name in SKILL_DOMAIN_MAPPING.items():
        if py_var_name in new_skills_dict:
            before = len(new_skills_dict[py_var_name])
            after = len(unified_domains.get(domain_name, []))
            counts[domain_name] = {"before": 0, "after": after}
        else:
            counts[domain_name] = {"before": 0, "after": 0}
    
    # Engineering has no skills
    counts["Engineering"] = {"before": 0, "after": 0}
    
    return counts


def merge_roles():
    """
    Merge roles from ALL_CAT_ROLES.txt with existing IT roles CSV.
    """
    print("\n" + "=" * 80)
    print("MERGING ROLES")
    print("=" * 80)
    
    # Parse new multi-domain roles
    new_roles_dict = safe_parse_python_dict(ALL_CAT_ROLES_PATH)
    
    # Load existing IT roles from CSV
    existing_roles = []
    with open(EXISTING_ROLES_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Tag domain as IT if not set
            if not row.get('domain') or row.get('domain') == '':
                row['domain'] = 'IT'
            existing_roles.append(row)
    
    # Build unified roles list
    unified_roles = []
    
    # Add existing IT roles
    it_roles_set = set()
    for role in existing_roles:
        if role['domain'] == 'IT':
            unified_roles.append(role)
            it_roles_set.add(role['role_title'].lower())
    
    print(f"  IT: {len(existing_roles)} roles loaded from CSV")
    
    # Add new domains from multi-domain roles
    domain_role_counts = {}
    for py_var_name, domain_name in DOMAIN_MAPPING.items():
        if py_var_name in new_roles_dict:
            roles_set = new_roles_dict[py_var_name]
            roles_list = list(roles_set)
            roles_list = dedupe_case_insensitive(roles_list)
            
            # Create CSV rows for each role
            for role_title in roles_list:
                canonical_title = role_title
                seniority = infer_seniority(role_title)
                domain = domain_name
                aliases = ""
                
                unified_roles.append({
                    'role_title': role_title,
                    'canonical_title': canonical_title,
                    'seniority': seniority,
                    'domain': domain,
                    'aliases': aliases
                })
            
            domain_role_counts[domain_name] = len(roles_list)
            print(f"  {domain_name}: {len(roles_set)} → {len(roles_list)} (deduped)")
        else:
            print(f"  {domain_name}: NOT FOUND in source file")
            domain_role_counts[domain_name] = 0
    
    # Write unified roles CSV
    with open(OUTPUT_ROLES_PATH, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['role_title', 'canonical_title', 'seniority', 'domain', 'aliases']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(unified_roles)
    
    print(f"\n✅ Unified roles written to: {OUTPUT_ROLES_PATH}")
    
    # Return counts for summary
    counts = {
        "IT": {"before": len(existing_roles), "after": len([r for r in unified_roles if r['domain'] == 'IT'])},
    }
    for domain_name in DOMAIN_MAPPING.values():
        if domain_name != "IT":
            before = 0
            after = domain_role_counts.get(domain_name, 0)
            counts[domain_name] = {"before": before, "after": after}
    
    return counts


def print_summary_table(skill_counts, role_counts):
    """
    Print summary table of counts before and after merge.
    """
    print("\n" + "=" * 80)
    print("SUMMARY TABLE")
    print("=" * 80)
    
    # Get all domains
    all_domains = set(skill_counts.keys()) | set(role_counts.keys())
    all_domains = sorted(all_domains)
    
    # Print header
    print(f"{'Domain':<15} | {'Skills Before':<15} | {'Skills After':<15} | {'Roles Before':<15} | {'Roles After':<15}")
    print("-" * 80)
    
    # Print each domain
    for domain in all_domains:
        skills_before = skill_counts.get(domain, {}).get('before', 0)
        skills_after = skill_counts.get(domain, {}).get('after', 0)
        roles_before = role_counts.get(domain, {}).get('before', 0)
        roles_after = role_counts.get(domain, {}).get('after', 0)
        
        print(f"{domain:<15} | {skills_before:<15} | {skills_after:<15} | {roles_before:<15} | {roles_after:<15}")
    
    print("=" * 80)
    
    # Flag engineering gap
    if skill_counts.get("Engineering", {}).get("after", 0) == 0 and role_counts.get("Engineering", {}).get("after", 0) > 0:
        print("\n⚠️  WARNING: Engineering domain has roles but 0 skills (known gap to fix later)")
    
    # Print totals
    total_skills_before = sum(c.get('before', 0) for c in skill_counts.values())
    total_skills_after = sum(c.get('after', 0) for c in skill_counts.values())
    total_roles_before = sum(c.get('before', 0) for c in role_counts.values())
    total_roles_after = sum(c.get('after', 0) for c in role_counts.values())
    
    print(f"\nTOTALS:")
    print(f"  Skills: {total_skills_before} → {total_skills_after} (+{total_skills_after - total_skills_before})")
    print(f"  Roles: {total_roles_before} → {total_roles_after} (+{total_roles_after - total_roles_before})")


def main():
    """Main execution function."""
    print("\n" + "=" * 80)
    print("CONVERT AND MERGE MULTI-DOMAIN SKILLS AND ROLES")
    print("=" * 80)
    
    # Check input files exist
    if not ALL_CAT_ROLES_PATH.exists():
        print(f"❌ ERROR: {ALL_CAT_ROLES_PATH} not found")
        return
    
    if not ALL_CAT_SKILLS_PATH.exists():
        print(f"❌ ERROR: {ALL_CAT_SKILLS_PATH} not found")
        return
    
    if not EXISTING_SKILLS_PATH.exists():
        print(f"❌ ERROR: {EXISTING_SKILLS_PATH} not found")
        return
    
    if not EXISTING_ROLES_PATH.exists():
        print(f"❌ ERROR: {EXISTING_ROLES_PATH} not found")
        return
    
    print(f"\nInput files found:")
    print(f"  - {ALL_CAT_ROLES_PATH}")
    print(f"  - {ALL_CAT_SKILLS_PATH}")
    print(f"  - {EXISTING_SKILLS_PATH}")
    print(f"  - {EXISTING_ROLES_PATH}")
    
    # Merge skills
    skill_counts = merge_skills()
    
    # Merge roles
    role_counts = merge_roles()
    
    # Print summary table
    print_summary_table(skill_counts, role_counts)
    
    print("\n✅ Conversion and merge complete!")


if __name__ == "__main__":
    main()
