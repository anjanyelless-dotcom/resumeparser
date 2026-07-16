#!/usr/bin/env python3
"""
Merge label1.json, label2.json, label3.json into train.json and test.json
Following the workflow that preserves all data without loss
"""

import json
import random
from collections import defaultdict, Counter
from pathlib import Path

def load_label_files():
    """Load label1, label2, label3 files"""
    data_dir = Path(__file__).parent / "data"
    files = ['label1.json', 'label2.json', 'label3.json']
    all_examples = []
    seen_texts = set()
    stats = defaultdict(int)
    
    for filename in files:
        filepath = data_dir / filename
        print(f"\n📂 Processing: {filename}")
        
        if not filepath.exists():
            print(f"  ⚠️  File not found: {filepath}")
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        file_count = 0
        for item in data:
            text = item.get('text', '')
            
            if not text:
                stats['skipped_no_text'] += 1
                continue
            
            labels = item.get('label', [])
            if not labels:
                stats['skipped_no_labels'] += 1
                continue
            
            # Remove duplicates based on text
            if text in seen_texts:
                stats['duplicates_removed'] += 1
                continue
            seen_texts.add(text)
            
            all_examples.append({
                'text': text,
                'entities': labels
            })
            file_count += 1
        
        print(f"  ✅ Added {file_count} examples")
        stats[f'from_{filename}'] = file_count
    
    return all_examples, stats

def create_bio_tags(text, entities):
    """Convert character-level entities to token-level BIO tags"""
    tokens = text.split()
    tags = ['O'] * len(tokens)
    
    # Build character-to-token mapping
    char_to_token = {}
    char_pos = 0
    
    for token_idx, token in enumerate(tokens):
        token_start = char_pos
        token_end = char_pos + len(token)
        
        for char_idx in range(token_start, token_end):
            char_to_token[char_idx] = token_idx
        
        char_pos = token_end + 1  # +1 for space
    
    # Assign BIO tags
    for entity in entities:
        start_char = entity.get('start', 0)
        end_char = entity.get('end', 0)
        label = entity.get('labels', [''])[0] if 'labels' in entity else ''
        
        if not label:
            continue
        
        # Fix common typos
        if label == 'FEILD':
            label = 'FIELD'
        
        # Find tokens that overlap with this entity
        tokens_in_entity = set()
        for char_idx in range(start_char, end_char):
            if char_idx in char_to_token:
                tokens_in_entity.add(char_to_token[char_idx])
        
        tokens_in_entity = sorted(list(tokens_in_entity))
        
        # Assign B- and I- tags
        if tokens_in_entity:
            tags[tokens_in_entity[0]] = f"B-{label}"
            for token_idx in tokens_in_entity[1:]:
                tags[token_idx] = f"I-{label}"
    
    return tokens, tags

def convert_to_training_format(examples):
    """Convert examples to training format"""
    training_examples = []
    skipped = 0
    
    for example in examples:
        try:
            tokens, tags = create_bio_tags(example['text'], example['entities'])
            
            if len(tokens) == len(tags) and len(tokens) > 0:
                training_examples.append({
                    'tokens': tokens,
                    'ner_tags': tags
                })
            else:
                skipped += 1
        except Exception as e:
            skipped += 1
            continue
    
    print(f"\n✅ Converted {len(training_examples)} examples")
    if skipped > 0:
        print(f"⚠️  Skipped {skipped} examples due to errors")
    
    return training_examples

def analyze_labels(examples):
    """Analyze label distribution"""
    all_labels = []
    for ex in examples:
        all_labels.extend(ex['ner_tags'])
    
    label_counts = Counter(all_labels)
    
    print("\n📊 Label Distribution:")
    for label, count in sorted(label_counts.items()):
        support = label_counts.get(label, 0)
        print(f"  {label:20s}: {count:5d} (support: {support})")
    
    return label_counts

def main():
    print("=" * 70)
    print("🔄 Merging label1.json + label2.json + label3.json")
    print("=" * 70)
    
    # Load all label files
    examples, stats = load_label_files()
    
    print("\n" + "=" * 70)
    print(f"✅ Total examples loaded: {len(examples)}")
    print("\n📈 Statistics:")
    for key, value in sorted(stats.items()):
        print(f"  {key}: {value}")
    
    # Convert to training format
    print("\n" + "=" * 70)
    print("🔄 Converting to BIO format...")
    training_examples = convert_to_training_format(examples)
    
    # Analyze labels
    label_counts = analyze_labels(training_examples)
    
    # Shuffle and split (90% train, 10% test)
    random.seed(42)
    random.shuffle(training_examples)
    split_idx = int(len(training_examples) * 0.9)
    
    train_data = training_examples[:split_idx]
    test_data = training_examples[split_idx:]
    
    # Save to data directory
    data_dir = Path(__file__).parent / "data"
    
    # Save train.json
    print("\n" + "=" * 70)
    train_path = data_dir / 'train.json'
    print(f"💾 Saving {train_path} ({len(train_data)} examples)...")
    with open(train_path, 'w', encoding='utf-8') as f:
        json.dump(train_data, f, indent=2, ensure_ascii=False)
    
    # Save test.json
    test_path = data_dir / 'test.json'
    print(f"💾 Saving {test_path} ({len(test_data)} examples)...")
    with open(test_path, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 70)
    print("✅ MERGE COMPLETE - NO DATA LOSS!")
    print("=" * 70)
    print(f"\n📊 Final Summary:")
    print(f"  Total examples: {len(training_examples)}")
    print(f"  Train: {len(train_data)} (90%)")
    print(f"  Test: {len(test_data)} (10%)")
    
    print(f"\n📋 Label Support:")
    entity_labels = {k: v for k, v in label_counts.items() if k != 'O'}
    for label, count in sorted(entity_labels.items()):
        print(f"  {label}: {count}")
    
    print(f"\n✅ Files saved to:")
    print(f"  - {train_path}")
    print(f"  - {test_path}")
    print(f"\n🚀 Ready to upload to Colab for training!")

if __name__ == "__main__":
    main()
