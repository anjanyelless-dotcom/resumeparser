#!/usr/bin/env python3
"""
Validate CoNLL format dataset for NER training.
Counts labels, shows samples, and provides data quality checks.
"""

from collections import Counter, defaultdict
from pathlib import Path


def read_conll_file(file_path: str) -> list:
    """Read CoNLL file and return list of sentences (each sentence is a list of token-label pairs)."""
    sentences = []
    current_sentence = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:  # Non-empty line (token-label pair)
                parts = line.split('\t')
                if len(parts) == 2:
                    token, label = parts
                    current_sentence.append((token, label))
            else:  # Empty line (sentence boundary)
                if current_sentence:
                    sentences.append(current_sentence)
                    current_sentence = []
    
    # Add the last sentence if file doesn't end with empty line
    if current_sentence:
        sentences.append(current_sentence)
    
    return sentences


def count_labels(sentences: list) -> Counter:
    """Count occurrences of each label (including BIO prefixes)."""
    label_counts = Counter()
    
    for sentence in sentences:
        for token, label in sentence:
            label_counts[label] += 1
    
    return label_counts


def count_base_labels(label_counts: Counter) -> dict:
    """Count base labels (without BIO prefixes)."""
    base_counts = defaultdict(int)
    target_labels = {
        'COMPANY', 'CLIENT', 'ROLE', 'LOCATION', 'DATE_START', 'DATE_END',
        'DEGREE', 'FIELD', 'INSTITUTION', 'EDU_YEAR_START', 'EDU_YEAR_END', 'GRADE'
    }
    
    for label, count in label_counts.items():
        if label == 'O':
            continue
        
        # Extract base label (remove B- or I- prefix)
        if label.startswith('B-') or label.startswith('I-'):
            base_label = label[2:]
            if base_label in target_labels:
                base_counts[base_label] += count
    
    return dict(base_counts)


def show_samples(sentences: list, num_samples: int = 3):
    """Show sample sentences from the dataset."""
    print(f"\n📄 SAMPLE RESUMES (showing {num_samples} examples):")
    print("=" * 60)
    
    sample_count = 0
    for i, sentence in enumerate(sentences):
        if sample_count >= num_samples:
            break
        
        print(f"\n--- Sample {sample_count + 1} ---")
        for token, label in sentence[:10]:  # Show first 10 tokens
            print(f"{token:<15} {label}")
        if len(sentence) > 10:
            print(f"... ({len(sentence) - 10} more tokens)")
        
        sample_count += 1


def print_summary_table(resume_count: int, base_counts: dict, total_tokens: int):
    """Print a formatted summary table."""
    print(f"\n📊 SUMMARY TABLE")
    print("=" * 80)
    print(f"{'Label':<20} {'Count':<10} {'Status':<15} {'Percentage':<10}")
    print("-" * 80)
    
    for label in sorted(base_counts.keys()):
        count = base_counts[label]
        percentage = (count / total_tokens) * 100 if total_tokens > 0 else 0
        
        if count < 50:
            status = "⚠️  LOW COUNT"
        elif count < 100:
            status = "✅  MODERATE"
        else:
            status = "✅  GOOD"
        
        print(f"{label:<20} {count:<10} {status:<15} {percentage:.2f}%")
    
    print("-" * 80)
    print(f"{'TOTAL':<20} {total_tokens:<10} {'':<15} {'100.00%'}")


def main():
    """Main validation function."""
    file_path = "data/converted/dataset.conll"
    
    # Check if file exists
    if not Path(file_path).exists():
        print(f"❌ File not found: {file_path}")
        return
    
    print("🔍 VALIDATING CoNLL DATASET")
    print("=" * 60)
    
    # Read and parse data
    print("📖 Reading CoNLL file...")
    sentences = read_conll_file(file_path)
    
    # Basic statistics
    resume_count = len(sentences)
    total_tokens = sum(len(sentence) for sentence in sentences)
    
    print(f"✅ Successfully read {resume_count} resumes")
    print(f"✅ Total tokens: {total_tokens}")
    
    # Count labels
    label_counts = count_labels(sentences)
    base_counts = count_base_labels(label_counts)
    
    print(f"✅ Found {len(base_counts)} different entity types")
    
    # Check for low-count labels
    print("\n⚠️  LABEL COUNT WARNINGS:")
    print("-" * 40)
    low_count_labels = []
    for label, count in base_counts.items():
        if count < 50:
            print(f"⚠️  {label}: {count} occurrences (LESS THAN 50)")
            low_count_labels.append(label)
        else:
            print(f"✅ {label}: {count} occurrences")
    
    if low_count_labels:
        print(f"\n⚠️  WARNING: {len(low_count_labels)} labels have less than 50 occurrences!")
        print("   Consider adding more training data for these labels.")
    else:
        print("\n✅ All labels have sufficient occurrences (>= 50)")
    
    # Show samples
    show_samples(sentences, num_samples=3)
    
    # Print summary table
    print_summary_table(resume_count, base_counts, total_tokens)
    
    # Final validation summary
    print(f"\n🎯 VALIDATION SUMMARY")
    print("=" * 60)
    print(f"📄 Resumes processed: {resume_count}")
    print(f"🔤 Total tokens: {total_tokens}")
    print(f"🏷️  Entity types: {len(base_counts)}")
    print(f"⚠️  Low-count labels: {len(low_count_labels)}")
    
    if len(low_count_labels) == 0:
        print("✅ DATASET READY FOR TRAINING!")
    else:
        print("⚠️  Consider adding more data for low-count labels")


if __name__ == "__main__":
    main()
