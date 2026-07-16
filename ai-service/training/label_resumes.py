#!/usr/bin/env python3
"""
Automated BIO-format labeler for plain-text resumes.
Reads all .txt files from data/text_resumes/, produces BIO token-level
NER labels, and writes data/train.json + data/test.json for train.py.

Entity types (matching train.py LABELS):
  NAME   — candidate full name
  ORG    — company / university names
  TITLE  — job titles
  SKILL  — technical / soft skills
  EDU    — degree names (B.S., M.S., Ph.D., etc.)
  DATE   — dates and date ranges
  LOC    — cities, states, countries

Run from ai-service/training/:
    ../venv/bin/python label_resumes.py
"""

import os
import re
import json
import random
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).parent
INPUT_DIR   = SCRIPT_DIR / 'data' / 'text_resumes'
OUTPUT_DIR  = SCRIPT_DIR / 'data'
TRAIN_FILE  = OUTPUT_DIR / 'train.json'
TEST_FILE   = OUTPUT_DIR / 'test.json'
TRAIN_SPLIT = 0.8
random.seed(42)

# ── Skills reference set ─────────────────────────────────────────────────────
SKILLS = {
    # Languages
    'python','java','javascript','typescript','c++','c#','c','go','golang','rust',
    'ruby','php','swift','kotlin','scala','r','matlab','perl','bash','shell',
    'powershell','groovy','dart','elixir','haskell','lua','vba','cobol','fortran',
    # Web
    'html','css','html5','css3','react','react.js','angular','vue','vue.js',
    'next.js','nuxt.js','svelte','jquery','bootstrap','tailwind','sass','less',
    'webpack','vite','rollup','graphql','rest','soap','grpc','websocket',
    # Backend
    'node.js','express','fastapi','flask','django','spring','spring boot',
    'rails','laravel','asp.net','.net','hibernate','sqlalchemy','prisma',
    # Databases
    'sql','mysql','postgresql','sqlite','oracle','mssql','mongodb','redis',
    'elasticsearch','cassandra','dynamodb','neo4j','couchdb','firebase',
    'bigquery','snowflake','redshift','hive','hbase',
    # Cloud / DevOps
    'aws','azure','gcp','google cloud','docker','kubernetes','k8s','terraform',
    'ansible','jenkins','github actions','gitlab ci','circleci','travis ci',
    'helm','istio','prometheus','grafana','datadog','splunk','elk',
    'lambda','ec2','s3','rds','cloudformation','pulumi',
    # AI / ML
    'machine learning','deep learning','nlp','computer vision','tensorflow',
    'pytorch','keras','scikit-learn','xgboost','lightgbm','huggingface',
    'transformers','bert','gpt','llm','opencv','pandas','numpy','scipy',
    'matplotlib','seaborn','plotly','jupyter','spark','hadoop','kafka','airflow',
    'dbt','mlflow','wandb','langchain',
    # Mobile
    'android','ios','react native','flutter','xamarin','swift','kotlin',
    # Tools / Other
    'git','github','gitlab','jira','confluence','agile','scrum','kanban',
    'linux','unix','windows','macos','vim','vscode','intellij','eclipse',
    'figma','sketch','adobe xd','photoshop','illustrator',
    'salesforce','sap','tableau','power bi','looker',
    'selenium','cypress','jest','pytest','junit','mocha','postman',
    'nginx','apache','rabbitmq','celery','socket.io','oauth','jwt',
    # Soft skills
    'leadership','communication','teamwork','problem solving','agile methodology',
    'project management','stakeholder management','mentoring',
}

# ── Degree reference set ─────────────────────────────────────────────────────
DEGREES = {
    "bachelor of science","bachelor of arts","bachelor of engineering",
    "master of science","master of arts","master of engineering",
    "master of business administration","doctor of philosophy",
    "b.s.","b.a.","b.e.","b.tech","be","btech","bsc","ba",
    "m.s.","m.a.","m.e.","m.tech","mtech","msc","mba","ms","ma",
    "ph.d.","phd","doctorate","doctoral","associate degree","associate of science",
    "high school diploma","ged","diploma","certificate",
    "bachelor's","master's","bachelor","master","degree",
}

# ── Job title keywords (used for heuristic detection) ────────────────────────
TITLE_PREFIXES = {
    'senior','junior','lead','principal','staff','chief','head','vp','vice president',
    'director','manager','associate','assistant','intern','executive',
}
TITLE_ROLES = {
    'software engineer','software developer','web developer','frontend developer',
    'backend developer','full stack developer','full-stack developer',
    'data scientist','data engineer','data analyst','machine learning engineer',
    'ai engineer','ml engineer','devops engineer','site reliability engineer',
    'sre','cloud engineer','platform engineer','infrastructure engineer',
    'mobile developer','ios developer','android developer',
    'product manager','project manager','program manager','scrum master',
    'business analyst','systems analyst','qa engineer','test engineer',
    'security engineer','network engineer','database administrator','dba',
    'ui/ux designer','ux designer','ui designer','graphic designer',
    'solutions architect','cloud architect','enterprise architect',
    'technical lead','tech lead','engineering manager','cto','ceo','coo','cfo',
    'recruiter','hr manager','marketing manager','sales manager',
    'consultant','analyst','specialist','coordinator','administrator',
}

# ── Location heuristics ───────────────────────────────────────────────────────
US_STATES = {
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC',
}
COUNTRIES = {
    'usa','united states','us','uk','united kingdom','canada','australia',
    'india','germany','france','singapore','netherlands','ireland','new zealand',
    'remote','worldwide','global',
}

# ── Compiled regex patterns ───────────────────────────────────────────────────
DATE_PATTERN = re.compile(
    r'\b(?:'
    r'(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
    r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
    r'\s+\d{4}'
    r'|\d{1,2}/\d{4}'
    r'|\d{4}\s*[-–—]\s*(?:\d{4}|present|current|now)'
    r'|\d{4}'
    r'|present|current'
    r')\b',
    re.IGNORECASE
)

EMAIL_PATTERN = re.compile(r'\S+@\S+\.\S+')
PHONE_PATTERN = re.compile(r'[\+\(]?[\d\s\-\(\)]{8,}')


# ═══════════════════════════════════════════════════════════════════════════════
#  Core labeling logic
# ═══════════════════════════════════════════════════════════════════════════════

def tokenize(text: str) -> List[str]:
    """Word-level tokenizer that preserves punctuation as separate tokens."""
    # Split on whitespace, then split off leading/trailing punctuation
    tokens = []
    for raw in text.split():
        # Strip surrounding punctuation but keep internal (e.g. "C++", "Node.js")
        stripped = raw.strip('.,;:!?()\'"[]{}')
        if stripped:
            tokens.append(stripped)
    return tokens


def label_tokens(tokens: List[str], candidate_name: Optional[str],
                 is_first_section: bool) -> List[str]:
    """
    Assign a BIO label to each token using rule-based matching.
    Returns a list of labels parallel to `tokens`.
    """
    text_lower = ' '.join(tokens).lower()
    labels = ['O'] * len(tokens)

    # 1. NAME — match candidate name tokens at beginning of resume
    if candidate_name and is_first_section:
        name_tokens = tokenize(candidate_name)
        name_lower  = [t.lower() for t in name_tokens]
        tok_lower   = [t.lower() for t in tokens]
        for i in range(len(tok_lower) - len(name_lower) + 1):
            if tok_lower[i:i + len(name_lower)] == name_lower:
                labels[i] = 'B-NAME'
                for j in range(1, len(name_lower)):
                    labels[i + j] = 'I-NAME'
                break  # only tag first occurrence

    # 2. DATE — regex match across reconstructed text, map back to tokens
    reconstructed = ' '.join(tokens)
    for m in DATE_PATTERN.finditer(reconstructed):
        span_text  = m.group(0)
        span_start = len(reconstructed[:m.start()].split())
        span_len   = len(span_text.split())
        if span_start < len(labels):
            labels[span_start] = 'B-DATE'
            for k in range(1, min(span_len, len(labels) - span_start)):
                labels[span_start + k] = 'I-DATE'

    # 3. SKILL — enhanced detection with contextual patterns
    tok_lower = [t.lower() for t in tokens]
    i = 0
    while i < len(tok_lower):
        matched = False
        
        # Try longest match first (up to 4 words) for exact skill matches
        for length in range(4, 0, -1):
            if i + length > len(tok_lower):
                continue
            phrase = ' '.join(tok_lower[i:i + length])
            if phrase in SKILLS and all(labels[i + k] == 'O' for k in range(length)):
                labels[i] = 'B-SKILL'
                for k in range(1, length):
                    labels[i + k] = 'I-SKILL'
                i += length
                matched = True
                break
        
        if not matched:
            # Context-based skill detection in work experience
            # Look for patterns like "using X", "with X", "in X", "built X", "developed X"
            if i > 0 and tok_lower[i] in ['using', 'with', 'in', 'and', 'or', ',']:
                # Check next 1-3 words for potential skills
                for length in range(3, 0, -1):
                    if i + 1 + length > len(tok_lower):
                        continue
                    phrase = ' '.join(tok_lower[i + 1:i + 1 + length])
                    # Common technology indicators
                    if any(tech in phrase.lower() for tech in ['js', '.js', 'api', 'sql', 'db', 'cloud', 'web', 'app', 'service', 'micro', 'script', 'code']):
                        if all(labels[i + 1 + k] == 'O' for k in range(length)):
                            labels[i + 1] = 'B-SKILL'
                            for k in range(1, length):
                                labels[i + 1 + k] = 'I-SKILL'
                            i += length + 1
                            matched = True
                            break
            
            # Action verb + potential skill pattern
            if not matched and i > 0:
                prev_word = tok_lower[i - 1]
                if prev_word in ['built', 'developed', 'created', 'implemented', 'designed', 'architected', 'deployed', 'optimized', 'managed', 'configured', 'integrated']:
                    # Check current and next 2 words
                    for length in range(3, 0, -1):
                        if i + length > len(tok_lower):
                            continue
                        phrase = ' '.join(tok_lower[i:i + length])
                        # Heuristic: if it contains tech-related terms, label as skill
                        tech_indicators = ['python', 'java', 'javascript', 'react', 'angular', 'node', 'docker', 'kubernetes', 'aws', 'azure', 'sql', 'mongodb', 'redis', 'api', 'micro', 'service', 'web', 'app', 'cloud', 'dev', 'ops', 'ci', 'cd', 'git', 'jenkins', 'pipeline', 'data', 'ml', 'ai']
                        if any(indicator in phrase for indicator in tech_indicators):
                            if all(labels[i + k] == 'O' for k in range(length)):
                                labels[i] = 'B-SKILL'
                                for k in range(1, length):
                                    labels[i + k] = 'I-SKILL'
                                i += length
                                matched = True
                                break
        
        if not matched:
            i += 1

    # 4. EDU — degree phrase match
    i = 0
    while i < len(tok_lower):
        matched = False
        for length in range(6, 0, -1):
            if i + length > len(tok_lower):
                continue
            phrase = ' '.join(tok_lower[i:i + length])
            if phrase in DEGREES and all(labels[i + k] == 'O' for k in range(length)):
                labels[i] = 'B-EDU'
                for k in range(1, length):
                    labels[i + k] = 'I-EDU'
                i += length
                matched = True
                break
        if not matched:
            i += 1

    # 5. TITLE — prefix + role or standalone role
    i = 0
    while i < len(tok_lower):
        matched = False
        # Try "prefix + role" (up to 6-word job titles)
        for length in range(6, 1, -1):
            if i + length > len(tok_lower):
                continue
            phrase = ' '.join(tok_lower[i:i + length])
            if phrase in TITLE_ROLES and all(labels[i + k] == 'O' for k in range(length)):
                labels[i] = 'B-TITLE'
                for k in range(1, length):
                    labels[i + k] = 'I-TITLE'
                i += length
                matched = True
                break
            # Check prefix + role
            if tok_lower[i] in TITLE_PREFIXES and length >= 2:
                role_phrase = ' '.join(tok_lower[i + 1:i + length])
                if role_phrase in TITLE_ROLES and all(labels[i + k] == 'O' for k in range(length)):
                    labels[i] = 'B-TITLE'
                    for k in range(1, length):
                        labels[i + k] = 'I-TITLE'
                    i += length
                    matched = True
                    break
        if not matched:
            i += 1

    # 6. LOC — "City, ST" or "City, Country" pattern
    for i in range(len(tokens) - 1):
        if labels[i] != 'O':
            continue
        city_like = re.match(r'^[A-Z][a-z]+$', tokens[i])
        state_like = tokens[i + 1].rstrip(',') in US_STATES
        country_like = tokens[i + 1].lower().strip(',') in COUNTRIES
        if city_like and (state_like or country_like):
            labels[i]     = 'B-LOC'
            labels[i + 1] = 'I-LOC'

    # 7. ORG — capitalized multi-word noun phrases not already labeled
    # Heuristic: 2–4 consecutive Title-Case words not already tagged,
    # appearing after known company indicators
    company_triggers = {'at', '@', 'company:', 'employer:', 'organization:'}
    for i, tok in enumerate(tokens):
        if tok.lower() in company_triggers and i + 1 < len(tokens):
            j = i + 1
            while j < min(i + 5, len(tokens)) and re.match(r'^[A-Z]', tokens[j]) and labels[j] == 'O':
                j += 1
            if j > i + 1:
                labels[i + 1] = 'B-ORG'
                for k in range(i + 2, j):
                    labels[k] = 'I-ORG'

    return labels


def extract_candidate_name(lines: List[str]) -> Optional[str]:
    """
    Heuristically extract the candidate's name from the top of the resume.
    Looks for a short (2–4 word) all-title-case line with no digits or @ signs
    in the first 10 lines.
    """
    for line in lines[:10]:
        line = line.strip()
        if not line or len(line) > 60:
            continue
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if re.search(r'\d', line):
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
            return line
    return None


def split_into_sentences(text: str) -> List[str]:
    """
    Split resume text into sentence-like chunks suitable for NER training.
    Uses newlines and sentence-ending punctuation as boundaries.
    Filters out empty lines, pure-symbol lines, and very long lines.
    """
    raw = re.split(r'\n+|(?<=[.!?])\s+', text)
    sentences = []
    for s in raw:
        s = s.strip()
        # skip blank, single-char, email-only, or phone-only lines
        if not s or len(s) < 3:
            continue
        if EMAIL_PATTERN.fullmatch(s):
            continue
        # skip lines that are pure section headers (all caps, short)
        if s.isupper() and len(s.split()) <= 4:
            continue
        # split very long lines at commas / semicolons
        if len(s) > 200:
            parts = re.split(r'[;,]', s)
            sentences.extend([p.strip() for p in parts if len(p.strip()) > 3])
        else:
            sentences.append(s)
    return sentences


def resume_to_examples(text: str) -> List[Dict]:
    """Convert a full resume text string into a list of BIO-tagged examples."""
    lines = text.splitlines()
    candidate_name = extract_candidate_name(lines)

    sentences = split_into_sentences(text)
    examples  = []
    first     = True

    for sent in sentences:
        tokens = tokenize(sent)
        if len(tokens) < 2:
            continue
        bio_labels = label_tokens(tokens, candidate_name, is_first_section=first)
        first = False

        # Only keep sentences that contain at least one non-O label
        # OR are from the first 20 sentences (contextual O-only examples are useful too)
        if len(examples) < 20 or any(l != 'O' for l in bio_labels):
            examples.append({'tokens': tokens, 'ner_tags': bio_labels})

    return examples


def process_all_resumes() -> List[Dict]:
    """Read all .txt files and return combined list of BIO examples."""
    all_examples = []
    txt_files = sorted(INPUT_DIR.glob('*.txt'))

    if not txt_files:
        print(f"❌ No .txt files found in {INPUT_DIR}")
        print("   Run: cd .. && ../venv/bin/python convert_resumes.py")
        return []

    for path in txt_files:
        print(f"  📄 Labeling: {path.name}")
        try:
            text = path.read_text(encoding='utf-8', errors='replace')
            examples = resume_to_examples(text)
            print(f"     → {len(examples)} labeled sentences")
            all_examples.extend(examples)
        except Exception as e:
            print(f"     ❌ Error: {e}")

    return all_examples


def save_split(examples: List[Dict]):
    """Split into train/test and save JSON files."""
    random.shuffle(examples)
    split_idx   = int(len(examples) * TRAIN_SPLIT)
    train_data  = examples[:split_idx]
    test_data   = examples[split_idx:]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TRAIN_FILE.write_text(json.dumps(train_data, indent=2, ensure_ascii=False))
    TEST_FILE.write_text(json.dumps(test_data, indent=2, ensure_ascii=False))

    return train_data, test_data


def print_label_stats(examples: List[Dict], label: str):
    """Count entity occurrences across all examples."""
    counts: Dict[str, int] = {}
    for ex in examples:
        for tag in ex['ner_tags']:
            if tag.startswith('B-'):
                entity = tag[2:]
                counts[entity] = counts.get(entity, 0) + 1
    return counts


def main():
    print("=" * 60)
    print("  Automated Resume BIO Labeler")
    print("=" * 60)
    print(f"  Input  : {INPUT_DIR}")
    print(f"  Output : {OUTPUT_DIR}")
    print("=" * 60)
    print()

    examples = process_all_resumes()

    if not examples:
        print("\n❌ No examples generated. Add .txt resumes to data/text_resumes/ and retry.")
        return

    train_data, test_data = save_split(examples)

    # Print stats
    entity_counts = print_label_stats(examples, '')
    print()
    print("=" * 60)
    print("  Labeling Summary")
    print("=" * 60)
    print(f"  Total examples  : {len(examples)}")
    print(f"  Train examples  : {len(train_data)}")
    print(f"  Test examples   : {len(test_data)}")
    print()
    print("  Entity counts (B- tags):")
    for entity, count in sorted(entity_counts.items(), key=lambda x: -x[1]):
        bar = '█' * min(count, 40)
        print(f"    {entity:<8}: {count:>4}  {bar}")
    print()
    print(f"  ✅ Saved: {TRAIN_FILE}")
    print(f"  ✅ Saved: {TEST_FILE}")
    print()
    print("=" * 60)
    print("  ⚠️  These are AUTO-GENERATED labels.")
    print("  For higher accuracy, review and correct them in Doccano:")
    print("    https://github.com/doccano/doccano")
    print("  Then re-export using export_training_data.py")
    print("=" * 60)
    print()
    print("📋 NEXT — Fine-tune DeBERTa:")
    print("   ../venv/bin/python train.py")
    print()


if __name__ == '__main__':
    main()
