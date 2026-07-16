#!/usr/bin/env python3
"""Analyze training data quality and compare with previous successful training."""

import json
from collections import Counter, defaultdict
from pathlib import Path

def analyze_training_data(train_path: Path):
    """Comprehensive analysis of training data quality."""
    
    with open(train_path, 'r') as f:
        data = json.load(f)
    
    print("="*70)
    print("📊 TRAINING DATA QUALITY ANALYSIS")
    print("="*70)
    
    # Basic statistics
    total_examples = len(data)
    total_tokens = sum(len(ex['tokens']) for ex in data)
    avg_tokens = total_tokens / total_examples
    
    print(f"\n📈 Basic Statistics:")
    print(f"  Total examples: {total_examples:,}")
    print(f"  Total tokens: {total_tokens:,}")
    print(f"  Average tokens per example: {avg_tokens:.1f}")
    
    # Label distribution
    all_labels = []
    for ex in data:
        all_labels.extend(ex['labels'])
    
    label_counts = Counter(all_labels)
    entity_labels = {k: v for k, v in label_counts.items() if k != 'O'}
    
    print(f"\n📊 Label Distribution:")
    print(f"  Total labels: {len(all_labels):,}")
    print(f"  Entity labels: {sum(entity_labels.values()):,}")
    print(f"  'O' labels: {label_counts['O']:,}")
    print(f"  Entity/O ratio: {sum(entity_labels.values())/label_counts['O']:.3f}")
    
    # Entity coverage
    entity_coverage = defaultdict(int)
    for ex in data:
        entities_in_example = set()
        for label in ex['labels']:
            if label != 'O':
                entity_type = label.split('-')[1]
                entities_in_example.add(entity_type)
        
        for entity in entities_in_example:
            entity_coverage[entity] += 1
    
    print(f"\n📋 Entity Coverage (examples containing each entity):")
    for entity, count in sorted(entity_coverage.items(), key=lambda x: x[1], reverse=True):
        coverage_pct = (count / total_examples) * 100
        print(f"  {entity:20s}: {count:5,} examples ({coverage_pct:5.1f}%)")
    
    # Check for potential issues
    print(f"\n⚠️  Potential Issues:")
    
    # Issue 1: Very short examples
    short_examples = sum(1 for ex in data if len(ex['tokens']) < 3)
    if short_examples > 0:
        print(f"  - {short_examples:,} examples with < 3 tokens ({short_examples/total_examples*100:.1f}%)")
    
    # Issue 2: Examples with no entities
    no_entity_examples = sum(1 for ex in data if all(l == 'O' for l in ex['labels']))
    if no_entity_examples > 0:
        print(f"  - {no_entity_examples:,} examples with NO entities ({no_entity_examples/total_examples*100:.1f}%)")
    
    # Issue 3: Imbalanced entity types
    min_coverage = min(entity_coverage.values())
    max_coverage = max(entity_coverage.values())
    if max_coverage / min_coverage > 10:
        print(f"  - High entity imbalance: {max_coverage/min_coverage:.1f}x difference")
        print(f"    Least common: {min(entity_coverage.items(), key=lambda x: x[1])}")
        print(f"    Most common: {max(entity_coverage.items(), key=lambda x: x[1])}")
    
    # Issue 4: PERSON_NAME specifically
    person_name_count = entity_coverage.get('PERSON_NAME', 0)
    if person_name_count < total_examples * 0.05:
        print(f"  - PERSON_NAME appears in only {person_name_count:,} examples ({person_name_count/total_examples*100:.1f}%)")
        print(f"    This is very low compared to other entities!")
    
    # Show sample PERSON_NAME examples
    print(f"\n👤 PERSON_NAME Examples:")
    person_examples = []
    for i, ex in enumerate(data):
        if any('PERSON_NAME' in label for label in ex['labels']):
            person_examples.append((i, ex))
            if len(person_examples) >= 3:
                break
    
    for idx, ex in person_examples:
        print(f"\n  Example {idx}:")
        tokens_with_labels = [(t, l) for t, l in zip(ex['tokens'], ex['labels']) if 'PERSON_NAME' in l]
        for token, label in tokens_with_labels:
            print(f"    {token:15s} -> {label}")
    
    # Compare with expected distribution
    print(f"\n📊 Comparison with Entity Counts:")
    print(f"  (From conversion script output)")
    expected = {
        'ROLE': 16292,
        'LOCATION': 13884,
        'COMPANY': 11693,
        'DATE_START': 11400,
        'GRADE': 11292,
        'DEGREE': 10202,
        'INSTITUTION': 9482,
        'DATE_END': 9378,
        'CLIENT': 8101,
        'FIELD': 6506,
        'EDU_YEAR_END': 4823,
        'EDU_YEAR_START': 4308,
        'PERSON_NAME': 1262
    }
    
    # Count actual B- tags
    actual_entities = Counter()
    for ex in data:
        for label in ex['labels']:
            if label.startswith('B-'):
                entity_type = label.split('-')[1]
                actual_entities[entity_type] += 1
    
    print(f"\n  {'Entity':<20} {'Expected':<10} {'Actual':<10} {'Match'}")
    print(f"  {'-'*60}")
    for entity in sorted(expected.keys(), key=lambda x: expected[x], reverse=True):
        exp = expected[entity]
        act = actual_entities.get(entity, 0)
        match = "✅" if abs(exp - act) < exp * 0.1 else "⚠️"
        print(f"  {entity:<20} {exp:<10,} {act:<10,} {match}")
    
    print("\n" + "="*70)

if __name__ == "__main__":
    train_path = Path(__file__).parent / "data" / "train.json"
    analyze_training_data(train_path)
