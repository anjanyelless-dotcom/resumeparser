#!/usr/bin/env python3
"""
Analyze training data label distribution.
"""

import json
from collections import Counter

print("="*60)
print("📊 Analyzing Training Data Label Distribution")
print("="*60)

# Load training data
with open('training/data/train.json', 'r') as f:
    train_data = json.load(f)

with open('training/data/test.json', 'r') as f:
    test_data = json.load(f)

print(f"\n📁 Dataset sizes:")
print(f"  Train: {len(train_data)} examples")
print(f"  Test: {len(test_data)} examples")

# Count all labels
all_labels = []
for example in train_data:
    all_labels.extend(example['ner_tags'])

label_counts = Counter(all_labels)

# Label mapping
LABELS = [
    "O",
    "B-NAME", "I-NAME",
    "B-EMAIL", "I-EMAIL",
    "B-PHONE", "I-PHONE",
    "B-EDUCATION", "I-EDUCATION",
    "B-EXPERIENCE", "I-EXPERIENCE",
    "B-SKILLS", "I-SKILLS",
    "B-CERTIFICATION", "I-CERTIFICATION"
]

print(f"\n📊 Label Distribution (Train set):")
print("="*60)
total_tokens = sum(label_counts.values())
print(f"Total tokens: {total_tokens:,}")
print(f"\n{'Label ID':<10} {'Label Name':<20} {'Count':<12} {'Percentage':<10}")
print("-"*60)

for label_id in sorted(label_counts.keys()):
    label_name = LABELS[label_id] if label_id < len(LABELS) else f"UNKNOWN-{label_id}"
    count = label_counts[label_id]
    percentage = (count / total_tokens) * 100
    print(f"{label_id:<10} {label_name:<20} {count:<12,} {percentage:>6.2f}%")

# Check for class imbalance
o_count = label_counts.get(0, 0)
entity_count = total_tokens - o_count
print(f"\n⚖️  Class Balance:")
print(f"  'O' (no entity): {o_count:,} tokens ({(o_count/total_tokens)*100:.1f}%)")
print(f"  Entity tokens: {entity_count:,} tokens ({(entity_count/total_tokens)*100:.1f}%)")
print(f"  Imbalance ratio: {o_count/entity_count:.1f}:1")

# Check sample examples
print(f"\n🔍 Sample Examples:")
print("="*60)
for i, example in enumerate(train_data[:3], 1):
    tokens = example['tokens'][:20]  # First 20 tokens
    tags = example['ner_tags'][:20]
    print(f"\nExample {i}:")
    for token, tag in zip(tokens, tags):
        if tag != 0:
            print(f"  {token:<20} -> {LABELS[tag]}")
