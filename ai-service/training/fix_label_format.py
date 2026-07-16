#!/usr/bin/env python3
"""
Convert Label Studio span annotations to BIO token format for NER training.

Input format (Label Studio):
{
  "text": "TCS, Senior Software Engineer, Bangalore, 2019–Present",
  "label": [
    {"start": 0, "end": 3, "text": "TCS", "labels": ["COMPANY"]},
    {"start": 5, "end": 29, "text": "Senior Software Engineer", "labels": ["ROLE"]}
  ]
}

Output format (BIO tokens):
{
  "tokens": ["TCS", ",", "Senior", "Software", "Engineer", ",", "Bangalore"],
  "labels": ["B-COMPANY", "O", "B-ROLE", "I-ROLE", "I-ROLE", "O", "B-LOCATION"]
}
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any
from collections import defaultdict

def tokenize_text(text: str) -> List[tuple]:
    """
    Tokenize text and return list of (token, start, end) tuples.
    Uses improved tokenization that preserves all characters and positions.
    """
    tokens = []
    # More comprehensive pattern that handles:
    # - Words with letters, numbers, underscores
    # - Hyphenated words (keep together)
    # - Individual punctuation
    # - Special characters like en-dash, em-dash
    pattern = r'\w+(?:-\w+)*|[^\w\s]'
    
    for match in re.finditer(pattern, text):
        token = match.group()
        start = match.start()
        end = match.end()
        tokens.append((token, start, end))
    
    return tokens

def spans_to_bio(text: str, label_spans: List[Dict]) -> Dict[str, List[str]]:
    """
    Convert character-level span annotations to token-level BIO tags.
    Uses robust overlap detection to prevent data loss.
    
    Args:
        text: Original text
        label_spans: List of {"start": int, "end": int, "labels": [str]}
    
    Returns:
        {"tokens": [...], "labels": [...]}
    """
    # Tokenize the text
    tokens_with_positions = tokenize_text(text)
    
    if not tokens_with_positions:
        return {"tokens": [], "labels": []}
    
    # Assign BIO tags to tokens
    tokens = []
    labels = []
    
    # Track which entity we're currently inside (for I- tags)
    current_entity = None
    
    for token_idx, (token, token_start, token_end) in enumerate(tokens_with_positions):
        tokens.append(token)
        
        # Find which span (if any) this token belongs to
        # A token belongs to a span if there's ANY overlap
        best_span = None
        best_overlap = 0
        
        for span in label_spans:
            span_start = span["start"]
            span_end = span["end"]
            
            # Calculate overlap between token and span
            overlap_start = max(token_start, span_start)
            overlap_end = min(token_end, span_end)
            overlap = max(0, overlap_end - overlap_start)
            
            # Use the span with maximum overlap
            if overlap > best_overlap:
                best_overlap = overlap
                best_span = span
        
        # Assign BIO tag based on best matching span
        if best_span is None or best_overlap == 0:
            # No overlap with any span
            labels.append("O")
            current_entity = None
        else:
            entity_type = best_span["labels"][0] if best_span["labels"] else "O"
            
            if entity_type == "O":
                labels.append("O")
                current_entity = None
            else:
                # Determine if this is B- or I-
                # It's B- if:
                # 1. We're not currently in this entity type, OR
                # 2. This is the first token that overlaps with this specific span
                
                # Check if this is the first token overlapping with this span
                is_first_token_in_span = True
                if token_idx > 0:
                    prev_token, prev_start, prev_end = tokens_with_positions[token_idx - 1]
                    prev_overlap_start = max(prev_start, best_span["start"])
                    prev_overlap_end = min(prev_end, best_span["end"])
                    prev_overlap = max(0, prev_overlap_end - prev_overlap_start)
                    
                    if prev_overlap > 0:
                        # Previous token also overlapped with this span
                        is_first_token_in_span = False
                
                if is_first_token_in_span or current_entity != entity_type:
                    labels.append(f"B-{entity_type}")
                    current_entity = entity_type
                else:
                    labels.append(f"I-{entity_type}")
    
    return {"tokens": tokens, "labels": labels}

def convert_label_file(input_path: Path, output_path: Path) -> Dict[str, int]:
    """
    Convert a Label Studio JSON file to BIO token format.
    
    Returns:
        Statistics about the conversion
    """
    print(f"📂 Reading {input_path.name}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"✅ Loaded {len(data)} examples")
    
    converted_examples = []
    stats = defaultdict(int)
    
    for idx, example in enumerate(data):
        try:
            text = example.get("text", "")
            label_spans = example.get("label", [])
            
            if not text.strip():
                stats["empty_text"] += 1
                continue
            
            # Convert to BIO format
            bio_example = spans_to_bio(text, label_spans)
            
            if not bio_example["tokens"]:
                stats["no_tokens"] += 1
                continue
            
            # Count entity types
            for label in bio_example["labels"]:
                if label != "O":
                    entity_type = label.split("-")[1]
                    stats[f"entity_{entity_type}"] += 1
            
            converted_examples.append(bio_example)
            stats["converted"] += 1
            
        except Exception as e:
            print(f"⚠️  Error converting example {idx}: {e}")
            stats["errors"] += 1
    
    # Write output
    print(f"💾 Writing to {output_path.name}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(converted_examples, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Converted {stats['converted']} examples")
    
    return dict(stats)

def merge_and_split(label_files: List[Path], train_path: Path, test_path: Path, test_split: float = 0.1):
    """
    Merge multiple label files and split into train/test sets.
    """
    print("\n" + "="*50)
    print("🔄 Merging and splitting datasets...")
    print("="*50)
    
    all_examples = []
    total_stats = defaultdict(int)
    
    # Convert each label file
    for label_file in label_files:
        temp_output = label_file.parent / f"temp_{label_file.name}"
        stats = convert_label_file(label_file, temp_output)
        
        # Load converted examples
        with open(temp_output, 'r', encoding='utf-8') as f:
            examples = json.load(f)
            all_examples.extend(examples)
        
        # Accumulate stats
        for key, value in stats.items():
            total_stats[key] += value
        
        # Clean up temp file
        temp_output.unlink()
    
    print(f"\n📊 Total examples: {len(all_examples)}")
    
    # Shuffle and split
    import random
    random.seed(42)
    random.shuffle(all_examples)
    
    split_idx = int(len(all_examples) * (1 - test_split))
    train_examples = all_examples[:split_idx]
    test_examples = all_examples[split_idx:]
    
    # Write train set
    print(f"💾 Writing {len(train_examples)} training examples to {train_path.name}...")
    with open(train_path, 'w', encoding='utf-8') as f:
        json.dump(train_examples, f, indent=2, ensure_ascii=False)
    
    # Write test set
    print(f"💾 Writing {len(test_examples)} test examples to {test_path.name}...")
    with open(test_path, 'w', encoding='utf-8') as f:
        json.dump(test_examples, f, indent=2, ensure_ascii=False)
    
    # Print statistics
    print("\n" + "="*50)
    print("📊 Conversion Statistics:")
    print("="*50)
    print(f"Total converted: {total_stats['converted']}")
    print(f"Empty text: {total_stats.get('empty_text', 0)}")
    print(f"No tokens: {total_stats.get('no_tokens', 0)}")
    print(f"Errors: {total_stats.get('errors', 0)}")
    
    print("\n📊 Entity Distribution:")
    entity_stats = {k: v for k, v in total_stats.items() if k.startswith("entity_")}
    for entity_type, count in sorted(entity_stats.items(), key=lambda x: x[1], reverse=True):
        entity_name = entity_type.replace("entity_", "")
        print(f"  {entity_name}: {count:,}")
    
    print("\n✅ Conversion complete!")
    print(f"📁 Train: {train_path}")
    print(f"📁 Test: {test_path}")

def main():
    # Paths
    data_dir = Path(__file__).parent / "data"
    
    label_files = [
        data_dir / "label1.json",
        data_dir / "label2.json",
        data_dir / "label3.json"
    ]
    
    train_path = data_dir / "train.json"
    test_path = data_dir / "test.json"
    
    # Verify input files exist
    for label_file in label_files:
        if not label_file.exists():
            print(f"❌ Error: {label_file} not found")
            return
    
    # Convert and merge
    merge_and_split(label_files, train_path, test_path, test_split=0.1)

if __name__ == "__main__":
    main()
