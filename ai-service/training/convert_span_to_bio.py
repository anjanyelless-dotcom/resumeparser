#!/usr/bin/env python3
"""
Convert span-based annotations to BIO token format for DeBERTa training.
Fixes label naming: DATE_START → START_DATE, EDU_YEAR_START → EDU_START_YEAR
"""

import json
import re
from typing import List, Dict, Tuple
from collections import Counter

# Label mapping: old name → new name
LABEL_MAPPING = {
    'DATE_START': 'START_DATE',
    'DATE_END': 'END_DATE',
    'EDU_YEAR_START': 'EDU_START_YEAR',
    'EDU_YEAR_END': 'EDU_END_YEAR',
    'FEILD': 'FIELD',  # Fix typo
}

def tokenize_text(text: str) -> List[str]:
    """Simple whitespace tokenization"""
    return text.split()

def get_char_to_token_mapping(text: str, tokens: List[str]) -> List[Tuple[int, int]]:
    """Map character positions to token indices"""
    char_to_token = []
    current_pos = 0
    
    for token_idx, token in enumerate(tokens):
        token_start = text.find(token, current_pos)
        if token_start == -1:
            continue
        token_end = token_start + len(token)
        char_to_token.append((token_start, token_end, token_idx))
        current_pos = token_end
    
    return char_to_token

def convert_span_to_bio(example: Dict) -> Dict:
    """Convert single span-based example to BIO token format"""
    text = example['text']
    tokens = tokenize_text(text)
    
    # Initialize all labels as 'O' (Outside)
    labels = ['O'] * len(tokens)
    
    # Get character to token mapping
    char_to_token = get_char_to_token_mapping(text, tokens)
    
    # Process each annotation
    for annotation in example.get('label', []):
        start_char = annotation['start']
        end_char = annotation['end']
        label = annotation['labels'][0] if annotation['labels'] else 'O'
        
        # Apply label mapping
        label = LABEL_MAPPING.get(label, label)
        
        if label == 'O':
            continue
        
        # Find tokens that overlap with this span
        affected_tokens = []
        for char_start, char_end, token_idx in char_to_token:
            # Check if token overlaps with annotation span
            if not (char_end <= start_char or char_start >= end_char):
                affected_tokens.append(token_idx)
        
        # Apply BIO tagging
        for i, token_idx in enumerate(affected_tokens):
            if i == 0:
                labels[token_idx] = f'B-{label}'
            else:
                labels[token_idx] = f'I-{label}'
    
    return {
        'tokens': tokens,
        'labels': labels
    }

def convert_all_files(input_files: List[str], output_train: str, output_test: str, test_split: float = 0.15):
    """Convert all span files to BIO format and split into train/test"""
    
    print("="*70)
    print("CONVERTING SPAN FORMAT → BIO TOKEN FORMAT")
    print("="*70)
    
    all_examples = []
    label_stats = Counter()
    
    # Load all files
    for filepath in input_files:
        print(f"\nLoading: {filepath}")
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"  Loaded: {len(data):,} examples")
            all_examples.extend(data)
    
    print(f"\nTotal examples loaded: {len(all_examples):,}")
    
    # Convert to BIO format
    print("\nConverting to BIO token format...")
    converted_examples = []
    
    for i, example in enumerate(all_examples):
        if (i + 1) % 1000 == 0:
            print(f"  Converted: {i+1:,}/{len(all_examples):,}")
        
        try:
            converted = convert_span_to_bio(example)
            converted_examples.append(converted)
            
            # Count labels
            for label in converted['labels']:
                label_stats[label] += 1
        except Exception as e:
            print(f"  Warning: Failed to convert example {i}: {e}")
            continue
    
    print(f"\n✓ Successfully converted: {len(converted_examples):,} examples")
    
    # Split into train/test
    test_size = int(len(converted_examples) * test_split)
    train_size = len(converted_examples) - test_size
    
    train_data = converted_examples[:train_size]
    test_data = converted_examples[train_size:]
    
    print(f"\nSplitting data:")
    print(f"  Train: {len(train_data):,} examples ({(1-test_split)*100:.0f}%)")
    print(f"  Test:  {len(test_data):,} examples ({test_split*100:.0f}%)")
    
    # Save files
    print(f"\nSaving converted data...")
    with open(output_train, 'w', encoding='utf-8') as f:
        json.dump(train_data, f, ensure_ascii=False, indent=2)
    print(f"  ✓ Saved: {output_train}")
    
    with open(output_test, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)
    print(f"  ✓ Saved: {output_test}")
    
    # Print label statistics
    print(f"\n{'='*70}")
    print("LABEL DISTRIBUTION (BIO FORMAT):")
    print(f"{'='*70}")
    
    total_labels = sum(label_stats.values())
    for label in sorted(label_stats.keys()):
        count = label_stats[label]
        pct = (count / total_labels) * 100
        print(f"  {label:25s}: {count:>10,} ({pct:>6.2f}%)")
    
    print(f"\n{'='*70}")
    print(f"Total tokens: {total_labels:,}")
    print(f"{'='*70}")
    
    # Verify label renaming
    print(f"\nLABEL RENAMING VERIFICATION:")
    print(f"{'='*70}")
    
    renamed_labels = {
        'B-START_DATE', 'I-START_DATE',
        'B-END_DATE', 'I-END_DATE',
        'B-EDU_START_YEAR', 'I-EDU_START_YEAR',
        'B-EDU_END_YEAR', 'I-EDU_END_YEAR'
    }
    
    for label in renamed_labels:
        if label in label_stats:
            print(f"  ✓ {label}: {label_stats[label]:,} occurrences")
        else:
            print(f"  ✗ {label}: NOT FOUND")
    
    print(f"\n{'='*70}")
    print("CONVERSION COMPLETE!")
    print(f"{'='*70}")

if __name__ == "__main__":
    import os
    
    # Input files
    data_dir = os.path.dirname(__file__) + '/data'
    input_files = [
        f'{data_dir}/final_labeldata.json',
        f'{data_dir}/final_labeldata1.json',
        f'{data_dir}/final_labeldata2.json'
    ]
    
    # Output files
    output_train = f'{data_dir}/train_converted.json'
    output_test = f'{data_dir}/test_converted.json'
    
    # Convert
    convert_all_files(input_files, output_train, output_test, test_split=0.15)
    
    print("\nNext steps:")
    print("1. Review the converted files")
    print("2. Use train_converted.json and test_converted.json for training")
    print("3. Model will now correctly predict START_DATE, END_DATE, etc.")
